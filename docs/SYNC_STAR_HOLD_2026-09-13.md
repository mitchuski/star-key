# Sync — the Star Hold and hearthold #90, 13 September 2026

RESUME here. Follows `SYNC_STAR_HOLD_2026-09-12.md`. One window: the House of Archon (Flaxscrip) answered the 12 September reply on [hearthold#90](https://github.com/Flaxscrip/hearthold/issues/90) three times — a plan, a shipped verify foot ([PR #92](https://github.com/Flaxscrip/hearthold/pull/92)) with two fixture requests and a κ-registry question, and a document-loader note for `did:cid` — and this window synced our side to it and replied.

## What they built (PR #92, branch `feat/star-hold-city-key`, 3 commits, unmerged)

- `packages/core/src/star-key.ts` — `canonicalCityJSON` (our Law L5 profile, ported from `mitchuski/star` `sigil/index.html`), `deriveKappa`, `verifyCityKey` (`authentic | unnamed | mismatch`), `derivePacketProof`, `packetsDigest`; re-derives the packets Merkle vector `sha256:07f2…83d1`.
- `packages/core/src/star-vta.ts` — `verifyVtaRecord` (Ed25519 via `node:crypto`, did:key derivation, claimed-did check), `issueBoundSignerChallenge` / `challengePreimage` / `verifyBoundSignerChallenge` (nonce + κ + audience + exp).
- `docs/star-hold.md` — the seam, rails, Layer 3 "First Gate" design (held until a fixture locks Layer 2).
- Their two isolated assumptions: (a) VTA preimage = City profile; (b) lowercase hex.

## What this window verified

| check | result |
|---|---|
| PR #92 code, unmodified, over the farm-published record (soulbis proofs page) | `ok`; `vtaPreimage` byte-equal to `lib/sign.mjs recordBytes` |
| … over the runtime fixture record + key with `holds` | `ok` / `authentic`; canonical bytes byte-equal |
| … over a signed sigil PNG (`tEXt cityKey` + `cityKeySig`) | `authentic` / `ok`; κ matches |
| … unknown field · unchanged re-export | agree |
| our Swordsman signer answers their Warden challenge | `ok`; after exp `expired` |
| hex case | preimage-significant — uppercase fails on both sides (pin) |
| absent `at` | both emit the token `undefined` (not JSON) — `at` required (pin) |
| PR #92 code over the new conformance pack | **20/20** |
| Archon public resolver | `https://archon.technology/1.0/identifiers/<did>` LIVE (`application/did+ld+json`, CORS `*`); the House's doc v35: `#key-1` secp256k1 + `#key-agreement-1` X25519, **no `#key-assertion-1` yet** |
| repo visibility | `mitchuski/agentprivacy` and `mitchuski/mages.city` PRIVATE (the 09-12 reply linked into them); `agentprivacy-mcp`, `star`, `star-key`, `cityofmages`, `soulbis` PUBLIC; mcp `main` = `origin/main`, `lib/{sign,kappa,png}.mjs` tracked → cited instead |

## What this window built (all uncommitted)

- **Proof sets + resolvers** in both verifiers — `~/dtgwg-zkp-tf-mage/runtimes/star-hold/src/hold.mjs` and `~/agentprivacy-mcp/lib/hold.mjs`: `verifyDI` accepts `proof: [...]` (each proof over the unsecured doc; composition fail-closed: any supported fail → `invalid`; else a supported pass → `valid`; else `unavailable`; else `unsupported` naming every suite; `proofs[]` per-proof verdicts; single proof = old shape exactly). New exports `multikeyPub`, `vmPublicKey`, `resolverFromPins`, `resolverFromDidDocuments` (relative ids normalised; Multikey / Ed25519 JWK / hex read; non-Ed25519 refused with a reason; absent method → null → `unavailable`), `composeResolver`. `verifyHold` forwards `pins` and `didDocuments`. No network inside verification.
- **Runtime H18a–j** (10 checks) → **55/55**; `fixtures/proof-set.fixture.json` (House's real did:cid, TEST Ed25519 seed 0x50) + `fixtures/house.diddoc.json` (the live document); NOTES.md §13 September. Harness: `claims_register.md` +CR-23 PROVEN, config gate N 22→23, canary text 55/55; **conform PASS ×2**, count rule **4/23** (frontier.json now stale by design — the next MEASURE seat flags it).
- **agentprivacy-mcp**: `test/proof-set.test.mjs` (5, parity with H18) + `test/fixtures/star-hold-proof-set.fixture.json`; **conformance pack** `fixtures/star-hold-conformance/` (README, `verify.mjs` zero-dep checker 60/60, `city-key.fixture.json` 7 cases + Merkle vectors, `vta-record.fixture.json` test key seed 0x01×32 + record over the full key + farm record + 3 must-fail, `challenge.fixture.json`, 3 PNGs: tEXt/base64, +cityKeySig, iTXt/raw), generator `scripts/star-hold-conformance.mjs` (`--check` = byte-for-byte drift gate), `test/star-hold-conformance.test.mjs` (3); `package.json` test script +2. Suite **44/44** (was 36).
- **Extension** untouched: `star-hold.ts` still verifies DI through OpenVTC `verifyTrustTaskProof` (no proof sets, no pins) — gap noted in NOTES §13; tests 3/3 via `node --import ./tests/harness/register.mjs --test tests/star-hold.test.mts`, tsc clean.
- **The reply**: body at `~/hearthold_mage/notes/ISSUE_90_REPLY_2026-09-13.md`, posted to #90: https://github.com/Flaxscrip/hearthold/issues/90#issuecomment-5649444186 (2026-09-13).

## Answers given on #90

1. PR #92 reads our bytes; both assumptions confirmed; two pins (hex case, `at` required).
2. Fixtures: the pack (lands with the next mcp push) + test key / record / preimage / farm record / minimal key / challenge inline.
3. Private links corrected → `agentprivacy-mcp` `lib/sign.mjs`, `lib/kappa.mjs`, `lib/png.mjs`.
4. κ registry = UOR kappa-registry blob adapter (resolve-by-κ content store, re-hash on read, no identity attestation, open, no hosted instance yet) + the assertion layer mapped in `mitchuski/uor-kappa-mage`; OpenVTC did:webvh hosting is a third thing. Fetch-then-re-derive endorsed.
5. Dual-proof credentials: built (pins / DID document), tested against the House's live doc → `unavailable` until `#key-assertion-1` is published, then `valid` with no change. Ask: post a real dual-proof credential when it exists.
6. ZIP-215: same library (OpenSSL) as PR #92 → identical acceptance; browser paths differ only on torsion inputs; document, don't pin.
7. Next: Layer 3 on real bytes; present to the gate from the `star` CLI; House as second community = separate governance decision.

## Mitch's note this window — "the VTA farm keys"

The VTA farm (FirstPerson.dev / `ic3software/vtafarm`, OpenVTC VTAs: passkey → provision → `pnm` → persona DID) issues OpenVTC identities (did:webvh, `eddsa-jcs-2022` trust tasks) — the `trust-task/eddsa-jcs-2022` profile in the Hold, not the `agentprivacy.vta/1` record hearthold's Layer 2 consumes (that is the Swordsman's Ed25519 record). The fixtures therefore use the farm-published soulbis record (public data) and a published test seed; no live key was used or exposed. Farm keys belong to the next step: a real OpenVTC trust task as a Hold item and the second-community test — blocked today on the farm DNS (`lb.firstperson.dev` NXDOMAIN, provider's move, see `project_mages_city_board`). No Swordsman keystore exists under `~/.agentprivacy` on this machine (only test-temp recipients).

## Open, and whose

- **Mitch:** commits (mcp: `lib/hold.mjs`, `scripts/star-hold-conformance.mjs`, `fixtures/star-hold-conformance/`, `test/{proof-set,star-hold-conformance}.test.mjs`, fixture copy, `package.json`; runtime dir is git-excluded; `hearthold_mage/notes/`; this doc) and the mcp **push that makes the pack URL real**; whether to flip `mages.city` / `agentprivacy` public or keep citing mcp; hearthold PR #92 review comment (optional); the extension's proof-set gap (wire `star-hold.ts` to the mcp rule or leave OpenVTC's verifier); everything still open from the 09-12 sync (harness round, card 0NN/009, B over A, X3 route, reader wiring).
- **Flaxscrip:** publish `#key-assertion-1`; a real dual-proof credential; Layer 3.
- **Not done:** any circuit; the City Key type change in master; a round on either instance; the extension proof-set path.
