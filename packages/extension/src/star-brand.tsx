import './star-brand.css';
export function StarBrand({ active = false }: { active?: boolean }) {
  return <header className="star-brand">
    <div className={active ? 'star-mini is-active' : 'star-mini'}><img src="icon.svg" alt={active ? 'Star · VTA selected locally' : 'Star · no VTA selected'} width="72" height="72" /></div>
    <div><div className="star-wordmark">star key</div><p>{active ? 'VTA selected · your chosen perspective' : 'Your boundaries. Your chosen perspective.'}</p></div>
    <a href="star.html" target="_blank" rel="noreferrer" aria-label="Inspect and prepare a selected City Key reading" title="Inspect a reading before sharing">📤</a>
    <button onClick={() => window.close()} aria-label="Close Star" title="Close Star">✕</button>
  </header>;
}
