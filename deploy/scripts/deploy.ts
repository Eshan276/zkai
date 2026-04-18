import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying from:', deployer.address);

  const Registry = await ethers.getContractFactory('ProviderRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log('ProviderRegistry:', registryAddr);

  const Escrow = await ethers.getContractFactory('PaymentEscrow');
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log('PaymentEscrow:', escrowAddr);

  const Attestation = await ethers.getContractFactory('AttestationRegistry');
  const attestation = await Attestation.deploy();
  await attestation.waitForDeployment();
  const attestationAddr = await attestation.getAddress();
  console.log('AttestationRegistry:', attestationAddr);

  const deployment = {
    network: '0g-galileo',
    deployedAt: new Date().toISOString(),
    contracts: {
      ProviderRegistry: registryAddr,
      PaymentEscrow: escrowAddr,
      AttestationRegistry: attestationAddr,
    },
  };

  const deploymentPath = path.resolve(__dirname, '..', 'deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log('\nDeployment saved to deployment.json');

  // Extract and save ABIs for bridge use
  const artifactsDir = path.resolve(__dirname, '..', 'artifacts', 'contracts');
  const abisDir = path.resolve(__dirname, '..', 'abis');
  fs.mkdirSync(abisDir, { recursive: true });

  for (const name of ['ProviderRegistry', 'PaymentEscrow', 'AttestationRegistry']) {
    // Hardhat artifacts path uses the source path
    const artifactPath = path.resolve(
      __dirname, '..', 'artifacts', 'contracts',
      `${name}.sol`, `${name}.json`
    );
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
      fs.writeFileSync(path.join(abisDir, `${name}.json`), JSON.stringify(artifact.abi, null, 2));
      console.log(`ABI saved: abis/${name}.json`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
