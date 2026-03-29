/**
 * Contract interaction layer.
 * Loads compiled contracts, finds deployed instances, calls circuits.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { compiledDir, createProviders, getWalletContext } from './wallet.js';

// Load deployment addresses — Docker mounts deployment.json at /app/deployment.json
const deploymentPath = fs.existsSync('/app/deployment.json')
  ? '/app/deployment.json'
  : path.resolve(compiledDir, '..', 'deployment.json');
if (!fs.existsSync(deploymentPath)) {
  throw new Error(`deployment.json not found at ${deploymentPath}. Run deploy first.`);
}
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
console.log('[contracts] loaded deployment from:', deploymentPath);
console.log('[contracts] ProviderRegistry:', deployment.contracts?.ProviderRegistry);

export const ADDRESSES = {
  ProviderRegistry: deployment.contracts.ProviderRegistry as string,
  PaymentEscrow: deployment.contracts.PaymentEscrow as string,
  AttestationRegistry: deployment.contracts.AttestationRegistry as string,
};

async function loadCompiledContract(name: string) {
  const contractPath = path.join(compiledDir, name, 'contract', 'index.js');
  const mod = await import(pathToFileURL(contractPath).href);
  return CompiledContract.make(name.toLowerCase(), mod.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(path.join(compiledDir, name)),
  );
}

async function callCircuit(
  contractName: 'ProviderRegistry' | 'PaymentEscrow' | 'AttestationRegistry',
  circuitId: string,
  args: unknown[],
) {
  const walletCtx = await getWalletContext();
  const zkConfigPath = path.join(compiledDir, contractName);
  const providers = await createProviders(walletCtx, zkConfigPath);
  const compiledContract = await loadCompiledContract(contractName);

  const addr = ADDRESSES[contractName];
  console.log(`[contracts] using address for ${contractName}: "${addr}" (type: ${typeof addr})`);
  const found = await findDeployedContract(providers, {
    compiledContract,
    contractAddress: addr,
    privateStateId: `${contractName.toLowerCase()}-bridge-state`,
    initialPrivateState: {},
  });

  try {
    await found.callTx[circuitId](...args);
    return 'submitted';
  } catch (e: any) {
    console.error(`[contracts] callCircuit ${contractName}.${circuitId} failed:`, e?.message ?? e);
    console.error('[contracts] cause:', e?.cause?.message ?? e?.cause ?? '(none)');
    console.error('[contracts] stack:', e?.stack?.slice(0, 3000));
    throw e;
  }
}

// ── ProviderRegistry ───────────────────────────────────────────────────────

export async function registerProvider(
  providerId: string,
  pubkey: string,
  endpoint: string,
  model: string,
  price: string,
): Promise<string> {
  return callCircuit('ProviderRegistry', 'registerProvider', [
    Buffer.from(providerId, 'hex'),
    Buffer.from(pubkey, 'hex'),
    endpoint,
    model,
    BigInt(price),
  ]);
}

export async function deregisterProvider(providerId: string): Promise<string> {
  return callCircuit('ProviderRegistry', 'deregisterProvider', [
    Buffer.from(providerId, 'hex'),
  ]);
}

// ── PaymentEscrow ──────────────────────────────────────────────────────────

function toBytes32(hex: string): Buffer {
  // Ensure exactly 32 bytes for Compact Bytes<32>
  const clean = hex.replace(/^0x/, '');
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return Buffer.from(clean, 'hex');
  }
  // Not a valid 32-byte hex — SHA256 hash it to a deterministic 32 bytes
  return createHash('sha256').update(hex).digest();
}

export async function createJob(
  jobId: string,
  providerId: string,
  amount: string,
): Promise<string> {
  return callCircuit('PaymentEscrow', 'createJob', [
    toBytes32(jobId),
    toBytes32(providerId),
    BigInt(amount),
  ]);
}

export async function completeJob(
  jobId: string,
  attestationHash: string,
): Promise<string> {
  return callCircuit('PaymentEscrow', 'completeJob', [
    toBytes32(jobId),
    toBytes32(attestationHash),
  ]);
}

export async function disputeJob(jobId: string): Promise<string> {
  return callCircuit('PaymentEscrow', 'disputeJob', [
    toBytes32(jobId),
  ]);
}

// ── AttestationRegistry ────────────────────────────────────────────────────

export async function postAttestation(
  jobId: string,
  attestationHash: string,
  modelHash: string,
): Promise<string> {
  return callCircuit('AttestationRegistry', 'postAttestation', [
    Buffer.from(jobId, 'hex'),
    Buffer.from(attestationHash, 'hex'),
    Buffer.from(/^[0-9a-fA-F]{64}$/.test(modelHash) ? modelHash : '0'.repeat(64), 'hex'),
  ]);
}
