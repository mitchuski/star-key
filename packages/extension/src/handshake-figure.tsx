// The handshake — the Star and a site coming together over terms.
//
// Drawn, not said: the wallet's own Star (`star-figure.ts`, the same solid the
// header and Setup show) on the left, the site's mark on the right, and the
// manifold between them — a ring that is open while nothing is agreed and
// closes around both when terms meet. The 🤝 settles at the join when the
// site takes one of the person's offers; the core of the Star lights once an
// agreement stands. Purely presentational: it reads a state the window
// already computed and decides nothing.
//
//   apart     no terms known yet, or the site cannot be read     ring open, faint
//   none      the site publishes no terms                        ring open, nothing between
//   offered   the site takes one of your offers                  ring closing, 🤝
//   agreed    an agreement already stands with it                ring closed, core lit, 🤝
//
// `prefers-reduced-motion` draws the final state with no transition.

import { useEffect, useRef } from "react";
import { createStarFigure, type StarFigure } from "./star-figure.js";
import { c, t } from "./theme.js";

export type HandshakeState = "apart" | "none" | "offered" | "agreed";

const W = 300;
const H = 120;
const STAR = { x: 62, y: 60, r: 40 };
const SITE = { x: 238, y: 60, r: 18 };
/** The manifold: an ellipse around both marks. */
const RING = { cx: 150, cy: 60, rx: 136, ry: 50 };
const RING_LEN = Math.PI * (3 * (RING.rx + RING.ry) - Math.sqrt((3 * RING.rx + RING.ry) * (RING.rx + 3 * RING.ry)));

export function HandshakeFigure({ state, host, code }: { state: HandshakeState; host?: string; code?: string }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const fig = useRef<StarFigure | null>(null);
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!canvas.current) return;
    fig.current = createStarFigure(canvas.current, { interactive: false });
    return () => fig.current?.destroy();
  }, []);
  useEffect(() => {
    const core = state === "agreed" ? 1 : state === "offered" ? 0.6 : 0;
    fig.current?.setLayers({
      field: { level: 1 },
      sword: { level: 1 },
      mage: { level: 1 },
      routes: { level: state === "apart" || state === "none" ? 0.3 : 0.6 },
      core: { level: core, ...(state === "offered" ? { next: true } : {}) },
    });
  }, [state]);

  // How much of the ring is drawn: open while apart, closed when terms meet.
  const drawn = state === "agreed" ? 1 : state === "offered" ? 0.97 : state === "none" ? 0.35 : 0.55;
  const tone = state === "agreed" ? c.ok : state === "offered" ? c.accent : c.line;
  const transition = reduce ? "none" : "stroke-dashoffset 900ms ease, stroke 600ms ease, opacity 600ms ease";
  const initial = (host ?? "?").replace(/^www\./, "").charAt(0).toUpperCase() || "?";
  const label =
    state === "agreed"
      ? `An agreement stands with ${host ?? "this community"}${code ? ` under ${code}` : ""}.`
      : state === "offered"
        ? `${host ?? "This community"} takes your terms${code ? ` (${code})` : ""}.`
        : state === "none"
          ? `${host ?? "This site"} publishes no terms.`
          : `No agreement with ${host ?? "this community"} yet.`;

  return (
    <figure
      data-testid="handshake"
      data-state={state}
      style={{ margin: 0, position: "relative", width: W, height: H, maxWidth: "100%", justifySelf: "center" }}
      aria-label={label}
      role="img"
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-hidden>
        {/* the manifold */}
        <ellipse
          cx={RING.cx}
          cy={RING.cy}
          rx={RING.rx}
          ry={RING.ry}
          fill="none"
          stroke={tone}
          strokeWidth={state === "agreed" ? 2 : 1.5}
          strokeDasharray={`${RING_LEN}`}
          strokeDashoffset={`${RING_LEN * (1 - drawn)}`}
          strokeLinecap="round"
          style={{ transition, opacity: state === "none" ? 0.4 : 0.9 }}
          transform={`rotate(-20 ${RING.cx} ${RING.cy})`}
        />
        {/* the site's mark */}
        <circle cx={SITE.x} cy={SITE.y} r={SITE.r} fill="none" stroke={state === "none" ? c.line : c.accent} strokeWidth={1.5} style={{ transition }} />
        <text x={SITE.x} y={SITE.y + 5} textAnchor="middle" fontSize="14" fontWeight="600" fill={c.text} style={{ fontFamily: "inherit" }}>
          {initial}
        </text>
        {/* the join */}
        <text
          x={RING.cx}
          y={RING.cy + 8}
          textAnchor="middle"
          fontSize="22"
          style={{ transition, opacity: state === "offered" || state === "agreed" ? 1 : 0 }}
        >
          🤝
        </text>
        {state === "agreed" ? (
          <text x={RING.cx + 18} y={RING.cy - 6} fontSize="11" fill={c.ok} style={{ transition }}>
            ✓
          </text>
        ) : null}
      </svg>
      <canvas
        ref={canvas}
        aria-hidden
        style={{ position: "absolute", left: STAR.x - STAR.r, top: STAR.y - STAR.r, width: STAR.r * 2, height: STAR.r * 2, display: "block" }}
      />
      <figcaption style={{ position: "absolute", left: 0, right: 0, bottom: -4, textAlign: "center", fontSize: t.xs, color: c.muted }} data-testid="handshake-caption">
        {label}
      </figcaption>
    </figure>
  );
}
