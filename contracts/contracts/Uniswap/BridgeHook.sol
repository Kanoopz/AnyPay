// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { BaseHook } from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { BalanceDelta, BalanceDeltaLibrary } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { BridgeHelper } from "./BridgeHelper.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title BridgeHook
 * @notice Uniswap v4 hook that automatically bridges USDC to Optimism after a swap
 * @dev This hook implements afterSwap to detect when USDC is received and bridge it
 */
contract BridgeHook is BaseHook {
    /// @notice The BridgeHelper contract for bridging tokens
    BridgeHelper public immutable bridgeHelper;

    /// @notice The USDC token address (MockUSDC on Arbitrum Sepolia)
    IERC20 public immutable usdcToken;

    /// @notice Mapping to track pending bridge amounts per user
    mapping(address => uint256) public pendingBridgeAmounts;

    /// @notice Event emitted when tokens are bridged after a swap
    event TokensBridgedAfterSwap(
        address indexed swapper,
        uint256 amount,
        uint32 dstEid,
        address recipient
    );

    /**
     * @notice Constructor
     * @param _poolManager The Uniswap v4 PoolManager contract
     * @param _bridgeHelper The BridgeHelper contract address
     * @param _usdcToken The USDC token address
     */
    constructor(
        IPoolManager _poolManager,
        BridgeHelper _bridgeHelper,
        IERC20 _usdcToken
    ) BaseHook(_poolManager) {
        require(address(_bridgeHelper) != address(0), "BridgeHook: invalid bridgeHelper");
        require(address(_usdcToken) != address(0), "BridgeHook: invalid usdcToken");
        
        bridgeHelper = _bridgeHelper;
        usdcToken = _usdcToken;
    }

    /**
     * @notice Returns the hook permissions
     * @return permissions The hook permissions flags
     */
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,  // We don't need afterInitialize, but implement it as no-op
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,  // We need afterSwap permission
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /**
     * @notice Hook called before pool initialization (no-op implementation)
     * @dev Even though we don't use beforeInitialize, we implement it as a no-op
     *      to prevent any potential issues during pool initialization
     * @return selector The function selector
     */
    function _beforeInitialize(
        address /*sender*/,
        PoolKey calldata /*key*/,
        uint160 /*sqrtPriceX96*/
    ) internal override returns (bytes4) {
        // No-op: We don't need to do anything before initialization
        return this.beforeInitialize.selector;
    }

    /**
     * @notice Hook called after pool initialization (no-op implementation)
     * @dev Even though we don't use afterInitialize, we implement it as a no-op
     *      to prevent any potential issues during pool initialization
     * @return selector The function selector
     */
    function _afterInitialize(
        address /*sender*/,
        PoolKey calldata /*key*/,
        uint160 /*sqrtPriceX96*/,
        int24 /*tick*/
    ) internal override returns (bytes4) {
        // No-op: We don't need to do anything during initialization
        return this.afterInitialize.selector;
    }

    /**
     * @notice Hook called after a swap
     * @param sender The address that initiated the swap
     * @param key The pool key
     * @param delta Balance delta from the swap
     * @param hookData Additional hook data (can contain recipient address for bridging)
     * @return selector The function selector
     * @return hookDelta Additional delta to apply (0 in our case)
     */
    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata /*params*/,
        BalanceDelta delta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        // Determine which currency is USDC and extract delta
        address currency0Addr = Currency.unwrap(key.currency0);
        address currency1Addr = Currency.unwrap(key.currency1);
        
        // Check if this pool involves USDC
        if (currency0Addr != address(usdcToken) && currency1Addr != address(usdcToken)) {
            return (this.afterSwap.selector, 0);
        }

        // Extract USDC delta (positive = received, negative = sent)
        int128 usdcDelta = currency0Addr == address(usdcToken) 
            ? BalanceDeltaLibrary.amount0(delta) 
            : BalanceDeltaLibrary.amount1(delta);
        
        if (usdcDelta <= 0) {
            return (this.afterSwap.selector, 0);
        }

        // Extract recipient from hookData (required - swapper specifies recipient on target chain)
        require(hookData.length >= 20, "BridgeHook: recipient required in hookData");
        address recipient;
        assembly {
            recipient := calldataload(add(hookData.offset, 0))
        }
        require(recipient != address(0), "BridgeHook: invalid recipient");

        uint256 usdcAmount = uint128(usdcDelta);
        pendingBridgeAmounts[sender] += usdcAmount;
        emit TokensBridgedAfterSwap(sender, usdcAmount, 0, recipient);
        
        // Attempt automatic bridging: swapper's allowance, but bridge to recipient
        if (usdcToken.allowance(sender, address(bridgeHelper)) >= usdcAmount) {
            try bridgeHelper.bridgeUSDC{value: 0}(usdcAmount, recipient) {
                pendingBridgeAmounts[sender] -= usdcAmount;
            } catch {}
        }

        return (this.afterSwap.selector, 0);
    }

    /**
     * @notice Get pending bridge amount for a user
     * @param user The user address
     * @return amount The pending bridge amount
     */
    function getPendingBridgeAmount(address user) external view returns (uint256) {
        return pendingBridgeAmounts[user];
    }
}

