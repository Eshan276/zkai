'use client';

import { ethers } from 'ethers';

export interface WalletState {
  address: string;
  balance: bigint;
  chainId: number;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function isMetaMaskAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.ethereum?.isMetaMask || window.ethereum);
}

export async function connectWallet(): Promise<{ provider: ethers.BrowserProvider; state: WalletState }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not found. Install MetaMask to continue.');
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  const network = await provider.getNetwork();
  return { provider, state: { address, balance, chainId: Number(network.chainId) } };
}

export async function refreshWalletState(provider: ethers.BrowserProvider): Promise<WalletState> {
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  const network = await provider.getNetwork();
  return { address, balance, chainId: Number(network.chainId) };
}

export async function switchTo0GGalileo(provider: ethers.BrowserProvider): Promise<void> {
  try {
    await provider.send('wallet_switchEthereumChain', [{ chainId: '0x40DA' }]); // 16602
  } catch (e: any) {
    if (e.code === 4902) {
      await provider.send('wallet_addEthereumChain', [{
        chainId: '0x40DA',
        chainName: '0G Galileo Testnet',
        nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
        rpcUrls: ['https://evmrpc-testnet.0g.ai'],
        blockExplorerUrls: ['https://chainscan-galileo.0g.ai'],
      }]);
    } else {
      throw e;
    }
  }
}

const WALLET_SESSION_KEY = 'zkai_wallet_connected';

export function persistWalletSession(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(WALLET_SESSION_KEY, '1'); } catch {}
}

export function clearWalletSession(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(WALLET_SESSION_KEY); } catch {}
}

export function hasPersistedWalletSession(): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(WALLET_SESSION_KEY) === '1'; } catch { return false; }
}
