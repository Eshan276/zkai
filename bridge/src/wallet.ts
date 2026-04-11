/**
 * Wallet singleton — initialized once on bridge startup, reused for all requests.
 * Extracted from deploy/src/deploy.ts.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as Rx from 'rxjs';
import { Buffer } from 'buffer';
import { WebSocket } from 'ws';

import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { createKeystore, UnshieldedWallet, PublicKey, NoOpTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

// @ts-expect-error WebSocket for GraphQL subscriptions
globalThis.WebSocket = WebSocket;

setNetworkId('preprod');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  indexer: 'https://indexer.preprod.midnight.network/api/v3/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  proofServer: process.env.PROOF_SERVER_URL ?? 'http://127.0.0.1:6300',
};

// In Docker: mounted at /app/compiled. Outside Docker: ../deploy/compiled
export const compiledDir = fs.existsSync(path.resolve(__dirname, '..', 'compiled'))
  ? path.resolve(__dirname, '..', 'compiled')
  : path.resolve(__dirname, '..', '..', 'deploy', 'compiled');

export type WalletContext = Awaited<ReturnType<typeof initWallet>>;
let _walletCtx: WalletContext | null = null;

function deriveKeys(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') throw new Error('Invalid seed');
  const result = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (result.type !== 'keysDerived') throw new Error('Key derivation failed');
  hdWallet.hdWallet.clear();
  return result.keys;
}

async function initWallet(seed: string) {
  const keys = deriveKeys(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], 'preprod');

  const walletConfig = {
    networkId: 'preprod' as const,
    indexerClientConnection: {
      indexerHttpUrl: CONFIG.indexer,
      indexerWsUrl: CONFIG.indexerWS,
    },
    provingServerUrl: new URL(CONFIG.proofServer),
    relayURL: new URL(CONFIG.node.replace(/^http/, 'ws')),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
    costParameters: { additionalFeeOverhead: 100_000_000_000n, feeBlocksMargin: 5 },
  };

  const ShieldedWalletClass = ShieldedWallet(walletConfig);
  const UnshieldedWalletClass = UnshieldedWallet(walletConfig);
  const DustWalletClass = DustWallet(walletConfig);

  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    shielded: () => ShieldedWalletClass.startWithSecretKeys(shieldedSecretKeys),
    unshielded: () => UnshieldedWalletClass.startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: () => DustWalletClass.startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });

  await wallet.start(shieldedSecretKeys, dustSecretKey);
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

export function isWalletReady(): boolean {
  return _walletCtx !== null;
}

export function getProviderUnshieldedAddress(): string {
  if (!_walletCtx) throw new Error('Wallet not initialized.');
  // Returns the 64-char hex of the unshielded (NightExternal) public key (SignatureVerifyingKey is a hex string)
  return _walletCtx.unshieldedKeystore.getPublicKey() as string;
}

export async function getWalletContext(): Promise<WalletContext> {
  if (_walletCtx) return _walletCtx;
  throw new Error('Wallet not initialized. Call startWallet() first.');
}

export async function startWallet(): Promise<WalletContext> {
  // Use .seed (original deploy wallet — has tNight + DUST already)
  const seedPath = fs.existsSync(path.resolve('/deploy', '.seed'))
    ? path.resolve('/deploy', '.seed')
    : path.resolve(__dirname, '..', '..', 'deploy', '.seed');
  const seed = process.env.ZKAI_SEED
    ?? (fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf-8').trim() : null);

  console.log(`[wallet] using seed from: ${seedPath} (first 10: ${seed?.slice(0,10)}...)`);
  if (!seed) throw new Error('No seed found. Set ZKAI_SEED env var or create deploy/.seed');

  console.log('Initializing wallet...');
  _walletCtx = await initWallet(seed);

  console.log('Syncing with Midnight preprod (no timeout — will wait until synced)...');
  let lastState: string = '';
  let dotCount = 0;
  const startMs = Date.now();
  await Rx.firstValueFrom(
    _walletCtx.wallet.state().pipe(
      Rx.throttleTime(10000),
      Rx.tap((s: any) => {
        const dust = s.dust?.balance?.(new Date()) ?? 0n;
        const elapsed = Math.round((Date.now() - startMs) / 1000);
        const summary = `isSynced=${s.isSynced} dust=${dust.toString()}`;
        if (summary !== lastState) {
          if (dotCount > 0) { process.stdout.write('\n'); dotCount = 0; }
          console.log(`[wallet:sync] ${summary} (${elapsed}s elapsed)`);
          lastState = summary;
        } else {
          process.stdout.write('.');
          dotCount++;
          if (dotCount % 60 === 0) {
            process.stdout.write(` ${elapsed}s\n`);
          }
        }
      }),
      Rx.filter((s: any) => s.isSynced),
    )
  ).catch((e: any) => {
    console.error('[wallet:sync] failed:', e?.message ?? e);
    throw e;
  });
  const syncedState = await _walletCtx.wallet.waitForSyncedState();
  console.log('\nWallet synced.');

  // Register Night UTXOs for DUST if needed (required for contract transactions)
  const dustBalance = (syncedState as any).dust.balance(new Date());
  if (dustBalance === 0n) {
    const allCoins = (syncedState as any).unshielded.availableCoins ?? [];
    const nightUtxos = allCoins.filter((c: any) => !c.meta?.registeredForDustGeneration);
    const unshieldedBalance = (syncedState as any).unshielded?.balances?.[ledger.unshieldedToken().raw] ?? 0n;
    console.log(`[dust] balance=0, tNight=${unshieldedBalance}, availableCoins=${allCoins.length}, unregistered=${nightUtxos.length}`);
    if (nightUtxos.length > 0) {
      console.log('Registering for DUST generation...');
      const recipe = await _walletCtx.wallet.registerNightUtxosForDustGeneration(
        nightUtxos,
        _walletCtx.unshieldedKeystore.getPublicKey(),
        (payload: Uint8Array) => _walletCtx!.unshieldedKeystore.signData(payload),
      );
      await _walletCtx.wallet.submitTransaction(await _walletCtx.wallet.finalizeRecipe(recipe));
      console.log('DUST registration submitted.');
    } else {
      console.log('[dust] no coins to register — all already registered or no coins');
    }
    // Don't block server startup — DUST will arrive eventually
    console.log('DUST pending (will be ready in a few minutes). Bridge starting now...');
    // Background wait — log when DUST arrives
    Rx.firstValueFrom(
      _walletCtx.wallet.state().pipe(
        Rx.filter((s: any) => s.isSynced && s.dust.balance(new Date()) > 0n),
        Rx.timeout(1800000),
      )
    ).then(() => console.log('DUST ready. Contract transactions now available.'))
     .catch(() => console.warn('DUST not received after 30min — check wallet balance'));
  }

  return _walletCtx;
}

export async function createProviders(walletCtx: WalletContext, zkConfigPath: string) {
  // Capture state snapshot once — same pattern as deploy.ts
  const state = await walletCtx.wallet.waitForSyncedState();
  const cpk = (state as any).shielded?.coinPublicKey;
  const epk = (state as any).shielded?.encryptionPublicKey;
  console.log('[wallet] coinPublicKey type:', typeof cpk, '| value:', cpk?.constructor?.name, '| hex:', cpk?.toHexString?.());
  console.log('[wallet] encPublicKey type:', typeof epk, '| value:', epk?.constructor?.name);
  const walletProvider = {
    getCoinPublicKey: () => (state as any).shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => (state as any).shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signFn = (payload: Uint8Array) => walletCtx.unshieldedKeystore.signData(payload);
      for (const [key, intent] of (recipe.baseTransaction?.intents ?? new Map()).entries()) {
        const cloned = ledger.Intent.deserialize('signature', 'proof', 'pre-binding', intent.serialize());
        const sig = signFn(cloned.signatureData(key));
        if (cloned.fallibleUnshieldedOffer) {
          cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(
            cloned.fallibleUnshieldedOffer.inputs.map((_: any, i: number) =>
              cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? sig)
          );
        }
        recipe.baseTransaction.intents.set(key, cloned);
      }
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'zkai-bridge-state',
      walletProvider,
      privateStoragePasswordProvider: () => 'zkai-bridge-secret-password-2024',
      accountId: walletCtx.unshieldedKeystore.getBech32Address().toString(),
    }),
    publicDataProvider: indexerPublicDataProvider(CONFIG.indexer, CONFIG.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(CONFIG.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}
