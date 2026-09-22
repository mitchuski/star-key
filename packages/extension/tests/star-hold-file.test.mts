import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readHoldFile, readKeyFile } from '../src/star-hold-file.js';
import { verifyHold } from '../src/star-hold.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureText = readFileSync(join(here, 'fixtures', 'star-hold.fixture.json'), 'utf8');
const fixture = JSON.parse(fixtureText) as { hold: { count: number; kind: string }; key: Record<string, unknown>; expected: { root: string; count: number } };

test('the reference fixture reads as a Hold with its key beside it, and verifies to the expected root', async () => {
  const read = readHoldFile(fixtureText);
  assert.equal(read.source, 'fixture');
  assert.equal(read.hold.count, fixture.expected.count);
  assert.ok(read.key);
  const v = await verifyHold(read.hold, { key: read.key });
  assert.equal(v.ok, true, v.why.join('; '));
  assert.equal(v.root.derived, fixture.expected.root);
  assert.equal(v.keyMatches, true);
});

test('a bare Hold reads as a Hold with no key; the key can be supplied separately', () => {
  const read = readHoldFile(JSON.stringify(fixture.hold));
  assert.equal(read.source, 'hold');
  assert.equal(read.key, null);
  assert.equal(readKeyFile(JSON.stringify(fixture.key)).version, 1);
});

test('anything else is refused with a reason, never read as a Hold', () => {
  assert.throws(() => readHoldFile('not json'), /valid JSON/);
  assert.throws(() => readHoldFile('[]'), /Hold object/);
  assert.throws(() => readHoldFile(JSON.stringify({ kind: 'something-else/1' })), /Not a Star Hold/);
  assert.throws(() => readHoldFile(JSON.stringify({ schema: 'star-hold-fixture/1', hold: { kind: 'x' } })), /carries no Hold/);
  assert.throws(() => readKeyFile(JSON.stringify({ version: 2 })), /City Key v1/);
});
