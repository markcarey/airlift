// SPDX-License-Identifier: MIT

// This is a modified version of Beefy Finance's StrategyAave.sol: 
// https://github.com/beefyfinance/beefy-contracts/blob/b96151c4e7badc6ac721b35249c11d31fd527710/contracts/BIFI/strategies/Aave/StrategyAave.sol

pragma solidity ^0.6.12;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

import "../../interfaces/aave/IDataProvider.sol";
import "../../interfaces/aave/IIncentivesController.sol";
import "../../interfaces/aave/ILendingPool.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IPriceOracleGetter.sol";
import "../../interfaces/common/IUniswapRouterETH.sol";
import "../../interfaces/common/IUniswapV2Pair.sol";
import "../../interfaces/common/IUniswapV2Callee.sol";
import "../../interfaces/common/IUniswapV2Factory.sol";
import "../../interfaces/common/IUniswapV3Factory.sol";
import "../../interfaces/common/IUniswapV3Pool.sol";
import "../../interfaces/common/IUniswapV3SwapCallback.sol";
import "../../interfaces/common/IERC20Extended.sol";
import "../Common/FeeManager.sol";
import "../Common/StratManager.sol";

contract StrategyAaveLeveraged is StratManager, FeeManager, IUniswapV2Callee, IUniswapV3SwapCallback {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Tokens used
    address public native;
    address public want;
    address public borrow;
    address public aToken;
    address public varDebtToken;

    // Third party contracts
    address public dataProvider;
    address public lendingPool;
    address public incentivesController;
    address public chainlink;
    address public lendingPoolAddressProvider;
    address permissionedPairAddress = address(1);

    // Routes
    address[] public nativeToWantRoute;
    address[] public borrowToWantRoute;
    address[] public wantToBorrowRoute;

    bool public harvestOnDeposit;
    uint256 public lastHarvest;

    /**
     * @dev Variables that can be changed to config profitability and risk:
     * {borrowRate}          - What % of our collateral do we borrow per leverage level.
     * {borrowRateMax}       - A limit on how much we can push borrow risk.
     * {borrowDepth}         - How many levels of leverage do we take.
     * {minLeverage}         - The minimum amount of collateral required to leverage.
     * {BORROW_DEPTH_MAX}    - A limit on how many steps we can leverage.
     * {INTEREST_RATE_MODE}  - The type of borrow debt. Stable: 1, Variable: 2.
     */
    
    struct RiskProfile {
        uint256 borrowRate;
        uint256 borrowRateMax;
        uint256 borrowDepth;
        uint256 minHealthFactor;
        uint256 minLeverage;
    }
    RiskProfile public risk;
    uint256 constant public BORROW_DEPTH_MAX = 10;
    uint256 constant public INTEREST_RATE_MODE = 2;

    /**
     * @dev Helps to differentiate borrowed funds that shouldn't be used in functions like 'deposit()'
     * as they're required to deleverage correctly.
     */
    uint256 public reserves = 0;

    /**
     * @dev Events that the contract emits
     */
    event StratHarvest(address indexed harvester);
    event StratRebalance(uint256 _borrowRate, uint256 _borrowDepth);

    constructor(
        address _want,
        address _borrow,
        address _native,
        uint256 _borrowRate,
        uint256 _borrowRateMax,
        uint256 _borrowDepth,

        uint256 _minLeverage,
        address _dataProvider,
        address _lendingPool,
        address _incentivesController,
        address _lendingPoolAddressProvider,
        address _vault,
        address _unirouter,
        address _keeper,
        address _strategist,
        address _beefyFeeRecipient
    ) StratManager(_keeper, _strategist, _unirouter, _vault, _beefyFeeRecipient) public {
        want = _want;
        borrow = _borrow;
        native = _native;

        risk.borrowRate = _borrowRate;
        risk.borrowRateMax = _borrowRateMax;
        risk.borrowDepth = _borrowDepth;
        risk.minHealthFactor = 1200000000000000000;  // TODO: handle this
        risk.minLeverage = _minLeverage;
        dataProvider = _dataProvider;
        lendingPool = _lendingPool;
        incentivesController = _incentivesController;
        lendingPoolAddressProvider = _lendingPoolAddressProvider;

        //(aToken,,varDebtToken) = IDataProvider(dataProvider).getReserveTokensAddresses(want);
        (aToken,,) = IDataProvider(dataProvider).getReserveTokensAddresses(want);
        (,,varDebtToken) = IDataProvider(dataProvider).getReserveTokensAddresses(borrow);

        nativeToWantRoute = [native, want];
        borrowToWantRoute = [borrow, want];
        wantToBorrowRoute = [want, borrow];

        //priceFeed = AggregatorV3Interface(chainlink);

        _giveAllowances();
    }

    // puts the funds to work
    function deposit() public whenNotPaused {
        uint256 wantBal = availableWant();

        if (healthFactor() < risk.minHealthFactor) {
            _deleverageAll();
            wantBal = IERC20(want).balanceOf(address(this));
        }

        if (wantBal > 0) {
            _leverage(wantBal);
        }
    }

    /**
     * @dev Repeatedly supplies and borrows {want} following the configured {borrowRate} and {borrowDepth}
     * @param _amount amount of {want} to leverage
     */
    function _leverage(uint256 _amount) internal {
        if (_amount < risk.minLeverage) { return; }
        uint256 wantBal = availableWant();
        if ( _amount > wantBal ) {
            _amount = wantBal;
        }
        if (_amount == 0) { return; }
        ILendingPool(lendingPool).deposit(want, _amount, address(this), 0);
        uint256 needed = 0;
        for (uint i = 0; i < risk.borrowDepth; i++) {
            _amount = _amount.mul(risk.borrowRate).div(100);
            needed += _amount;
        }
        if (needed > 0) {
            _flashSwapV3(want, needed, borrow);
        }
    }

    function getAssetPrice(address asset) public view returns (uint256) {
        ILendingPoolAddressesProvider provider = ILendingPoolAddressesProvider(lendingPoolAddressProvider); 
        address priceOracleAddress = provider.getPriceOracle();
        IPriceOracleGetter priceOracle = IPriceOracleGetter(priceOracleAddress);
        uint256 price = priceOracle.getAssetPrice(asset);
        return price;
    }

    /**
     * @dev gets current ETH price in USD from chainlink
     * @return price
     */
    function _getAssetPrice(address asset) internal returns (uint256) {
        ILendingPoolAddressesProvider provider = ILendingPoolAddressesProvider(lendingPoolAddressProvider); 
        address priceOracleAddress = provider.getPriceOracle();
        IPriceOracleGetter priceOracle = IPriceOracleGetter(priceOracleAddress);
        uint256 price = priceOracle.getAssetPrice(asset);
        return price;
    }


    function _deleverageAll() internal {
        (,uint256 borrowedBal) = userReserves();
        _deleverage(borrowedBal);
    }
    function _deleverage(uint256 _amount) internal {
        _flashSwapV3(borrow, _amount, want);
    }

    function _targetSupplyinETH(uint256 targetHealthFactor) internal returns (uint256) {
        (,uint256 totalDebtETH,,uint256 currentLiquidationThreshold,,uint256 healthFactor) = ILendingPool(lendingPool).getUserAccountData(address(this));
        uint256 targetSupply = totalDebtETH.div(currentLiquidationThreshold).mul(targetHealthFactor).div(1e14);
        return targetSupply;
    }

    /**
     * @dev Updates the risk profile and rebalances the vault funds accordingly.
     * @param _borrowRate percent to borrow on each leverage level.
     * @param _borrowDepth how many levels to leverage the funds.
     */
    function rebalance(uint256 _borrowRate, uint256 _borrowDepth) external onlyManager {
        require(_borrowRate <= risk.borrowRateMax, "!rate");
        require(_borrowDepth <= BORROW_DEPTH_MAX, "!depth");

        _deleverageAll();
        risk.borrowRate = _borrowRate;
        risk.borrowDepth = _borrowDepth;

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        _leverage(wantBal);

        StratRebalance(_borrowRate, _borrowDepth);
    }

    /**
     * @dev Updates the minHealthFactor and rebalances the vault funds if needed.
     * @param _factor new minimum health factor.
     */
    function setMinHealthFactor(uint256 _factor) external onlyManager {
        require(_factor > 1e18, "!factor");
        risk.minHealthFactor = _factor;
        _healthCheck();
    }

     /**
     * @dev Updates the borrow asset used and swaps the debt from the old to the new asset
     * @param _borrow address of new borrow asset
     */
    function setBorrow(address _borrow) external onlyManager {
        require(_borrow != borrow, "!same");
        (,uint256 borrowedBal) = userReserves();
        require(borrowedBal > 0, "!nodebt");
        IERC20(_borrow).approve(lendingPool, uint256(-1));
        _flashSwapV3(borrow, borrowedBal, _borrow);
        borrow = _borrow;
    }

    /**
     * @dev Check the Aave Health Factor against minHealthFactor and rebalances
     */
    function _healthCheck() internal {
        if (healthFactor() < risk.minHealthFactor) {
            (uint256 totalCollateralETH, uint256 totalDebtETH,,uint256 currentLiquidationThreshold,,) = ILendingPool(lendingPool).getUserAccountData(address(this));
            uint256 currentTargetHealthFactor = currentLiquidationThreshold.div(risk.borrowRate).mul(1e16);
            console.log("currentTargetHealthFactor", currentTargetHealthFactor);
            if ( risk.minHealthFactor > currentTargetHealthFactor ) {
                // need to reduce the borrowRate
                uint256 _newBorrowRate = currentLiquidationThreshold.mul(1e16).div(risk.minHealthFactor);
                console.log("_newBorrowRate", _newBorrowRate);
                risk.borrowRate = _newBorrowRate;
            }
            uint256 _amount = totalCollateralETH.sub(totalDebtETH);
            uint256 needed = 0;
            for (uint i = 0; i < risk.borrowDepth; i++) {
                _amount = _amount.mul(risk.borrowRate).div(100);
                needed += _amount;
            }
            // convert needed debt to {borrow}
            uint256 decimals = IERC20Extended(borrow).decimals();
            needed = needed.div( _getAssetPrice(borrow) ).mul(10 ** decimals);
            (,uint256 borrowedBal) = userReserves();
            if (borrowedBal > needed) {
                needed = borrowedBal.sub(needed);
            } else {
                needed = 0;
            }
            console.log("healthCheck: flash for borrow", needed);
            if (needed > 0) {
                _deleverage(needed);
            }
            //uint256 wantBal = IERC20(want).balanceOf(address(this));
            //_leverage(wantBal);
            StratRebalance(risk.borrowRate, risk.borrowDepth);
        }
    }

    function beforeDeposit() external override {
        if (harvestOnDeposit) {
            require(msg.sender == vault, "!vault");
            _harvest(tx.origin);
        }
    }

    function harvest() external virtual {
        _harvest(tx.origin);
    }

    function harvestWithCallFeeRecipient(address callFeeRecipient) external virtual {
        _harvest(callFeeRecipient);
    }


    function managerHarvest() external onlyManager {
        _harvest(tx.origin);
    }

    // compounds earnings and charges performance fee
    function _harvest(address callFeeRecipient) internal whenNotPaused {
        address[] memory assets = new address[](2);
        assets[0] = aToken;
        assets[1] = varDebtToken;
        IIncentivesController(incentivesController).claimRewards(assets, type(uint).max, address(this));

        uint256 nativeBal = IERC20(native).balanceOf(address(this));
        if (nativeBal > 0) {
            //chargeFees(callFeeRecipient);
            swapRewards();
            deposit();

            lastHarvest = block.timestamp;
            emit StratHarvest(msg.sender);
        }
    }

    // performance fees
    function chargeFees(address callFeeRecipient) internal {
        uint256 nativeFeeBal = IERC20(native).balanceOf(address(this)).mul(45).div(1000);

        uint256 callFeeAmount = nativeFeeBal.mul(callFee).div(MAX_FEE);
        IERC20(native).safeTransfer(callFeeRecipient, callFeeAmount);

        uint256 beefyFeeAmount = nativeFeeBal.mul(beefyFee).div(MAX_FEE);
        IERC20(native).safeTransfer(beefyFeeRecipient, beefyFeeAmount);

        uint256 strategistFee = nativeFeeBal.mul(STRATEGIST_FEE).div(MAX_FEE);
        IERC20(native).safeTransfer(strategist, strategistFee);
    }

    // swap rewards to {want}
    function swapRewards() internal {
        uint256 nativeBal = IERC20(native).balanceOf(address(this));
        IUniswapRouterETH(unirouter).swapExactTokensForTokens(nativeBal, 0, nativeToWantRoute, address(this), now);
    }

    /**
     * @dev Withdraws funds and sends them back to the vault. It deleverages from venus first,
     * and then deposits again after the withdraw to make sure it mantains the desired ratio.
     * @param _amount How much {want} to withdraw.
     */
    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = availableWant();

        if (wantBal < _amount) {

            uint256 needed = 0;
            uint256 leveragedAmt = _amount;
            for (uint i = 0; i < risk.borrowDepth; i++) {
                leveragedAmt = leveragedAmt.mul(risk.borrowRate).div(100);
                needed += leveragedAmt;
            }
            uint256 decimals = IERC20Extended(borrow).decimals();
            needed = needed.div( _getAssetPrice(borrow) ).mul(10 ** decimals);
            console.log("withdraw: flash for borrow", needed);

            _deleverage(needed);
            ILendingPool(lendingPool).withdraw(want, _amount , address(this));
            wantBal = IERC20(want).balanceOf(address(this));
            console.log("want balance after deleverage and withdrawal", wantBal, _amount);
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }

        if (tx.origin == owner() || paused()) {
            IERC20(want).safeTransfer(vault, wantBal);
        } else {
            uint256 withdrawalFeeAmount = wantBal.mul(withdrawalFee).div(WITHDRAWAL_MAX);
            IERC20(want).safeTransfer(vault, wantBal.sub(withdrawalFeeAmount));
        }

        if (!paused()) {
            _leverage(availableWant());
        }
    }


    /**
     * @dev Required for various functions that need to deduct {reserves} from total {want}.
     * @return how much {want} the contract holds without reserves
     */
    function availableWant() public view returns (uint256) {
        uint256 wantBal = IERC20(want).balanceOf(address(this));
        return wantBal.sub(reserves);
    }

    // return supply and borrow balance
    function userReserves() public view returns (uint256, uint256) {
        (uint256 supplyBal,,,,,,,,) = IDataProvider(dataProvider).getUserReserveData(want, address(this));
        (,,uint256 borrowBal,,,,,,) = IDataProvider(dataProvider).getUserReserveData(borrow, address(this));
        return (supplyBal, borrowBal);
    }

    // returns the user account data across all the reserves
    function userAccountData() public view returns (
        uint256 totalCollateralETH,
        uint256 totalDebtETH,
        uint256 availableBorrowsETH,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        return ILendingPool(lendingPool).getUserAccountData(address(this));
    }

    // returns the user account data across all the reserves
    function healthFactor() public view returns (uint256) {
        (,,,,,uint256 healthFactor) = ILendingPool(lendingPool).getUserAccountData(address(this));
        return healthFactor;
    }

    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant().add(balanceOfPool());
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    // it calculates how much 'want' the strategy has working in the farm.
    function balanceOfPool() public view returns (uint256) {
        // this assumes want == WETH TODO: make this work for other want?
        (uint256 totalCollateralETH, uint256 totalDebtETH,,,,) = ILendingPool(lendingPool).getUserAccountData(address(this));
        return totalCollateralETH.sub(totalDebtETH);
    }

    function nativeToWant() public view returns (address[] memory) {
        return nativeToWantRoute;
    }

    // returns rewards unharvested
    function rewardsAvailable() public view returns (uint256) {
        address[] memory assets = new address[](2);
        assets[0] = aToken;
        assets[1] = varDebtToken;
        return IIncentivesController(incentivesController).getRewardsBalance(assets, address(this));
    }

    // native reward amount for calling harvest
    function callReward() public view returns (uint256) {
        return rewardsAvailable().mul(45).div(1000).mul(callFee).div(MAX_FEE);
    }

    function setHarvestOnDeposit(bool _harvestOnDeposit) external onlyManager {
        harvestOnDeposit = _harvestOnDeposit;
        if (harvestOnDeposit) {
            setWithdrawalFee(0);
        } else {
            setWithdrawalFee(10);
        }
    }

    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");

        _deleverageAll();

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        _deleverageAll();
        pause();
    }

    function pause() public onlyManager {
        _pause();

        _removeAllowances();
    }

    function unpause() external onlyManager {
        _unpause();

        _giveAllowances();

        deposit();
    }

    function _giveAllowances() internal {
        IERC20(want).safeApprove(lendingPool, uint256(-1));
        IERC20(borrow).safeApprove(lendingPool, uint256(-1));  // TODO: needed?
        IERC20(borrow).safeApprove(unirouter, uint256(-1));
        IERC20(want).safeApprove(unirouter, uint256(-1));
        IERC20(native).safeApprove(unirouter, uint256(-1));
    }

    function _removeAllowances() internal {
        IERC20(want).safeApprove(lendingPool, 0);
        IERC20(borrow).safeApprove(lendingPool, 0); // TODO: needed?
        IERC20(borrow).safeApprove(unirouter, 0);
        IERC20(want).safeApprove(unirouter, 0);
        IERC20(native).safeApprove(unirouter, 0);
    }


    // v3 Flash Swaps
    function _flashSwapV3(
        address _tokenBorrow,
        uint _amount,
        address _tokenPay
    ) private {
        console.log("start flash swap", _tokenBorrow, _amount, _tokenPay);
        IUniswapV3Factory uniswapV3Factory = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984); // uni v3 mainnet
        permissionedPairAddress = uniswapV3Factory.getPool(_tokenBorrow, _tokenPay, 500);
        address pairAddress = permissionedPairAddress;
        require(permissionedPairAddress != address(0), "Requested pair is not available.");
        address token0 = IUniswapV3Pool(pairAddress).token0();
        address token1 = IUniswapV3Pool(pairAddress).token1();
        console.log("token0, token1", token0, token1);
        bool zeroForOne = _tokenBorrow == token0 ? false : true;
        bytes memory data = abi.encode(
            _tokenBorrow,
            _amount,
            _tokenPay
        );
        uint160 minSQRT = 4295128740;
        uint160 maxSQRT = 1461446703485210103287273052203988822378723970341;
        uint160 sqrtPriceLimitX96 = zeroForOne ? minSQRT : maxSQRT;
        console.log('ready to v3swap:', zeroForOne);
        console.logInt(int256(_amount));
        console.logInt(sqrtPriceLimitX96);
        IUniswapV3Pool(pairAddress).swap(address(this), zeroForOne, int256(_amount) * -1, sqrtPriceLimitX96, data);
    }

     // @notice Function is called by the Uniswap V2 pair's `swap` function
     function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata _data) external override {
        console.log("start uniswapV3SwapCallback");
        console.logInt(amount0Delta);
        console.logInt(amount1Delta);
        // access control
        require(msg.sender == permissionedPairAddress, "only permissioned UniswapV3Pool can call");
        // decode data
        (
            address _tokenBorrow,
            uint _amount,
            address _tokenPay
        ) = abi.decode(_data, (address, uint, address));
        console.log("decoded", _tokenBorrow, _amount, _tokenPay);
        
        // compute the amount of _tokenPay that needs to be repaid
        address pairAddress = permissionedPairAddress; // gas efficiency
        uint256 amountToRepay = uint256( amount0Delta > 0 ? amount0Delta: amount1Delta );
        console.log("amountToRepay", amountToRepay);

        // get the orignal tokens the user requested
        address tokenBorrowed = _tokenBorrow;
        address tokenToRepay = _tokenPay;

        // do whatever the user wants
        //execute(tokenBorrowed, _amount, tokenToRepay, amountToRepay, _userData);
        if (tokenBorrowed == want) {
            // leverage
            uint256 wantBal = availableWant();
            ILendingPool(lendingPool).deposit(want, wantBal, address(this), 0);
            ILendingPool(lendingPool).borrow(tokenToRepay, amountToRepay, INTEREST_RATE_MODE, 0, address(this));
        } else if (tokenToRepay == want) {
            // deleverage
            uint256 borrowBal = IERC20(_tokenBorrow).balanceOf(address(this));
            ILendingPool(lendingPool).repay(_tokenBorrow, borrowBal, INTEREST_RATE_MODE, address(this));
            ILendingPool(lendingPool).withdraw(want, amountToRepay, address(this));
        } else {
            // debt swap
            uint256 borrowBal = IERC20(_tokenBorrow).balanceOf(address(this));
            console.log("borrow balance", _tokenBorrow, borrowBal);
            ILendingPool(lendingPool).repay(_tokenBorrow, borrowBal, INTEREST_RATE_MODE, address(this));
            console.log("after repay aave");
            borrowBal = IERC20(_tokenBorrow).balanceOf(address(this));
            console.log("borrow balance", _tokenBorrow, borrowBal);
            ILendingPool(lendingPool).borrow(tokenToRepay, amountToRepay, INTEREST_RATE_MODE, 0, address(this));
            uint256 repayBal = IERC20(tokenToRepay).balanceOf(address(this));
            console.log("repay balance", tokenToRepay, repayBal);
        }

        // payback loan 
        IERC20(_tokenPay).transfer(pairAddress, amountToRepay);
     }


    // v2 Flash Swaps
    function _flashSwap(
        address _tokenBorrow,
        uint _amount,
        address _tokenPay
    ) private {
        console.log("start flash swap", _tokenBorrow, _amount, _tokenPay);
        IUniswapV2Factory uniswapV2Factory = IUniswapV2Factory(0xc35DADB65012eC5796536bD9864eD8773aBc74C4); // sushi
        permissionedPairAddress = uniswapV2Factory.getPair(_tokenBorrow, _tokenPay);
        address pairAddress = permissionedPairAddress;
        require(permissionedPairAddress != address(0), "Requested pair is not available.");
        address token0 = IUniswapV2Pair(pairAddress).token0();
        address token1 = IUniswapV2Pair(pairAddress).token1();
        uint amount0Out = _tokenBorrow == token0 ? _amount : 0;
        uint amount1Out = _tokenBorrow == token1 ? _amount : 0;
        bytes memory data = abi.encode(
            _tokenBorrow,
            _amount,
            _tokenPay
        );
        IUniswapV2Pair(pairAddress).swap(amount0Out, amount1Out, address(this), data);
    }

    // @notice Function is called by the Uniswap V2 pair's `swap` function
    function uniswapV2Call(address _sender, uint _amount0, uint _amount1, bytes calldata _data) external override {
        console.log("start uniswapV2Call", _sender, _amount0, _amount1);
        // access control
        require(msg.sender == permissionedPairAddress, "only permissioned UniswapV2 pair can call");
        require(_sender == address(this), "only this contract may initiate");
        // decode data
        (
            address _tokenBorrow,
            uint _amount,
            address _tokenPay
        ) = abi.decode(_data, (address, uint, address));
        console.log("decoded", _tokenBorrow, _amount, _tokenPay);

        // compute the amount of _tokenPay that needs to be repaid
        address pairAddress = permissionedPairAddress; // gas efficiency
        uint pairBalanceTokenBorrow = IERC20(_tokenBorrow).balanceOf(pairAddress);
        console.log("pairBalanceTokenBorrow", pairBalanceTokenBorrow);
        uint pairBalanceTokenPay = IERC20(_tokenPay).balanceOf(pairAddress);
        console.log("pairBalanceTokenPay", pairBalanceTokenPay);
        uint amountToRepay = ((1000 * pairBalanceTokenPay * _amount) / (997 * pairBalanceTokenBorrow)) + 1;
        console.log("amountToRepay", amountToRepay);

        // get the orignal tokens the user requested
        address tokenBorrowed = _tokenBorrow;
        address tokenToRepay = _tokenPay;

        // do whatever the user wants
        //execute(tokenBorrowed, _amount, tokenToRepay, amountToRepay, _userData);
        if (tokenBorrowed == want) {
            // leverage
            uint256 wantBal = availableWant();
            ILendingPool(lendingPool).deposit(want, wantBal, address(this), 0);
            ILendingPool(lendingPool).borrow(tokenToRepay, amountToRepay, INTEREST_RATE_MODE, 0, address(this));
        } else if (tokenToRepay == want) {
            // deleverage
            uint256 borrowBal = IERC20(_tokenBorrow).balanceOf(address(this));
            ILendingPool(lendingPool).repay(_tokenBorrow, borrowBal, INTEREST_RATE_MODE, address(this));
            ILendingPool(lendingPool).withdraw(want, amountToRepay, address(this));
        } else {
            // debt swap
            uint256 borrowBal = IERC20(_tokenBorrow).balanceOf(address(this));
            console.log("borrow balance", _tokenBorrow, borrowBal);
            ILendingPool(lendingPool).repay(_tokenBorrow, borrowBal, INTEREST_RATE_MODE, address(this));
            console.log("after repay aave");
            borrowBal = IERC20(_tokenBorrow).balanceOf(address(this));
            console.log("borrow balance", _tokenBorrow, borrowBal);
            ILendingPool(lendingPool).borrow(tokenToRepay, amountToRepay, INTEREST_RATE_MODE, 0, address(this));
            uint256 repayBal = IERC20(tokenToRepay).balanceOf(address(this));
            console.log("repay balance", tokenToRepay, repayBal);
        }

        // payback loan
        IERC20(_tokenPay).transfer(pairAddress, amountToRepay);
    }


}