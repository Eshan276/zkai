/**
 * One-time provider registration script.
 * Run once when setting up a provider node.
 *
 * Usage:
 *   ZKAI_PRIVATE_KEY=<hex> npx tsx src/register-provider.ts \
 *     --endpoint http://localhost:8080 \
 *     --model qwen2.5-1.5b \
 *     --price 100
 */

const args = process.argv.slice(2);
const get = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const endpoint = get('--endpoint') ?? 'http://localhost:8080';
const model = get('--model') ?? 'qwen2.5-1.5b';
const price = get('--price') ?? '100';

// Call the bridge to register on-chain (bridge wallet address = provider_id on 0G)
const bridgeUrl = process.env.BRIDGE_URL ?? 'http://127.0.0.1:7300';
const regResp = await fetch(`${bridgeUrl}/registry/register-provider`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ endpoint, model, price }),
});

const result = await regResp.json() as any;
if (!regResp.ok) throw new Error(`Registration failed: ${result.error}`);

console.log(`Provider registered!`);
console.log(`  TX: ${result.tx_id}`);
console.log(`  Provider address (0G): ${result.provider_id}`);
console.log(`\nThis EVM address is your provider_id for attestations.`);
