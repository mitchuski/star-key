# Star Key as a signature-holding artefact — review, options, ZKP mapping

Status: review and design proposal, 11 September 2026. Documentation only. Nothing in any repo was changed by this review; no commit, push, deploy or ceremony. Builds on [VERTEX_PATHWAYS.md](VERTEX_PATHWAYS.md), [UNIFIED_STAR_EXPERIENCE.md](UNIFIED_STAR_EXPERIENCE.md), [STAR_KAPPA_REGISTRY.md](STAR_KAPPA_REGISTRY.md) and [STAR_SIGNED_RECORDS_INTEGRATION.md](STAR_SIGNED_RECORDS_INTEGRATION.md), the master plans `PLAN_CITY_KEY_CRYPTO_UPGRADE_2026-09-03.md` and `PLAN_VTA_TRUST_GRAPH_INTEGRATION_2026-09-05.md`, and the DTG ZKP spec at `~/dtgwg-zkp-spec` (PR #8 open).

## 0. Summary

1. The Star Key work is spread over **seven surfaces** and two extension prototypes. Only one of them verifies a signature (mages.city `site/record.js`), and only over one signer (the bearer's own Swordsman). Nothing anywhere holds a *collection* of signatures.
2. The City Key today is a **content node**: κ over canonical JSON, `prior`-chained. Its only signature is external (`agentprivacy.vta/1`, beside the key). `vrcs[]` in that record is always empty; `relationships[]`, `receipts[]`, `credentials[]` exist only in plans; `runtimeReceipts[]` is an opaque slot no reader consumes.
3. OpenVTC has **no signature-collection record either**. Its nearest shapes are the approver set on a pending consent (DIDs only, proofs discarded) and the nested Verifiable Presentation (holder proof over credentials that keep their issuer proofs).
4. **Recommendation:** make the artefact a **sidecar Hold** beside the key (`agentprivacy.star-hold/1`), each item a real OpenVTC envelope retained byte-for-byte with its DID-URL signer, and put only `holds: {root, count}` into the City Key, exactly as `packets: {root, count}` already works (C87 rule: root, never content). The key stays a κ node; signatures stay beside it; the root is the ZK hook.
5. **Align the mages.city credential shapes to the DTG credential spec** that OpenVTC already implements: the Rung 5 VRC becomes a DTG VRC (member self-issued relationship credential, `eddsa-jcs-2022`, Bitstring status slot) carrying the PSI commitment as a claim, signed under pairwise R-DIDs. That is what "building upon OpenVTC" means concretely.
6. **ZKP mapping:** the Star's proof statement is a composition of gadgets the spec already names: key-binding (004) + set-membership twice (item ∈ `holds.root`, signer ∈ community root) + signature-verify + non-revocation + distinctness (005) + transcript-bind (003). Nearest templates are records 012 (k-fold clauses, linear in k) and 020 (a chain of countersignatures — the only record that verifies a collection of signatures today). The blocker is the spec's own **X3 cost**: Ed25519 inside a BN254 circuit is unmeasured and routed around. Two exits exist and both are already half-built in this lane.
7. **The correlator warning is real.** κ and `holds.root` are stable identifiers. A ZK presentation must expose neither; it opens a fresh salted commitment to the root. This is the direct answer to draft S's question to the TF ("a correlator wearing a better name").
8. Ten display gaps (§8) are worth closing before any of this: they are where the surfaces currently show more than the data proves.

## 1. Where the work is

| Surface | What exists | Signature handling | State |
|---|---|---|---|
| **star-key** (this repo, OpenVTC `vta-browser-plugin` fork at `7e1b382`) | `star-projection.ts` (City Key v1 → `star-reading/0.1`, authority `unverified-import`), `star-registry.ts` (sorted-JSON κ + UOR blob PUT/GET read-back), `star-journey.tsx` reader page, popup DID disclosure | None on the Star path. Upstream core signs every outbound trust task (`eddsa-jcs-2022`) and verifies DI proofs against did:key / did:webvh / did:peer | HEAD `9410a93`; registry adapter + 2 docs uncommitted; `dist-star-preview` built 09-08 with the κ button; "Create ZK proof" disabled |
| **vta_star** (`~/Documents/Codex/vta_star`) | Second MV3 prototype: appearance-only import, `vta-star.journey-transfer/1` envelope, session storage | κ commitment check only | Superseded by the fork per `STAR_EXTENSION_VISUAL_UPDATE.md`; not retired |
| **soulbis /star** (`mitchuski/soulbis` `764e853`, prepared in an isolated copy, not in the local checkout) | Signature *measurement*: 11 encoded-size profiles (Ed25519 64 B … SLH-DSA-256s 29,792 B), collection of ≤6 samples, fold into 8/24/48 KiB budget, circuit traversal | Samples only; "collection export unavailable"; no verification | Pushed; production not verified; unknown-field passthrough fixed (`walks` no longer dropped) |
| **agentprivacy-mcp Swordsman** | Rung 1: `agentprivacy.vta/1` record beside the key, Ed25519 over canonical `{kind, publicKeyHex, kappa, prior, at, walks, vrcs}`; `key_verify`, `card_verify`, `evolved_since` | One signer (bearer), did:key only; `vrcs: []` always | Built 09-05, 18/18 tests; not a git repo |
| **City Key type** (`agentprivacy_master/src/lib/city-key.ts:51-209`) | κ node with `packets {root,count}`, `charts[]`, `walks[]`, `journey`, `did`, `prior`; `runtimeReceipts[]` opaque | No signature field. `relationships[]/receipts[]/credentials[]` proposal-only | Type unchanged since Rung 1 |
| **mages.city** | `site/record.js` WebCrypto verifier of the VTA record + `readCityKeySlot`; chip on `/connected/` only; new front = palette only; `gate/citykey.mjs` re-derives κ/Merkle/did | `record.js` verifies bearer sig; `citykey.mjs` does **not** verify the VTA signature; Portal verifies card sigs over messages, shows no key | Clean, HEAD `3354996`; reader bundle is the 09-07 pre-κ build |
| **labs** (agentprivacy.org) | `/work/star-key/`, funding brief, concepts entry; links out to the reader | None; no data file, no chip | Narrative only; orphaned `star-key-view.svg` |

The lineage of intent is consistent across all of them: *appearance ≠ authority; a reading is unverified until a named verifier says otherwise; proof controls stay disabled until a verifier exists.* That discipline is the asset. What is missing is the artefact the discipline was written for.

**Where the Star is used today, and what "used" means at each place** (re-checked 11 September):

| Place | Files | What the Star does there |
|---|---|---|
| Mages City front | `site/index.html` loads `star-arrival.mjs` + `star-arrival.css`; `site/star-appearance.mjs`; "Try Star Key →" | appearance only: a City Key's palette into CSS variables; text says never to derive authority from a key |
| Mages City reader | `site/star-experiment/` (reader, practice key) | the star-key reader bundle, 09-07 build, unverified import |
| Mages City map and join | `site/map.html` (situated view from an imported key), `site/join.html` | display; no verification |
| Mages City connected community | `site/connected/index.html`, `board.html` via `data.js` | the one verified surface: the chip reads the signed VTA record |
| Mages City docs | `VTA_STAR_KNOWLEDGE_SPACES.md`, `CITY_KEY_LOOP.md`, `JOURNEY_INTEGRATION.md`, `TRUST_TASK_CONSTELLATION.md`, `VTAFARM.md`, `NOTE_TOIP_2026-09-05.md` | the Star as the client-side state that cannot grant writes; the key loop; the farm |
| agentprivacy.ai (master) | `StarCompanion.tsx` in the layout; `/city` (the City Key); `/star-chart` | the corner Star panel and session appearance; the key's home |
| soulbis.com | `/star`, `/lattice`, `/sigil`, `/skye`, `/star-experiment`, `/signatures` (pushed) | the geometry, the κ, the PNG carrier, the signature instrument |
| guide.agentprivacy.ai | `site/star-chart/` (2,207-row bake with PSI elements) | every page a star; postured stars seat at their vertex |
| agentprivacy.org (labs) | `site/work/star-key/` | the experiment page, links out to the reader |
| spellweb | lattice visuals, `NodeInspector` | the Star as lattice and orb |
| agentprivacy-mcp | `experience-overview.json` route `star-orb` (palette only); `key_*`, `hold_verify` | the Mage's read tools; the Hold's verifier |
| cityofmages | `mages-city/DISCOVERY.json` door `star-chart→hall`; `bridges/out/star.json` | residents seat as stars on the guide's chart |
| hearthold (Flaxscrip) | `deploy/INSTALL-mages.md` | a City of Mages Chronicles knowledge base live at `mages.archon.social` since 24 August, on hearthold's Warden and Mage; not the Star itself, but the City served from the cousin-forge |

So yes: the Star is used in Mages City and across the ecosystem, on twelve surfaces, and on exactly one of them (the connected community's chip) is anything about it verified. That ratio is the reason for the Hold.

## 2. What a "signature" is in each vocabulary

- **OpenVTC / DTG credential spec.** A signature is a W3C `DataIntegrityProof`, cryptosuite `eddsa-jcs-2022`: Ed25519 over `SHA-256(JCS(proofConfig)) ‖ SHA-256(JCS(document))`, `verificationMethod` = a DID URL (`did:webvh:…#key-0`, `did:key:z6Mk…#z6Mk…`, `#passkey-<hash>`), `proofPurpose` = `assertionMethod` or `authentication` (`packages/core/src/trust-tasks/sign.ts:68-95`, `verify.ts:57-132`). The credentials are VMC (membership), VEC (endorsement/role), **VRC (relationship, member self-issued)**, VPC (persona annotation), VWC (witness), VIC (invitation), each with a Bitstring status-list slot. DID roles: M-DID (member), **R-DID (pairwise relationship)**, P-DID (persona), C-DID (community). The **VTC** is the community service: it admits members, issues VMC/VEC, and syncs the trust registry — so the VTC is the natural publisher of the *member set root* a ZK statement needs.
- **mages.city lane.** A signature is a bespoke record: canonical sorted JSON, Ed25519 via `node:crypto`, did:key derived from the same public key, no DID URL, no proof object, no status slot (`agentprivacy-mcp/lib/sign.mjs:36-66`). The planned Rung 5 VRC is `{parties:[pubA,pubB], intersection, proverb, issued, sigA, sigB}` — two raw signatures, no DID references, no envelope.
- **soulbis experiment.** A signature is an *encoded byte count with a component breakdown* — the instrument, not the object.

These three do not interoperate today. The Hold (§4) is where they meet: an item carries the OpenVTC envelope as the canonical form, the mages.city record as one accepted profile, and the measured bytes as the soulbis instrument reads them.

## 3. Options for the artefact

**A — additive fields inside the City Key** (`relationships[]`, `receipts[]`, `credentials[]`; the integration plan's option A, ruling ⚑1). Signatures become key content: they move κ and chain `prior`.
Pro: already ruled; one type edit; the "digest or signature, never a body" shape rule.
Con: third-party signatures enter the κ preimage, against the Rungs invariant that signatures travel *beside* the key; entries are bespoke pairs, not envelopes — nothing OpenVTC can resolve or verify; no original bytes retained, against the roadmap's first rule; every new relationship rewrites the key's identity, which is what makes κ a correlator across time.

**B — a sidecar Hold beside the key, the key carries only a root.** New record `agentprivacy.star-hold/1`; items are retained envelopes; City Key gains `holds?: {root, count}`, the same rule as `packets`.
Pro: κ rule untouched, signatures beside the key, reuses a pattern three verifiers already implement (`kappa.mjs:41-51`, `gate/citykey.mjs:56`, `sigil` bundle verifier); each item is a genuine OpenVTC/DTG envelope with a DID-URL signer; the Merkle root is exactly the public input a set-membership proof wants; the holder keeps originals private and projects only root + count.
Con: a new record kind with producers, readers and validators to build across four trees; the root is itself a correlator if published raw (§6.5).

**C — the Star as a Verifiable Presentation.** Holder `authentication` proof over N embedded credentials keeping their issuer proofs (OpenVTC's `vp_token` shape, `vta-sdk/src/vp.rs:22-27`).
Pro: maximal OpenVTC alignment; VMC/VEC/VRC/VWC are native items.
Con: a VP is audience-bound and ephemeral, not a held artefact; DI presentations "cannot be redacted" (whole-credential disclosure); κ/`prior` lineage does not fit the VC data model.

**Recommendation: B as the artefact, C as one of its presentation forms, the ZK proof (§6) as the other.** Held ≠ presented. The Hold is what the bearer keeps; a VP or a ZK presentation is what an encounter receives.

## 4. The Star Hold (proposed shapes)

Item — one signed record, retained unchanged:

```jsonc
{
  "ref": "sha256:<digest of the original envelope bytes>",        // stable record reference
  "profile": "trust-task/eddsa-jcs-2022" | "vc/eddsa-jcs-2022" | "webauthn-assertion"
           | "agentprivacy.vta/1" | "agentprivacy.vrc/1",         // decides the verifier, never the selector
  "envelope": "<base64url of original bytes>",                    // or omitted in a projection, ref only
  "signer": { "did": "did:webvh:…", "verificationMethod": "did:webvh:…#key-0" },
  "signed": { "alg": "ed25519", "sigBytes": 64, "payloadBytes": 1412, "envelopeBytes": 1690 }, // measured from the record
  "role": "self" | "counterpart" | "issuer" | "witness",
  "subject": "did:…", "audience": "did:…", "issued": "<ISO>", "expires": "<ISO>",
  "status": { "list": "<url>", "index": 17, "checkedAt": "<ISO>" },   // DTG Bitstring slot when present
  "verification": { "state": "not-checked|valid|invalid|unsupported|unavailable",
                    "verifier": "openvtc-verify-trust-task@<ver>", "inputDigest": "sha256:…", "at": "<ISO>" }
}
```

Hold — the collection:

```jsonc
{ "kind": "agentprivacy.star-hold/1",
  "bearer": "did:key:z6Mk…",                 // the Swordsman identity the City admits
  "kappa": "sha256:…",                       // the City Key this Hold belongs to
  "items": [ … ],                            // private; a projection carries refs only
  "root": "sha256:…",                        // Merkle root over sorted item refs, same rule as packets.root
  "count": 3,
  "budget": 24576,                           // the soulbis instrument's storage assumption, inspectable
  "at": "<ISO>",
  "sig": "<128 hex>"                         // bearer's ed25519 over canonical {kind,bearer,kappa,root,count,at}
}
```

Changes this implies, all additive:

- `city-key.ts`: `holds?: { root: string; count: number }` beside `packets`. Content, so it moves κ and chains `prior` — the *root* is content, the signatures are not.
- `agentprivacy.vta/1`: generalise `vrcs: []` (commitments) to `holds: <count>` or keep `vrcs` as the VRC-typed subset. The record's signed set gains one integer; the Swordsman policy gains "no Hold item without a `valid` verification state".
- Verifier (one function, WebCrypto only, so `site/record.js`, `lib/sign.mjs` and the extension share it): re-derive `root` from item refs, check `root === key.holds.root`, then per item dispatch on `profile` to the real verifier — `verifyTrustTask` for the OpenVTC profiles, `verifyRecord` for the mages.city profiles, WebAuthn assertion check for passkeys. Verification is its own result per item; the Hold is never "verified" as a whole.
- Star reader (`star-journey.tsx`): a second import path "Choose a Hold", listing items with measured bytes and verification state; the soulbis fold becomes the Hold's byte view (`budget` is the same number).
- The `runtimeReceipts[]` slot on the key becomes deprecated in favour of the Hold: same intent ("original signed credentials, carried unchanged"), now with a reader.

Name is a ruling ⚑: "Hold" is used here to avoid overloading "Star" (the perspective) and "Key" (the node).

## 5. Alignment to OpenVTC and the DTG credential spec

1. **Signer references are DID URLs**, never bare hex. did:key resolves locally; did:webvh via the DID host with SCID and pre-rotation; did:peer:2 for pairwise. The fork's `derive-signing-key.ts:53-103` already picks the verification method by purpose.
2. **VRC = the DTG relationship credential**, not a raw signature pair. Rung 5's `{intersection, proverb, sigA, sigB}` becomes a VRC issued by each party (member self-issued edge, `eddsa-jcs-2022`, status slot) whose claims carry the PSI intersection commitment and the proverb digest. Two VRCs, one per direction, are the "both parties sign" rule in OpenVTC's own grammar. The five vocabulary questions in `mages_city/docs/NOTE_TOIP_2026-09-05.md:96-102` (wiki fork as VRC edge evidence; where an adopted receipt sits among VPC/VEC/VWC) are answered by the Hold's `role` and `profile` fields rather than by new kinds.
3. **Pairwise by default.** OpenVTC signs relationship edges under R-DIDs. A Hold full of R-DID-signed VRCs discloses no member identities to anyone who sees an item — and this is what makes the ZK step necessary rather than decorative: only the holder can re-link an R-DID to its M-DID (§6, common-control gadget).
4. **`agentprivacy.vta/1` should become an envelope.** Either register it as a trust-task type (then OpenVTC's channel signs and verifies it for free) or wrap it as a DI-proofed document. Until then it stays an accepted `profile` in the Hold with its own verifier — honest, but a second signature scheme the City gate said it did not want (ruling ⚑2).
5. **The persona DID (🧙 Mage's Key, did:webvh)** is the bridge between the bearer's did:key and community membership. The Hold's `bearer` stays did:key; the VMC item inside the Hold names the persona. That is the two-signed-statements bridge from `WEAVE_mages-city.md:62-84`, expressed as two items rather than a new mechanism.
6. **Privacy defaults.** Items are private. Projections carry refs. The VTA record carries a count. Disclosure is per item, per encounter, through the fork's existing two-call disclosure gate (preview → present) so `newToThisVerifier` applies to Hold items as it does to persona facts.

## 5b. What hearthold already built (convergence survey, later on 11 September)

Flaxscrip's hearthold (the House of Archon; Mitch's seat `~/hearthold_mage`, signed 2026-07-14) built the same outcome from the other side of the boundary. What converges, and what the Hold takes verbatim:

**Source and attribution.** <https://github.com/Flaxscrip/hearthold>, read at commit `766ca98` (2026-09-10). The local clone was 104 commits behind at `ad01582` and was updated on 11 September; every file and line cited in this section was re-checked at `766ca98` (the only move: `requiredLevelFor` now lives in `security.ts`). The repository carries no LICENSE file; it is read under the collaboration the signed seat records, and cited by file and commit wherever a shape is taken. Hearthold's own `docs/attributions.md` credits agentprivacy for the Privacy Is Value Model, the dual-agent custody separation, the multiplicative gate and the three sovereignty axes, and records one "honest divergence": the model contemplates zero-knowledge proofs where hearthold ships salted-Merkle selective disclosure. The Hold's presentation (§6) is the zero-knowledge side of exactly that divergence, which is the right thing to say back.

**What moved upstream since the July survey, and matters here.** (1) `deploy/INSTALL-mages.md`: a **City of Mages Chronicles knowledge base at `mages.archon.social`, provisioned and live since 24 August**, a third Warden and Mage pair on Flaxscrip's host with the KB id `city-of-mages`. Hearthold is already serving the City. (2) `docs/outbound/privacymage-relay.md`: a relay **addressed to Mitch from GenitriX, marked ready on 28 August and not sent through hearthold** (it was to travel through the First Person's channel). It proposes the skill-garden handshake, reports a built `hearthold` garden with three packets, and asks four things: the Librarian's real `catalog.json` field schema; whether attested-run credentials would be welcome as an optional stronger seal; whether Librarian and TRQP mutual recognition is worth exploring; and that the public garden's `catalog.json` be fetchable, since agents are refused at the door today. Companion: `docs/agentprivacy-skills-integration.md`, schema reconciled against skills.agentprivacy.ai on 26 August. (3) `docs/two-products-one-core.md`: hearthold split into the Sovereign Capsule (prove a fact, disclose nothing) and Spaces (a queryable self gated by membership) on one core, which is the same split as this review's Hold (held) and presentation (shown). (4) `docs/terminology.md` now defines **issuer** as the `did:cid` whose signature a verifier's trust rests on, never the Warden's word, which is the Hold's `signer` field in their vocabulary. (5) The public portal now admits browser-extension origins and the Emissary carries a public web authenticator with a bring-your-own-wallet login: the Star Key extension could be that wallet.

| Hold element | Hearthold already has | Taken |
|---|---|---|
| `holds: {root, count}` on the key | `CityKey.packets: {root, count}` and `cityKappa` = this lane's κ rule (`game42.ts:159-189`) | the same rule, unchanged |
| per-item verification state | `IssuedLeaf.status: 'valid'\|'revoked'\|'unknown'` + `acceptedAt`, "re-checked at prove time" (`issued.ts:15-34`) | `item.status`, `item.acceptedAt`; every verify re-checks |
| single-use presentation | `termsOfUse HearthholdSingleUse.txn` + `SpentTxnStore` burn | the transcript `seen` set (clause 8) |
| pairwise chokepoint | `issueVrcToCounterparty` refuses a stable M-DID unless the Ruleset allows it (`dtg.ts:194-259`) | named as an issuance rule outside the proof |
| suite registry | `EcdsaSecp256k1Signature2019` everywhere; the DTG examples say `Ed25519Signature2020`; OpenVTC says `eddsa-jcs-2022` | the `profile` field is a registry; a verifier says `unsupported`, never guesses |
| never a score | `security-model.md` §4; `EvidenceGraphSummary` has no score field | a tier and declared links, never a count or a rank |
| approval before disclosure | `EvidenceApprovalStatement {approver, txn, claim, evidenceRoot, humanProof}`, Signet on a direct channel, Emissary never on the path | the Swordsman produces the presentation; the Star is the surface |

What hearthold lacks and the Hold adds: **k-of-n** (hearthold has N-of-N composite and single-witness VWC only), **measured bytes per item** (hearthold measures the whole bundle, in the harness, not in the key), and a **sidecar beside the key** with the key carrying only the root (hearthold's City Key embeds descriptions and identity inline). The unsent letter and the consolidated upstream notes to Flaxscrip are overtaken: Witness was renamed Emissary upstream, and the seat is signed.

## 5c. The hearthold harness seat as an addition to this build

Hearthold's other contribution is not a schema but a **harness seat**. `~/hearthold_mage` is a dual-agent harness instance whose objective is **disclosure debt**: the canonical-JSON bytes of a full-mode attestation bundle that satisfies a frozen census of 23 things a relying party may demand, checked one requirement at a time by a script that may read only the bundle and public state, never the vault. Its baseline is 2,049 bytes; its canary passes 23 of 23; fourteen negative fixtures are refused by name; the census is frozen by a sha256 so the metric cannot drift; and the seat was accepted by a signature from the House of Archon on 14 July. That is the discipline this build was missing: the Hold measured what is *held*, the soulbis fold made it visible, but nothing measured what a verifier *learns*.

**Built as a second instance** beside the claims-register instance: `runtimes/star-hold/harness-disclosure/`, with the census at `runtimes/star-hold/census/verifier-requirements.json` (14 requirements, frozen, sha256 recorded in `census/FROZEN.md`) and the counting rule at `scripts/measure-disclosure.mjs`, which carries hearthold's two rules verbatim: every entry is canary-satisfiable, and a check may read only the public side and the verifier's own state. Three numbers are kept apart, as the seat keeps them:

| Quantity | What it is | k = 2 fixture |
|---|---|---|
| **disclosed** | the presentation's public side, canonical bytes — the metric | 521 B |
| no-proof route | the same two relationship credentials presented whole in a Verifiable Presentation | 2,529 B |
| **held** | the Hold's used budget (the soulbis fold) | 6,478 B |
| transport | the proof object | unmeasured, no circuit |

The four absence requirements are the runtime's lints written as a relying party would write them (no count, no raw root, no DID, no item refs); the shape requirement is the disclosure set verbatim; the lifecycle requirements bind the show to the transcript *this* verifier issued, so a bare nonce fails. The gate's canary is the fixture presentation at 14 of 14; the levers are a field-pruner (a field the verifier already holds is a repetition, not a disclosure, and pruning it re-freezes the census) and an encoder (five 64-hex digests could be shorter without changing what is disclosed). The conformance gate passes; no round has run.

The seat pattern also gives the Hold its **first cross-lane item**. Hearthold's signed `HarnessSeatAcceptance` (1,849 bytes, `EcdsaSecp256k1Signature2019` under a `did:cid` key) is carried by the runtime as a declared item: state `unsupported`, no signer inferred, bytes measured. That is the Hold saying what it cannot yet check, and it names the next verifier to add (secp256k1 with `did:cid` resolution through hearthold's Gatekeeper). The acceptance itself is the shape of a relationship credential between two sovereigns, the cousin-forge countersign: a Star Hold's first `issuer`-role item could be exactly this signature.

## 6. ZKP mapping

### 6.1 The statement

"The bearer of this Star holds at least *k* valid, unrevoked signatures from *distinct* members of community *C*, over relationship records that name the bearer, from a holder bound to this Star's commitment, without revealing which members, which records, the exact count, or the Star's κ."

### 6.2 Gadgets (spec chapter 3, `spec/terms-definitions/g-*.md`)

| Clause | Gadget | What it proves | Witness / public |
|---|---|---|---|
| 1 | key-binding (004) | presentation key = PRF(s, context); the Hold's bearer commitment opens to the same s | s private; `pk_presentation` public |
| 2 | set-membership (001) | item_i is a leaf under the Hold root | Merkle path private; **salted commitment to `holds.root`** public (never the root) |
| 3 | set-membership (001) | signer_i ∈ community root — issuer-as-predicate | path private; `root_C` public (published by the VTC) |
| 3' | hidden-value equality (candidate record 009) over an issuer-supplied linkage | the R-DID that signed item_i belongs to a member under `root_C`. The holder does not hold the counterpart's secret, so this cannot be common control; the VRC must carry its issuer's linkage (a commitment the counterpart wrote at issue time — "theirs to write", cred-spec #9, geoffturk 09-10) and the circuit proves equality between that commitment's hidden value and a leaf under `root_C` | needed because VRCs are signed pairwise |
| 4 | signature-verify | sig_i valid over record_i under signer_i's key | the X3 cost, §6.4 |
| 5 | commitment-open / range + common control (007, `body.md:824`) | record_i.subject = one of the bearer's R-DIDs, and that R-DID and the bearer's M-DID open to the same secret s — the holder-side case, where common control *is* the right gadget; issued ≥ t; type = VRC | predicate P; the VMC+VRC shared-subject predicate cred-spec PR #42 added |
| 6 | non-revocation | item_i's status slot ∉ `rl_root` at epoch | witness private; `rl_root`, epoch public |
| 7 | distinctness (005) | k distinct signers | per-issuer per-show nullifier `H('dtg-zkp/issuer-show-nullifier/v0', issuerId, transcriptDigest)` (`runtimes/multi-issuer/NOTES.md:25-30`) |
| 8 | transcript-bind (003) | one transcript digest binds audience, challenge, purpose, **and the approved projection + mapping digest** of the Star reading | `transcriptDigest` public |

Disclosure set: `{context, root_C, rl_root, epoch, C(holds.root), k-tier, transcriptDigest, pk_presentation}`. Negative space: which members, which records, exact N, other items, κ, the R-DIDs. Adversaries to name per claim: verifier; verifiers colluding; issuer–verifier colluding; registry operator (`body.md:1669`).

### 6.3 Nearest templates in the spec

- **012** "one controller across k credentials": the k-fold clause pattern, cost linear in k (`body.md:1248-1308`).
- **020** chain of countersignatures each checked with signature-verify under the delegate's key (`body.md:1353-1371`): the only record today that verifies a *collection* of signatures. It is being re-read against the merged VDC text today (`~/dtgwg-cred-spec-main_mage/ZKP_TF_RUN-2026-09-11.md` §3.2, door D17), and the chain link is being re-named hidden-value equality (candidate 009) rather than common control — the same split this statement needs between clause 3' and clause 5.
- **010** clause 1: a VRC vouch verified in-circuit (`body.md:1036`) — the k = 1 case of this statement.
- **005** multi-issuer: `dual_issuer k=2` = 10,717 constraints, `guardian_threshold t=3` = 16,078 (`body.md:670-671`), reproduced cross-arch on the lab Groth16 stack. The multi-issuer runtime's stated gap — "concealed k-of-n membership and threshold hiding are future work" — is precisely this statement's clause 7 with N hidden.

Route into the TF: a one-sentence dish opened as a zkp-tf discussion (`spec/intro.md:59-61`), then `conformance/records/0NN.json` against the schema, state `carded`. The `k` disclosure must be tiered (`{1, 2, 3+}`) because a rare exact count fingerprints the holder (`NOTES.md:38-41`) — which means the City chip's "vouched ×N" should already be a tier, not a count.

### 6.4 The cost route (the real decision)

The spec's position on Ed25519 is explicit: "an Ed25519 signature checked inside a BN254 circuit — the proof pays for the translation in constraints, seconds and payload" (`cryptographic-background.md:67`, case X3), with **zero measurements** in any stack, and the issuance rule that VMC/VRC signatures "must be ZK-friendly — either SPS on BLS12-381, a SNARK-native signature, or an additional Poseidon/KZG commitment alongside `eddsa-jcs-2022`" (`body.md:1098`, `868`). Four exits:

1. **Commitment beside the signature (draft C, unposted).** Keep `eddsa-jcs-2022`; every issuer additionally publishes a Poseidon commitment to the signed claims; the circuit proves over the commitment and the verifier checks the Ed25519 signature *outside* the circuit against the disclosed commitment. Cheapest change; the Hold item gains one `commitment` field; the VTC or Swordsman publishes it at issue time. Recommended first.
2. **A SNARK-native second key.** Each VTA carries a Baby Jubjub EdDSA did:key beside its did:webvh; VRCs are dual-signed. The "did:key beside did:webvh" shape is already how this lane names a bearer (`Q.md:9`), so the machinery exists; the cost is a second key per agent and a `2 × 64 B` item.
3. **Ed25519 in-circuit as an unmeasured X3 option row.** Honest, expensive, and would be the first measurement the spec has. Only worth it as evidence, not as the route.
4. **Legacy rails (SIROS / Longfellow)** verify ECDSA as-signed and are catalogued as substrate, not construction — and they do not cover Ed25519. Not a route for this lane.

The soulbis catalogue is relevant here in one narrow way: hash-based signatures (XMSS / Winternitz) are native to the Flock stack (`body.md:1537`). A Star that already measures SLH-DSA bytes could later hold PQC-signed items whose in-circuit verification is *cheaper* than Ed25519's. That is a note, not a plan.

### 6.5 The correlator, answered

Draft S asked the TF "whether a single carried key over a canonical form is the right shape for a proof carrier that walks between communities, or whether it is a correlator wearing a better name." The honest answer is that κ, `did:key`, `holds.root` and the VTA record are all stable identifiers, and the *public* projection of the Star is therefore linkable by design within a community. The ZK presentation must never expose any of them: clause 2 opens a fresh salted commitment `C = Poseidon(holds.root, u)` per presentation; clause 1 derives a per-context presentation key; the transcript binds the encounter. The three-layer rule then reads correctly under an adversary model — the Key is a witness, the Record is a community-scoped public input, Standing is the verifier's verdict, never stored.

### 6.6 What the Star does as a prover surface

Import the Hold → choose items and a statement from a predicate atlas (Rung 4's "/star Trust panel") → the **Swordsman** (separate process, holds s and the seed) produces the proof → the presentation carries `{proof, public inputs, geometry reading}` with the reading's projection and mapping digest inside the transcript, so the picture the verifier sees is the picture that was proven over. The extension's disabled "Create ZK proof" button is enabled only for constructions with a maintained verifier (VERTEX_PATHWAYS rule 3); the fold view shows the Hold's bytes, the proof's own size is reported separately (the spec: proof size "is not guaranteed to be smaller").

## 7. Trust-graph perspectives

| Layer (integration plan) | Today | With the Hold + ZK |
|---|---|---|
| Key — private, accumulates | κ node; walks, charts, packets root | + `holds.root`; the Hold beside it holds the signed edges |
| Record — public, projects | `agentprivacy.vta/1`: κ, prior, walks count, `vrcs: []` | + held count (tiered); commitments per item only when the community publishes them |
| Standing — computed, never stored | chip: `tier · κ verified · walks · carried · vouched ×N` where `vouched` = unauthenticated wiki forks | chip: `≥k vouched in C · proof-verified at <epoch>`; forks stay as "forks", relabelled |

The board's chip is the first consumer of a verified Hold and the first consumer of the ZK verdict: it stops counting journal entries and starts reading a verifier output. A resident's standing becomes a *presentation* the resident chose to make, not a scrape of what is visible.

## 8. Gaps to close first (from the display survey)

1. `gate/citykey.mjs` re-derives κ, Merkle root and did but does not verify the VTA signature; `site/record.js` does. One verifier, two importers.
2. Two chip renderers with different vocabulary; "walks" = the signed integer in one, `key.walks[]` length in the other.
3. The verified chip renders only on `/connected/`; the public City front shows palette only. No visitor sees a verification.
4. "vouched ×N" counts unauthenticated wiki-journal forks and is typeset beside a cryptographically verified κ.
5. `⚔️ trustTier` is printed from JSON on soulbis and the City even when the card is unverified.
6. The twin signs a synthetic key shape (`kind:'city-key', lattice, weight, charges`), not a soulbis v1 export; the bearer-equals-`identity.publicKeyHex` check has no real-key row.
7. `carried → flown → walked`: only `carried|unverified` has a producer.
8. Reader bundles on the City and soulbis are the 09-07 pre-κ build; the experiment pages say the repo is "initially private", labs says public.
9. Two unrelated digests share the κ glyph: City Key κ (canonical key minus `kappa`) and registry κ (six-field reading). Label the second "reading κ".
10. Two extensions (vta_star appearance companion, star-key fork). UNIFIED says one; fold `vta-star.journey-transfer/1` into the fork or retire it. `runtimeReceipts[]` on the key has no reader anywhere — the Hold replaces it. Orphaned `labs/site/assets/star-key-view.svg`.

## 9. Sequence and rulings

Order that respects the Rungs plan (1 → 2 → 3 → 5 → 4) and the research-loop rule "aggregate only after one verified exchange works":

1. **Hold v1 with one real item** — the bearer's own `agentprivacy.vta/1` record as item 0 (profile already verifiable), `holds` on the key, root re-derivation in the three verifiers, Star reader import. Acceptance = the fixture list in `STAR_SIGNED_RECORDS_INTEGRATION.md` §"Acceptance evidence".
2. **Second item = one OpenVTC trust task** signed by a test VTA (`trust-task/eddsa-jcs-2022`), verified by the fork's own `verifyTrustTask`. This is the first cross-vocabulary signature in the lane.
3. **Rung 5 as DTG VRCs** under R-DIDs, with the PSI commitment (Rung 3) as a claim; two items per relationship.
4. **k = 1 ZK**: reproduce record 010 clause 1 over one real VRC on the lab Groth16 stack, cost route 1 (commitment beside the signature). Card the construction record.
5. **k ≥ 2**: add clauses 2, 3', 6, 7; tiered k; salted root commitment. This is the "collection of signatures of VTA keys" proof.
6. Chip reads the verdict.

Rulings for the keeper ⚑: the artefact's name; option B over A (the plan's ruling ⚑1 chose A — this review argues for reversing it on the "beside, not inside" invariant); whether `agentprivacy.vta/1` becomes a trust-task type or a DI envelope; cost route 1 vs 2; whether `k` is tiered on the chip now; whether vta_star is retired.

## 10. Built later on 11 September (nothing committed, nothing pushed)

Steps 1 and 2 of §9 exist as code, and the ZKP side has a runtime, a coherence map and a candidate card:

| Where | What | Evidence |
|---|---|---|
| `~/dtgwg-zkp-tf-mage/runtimes/star-hold/` (the lab, git-excluded) | `src/hold.mjs` — the Hold reference (JCS pinned to star-key core, canonical form + Merkle pinned to agentprivacy-mcp; three profiles verified, three declared); `src/present.mjs` — the ten clauses as relations with a closed 21-code rejection register; `test.mjs`; `NOTES.md`; deterministic `fixtures/hold.fixture.json` | `node test.mjs` → 42/42 (36 + the disclosure-debt and cross-lane tests of §5c); two runs, one digest |
| `runtimes/star-hold/harness/` | dual-agent harness instance: objective **unbacked claims**, census gate over `claims_register.md` (19 rows), canary = the runtime's tests, finders `circuit-mapper` and `refuter`, open target OT-1 = a first X3 measurement | `node engine/conform.mjs …` → PASS; counting rule → 4/19; claims gate PASS. **No round has run** — a round is a Workflow launch, which is the keeper's call |
| `runtimes/CRED-SPEC-COHERENCE.md` §Star Hold · `runtimes/README.md` | the Hold ↔ cred-spec rows (VRC, R-DID, M-DID, status list, VTC set root, tier); the lab index row | — |
| `~/dtgwg-cred-spec-main_mage/explorations/X12-star-hold.md` + `.record.json` | the exploration and the candidate construction record (`0NN`, `requested`, schema-shaped, three routes for X3) | `ZKP_TF_RUN-2026-09-11.md` §6 addendum names it as 009's third dependant |
| `~/agentprivacy-mcp/lib/hold.mjs` + `test/hold.test.mjs` + `hold_verify` tool | the Mage's Hold verifier, reusing `lib/sign.mjs` and `lib/kappa.mjs`; verifies the runtime fixture to the same root and states; builds a Hold from a real evolved key | `node --test` 3/3; `hold_verify` over stdio → ok, 7 valid, projection carries no envelopes and no counterpart DIDs |
| **The Star runtime** (later on 11 September): `swordsman/swordsman.mjs` gains `hold_relate` and `hold_show`; `bin/star.mjs` is the command line (`star relate`, `star hold show`, `star hold verify`, `star present`, `star profiles`); `test/star-cli.test.mjs` | the Swordsman keeps the Hold beside the identity (`hold.json`, private) and is the only process that signs it; `relate` verifies an envelope BEFORE it enters, refuses an invalid signature, refuses a self item not signed by the bearer, refuses a duplicate; returns the key carrying `holds{root,count}` under a new κ for `key_sign`; `present` is honestly not available and says what Rungs 3 and 5 still owe it | 2/2 over a throwaway Swordsman: a self record, then a counterpart's DTG VRC from the runtime fixture; full suite green including the existing 18/18 Swordsman tests |
| Runtime H17 (two communities) | one Hold, the same two counterparts, shown under two community roots: both verify, no holder-derived value coincides, nullifiers disjoint; community values (revocation root, tier) may coincide because they are the verifier's, not the holder's | 45/45 |
| `~/star-key/packages/extension/src/star-hold.ts` + `tests/star-hold.test.mts` | the extension's Hold verifier: OpenVTC items through the wallet's own `verifyTrustTaskProof`, the mages.city record and the bilateral VRC through WebCrypto Ed25519; same fixture, same root, same states | `tsc -b` clean; 3/3. **Not wired into `star-journey.tsx`** — that file is modified in another window today |

Not done: the City Key type change in `agentprivacy_master` (a ruling, §9); `gate/citykey.mjs` and `site/record.js` in `mages_city` (not touched, other window); any circuit; any round of the harness; any commit.

## 11. Does the Star Key live outside the extension, and does it need its own city?

**Outside the extension: yes, and by construction it already does.** The Star exists in three places today, and the extension is the least essential of them:

1. **The Swordsman keystore** (`~/.agentprivacy/swordsman/`): the identity, the policy, the ledger. The only secret. The Hold belongs here beside it: private, accumulating, never in a page. The presentation (§6.6) is produced here too, because the holder secret never leaves this process.
2. **The Mage's read tools** (`agentprivacy-mcp`: `key_verify`, `card_verify`, now `hold_verify`) and the lab's scripts. No browser anywhere.
3. **The surfaces**: the extension (OpenVTC provider, consent, the reader page), the soulbis web reader, the City's front. Each shows; none holds.

The extension is a surface with one thing the others lack: a trusted approval boundary for a *browser* encounter (a relying-party login, a wiki capture). That is what OpenVTC built it for, and the unified-experience doc is right to keep it: a website-supplied interface must never be the approval boundary. But OpenVTC's own split is the answer to the question. The VTA is the agent that holds custody and policy; the browser plugin is the surface OpenVTC calls a wallet. The Star is the VTA-side artefact. So the recommendation is to name the standalone thing explicitly, the **Star runtime**: Swordsman plus Hold plus the Mage's verifiers plus a small CLI (`star relate`, `star hold verify`, `star present`). `agentprivacy-mcp` already is that runtime minus the CLI. The extension, the `vta_star` companion and the soulbis reader are then three surfaces importing from one runtime, and the encounter tool the 11 September chronicle imagined is this runtime with a surface attached, not a fourth implementation.

**Not a wallet.** The word is OpenVTC's and hearthold's for their browser surfaces, and it is the wrong word for the Star, so this review stops using it for anything but theirs. A wallet holds one party's credentials and presents them. The Star **aggregates many keys**: the bearer's Swordsman's Key, City Key and reserved Mage's Key; the pairwise R-DID it minted with each counterpart; the counterparts' keys that signed the relationship records it holds; the community roots it can be shown under. And it is **relationship-based**: every item in the Hold is a signed relationship or a signed act toward one, the presentation proves relationships (k distinct vouches), and standing is computed from relationships, never stored. The right vocabulary is the lane's own: the Star is a *perspective* carried by a bearer, the Hold is what that perspective has been *signed into*, and the CLI's first verb is `relate`, not `add`.

**Its own city: not yet, and the reason matters.** The presentation is community-scoped: it proves vouches from members under one community root. Today the only community that can be that root is Mages City, a Verifiable Trust Community on OpenVTC. Three ways to place the Star:

| Option | What it is | Cost | When |
|---|---|---|---|
| **A. A resident of Mages City** | Stars are City residents; the Hold is the standing artefact; the community root is the City's member root; the chip reads the verdict | nothing new | now; it is the design as written |
| **B. A Star district** | the City already has districts; a district whose admission predicate is "holds a Star with at least k vouches", its root over Star holders' commitments, its standing computed from proofs | no infrastructure; a district page and a root | when the k ≥ 2 proof exists |
| **C. A separate city** | a second Verifiable Trust Community, its own community DID, member root and governance, whose *only* admission rule is the Hold proof: a community of perspectives rather than of agents | one more VTC service on the same VTA ("one VTA hosts many VTCs"), a DID host entry, gate provisioning, a portal | when a second governance wants to admit Stars under a different rule |

The Star should not *belong* to any single city, which is a different claim from "it needs its own". Draft S's question to the task force was whether a carried key that walks between communities is a correlator wearing a better name. The honest answer in §6.5 was that the public projection is linkable within a community, and that the presentation exists precisely so that one Star can be shown in two communities without joining them. A second city is therefore not a product decision but the *test* of the presentation: the day two roots exist, the unlinkable-across-verifiers claim (the claims register's CR-15) has something to be checked against. Until then, keep the Star with the Swordsman, outside every city; let Mages City be the first verifier; open the district when the proof exists; and stand up a separate city only when a second governance asks for it, at which point OpenVTC gives it for the price of a community DID.

Rulings ⚑: whether to name and cut the Star runtime (CLI over `agentprivacy-mcp`) now; whether the district comes before or after the k = 1 proof; whether a second city is wanted at all, or whether the first "second community" should be an existing one (a Trust over IP community, hearthold's House) so the two-roots test is real rather than staged.

## 12. Seeing it as a benchmark

The harness already has the instrument: each instance emits a `runtime-feed.v1` (`node tools/emit_feed.mjs <instance>`), whose `movingCeiling` is R(t) = best / baseline, the same ratio the soulbis `/star` ceiling register draws. Both Star Hold instances now have a feed, and the read-only workshop console (`node tools/console.mjs`, port 4242) lists them beside the fleet: `http://127.0.0.1:4242/frontier?instance=harness` and `…?instance=harness-disclosure`. Today each curve has two points, baseline and best, and they are equal, because no fold has run. That is the honest state of a benchmark before its first round.

For the Star specifically, `runtimes/star-hold/scripts/benchmark.mjs` generates `benchmark.html` from the two feeds, the claims register, the disclosure baseline and a fresh run of the tests. It shows what a community verifier learns per encounter (521 B for a tier-2 show against 2,529 B for the same two credentials shown whole, with 6,478 B held), the claims that are stronger than their enforcement (4 of 22, each named), the two moving ceilings with their open targets, and a table of what the Star changes in five encounters (standing read as a tier not a count; who vouches without naming anyone; one Star in two communities without a handle; a foreign signature carried and marked unsupported; a record related only after it verifies). Published as its own page beside this one.

What moves the graph: a round. The claims instance descends when a lever backs one of the four open rows with a runnable check, or a refuter falsifies a PROVEN row; the disclosure instance descends when a field-pruner or encoder shrinks the public side without losing a census requirement. A round is a Workflow launch from `harness/harness.workflow.mjs` after `node tools/bundle.mjs`, and the descent only counts when the census gate is a full pass. The harness instances were updated tonight for the new tests (22 claim rows, 45 of 45, feeds emitted) and both pass conform and the claims gate.

## Sources

star-key: `packages/extension/src/star-projection.ts`, `star-registry.ts`, `star-journey.tsx`, `packages/core/src/trust-tasks/{sign,verify}.ts`, `packages/core/src/did/*`, `docs/*.md`. Master: `src/lib/city-key.ts:51-209, 388-413`, `docs/PLAN_CITY_KEY_CRYPTO_UPGRADE_2026-09-03.md`, `docs/PLAN_VTA_TRUST_GRAPH_INTEGRATION_2026-09-05.md`, `docs/chronicles/2026-09-11_the-star-learns-to-measure.md`. MCP: `swordsman/swordsman.mjs:68-125`, `lib/sign.mjs:18-130`, `docs/WEAVE_mages-city.md`. City: `site/record.js`, `site/data.js:75-133`, `gate/citykey.mjs:82-133`, `bin/build-pages.js:293-346`, `docs/NOTE_TOIP_2026-09-05.md`, `docs/REVIEW_2026-09-07.md`. Soulbis: `star/index.html:313-351, 770-883`, isolated release `star/signature-focus.js`. OpenVTC: `verifiable-trust-infrastructure/docs/01-concepts/overview.md`, `docs/03-vtc/credentials.md`, `docs/05-design-notes/{vti-credential-architecture,vpc-persona-annotation,vrc-publish-proof-of-possession}.md`, `vta-policy/src/consent.rs:135-340`, `vta-sdk/src/vp.rs`. ZKP spec: `spec/{intro,trust-graph,body,integration,cryptographic-background}.md`, `spec/terms-definitions/g-*.md`, `conformance/records/*.json`; workbench `task-force-readers/drafts/{C,Q,S}.md`, `runtimes/multi-issuer/NOTES.md`.
