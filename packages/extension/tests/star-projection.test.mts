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
