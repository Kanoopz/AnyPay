// Script to find a valid hook address for BridgeHook
// Uniswap v4 hooks must have specific bits set in their address based on permissions
// We need AFTER_SWAP_FLAG = 1 << 6 = 64 (0x40)
const { ethers } = require("ethers");
const hre = require("hardhat");

// Hook permission flags from Hooks.sol
const AFTER_SWAP_FLAG = 1n << 6n; // 64 (0x40)
const ALL_HOOK_MASK = (1n << 14n) - 1n; // All 14 permission bits

/**
 * Check if an address has the required hook permissions
 * @param address The address to check
 * @param requiredFlags The flags that must be set
 * @returns true if address has the required flags
 */
function hasRequiredFlags(address, requiredFlags) {
  const addressUint = BigInt(address);
  return (addressUint & requiredFlags) === requiredFlags;
}

/**
 * Find a valid hook address by trying different salts with CREATE2
 * @param deployerAddress The deployer address
 * @param bytecodeHash The keccak256 hash of the deployment bytecode
 * @param requiredFlags The permission flags that must be set
 * @param maxAttempts Maximum number of salts to try
 * @returns Object with salt and calculated address, or null if not found
 */
function findValidHookAddress(deployerAddress, bytecodeHash, requiredFlags, maxAttempts = 10000) {
  console.log(`\nSearching for valid hook address...`);
  console.log(`Required flags: ${requiredFlags.toString()} (0x${requiredFlags.toString(16)})`);
  console.log(`Max attempts: ${maxAttempts}\n`);

  for (let i = 0; i < maxAttempts; i++) {
    // Try different salts
    const salt = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [BigInt(i)]));
    
    // Calculate CREATE2 address
    const create2Input = ethers.concat([
      "0xff",
      deployerAddress,
      salt,
      bytecodeHash
    ]);
    const hash = ethers.keccak256(create2Input);
    const address = "0x" + hash.slice(-40);
    const addressUint = BigInt(address);
    
    // Check if address has required flags and doesn't have unwanted flags
    const addressFlags = addressUint & ALL_HOOK_MASK;
    const hasRequired = (addressFlags & requiredFlags) === requiredFlags;
    const hasOnlyRequired = addressFlags === requiredFlags;
    
    if (hasRequired) {
      console.log(`✅ Found valid address at attempt ${i + 1}:`);
      console.log(`   Address: ${address}`);
      console.log(`   Flags: 0x${addressFlags.toString(16)}`);
      console.log(`   Salt: ${salt}`);
      console.log(`   Has only required flags: ${hasOnlyRequired}`);
      
      return {
        address: address,
        salt: salt,
        flags: addressFlags.toString(),
        attempt: i + 1,
        hasOnlyRequired: hasOnlyRequired
      };
    }
    
    if ((i + 1) % 1000 === 0) {
      process.stdout.write(`\rAttempted ${i + 1} addresses...`);
    }
  }
  
  console.log(`\n❌ Could not find valid address after ${maxAttempts} attempts`);
  return null;
}

async function main() {
  console.log("🔍 Finding Valid Hook Address for BridgeHook\n");
  console.log("=".repeat(60));

  // Private key for the deployer account
  const PRIVATE_KEY = "0xff6f5404be473495ef803aab7e1f5c002ed858a4d23e2146697e7d1a13681a1a";
  const wallet = new ethers.Wallet(PRIVATE_KEY);
  const deployerAddress = wallet.address;

  console.log(`Deployer address: ${deployerAddress}`);

  // Get BridgeHook bytecode with constructor args
  const POOL_MANAGER_ADDRESS = "0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317";
  const BRIDGE_HELPER_ADDRESS = "0x7934847d4a19F01FDC4ce8314417C78582022565"; // Will be updated
  const MOCK_USDC_ADDRESS = "0x6355020E839EC69441F606466C30A5fFC96f3D82";

  console.log("\nCompiling BridgeHook...");
  await hre.run("compile");
  
  const BridgeHook = await hre.ethers.getContractFactory("BridgeHook");
  const bytecode = BridgeHook.bytecode;
  
  // Encode constructor arguments
  const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "address"],
    [POOL_MANAGER_ADDRESS, BRIDGE_HELPER_ADDRESS, MOCK_USDC_ADDRESS]
  );

  // Combine bytecode with constructor arguments
  const deploymentBytecode = bytecode + constructorArgs.slice(2);
  const bytecodeHash = ethers.keccak256(deploymentBytecode);

  console.log(`✅ Bytecode hash: ${bytecodeHash}\n`);

  // Find valid address
  const result = findValidHookAddress(deployerAddress, bytecodeHash, AFTER_SWAP_FLAG, 50000);

  if (result) {
    console.log("\n" + "=".repeat(60));
    console.log("📋 Deployment Information");
    console.log("=".repeat(60));
    console.log(`\nHook Address: ${result.address}`);
    console.log(`Salt: ${result.salt}`);
    console.log(`Flags: 0x${result.flags}`);
    console.log(`Attempts: ${result.attempt}`);
    console.log(`\n✅ This address has the required AFTER_SWAP_FLAG set!`);
    console.log(`   You can deploy the hook using CREATE2 with this salt.`);
  } else {
    console.log("\n💡 Try increasing maxAttempts or use a different deployer address.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exitCode = 1;
  });

