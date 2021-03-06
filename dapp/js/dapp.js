//var web3 = AlchemyWeb3.createAlchemyWeb3("wss://polygon-mumbai.g.alchemy.com/v2/Ptsa6JdQQUtTbRGM1Elvw_ed3cTszLoj");
var web3 = AlchemyWeb3.createAlchemyWeb3("http://localhost:8545");
var BN = web3.utils.BN;

const vaultAddress = "0xAF7DE44b62c401521653628d10e411972c762c6c";
const vault = new web3.eth.Contract(vaultABI, vaultAddress);
//const wethAddress = "0x3C68CE8504087f89c640D02d133646d98e64ddd9"; // Mumbai
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";  // Mainnet (fork)
const WETH = new web3.eth.Contract(tokenABI, wethAddress);

const stratAddress = "0xa4B8C0e5dDB4677b0B545CB36A8f1Daa050d22cA";
const stratContract = new web3.eth.Contract(strategyABI, stratAddress);

var gas = web3.utils.toHex(new BN('2000000000000')); // 2000 Gwei;
var dappChain = 80001; // default to Mumbai
var userChain;
var accounts;
var approved = 0;
var wethBal = 0;
var vaultBal = 0;
var vaultPrice = 0;
var TVL = 0;
var since = 0;
var userBal = 0;
var userShare = 0;
var mode = "deposit";

function abbrAddress(address){
    if (!address) {
        address = ethereum.selectedAddress;
    }
    return address.slice(0,4) + "..." + address.slice(address.length - 4);
}


async function main() {
    dappChain = await web3.eth.getChainId();
    console.log("The chainId is " + dappChain);

    accounts = await web3.eth.getAccounts();
    //connectWallet();
    if (accounts.length > 0) {
        $(".app-wallet-details button.connect span").text( abbrAddress() );
        wethBal = await WETH.methods.balanceOf(ethereum.selectedAddress).call();
        console.log(wethBal);
        console.log(web3.utils.fromWei(wethBal));
        $(".card-buttons button.connect").hide().next().show();
    }

    userChain = await ethereum.request({ method: 'eth_chainId' });
    console.log("The chainId of connected account is " + web3.utils.hexToNumber(userChain));

    if ( !correctChain() ) {
        //$("body").append(wrongNetworkModal());
        //$(".close, .modal-backdrop").click(function(){
        //    $(".fade.show").remove();
        //});
    }

    window.ethereum.on('accountsChanged', function () {
        web3.eth.getAccounts(function (error, accts) {
            console.log(accts[0], 'current account after account change');
            accounts = accts;
            location.reload();
        });
    });

    window.ethereum.on('chainChanged', function () {
      location.reload();
    });

    updateStats();
    
}


function correctChain() {
  var correct = false;
  if (dappChain == userChain) {
    correct = true;
  }
  return correct;
}

async function connectWallet() {
    $("#status").text("Connecting...");
    if (window.ethereum) {
        //console.log("window.ethereum true");
        window.ethereum
            .enable()
            .then(async result => {
                // Metamask is ready to go!
                //console.log(result);
                accounts = result;
                $(".app-wallet-details button.connect span").text( abbrAddress() );
                wethBal = await WETH.methods.balanceOf(ethereum.selectedAddress).call();
                console.log(wethBal);
                console.log(web3.utils.fromWei(wethBal));
                $(".card-buttons button.connect").hide().next().show();
            })
            .catch(reason => {
                // Handle error. Likely the user rejected the login.
            });
    } else {
        // The user doesn't have Metamask installed.
        console.log("window.ethereum false");
    } 
} // connectWallet()

function fromWei(amount) {
    return web3.utils.fromWei(new BN(amount));
}

async function updateStats() {
    vaultBal = await vault.methods.totalSupply().call();
    vaultPrice = await vault.methods.getPricePerFullShare().call();
    TVL = web3.utils.fromWei(vaultBal) * web3.utils.fromWei(vaultPrice);
    var since = (web3.utils.fromWei(vaultPrice) - 1) / 1 * 100;
    if (ethereum.selectedAddress) {
        wethBal = await WETH.methods.balanceOf(ethereum.selectedAddress).call();
        userBal = await vault.methods.balanceOf(ethereum.selectedAddress).call();
        userShare = web3.utils.fromWei(userBal) / web3.utils.fromWei(vaultBal) * 100; 
    }
    console.log(vaultBal, vaultPrice, TVL);
    $(".tvl").text( TVL.toFixed(4) );
    $(".since").text( since.toFixed(2) + "%" );
    $(".balance").text( parseFloat(web3.utils.fromWei(userBal)).toFixed(4) );
    $(".share").text( userShare.toFixed(4) + "%" );
    const data = await stratContract.methods.userReserves().call();
    var weth = web3.utils.fromWei(data[0]);
    var usd = web3.utils.fromWei(data[1]);
    $(".want").text( parseFloat(web3.utils.fromWei(data[0])).toFixed(4) );
    $(".debt").text( parseFloat(web3.utils.fromWei(data[1])).toFixed(0) );
}

async function addToken() {
    const tokenAddress = vaultAddress;
    const tokenSymbol = '2XWETH';
    const tokenDecimals = 18;
    const tokenImage = 'https://airlift.finance/images/weth2x.png';

    try {
        // wasAdded is a boolean. Like any RPC method, an error may be thrown.
        const wasAdded = await ethereum.request({
            method: 'wallet_watchAsset',
            params: {
            type: 'ERC20', // Initially only supports ERC20, but eventually more!
            options: {
                address: tokenAddress, // The address that the token is at.
                symbol: tokenSymbol, // A ticker symbol or shorthand, up to 5 chars.
                decimals: tokenDecimals, // The number of decimals in the token
                image: tokenImage, // A string url of the token logo
            },
            },
        });

        if (wasAdded) {
            console.log('Thanks for your interest!');
        } else {
            console.log('Your loss!');
        }
    } catch (error) {
        console.log(error);
    }
}




$( document ).ready(function() {

    main();

    $(".connect").click(function(){
        connectWallet();
        return false;
    });

    $(".nav-withdraw").click(function(){
        $(this).parent().siblings().find(".nav-link").removeClass("active");
        $(this).addClass("active");
        $(".card-title").text("Withdraw");
        $(".deposit").hide();
        $(".withdraw").show();
        $("#amount").val(0.0);
        mode = "withdraw";
        return false;
    });

    $(".nav-deposit").click(function(){
        $(this).parent().siblings().find(".nav-link").removeClass("active");
        $(this).addClass("active");
        $(".card-title").text("Deposit");
        $(".withdraw").hide();
        $(".deposit").show();
        $("#amount").val(0.0);
        mode = "deposit";
        return false;
    });

    $(".max").click(function(){
        var max = 0;
        if (mode == "deposit") {
            max = web3.utils.fromWei(wethBal);
        } else {
            max = web3.utils.fromWei(userBal);
        }
        $("#amount").val(max);
    });

    $(".add").click(function(){
        addToken();
        return false;
    });

    $(".deposit").click(async function(){
        var amt = $("#amount").val();
        if ( approved >= amt ) {
            $("button.deposit").text("Waiting...");
            const nonce = await web3.eth.getTransactionCount(accounts[0], 'latest');

            //the transaction
            const tx = {
                'from': ethereum.selectedAddress,
                'to': vaultAddress,
                'gasPrice': gas,
                'nonce': "" + nonce,
                'data': vault.methods.deposit(web3.utils.toHex(web3.utils.toWei(amt))).encodeABI()
            };
            //console.log(tx);

            const txHash = await ethereum.request({
                method: 'eth_sendTransaction',
                params: [tx],
            });
            //console.log(txHash);
            var pendingTxHash = txHash;
            if (dappChain != 31337) {
                web3.eth.subscribe('newBlockHeaders', async (error, event) => {
                    if (error) {
                        console.log("error", error);
                    }
                    const blockTxHashes = (await web3.eth.getBlock(event.hash)).transactions;

                    if (blockTxHashes.includes(pendingTxHash)) {
                        web3.eth.clearSubscriptions();
                        $("button.deposit").text("Deposited!");
                        $("#amount").val(0.00);
                        updateStats();
                    }
                });
            } else {
                $("button.deposit").text("Deposited!");
                $("#amount").val(0.00);
                updateStats();
            }
        } else {
            // need approval
            $("button.deposit").text("Approving...");
            const nonce = await web3.eth.getTransactionCount(accounts[0], 'latest');

            //the transaction
            const tx = {
                'from': ethereum.selectedAddress,
                'to': wethAddress,
                'gasPrice': gas,
                'nonce': "" + nonce,
                'data': WETH.methods.approve(vaultAddress, web3.utils.toHex(web3.utils.toWei(amt))).encodeABI()
            };
            //console.log(tx);

            const txHash = await ethereum.request({
                method: 'eth_sendTransaction',
                params: [tx],
            });
            //console.log(txHash);
            var pendingTxHash = txHash;
            if (dappChain != 31337) {
                web3.eth.subscribe('newBlockHeaders', async (error, event) => {
                    if (error) {
                        console.log("error", error);
                    }
                    const blockTxHashes = (await web3.eth.getBlock(event.hash)).transactions;

                    if (blockTxHashes.includes(pendingTxHash)) {
                        web3.eth.clearSubscriptions();
                        //console.log("Bid received!");
                        $("button.deposit").text("Deposit");
                        approved = amt;
                    }
                });
            } else {
                $("button.deposit").text("Deposit");
                approved = amt;
            }
        }
    });

    $(".withdraw").click(async function(){
        var amt = $("#amount").val();
        $("button.withdraw").text("Waiting...");
        const nonce = await web3.eth.getTransactionCount(accounts[0], 'latest');

        //the transaction
        const tx = {
            'from': ethereum.selectedAddress,
            'to': vaultAddress,
            'gasPrice': gas,
            'nonce': "" + nonce,
            'data': vault.methods.withdraw(web3.utils.toHex(web3.utils.toWei(amt))).encodeABI()
        };
        //console.log(tx);

        const txHash = await ethereum.request({
            method: 'eth_sendTransaction',
            params: [tx],
        });
        //console.log(txHash);
        var pendingTxHash = txHash;
        if (dappChain != 31337) {
            web3.eth.subscribe('newBlockHeaders', async (error, event) => {
                if (error) {
                    console.log("error", error);
                }
                const blockTxHashes = (await web3.eth.getBlock(event.hash)).transactions;

                if (blockTxHashes.includes(pendingTxHash)) {
                    web3.eth.clearSubscriptions();
                    $("button.withdraw").text("Withdrawn!");
                    $("#amount").val(0.00);
                    updateStats();
                }
            });
        } else {
            $("button.withdraw").text("Withdrawn!");
            $("#amount").val(0.00);
            updateStats();
        }
    });

});



// HTML templates

function getHTML(ctx) {
    var html = "";
    html = `
    TBD
    `;
    return html;
}

function wrongNetworkModal(ctx){
    var html = "";
    html = `
    <div class="fade modal-backdrop show"></div>
    <div role="dialog" aria-modal="true" class="modal-theme modal-switch light modal" tabindex="-1" style="display: block;">
        <div class="modal-dialog">
            <div class="modal-content">
            <div class="modal-header"><div class="modal-title-custom modal-title h4">Switch Network</div></div>
                <div class="modal-body" style="margin-left: 20px;">
                    <p>Airlift is currently deployed on a fork of mainnet.</p>
                    <p><b>To get started, please switch your network by following the instructions below:</b></p>
                    <ol>
                        <li>Open Metamask</li>
                        <li>Click the network select dropdown</li>
                        <li>Click on "Mumbai Test Network"</li>
                    </ol>
                </div>
            </div>
        </div>
    </div>
    `;
    return html;
}
