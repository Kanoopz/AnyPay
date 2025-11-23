// Deployment script for TargetBridge on Optimism Sepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

// LayerZero V2 Endpoint for Optimism Sepolia
const LAYERZERO_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";

// Bridged token address on Optimism Sepolia
const BRIDGED_TOKEN_ADDRESS = "0x785EE9903fc4D5AB9935eBD4A7b1471Bc0340e45";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  
  console.log("Deploying TargetBridge contract...");
  console.log("Network:", network);
  console.log("Deployer address:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }
  
  // Contract parameters
  const endpoint = LAYERZERO_ENDPOINT;
  const delegate = "0x9F613E18a198033D4d176A7EFa63a939a16B8cA6";
  const owner = "0x9F613E18a198033D4d176A7EFa63a939a16B8cA6";
  const bridgedToken = BRIDGED_TOKEN_ADDRESS;
  
  console.log("\n--- Deployment Parameters ---");
  console.log("LayerZero Endpoint:", endpoint);
  console.log("Delegate:", delegate);
  console.log("Owner:", owner);
  console.log("Bridged Token:", bridgedToken);
  
  // Verify bridged token exists
  const bridgedTokenCode = await ethers.provider.getCode(bridgedToken);
  if (bridgedTokenCode === "0x" || bridgedTokenCode === null) {
    throw new Error(`Bridged token contract does not exist at address ${bridgedToken}`);
  }
  console.log("✅ Bridged token contract verified");
  
  // Deploy TargetBridge
  const TargetBridge = await ethers.getContractFactory("TargetBridge");
  console.log("\nDeploying contract...");
  
  const targetBridge = await TargetBridge.deploy(endpoint, delegate, owner, bridgedToken);
  await targetBridge.waitForDeployment();
  const targetBridgeAddress = await targetBridge.getAddress();
  
  console.log("\n✅ TargetBridge deployed successfully!");
  console.log("Contract address:", targetBridgeAddress);
  console.log("Network:", network);
  console.log("\n📝 Important next steps:");
  console.log("   1. Update bridged token manager to TargetBridge address:");
  console.log(`      BridgedMockUSDC.setManager(${targetBridgeAddress})`);
  console.log("   2. Wire TargetBridge to SourceBridge (set peers)");
  console.log("   3. Configure LayerZero pathways (DVNs, libraries, options)");
  
  // Optional: Verify contract on block explorer (if configured)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await targetBridge.deploymentTransaction()?.wait(5);
    
    try {
      await hre.run("verify:verify", {
        address: targetBridgeAddress,
        constructorArguments: [endpoint, delegate, owner, bridgedToken],
      });
      console.log("✅ Contract verified on block explorer!");
    } catch (error) {
      console.log("⚠️  Verification failed (this is okay if already verified):", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

