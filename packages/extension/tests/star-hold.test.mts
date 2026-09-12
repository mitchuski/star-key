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
