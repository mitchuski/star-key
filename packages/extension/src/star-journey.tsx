import { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { StarBrand } from './star-brand.js';
import { inspectCityKey, compressReading, type StarProjection } from './star-projection.js';
import './theme.css';
import './star.css';

function StarJourney() {
  const generation = useRef(0);
  const [reading, setReading] = useState<StarProjection | null>(null);
  const [includeVertices, setIncludeVertices] = useState(false);
  const [output, setOutput] = useState('');
  const [message, setMessage] = useState('');
  async function inspect(file?: File) {
    const current = ++generation.current;
    setReading(null); setOutput(''); setMessage(''); setIncludeVertices(false);
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw Error('Choose a key smaller than 1 MiB.');
      const next = inspectCityKey(JSON.parse(await file.text()));
      if (current !== generation.current) return;
      setReading(next); setMessage('Local reading prepared. No identity or relationship has been verified.');
    } catch (e) { if (current !== generation.current) return; setMessage(e instanceof Error ? e.message : 'The key could not be read.'); }
  }
  function download() {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'star-reading.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <><StarBrand /><main className="star-reading"><p className="star-kicker">THE JOURNEY YOU CHOOSE TO CARRY</p><h1>Read your City Key.</h1>
    <p>Inspect a selected local reading before it travels. Your original key remains with you.</p>
    <div className="star-grid"><section><img className="star-art" src="star-manifold.svg" alt="Editorial Star manifold; not a verified rendering of the imported key" /><p className="star-small">The Star is the model’s visual language. This artwork is illustrative; mapping a verified encounter is a later integration.</p></section>
    <section className="star-card"><label>Choose City Key JSON<input aria-label="Choose City Key JSON" type="file" accept=".json,application/json" onChange={e => { void inspect(e.target.files?.[0]); e.target.value = ''; }} /></label>
      {reading && <><h2>{reading.name}</h2><p>{reading.lit.length} claimed vertices · unverified import</p><p className="star-small">This reading includes only the name, palette and selected vertex list. Private fields, descriptions, identity, credentials and evidence are not copied.</p><label><input type="checkbox" checked={includeVertices} onChange={e => { setIncludeVertices(e.target.checked); setOutput(''); }} /> Include claimed vertices in the export</label>
      <button onClick={() => setOutput(compressReading(reading, includeVertices))}>Compress selected reading</button></>}
      <button disabled>Create ZK proof · coming soon</button><p className="star-small">Compression is compact JSON, not encryption or proof. This reading format is not a replacement City Key and is not yet accepted by Star consumers.</p>
      {output && <><pre>{output}</pre><button onClick={download}>Download inspected reading</button></>}
      <p role="status">{message}</p><button onClick={() => { generation.current++; setReading(null); setOutput(''); setMessage('Local reading cleared.'); }}>Clear reading</button></section></div>
    <nav><a href={import.meta.env.MODE === 'web-experiment' ? '../' : 'options.html#setup'}>{import.meta.env.MODE === 'web-experiment' ? 'About this experiment' : 'VTA setup'}</a><a href="https://agentprivacy.ai/city" target="_blank" rel="noreferrer">Your City Key ↗</a><a href="https://soulbis.com/star" target="_blank" rel="noreferrer">Open Soulbis Star ↗</a><a href="https://mages.city/" target="_blank" rel="noreferrer">Mages City ↗</a></nav>
    <p className="star-small">Star experiment on OpenVTC · all protocol names and upstream attribution retained. No data from this page is persisted or transmitted automatically.</p>
  </main></>;
}
createRoot(document.getElementById('root')!).render(<StarJourney />);
