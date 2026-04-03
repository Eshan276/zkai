'use client';

import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export type { ConnectedAPI };

export interface MidnightWalletState {
  address: string;
  dustBalance: bigint;
  unshieldedBalances: Record<string, bigint>;
}

// Re-export the official type aliases for use throughout the app
export type MidnightWalletEnabledAPI = ConnectedAPI;
export type MidnightWalletAPI = InitialAPI;

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
  }
}

export function getWalletExtension(): MidnightWalletAPI | null {
  if (typeof window === 'undefined') return null;
  const midnight = window.midnight as Record<string, any> | undefined;
  if (!midnight) return null;
  return midnight.mnLace ?? Object.values(midnight)[0] ?? null;
}

export async function waitForExtension(timeoutMs = 3000): Promise<MidnightWalletAPI | null> {
  const interval = 100;
  const attempts = timeoutMs / interval;
  for (let i = 0; i < attempts; i++) {
    const ext = getWalletExtension();
    if (ext) return ext;
    await new Promise(r => setTimeout(r, interval));
  }
  return null;
}

function coerceString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof (val as any).toString === 'function') return (val as any).toString();
  return String(val);
}

function coerceBigInt(val: unknown): bigint {
  if (typeof val === 'bigint') return val;
  try { return BigInt(String(val ?? 0)); } catch { return BigInt(0); }
}

async function fetchState(api: MidnightWalletEnabledAPI): Promise<MidnightWalletState> {
  const [addressRaw, dustRaw, balancesRaw] = await Promise.all([
    api.getUnshieldedAddress(),
    api.getDustBalance(),
    api.getUnshieldedBalances(),
  ]);
  const addrObj = addressRaw as any;
  const dustObj = dustRaw as any;
  return {
    address: addrObj?.unshieldedAddress ?? addrObj?.address ?? coerceString(addressRaw),
    dustBalance: coerceBigInt(dustObj?.balance ?? dustObj?.amount ?? dustObj),
    unshieldedBalances: balancesRaw as Record<string, bigint> ?? {},
  };
}

export async function connectWallet(): Promise<{ api: MidnightWalletEnabledAPI; state: MidnightWalletState }> {
  const ext = getWalletExtension();
  if (!ext) throw new Error('Midnight Lace wallet not found. Install it from the Chrome Web Store.');
  const api = await ext.connect('preprod');
  const state = await fetchState(api);
  return { api, state };
}

export async function refreshWalletState(api: MidnightWalletEnabledAPI): Promise<MidnightWalletState> {
  return fetchState(api);
}
