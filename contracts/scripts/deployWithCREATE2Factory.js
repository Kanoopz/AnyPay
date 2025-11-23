// Script to deploy BridgeHook using a CREATE2 Factory
// This ensures the hook is deployed at the exact address required by Uniswap v4
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

// Use Method 2 (Keccak256 of permissions) - Recommended
const salt = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [PERMISSIONS_UINT]));

// CREATE2Factory ABI
const CREATE2_FACTORY_ABI = [
  "function deploy(bytes memory bytecode, bytes32 salt) external returns (address deployedAddress)",
  "function computeAddress(bytes32 bytecodeHash, bytes32 salt) external view returns (address)",
  "function computeAddressFromDeployer(bytes32 bytecodeHash, bytes32 salt, address deployerAddress) external pure returns (address)",
];

async function main() {
  console.log("🚀 Deploying BridgeHook using CREATE2 Factory\n");
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

  // Step 2: Deploy CREATE2Factory (if not already deployed)
  console.log("=".repeat(60));
  console.log("📦 Step 2: Deploying CREATE2Factory");
  console.log("=".repeat(60));

  const CREATE2Factory = await hre.ethers.getContractFactory("CREATE2Factory");
  const factoryContract = await CREATE2Factory.connect(wallet).deploy();
  await factoryContract.waitForDeployment();
  const factoryAddress = await factoryContract.getAddress();
  console.log(`✅ CREATE2Factory deployed: ${factoryAddress}\n`);

  // Connect to factory using ABI
  const factory = new ethers.Contract(factoryAddress, CREATE2_FACTORY_ABI, wallet);

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

  // Calculate address from factory (for deployment)
  const factoryCalculatedAddress = await factory.computeAddress(bytecodeHash, salt);
  console.log(`Factory-based CREATE2 address: ${factoryCalculatedAddress}`);

  // Calculate address from deployer (what Uniswap v4 expects)
  const deployerCalculatedAddress = await factory.computeAddressFromDeployer(
    bytecodeHash,
    salt,
    deployerAddress
  );
  console.log(`Deployer-based CREATE2 address: ${deployerCalculatedAddress}`);
  console.log(`  (This is what Uniswap v4 expects)\n`);

  // Use the deployer-based address as the target
  const calculatedAddress = deployerCalculatedAddress;

  // Check if contract already exists
  const existingCode = await provider.getCode(calculatedAddress);
  if (existingCode !== "0x" && existingCode !== null) {
    console.log("⚠️  Contract already exists at this address!");
    console.log(`   Address: ${calculatedAddress}`);
    console.log("   Skipping deployment...\n");
    return calculatedAddress;
  }

  // Step 5: Deploy using CREATE2
  console.log("=".repeat(60));
  console.log("📦 Step 5: Deploying BridgeHook using CREATE2");
  console.log("=".repeat(60));

  console.log(`Deploying to: ${calculatedAddress}`);
  console.log(`  PoolManager: ${POOL_MANAGER_ADDRESS}`);
  console.log(`  BridgeHelper: ${bridgeHelperAddress}`);
  console.log(`  MockUSDC: ${MOCK_USDC_ADDRESS}\n`);

  try {
    const tx = await factory.deploy(deploymentBytecode, salt);
    console.log(`  Transaction hash: ${tx.hash}`);
    console.log("  Waiting for confirmation...");
    await tx.wait();
    console.log("  ✅ Transaction confirmed!\n");

    // Verify deployment
    const deployedCode = await provider.getCode(calculatedAddress);
    if (deployedCode !== "0x" && deployedCode !== null) {
      console.log("✅ BridgeHook successfully deployed at calculated address!");
      console.log(`   Address: ${calculatedAddress}`);
      return calculatedAddress;
    } else {
      throw new Error("Contract not found at calculated address after deployment");
    }
  } catch (error) {
    console.error("❌ Error deploying BridgeHook:", error.message);
    if (error.data) {
      console.error("  Error data:", error.data);
    }
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
    console.log("   1. Verify the hook works correctly");
    console.log("   2. Update createUniswapPool.js with the hook address");
    console.log("   3. Create the pool with the hook attached");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exitCode = 1;
  });

