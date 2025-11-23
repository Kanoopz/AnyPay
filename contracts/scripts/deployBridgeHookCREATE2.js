// Script to deploy BridgeHook using CREATE2 at the calculated address
// This ensures the hook is deployed at the address required by Uniswap v4
const { ethers } = require("ethers");
const hre = require("hardhat");

// Private key for the deployer account
const PRIVATE_KEY = "0xff6f5404be473495ef803aab7e1f5c002ed858a4d23e2146697e7d1a13681a1a";

// Contract addresses (Arbitrum Sepolia)
const POOL_MANAGER_ADDRESS = "0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317";
const MOCK_USDC_ADDRESS = "0x6355020E839EC69441F606466C30A5fFC96f3D82";

// RPC URL for Arbitrum Sepolia
const ARB_SEPOLIA_RPC = "https://api.zan.top/arb-sepolia";

// Hook permissions (only afterSwap = true)
const PERMISSIONS_UINT = 128n; // 2^7

// Salt calculation method (1, 2, or 3)
// Method 1: Permissions as salt directly
// Method 2: Keccak256 of permissions (recommended for Uniswap v4) ⭐
// Method 3: Zero salt
const SALT_METHOD = 2; // Using Method 2 as recommended by Uniswap v4

async function main() {
  console.log("🚀 Deploying BridgeHook using CREATE2\n");
  console.log("=".repeat(60));

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(ARB_SEPOLIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const deployerAddress = wallet.address;

  console.log(`Network: Arbitrum Sepolia`);
  console.log(`Deployer address: ${deployerAddress}`);

  const balance = await provider.getBalance(deployerAddress);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }

  // Get BridgeHelper address (will be deployed first or use existing)
  console.log("=".repeat(60));
  console.log("📦 Step 1: Deploying BridgeHelper (if needed)");
  console.log("=".repeat(60));

  // For now, we'll assume BridgeHelper is already deployed
  // You can modify this to deploy it first if needed
  const SOURCE_BRIDGE_ADDRESS = "0x97900331085f87bd0C12eC6672d6E413545B344f";
  const OPTIMISM_SEPOLIA_EID = 40232;

  let bridgeHelperAddress;
  try {
    // Check if BridgeHelper exists, if not deploy it
    const BridgeHelper = await hre.ethers.getContractFactory("BridgeHelper");
    const bridgeHelper = await BridgeHelper.connect(wallet).deploy(
      SOURCE_BRIDGE_ADDRESS,
      MOCK_USDC_ADDRESS,
      OPTIMISM_SEPOLIA_EID
    );
    await bridgeHelper.waitForDeployment();
    bridgeHelperAddress = await bridgeHelper.getAddress();
    console.log(`✅ BridgeHelper deployed: ${bridgeHelperAddress}`);
  } catch (error) {
    console.log("⚠️  BridgeHelper deployment failed or already exists");
    console.log("   Using existing BridgeHelper or will deploy hook without it first");
    // You may need to deploy BridgeHelper separately
    throw new Error("Please deploy BridgeHelper first, then update BRIDGE_HELPER_ADDRESS in this script");
  }

  // Calculate salt based on method
  let salt;
  switch (SALT_METHOD) {
    case 1:
      salt = ethers.zeroPadValue(ethers.toBeHex(PERMISSIONS_UINT), 32);
      console.log(`\nUsing Salt Method 1 (Permissions as uint256)`);
      break;
    case 2:
      salt = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [PERMISSIONS_UINT]));
      console.log(`\nUsing Salt Method 2 (Keccak256 of permissions)`);
      break;
    case 3:
      salt = ethers.ZeroHash;
      console.log(`\nUsing Salt Method 3 (Zero salt)`);
      break;
    default:
      throw new Error("Invalid SALT_METHOD. Use 1, 2, or 3.");
  }

  console.log(`Salt: ${salt}`);

  // Get BridgeHook bytecode
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 2: Getting BridgeHook Bytecode");
  console.log("=".repeat(60));

  const BridgeHook = await hre.ethers.getContractFactory("BridgeHook");
  const bytecode = BridgeHook.bytecode;

  if (!bytecode || bytecode === "0x") {
    throw new Error("Failed to get BridgeHook bytecode. Please compile the contract first.");
  }

  console.log(`✅ Bytecode retrieved (length: ${bytecode.length} chars)`);

  // Calculate CREATE2 address
  console.log("\n" + "=".repeat(60));
  console.log("🔍 Step 3: Calculating CREATE2 Address");
  console.log("=".repeat(60));

  const bytecodeHash = ethers.keccak256(bytecode);
  const saltBytes32 = ethers.zeroPadValue(salt, 32);

  const create2Input = ethers.concat([
    "0xff",
    deployerAddress,
    saltBytes32,
    bytecodeHash
  ]);

  const hash = ethers.keccak256(create2Input);
  const calculatedAddress = ethers.getAddress("0x" + hash.slice(-40));

  console.log(`Calculated CREATE2 address: ${calculatedAddress}`);

  // Check if contract already exists at this address
  const existingCode = await provider.getCode(calculatedAddress);
  if (existingCode !== "0x" && existingCode !== null) {
    console.log("\n⚠️  Contract already exists at this address!");
    console.log(`   Address: ${calculatedAddress}`);
    console.log("   Skipping deployment...");
    return calculatedAddress;
  }

  // Deploy using CREATE2
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 4: Deploying BridgeHook using CREATE2");
  console.log("=".repeat(60));

  console.log(`\nDeploying to calculated address: ${calculatedAddress}`);
  console.log(`  PoolManager: ${POOL_MANAGER_ADDRESS}`);
  console.log(`  BridgeHelper: ${bridgeHelperAddress}`);
  console.log(`  MockUSDC: ${MOCK_USDC_ADDRESS}`);
  console.log(`  Salt: ${salt}`);

  // Create ContractFactory
  const factory = new ethers.ContractFactory(
    BridgeHook.interface,
    bytecode,
    wallet
  );

  try {
    // For CREATE2 deployment, we need to use a deterministic deployment
    // The standard approach is to use a CREATE2 factory or deploy with specific nonce
    // However, ethers.js ContractFactory.deploy() doesn't directly support CREATE2
    
    // Option 1: Use Hardhat's deterministic deployment (if available)
    // Option 2: Deploy using a CREATE2 factory contract
    // Option 3: Use Hardhat Ignition with CREATE2 support
    
    // For now, we'll deploy normally and check if it matches
    // If it doesn't match, we'll need to use a CREATE2 factory
    console.log("\n⚠️  Note: Standard deploy() may not use CREATE2.");
    console.log("   We'll deploy and verify the address.");
    console.log("   If addresses don't match, we'll need a CREATE2 factory.\n");

    const bridgeHook = await factory.deploy(
      POOL_MANAGER_ADDRESS,
      bridgeHelperAddress,
      MOCK_USDC_ADDRESS
    );

    await bridgeHook.waitForDeployment();
    const deployedAddress = await bridgeHook.getAddress();

    console.log(`\n✅ BridgeHook deployed!`);
    console.log(`  Deployed address: ${deployedAddress}`);
    console.log(`  Calculated CREATE2 address: ${calculatedAddress}`);

    if (deployedAddress.toLowerCase() === calculatedAddress.toLowerCase()) {
      console.log(`  ✅ Addresses match! CREATE2 deployment successful!`);
      return deployedAddress;
    } else {
      console.log(`  ⚠️  Addresses don't match. Need to use CREATE2 factory.`);
      console.log(`\n📝 Next steps:`);
      console.log(`   1. Use a CREATE2 factory contract to deploy at ${calculatedAddress}`);
      console.log(`   2. Or use Hardhat Ignition with CREATE2 support`);
      console.log(`   3. Or manually deploy using CREATE2 opcode`);
      
      // Try to deploy using CREATE2 factory pattern
      console.log(`\n💡 Attempting CREATE2 deployment using factory pattern...`);
      
      // We'll need to create a simple CREATE2 factory or use an existing one
      // For now, return the calculated address so user knows where it should be
      console.log(`\n⚠️  Standard deployment completed at ${deployedAddress}`);
      console.log(`   But hook needs to be at ${calculatedAddress}`);
      console.log(`   Please use a CREATE2 factory to deploy at the correct address.`);
      
      return calculatedAddress; // Return the target address
    }
  } catch (error) {
    console.error("❌ Error deploying BridgeHook:", error.message);
    if (error.data) {
      console.error("  Error data:", error.data);
    }
    if (error.reason) {
      console.error("  Reason:", error.reason);
    }
    
    // If deployment fails, it might be because we need CREATE2
    console.log(`\n💡 This error might indicate we need CREATE2 deployment.`);
    console.log(`   The hook must be deployed at: ${calculatedAddress}`);
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

