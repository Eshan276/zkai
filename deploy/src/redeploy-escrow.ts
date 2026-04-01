/**
 * Redeploy only PaymentEscrow, preserving other contract addresses.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as Rx from 'rxjs';
import { Buffer } from 'buffer';
import { WebSocket } from 'ws';

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
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
import { CompiledContract } from '@midnight-ntwrk/compact-js';

// @ts-expect-error
globalThis.WebSocket = WebSocket;

setNetworkId('preprod');

const CONFIG = {
  indexer: 'https://indexer.preprod.midnight.network/api/v3/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  proofServer: 'http://127.0.0.1:6300',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compiledDir = path.resolve(__dirname, '..', 'compiled');

async function loadContract(name: string) {
  const contractPath = path.join(compiledDir, name, 'contract', 'index.js');
  const mod = await import(pathToFileURL(contractPath).href);
  return CompiledContract.make(name.toLowerCase(), mod.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(path.join(compiledDir, name)),
  );
}

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

async function createWallet(seed: string) {
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
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  };

  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    shielded: () => ShieldedWallet(walletConfig).startWithSecretKeys(shieldedSecretKeys),
    unshielded: () => UnshieldedWallet(walletConfig).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: () => DustWallet(walletConfig).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });

  await wallet.start(shieldedSecretKeys, dustSecretKey);
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

async function createProviders(walletCtx: Awaited<ReturnType<typeof createWallet>>, zkConfigPath: string) {
  const state = await walletCtx.wallet.waitForSyncedState();
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
      privateStateStoreName: 'zkai-escrow-redeploy-state',
      walletProvider,
      privateStoragePasswordProvider: () => 'zkai-deploy-secret-password-2024',
      accountId: walletCtx.unshieldedKeystore.getBech32Address().toString(),
    }),
    publicDataProvider: indexerPublicDataProvider(CONFIG.indexer, CONFIG.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(CONFIG.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

async function main() {
  const seedPath = path.resolve(__dirname, '..', '.seed');
  if (!fs.existsSync(seedPath)) {
    console.error('ERROR: .seed file not found at', seedPath);
    process.exit(1);
  }
  const seed = fs.readFileSync(seedPath, 'utf-8').trim();

  console.log('\nCreating wallet...');
  const walletCtx = await createWallet(seed);

  console.log('Syncing with Midnight preprod...');
  const state = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(5000),
      Rx.tap(() => process.stdout.write('.')),
      Rx.filter((s: any) => s.isSynced),
      Rx.timeout(300000),
    )
  );

  const address = walletCtx.unshieldedKeystore.getBech32Address();
  const balance = (state as any).unshielded.balances[ledger.unshieldedToken().raw] ?? 0n;
  console.log(`\nAddress: ${address}`);
  console.log(`Balance: ${balance.toLocaleString()} tNight\n`);

  if (balance === 0n) {
    console.error('No balance! Fund at: https://faucet.preprod.midnight.network/');
    process.exit(1);
  }

  console.log('Deploying PaymentEscrow...');
  const zkConfigPath = path.join(compiledDir, 'PaymentEscrow');
  const providers = await createProviders(walletCtx, zkConfigPath);
  const compiledContract = await loadContract('PaymentEscrow');

  const result = await deployContract(providers, {
    compiledContract,
    privateStateId: 'paymentescrow-redeploy-state',
    initialPrivateState: {},
  });

  const newAddr = result.deployTxData.public.contractAddress;
  console.log(`\nPaymentEscrow deployed: ${newAddr}`);

  // Update deployment.json
  const deploymentPath = path.resolve(__dirname, '..', 'deployment.json');
  const existing = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  existing.contracts.PaymentEscrow = newAddr;
  existing.deployedAt = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(existing, null, 2));
  console.log('Updated deployment.json');

  await walletCtx.wallet.stop();
}

main().catch(console.error);
