// The Star, drawn by setup — each step of the setup spine adds geometry.
//
// The figure is the progress display, read as a shape rather than a bar:
//
//   1. Your trust agent       → the seat: a ring and its six vertices
//   2. How to reach it        → the first triangle (⚔️ the Swordsman, pointing up)
//   3. Lock with a passkey    → the second triangle (🧙 the Mage, pointing down);
//                               the two keys together close the hexagram
//   4. Message routing        → the inner hexagon and the spokes that join it
//
// A step that is `now` is drawn faint and dashed — the shape it is about to
// add — so the figure says what comes next as well as what is done. When all
// four are done the star turns slowly; `prefers-reduced-motion` stops it.
//
// Purely presentational: it reads the same states the spine already shows and
// decides nothing. The geometry is illustrative, not a verified rendering of
// any key.

import { c, t } from "./theme.js";

export type StarStepState = "done" | "now" | "pending";

const R = 80; // outer radius
const r = R / Math.sqrt(3); // inner hexagon radius (where the triangles cross)
const at = (radius: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [radius * Math.cos(a), radius * Math.sin(a)] as const;
};
const pts = (radius: number, degs: number[]) =>
  degs.map((d) => at(radius, d).map((v) => v.toFixed(2)).join(",")).join(" ");

const HEX = [0, 60, 120, 180, 240, 300];
const UP = [0, 120, 240];
const DOWN = [60, 180, 300];

const LABELS = ["the seat", "⚔️ the Swordsman", "🧙 the Mage", "the routes"];

function layer(state: StarStepState) {
  if (state === "done") return { opacity: 1, dash: undefined, stroke: c.accent };
  if (state === "now") return { opacity: 0.55, dash: "4 5", stroke: c.muted };
  return { opacity: 0, dash: undefined, stroke: c.faint };
}

export function SetupStar({ steps }: { steps: StarStepState[] }) {
  const at4 = (i: number) => layer(steps[i] ?? "pending");
  const seat = at4(0), sword = at4(1), mage = at4(2), routes = at4(3);
  const done = steps.filter((s) => s === "done").length;
  const whole = done === steps.length;
  const nowIdx = steps.indexOf("now");
  const tr = "opacity 700ms ease, stroke 700ms ease";

  return (
    <figure style={{ margin: 0, display: "grid", justifyItems: "center", gap: 6 }}>
      <svg
        viewBox="-100 -100 200 200"
        width={176}
        height={176}
        role="img"
        aria-label={`Star setup: ${done} of ${steps.length} steps drawn`}
      >
        <style>{`
          .ss-turn { transform-origin: 0 0; ${whole ? "animation: ss-turn 60s linear infinite;" : ""} }
          @keyframes ss-turn { to { transform: rotate(360deg); } }
          @media (prefers-reduced-motion: reduce) { .ss-turn { animation: none; } }
        `}</style>
        {whole && <circle r={R + 12} fill={c.accent} opacity={0.08} />}
        <g className="ss-turn" fill="none" strokeLinejoin="round" strokeLinecap="round">
          {/* 1 · the seat */}
          <g style={{ opacity: seat.opacity, transition: tr }}>
            <circle r={R} stroke={seat.stroke} strokeWidth={1} strokeDasharray={seat.dash} opacity={0.6} />
            {HEX.map((d) => {
              const [x, y] = at(R, d);
              return <circle key={d} cx={x} cy={y} r={3} fill={seat.stroke} stroke="none" />;
            })}
            <circle r={3.5} fill={seat.stroke} stroke="none" />
          </g>
          {/* 4 · the routes — under the triangles so the star reads on top */}
          <g style={{ opacity: routes.opacity, transition: tr }}>
            <polygon points={pts(r, HEX.map((d) => d + 30))} stroke={routes.stroke} strokeWidth={1} strokeDasharray={routes.dash} />
            {HEX.map((d) => {
              const [x, y] = at(R, d);
              return <line key={d} x1={0} y1={0} x2={x} y2={y} stroke={routes.stroke} strokeWidth={0.75} strokeDasharray={routes.dash ?? "1 3"} />;
            })}
          </g>
          {/* 2 · ⚔️ the Swordsman's triangle */}
          <polygon
            points={pts(R, UP)}
            stroke={sword.stroke}
            strokeWidth={2}
            strokeDasharray={sword.dash}
            style={{ opacity: sword.opacity, transition: tr }}
          />
          {/* 3 · 🧙 the Mage's triangle */}
          <polygon
            points={pts(R, DOWN)}
            stroke={mage.stroke}
            strokeWidth={2}
            strokeDasharray={mage.dash}
            style={{ opacity: mage.opacity, transition: tr }}
          />
        </g>
      </svg>
      <figcaption style={{ fontSize: t.xs, color: c.muted, textAlign: "center", maxWidth: "28ch" }}>
        {whole
          ? "The star is whole."
          : nowIdx >= 0
            ? `Next: ${LABELS[nowIdx]} · ${done} of ${steps.length} drawn`
            : `${done} of ${steps.length} drawn`}
      </figcaption>
    </figure>
  );
}
