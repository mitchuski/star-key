# Star Key

Star is for trust.

Star Key is an agentprivacy fork of OpenVTC’s browser extension, developed through our collaboration in the Trust over IP community. We’re adapting it for Mages City: an agent community exploring Trust Spanning Protocol integration, DID-based messaging, shared knowledge and verifiable relationships.

## Test today

The web reader lets you inspect a version-1 City Key, choose whether claimed vertices travel, and download an unverified compact reading. The illustration is editorial; compression is not a ZK proof. No sign-in, credential or City admission is created by this exercise.

The MV3 extension retains upstream VTA setup, consent and protocol controls. A complete verified VTA/RP encounter is still an integration gate. The provider pilot defaults to disabled and never falls back to simulated success.

## Join a community

Open the Star popup and press the 🤝 in its header. A small window takes the community's DID: paste it, **Read the code on the page** (the page you were on, for example [first.openvtc.net](https://first.openvtc.net/)), **Use the camera**, or drop an image of the code. For a page, the wallet reads the community's DID off the QR code on the page (`/v1/community/did-qr.svg` carries the bare DID), resolves and verifies its DID document, and opens the join window on the verified community.

Nothing is sent to the community until you continue in that window. Then the wallet asks for its join manifest as a throwaway key, shows what it asks and what its directory would show about you, and sends the request signed by your agent as the persona you choose, which becomes your member DID there. Switch the popup to the agent you want to join with first, for instance your Mages City VTA. A community that admits on the spot ends with **Open the member page**; one that reviews requests shows the request as pending, and you sign in from its page once admitted.

## Agreements (MyTerms first)

A community that takes terms names a `MyTerms` service in its DID document, pointing at its configuration (what it accepts, in roster codes). Pick your standing agreement in Settings, from the Customer Commons roster the wallet mirrors (`SD-BASE` and its modifiers; the wallet invents none). On "Ask to join", the screen shows your agreement when the community accepts it, or its counter-offer when not: one round. The agreement rides inside your signed join request as `extensions["org.agentprivacy.myterms"]`; the community's signed answer is the other half, and the wallet keeps both by digest in the console's **Agreements** pane, which lists what stands with each community and carries a switch per community: proffer terms at its door, or not (a default for the "join under terms" box, never a refusal). MyTerms sits above membership: the 🤝 window, opened on any page, shows the agreements you already hold with that site, reads the site's own MyTerms configuration when the wallet may reach it, and says whether your standing agreement is one it accepts; a community's join door is the first place an agreement is made, not the only one. Mages City is the first community that takes terms. This is not a claim of IEEE 7012 conformance; see `docs/MYTERMS_PLAN_2026-10-20.md`.

## Build

Use Node 24 or newer. Run `npm ci`, `npm test`, `npm run build` and `node --test pilot/test.mjs`. Load `packages/extension/dist` unpacked in Chrome or Edge. Star has a distinct development extension ID: `cdffmakpanghoamdnhbijolhncijajjc`.

For the portable website reader, run `npm run build:star-preview`. `packages/extension/dist-star-preview` contains only the local reader and its artwork; it contains no extension provider bridge. Serve it under `star-experiment/reading/` and open `star.html`. Preserve the experimental labels.

## Ecosystem

Soulbis owns the boundary and Star perspective. Mages City hosts discovery and participation. Labs can reference Star Key as an experiment, with the web reader available before extension installation. Authentication, membership, permission and execution remain distinct decisions. A later explicit ceremony can attach a permitted receipt; no such receipt is issued today.

See [pilot notes](STAR_PILOT.md), [upstream documentation](docs/UPSTREAM_README.md), and `pilot/pilot-config.json`. Real RP identity, independent session verification and enforced VTA persona selection remain required before showing a connected account.

## Collaboration and upstream

Built from [OpenVTC/vta-browser-plugin](https://github.com/OpenVTC/vta-browser-plugin) at `7e1b3829b09057c13ca940b8d632d909f4569f7d`, with upstream history and attribution retained. Our work brings that foundation into the agentprivacy and Mages City experiments.

The core and TSP package metadata identify Apache-2.0. Upstream notices remain applicable; licensing coverage for the UI and agentprivacy artwork is still being clarified.

The public repository is [mitchuski/star-key](https://github.com/mitchuski/star-key). See [the unified Star experience](docs/UNIFIED_STAR_EXPERIENCE.md) for the interface and integration direction. Native extension installation and live sign-in remain to be verified.
