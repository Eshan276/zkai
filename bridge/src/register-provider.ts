/**
 * One-time provider registration script.
 * Run once when setting up a provider node.
 *
 * Usage:
 *   ZKAI_SEED=<hex> npx tsx src/register-provider.ts \
 *     --endpoint http://localhost:8080 \
 *     --model qwen2.5-1.5b \
 *     --price 100
 */

import * as crypto from 'node:crypto';
import * as Rx from 'rxjs';

const args = process.argv.slice(2);
const get = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const endpoint = get('--endpoint') ?? 'http://localhost:8080';
const model = get('--model') ?? 'qwen2.5-1.5b';
const price = get('--price') ?? '100';

// Fetch TEE pubkey from the provider
const resp = await fetch(`${endpoint}/pubkey`);
if (!resp.ok) throw new Error(`Failed to fetch pubkey from ${endpoint}/pubkey`);
const { pubkey } = await resp.json() as { pubkey: string };
console.log(`TEE pubkey: ${pubkey}`);

// Derive a stable provider_id from the pubkey (sha256, first 32 bytes)
const providerId = crypto.createHash('sha256').update(pubkey).digest('hex').slice(0, 64);
console.log(`Provider ID: ${providerId}`);

// Call the bridge to register on-chain
const bridgeUrl = process.env.BRIDGE_URL ?? 'http://127.0.0.1:7300';
const regResp = await fetch(`${bridgeUrl}/registry/register-provider`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider_id: providerId,
    pubkey: pubkey.padStart(64, '0'),  // ensure 32 bytes
    endpoint,
    model,
    price,
  }),
});

const result = await regResp.json() as any;
if (!regResp.ok) throw new Error(`Registration failed: ${result.error}`);

console.log(`\n✅ Provider registered!`);
console.log(`   TX: ${result.tx_id}`);
console.log(`   Provider ID: ${providerId}`);
console.log(`\nSave your provider_id — providers need it to post attestations.`);
