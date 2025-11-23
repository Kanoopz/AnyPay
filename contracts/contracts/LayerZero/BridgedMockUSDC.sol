// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BridgedMockUSDC
 * @notice ERC20 token that can only be minted by the owner/admin
 * @dev Inherits from OpenZeppelin's ERC20 and Ownable contracts
 */
contract BridgedMockUSDC is ERC20, Ownable {
    /// @notice Manager address with burn privileges
    address public manager;

    /// @notice Event emitted when manager is changed
    event ManagerChanged(address indexed oldManager, address indexed newManager);

    /**
     * @notice Constructor that sets the token name, symbol, initial owner, and manager
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     * @param _owner The address that will own the contract (can mint tokens)
     * @param _manager The address that will be the manager (can burn tokens)
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner,
        address _manager
    ) ERC20(_name, _symbol) Ownable(_owner) {
        require(_manager != address(0), "BridgedMockUSDC: manager cannot be zero address");
        manager = _manager;
        emit ManagerChanged(address(0), _manager);
    }

    /**
     * @notice Mints tokens to a specified address
     * @dev Only the owner/admin or manager can call this function
     * @param _to The address to mint tokens to
     * @param _amount The amount of tokens to mint
     */
    function mint(address _to, uint256 _amount) external {
        require(
            msg.sender == owner() || msg.sender == manager,
            "BridgedMockUSDC: only owner or manager can mint"
        );
        _mint(_to, _amount);
    }

    /**
     * @notice Burns tokens from a specified address
     * @dev Only the manager can call this function
     * @param _from The address to burn tokens from
     * @param _amount The amount of tokens to burn
     */
    function burn(address _from, uint256 _amount) external {
        require(msg.sender == manager, "BridgedMockUSDC: only manager can burn");
        _burn(_from, _amount);
    }
    
    /**
     * @notice Sets a new manager address
     * @dev Only the owner can call this function
     * @param _newManager The address of the new manager
     */
    function setManager(address _newManager) external onlyOwner {
        require(_newManager != address(0), "BridgedMockUSDC: manager cannot be zero address");
        address oldManager = manager;
        manager = _newManager;
        emit ManagerChanged(oldManager, _newManager);
    }
}

