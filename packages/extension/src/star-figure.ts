// The Star as a figure that forms — a dependency-free 3D canvas renderer.
//
// Geometry follows the Star instrument on soulbis.com/star (PVM V5.4 canon):
// two interpenetrating tetrahedra at the core — the Swordsman's
// (`[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]`, coral) and the Mage's (its
// negation, cyan) — the {0,1}^6 lattice of 64 vertices projected along six
// golden-ratio generators, the succession cycle x → x+1 through that lattice,
// and the manifold shell r = R + ε·sin(mφ)·cos(nθ).
//
// Seen exactly along a 3-fold axis the two tetrahedra flatten into a
// hexagram; the camera is tilted off every such axis and the figure turns, so
// it reads as the solid it is. Drag to orbit; double-click to reset.
//
// Layers are switched on by the caller, each with a level in [0,1] and an
// optional "next" flag (drawn faint and dashed — the shape about to be added).
// Nothing here knows what a step means; it only draws.

export type LayerId = "field" | "sword" | "mage" | "routes" | "core" | "hold" | "invite";
export interface LayerState {
  level: number; // 0 hidden … 1 drawn
  next?: boolean; // drawn as a preview
}
export type Layers = Partial<Record<LayerId, LayerState>>;

export interface StarFigure {
  setLayers(layers: Layers): void;
  /** Turn or hold still. Dragging works either way. */
  setSpinning(on: boolean): void;
  isSpinning(): boolean;
  destroy(): void;
}

/** One turn about every 25 seconds — slow enough to read, quick enough to see it is solid. */
const SPIN_RAD_PER_MS = (Math.PI * 2) / 25000;

type V3 = [number, number, number];

const SWORD = [232, 82, 58] as const; // #e8523a
const MAGE = [77, 217, 232] as const; // #4dd9e8
const PALE = [240, 238, 232] as const; // #f0eee8

const PHI = (1 + Math.sqrt(5)) / 2;
const TET_A: V3[] = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
const TET_B: V3[] = TET_A.map(([x, y, z]) => [-x, -y, -z] as V3);
const FACES = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]] as const;
const EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]] as const;

const CORE = 0.6;
const scaleTo = (vs: V3[], r: number): V3[] => {
  const k = r / Math.hypot(...vs[0]!);
  return vs.map(([x, y, z]) => [x * k, y * k, z * k] as V3);
};
const SWORD_V = scaleTo(TET_A, CORE);
const MAGE_V = scaleTo(TET_B, CORE);

// {0,1}^6 lattice along six golden generators (as on /star), radius 0.8
const LATTICE: V3[] = (() => {
  const gen = ([[0, 1, PHI], [0, 1, -PHI], [1, PHI, 0], [1, -PHI, 0], [PHI, 0, 1], [PHI, 0, -1]] as V3[]).map(
    (v) => v.map((c) => c / Math.hypot(...v)) as V3,
  );
  const raw: V3[] = [];
  let max = 0;
  for (let x = 0; x < 64; x++) {
    const p: V3 = [0, 0, 0];
    for (let b = 0; b < 6; b++) {
      const s = ((x >> b) & 1) - 0.5;
      for (let i = 0; i < 3; i++) p[i] = p[i]! + s * gen[b]![i]!;
    }
    raw.push(p);
    max = Math.max(max, Math.hypot(...p));
  }
  return raw.map((p) => p.map((c) => (c * 0.8) / max) as V3);
})();

// the manifold shell as rings: latitudes and meridians of r = R + ε sin(mφ) cos(nθ)
const SHELL: V3[][] = (() => {
  const R = 1.18, eps = 0.07, m = 5, n = 6, rings: V3[][] = [];
  const pt = (phi: number, th: number): V3 => {
    const r = R + eps * Math.sin(m * phi) * Math.cos(n * th);
    return [r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)];
  };
  for (let i = 1; i < 8; i++) {
    const phi = (i / 8) * Math.PI, ring: V3[] = [];
    for (let j = 0; j <= 96; j++) ring.push(pt(phi, (j / 96) * Math.PI * 2));
    rings.push(ring);
  }
  for (let k = 0; k < 12; k++) {
    const th = (k / 12) * Math.PI * 2, ring: V3[] = [];
    for (let j = 0; j <= 48; j++) ring.push(pt((j / 48) * Math.PI, th));
    rings.push(ring);
  }
  return rings;
})();

const INVITE_AT: V3 = [1.75, 0.95, 0.35];
const INVITE_K = 0.22;

const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function createStarFigure(
  canvas: HTMLCanvasElement,
  opts: { interactive?: boolean; spinning?: boolean; onSpinChange?: (on: boolean) => void } = {},
): StarFigure {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setLayers() {}, setSpinning() {}, isSpinning: () => false, destroy() {} };
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HOME = { yaw: 0.62, pitch: 0.42 };
  let yaw = HOME.yaw, pitch = HOME.pitch, spinning = !reduce && opts.spinning !== false;
  let layers: Layers = {};
  let shown: Record<LayerId, number> = { field: 0, sword: 0, mage: 0, routes: 0, core: 0, hold: 0, invite: 0 };
  let raf = 0, dragging = false, moved = 0, lx = 0, ly = 0, w = 0, h = 0, dpr = 1, t0 = performance.now();

  const fit = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  };
  fit();
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
  ro?.observe(canvas);

  const rot = (p: V3): V3 => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x = p[0] * cy + p[2] * sy, z0 = -p[0] * sy + p[2] * cy;
    return [x, p[1] * cp - z0 * sp, p[1] * sp + z0 * cp];
  };
  const proj = (p: V3) => {
    const q = rot(p), d = 4.2, k = (Math.min(w, h) / 2 / 1.75) * (d / (d - q[2]));
    return { x: w / 2 + q[0] * k, y: h / 2 - q[1] * k, z: q[2], k };
  };

  const light = norm([0.5, 0.8, 0.6]);
  function solid(vs: V3[], col: readonly number[], lvl: number, next: boolean, at: V3 = [0, 0, 0], k = 1) {
    const P = vs.map(([x, y, z]) => [at[0] + x * k, at[1] + y * k, at[2] + z * k] as V3);
    const faces = FACES.map((f) => {
      const a = P[f[0]]!, b = P[f[1]]!, c = P[f[2]]!;
      const nrm = norm(rot(cross(sub(b, a), sub(c, a)) as V3));
      const centre: V3 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      return { pts: [a, b, c].map(proj), z: rot(centre)[2], lit: 0.45 + 0.55 * Math.abs(nrm[0] * light[0] + nrm[1] * light[1] + nrm[2] * light[2]) };
    }).sort((p, q) => p.z - q.z);
    if (!next) for (const f of faces) {
      ctx!.beginPath();
      f.pts.forEach((p, i) => (i ? ctx!.lineTo(p.x, p.y) : ctx!.moveTo(p.x, p.y)));
      ctx!.closePath();
      ctx!.fillStyle = rgba(col.map((c) => Math.round(c * f.lit)), 0.2 * lvl);
      ctx!.fill();
    }
    ctx!.setLineDash(next ? [4, 5] : []);
    ctx!.lineWidth = next ? 1 : 1.7;
    for (const [i, j] of EDGES) {
      const a = proj(P[i]!), b = proj(P[j]!);
      ctx!.strokeStyle = rgba(col, (next ? 0.55 : 0.95) * lvl * (0.65 + 0.35 * ((a.z + b.z) / 2 + 1)));
      ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
    }
    ctx!.setLineDash([]);
    if (!next) for (const v of P) glow(proj(v), col, 9 * k ** 0.5, 0.75 * lvl);
  }
  function glow(p: { x: number; y: number }, col: readonly number[], r: number, a: number) {
    const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, rgba(PALE, a)); g.addColorStop(0.3, rgba(col, a * 0.8)); g.addColorStop(1, rgba(col, 0));
    ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(p.x, p.y, r, 0, Math.PI * 2); ctx!.fill();
  }
  const mix = (t: number) => SWORD.map((c, i) => Math.round(c + (MAGE[i]! - c) * t));

  function frame(now: number) {
    const dt = Math.min(64, now - t0); t0 = now;
    if (!dragging && spinning) yaw += SPIN_RAD_PER_MS * dt;
    for (const id of Object.keys(shown) as LayerId[]) {
      const target = layers[id]?.level ?? 0;
      shown[id] += (target - shown[id]) * (reduce ? 1 : Math.min(1, dt / 260));
    }
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, w, h);
    const L = (id: LayerId) => shown[id], N = (id: LayerId) => !!layers[id]?.next;

    if (L("hold") > 0.01) {
      ctx!.lineWidth = 0.8; ctx!.setLineDash(N("hold") ? [3, 5] : []);
      SHELL.forEach((ring, ri) => {
        ctx!.strokeStyle = rgba(mix(ri / SHELL.length), 0.22 * L("hold"));
        ctx!.beginPath();
        ring.forEach((p, i) => { const q = proj(p); i ? ctx!.lineTo(q.x, q.y) : ctx!.moveTo(q.x, q.y); });
        ctx!.stroke();
      });
      ctx!.setLineDash([]);
    }
    if (L("routes") > 0.01) {
      ctx!.lineWidth = 0.9; ctx!.setLineDash(N("routes") ? [2, 4] : []);
      for (let x = 0; x < 64; x++) {
        const a = proj(LATTICE[x]!), b = proj(LATTICE[(x + 1) % 64]!);
        ctx!.strokeStyle = rgba(mix(x / 63), 0.4 * L("routes") * (0.55 + 0.45 * ((a.z + b.z) / 2 + 1)));
        ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
      }
      ctx!.setLineDash([]);
    }
    if (L("field") > 0.01) {
      LATTICE.map((p, i) => ({ q: proj(p), i })).sort((a, b) => a.q.z - b.q.z).forEach(({ q, i }) => {
        ctx!.fillStyle = rgba(mix(i / 63), (N("field") ? 0.35 : 0.85) * L("field") * (0.45 + 0.55 * ((q.z + 1) / 2)));
        ctx!.beginPath(); ctx!.arc(q.x, q.y, 1.6 + q.z * 0.6, 0, Math.PI * 2); ctx!.fill();
      });
    }
    // the two solids, back one first so they interpenetrate convincingly
    const order: [LayerId, V3[], readonly number[]][] = [["sword", SWORD_V, SWORD], ["mage", MAGE_V, MAGE]];
    order.sort((a, b) => rot(a[1][0]!)[2] - rot(b[1][0]!)[2]);
    for (const [id, vs, col] of order) if (L(id) > 0.01) solid(vs, col, L(id), N(id));
    if (L("core") > 0.01) {
      const c = proj([0, 0, 0]), pulse = reduce ? 1 : 0.85 + 0.15 * Math.sin(now / 700);
      glow(c, MAGE, 34 * pulse, 0.5 * L("core"));
      glow(c, SWORD, 18 * pulse, 0.7 * L("core"));
    }
    if (L("invite") > 0.01) {
      const a = proj([0, 0, 0]), b = proj(INVITE_AT);
      ctx!.setLineDash([3, 5]); ctx!.lineWidth = 1;
      ctx!.strokeStyle = rgba(PALE, 0.45 * L("invite"));
      ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke(); ctx!.setLineDash([]);
      solid(SWORD_V, SWORD, L("invite"), N("invite"), INVITE_AT, INVITE_K / CORE);
      solid(MAGE_V, MAGE, L("invite"), N("invite"), INVITE_AT, INVITE_K / CORE);
    }
    raf = requestAnimationFrame(frame);
  }

  const onDown = (e: PointerEvent) => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    moved += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
    yaw += (e.clientX - lx) * 0.008;
    pitch = Math.max(-1.2, Math.min(1.2, pitch + (e.clientY - ly) * 0.008));
    lx = e.clientX; ly = e.clientY;
  };
  const setSpinning = (on: boolean) => { spinning = on; opts.onSpinChange?.(on); };
  // a click that did not drag toggles the turning
  const onUp = () => { if (dragging && moved < 4) setSpinning(!spinning); dragging = false; };
  const onDbl = () => { yaw = HOME.yaw; pitch = HOME.pitch; };
  if (opts.interactive !== false) {
    canvas.style.cursor = "grab"; canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("dblclick", onDbl);
  }
  raf = requestAnimationFrame(frame);

  return {
    setLayers(next) { layers = next; },
    setSpinning,
    isSpinning: () => spinning,
    destroy() {
      cancelAnimationFrame(raf); ro?.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("dblclick", onDbl);
    },
  };
}
