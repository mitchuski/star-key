# From measured signature samples to signed records in Star Key

Status: implementation proposal, 11 September 2026. Documentation only; no credential, signing, consent or mediator code changed.

## Why this note exists

The Star signature experiment is recorded in the master chronicle `agentprivacy_master/docs/chronicles/2026-09-11_the-star-learns-to-measure.md` (unsigned working record). Its code was pushed to [Soulbis commit 764e853](https://github.com/mitchuski/soulbis/commit/764e853). Production deployment was not verified in that record.

The experiment compares eleven encoded-size profiles, inspects components, places samples into byte-proportional volumes and folds a collection into an explicit budget. It establishes an interface and accounting convention. The next step is to make those measurements describe real signed records rather than catalogue entries.

This note builds on [VERTEX_PATHWAYS.md](VERTEX_PATHWAYS.md), [UNIFIED_STAR_EXPERIENCE.md](UNIFIED_STAR_EXPERIENCE.md) and [STAR_KAPPA_REGISTRY.md](STAR_KAPPA_REGISTRY.md). It is a roadmap, not a new credential specification or a public reflection of the unsigned chronicle.

## What the current reader actually does

`packages/extension/src/star-projection.ts` accepts City Key version 1 and returns `star-reading/0.1`: name, palette and claimed vertices, with authority explicitly `unverified-import`. `compressReading` serialises that narrow reading. It does not preserve a signed envelope or cryptographically compress one.

`packages/extension/src/star-registry.ts` validates the reading and derives its content identity. A retrieved byte match proves content consistency, not issuer identity or signature validity. `star-journey.tsx` is the proposed first inspection surface; it currently uses editorial artwork rather than the measured signature renderer.

Do not silently append evidence to the existing allowlist or infer verification from a registry match. Introduce the agreed record format and its producers, readers and validators together. Keep the existing City Key projection purpose explicit rather than adding speculative compatibility fallbacks.

## First implementation: one real record, end to end

Choose one existing signed-envelope profile already supported by the VTA stack and confirm its owner and verifier. Start with a synthetic issuer/subject fixture and a maintained verification implementation. Ed25519 may be an appropriate first algorithm if that chosen profile supports it; the profile decision comes before the selector. A raw signature without its signed message, algorithm parameters and verification key is insufficient.

The first complete flow should be: explicit import → bounded format validation → private local retention → measurement → signature verification → Star inspection. Importing must not initiate a network disclosure, modify agreements or execute a runtime path.

Store the original envelope bytes unchanged. Resolve a typed description separately: record reference, envelope profile/version, signature encoding and algorithm, signed payload reference, issuer/key reference, subject and applicability fields supplied by the profile. Label missing fields as missing, not inferred. Preserve multiple signatures as distinct items where the profile permits them.

Measure decoded signature bytes, public-key bytes where present, payload bytes, envelope/framing bytes and total retained bytes as separate quantities. Specify whether key references or embedded keys are counted. Base64 characters are not raw signature bytes; variable-length encodings must be measured from the actual record. Never obtain the observed length by merely looking up an algorithm name.

## Verification is its own result

Represent parsing and verification independently: unsupported format, malformed input, not checked, signature valid, signature invalid, or verification unavailable. Record the verifier/version, exact input digest and check time. Issuer recognition, key status, audience, expiry, revocation and acceptance for the encounter need their own results and policy context. An unavailable network check is not a successful one.

A valid signature establishes the signed bytes under a key. It does not by itself establish the truth of a claim, membership in a community, authority to act or permission to release the record. Adding an issuer VRC requires its accepted profile and trust policy, not a renamed generic JSON object.

Signing keys remain in the protected signing environment. Do not copy them into geometry state, page messages, exports or a renderer. Before changing VTA/mediator code, follow this repository's cross-service design documents and MV3 consent/lifecycle rules.

## Derive a view without changing the evidence

Give byte-volume its own mapping ID/version, separate from the SHAPE-1.5/FIG-2.0 semantic derivations. Map approved measurement inputs into geometry deterministically. Keep camera, colour and arrangement choices separate from signed content and content identities.

Use stable record references for selection, attachment, removal and verification results. Attach records to versioned vertex namespaces only through an explicit binding. A vertex locates a record; it does not validate one.

Retain the sample mode as a distinct comparison tool. A real-record view must not let a scheme selector relabel existing signed bytes. Editing a claim produces a new unsigned object requiring a signing act, not an updated verified credential.

## Then build the collection and encounter

After the first verified fixture works, add multiple records, explicit byte budgets, export inspection and scoped presentations. Distinguish the signature-only view from total collection storage, including metadata and duplicated key material. Keep budget assumptions visible; changing separation or overlap does not create storage or increase privacy by itself.

An encounter path selects ordered record references and intended disclosure scope. It is not automatically an executable runtime or proof. Selective disclosure requires a supported credential/proof construction; removing signed fields is not generally sufficient. Consent must identify recipient, purpose and content. Retention and receiving-service receipts remain separate stages.

Only after these contracts are stable should MCP observe an approved snapshot: record references, measurement basis, mapping version, verification results and event summaries within scope. Do not expose private records merely because a renderer can access them. The app/QR/camera-recognition ideas remain optional future interfaces.

## Acceptance evidence before expansion

- Import a valid fixture and show the exact observed signature length and total envelope length.
- Mutate payload or signature bytes and show an invalid result; preserve the original retained record.
- Reject malformed encodings and oversized inputs before rendering; show unsupported algorithms honestly.
- Test issuer/key mismatch, unavailable status checks and expired or wrong-audience records without collapsing those outcomes into signature validity.
- Export only the explicitly selected representation; verify round-trip bytes, identifiers and mapping inputs.
- Preserve City Key projection and registry test coverage while intentionally changing any affected schema.
- Verify worker restart and UI closure cannot lose consent state or turn a pending action into an approved one.
- Compare one fixture in Soulbis and Star Key: equal measured bytes and mapping inputs, with no authority inferred from appearance.

Then expand algorithm coverage using supported implementations and profile fixtures. The visual catalogue can illustrate a scheme before the extension supports verifying it; those capability states must remain distinct.

The innovation can grow from a reliable boundary: inspect what is held, establish what has been checked, and let the person choose what travels. Geometry makes that understandable; the signed record, verifier and consent flow make it operational.
