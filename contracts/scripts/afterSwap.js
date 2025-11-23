// Script to bridge USDC from Arbitrum Sepolia to Optimism Sepolia
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Deployed BridgeSender contract address (updated with OptionsBuilder fix)
const BRIDGE_SENDER_ADDRESS = "0xe20Ecb346D4fb6E5d869a062a59d61A70c4C5deB";

// Private key for signing transactions
const PRIVATE_KEY = "ff6f5404be473495ef803aab7e1f5c002ed858a4d23e2146697e7d1a13681a1a";

// LayerZero Endpoint IDs (EIDs) for testnets
const EIDS = {
  opSepolia: 40232,     // Optimism Sepolia
  arbSepolia: 40231,     // Arbitrum Sepolia
};

// USDC contract addresses on testnets
const USDC_ADDRESSES = {
  arbSepolia: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773", // Arbitrum Sepolia USDC
  opSepolia: "0x488327236B65C61A6c083e8d811a4E0D3d1D4268",   // Optimism Sepolia USDC
};

// OFT Adapter contract addresses on testnets
const OFT_ADDRESSES = {
  arbSepolia: "0x543BdA7c6cA4384FE90B1F5929bb851F52888983", // Arbitrum Sepolia OFT
  opSepolia: "0x314B753272a3C79646b92A87dbFDEE643237033a",   // Optimism Sepolia OFT
};

// RPC URLs for checking balances on different networks
const RPC_URLS = {
  arbSepolia: "https://api.zan.top/arb-sepolia",
  opSepolia: "https://sepolia.optimism.io",
};

// ERC20 ABI for balance checking and approval
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

// Function to check USDC balance on a specific network
async function checkUSDCBalance(networkName, usdcAddress, walletAddress) {
  try {
    const rpcUrl = RPC_URLS[networkName];
    if (!rpcUrl) {
      console.log(`⚠️  No RPC URL configured for ${networkName}`);
      return null;
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
    
    const [balance, decimals, symbol] = await Promise.all([
      usdcContract.balanceOf(walletAddress),
      usdcContract.decimals(),
      usdcContract.symbol(),
    ]);
    
    const formattedBalance = ethers.formatUnits(balance, decimals);
    
    return {
      network: networkName,
      address: usdcAddress,
      balance: balance,
      formattedBalance: formattedBalance,
      decimals: decimals,
      symbol: symbol,
    };
  } catch (error) {
    console.error(`❌ Error checking USDC balance on ${networkName}:`, error.message);
    return null;
  }
}

async function main() {
  const network = hre.network.name;
  
  console.log("=".repeat(60));
  console.log("USDC Balance Checker & Bridge");
  console.log("=".repeat(60));
  
  // Get provider from network config
  const provider = hre.ethers.provider;
  
  // Create wallet from private key
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const signer = wallet;
  const walletAddress = wallet.address;
  
  console.log("\n📝 Wallet Address (derived from private key):");
  console.log(`   ${walletAddress}`);
  console.log(`\n🌐 Current Network: ${network}`);
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Checking USDC Balances");
  console.log("=".repeat(60));
  
  // Check USDC balance on Arbitrum Sepolia
  console.log("\n📊 Checking USDC balance on Arbitrum Sepolia...");
  const arbBalance = await checkUSDCBalance(
    "arbSepolia",
    USDC_ADDRESSES.arbSepolia,
    walletAddress
  );
  
  if (arbBalance) {
    console.log(`✅ Arbitrum Sepolia USDC Balance:`);
    console.log(`   Contract: ${arbBalance.address}`);
    console.log(`   Balance: ${arbBalance.formattedBalance} ${arbBalance.symbol}`);
    console.log(`   Raw balance: ${arbBalance.balance.toString()}`);
  } else {
    console.log(`⚠️  Could not retrieve Arbitrum Sepolia USDC balance`);
  }
  
  // Check USDC balance on Optimism Sepolia
  console.log("\n📊 Checking USDC balance on Optimism Sepolia...");
  const opBalance = await checkUSDCBalance(
    "opSepolia",
    USDC_ADDRESSES.opSepolia,
    walletAddress
  );
  
  if (opBalance) {
    console.log(`✅ Optimism Sepolia USDC Balance:`);
    console.log(`   Contract: ${opBalance.address}`);
    console.log(`   Balance: ${opBalance.formattedBalance} ${opBalance.symbol}`);
    console.log(`   Raw balance: ${opBalance.balance.toString()}`);
  } else {
    console.log(`⚠️  Could not retrieve Optimism Sepolia USDC balance`);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Approving BridgeSender to spend USDC");
  console.log("=".repeat(60));
  
  // Configuration for bridging from Arbitrum Sepolia to Optimism Sepolia
  const sourceNetwork = "arbSepolia";
  const destinationNetwork = "opSepolia";
  const tokenAddress = USDC_ADDRESSES[sourceNetwork]; // USDC on Arbitrum Sepolia (source)
  const amount = ethers.parseUnits("1", 6); // 1 USDC (6 decimals)
  
  console.log("\n--- Bridge Configuration ---");
  console.log("Source Chain: Arbitrum Sepolia");
  console.log("Destination Chain: Optimism Sepolia");
  console.log("Token (USDC on Arbitrum Sepolia):", tokenAddress);
  
  console.log("\n--- Approval Configuration ---");
  console.log("Token (USDC Arbitrum Sepolia):", tokenAddress);
  console.log("Spender (BridgeSender):", BRIDGE_SENDER_ADDRESS);
  console.log("Owner (EOA):", walletAddress);
  console.log("Amount:", ethers.formatUnits(amount, 6), "USDC");
  
  try {
    // Use Arbitrum Sepolia RPC for checking allowance (not Hardhat network)
    console.log("\n--- Connecting to Arbitrum Sepolia Network ---");
    const arbProvider = new ethers.JsonRpcProvider(RPC_URLS.arbSepolia);
    const arbWallet = new ethers.Wallet(PRIVATE_KEY, arbProvider);
    const arbSigner = arbWallet;
    
    // Verify token contract exists on Arbitrum Sepolia
    console.log("Verifying token contract on Arbitrum Sepolia...");
    const tokenCode = await arbProvider.getCode(tokenAddress);
    if (tokenCode === "0x" || tokenCode === null) {
      throw new Error(`❌ Token contract does not exist at address ${tokenAddress} on Arbitrum Sepolia`);
    }
    console.log("✅ Token contract verified at:", tokenAddress);
    
    const usdcContract = new ethers.Contract(tokenAddress, ERC20_ABI, arbSigner);
    
    // Check current allowance on Arbitrum Sepolia
    let allowance = 0n;
    try {
      console.log("Checking current allowance on Arbitrum Sepolia...");
      allowance = await usdcContract.allowance(walletAddress, BRIDGE_SENDER_ADDRESS);
      console.log("✅ Allowance check successful");
    } catch (error) {
      console.error("❌ Error checking allowance:", error.message);
      if (error.code === 'BAD_DATA' || error.value === '0x') {
        console.log("⚠️  Contract call returned empty data - this might indicate:");
        console.log("   - The contract reverted the call");
        console.log("   - Network/RPC connectivity issue");
        console.log("   - Contract doesn't support allowance() function");
        console.log("⚠️  Assuming allowance is 0 and proceeding with approval...");
      } else {
        throw error;
      }
      allowance = 0n;
    }
    
    const currentAllowance = ethers.formatUnits(allowance, 6);
    
    console.log("\nCurrent allowance:", currentAllowance, "USDC");
    console.log("Required amount:", ethers.formatUnits(amount, 6), "USDC");
    
    if (allowance < amount) {
      console.log("\n⚠️  Approval needed! Approving BridgeSender contract to spend USDC...");
      try {
        const approveTx = await usdcContract.approve(BRIDGE_SENDER_ADDRESS, amount);
        console.log("Approval transaction hash:", approveTx.hash);
        console.log("Waiting for approval confirmation...");
        const approveReceipt = await approveTx.wait();
        console.log("✅ Approval confirmed in block:", approveReceipt.blockNumber);
        
        // Verify approval with error handling (using Arbitrum Sepolia provider)
        try {
          const newAllowance = await usdcContract.allowance(walletAddress, BRIDGE_SENDER_ADDRESS);
          console.log("New allowance:", ethers.formatUnits(newAllowance, 6), "USDC");
          console.log("✅ Token approved successfully!");
        } catch (error) {
          console.warn("⚠️  Could not verify new allowance, but approval transaction was confirmed");
          console.warn("   Error:", error.message);
        }
      } catch (error) {
        console.error("❌ Error during approval:", error.message);
        throw error;
      }
    } else {
      console.log("✅ Token already approved with sufficient allowance");
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Building bridgeTokens Transaction");
    console.log("=".repeat(60));
    
    // Get OFT address for source chain (Arbitrum Sepolia)
    const oftAddress = OFT_ADDRESSES[sourceNetwork];
    if (!oftAddress || oftAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`❌ ERROR: OFT address not configured for network ${sourceNetwork}`);
    }
    
    console.log("\n--- OFT Configuration ---");
    console.log("Source Network:", sourceNetwork);
    console.log("OFT Adapter (Arbitrum Sepolia):", oftAddress);
    
    // Get destination EID for peer check
    const dstEid = EIDS[destinationNetwork]; // Optimism Sepolia
    
    // Check if OFT adapter has peers configured
    console.log("\n--- Checking OFT Adapter Configuration ---");
    try {
      const OFT_ABI = [
        "function getPeer(uint32 eid) view returns (bytes32)",
        "function endpoint() view returns (address)",
      ];
      const oftContract = new ethers.Contract(oftAddress, OFT_ABI, arbProvider);
      
      // Check if peer is set for Optimism Sepolia
      const peer = await oftContract.getPeer(dstEid);
      const peerAddress = ethers.getAddress(ethers.dataSlice(peer, 12)); // Extract address from bytes32
      
      console.log(`Peer for Optimism Sepolia (EID ${dstEid}):`, peerAddress);
      console.log("Expected Optimism OFT:", OFT_ADDRESSES[destinationNetwork]);
      
      if (peerAddress === "0x0000000000000000000000000000000000000000") {
        console.error("\n❌ ERROR: Peer is NOT configured!");
        console.error("   The Arbitrum OFT adapter does not have a peer set for Optimism Sepolia.");
        console.error("   This is why the transaction is failing.");
        console.error("\n💡 Solution:");
        console.error("   The OFT adapters need to be wired together.");
        console.error("   Since you're using existing OFT adapters, they may need to be configured by their owner.");
        throw new Error("OFT adapter peer not configured. Cannot bridge without peer configuration.");
      } else if (peerAddress.toLowerCase() !== OFT_ADDRESSES[destinationNetwork].toLowerCase()) {
        console.warn("\n⚠️  WARNING: Peer address doesn't match expected Optimism OFT!");
        console.warn("   Configured peer:", peerAddress);
        console.warn("   Expected peer:", OFT_ADDRESSES[destinationNetwork]);
      } else {
        console.log("✅ Peer is correctly configured!");
      }
    } catch (error) {
      if (error.code === 'CALL_EXCEPTION' && error.reason === 'require(false)') {
        console.error("\n❌ ERROR: Peer is NOT configured!");
        console.error("   The `getPeer()` call reverted, which means the Arbitrum OFT adapter");
        console.error("   does not have a peer set for Optimism Sepolia (EID 40232).");
        console.error("   This is why the bridge transaction is failing with error 0xa1e86545.");
        console.error("\n💡 Solutions:");
        console.error("   1. Contact the owner of the OFT adapters to wire them together");
        console.error("   2. Deploy your own OFT adapters and wire them yourself");
        console.error("   3. Use different OFT adapters that are already properly wired");
        console.error("\n📚 To wire OFT adapters, you need to:");
        console.error("   - Set peers: Arbitrum OFT → Optimism OFT address");
        console.error("   - Configure send/receive libraries");
        console.error("   - Set up DVNs (Decentralized Verifier Networks)");
        console.error("   - Configure enforcedOptions");
        throw new Error("OFT adapter peer not configured. Cannot bridge without peer configuration.");
      } else {
        console.warn("⚠️  Could not check peer configuration:", error.message);
        console.warn("   Proceeding anyway, but this might be the cause of the error...");
      }
    }
    
    // Connect to BridgeSender contract on Arbitrum Sepolia
    // Use Arbitrum Sepolia provider for BridgeSender contract calls
    console.log("\n--- Connecting to BridgeSender on Arbitrum Sepolia ---");
    const BridgeSender = await ethers.getContractFactory("BridgeSender");
    const bridgeSender = BridgeSender.attach(BRIDGE_SENDER_ADDRESS).connect(arbSigner);
    
    // Verify BridgeSender contract exists on Arbitrum Sepolia
    const bridgeSenderCode = await arbProvider.getCode(BRIDGE_SENDER_ADDRESS);
    if (bridgeSenderCode === "0x" || bridgeSenderCode === null) {
      throw new Error(`❌ BridgeSender contract does not exist at address ${BRIDGE_SENDER_ADDRESS} on Arbitrum Sepolia`);
    }
    
    console.log("✅ Connected to BridgeSender at:", BRIDGE_SENDER_ADDRESS);
    console.log("Network: Arbitrum Sepolia");
    
    // Get quote for LayerZero fees (bridging to Optimism Sepolia)
    // dstEid is already defined above
    console.log("\n--- Getting LayerZero Fee Quote ---");
    console.log("Destination EID:", dstEid, `(${destinationNetwork})`);
    
    let fee;
    try {
      fee = await bridgeSender.getBridgeQuote(oftAddress, amount, dstEid);
    } catch (error) {
      console.error("❌ Error getting bridge quote:", error.message);
      if (error.code === 'BAD_DATA' || error.value === '0x' || error.code === 'CALL_EXCEPTION') {
        console.error("\n🔍 According to LayerZero documentation:");
        console.error("   'quoteSend() will revert if no valid message options are present.'");
        console.error("   'You must have at least either enforcedOptions set for your OApp'");
        console.error("   'or extraOptions passed in for a particular transaction.'");
        console.error("\n📋 Common causes:");
        console.error("   1. OFT adapter's enforcedOptions are NOT configured");
        console.error("   2. LayerZero pathway is not wired (peers not set)");
        console.error("   3. Send/receive libraries not configured");
        console.error("   4. DVNs (Decentralized Verifier Networks) not configured");
        console.error("\n💡 Solutions:");
        console.error("   - Wire the OFT adapters using LayerZero's configuration tools");
        console.error("   - Set peers between Arbitrum and Optimism OFT contracts");
        console.error("   - Configure enforcedOptions on the OFT adapter");
        console.error("   - Set up send/receive libraries and DVNs");
        console.error("\n📚 See: https://docs.layerzero.network/v2/developers/evm/oapp/wire-oapp");
        console.error("\nOFT Address used:", oftAddress);
        console.error("Destination OFT:", OFT_ADDRESSES[destinationNetwork]);
        throw new Error("Failed to get bridge quote. OFT adapter needs to be wired and have enforcedOptions configured.");
      }
      throw error;
    }
    console.log("Native fee (ETH):", ethers.formatEther(fee.nativeFee), "ETH");
    console.log("LZ Token fee:", ethers.formatEther(fee.lzTokenFee || 0n), "LZ");
    
    // Check wallet ETH balance for fees on Arbitrum Sepolia
    const walletBalance = await arbProvider.getBalance(walletAddress);
    console.log("Wallet ETH balance (Arbitrum Sepolia):", ethers.formatEther(walletBalance), "ETH");
    
    if (walletBalance < fee.nativeFee) {
      throw new Error(`Insufficient ETH for fees. Need ${ethers.formatEther(fee.nativeFee)} ETH, have ${ethers.formatEther(walletBalance)} ETH`);
    }
    
    // Build transaction parameters
    const recipient = walletAddress; // Send to same wallet on destination (Optimism Sepolia)
    
    console.log("\n--- Bridge Transaction Parameters ---");
    console.log("Source Chain: Arbitrum Sepolia");
    console.log("Destination Chain: Optimism Sepolia");
    console.log("OFT Adapter (Arbitrum):", oftAddress);
    console.log("Token (USDC Arbitrum):", tokenAddress);
    console.log("Amount:", ethers.formatUnits(amount, 6), "USDC");
    console.log("Recipient (Optimism):", recipient);
    console.log("Destination EID:", dstEid, "(Optimism Sepolia)");
    console.log("Native Fee:", ethers.formatEther(fee.nativeFee), "ETH");
    
    // Verify user has enough USDC balance before attempting transaction
    console.log("\n--- Pre-flight Checks ---");
    const userBalance = await usdcContract.balanceOf(walletAddress);
    console.log("User USDC balance:", ethers.formatUnits(userBalance, 6), "USDC");
    console.log("Required amount:", ethers.formatUnits(amount, 6), "USDC");
    
    if (userBalance < amount) {
      throw new Error(`Insufficient USDC balance. Have ${ethers.formatUnits(userBalance, 6)} USDC, need ${ethers.formatUnits(amount, 6)} USDC`);
    }
    
    // Verify approval again right before transaction
    const finalAllowance = await usdcContract.allowance(walletAddress, BRIDGE_SENDER_ADDRESS);
    console.log("Final allowance check:", ethers.formatUnits(finalAllowance, 6), "USDC");
    if (finalAllowance < amount) {
      throw new Error(`Insufficient allowance. Have ${ethers.formatUnits(finalAllowance, 6)} USDC, need ${ethers.formatUnits(amount, 6)} USDC. Please approve again.`);
    }
    
    // Build the transaction on Arbitrum Sepolia
    console.log("\n--- Building Transaction on Arbitrum Sepolia ---");
    let tx;
    try {
      tx = await bridgeSender.bridgeTokens(
        oftAddress,
        tokenAddress,
        amount,
        recipient,
        dstEid,
        { value: fee.nativeFee }
      );
    } catch (error) {
      console.error("\n❌ Error building bridgeTokens transaction:");
      console.error("Error message:", error.message);
      
      // Try to decode the error
      if (error.data && error.data.length >= 10) {
        const errorSelector = error.data.slice(0, 10);
        console.error("Error selector:", errorSelector);
        
        // Common LayerZero/OFT errors
        if (errorSelector === "0xa1e86545") {
          console.error("\n🔍 Error 0xa1e86545 - This is likely an OFT/LayerZero configuration error");
          console.error("Possible causes:");
          console.error("   1. OFT adapter not properly configured");
          console.error("   2. LayerZero pathway not set up (peers not configured)");
          console.error("   3. OFT adapter's quoteSend() or send() is reverting");
          console.error("   4. LayerZero libraries/DVNs not configured");
          console.error("\n💡 Solutions:");
          console.error("   - Wire the OFT adapters: Set peers between Arbitrum and Optimism OFT contracts");
          console.error("   - Configure send/receive libraries");
          console.error("   - Set up DVNs (Decentralized Verifier Networks)");
          console.error("   - Verify OFT adapter addresses are correct");
          console.error("\nOFT Addresses:");
          console.error("   Arbitrum:", oftAddress);
          console.error("   Optimism:", OFT_ADDRESSES[destinationNetwork]);
        }
      }
      
      if (error.reason) {
        console.error("Reason:", error.reason);
      }
      
      // Check if it's a revert from the contract
      if (error.code === 'CALL_EXCEPTION') {
        console.error("\n⚠️  Contract call reverted. This usually means:");
        console.error("   - A require() statement failed in the contract");
        console.error("   - LayerZero pathway is not configured");
        console.error("   - OFT adapter is not properly set up");
      }
      
      throw error;
    }
    
    console.log("✅ Transaction built and sent!");
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // LayerZero Scan link (testnet)
    console.log("\n📊 Track on LayerZero Scan:");
    console.log(`https://testnet.layerzeroscan.com/tx/${tx.hash}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Checking Updated USDC Balances");
    console.log("=".repeat(60));
    console.log("\n⏳ Waiting a few seconds for cross-chain message to be processed...");
    
    // Wait a bit for the cross-chain message to be processed
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check USDC balance on Arbitrum Sepolia (should be decreased)
    console.log("\n📊 Checking USDC balance on Arbitrum Sepolia (after bridge)...");
    const arbBalanceAfter = await checkUSDCBalance(
      "arbSepolia",
      USDC_ADDRESSES.arbSepolia,
      walletAddress
    );
    
    if (arbBalanceAfter) {
      console.log(`✅ Arbitrum Sepolia USDC Balance (after):`);
      console.log(`   Contract: ${arbBalanceAfter.address}`);
      console.log(`   Balance: ${arbBalanceAfter.formattedBalance} ${arbBalanceAfter.symbol}`);
      console.log(`   Raw balance: ${arbBalanceAfter.balance.toString()}`);
      
      // Show difference if we have the before balance
      if (arbBalance) {
        const diff = arbBalance.balance - arbBalanceAfter.balance;
        console.log(`   Decreased by: ${ethers.formatUnits(diff, 6)} USDC`);
      }
    } else {
      console.log(`⚠️  Could not retrieve Arbitrum Sepolia USDC balance`);
    }
    
    // Check USDC balance on Optimism Sepolia (should be increased after message arrives)
    console.log("\n📊 Checking USDC balance on Optimism Sepolia (after bridge)...");
    console.log("   Note: Balance may not update immediately - LayerZero messages take time to process");
    const opBalanceAfter = await checkUSDCBalance(
      "opSepolia",
      USDC_ADDRESSES.opSepolia,
      walletAddress
    );
    
    if (opBalanceAfter) {
      console.log(`✅ Optimism Sepolia USDC Balance (after):`);
      console.log(`   Contract: ${opBalanceAfter.address}`);
      console.log(`   Balance: ${opBalanceAfter.formattedBalance} ${opBalanceAfter.symbol}`);
      console.log(`   Raw balance: ${opBalanceAfter.balance.toString()}`);
      
      // Show difference if we have the before balance
      if (opBalance) {
        const diff = opBalanceAfter.balance - opBalance.balance;
        if (diff > 0n) {
          console.log(`   Increased by: ${ethers.formatUnits(diff, 6)} USDC`);
        } else {
          console.log(`   ⏳ Balance not yet updated - cross-chain message still processing`);
          console.log(`   Check again in a few minutes or track on LayerZero Scan`);
        }
      }
    } else {
      console.log(`⚠️  Could not retrieve Optimism Sepolia USDC balance`);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Bridge transaction completed!");
    console.log("=".repeat(60));
    console.log("\n💡 Note: Cross-chain messages can take a few minutes to process.");
    console.log("   If the destination balance hasn't updated yet, check again later.");
    console.log(`   Track progress: https://testnet.layerzeroscan.com/tx/${tx.hash}`);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    throw error;
  }
}

// Execute
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
