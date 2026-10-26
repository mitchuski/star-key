# Brief: the chain pages' docked star and Star Key, the extension, as one VTA surface (2026-10-25)

Status: brief only. Nothing in Star Key is changed. The dock lives in blake3_mage (`levers/pb3_page.html`).

## What each one is today

- **The dock.** A small lattice in the bottom-right corner of every PoAW chain page (twelve chains, hash sites
  to Falcon and ML-DSA). It reads only the page's own data: the chain's roots placed by their first six bits,
  and the picked leaf's walk to its root. It expands to a full Star page, collapses completely, and keeps the pick
  in the URL. No identity, no keys, no network.
- **Star Key.** The OpenVTC browser extension forked as the City's trust experiment: a VTA identity, scoped
  sign-in (PIN or phone approval), agreements (MyTerms), the Hold of retained signed envelopes, trusted sites,
  the trust graph, and `star-projection.ts` (City Key → `star-reading/0.1`, authority `unverified-import`). A content
  script injects a page provider (`window.vtaWallet`) and relays requests to the worker; nothing reaches the page
  without a consent screen.

They draw the same object, the 64-state lattice, from two sides: the page knows the **work**, the extension knows
the **bearer**.

## Where they meet

1. **One star, one renderer.** The dock's lattice code and the extension's `star-figure.ts` draw the same cube and two
   tetrahedra. One shared module (state order, house and place words, the 6-bit placement) keeps a state the same
   state on every surface. The City star of the chains and the soulbis star need the same alignment, so this is the
   first step for all three.
2. **The page offers, the extension reads.** A chain page can post one public message, a `star-reading` of its own:
   roots, the picked entry and leaf, the work root and its seal. No request, no secret; the same hashes the page
   already shows. Star Key's popup or side panel can then say "this page's work on your star": which of the
   chain's states the bearer's key already lights or holds.
3. **The extension answers, with consent.** When Star Key is present, the dock gains a bearer layer: the key's lit
   states drawn beneath the chain's roots, and one verb, **relate**, that holds this chain's root (or a composed face)
   in the Hold as a new item. Nothing moves until `disclosure-consent` is approved; the page never sees the key.
4. **The dock as the VTA's in-page control.** For a site the bearer has signed into, the dock is the natural place for
   the VTA's per-site state: which identity is active here, the agreement in force, the trust-graph edge to the chain's
   owner DID, sign out. The extension's popup stays the place to manage everything; the dock shows only this site.
5. **A face is a portable reading.** The City star's composed face (a root per state, its own hash and seal) is exactly
   a `star-reading` with provenance. Held in the key, it travels: soulbis lights it, the extension shows it, any
   chain page can mark which of its roots are in it.

## Boundaries

The dock works with no extension and reads nothing from it unless asked. The content script stays in its isolated
world; the provider exposes request methods only; every write into the Hold is a consent screen. Lever names never
leave members' builds; only kind words and hashes appear in an offer.

## Order of work

| step | what | where |
|---|---|---|
| S1 | shared lattice module: state order, words, 6-bit placement; align City star and soulbis bit order | blake3_mage + mages_city + soulbis |
| S2 | `star-reading/0.2` extension: `roots[]`, `pick`, `face`, `source` (page origin + work root) | Star Key docs, schema first |
| S3 | page offer: chain pages and the City star post their reading on load and on each pick | blake3_mage, mages_city |
| S4 | Star Key reads the offer: popup/side panel "this page on your star" | Star Key |
| S5 | relate: hold a root or a face, behind the disclosure consent | Star Key + the Hold |
| S6 | per-site VTA state in the dock when the extension answers | both |

Decisions for Mitch: whether the page offer is a `postMessage` event or a provider method; whether the dock's bearer
layer is opt-in per site or follows trusted sites; whether a held face counts toward the key's κ (it would move it).
