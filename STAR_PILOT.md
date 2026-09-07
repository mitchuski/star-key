# Star Phase 1 — experimental extension

The first implementation layer is built and packaged. This is a private development pilot, not a released identity product. It reuses OpenVTC's real provider and protocol implementation; a verified end-to-end sign-in remains unfinished.

## Try the City Key reading here

Open http://127.0.0.1:8815/star.html and choose `practice-city-key.json` from this directory, or a version-1 City Key. The practice file is synthetic and carries no credential or standing.

The page accepts a name, four hex palette colours and at most 64 vertex indices (0–63). Unknown fields are discarded. Vertex export starts off; explicitly select it to include claimed vertices. Compress prepares inspectable compact JSON, then Download saves it. Clear removes the in-memory reading. The exported `star-reading/0.1` format is not a replacement City Key or a proof. The displayed manifold is editorial artwork, not a rendering or verification of the imported geometry. ZK proof creation remains disabled.

## Load the real extension

1. Extract `STAR_UNPACKED_PILOT.zip` into a dedicated folder.
2. In Chrome or Edge, open the extensions management page, enable Developer mode and choose Load unpacked. Select the extracted folder containing `manifest.json`.
3. Confirm the name is **Star — Trust Experiment**, ID `cdffmakpanghoamdnhbijolhncijajjc`. Pin it and open its popup. Existing OpenVTC setup, consent, credential and identity controls remain available beneath the Star heading. Inspect City Key opens the new local page.
4. Use a test identity when evaluating setup. This is a separate extension origin and storage namespace; existing upstream enrollment and passkey bindings do not automatically migrate.

The in-app browser preview does not install the extension. Native installation and live VTA enrollment have not been tested in this runtime. The package keeps upstream icons and attribution. Its public development key fixes the separate extension ID; no private packaging key was retained. This is an unpacked pilot, not a store submission. Resolve upstream UI licensing and attribution requirements before redistribution.

## Real-provider pilot and remaining gates

http://127.0.0.1:8814/ is a local guide sign-in test surface. It defaults to unavailable. In `work/star-phase1/pilot/pilot-config.json`, a real test service must supply `rpDid`, `baseUrl`, exact `siteOrigin` and `enabled: true`; keep `identityPolicy: "vta-persona-required"`. Enable the site in the installed extension and reload in that same browser. Do not invent a DID or use a production identity to bypass missing infrastructure.

The adapter calls `window.vtaWallet.login` and checks the returned session shape. It does not independently verify the session or enforce which persona was chosen. It never displays, persists, logs or exports returned tokens. A returned session does not grant City access, add a trust edge or issue a VRC.

The next bounded runtime must establish a test RP/VTA pair, enforce the persona policy at a trusted boundary, verify the RP session and exercise rejection, expiry and replay handling. Only then should it expose a connected identity. A subsequent explicit ceremony can attach a permitted receipt to the City Key. Measured geometry, VRC/VMC profile verification and ZK proofs remain separate work.

## Evidence and continuity

- Full build passed with upstream bundle-size warnings.
- 917 workspace tests passed; pilot adapter checks passed separately. Windows test portability changes are isolated to four test files.
- 148 core/TSP/extension bridge source files match the Phase 0 pin; manifest permissions are unchanged. See `checks.json`, `tests.log` and `build.log`.
- The built City Key page loaded in the browser. Native popup behavior and file-upload interaction have not been exercised; parsing, filtering and export behavior have unit coverage.
- Upstream pin: `7e1b3829b09057c13ca940b8d632d909f4569f7d`. Fork source: `work/star-phase1` in the current task workspace. No upstream source repo, production site or canonical research equation changed; no commit, push or deployment occurred.
- The requested `C:/Users/mitch/codex` folder is still absent. This runtime remains in the existing task workspace; relocation has not happened.

This is an observer runtime record for Codex Mage, not a canonical research chronicle. The research invariant remains: Star represents the model and permitted evidence; a local reading or completed interaction is not itself verified trust.
