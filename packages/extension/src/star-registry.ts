// UOR kappa-registry blob adapter. Content addressing is not identity attestation.
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const object = value as Record<string, unknown>;
    return '{' + Object.keys(object).sort().map(key => JSON.stringify(key) + ':' + canonicalJSON(object[key])).join(',') + '}';
  }
  throw Error('Only finite JSON values can be addressed.');
}
export async function addressBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return 'sha256:' + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export interface AddressedReading { schema: 'star-registry-entry/1'; profile: 'agentprivacy-json-sorted/1'; kappa: string; content: unknown }
export async function addressReading(content: unknown): Promise<AddressedReading> {
  if (!content || typeof content !== 'object' || Array.isArray(content)) throw Error('A Star reading is required.');
  const c = content as Record<string, unknown>;
  if (c.schema !== 'star-reading/0.1' || c.authority !== 'unverified-import' || c.sourceVersion !== 1) throw Error('Unsupported Star reading.');
  if (Object.keys(c).some(key => !['schema','authority','sourceVersion','name','palette','lit'].includes(key))) throw Error('Unexpected fields: export the selected Star reading first.');
  if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 200) throw Error('Invalid reading name.');
  const palette = c.palette as Record<string, unknown>;
  if (!palette || Object.keys(palette).sort().join(',') !== 'cool,mage,sword,warm' || Object.values(palette).some(v => typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v))) throw Error('Invalid palette.');
  if (!Array.isArray(c.lit) || c.lit.length > 64 || c.lit.some(v => !Number.isInteger(v) || v < 0 || v > 63)) throw Error('Invalid vertices.');
  const bytes = new TextEncoder().encode(canonicalJSON(content));
  return { schema: 'star-registry-entry/1', profile: 'agentprivacy-json-sorted/1', kappa: await addressBytes(bytes), content: JSON.parse(new TextDecoder().decode(bytes)) };
}
export async function verifyEntry(value: unknown): Promise<AddressedReading> {
  const v = value as AddressedReading;
  if (!v || v.schema !== 'star-registry-entry/1' || v.profile !== 'agentprivacy-json-sorted/1') throw Error('Unsupported registry entry.');
  const checked = await addressReading(v.content);
  if (checked.kappa !== v.kappa) throw Error('Content address mismatch.');
  return checked;
}
export function registryURL(endpoint: string, namespace: string, kappa: string): string {
  const url = new URL(endpoint);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Use a registry origin without credentials or paths.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw Error('Use HTTPS or a loopback test registry.');
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*$/.test(namespace)) throw Error('Invalid registry namespace.');
  if (!/^sha256:[a-f0-9]{64}$/.test(kappa)) throw Error('Invalid content address.');
  return url.origin + '/v2/' + namespace + '/blobs/' + kappa;
}
export async function registerReading(entry: unknown, endpoint: string, namespace: string, token?: string, transport: typeof fetch = fetch) {
  const checked = await verifyEntry(entry);
  const bytes = new TextEncoder().encode(canonicalJSON(checked.content));
  const url = registryURL(endpoint, namespace, checked.kappa);
  const headers: Record<string,string> = { 'Content-Type': 'application/octet-stream' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const options = { headers, redirect: 'error' as const, credentials: 'omit' as const };
  const put = await transport(url, { ...options, method: 'PUT', body: bytes, signal: AbortSignal.timeout(15000) });
  if (!put.ok) throw Error('Registry write rejected: HTTP ' + put.status);
  // A success status is not sufficient: retrieve and verify exactly what was stored.
  const get = await transport(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (!get.ok) throw Error('Write may have succeeded; read-back failed: HTTP ' + get.status);
  const returned = new Uint8Array(await get.arrayBuffer());
  if (await addressBytes(returned) !== checked.kappa) throw Error('Write may have succeeded; registry read-back digest mismatch.');
  return { schema: 'star-registry-receipt/1', registry: new URL(endpoint).origin, namespace, kappa: checked.kappa, checkedAt: new Date().toISOString(), status: 'content-readback-verified', identityAttested: false };
}
