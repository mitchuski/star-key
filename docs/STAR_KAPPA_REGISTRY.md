# Star κ registry integration

The Star reading inspector now derives a content address and exports `star-registry-entry/1`. `scripts/star-registry.mjs` registers that reading using UOR kappa-registry's monolithic OCI blob PUT and GET interface. It only reports content-readback-verified after hashing the retrieved bytes. This is implemented content integration, not an identity-assertion ceremony.

## Use

Requires Node 24+. Open the extension's Star reading page, import a City Key, choose whether to disclose its vertices, click **Address selected reading · κ**, and download the registry entry. The name and palette are included; inspect them before sending. The original private carrier is not uploaded.

```powershell
node scripts/star-registry.mjs verify ./star-registry-entry.json
$env:STAR_REGISTRY_URL = 'http://127.0.0.1:5099'
$env:STAR_REGISTRY_NAMESPACE = 'stars'
node scripts/star-registry.mjs register ./star-registry-entry.json ./receipt.json
```

Use your configured registry origin and authorised namespace. If authentication is required, set STAR_REGISTRY_TOKEN through your existing secret mechanism; never embed it in the entry or URL. The CLI does not create namespaces or bypass authorisation. The register command is an explicit transmission of the selected reading. A namespace name does not guarantee private access: use the receiving registry's actual access policy.

The adapter stores canonical UTF-8 JSON content, not the wrapper containing its own digest. The canonical profile recursively sorts object keys, retains array order, and accepts finite JSON values only. The wrapper names its schema/profile. These bytes differ from UOR identity-anchor dCBOR; identity anchors are not created or substituted here. No VRC or VTA membership is issued.

PUT success followed by failed GET is reported as potentially written, not definitely absent. Retry uses the same content address. Receipts are local read-back observations, not signed server attestations. No global graph, background upload, new browser permission or website-supplied signing operation is introduced.

## Verification

`node --test scripts/star-registry.test.mjs` covers canonical ordering, tamper rejection, unknown/private fields, changed disclosures, exact UOR blob request paths, denied writes, corrupted retrieval and endpoint restrictions. Tests use a transport fixture. Extension TypeScript, three existing projection tests and the Star preview build passed. A live UOR service registration still needs the selected endpoint/namespace; do not present a fixture result as that encounter.

Source interface: local kappa-registry-main README blob operations, pinned upstream 2af8656. Core code remains untouched. Binding signed assertions to registry anchors is a separate integration step.

## Real-service acceptance check

After provisioning a dedicated test namespace and a token restricted to it, run:

```powershell
node scripts/star-registry-live.mjs .registry-runs/first-live
```

The same STAR_REGISTRY_* environment variables apply. This uses real HTTP and stores one synthetic reading. It requires anonymous writes, anonymous reads, invalid tokens and writes to an ungranted namespace to return401/403. Root tokens should fail this test because they can write across namespaces. A passing report records read-back content verification only; restart persistence, VTA identity issuance, expiry and revocation still need separate checks. Run evidence is gitignored. The script has been syntax-checked, not run against a live service yet.

## Validation entry point

Run `npm run test:star-registry`. Five tests cover canonical addresses, tampering, selected-field rejection, endpoint restrictions, invalid readings, write refusal and read-back failure. The extension production build also passes. These tests use synthetic transport fixtures; they do not establish live VTA authorisation or a hosted registry.
