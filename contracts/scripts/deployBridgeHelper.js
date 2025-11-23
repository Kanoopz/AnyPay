// Deployment script for BridgeHelper on Arbitrum Sepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Contract addresses
const SOURCE_BRIDGE_ADDRESS = "0x97900331085f87bd0C12eC6672d6E413545B344f"; // Arbitrum Sepolia
const MOCK_USDC_ADDRESS = "0x6355020E839EC69441F606466C30A5fFC96f3D82"; // Arbitrum Sepolia

// LayerZero Endpoint IDs (EIDs)
const OPTIMISM_SEPOLIA_EID = 40232; // Destination chain

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("Deploying BridgeHelper contract...");
  console.log("Network:", network);
  console.log("Deployer address:", deployer.address);

  if (network !== "arbSepolia") {
    throw new Error("This script must be run on arbSepolia network");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }

  console.log("\n--- Deployment Parameters ---");
  console.log("SourceBridge:", SOURCE_BRIDGE_ADDRESS);
  console.log("MockUSDC:", MOCK_USDC_ADDRESS);
  console.log("Destination EID (Optimism Sepolia):", OPTIMISM_SEPOLIA_EID);

  // Verify contracts exist
  const sourceBridgeCode = await ethers.provider.getCode(SOURCE_BRIDGE_ADDRESS);
  const usdcCode = await ethers.provider.getCode(MOCK_USDC_ADDRESS);

  if (sourceBridgeCode === "0x" || sourceBridgeCode === null) {
    throw new Error(`SourceBridge contract does not exist at ${SOURCE_BRIDGE_ADDRESS}`);
  }
  if (usdcCode === "0x" || usdcCode === null) {
    throw new Error(`MockUSDC contract does not exist at ${MOCK_USDC_ADDRESS}`);
  }
  console.log("✅ Contracts verified");

  // Deploy BridgeHelper
  const BridgeHelper = await ethers.getContractFactory("BridgeHelper");
  console.log("\nDeploying contract...");

  const bridgeHelper = await BridgeHelper.deploy(
    SOURCE_BRIDGE_ADDRESS,
    MOCK_USDC_ADDRESS,
    OPTIMISM_SEPOLIA_EID
  );
  await bridgeHelper.waitForDeployment();
  const bridgeHelperAddress = await bridgeHelper.getAddress();

  console.log("\n✅ BridgeHelper deployed successfully!");
  console.log("Contract address:", bridgeHelperAddress);
  console.log("Network:", network);

  // Verify contract on Etherscan
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await bridgeHelper.deploymentTransaction()?.wait(5);

    try {
      await hre.run("verify:verify", {
        address: bridgeHelperAddress,
        constructorArguments: [SOURCE_BRIDGE_ADDRESS, MOCK_USDC_ADDRESS, OPTIMISM_SEPOLIA_EID],
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

