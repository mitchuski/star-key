// A community's DID out of scanned or pasted text: the bare DID a QR code
// carries, a DID with words around it, a trigger link, and things that are
// not a DID at all.

import { test } from "node:test";
import assert from "node:assert/strict";
import { communityDidFromText } from "../src/community-did.ts";

const FIRST = "did:webvh:Qme5ThEEr1qRLRHYMrcrmjecG3znC8FBPEoswuSjebFkhx:webvh.storm.ws:first-vtc";

test("the bare DID a code carries is taken as is", () => {
  assert.equal(communityDidFromText(FIRST), FIRST);
  assert.equal(communityDidFromText(`  ${FIRST}\n`), FIRST);
});

test("a DID inside pasted text is found, and trailing punctuation dropped", () => {
  assert.equal(communityDidFromText(`Join us: ${FIRST}.`), FIRST);
  assert.equal(communityDidFromText(`The community's DID is ${FIRST}, scan it.`), FIRST);
  assert.equal(communityDidFromText(`"${FIRST}"`), FIRST);
});

test("a trigger link yields the community it is from", () => {
  const link = `https://link.trustoverip.org/t#_from=${FIRST}&_id=Hk2pQ9xV&_type=/vti/flow/sign-in/0.1`;
  assert.equal(communityDidFromText(link), FIRST);
});

test("a did:web with an encoded port and a path is kept whole", () => {
  const did = "did:web:members.example.org%3A8443:community";
  assert.equal(communityDidFromText(did), did);
});

test("no DID: nothing", () => {
  assert.equal(communityDidFromText(""), undefined);
  assert.equal(communityDidFromText("https://first.openvtc.net/"), undefined);
  assert.equal(communityDidFromText("did:"), undefined);
  assert.equal(communityDidFromText("did:webvh:"), undefined);
  assert.equal(communityDidFromText("DID:WEBVH:QmX:host"), undefined, "a method is lower-case");
});
