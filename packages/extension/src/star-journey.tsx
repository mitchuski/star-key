import { addressReading } from './star-registry.js';
import { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { StarBrand } from './star-brand.js';
import { inspectCityKey, compressReading, retainedSummary, type StarProjection, type RetainedSummary } from './star-projection.js';
import './theme.css';
import './star.css';

function StarJourney() {
  const generation = useRef(0);
  const [reading, setReading] = useState<StarProjection | null>(null);
  const [retained, setRetained] = useState<RetainedSummary | null>(null);
  const [includeVertices, setIncludeVertices] = useState(false);
  const [output, setOutput] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  async function inspect(file?: File) {
    const current = ++generation.current;
    setReading(null); setAddress(''); setOutput(''); setMessage(''); setIncludeVertices(false); setRetained(null);
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw Error('Choose a key smaller than 1 MiB.');
      const parsed: unknown = JSON.parse(await file.text());
      const next = inspectCityKey(parsed);
      if (current !== generation.current) return;
      setReading(next); setRetained(retainedSummary(parsed)); setMessage('Local reading prepared. No identity or relationship has been verified.');
    } catch (e) { if (current !== generation.current) return; setMessage(e instanceof Error ? e.message : 'The key could not be read.'); }
  }
  function download() {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'star-registry-entry.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <><StarBrand /><main className="star-reading"><p className="star-kicker">THE JOURNEY YOU CHOOSE TO CARRY</p><h1>Read your City Key.</h1>
    <p>Inspect a selected local reading before it travels. Your original key remains with you.</p>
    <div className="star-grid"><section><img className="star-art" src="star-manifold.svg" alt="Editorial Star manifold; not a verified rendering of the imported key" /><p className="star-small">The Star is the model’s visual language. This artwork is illustrative; mapping a verified encounter is a later integration.</p></section>
    <section className="star-card"><label>Choose City Key JSON<input aria-label="Choose City Key JSON" type="file" accept=".json,application/json" onChange={e => { void inspect(e.target.files?.[0]); e.target.value = ''; }} /></label>
      {reading && <><h2>{reading.name}</h2><p>{reading.lit.length} claimed vertices · unverified import</p><p className="star-small">This reading includes only the name, palette and selected vertex list. Private fields, descriptions, identity, credentials and evidence are not copied.</p>{retained && <details className="star-small"><summary>Accessible past · what stays behind</summary>
        <p>This reading carries: name · palette{includeVertices ? ` · ${reading.lit.length} claimed vertices` : ''}.</p>
        <p>The retained key still holds: {[retained.kappa ? 'κ' : null, retained.prior ? 'prior κ (lineage)' : null, retained.walks ? `${retained.walks} walks` : null, retained.packets ? `${retained.packets} packets` : null, retained.chains ? `${retained.chains} ${retained.chains === 1 ? 'face' : 'faces'} of the evidence` : null, retained.descriptions ? `${retained.descriptions} descriptions` : null, retained.focus ? `${retained.focus} focus entries` : null, retained.identity ? 'identity' : null, retained.did ? 'did' : null, retained.trace ? 'trace' : null, retained.figures ? 'figures' : null, retained.geometry ? 'geometry' : null, retained.receipts ? `${retained.receipts} receipts` : null, retained.credentials ? `${retained.credentials} credentials` : null].filter(Boolean).join(' · ') || 'nothing beyond this reading'}{retained.other.length ? ` · other fields: ${retained.other.join(', ')}` : ''}. Counts only; no value is shown or exported.</p>
        <p>A reader holding the retained key, or the City's logs, can reconstruct lineage this reading omits. Provenance needs a declared reader and an explicit access basis; decide whether lineage references are disclosable before export.</p>
      </details>}<label><input type="checkbox" checked={includeVertices} onChange={e => { generation.current++; setIncludeVertices(e.target.checked); setAddress(''); setOutput(''); }} /> Include claimed vertices in the export</label>
      <button onClick={async () => { const current = ++generation.current; try { const entry = await addressReading(JSON.parse(compressReading(reading, includeVertices))); if (current !== generation.current) return; setAddress(entry.kappa); setOutput(JSON.stringify(entry, null, 2)); setMessage('Content address derived locally. Ready for your selected UOR registry.'); } catch (e) { if (current === generation.current) setMessage(e instanceof Error ? e.message : 'Addressing failed'); } }}>Address selected reading · κ</button></>}
      <button disabled>Create ZK proof · coming soon</button><p className="star-small">Compression is compact JSON, not encryption or proof. The registry entry wraps the selected reading. Register it with scripts/star-registry.mjs; the adapter uploads canonical bytes and verifies the read-back. It does not replace a City Key or issue a credential.</p>
      {address && <p className="star-small" style={{overflowWrap: 'anywhere'}}>κ · {address}<br />Canonical JSON · SHA-256 · content address, not an identity anchor</p>}{output && <><pre>{output}</pre><button onClick={download}>Download registry entry</button></>}
      <p role="status">{message}</p><button onClick={() => { generation.current++; setReading(null); setRetained(null); setAddress(''); setOutput(''); setMessage('Local reading cleared.'); }}>Clear reading</button></section></div>
    <nav><a href={import.meta.env.MODE === 'web-experiment' ? '../' : 'options.html#setup'}>{import.meta.env.MODE === 'web-experiment' ? 'About this experiment' : 'VTA setup'}</a><a href="https://agentprivacy.ai/city" target="_blank" rel="noreferrer">Your City Key ↗</a><a href="https://soulbis.com/star" target="_blank" rel="noreferrer">Open Soulbis Star ↗</a><a href="https://mages.city/" target="_blank" rel="noreferrer">Mages City ↗</a></nav>
    <p className="star-small">Star experiment on OpenVTC · all protocol names and upstream attribution retained. No data from this page is persisted or transmitted automatically.</p>
  </main></>;
}
createRoot(document.getElementById('root')!).render(<StarJourney />);
