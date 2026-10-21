# MyTerms in Star Key — plan (2026-10-20)

*Status 21 Oct 2026: generalised into **Agreements** (`packages/core/src/vtc/agreements.ts`, console pane "Agreements", store `agreements:<vtaDid>`, switch per community `agreement-prefs:<vtaDid>` read by the join door). MyTerms is the first kind. The plan for the family and the member door: `~/mages_city/docs/MEMBER_DOOR_AND_AGREEMENTS_PLAN_2026-10-21.md`.*

*Written as a plan in the morning; built the same afternoon on Mitch's word. What stands: core `packages/core/src/vtc/myterms.ts` (roster mirror, `MyTerms` service discovery, one-round plan, MCNP-shaped agreement), the terms step on the join screen, Settings "Your terms", the wallet-side record (`myterms-records:<vtaDid>` in `chrome.storage.local`, by digest of both signed documents), and the City's configuration files in `mages_city/deploy/vti/vtc/website`. Deviations from the plan below: the record is kept in the wallet rather than the VTA vault (a credential needs a verifiable proof the VTA can check, and the join request's own proof is the one that exists); the carrier is the DID-document service plus the join request's `extensions`, because the VTC is upstream's and signs nothing extra. Phases P0–P3 are done to that shape; P4 (audit export) is not.*

## 1 · What MyTerms is, and what it is not

IEEE 7012-2025 (MyTerms) makes the person the **first party**: the person proffers a standard-form agreement from a roster kept by a neutral non-business (Customer Commons), the organisation accepts it, makes one counter-offer, or declines, and **both sides keep an identical, auditable record**. Negotiation is one round. The roster is small by design: `SD-BASE` plus modifiers (`SD-BASE-A`, `SD-BASE-AT`, `SD-BASE-ATP`, `SD-BASE-DP`, …), and the `PDC-*` contribution terms. An implementer never mints agreement IDs.

The IETF draft **MCNP** (`draft-curtis-myterms-01`, an individual draft; its BoF request names OpenVTC among interested parties) gives the wire shapes this plan borrows: discovery at `/.well-known/myterms-configuration`, an agreements list at `/api/v1/myterms/agreements`, and a **Verifiable Contractual Agreement (VCA)** = `{agreement: {version, references, agreementId, created, ids?, permitted, prohibited, validRoles}, signature: {version, id (signer DID), signedOn, type: "JWS/JCS", jws}}`, EdDSA over RFC 8785 canonical JSON, with three attestation levels (server-trusted, cryptographic, auditable-cryptographic with a ZK audit record).

What the standard scopes **out**: party-to-party terms, enforcement, delegation. And the point `docs/VISITOR_PROMISES.md` already makes: **an agent persona is not the individual** the standard's first party is. The record must name the represented person (the holder) and the represented organisation (the community), with the signing persona as the person's agent key, or it is not a MyTerms result and must not be reported as one.

Existing work to reuse, not redo: `~/myterms/ieee7012_integration_plan_v2.md` (the agreement layer sits on the Σ axis; registry mirror, one-round negotiation, bilateral recorder, auditor function), `~/myterms/harness` with `myswordsman` (records) and `mymage` (proposes), and the Mages City Exchange's terms shape (`docs/EXCHANGE.md` M1: a terms digest and a bilateral seal under every grant).

## 2 · Where it fits in the extension

The join-by-DID flow is the first encounter between a person and a community, and it already has the shape MyTerms needs: the community states something before the person commits (the **directory disclosure statement**, shown and digested as `statementDigest` before the request is sent), the person chooses a persona, and the agent signs. MyTerms is the same move in the other direction: **the person states their terms before joining, the community accepts, and both keep the record.**

Three seats in the wallet:

1. **Standing terms (settings).** A "Your terms" pane in Settings (`options.tsx`) where the holder picks, once, the agreement they proffer by default (one of the roster), and optional per-community overrides. Stored like other wallet settings (`config.ts`), never sent anywhere by itself. The roster comes from a **read-only mirror** shipped with the build (`src/myterms-roster.ts`: code, title, canonical Customer Commons URL, content hash of the agreement text) and is checked against the canonical source when it can be fetched; the mirror is never the authority.

2. **A terms step in the join window** (`sign-in-view.tsx`, between `join-apply` and `join-submit`): "You join under `SD-BASE-AT` (what it means in two lines). first.openvtc.net accepts it / offers `SD-BASE-A` instead / does not take terms." The person continues, picks the counter-offer, or stops. Nothing about the person has been sent yet at this screen, exactly as the directory statement screen today. The same step belongs on the **sign-in** path for a community the wallet has no record with.

3. **The record.** On admission (or on a `refer` that the community confirms as accepted terms), the VCA is signed as the chosen persona by the VTA (`vault/sign-trust-task`, the same signer the join request uses) and kept in the **VTA vault as a credential** (`vault/credentials/receive`), so it is the agent's record and survives this browser. The community keeps its copy. The wallet shows it under the community in the console (Communities lane) with the agreement, the date, the persona, and the community's counter-signature when it signed. A **κ leaf**: the agreement's content address joins the Star Hold registry entry for that community, so the Hold can say *on what terms* a relationship exists without revealing the record (the DTG edge records *that*; the terms record *on what*).

## 3 · What the community has to publish

This is the coordination item, and it is not ours alone. Three candidate carriers, in order of preference:

- **In the join manifest** (`vtc/join-requests/manifest`): an `acceptedTerms` member listing the roster codes the community accepts and its counter-offer policy, beside `directoryDisclosure`. Cleanest: it is already the document the wallet reads before applying, already signed by the community, already versioned. Needs a trust-tasks-tf proposal (manifest 0.5), the way `directoryDisclosure` landed in 0.4.
- **In the DID document**: a `MyTerms` service pointing at `/.well-known/myterms-configuration` (MCNP's discovery). Works for communities that have not moved their manifest, and for sign-in without a join. The wallet would read it the way it reads `SignInPortal`.
- **MCNP endpoints as published** (`/api/v1/myterms/agreements`, `…/agreements/signed`): for second parties that are not VTCs at all.

The acceptance itself: the community's signature over the same VCA, returned in the submit response (`verdict.with.terms`) or fetched from `…/agreements/signed`. Until a community publishes any of this, the step shows **"does not take terms"** and records nothing, rather than recording a one-sided agreement as if it were bilateral.

## 4 · Phases

| Phase | Deliverable | Gate |
|---|---|---|
| **P0 · roster mirror + settings** | `myterms-roster.ts`, "Your terms" pane, tests on the mirror's hashes against the canonical texts | roster entries verified against customercommons.org by hand; no network needed at runtime |
| **P1 · read what a community accepts** | manifest `acceptedTerms` reader + DID-document `MyTerms` service reader + MCNP `.well-known` reader, all behind one `communityTerms(doc, manifest)` | first.openvtc.net or a test VTC publishes one of the three |
| **P2 · the terms step** | the screen, the counter-offer choice, the stop; render tests in `sign-in-view.render.test.mts` | nothing sent before Continue, pinned in `sign-in-flows.test.mts` |
| **P3 · the record** | VCA build + VTA signing + `vault/credentials/receive`; Communities lane shows it; κ leaf in the Star registry entry | the community's counter-signature verifies as its DID (`authentication`); a record without it is shown as *proffered, not accepted* |
| **P4 · audit / dispute** | export the bilateral record (MCNP level 2; level 3's ZK audit record later, tied to the Hold) for an auditor | out of scope for the first cut; design note only |

Each phase is reviewable alone. P0 and P2 can be built against a stub community in tests before any community publishes terms.

## 5 · Rules this must keep

- **Never mint an agreement.** Codes and texts are the roster's; the wallet carries a mirror and says so.
- **One round.** Accept, one counter-offer, or decline. No loop.
- **Bilateral or nothing.** A record is shown as an agreement only when both signatures verify; otherwise it is the person's proffer, labelled as such.
- **The person is the party.** The record names the holder and the community; the persona is the signing key. No "agent agrees with agent" record is a MyTerms record.
- **Nothing sent before Continue** on every screen, as the join flow already holds.
- **No IEEE conformance claim** anywhere in the UI or docs until the roster, the recorder and the auditor function are all real against a real second party.

## 6 · Decisions for Mitch

1. Which default agreement the Star proffers out of the box (`SD-BASE` vs `SD-BASE-AT`), or none until the person chooses.
2. Whether to propose `acceptedTerms` on the join manifest to trust-tasks-tf now (the right carrier, slowest) or start with the DID-document service (ours to publish on dids.mages.city for the City's own VTC, fastest).
3. Whether Mages City's VTC is the first second party (we control both ends; honest test of the bilateral record) before asking The First VTC's operators.
4. Where the record's κ leaf surfaces: the Star Hold pane only, or also the family mages.city site.

Sources: IEEE 7012-2025 via `~/myterms/7012-2025 (3).pdf` and `ieee7012_integration_plan_v2.md`; [draft-curtis-myterms-01](https://datatracker.ietf.org/doc/html/draft-curtis-myterms-01); [MCNP BoF request](https://datatracker.ietf.org/doc/bofreq-curtis-myterms-contract-negotiation-protocol-mcnp/00/); [Customer Commons](https://customercommons.org/); local `mages_city/docs/VISITOR_PROMISES.md`, `docs/EXCHANGE.md` §M1.
