// Deployment script for BridgeHook on Arbitrum Sepolia
// NOTE: Uniswap v4 hooks must be deployed at a specific address based on hook permissions
// This script will deploy the hook, but you may need to use CREATE2 to get the correct address
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Contract addresses
const POOL_MANAGER_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Replace with actual PoolManager address
const BRIDGE_HELPER_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Replace after deploying BridgeHelper
const MOCK_USDC_ADDRESS = "0x6355020E839EC69441F606466C30A5fFC96f3D82"; // Arbitrum Sepolia

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("Deploying BridgeHook contract...");
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
  console.log("PoolManager:", POOL_MANAGER_ADDRESS);
  console.log("BridgeHelper:", BRIDGE_HELPER_ADDRESS);
  console.log("MockUSDC:", MOCK_USDC_ADDRESS);

  // Check if addresses are set
  if (POOL_MANAGER_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Please set POOL_MANAGER_ADDRESS in the script");
  }
  if (BRIDGE_HELPER_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Please deploy BridgeHelper first and set BRIDGE_HELPER_ADDRESS");
  }

  // Verify contracts exist
  const poolManagerCode = await ethers.provider.getCode(POOL_MANAGER_ADDRESS);
  const bridgeHelperCode = await ethers.provider.getCode(BRIDGE_HELPER_ADDRESS);
  const usdcCode = await ethers.provider.getCode(MOCK_USDC_ADDRESS);

  if (poolManagerCode === "0x" || poolManagerCode === null) {
    throw new Error(`PoolManager contract does not exist at ${POOL_MANAGER_ADDRESS}`);
  }
  if (bridgeHelperCode === "0x" || bridgeHelperCode === null) {
    throw new Error(`BridgeHelper contract does not exist at ${BRIDGE_HELPER_ADDRESS}`);
  }
  if (usdcCode === "0x" || usdcCode === null) {
    throw new Error(`MockUSDC contract does not exist at ${MOCK_USDC_ADDRESS}`);
  }
  console.log("✅ Contracts verified");

  // Deploy BridgeHook
  const BridgeHook = await ethers.getContractFactory("BridgeHook");
  console.log("\nDeploying contract...");

  const bridgeHook = await BridgeHook.deploy(
    POOL_MANAGER_ADDRESS,
    BRIDGE_HELPER_ADDRESS,
    MOCK_USDC_ADDRESS
  );
  await bridgeHook.waitForDeployment();
  const bridgeHookAddress = await bridgeHook.getAddress();

  console.log("\n✅ BridgeHook deployed successfully!");
  console.log("Contract address:", bridgeHookAddress);
  console.log("Network:", network);
  console.log("\n⚠️  IMPORTANT: Uniswap v4 hooks must be deployed at a specific address.");
  console.log("   You may need to use CREATE2 to deploy at the correct address.");
  console.log("   Check Uniswap v4 documentation for hook address requirements.");

  // Verify contract on Etherscan
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await bridgeHook.deploymentTransaction()?.wait(5);

    try {
      await hre.run("verify:verify", {
        address: bridgeHookAddress,
        constructorArguments: [POOL_MANAGER_ADDRESS, BRIDGE_HELPER_ADDRESS, MOCK_USDC_ADDRESS],
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

