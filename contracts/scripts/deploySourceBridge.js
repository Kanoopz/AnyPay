// Deployment script for SourceBridge on Arbitrum Sepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

// LayerZero V2 Endpoint for Arbitrum Sepolia
const LAYERZERO_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";

// Token address on Arbitrum Sepolia
const TOKEN_ADDRESS = "0x6355020E839EC69441F606466C30A5fFC96f3D82";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  
  console.log("Deploying SourceBridge contract...");
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
  const token = TOKEN_ADDRESS;
  
  console.log("\n--- Deployment Parameters ---");
  console.log("LayerZero Endpoint:", endpoint);
  console.log("Delegate:", delegate);
  console.log("Owner:", owner);
  console.log("Token:", token);
  
  // Verify token exists
  const tokenCode = await ethers.provider.getCode(token);
  if (tokenCode === "0x" || tokenCode === null) {
    throw new Error(`Token contract does not exist at address ${token}`);
  }
  console.log("✅ Token contract verified");
  
  // Deploy SourceBridge
  const SourceBridge = await ethers.getContractFactory("SourceBridge");
  console.log("\nDeploying contract...");
  
  const sourceBridge = await SourceBridge.deploy(endpoint, delegate, owner, token);
  await sourceBridge.waitForDeployment();
  const sourceBridgeAddress = await sourceBridge.getAddress();
  
  console.log("\n✅ SourceBridge deployed successfully!");
  console.log("Contract address:", sourceBridgeAddress);
  console.log("Network:", network);
  console.log("\n📝 Next steps:");
  console.log("   1. Wire SourceBridge to TargetBridge (set peers)");
  console.log("   2. Configure LayerZero pathways (DVNs, libraries, options)");
  console.log("   3. Deploy TargetBridge on Optimism Sepolia");
  
  // Optional: Verify contract on block explorer (if configured)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await sourceBridge.deploymentTransaction()?.wait(5);
    
    try {
      await hre.run("verify:verify", {
        address: sourceBridgeAddress,
        constructorArguments: [endpoint, delegate, owner, token],
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

