export function readiness(config, origin, provider) {
  if (!config?.enabled) return { ready: false, reason: 'Test relying service is not configured yet.' };
  if (config.siteOrigin !== origin) return { ready: false, reason: 'This origin is not the configured pilot origin.' };
  if (config.identityPolicy !== 'vta-persona-required') return { ready: false, reason: 'The pilot requires an explicit VTA persona policy.' };
  if (typeof config.rpDid !== 'string' || !config.rpDid.startsWith('did:')) return { ready: false, reason: 'Configure the relying service DID.' };
  let url; try { url = new URL(config.baseUrl); } catch { return { ready: false, reason: 'Configure the relying service auth URL.' }; }
  if (url.username || url.password || url.hash || url.search || !(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return { ready: false, reason: 'Use HTTPS or a loopback test service, without credentials or query parameters.' };
  if (typeof provider?.login !== 'function') return { ready: false, reason: 'Enable Star on this site in the installed extension, then reload.' };
  return { ready: true, reason: 'Provider and pilot configuration found. Select a VTA-held persona in Star; this page cannot enforce that choice yet.' };
}
export async function beginLogin(config, origin, provider) {
  const check = readiness(config, origin, provider);
  if (!check.ready) throw Error(check.reason);
  const result = await provider.login({ rpDid: config.rpDid, baseUrl: config.baseUrl });
  if (!result || typeof result.sessionId !== 'string' || !result.sessionId || typeof result.accessToken !== 'string' || !result.accessToken) throw Error('Provider returned no usable session result.');
  // Do not expose tokens, holder identifiers or session IDs to the DOM/log/export.
  return { status: 'provider-session-returned', independentlyVerified: false };
}
