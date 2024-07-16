// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.0;

pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import '@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol';

import "./interfaces/IERC20.sol";
import "./interfaces/IWETH.sol";

import "./interfaces/ISwapRouter02.sol";
import "./interfaces/IV3SwapRouter.sol";
import "hardhat/console.sol";



contract UniswapV3SingleHopSwap{

    using LowGasSafeMath for uint256;

    address payable public owner;

    ISwapRouter private constant router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);

    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address private constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    // address private constant USDC = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48;

    IWETH private constant weth = IWETH(WETH);
    IERC20 private constant dai = IERC20(DAI);

    ISwapRouter02 public immutable uniswapRouter;
    

// Router1 
//  struct ExactInputSingleParams {
//     address tokenIn;
//     address tokenOut;
//     uint24 fee;
//     address recipient;
//     uint256 deadline;
//     uint256 amountIn;
//     uint256 amountOutMinimum;
//     uint160 sqrtPriceLimitX96;
// }
   

//Router2
//   struct ExactOutputSingleParams {
//         address tokenIn;
//         address tokenOut;
//         uint24 fee;
//         address recipient;
//         uint256 amountOut;
//         uint256 amountInMaximum;
//         uint160 sqrtPriceLimitX96;
//     }

    constructor(address _uniswapRouter){
        owner = payable(msg.sender);
        uniswapRouter = ISwapRouter02(_uniswapRouter);
        console.log("constructor router address",_uniswapRouter);

    }

    //
    receive() external payable{
        console.log("receive");
    }

    fallback() external payable{
        console.log("fallback");
    }


    function bytesToUint(bytes memory _bytes) internal pure returns (uint256 value) {
        assembly {
            value := mload(add(_bytes, 0x20))
        }
    }
    /**
     * 该函数将ETH转换为WETH，并且发送给owner
     * 调用着通过智能合约将msg.value(0.02) ETH转换为weth
     * 1. 将收到的ETH 兑换为WETH，weth.deposit 这一步完成之后本合约就拥有了0.02个weth，
     * 2. 合约将0.02 weth 转给合约的的调用者（owner）
     * 
     */
    function wrapEtherToOwner() external payable{
        uint256 balanceBefore = weth.balanceOf(msg.sender);
        uint256 balanceContract = weth.balanceOf(address(this));
        uint256 ethAmount = msg.value;

        console.log("wrapEtherToOwner:");
        console.log("ethAmount:",ethAmount);
        console.log("msg.sender:%s before deposit weth balance:%s",msg.sender,balanceBefore);
        console.log("Contract:%s contract weth balance:%s",address(this),balanceContract);
        weth.deposit{value:ethAmount}();          
        weth.transfer(owner,ethAmount);
        uint256 balanceAfter = weth.balanceOf(msg.sender);
        balanceContract = weth.balanceOf(address(this));
        console.log("msg.sender:%s after deposit weth balance:%s",msg.sender,balanceAfter);
        console.log("Contract:%s contract weth balance:%s",address(this),balanceContract);

        

    }

    /**
     * 该函数将ETH转换为WETH，weth归合约本身所有
     * 直接调用WETH 合约的存款函数deposit
     * 
     */
    function wrapEtherToContract() external payable{
        uint256 ethAmount = msg.value;
        uint256 balanceContract = weth.balanceOf(address(this));

        console.log("wrapEtherToContract:");
        console.log("ethAmount:",ethAmount);
        console.log("Contract:%s contract weth balance:%s",address(this),balanceContract);
        weth.deposit{value:ethAmount}();          
        balanceContract = weth.balanceOf(address(this));
        console.log("Contract:%s contract weth balance:%s",address(this),balanceContract);

        

    }

    /*
     * 将weth 转为eth ，并且存储在合约当中
     *
     */
    function unwrapEtherToContract(uint256 amount) external payable{
        console.log("unwrapEtherToContract:");
        uint256 balanceBefore = weth.balanceOf(msg.sender);
        uint256 balanceContract = weth.balanceOf(address(this));
        console.log("unwrapEther amount:%s",amount);
        console.log("msg.sender:%s before transferFrom weth balance:%s",msg.sender,balanceBefore);
        console.log("Contract:%s before transferFrom weth balance:%s",address(this),balanceContract);


        weth.approve(address(this),amount);
        weth.withdraw(amount);
        
        uint256 balanceAfter = weth.balanceOf(msg.sender);
        balanceContract = weth.balanceOf(address(this));
        console.log("Contract:%s after transferFrom weth balance:%s",address(this),balanceAfter);
        console.log("Contract:%s before transferFrom weth balance:%s",address(this),balanceContract);




    }
    /*
     * 将weth转为eth，并且发送到个人账户owner
     * 
     */
    function unwrapEtherToOwner(uint256 amount) external payable{
        console.log("unwrapEtherToOwner:");
        uint256 balanceBefore = weth.balanceOf(msg.sender);
        uint256 balanceContract = weth.balanceOf(address(this));
        console.log("unwrapEther amount:%s",amount);
        console.log("msg.sender:%s before transferFrom weth balance:%s",msg.sender,balanceBefore);
        console.log("Contract:%s before transferFrom weth balance:%s",address(this),balanceContract);


        weth.approve(address(this),amount);
        weth.withdraw(amount);
        owner.transfer(amount);
        
        uint256 balanceAfter = weth.balanceOf(msg.sender);
        balanceContract = weth.balanceOf(address(this));
        console.log("Contract:%s after transferFrom weth balance:%s",address(this),balanceAfter);
        console.log("Contract:%s before transferFrom weth balance:%s",address(this),balanceContract);



    }

   
    /*
     * 通过UniswapV3 实现指定输入数量的单跳交换
     * 该函数调用的前提是本智能合约已经拥有了weth
     */
    function swapExactInputSingle(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 fee
        )
        external returns (uint256 amountOut)
    {
        uint256 wethBalance = weth.balanceOf(address(this));
        console.log("wethBalance:",wethBalance);
        weth.approve(address(uniswapRouter),amountIn);

        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter
            .ExactInputSingleParams(
                {
                    tokenIn:token0,
                    tokenOut:token1,
                    fee:uint24(fee),
                    recipient:msg.sender,
                    amountIn:amountIn,
                    amountOutMinimum:0,
                    sqrtPriceLimitX96:0
                }
            );

        amountOut = uniswapRouter.exactInputSingle(params);

        // (bool success, bytes memory amountBytes) = address(uniswapRouter).call(
        //     abi.encodeWithSelector(
        //         IV3SwapRouter.exactInputSingle.selector,
        //         params
        //     )
        // );
        // return bytesToUint(amountBytes);

    }



    function swapExactInput(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 fee
    ) external returns (uint256 amountOut ){
        // struct ExactInputParams {
        // bytes path;
        // address recipient;
        // uint256 amountIn;
        // uint256 amountOutMinimum;

        weth.approve(address(uniswapRouter),amountIn);
        bytes memory path = abi.encodePacked(token0,uint24(fee),token1);

        IV3SwapRouter.ExactInputParams memory params = IV3SwapRouter
            .ExactInputParams(
                {
                    path:path,
                    recipient:owner,
                    amountIn:amountIn,
                    amountOutMinimum:amountOutMinimum

                }
            );
        amountOut = uniswapRouter.exactInput(params);

    }


    /*
     * 通过UniswapV3 实现指定输出数量的单跳交换
     * 该函数调用的前提是本智能合约已经拥有了weth
     */
    function swapExactOutputSingle(
        address token0,
        address token1,
        uint256 amountInMax,
        uint256 amountOut,
        uint256 fee
        )
        external returns(uint256 amountIn)
    {
        uint256 wethBalance = weth.balanceOf(address(this));
        console.log("wethBalance:",wethBalance);
        weth.approve(address(uniswapRouter),amountInMax);

        IV3SwapRouter.ExactOutputSingleParams memory params = IV3SwapRouter
            .ExactOutputSingleParams(
                {
                    tokenIn:token0,
                    tokenOut:token1,
                    fee:uint24(fee),
                    recipient:owner,
                    amountOut:amountOut,
                    amountInMaximum:amountInMax,
                    sqrtPriceLimitX96:0
                }
            );

        amountIn = uniswapRouter.exactOutputSingle(params);

    }

    function swapExactOutput(
        address token0,
        address token1,
        uint256 amountInMax,
        uint256 amountOut,
        uint256 fee
    ) external returns (uint256 amountIn){

        weth.approve(address(uniswapRouter),amountInMax);
        bytes memory path = abi.encodePacked(token1,uint24(fee),token0);

        IV3SwapRouter.ExactOutputParams memory params = IV3SwapRouter
            .ExactOutputParams(
                {
                    path:path,
                    recipient:owner,
                    amountOut:amountOut,
                    amountInMaximum:amountInMax
                }

        );

        amountIn = uniswapRouter.exactOutput(params);

    }

    function swapExactInputMultihop(
        address token0,
        address token1,
        address token2,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 fee
    ) external returns(uint256 amountOut){

        weth.approve(address(uniswapRouter),amountIn);
        bytes memory path = abi.encodePacked(token0,uint24(fee),token1,uint24(fee),token2);

        IV3SwapRouter.ExactInputParams memory params = IV3SwapRouter
            .ExactInputParams(
                {
                    path:path,
                    recipient:owner,
                    amountIn:amountIn,
                    amountOutMinimum:amountOutMinimum

                }
            );
        amountOut = uniswapRouter.exactInput(params);

    }

    
    function swapExactOutputMultihop(
        address token0,
        address token1,
        address token2,
        uint256 amountInMax,
        uint256 amountOut,
        uint256 fee
    ) external returns (uint256 amountIn){

        weth.approve(address(uniswapRouter),amountInMax);
        bytes memory path = abi.encodePacked(token2,uint24(fee),token1,uint24(fee),token0);

        IV3SwapRouter.ExactOutputParams memory params = IV3SwapRouter
            .ExactOutputParams(
                {
                    path:path,
                    recipient:owner,
                    amountOut:amountOut,
                    amountInMaximum:amountInMax
                }

        );

        amountIn = uniswapRouter.exactOutput(params);

    }

}
