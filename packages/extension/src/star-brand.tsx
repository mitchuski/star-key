import './star-brand.css';
import { useEffect, useRef } from 'react';
import { createStarFigure, type StarFigure } from './star-figure.js';

// The popup's mark is the same Star the Setup spine forms and the toolbar icon
// shows (star-figure.ts; public/icon.svg is its still). Whole, with the core
// lit, once a VTA is selected; before that, the field and the two tetrahedra
// drawn faint — the shape waiting to be formed.
function StarMark({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const fig = useRef<StarFigure | null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    fig.current = createStarFigure(canvas.current, { interactive: false });
    return () => fig.current?.destroy();
  }, []);
  useEffect(() => {
    fig.current?.setLayers(active
      ? { field: { level: 1 }, sword: { level: 1 }, mage: { level: 1 }, routes: { level: 0.6 }, core: { level: 1 } }
      : { field: { level: 0.8 }, sword: { level: 0.6, next: true }, mage: { level: 0.6, next: true } });
  }, [active]);
  return <canvas ref={canvas} role="img" aria-label={active ? 'Star · VTA selected locally' : 'Star · no VTA selected'} style={{ width: 72, height: 72, display: 'block' }} />;
}

// Join a community from its DID (join-view.tsx): its own small window, so the
// camera prompt and a file picker do not close it the way they close the
// popup. The popup closes itself; the join carries on there.
function openJoin() {
  void chrome.windows.create({
    url: chrome.runtime.getURL('confirm.html?kind=join'),
    type: 'popup',
    width: 520,
    height: 600,
  });
  window.close();
}

export function StarBrand({ active = false }: { active?: boolean }) {
  return <header className="star-brand">
    <div className={active ? 'star-mini is-active' : 'star-mini'}><StarMark active={active} /></div>
    <div><div className="star-wordmark">star key</div><p>{active ? 'VTA selected · your chosen perspective' : 'Your boundaries. Your chosen perspective.'}</p></div>
    <a href="star.html" target="_blank" rel="noreferrer" aria-label="Inspect and prepare a selected City Key reading" title="Inspect a reading before sharing">📤</a>
    <a href="hold.html" target="_blank" rel="noreferrer" aria-label="What the Star holds — verify a Hold locally" title="What the Star holds">🪬</a>
    <button onClick={openJoin} aria-label="Join a community — paste its DID or scan its code" title="Join a community">🤝</button>
    <button onClick={() => window.close()} aria-label="Close Star" title="Close Star">✕</button>
  </header>;
}
