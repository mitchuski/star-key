// What the wallet carries of a Hold: the root and the count, kept under one
// key, read back for a community's portal, cleared by the bearer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCarriedHold, writeCarriedHold, clearCarriedHold, carriedOf, isCarriedHold, CARRIED_HOLD_KEY, type CarriedHoldArea } from '../src/star-hold-carried.js';

function area(): CarriedHoldArea & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  return {
    data,
    async get(k) { return k in data ? { [k]: data[k] } : {}; },
    async set(items) { Object.assign(data, items); },
    async remove(k) { delete data[k]; },
  };
}

const ROOT = 'sha256:' + 'a'.repeat(64);
const KAPPA = 'sha256:' + 'b'.repeat(64);
const hold = { root: ROOT, count: 7, bearer: 'did:key:z6MkBearer', kappa: KAPPA, at: '2026-10-21T00:00:00.000Z' };

test('carry: the root and the count are kept, read back and cleared; nothing else of the Hold is', async () => {
  const store = area();
  assert.equal(await readCarriedHold(store), undefined);
  await writeCarriedHold(carriedOf(hold, new Date('2026-10-21T12:00:00Z')), store);
  assert.deepEqual(await readCarriedHold(store), { ...hold, carriedAt: '2026-10-21T12:00:00.000Z' });
  assert.deepEqual(Object.keys(store.data[CARRIED_HOLD_KEY] as object).sort(), ['at', 'bearer', 'carriedAt', 'count', 'kappa', 'root']);
  await clearCarriedHold(store);
  assert.equal(await readCarriedHold(store), undefined);
});

test('a malformed record is nothing, and cannot be written', async () => {
  const store = area();
  store.data[CARRIED_HOLD_KEY] = { ...hold, carriedAt: 'now', root: 'not a digest' };
  assert.equal(await readCarriedHold(store), undefined);
  assert.equal(isCarriedHold({ ...hold, carriedAt: 'now', count: -1 }), false);
  assert.equal(isCarriedHold({ ...hold, carriedAt: 'now', count: 1.5 }), false);
  assert.equal(isCarriedHold({ ...hold, carriedAt: 'now' }), true);
  await assert.rejects(writeCarriedHold({ ...hold, carriedAt: 'now', kappa: 'x' } as never, store), /not a carried Hold/);
});
