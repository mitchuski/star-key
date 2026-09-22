# The Star as the nexus — upstream check and deployment pathways, 21 September 2026

RESUME here. Follows `SYNC_STAR_HOLD_2026-09-13.md`. One window. Two asks from the keeper: re-check the OpenVTC upstream against our fork and local checkouts for improvements worth taking, and lay out how the Star becomes the nexus of the VTA setup system and the way a bearer shares their view of the trust graph — as an interface over the wallet, a mobile app, a trust-graph encoder and a front to VTA hosting — without moving the geometry.

Review and proposal. Nothing below was committed, pushed, merged into a real checkout, or deployed. The merge test ran in a scratch worktree that was removed afterwards.

*Later the same day:* `~/star` was synced to the soulbis working tree (all five rooms, the shared nav and stylesheet, the two signature scripts, `signatures/`, `star-experiment/`; uncommitted), the two plain OpenVTC checkouts were pulled, and the deployment view was written at `~/mages_city/deploy/OPENVTC_STACK_VIEW_2026-09-21.md` — read that next; it carries the measured state of every surface and the one decision (hosted farm vs self-host box).

## 0. Verdicts

| question | answer |
|---|---|
| Is our fork behind upstream? | Yes, on all three. VTI checkout 334 commits (05 → 21 Sept); the browser-plugin fork 162 commits; vti-setup 2 commits. |
| Does upstream merge into `star-key` cleanly? | **Yes, measured.** `git merge upstream/main` in a scratch worktree: no conflicts, `npm ci` ok, `npm run build` ok (star.html, popup, manager all emitted), our star tests 6/6, `tsc --noEmit` clean. Node 22 here; upstream now asks for Node ≥ 24 (25 engine warnings, no failure). |
| What upstream shipped that changes our design? | Five things: **vetting statements** (a counted vouch, shipped), **proof sets + post-quantum keys**, **data rooms** with a Merkle record commitment, **persona context-first** (faces composed at the context), and a documented **mobile core** + **VTA Farm** deploy stream. Each maps onto something we already built; §3. |
| Is the Star a wallet? | No — the 11 Sept ruling stands. The VTA wallet (upstream's console, PWA and mobile apps) is what the Star rides on. The Star is the bearer's *perspective*: it aggregates many keys and holds signed relationships. "Wallet interface" below means *the Star as the interface over the wallet*. |
| Does the geometry change? | No. Every pathway in §5 renders the same canon; the only geometry work proposed is additive (signatures as Hold items, the core artefact, orbit colours for worlds). |
| Drift found | soulbis `/star/index.html` and `~/star/star/index.html` differ by 591 lines — the 11 Sept signatures work landed on soulbis only. The five-shared-pages rule is broken in the direction `~/star` is behind. Sync = Mitch. |
| Good news | `agentprivacy-mcp` `ecb1b32` = `origin/main`: the conformance pack (9 tracked files) **is pushed**; the URL promised on hearthold #90 is real. |

## 1. What upstream did (5 → 21 September)

### 1.1 `OpenVTC/verifiable-trust-infrastructure` — local `~/openvtc/verifiable-trust-infrastructure` at `487326bb`, upstream `46bb13da`

By scope: rooms 19 feat + 9 fix + 15 docs; vtc 21 feat; persona 11 feat + 9 fix; tsp 8 feat; keys 6 feat; audit 4 feat; 46 breaking (`!`) commits. What matters to us, with the commit to read:

| theme | what shipped | our twin |
|---|---|---|
| **Vetting** (`docs/03-vtc/vetting.md`, #1425–#1432) | An applicant presents **Vetting Statements** — DTG `EndorsementCredential`s of type `…/identity-vetting/0.1` signed by members holding a **vetter role credential**. The community counts `distinct_counted_vetters`, by method, independence, commitment consistency, and decides `allow / request_more / refer`. Withdrawal, revocation review, PGP web-of-trust bootstrap. Their sentence: *"This replaces a web of trust with evidence the community can count, without publishing who vouched for whom."* | The Hold's k-of-n distinct-vouch statement (review §6.1). Theirs is the plaintext twin: the community sees the issuers; the public does not. Ours hides the issuers from the community too. |
| **Proof sets + PQ** (#1548, #1550, #1553, #1557, #1502, #1505, #1530, #1532) | Verification reads a document carrying more than one proof; every VTC path reads a proof set; a VTC signs with every key it holds and can hold an **ML-DSA** key (BIP-32 derived); templates declare algorithms; a v2-template VTC issues **hybrid credentials**. | Our proof-set verifier (13 Sept, runtime + mcp): fail-closed composition, non-Ed25519 → `unsupported`. A hybrid credential verifies `valid` today with no change. |
| **Data rooms** (`docs/02-vta/data-rooms.md`, `vti-rooms/src/merkle.rs`, #1346, #1375, #1289, #1382) | No member list by design; authorization is a presentation. **Record commitment** = Merkle over records sorted by key, leaf = JCS of the wire record, RFC 6962 domain separation (`0x00` leaf / `0x01` node); tree head; epoch key chain; read mirrors; a **browser can be a member** (`vti-rooms-wasm`); a presentation is bound to presenter *and* host DID. | The Hold root: Merkle over sorted refs, `sha256(left\|right)`, no domain prefix. Same idea, different rule — see §3c. |
| **Persona, context-first** (`docs/05-design-notes/persona-context-first.md`, #1598, #1597, #1596) | Pool above contexts, faces as projections, one-way boundary (kept). Authoring inverted: compose a face **at the context** when the invitation arrives; local faces promote to the pool one-way; worlds *suggested, never asked*; `slot` designates the presented name; binding label replaces the private face name; the manifest may **ask for attributes** — "the load-bearing gap" between join ceremony and persona store. | The Star reading `star-reading/0.1` (name · palette · lit) is exactly a face composed for a context. |
| **Recognition graph** (`docs/03-vtc/trust-registry.md`, #1495, #1489) | Browse trust records **from either side** (Registry vs Ours), drift check on a timer, three disagreement directions, "not checked yet" ≠ "agree". | Standing as a read-time view (integration plan §0); CR-15 two-roots. |
| **Audit chain** (#1419–#1421, `vta-audit-chaining.md`) | The VTA's audit log as a hash chain with its own audit key; verifiable. | The Swordsman's `ledger.jsonl` + `prior` chain on records. |
| **TSP Rev 3** (#1512, #1478, #1543, `tsp-rev3-migration.md`) | Relationships (XRFI/XRFA) before sending; Trust Tasks in the TSP binding envelope; persisted relationship state; recovery D4–D9. | Nothing yet; the Star talks REST/DIDComm through the plugin. |
| **Keys** (#1401, #1404, #1407, #1535) | A key can be marked *never leaves the VTA*; export one key by name; a derived key carries its algorithm; an operator can create a PQ key and see which axis it protects. | The Swordsman keystore (identity 0600). |
| **ACL capabilities** (`personal-ai-agents.md`) | `pnm acl create --did … --role application --capabilities memory-read,room-present` — narrow at creation, never widen. | Mages City `AGENTIC_VTI.md` §3 agent tailorings should name these. |
| **Join requests** (#1591, #1593, #1563) | Applicant withdraws; supplements a deferral in place; a community chooses whether the manifest is public. | The Portal's first-contact board. |
| **Mobile** (`vta-mobile-core/`, `mobile-agent-architecture.md`) | Shared Rust engine via UniFFI: *pure functions over bytes*; the native side owns custody (Secure Enclave / StrongBox), transport and UI; the **`Signer` callback** (`did()`, `sign(bytes)`) is the one seam every signing flow rests on. Two apps: Authenticator, PNM. Strategy A = reuse the Rust core (flutter_rust_bridge); B = reimplement. | The Swordsman signs bytes and never exposes the key — the same seam. |
| Security | signing-oracle domain separation, resolvers refuse non-public hosts, endpoint vetting, tokens bound to origin, CI pinned to SHAs, rate limits typed and attributable (`x-rate-limit-source`). | Take as-is with the merge. |
| Spec-first | `CLAUDE.md`: the VTI specification is normative; wire types are generated from `trust-tasks-rs`; never hand-write a payload type. | The cred-spec TF work reads the same registry. |

Not relevant to us this window: enclave/Nitro, KMS seed caching, release tooling, dependency bumps.

### 1.2 `OpenVTC/vta-browser-plugin` — our fork `~/star-key` at `d74774e` (base `7e1b382`), upstream `df5bf77`

- **Manager console** grew the identity map (`persona-map.tsx`: three bands — attributes, faces, contexts — with the one-way line *drawn*; select anything and its reach lights up; two arrows from one face to two personas "ARE a link"), worlds (eight colours, `world-model.ts`), persona list/starter, claim types from the agent, disclosure step-up, rooms panes (create with a minted host DID, records, owner), DID create from the whole task surface, DID templates, realign keys, a popover system.
- **Vocabulary rulings** on screen: "attribute" not "fact"; no "disclosure".
- **Security**: egress guard, net policy (`E_BLOCKED_ENDPOINT`), origin check on the page-facing listener, no redirects followed, CORS allow-list; **the wallet verifies the replies it receives**.
- **TSP Rev 3** packs, Rev 2 read-only; binding envelope; pluggable key custody (a Mickens-Lab contribution).
- **`packages/pwa`** (`@openvtc/pnm-pwa` 0.2.0, "PWA shell — operator-facing wallet UI"): routes Connect · Passkeys · Smokes. **No web manifest and no service worker** — a shell in name, not yet installable.
- Upstream never touched our files: `star-*.ts*`, `star.html`, `manifest.json` (still "Star — Trust Experiment"). Only the six `package.json`s overlap, and they merged.

### 1.3 `OpenVTC/vti-setup` — local `f937d98`, upstream +2

- #37 verifies the explore setup script and every download it makes (a guard script, a lint workflow).
- #38 **documents the Deploy stream as the VTA Farm**: `ic3software/vtafarm-k8s` (five OpenTofu layers: k3s mgmt → Rancher → RKE2 → cert-manager/Longhorn/Vault → frontend+api via Helm), `vtafarm-api` (sessions, per-user namespaces, sealed-bundle bootstrap as Kubernetes Jobs — the same five explore steps), `vtafarm` (React portal). Farm DNS must be on **Cloudflare**. Sessions are **VTA Only** (a developer's Personal VTA, shared mediator + DID host) or **Full Stack** (VTA + mediator + DID host + VTC per user). The 13 Sept self-host proposal (`~/mages_city/deploy/vti/PROPOSAL_2026-09-13_self-host-explore.md`) targets the explore stream and still holds.

## 2. Our side, as found

| repo | state |
|---|---|
| `~/star-key` | HEAD `d74774e` (13 Sept, another window's commit). Uncommitted from that window: `.gitignore`, `package.json`, `docs/VERTEX_PATHWAYS.md`, `star-journey.tsx`, `star-projection.ts` + test; untracked `star-registry.ts`, `scripts/star-registry*.mjs`, `docs/STAR_KAPPA_REGISTRY.md`, `docs/STAR_SIGNED_RECORDS_INTEGRATION.md`. Never clobber. `star-hold.ts` still not imported by `star-journey.tsx`. |
| merge test | scratch worktree at HEAD → `git merge upstream/main` exit 0 → `npm ci` 404 packages → `npm run build` ok (`dist/star.html`, `popup.html`, `manager.js` 812 kB) → `node --test tests/star-hold.test.mts tests/star-projection.test.mts` **6/6** → `tsc --noEmit` clean. Worktree removed. |
| `~/agentprivacy-mcp` | `ecb1b32` = `origin/main`; `fixtures/star-hold-conformance/` tracked (9 files). **Pushed.** |
| `~/mages_city` | `11a8e9a` (13 Sept), 26 uncommitted paths (the parked `/connected/` front and others). |
| `~/openvtc/verifiable-trust-infrastructure` | plain checkout, not a fork; untracked `AGENTS.md`; `git pull` is safe. |
| `~/star` | `8271517` (8 Sept). `star/index.html` is 591 lines behind soulbis's (signatures panel, ceiling badge, panel refinement, title "Star · City Key"). |
| soulbis `/star` | carries `signature-math.js` (11 profiles: Ed25519 64 B · ECDSA-P256 64 · RSA-PSS-2048 256 · ML-DSA-44/65/87 2,420/3,309/4,627 · Falcon-512/1024 666/1,280 · SLH-DSA 128s/128f/256s 7,856/17,088/29,792) and `signature-focus.js` (volume = encoded bytes, byte budget 8/24/48 KiB, territory packing, "Fold into Star", signature circuit, perturbed spheres wearing the key's ε·m·n, six orbit colours, reduced-motion, inspect/composition bar). This is the surface the keeper called good. |
| Hold | `DEFAULT_BUDGET = 24576` in runtime and mcp — deliberately the soulbis panel's default; `budget{bytes,used,fits}` and `signed{sigBytes,payloadBytes,envelopeBytes}` per item. |

## 3. Convergences — the improvements to take

**a. A vetting statement is a Hold item.** The `IdentityVettingEndorsement` body carries `community`, `method`, `documentClasses`, `claimsVerified`, `livenessConfirmed`, `identityCommitment`, `cardDigestMultibase`, `declaredRelationship`. It travels as a DI-proofed `EndorsementCredential`, which is the Hold's `vc/eddsa-jcs-2022` profile — verifiable today by `star-hold.ts` through the core verifier and by the runtime/mcp through `verifyDI`. So: a Star that has been vetted holds its statements as items (role `issuer`, subject = the bearer), the Hold root commits to them, and the community's own count (`distinct_counted_vetters`) is the plaintext twin of our k-of-n statement. Take: add a fixture with one real-shaped identity-vetting statement to the conformance pack (test key, synthetic community DID); the ZK presentation then has a shipped predicate to hide.

**b. Hybrid credentials render as two volumes.** When a v2-template VTC issues Ed25519 + ML-DSA-65 proofs, our composition yields `valid` (Ed25519) beside `unsupported` (ML-DSA) and the whole reads `valid`. The soulbis panel already knows ML-DSA-65 is 3,309 bytes. Take: widen `Measured.alg` in `star-hold.ts` and `hold.mjs` from `'ed25519' | null` to the profile table's names, *measured not verified*, so a proof set shows as one small and one large volume in the same budget. No verification claim changes.

**c. Two roots over the same items — keep them two.** Rooms commit with RFC 6962 (domain-separated leaves over JCS wire records, sorted by key). The Hold commits `sha256(left|right)` over sorted refs, no prefix. Upstream's comment names the reason for the prefix: a node preimage presented as a leaf. Our leaves are already hashes of envelopes, so the classic attack needs a ref that equals an internal node, but the rule is cheap and the audit is easier with it. Ruling ⚑: Hold v2 root rule with domain separation (breaks the conformance pack and hearthold PR #92's pinned vector) or keep v1 and let a data room hosting the Hold produce the *second* root — which is the CR-15 two-roots test we wanted, for free.

**d. The Star reading is a face composed at the context.** Upstream's inversion — author from the invitation, offer existing faces or compose here, promote later — is what `star-projection.ts` does when it reduces a City Key to `name · palette · lit` for one recipient. Their `slot` (what a face presents itself as) and per-binding label (what *this context* calls the face) map to the reading's `name`. Take: name the reading's `name` field as the binding label in `VERTEX_PATHWAYS.md`; do not add a second name.

**e. "From either side" is the shape of sharing a view.** The Recognition page compares what the registry holds with what the community believes it published. The Star's shared view has the same two sides: what the bearer holds (the Hold) and what a community can count (its verdict). Present the *pair*, never one as the other; "not checked yet" is a state.

**f. Chain the Swordsman ledger.** The VTA now hash-chains its audit log under an audit key. Our `ledger.jsonl` has a head and `prior` on records but no chain over the ledger itself. Small, contained, on `swordsman.mjs`.

**g. Name the capabilities.** `memory-read`, `room-present`, `SignTrustTask` are now the words for what an agent's Star may do inside its own VTA. Cite them in `AGENTIC_VTI.md` §3 and the Portal copy.

## 4. The Star as the nexus of the VTA setup system

Upstream's setup is five steps, by hand on an explore box or as Jobs on a farm: `vta setup` → `pnm setup` + `vta import-did` → mediator → DID host → `vtc setup`. Every step but one is server-side. The one that is not — `pnm setup` — mints the holder's admin DID **on the holder's own machine**, and the farm imports it. That is the seam the Star sits on: the holder side of every step.

What already exists, one object per step:

| step | object the Star already holds or reads | where |
|---|---|---|
| identity | Swordsman's Key (ed25519, `/ceremony`) · pnm admin DID (a *second* key; the Star aggregates both) | popup `StarIdentityMenu`: Selected VTA · holder DID · role · home context |
| bind a VTA | `vtaDid`, `holderDid`, `homeContext` | options `#setup` (upstream flow, unchanged) |
| accumulate | City Key (`kappa`, `prior`, `walks`, `holds{root,count}`) | `/city`, `/star`, `key_evolve` |
| join a community | manifest → criteria → presentation → VMC/VEC | upstream `vtc/join-requests/manifest/0.2`; the City's gate |
| be vouched | vetting statements (§3a) · Rung 5 VRC | Hold items |
| share a view | `star-reading/0.1` · `hold project` (recipient-bound, permit, one use) · Skye sky shot · PSI common ground | extension `star.html`, `bin/star.mjs`, `/skye` |
| verify | `hold_verify` · conformance pack · hearthold PR #92 | mcp, runtime, House of Archon |

The gap is not an object; it is the **sequence and one surface**. Proposed order, holder side only:

1. **Setup pane = upstream's, under the Star brand.** Choose where the VTA lives — own explore box, a Personal VTA on the hosted farm (VTA Only session), or the City's community VTC — and record `vtaDid`. Nothing new to write; the merge brings the current flow.
2. **Two keys, stated.** The Swordsman's ed25519 identity and the pnm admin DID are different key material. The Star shows both and never pretends one derives the other. This is the "aggregates many keys" stance made visible; a later ruling could bind them with a signed cross-statement (one Hold item, role `self`).
3. **Join = compose at the context.** When a manifest arrives, compose the reading for that community (name · palette · lit), present, receive VMC/VEC and any vetting statements, `relate` them into the Hold. The City's gate step 1 stays *record the persona DID the applicant presented* (VTAFARM §4 ruling).
4. **Share = present the pair.** `hold project` for a named recipient, or `room-present` into a data room the bearer owns; the community's count beside the bearer's root, both labelled.
5. **Verify = three verifiers, one root** (the proof gate in the research loop, item 7), then the k ≥ 2 presentation.

Rulings ⚑: whether the Star's setup pane offers the hosted farm at all (it is a third party's custody); whether step 2's cross-statement is wanted; whether `relate` may accept a vetting statement before the conformance fixture exists.

## 5. Deployment surfaces

### 5.1 The interface over the wallet (browser extension)

Merge upstream (clean, measured). Keep the manager console as it is — persona map, worlds, rooms, DIDs are upstream's problem to maintain and they are good. Mount the Star as **one pane and the brand**: `star.html` becomes the reading + Hold + signatures pane; the popup keeps `StarBrand`. Then close the gap open since 11 Sept: import `star-hold.ts` into `star-journey.tsx` and render the Hold beside the reading (root · count · per-item state · budget). The extension's proof-set gap (it verifies DI through `verifyTrustTaskProof`, single proof) closes by reading `proof: []` and composing as the mcp does — the rule is written; port it. Cost: the merge, a re-baseline of the three tests, one pane.

### 5.2 Mobile

Three routes; the first two keep the page as it is.

| route | what it is | custody | geometry | cost |
|---|---|---|---|---|
| **A. PWA** | upstream `packages/pwa` + a web manifest + a service worker + the Star pane. Installable on iOS/Android from the browser. | passkeys (WebAuthn via `vti-webauthn` / `pnm-core`) — no Secure-Enclave DID key | the same three.js page; **vendor three.js r128** (today a CDN tag) so it runs offline | weeks; no store review |
| **B. WebView hybrid** | a thin native shell (Swift/Kotlin) with the Star page in a WebView; custody native | Secure Enclave / StrongBox through `vta-mobile-core`'s `Signer` callback | the page, unchanged; the shell passes signed bytes in and out | a native shell + the FFI binding; upstream ships Swift/Kotlin bindings |
| **C. Native** | Flutter or native rendering of the stella octangula | as B | a re-implementation of the manifold; the STAR_GATES rule ("the geometry IS the claim") means a second renderer needs the conformance rules of PLAN_KEY_EVOLUTION §4 before it ships | months |

Recommend A, then B. The `Signer` seam is the whole custody story on B and C: the engine computes the exact bytes (JCS, DI proof input), the enclave signs, the key never crosses. That is the Swordsman's contract already. The Hold verifies with the engine's DI verifier for `eddsa-jcs-2022` and with our canonical form for `agentprivacy.vta/1` — two verifiers on one device, as in the extension.

### 5.3 Trust-graph encoder

What the Star encodes today, per the 18-item table in `PLAN_VTA_TRUST_GRAPH_INTEGRATION_2026-09-05.md` §1:

| item | encoded now | how |
|---|---|---|
| City Key, κ, `prior` | yes | 64 glyphs = 64 vertices; Skye gold threads = lineage |
| lit / walks / focus / witness | yes | lit vertices, walked ring, poured mana, proven focus |
| geometry (ε, m, n, core, smRatio) · figures | yes | the manifold's shape; measured figures drive it |
| `holds{root,count}` | in the key; **not rendered** | — |
| VTA record | lineage strip proposed | — |
| VRC · VMC/VEC · VWC · vetting statements · receipts · grants · fold records | **no** | — |
| signatures | yes, as **samples** | volumes in a byte budget, folded into the Star, a circuit |

The proposal is one move: **the signatures panel stops sampling and starts holding.** Each Hold item is one volume: `signed.envelopeBytes` is the volume (measured, as now); the profile picks the scheme; the four roles (`self · counterpart · issuer · witness`) take four of the six orbit colours; per-item `verification.state` sets solidity (`valid` 90 %, `unavailable` 50 %, `unsupported` ghost 10 %, `invalid` the coral breach alarm the ceiling badge already uses); `budget{bytes,used,fits}` is the meter; the root is the tree head printed under the circuit; a presentation is "Fold into Star" over the k selected items. "Add signature" becomes `relate`. The community root goes to the Skye as a second sky. The Merkle rule and the volume rule stay measured; C66 stands — nothing about trust is read off the geometry.

That covers every signed edge in the table (VRC, VMC/VEC, VWC, vetting, receipts with a signature). Unsigned edges (forks, postures, walks) stay where they are: on the chart and the ring.

### 5.4 VTA hosting

The 7 Sept ruling stands: **the City is a community operator; agents bring their own VTA**. Upstream's #38 now documents the farm in full, so the cost of reversing it is known (Hetzner, Cloudflare-only tenant DNS, two Vaults, a standing custody duty). Four hostings the Star can *front*, none of which is "the Star hosts":

1. **A Personal VTA on the hosted farm** (VTA Only session) — the setup pane links to it; third-party custody, say so on the pane.
2. **The City's own four services on an explore box** — the 13 Sept proposal, D1–D7 = Mitch; the keeper's Star binds to it as the first CTA.
3. **The Hold in a data room** — T1 own room host (`room-host`) or the City as T2 host; the room's RFC 6962 commitment beside the Hold root = two roots over the same bytes (§3c). Browser membership exists (`vti-rooms-wasm`), so the extension can be the member.
4. **An own farm** — ruled out; documented upstream if ever reversed.

## 6. Geometry and aesthetics — what holds, what may move

Held (STAR_GATES: the geometry IS the claim): the canon constants (64 · Pascal row · neg/bnot/succ · ∂M 96/64 · the stella octangula core), `r(θ,φ) = R + ε sin(mφ) cos(nθ)`, κ → 64 glyphs with d₁ as the high bit, the palette navy/white/coral/cyan, one emoji per room, the terse on-page discipline, and the five shared pages byte-identical — the last is currently broken and is a sync, not a design change.

May move, additively:

- **Signatures as Hold items** (§5.3) — the panel the keeper called good becomes the encoder without changing a rule in `signature-math.js`.
- **The core artefact** (`PLAN_STAR_CORE_ARTEFACT.md`) — upstream's "face composed for a context" is the same thought as the core image shown in that context; the temporal ring is the moving ceiling. Keep the acceptance gate there.
- **Worlds as orbit colour** — upstream gives a world one of eight colours; the Star's six orbit colours are roles. If worlds arrive, they are a second palette on the ring, not a change to the six.
- **The boundary as the community** — verifiers sit on ∂M; a presentation is drawn from the core to a boundary vertex. A drawing rule, not a claim.
- **Proof sets as an argument** — a 3,309-byte ML-DSA-65 proof beside a 64-byte Ed25519 one is the clearest picture anyone has drawn of why a byte budget matters.

## 7. What to do, in order

| # | action | owner |
|---|---|---|
| 1 | `git pull` the VTI checkout and vti-setup (no local changes to lose) | agent, on ask |
| 2 | Merge `upstream/main` into `star-key` for real — after the other window's uncommitted star work is committed or set aside; then rebuild, retest, re-baseline | Mitch decides the order; agent runs |
| 3 | Sync soulbis `/star` → `~/star/star/index.html` (+ the two signature scripts) and re-check byte parity across the five pages | Mitch (push) |
| 4 | Wire `star-hold.ts` into `star-journey.tsx`; port proof-set composition into the extension | agent |
| 5 | Conformance pack: one identity-vetting statement fixture; widen `Measured.alg` (measured, not verified) | agent |
| 6 | Signatures panel → Hold items on soulbis `/star` (feature-flagged; samples remain the default until a real Hold is loaded) | agent, behind a STAR_GATES entry |
| 7 | PWA: manifest + service worker + vendored three.js + the Star pane | agent |
| 8 | `AGENTIC_VTI.md` §3: capability names; `VERTEX_PATHWAYS.md`: the reading's `name` = binding label | agent |
| 9 | Ledger hash chain on `swordsman.mjs` | agent |

Not proposed: a second geometry renderer before PLAN_KEY_EVOLUTION §4's conformance rules; a Star-run farm; deriving any trust value from the picture.

## 8. Rulings ⚑

1. Hold root rule: keep v1 (two roots via a room) or v2 with domain separation (re-pins the pack and PR #92).
2. Does the setup pane offer the hosted farm?
3. Bind the Swordsman's key and the pnm admin DID with a signed cross-statement, or keep them plainly two?
4. Mobile route A then B, or straight to B?
5. Merge order against the other window's uncommitted star work.
6. Does the Star district (review §11 option B) wait for k ≥ 2, or does one real vetting statement in the Hold count as the first edge?

## 9. Sources

Upstream: `OpenVTC/verifiable-trust-infrastructure` `487326bb..46bb13da` — `docs/03-vtc/vetting.md`, `docs/02-vta/data-rooms.md`, `docs/05-design-notes/{persona-context-first,mobile-agent-architecture,data-rooms-epoch-anchoring,data-rooms-verified-reads,vta-audit-chaining,tsp-rev3-migration}.md`, `docs/03-vtc/trust-registry.md`, `docs/02-vta/personal-ai-agents.md`, `vti-rooms/src/merkle.rs`, `vta-sdk/src/protocols/vetting.rs`, `vta-mobile-core/README.md`, `CLAUDE.md`. `OpenVTC/vta-browser-plugin` `7e1b382..df5bf77` — `packages/extension/src/manager/panes/persona-map.tsx`, `manager/world-model.ts`, `packages/pwa/`, `CLAUDE.md`. `OpenVTC/vti-setup` `f937d98..df68ba1` — `sysop/deploy/README.md`.

Ours: `~/star-key/docs/{STAR_SIGNATURE_ARTEFACT_REVIEW_2026-09-11,SYNC_STAR_HOLD_2026-09-13,UNIFIED_STAR_EXPERIENCE,VERTEX_PATHWAYS}.md`, `packages/extension/src/star-*.ts*`, `~/soulbis website/star/{index.html,signature-math.js,signature-focus.js}`, `~/star/{CLAUDE.md,STAR_GATES.md,PLAN_STAR_CORE_ARTEFACT.md,PLAN_KEY_EVOLUTION_MEASURED_GEOMETRY_2026-06-10.md,HOW_THE_SIGIL_WORKS.md}`, `~/dtgwg-zkp-tf-mage/runtimes/star-hold/src/hold.mjs`, `~/agentprivacy-mcp/lib/hold.mjs` + `fixtures/star-hold-conformance/`, `~/mages_city/docs/{VTAFARM,TRUST_TASK_CONSTELLATION,VTA_STAR_KNOWLEDGE_SPACES,AGENTIC_VTI}.md`, `~/mages_city/gate/citykey.mjs`, `~/agentprivacy_master/docs/PLAN_VTA_TRUST_GRAPH_INTEGRATION_2026-09-05.md`, `~/agentprivacy-docs/research/star-key-next-research-loop.md`.

*Later still:* the socialisation plan — what is actually new, use cases, and per-site proposals for review — is at `~/agentprivacy-docs/plans/STAR_SOCIALISATION_PLAN_2026-09-21.md`.
