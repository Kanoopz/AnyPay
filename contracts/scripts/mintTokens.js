// Script to mint MockWETH and MockUSDC tokens
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Contract addresses
const MOCK_WETH_ADDRESS = "0x24E6D20c98DB5cDD5f8196dCF242cFCfDe9fCfaF"; // Arbitrum Sepolia
const MOCK_USDC_ADDRESS = "0x6355020E839EC69441F606466C30A5fFC96f3D82"; // Arbitrum Sepolia

// Recipient address
const RECIPIENT_ADDRESS = "0x9F613E18a198033D4d176A7EFa63a939a16B8cA6";

// Amounts to mint
const WETH_AMOUNT = "100"; // 100 WETH
const USDC_AMOUNT = "1000000000000"; // 1000000000000 USDC (raw amount, will be adjusted by decimals)

async function main() {
  console.log("🪙 Minting MockWETH and MockUSDC Tokens\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log(`\nNetwork: ${network}`);
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Recipient address: ${RECIPIENT_ADDRESS}`);

  if (network !== "arbSepolia") {
    throw new Error("This script must be run on arbSepolia network");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }

  // Get contract factories
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");

  // Connect to contracts
  const mockWETH = MockWETH.attach(MOCK_WETH_ADDRESS);
  const mockUSDC = MockUSDC.attach(MOCK_USDC_ADDRESS);

  // Check if deployer is owner
  console.log("📋 Checking Contract Ownership...");
  try {
    const wethOwner = await mockWETH.owner();
    const usdcOwner = await mockUSDC.owner();

    console.log(`MockWETH owner: ${wethOwner}`);
    console.log(`MockUSDC owner: ${usdcOwner}`);

    if (wethOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error(`Deployer is not the owner of MockWETH. Owner: ${wethOwner}`);
    }

    if (usdcOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error(`Deployer is not the owner of MockUSDC. Owner: ${usdcOwner}`);
    }

    console.log("✅ Deployer is owner of both contracts\n");
  } catch (error) {
    if (error.message.includes("not the owner")) {
      throw error;
    }
    console.log("⚠️  Could not verify ownership (contract may not expose owner function)\n");
  }

  // Get token decimals to format amounts correctly
  let wethDecimals, usdcDecimals;
  try {
    wethDecimals = await mockWETH.decimals();
    usdcDecimals = await mockUSDC.decimals();
    console.log(`MockWETH decimals: ${wethDecimals}`);
    console.log(`MockUSDC decimals: ${usdcDecimals}\n`);
  } catch (error) {
    // If decimals() doesn't exist, assume 18 for both
    wethDecimals = 18;
    usdcDecimals = 18;
    console.log("⚠️  Could not get decimals, assuming 18 for both\n");
  }

  // Parse amounts with decimals
  const wethAmount = ethers.parseUnits(WETH_AMOUNT, wethDecimals);
  const usdcAmount = ethers.parseUnits(USDC_AMOUNT, usdcDecimals);

  console.log("=".repeat(60));
  console.log("🪙 Step 1: Minting MockWETH");
  console.log("=".repeat(60));
  console.log(`\nAmount: ${WETH_AMOUNT} WETH (${wethAmount.toString()} raw units)`);

  try {
    const wethTx = await mockWETH.mint(RECIPIENT_ADDRESS, wethAmount);
    console.log(`  Transaction hash: ${wethTx.hash}`);
    console.log("  Waiting for confirmation...");
    await wethTx.wait();
    console.log("  ✅ MockWETH minted successfully");

    // Verify balance
    const wethBalance = await mockWETH.balanceOf(RECIPIENT_ADDRESS);
    console.log(`  New balance: ${ethers.formatUnits(wethBalance, wethDecimals)} WETH`);
  } catch (error) {
    console.error("  ❌ Error minting MockWETH:", error.message);
    throw error;
  }

  console.log("\n" + "=".repeat(60));
  console.log("🪙 Step 2: Minting MockUSDC");
  console.log("=".repeat(60));
  console.log(`\nAmount: ${USDC_AMOUNT} USDC (${usdcAmount.toString()} raw units)`);

  try {
    const usdcTx = await mockUSDC.mint(RECIPIENT_ADDRESS, usdcAmount);
    console.log(`  Transaction hash: ${usdcTx.hash}`);
    console.log("  Waiting for confirmation...");
    await usdcTx.wait();
    console.log("  ✅ MockUSDC minted successfully");

    // Verify balance
    const usdcBalance = await mockUSDC.balanceOf(RECIPIENT_ADDRESS);
    console.log(`  New balance: ${ethers.formatUnits(usdcBalance, usdcDecimals)} USDC`);
  } catch (error) {
    console.error("  ❌ Error minting MockUSDC:", error.message);
    throw error;
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Minting Complete!");
  console.log("=".repeat(60));
  console.log(`\n📋 Summary:`);
  console.log(`   Recipient: ${RECIPIENT_ADDRESS}`);
  console.log(`   MockWETH: ${WETH_AMOUNT} WETH`);
  console.log(`   MockUSDC: ${USDC_AMOUNT} USDC`);
  console.log(`\n🎉 Tokens successfully minted!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exitCode = 1;
  });

