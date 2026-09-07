# Star Key

Star is for trust. An experimental browser extension and local City Key reader for the agentprivacy universe, built on OpenVTC.

## Test today

The web reader lets you inspect a version-1 City Key, choose whether claimed vertices travel, and download an unverified compact reading. The illustration is editorial; compression is not a ZK proof. No sign-in, credential or City admission is created by this exercise.

The MV3 extension retains upstream VTA setup, consent and protocol controls. A complete verified VTA/RP encounter is still an integration gate. The provider pilot defaults to disabled and never falls back to simulated success.

## Build

Use Node 24 or newer. Run `npm ci`, `npm test`, `npm run build` and `node --test pilot/test.mjs`. Load `packages/extension/dist` unpacked in Chrome or Edge. Star has a distinct development extension ID: `cdffmakpanghoamdnhbijolhncijajjc`.

For the portable website reader, run `npm run build:star-preview`. `packages/extension/dist-star-preview` contains only the local reader and its artwork; it contains no extension provider bridge. Serve it under `star-experiment/reading/` and open `star.html`. Preserve the experimental labels.

## Ecosystem

Soulbis owns the boundary and Star perspective. Mages City hosts discovery and participation. Labs can reference Star Key as an experiment, with the web reader available before extension installation. Authentication, membership, permission and execution remain distinct decisions. A later explicit ceremony can attach a permitted receipt; no such receipt is issued today.

See [pilot notes](STAR_PILOT.md), [upstream documentation](docs/UPSTREAM_README.md), and `pilot/pilot-config.json`. Real RP identity, independent session verification and enforced VTA persona selection remain required before showing a connected account.

## Provenance and publication

Derived from OpenVTC/vta-browser-plugin at `7e1b3829b09057c13ca940b8d632d909f4569f7d`; upstream history and attribution are retained. The core and TSP package metadata identify Apache-2.0. This fork does not assert a blanket license over the upstream UI or agentprivacy artwork: their redistribution terms need confirmation before a public release. No OpenVTC endorsement is implied.

The intended remote is `mitchuski/star-key`, initially private pending a visibility decision. Native extension installation and live sign-in have not been verified in this runtime.
