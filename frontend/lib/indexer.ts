const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer.preprod.midnight.network/api/v3/graphql';

export interface Provider {
  id: string;
  endpoint: string;
  model: string;
  price: number;
  reputation: number;
  active: boolean;
}

export interface Job {
  id: string;
  provider_id: string;
  amount: number;
  status: 0 | 1 | 2; // Pending | Completed | Refunded
  attestation_hash: string;
  model?: string;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  duration_ms?: number | null;
  cpu_percent?: number | null;
  ram_mb?: number | null;
}

export async function fetchProviders(registryContract: string): Promise<Provider[]> {
  const query = `
    query GetContractState($address: String!) {
      contract(address: $address) {
        state {
          ... on ContractState {
            ledger {
              ... on ZkaiProviderRegistryLedger {
                provider_active { entries { key value } }
                provider_endpoint { entries { key value } }
                provider_model { entries { key value } }
                provider_price { entries { key value } }
                provider_reputation { entries { key value } }
              }
            }
          }
        }
      }
    }
  `;
  const res = await fetch(INDEXER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { address: registryContract } }),
    next: { revalidate: 30 },
  });
  const data = await res.json();
  const ledger = data?.data?.contract?.state?.ledger;
  if (!ledger) return [];

  const active: Record<string, boolean> = Object.fromEntries(
    (ledger.provider_active?.entries ?? []).map((e: any) => [e.key, e.value])
  );
  const endpoints: Record<string, string> = Object.fromEntries(
    (ledger.provider_endpoint?.entries ?? []).map((e: any) => [e.key, e.value])
  );
  const models: Record<string, string> = Object.fromEntries(
    (ledger.provider_model?.entries ?? []).map((e: any) => [e.key, e.value])
  );
  const prices: Record<string, number> = Object.fromEntries(
    (ledger.provider_price?.entries ?? []).map((e: any) => [e.key, Number(e.value)])
  );
  const reps: Record<string, number> = Object.fromEntries(
    (ledger.provider_reputation?.entries ?? []).map((e: any) => [e.key, Number(e.value)])
  );

  return Object.keys(active)
    .filter(id => active[id])
    .map(id => ({
      id,
      endpoint: endpoints[id] ?? '',
      model: models[id] ?? '',
      price: prices[id] ?? 0,
      reputation: (reps[id] ?? 500000) / 1_000_000,
      active: true,
    }));
}

export async function fetchJobs(escrowContract: string): Promise<Job[]> {
  const query = `
    query GetJobs($address: String!) {
      contract(address: $address) {
        state {
          ... on ContractState {
            ledger {
              ... on ZkaiPaymentEscrowLedger {
                job_provider { entries { key value } }
                job_amount { entries { key value } }
                job_status { entries { key value } }
                job_attestation_hash { entries { key value } }
              }
            }
          }
        }
      }
    }
  `;
  const res = await fetch(INDEXER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { address: escrowContract } }),
    next: { revalidate: 10 },
  });
  const data = await res.json();
  const ledger = data?.data?.contract?.state?.ledger;
  if (!ledger) return [];

  const providers: Record<string, string> = Object.fromEntries(
    (ledger.job_provider?.entries ?? []).map((e: any) => [e.key, e.value])
  );
  const amounts: Record<string, number> = Object.fromEntries(
    (ledger.job_amount?.entries ?? []).map((e: any) => [e.key, Number(e.value)])
  );
  const statuses: Record<string, number> = Object.fromEntries(
    (ledger.job_status?.entries ?? []).map((e: any) => [e.key, Number(e.value)])
  );
  const hashes: Record<string, string> = Object.fromEntries(
    (ledger.job_attestation_hash?.entries ?? []).map((e: any) => [e.key, e.value])
  );

  return Object.keys(providers).map(id => ({
    id,
    provider_id: providers[id],
    amount: amounts[id] ?? 0,
    status: (statuses[id] ?? 0) as 0 | 1 | 2,
    attestation_hash: hashes[id] ?? '',
  }));
}
