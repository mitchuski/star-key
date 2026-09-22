// The Hold pane: what the Star holds, verified here, with WebCrypto, from a
// file the bearer chose. Nothing is persisted or transmitted. The verifier is
// star-hold.ts (the same root and states as the reference runtime and the
// agentprivacy runtime); this file only draws its answer.
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StarBrand } from './star-brand.js';
import { verifyHold, projectHold, type StarHold, type HoldVerification, type ItemResult } from './star-hold.js';
import { readHoldFile, readKeyFile } from './star-hold-file.js';
import './theme.css';
import './star.css';

const short = (s: string | null | undefined, n = 18) => (s ? (s.length > n * 2 ? s.slice(0, n) + '…' + s.slice(-8) : s) : '—');
const STATE_WORD: Record<ItemResult['state'], string> = { valid: 'valid', invalid: 'INVALID', unsupported: 'unsupported', unavailable: 'unavailable', 'not-checked': 'not checked' };

function HoldPane() {
  const generation = useRef(0);
  const [hold, setHold] = useState<StarHold | null>(null);
  const [key, setKey] = useState<Record<string, unknown> | null>(null);
  const [source, setSource] = useState<'hold' | 'fixture' | null>(null);
  const [result, setResult] = useState<HoldVerification | null>(null);
  const [projection, setProjection] = useState('');
  const [message, setMessage] = useState('');

  async function run(nextHold: StarHold, nextKey: Record<string, unknown> | null) {
    const current = ++generation.current;
    setResult(null); setProjection('');
    try {
      const v = await verifyHold(nextHold, { key: nextKey });
      if (current !== generation.current) return;
      setResult(v);
      setMessage(v.ok ? 'Verified locally. Nothing was sent anywhere.' : 'Something did not verify — read the findings.');
    } catch (e) { if (current === generation.current) setMessage(e instanceof Error ? e.message : 'The Hold could not be verified.'); }
  }
  async function chooseHold(file?: File) {
    if (!file) return;
    try {
      const read = readHoldFile(await file.text());
      setHold(read.hold); setSource(read.source);
      const k = read.key ?? key;
      if (read.key) setKey(read.key);
      setMessage('');
      await run(read.hold, k);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'The file could not be read.'); }
  }
  async function chooseKey(file?: File) {
    if (!file) return;
    try {
      const k = readKeyFile(await file.text());
      setKey(k); setMessage('');
      if (hold) await run(hold, k);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'The key could not be read.'); }
  }
  function clear() { generation.current++; setHold(null); setKey(null); setSource(null); setResult(null); setProjection(''); setMessage('Cleared.'); }
  function download() {
    if (!projection) return;
    const url = URL.createObjectURL(new Blob([projection], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'star-hold-projection.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const pct = result?.budget.bytes ? Math.min(100, Math.round((result.budget.used / result.budget.bytes) * 100)) : 0;
  return <><StarBrand /><main className="star-reading"><p className="star-kicker">WHAT THE STAR HOLDS</p><h1>Hold what was signed with you.</h1>
    <p>Choose a Hold file. Every item is re-verified here, the refs and the root re-derived, the bearer's signature checked. The key carries only the root and the count; the items stay in this file.</p>
    <div className="star-grid">
      <section className="star-card">
        <label>Choose a Hold JSON (or the reference fixture)<input aria-label="Choose a Hold JSON" type="file" accept=".json,application/json" onChange={e => { void chooseHold(e.target.files?.[0]); e.target.value = ''; }} /></label>
        <label>Optionally, the City Key it belongs to<input aria-label="Choose the City Key JSON" type="file" accept=".json,application/json" onChange={e => { void chooseKey(e.target.files?.[0]); e.target.value = ''; }} /></label>
        <p role="status">{message}</p>
        {hold && <p className="star-small">Source: {source === 'fixture' ? 'reference fixture (key included)' : 'a bare Hold'} · bearer <code>{short(hold.bearer, 14)}</code> · κ <code>{short(hold.kappa, 14)}</code> · at {hold.at}</p>}
        <button onClick={clear}>Clear</button>
      </section>
      {result && <section className="star-card">
        <h2>{result.ok ? 'Holds' : 'Does not hold'}</h2>
        <p className="star-small">root {result.root.matches ? 'matches' : 'MISMATCH'} · <code>{short(result.root.derived, 12)}</code>{result.root.stamped && !result.root.matches ? <> (stamped <code>{short(result.root.stamped, 12)}</code>)</> : null}<br />
          count {hold?.count} · refs {result.refsMatch ? 'match' : 'MISMATCH'} · bearer signature {result.bearerSig ? 'ok' : 'FAILED'} · key {result.keyChecked ? (result.keyMatches ? 'matches holds{root,count}' : 'DISAGREES') : 'not given'}</p>
        <label className="star-small">Budget · {result.budget.used.toLocaleString()} of {result.budget.bytes?.toLocaleString() ?? '?'} bytes{result.budget.fits === false ? ' · OVER' : ''}
          <progress max={100} value={pct} aria-label="Hold budget used" style={{ display: 'block', width: '100%' }} /></label>
        <table className="hold-table"><thead><tr><th>item</th><th>profile</th><th>role</th><th>state</th><th>bytes</th><th>signer</th></tr></thead><tbody>
          {result.items.map(i => <tr key={i.ref} className={'hold-' + i.state}><td><code>{short(i.ref, 8)}</code></td><td>{i.profile}</td><td>{i.role}</td><td>{STATE_WORD[i.state]}{i.reason ? <span className="star-small"> · {i.reason}</span> : null}</td><td>{i.signed.envelopeBytes.toLocaleString()}</td><td><code>{short(i.signer, 10)}</code></td></tr>)}
        </tbody></table>
        {result.why.length > 0 && <ul className="star-small">{result.why.map((w, n) => <li key={n}>{w}</li>)}</ul>}
        <p className="star-small">{result.allValid ? 'Every item is valid.' : 'Not every item is valid; states are listed, never averaged.'} Checked {result.checkedAt}.</p>
        <button onClick={() => { if (hold) setProjection(JSON.stringify(projectHold(hold), null, 2)); }}>Project · counts and states only</button>
        {projection && <><pre>{projection}</pre><button onClick={download}>Download projection</button></>}
        <p className="star-small">A projection is linkable, not permission. Presenting to a community (k vouches under its root) is not available yet; the runtime says exactly what is missing.</p>
      </section>}
    </div>
    <nav><a href="star.html">Read your City Key</a><a href="https://soulbis.com/guide/#hold" target="_blank" rel="noreferrer">What the Star holds ↗</a><a href="https://github.com/mitchuski/agentprivacy-mcp/tree/main/fixtures/star-hold-conformance" target="_blank" rel="noreferrer">Conformance pack ↗</a></nav>
    <p className="star-small">Verifier star-key/hold@0.1 · the OpenVTC Data Integrity suite through the wallet's own verifier, the agentprivacy record and the bilateral VRC through WebCrypto; declared suites report unsupported, never valid.</p>
  </main></>;
}
createRoot(document.getElementById('root')!).render(<HoldPane />);
