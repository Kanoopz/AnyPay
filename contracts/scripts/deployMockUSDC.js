// Deployment script for MockUSDC on Arbitrum Sepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  
  console.log("Deploying MockUSDC contract...");
  console.log("Network:", network);
  console.log("Deployer address:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }
  
  // Contract parameters
  const name = "Mock USDC";
  const symbol = "mUSDC";
  const owner = deployer.address; // Owner can mint tokens
  
  console.log("\n--- Deployment Parameters ---");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Owner:", owner);
  
  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  console.log("\nDeploying contract...");
  
  const mockUSDC = await MockUSDC.deploy(name, symbol, owner);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  
  console.log("\n✅ MockUSDC deployed successfully!");
  console.log("Contract address:", mockUSDCAddress);
  console.log("Network:", network);
  console.log("Owner:", owner);
  console.log("\n📝 Note: The owner can mint tokens using the mint() function.");
  
  // Optional: Verify contract on block explorer (if configured)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await mockUSDC.deploymentTransaction()?.wait(5);
    
    try {
      await hre.run("verify:verify", {
        address: mockUSDCAddress,
        constructorArguments: [name, symbol, owner],
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

