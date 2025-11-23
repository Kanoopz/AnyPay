require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: 
  {
    version: "0.8.24",
    settings: 
    {
      optimizer: 
      {
        enabled: true,
        runs: 200
      }
    }
  },
  networks:
  {
    hardhat:
    {},
    mumbai:
    {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: ["0xd046263c0533990c39363b2211811de7d563f9be0d61135fad86db497e2073d5"],
    },
    //Address: 0x1e2e64828Cb332cC41A972020e45249C3B252e9e
    //Private key: 057706fe20a0fef74c81bca939b6c8d0f7ac5cc3920c1e7d8615804a58f8d22b
    goerli:
    {
      url: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: ["0xd046263c0533990c39363b2211811de7d563f9be0d61135fad86db497e2073d5"]
    },
    opGoerli:
    {
      url: "https://proud-tiniest-research.optimism-goerli.discover.quiknode.pro/2e8d9e36f8615b34a5c2353c44ddf450267e86f1/",
      accounts: ["0xd046263c0533990c39363b2211811de7d563f9be0d61135fad86db497e2073d5"]
    },
    baseGoerli: 
    {
      url: "https://base-goerli.public.blastapi.io",
      accounts: ["0xd046263c0533990c39363b2211811de7d563f9be0d61135fad86db497e2073d5"]
    }, 
    sepolia:
    {
      url: "https://rpc.sepolia.org/",
      accounts: ["0xd046263c0533990c39363b2211811de7d563f9be0d61135fad86db497e2073d5"]
    },
    opSepolia:
    {
      url: "https://sepolia.optimism.io",
      accounts: ["0xff6f5404be473495ef803aab7e1f5c002ed858a4d23e2146697e7d1a13681a1a"]
    },
    fuji:
    {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: ["0xd046263c0533990c39363b2211811de7d563f9be0d61135fad86db497e2073d5"]
    },
    arbSepolia:
    {
      url: "https://api.zan.top/arb-sepolia",
      accounts: ["0xff6f5404be473495ef803aab7e1f5c002ed858a4d23e2146697e7d1a13681a1a"]
    }
  },
  etherscan:
  {
    apiKey: 'BT6JPYWFGX1CUBZYYG8WC655KVE4YY5GAP',
    customChains: [
      {
        network: "opSepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io"
        }
      }
    ]
  }
};