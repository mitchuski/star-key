# Formally verified parts of this repository

Sealed in the κ registry: formal_mage evidence bundle `evidence/2026-11-04_83`, root `sha256:81f2dd578a4fb486c502268e38fcd1302509f6c19656e5410d32946dd5a6f703` (83 theorems, 83/83 within the standard axioms; re-derive with `python kappa_evidence_mage/verify_bundle.py` or `node tools/kappa_evidence.mjs verify`).

Sealed beside it: formal_mage evidence bundle `evidence/2026-11-12_tt188`, root `sha256:c52609b736406d6fe646db7e735e7380d4fb6309cc9c481480fb9709c5077e8e` (188 theorems on the protocols trust tasks are written in, from [trust-tasks-formal](https://github.com/mitchuski/trust-tasks-formal) at `34d3353`, every one in its `Checks.lean` audit; published there under `evidence/`, beside the earlier 183-theorem seal `adcfbf13`).

Code in this repository whose security argument carries a machine-checked receipt in `formal_mage` (Lean 4, core library, kernel-checked, axiom-audited). `node tools/formal_census.mjs <this repo>` in formal_mage fails if a tag names a theorem outside the audited census. The code-to-model correspondence for the /2 tree's loop is proved (O1); for the legacy /1 loop it is open (O1b).

| Claim | Code | Status | Tag |
|---|---|---|---|
| With leaf bytes never of node form (`isNodePreimage`) and sha256 collision-free, a disclosed item whose path climbs to the Hold root is a leaf of the Hold | `packages/extension/src/star-hold.ts` `verifyDisclosure`, `verifyHold` | proved (model) | formal: proved formal_mage:Formal.Merkle.disclosure_sound |
| Without that separation an interior node passes with a shortened path (the pre-2026-10-25 behaviour; regression test `tests/star-hold.test.mts`) | same | proved (model) | formal: proved formal_mage:Formal.Merkle.interior_node_passes_without_separation |
| star-hold/2: the κ registry tree's leaf/node tags make the separation structural, so the same soundness holds with nothing refused | `packages/extension/src/kappa-merkle.ts`, `star-hold.ts` (/2 dispatch) | proved (model) | formal: proved formal_mage:Formal.Merkle.disclosure_sound |
| star-hold/2 end to end: the root `holdRootV2`'s loop returns is a tree's root over exactly the refs, so a disclosure whose proof climbs to it carries one of the Hold's refs (sha256 collision-free) | `kappa-merkle.ts` `holdRootV2` / `holdVerifyV2` | proved (code loop) | formal: proved formal_mage:Formal.MerkleCode.code_disclosure_sound |
| Two different ref sets never share a /2 root (sha256 collision-free; refs unique, which holdRootV2 enforces) | `kappa-merkle.ts` `holdRootV2` | proved (code loop) | formal: proved formal_mage:Formal.MerkleInj.codeRoot_injective |

Since 2026-10-25 new Holds are `agentprivacy.star-hold/2` on the κ registry tree (`0x00` leaf / `0x01` node, kappa-core merkle.rs). `/1` Holds and disclosures are still verified, by the `kind` they carry, through the frozen `star-hold-v1.ts`, which is deleted whole once no `/1` Hold matters. Archive: agentprivacy_master `docs/chronicles/2026-10-25_the-tree-learns-its-leaves.md`. The root's injectivity on duplicate-free lists is proved (O2): two different ref sets never share a /2 root.

## MyTerms (IEEE 7012), from trust-tasks-formal

The wallet's `myterms/propose` rules follow the Lean model `TrustTasks/MyTerms.lean` clause by clause; regression tests in `packages/core/tests/vtc.myterms-propose.mjs`. Not modelled: signatures, digests, time, transport, and what an agreement means.

| Claim | Code | Status | Tag |
|---|---|---|---|
| A response is `accepted` exactly when it carries the agreement and a contract identifier; `alternative` and `rejected` carry neither | `packages/core/src/vtc/myterms-propose.ts` `responseRefusal` | proved (model) | formal: proved trust_tasks_formal:TrustTasks.MyTerms.decision_iff_contract |
| Reading `accepted` on a performed step gives a contract, for the agreement the request named, from the pinned roster | `packages/core/src/vtc/myterms-propose.ts` `answerRefusal`, `contractsOf` | proved (model) | formal: proved trust_tasks_formal:TrustTasks.MyTerms.decision_member_suffices |
| A follow-up is by the original proposer, to the same entity, takes exactly the alternative offered, and is not answered with another alternative | `packages/core/src/vtc/myterms-propose.ts` `answerRefusal` (follow-up arm), `followUpFor` | proved (model) | formal: proved trust_tasks_formal:TrustTasks.MyTerms.followup_bound |
| At most one follow-up is performed per answered request (IEEE 7012 §5.2.2) | same | proved (model) | formal: proved trust_tasks_formal:TrustTasks.MyTerms.at_most_one_followup |
| Why the issuer binding is enforced: without it, a third party takes an alternative offered to someone else and gets a contract | same | proved (counterexample to the weaker rule) | formal: proved trust_tasks_formal:TrustTasks.MyTerms.issuer_binding_needed |
| Why the one-follow-up rule is enforced: without it, a rejected follow-up is retried until accepted | same | proved (counterexample to the weaker rule) | formal: proved trust_tasks_formal:TrustTasks.MyTerms.round_limit_needed |
| Why a contract is read from `decision` and not from a response being present: presence-only completion accepts a rejected engagement | `packages/core/src/vtc/myterms-propose.ts` `contractsOf` | proved (counterexample to the weaker rule) | formal: proved trust_tasks_formal:TrustTasks.MyTerms.presence_completion_unsound |
