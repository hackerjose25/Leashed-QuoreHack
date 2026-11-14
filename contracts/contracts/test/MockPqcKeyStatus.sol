// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test stand-in for the QoreChain pqcKeyStatus precompile (installed at 0x…0A02 with hardhat_setCode).
contract MockPqcKeyStatus {
    mapping(address => bool) public registered;

    function set(address account, bool value) external {
        registered[account] = value;
    }

    function pqcKeyStatus(address account) external view returns (bool, uint8, bytes memory) {
        return registered[account] ? (true, uint8(1), new bytes(2592)) : (false, uint8(0), new bytes(0));
    }
}
