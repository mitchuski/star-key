// What you present at a door — the person's standing offers, chosen and
// ordered from the roster mirror. Used by the console's Agreements pane and
// by Options, so the choice is made in the extension wherever the person is.
//
// The order matters: at a community that takes terms, the first offer it
// accepts is the one the wallet proffers; with none accepted, the community's
// counter-offer is shown instead. Nothing here mints an agreement: the six
// rows are the roster's (`MYTERMS_ROSTER`), ticked and ordered, no more.

import { MYTERMS_ROSTER, offersOf } from "@openvtc/pnm-core/vtc";

export function TermsChooser({
  value,
  onChange,
  compact = false,
}: {
  /** The standing offers, most preferred first. */
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** Smaller type and no meanings, for Options. */
  compact?: boolean;
}) {
  const chosen = offersOf(value);
  const rest = MYTERMS_ROSTER.map((a) => a.code).filter((c) => !chosen.includes(c));
  const rows = [...chosen, ...rest];
  const move = (code: string, by: -1 | 1) => {
    const i = chosen.indexOf(code);
    const j = i + by;
    if (i < 0 || j < 0 || j >= chosen.length) return;
    const next = [...chosen];
    next.splice(i, 1);
    next.splice(j, 0, code);
    onChange(next);
  };
  const toggle = (code: string, on: boolean) => {
    onChange(on ? [...chosen, code] : chosen.filter((c) => c !== code));
  };
  const small = compact ? 12 : 13;
  return (
    <ol data-testid="terms-chooser" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: compact ? 4 : 8 }}>
      {rows.map((code) => {
        const a = MYTERMS_ROSTER.find((r) => r.code === code)!;
        const i = chosen.indexOf(code);
        const on = i >= 0;
        return (
          <li
            key={code}
            data-testid="terms-choice"
            data-code={code}
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr) auto",
              gap: 10,
              alignItems: "start",
              opacity: on ? 1 : 0.7,
            }}
          >
            <input
              type="checkbox"
              aria-label={`Present ${code}`}
              checked={on}
              onChange={(e) => toggle(code, e.target.checked)}
              style={{ margin: "3px 0 0" }}
            />
            <div style={{ minWidth: 0, fontSize: small, lineHeight: 1.45 }}>
              <div>
                {on ? <span style={{ opacity: 0.7 }}>{i + 1}. </span> : null}
                <code>{code}</code> — {a.title}
              </div>
              {!compact && <div style={{ opacity: 0.7 }}>{a.meaning}</div>}
            </div>
            <div style={{ display: "flex", gap: 4, visibility: on ? "visible" : "hidden" }}>
              <button type="button" aria-label={`Move ${code} up`} disabled={i <= 0} onClick={() => move(code, -1)} style={{ font: "inherit", padding: "0 6px" }}>
                ↑
              </button>
              <button type="button" aria-label={`Move ${code} down`} disabled={i < 0 || i >= chosen.length - 1} onClick={() => move(code, 1)} style={{ font: "inherit", padding: "0 6px" }}>
                ↓
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
