// Join a community from its DID (`confirm.html?kind=join`), opened by the 🤝
// in the Star header. One small window with every way of reading the DID:
// paste it, read it off the code on the page you were on (a capture of that
// tab), the camera, or an image of the code dropped, pasted or chosen.
//
// Its own window rather than the popup: the popup closes when the camera
// permission prompt or a file picker takes focus, and a video needs room.
//
// Everything after — resolving and verifying the DID, showing what the
// community asks, signing the request as a persona — is the join window's
// (`sign-in-flows.ts`, `prepareJoin`), opened by the background on
// `RUNTIME_JOIN_COMMUNITY`. Nothing is sent to the community from here; a DID
// only opens that window.

import { useEffect, useRef, useState } from "react";
import { c, t, button, card, mono } from "./theme.js";
import { Mark } from "./ui.js";
import {
  RUNTIME_JOIN_COMMUNITY,
  type JoinSource,
  type RuntimeJoinCommunityResponse,
} from "./bridge-protocol.js";
import {
  communityDidFromText,
  didFromDataTransfer,
  didFromFile,
  didFromImageData,
  didFromVisibleTab,
} from "./join-code.js";
import { fetchCommunityTerms, offersOf, type Agreement, type CommunityTerms } from "@openvtc/pnm-core/vtc";
import { agreementsWith, readAllAgreements } from "./agreements-store.js";
import { hasOriginPermission, requestOriginPermission } from "./host-permissions.js";
import { getSettings } from "./config.js";
import { HandshakeFigure, type HandshakeState } from "./handshake-figure.js";

/** What a site says about terms, read from its own MyTerms configuration.
 *  `unreachable`: the wallet may not read this site yet (no host permission),
 *  so nothing is known — distinct from a site that publishes none. */
export type SiteTerms =
  | { status: "takes"; terms: CommunityTerms }
  | { status: "none" }
  | { status: "unreachable"; origin: string };

/** The MCNP draft's discovery address first; the City's profile second. */
const SITE_TERMS_PATHS = ["/.well-known/myterms-configuration", "/myterms/configuration.json"];

/** Read a site's MyTerms configuration, if the wallet is allowed to reach the
 *  site. A plain GET of a public document: it says nothing about who asks. */
async function siteTermsOf(host: string): Promise<SiteTerms> {
  const origin = `https://${host}`;
  if (!(await hasOriginPermission(origin).catch(() => false))) return { status: "unreachable", origin };
  for (const path of SITE_TERMS_PATHS) {
    try {
      return { status: "takes", terms: await fetchCommunityTerms(`${origin}${path}`, { timeoutMs: 6_000 }) };
    } catch {
      // not there, or not a configuration: try the next address
    }
  }
  return { status: "none" };
}

/** How often a camera frame is decoded. */
const FRAME_MS = 200;

/** The host of the page the person was on: the active tab of the last normal
 *  window (this one is a popup-type window and is not it). Nothing when the
 *  tab has no https page, or the browser will not say. */
async function pageHostOf(): Promise<string | undefined> {
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    if (win?.id === undefined) return undefined;
    const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
    if (!tab?.url) return undefined;
    const u = new URL(tab.url);
    return u.protocol === "https:" ? u.host.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

const STANDING_WORD: Record<Agreement["status"], string> = {
  agreed: "agreed",
  proffered: "proffered, not yet decided",
  declined: "declined",
};

function when(ms: number): string {
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function JoinView({
  pageHost = pageHostOf,
  readAgreements = readAllAgreements,
  readSiteTerms = siteTermsOf,
  readStanding = async () => offersOf((await getSettings()).myTermsOffers),
  allowSite = (origin: string) => requestOriginPermission(origin),
  openConsole = () => void chrome.tabs.create({ url: chrome.runtime.getURL("manager.html#agreements") }),
}: {
  /** The host of the page the 🤝 was pressed on. Injected for tests. */
  pageHost?: () => Promise<string | undefined>;
  /** Every agent's agreements. Injected for tests. */
  readAgreements?: () => Promise<Agreement[]>;
  /** What the site says about terms. Injected for tests. */
  readSiteTerms?: (host: string) => Promise<SiteTerms>;
  /** The person's standing offers, in order (Settings). Injected for tests. */
  readStanding?: () => Promise<readonly string[]>;
  /** Ask the browser for permission to read the site; must be the first act
   *  of a click. */
  allowSite?: (origin: string) => Promise<boolean>;
  /** Open the console's Agreements pane. */
  openConsole?: () => void;
} = {}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [host, setHost] = useState<string | undefined>();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [siteTerms, setSiteTerms] = useState<SiteTerms | undefined>();
  const [offers, setOffers] = useState<string[]>([]);
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | undefined>(undefined);
  const pasted = communityDidFromText(text);

  // The 🤝 is also where a person looks up their terms with the place they
  // are on: what already stands with this site (local records), and what the
  // site itself says it takes (its MyTerms configuration, read only when the
  // wallet is allowed to reach the site). MyTerms sits above membership — a
  // site need not be a community to take terms.
  useEffect(() => {
    let live = true;
    void Promise.all([
      pageHost().catch(() => undefined),
      readAgreements().catch(() => [] as Agreement[]),
      readStanding().catch(() => [] as readonly string[]),
    ]).then(async ([h, all, mine]) => {
      if (!live) return;
      setHost(h);
      setAgreements(all);
      setOffers(offersOf(mine));
      if (h) {
        const st = await readSiteTerms(h).catch(() => undefined);
        if (live && st) setSiteTerms(st);
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const standing = agreementsWith(agreements, { ...(host ? { host } : {}), ...(pasted ? { counterparty: pasted } : {}) });

  const allowAndRead = async () => {
    if (!host || siteTerms?.status !== "unreachable") return;
    // The permission request is the first await of the click, or the gesture
    // is spent before the browser is asked.
    const ok = await allowSite(siteTerms.origin).catch(() => false);
    if (!ok) return;
    setSiteTerms(await readSiteTerms(host).catch(() => undefined));
  };

  const siteAccepts = siteTerms?.status === "takes" ? siteTerms.terms.accepts : [];
  // The same one round the join door runs: the first of your offers the site
  // accepts, else its counter-offer.
  const taken = offers.find((code) => siteAccepts.includes(code));
  const siteWouldTake = taken ?? (siteTerms?.status === "takes" ? (siteTerms.terms.counterOffer ?? siteAccepts[0]) : undefined);
  const agreed = standing.find((a) => a.status === "agreed");
  const handshake: HandshakeState = agreed ? "agreed" : taken ? "offered" : siteTerms?.status === "none" ? "none" : "apart";
  const place = host ?? (pasted ? "this community" : undefined);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = undefined;
    setCamera("off");
  };
  useEffect(() => stopCamera, []);

  const start = async (did: string, source: JoinSource) => {
    setNote(null);
    const res = (await chrome.runtime.sendMessage({
      type: RUNTIME_JOIN_COMMUNITY,
      did,
      source,
    })) as RuntimeJoinCommunityResponse | undefined;
    if (!res?.ok) {
      setNote(res?.error ?? "The wallet did not answer.");
      return false;
    }
    stopCamera();
    window.close();
    return true;
  };

  const scanPage = async () => {
    setBusy(true);
    setNote(null);
    try {
      // The page is in the last normal window the person was on; this one is
      // a popup-type window and is not it.
      const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => undefined);
      const did = await didFromVisibleTab(win?.id);
      if (!did) {
        setNote("No community code is visible on that page. Scroll it into view and try again, or paste the DID.");
        return;
      }
      await start(did, "page");
    } catch (e) {
      setNote(`Couldn't read the page: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const startCamera = async () => {
    setNote(null);
    setCamera("starting");
    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch (e) {
      setCamera("off");
      setNote(
        (e as { name?: string })?.name === "NotAllowedError"
          ? "Camera access was declined. Drop an image of the code here instead, or paste the DID."
          : "No camera could be opened. Drop an image of the code here instead, or paste the DID.",
      );
      return;
    }
    stream.current = s;
    setCamera("on");
    const v = video.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!v || !ctx) return;
    v.srcObject = s;
    await v.play().catch(() => undefined);
    const timer = setInterval(() => {
      if (stream.current !== s) {
        clearInterval(timer);
        return;
      }
      if (v.readyState < 2 || v.videoWidth === 0) return;
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      ctx.drawImage(v, 0, 0);
      const did = didFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (!did) return;
      clearInterval(timer);
      void start(did, "camera").then((ok) => {
        if (!ok) stopCamera();
      });
    }, FRAME_MS);
  };

  const fromTransfer = async (dt: DataTransfer | null) => {
    if (!dt) return;
    const hasImage = Array.from(dt.items ?? []).some((i) => i.kind === "file" && i.type.startsWith("image/"));
    if (!hasImage) return; // Plain text goes into the field as usual.
    setBusy(true);
    setNote(null);
    try {
      const did = await didFromDataTransfer(dt);
      if (!did) {
        setNote("No community code in that image.");
        return;
      }
      await start(did, "image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onPaste={(e) => void fromTransfer(e.clipboardData)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void fromTransfer(e.dataTransfer);
      }}
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "18px 20px 24px",
        display: "grid",
        gap: 12,
        fontSize: t.base,
        color: c.text,
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Mark />
        <strong>Join a community</strong>
      </div>
      {(host || pasted) && (
        <section data-testid="join-agreements" style={{ display: "grid", gap: 10, justifyItems: "stretch" }}>
          <HandshakeFigure state={handshake} {...(place ? { host: place } : {})} {...(agreed ? { code: agreed.terms.code } : taken ? { code: taken } : {})} />
          <div style={{ display: "grid", gap: 4, fontSize: t.sm, marginTop: 10 }}>
            {host && siteTerms ? (
              <p style={{ margin: 0, color: c.muted }} data-testid="join-site-terms">
                {siteTerms.status === "takes" ? (
                  <>
                    {host} takes {siteAccepts.length ? siteAccepts.join(", ") : "nothing this wallet knows"}
                    {taken
                      ? ` · yours: ${taken}`
                      : offers.length
                        ? ` · none of yours (${offers.join(", ")})${siteWouldTake ? ` · it proposes ${siteWouldTake}` : ""}`
                        : ` · you present none yet${siteWouldTake ? ` · it proposes ${siteWouldTake}` : ""}`}
                  </>
                ) : siteTerms.status === "none" ? (
                  <>{host} publishes no terms</>
                ) : (
                  <>
                    {host}: not readable yet{" "}
                    <button type="button" style={button("quiet")} onClick={() => void allowAndRead()} data-testid="join-site-allow">
                      Allow and read its terms
                    </button>
                  </>
                )}
              </p>
            ) : null}
            <div style={{ color: c.muted }}>
              With {host ?? "this community"}
              {host && pasted ? " and the DID above" : ""}:
            </div>
            {standing.length === 0 ? (
              <span data-testid="join-agreements-none" style={{ color: c.muted }}>
                none yet
              </span>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 3 }}>
                {standing.map((a) => (
                  <li key={a.id} data-testid="join-agreement">
                    <code>{a.terms.code}</code> · {STANDING_WORD[a.status]} · {when(a.reached.at)} · as{" "}
                    <span style={{ ...mono, fontSize: t.xs, overflowWrap: "anywhere" }}>{a.holder}</span>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <button type="button" style={button("quiet")} onClick={openConsole} data-testid="join-agreements-open">
                Open Agreements
              </button>
            </div>
          </div>
        </section>
      )}

      <details style={{ color: c.muted, fontSize: t.sm }}>
        <summary style={{ cursor: "pointer" }}>What this does</summary>
        <p style={{ margin: "6px 0 0" }}>
          Give the community's DID: paste it, read it off the code on the page you were on, or scan the code.
          The wallet reads its DID document, what it asks to join, and the terms it takes; nothing is sent
          until you say so in the next window. Agreements already made with this site are shown above; the
          Star and the site's mark close into one ring when terms meet.
        </p>
      </details>

      <form
        style={{ display: "flex", gap: 6, minWidth: 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (pasted) void start(pasted, "pasted");
        }}
      >
        <input
          type="text"
          data-testid="join-did"
          placeholder="did:webvh:…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          autoFocus
          style={{ ...mono, flex: 1, padding: "8px 10px", minWidth: 0 }}
        />
        <button type="submit" style={button("primary")} disabled={busy || !pasted} data-testid="join-paste">
          Join
        </button>
      </form>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={button()} disabled={busy} onClick={() => void scanPage()} data-testid="join-page">
          {busy ? "Reading…" : "Read the code on the page"}
        </button>
        {camera === "off" ? (
          <button type="button" style={button()} disabled={busy} onClick={() => void startCamera()} data-testid="join-camera">
            Use the camera
          </button>
        ) : (
          <button type="button" style={button("quiet")} onClick={stopCamera}>
            Stop the camera
          </button>
        )}
      </div>

      {camera !== "off" && (
        <video
          ref={video}
          muted
          playsInline
          style={{ width: "100%", aspectRatio: "4 / 3", background: "#000", borderRadius: 8, objectFit: "cover" }}
        />
      )}
      {camera === "on" && (
        <p style={{ margin: 0, color: c.muted }}>Point the camera at the community's code.</p>
      )}

      <div style={{ ...card, display: "grid", gap: 8 }}>
        <span style={{ color: c.muted, fontSize: t.sm }}>Or an image of the code: drop, paste, or choose.</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setNote(null);
            void didFromFile(file).then((did) => {
              if (did) void start(did, "image");
              else setNote("No community code in that image.");
            });
          }}
        />
      </div>

      {note && (
        <p style={{ margin: 0, color: c.danger }} data-testid="join-note">
          {note}
        </p>
      )}
      <div>
        <button type="button" style={button("quiet")} onClick={() => window.close()}>
          Cancel
        </button>
      </div>
    </div>
  );
}
