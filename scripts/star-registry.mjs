#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { verifyEntry, registerReading } from '../packages/extension/src/star-registry.ts';
const [command, file, receiptFile] = process.argv.slice(2);
try {
  if (!['verify','register'].includes(command) || !file) throw Error('Usage: node scripts/star-registry.mjs verify entry.json | register entry.json receipt.json');
  const entry = await verifyEntry(JSON.parse(await readFile(file, 'utf8')));
  if (command === 'verify') console.log(JSON.stringify({ kappa: entry.kappa, status: 'content-verified' }));
  else {
    if (!receiptFile || !process.env.STAR_REGISTRY_URL || !process.env.STAR_REGISTRY_NAMESPACE) throw Error('Set STAR_REGISTRY_URL and STAR_REGISTRY_NAMESPACE and give a new receipt filename.');
    const receipt = await registerReading(entry, process.env.STAR_REGISTRY_URL, process.env.STAR_REGISTRY_NAMESPACE, process.env.STAR_REGISTRY_TOKEN);
    await writeFile(receiptFile, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    console.log('Stored and read-back verified: ' + receipt.kappa);
  }
} catch (error) { console.error(error instanceof Error ? error.message : 'Registry operation failed'); process.exitCode = 1; }
