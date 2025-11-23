// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { OApp, MessagingFee, MessagingReceipt, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { BridgedMockUSDC } from "./BridgedMockUSDC.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/**
 * @title TargetBridge
 * @notice OApp contract on target chain that mints and burns bridged tokens
 * @dev When receiving message from source chain, mints bridged tokens to recipient
 *      When user wants to bridge back, burns bridged tokens and sends unlock message to source chain
 */
contract TargetBridge is OApp, OAppOptionsType3 {
    using OptionsBuilder for bytes;
    /// @notice The bridged token contract address
    BridgedMockUSDC public immutable bridgedToken;

    /// @notice Event emitted when bridged tokens are minted
    event TokensMinted(address indexed recipient, uint256 amount);

    /// @notice Event emitted when bridged tokens are burned and unlock message sent
    event TokensBurned(address indexed user, uint256 amount, uint32 dstEid);

    /**
     * @notice Constructor
     * @param _endpoint LayerZero endpoint address
     * @param _delegate Delegate address for OApp configuration
     * @param _owner Owner address
     * @param _bridgedToken Bridged token address
     */
    constructor(
        address _endpoint,
        address _delegate,
        address _owner,
        address _bridgedToken
    ) OApp(_endpoint, _delegate) Ownable(_owner) {
        require(_bridgedToken != address(0), "TargetBridge: invalid bridged token address");
        bridgedToken = BridgedMockUSDC(_bridgedToken);
    }

    /**
     * @notice Receives message from source chain and mints bridged tokens to recipient
     * @param _payload Encoded message containing recipient address and amount
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode the payload: recipient address and amount
        (address recipient, uint256 amount) = abi.decode(_payload, (address, uint256));

        // Mint bridged tokens to the recipient
        // The manager (this contract) needs to be set as manager in the bridged token
        bridgedToken.mint(recipient, amount);

        emit TokensMinted(recipient, amount);
    }

    /**
     * @notice Burns bridged tokens and sends unlock message to source chain
     * @param _amount Amount of tokens to burn
     * @param _dstEid Destination endpoint ID (source chain)
     * @param _user Address on source chain to unlock tokens for
     * @return receipt Messaging receipt from LayerZero
     */
    function burnAndUnlock(
        uint256 _amount,
        uint32 _dstEid,
        address _user
    ) external payable returns (MessagingReceipt memory receipt) {
        require(_amount > 0, "TargetBridge: amount must be greater than 0");
        require(_user != address(0), "TargetBridge: invalid user address");

        // Burn bridged tokens from the caller
        // The manager (this contract) needs to be set as manager in the bridged token
        bridgedToken.burn(msg.sender, _amount);

        // Encode the message: user address and amount
        bytes memory payload = abi.encode(_user, _amount);

        // Build options with gas limit for lzReceive
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(200000, 0);

        // Quote the messaging fee
        MessagingFee memory fee = _quote(_dstEid, payload, options, false);

        // Verify sufficient native token for fees
        require(msg.value >= fee.nativeFee, "TargetBridge: insufficient native fee");

        // Send the unlock message to source chain
        receipt = _lzSend(_dstEid, payload, options, fee, payable(msg.sender));

        emit TokensBurned(msg.sender, _amount, _dstEid);

        // Refund excess native token
        if (msg.value > fee.nativeFee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fee.nativeFee}("");
            require(success, "TargetBridge: refund failed");
        }

        return receipt;
    }

    /**
     * @notice Get quote for burning and unlocking tokens
     * @param _amount Amount of tokens to bridge back
     * @param _dstEid Destination endpoint ID (source chain)
     * @param _user Address on source chain to unlock tokens for
     * @return fee The messaging fee required
     */
    function quoteBurnAndUnlock(
        uint256 _amount,
        uint32 _dstEid,
        address _user
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(_user, _amount);
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(200000, 0);
        return _quote(_dstEid, payload, options, false);
    }
}

