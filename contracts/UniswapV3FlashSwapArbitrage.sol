// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;



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


    function _swap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin
    ) private returns(uint256 amountOut){

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

