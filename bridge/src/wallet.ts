/**
 * Wallet singleton — ethers.js signer for 0G chain.
 * Initialized once on bridge startup; no sync wait required.
 */

import { ethers } from 'ethers';

const RPC_URL = process.env.OG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';

let _wallet: ethers.Wallet | null = null;
const _provider = new ethers.JsonRpcProvider(RPC_URL);

export async function startWallet(): Promise<ethers.Wallet> {
  const pk = process.env.ZKAI_PRIVATE_KEY;
  if (!pk) throw new Error('ZKAI_PRIVATE_KEY env var required. Set it in your .env file.');
  _wallet = new ethers.Wallet(pk, _provider);
  console.log(`[wallet] 0G address: ${_wallet.address}`);
  const balance = await _provider.getBalance(_wallet.address);
  console.log(`[wallet] balance: ${ethers.formatEther(balance)} A0GI`);
  return _wallet;
}

export function getWallet(): ethers.Wallet {
  if (!_wallet) throw new Error('Wallet not initialized. Call startWallet() first.');
  return _wallet;
}

export function getProviderAddress(): string {
  if (!_wallet) throw new Error('Wallet not initialized.');
  return _wallet.address;
}

export function isWalletReady(): boolean {
  return _wallet !== null;
}

export function getEthersProvider(): ethers.JsonRpcProvider {
  return _provider;
}
