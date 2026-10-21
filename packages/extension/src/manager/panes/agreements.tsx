// Agreements — the catalogue of privacy terms this wallet holds with the
// communities and sites it has dealt with, and the choices the person makes
// about what to present at a door.
//
// Four things, all the wallet's own rather than the agent's:
//
//  - **what you present** (`myTermsOffers`, Settings): the roster agreements
//    the person is willing to present, in their order. Chosen here or in
//    Options, the same chooser; the first one a community accepts is
//    proffered. MyTerms sits above membership: the same offers meet any site
//    that takes terms.
//  - **each community** (`agreement-prefs:<vtaDid>`): a card per
//    counterparty with its standing agreement, a switch (present terms at
//    this door, or not), and a pick (present this one here first). A
//    community can be added by DID before any request, so the choice exists
//    when the door opens.
//  - **the history** (`agreements:<vtaDid>`): one record per request sent
//    under terms (`@openvtc/pnm-core/vtc`'s `Agreement`): the identity it was
//    signed as, the counterparty, the site, the agreement, the request id
//    and verdict, and the digests of both signed documents. The documents
//    themselves are not kept; the digests match a copy held elsewhere.
//
// Nothing here is a claim of IEEE 7012 conformance, and the pane says so in
// one line rather than many. Agent-wide: a record is keyed by the agent it
// was signed at, not by a context.

import { useEffect, useState } from "react";
import {
  MYTERMS_ROSTER,
  offersOf,
  rosterAgreement,
  standingAgreements,
  type Agreement,
  type AgreementPreference,
  type AgreementStatus,
} from "@openvtc/pnm-core/vtc";
import { Button, Note, Panel } from "../../ui.js";
import { c, t, font } from "../../theme.js";
import { getSettings, setSettings } from "../../config.js";
import { readAgreementPrefs, readAgreements, writeAgreementPref } from "../../agreements-store.js";
import { TermsChooser } from "../../terms-chooser.js";
import { Table, type Column } from "../table.js";
import type { Parties } from "../use-vta.js";

const STATUS_WORD: Record<AgreementStatus, string> = {
  agreed: "agreed",
  proffered: "proffered",
  declined: "declined",
};

const STATUS_TONE: Record<AgreementStatus, string> = {
  agreed: c.ok,
  proffered: c.muted,
  declined: c.danger,
};

const KIND_WORD: Record<Agreement["kind"], string> = {
  myterms: "MyTerms",
};

function when(ms: number): string {
  try {
    return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
  } catch {
    return "";
  }
}

function day(ms: number): string {
  return when(ms).slice(0, 10);
}

/** A DID a person typed, trimmed; anything that is not `did:…` is nothing. */
function didOf(text: string): string | undefined {
  const s = text.trim();
  return /^did:[a-z0-9]+:[^\s]+$/.test(s) ? s : undefined;
}

const sectionLabel = { fontSize: t.sm, color: c.muted, fontWeight: 600 } as const;
const control = { fontSize: t.sm, padding: "3px 6px", borderRadius: 6, border: `1px solid ${c.line}`, background: "transparent", color: "inherit" } as const;

export function AgreementsPane({
  parties,
  readOffers = async () => offersOf((await getSettings()).myTermsOffers),
  writeOffers = async (next: string[]) => {
    await setSettings({ myTermsOffers: next });
  },
  readRecords = readAgreements,
  readPrefs = readAgreementPrefs,
  writePref = writeAgreementPref,
}: {
  parties: Parties;
  /** The standing offers, most preferred first. Injected so a test can
   *  render without the settings store (IndexedDB). */
  readOffers?: () => Promise<string[]>;
  writeOffers?: (next: string[]) => Promise<void>;
  /** This agent's records. Injected for the same reason. */
  readRecords?: (vtaDid: string) => Promise<Agreement[]>;
  readPrefs?: (vtaDid: string) => Promise<Record<string, AgreementPreference>>;
  writePref?: (vtaDid: string, counterparty: string, pref: AgreementPreference) => Promise<void>;
}) {
  const vtaDid = parties.service.did;
  const [offers, setOffers] = useState<string[]>([]);
  const [records, setRecords] = useState<Agreement[] | null>(null);
  const [prefs, setPrefs] = useState<Record<string, AgreementPreference>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AgreementStatus | "all">("all");
  const [counterparty, setCounterparty] = useState<string>("all");
  const [newDid, setNewDid] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let live = true;
    // Three reads, failed separately: a settings store that cannot be opened
    // must not hide the records, nor the other way round.
    void readOffers().then(
      (o) => live && setOffers(o),
      () => live && setOffers([]),
    );
    void readRecords(vtaDid).then(
      (r) => live && setRecords([...r].sort((a, b) => b.reached.at - a.reached.at)),
      (e) => live && setError(e instanceof Error ? e.message : String(e)),
    );
    void readPrefs(vtaDid).then(
      (p) => live && setPrefs(p),
      () => live && setPrefs({}),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vtaDid]);

  const all = records ?? [];
  const counterparties = [...new Set([...all.map((r) => r.counterparty), ...Object.keys(prefs)])].sort((a, b) => {
    const sa = standingByParty.get(a)?.reached.at ?? 0;
    const sb = standingByParty.get(b)?.reached.at ?? 0;
    return sb - sa || a.localeCompare(b);
  });
  const siteOf = (did: string) => all.find((r) => r.counterparty === did)?.site;
  const standingByParty = new Map(standingAgreements(all).map((s) => [s.counterparty, s]));
  const shown = all.filter((r) => (status === "all" || r.status === status) && (counterparty === "all" || r.counterparty === counterparty));

  const saveOffers = async (next: string[]) => {
    setOffers(next);
    try {
      await writeOffers(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const savePref = async (did: string, pref: AgreementPreference) => {
    const next = { ...prefs, [did]: pref };
    setPrefs(next);
    try {
      await writePref(vtaDid, did, pref);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  /** Give a community a card before any request: Enter in the field or the
   *  button, the same act. Text that is not a DID adds nothing. */
  const addCommunity = () => {
    const did = didOf(newDid);
    if (!did) return;
    setNewDid("");
    void savePref(did, prefs[did] ?? { terms: true });
  };

  const columns: Column<Agreement>[] = [
    { key: "when", header: "When", width: "9.5em", render: (r) => <span style={{ fontFamily: font.mono, fontSize: t.xs }}>{when(r.reached.at)}</span> },
    { key: "site", header: "Community", render: (r) => <span style={{ fontWeight: 600 }}>{r.site}</span> },
    { key: "kind", header: "Kind", width: "6em", render: (r) => KIND_WORD[r.kind] },
    { key: "code", header: "Agreement", width: "9em", render: (r) => <code style={{ fontSize: t.sm }}>{r.terms.code}</code> },
    { key: "status", header: "Standing", width: "7em", render: (r) => <span style={{ color: STATUS_TONE[r.status] }}>{STATUS_WORD[r.status]}</span> },
    {
      key: "as",
      header: "Signed as",
      render: (r) => <span style={{ fontFamily: font.mono, fontSize: t.xs, overflowWrap: "anywhere" }}>{r.holder}</span>,
    },
  ];

  return (
    <Panel
      title="Agreements"
      description="The privacy terms you hold with the communities and sites you deal with: what you are willing to present at a door, what each community accepted, and the record of both signed halves. MyTerms (IEEE 7012) is the first kind; the roster is Customer Commons' and the wallet invents none. Not a claim of conformance."
    >
      <section data-testid="terms-standing" style={{ display: "grid", gap: 8 }}>
        <div style={sectionLabel}>What you present at a door</div>
        <div style={{ fontSize: t.sm, color: c.muted }}>
          Tick the agreements you are willing to present and put them in your order. At a community that takes
          terms, the first one it accepts is proffered; with none accepted, its counter-offer is shown and you
          decide. {offers.length === 0 ? "Nothing is ticked yet: every door shows its own counter-offer." : `Your order: ${offers.join(", ")}.`}
        </div>
        <TermsChooser value={offers} onChange={(next) => void saveOffers(next)} />
      </section>

      <section data-testid="agreement-communities" style={{ display: "grid", gap: 10 }}>
        <div style={sectionLabel}>Each community</div>
        {counterparties.length === 0 ? (
          <div style={{ fontSize: t.sm, color: c.faint }}>
            No community yet. One appears here after a request under terms, or add its DID to decide before you knock.
          </div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {counterparties.map((did) => {
              const pref = prefs[did] ?? { terms: true };
              const s = standingByParty.get(did);
              const history = all.filter((r) => r.counterparty === did).length;
              return (
                <li
                  key={did}
                  data-testid="agreement-switch"
                  style={{ border: `1px solid ${c.line}`, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 8, minWidth: 0 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{siteOf(did) ?? "A community you have not dealt with yet"}</div>
                    <div style={{ fontFamily: font.mono, fontSize: t.xs, color: c.muted, overflowWrap: "anywhere" }}>{did}</div>
                  </div>
                  <div style={{ fontSize: t.sm }} data-testid="agreement-standing">
                    {s ? (
                      <>
                        <code>{s.terms.code}</code> · <span style={{ color: STATUS_TONE[s.status] }}>{STATUS_WORD[s.status]}</span> · {day(s.reached.at)}
                        {history > 1 ? <span style={{ color: c.faint }}> · {history} requests</span> : null}
                      </>
                    ) : (
                      <span style={{ color: c.faint }}>No agreement yet.</span>
                    )}
                  </div>
                  <label style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: 8, alignItems: "start", fontSize: t.sm, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      aria-label={`Present terms at ${siteOf(did) ?? did}`}
                      checked={pref.terms}
                      onChange={(e) => void savePref(did, { ...pref, terms: e.target.checked })}
                      style={{ accentColor: c.accent, margin: "3px 0 0" }}
                    />
                    <span>{pref.terms ? "Present your terms at this door." : "Send no agreement at this door; its floor applies."}</span>
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: t.sm, color: c.muted }}>
                    Present here first
                    <select
                      aria-label={`Agreement to present at ${siteOf(did) ?? did}`}
                      value={pref.offer ?? ""}
                      disabled={!pref.terms}
                      onChange={(e) => {
                        const { offer: _drop, ...rest } = pref;
                        void savePref(did, e.target.value ? { ...rest, offer: e.target.value } : rest);
                      }}
                      style={control}
                    >
                      <option value="">my order</option>
                      {MYTERMS_ROSTER.map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <form
          data-testid="agreement-add"
          onSubmit={(e) => {
            e.preventDefault();
            addCommunity();
          }}
          style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center" }}
        >
          <input
            aria-label="Community DID"
            placeholder="did:webvh:… of a community, to decide before you knock"
            value={newDid}
            onChange={(e) => setNewDid(e.target.value)}
            style={{ ...control, fontFamily: font.mono, fontSize: t.xs, minWidth: 0 }}
          />
          <Button
            onClick={(e) => {
              e.preventDefault();
              addCommunity();
            }}
            disabled={!didOf(newDid)}
          >
            Add
          </Button>
        </form>
      </section>

      <section data-testid="agreement-history" style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={sectionLabel}>History</div>
          <span style={{ fontSize: t.sm, color: c.faint }}>
            {all.length === 0 ? "no requests under terms yet" : `${all.length} request${all.length === 1 ? "" : "s"}, each with both digests`}
          </span>
          <button
            type="button"
            data-testid="agreement-history-toggle"
            onClick={() => setHistoryOpen((o) => !o)}
            style={{ ...control, cursor: "pointer", marginLeft: "auto" }}
          >
            {historyOpen ? "Hide" : "Show"}
          </button>
        </div>
        {historyOpen ? (
          <>
            <div data-testid="agreement-filters" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: t.sm, color: c.muted, display: "flex", gap: 6, alignItems: "center" }}>
                Standing
                <select aria-label="Filter by standing" value={status} onChange={(e) => setStatus(e.target.value as AgreementStatus | "all")} style={control}>
                  <option value="all">all</option>
                  <option value="agreed">agreed</option>
                  <option value="proffered">proffered</option>
                  <option value="declined">declined</option>
                </select>
              </label>
              <label style={{ fontSize: t.sm, color: c.muted, display: "flex", gap: 6, alignItems: "center" }}>
                Community
                <select aria-label="Filter by community" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} style={control}>
                  <option value="all">all</option>
                  {counterparties.map((did) => (
                    <option key={did} value={did}>
                      {siteOf(did) ?? did}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error ? (
              <Note tone="danger">Couldn't read or write the agreements: {error}</Note>
            ) : records === null ? (
              <div style={{ color: c.muted }}>Reading…</div>
            ) : (
              <Table
                columns={columns}
                rows={shown}
                rowKey={(r) => r.id}
                empty={all.length === 0 ? "No request has gone out under terms from this agent yet. The first one appears here with both digests." : "Nothing matches these filters."}
                expanded={(r) => (
                  <dl
                    data-testid="agreement-detail"
                    style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content minmax(0, 1fr)", gap: "2px 12px", fontSize: t.xs, fontFamily: font.mono, overflowWrap: "anywhere" }}
                  >
                    <dt style={{ color: c.muted }}>counterparty</dt>
                    <dd style={{ margin: 0 }}>{r.counterparty}</dd>
                    <dt style={{ color: c.muted }}>agreement</dt>
                    <dd style={{ margin: 0 }}>
                      {r.terms.title}
                      {r.terms.url ? (
                        <>
                          {" · "}
                          <a href={r.terms.url} target="_blank" rel="noreferrer">
                            {r.terms.url}
                          </a>
                        </>
                      ) : null}
                    </dd>
                    <dt style={{ color: c.muted }}>agreement id</dt>
                    <dd style={{ margin: 0 }}>{r.id}</dd>
                    <dt style={{ color: c.muted }}>request id</dt>
                    <dd style={{ margin: 0 }}>{r.reached.requestId}</dd>
                    <dt style={{ color: c.muted }}>answer</dt>
                    <dd style={{ margin: 0 }}>{r.effect}</dd>
                    <dt style={{ color: c.muted }}>made</dt>
                    <dd style={{ margin: 0 }}>{r.via === "site" ? "with the site directly" : "inside the join request"}</dd>
                    <dt style={{ color: c.muted }}>request digest</dt>
                    <dd style={{ margin: 0 }}>{r.reached.requestDigest}</dd>
                    <dt style={{ color: c.muted }}>reply digest</dt>
                    <dd style={{ margin: 0 }}>{r.reached.replyDigest}</dd>
                  </dl>
                )}
              />
            )}
          </>
        ) : error ? (
          <Note tone="danger">Couldn't read or write the agreements: {error}</Note>
        ) : null}
      </section>
    </Panel>
  );
}
