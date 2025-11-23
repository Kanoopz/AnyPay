// Script to test the bridge: mint, approve, lockAndBridge, and check balances
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Contract addresses
const MOCK_USDC_ADDRESS = "0x6355020E839EC69441F606466C30A5fFC96f3D82"; // Arbitrum Sepolia
const BRIDGED_MOCK_USDC_ADDRESS = "0x785EE9903fc4D5AB9935eBD4A7b1471Bc0340e45"; // Optimism Sepolia
const SOURCE_BRIDGE_ADDRESS = "0x97900331085f87bd0C12eC6672d6E413545B344f"; // Arbitrum Sepolia
const TARGET_BRIDGE_ADDRESS = "0x277ab7e539Dc70aAb98e9De5131da029767F38f8"; // Optimism Sepolia

// LayerZero Endpoint IDs (EIDs)
const ARBITRUM_SEPOLIA_EID = 40231;
const OPTIMISM_SEPOLIA_EID = 40232;

// RPC URLs
const RPC_URLS = {
  arbSepolia: "https://api.zan.top/arb-sepolia",
  opSepolia: "https://sepolia.optimism.io",
};

// Amount to bridge (in token units, will be adjusted by decimals)
const BRIDGE_AMOUNT = "100"; // 100 tokens

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) external",
];

// Helper function to format token amount
function formatTokenAmount(amount, decimals) {
  return ethers.formatUnits(amount, decimals);
}

// Helper function to parse token amount
function parseTokenAmount(amount, decimals) {
  return ethers.parseUnits(amount, decimals);
}

// Helper function to check balance on a network
async function checkBalance(provider, tokenAddress, userAddress, tokenName) {
  try {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await token.balanceOf(userAddress);
    const decimals = await token.decimals();
    const symbol = await token.symbol();
    const formatted = formatTokenAmount(balance, decimals);
    console.log(`  ${tokenName} (${symbol}) balance: ${formatted} ${symbol}`);
    return { balance, decimals, symbol };
  } catch (error) {
    console.error(`  ❌ Error checking ${tokenName} balance:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🌉 Testing Bridge: MockUSDC → BridgedMockUSDC\n");
  console.log("=".repeat(60));

  // Get signer from Hardhat config
  const [signer] = await ethers.getSigners();
  const userAddress = signer.address;
  const network = hre.network.name;

  console.log(`\nNetwork: ${network}`);
  console.log(`User address: ${userAddress}`);

  if (network !== "arbSepolia") {
    throw new Error("This script must be run on arbSepolia network");
  }

  // Create providers for both networks
  const arbProvider = new ethers.JsonRpcProvider(RPC_URLS.arbSepolia);
  const opProvider = new ethers.JsonRpcProvider(RPC_URLS.opSepolia);

  console.log("\n" + "=".repeat(60));
  console.log("📊 Step 1: Initial Balance Check");
  console.log("=".repeat(60));

  // Check initial balances
  console.log("\nArbitrum Sepolia (MockUSDC):");
  const mockUSDCToken = new ethers.Contract(MOCK_USDC_ADDRESS, ERC20_ABI, arbProvider);
  const mockUSDCDecimals = await mockUSDCToken.decimals();
  const mockUSDCSymbol = await mockUSDCToken.symbol();
  const initialMockUSDCBalance = await checkBalance(arbProvider, MOCK_USDC_ADDRESS, userAddress, "MockUSDC");

  console.log("\nOptimism Sepolia (BridgedMockUSDC):");
  const bridgedMockUSDCToken = new ethers.Contract(BRIDGED_MOCK_USDC_ADDRESS, ERC20_ABI, opProvider);
  const bridgedMockUSDCDecimals = await bridgedMockUSDCToken.decimals();
  const bridgedMockUSDCSymbol = await bridgedMockUSDCToken.symbol();
  const initialBridgedBalance = await checkBalance(opProvider, BRIDGED_MOCK_USDC_ADDRESS, userAddress, "BridgedMockUSDC");

  console.log("\n" + "=".repeat(60));
  console.log("🪙 Step 2: Mint MockUSDC on Arbitrum Sepolia");
  console.log("=".repeat(60));

  // Mint MockUSDC
  const mintAmount = parseTokenAmount(BRIDGE_AMOUNT, mockUSDCDecimals);
  console.log(`\nMinting ${BRIDGE_AMOUNT} ${mockUSDCSymbol} to ${userAddress}...`);
  
  try {
    // Use contract factory to get the correct ABI
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = MockUSDC.attach(MOCK_USDC_ADDRESS);
    const mintTx = await mockUSDC.mint(userAddress, mintAmount);
    console.log(`  Transaction hash: ${mintTx.hash}`);
    console.log("  Waiting for confirmation...");
    await mintTx.wait();
    console.log("  ✅ MockUSDC minted successfully");
  } catch (error) {
    if (error.message.includes("onlyOwner") || error.message.includes("only owner")) {
      console.error("\n❌ Error: You are not the owner of MockUSDC contract.");
      console.error("   The owner must mint tokens, or you need to use the owner account.");
      throw error;
    }
    throw error;
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Step 3: Balance Check After Minting");
  console.log("=".repeat(60));

  // Check balances after minting
  console.log("\nArbitrum Sepolia (MockUSDC):");
  const afterMintMockUSDCBalance = await checkBalance(arbProvider, MOCK_USDC_ADDRESS, userAddress, "MockUSDC");

  console.log("\nOptimism Sepolia (BridgedMockUSDC):");
  const afterMintBridgedBalance = await checkBalance(opProvider, BRIDGED_MOCK_USDC_ADDRESS, userAddress, "BridgedMockUSDC");

  console.log("\n" + "=".repeat(60));
  console.log("✅ Step 4: Approve SourceBridge to Use MockUSDC");
  console.log("=".repeat(60));

  // Check current allowance and approve if needed
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = MockUSDC.attach(MOCK_USDC_ADDRESS);
  const currentAllowance = await mockUSDC.allowance(userAddress, SOURCE_BRIDGE_ADDRESS);
  console.log(`\nCurrent allowance: ${formatTokenAmount(currentAllowance, mockUSDCDecimals)} ${mockUSDCSymbol}`);

  if (currentAllowance < mintAmount) {
    console.log(`\nApproving SourceBridge to spend ${BRIDGE_AMOUNT} ${mockUSDCSymbol}...`);
    const approveTx = await mockUSDC.approve(SOURCE_BRIDGE_ADDRESS, mintAmount);
    console.log(`  Transaction hash: ${approveTx.hash}`);
    console.log("  Waiting for confirmation...");
    await approveTx.wait();
    console.log("  ✅ Approval successful");
  } else {
    console.log("  ✅ Already approved (sufficient allowance)");
  }

  // Verify allowance
  const newAllowance = await mockUSDC.allowance(userAddress, SOURCE_BRIDGE_ADDRESS);
  console.log(`New allowance: ${formatTokenAmount(newAllowance, mockUSDCDecimals)} ${mockUSDCSymbol}`);

  console.log("\n" + "=".repeat(60));
  console.log("🌉 Step 5: Lock and Bridge Tokens");
  console.log("=".repeat(60));

  // Get quote for bridging
  const SourceBridge = await ethers.getContractFactory("SourceBridge");
  const sourceBridge = SourceBridge.attach(SOURCE_BRIDGE_ADDRESS);
  console.log(`\nGetting quote for bridging ${BRIDGE_AMOUNT} ${mockUSDCSymbol}...`);
  
  let fee;
  try {
    fee = await sourceBridge.quoteLockAndBridge(mintAmount, OPTIMISM_SEPOLIA_EID, userAddress);
    console.log(`  Native fee: ${ethers.formatEther(fee.nativeFee)} ETH`);
    console.log(`  LZ Token fee: ${ethers.formatEther(fee.lzTokenFee)} LZ`);
  } catch (error) {
    console.error("  ⚠️  Could not get quote:", error.message);
    // Use a default fee estimate
    fee = { nativeFee: ethers.parseEther("0.001") };
    console.log(`  Using estimated fee: ${ethers.formatEther(fee.nativeFee)} ETH`);
  }

  // Check ETH balance for fees
  const ethBalance = await arbProvider.getBalance(userAddress);
  console.log(`\nETH balance: ${ethers.formatEther(ethBalance)} ETH`);
  
  if (ethBalance < fee.nativeFee) {
    throw new Error(`Insufficient ETH for fees. Need ${ethers.formatEther(fee.nativeFee)} ETH, have ${ethers.formatEther(ethBalance)} ETH`);
  }

  // Call lockAndBridge
  console.log(`\nCalling lockAndBridge:`);
  console.log(`  Amount: ${BRIDGE_AMOUNT} ${mockUSDCSymbol}`);
  console.log(`  Destination EID: ${OPTIMISM_SEPOLIA_EID} (Optimism Sepolia)`);
  console.log(`  Recipient: ${userAddress}`);
  console.log(`  Fee: ${ethers.formatEther(fee.nativeFee)} ETH`);

  const sourceBridgeWithSigner = sourceBridge.connect(signer);
  const bridgeTx = await sourceBridgeWithSigner.lockAndBridge(
    mintAmount,
    OPTIMISM_SEPOLIA_EID,
    userAddress,
    { value: fee.nativeFee }
  );
  
  console.log(`\n  Transaction hash: ${bridgeTx.hash}`);
  console.log("  Waiting for confirmation...");
  const bridgeReceipt = await bridgeTx.wait();
  console.log(`  ✅ Transaction confirmed (block ${bridgeReceipt.blockNumber})`);
  
  // Extract events if any
  if (bridgeReceipt.logs && bridgeReceipt.logs.length > 0) {
    console.log(`  Events emitted: ${bridgeReceipt.logs.length}`);
  }

  console.log("\n⏳ Note: Cross-chain message delivery may take a few minutes.");
  console.log("   You can monitor the transaction on LayerZero Scan:");
  console.log(`   https://layerzeroscan.com/tx/${bridgeTx.hash}`);

  console.log("\n" + "=".repeat(60));
  console.log("📊 Step 6: Final Balance Check");
  console.log("=".repeat(60));

  // Wait a bit for the cross-chain message to be processed
  console.log("\nWaiting 10 seconds before checking balances...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Check final balances
  console.log("\nArbitrum Sepolia (MockUSDC):");
  const finalMockUSDCBalance = await checkBalance(arbProvider, MOCK_USDC_ADDRESS, userAddress, "MockUSDC");

  console.log("\nOptimism Sepolia (BridgedMockUSDC):");
  const finalBridgedBalance = await checkBalance(opProvider, BRIDGED_MOCK_USDC_ADDRESS, userAddress, "BridgedMockUSDC");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 Summary");
  console.log("=".repeat(60));
  
  if (initialMockUSDCBalance && finalMockUSDCBalance) {
    const mockUSDCChange = finalMockUSDCBalance.balance - initialMockUSDCBalance.balance;
    console.log(`\nMockUSDC balance change: ${formatTokenAmount(mockUSDCChange, mockUSDCDecimals)} ${mockUSDCSymbol}`);
    console.log(`  Initial: ${formatTokenAmount(initialMockUSDCBalance.balance, mockUSDCDecimals)} ${mockUSDCSymbol}`);
    console.log(`  Final: ${formatTokenAmount(finalMockUSDCBalance.balance, mockUSDCDecimals)} ${mockUSDCSymbol}`);
  }

  if (initialBridgedBalance && finalBridgedBalance) {
    const bridgedChange = finalBridgedBalance.balance - initialBridgedBalance.balance;
    console.log(`\nBridgedMockUSDC balance change: ${formatTokenAmount(bridgedChange, bridgedMockUSDCDecimals)} ${bridgedMockUSDCSymbol}`);
    console.log(`  Initial: ${formatTokenAmount(initialBridgedBalance.balance, bridgedMockUSDCDecimals)} ${bridgedMockUSDCSymbol}`);
    console.log(`  Final: ${formatTokenAmount(finalBridgedBalance.balance, bridgedMockUSDCDecimals)} ${bridgedMockUSDCSymbol}`);
    
    if (bridgedChange >= mintAmount) {
      console.log("\n✅ SUCCESS: Bridged tokens received on Optimism Sepolia!");
    } else if (bridgedChange > 0n) {
      console.log("\n⚠️  Partial success: Some tokens received, but less than expected.");
      console.log("   The cross-chain message may still be processing.");
    } else {
      console.log("\n⏳ Tokens not yet received. The cross-chain message may still be processing.");
      console.log("   Please wait a few minutes and check again, or monitor on LayerZero Scan.");
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Test Complete!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exitCode = 1;
  });

