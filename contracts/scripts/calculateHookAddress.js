// Script to calculate the required CREATE2 address for BridgeHook deployment
// Uniswap v4 hooks must be deployed at a specific address based on their permissions
const { ethers } = require("ethers");

/**
 * Calculate CREATE2 address for a contract
 * @param {string} bytecode - Contract bytecode
 * @param {string} salt - Salt for CREATE2
 * @param {string} deployerAddress - Address of the deployer
 * @returns {string} Calculated CREATE2 address
 */
function calculateCreate2Address(bytecode, salt, deployerAddress) {
  // CREATE2 formula: keccak256(0xff ++ deployerAddress ++ salt ++ keccak256(bytecode))
  const bytecodeHash = ethers.keccak256(bytecode);
  const saltBytes32 = ethers.zeroPadValue(salt, 32);
  
  const create2Input = ethers.concat([
    "0xff",
    deployerAddress,
    saltBytes32,
    bytecodeHash
  ]);
  
  const hash = ethers.keccak256(create2Input);
  // Take last 20 bytes (40 hex chars) for address
  const address = "0x" + hash.slice(-40);
  
  return ethers.getAddress(address);
}

/**
 * Calculate hook address based on Uniswap v4 hook permissions
 * The hook address is determined by the permissions flags
 */
// Private key for the deployer account
const PRIVATE_KEY = "0xff6f5404be473495ef803aab7e1f5c002ed858a4d23e2146697e7d1a13681a1a";

async function calculateHookAddress() {
  // Derive wallet from private key
  const wallet = new ethers.Wallet(PRIVATE_KEY);
  const deployerAddress = wallet.address;

  console.log("🔍 Calculating Required Hook Address for BridgeHook\n");
  console.log("=".repeat(60));
  console.log(`Deployer address: ${deployerAddress}`);

  // Get the BridgeHook contract bytecode by compiling
  const hre = require("hardhat");
  const BridgeHook = await hre.ethers.getContractFactory("BridgeHook");
  const bytecode = BridgeHook.bytecode;
  
  if (!bytecode || bytecode === "0x") {
    throw new Error("Failed to get BridgeHook bytecode. Please compile the contract first.");
  }
  
  console.log(`\n✅ BridgeHook bytecode retrieved (length: ${bytecode.length} chars)`);
  
  // For Uniswap v4 hooks, the salt is typically derived from:
  // 1. Hook permissions (encoded as a uint256)
  // 2. Or a fixed salt if using a deployment helper
  
  // Hook permissions for BridgeHook (only afterSwap = true)
  // Permissions are encoded as a uint256 where each bit represents a permission
  // afterSwap is bit 7 (0-indexed from right)
  const permissions = {
    beforeInitialize: false,      // bit 0
    afterInitialize: false,        // bit 1
    beforeAddLiquidity: false,     // bit 2
    afterAddLiquidity: false,      // bit 3
    beforeRemoveLiquidity: false,  // bit 4
    afterRemoveLiquidity: false,   // bit 5
    beforeSwap: false,              // bit 6
    afterSwap: true,               // bit 7
    beforeDonate: false,           // bit 8
    afterDonate: false,            // bit 9
    beforeSwapReturnDelta: false,  // bit 10
    afterSwapReturnDelta: false,   // bit 11
    afterAddLiquidityReturnDelta: false,  // bit 12
    afterRemoveLiquidityReturnDelta: false // bit 13
  };
  
  // Calculate permissions uint256
  let permissionsUint = 0n;
  if (permissions.afterSwap) permissionsUint |= (1n << 7n);
  
  console.log(`\nHook Permissions:`);
  console.log(`  afterSwap: ${permissions.afterSwap}`);
  console.log(`  Permissions uint256: ${permissionsUint.toString()}`);
  
  // For Uniswap v4, the salt is often the permissions encoded
  // But we need to check the actual Uniswap v4 hook deployment mechanism
  // The salt might be: keccak256(abi.encode(permissions, ...))
  
  // Try different salt calculation methods
  console.log("\n" + "=".repeat(60));
  console.log("📋 Calculated Hook Addresses (Different Methods)");
  console.log("=".repeat(60));
  
  if (bytecode === "0x") {
    console.log("⚠️  Bytecode not provided. Showing salt calculations only.\n");
    console.log("   To get the actual addresses, compile the contract and provide bytecode.\n");
  } else {
    // Method 1: Use permissions as salt directly
    const salt1 = ethers.zeroPadValue(ethers.toBeHex(permissionsUint), 32);
    const address1 = calculateCreate2Address(bytecode, salt1, deployerAddress);
    console.log(`\nMethod 1 (Permissions as salt):`);
    console.log(`  Salt: ${salt1}`);
    console.log(`  Address: ${address1}`);
    
    // Method 2: Use keccak256 of permissions
    const salt2 = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [permissionsUint]));
    const address2 = calculateCreate2Address(bytecode, salt2, deployerAddress);
    console.log(`\nMethod 2 (Keccak256 of permissions):`);
    console.log(`  Salt: ${salt2}`);
    console.log(`  Address: ${address2}`);
    
    // Method 3: Use a fixed salt (for testing)
    const salt3 = ethers.ZeroHash; // 32 bytes of zeros
    const address3 = calculateCreate2Address(bytecode, salt3, deployerAddress);
    console.log(`\nMethod 3 (Zero salt):`);
    console.log(`  Salt: ${salt3}`);
    console.log(`  Address: ${address3}`);
  }
  
  // Show salt calculations regardless
  console.log("\n" + "=".repeat(60));
  console.log("📋 Salt Calculations");
  console.log("=".repeat(60));
  
  const salt1 = ethers.zeroPadValue(ethers.toBeHex(permissionsUint), 32);
  const salt2 = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [permissionsUint]));
  const salt3 = ethers.ZeroHash; // 32 bytes of zeros
  
  console.log(`\nMethod 1 Salt (Permissions as uint256): ${salt1}`);
  console.log(`Method 2 Salt (Keccak256 of permissions): ${salt2}`);
  console.log(`Method 3 Salt (Zero): ${salt3}`);
  
  console.log("\n" + "=".repeat(60));
  console.log("⚠️  IMPORTANT NOTES:");
  console.log("=".repeat(60));
  console.log("1. Uniswap v4 hooks use a specific address calculation mechanism");
  console.log("2. The actual address depends on the Uniswap v4 hook deployment factory");
  console.log("3. You may need to use Uniswap v4's hook deployment tools");
  console.log("4. Check Uniswap v4 documentation for the exact CREATE2 salt calculation");
  console.log("\n💡 Recommended: Use Uniswap v4 SDK or deployment helpers to get the correct address");
  
  const result = {
    deployerAddress: deployerAddress,
    permissions: permissionsUint.toString(),
    salt1: salt1,
    salt2: salt2,
    salt3: salt3
  };

  if (bytecode !== "0x") {
    const address1 = calculateCreate2Address(bytecode, salt1, deployerAddress);
    const address2 = calculateCreate2Address(bytecode, salt2, deployerAddress);
    const address3 = calculateCreate2Address(bytecode, salt3, deployerAddress);
    result.method1 = address1;
    result.method2 = address2;
    result.method3 = address3;
  }

  return result;
}

// If running directly
if (require.main === module) {
  calculateHookAddress()
    .then((result) => {
      console.log("\n✅ Address calculation complete!");
      console.log("\nResults:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Error:", error);
      process.exitCode = 1;
    });
}

module.exports = { calculateHookAddress, calculateCreate2Address };

