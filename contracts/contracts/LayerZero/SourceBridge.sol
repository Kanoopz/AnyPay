// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { OApp, MessagingFee, MessagingReceipt, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/**
 * @title SourceBridge
 * @notice OApp contract on source chain that locks tokens and sends cross-chain messages
 * @dev When tokens are locked, sends a message to target chain to mint bridged tokens
 *      When receiving unlock message from target chain, releases locked tokens
 */
contract SourceBridge is OApp, OAppOptionsType3 {
    using SafeERC20 for IERC20;
    using OptionsBuilder for bytes;

    /// @notice The token contract address
    IERC20 public immutable token;

    /// @notice Mapping to track locked amounts per user
    mapping(address => uint256) public lockedBalances;

    /// @notice Event emitted when tokens are locked and message sent
    event TokensLocked(address indexed user, uint256 amount, uint32 dstEid, address recipient);

    /// @notice Event emitted when tokens are unlocked
    event TokensUnlocked(address indexed user, uint256 amount);

    /**
     * @notice Constructor
     * @param _endpoint LayerZero endpoint address
     * @param _delegate Delegate address for OApp configuration
     * @param _owner Owner address
     * @param _token Token address
     */
    constructor(
        address _endpoint,
        address _delegate,
        address _owner,
        address _token
    ) OApp(_endpoint, _delegate) Ownable(_owner) {
        require(_token != address(0), "SourceBridge: invalid token address");
        token = IERC20(_token);
    }

    /**
     * @notice Locks tokens and sends a message to target chain to mint bridged tokens
     * @param _amount Amount of tokens to lock
     * @param _dstEid Destination endpoint ID (target chain)
     * @param _recipient Address on target chain to receive bridged tokens
     * @return receipt Messaging receipt from LayerZero
     */
    function lockAndBridge(
        uint256 _amount,
        uint32 _dstEid,
        address _recipient
    ) external payable returns (MessagingReceipt memory receipt) {
        require(_amount > 0, "SourceBridge: amount must be greater than 0");
        require(_recipient != address(0), "SourceBridge: invalid recipient");

        // Transfer tokens from user to this contract (lock them)
        token.safeTransferFrom(msg.sender, address(this), _amount);
        lockedBalances[msg.sender] += _amount;

        // Encode the message: recipient address and amount
        bytes memory payload = abi.encode(_recipient, _amount);

        // Build options with gas limit for lzReceive
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(200000, 0);

        // Quote the messaging fee
        MessagingFee memory fee = _quote(_dstEid, payload, options, false);

        // Verify sufficient native token for fees
        require(msg.value >= fee.nativeFee, "SourceBridge: insufficient native fee");

        // Send the message
        receipt = _lzSend(_dstEid, payload, options, fee, payable(msg.sender));

        emit TokensLocked(msg.sender, _amount, _dstEid, _recipient);

        // Refund excess native token
        if (msg.value > fee.nativeFee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fee.nativeFee}("");
            require(success, "SourceBridge: refund failed");
        }

        return receipt;
    }

    /**
     * @notice Receives unlock message from target chain and releases locked tokens
     * @param _payload Encoded message containing user address and amount
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode the payload: user address and amount
        (address user, uint256 amount) = abi.decode(_payload, (address, uint256));

        require(lockedBalances[user] >= amount, "SourceBridge: insufficient locked balance");

        // Unlock tokens
        lockedBalances[user] -= amount;
        token.safeTransfer(user, amount);

        emit TokensUnlocked(user, amount);
    }

    /**
     * @notice Get quote for locking and bridging tokens
     * @param _amount Amount of tokens to bridge
     * @param _dstEid Destination endpoint ID
     * @return fee The messaging fee required
     */
    function quoteLockAndBridge(
        uint256 _amount,
        uint32 _dstEid,
        address _recipient
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(_recipient, _amount);
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(200000, 0);
        return _quote(_dstEid, payload, options, false);
    }
}

