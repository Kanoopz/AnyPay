// Script to deposit 0.1 WETH to MockPool and bridge USDC to Optimism Sepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Contract addresses (Arbitrum Sepolia)
const MOCK_WETH_ADDRESS = "0xF04410891E277f0F64870A5cbBA97772E2bd91cc";
const MOCK_POOL_ADDRESS = "0x938ca82EbBbD32B392542FcB5F1D6Aa97f59986d";
const SOURCE_BRIDGE_ADDRESS = "0x97900331085f87bd0C12eC6672d6E413545B344f";

// Optimism Sepolia EID
const OPTIMISM_SEPOLIA_EID = 40232;

// Recipient address on Optimism Sepolia
const RECIPIENT_ADDRESS = "0x2dD6B1B4E37054fed6cC937f51546eFA31c8F615";

// Swap amount
const WETH_DEPOSIT_AMOUNT = ethers.parseEther("0.1"); // 0.1 WETH
const USDC_OUTPUT_AMOUNT = ethers.parseEther("280.9"); // 280.9 USDC

async function main() {
  const [signer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("🔄 Executing Swap and Bridge\n");
  console.log("=".repeat(60));
  console.log(`Network: ${network}`);
  console.log(`Account: ${signer.address}`);
  console.log(`Recipient (Optimism Sepolia): ${RECIPIENT_ADDRESS}\n`);

  if (network !== "arbSepolia") {
    throw new Error("This script must be run on arbSepolia network");
  }

  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Account ETH balance: ${ethers.formatEther(balance)} ETH\n`);

  // Get contracts
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const mockWETH = MockWETH.attach(MOCK_WETH_ADDRESS);

  const MockPool = await ethers.getContractFactory("MockPool");
  const mockPool = MockPool.attach(MOCK_POOL_ADDRESS);

  // Check balances
  console.log("=".repeat(60));
  console.log("📊 Checking Balances");
  console.log("=".repeat(60));

  const wethBalance = await mockWETH.balanceOf(signer.address);
  console.log(`\nAccount WETH balance: ${ethers.formatEther(wethBalance)} WETH`);

  if (wethBalance < WETH_DEPOSIT_AMOUNT) {
    throw new Error(`Insufficient WETH balance. Need ${ethers.formatEther(WETH_DEPOSIT_AMOUNT)} WETH, have ${ethers.formatEther(wethBalance)} WETH`);
  }

  // Check MockPool USDC balance (needed for bridging)
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = MockUSDC.attach(await mockPool.MOCK_USDC());
  const poolUsdcBalance = await mockUSDC.balanceOf(MOCK_POOL_ADDRESS);
  console.log(`MockPool USDC balance: ${ethers.formatUnits(poolUsdcBalance, 18)} USDC\n`);

  if (poolUsdcBalance < USDC_OUTPUT_AMOUNT) {
    throw new Error(`MockPool has insufficient USDC. Need ${ethers.formatUnits(USDC_OUTPUT_AMOUNT, 18)} USDC, have ${ethers.formatUnits(poolUsdcBalance, 18)} USDC`);
  }

  // Check allowance
  console.log("=".repeat(60));
  console.log("🔐 Checking and Setting Allowance");
  console.log("=".repeat(60));

  const currentAllowance = await mockWETH.allowance(signer.address, MOCK_POOL_ADDRESS);
  console.log(`\nCurrent WETH allowance: ${ethers.formatEther(currentAllowance)} WETH`);

  if (currentAllowance < WETH_DEPOSIT_AMOUNT) {
    console.log(`\nApproving MockPool to spend ${ethers.formatEther(WETH_DEPOSIT_AMOUNT)} WETH...`);
    const approveTx = await mockWETH.approve(MOCK_POOL_ADDRESS, WETH_DEPOSIT_AMOUNT);
    console.log(`  Transaction hash: ${approveTx.hash}`);
    console.log("  Waiting for confirmation...");
    await approveTx.wait();
    console.log("  ✅ Approval confirmed!\n");
  } else {
    console.log("  ✅ Sufficient allowance already set\n");
  }

  // Execute swap
  console.log("=".repeat(60));
  console.log("🔄 Executing Swap and Bridge");
  console.log("=".repeat(60));
  console.log(`\nDepositing ${ethers.formatEther(WETH_DEPOSIT_AMOUNT)} WETH...`);
  console.log(`Bridging ${ethers.formatUnits(USDC_OUTPUT_AMOUNT, 18)} USDC to:`);
  console.log(`  Address: ${RECIPIENT_ADDRESS}`);
  console.log(`  Chain: Optimism Sepolia (EID: ${OPTIMISM_SEPOLIA_EID})\n`);

  // Get swap amounts from contract to verify
  const [expectedWethAmount, expectedUsdcAmount] = await mockPool.getSwapAmounts();
  console.log(`Expected swap amounts:`);
  console.log(`  WETH Deposit: ${ethers.formatEther(expectedWethAmount)} WETH`);
  console.log(`  USDC Bridged: ${ethers.formatUnits(expectedUsdcAmount, 18)} USDC\n`);

  // Quote the bridge fee
  console.log("=".repeat(60));
  console.log("💰 Quoting Bridge Fee");
  console.log("=".repeat(60));

  const SourceBridge = await ethers.getContractFactory("SourceBridge");
  const sourceBridge = SourceBridge.attach(SOURCE_BRIDGE_ADDRESS);

  console.log(`\nQuoting fee for bridging ${ethers.formatUnits(USDC_OUTPUT_AMOUNT, 18)} USDC...`);
  const fee = await sourceBridge.quoteLockAndBridge(
    USDC_OUTPUT_AMOUNT,
    OPTIMISM_SEPOLIA_EID,
    RECIPIENT_ADDRESS
  );

  console.log(`  Native fee: ${ethers.formatEther(fee.nativeFee)} ETH`);
  console.log(`  LZ token fee: ${ethers.formatEther(fee.lzTokenFee)} LZ tokens\n`);

  // Check if we have enough ETH
  if (balance < fee.nativeFee) {
    throw new Error(`Insufficient ETH for bridge fee. Need ${ethers.formatEther(fee.nativeFee)} ETH, have ${ethers.formatEther(balance)} ETH`);
  }

  // Execute the swap (this will bridge the USDC)
  // Note: The swap function calls BridgeHelper.bridgeUSDC which needs ETH for fees
  // But BridgeHelper.bridgeUSDC is payable, so we need to send ETH with the transaction
  // However, MockPool.swap is not payable, so we need to fund the MockPool with ETH first
  // OR we need to modify the approach
  
  // Actually, looking at BridgeHelper.bridgeUSDC, it's payable and forwards msg.value to sourceBridge.lockAndBridge
  // But MockPool.swap doesn't accept ETH. We need to either:
  // 1. Make MockPool.swap payable and forward ETH
  // 2. Fund MockPool with ETH beforehand
  
  // For now, let's try sending ETH to MockPool first, then calling swap
  // But wait - MockPool.swap calls BridgeHelper.bridgeUSDC, and BridgeHelper needs msg.value
  // So we need to make MockPool.swap payable and forward the ETH
  
  // Actually, let me check if we can just send ETH with the swap call even if it's not marked payable
  // No, that won't work. We need to modify MockPool to accept ETH.
  
  // Execute the swap (this will bridge the USDC)
  // MockPool.swap is now payable and will forward ETH to BridgeHelper for LayerZero fees
  console.log("Executing swap transaction...");
  const swapTx = await mockPool.swap(RECIPIENT_ADDRESS, {
    value: fee.nativeFee, // Send ETH for LayerZero bridge fees
  });
  console.log(`  Transaction hash: ${swapTx.hash}`);
  console.log("  Waiting for confirmation...");
  const receipt = await swapTx.wait();
  console.log(`  ✅ Transaction confirmed!`);
  console.log(`  Block number: ${receipt.blockNumber}`);
  console.log(`  Gas used: ${receipt.gasUsed.toString()}\n`);

  // Check final balances
  console.log("=".repeat(60));
  console.log("📊 Final Balances");
  console.log("=".repeat(60));

  const finalWethBalance = await mockWETH.balanceOf(signer.address);
  const finalPoolWethBalance = await mockWETH.balanceOf(MOCK_POOL_ADDRESS);
  const finalPoolUsdcBalance = await mockUSDC.balanceOf(MOCK_POOL_ADDRESS);

  console.log(`\nAccount WETH balance (after): ${ethers.formatEther(finalWethBalance)} WETH`);
  console.log(`MockPool WETH balance (after): ${ethers.formatEther(finalPoolWethBalance)} WETH`);
  console.log(`MockPool USDC balance (after): ${ethers.formatUnits(finalPoolUsdcBalance, 18)} USDC\n`);

  console.log("=".repeat(60));
  console.log("✅ Swap and Bridge Complete!");
  console.log("=".repeat(60));
  console.log(`\n📤 Bridged ${ethers.formatUnits(USDC_OUTPUT_AMOUNT, 18)} USDC to:`);
  console.log(`   Address: ${RECIPIENT_ADDRESS}`);
  console.log(`   Chain: Optimism Sepolia`);
  console.log(`   EID: ${OPTIMISM_SEPOLIA_EID}`);
  console.log(`\n⏳ The tokens will arrive on Optimism Sepolia after LayerZero processes the message.`);
  console.log(`   This typically takes a few minutes.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exitCode = 1;
  });

