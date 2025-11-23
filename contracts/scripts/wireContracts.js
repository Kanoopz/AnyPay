// Script to wire LayerZero contracts - Set peers, libraries, and DVNs
// Run this script on BOTH networks to configure bidirectional pathways
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Private key for signing transactions
const PRIVATE_KEY = "ff6f5404be473495ef803aab7e1f5c002ed858a4d23e2146697e7d1a13681a1a";

// Contract addresses on each network
const CONTRACTS = {
  arbSepolia: "0x785EE9903fc4D5AB9935eBD4A7b1471Bc0340e45", // BridgeDeposit on Arbitrum Sepolia
  opSepolia: "0x0000000000000000000000000000000000000000", // TODO: Deploy on Optimism Sepolia first
};

// LayerZero Endpoint IDs (EIDs)
const EIDS = {
  sepolia: 40161,
  opSepolia: 40232,
  arbSepolia: 40231,
};

// LayerZero Endpoint addresses
const ENDPOINTS = {
  arbSepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f",
  opSepolia: "0x1a44076050125825900e736c501f859c50fE728c",
};

// LayerZero V2 Library addresses - GET FROM: https://docs.layerzero.network/v2/deployments/deployed-contracts
// Search for "SendUln302" and "ReceiveUln302" for each testnet
const LIBRARIES = {
  arbSepolia: {
    sendLibrary: "0x0000000000000000000000000000000000000000", // TODO: Get SendUln302 address
    receiveLibrary: "0x0000000000000000000000000000000000000000", // TODO: Get ReceiveUln302 address
  },
  opSepolia: {
    sendLibrary: "0x0000000000000000000000000000000000000000", // TODO: Get SendUln302 address
    receiveLibrary: "0x0000000000000000000000000000000000000000", // TODO: Get ReceiveUln302 address
  },
};

// DVN addresses - GET FROM: https://docs.layerzero.network/v2/deployments/dvn-addresses
// Use "LayerZero Labs" DVN for testnets
const DVNS = {
  arbSepolia: ["0x0000000000000000000000000000000000000000"], // TODO: Get LayerZero Labs DVN
  opSepolia: ["0x0000000000000000000000000000000000000000"], // TODO: Get LayerZero Labs DVN
};

// OApp ABI
const OAPP_ABI = [
  "function setPeer(uint32 _eid, bytes32 _peer) external",
  "function peers(uint32 eid) view returns (bytes32)",
];

// EndpointV2 ABI
const ENDPOINT_V2_ABI = [
  "function setSendLibrary(address _oapp, uint32 _eid, address _newLib) external",
  "function setReceiveLibrary(address _oapp, uint32 _eid, address _newLib, uint256 _gracePeriod) external",
  "function setConfig(address _oapp, uint32 _eid, uint32 _configType, bytes calldata _config) external",
];

// Helper functions
function addressToBytes32(address) {
  return ethers.zeroPadValue(address, 32);
}

function bytes32ToAddress(bytes32) {
  return ethers.getAddress(ethers.dataSlice(bytes32, 12));
}

async function setPeer(contractAddress, dstEid, peerAddress, signer) {
  console.log(`\n--- Setting Peer ---`);
  console.log(`Peer Address: ${peerAddress}`);
  
  const contract = new ethers.Contract(contractAddress, OAPP_ABI, signer);
  const peerBytes32 = addressToBytes32(peerAddress);
  
  const currentPeer = await contract.peers(dstEid);
  if (currentPeer !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    const currentAddr = bytes32ToAddress(currentPeer);
    if (currentAddr.toLowerCase() === peerAddress.toLowerCase()) {
      console.log("✅ Peer already set");
      return;
    }
  }
  
  const tx = await contract.setPeer(dstEid, peerBytes32);
  console.log(`Tx hash: ${tx.hash}`);
  await tx.wait();
  console.log("✅ Peer set");
}

async function setSendLibrary(endpointAddress, oappAddress, dstEid, sendLibrary, signer) {
  console.log(`\n--- Setting Send Library ---`);
  const endpoint = new ethers.Contract(endpointAddress, ENDPOINT_V2_ABI, signer);
  const tx = await endpoint.setSendLibrary(oappAddress, dstEid, sendLibrary);
  console.log(`Tx hash: ${tx.hash}`);
  await tx.wait();
  console.log("✅ Send library set");
}

async function setReceiveLibrary(endpointAddress, oappAddress, dstEid, receiveLibrary, signer) {
  console.log(`\n--- Setting Receive Library ---`);
  const endpoint = new ethers.Contract(endpointAddress, ENDPOINT_V2_ABI, signer);
  const tx = await endpoint.setReceiveLibrary(oappAddress, dstEid, receiveLibrary, 0);
  console.log(`Tx hash: ${tx.hash}`);
  await tx.wait();
  console.log("✅ Receive library set");
}

async function setUlnConfig(endpointAddress, oappAddress, dstEid, dvns, signer) {
  console.log(`\n--- Setting ULN Config (DVNs) ---`);
  const config = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address[]", "address[]", "uint8"],
    [dvns, [], 0]
  );
  
  const endpoint = new ethers.Contract(endpointAddress, ENDPOINT_V2_ABI, signer);
  
  // Type 2 = send ULN config
  const sendTx = await endpoint.setConfig(oappAddress, dstEid, 2, config);
  console.log(`Send config tx: ${sendTx.hash}`);
  await sendTx.wait();
  
  // Type 3 = receive ULN config
  const receiveTx = await endpoint.setConfig(oappAddress, dstEid, 3, config);
  console.log(`Receive config tx: ${receiveTx.hash}`);
  await receiveTx.wait();
  
  console.log("✅ ULN config set");
}

async function main() {
  const network = hre.network.name;
  console.log("=".repeat(60));
  console.log("LayerZero Contract Wiring Script");
  console.log("=".repeat(60));
  console.log(`Network: ${network}`);
  
  const provider = hre.ethers.provider;
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const signer = wallet;
  
  console.log(`Signer: ${signer.address}`);
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance === 0n) {
    throw new Error("Insufficient balance");
  }
  
  const localContract = CONTRACTS[network];
  if (!localContract || localContract === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Contract not set for ${network}`);
  }
  
  let dstNetwork, dstEid, dstContract;
  if (network === "arbSepolia") {
    dstNetwork = "opSepolia";
    dstEid = EIDS.opSepolia;
    dstContract = CONTRACTS.opSepolia;
  } else if (network === "opSepolia") {
    dstNetwork = "arbSepolia";
    dstEid = EIDS.arbSepolia;
    dstContract = CONTRACTS.arbSepolia;
  } else {
    throw new Error(`Unsupported network: ${network}`);
  }
  
  if (!dstContract || dstContract === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Deploy contract on ${dstNetwork} first!`);
  }
  
  console.log(`\nConfiguring: ${network} -> ${dstNetwork}`);
  console.log(`Local: ${localContract}`);
  console.log(`Remote: ${dstContract}`);
  
  const endpointAddress = ENDPOINTS[network];
  const sendLibrary = LIBRARIES[network].sendLibrary;
  const receiveLibrary = LIBRARIES[network].receiveLibrary;
  const dvns = DVNS[network];
  
  if (sendLibrary === "0x0000000000000000000000000000000000000000" || 
      receiveLibrary === "0x0000000000000000000000000000000000000000" ||
      dvns[0] === "0x0000000000000000000000000000000000000000") {
    console.error("\n❌ ERROR: Library or DVN addresses not configured!");
    console.error("Please update the script with addresses from:");
    console.error("Libraries: https://docs.layerzero.network/v2/deployments/deployed-contracts");
    console.error("DVNs: https://docs.layerzero.network/v2/deployments/dvn-addresses");
    throw new Error("Addresses not configured");
  }
  
  try {
    await setPeer(localContract, dstEid, dstContract, signer);
    await setSendLibrary(endpointAddress, localContract, dstEid, sendLibrary, signer);
    await setReceiveLibrary(endpointAddress, localContract, dstEid, receiveLibrary, signer);
    await setUlnConfig(endpointAddress, localContract, dstEid, dvns, signer);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Wiring complete!");
    console.log("=".repeat(60));
    console.log(`\nNext: Run on ${dstNetwork} to configure reverse pathway`);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


