// Deployment script for BridgedMockUSDC on Optimism Sepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  
  console.log("Deploying BridgedMockUSDC contract...");
  console.log("Network:", network);
  console.log("Deployer address:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }
  
  // Contract parameters
  const name = "Bridged Mock USDC";
  const symbol = "bmUSDC";
  const owner = deployer.address; // Owner can mint and change manager
  const manager = deployer.address; // Manager can mint and burn tokens
  // Note: You can set manager to a different address (e.g., TargetBridge contract address)
  // after deploying TargetBridge
  
  console.log("\n--- Deployment Parameters ---");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Owner:", owner);
  console.log("Manager:", manager);
  console.log("\n💡 Note: After deploying TargetBridge, you may want to update the manager");
  console.log("   to the TargetBridge contract address using setManager().");
  
  // Deploy BridgedMockUSDC
  const BridgedMockUSDC = await ethers.getContractFactory("BridgedMockUSDC");
  console.log("\nDeploying contract...");
  
  const bridgedMockUSDC = await BridgedMockUSDC.deploy(name, symbol, owner, manager);
  await bridgedMockUSDC.waitForDeployment();
  const bridgedMockUSDCAddress = await bridgedMockUSDC.getAddress();
  
  console.log("\n✅ BridgedMockUSDC deployed successfully!");
  console.log("Contract address:", bridgedMockUSDCAddress);
  console.log("Network:", network);
  console.log("Owner:", owner);
  console.log("Manager:", manager);
  console.log("\n📝 Permissions:");
  console.log("   - Owner: Can mint tokens and change manager");
  console.log("   - Manager: Can mint and burn tokens");
  
  // Optional: Verify contract on block explorer (if configured)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await bridgedMockUSDC.deploymentTransaction()?.wait(5);
    
    try {
      await hre.run("verify:verify", {
        address: bridgedMockUSDCAddress,
        constructorArguments: [name, symbol, owner, manager],
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

