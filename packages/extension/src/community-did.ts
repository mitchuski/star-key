// A community's DID, read out of what a person scanned or pasted.
//
// The QR code on a community's landing page (`/v1/community/did-qr.svg`) and
// the one `pnm vta qr` draws both carry the **bare DID** and nothing else
// (`did-qr.ts` draws ours the same way), so the text of a scanned code is the
// DID itself. Pasted text is looser — a DID copied with a label around it, a
// trigger link (`…/t#_from=did:…&_id=…`), a line out of an email — so the
// first DID-shaped token is taken and trailing punctuation dropped.
//
// Nothing is judged here beyond the shape. Whether the method is one this
// wallet resolves, and whether the document verifies, is the join flow's to
// decide (`sign-in-flows.ts`, `prepareJoin`); a DID that fails there is
// refused with nothing sent. This module has no DOM and no dependency, so the
// background can use it too.

const DID_TOKEN = /did:[a-z0-9]+:[A-Za-z0-9._%:-]+/;

/** The first DID in `text`, or `undefined` when it holds none. */
export function communityDidFromText(text: string): string | undefined {
  const m = DID_TOKEN.exec(text);
  if (!m) return undefined;
  // A DID at the end of a sentence, or a trigger link's `_from=did:…:`.
  const did = m[0].replace(/[.:]+$/, "");
  return /^did:[a-z0-9]+:[^:]/.test(did) ? did : undefined;
}
