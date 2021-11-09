/**
* @type import('hardhat/config').HardhatUserConfig
*/
require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-web3");
const { API_URL, PRIVATE_KEY, HH_PRIVATE_KEY, HH_API_URL } = process.env;
module.exports = {
  solidity: {
    version: "0.6.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
   defaultNetwork: "mumbai",
   networks: {
      hardhat: {
        accounts: [{ privateKey: `0x${PRIVATE_KEY}`, balance: "10000000000000000000000"}],
        forking: {
          url: HH_API_URL,
          blockNumber: 20935392  // assumes polygon fork
        },
        loggingEnabled: true,
        gasMultiplier: 5,
        gasPrice: 1000000000 * 4
      },
      mumbai: {
        url: API_URL,
        accounts: [`0x${PRIVATE_KEY}`],
        gasMultiplier: 3,
        gasPrice: 1000000000 * 2
     }
   },
}

// 
// npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/y2J0jJRJ0W0l7e7J1CVv4zRj-GgBjNHP --fork-block-number 13582783