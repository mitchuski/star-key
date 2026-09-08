# One Star, one situated journey

8 September 2026. Implementation direction; not a live-service claim.

The keeper asks to fold the corner Star, extension menu, login, profile image, knowledge capture, City Key and VTA farm into a unified experience. The Star gives computational shape to a situated agent perspective. VTA-attested claims and VRC relationships can support that perspective; appearance alone does not authenticate it.

## UI contract

One corner launcher (top or bottom right by preference), one panel, one central Star portrait. Four destinations: Identity, Capture, Journey, Community. Keep help/wiki references and return-to-key controls within this shell. Use compact emoji controls with accessible names. Motion respects reduced-motion preference.

Identity shows selected VTA, holder and permitted personas, lock state and a separate site-session state. Login invokes the existing OpenVTC provider and approval flow. Do not equate a remembered VTA, detected bridge or imported key with authenticated access. The prototype header already lists remembered DID metadata and floats when a VTA is selected; it is not yet a page overlay.

Capture previews selected content, source URL/revision, intended knowledge space, disclosure and operation. No whole-page capture by default. Prepare, authorize, execute and retain are distinct states. Only an authentic receiving-service receipt changes a write to saved. Preserve originals privately; do not place private data in icon artwork, URLs or public exports.

Journey shows context, source-linked encounters, contributed artefacts and independently labelled signed/verified claims. The portrait may reflect an approved projection; geometry is not a wisdom score or a proof. Community links to Mages City and the selected farm through supported configured destinations; imported keys must not supply executable endpoints.

## Existing pieces to integrate

agentprivacy_master/src/components/StarCompanion.tsx: current website corner panel, session appearance, City link; bridge detection explicitly not verified identity.
This repo: upstream OpenVTC provider, origin permission, consent, holder/persona management; local key-reading inspector.
agentprivacy-mcp: experience_overview, experience_route, site_context, browser_action_prepare and journey tools.
cityofmages/mages-city/KNOWLEDGE_SPACES.md: receiving space, scoped grant, revision precondition and durable receipt contract.

Reuse these components/contracts. Do not build another independent wallet bridge or make a website-supplied interface the trusted approval boundary.

## Next vertical test

One existing holder, one supported test origin, one selected passage, one scoped wiki revision. Verify sign-in independently; prepare the exact capture; approve in trusted extension UI; receive a real revision-bound receipt; retain original evidence in a private journey; reopen and retry without duplicate writes. Refuse wrong origin, changed payload, stale revision and expired/revoked grant. No automatic DNS, VRC issuance or public inscription.

## Verified in this window

Extension TypeScript and production build passed in the source checkout before byte-matched relocation. 14 focused MCP browser/journey/city-entry tests passed. experience_overview also succeeded over real MCP stdio. These are local tests, including fixture verifiers; no live extension-to-farm transaction was performed. The prepared UI update does not complete the vertical test.

## Run locally

Use Node 24+. Run npm ci, npm run build. Load packages/extension/dist unpacked in the browser. The initial dist copied here is the already-built source bundle; reload it to review the new header and DID summary.

Run the local MCP with node ../agentprivacy-mcp/server.mjs. Configure your MCP client with that absolute server path. Discovery and action preparation are available; preparation is not browser dispatch permission. Do not add arbitrary execution tools to bypass the extension approval boundary.
