import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const PRIVATE_KEY = process.env.ZKAI_PRIVATE_KEY ?? '0x' + '0'.repeat(64);

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
  },
  networks: {
    galileo: {
      url: process.env.OG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai',
      chainId: 16602,
      accounts: [PRIVATE_KEY],
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
  },
};

export default config;
