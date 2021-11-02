var web3 = AlchemyWeb3.createAlchemyWeb3("wss://polygon-mumbai.g.alchemy.com/v2/Ptsa6JdQQUtTbRGM1Elvw_ed3cTszLoj");
var BN = web3.utils.BN;

const vaultAddress = "0xaf8682BE6D1aE0BBBA1D04FAE698a64C465A732e";
const vault = new web3.eth.Contract(vaultABI, vaultAddress);
const wethAddress = "0x3C68CE8504087f89c640D02d133646d98e64ddd9";
const WETH = new web3.eth.Contract(tokenABI, wethAddress);

var gas = web3.utils.toHex(new BN('2000000000')); // 2 Gwei;
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

function abbrAddress(address){
    if (!address) {
        address = ethereum.selectedAddress;
    }
    return address.slice(0,4) + "..." + address.slice(address.length - 4);
}


async function main() {
    dappChain = await web3.eth.getChainId();
    //console.log("The chainId is " + dappChain);

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
    //console.log("The chainId of connected account is " + web3.utils.hexToNumber(userChain));

    if ( !correctChain() ) {
        $("body").append(wrongNetworkModal());
        $(".close, .modal-backdrop").click(function(){
            $(".fade.show").remove();
        });
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

    vaultBal = await vault.methods.totalSupply().call();
    vaultPrice = await vault.methods.getPricePerFullShare().call();
    TVL = web3.utils.fromWei(vaultBal) * web3.utils.fromWei(vaultPrice);
    userBal = await vault.methods.balanceOf(ethereum.selectedAddress).call();
    userShare = web3.utils.fromWei(userBal) / web3.utils.fromWei(vaultBal) * 100; 
    var since = (TVL - 1) / 1 * 100;
    console.log(vaultBal, vaultPrice, TVL);
    $(".tvl").text( TVL.toFixed(4) );
    $(".since").text( since.toFixed(2) + "%" );
    $(".balance").text( web3.utils.fromWei(userBal).toFixed(4) );
    $(".share").text( userShare.toFixed(4) + "%" );
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




$( document ).ready(function() {

    main();

    $(".connect").click(function(){
        connectWallet();
        return false;
    });

    $(".deposit").click(async function(){

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
                    <p>Airlift is currently on the Mumbai Test Network. Mainnet launch coming soon.</p>
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
