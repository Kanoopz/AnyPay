// Script to transfer 1 WETH from user account to MockPool
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Contract addresses (Arbitrum Sepolia)
const MOCK_WETH_ADDRESS = "0xF04410891E277f0F64870A5cbBA97772E2bd91cc";
const MOCK_POOL_ADDRESS = "0xb3946773FdcD3a00c215C5BD588fc136b31AF75C";

// Amount to transfer
const WETH_AMOUNT = ethers.parseEther("1"); // 1 WETH

async function main() {
  const [signer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("💰 Funding MockPool with WETH\n");
  console.log("=".repeat(60));
  console.log(`Network: ${network}`);
  console.log(`Account: ${signer.address}\n`);

  if (network !== "arbSepolia") {
    throw new Error("This script must be run on arbSepolia network");
  }

  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Account ETH balance: ${ethers.formatEther(balance)} ETH\n`);

  // Get token contract
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const mockWETH = MockWETH.attach(MOCK_WETH_ADDRESS);

  // Check current balances
  console.log("=".repeat(60));
  console.log("📊 Checking Balances");
  console.log("=".repeat(60));

  const wethBalance = await mockWETH.balanceOf(signer.address);
  const poolWethBalance = await mockWETH.balanceOf(MOCK_POOL_ADDRESS);

  console.log(`\nAccount WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
  console.log(`MockPool WETH balance (before): ${ethers.formatEther(poolWethBalance)} WETH\n`);

  // Check if user has enough tokens
  if (wethBalance < WETH_AMOUNT) {
    throw new Error(`Insufficient WETH balance. Need ${ethers.formatEther(WETH_AMOUNT)} WETH, have ${ethers.formatEther(wethBalance)} WETH`);
  }

  // Transfer WETH
  console.log("=".repeat(60));
  console.log("🔄 Transferring WETH to MockPool");
  console.log("=".repeat(60));
  console.log(`\nTransferring ${ethers.formatEther(WETH_AMOUNT)} WETH...`);

  const wethTx = await mockWETH.transfer(MOCK_POOL_ADDRESS, WETH_AMOUNT);
  console.log(`  Transaction hash: ${wethTx.hash}`);
  console.log("  Waiting for confirmation...");
  await wethTx.wait();
  console.log("  ✅ WETH transferred successfully!\n");

  // Check final balances
  console.log("=".repeat(60));
  console.log("📊 Final Balances");
  console.log("=".repeat(60));

  const finalWethBalance = await mockWETH.balanceOf(signer.address);
  const finalPoolWethBalance = await mockWETH.balanceOf(MOCK_POOL_ADDRESS);

  console.log(`\nAccount WETH balance (after): ${ethers.formatEther(finalWethBalance)} WETH`);
  console.log(`MockPool WETH balance (after): ${ethers.formatEther(finalPoolWethBalance)} WETH\n`);

  console.log("=".repeat(60));
  console.log("✅ Funding Complete!");
  console.log("=".repeat(60));
  console.log(`\nMockPool is now funded with ${ethers.formatEther(finalPoolWethBalance)} WETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exitCode = 1;
  });

