// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AttestationRegistry {
    mapping(bytes32 => bytes32) public attestations;

    event AttestationPosted(bytes32 indexed jobId, bytes32 attestationHash);

    function postAttestation(bytes32 jobId, bytes32 attestationHash) external {
        attestations[jobId] = attestationHash;
        emit AttestationPosted(jobId, attestationHash);
    }
}
