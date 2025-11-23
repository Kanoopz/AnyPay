# LayerZero Testnet Pathway Information

## Endpoint IDs (EIDs) for Testnets

Based on LayerZero documentation:

- **Arbitrum Sepolia**: EID `40231`
- **Optimism Sepolia**: EID `40232`
- **Ethereum Sepolia**: EID `40161` (standard Sepolia EID)
- **Polygon Amoy**: EID `40267`

## Default Pathway Configurations

According to the LayerZero documentation:

1. **Default pathways exist** but may contain **Dead DVNs** (placeholders)
2. **Dead DVNs** indicate that a default pathway setting does not exist or is not fully configured
3. Default configurations can have one of these Security Stack setups:
   - **Default A**: requiredDVNs: [ Google Cloud, LayerZero Labs ]
   - **Default B**: requiredDVNs: [ Polyhedra, LayerZero Labs ]
   - **Default C**: requiredDVNs: [ Dead DVN, LayerZero Labs ] ⚠️ (Not usable)

## How to Check Default Configurations

**Check current default pathway configurations:**
- Visit: https://layerzeroscan.com/tools/defaults
- Select your source and destination chains
- Check if pathways have Dead DVNs (not usable) or active DVNs (usable)

## Important Notes

1. **No Pre-configured USDC OFT Adapters**: The documentation does NOT mention any official/pre-configured USDC OFT adapters for testnets. You need to:
   - Deploy your own OFT adapters
   - Wire them together (set peers)
   - Configure DVNs and libraries

2. **Default Configs are Placeholders**: Even if default configs exist, you should always set your own configuration because:
   - Defaults are subject to change
   - They may contain Dead DVNs
   - You need explicit configuration for production use

3. **Pathway Wiring Required**: For bridging to work, you MUST:
   - Set peers between OFT contracts on both chains
   - Configure send/receive libraries
   - Set up DVNs (Decentralized Verifier Networks)
   - Configure enforcedOptions

## Recommended Approach

Since you want to bridge USDC from **Arbitrum Sepolia** or **Optimism Sepolia**:

1. **Check Default Configs**: Visit https://layerzeroscan.com/tools/defaults and check:
   - Arbitrum Sepolia → Optimism Sepolia
   - Arbitrum Sepolia → Ethereum Sepolia
   - Arbitrum Sepolia → Polygon Amoy
   - Optimism Sepolia → Ethereum Sepolia
   - Optimism Sepolia → Polygon Amoy

2. **Look for Active DVNs**: If pathways show Dead DVNs, you'll need to configure your own DVNs

3. **Deploy Your Own OFT Adapters**: Since there are no official pre-configured USDC OFT adapters, you should:
   - Deploy OFT adapters on each chain you want to use
   - Wire them together using LayerZero's configuration tools
   - Configure all required settings (peers, libraries, DVNs, options)

## Current Status of Your OFT Adapters

Based on your script:
- **Arbitrum Sepolia OFT**: `0x543BdA7c6cA4384FE90B1F5929bb851F52888983` ❌ (Peers NOT configured)
- **Optimism Sepolia OFT**: `0x314B753272a3C79646b92A87dbFDEE643237033a` ❌ (Peers NOT configured)

These contracts need to be wired together before bridging will work.

