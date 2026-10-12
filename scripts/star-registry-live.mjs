#!/usr/bin/env node
// Real HTTP checks against an operator-provisioned test namespace. No credentials in output.
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { addressReading, registerReading, registryURL } from '../packages/extension/src/star-registry.ts';
const endpoint = process.env.STAR_REGISTRY_URL;
const namespace = process.env.STAR_REGISTRY_NAMESPACE;
const token = process.env.STAR_REGISTRY_TOKEN;
const evidenceDir = process.argv[2];
try {
  if (!endpoint || !namespace || !token || !evidenceDir) throw Error('Set STAR_REGISTRY_URL, STAR_REGISTRY_NAMESPACE, STAR_REGISTRY_TOKEN and supply a new evidence directory. Use a scoped test token, never a root token.');
  const entry = await addressReading({ schema:'star-reading/0.1', authority:'unverified-import', sourceVersion:1, name:'Synthetic registry check ' + randomUUID(), palette:{cool:'#112233',warm:'#445566',sword:'#778899',mage:'#aabbcc'},lit:[] });
  const url = registryURL(endpoint, namespace, entry.kappa);
  const denied = async (target, method, headers={}) => {
    const response=await fetch(target,{method,headers,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(15000),...(method==='PUT'?{body:'unauthorised synthetic probe'}:{})});
    await response.body?.cancel();
    if (![401,403].includes(response.status)) throw Error('Access boundary did not refuse ' + method + ': HTTP ' + response.status);
    return response.status;
  };
  // Anonymous request must be refused before any test content is registered.
  const anonymousWrite=await denied(url,'PUT');
  const receipt=await registerReading(entry,endpoint,namespace,token);
  const anonymousRead=await denied(url,'GET');
  const wrongToken=await denied(url,'GET',{Authorization:'Bearer deliberately-invalid-smoke-token'});
  const otherURL=registryURL(endpoint,'ungranted-' + randomUUID().replaceAll('-',''),entry.kappa);
  const crossNamespace=await denied(otherURL,'PUT',{Authorization:'Bearer ' + token});
  await mkdir(evidenceDir); // exclusive new directory; do not overwrite prior evidence
  const report={schema:'star-registry-live-check/1',checkedAt:new Date().toISOString(),receipt,checks:{anonymousWrite,anonymousRead,wrongToken,crossNamespace},identityAttested:false,restartPersistence:'not-tested'};
  await writeFile(evidenceDir+'/entry.json',JSON.stringify(entry,null,2)+'\n',{flag:'wx'});
  await writeFile(evidenceDir+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log('PASS: live content read-back and four access-boundary refusals. No VTA identity assertion tested.');
} catch(error) { console.error(error instanceof Error?error.message:'Live check failed'); process.exitCode=1; }
