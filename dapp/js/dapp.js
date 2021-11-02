var web3 = AlchemyWeb3.createAlchemyWeb3("wss://polygon-mumbai.g.alchemy.com/v2/Ptsa6JdQQUtTbRGM1Elvw_ed3cTszLoj");
var BN = web3.utils.BN;

const vaultAddress = "0xEAaf297Ac0b3F1b8c576529eaa8A9E3984495D4E";
const vault = new web3.eth.Contract(vaultABI, vaultAddress);
const wethAddress = "0x3C68CE8504087f89c640D02d133646d98e64ddd9";
const WETH = new web3.eth.Contract(tokenABI, wethAddress);

var gas = web3.utils.toHex(new BN('2000000000')); // 2 Gwei;
var dappChain = 80001; // default to Mumbai
var userChain;
var accounts;
var approved = 0;

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
}
main();

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
    $(".connect").click(function(){
        connectWallet();
        return false;
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
    <div class="modal-backdrop show"></div>
    <div role="dialog" aria-modal="true" class="modal-theme modal-switch light modal" tabindex="-1" style="display: block;"><div class="modal-dialog modal-sm"><div class="modal-content"><div class="modal-header"><div class="modal-title-custom modal-title h4">Switch Network</div></div><div class="modal-body"><div class="container"><div class="row"><div class="p-3 text-center col"><button class="btn false btn-custom-secondary btn-switch-pop"><div style="position: relative; display: grid; place-items: center;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAMAAAAOusbgAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABiVBMVEUAAABggN9ggOtgfephfOhif+phfephfupifuthfupifelifeljfu1ifupjfuxggOdif+tifepjfOlifupifutifehif+tifetifupggOpgfOlhfulgeupgcN9hfOlge+difepifetifephfuhggO9hfulhfupgf+thfulhfuphfulhfupgfehifulhfuphfOhifupgfedgf+phfulhfepgfOdif+pgfuphfupif+thfuhifuqdrvJ5ke1shuvr7/y0wfRoguuxv/X////Ay/aRpfB2juxth+vi5/uouPOFm+66xvXEzveWqfGnt/OLoO/19/6is/LO1/h/lu67x/b7+/64xPXv8v3Y3/mBl+6ZqvHQ2PiRpPCsu/OcrvGTpvDj6PvI0feJne+pt/Pg5fqdrvGwvvShsfK8yPaJnu9/le1yiuxkf+puiOt1jexmgep0jex5kO1qhOtwieyXqfGmtvPEz/eLn+/Y3/p9lO1nguvr7/1zjOyXqvFuh+t2ju2TpvFog+uot/OKjE3BAAAAO3RSTlMAEEBgkJ+/3+/Pr4Bv318gr59Q739wj4/PMFBfMBCgQGCvcLAQoJBA387e73CA7o/+YDDOvkCeb96uj8ylIG8AAAABYktHRENn0A1iAAAAB3RJTUUH5QMNCwgXeMhisgAABVBJREFUaN7Fm/lfG0UYxnOUDSEJoaSooAha1DbUdFVa1E1JzGxTILGlYo9UvKqoUFGrRWk9av3L3d3ZI5vMJu8zO/vp8xPwycyX95o7qRSqdCZ7akLL5SYNW7m8NlUoZtJwN5gyxamcIVRpqphJCJouapPGSE1OTZcToBokaUrZmZlJGtbRaVU+zxCNDZSfVoCdLaFYJ9fionFrfXQch5elsU6spdOsiKSUQJUzz8Fc198SRsc11zV6DsSmX1CBtfUi5uaXVHExd89L1W588qyS8AaqLNC402qxtl5+TlwSOREugTybDNcwxsR5XnFeBaq8MopbVlpHYY2qqnSCXGt5sBgJVjZOihU5ehaT5RpGxIxRTiyxPFXEYU40wFyaiHsmea7Q2RKOrl+Bmwic/SrcyUaj+RHcaMjZS7jbWsy8ircaXPXimdVmzDSvxTV5Gf/XN23wFt5uIabBdWaDzW24YSmewe0GB3fw/OqPMr6o7DIONj+Gm2pxUrrNPLCJF3NgMl7DjQCM59dpf9CCm15nAdi8gbauLMqmVnunH9yBi9kbseFtYZf1g82baHtN0tN1Fgbj+bUo5+nGIBieLLivXwNbtdggGJ4suK8rWKM2Gwaj+VWRGT0+EYDhYrbHkNexJnUmApu7WC9zcIjbDTEYzK+zcIg/ZWIwOFlYc+MKZjCLAoPFvAjmViMajOVXBsut6yHurdshMjRZLKcKiKP7Db5z1+zd60dDi5FTUFJ3+7CfWaher7f3eUD+AuhqApmavvR9/NXXDqln6/43MvmlIcst19G3vu26oB7X/X3X4016XyVgYdtyQ9v1Lez5coNNnyxKKfJH235oBWAr2N9Bk0WFDu5aoQ1hw2AebHoxk8H1ILQRYAv9/W1yfpHBPwxhh8GWDpSDjT0C+PDBj2QwfXI62h8H/ulncmcGtE/8pTkK/PBXoCt6HfPgbTejwIe/OR+grkTy5CFzd9Pp8+iRGMyDe2XriNidlnqD6pxj9nvbQe8Pgx86wb120/yD2tvZ1JvUjxonjLXC/naxj53gPrnaMffJnRWAfcTGn4w16s6Pe80AfPiAh8L6U5PqaHuZCSx9DuzR+qTP3zb3Lze44LT4FrTY6zjzkxvqpg3mJfTkb3BucrZtSCFvOmTX39vNx/84P9zooLOxcQ5c0D91d+SNf+3fnnEvu6nWoQeYL+ihZeaxt/rh/rZKaMurLejEaw7etAXrvdYGLyFX9EqylYG3qXZNuWrUt32s2XyG9FKROAI5EO8kkADzEMP71GMRGDwS4Bd+2LbNGToHwf+BXZSljpu8muo7fMEc7Z9mgr4OdhRSlWQEV6sr4PGLO3T64Edgc8O/ESHPya68moI3LlwT8sfGuzt9YDDAoZNy+DTzOACTFx2ezse6/DnxwNhQaSt0a38Obe2EWaKSDKMauoVZgP/vAw7GLwYGningT5k6Nhi/agsbLHXFt8nwShq+4pMw+ekOtOjgmhjkpsro8GXVFH7Ntiq4M7+Auw3X2ymBFDyVG6eqiCvjbFC1iDcoiTs78gEffQMnpYtR3NRKPkludcTr7zI8ZgPckU/35hNLsNqYJ4P4bEGTPvbB4DvJcJfHcZMhU7hJkGlcK86KM6xGfBCquqqq71K5asnvQW+sV1SNnvpF9NsqF5QEuoY+7Fbjbn1N7v1+IabRMua6RqO7ORXmci3J+ltfuxQDaysrg9arcbEOGl0exLfWdzgQa712WRXWVjlLWvzq+tq68q+3lbMzq6OhtQSons/XhXBd19//YF2lh0VKL60XZrQ8/zbfai63dvnD7CXc0v8BLUFxRwNgnswAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDMtMTNUMTE6MDg6MTgrMDA6MDC6h83UAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTAzLTEzVDExOjA4OjE4KzAwOjAwy9p1aAAAAABJRU5ErkJggg==" alt="Ethereum"></div><span>Ethereum</span></button></div><div class="p-3 text-center col"><button class="btn false btn-custom-secondary btn-switch-pop"><div style="position: relative; display: grid; place-items: center;"><img src="data:image/png;base64,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" alt="BSC"></div><span>BSC</span></button></div><div class="p-3 text-center col"><button class="btn false btn-custom-secondary btn-switch-pop"><div style="position: relative; display: grid; place-items: center;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAPmklEQVR4Ae1dCZAdRRkONwKCByoIylGKVWgpCCIBLVeTTP+9my0vtkRLEShEKQyQAoEQwHnd/XZDgFAclhxaREWLpLTEk0IiWAIpwyFHEjAuOffNdPdLdkkgJAIhz/pnprMvL++YmXfv9lZtzbw5uv/+vr7+o3umTLF/FgGLgEXAImARsAhYBCwCFgGLgEXAImARsAhYBCwCFgGLgEXAImARsAhYBCwCFgGLgEXAImARsAhYBOpBwCUjpwmQT2VpvsCIVxA0X+Ag75hD5fvqSde+22YErnXWHScgf4+g6o0s6IBcJBj/B+mmggC1mlF1vtvz6L5tFtVmnwSBKxx1cJboywVRaqj3lQIn/m7kGpKR9IBooh4R4H8uSR722TYhkKFevwD9zFDvGLbQssQags1xkI7is29wUHf+eLr/4TaJbrOthoDrbPiEAL0YSc3SjbGINQTjEVt5VCl8TvxLZ08deUe1/Oy9FiHgkpH3CFBcgN6MBLEK3XExmdXOBWhD9DJOfGhRMWw2pQi4bmFvBv63BehVwTgLMnGrrUb0IN1YEETtFKDv4+B9rDR/+7uJCLg0d7oA9RB2xUb1qUZW2ntF3faoAP9al44e2sRi2aTFzJGjGJG3C1Dbh+hoQ1tstUrAQYXdNlXLuSPPskw0GIHb6PABnMiLOeiReYHa09juuBq5xfewt8gCGknUH7K9uZMaXMzJmVzG8WZw0EuHelGV2d1YUQx+tXMkBsdpTAMnYnheT9ceyfKaoPqGQWsNS1cx3Wm5EzioX3FQb6MxohqBle5hhcB3OfGfY8TPMiLPyRDvvAx48znxnscxPG2l4SAL2JsE1jCQ5y4eKOyTrqST7C2XDh/KHX+uALUJW1slK1QlUvE6go+tVIBax8H/fjmd1u1ZeyAn8jwBam0wC0+pXhlrWBb0EtfxzphkdCUrLuqdWaqXRwaHVK026j63MpA3u71rj6glgdubP4KDvE2A+l/angIrVWgN09s5+LNr5Tkp72eppAL0dtQ/q7XOSvcClQny2Gr/mCXep5OCyGZ4ZwpQjw7WMdZjz4GVBIeBpPlP6Oevmr76MEZyw2nIRdNk1OJfqFeFufCUp/fDLh1n62m77WBMB09mp+kPTGjSkhROkJGvYxdXqXWWu26MEBzURg7+HBy7k+RZ7VmX5o7OgrpTgH4zTbeNFY453vnV8phU9xjJPZlkNhvNft8SIO91ychHmgUWB9kjQD0xRON7prAyYuvPEO+OZsnVdeni2FWulZa7Fo2Rz2SJ/GIrCjqLDh8gQF0iQOXjDiHYgjNObmEr5OuKPMoRWe4adpcC1CNzpuXe2+qCuVSeyIl8EXuPcrIVXwu6aOLd22oZOza/YnAqneNkioOS7XTIM5L7lAC1uVaPYwkuqWqVSC2+HnR7xGclr7b8JyO5myMCK7ZkS3AJLcVElj/3sfW+jW7Ckldb/lPQ3OkoS7XAAktwCS3lSQ2jH/Fe1CVudWHtsSWvtvxnlqw7khFvrFo3bQkuoSUmwa+2c/w1IqP3iBEvjz7iSnJbgg1a0bESUOZ61Fq6i2DH/0VJMWP/dHv8w7M0TxmRP+RUX4Qq4YKBLg4CNERWOnYTwTjbv3HmVmzdt8dmNHpw3vSxwwSR12dBj6A6hu7I0CumUT18XoD3zcKUwl5J023785WINde7gWBjOkU3J6dq7lDf+ncnAVaAHBCgVxhCTdnNMXCmhP7rB5mjPpsk7bY/awpR6djpBEcGmB0C9EI+Y+SjSQBl1Ds58IBhOFC0dqoSDng9CtLfjmur0GaeJK+2PVutQHivUwkOIkZ6Rwsc9D+5k/tSEgBxssZBzhegtqIPuxYGxfc5iaJJqM6hGbVcQEMSWZr+bLHw5c47kOBNN/S9iuPimixRF9x1SmG/uCANDCzeh0HuXAH65SCAMIEdvhQbrGA4Y+egnuQge+PK0PLnSgUv/d1JBGOUCCPeOkH1ja6j3p8ELOF4ZwhQS7BLL13tWFrmJL+DIH1QOzlRixhZ//EkMrXk2VqF6SiC+/2Dko6zLh0+WoD8SRgWlKw7roXN+H2ztkpv5kSJwTY4ZCpWlnEhx61Xxdc6ieCKhShzA12NGM+Nak8Yz11+GWtxWes9R6yCmTjV/2VUnjPQCdGetQrVjQRjPLcA/UQUBJhoElULjzj3MUA/nN3rJW1f+1xL4G4iGF2KHNQiUUc8N5YX9d5grKYbjRaRqpKYtc8C1F1ts+VPBILRTi5A3RqqPemWsYbda/DulgzJLWPEe5CR3L8Y8Ufr6QlCI8wrBUGV4kRejjsglBlRmnepJsFBULr/lgsjn2yeFOlSdnvWvkuAupqDlunVnnCCxEFt4eAPDvXp46cUmSSF432IEf8yTtV6HF+jHi1xizYRqBzkvzPE+3K6Eqd4qxbBeB/1vYyTuyhF8k15BUNsBcjvClAvoWwIXpxylD6DXTG+K0Auxl0KqgmbJRuPFETdIkBtS2ocKc43zFPj+uf7WxLeW5x5pfPIjPfc7A7wquAKDAH6sXCMDLdmqiR3peumNQlQT3EnN7MasaX3RK9/qgD1Z5xIxTFvlpfBL8zr3YxLg5a5/asOL82job/LC7CnyoQRlRz8BQ3NPEFiuNJfEHm/ALUTyY0rd/Fzu8ZD0L6g6jK3/+mDEoiw26MZdFDUudTnhr4t2DPeuVvCjf4Rf0zxg9klzgivmbamZSsH3J78IVlQcwSo0dCZn06fDWe08g1B5E8bFbyAq0I4Tb9YD7HnxN/qTlt/fKN53ZUec7xcfJLD8ThL9WpcDupOcffelVATTnivmimIfra+cRZ10mCsfVg4uikrENG6ht4sAWpH0t4lrLQj32oCfGGS3PFmhZns2S0Xd2/F50aR56AfZM76Uxot3GDvxhMEqN/gWImTkuK8455jpY38u6sE8b+DjoZGy1maXgZy0wRRT4RLgeL1NIg9d3JzS9Nq2O+5oRqwOc1MNNQP1VZO5LxGBMS7PSsPQbVHgA7WJ1eLnqxM9LhdmIHiuNVTw8CKkVCw5QXI+XErJhLsEi8TI+n0j+Cib5zVpQEUWwrqoLilEgPv7LRSZIjsQx0RC5ymsiHh2D3iJIyDXMSIbKtnh4O/MI46heXNgOemxS3We6hXZoh3dwhu+r04UG0QoB9IYhTB8YtT9WsBemfcWl/aeo1vVoBa1im+WYz44MTfVGt+0xKCw1pQ2IsT/3uC6nXprULhJEyA3iKIzKClqVINu9FRB3MqrzLbRaTqPciucTbHqZo1e+rSjtoCkRPv/lqtuIUEh1SE2yr4CwToxOEspmWZCQ4HuYIR7wLR6x/jDhT2d3sK+6L1hoE6W4BMtGmpSdscg/Gfqm0c1G24h1elitTO68zxr8bGYmQud2w5wQYQ3Iohi3tSBRabdDNZ7LJxRsmJv5kR78UMyS3HwHXsitNagfA9fF8Q/VdB5GlG3k48curN6liCDWAc/K9hXHA4Pqez+WKLNqa9aqsSytVwc23cvKhXCEd9o9ghYGTttCMD/5KOJxhBu/LM/7yTk2C8zAcelZTbHhmykhxNzDMHGexZOW/66sM6jchK8nQNwaYAbp8+XoD6Wdr9M5IQi8+Gao/ewUH+ks/IJ4p5NjK389h1BBuwGJVf4KD+ERFQdRKRlFR8Poh5pqMY/fg4J950k2/co9vvH94J34LoWoIRaJwRM+qdjzHG9TjCiyuAMZqgc50R/wfuwMr945IayESHDxWgrmXgPe6eWzgwybvNeLarCTaABKsEiJwnQL2KE7E0+iySHJk9X8+CWoDrgE36cY+cyrME6Bfm971WYOCtQrUs7rvNem5CEGzAQeuVoPq3SR0EodqTx5ilPzHHT+y4EDP8U/FdM0vHI6pklmDDTIOPgqr+OEaMUO0JgtGWo/M8qRjujA0fFDR/iwD9erG1yBKcFMkUz7v9/kFZULMFaB/1QFwqguOr0YfxGpooBVHXJN2qH9PmxLtYgNqA6WCaxeO4JTgFYWlfmfulNcdwIm/C4DhO5GZG/Fc4qBVZqm9KugTFyJABfyGGuuBMu5hYc24JNki18Oj2FA7E8FMxc9NR9Y6NjPiPVIuasAS3kNhmZMWI93C3ENwVtuhmkFRPmrUIjrruNThW15NPI97taG9SIwrYjDRqEYy2aw7+tk74oFZH+oObQUoj06xFcGg0we9N5K5rZL5J04qWvIyWzvLNZNAc2+YPTlqgVj0fh2DUsQWRm9q54p6Dd1+cD4hZgktqThyCsXUEQQGgVuKS0pIkmvoTvyjDiH9Lov2tmx1019QSNzjxuASPk6zHOJHX4UZnDRZlj+TQyyZAPpY0LpoR7/o9EpusFxjJ/a7YNGnGskrH8NuHgeVsZRgJMqXhu9VF65PvSuMnDx003gWTlc89ys2Id2UYwx1/JUbYmsPVgALUXxjIz+yRcIoLQZC7o2ZlQXvpIl18XLq6w03xKaIU4nbHKxihyYk3VslUWaklm+s48RFUbRPg34oOi7SlxmUqHNRSbIGpZQncq94S+2m+EhaY418YRpOkDwKMHB4bcCcebIklWVT86YI8VhD18zQLzUwlw2MUDTPGpnsnV8xsMt9gzsglWZqvK8gAWx6O51nQSzn1nWp44paFHD1kVClstWhQKSYs7jnqxZGHbThDci35ek21cnX0PXdG7iQB6gEkKu2yl/HWpN7GFY0MclNR1TEFdwfyh+CeGhzksrA7TtdrYKRL9P5ruE+m67ycaKc+I8+kPArwvypofeuIQwIwSF/uYMR7iRHvb5x4DzPwV9dbgUKdXBc4Ub9vtV4+YSoE7gTAQf6Ig9LpZrThrBy7XvPZ2micTNUVY8+wK1ifqGe5439lwoDdzoJwZ91xAtQ9AlSqbx/GHUurPRcG62M4klaCyitw3XM7MZmQeTPifx6/1IatMAoCSN0Sq5FZei/YC4SoNwVRd+OMe0KC2ymFQv2SgcT9oYfLxW+VklPPb6xEker2d6xcnYLBpJADVzoIqrIc9BacyaaN3S5XAVDtwTFfgBrGzdms0aKNVQp3sxOgF+PkJ663pxyp4TWj9nTgHtFtxLgjssbd7XCXu7R6bbQtE27nv6jWFogdUeDJKAR+7Ao3GUVHQTA+x7BMhZavMZy0PZkhub7JiFvXlTkI5wVddct/M85yUB4n6tIFU7v4S2hdx1CDBEYTJQf1EK6Vwq57/D+YQG3loO/APcUalJ1Nph0I4NaMQyQPjMhMhviME8mEI68YpPLEdshj87QIWAQsAhYBi4BFwCJgEbAIWAQsAhYBi4BFwCJgEbAIWAQsAhYBi4BFwCJgEbAIWAQsAhYBi4BFYAIh8H91vZQHi59LmAAAAABJRU5ErkJggg==" alt="Polygon"><div class="selected-div"><img class="selected" src="/static/media/circle_done.efceef5d.svg" alt="selected"></div></div><span>Polygon</span></button></div></div></div></div></div></div></div>
    `;
    return html;
}
