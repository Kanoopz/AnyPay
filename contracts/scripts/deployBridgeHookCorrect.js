// Script to deploy BridgeHook at an address with the correct bits set
// Uniswap v4 hooks must have specific bits in their address based on permissions
// AFTER_SWAP_FLAG = 1 << 6 = 64 (0x40) - bit 6 must be set
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

  // Hook permission flags
const AFTER_SWAP_FLAG = 1n << 6n; // 64 (0x40)
const ALL_HOOK_MASK = (1n << 14n) - 1n; // All 14 permission bits (0x3FFF)

async function main() {
  console.log("🚀 Deploying BridgeHook with Correct Address Bits\n");
  console.log("=".repeat(60));

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(ARB_SEPOLIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const deployerAddress = wallet.address;

  console.log(`Network: Arbitrum Sepolia`);
  console.log(`Deployer address: ${deployerAddress}\n`);

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

  // Step 2: Deploy CREATE2Factory first (we need its address to calculate)
  console.log("=".repeat(60));
  console.log("📦 Step 2: Deploying CREATE2Factory");
  console.log("=".repeat(60));

  const CREATE2Factory = await hre.ethers.getContractFactory("CREATE2Factory");
  const factory = await CREATE2Factory.connect(wallet).deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`✅ CREATE2Factory deployed: ${factoryAddress}\n`);

  // Step 3: Find valid hook address using factory address
  console.log("=".repeat(60));
  console.log("🔍 Step 3: Finding Valid Hook Address");
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

  console.log(`Bytecode hash: ${bytecodeHash}`);
  console.log(`Factory address: ${factoryAddress}`);
  console.log(`Required flag: AFTER_SWAP_FLAG = ${AFTER_SWAP_FLAG.toString()} (0x${AFTER_SWAP_FLAG.toString(16)})\n`);

  // Find a salt that produces an address with the correct bits
  // IMPORTANT: Use factory address, not deployer address!
  let validSalt = null;
  let validAddress = null;
  const maxAttempts = 100000;

  console.log(`Searching for valid address using factory address (max ${maxAttempts} attempts)...`);
  for (let i = 0; i < maxAttempts; i++) {
    const salt = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [BigInt(i)]));
    
    // Calculate CREATE2 address using FACTORY address (not deployer!)
    const create2Input = ethers.concat([
      "0xff",
      factoryAddress,
      salt,
      bytecodeHash
    ]);
    const hash = ethers.keccak256(create2Input);
    const address = "0x" + hash.slice(-40);
    const addressUint = BigInt(address);
    
    // Check if address has ONLY AFTER_SWAP_FLAG set (no other permission bits)
    const addressFlags = addressUint & ALL_HOOK_MASK;
    const hasAfterSwap = (addressFlags & AFTER_SWAP_FLAG) === AFTER_SWAP_FLAG;
    const hasOnlyAfterSwap = addressFlags === AFTER_SWAP_FLAG;
    
    if (hasAfterSwap && hasOnlyAfterSwap) {
      validSalt = salt;
      validAddress = address;
      console.log(`✅ Found valid address at attempt ${i + 1}:`);
      console.log(`   Address: ${address}`);
      console.log(`   Salt: ${salt}`);
      console.log(`   Address flags: 0x${addressFlags.toString(16)} (ONLY AFTER_SWAP_FLAG)\n`);
      break;
    }
    
    if ((i + 1) % 10000 === 0) {
      process.stdout.write(`\rAttempted ${i + 1} addresses...`);
    }
  }

  if (!validSalt || !validAddress) {
    throw new Error(`Could not find valid address after ${maxAttempts} attempts. Try increasing maxAttempts.`);
  }

  // Step 4: Deploy BridgeHook using CREATE2
  console.log("=".repeat(60));
  console.log("📦 Step 4: Deploying BridgeHook using CREATE2");
  console.log("=".repeat(60));
  
  // Verify the address calculation matches
  const calculatedAddress = await factory.computeAddress(bytecodeHash, validSalt);
  if (calculatedAddress.toLowerCase() !== validAddress.toLowerCase()) {
    throw new Error(`Address mismatch! Calculated: ${calculatedAddress}, Expected: ${validAddress}`);
  }
  console.log(`✅ Address verification passed: ${calculatedAddress}\n`);

  console.log(`Deploying to: ${validAddress}`);
  console.log(`  PoolManager: ${POOL_MANAGER_ADDRESS}`);
  console.log(`  BridgeHelper: ${bridgeHelperAddress}`);
  console.log(`  MockUSDC: ${MOCK_USDC_ADDRESS}\n`);

  // Check if already deployed
  const existingCode = await provider.getCode(validAddress);
  if (existingCode !== "0x" && existingCode !== null) {
    console.log("⚠️  Contract already exists at this address!");
    console.log(`   Address: ${validAddress}`);
    console.log("   Skipping deployment...\n");
    return validAddress;
  }

  try {
    const tx = await factory.deploy(deploymentBytecode, validSalt);
    console.log(`  Transaction hash: ${tx.hash}`);
    console.log("  Waiting for confirmation...");
    await tx.wait();
    console.log("  ✅ Transaction confirmed!\n");

    // Verify deployment
    const deployedCode = await provider.getCode(validAddress);
    if (deployedCode !== "0x" && deployedCode !== null) {
      console.log("✅ BridgeHook successfully deployed!");
      console.log(`   Address: ${validAddress}`);
      console.log(`   This address has the AFTER_SWAP_FLAG bit set, so BaseHook validation will pass.\n`);
      return validAddress;
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

