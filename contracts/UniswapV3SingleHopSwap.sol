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

    function wrapEther() external payable{
        uint256 balanceBefore = weth.balanceOf(msg.sender);
        uint256 balanceContract = weth.balanceOf(address(this));
        uint256 ethAmount = msg.value;

        console.log("wrapEther:");
        console.log("msg.sender:%s before deposit weth balance:%s",msg.sender,balanceBefore);
        console.log("Contract:%s contract weth balance:%s",address(this),balanceContract);
        weth.deposit{value:ethAmount}();            
        weth.transfer(msg.sender,ethAmount);
        uint256 balanceAfter = weth.balanceOf(msg.sender);
        console.log("msg.sender:%s after deposit weth balance:%s",msg.sender,balanceAfter);
        

    }

    function unwrapEther() external payable{
        console.log("unwrapEther:");
        address payable sender = payable(msg.sender);
        uint256 amount = msg.value;
        uint256 balanceBefore = weth.balanceOf(msg.sender);
        uint256 balanceContract = weth.balanceOf(address(this));
        console.log("msg.sender:%s before deposit weth balance:%s",msg.sender,balanceBefore);
        console.log("Contract:%s contract weth balance:%s",address(this),balanceContract);

        // weth.transferFrom(msg.sender,address(this),amount);
        // weth.withdraw(amount);
        
        uint256 balanceAfter = weth.balanceOf(msg.sender);
        console.log("msg.sender:%s after deposit weth balance:%s",msg.sender,balanceAfter);


    }

   

    function swapExactInputSingle(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 fee
        )
        external returns (uint256 amountOut)
    {
        uint256 wethBalance = weth.balanceOf(owner);
        console.log("wethBalance:",wethBalance);
        // weth.transferFrom(msg.sender,address(this),amountIn);
        // weth.approve(address(router),amountIn);

        // IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter
        //     .ExactInputSingleParams(
        //         {
        //             tokenIn:token0,
        //             tokenOut:token1,
        //             fee:uint24(fee),
        //             recipient:msg.sender,
        //             amountIn:amountIn,
        //             amountOutMinimum:0,
        //             sqrtPriceLimitX96:0
        //         }
        //     );

        // uniswapRouter.exactInputSingle(params);
        // (bool success, bytes memory amountBytes) = address(uniswapRouter).call(
        //     abi.encodeWithSelector(
        //         IV3SwapRouter.exactInputSingle.selector,
        //         params
        //     )
        // );
        // return bytesToUint(amountBytes);
    }


    function bytesToUint(bytes memory _bytes) internal pure returns (uint256 value) {
        assembly {
            value := mload(add(_bytes, 0x20))
        }
    }

    

}
