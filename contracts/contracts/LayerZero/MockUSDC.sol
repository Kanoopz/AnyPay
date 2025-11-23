// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice ERC20 token that can only be minted by the owner/admin
 * @dev Inherits from OpenZeppelin's ERC20 and Ownable contracts
 */
contract MockUSDC is ERC20, Ownable {
    /**
     * @notice Constructor that sets the token name, symbol, and initial owner
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     * @param _owner The address that will own the contract (can mint tokens)
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner
    ) ERC20(_name, _symbol) Ownable(_owner) {
        // Owner is set in Ownable constructor
    }

    /**
     * @notice Mints tokens to a specified address
     * @dev Only the owner/admin can call this function
     * @param _to The address to mint tokens to
     * @param _amount The amount of tokens to mint
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }
}

