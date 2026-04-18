// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProviderRegistry {
    struct Provider {
        string endpoint;
        string model;
        uint256 pricePerToken;
        bool active;
    }

    mapping(address => Provider) public providers;
    address[] public providerList;

    event ProviderRegistered(address indexed provider, string endpoint, string model, uint256 pricePerToken);
    event ProviderDeregistered(address indexed provider);

    function register(string calldata endpoint, string calldata model, uint256 pricePerToken) external {
        if (!providers[msg.sender].active) {
            providerList.push(msg.sender);
        }
        providers[msg.sender] = Provider(endpoint, model, pricePerToken, true);
        emit ProviderRegistered(msg.sender, endpoint, model, pricePerToken);
    }

    function deregister() external {
        providers[msg.sender].active = false;
        emit ProviderDeregistered(msg.sender);
    }

    function getActiveProviders() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < providerList.length; i++) {
            if (providers[providerList[i]].active) count++;
        }
        address[] memory active = new address[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < providerList.length; i++) {
            if (providers[providerList[i]].active) active[j++] = providerList[i];
        }
        return active;
    }
}
