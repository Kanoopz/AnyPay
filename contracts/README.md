# AnyPay Smart Contracts

## Overview

AnyPay enables seamless cross-chain and cross-asset cryptocurrency payments through NFC technology. This directory contains the smart contracts that power the underlying infrastructure, leveraging **Layer Zero** for cross-chain messaging and **Uniswap** for asset swaps.

## How It Works

### The User Experience

From the user's perspective, AnyPay is simple:
- **Sender**: Chooses an asset and chain to send from (e.g., ETH on Arbitrum)
- **Recipient**: Chooses an asset and chain to receive on (e.g., USDC on Optimism)
- **NFC Tap**: Payment details are exchanged via NFC
- **Magic Happens**: The recipient receives their preferred asset on their preferred chain

### The Technical Magic

Behind the scenes, AnyPay orchestrates a complex multi-step process:

#### 1. **Cross-Chain Asset Transfer (Layer Zero)**
When you send ETH on Arbitrum but the recipient wants USDC on Optimism:
- **Source Bridge Contract** (Arbitrum): Locks the sender's asset on the source chain
- **Layer Zero Omnichain Protocol**: Securely passes messages between chains using a decentralized validator network
- **Target Bridge Contract** (Optimism): Receives the cross-chain message and prepares to release funds

#### 2. **Asset Swapping (Uniswap)**
If the asset needs to be converted (e.g., ETH → USDC):
- **Uniswap Integration**: Automatically routes through Uniswap's DEX to swap assets at optimal rates
- **Multi-Chain Routing**: Finds the best swap path across different chains and liquidity pools
- **Slippage Protection**: Ensures fair exchange rates with built-in slippage protection

#### 3. **Bridge Execution**
- **Bridge Hook Contract**: Handles the logic for bridging assets between chains
- **Bridge Helper Contract**: Provides utility functions for cross-chain operations
- **Omnichain Protocol**: Layer Zero's infrastructure handles the actual asset bridging

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (NFC)                      │
│              Payment details exchanged via NFC               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Source Chain (e.g., Arbitrum)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Source Bridge Contract                               │  │
│  │  - Locks sender's asset (ETH/USDC)                    │  │
│  │  - Initiates Layer Zero message                        │  │
│  └───────────────────┬────────────────────────────────────┘  │
│                      │                                         │
│  ┌───────────────────▼────────────────────────────────────┐  │
│  │  Bridge Hook Contract                                  │  │
│  │  - Handles bridging logic                              │  │
│  │  - Coordinates with Layer Zero                        │  │
│  └───────────────────┬────────────────────────────────────┘  │
└──────────────────────┼───────────────────────────────────────┘
                       │
                       │ Layer Zero Omnichain Protocol
                       │ (Cross-Chain Messaging)
                       │
┌──────────────────────┼───────────────────────────────────────┐
│                      ▼              Target Chain (e.g., Optimism)│
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Target Bridge Contract                              │  │
│  │  - Receives Layer Zero message                       │  │
│  │  - Validates cross-chain transaction                 │  │
│  └───────────────────┬────────────────────────────────────┘  │
│                      │                                         │
│  ┌───────────────────▼────────────────────────────────────┐  │
│  │  Uniswap Router (if asset swap needed)                │  │
│  │  - Swaps ETH → USDC at optimal rate                   │  │
│  │  - Executes swap on destination chain                 │  │
│  └───────────────────┬────────────────────────────────────┘  │
│                      │                                         │
│  ┌───────────────────▼────────────────────────────────────┐  │
│  │  Bridge Helper Contract                                │  │
│  │  - Finalizes transaction                               │  │
│  │  - Releases funds to recipient                         │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## Contract Addresses

### Testnet Deployments (Sepolia)

#### Arbitrum Sepolia (Source Chain)
- **Mock USDC Contract**: `0x6355020E839EC69441F606466C30A5fFC96f3D82`
- **Mock WETH Contract**: `0xF04410891E277f0F64870A5cbBA97772E2bd91cc`
- **Source Bridge Contract**: `0x97900331085f87bd0C12eC6672d6E413545B344f`
- **Bridge Hook Contract**: `0x104083a08a4c438f585d3beaa03b4f43b1220040`
- **Bridge Helper Contract**: `0x1fa0BEF0cB905aB4f2516deaA1fB78A7A876a2cB`

#### Optimism Sepolia (Target Chain)
- **Bridged Mock USDC Contract**: `0x785EE9903fc4D5AB9935eBD4A7b1471Bc0340e45`
- **Target Bridge Contract**: `0x277ab7e539Dc70aAb98e9De5131da029767F38f8`

## Key Features

### 🔗 Layer Zero Integration
- **Omnichain Protocol**: Enables secure, trustless cross-chain communication
- **Decentralized Validators**: All cross-chain messages are validated by Layer Zero's validator network
- **Gas Efficiency**: Optimized for minimal gas costs across chains

### 🔄 Uniswap Integration
- **Automatic Swapping**: Seamlessly converts assets when sender and recipient preferences differ
- **Optimal Routing**: Finds the best swap path across multiple DEXs and chains
- **Slippage Protection**: Built-in protection against unfavorable exchange rates

### 💫 Cross-Chain Capabilities
- **Multi-Chain Support**: Works across Arbitrum, Optimism, Polygon, and Ethereum
- **Asset Flexibility**: Send any asset, receive any asset
- **Trustless Execution**: All operations are on-chain and verifiable

## Example Transaction Flow

**Scenario**: Alice sends 100 USDC on Arbitrum, Bob receives ETH on Optimism

1. **Alice initiates payment**:
   - NFC transmits: `{amount: 100, asset: USDC, chain: Arbitrum, recipient: Bob}`
   - Source Bridge Contract locks 100 USDC on Arbitrum

2. **Layer Zero messaging**:
   - Omnichain Protocol creates cross-chain message
   - Message validated by Layer Zero validators
   - Message delivered to Optimism

3. **Asset conversion** (if needed):
   - Uniswap Router receives USDC on Optimism
   - Swaps USDC → ETH at current market rate
   - ETH held in bridge contract

4. **Fund release**:
   - Target Bridge Contract validates transaction
   - Bridge Helper Contract releases ETH to Bob's address
   - Transaction complete

**Result**: Alice sent USDC on Arbitrum, Bob received ETH on Optimism - all automatically!

## Security

- **Layer Zero Security**: All cross-chain messages are secured by Layer Zero's decentralized validator network
- **Smart Contract Audits**: Contracts follow best practices for secure cross-chain operations
- **Slippage Protection**: Built-in protection against MEV and unfavorable swaps
- **Trustless**: No centralized intermediaries - all operations are on-chain and verifiable

## Development

These contracts are deployed on testnets for the EthGlobal Buenos Aires Hackathon. For production deployment, additional security audits and optimizations would be required.
