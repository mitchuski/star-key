// What the wallet carries of a Hold between sessions: the root and the count,
// never the items.
//
// The Hold pane (`star-hold-pane.tsx`) verifies a Hold from a file the bearer
// chose and persists nothing. When the bearer chooses *Carry root and count*,
// exactly that is kept here, in `chrome.storage.local` under one key, so a
// community's own portal (`membership-page.ts`) can show the member what the
// community sees of their Hold: `holds{root,count}`, the same slot the City
// Key carries. 92 bytes of a Hold whose items run to kilobytes; the items stay
// in the file.
//
// One carried Hold per wallet, not per agent: a Hold belongs to a bearer key,
// not to a VTA. Written only from the pane, by a click; cleared the same way.

export const CARRIED_HOLD_KEY = 'star-hold:carried';

export interface CarriedHold {
  /** The Merkle root over the Hold's item refs. */
  root: string;
  /** How many items sit under it. */
  count: number;
  /** The Hold's bearer (a did:key). */
  bearer: string;
  /** κ of the City Key the Hold belongs to. */
  kappa: string;
  /** When the Hold was stamped. */
  at: string;
  /** When the bearer chose to carry it. */
  carriedAt: string;
}

/** The storage this module needs: the shape of `chrome.storage.local`. */
export interface CarriedHoldArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

const DIGEST = /^sha256:[0-9a-f]{64}$/;

export function isCarriedHold(v: unknown): v is CarriedHold {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.root === 'string' && DIGEST.test(c.root) &&
    typeof c.count === 'number' && Number.isInteger(c.count) && c.count >= 0 &&
    typeof c.bearer === 'string' && c.bearer.startsWith('did:') && c.bearer.length <= 2048 &&
    typeof c.kappa === 'string' && DIGEST.test(c.kappa) &&
    typeof c.at === 'string' && c.at.length <= 64 &&
    typeof c.carriedAt === 'string' && c.carriedAt.length <= 64
  );
}

/** What to carry of a verified Hold. The caller has verified it; this only copies the slot. */
export function carriedOf(hold: { root: string; count: number; bearer: string; kappa: string; at: string }, now: Date = new Date()): CarriedHold {
  return { root: hold.root, count: hold.count, bearer: hold.bearer, kappa: hold.kappa, at: hold.at, carriedAt: now.toISOString() };
}

const area = (): CarriedHoldArea => chrome.storage.local as unknown as CarriedHoldArea;

/** The carried Hold, or nothing. A malformed record is nothing. */
export async function readCarriedHold(store: CarriedHoldArea = area()): Promise<CarriedHold | undefined> {
  const held = (await store.get(CARRIED_HOLD_KEY))[CARRIED_HOLD_KEY];
  return isCarriedHold(held) ? held : undefined;
}

export async function writeCarriedHold(carried: CarriedHold, store: CarriedHoldArea = area()): Promise<void> {
  if (!isCarriedHold(carried)) throw new Error('not a carried Hold');
  await store.set({ [CARRIED_HOLD_KEY]: carried });
}

export async function clearCarriedHold(store: CarriedHoldArea = area()): Promise<void> {
  await store.remove(CARRIED_HOLD_KEY);
}
