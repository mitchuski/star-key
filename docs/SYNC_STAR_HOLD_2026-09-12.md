# Sync — the Star Hold window, closed 12 September 2026 (early)

One window, 11–12 September: from "review the Star Key work" to a signature-holding artefact with a runtime, two harness instances, a Star command line, a benchmark board, a frontier page, a reply to the House of Archon, and the two rulings the window could not make. Everything below was re-checked against disk at close; other sessions moved on top of this work overnight and their moves are recorded, not undone.

## Green at close

| Gate | Result |
|---|---|
| `runtimes/star-hold/test.mjs` (the Hold, the presentation, disclosure debt, the cross-lane item, two communities) | 45 / 45 |
| harness instances `harness/` and `harness-disclosure/` | conform PASS ×2 · claims gate PASS · 4 / 22 unbacked · 521 B disclosed |
| agentprivacy-mcp suite (incl. `hold`, `hold-projection-fix`, `star-cli`, the Swordsman 18, walk-demo signs) | 31 pass, 0 fail |
| star-key extension `tests/star-hold.test.mts` | 3 / 3 (tsc clean at last check) |
| frontier page `tools/workshop.html` | served 200, script parses — **committed in `4c8ed41`** by the harness seat |

## What this window built (by repo)

- **star-key** (`~/star-key`, uncommitted): `docs/STAR_SIGNATURE_ARTEFACT_REVIEW_2026-09-11.md` (§1 where the Star is used, §3 options A/B/C, §4 the Hold, §5 OpenVTC alignment, §5b hearthold convergence, §5c the hearthold seat added, §6 ZKP mapping, §8 ten display gaps, §9 sequence, §10 built, §11 outside the extension / its own city, §12 benchmark); `packages/extension/src/star-hold.ts` + `tests/star-hold.test.mts` + fixture. Not wired into `star-journey.tsx` (another window owns it today).
- **dtgwg-zkp-tf-mage/runtimes/star-hold/** (lab, git-excluded): `src/hold.mjs`, `src/present.mjs`, `test.mjs`, `NOTES.md`, `fixtures/{hold,presentation}.fixture.json`, `census/verifier-requirements.json` + `FROZEN.md` (N=14, sha256 `1bea1a6c…`), `scripts/measure-disclosure.mjs`, `scripts/benchmark.mjs` → `benchmark.html`, `harness/` (unbacked claims, 22 rows, feed emitted), `harness-disclosure/` (disclosure bytes, feed emitted), `runs/baseline/disclosure.json`. Coherence rows in `runtimes/CRED-SPEC-COHERENCE.md` §Star Hold; index row in `runtimes/README.md`.
- **dtgwg-cred-spec-main_mage** (uncommitted): `explorations/X12-star-hold.md` + `X12-star-hold.record.json` (candidate 0NN, `requested`); addendum §6 in `ZKP_TF_RUN-2026-09-11.md`. The board there was reworked overnight by the TF session (cards 007/008/010/020, doors, run) — X12 is not yet on that board.
- **agentprivacy-mcp** (uncommitted): `lib/hold.mjs`, `test/hold.test.mjs`, `hold_verify` in `server.mjs`; Swordsman `hold_relate` + `hold_show` (`hold.json` beside the identity); `bin/star.mjs` (`relate · hold show · hold verify · present · profiles`) + `test/star-cli.test.mjs`. **Overnight by another session:** `projectHold` now re-verifies and refuses an invalid structure; `hold_verify` gained `responseMode:'projection'`; six regression tests in `test/hold-projection-fix.test.mjs`; chronicle "the projection returns to the check"; `docs/TODO_STAR_COLLECTION_OBSERVATION.md` (the observation lane, deferred).
- **dual-agent-harness**: `tools/workshop.html` rewritten twice → the **agentprivacy harness frontier** (instrument + picker, fleet cards, live strip, footer; committed in `4c8ed41`); `HARNESS_PATHS.md` §17; `tools/console.roots.json` carries both Star Hold instances; `chronicles/2026-09-11_note-for-the-harness-seat_the-console-as-a-game.md` (untracked). **Overnight by the harness seat:** `ENTRY.md` arrival contract, `drivers/run.mjs` + `drivers/openai.mjs` (a runner without our tools — item 2 of the note), `new_instance` fixes, eleven newcomer defects closed (`chronicles/2026-09-12_newcomer-path-review.md`). The console process was killed for low memory; restart with `node tools/console.mjs`.
- **hearthold** (`~/hearthold`): clone updated `ad01582` → `766ca98`; all cited lines re-verified. **hearthold_mage**: `notes/REPLY_TO_GENITRIX_2026-09-11.md` (draft, unsent). **agentprivacy-docs**: `research/star-key-next-research-loop.md` item 7.
- **memory**: `project_star_key_extension.md` (the lane), `project_hearthold_edition.md` (upstream state), `project_dual_agent_harness.md` (page + game direction), `feedback_work_locally_no_artifacts.md`.

## The findings that stand

1. Nothing in the lane, in OpenVTC, or in hearthold held a collection of signatures with per-item verification; the Hold is that artefact, a sidecar with the key carrying only `holds{root,count}`.
2. The Star is not a wallet: it aggregates many keys and every item is a relationship. First verb `relate`.
3. The Star already lives outside the extension (Swordsman + Mage verifiers + surfaces). Its own city: not yet — resident now, district when the k ≥ 2 proof exists, a separate community only when a second governance asks; the second root is the test of unlinkability.
4. The presentation is ten clauses over spec gadgets; the issuer-side link is hidden-value equality (candidate 009), the holder-side link is common control (007). Ed25519 in-circuit is the spec's unmeasured case X3.
5. Disclosure per tier-2 encounter: 521 B against 2,529 B for the same credentials shown whole and 6,478 B held.
6. Twelve surfaces use the Star; one verifies anything.
7. Hearthold serves a City of Mages knowledge base at `mages.archon.social` since 24 August, and holds an unsent relay to Mitch from 28 August.

## Push check (12 September, later) — what is committed, what is not

Re-run after the other sessions' changes: mcp 36 / 0 (incl. their `star-recipient` and `hold-projection-fix` tests and the rewritten `bin/star.mjs` with `hold project`), runtime 45 / 45, harness **all 21 gates pass**, extension 8 / 8. All remotes fetched: no repo is behind.

| Repo | Unpushed commits | Uncommitted paths | This window's paths among them |
|---|---|---|---|
| star-key | 0 | 17 | `docs/STAR_SIGNATURE_ARTEFACT_REVIEW_2026-09-11.md`, `docs/SYNC_STAR_HOLD_2026-09-12.md`, `packages/extension/src/star-hold.ts`, `packages/extension/tests/star-hold.test.mts`, `packages/extension/tests/fixtures/` (the rest is the other window's registry + projection work) |
| agentprivacy-mcp | 0 | 11 | `lib/hold.mjs`, `test/hold.test.mjs`, `test/star-cli.test.mjs`, `test/fixtures/`, `bin/star.mjs`, edits to `server.mjs`, `swordsman/swordsman.mjs`, `package.json` (plus the other session's `hold-projection-fix`, `star-recipient` tests and TODO doc — same lane, commit together) |
| dual-agent-harness | **1** (`ea25f42` engine draw v2 — the harness seat's, not this window's) | 30 | `chronicles/2026-09-11_note-for-the-harness-seat_the-console-as-a-game.md`, `tools/console.roots.json` (gitignored), `HARNESS_PATHS.md` §17; the frontier page is **already pushed** in `4c8ed41` |
| dtgwg-cred-spec-main_mage | 0 | 62 | `explorations/X12-star-hold.md`, `explorations/X12-star-hold.record.json`, `ZKP_TF_RUN-2026-09-11.md` §6 (the rest is the TF session's board rework) |
| dtgwg-zkp-tf-mage | 1 (`9c376d6`, the TF lane's reader commit) | 5 | none tracked — `runtimes/` is git-excluded by design |
| hearthold_mage | 0 | 6 | `notes/REPLY_TO_GENITRIX_2026-09-11.md`, `feed.json` |
| agentprivacy-docs | 0 | 56 | `research/star-key-next-research-loop.md` item 7 |

Nothing from this window needs a push, because nothing from it is committed. The one unpushed commit is another seat's and is mid-series. Commits and pushes are the keeper's; path-scoped commits per the table keep this window's work separable from the concurrent sessions'.

## Open, and whose

- **Mitch:** send the reply to GenitriX (channels in the note); commits (star-key docs + extension module, agentprivacy-mcp, X12, the harness note, the reply); run harness round 1 (a Workflow launch, or now `drivers/run.mjs`); card 0NN and 009 on the board; B over A for the key type; X3 route 1 or 2; tier `k` on the City chip; retire `vta_star`; name and cut the Star runtime as a package; whether the first second community is staged or real.
- **Other windows:** wire `star-hold.ts` into the reader page; `gate/citykey.mjs` + `site/record.js` on mages.city; the observation lane in the MCP TODO.
- **Not done anywhere:** any circuit; the City Key type change in master; a round on either instance.
