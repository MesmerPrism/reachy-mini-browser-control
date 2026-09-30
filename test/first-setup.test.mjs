import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, diffieHellman, hkdfSync, createDecipheriv, createPublicKey, webcrypto } from 'node:crypto';
import { BLE_UUIDS, MAX_COMMAND_BYTES, PROVISIONING_ALGORITHM, FIRST_SETUP_PROGRESS, createFirstSetupClient, cryptoPreflight, sealWifiPassword, commandByteLength, validateWifiStatus } from '../src/first-setup.mjs';

// Receiver uses Node's native key objects/HKDF/cipher API independently of WebCrypto.
function receiver() {
  const pair = generateKeyPairSync('x25519');
  const raw = pair.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const keyExchange = { alg: PROVISIONING_ALGORITHM, kid: 'test-key', pk: raw.toString('base64') };
  function open(payload, pin = 'ABCDE') {
    const epk = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b656e032100', 'hex'), Buffer.from(payload.epk, 'base64')]), format: 'der', type: 'spki' });
    const shared = diffieHellman({ privateKey: pair.privateKey, publicKey: epk });
    const key = hkdfSync('sha256', shared, Buffer.from(pin), Buffer.from('reachy-mini-wifi-psk-v1'), 32);
    const sealed = Buffer.from(payload.ct, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.nonce, 'base64'));
    decipher.setAAD(Buffer.from(payload.ssid)); decipher.setAuthTag(sealed.subarray(-16));
    return Buffer.concat([decipher.update(sealed.subarray(0, -16)), decipher.final()]).toString('utf8');
  }
  return { keyExchange, open };
}

function transport(handler, { optional = false, timeoutMs = 100 } = {}) {
  const writes = []; const order = []; let asked = false; let options;
  class Response extends EventTarget {
    properties = { read: true, notify: true };
    value = new DataView(new ArrayBuffer(0));
    async startNotifications() { order.push('subscribe'); }
    store(text) { this.value = new DataView(new TextEncoder().encode(text).buffer); }
    async readValue() {
      order.push('read');
      // Web Bluetooth reads also dispatch characteristicvaluechanged; this is
      // deliberately indistinguishable from a notification in the event API.
      this.dispatchEvent(new Event('characteristicvaluechanged'));
      return this.value;
    }
    emit(text) { this.store(text); this.dispatchEvent(new Event('characteristicvaluechanged')); }
  }
  const response = new Response();
  const command = { properties: { write: true }, writeValueWithResponse(data) {
    const value = new TextDecoder().decode(data); writes.push(value); order.push('write');
    return handler(value, response, writes);
  } };
  const device = new EventTarget(); device.name = 'Synthetic Reachy';
  const server = { connected: false, async connect() { this.connected = true; return this; }, disconnect() { this.connected = false; device.dispatchEvent(new Event('gattserverdisconnected')); },
    async getPrimaryService(uuid) {
      if (uuid === BLE_UUIDS.service) return { async getCharacteristic(id) { if (id === BLE_UUIDS.command) return command; if (id === BLE_UUIDS.response) return response; throw new Error('absent'); } };
      if (uuid === BLE_UUIDS.status && optional) return { async getCharacteristic(id) {
        const value = id === BLE_UUIDS.network ? 'CONNECTED [wlan0] robot.invalid' : 'synthetic-hardware';
        return { async readValue() { return new DataView(new TextEncoder().encode(value).buffer); } };
      } };
      throw new Error('optional status service missing');
    } };
  device.gatt = server;
  let disconnected = 0; const disconnectReasons = []; const progress = [];
  const client = createFirstSetupClient({ bluetooth: { requestDevice(value) { asked = true; options = value; return Promise.resolve(device); } }, crypto: webcrypto, timeoutMs, onDisconnect(reason) { disconnected++; disconnectReasons.push(reason); }, onProgress(label) { progress.push(label); } });
  return { client, device, response, command, server, writes, order, disconnectReasons, progress, asked: () => asked, options: () => options, disconnected: () => disconnected };
}
function stockHandler(keyExchange, status = { mode: 'hotspot', connected: null, error: null }) {
  return (value, response) => {
    if (value === 'PING') response.store('PONG');
    else if (value.startsWith('PIN_')) response.store('OK: Connected');
    else if (value === 'WIFI_STATUS') { response.emit('OK: working'); queueMicrotask(() => response.emit(JSON.stringify(status))); }
    else if (value === 'WIFI_KEYEX') { response.emit('OK: working'); queueMicrotask(() => response.emit(JSON.stringify(keyExchange))); }
    else if (value.startsWith('BROWSER_SETUP_PROBE_')) response.store(`ECHO: ${value}`);
    else if (value.startsWith('WIFI_CONNECT_ENC ')) { const payload = JSON.parse(value.slice(17)); response.emit('OK: working'); queueMicrotask(() => response.emit(`OK: Connecting to ${payload.ssid}`)); }
  };
}

test('capability discovery is serial, exposes progress, and enables setup only after all strict checks pass', async () => {
  const robot = receiver(); const fake = transport(stockHandler(robot.keyExchange));
  await fake.client.selectAndConnect();
  const snapshots = [];
  const result = await fake.client.probeCapabilities({ onCheck(checks) { snapshots.push(checks); } });
  assert.equal(result.ready, true);
  assert.deepEqual(fake.writes, ['PING', 'WIFI_STATUS', 'WIFI_KEYEX']);
  assert.deepEqual(result.checks.map(check => check.outcome), ['passed', 'passed', 'passed']);
  assert.deepEqual(snapshots[0].map(check => check.outcome), ['checking', 'skipped', 'skipped']);
  assert.deepEqual(snapshots[2].map(check => check.outcome), ['passed', 'checking', 'skipped']);
  assert.deepEqual(snapshots[4].map(check => check.outcome), ['passed', 'passed', 'checking']);
  assert.equal(fake.client.authenticated, false);
  assert.ok(!Object.hasOwn(result, 'version'));
  fake.client.disconnect();
});

test('explicit unsupported public command skips remaining checks, never infers version or sends credentials', async () => {
  const robot = receiver(); const stock = stockHandler(robot.keyExchange);
  for (const target of ['WIFI_STATUS', 'WIFI_KEYEX']) {
    const fake = transport((command, response) => command === target ? response.store(`ECHO: ${command}`) : stock(command, response));
    await fake.client.selectAndConnect();
    const result = await fake.client.probeCapabilities();
    assert.equal(result.ready, false);
    assert.deepEqual(result.checks.map(check => check.outcome), target === 'WIFI_STATUS' ? ['passed', 'unsupported', 'skipped'] : ['passed', 'passed', 'unsupported']);
    assert.equal(result.checks.find(check => check.outcome === 'unsupported').code, 'unsupported_provisioning');
    assert.deepEqual(fake.writes, target === 'WIFI_STATUS' ? ['PING', 'WIFI_STATUS'] : ['PING', 'WIFI_STATUS', 'WIFI_KEYEX']);
    assert.equal(fake.client.connected, false); assert.equal(fake.disconnected(), 1);
    assert.ok(!Object.hasOwn(result, 'version')); assert.doesNotMatch(JSON.stringify(result), /1\.2\.11|PIN_|WIFI_CONNECT/);
  }
});

test('discovery keeps malformed replies, unknown echoes and timeouts inconclusive rather than unsupported', async () => {
  const robot = receiver(); const stock = stockHandler(robot.keyExchange);
  const cases = [
    ['PING', response => response.store('other-raw-secret'), ['inconclusive', 'skipped', 'skipped']],
    ['WIFI_STATUS', response => response.emit('{bad raw-secret'), ['passed', 'inconclusive', 'skipped']],
    ['WIFI_STATUS', response => response.store('ECHO: WIFI_OTHER raw-secret'), ['passed', 'inconclusive', 'skipped']],
    ['WIFI_KEYEX', response => response.emit(JSON.stringify({ alg: 'unknown', pk: 'raw-secret' })), ['passed', 'passed', 'inconclusive']],
  ];
  for (const [target, reply, expected] of cases) {
    const fake = transport((command, response) => command === target ? reply(response) : stock(command, response), { timeoutMs: 20 });
    await fake.client.selectAndConnect();
    const result = await fake.client.probeCapabilities();
    assert.equal(result.ready, false); assert.deepEqual(result.checks.map(check => check.outcome), expected);
    assert.doesNotMatch(JSON.stringify(result), /raw-secret|PIN_|WIFI_CONNECT/);
    assert.equal(fake.client.connected, false);
  }
});

test('capability observers cannot mutate the remaining sequence or inject commands', async () => {
  const robot = receiver(); const fake = transport(stockHandler(robot.keyExchange));
  await fake.client.selectAndConnect();
  const result = await fake.client.probeCapabilities({ onCheck(checks) { checks[1].id = 'injected'; checks[1].outcome = 'passed'; throw Error('ignored observer'); } });
  assert.equal(result.ready, true); assert.equal(result.checks[1].id, 'wifi_status');
  assert.deepEqual(fake.writes, ['PING', 'WIFI_STATUS', 'WIFI_KEYEX']); fake.client.disconnect();
});

test('disconnect between discovery steps prevents later command writes and cannot enable credentials', async () => {
  const robot = receiver(); const fake = transport(stockHandler(robot.keyExchange));
  await fake.client.selectAndConnect();
  const result = await fake.client.probeCapabilities({ onCheck(checks) { if (checks[0].outcome === 'passed') fake.client.disconnect(); } });
  assert.equal(result.ready, false);
  assert.deepEqual(fake.writes, ['PING']);
  assert.deepEqual(result.checks.map(check => check.outcome), ['passed', 'inconclusive', 'skipped']);
  assert.equal(fake.client.authenticated, false);
});

test('synthetic preflight performs a complete cryptographic round trip without Bluetooth', async () => {
  assert.deepEqual(await cryptoPreflight({ crypto: webcrypto }), { ok: true });
  await assert.rejects(cryptoPreflight({ crypto: {} }), { code: 'crypto' });
});
test('sealed UTF-8 password interoperates with independent receiver and binds PIN, SSID, ciphertext', async () => {
  const robot = receiver(); const password = 'temporary-秘密-é';
  const payload = await sealWifiPassword({ ssid: 'Lab-λ', password, pin: 'ABCDE', keyExchange: robot.keyExchange, crypto: webcrypto });
  assert.equal(robot.open(payload), password);
  assert.equal(Buffer.from(payload.epk, 'base64').length, 32);
  assert.equal(Buffer.from(payload.nonce, 'base64').length, 12);
  assert.throws(() => robot.open(payload, 'ABCDX'));
  assert.throws(() => robot.open({ ...payload, ssid: 'Other' }));
  const ct = Buffer.from(payload.ct, 'base64'); ct[0] ^= 1;
  assert.throws(() => robot.open({ ...payload, ct: ct.toString('base64') }));
  assert.ok(!JSON.stringify(payload).includes(password));
});
test('UTF-8 byte limits count complete writes and reject credentials before encryption', async () => {
  assert.equal(commandByteLength('λ'.repeat(256)), MAX_COMMAND_BYTES);
  assert.throws(() => commandByteLength('λ'.repeat(257)), { code: 'size' });
  const robot = receiver();
  for (const fields of [{ ssid: 'λ'.repeat(17) }, { password: 'λ'.repeat(33) }, { password: 'short' }, { pin: 'AB\nDE' }]) {
    await assert.rejects(sealWifiPassword({ ssid: 'lab', password: 'temporary', pin: 'ABCDE', keyExchange: robot.keyExchange, crypto: webcrypto, ...fields }), { code: 'input' });
  }
});
test('chooser is called synchronously, subscription precedes writes, optional identity absence is nonfatal', async () => {
  const robot = receiver(); const fake = transport(stockHandler(robot.keyExchange));
  const choosing = fake.client.selectAndConnect(); assert.equal(fake.asked(), true);
  assert.deepEqual(fake.options(), { filters: [{ services: [BLE_UUIDS.status] }, { services: [BLE_UUIDS.service] }], optionalServices: [BLE_UUIDS.service, BLE_UUIDS.status] });
  assert.deepEqual(await choosing, { deviceName: 'Synthetic Reachy', network: null, hardwareId: null });
  assert.deepEqual(await fake.client.inspect(), { status: { mode: 'hotspot', connected: null, error: null }, keyExchange: robot.keyExchange });
  assert.equal(fake.order[0], 'subscribe'); assert.deepEqual(fake.writes, ['PING', 'WIFI_STATUS', 'WIFI_KEYEX']);
  fake.client.disconnect(); assert.equal(fake.client.connected, false);
});
test('synchronous and asynchronous chooser errors use safe names and distinguish policy, no selection, unsupported, and unknown failures', async () => {
  const cases = [
    ['SecurityError', 'permission', /browser blocked Bluetooth/],
    ['NotAllowedError', 'permission', /browser blocked Bluetooth/],
    ['NotFoundError', 'no_device', /No Bluetooth device was selected/],
    ['NotSupportedError', 'unavailable', /Web Bluetooth is unavailable/],
    ['NetworkError', 'selection', /device chooser did not complete/],
    ['raw-secret-in-name', 'selection', /device chooser did not complete/],
  ];
  for (const synchronous of [true, false]) for (const [name, code, message] of cases) {
    let requested = 0;
    const exception = new Error('raw-secret-in-message'); exception.name = name;
    const client = createFirstSetupClient({ bluetooth: { requestDevice() { requested++; if (synchronous) throw exception; return Promise.reject(exception); } } });
    const selecting = client.selectAndConnect(); assert.equal(requested, 1);
    await assert.rejects(selecting, (error) => {
      assert.equal(error.code, code); assert.equal(error.stage, 'selection'); assert.match(error.message, message);
      assert.doesNotMatch(error.message, /cancelled|raw-secret/);
      assert.doesNotMatch(JSON.stringify(error), /raw-secret/);
      assert.equal(error.name, 'FirstSetupError');
      return true;
    });
    assert.equal(client.connected, false);
  }
});
test('post-selection failures identify their exact GATT stage and deliver the same safe reason to disconnect UI', async () => {
  for (const stage of ['gatt_connect', 'gatt_service', 'gatt_command', 'gatt_response', 'gatt_notifications', 'gatt_properties']) {
    const fake = transport(() => {});
    const exception = new Error('raw-secret-in-message'); exception.name = 'raw-secret-in-name';
    const original = fake.server.getPrimaryService.bind(fake.server);
    if (stage === 'gatt_connect') fake.server.connect = () => { throw exception; };
    else if (stage === 'gatt_service') fake.server.getPrimaryService = async () => { throw exception; };
    else if (stage === 'gatt_command' || stage === 'gatt_response') fake.server.getPrimaryService = async uuid => {
      const service = await original(uuid); const get = service.getCharacteristic.bind(service);
      service.getCharacteristic = async id => { if (id === BLE_UUIDS[stage === 'gatt_command' ? 'command' : 'response']) throw exception; return get(id); };
      return service;
    };
    else if (stage === 'gatt_notifications') fake.response.startNotifications = async () => { throw exception; };
    else fake.command.properties.write = false;
    let received;
    await assert.rejects(fake.client.selectAndConnect(), error => {
      received = error; assert.equal(error.code, stage); assert.doesNotMatch(error.message, /raw-secret/); assert.doesNotMatch(JSON.stringify(error), /raw-secret/); return true;
    });
    assert.equal(fake.disconnectReasons.length, 1); assert.equal(fake.disconnectReasons[0], received);
    assert.equal(fake.client.connected, false); assert.equal(fake.server.connected, false); assert.deepEqual(fake.writes, []);
  }
});
test('known policy exceptions during GATT discovery retain the stage without reflecting browser details', async () => {
  const fake = transport(() => {});
  fake.server.getPrimaryService = async () => { throw new DOMException('raw-secret', 'SecurityError'); };
  await assert.rejects(fake.client.selectAndConnect(), error => {
    assert.equal(error.code, 'permission'); assert.equal(error.stage, 'gatt_service'); assert.equal(error.browserErrorName, 'SecurityError');
    assert.match(error.message, /^Provisioning service discovery:/); assert.match(error.message, /permission and browser policy/); assert.doesNotMatch(error.message, /raw-secret/);
    assert.equal(fake.disconnectReasons[0], error); return true;
  });
});
test('public inspection progress and timeout diagnostics distinguish PING, status, and key exchange', async () => {
  const robot = receiver(); const stock = stockHandler(robot.keyExchange);
  for (const [command, stage] of [['PING', 'ping'], ['WIFI_STATUS', 'wifi_status'], ['WIFI_KEYEX', 'key_exchange']]) {
    const fake = transport((value, response) => { if (value !== command) return stock(value, response); response.emit('OK: working'); }, { timeoutMs: 15 });
    if (command === 'PING') fake.response.readValue = () => new Promise(() => {});
    await fake.client.selectAndConnect();
    await assert.rejects(fake.client.inspect(), error => {
      assert.equal(error.code, 'timeout'); assert.equal(error.stage, stage); assert.ok(error.message.startsWith(FIRST_SETUP_PROGRESS[stage]));
      assert.equal(fake.disconnectReasons[0], error); return true;
    });
    assert.equal(fake.progress.at(-1), FIRST_SETUP_PROGRESS[command === 'PING' ? stage : 'public_ack']);
    assert.equal(fake.client.connected, false);
  }
});
test('stock synchronous replies require a response read strictly after the completed write, ignoring notifications', async () => {
  let completeWrite;
  const fake = transport((_, response) => {
    response.emit('OK: Connected');
    return new Promise(resolve => { completeWrite = () => { response.store('ERROR: Incorrect PIN reflected-secret'); resolve(); }; });
  });
  await fake.client.selectAndConnect();
  const auth = fake.client.authenticate('ABCDE');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fake.client.authenticated, false); assert.equal(fake.order.includes('read'), false);
  completeWrite();
  await assert.rejects(auth, error => error.code === 'pin' && !error.message.includes('reflected-secret'));
  assert.deepEqual(fake.order, ['subscribe', 'write', 'read']); fake.client.disconnect();
});
test('async Wi-Fi status and key exchange never accept cached readback or its read-induced event without a final notification', async () => {
  const robot = receiver(); const stock = stockHandler(robot.keyExchange);
  for (const blocked of ['WIFI_STATUS', 'WIFI_KEYEX']) {
    const fake = transport((command, response) => {
      if (command !== blocked) return stock(command, response);
      response.store(JSON.stringify(blocked === 'WIFI_STATUS' ? { mode: 'wlan', connected: 'lab', error: null } : robot.keyExchange));
    }, { timeoutMs: 15 });
    await fake.client.selectAndConnect(); await assert.rejects(fake.client.inspect(), { code: 'timeout' });
    assert.equal(fake.order.filter(item => item === 'read').length, 2); // PING and negative-only public diagnostic.
    assert.equal(fake.progress.at(-1), FIRST_SETUP_PROGRESS[blocked === 'WIFI_STATUS' ? 'wifi_status_cached' : 'key_exchange_cached']);
    assert.equal(fake.client.connected, false);
  }
});
test('exact synchronous public Wi-Fi ECHOs and read-induced events identify unsupported provisioning without sending credentials', async () => {
  const stock = stockHandler(receiver().keyExchange);
  for (const [command, stage] of [['WIFI_STATUS', 'wifi_status'], ['WIFI_KEYEX', 'key_exchange']]) {
    const fake = transport((value, response) => { if (value === command) response.store(`ECHO: ${value}`); else return stock(value, response); });
    await fake.client.selectAndConnect();
    await assert.rejects(fake.client.inspect(), error => {
      assert.equal(error.code, 'unsupported_provisioning'); assert.equal(error.stage, stage);
      assert.match(error.message, /does not support this Wi-Fi provisioning command/);
      assert.equal(fake.disconnectReasons[0], error); return true;
    });
    assert.equal(fake.client.connected, false);
    assert.ok(fake.writes.every(value => ['PING', 'WIFI_STATUS', 'WIFI_KEYEX'].includes(value)));
  }
});
test('a genuine final notification overlapping a public diagnostic read is conservatively ignored', async () => {
  const fake = transport((_, response) => response.store('OK: working'), { timeoutMs: 15 });
  const originalRead = fake.response.readValue.bind(fake.response);
  fake.response.readValue = async () => {
    fake.response.emit('{"mode":"wlan","connected":"lab","error":null}');
    return originalRead();
  };
  await fake.client.selectAndConnect();
  await assert.rejects(fake.client.getWifiStatus(), { code: 'timeout', stage: 'wifi_status' });
  assert.equal(fake.client.connected, false);
  assert.equal(fake.progress.at(-1), FIRST_SETUP_PROGRESS.wifi_status_cached);
});
test('public diagnostic readback rejects synchronous errors safely, but unrelated ECHOs and ACKs prove nothing', async () => {
  for (const cached of ['ERROR: reflected-private-value', 'ECHO: WIFI_KEYEX', 'ECHO: WIFI_STATUS trailing', 'OK: working']) {
    const fake = transport((_, response) => response.store(cached), { timeoutMs: 15 });
    await fake.client.selectAndConnect();
    await assert.rejects(fake.client.getWifiStatus(), error => {
      assert.equal(error.code, cached.startsWith('ERROR:') ? 'rejected' : 'timeout'); assert.equal(error.stage, 'wifi_status');
      assert.doesNotMatch(error.message, /reflected-private-value|trailing/); return true;
    });
    assert.equal(fake.order.filter(item => item === 'read').length, 1);
    assert.equal(fake.client.connected, false);
  }
});
test('final public notifications received during the write skip needless diagnostic readback', async () => {
  const robot = receiver();
  const fake = transport((command, response) => {
    if (command === 'PING') response.store('PONG');
    else if (command === 'WIFI_STATUS') response.emit('{"mode":"hotspot","connected":null,"error":null}');
    else if (command === 'WIFI_KEYEX') response.emit(JSON.stringify(robot.keyExchange));
  });
  const read = fake.response.readValue.bind(fake.response);
  fake.response.readValue = () => {
    assert.equal(fake.writes.at(-1), 'PING'); return read();
  };
  await fake.client.selectAndConnect(); assert.equal((await fake.client.inspect()).status.mode, 'hotspot');
  assert.equal(fake.order.filter(item => item === 'read').length, 1); fake.client.disconnect();
});
test('a late timed-out public diagnostic ECHO cannot reject a newer pending command', async () => {
  let oldRead; let reads = 0;
  const fake = transport((_, response) => response.store('OK: working'), { timeoutMs: 30 });
  const read = fake.response.readValue.bind(fake.response);
  fake.response.readValue = () => { reads++; if (reads === 1) return new Promise(resolve => { oldRead = resolve; }); return read(); };
  await fake.client.selectAndConnect(); await assert.rejects(fake.client.getWifiStatus(), { code: 'timeout' });
  await fake.client.selectAndConnect(); const current = fake.client.getWifiStatus();
  await new Promise(resolve => setImmediate(resolve));
  oldRead(new DataView(new TextEncoder().encode('ECHO: WIFI_STATUS').buffer));
  await new Promise(resolve => setImmediate(resolve)); assert.equal(fake.client.connected, true);
  fake.response.emit('{"mode":"hotspot","connected":null,"error":null}');
  assert.equal((await current).mode, 'hotspot'); fake.client.disconnect();
});
test('a timed-out synchronous read event cannot settle a new async command sharing the response characteristic', async () => {
  const fake = transport((command, response) => response.store(command.startsWith('PIN_') ? 'OK: Connected' : 'OK: working'), { timeoutMs: 50 });
  const originalRead = fake.response.readValue.bind(fake.response);
  let completeOldRead; let reads = 0;
  fake.response.readValue = () => {
    reads++;
    if (reads === 1) return new Promise(resolve => { completeOldRead = text => { fake.response.store(text); fake.response.dispatchEvent(new Event('characteristicvaluechanged')); resolve(fake.response.value); }; });
    return originalRead();
  };
  await fake.client.selectAndConnect(); await assert.rejects(fake.client.authenticate('ABCDE'), { code: 'timeout' });
  await fake.client.selectAndConnect();
  let settled = false;
  const current = fake.client.getWifiStatus().then(value => { settled = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  // The new operation's diagnostic read has finished. Only the old read's
  // characteristic-level count can now distinguish this event from a notify.
  completeOldRead('{"mode":"wlan","connected":"stale-network","error":null}');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false); assert.equal(fake.client.connected, true);
  fake.response.emit('{"mode":"hotspot","connected":null,"error":null}');
  assert.equal((await current).mode, 'hotspot'); fake.client.disconnect();
});
test('read-induced JSON from an old client cannot settle a different client sharing the characteristic', async () => {
  const fake = transport((_, response) => response.store('OK: working'), { timeoutMs: 50 });
  const originalRead = fake.response.readValue.bind(fake.response);
  let completeOldRead; let reads = 0;
  fake.response.readValue = () => {
    reads++;
    if (reads === 1) return new Promise(resolve => { completeOldRead = text => { fake.response.store(text); fake.response.dispatchEvent(new Event('characteristicvaluechanged')); resolve(fake.response.value); }; });
    return originalRead();
  };
  await fake.client.selectAndConnect(); await assert.rejects(fake.client.getWifiStatus(), { code: 'timeout' });
  const nextClient = createFirstSetupClient({ bluetooth: { requestDevice: () => Promise.resolve(fake.device) }, timeoutMs: 50, crypto: webcrypto });
  await nextClient.selectAndConnect();
  let settled = false;
  const current = nextClient.getWifiStatus().then(value => { settled = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  completeOldRead('{"mode":"wlan","connected":"stale-network","error":null}');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false); assert.equal(nextClient.connected, true);
  fake.response.emit('{"mode":"hotspot","connected":null,"error":null}');
  assert.equal((await current).mode, 'hotspot'); nextClient.disconnect();
});
test('two overlapping timed-out reads remain suppressed until both characteristic read counts release', async () => {
  const fake = transport((command, response) => response.store(command.startsWith('PIN_') ? 'OK: Connected' : 'OK: working'), { timeoutMs: 50 });
  const originalRead = fake.response.readValue.bind(fake.response);
  const finish = []; let reads = 0;
  fake.response.readValue = () => {
    reads++;
    if (reads <= 2) return new Promise(resolve => { finish.push(text => { fake.response.store(text); fake.response.dispatchEvent(new Event('characteristicvaluechanged')); resolve(fake.response.value); }); });
    return originalRead();
  };
  await fake.client.selectAndConnect(); await assert.rejects(fake.client.authenticate('ABCDE'), { code: 'timeout' });
  await fake.client.selectAndConnect(); await assert.rejects(fake.client.getWifiStatus(), { code: 'timeout' });
  await fake.client.selectAndConnect();
  let settled = false;
  const current = fake.client.getWifiStatus().then(value => { settled = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  const stale = '{"mode":"wlan","connected":"stale-network","error":null}';
  finish[0](stale); await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false); assert.equal(fake.client.connected, true);
  finish[1](stale); await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false); assert.equal(fake.client.connected, true);
  fake.response.emit('{"mode":"hotspot","connected":null,"error":null}');
  assert.equal((await current).mode, 'hotspot'); fake.client.disconnect();
});
test('cached asynchronous connect acknowledgement cannot declare acceptance or trigger a retry', async () => {
  const stock = stockHandler(receiver().keyExchange);
  const fake = transport((command, response) => {
    if (!command.startsWith('WIFI_CONNECT_ENC ')) return stock(command, response);
    response.store('OK: Connecting to lab');
  }, { timeoutMs: 15 });
  await fake.client.selectAndConnect(); await fake.client.authenticate('ABCDE');
  await assert.rejects(fake.client.connectWifi({ ssid: 'lab', password: 'temporary-password', pin: 'ABCDE' }), { code: 'timeout', stage: 'wifi_connect' });
  assert.equal(fake.writes.filter(command => command.startsWith('WIFI_CONNECT_ENC ')).length, 1);
  assert.equal(fake.client.connected, false);
});
test('a timed-out synchronous read cannot satisfy a newer session pending PIN command', async () => {
  const fake = transport(stockHandler(receiver().keyExchange), { timeoutMs: 30 });
  let oldRead; let newRead; let count = 0;
  fake.response.readValue = () => new Promise(resolve => { count++; if (count === 1) oldRead = resolve; else newRead = resolve; });
  await fake.client.selectAndConnect(); await assert.rejects(fake.client.authenticate('ABCDE'), { code: 'timeout', stage: 'authenticate' });
  await fake.client.selectAndConnect();
  const auth = fake.client.authenticate('ABCDE'); await new Promise(resolve => setImmediate(resolve));
  const value = text => new DataView(new TextEncoder().encode(text).buffer);
  oldRead(value('OK: Connected')); await new Promise(resolve => setImmediate(resolve));
  assert.equal(fake.client.connected, true); assert.equal(fake.client.authenticated, false);
  newRead(value('OK: Connected')); await auth; assert.equal(fake.client.authenticated, true); fake.client.disconnect();
});
test('missing response read capability stops before any command write', async () => {
  for (const missing of ['property', 'method']) {
    const fake = transport(() => {});
    if (missing === 'property') fake.response.properties.read = false; else fake.response.readValue = undefined;
    await assert.rejects(fake.client.selectAndConnect(), { code: 'gatt_properties' });
    assert.deepEqual(fake.writes, []); assert.equal(fake.client.connected, false);
  }
});
test('reads optional identity without granting extra command capabilities', async () => {
  const fake = transport(() => {}, { optional: true });
  assert.deepEqual(await fake.client.selectAndConnect(), { deviceName: 'Synthetic Reachy', network: 'CONNECTED [wlan0] robot.invalid', hardwareId: 'synthetic-hardware' });
  assert.deepEqual(fake.writes, []); fake.client.disconnect();
});
test('GATT initialization times out and its late completion cannot overwrite a new connection', async () => {
  const fake = transport(stockHandler(receiver().keyExchange), { timeoutMs: 15 });
  const original = fake.server.getPrimaryService.bind(fake.server);
  let finishOldService; let first = true;
  fake.server.getPrimaryService = (uuid) => {
    if (uuid === BLE_UUIDS.service && first) { first = false; return new Promise((resolve) => { finishOldService = async () => resolve(await original(uuid)); }); }
    return original(uuid);
  };
  await assert.rejects(fake.client.selectAndConnect(), { code: 'init_timeout', stage: 'gatt_service' });
  assert.equal(fake.client.connected, false);
  await fake.client.selectAndConnect(); await finishOldService();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fake.client.connected, true); assert.equal((await fake.client.inspect()).status.mode, 'hotspot'); fake.client.disconnect();
});
test('late GATT rejection after timeout cannot disconnect a newer selected session', async () => {
  const fake = transport(stockHandler(receiver().keyExchange), { timeoutMs: 15 });
  const original = fake.server.getPrimaryService.bind(fake.server);
  let rejectOldService; let first = true;
  fake.server.getPrimaryService = uuid => {
    if (uuid === BLE_UUIDS.service && first) { first = false; return new Promise((_, reject) => { rejectOldService = reject; }); }
    return original(uuid);
  };
  await assert.rejects(fake.client.selectAndConnect(), { code: 'init_timeout', stage: 'gatt_service' });
  await fake.client.selectAndConnect(); rejectOldService(new DOMException('raw-secret', 'SecurityError'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fake.client.connected, true); assert.equal(fake.disconnectReasons.length, 1);
  assert.equal((await fake.client.inspect()).status.mode, 'hotspot'); fake.client.disconnect();
});
test('late GATT connect success cannot disconnect a newer session using the same browser GATT object', async () => {
  const fake = transport(stockHandler(receiver().keyExchange), { timeoutMs: 15 });
  let finishOldConnect; let first = true;
  fake.server.connect = async () => {
    if (first) { first = false; return new Promise(resolve => { finishOldConnect = () => resolve(fake.server); }); }
    fake.server.connected = true; return fake.server;
  };
  await assert.rejects(fake.client.selectAndConnect(), { code: 'init_timeout', stage: 'gatt_connect' });
  await fake.client.selectAndConnect(); finishOldConnect();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fake.client.connected, true); assert.equal(fake.disconnectReasons.length, 1);
  assert.equal((await fake.client.inspect()).status.mode, 'hotspot'); fake.client.disconnect();
});
test('throwing progress and disconnect callbacks cannot break provisioning or cleanup', async () => {
  const fake = transport(stockHandler(receiver().keyExchange));
  fake.client.onProgress = () => { throw new Error('UI callback error'); };
  fake.client.onDisconnect = () => { throw new Error('UI callback error'); };
  await fake.client.selectAndConnect(); await fake.client.inspect(); await fake.client.authenticate('ABCDE');
  assert.equal((await fake.client.connectWifi({ ssid: 'lab', password: 'temporary-password', pin: 'ABCDE' })).accepted, true);
  assert.doesNotThrow(() => fake.client.disconnect()); assert.equal(fake.client.connected, false);
});
test('optional identity transport stall is finite and closes the connection', async () => {
  const fake = transport(() => {}, { timeoutMs: 15 });
  const original = fake.server.getPrimaryService.bind(fake.server);
  fake.server.getPrimaryService = (uuid) => uuid === BLE_UUIDS.status ? new Promise(() => {}) : original(uuid);
  await assert.rejects(fake.client.selectAndConnect(), { code: 'identity_timeout', stage: 'identity' }); assert.equal(fake.client.connected, false);
});
test('ignores intermediate working ACK and serializes concurrent command callers', async () => {
  let complete;
  const fake = transport((value, response) => {
    response.emit('OK: working');
    if (value === 'WIFI_STATUS') complete = () => response.emit('{"mode":"busy","connected":null,"error":null}');
    else response.emit('OK: Connected');
  });
  await fake.client.selectAndConnect();
  const status = fake.client.getWifiStatus(); const auth = fake.client.authenticate('ABCDE');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(fake.writes, ['WIFI_STATUS']); assert.equal(fake.client.authenticated, false);
  complete(); assert.equal((await status).mode, 'busy'); await auth;
  assert.deepEqual(fake.writes, ['WIFI_STATUS', 'PIN_ABCDE']); fake.client.disconnect();
});
test('PIN requires exact upstream reply and never includes a raw reflected secret in errors', async () => {
  for (const reply of ['OK: Connected extra', 'ERROR: Incorrect PIN secret-value', 'ECHO: PIN_ABCDE']) {
    const fake = transport((_, response) => response.emit(reply)); await fake.client.selectAndConnect();
    await assert.rejects(fake.client.authenticate('ABCDE'), (error) => error.code === 'pin' && !error.message.includes('ABCDE') && !error.message.includes('secret-value'));
    assert.equal(fake.client.authenticated, false); fake.client.disconnect();
  }
});
test('timeout closes transport, queued mutations do not write, and stale replies cannot rescue next command', async () => {
  const fake = transport(() => {}, { timeoutMs: 15 }); await fake.client.selectAndConnect();
  const first = fake.client.getWifiStatus(); const second = fake.client.authenticate('ABCDE');
  const results = await Promise.allSettled([first, second]);
  assert.equal(results[0].reason.code, 'timeout'); assert.equal(results[1].reason.code, 'disconnected');
  assert.equal(fake.server.connected, false); assert.deepEqual(fake.writes, ['WIFI_STATUS']);
  fake.response.emit('OK: Connected'); assert.equal(fake.client.authenticated, false);
  await assert.rejects(fake.client.getWifiStatus(), { code: 'disconnected' });
});
test('timeout also covers a hung write after a synchronous final notification', async () => {
  const fake = transport((_, response) => { response.emit('{"mode":"hotspot","connected":null,"error":null}'); return new Promise(() => {}); }, { timeoutMs: 15 });
  await fake.client.selectAndConnect(); await assert.rejects(fake.client.getWifiStatus(), { code: 'timeout' });
  assert.equal(fake.client.connected, false);
});
test('late rejection of a timed-out write cannot invalidate a new connection', async () => {
  let rejectOldWrite; let attempt = 0;
  const fake = transport((_, response) => {
    attempt++;
    if (attempt === 1) return new Promise((_, reject) => { rejectOldWrite = reject; });
    response.emit('{"mode":"hotspot","connected":null,"error":null}');
  }, { timeoutMs: 15 });
  await fake.client.selectAndConnect(); await assert.rejects(fake.client.getWifiStatus(), { code: 'timeout' });
  await fake.client.selectAndConnect();
  rejectOldWrite(new Error('old transport failure'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fake.client.connected, true); assert.equal((await fake.client.getWifiStatus()).mode, 'hotspot'); fake.client.disconnect();
});
test('explicit and remote disconnect clean pending work and notification handlers', async () => {
  for (const remote of [false, true]) {
    const fake = transport(() => {}); await fake.client.selectAndConnect(); const pending = fake.client.getWifiStatus();
    await new Promise((resolve) => setImmediate(resolve));
    if (remote) fake.server.disconnect(); else fake.client.disconnect();
    await assert.rejects(pending, { code: 'disconnected' }); fake.response.emit('OK: Connected');
    assert.equal(fake.client.connected, false); assert.equal(fake.client.authenticated, false); assert.equal(fake.disconnected(), 1);
  }
});
test('write rejection after early notification invalidates rather than declaring success or leaking raw errors', async () => {
  const fake = transport((_, response) => { response.emit('OK: Connected'); throw new Error('reflected secret-value'); });
  await fake.client.selectAndConnect();
  await assert.rejects(fake.client.authenticate('ABCDE'), (error) => error.code === 'transport' && !error.message.includes('secret-value'));
  assert.equal(fake.client.authenticated, false); assert.equal(fake.client.connected, false);
});
test('malformed final status JSON invalidates the connection instead of accepting a truncated response', async () => {
  const fake = transport((_, response) => { response.emit('OK: working'); response.emit('{"mode":"wlan"'); });
  await fake.client.selectAndConnect(); await assert.rejects(fake.client.getWifiStatus(), { code: 'protocol' });
  assert.equal(fake.client.connected, false);
});
test('Wi-Fi status rejects malformed schemas, preserves unknown, and sanitizes daemon errors', () => {
  for (const value of [{}, { mode: 'CONNECTED', connected: null, error: null }, { mode: 'wlan', connected: false, error: null }, { mode: 'wlan', connected: 'lab', error: null, known: [2] }]) assert.throws(() => validateWifiStatus(value), { code: 'protocol' });
  assert.deepEqual(validateWifiStatus({ mode: null, connected: null, error: 'raw password' }), { mode: null, connected: null, error: 'Robot reported a Wi-Fi error.' });
});
test('successful synthetic probes precede one sealed mutation; accepted ACK is not WLAN success', async () => {
  const robot = receiver(); const fake = transport(stockHandler(robot.keyExchange)); await fake.client.selectAndConnect();
  await assert.rejects(fake.client.connectWifi({ ssid: 'lab', password: 'temporary-secret', pin: 'ABCDE' }), { code: 'auth' });
  await fake.client.authenticate('ABCDE');
  const accepted = await fake.client.connectWifi({ ssid: 'lab', password: 'temporary-secret', pin: 'ABCDE' });
  assert.equal(accepted.accepted, true); assert.equal('connected' in accepted, false);
  const probes = fake.writes.filter((value) => value.startsWith('BROWSER_SETUP_PROBE_'));
  assert.deepEqual(probes.map((value) => Buffer.byteLength(value)), accepted.probeLengths);
  assert.ok(probes.every((value) => /_END_/.test(value)));
  const mutations = fake.writes.filter((value) => value.startsWith('WIFI_CONNECT_ENC ')); assert.equal(mutations.length, 1);
  assert.equal(robot.open(JSON.parse(mutations[0].slice(17))), 'temporary-secret');
  assert.ok(!fake.writes.join('\n').includes('temporary-secret'));
  assert.ok(fake.progress.every(label => Object.values(FIRST_SETUP_PROGRESS).includes(label)));
  assert.doesNotMatch(fake.progress.join('\n'), /ABCDE|temporary-secret/);
  assert.equal(fake.progress.at(-1), FIRST_SETUP_PROGRESS.wifi_connect);
  assert.equal((await fake.client.getWifiStatus()).mode, 'hotspot'); fake.client.disconnect();
});
test('truncated, wrong-sentinel, and unsupported ECHO prevent the secret write', async () => {
  const robot = receiver();
  for (const mode of ['truncated', 'wrong', 'unsupported']) {
    const stock = stockHandler(robot.keyExchange);
    const fake = transport((value, response) => {
      if (!value.startsWith('BROWSER_SETUP_PROBE_')) return stock(value, response);
      response.emit(mode === 'truncated' ? `ECHO: ${value.slice(0, -1)}` : mode === 'wrong' ? 'ECHO: unrelated' : 'ERROR: Unsupported');
    });
    await fake.client.selectAndConnect(); await fake.client.authenticate('ABCDE');
    await assert.rejects(fake.client.connectWifi({ ssid: 'lab', password: 'temporary-secret', pin: 'ABCDE' }), { code: 'probe' });
    assert.equal(fake.writes.some((value) => value.startsWith('WIFI_CONNECT_ENC ')), false); assert.equal(fake.client.connected, false);
  }
});
