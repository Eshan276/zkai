import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  registerProvider(context: __compactRuntime.CircuitContext<PS>,
                   provider_id_0: Uint8Array,
                   pubkey_0: Uint8Array,
                   endpoint_0: string,
                   model_0: string,
                   price_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  deregisterProvider(context: __compactRuntime.CircuitContext<PS>,
                     provider_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  updateReputation(context: __compactRuntime.CircuitContext<PS>,
                   provider_id_0: Uint8Array,
                   new_rep_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerProvider(context: __compactRuntime.CircuitContext<PS>,
                   provider_id_0: Uint8Array,
                   pubkey_0: Uint8Array,
                   endpoint_0: string,
                   model_0: string,
                   price_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  deregisterProvider(context: __compactRuntime.CircuitContext<PS>,
                     provider_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  updateReputation(context: __compactRuntime.CircuitContext<PS>,
                   provider_id_0: Uint8Array,
                   new_rep_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerProvider(context: __compactRuntime.CircuitContext<PS>,
                   provider_id_0: Uint8Array,
                   pubkey_0: Uint8Array,
                   endpoint_0: string,
                   model_0: string,
                   price_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  deregisterProvider(context: __compactRuntime.CircuitContext<PS>,
                     provider_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  updateReputation(context: __compactRuntime.CircuitContext<PS>,
                   provider_id_0: Uint8Array,
                   new_rep_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly provider_count: bigint;
  provider_pubkey: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  provider_endpoint: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): string;
    [Symbol.iterator](): Iterator<[Uint8Array, string]>
  };
  provider_model: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): string;
    [Symbol.iterator](): Iterator<[Uint8Array, string]>
  };
  provider_price: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  provider_reputation: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  provider_active: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  provider_owner: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
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
