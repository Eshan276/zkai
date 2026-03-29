// Contract addresses — set via env or deployment.json
export const CONTRACTS = {
  ProviderRegistry: process.env.NEXT_PUBLIC_REGISTRY_CONTRACT ?? '',
  PaymentEscrow: process.env.NEXT_PUBLIC_ESCROW_CONTRACT ?? '',
  AttestationRegistry: process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT ?? '',
};
