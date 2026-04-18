// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PaymentEscrow {
    mapping(address => uint256) public balance;
    mapping(bytes32 => uint256) public jobAmount;
    mapping(bytes32 => address) public jobWallet;
    mapping(bytes32 => address) public jobProvider;

    event Deposited(address indexed user, uint256 amount);
    event Deducted(bytes32 indexed jobId, address indexed wallet, address indexed provider, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function deposit() external payable {
        require(msg.value > 0, "Must deposit non-zero amount");
        balance[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function deductBalance(
        address walletAddr,
        address providerId,
        bytes32 jobId,
        uint256 amount
    ) external {
        require(balance[walletAddr] >= amount, "Insufficient balance");
        balance[walletAddr] -= amount;
        jobAmount[jobId] = amount;
        jobWallet[jobId] = walletAddr;
        jobProvider[jobId] = providerId;
        (bool ok, ) = payable(providerId).call{value: amount}("");
        require(ok, "Transfer to provider failed");
        emit Deducted(jobId, walletAddr, providerId, amount);
    }

    function withdraw(uint256 amount) external {
        require(balance[msg.sender] >= amount, "Insufficient balance");
        balance[msg.sender] -= amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }
}
