import { createRoot } from 'react-dom/client';
import { useState, useRef, useEffect } from 'react';
import FitText from '../../public-site/FitText.jsx';
import '../../public-site/style.css';
function Fixture() {
  const [size,setSize]=useState('normal');
  const [model,setModel]=useState('not initialized'),worker=useRef(null);
  useEffect(()=>()=>worker.current?.terminate(),[]);
  const initialize=()=>{setModel('initializing without camera capture');const next=new Worker(new URL('../../src/head-tracker.worker.js',import.meta.url),{type:'module'});worker.current=next;next.onmessage=({data})=>{if(data.type==='ready')setModel('face model ready — no camera or robot used');if(data.type==='error')setModel(data.message);};next.onerror=()=>setModel('face worker failed');next.postMessage({type:'init'});};
  return <main className={`page ${size}`}><h1>Text layout fixtures</h1><label>Text display <select value={size} onChange={event=>setSize(event.target.value)}><option value="normal">Normal</option><option value="large">200% text</option><option value="spaced">Increased text spacing</option></select></label><div className="actions">
    <button><FitText>Computer-Mikrofon aktivieren</FitText></button><button><FitText>Gedrückt halten, um über Reachy zu sprechen</FitText></button><button><FitText>Kopfbewegung sofort anhalten</FitText></button><button><FitText>Neutrale Kopfposition übernehmen</FitText></button>
    </div><FitText as="p">Ich habe andere Roboter-Anwendungen beendet und verstehe, dass die Übertragung von Bewegung und Stopp im Browser nicht bestätigt wird.</FitText><FitText as="p">LängereVerbindungsfehlermeldungOhneLeerzeichenZurPrüfungDerVollständigenLesbarkeit</FitText><FitText as="p">Grüße 👋 — Rückmeldung und gemessene Position</FitText><FitText as="p">{''}</FitText><button onClick={initialize} disabled={model!=='not initialized'}><FitText>Initialize face model without camera</FitText></button><FitText as="p" id="face-model-result">{model}</FitText></main>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
