import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIMENSIONS, stateBits, stateDimensions, houseAndPlace, stateName, stateOfHash } from '../src/lattice.js';

test('the six dimensions, weight 32 down to 1, as lib/lattice-vertex.ts names them', () => {
  assert.deepEqual([...DIMENSIONS], ['Protection', 'Delegation', 'Memory', 'Connection', 'Computation', 'Value']);
  assert.deepEqual(stateBits(32), [1, 0, 0, 0, 0, 0]);
  assert.deepEqual(stateBits(1), [0, 0, 0, 0, 0, 1]);
  // the canonical module's worked example: V28 = 011100
  assert.deepEqual(stateDimensions(28), ['Delegation', 'Memory', 'Connection']);
  assert.throws(() => stateBits(64));
});

test('house and place, as the star of the chains reads them', () => {
  // star.html: state = house*8 + sub; house names protection, delegation, memory; place connection, computation, value
  assert.deepEqual(houseAndPlace(38), { house: 4, place: 6 });
  assert.equal(stateName(38), 'V38 · Protection · Connection · Computation');
  assert.equal(stateName(0), 'V0 · none');
});

test('a hash lands on its first six bits, matching the City vectors', () => {
  // the City's vectors pair "38|sha256:98…" and "1|sha256:04…"
  assert.equal(stateOfHash('sha256:98' + 'a'.repeat(62)), 38);
  assert.equal(stateOfHash('sha256:04' + 'b'.repeat(62)), 1);
  assert.equal(stateOfHash('ff'), 63);
  assert.equal(stateOfHash('sha256:'), undefined);
});
