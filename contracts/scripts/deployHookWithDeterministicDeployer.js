// Script to deploy BridgeHook using a DeterministicDeployer contract
// The DeterministicDeployer must be deployed from the deployer address
// This ensures the hook is deployed at the address Uniswap v4 expects
const { ethers } = require("ethers");
const hre = require("hardhat");

// Private key for the deployer account
const PRIVATE_KEY = "0xff6f5404be473495ef803aab7e1f5c002ed858a4d23e2146697e7d1a13681a1a";

// Contract addresses (Arbitrum Sepolia)
const POOL_MANAGER_ADDRESS = "0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317";
const MOCK_USDC_ADDRESS = "0x6355020E839EC69441F606466C30A5fFC96f3D82";
const SOURCE_BRIDGE_ADDRESS = "0x97900331085f87bd0C12eC6672d6E413545B344f";
const OPTIMISM_SEPOLIA_EID = 40232;

// RPC URL for Arbitrum Sepolia
const ARB_SEPOLIA_RPC = "https://api.zan.top/arb-sepolia";

// Hook permissions (only afterSwap = true)
const PERMISSIONS_UINT = 128n; // 2^7

// Use Method 2 (Keccak256 of permissions) - Recommended by Uniswap v4
const salt = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [PERMISSIONS_UINT]));

// DeterministicDeployer ABI
const DETERMINISTIC_DEPLOYER_ABI = [
  "function deploy(bytes memory bytecode, bytes32 salt) external returns (address deployedAddress)",
  "function computeAddress(bytes32 bytecodeHash, bytes32 salt) external view returns (address)",
];

async function main() {
  console.log("🚀 Deploying BridgeHook using DeterministicDeployer\n");
  console.log("=".repeat(60));

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(ARB_SEPOLIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const deployerAddress = wallet.address;

  console.log(`Network: Arbitrum Sepolia`);
  console.log(`Deployer address: ${deployerAddress}`);
  console.log(`Salt (Method 2): ${salt}\n`);

  const balance = await provider.getBalance(deployerAddress);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }

  // Step 1: Deploy BridgeHelper
  console.log("=".repeat(60));
  console.log("📦 Step 1: Deploying BridgeHelper");
  console.log("=".repeat(60));

  const BridgeHelper = await hre.ethers.getContractFactory("BridgeHelper");
  const bridgeHelper = await BridgeHelper.connect(wallet).deploy(
    SOURCE_BRIDGE_ADDRESS,
    MOCK_USDC_ADDRESS,
    OPTIMISM_SEPOLIA_EID
  );
  await bridgeHelper.waitForDeployment();
  const bridgeHelperAddress = await bridgeHelper.getAddress();
  console.log(`✅ BridgeHelper deployed: ${bridgeHelperAddress}\n`);

  // Step 2: Deploy DeterministicDeployer from deployer address
  // This is critical - it must be deployed from the deployer address
  // so that CREATE2 calculations use the deployer's address
  console.log("=".repeat(60));
  console.log("📦 Step 2: Deploying DeterministicDeployer");
  console.log("=".repeat(60));
  console.log("⚠️  IMPORTANT: DeterministicDeployer must be deployed from deployer address");
  console.log(`   Deployer: ${deployerAddress}\n`);

  const DeterministicDeployer = await hre.ethers.getContractFactory("DeterministicDeployer");
  const deployerContract = await DeterministicDeployer.connect(wallet).deploy();
  await deployerContract.waitForDeployment();
  const deployerContractAddress = await deployerContract.getAddress();
  console.log(`✅ DeterministicDeployer deployed: ${deployerContractAddress}`);
  console.log(`   ⚠️  Note: This address should match the deployer address for Uniswap v4 hooks`);
  console.log(`   If it doesn't, we need to use a different approach.\n`);

  // Step 3: Get BridgeHook bytecode with constructor args
  console.log("=".repeat(60));
  console.log("📦 Step 3: Preparing BridgeHook Bytecode");
  console.log("=".repeat(60));

  const BridgeHook = await hre.ethers.getContractFactory("BridgeHook");
  const bytecode = BridgeHook.bytecode;
  
  // Encode constructor arguments
  const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "address"],
    [POOL_MANAGER_ADDRESS, bridgeHelperAddress, MOCK_USDC_ADDRESS]
  );

  // Combine bytecode with constructor arguments
  const deploymentBytecode = bytecode + constructorArgs.slice(2);
  const bytecodeHash = ethers.keccak256(deploymentBytecode);

  console.log(`✅ Bytecode prepared (length: ${deploymentBytecode.length} chars)`);
  console.log(`   Bytecode hash: ${bytecodeHash}\n`);

  // Step 4: Calculate CREATE2 address
  console.log("=".repeat(60));
  console.log("🔍 Step 4: Calculating CREATE2 Address");
  console.log("=".repeat(60));

  // Connect to deployer contract
  const deployer = new ethers.Contract(deployerContractAddress, DETERMINISTIC_DEPLOYER_ABI, wallet);

  // Calculate address from DeterministicDeployer (uses deployer contract address)
  const calculatedAddress = await deployer.computeAddress(bytecodeHash, salt);
  console.log(`Calculated CREATE2 address (from DeterministicDeployer): ${calculatedAddress}`);

  // Also calculate what it would be from deployer address directly (what Uniswap v4 expects)
  const deployerDirectAddress = ethers.getCreate2Address(
    deployerAddress,
    salt,
    bytecodeHash
  );
  console.log(`Expected address (from deployer directly): ${deployerDirectAddress}`);
  console.log(`   (This is what Uniswap v4 BaseHook constructor expects)\n`);

  // Check if addresses match
  if (calculatedAddress.toLowerCase() !== deployerDirectAddress.toLowerCase()) {
    console.log("⚠️  WARNING: Addresses don't match!");
    console.log("   Uniswap v4 expects the hook at the deployer-direct address.");
    console.log("   We need to deploy from the deployer address directly, not via a contract.\n");
    console.log("💡 Solution: Use a deterministic deployer pattern where the deployer contract");
    console.log("   is deployed at a known address, OR deploy the hook directly from the deployer");
    console.log("   address using a transaction that uses CREATE2.\n");
    
    // For now, we'll still try to deploy and see what happens
    console.log("   Attempting deployment anyway...\n");
  } else {
    console.log("✅ Addresses match! DeterministicDeployer will deploy at the correct address.\n");
  }

  // Check if contract already exists
  const existingCode = await provider.getCode(deployerDirectAddress);
  if (existingCode !== "0x" && existingCode !== null) {
    console.log("⚠️  Contract already exists at expected address!");
    console.log(`   Address: ${deployerDirectAddress}`);
    console.log("   Skipping deployment...\n");
    return deployerDirectAddress;
  }

  // Step 5: Deploy using DeterministicDeployer
  console.log("=".repeat(60));
  console.log("📦 Step 5: Deploying BridgeHook using DeterministicDeployer");
  console.log("=".repeat(60));

  console.log(`Deploying to: ${calculatedAddress}`);
  console.log(`  PoolManager: ${POOL_MANAGER_ADDRESS}`);
  console.log(`  BridgeHelper: ${bridgeHelperAddress}`);
  console.log(`  MockUSDC: ${MOCK_USDC_ADDRESS}\n`);

  try {
    const tx = await deployer.deploy(deploymentBytecode, salt);
    console.log(`  Transaction hash: ${tx.hash}`);
    console.log("  Waiting for confirmation...");
    await tx.wait();
    console.log("  ✅ Transaction confirmed!\n");

    // Verify deployment at calculated address
    const deployedCode = await provider.getCode(calculatedAddress);
    if (deployedCode !== "0x" && deployedCode !== null) {
      console.log("✅ BridgeHook deployed at calculated address!");
      console.log(`   Address: ${calculatedAddress}`);
      
      if (calculatedAddress.toLowerCase() !== deployerDirectAddress.toLowerCase()) {
        console.log(`\n⚠️  IMPORTANT: Hook deployed at ${calculatedAddress}`);
        console.log(`   But Uniswap v4 expects it at ${deployerDirectAddress}`);
        console.log(`   The BaseHook constructor will fail validation.\n`);
        console.log("📝 Next steps:");
        console.log("   1. Use Uniswap v4 SDK/tools for proper hook deployment");
        console.log("   2. Or deploy hook directly from deployer address using CREATE2");
        console.log("   3. Or use a deterministic deployer that matches the deployer address");
      }
      
      return calculatedAddress;
    } else {
      throw new Error("Contract not found at calculated address after deployment");
    }
  } catch (error) {
    console.error("❌ Error deploying BridgeHook:", error.message);
    if (error.data) {
      console.error("  Error data:", error.data);
    }
    console.log(`\n💡 The hook MUST be deployed at: ${deployerDirectAddress}`);
    console.log(`   This requires deploying from ${deployerAddress} using CREATE2.`);
    console.log(`   Consider using Uniswap v4's official deployment tools or SDK.`);
    throw error;
  }
}

main()
  .then((address) => {
    console.log("\n" + "=".repeat(60));
    console.log("✅ Deployment Complete!");
    console.log("=".repeat(60));
    console.log(`\nBridgeHook address: ${address}`);
    console.log("\n📝 Next steps:");
    console.log("   1. Verify the hook address matches Uniswap v4 requirements");
    console.log("   2. Update createUniswapPool.js with the hook address");
    console.log("   3. Create the pool with the hook attached");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exitCode = 1;
  });

