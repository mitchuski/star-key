import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyHold, projectHold, verifyEnvelope, itemBytes, merkleRoot, kappaOf, type StarHold } from '../src/star-hold.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, 'fixtures', 'star-hold.fixture.json'), 'utf8')) as { schema: string; key: Record<string, unknown>; hold: StarHold; expected: { root: string; count: number; kappa: string; states: { ref: string; profile: string; state: string }[] } };

test('parity: the runtime fixture verifies in the extension to the same root, count, κ and per-item states', async () => {
  assert.equal(fixture.schema, 'star-hold-fixture/1');
  const v = await verifyHold(fixture.hold, { key: fixture.key });
  assert.equal(v.ok, true, v.why.join('; '));
  assert.equal(v.root.derived, fixture.expected.root);
  assert.equal(fixture.hold.count, fixture.expected.count);
  assert.equal(await kappaOf(fixture.key), fixture.expected.kappa);
  assert.equal(v.keyMatches, true);
  assert.deepEqual(v.items.map((i) => ({ ref: i.ref, profile: i.profile, state: i.state })), fixture.expected.states);
  assert.equal(v.items.filter((i) => i.state === 'valid').length, 7);
  assert.equal(await merkleRoot(fixture.hold.items.map((i) => i.ref)), fixture.expected.root);
});

test('the OpenVTC suite goes through the wallet\'s own verifier; the mages.city record and the bilateral VRC through WebCrypto; declared suites stay unsupported', async () => {
  const byProfile = (p: string) => fixture.hold.items.find((i) => i.profile === p)!;
  assert.equal((await verifyEnvelope('trust-task/eddsa-jcs-2022', itemBytes(byProfile('trust-task/eddsa-jcs-2022')))).state, 'valid');
  assert.equal((await verifyEnvelope('vc/eddsa-jcs-2022', itemBytes(byProfile('vc/eddsa-jcs-2022')))).state, 'valid');
  assert.equal((await verifyEnvelope('agentprivacy.vta/1', itemBytes(byProfile('agentprivacy.vta/1')))).state, 'valid');
  assert.equal((await verifyEnvelope('agentprivacy.vrc/1', itemBytes(byProfile('agentprivacy.vrc/1')))).signed.sigBytes, 128);
  const declared = new TextEncoder().encode(JSON.stringify({ '@context': [], type: ['VerifiableCredential'], proof: { type: 'EcdsaSecp256k1Signature2019', jws: 'x' } }));
  assert.equal((await verifyEnvelope('vc/ecdsa-secp256k1-2019', declared)).state, 'unsupported');
  assert.equal((await verifyEnvelope('vc/ecdsa-secp256k1-2019', declared)).signed.sigBytes, null);
  // a changed payload is invalid; an unresolvable DID method is unavailable, never invalid
  const doc = JSON.parse(new TextDecoder().decode(itemBytes(byProfile('trust-task/eddsa-jcs-2022'))));
  const changed = new TextEncoder().encode(JSON.stringify({ ...doc, payload: { statement: 'changed' } }));
  assert.equal((await verifyEnvelope('trust-task/eddsa-jcs-2022', changed)).state, 'invalid');
  const unresolvable = new TextEncoder().encode(JSON.stringify({ ...doc, proof: { ...doc.proof, verificationMethod: 'did:webvh:example.com:abc#key-0' } }));
  assert.equal((await verifyEnvelope('trust-task/eddsa-jcs-2022', unresolvable)).state, 'unavailable');
});

test('tampering is caught at the ref, the root and the bearer signature; the projection carries no envelopes or counterpart DIDs', async () => {
  const t = structuredClone(fixture.hold);
  const d = JSON.parse(new TextDecoder().decode(itemBytes(t.items[1]))); d.credentialSubject.relationship = 'vouched-harder';
  t.items[1].envelope = btoa(JSON.stringify(d)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const v = await verifyHold(t);
  assert.equal(v.ok, false); assert.equal(v.refsMatch, false);
  const c = structuredClone(fixture.hold); c.count = 99;
  assert.equal((await verifyHold(c)).bearerSig, false);
  const wrongKey = { ...fixture.key, lit: [1] };
  assert.equal((await verifyHold(fixture.hold, { key: wrongKey })).keyMatches, false);
  const p = JSON.stringify(projectHold(fixture.hold));
  assert.equal(p.includes('"envelope"'), false);
  for (const i of fixture.hold.items) if (i.role === 'counterpart' && i.signer) assert.equal(p.includes(i.signer.did), false);
  assert.equal(p.includes(fixture.hold.bearer), true);
});

test('a disclosure: chosen items carry a path to the root, verify against the key root, and are smaller than the Hold; a changed envelope, a stray path or a wrong root fails', async () => {
  const { discloseHold, verifyDisclosure, merklePath, rootFromPath, disclosureBytes } = await import('../src/star-hold.js');
  const leaves = fixture.hold.items.map((i) => i.ref);
  for (const leaf of leaves) assert.equal(await rootFromPath(leaf, (await merklePath(leaves, leaf))!), fixture.expected.root);
  assert.equal(await merklePath(leaves, 'sha256:' + '0'.repeat(64)), null);
  const chosen = [fixture.hold.items[0]!.ref, fixture.hold.items[5]!.ref];
  const d = await discloseHold(fixture.hold, chosen, new Date('2026-10-21T00:00:00Z'));
  assert.equal(d.k, 2);
  assert.equal(d.count, 7);
  assert.equal(d.root, fixture.expected.root);
  const v = await verifyDisclosure(d, { root: (fixture.key.holds as { root: string }).root });
  assert.equal(v.ok, true, v.why.join('; '));
  assert.ok(v.items.every((i) => i.underRoot && i.state === 'valid'));
  assert.ok(disclosureBytes(d) < Buffer.byteLength(JSON.stringify(fixture.hold)), 'a disclosure is smaller than the Hold');
  assert.equal((await verifyDisclosure(d, { root: 'sha256:' + 'f'.repeat(64) })).ok, false);
  const tampered = { ...d, items: [{ ...d.items[0]!, envelope: d.items[1]!.envelope }, d.items[1]!] };
  assert.equal((await verifyDisclosure(tampered)).ok, false);
  const stray = { ...d, items: [{ ...d.items[0]!, path: d.items[1]!.path }, d.items[1]!] };
  assert.equal((await verifyDisclosure(stray)).ok, false);
  await assert.rejects(discloseHold(fixture.hold, ['sha256:' + '0'.repeat(64)]), /choose at least one/);
});

test('leaf/node confusion: an interior Merkle node presented as an item, with its bytes as the node preimage and a shortened path, is refused', async () => {
  const { discloseHold, verifyDisclosure, merklePath } = await import('../src/star-hold.js');
  const leaves = fixture.hold.items.map((i) => i.ref);
  const sorted = [...leaves].sort();
  // the interior node over the first two sorted leaves, and the bytes it hashes
  const preimage = sorted[0]! + '|' + sorted[1]!;
  const envelope = Buffer.from(preimage, 'utf8').toString('base64url');
  const fullPath = (await merklePath(leaves, sorted[0]!))!;
  const { refOf } = await import('../src/star-hold.js');
  const nodeRef = await refOf(new Uint8Array(Buffer.from(preimage, 'utf8')));
  const d = await discloseHold(fixture.hold, [fixture.hold.items[0]!.ref], new Date('2026-10-21T00:00:00Z'));
  const forged = { ...d, k: 1, items: [{ ...d.items[0]!, ref: nodeRef, envelope, path: fullPath.slice(1) }] };
  const v = await verifyDisclosure(forged, { root: (fixture.key.holds as { root: string }).root });
  assert.equal(v.ok, false, 'an interior node must not verify as a disclosed item');
  assert.ok(v.why.some((w) => /interior Merkle node/.test(w)), v.why.join('; '));
});

test('star-hold/2: the mcp-built fixture verifies here to the same κ-tree root; disclosures carry κ proofs; the /1 fixture still verifies, flagged legacy', async () => {
  const { holdRootV2, discloseHold, verifyDisclosure, DISCLOSURE_KIND, DISCLOSURE_KIND_V1 } = await import('../src/star-hold.js');
  const v2 = JSON.parse(readFileSync(join(here, 'fixtures', 'star-hold-v2.fixture.json'), 'utf8'));
  assert.equal(v2.hold.kind, 'agentprivacy.star-hold/2');
  assert.equal(await holdRootV2(v2.hold.items.map((i: { ref: string }) => i.ref)), v2.expected.root);
  const v = await verifyHold(v2.hold, { key: v2.key, now: new Date(v2.at) });
  assert.equal(v.ok, true, v.why.join('; '));
  assert.equal(v.legacy, false);
  assert.equal(v.tree, 'kappa-merkle/1');
  const d = await discloseHold(v2.hold, [v2.hold.items[0].ref, v2.hold.items[6].ref], new Date('2026-10-25T00:00:00Z'));
  assert.equal(d.kind, DISCLOSURE_KIND);
  assert.ok(d.items.every((i) => Array.isArray(i.proof) && i.path === undefined));
  const dv = await verifyDisclosure(d, { root: v2.key.holds.root });
  assert.equal(dv.ok, true, dv.why.join('; '));
  assert.equal(dv.legacy, false);
  // a proof moved to the other item fails
  const swapped = { ...d, items: [{ ...d.items[0]!, proof: d.items[1]!.proof }, d.items[1]!] };
  assert.equal((await verifyDisclosure(swapped)).ok, false);
  // the /1 fixture: verifies as legacy, and discloses under its own tree
  const v1 = await verifyHold(fixture.hold, { key: fixture.key, now: new Date(fixture.at) });
  assert.equal(v1.ok, true, v1.why.join('; '));
  assert.equal(v1.legacy, true);
  const d1 = await discloseHold(fixture.hold, [fixture.hold.items[0]!.ref], new Date('2026-10-25T00:00:00Z'));
  assert.equal(d1.kind, DISCLOSURE_KIND_V1);
  assert.equal((await verifyDisclosure(d1, { root: (fixture.key.holds as { root: string }).root })).legacy, true);
});
