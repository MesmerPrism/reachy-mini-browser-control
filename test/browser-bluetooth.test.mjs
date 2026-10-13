import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectBrowserBluetooth } from '../src/browser-bluetooth.mjs';

test('capability inspection never opens a chooser or sends a robot request', async () => {
  let chooserCalls = 0, availabilityCalls = 0;
  const result = await inspectBrowserBluetooth({ secureContext: true, navigator: { bluetooth: { requestDevice() { chooserCalls++; throw Error('Do not open chooser'); }, async getAvailability() { availabilityCalls++; return true; } } } });
  assert.equal(result.kind, 'available'); assert.equal(chooserCalls, 0); assert.equal(availabilityCalls, 1);
  assert.match(result.message, /does not verify discovery/);
});

test('insecure contexts stop before native capability methods are invoked', async () => {
  const result = await inspectBrowserBluetooth({ secureContext: false, navigator: { get bluetooth() { throw Error('API must not be read'); }, brave: { isBrave() { throw Error('Brand must not be read'); } } } });
  assert.equal(result.kind, 'insecure'); assert.match(result.message, /HTTPS/);
});

test('Brave hints explain absent or unavailable APIs without overriding real capabilities', async () => {
  const brave = { async isBrave() { return true; } };
  assert.equal((await inspectBrowserBluetooth({secureContext: true, navigator: {brave}})).kind, 'unsupported');
  const unavailable = await inspectBrowserBluetooth({ secureContext: true, navigator: {brave, bluetooth: {requestDevice() {}, async getAvailability() {return false;}}} });
  assert.equal(unavailable.kind, 'unavailable'); assert.match(unavailable.message, /Chrome or Edge/);
  const available = await inspectBrowserBluetooth({ secureContext: true, navigator: {brave, bluetooth: {requestDevice() {}, async getAvailability() {return true;}}} });
  assert.equal(available.kind, 'available'); assert.equal(available.brave, true);
});

test('missing, denied, indefinite and malformed availability results remain inconclusive', async () => {
  assert.equal((await inspectBrowserBluetooth({ secureContext: true, navigator: {} })).kind, 'unsupported');
  assert.equal((await inspectBrowserBluetooth({ secureContext: true, navigator: {bluetooth: {requestDevice() {}}} })).kind, 'unknown');
  for (const getAvailability of [async () => {throw Error('reflected private data');}, () => new Promise(() => {}), async () => 'true']) {
    const result = await inspectBrowserBluetooth({secureContext: true, timeoutMs: 5, navigator: {bluetooth: {requestDevice() {}, getAvailability}}});
    assert.equal(result.kind, 'unknown'); assert.doesNotMatch(result.message, /reflected private data/);
  }
});

test('failed brand detection cannot reject an otherwise available Bluetooth API', async () => {
  const result = await inspectBrowserBluetooth({secureContext: true, timeoutMs: 5, navigator: {brave: {isBrave: () => new Promise(() => {})}, bluetooth: {requestDevice() {}, async getAvailability() {return true;}}}});
  assert.equal(result.kind, 'available'); assert.equal(result.brave, false);
});
