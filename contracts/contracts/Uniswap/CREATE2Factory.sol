// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CREATE2Factory
 * @notice Simple factory contract for deploying contracts using CREATE2
 * @dev This allows deterministic contract deployment at a specific address
 * Supports deploying at addresses calculated from a different deployer address
 */
contract CREATE2Factory {
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
     * @return The calculated CREATE2 address (using this factory's address)
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

    /**
     * @notice Calculate the CREATE2 address for a given bytecode, salt, and deployer address
     * @param bytecodeHash The keccak256 hash of the bytecode
     * @param salt The salt for CREATE2 (32 bytes)
     * @param deployerAddress The address to use in CREATE2 calculation (for Uniswap v4 hooks)
     * @return The calculated CREATE2 address (using the specified deployer address)
     */
    function computeAddressFromDeployer(
        bytes32 bytecodeHash,
        bytes32 salt,
        address deployerAddress
    ) external pure returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                deployerAddress,
                salt,
                bytecodeHash
            )
        );
        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Deploy a contract using CREATE2 at an address calculated from a different deployer
     * @dev This is a helper that calculates the address but still deploys from this factory
     * For true deployer-based CREATE2, you need to deploy from that address directly
     * @param bytecode The bytecode of the contract to deploy
     * @param salt The salt for CREATE2 (32 bytes)
     * @param expectedDeployer The address that should be used in CREATE2 calculation
     * @return deployedAddress The address where the contract was deployed
     * @return calculatedAddress The address calculated from expectedDeployer
     */
    function deployWithExpectedAddress(
        bytes memory bytecode,
        bytes32 salt,
        address expectedDeployer
    ) external returns (address deployedAddress, address calculatedAddress) {
        bytes32 bytecodeHash = keccak256(bytecode);
        calculatedAddress = this.computeAddressFromDeployer(bytecodeHash, salt, expectedDeployer);
        
        // Deploy using CREATE2 (will deploy at factory-based address)
        assembly {
            deployedAddress := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(deployedAddress != address(0), "CREATE2 deployment failed");
        
        // Note: deployedAddress will be different from calculatedAddress
        // because factory uses its own address, not expectedDeployer
    }
}

