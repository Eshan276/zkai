# ZKai Architecture

```mermaid
flowchart TB
    subgraph USER["👤 User Side"]
        U1[User Wallet\nMidnight]
        U2[Encrypt Prompt\nProvider TEE pubkey]
        U3[ZK Proof\nof Payment]
    end

    subgraph NET["🌐 Network Layer"]
        N1[Provider Registry\nMidnight Contract]
        N2[Router\nMatches user → provider]
        N3[Reputation Score\nZK Aggregated]
    end

    subgraph PROVIDER["🖥️ Compute Provider"]
        subgraph TEE["🔒 TEE Enclave - Gramine"]
            T1[Decrypt Prompt]
            T2[Qwen / Llama\nInference]
            T3[Encrypt Response]
            T4[Attestation Report\nmodel hash + no leak proof]
        end
        P1[Stake Tokens\nMidnight]
        P2[Register Attestation\non-chain]
    end

    subgraph MIDNIGHT["⛓️ Midnight Chain"]
        M1[Shielded Payment\nDUST token]
        M2[Provider Registry\nCompact contract]
        M3[Attestation Anchor\nhash on-chain]
        M4[Reputation Contract\nZK proofs]
    end

    %% User flow
    U1 -->|pay shielded| M1
    U1 --> U3
    U3 --> U2
    U2 -->|encrypted prompt| N2

    %% Network routing
    N1 --> N2
    N3 --> N2
    N2 -->|route to provider| TEE

    %% TEE flow
    T1 --> T2 --> T3
    T2 --> T4

    %% Provider setup
    P1 --> M2
    P2 --> M3

    %% Response back
    T3 -->|encrypted response| U1
    T4 -->|attestation| M3

    %% Settlement
    M1 -->|release payment| P1
    M3 --> M4
    M4 --> N3

    style TEE fill:#1a1a2e,stroke:#7c3aed,color:#fff
    style MIDNIGHT fill:#0f172a,stroke:#06b6d4,color:#fff
    style USER fill:#1e293b,stroke:#10b981,color:#fff
    style NET fill:#1e293b,stroke:#f59e0b,color:#fff
    style PROVIDER fill:#1e293b,stroke:#ef4444,color:#fff
```

## Flow Summary

1. **User** encrypts prompt with provider's TEE public key + generates ZK payment proof
2. **Router** matches user to best provider (reputation + stake + availability)
3. **TEE Enclave** decrypts, runs Qwen inference, re-encrypts — operator sees nothing
4. **Attestation** posted on Midnight — proves correct model ran, no data leaked
5. **Payment** released from shielded escrow to provider on Midnight

## Key Privacy Guarantees

| What | How |
|------|-----|
| Prompt hidden from provider | TEE encryption |
| Response hidden from network | End-to-end encryption |
| Identity hidden from chain | Midnight shielded tx |
| Payment amount hidden | DUST shielded transfer |
| Correct model proven | TEE attestation + on-chain hash |
```
