// Deployment script for MockWETH on Arbitrum Sepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("Deploying MockWETH contract...");
  console.log("Network:", network);
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }

  const contractName = "MockWETH";
  const tokenName = "Wrapped Ether";
  const tokenSymbol = "WETH";
  const ownerAddress = deployer.address;

  console.log("\n--- Deployment Parameters ---");
  console.log("Name:", tokenName);
  console.log("Symbol:", tokenSymbol);
  console.log("Owner:", ownerAddress);

  const MockWETHFactory = await ethers.getContractFactory(contractName);
  const mockWETH = await MockWETHFactory.deploy(tokenName, tokenSymbol, ownerAddress);
  await mockWETH.waitForDeployment();

  const mockWETHAddress = await mockWETH.getAddress();

  console.log("\n✅ MockWETH deployed successfully!");
  console.log("Contract address:", mockWETHAddress);
  console.log("Network:", network);
  console.log("Owner:", ownerAddress);
  console.log("\n📝 Usage:");
  console.log("   - Call deposit() with ETH to receive WETH");
  console.log("   - Call withdraw(amount) to burn WETH and receive ETH");
  console.log("   - Owner can mint tokens using mint(address, amount)");

  // Verify contract on Etherscan
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await mockWETH.deploymentTransaction()?.wait(5);

    try {
      console.log("Verifying contract on Etherscan...");
      await hre.run("verify:verify", {
        address: mockWETHAddress,
        constructorArguments: [tokenName, tokenSymbol, ownerAddress],
      });
      console.log("✅ Contract verified on block explorer!");
    } catch (error) {
      console.log("⚠️  Verification failed (this is okay if already verified):", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

