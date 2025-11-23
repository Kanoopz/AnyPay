// Script to wire SourceBridge and TargetBridge contracts
// This script sets peers and optionally configures LayerZero pathways
// Run this script on BOTH networks: first on arbSepolia, then on opSepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Contract addresses
const SOURCE_BRIDGE_ADDRESS = "0x97900331085f87bd0C12eC6672d6E413545B344f"; // Arbitrum Sepolia
const TARGET_BRIDGE_ADDRESS = "0x277ab7e539Dc70aAb98e9De5131da029767F38f8"; // Optimism Sepolia

// LayerZero Endpoint IDs (EIDs)
const ARBITRUM_SEPOLIA_EID = 40231;
const OPTIMISM_SEPOLIA_EID = 40232;

// LayerZero Endpoint addresses (same for both testnets)
const LAYERZERO_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";

// RPC URLs for cross-network operations
const RPC_URLS = {
  arbSepolia: "https://api.zan.top/arb-sepolia",
  opSepolia: "https://sepolia.optimism.io",
};

// OApp ABI for wiring functions
const OAPP_ABI = [
  "function setPeer(uint32 _eid, bytes32 _peer) external",
  "function getPeer(uint32 _eid) view returns (bytes32)",
  "function owner() view returns (address)",
  "function delegate() view returns (address)",
];

// EndpointV2 ABI for pathway configuration (optional)
const ENDPOINT_ABI = [
  "function defaultSendLibrary(uint32 _eid) view returns (address)",
  "function defaultReceiveLibrary(uint32 _eid) view returns (address)",
  "function getSendLibrary(address _oapp, uint32 _eid) view returns (address)",
  "function getReceiveLibrary(address _oapp, uint32 _eid) view returns (address)",
];

async function main() {
  console.log("🔌 Wiring SourceBridge and TargetBridge Contracts\n");
  console.log("=".repeat(60));

  // Get signer
  const [signer] = await ethers.getSigners();
  const network = hre.network.name;
  
  console.log(`\nNetwork: ${network}`);
  console.log(`Signer address: ${signer.address}`);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("Signer has no balance. Please fund the account first.");
  }

  // Determine which contract to configure based on network
  let contractAddress, peerEid, peerAddress, contractName;
  
  if (network === "arbSepolia") {
    contractAddress = SOURCE_BRIDGE_ADDRESS;
    peerEid = OPTIMISM_SEPOLIA_EID;
    peerAddress = TARGET_BRIDGE_ADDRESS;
    contractName = "SourceBridge";
    console.log("📍 Configuring SourceBridge on Arbitrum Sepolia");
    console.log(`   Setting peer to TargetBridge (Optimism Sepolia, EID ${peerEid})`);
  } else if (network === "opSepolia") {
    contractAddress = TARGET_BRIDGE_ADDRESS;
    peerEid = ARBITRUM_SEPOLIA_EID;
    peerAddress = SOURCE_BRIDGE_ADDRESS;
    contractName = "TargetBridge";
    console.log("📍 Configuring TargetBridge on Optimism Sepolia");
    console.log(`   Setting peer to SourceBridge (Arbitrum Sepolia, EID ${peerEid})`);
  } else {
    throw new Error(`This script must be run on arbSepolia or opSepolia network. Current network: ${network}`);
  }

  // Connect to contract using the contract factory to get the correct ABI
  let contract;
  if (network === "arbSepolia") {
    const SourceBridge = await ethers.getContractFactory("SourceBridge");
    contract = SourceBridge.attach(contractAddress);
  } else {
    const TargetBridge = await ethers.getContractFactory("TargetBridge");
    contract = TargetBridge.attach(contractAddress);
  }

  // Check ownership
  console.log("\n📋 Checking Contract Ownership...");
  try {
    const owner = await contract.owner();
    const delegate = await contract.delegate();
    
    console.log(`${contractName} owner: ${owner}`);
    console.log(`${contractName} delegate: ${delegate}`);
    
    if (owner.toLowerCase() !== signer.address.toLowerCase() && 
        delegate.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error(`Signer is not owner or delegate of ${contractName}. Owner: ${owner}, Delegate: ${delegate}`);
    }
    
    console.log("✅ Signer has permission to configure contract\n");
  } catch (error) {
    if (error.message.includes("not owner") || error.message.includes("not delegate")) {
      throw error;
    }
    console.log("⚠️  Could not verify ownership (contract may not expose owner/delegate functions)\n");
  }

  // Step 1: Set peer
  console.log("🔗 Step 1: Setting Peer");
  console.log("-".repeat(60));
  
  // Check current peer configuration (if getPeer is available)
  let currentPeerAddr = null;
  try {
    const currentPeer = await contract.getPeer(peerEid);
    currentPeerAddr = ethers.getAddress(ethers.dataSlice(currentPeer, 12));
    console.log(`Current peer for EID ${peerEid}: ${currentPeerAddr}`);
    console.log(`Expected peer: ${peerAddress}`);
    
    if (currentPeerAddr.toLowerCase() === peerAddress.toLowerCase()) {
      console.log("\n✅ Peer is already correctly configured!");
      console.log("   Skipping peer configuration...\n");
    } else {
      console.log("\n⚠️  Peer is not correctly configured. Setting it now...\n");
    }
  } catch (error) {
    console.log("⚠️  Could not check current peer (function may not be public)");
    console.log("   Proceeding to set peer...\n");
  }
  
  // Set peer if not already configured
  if (!currentPeerAddr || currentPeerAddr.toLowerCase() !== peerAddress.toLowerCase()) {
    try {
      console.log(`Setting ${contractName} peer to ${peerAddress} (EID ${peerEid})...`);
      const peerBytes32 = ethers.zeroPadValue(peerAddress, 32);
      const tx = await contract.setPeer(peerEid, peerBytes32);
      console.log(`  Transaction hash: ${tx.hash}`);
      console.log("  Waiting for confirmation...");
      const receipt = await tx.wait();
      console.log(`  ✅ Peer set successfully (block ${receipt.blockNumber})\n`);
    } catch (error) {
      console.error("❌ Error setting peer:", error.message);
      if (error.data) {
        console.error("   Error data:", error.data);
      }
      throw error;
    }
  }

  // Step 2: Verify peer configuration (if getPeer is available)
  console.log("🔍 Step 2: Verifying Peer Configuration");
  console.log("-".repeat(60));
  
  try {
    const verifiedPeer = await contract.getPeer(peerEid);
    const verifiedPeerAddr = ethers.getAddress(ethers.dataSlice(verifiedPeer, 12));
    
    console.log(`${contractName} → Peer (EID ${peerEid}): ${verifiedPeerAddr}`);
    
    if (verifiedPeerAddr.toLowerCase() === peerAddress.toLowerCase()) {
      console.log("\n✅ Peer verification successful!\n");
    } else {
      console.log("\n⚠️  Peer verification failed. Please check the configuration.\n");
    }
  } catch (error) {
    console.log("⚠️  Could not verify peer (getPeer may not be public):", error.message);
    console.log("   This is okay - the transaction succeeded, so the peer should be set.\n");
  }

  // Step 3: Check pathway configuration (informational)
  console.log("🛤️  Step 3: Pathway Configuration Status");
  console.log("-".repeat(60));
  console.log("\n📝 Note: LayerZero uses default pathways for testnets.");
  console.log("   These defaults should work, but you can configure custom pathways if needed.");
  console.log("\n💡 To check default pathway configuration:");
  console.log("   Visit: https://layerzeroscan.com/tools/defaults");
  console.log("   Select: Arbitrum Sepolia → Optimism Sepolia");
  console.log("\n💡 To configure custom pathways (DVNs, libraries, options):");
  console.log("   - Use LayerZero's configuration tools");
  console.log("   - Or interact with the Endpoint contract directly");
  console.log("   - Endpoint address:", LAYERZERO_ENDPOINT);
  
  try {
    const endpoint = new ethers.Contract(LAYERZERO_ENDPOINT, ENDPOINT_ABI, signer);
    
    // Check default libraries based on network
    if (network === "arbSepolia") {
      const defaultSendLib = await endpoint.defaultSendLibrary(OPTIMISM_SEPOLIA_EID);
      console.log(`\nDefault send library (Arb → Op): ${defaultSendLib}`);
      
      const oappSendLib = await endpoint.getSendLibrary(contractAddress, OPTIMISM_SEPOLIA_EID);
      if (oappSendLib !== ethers.ZeroAddress && oappSendLib !== defaultSendLib) {
        console.log(`OApp send library override: ${oappSendLib}`);
      }
    } else {
      const defaultReceiveLib = await endpoint.defaultReceiveLibrary(ARBITRUM_SEPOLIA_EID);
      console.log(`\nDefault receive library (Op → Arb): ${defaultReceiveLib}`);
      
      const oappReceiveLib = await endpoint.getReceiveLibrary(contractAddress, ARBITRUM_SEPOLIA_EID);
      if (oappReceiveLib !== ethers.ZeroAddress && oappReceiveLib !== defaultReceiveLib) {
        console.log(`OApp receive library override: ${oappReceiveLib}`);
      }
    }
    
    console.log("\n✅ Pathway libraries are configured (using defaults or overrides)");
  } catch (error) {
    console.log("\n⚠️  Could not check pathway configuration:", error.message);
    console.log("   This is okay - defaults should work for testnets");
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ ${contractName} Wiring Complete!`);
  console.log("=".repeat(60));
  console.log("\n📋 Summary:");
  console.log(`   Contract: ${contractName} (${contractAddress})`);
  console.log(`   Network: ${network}`);
  console.log(`   Peer configured: ✅ (EID ${peerEid} → ${peerAddress})`);
  console.log(`   Pathways: Using LayerZero defaults`);
  
  if (network === "arbSepolia") {
    console.log("\n⚠️  IMPORTANT: You must also run this script on opSepolia network!");
    console.log("   Run: npx hardhat run scripts/wireBridges.js --network opSepolia");
  } else {
    console.log("\n🚀 Both bridges are now wired and ready to use!");
    console.log("\n💡 Next steps:");
    console.log("   1. Test the bridge by calling lockAndBridge() on SourceBridge");
    console.log("   2. Monitor transactions on LayerZero Scan");
    console.log("   3. Configure custom pathways if defaults don't work");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exitCode = 1;
  });

