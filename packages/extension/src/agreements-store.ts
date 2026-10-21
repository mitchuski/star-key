// The wallet's agreements and its per-counterparty switches, in
// `chrome.storage.local`, keyed by the agent the request was signed at.
//
//   agreements:<vtaDid>       Agreement[]   one record per request sent under
//                                           terms, appended by the offscreen
//                                           document when the request went out
//   agreement-prefs:<vtaDid>  Record<counterparty DID, AgreementPreference>
//                                           the holder's standing instruction
//                                           per counterparty, written from the
//                                           console's Agreements pane
//
// Read by the console (the pane) and the join flow (the switch decides the
// default of the "join under terms" box). Agent-wide on purpose: a record is
// keyed by the agent it was signed at, not by a context, and a counterparty
// is the same community whichever context the persona came from.

import { isAgreement, type Agreement, type AgreementPreference } from "@openvtc/pnm-core/vtc";

export const AGREEMENTS_KEY_PREFIX = "agreements:";
export const AGREEMENT_PREFS_KEY_PREFIX = "agreement-prefs:";

/** How many records an agent keeps. The oldest go first. */
const KEEP = 200;

/** This agent's records. A missing or malformed store is an empty one. */
export async function readAgreements(vtaDid: string): Promise<Agreement[]> {
  const key = `${AGREEMENTS_KEY_PREFIX}${vtaDid}`;
  const held = (await chrome.storage.local.get(key))[key];
  if (!Array.isArray(held)) return [];
  return held.filter(isAgreement);
}

/** Keep one more record. Best effort: the request it records is already
 *  answered, so a store that cannot be written loses the wallet's half and
 *  nothing else. */
export async function appendAgreement(agreement: Agreement): Promise<void> {
  const key = `${AGREEMENTS_KEY_PREFIX}${agreement.vtaDid}`;
  const held = (await chrome.storage.local.get(key))[key];
  const list = Array.isArray(held) ? held : [];
  list.push(agreement);
  await chrome.storage.local.set({ [key]: list.slice(-KEEP) });
}

/** The holder's switches for this agent, by counterparty DID. */
export async function readAgreementPrefs(vtaDid: string): Promise<Record<string, AgreementPreference>> {
  const key = `${AGREEMENT_PREFS_KEY_PREFIX}${vtaDid}`;
  const held = (await chrome.storage.local.get(key))[key];
  if (!held || typeof held !== "object" || Array.isArray(held)) return {};
  const out: Record<string, AgreementPreference> = {};
  for (const [did, pref] of Object.entries(held as Record<string, unknown>)) {
    const terms = (pref as { terms?: unknown } | null)?.terms;
    const offer = (pref as { offer?: unknown } | null)?.offer;
    if (typeof terms === "boolean") out[did] = { terms, ...(typeof offer === "string" && offer !== "" ? { offer } : {}) };
  }
  return out;
}

/** The holder's instruction for one counterparty, or none. */
export async function agreementPreferenceFor(vtaDid: string, counterparty: string): Promise<AgreementPreference | undefined> {
  return (await readAgreementPrefs(vtaDid))[counterparty];
}

/** Whether the wallet proffers terms at this counterparty's door. Absent is
 *  yes: a switch exists to turn something off. */
export async function termsEnabledFor(vtaDid: string, counterparty: string): Promise<boolean> {
  const prefs = await readAgreementPrefs(vtaDid);
  return prefs[counterparty]?.terms ?? true;
}

/** Set the holder's switch for one counterparty. */
export async function writeAgreementPref(vtaDid: string, counterparty: string, pref: AgreementPreference): Promise<void> {
  const key = `${AGREEMENT_PREFS_KEY_PREFIX}${vtaDid}`;
  const prefs = await readAgreementPrefs(vtaDid);
  prefs[counterparty] = pref;
  await chrome.storage.local.set({ [key]: prefs });
}

/** Every agent's records, for a surface that does not know which agent a
 *  site was dealt with as (the 🤝 window). Local storage only. */
export async function readAllAgreements(): Promise<Agreement[]> {
  const all = await chrome.storage.local.get(null);
  const out: Agreement[] = [];
  for (const [key, held] of Object.entries(all)) {
    if (!key.startsWith(AGREEMENTS_KEY_PREFIX) || !Array.isArray(held)) continue;
    out.push(...held.filter(isAgreement));
  }
  return out;
}

/** The records reached at a site (its portal host) or with a counterparty,
 *  newest first. A host is matched exactly, lower-cased; a DID exactly. */
export function agreementsWith(records: readonly Agreement[], where: { host?: string; counterparty?: string }): Agreement[] {
  const host = where.host?.toLowerCase();
  return records
    .filter((r) => (host !== undefined && r.site.toLowerCase() === host) || (where.counterparty !== undefined && r.counterparty === where.counterparty))
    .sort((a, b) => b.reached.at - a.reached.at);
}
