import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  postAttestation(context: __compactRuntime.CircuitContext<PS>,
                  job_id_0: Uint8Array,
                  attestation_hash_0: Uint8Array,
                  model_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approveModel(context: __compactRuntime.CircuitContext<PS>,
               model_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeModel(context: __compactRuntime.CircuitContext<PS>,
              model_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  postAttestation(context: __compactRuntime.CircuitContext<PS>,
                  job_id_0: Uint8Array,
                  attestation_hash_0: Uint8Array,
                  model_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approveModel(context: __compactRuntime.CircuitContext<PS>,
               model_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeModel(context: __compactRuntime.CircuitContext<PS>,
              model_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  postAttestation(context: __compactRuntime.CircuitContext<PS>,
                  job_id_0: Uint8Array,
                  attestation_hash_0: Uint8Array,
                  model_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approveModel(context: __compactRuntime.CircuitContext<PS>,
               model_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeModel(context: __compactRuntime.CircuitContext<PS>,
              model_hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  att_hash: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  att_model: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  att_provider: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  approved_models: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
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
