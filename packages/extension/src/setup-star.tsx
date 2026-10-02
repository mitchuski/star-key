// The Star, formed by setup — each step of the setup spine adds to the solid.
//
// The figure is the progress display, read as a shape rather than a bar. It is
// the Star instrument's geometry (see `star-figure.ts`), in 3D and turning:
//
//   1. Your trust agent       → the field: the 64-vertex lattice appears
//   2. How to reach it        → ⚔️ the Swordsman's tetrahedron (coral)
//   3. Lock with a passkey    → 🧙 the Mage's tetrahedron (cyan), interlocking
//   4. Message routing        → the succession cycle threads the lattice
//   all four                  → the core lights
//
// A step that is `now` is drawn faint and dashed — the shape it is about to
// add. Drag to turn it; double-click to reset. `prefers-reduced-motion` stops
// the turning. Purely presentational: it reads the states the spine already
// shows and decides nothing; the geometry is illustrative, not a verified
// rendering of any key.

import { useEffect, useRef } from "react";
import { createStarFigure, type LayerId, type Layers, type StarFigure } from "./star-figure.js";
import { c, t } from "./theme.js";

export type StarStepState = "done" | "now" | "pending";

const STEP_LAYERS: LayerId[] = ["field", "sword", "mage", "routes"];
const LABELS = ["the field", "⚔️ the Swordsman", "🧙 the Mage", "the routes"];

export function SetupStar({ steps }: { steps: StarStepState[] }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const fig = useRef<StarFigure | null>(null);
  const done = steps.filter((s) => s === "done").length;
  const whole = steps.length > 0 && done === steps.length;
  const nowIdx = steps.indexOf("now");
  const key = steps.join(",");

  useEffect(() => {
    if (!canvas.current) return;
    fig.current = createStarFigure(canvas.current);
    return () => fig.current?.destroy();
  }, []);

  useEffect(() => {
    const layers: Layers = {};
    STEP_LAYERS.forEach((id, i) => {
      const s = steps[i] ?? "pending";
      layers[id] = s === "done" ? { level: 1 } : s === "now" ? { level: 0.7, next: true } : { level: 0 };
    });
    layers.core = { level: whole ? 1 : 0 };
    fig.current?.setLayers(layers);
    // `key` carries the step states; `steps` itself is a fresh array each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, whole]);

  return (
    <figure style={{ margin: 0, display: "grid", justifyItems: "center", gap: 6 }}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Star setup: ${done} of ${steps.length} steps formed. Drag to turn.`}
        style={{ width: 200, height: 200, display: "block" }}
      />
      <figcaption style={{ fontSize: t.xs, color: c.muted, textAlign: "center", maxWidth: "30ch" }}>
        {whole
          ? "The star is whole."
          : nowIdx >= 0
            ? `Next: ${LABELS[nowIdx]} · ${done} of ${steps.length} formed`
            : `${done} of ${steps.length} formed`}
      </figcaption>
    </figure>
  );
}
