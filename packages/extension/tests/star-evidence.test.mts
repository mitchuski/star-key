import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packetsRoot, faceRoot, earnedLight, CHAIN_FACE_SCHEMA, CHAIN_FACES_SCHEMA } from '../src/star-evidence.js';

// The City's own vectors, published in mages.city/star.html beside its packets rule.
const A = 'sha256:98' + 'a'.repeat(62);
const B = 'sha256:04' + 'b'.repeat(62);
const VECTOR = { items: [`38|${A}`, `1|${B}`], root: 'sha256:bb0ce8ab8e08b5df9e25c0193aaafae1ddcd2d0fc95969867844aba3dd43a1b3' };
const TRACE_VECTOR = { items: [`38|${A}`, `1|${B}`, 'trace|composed|38>1'], root: 'sha256:8b2fafc53204c38dc24e4ce11bc24a89924e46ba2062fed31a413b0eca2d811b' };

const face = (over: Record<string, unknown> = {}) => ({
  schema: CHAIN_FACE_SCHEMA, name: 'a face of the evidence', states: { '1': { k: B, chain: 'x', kind: 'leaf' }, '38': { k: A, chain: 'y', kind: 'root' } },
  trace: { mode: 'composed', order: [38, 1] }, root: TRACE_VECTOR.root, count: 2, ...over,
});

test('the packets rule matches the City vectors', async () => {
  assert.equal(await packetsRoot(VECTOR.items), VECTOR.root);
  assert.equal(await packetsRoot(TRACE_VECTOR.items), TRACE_VECTOR.root);
  assert.equal(await packetsRoot([]), null);
});

test('a face root is re-derived from its states and trace', async () => {
  const d = await faceRoot(face());
  assert.equal(d.root, TRACE_VECTOR.root);
  assert.deepEqual(d.vertices, [1, 38]);
  // the order the vertices were chosen in is part of the face
  assert.notEqual((await faceRoot(face({ trace: { mode: 'composed', order: [1, 38] } }))).root, TRACE_VECTOR.root);
  await assert.rejects(faceRoot(face({ states: { '64': { k: A } } })), /outside the lattice/);
  await assert.rejects(faceRoot(face({ states: { '3': { k: 'not-a-root' } } })), /no root/);
});

test('earned light: faces that fold to the key\'s chains root light their vertices', async () => {
  const f = face();
  const chainsRoot = await packetsRoot([f.root as string]);
  const key = { version: 1, chains: { root: chainsRoot, count: 1 }, lit: [5] };
  const got = await earnedLight(key, { schema: CHAIN_FACES_SCHEMA, faces: [f] });
  assert.deepEqual(got, { ok: true, faces: 1, vertices: [1, 38], weight: { 1: 1, 38: 1 } });
  // claimed vertices never become earned ones
  assert.equal(got.ok && got.vertices.includes(5), false);
});

test('earned light refuses anything that does not re-derive', async () => {
  const f = face();
  const chainsRoot = await packetsRoot([f.root as string]);
  const key = { version: 1, chains: { root: chainsRoot, count: 1 } };
  const file = (faces: unknown[]) => ({ schema: CHAIN_FACES_SCHEMA, faces });
  // a root moved off its own state: the light is the hash's, not the placement's
  assert.match(((await earnedLight(key, file([face({ states: { '2': { k: B }, '38': { k: A } } })]))) as any).reason, /lands on 1/);
  // the states kept, the root left stale
  assert.match(((await earnedLight(key, file([face({ root: VECTOR.root })]))) as any).reason, /does not match/);
  // another face's file
  const other = face({ trace: { mode: 'composed', order: [1, 38] } });
  other.root = (await faceRoot(other)).root;
  assert.match(((await earnedLight(key, file([other]))) as any).reason, /do not fold/);
  // count mismatch, no faces on the key, not a faces file
  assert.equal((await earnedLight({ ...key, chains: { root: chainsRoot, count: 2 } }, file([f]))).ok, false);
  assert.equal((await earnedLight({ version: 1, lit: [1] }, file([f]))).ok, false);
  assert.equal((await earnedLight(key, { faces: [f] })).ok, false);
});
