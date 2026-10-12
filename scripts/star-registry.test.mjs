import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressReading, verifyEntry, registerReading, registryURL } from '../packages/extension/src/star-registry.ts';
const reading = { schema:'star-reading/0.1',authority:'unverified-import',sourceVersion:1,name:'Test Star',palette:{cool:'#112233',warm:'#445566',sword:'#778899',mage:'#aabbcc'},lit:[0,63] };
test('canonical ordering, tampering and private field rejection',async()=>{
 const a=await addressReading(reading); const b=await addressReading(Object.fromEntries(Object.entries(reading).reverse())); assert.equal(a.kappa,b.kappa);
 await assert.rejects(verifyEntry({...a,content:{...reading,name:'changed'}}),/mismatch/);
 await assert.rejects(addressReading({...reading,privateKey:'secret'}),/Unexpected/);
 assert.notEqual((await addressReading({...reading,lit:[]})).kappa,a.kappa);
});
test('UOR blob contract stores canonical bytes and requires verified read-back',async()=>{
 let stored; let calls=0;
 const transport=async(url,init)=>{calls++;assert.match(String(url),/\/v2\/stars\/blobs\/sha256:/);assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit'); if(init.method==='PUT'){stored=init.body;return new Response(null,{status:201});}return new Response(stored);};
 const receipt=await registerReading(await addressReading(reading),'http://127.0.0.1:5099','stars',undefined,transport);assert.equal(calls,2);assert.equal(receipt.status,'content-readback-verified');assert.equal(receipt.identityAttested,false);
});
test('rejects denial, corrupted read-back, unsafe endpoints and namespaces',async()=>{
 const a=await addressReading(reading);
 await assert.rejects(registerReading(a,'http://localhost:5099','stars',undefined,async()=>new Response(null,{status:403})),/403/);
 await assert.rejects(registerReading(a,'http://localhost:5099','stars',undefined,async()=>new Response('wrong')),/mismatch/);
 for(const url of ['http://example.com','https://user:pass@example.com','https://example.com/path','https://example.com/?token=x'])assert.throws(()=>registryURL(url,'stars',a.kappa));
 assert.throws(()=>registryURL('https://example.com','../secrets',a.kappa));
});

test('rejects malformed selected readings before any network write',async()=>{
 for(const patch of [{sourceVersion:2},{authority:'verified'},{name:''},{palette:{cool:'#fff'}},{lit:[64]},{lit:[-1]},{lit:[0.5]},{lit:Array(65).fill(0)}]) {
  await assert.rejects(addressReading({...reading,...patch}));
 }
 let calls=0;
 await assert.rejects(registerReading({schema:'wrong'},'https://example.com','stars',undefined,async()=>{calls++;return new Response(null)}));
 assert.equal(calls,0);
});
test('read-back failure cannot produce a success receipt',async()=>{
 let calls=0;
 await assert.rejects(registerReading(await addressReading(reading),'https://example.com','stars',undefined,async()=>new Response(null,{status:++calls===1?201:404})),/may have succeeded; read-back failed/);
 assert.equal(calls,2);
});
