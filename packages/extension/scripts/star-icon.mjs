#!/usr/bin/env node
// Write public/icon.svg: a still of the Star figure (see src/star-figure.ts) —
// the Swordsman's and the Mage's interpenetrating tetrahedra in the canon
// colours, seen from the figure's home camera, with a faint lattice behind.
// The same solid the Setup spine forms, so the toolbar icon, the popup and
// Setup show one figure. Re-run after changing the geometry or the camera,
// then `sh scripts/render-icons.sh` (or the headless-Chrome route) for PNGs.
//
//   node scripts/star-icon.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SWORD = [232, 82, 58], MAGE = [77, 217, 232];
const TET_A = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
const TET_B = TET_A.map(([x, y, z]) => [-x, -y, -z]);
const FACES = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];
const EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
const PHI = (1 + Math.sqrt(5)) / 2;

// the figure's home camera (star-figure.ts HOME): off every 3-fold axis, so it never flattens to a hexagram
const YAW = Number(process.env.STAR_YAW ?? 1.2), PITCH = Number(process.env.STAR_PITCH ?? 0.8);
const SIZE = 128, C = SIZE / 2, SCALE = 44; // tetra tips at ~0.6 → about 44px from centre at radius 1

const rot = ([x, y, z]) => {
  const cy = Math.cos(YAW), sy = Math.sin(YAW), cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  const X = x * cy + z * sy, Z0 = -x * sy + z * cy;
  return [X, y * cp - Z0 * sp, y * sp + Z0 * cp];
};
const proj = (p) => { const q = rot(p), d = 4.2, k = SCALE * (d / (d - q[2])); return { x: C + q[0] * k, y: C - q[1] * k, z: q[2] }; };
const unit = (vs) => { const k = 1 / Math.hypot(...vs[0]); return vs.map((v) => v.map((c) => c * k)); };
const sub = (a, b) => a.map((c, i) => c - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((c) => c / l); };
const light = norm([0.5, 0.8, 0.6]);
const f = (n) => n.toFixed(2);
const rgb = (c, k = 1) => `rgb(${c.map((v) => Math.round(Math.min(255, v * k))).join(",")})`;

// faint lattice: the {0,1}^6 vertices along the six golden generators, radius 0.95
const gen = [[0, 1, PHI], [0, 1, -PHI], [1, PHI, 0], [1, -PHI, 0], [PHI, 0, 1], [PHI, 0, -1]].map((v) => norm(v));
const raw = [];
for (let x = 0; x < 64; x++) {
  const p = [0, 0, 0];
  for (let b = 0; b < 6; b++) { const s = ((x >> b) & 1) - 0.5; for (let i = 0; i < 3; i++) p[i] += s * gen[b][i]; }
  raw.push(p);
}
const maxR = Math.max(...raw.map((p) => Math.hypot(...p)));
const dots = raw.map((p) => proj(p.map((c) => (c * 0.95) / maxR))).sort((a, b) => a.z - b.z)
  .map((q, i) => `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(0.9 + q.z * 0.35)}" fill="${rgb(i % 2 ? SWORD : MAGE)}" opacity="${f(0.18 + 0.22 * (q.z + 1) / 2)}"/>`).join("");

function solid(vs, col) {
  const P = unit(vs);
  const faces = FACES.map((fc) => {
    const [a, b, c] = fc.map((i) => P[i]);
    const n = norm(rot(cross(sub(b, a), sub(c, a))));
    const lit = 0.45 + 0.55 * Math.abs(n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
    const z = rot([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3])[2];
    return { pts: [a, b, c].map(proj), lit, z };
  }).sort((p, q) => p.z - q.z);
  const fill = faces.map((fc) => `<polygon points="${fc.pts.map((p) => `${f(p.x)},${f(p.y)}`).join(" ")}" fill="${rgb(col, fc.lit)}" fill-opacity="0.28"/>`).join("");
  const edges = EDGES.map(([i, j]) => {
    const a = proj(P[i]), b = proj(P[j]), depth = 0.6 + 0.4 * ((a.z + b.z) / 2 + 1) / 2;
    return `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}" stroke="${rgb(col)}" stroke-opacity="${f(depth)}" stroke-width="3.4" stroke-linecap="round"/>`;
  }).join("");
  const tips = P.map((v) => { const q = proj(v); return `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="4.2" fill="url(#g${col === SWORD ? "s" : "m"})"/>`; }).join("");
  return { z: rot(P[0])[2], svg: fill + edges + tips };
}
const pair = [solid(TET_A, SWORD), solid(TET_B, MAGE)].sort((a, b) => a.z - b.z);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
<defs>
<radialGradient id="bg" cx="50%" cy="46%" r="62%"><stop offset="0" stop-color="#142a3c"/><stop offset="1" stop-color="#0b1726"/></radialGradient>
<radialGradient id="core"><stop offset="0" stop-color="#f0eee8" stop-opacity=".9"/><stop offset=".35" stop-color="${rgb(MAGE)}" stop-opacity=".45"/><stop offset="1" stop-color="${rgb(MAGE)}" stop-opacity="0"/></radialGradient>
<radialGradient id="gs"><stop offset="0" stop-color="#f0eee8"/><stop offset=".4" stop-color="${rgb(SWORD)}" stop-opacity=".8"/><stop offset="1" stop-color="${rgb(SWORD)}" stop-opacity="0"/></radialGradient>
<radialGradient id="gm"><stop offset="0" stop-color="#f0eee8"/><stop offset=".4" stop-color="${rgb(MAGE)}" stop-opacity=".8"/><stop offset="1" stop-color="${rgb(MAGE)}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${SIZE}" height="${SIZE}" rx="24" fill="url(#bg)"/>
${dots}
${pair[0].svg}
<circle cx="${C}" cy="${C}" r="13" fill="url(#core)"/>
${pair[1].svg}
</svg>
`;

const out = process.env.STAR_ICON_OUT ?? fileURLToPath(new URL("../public/icon.svg", import.meta.url));
writeFileSync(out, svg);
console.log(`wrote ${out} (${svg.length} bytes)`);
