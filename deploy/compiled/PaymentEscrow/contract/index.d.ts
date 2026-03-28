import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  createJob(context: __compactRuntime.CircuitContext<PS>,
            job_id_0: Uint8Array,
            provider_id_0: Uint8Array,
            amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  completeJob(context: __compactRuntime.CircuitContext<PS>,
              job_id_0: Uint8Array,
              attestation_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  disputeJob(context: __compactRuntime.CircuitContext<PS>, job_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  createJob(context: __compactRuntime.CircuitContext<PS>,
            job_id_0: Uint8Array,
            provider_id_0: Uint8Array,
            amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  completeJob(context: __compactRuntime.CircuitContext<PS>,
              job_id_0: Uint8Array,
              attestation_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  disputeJob(context: __compactRuntime.CircuitContext<PS>, job_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  createJob(context: __compactRuntime.CircuitContext<PS>,
            job_id_0: Uint8Array,
            provider_id_0: Uint8Array,
            amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  completeJob(context: __compactRuntime.CircuitContext<PS>,
              job_id_0: Uint8Array,
              attestation_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  disputeJob(context: __compactRuntime.CircuitContext<PS>, job_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  job_user: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  job_provider: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  job_amount: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  job_attestation_hash: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  job_status: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
