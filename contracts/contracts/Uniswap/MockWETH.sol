// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockWETH
 * @notice A mock Wrapped ETH (WETH) token for testing
 * @dev Allows wrapping ETH to WETH and unwrapping WETH to ETH
 */
contract MockWETH is ERC20, Ownable {
    /// @notice Event emitted when ETH is deposited and WETH is minted
    event Deposit(address indexed account, uint256 amount);

    /// @notice Event emitted when WETH is burned and ETH is withdrawn
    event Withdrawal(address indexed account, uint256 amount);

    /**
     * @notice Constructor
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     * @param _owner The address that will own the contract (can mint tokens)
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner
    ) ERC20(_name, _symbol) Ownable(_owner) {
        // No initial supply
    }

    /**
     * @notice Deposit ETH and receive WETH
     * @dev Mints WETH tokens equal to the amount of ETH sent
     */
    function deposit() external payable {
        require(msg.value > 0, "MockWETH: must send ETH");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw ETH by burning WETH
     * @param amount The amount of WETH to burn and ETH to receive
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "MockWETH: amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "MockWETH: insufficient balance");
        
        _burn(msg.sender, amount);
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "MockWETH: ETH transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @notice Mints WETH tokens to a specified address
     * @dev Only the owner/admin can call this function
     * @param _to The address to mint tokens to
     * @param _amount The amount of tokens to mint
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    /**
     * @notice Fallback function to allow direct ETH deposits
     */
    receive() external payable {
        require(msg.value > 0, "MockWETH: must send ETH");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }
}

