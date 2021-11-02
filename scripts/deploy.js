

async function main() {

  require('dotenv').config();
  const API_URL = process.env.API_URL;
  const PUBLIC_KEY = process.env.PUBLIC_KEY;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
  const web3 = createAlchemyWeb3(API_URL);

    // Grab the contract factory 

    // Mumbai
    const weth = "0x3C68CE8504087f89c640D02d133646d98e64ddd9";
    const wmatic = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889";
    const aaveDataProvider = "0xFA3bD19110d986c5e5E9DD5F69362d05035D045B";
    const aaveLendingPool = "0x9198F13B08E299d85E096929fA9781A1E3d5d827";
    const aaveIncentivesController = "0xd41aE58e803Edf4304334acCE4DC4Ec34a63C644";
    const uniRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
    const chainlink = "0x0715A7794a1dc8e42615F059dD6e406A6594651A";
    const dai = "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F";
    const usdc = "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e";
    const aaveLendingPoolAddressProvider = "0x178113104fEcbcD7fF8669a0150721e231F0FD4B";

    const pilot = "0x181BB6Abc3F5D9686FA3D9bcBf2B715ff0eE0806";
    const v = "0xaf8682BE6D1aE0BBBA1D04FAE698a64C465A732e";
    const factor = "1200000000000000000"; // 1.2

    const Strategy = await ethers.getContractFactory("StrategyAave");
    const StrategyLeveraged = await ethers.getContractFactory("StrategyAaveLeveraged");
    const Vault = await ethers.getContractFactory("AirliftVaultV1");

    //const nonce = await web3.eth.getTransactionCount(pilot);
    //const futureStrategyAddress = ethers.utils.getContractAddress({ from: pilot, nonce: nonce+1 });
    //console.log(futureStrategyAddress);
 
    // Start deployment, returning a promise that resolves to a contract object

    //const contract = await Vault.deploy(futureStrategyAddress, "2X Leveraged WETH", "2XWETH", 10); // Instance of the contract 
    //const contract = await Strategy.deploy(weth, wmatic, 50, 60, 2, "1000000000000000000", aaveDataProvider, aaveLendingPool, aaveIncentivesController, v, uniRouter, pilot, pilot, pilot);
    const contract = await StrategyLeveraged.deploy(weth, dai, wmatic, 50, 60, 3, "1000000000000000000", aaveDataProvider, aaveLendingPool, aaveIncentivesController, aaveLendingPoolAddressProvider, v, uniRouter, pilot, pilot, pilot);
    console.log("Contract deployed to address:", contract.address);
 }
 
 main()
   .then(() => process.exit(0))
   .catch(error => {
     console.error(error);
     process.exit(1);
   });

// npx hardhat run scripts/deploy.js --network mumbai
// npx hardhat verify --network mumbai DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"