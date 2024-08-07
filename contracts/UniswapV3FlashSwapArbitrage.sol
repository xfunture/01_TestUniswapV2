// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";


address constant SWAP_ROUTER_02 = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;

contract UniswapV3FlashSwapArbitrage{

    ISwapRouter02 constant router = ISwapRouter02(SWAP_ROUTER_02);
    uint160 private constant MIN_SQRT_RATIO = 4295128739;
    uint160 private constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;
    address public owner;


    // DAI/WETH 0.3% swap fee pool0
    // DAI/WETH 0.05% swap fee pool
    // 1.Flash swap on pool0 (receive WETH)
    // 2.Swap on pool1 (WETH -> DAI)
    // 3.Send DAI to pool0
    // profit  = DAI received from pool1 - DAI repaid to pool0


    constructor(){
        owner = msg.sender;
    }

    function flashSwap(
        address pool0,
        uint24 fee1,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external {
        bool zeroForOne = tokenIn < tokenOut;
        // 0 -> 1 => sqrt price decrease
        // 1 -> 0 => sqrt price increase
        uint160 sqrtPriceLimit96 = 
        zeroForOne ? MIN_SQRT_RATIO + 1 : MAX_SQRT_RATIO - 1;
        bytes memory data = abi.encode(
            msg.sender,
            pool0,
            fee1,
            tokenIn,
            tokenOut,
            amountIn,
            zeroForOne
        );

        console.log("\n\nflashswap function");
        console.log("zeroforone:",zeroForOne);
        console.log("amountIn:",amountIn);
        console.log("tokenIn:",tokenIn);
        console.log("tokenOut:",tokenOut);

        //swap DAI to WETH on pool0
        // pool0.swap 函数会调用回调函数uniswapV3SwapCallback
        IUniswapV3Pool(pool0).swap(
            {
                recipient:address(this),
                zeroForOne:zeroForOne,
                amountSpecified:int256(amountIn),
                sqrtPriceLimitX96:sqrtPriceLimit96,
                data:data
            }
        );

     



    }


    function _swap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin
    ) private returns(uint256 amountOut){

        console.log("\n\narbitrage _swap function ExactInputSingleParams begin");
        console.log("tokenIn:",tokenIn);
        console.log("tokenOut:",tokenOut);
        console.log("amountIn:",amountIn);
        console.log("amountOutMin:",amountOutMin);

        IERC20(tokenIn).approve(address(router),amountIn);
        ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02.ExactInputSingleParams(
            {
                tokenIn:tokenIn,
                tokenOut:tokenOut,
                fee:fee,
                recipient:address(this),
                amountIn:amountIn,
                amountOutMinimum:amountOutMin,
                sqrtPriceLimitX96:0
            }
        );

        amountOut = router.exactInputSingle(params);
        console.log("arbitrage _swap function end");



    }

    function uniswapV3SwapCallback(
        int256 amount0,
        int256 amount1,
        bytes calldata data
    ) external{
        // Decode data
        (
            address caller,
            address pool0,
            uint24 fee1,
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            bool zeroForOne
        ) = abi.decode(
            data,(address, address,uint24,address,address,uint256,bool)
        );

        //amountOut WETH的数量，指的是通过pool0 DAI 兑换到的WETH的数量
        uint256 amountOut = zeroForOne ? uint256(-amount1):uint256(-amount0);
    
        // pool0 -> tokenIn -> tokenOut( amountOut)
        // swap on pool1 (swap tokenOut -> tokenIn)
        // swap WETH to DAI on pool1
        uint256 buyBackAmount = _swap({
            tokenIn:tokenOut,
            tokenOut:tokenIn,
            fee:fee1,
            amountIn:amountOut,
            amountOutMin:amountIn
        });

        // Repay pool0
        console.log("\n\nuniswapV3SwapCallback function");
        console.log("caller:",caller);
        console.log("zeroForOne:",zeroForOne);
        console.log("buyAmount:",buyBackAmount);
        console.log("amountIn:",amountIn);
        console.log("amountOut:",amountOut);
        uint256 profit = buyBackAmount - amountIn;
        console.log("profit:",profit);
        require(profit > 0,"profit =0");
        IERC20(tokenIn).transfer(pool0,amountIn);
        IERC20(tokenIn).transfer(caller,profit);

        
        uint256 daiBalance = IERC20(tokenIn).balanceOf(address(this));
        uint256 wethBalace = IERC20(tokenOut).balanceOf(address(this));
        console.log("uniswapV3SwapCallback dai balance:",daiBalance);
        console.log("uniswapV3SwapCallback weth balance:",wethBalace);
    }



}


interface ISwapRouter02{
    struct ExactInputSingleParams{
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}


interface IUniswapV3Pool{
    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0,int256 amount1);
}

interface IERC20{
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient,uint256 amount) external returns (bool);
    function allowance(address owner,address spender) external view returns(uint256);
    function approve(address spender,uint256 amount) external returns (bool);
    function transferFrom(address sender,address recipient,uint256 amount) external returns (bool);
}

interface IWETH is IERC20{
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

