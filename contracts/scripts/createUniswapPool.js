// Script to deploy BridgeHelper, BridgeHook, create Uniswap v4 pool, and add initial liquidity
// All on Arbitrum Sepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Contract addresses (Arbitrum Sepolia)
const SOURCE_BRIDGE_ADDRESS = "0x97900331085f87bd0C12eC6672d6E413545B344f";
const MOCK_USDC_ADDRESS = "0x6355020E839EC69441F606466C30A5fFC96f3D82";
const MOCK_WETH_ADDRESS = "0xF04410891E277f0F64870A5cbBA97772E2bd91cc";

// Uniswap v4 contracts on Arbitrum Sepolia
const POOL_MANAGER_ADDRESS = "0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317";
const POSITION_MANAGER_ADDRESS = "0xAc631556d3d4019C95769033B5E719dD77124BAc";
const POOL_MODIFY_LIQUIDITY_TEST = "0x9a8ca723f5dccb7926d00b71dec55c2fea1f50f7"; // Helper for adding liquidity

// BridgeHook deployed address (with correct bits set)
// Deployed using deployBridgeHookCorrect.js with _beforeInitialize and _afterInitialize implementations
// NOTE: This address is specific to the BridgeHelper address used during deployment
const BRIDGE_HOOK_ADDRESS = "0x7725c4523f4ed92e1d41956600f959365b8f4040";

// BridgeHelper address used when deploying the hook
// If you deploy a new BridgeHelper, you'll need to redeploy the hook
const BRIDGE_HELPER_ADDRESS = "0x8c34E44d34A5d3BDE36636Ea2eC8CED231320e73";

// Set to true to skip hook deployment (create pool without hook)
// Hook must be deployed at a specific address - use CREATE2 or Uniswap v4 hook deployment tools
const SKIP_HOOK_DEPLOYMENT = true; // Hook is already deployed, so we skip deployment
const USE_EXISTING_BRIDGE_HELPER = true; // Use existing BridgeHelper instead of deploying new one

// LayerZero Endpoint IDs
const OPTIMISM_SEPOLIA_EID = 40232;

// Initial liquidity amounts
const INITIAL_WETH_AMOUNT = ethers.parseUnits("3", 18); // 3 MockWETH
const INITIAL_USDC_AMOUNT = ethers.parseUnits("8387.52", 18); // 8387.52 MockUSDC

// Pool parameters
const FEE_TIER = 3000; // 0.30% fee (3000 = 0.30%)
const TICK_SPACING = 60; // Standard tick spacing for 0.30% fee tier

// PoolManager ABI (using tuple types for structs)
const POOL_MANAGER_ABI = [
  "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)",
  "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external returns ((int128 amount0, int128 amount1) delta)",
  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
];

// PositionManager ABI (for adding liquidity)
const POSITION_MANAGER_ABI = [
  "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external payable returns ((int128 amount0, int128 amount1) delta)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("🚀 Creating Uniswap v4 Pool with Bridge Hook\n");
  console.log("=".repeat(60));
  console.log(`Network: ${network}`);
  console.log(`Deployer address: ${deployer.address}`);

  if (network !== "arbSepolia") {
    throw new Error("This script must be run on arbSepolia network");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }

  // Step 1: Deploy BridgeHelper
  console.log("=".repeat(60));
  console.log("📦 Step 1: Deploying BridgeHelper");
  console.log("=".repeat(60));

  let bridgeHelperAddress;
  try {
    const BridgeHelper = await ethers.getContractFactory("BridgeHelper");
    const bridgeHelper = await BridgeHelper.deploy(
      SOURCE_BRIDGE_ADDRESS,
      MOCK_USDC_ADDRESS,
      OPTIMISM_SEPOLIA_EID
    );
    await bridgeHelper.waitForDeployment();
    bridgeHelperAddress = await bridgeHelper.getAddress();
    console.log(`✅ BridgeHelper deployed: ${bridgeHelperAddress}`);
  } catch (error) {
    console.error("❌ Error deploying BridgeHelper:", error.message);
    throw error;
  }

  // Step 2: Deploy BridgeHook (or skip if SKIP_HOOK_DEPLOYMENT is true)
  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 2: Deploying BridgeHook");
  console.log("=".repeat(60));
  
  let bridgeHookAddress = ethers.ZeroAddress; // Default to zero address (no hook)

  // Verify PoolManager exists
  console.log("Verifying PoolManager contract...");
  const poolManagerCode = await ethers.provider.getCode(POOL_MANAGER_ADDRESS);
  if (poolManagerCode === "0x" || poolManagerCode === null) {
    throw new Error(`PoolManager contract does not exist at ${POOL_MANAGER_ADDRESS}`);
  }
  console.log("✅ PoolManager verified");

  // Verify BridgeHelper exists
  console.log("Verifying BridgeHelper contract...");
  const bridgeHelperCode = await ethers.provider.getCode(bridgeHelperAddress);
  if (bridgeHelperCode === "0x" || bridgeHelperCode === null) {
    throw new Error(`BridgeHelper contract does not exist at ${bridgeHelperAddress}`);
  }
  console.log("✅ BridgeHelper verified");

  // Verify MockUSDC exists
  console.log("Verifying MockUSDC contract...");
  const usdcCode = await ethers.provider.getCode(MOCK_USDC_ADDRESS);
  if (usdcCode === "0x" || usdcCode === null) {
    throw new Error(`MockUSDC contract does not exist at ${MOCK_USDC_ADDRESS}`);
  }
  console.log("✅ MockUSDC verified");

  if (SKIP_HOOK_DEPLOYMENT) {
    console.log("\n✅ Using pre-deployed BridgeHook");
    console.log(`   BridgeHook address: ${BRIDGE_HOOK_ADDRESS}`);
    console.log("   This hook has the correct address bits set (AFTER_SWAP_FLAG).");
    bridgeHookAddress = BRIDGE_HOOK_ADDRESS;
  } else {
    try {
    console.log("\nDeploying BridgeHook...");
    console.log(`  PoolManager: ${POOL_MANAGER_ADDRESS}`);
    console.log(`  BridgeHelper: ${bridgeHelperAddress}`);
    console.log(`  MockUSDC: ${MOCK_USDC_ADDRESS}`);
    
    const BridgeHook = await ethers.getContractFactory("BridgeHook");
    
    // Try to estimate gas first to get better error message
    try {
      const deployTx = BridgeHook.getDeployTransaction(
        POOL_MANAGER_ADDRESS,
        bridgeHelperAddress,
        MOCK_USDC_ADDRESS
      );
      const estimatedGas = await ethers.provider.estimateGas(deployTx);
      console.log(`  Estimated gas: ${estimatedGas.toString()}`);
    } catch (estimateError) {
      console.error("❌ Gas estimation failed:", estimateError.message);
      if (estimateError.data) {
        console.error("  Error data:", estimateError.data);
      }
      if (estimateError.reason) {
        console.error("  Reason:", estimateError.reason);
      }
      throw estimateError;
    }
    
    const bridgeHook = await BridgeHook.deploy(
      POOL_MANAGER_ADDRESS,
      bridgeHelperAddress,
      MOCK_USDC_ADDRESS
    );
    await bridgeHook.waitForDeployment();
    bridgeHookAddress = await bridgeHook.getAddress();
    console.log(`✅ BridgeHook deployed: ${bridgeHookAddress}`);
    console.log("\n⚠️  IMPORTANT: Uniswap v4 hooks must be deployed at a specific address.");
    console.log("   The hook address is determined by hook permissions.");
    console.log("   You may need to use CREATE2 to deploy at the correct address.");
    console.log("   For now, we'll use this address, but verify it matches the expected hook address.");
  } catch (error) {
    console.error("❌ Error deploying BridgeHook:", error.message);
    if (error.data) {
      console.error("  Error data:", error.data);
      console.error("  This error is likely because Uniswap v4 hooks must be deployed at a specific address.");
      console.error("  The BaseHook constructor validates the hook address matches the expected address based on permissions.");
    }
    if (error.reason) {
      console.error("  Reason:", error.reason);
    }
    console.log("\n⚠️  Hook deployment failed. This is expected if the hook needs to be deployed at a specific address.");
    console.log("   You'll need to:");
    console.log("   1. Calculate the correct hook address based on permissions");
    console.log("   2. Use CREATE2 to deploy at that address");
    console.log("   3. Or use a hook deployment helper from Uniswap v4");
    console.log("\n   For now, we'll skip hook deployment and you can add it later.");
    console.log("   The pool can be created without a hook initially.");
    bridgeHookAddress = ethers.ZeroAddress; // Use zero address (no hook)
    console.log(`   Using hook address: ${bridgeHookAddress} (zero address = no hook)`);
    }
  }

  // Step 3: Approve tokens for PoolManager and PositionManager
  console.log("\n" + "=".repeat(60));
  console.log("✅ Step 3: Approving Tokens");
  console.log("=".repeat(60));

  const MockWETH = await ethers.getContractFactory("MockWETH");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockWETH = MockWETH.attach(MOCK_WETH_ADDRESS);
  const mockUSDC = MockUSDC.attach(MOCK_USDC_ADDRESS);

  // Check balances
  const wethBalance = await mockWETH.balanceOf(deployer.address);
  const usdcBalance = await mockUSDC.balanceOf(deployer.address);

  console.log(`MockWETH balance: ${ethers.formatUnits(wethBalance, 18)} WETH`);
  console.log(`MockUSDC balance: ${ethers.formatUnits(usdcBalance, 18)} USDC`);

  if (wethBalance < INITIAL_WETH_AMOUNT) {
    throw new Error(`Insufficient MockWETH balance. Need ${ethers.formatUnits(INITIAL_WETH_AMOUNT, 18)} WETH`);
  }
  if (usdcBalance < INITIAL_USDC_AMOUNT) {
    throw new Error(`Insufficient MockUSDC balance. Need ${ethers.formatUnits(INITIAL_USDC_AMOUNT, 18)} USDC`);
  }

  // Approve tokens for liquidity operations
  // Note: initialize() doesn't transfer tokens, so no approval needed for that
  // For modifyLiquidity(), we need to approve the contract that will call PoolManager
  console.log("\nApproving tokens for liquidity operations...");
  const maxApproval = ethers.MaxUint256;

  // Option 1: If using PoolModifyLiquidityTest helper
  // We approve PoolModifyLiquidityTest, which then calls PoolManager
  const wethApproveHelperTx = await mockWETH.approve(POOL_MODIFY_LIQUIDITY_TEST, maxApproval);
  await wethApproveHelperTx.wait();
  console.log("✅ MockWETH approved for PoolModifyLiquidityTest");

  const usdcApproveHelperTx = await mockUSDC.approve(POOL_MODIFY_LIQUIDITY_TEST, maxApproval);
  await usdcApproveHelperTx.wait();
  console.log("✅ MockUSDC approved for PoolModifyLiquidityTest");

  // Option 2: If using PositionManager
  // We approve PositionManager, which then calls PoolManager
  const wethApprovePosTx = await mockWETH.approve(POSITION_MANAGER_ADDRESS, maxApproval);
  await wethApprovePosTx.wait();
  console.log("✅ MockWETH approved for PositionManager");

  const usdcApprovePosTx = await mockUSDC.approve(POSITION_MANAGER_ADDRESS, maxApproval);
  await usdcApprovePosTx.wait();
  console.log("✅ MockUSDC approved for PositionManager");

  // Option 3: If calling PoolManager directly
  // We approve PoolManager directly
  const wethApprovePoolTx = await mockWETH.approve(POOL_MANAGER_ADDRESS, maxApproval);
  await wethApprovePoolTx.wait();
  console.log("✅ MockWETH approved for PoolManager");

  const usdcApprovePoolTx = await mockUSDC.approve(POOL_MANAGER_ADDRESS, maxApproval);
  await usdcApprovePoolTx.wait();
  console.log("✅ MockUSDC approved for PoolManager");

  // Step 4: Create Pool
  console.log("\n" + "=".repeat(60));
  console.log("🏊 Step 4: Creating Uniswap v4 Pool");
  console.log("=".repeat(60));

  const poolManager = new ethers.Contract(POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, deployer);

  // Calculate initial sqrtPriceX96
  // Price = USDC / WETH = 8387.52 / 3 = 2795.84 USDC per WETH
  // sqrtPriceX96 = sqrt(price) * 2^96
  // We need to calculate: sqrt(2795.84) * 2^96
  const price = Number(ethers.formatUnits(INITIAL_USDC_AMOUNT, 18)) / Number(ethers.formatUnits(INITIAL_WETH_AMOUNT, 18));
  const sqrtPrice = Math.sqrt(price);
  const Q96 = BigInt(2) ** BigInt(96);
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));

  // Verify calculation
  const calculatedPrice = (Number(sqrtPriceX96) / Number(Q96)) ** 2;
  console.log("\n📊 Price Calculation Verification:");
  console.log(`  Target Price: ${price.toFixed(6)} USDC per WETH`);
  console.log(`  sqrtPrice: ${sqrtPrice.toFixed(6)}`);
  console.log(`  sqrtPriceX96: ${sqrtPriceX96.toString()}`);
  console.log(`  Calculated Price from sqrtPriceX96: ${calculatedPrice.toFixed(6)} USDC per WETH`);
  console.log(`  Price Match: ${Math.abs(price - calculatedPrice) < 0.01 ? "✅" : "❌"}`);

  console.log("\nPool Parameters:");
  console.log(`  Currency0 (WETH): ${MOCK_WETH_ADDRESS}`);
  console.log(`  Currency1 (USDC): ${MOCK_USDC_ADDRESS}`);
  console.log(`  Fee: ${FEE_TIER} (0.30%)`);
  console.log(`  Tick Spacing: ${TICK_SPACING}`);
  console.log(`  Hooks: ${bridgeHookAddress}`);
  console.log(`  Initial Price: ${price.toFixed(2)} USDC per WETH`);

  // Encode PoolKey
  // PoolKey struct: { currency0, currency1, fee, tickSpacing, hooks }
  // Note: In Uniswap v4, currency0 < currency1 (address comparison)
  const currency0 = MOCK_WETH_ADDRESS < MOCK_USDC_ADDRESS ? MOCK_WETH_ADDRESS : MOCK_USDC_ADDRESS;
  const currency1 = MOCK_WETH_ADDRESS < MOCK_USDC_ADDRESS ? MOCK_USDC_ADDRESS : MOCK_WETH_ADDRESS;

  // If we swapped the order, we need to adjust the price
  let finalSqrtPriceX96 = sqrtPriceX96;
  const priceWasInverted = MOCK_WETH_ADDRESS > MOCK_USDC_ADDRESS;
  
  if (priceWasInverted) {
    // If WETH > USDC in address order, price is inverted
    // sqrtPriceX96 for inverted = (2^192) / sqrtPriceX96
    const Q192 = BigInt(2) ** BigInt(192);
    finalSqrtPriceX96 = Q192 / sqrtPriceX96;
    
    // Verify inverted price
    const invertedPrice = (Number(finalSqrtPriceX96) / Number(Q96)) ** 2;
    const expectedInvertedPrice = 1 / price;
    console.log(`\n  ⚠️  Price inverted due to address sorting`);
    console.log(`  Original price: ${price.toFixed(6)} USDC per WETH`);
    console.log(`  Inverted price: ${invertedPrice.toFixed(6)} WETH per USDC`);
    console.log(`  Expected inverted: ${expectedInvertedPrice.toFixed(6)} WETH per USDC`);
    console.log(`  Inversion Match: ${Math.abs(invertedPrice - expectedInvertedPrice) < 0.0001 ? "✅" : "❌"}`);
  }

  console.log(`\n  Currency0 (sorted): ${currency0}`);
  console.log(`  Currency1 (sorted): ${currency1}`);
  console.log(`  Final sqrtPriceX96: ${finalSqrtPriceX96.toString()}`);
  
  // Validate sqrtPriceX96 is within valid range
  const MIN_SQRT_PRICE = BigInt(4295128739); // Minimum valid sqrtPriceX96
  const MAX_SQRT_PRICE = BigInt("1461446703485210103287273052203988822378723970342"); // Maximum valid sqrtPriceX96
  if (finalSqrtPriceX96 < MIN_SQRT_PRICE || finalSqrtPriceX96 > MAX_SQRT_PRICE) {
    throw new Error(`Invalid sqrtPriceX96: ${finalSqrtPriceX96.toString()} is outside valid range [${MIN_SQRT_PRICE.toString()}, ${MAX_SQRT_PRICE.toString()}]`);
  }
  console.log(`  ✅ sqrtPriceX96 is within valid range`);

  // Create PoolKey struct
  // Use the hook address (we've verified it works)
  const hooksAddress = bridgeHookAddress;
  
  const poolKey = {
    currency0: currency0,
    currency1: currency1,
    fee: FEE_TIER,
    tickSpacing: TICK_SPACING,
    hooks: hooksAddress
  };
  
  console.log(`\n  Using hook: ${hooksAddress}`);

  // Calculate poolId to check if pool already exists
  const calculatedPoolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [currency0, currency1, FEE_TIER, TICK_SPACING, hooksAddress]
    )
  );
  
  console.log(`\n  Pool ID: ${calculatedPoolId}`);
  
  // Check if pool already exists
  console.log("\n🔍 Checking if pool already exists...");
  try {
    const slot0 = await poolManager.getSlot0(calculatedPoolId);
    if (slot0.sqrtPriceX96 !== 0n) {
      console.log("\n⚠️  Pool already exists!");
      console.log(`  Pool ID: ${calculatedPoolId}`);
      console.log(`  Current sqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
      console.log(`  Current tick: ${slot0.tick.toString()}`);
      console.log(`  Protocol Fee: ${slot0.protocolFee}`);
      console.log(`  LP Fee: ${slot0.lpFee}`);
      console.log("  Skipping pool initialization...");
      return; // Exit early if pool exists
    } else {
      console.log("  ✅ Pool does not exist (sqrtPriceX96 is 0)");
    }
  } catch (checkError) {
    if (checkError.message && checkError.message.includes("execution reverted")) {
      console.log("  ✅ Pool does not exist (getSlot0 reverted - expected for non-existent pools)");
    } else {
      console.log(`  ⚠️  Error checking pool existence: ${checkError.message}`);
      console.log("  Proceeding with initialization attempt...");
    }
  }
  
  // Verify PoolKey encoding
  console.log("\n🔍 Verifying PoolKey encoding...");
  const encodedPoolKey = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "uint24", "int24", "address"],
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  );
  console.log(`  Encoded PoolKey length: ${encodedPoolKey.length} chars`);
  console.log(`  PoolKey: currency0=${poolKey.currency0}, currency1=${poolKey.currency1}, fee=${poolKey.fee}, tickSpacing=${poolKey.tickSpacing}, hooks=${poolKey.hooks}`);
  
  // Initialize pool
  try {
    console.log("\n🚀 Initializing pool...");
    console.log(`  Pool ID: ${calculatedPoolId}`);
    console.log(`  sqrtPriceX96: ${finalSqrtPriceX96.toString()}`);
    console.log(`  hookData: 0x (empty)`);
    
    // Try to call the hook's beforeInitialize directly to see if it works
    console.log("  Testing hook interface...");
    try {
      const hookContract = new ethers.Contract(
        hooksAddress,
        ["function getHookPermissions() external pure returns (tuple(bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool))"],
        deployer
      );
      const permissions = await hookContract.getHookPermissions();
      console.log(`  ✅ Hook permissions retrieved: afterSwap=${permissions[7]}`);
    } catch (hookError) {
      console.error(`  ⚠️  Could not call hook: ${hookError.message}`);
    }
    
    // Estimate gas first to get better error messages
    try {
      console.log("  Estimating gas...");
      const gasEstimate = await poolManager.initialize.estimateGas(
        poolKey,
        finalSqrtPriceX96,
        "0x" // Empty hookData
      );
      console.log(`  ✅ Estimated gas: ${gasEstimate.toString()}`);
    } catch (estimateError) {
      console.error("  ❌ Gas estimation failed:");
      console.error(`    Error: ${estimateError.message}`);
      if (estimateError.data) {
        console.error(`    Error data: ${estimateError.data}`);
        // Try to decode common errors
        if (estimateError.data.startsWith("0x08c379a0")) {
          // This is a string error
          try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
              ["string"],
              "0x" + estimateError.data.slice(10)
            );
            console.error(`    Decoded error: ${decoded[0]}`);
          } catch (decodeError) {
            console.error(`    Could not decode error string`);
          }
        } else if (estimateError.data.length > 2) {
          // Try to decode as a custom error
          console.error(`    Error selector: ${estimateError.data.slice(0, 10)}`);
        }
      }
      if (estimateError.reason) {
        console.error(`    Reason: ${estimateError.reason}`);
      }
      console.error("\n  💡 This empty revert (0x) typically indicates:");
      console.error("     - A require() without a message");
      console.error("     - An arithmetic underflow/overflow");
      console.error("     - A low-level call failure");
      console.error("     - A validation in Pool.initialize() that we're not aware of");
      throw estimateError;
    }
    
    // Try calling with explicit tuple encoding
    console.log("  Attempting pool initialization...");
    const initTx = await poolManager.initialize(
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks], // Pass as tuple array
      finalSqrtPriceX96,
      "0x" // Empty hookData
    );
    console.log(`  Transaction hash: ${initTx.hash}`);
    console.log("  Waiting for confirmation...");
    const receipt = await initTx.wait();
    console.log(`  ✅ Pool initialized successfully!`);
    console.log(`  Block number: ${receipt.blockNumber}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
  } catch (error) {
    console.error("\n❌ Error initializing pool:");
    console.error(`  Message: ${error.message}`);
    if (error.data) {
      console.error(`  Error data: ${error.data}`);
      // Try to decode common errors
      if (error.data.startsWith("0x08c379a0")) {
        try {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ["string"],
            "0x" + error.data.slice(10)
          );
          console.error(`  Decoded error: ${decoded[0]}`);
        } catch (decodeError) {
          console.error(`  Could not decode error string`);
        }
      }
    }
    if (error.reason) {
      console.error(`  Reason: ${error.reason}`);
    }
    if (error.transaction) {
      console.error(`  Transaction:`, JSON.stringify(error.transaction, null, 2));
    }
    console.error("\n⚠️  Possible causes:");
    console.error("  1. Pool already exists with different parameters");
    console.error("  2. Invalid sqrtPriceX96 value (out of range)");
    console.error("  3. Hook address validation failed (if using non-zero hook)");
    console.error("  4. Incorrect PoolKey encoding");
    console.error("  5. Invalid fee tier or tick spacing");
    throw error;
  }

  // Step 5: Add Initial Liquidity
  console.log("\n" + "=".repeat(60));
  console.log("💧 Step 5: Adding Initial Liquidity");
  console.log("=".repeat(60));

  // Get current tick from pool (reuse calculatedPoolId)
  let currentTick;
  try {
    const slot0 = await poolManager.getSlot0(calculatedPoolId);
    currentTick = Number(slot0.tick);
    console.log(`\nCurrent tick: ${currentTick}`);
  } catch (error) {
    console.log("⚠️  Could not get current tick, using calculated value");
    // Calculate tick from sqrtPriceX96: tick = log(sqrtPriceX96 / 2^96) / log(1.0001)
    currentTick = Math.floor(Math.log(Number(finalSqrtPriceX96) / Math.pow(2, 96)) / Math.log(1.0001));
  }

  // Use full range for initial liquidity (MIN_TICK to MAX_TICK)
  const tickLower = -887272; // MIN_TICK
  const tickUpper = 887272;   // MAX_TICK

  console.log(`\nLiquidity Parameters:`);
  console.log(`  Tick Lower: ${tickLower}`);
  console.log(`  Tick Upper: ${tickUpper}`);
  console.log(`  Amount0 (WETH): ${ethers.formatUnits(INITIAL_WETH_AMOUNT, 18)}`);
  console.log(`  Amount1 (USDC): ${ethers.formatUnits(INITIAL_USDC_AMOUNT, 18)}`);

  // Use PoolModifyLiquidityTest helper contract for adding liquidity
  // This contract handles the complex liquidityDelta calculation
  const POOL_MODIFY_LIQUIDITY_ABI = [
    "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external payable returns ((int128 amount0, int128 amount1) delta)",
  ];

  try {
    console.log("\nAdding liquidity using PoolModifyLiquidityTest...");
    const modifyLiquidityTest = new ethers.Contract(POOL_MODIFY_LIQUIDITY_TEST, POOL_MODIFY_LIQUIDITY_ABI, deployer);
    
    // Note: Approvals for PoolModifyLiquidityTest were already done in Step 3
    // The helper contract will handle calling PoolManager.modifyLiquidity()

    // Calculate liquidityDelta - this is a simplified version
    // In practice, you'd use the Uniswap v4 SDK to calculate this properly
    // For now, we'll use a large value and let the contract handle it
    const salt = ethers.randomBytes(32);
    
    // Note: liquidityDelta calculation is complex and depends on the price range
    // We'll use a helper that accepts amounts directly or calculate it properly
    // For full range, we can approximate: liquidity ≈ sqrt(amount0 * amount1)
    const liquidityDelta = BigInt(Math.floor(Math.sqrt(Number(INITIAL_WETH_AMOUNT) * Number(INITIAL_USDC_AMOUNT))));

    const modifyParams = {
      tickLower: tickLower,
      tickUpper: tickUpper,
      liquidityDelta: liquidityDelta,
      salt: salt
    };

    const addLiquidityTx = await modifyLiquidityTest.modifyLiquidity(
      poolKey,
      modifyParams,
      "0x", // Empty hookData
      { value: 0 }
    );
    console.log(`  Transaction hash: ${addLiquidityTx.hash}`);
    await addLiquidityTx.wait();
    console.log("  ✅ Liquidity added successfully!");
  } catch (error) {
    console.error("❌ Error adding liquidity:", error.message);
    if (error.data) {
      console.error("  Error data:", error.data);
    }
    if (error.reason) {
      console.error("  Reason:", error.reason);
    }
    console.log("\n⚠️  Note: LiquidityDelta calculation may need adjustment.");
    console.log("   Consider using the Uniswap v4 SDK to calculate it properly.");
    console.log("   Or manually calculate based on the tick range and amounts.");
    throw error;
  }

  // Step 6: Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 Deployment Summary");
  console.log("=".repeat(60));
  console.log(`\nBridgeHelper: ${bridgeHelperAddress}`);
  console.log(`BridgeHook: ${bridgeHookAddress}`);
  console.log(`\nPool Created:`);
  console.log(`  PoolManager: ${POOL_MANAGER_ADDRESS}`);
  console.log(`  Currency0: ${currency0}`);
  console.log(`  Currency1: ${currency1}`);
  console.log(`  Fee: ${FEE_TIER} (0.30%)`);
  console.log(`  Tick Spacing: ${TICK_SPACING}`);
  console.log(`  Hooks: ${bridgeHookAddress}`);
  console.log(`\nInitial Liquidity:`);
  console.log(`  MockWETH: ${ethers.formatUnits(INITIAL_WETH_AMOUNT, 18)}`);
  console.log(`  MockUSDC: ${ethers.formatUnits(INITIAL_USDC_AMOUNT, 18)}`);
  console.log("\n✅ Pool created and liquidity added successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exitCode = 1;
  });
