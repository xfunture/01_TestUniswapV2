import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("hardhat-gas-reporter")
require("@nomiclabs/hardhat-web3")
require("solidity-coverage")
require("dotenv").config()


const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const ALCHEMY_API_URL = process.env.ALCHEMY_API_URL;

const ALCHEMY_PRIVATE_KEY = process.env.ALCHEMY_PRIVATE_KEY;

const ETHMAINNET_API_URL = process.env.ETHMAINNET_API_URL;

const ETHMAINNET_PRIVATE_KEY = process.env.ETHMAINNET_PRIVATE_KEY;

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

const SEPOLIA_API_URL = process.env.SEPOLIA_API_URL;

const SEPOLIA_WS_URL = process.env.SEPOLIA_WS_URL;



const config: HardhatUserConfig = {
  solidity: "0.8.24",
};

export default config;
module.exports = {
  defaultNetwork:"local",
  solidity: "0.8.24",
  gasReporter: {
    enabled: true,
    outputFile: "gas-reporter.txt",
    noColors: true,
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: "MATIC",
  },
  networks:{
    sepolia:{
      url:ALCHEMY_API_URL,
      accounts:[ALCHEMY_PRIVATE_KEY],
    },
    local:{
      url:"http://127.0.0.1:8545"
    },
    MAINNET:
    {
      url:ETHMAINNET_API_URL,
      accounts:[ETHMAINNET_PRIVATE_KEY]
    }
  },
  hardhat: {
    forking: {
      url: ETHMAINNET_API_URL,
      blockNumber: 20145857
    }
  }
};