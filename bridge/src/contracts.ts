/**
 * Contract interaction layer — ethers.js calls to 0G chain EVM contracts.
 */

import { ethers } from 'ethers';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getWallet, getProviderAddress } from './wallet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load deployment addresses — prefer env vars (Docker), fall back to deployment.json
function loadAddresses() {
  if (process.env.REGISTRY_CONTRACT) {
    console.log('[contracts] loaded addresses from environment variables');
    return {
      ProviderRegistry: process.env.REGISTRY_CONTRACT,
      PaymentEscrow: process.env.ESCROW_CONTRACT ?? '',
      AttestationRegistry: process.env.ATTESTATION_CONTRACT ?? '',
    };
  }
  const deploymentPath = fs.existsSync('/app/deployment.json')
    ? '/app/deployment.json'
    : path.resolve(__dirname, '..', '..', 'deploy', 'deployment.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('deployment.json not found and no REGISTRY_CONTRACT env var set. Run deploy first.');
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  console.log('[contracts] loaded deployment from:', deploymentPath);
  return {
    ProviderRegistry: deployment.contracts.ProviderRegistry as string,
    PaymentEscrow: deployment.contracts.PaymentEscrow as string,
    AttestationRegistry: deployment.contracts.AttestationRegistry as string,
  };
}

function loadAbi(name: string) {
  const abiPath = fs.existsSync(`/app/abis/${name}.json`)
    ? `/app/abis/${name}.json`
    : path.resolve(__dirname, '..', '..', 'deploy', 'abis', `${name}.json`);
  return JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
}

export const ADDRESSES = loadAddresses();
console.log('[contracts] ProviderRegistry:', ADDRESSES.ProviderRegistry);

function escrowContract() {
  return new ethers.Contract(ADDRESSES.PaymentEscrow, loadAbi('PaymentEscrow'), getWallet());
}

function registryContract() {
  return new ethers.Contract(ADDRESSES.ProviderRegistry, loadAbi('ProviderRegistry'), getWallet());
}

function attestationContract() {
  return new ethers.Contract(ADDRESSES.AttestationRegistry, loadAbi('AttestationRegistry'), getWallet());
}

// ── ProviderRegistry ───────────────────────────────────────────────────────

export async function registerProvider(
  _providerId: string,
  _pubkey: string,
  endpoint: string,
  model: string,
  price: string,
): Promise<string> {
  const tx = await registryContract().register(endpoint, model, BigInt(price));
  const receipt = await tx.wait();
  console.log('[contracts] registerProvider tx:', receipt.hash);
  return receipt.hash;
}

export async function deregisterProvider(_providerId: string): Promise<string> {
  const tx = await registryContract().deregister();
  const receipt = await tx.wait();
  console.log('[contracts] deregisterProvider tx:', receipt.hash);
  return receipt.hash;
}

// ── PaymentEscrow ──────────────────────────────────────────────────────────

export async function deposit(amount: string): Promise<string> {
  const tx = await escrowContract().deposit({ value: BigInt(amount) });
  const receipt = await tx.wait();
  console.log('[contracts] deposit tx:', receipt.hash);
  return receipt.hash;
}

export async function deductBalance(
  walletAddr: string,
  providerId: string,
  jobId: string,
  amount: string,
): Promise<string> {
  // walletAddr: consumer EVM address (0x...)
  // providerId: provider EVM address (0x...) or use bridge's own address as fallback
  const providerAddr = providerId && ethers.isAddress(providerId)
    ? providerId
    : getProviderAddress();
  const jobIdBytes = ethers.id(jobId); // keccak256 → bytes32
  const tx = await escrowContract().deductBalance(
    walletAddr,
    providerAddr,
    jobIdBytes,
    BigInt(amount),
  );
  const receipt = await tx.wait();
  console.log('[contracts] deductBalance tx:', receipt.hash);
  return receipt.hash;
}

export async function withdraw(amount: string): Promise<string> {
  const tx = await escrowContract().withdraw(BigInt(amount));
  const receipt = await tx.wait();
  console.log('[contracts] withdraw tx:', receipt.hash);
  return receipt.hash;
}

// ── AttestationRegistry ────────────────────────────────────────────────────

export async function postAttestation(
  jobId: string,
  attestationHash: string,
  _modelHash: string,
): Promise<string> {
  const jobIdBytes = ethers.id(jobId); // keccak256 → bytes32
  // attestationHash: hex string → pad/truncate to 32 bytes
  const cleanHash = attestationHash.replace(/^0x/, '');
  const hashBytes32 = '0x' + cleanHash.padEnd(64, '0').slice(0, 64);
  const tx = await attestationContract().postAttestation(jobIdBytes, hashBytes32);
  const receipt = await tx.wait();
  console.log('[contracts] postAttestation tx:', receipt.hash);
  return receipt.hash;
}
