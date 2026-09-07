import { readiness, beginLogin } from './adapter.mjs';
const $ = id => document.getElementById(id);
let config = null, busy = false;
async function refresh() {
  try {
    const response = await fetch('./pilot-config.json', { cache: 'no-store' });
    if (!response.ok) throw Error('Pilot configuration could not be read.');
    config = await response.json();
    const check = readiness(config, location.origin, window.vtaWallet);
    $('provider').textContent = window.vtaWallet ? 'Provider detected · authenticity not established by page detection alone' : 'Star provider is not available in this browser context.';
    $('readiness').textContent = check.reason; $('connect').disabled = !check.ready || busy;
    $('config').textContent = JSON.stringify({ enabled: config.enabled, siteOrigin: config.siteOrigin, rpDid: config.rpDid, baseUrl: config.baseUrl, identityPolicy: config.identityPolicy }, null, 2);
  } catch (e) { config = null; $('connect').disabled = true; $('readiness').textContent = e.message; }
}
$('refresh').onclick = refresh;
$('connect').onclick = async () => {
  if (busy) return;
  busy = true; $('connect').disabled = true; $('status').textContent = 'Review the request in the installed Star extension.';
  try {
    await beginLogin(config, location.origin, window.vtaWallet);
    $('status').textContent = 'Provider returned a session. Independent RP verification and persona-policy enforcement are still required; no City access granted.';
  } catch { $('status').textContent = 'Sign-in did not complete. Review the extension and configured test service; no connected account is claimed here.'; }
  finally { busy = false; await refresh(); }
};
await refresh();
