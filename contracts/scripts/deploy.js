// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() 
{
   const [deployer] = await ethers.getSigners();
   const network = hre.network.name;
   
   console.log("Deploying BridgeSender contract...");
   console.log("Network:", network);
   console.log("Deployer address:", deployer.address);
   
   // Check deployer balance
   const balance = await ethers.provider.getBalance(deployer.address);
   console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
   
   if (balance === 0n) {
     throw new Error("Deployer has no balance. Please fund the account first.");
   }
   
   const contractFactory = await ethers.getContractFactory("BridgeSender");
   
   console.log("Deploying contract...");
   // BridgeSender has no constructor parameters
   const contractInstance = await contractFactory.deploy();
   
   await contractInstance.waitForDeployment();
   const contractAddress = await contractInstance.getAddress();

   console.log("✅ Contract deployed successfully!");
   console.log("Contract address:", contractAddress);
   console.log("Network:", network);
   console.log("\nNote: BridgeSender accepts OFT and token addresses as function parameters,");
   console.log("so no constructor configuration is needed.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
