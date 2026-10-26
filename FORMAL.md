# Formally verified parts of this repository

Sealed in the κ registry: formal_mage evidence bundle `evidence/2026-10-26_75`, root `sha256:d4d42f9e333323b20d5b649525cbe28f8885fa2cb0cdd10943a04cac3793b9da` (75 theorems, 75/75 within the standard axioms; re-derive with `python kappa_evidence_mage/verify_bundle.py` or `node tools/kappa_evidence.mjs verify`).

Code in this repository whose security argument carries a machine-checked receipt in `formal_mage` (Lean 4, core library, kernel-checked, axiom-audited). `node tools/formal_census.mjs <this repo>` in formal_mage fails if a tag names a theorem outside the audited census. The code-to-model correspondence for the /2 tree's loop is proved (O1); for the legacy /1 loop it is open (O1b).

| Claim | Code | Status | Tag |
|---|---|---|---|
| With leaf bytes never of node form (`isNodePreimage`) and sha256 collision-free, a disclosed item whose path climbs to the Hold root is a leaf of the Hold | `packages/extension/src/star-hold.ts` `verifyDisclosure`, `verifyHold` | proved (model) | formal: proved formal_mage:Formal.Merkle.disclosure_sound |
| Without that separation an interior node passes with a shortened path (the pre-2026-10-25 behaviour; regression test `tests/star-hold.test.mts`) | same | proved (model) | formal: proved formal_mage:Formal.Merkle.interior_node_passes_without_separation |
| star-hold/2: the κ registry tree's leaf/node tags make the separation structural, so the same soundness holds with nothing refused | `packages/extension/src/kappa-merkle.ts`, `star-hold.ts` (/2 dispatch) | proved (model) | formal: proved formal_mage:Formal.Merkle.disclosure_sound |
| star-hold/2 end to end: the root `holdRootV2`'s loop returns is a tree's root over exactly the refs, so a disclosure whose proof climbs to it carries one of the Hold's refs (sha256 collision-free) | `kappa-merkle.ts` `holdRootV2` / `holdVerifyV2` | proved (code loop) | formal: proved formal_mage:Formal.MerkleCode.code_disclosure_sound |
| Two different ref sets never share a /2 root (sha256 collision-free; refs unique, which holdRootV2 enforces) | `kappa-merkle.ts` `holdRootV2` | proved (code loop) | formal: proved formal_mage:Formal.MerkleInj.codeRoot_injective |

Since 2026-10-25 new Holds are `agentprivacy.star-hold/2` on the κ registry tree (`0x00` leaf / `0x01` node, kappa-core merkle.rs). `/1` Holds and disclosures are still verified, by the `kind` they carry, through the frozen `star-hold-v1.ts`, which is deleted whole once no `/1` Hold matters. Archive: agentprivacy_master `docs/chronicles/2026-10-25_the-tree-learns-its-leaves.md`. The root's injectivity on duplicate-free lists is proved (O2): two different ref sets never share a /2 root.
