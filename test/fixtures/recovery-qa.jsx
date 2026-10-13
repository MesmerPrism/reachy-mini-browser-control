import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import RecoveryGuide from '../../public-site/RecoveryGuide.jsx';
import { inspectBrowserBluetooth } from '../../src/browser-bluetooth.mjs';
import '../../public-site/style.css';
function Harness() {
  const [mode, setMode] = useState('brave'), [events, setEvents] = useState([]), [visible, setVisible] = useState(true);
  const record = event => setEvents(previous => [...previous, event]);
  const inspect = () => {
    const bluetooth = {requestDevice() { record('Unexpected chooser call'); throw Error('Chooser forbidden in this fixture'); }, async getAvailability() { record('Read-only adapter check'); if (mode === 'timeout') return new Promise(() => {}); if (mode === 'denied') throw Error('Synthetic reflected private error'); return mode !== 'off'; }};
    return inspectBrowserBluetooth({secureContext: mode !== 'insecure', timeoutMs: 30, navigator: mode === 'brave' ? {brave: {isBrave: async () => true}} : {bluetooth}});
  };
  return <main><h1>Recovery guide offline fixtures</h1><p>This harness uses synthetic browser capabilities and sends no robot requests.</p>
    <label htmlFor="fixture-mode">Capability fixture</label><select id="fixture-mode" value={mode} onChange={event => {setMode(event.target.value); setEvents([]);}}>{['brave','available','off','timeout','denied','insecure'].map(value => <option key={value}>{value}</option>)}</select>
    <button onClick={() => setVisible(value => !value)}>{visible ? 'Hide guide' : 'Show guide'}</button>
    <output aria-label="Fixture calls">{events.length ? events.join(' · ') : 'No capability calls'}</output>
    {visible && <RecoveryGuide key={mode} inspectBluetooth={inspect} />}
  </main>;
}
createRoot(document.getElementById('root')).render(<Harness />);
