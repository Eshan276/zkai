import { ZswapSecretKeys } from '@midnight-ntwrk/ledger-v8';
import { ShieldedAddress, ShieldedCoinPublicKey, ShieldedEncryptionPublicKey, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { randomBytes } from 'crypto';

const seed = randomBytes(32);
const seedHex = seed.toString('hex');

const keys = ZswapSecretKeys.fromSeed(seed);

// Unshielded address (for faucet)
const coinPKBytes = Buffer.from(String(keys.coinPublicKey), 'hex');
const unshieldedAddr = new UnshieldedAddress(coinPKBytes);
const unshieldedAddrStr = UnshieldedAddress.codec.encode('preprod', unshieldedAddr).asString();

// Shielded address (for private txs)
const cpk = ShieldedCoinPublicKey.fromHexString(String(keys.coinPublicKey));
const epk = new ShieldedEncryptionPublicKey(Buffer.from(String(keys.encryptionPublicKey), 'hex'));
const shieldedAddr = new ShieldedAddress(cpk, epk);
const shieldedAddrStr = ShieldedAddress.codec.encode('preprod', shieldedAddr).asString();

console.log('╔══════════════════════════════════════╗');
console.log('║     ZKai Midnight Wallet Keygen      ║');
console.log('╚══════════════════════════════════════╝\n');
console.log('⚠  SAVE YOUR SEED — this is your only recovery key\n');
console.log('Seed:');
console.log(seedHex);
console.log('');
console.log('Unshielded address (paste in faucet):');
console.log(unshieldedAddrStr);
console.log('');
console.log('Shielded address (for private transactions):');
console.log(shieldedAddrStr);
