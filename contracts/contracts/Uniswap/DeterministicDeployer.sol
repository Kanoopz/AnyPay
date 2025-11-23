// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DeterministicDeployer
 * @notice Deploys contracts using CREATE2 at addresses calculated from this contract's address
 * @dev This contract must be deployed from the deployer address to ensure hooks deploy at the correct address
 * For Uniswap v4 hooks, the hook address is calculated from the deployer's address, not a factory
 */
contract DeterministicDeployer {
    /**
     * @notice Deploy a contract using CREATE2
     * @param bytecode The bytecode of the contract to deploy
     * @param salt The salt for CREATE2 (32 bytes)
     * @return deployedAddress The address where the contract was deployed
     */
    function deploy(bytes memory bytecode, bytes32 salt) external returns (address deployedAddress) {
        assembly {
            deployedAddress := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(deployedAddress != address(0), "CREATE2 deployment failed");
    }

    /**
     * @notice Calculate the CREATE2 address for a given bytecode and salt
     * @param bytecodeHash The keccak256 hash of the bytecode
     * @param salt The salt for CREATE2 (32 bytes)
     * @return The calculated CREATE2 address (using this contract's address as deployer)
     */
    function computeAddress(bytes32 bytecodeHash, bytes32 salt) external view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                bytecodeHash
            )
        );
        return address(uint160(uint256(hash)));
    }
}

