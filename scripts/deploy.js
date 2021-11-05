async function main() {

  require('dotenv').config();
  const API_URL = process.env.API_URL;
  const PUBLIC_KEY = process.env.PUBLIC_KEY;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
  //const web3 = createAlchemyWeb3(API_URL);

    const chain = "ethereum";
    var args = {};

    if ( chain == "mumbai" ) {
      // Mumbai
      args.weth = "0x3C68CE8504087f89c640D02d133646d98e64ddd9";
      args.wmatic = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889";
      args.aaveDataProvider = "0xFA3bD19110d986c5e5E9DD5F69362d05035D045B";
      args.aaveLendingPool = "0x9198F13B08E299d85E096929fA9781A1E3d5d827";
      args.aaveIncentivesController = "0xd41aE58e803Edf4304334acCE4DC4Ec34a63C644";
      args.uniRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
      args.chainlink = "0x0715A7794a1dc8e42615F059dD6e406A6594651A";
      args.dai = "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F";
      args.usdc = "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e";
      args.aaveLendingPoolAddressProvider = "0x178113104fEcbcD7fF8669a0150721e231F0FD4B";
    }
    if ( chain == "polygon" ) {
      // Polygon
      args.weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
      args.wmatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
      args.aaveDataProvider = "0x7551b5D2763519d4e37e8B81929D336De671d46d";
      args.aaveLendingPool = "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf";
      args.aaveIncentivesController = "0x357D51124f59836DeD84c8a1730D72B749d8BC23";
      args.uniRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
      args.chainlink = "0x0715A7794a1dc8e42615F059dD6e406A6594651A"; // not updated for Polygon yet
      args.dai = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
      args.usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
      args.aaveLendingPoolAddressProvider = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744";
    }
    if ( chain == "ethereum" ) {
      // Ethereum Mainnet
      args.weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
      args.wmatic = "0x4da27a545c0c5B758a6BA100e3a049001de870f5"; // stkAAVE
      args.aaveDataProvider = "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d";
      args.aaveLendingPool = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";
      args.aaveIncentivesController = "0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5";
      args.uniRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // SwapRouter v3
      args.chainlink = "0x0715A7794a1dc8e42615F059dD6e406A6594651A"; // not updated for Polygon yet
      args.dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      args.usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      args.aaveLendingPoolAddressProvider = "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413";
    }

    const pilot = PUBLIC_KEY;
    const v = "0xaf8682BE6D1aE0BBBA1D04FAE698a64C465A732e";
    const factor = "1200000000000000000"; // 1.2

    const Strategy = await ethers.getContractFactory("StrategyAave");
    const StrategyLeveraged = await ethers.getContractFactory("StrategyAaveLeveraged");
    const Vault = await ethers.getContractFactory("AirliftVaultV1");

    const nonce = await web3.eth.getTransactionCount(pilot);
    //const nonce = await hre.network.provider.send("eth_getTransactionCount", [pilot, 'latest']);
    console.log(nonce);
    const futureStrategyAddress = ethers.utils.getContractAddress({ from: pilot, nonce: nonce+1 });
    console.log(futureStrategyAddress);
 
    // Start deployment, returning a promise that resolves to a contract object

    const vaultContract = await Vault.deploy(futureStrategyAddress, "2X Leveraged WETH", "2XWETH", 10); // Instance of the contract 
    console.log("Vault deployed to address:", vaultContract.address);
    //const contract = await Strategy.deploy(weth, wmatic, 50, 60, 2, "1000000000000000000", aaveDataProvider, aaveLendingPool, aaveIncentivesController, v, uniRouter, pilot, pilot, pilot);
    const stratContract = await StrategyLeveraged.deploy(args.weth, args.dai, args.wmatic, 50, 60, 15, "1000000000000000000", args.aaveDataProvider, args.aaveLendingPool, args.aaveIncentivesController, args.aaveLendingPoolAddressProvider, vaultContract.address, args.uniRouter, pilot, pilot, pilot);
    console.log("Strategy deployed to address:", stratContract.address);
 }
 
 main()
   .then(() => process.exit(0))
   .catch(error => {
     console.error(error);
     process.exit(1);
   });

// npx hardhat run scripts/deploy.js --network mumbai
// npx hardhat verify --network mumbai DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"