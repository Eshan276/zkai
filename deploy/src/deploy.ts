import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
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

// @ts-expect-error WebSocket for GraphQL subscriptions
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
      // Sign intents
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
    privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: 'zkai-state', walletProvider, privateStoragePasswordProvider: () => 'zkai-deploy-secret-password-2024', accountId: walletCtx.unshieldedKeystore.getBech32Address().toString() }),
    publicDataProvider: indexerPublicDataProvider(CONFIG.indexer, CONFIG.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(CONFIG.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   ZKai Contract Deployment — Preprod     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Read seed from .seed file or prompt
  let seed: string;
  const envPath = path.resolve(__dirname, '..', '.seed');
  if (fs.existsSync(envPath)) {
    seed = fs.readFileSync(envPath, 'utf-8').trim();
    console.log('Loaded seed from .seed file\n');
  } else {
    seed = await rl.question('Enter your wallet seed (64 hex chars): ');
  }
  rl.close();

  console.log('\nCreating wallet...');
  const walletCtx = await createWallet(seed.trim());

  console.log('Syncing with Midnight preprod (can take 1-2 min)...');
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
    console.log('⚠  No balance! Fund your wallet first:');
    console.log('   https://faucet.preprod.midnight.network/');
    console.log(`   Address: ${address}`);
    process.exit(1);
  }

  // Register for DUST generation if needed
  const dustBalance = (state as any).dust.balance(new Date());
  if (dustBalance === 0n) {
    console.log('Registering for DUST generation...');
    const nightUtxos = (state as any).unshielded.availableCoins.filter(
      (c: any) => !c.meta?.registeredForDustGeneration
    );
    if (nightUtxos.length > 0) {
      const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
        nightUtxos,
        walletCtx.unshieldedKeystore.getPublicKey(),
        (payload: Uint8Array) => walletCtx.unshieldedKeystore.signData(payload),
      );
      await walletCtx.wallet.submitTransaction(await walletCtx.wallet.finalizeRecipe(recipe));
    }
    console.log('Waiting for DUST tokens (can take a few minutes)...');
    await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(10000),
        Rx.tap(() => process.stdout.write('.')),
        Rx.filter((s: any) => s.isSynced && s.dust.balance(new Date()) > 0n),
        Rx.timeout(300000),
      )
    );
    console.log('\nDUST tokens ready!\n');
  }

  const contracts = ['ProviderRegistry', 'PaymentEscrow', 'AttestationRegistry'];
  const deployed: Record<string, string> = {};

  for (const name of contracts) {
    console.log(`\nDeploying ${name}...`);
    const compiledContract = await loadContract(name);
    const zkConfigPath = path.join(compiledDir, name);
    const providers = await createProviders(walletCtx, zkConfigPath);

    const result = await deployContract(providers, {
      compiledContract,
      privateStateId: `${name.toLowerCase()}-state`,
      initialPrivateState: {},
    });

    const addr = result.deployTxData.public.contractAddress;
    deployed[name] = addr;
    console.log(`✅ ${name}: ${addr}`);
  }

  fs.writeFileSync(
    path.join(__dirname, '..', 'deployment.json'),
    JSON.stringify({ network: 'preprod', deployedAt: new Date().toISOString(), contracts: deployed }, null, 2)
  );

  console.log('\n✅ All contracts deployed! Saved to deployment.json');
  await walletCtx.wallet.stop();
}

main().catch(console.error);
