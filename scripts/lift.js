require('dotenv').config();
const API_URL = process.env.API_URL;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const web3 = createAlchemyWeb3(API_URL);
var BN = web3.utils.BN;

const contract = require("../artifacts/contracts/vaults/Vault.sol/AirliftVaultV1.json");
const contractAddress = "0xaf8682BE6D1aE0BBBA1D04FAE698a64C465A732e"; // Vault
const vaultContract = new web3.eth.Contract(contract.abi, contractAddress);

//const strategy = require("../artifacts/contracts/strategies/Aave/StrategyAave.sol/StrategyAave.json");
//const stratAddress = "0xEbcCC38Fb90D3e5e45835478137741Dd0FB06341";
const strategy = require("../artifacts/contracts/strategies/Aave/StrategyAaveLeveraged.sol/StrategyAaveLeveraged.json");
const stratAddress = "0x5BC4954c441E1D0BC20c952C367A4a96f6D8cEF9";
const stratContract = new web3.eth.Contract(strategy.abi, stratAddress);

//Mumbai
const dai = "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F";

var ERC20abi = [
  {
      "constant": true,
      "inputs": [],
      "name": "name",
      "outputs": [
          {
              "name": "",
              "type": "string"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": false,
      "inputs": [
          {
              "name": "_spender",
              "type": "address"
          },
          {
              "name": "_value",
              "type": "uint256"
          }
      ],
      "name": "approve",
      "outputs": [
          {
              "name": "",
              "type": "bool"
          }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": false,
      "inputs": [
          {
              "name": "_from",
              "type": "address"
          },
          {
              "name": "_to",
              "type": "address"
          },
          {
              "name": "_value",
              "type": "uint256"
          }
      ],
      "name": "transferFrom",
      "outputs": [
          {
              "name": "",
              "type": "bool"
          }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [],
      "name": "decimals",
      "outputs": [
          {
              "name": "",
              "type": "uint8"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [
          {
              "name": "_owner",
              "type": "address"
          }
      ],
      "name": "balanceOf",
      "outputs": [
          {
              "name": "balance",
              "type": "uint256"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [],
      "name": "symbol",
      "outputs": [
          {
              "name": "",
              "type": "string"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": false,
      "inputs": [
          {
              "name": "_to",
              "type": "address"
          },
          {
              "name": "_value",
              "type": "uint256"
          }
      ],
      "name": "transfer",
      "outputs": [
          {
              "name": "",
              "type": "bool"
          }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [
          {
              "name": "_owner",
              "type": "address"
          },
          {
              "name": "_spender",
              "type": "address"
          }
      ],
      "name": "allowance",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "payable": true,
      "stateMutability": "payable",
      "type": "fallback"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "owner",
              "type": "address"
          },
          {
              "indexed": true,
              "name": "spender",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "value",
              "type": "uint256"
          }
      ],
      "name": "Approval",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "from",
              "type": "address"
          },
          {
              "indexed": true,
              "name": "to",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "value",
              "type": "uint256"
          }
      ],
      "name": "Transfer",
      "type": "event"
  }
];
const WETH = "0x3C68CE8504087f89c640D02d133646d98e64ddd9";
const wethContract = new web3.eth.Contract(ERC20abi, WETH);

async function setStrategy(implementation) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': contractAddress,
    'nonce': nonce,
    'gas': 500000,
    'data': vaultContract.methods.proposeStrat(implementation).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function upgradeStrat() {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': contractAddress,
    'nonce': nonce,
    'gas': 500000,
    'data': vaultContract.methods.upgradeStrat().encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function deposit(amount) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': contractAddress,
    'nonce': nonce,
    'gas': 3000000,
    'data': vaultContract.methods.deposit(amount).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function directDeposit() {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': stratAddress,
    'nonce': nonce,
    'gas': 2000000,
    'data': stratContract.methods.deposit().encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function directWithdraw(amount) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': stratAddress,
    'nonce': nonce,
    'gas': 2000000,
    'data': stratContract.methods.withdraw(amount).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function panic() {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': stratAddress,
    'nonce': nonce,
    'gas': 2000000,
    'data': stratContract.methods.panic().encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function unpause() {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': stratAddress,
    'nonce': nonce,
    'gas': 2000000,
    'data': stratContract.methods.unpause().encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function deleverageOnce(factor) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': stratAddress,
    'nonce': nonce,
    'gas': 2000000,
    'data': stratContract.methods.deleverageOnce(factor).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function withdraw(amount) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': contractAddress,
    'nonce': nonce,
    'gas': 3000000,
    'data': vaultContract.methods.withdraw(amount).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function withdrawAll() {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': contractAddress,
    'nonce': nonce,
    'gas': 3000000,
    'data': vaultContract.methods.withdrawAll().encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function rebalance(rate, depth) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': stratAddress,
    'nonce': nonce,
    'gas': 3000000,
    'data': stratContract.methods.rebalance(rate, depth).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function setHarvestOnDeposit() {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': stratAddress,
    'nonce': nonce,
    'gas': 1000000,
    'data': stratContract.methods.setHarvestOnDeposit(true).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function setMinHealthFactor(factor) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': stratAddress,
    'nonce': nonce,
    'gas': 3000000,
    'data': stratContract.methods.setMinHealthFactor(factor).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function getPrice() {
    const price = await vaultContract.methods.getLatestPrice().call();
    console.log("The Price is: " + price);
}

async function getAssetPrice(asset) {
  const price = await stratContract.methods.getAssetPrice(asset).call();
  console.log("The Price is: " + price);
}

async function balanceOfVault(address) {
  const bal = await vaultContract.methods.balanceOf(address).call();
  console.log("The Balance is: " + bal);
}

async function withdrawAmountVault(shares) {
  const bal = await vaultContract.methods.withdrawAmount(shares).call();
  console.log("Amount to b withdrawn is: " + bal);
}

async function getPricePerFullShare() {
  const bal = await vaultContract.methods.getPricePerFullShare().call();
  console.log("The Price is: " + bal);
}

async function totalSupply() {
  const bal = await vaultContract.methods.totalSupply().call();
  console.log("Total Supply is: " + bal);
}

async function userAccountData() {
  const data = await stratContract.methods.userAccountData().call();
  console.log("The User Data is: " + JSON.stringify(data));
}

async function getETHPrice() {
  const data = await stratContract.methods.getLatestPrice().call();
  console.log("The price: " + JSON.stringify(data));
}

async function lastHarvest() {
  const data = await stratContract.methods.lastHarvest().call();
  console.log("Last harvested on: " + data);
}

async function borrowAmount() {
  const data = await stratContract.methods.borrowAmount().call();
  console.log("Amt is: " + data);
}

async function withdrawAmount() {
  const data = await stratContract.methods.withdrawAmount().call();
  console.log("Amt is: " + data);
}

async function targetSupplyinETH(factor) {
  const data = await stratContract.methods.targetSupplyinETH(factor).call();
  console.log("Target is: " + data);
}

async function balanceOfStrategy() {
  const data = await stratContract.methods.balanceOf().call();
  console.log("Balance is: " + data);
}

async function rewardsAvailable()  {
  const data = await stratContract.methods.rewardsAvailable().call();
  console.log("The rewards to claim is: " + JSON.stringify(data));
}

async function getRiskProfile()  {
  const data = await stratContract.methods.risk().call();
  console.log("The risk profile is: " + JSON.stringify(data));
}

async function approve(amount) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': WETH,
    'nonce': nonce,
    'gas': 1000000,
    'data': wethContract.methods.approve(contractAddress, amount).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

async function approveVault(amount) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce

  //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': contractAddress,
    'nonce': nonce,
    'gas': 1000000,
    'data': vaultContract.methods.approve(contractAddress, amount).encodeABI()
  };

  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
  signPromise.then((signedTx) => {

    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(err, hash) {
      if (!err) {
        console.log("The hash of your transaction is: ", hash, "\nCheck Alchemy's Mempool to view the status of your transaction!"); 
      } else {
        console.log("Something went wrong when submitting your transaction:", err)
      }
    });
  }).catch((err) => {
    console.log("Promise failed:", err);
  });
}

//mint(); //"19290123456790"); // 50 per month
//issue("0xFa083DfD09F3a7380f6dF6E25dd277E2780de41D", 0, "1000000000000000000"); // Dog Master
//issue("0x0F74e1B1b88Dfe9DE2dd5d066BE94345ab0590F1", 1, "100000000000000000"); // NFT Words
//issue("0x09A900eB2ff6e9AcA12d4d1a396DdC9bE0307661", 2, "100000000000000000"); 
//issue("0x0F74e1B1b88Dfe9DE2dd5d066BE94345ab0590F1", 3, "1000000000000000000"); // NFT Words
//issue("0x5dbCaC6c76bd32497B652D1afFf959B3f83B53e1", 4); // Jerry
//getPrice();
//swap();
//comp();
//withdrawTokens("0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa"); // DAI
//withdrawTokens("0xF0d0EB522cfa50B716B3b1604C4F0fA6f04376AD"); // cDAI
//withdrawTokens("0x3ED99f859D586e043304ba80d8fAe201D4876D57"); // cDAIx
//withdrawTokens("0x61460874a7196d6a22D1eE4922473664b3E95270"); // COMP
//withdrawTokens("0xd0A1E359811322d97991E03f863a0C30C2cF029C"); // WETH
//withdrawETH();
//upgrade();
//defi();
//claimComp();
//latestExchangeRate();
//setMinter("0xEAaf297Ac0b3F1b8c576529eaa8A9E3984495D4E");
//tokenURI(1);

//setStrategy("0x52ff8DcF61b8743515a3A7Ca5456A6227f43a55d");
//upgradeStrat();
//approve('2000000000000000000');
//deposit('2000000000000000000');
//userAccountData();
//rewardsAvailable();
//lastHarvest();
//rebalance(20,2);
//setHarvestOnDeposit();
//balanceOf(PUBLIC_KEY); // 1000000000000000000 = 1 share
//approveVault('20000000000000000000');
//withdraw('500000000000000000'); // 0.5 shares
//withdraw('250000000000000000'); // 0.25 shares
//withdrawAll();
//getETHPrice();
//directDeposit();
//directWithdraw('1000000000000000000');
//borrowAmount();
//getAssetPrice(dai);
//panic();
//unpause();
//withdrawAmount();
//targetSupplyinETH('1200000000000000000'); // 1.2
//deleverageOnce('1200000000000000000'); // 1.2
//balanceOf();
//getPricePerFullShare();
//totalSupply();
//balanceOfVault(PUBLIC_KEY);
//withdrawAmountVault('500000000000000000'); 
//setMinHealthFactor('1250000000000000000'); // 1.25
getRiskProfile();
