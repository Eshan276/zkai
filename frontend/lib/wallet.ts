'use client';

// Midnight Lace wallet browser extension injects window.midnight.mnLace
// Docs: https://docs.midnight.network/develop/tutorial/using-dapp-connector/

export interface MidnightWalletState {
  address: string;
  coinPublicKey: string;
  balances: Record<string, bigint>;
  synced: boolean;
}

export interface MidnightWalletAPI {
  apiVersion: string;
  enable(): Promise<MidnightWalletEnabledAPI>;
  isEnabled(): Promise<boolean>;
  name: string;
  icon: string;
}

export interface MidnightWalletEnabledAPI {
  state(): { subscribe(cb: (s: MidnightWalletState) => void): { unsubscribe(): void } };
}

declare global {
  interface Window {
    midnight?: {
      mnLace?: MidnightWalletAPI;
    };
  }
}

export function getWalletExtension(): MidnightWalletAPI | null {
  if (typeof window === 'undefined') return null;
  return window.midnight?.mnLace ?? null;
}

export async function connectWallet(): Promise<{ api: MidnightWalletEnabledAPI; state: MidnightWalletState }> {
  const ext = getWalletExtension();
  if (!ext) throw new Error('Midnight Lace wallet extension not found. Install it from the Chrome Web Store.');
  const api = await ext.enable();
  return new Promise((resolve, reject) => {
    const sub = api.state().subscribe((state) => {
      sub.unsubscribe();
      resolve({ api, state });
    });
    setTimeout(() => reject(new Error('Wallet connection timed out')), 10_000);
  });
}
