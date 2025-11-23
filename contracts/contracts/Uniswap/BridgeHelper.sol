// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { SourceBridge } from "../LayerZero/SourceBridge.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BridgeHelper
 * @notice Helper contract that bridges USDC after a Uniswap swap
 * @dev Users can call this after swapping to automatically bridge their USDC
 */
contract BridgeHelper {
    using SafeERC20 for IERC20;

    /// @notice The SourceBridge contract
    SourceBridge public immutable sourceBridge;

    /// @notice The USDC token address
    IERC20 public immutable usdcToken;

    /// @notice Destination endpoint ID (Optimism Sepolia)
    uint32 public immutable dstEid;

    /// @notice Event emitted when tokens are bridged
    event TokensBridged(
        address indexed user,
        uint256 amount,
        uint32 dstEid,
        address recipient
    );

    /**
     * @notice Constructor
     * @param _sourceBridge The SourceBridge contract address
     * @param _usdcToken The USDC token address
     * @param _dstEid Destination endpoint ID (Optimism Sepolia = 40232)
     */
    constructor(
        SourceBridge _sourceBridge,
        IERC20 _usdcToken,
        uint32 _dstEid
    ) {
        require(address(_sourceBridge) != address(0), "BridgeHelper: invalid sourceBridge");
        require(address(_usdcToken) != address(0), "BridgeHelper: invalid usdcToken");
        require(_dstEid != 0, "BridgeHelper: invalid dstEid");
        
        sourceBridge = _sourceBridge;
        usdcToken = _usdcToken;
        dstEid = _dstEid;
    }

    /**
     * @notice Bridges USDC to Optimism
     * @param amount Amount of USDC to bridge (0 = bridge all balance)
     * @param recipient Address on destination chain to receive bridged tokens
     */
    function bridgeUSDC(uint256 amount, address recipient) external payable {
        address user = msg.sender;
        
        // If amount is 0, bridge the user's entire USDC balance
        if (amount == 0) {
            amount = usdcToken.balanceOf(user);
        }
        
        require(amount > 0, "BridgeHelper: no USDC to bridge");
        require(recipient != address(0), "BridgeHelper: invalid recipient");

        // Transfer USDC from user to this contract
        usdcToken.safeTransferFrom(user, address(this), amount);
        
        // Approve SourceBridge to spend USDC
        // Use forceApprove for OpenZeppelin v5 (safeApprove was deprecated)
        SafeERC20.forceApprove(usdcToken, address(sourceBridge), amount);
        
        // Bridge the USDC
        sourceBridge.lockAndBridge{value: msg.value}(
            amount,
            dstEid,
            recipient
        );
        
        emit TokensBridged(user, amount, dstEid, recipient);
    }

    /**
     * @notice Allows the contract to receive ETH for bridge fees
     */
    receive() external payable {}
}

