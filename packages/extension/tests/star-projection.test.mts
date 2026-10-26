import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectCityKey, compressReading } from '../src/star-projection.js';
const key = () => ({ version: 1, name: 'Test key', palette: { cool: '#112233', warm: '#445566', sword: '#778899', mage: '#aabbcc' }, lit: [63, 0, 0] });
test('unknown/private input cannot become an exported reading', () => {
  const reading = inspectCityKey({ ...key(), identity: { privateKey: 'PRIVATE_MARKER' }, accessToken: 'TOKEN_MARKER', descriptions: { 0: 'PRIVATE_NOTE' }, evidence: 'PRIVATE_EVIDENCE' });
  const exported = compressReading(reading, false);
  for (const marker of ['PRIVATE_', 'TOKEN_MARKER']) assert.equal(exported.includes(marker), false);
  assert.deepEqual(JSON.parse(exported).lit, []);
  assert.equal(reading.authority, 'unverified-import');
});
test('selected vertices are canonicalized without inventing a position', () => {
  assert.deepEqual(inspectCityKey(key()).lit, [0, 63]);
  assert.deepEqual(JSON.parse(compressReading(inspectCityKey(key()), true)).lit, [0, 63]);
});
test('unsupported versions and malformed geometry are refused', () => {
  for (const value of [null, [], { ...key(), version: 2 }, { ...key(), lit: [-1] }, { ...key(), lit: [64] }, { ...key(), lit: ['1'] }, { ...key(), palette: { ...key().palette, cool: 'url(evil)' } }]) assert.throws(() => inspectCityKey(value));
});
import { retainedSummary } from '../src/star-projection.js';
test('retained summary counts what stays behind without copying values', () => {
  const s = retainedSummary({ ...key(), descriptions: { 0: 'PRIVATE_NOTE' }, kappa: 'sha256:abc', prior: 'sha256:def', walks: [{}, {}], packets: { root: 'sha256:x', count: 3 }, chains: { root: 'sha256:y', count: 2 }, identity: { publicKeyHex: 'PRIVATE_MARKER' }, secretThing: 'TOKEN_MARKER' });
  assert.equal(s.descriptions, 1); assert.equal(s.walks, 2); assert.equal(s.packets, 3); assert.equal(s.chains, 2); assert.equal(s.lit, 3);
  assert.equal(s.kappa, true); assert.equal(s.prior, true); assert.equal(s.identity, true); assert.equal(s.did, false);
  assert.deepEqual(s.other, ['secretThing']);
  const json = JSON.stringify(s);
  for (const marker of ['PRIVATE_', 'TOKEN_MARKER', 'sha256:']) assert.equal(json.includes(marker), false);
});
test('retained summary of a bare key is empty and never throws on junk', () => {
  const bare = retainedSummary(key());
  assert.equal(bare.walks, 0); assert.equal(bare.chains, 0); assert.equal(bare.kappa, false); assert.deepEqual(bare.other, []);
  assert.equal(retainedSummary(null).kappa, false); assert.equal(retainedSummary([]).lit, 0); assert.equal(retainedSummary('x').packets, 0);
});
