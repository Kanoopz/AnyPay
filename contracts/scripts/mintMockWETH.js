// Script to mint MockWETH tokens
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Contract addresses (Arbitrum Sepolia)
const MOCK_WETH_ADDRESS = "0xF04410891E277f0F64870A5cbBA97772E2bd91cc";
const RECIPIENT_ADDRESS = "0x9F613E18a198033D4d176A7EFa63a939a16B8cA6"; // Your address
const MINT_AMOUNT = ethers.parseUnits("100000", 18); // 100,000 MockWETH

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("💰 Minting MockWETH Tokens\n");
  console.log("=".repeat(60));
  console.log(`Network: ${network}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Recipient: ${RECIPIENT_ADDRESS}`);
  console.log(`Amount: ${ethers.formatUnits(MINT_AMOUNT, 18)} MockWETH\n`);

  if (network !== "arbSepolia") {
    throw new Error("This script must be run on arbSepolia network");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }

  // Get MockWETH contract
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const mockWETH = MockWETH.attach(MOCK_WETH_ADDRESS);

  // Check if deployer is the owner
  const owner = await mockWETH.owner();
  console.log(`MockWETH owner: ${owner}`);
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer (${deployer.address}) is not the owner. Owner is ${owner}`);
  }

  // Check current balance
  const currentBalance = await mockWETH.balanceOf(RECIPIENT_ADDRESS);
  console.log(`Current balance of recipient: ${ethers.formatUnits(currentBalance, 18)} MockWETH\n`);

  // Mint tokens
  console.log("=".repeat(60));
  console.log("📝 Minting tokens...");
  console.log("=".repeat(60));

  try {
    const tx = await mockWETH.mint(RECIPIENT_ADDRESS, MINT_AMOUNT);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    await tx.wait();
    console.log("✅ Transaction confirmed!\n");

    // Check new balance
    const newBalance = await mockWETH.balanceOf(RECIPIENT_ADDRESS);
    console.log("=".repeat(60));
    console.log("✅ Minting Complete!");
    console.log("=".repeat(60));
    console.log(`New balance of recipient: ${ethers.formatUnits(newBalance, 18)} MockWETH`);
    console.log(`Total supply: ${ethers.formatUnits(await mockWETH.totalSupply(), 18)} MockWETH`);
  } catch (error) {
    console.error("❌ Error minting tokens:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

