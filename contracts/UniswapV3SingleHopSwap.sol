// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.0;

pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import '@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol';

import "./interfaces/IERC20.sol";
import "./interfaces/IWETH.sol";

import "./interfaces/ISwapRouter02.sol";
import "./interfaces/IV3SwapRouter.sol";



contract UniswapV3SingleHopSwap{

    using LowGasSafeMath for uint256;

    address public owner;

    ISwapRouter private constant router = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address private constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

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
        owner = msg.sender;
        uniswapRouter = ISwapRouter02(_uniswapRouter);

    }

    function swapExactInputSingleHop(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 fee
        )
        external returns (uint256 amountOut)
    {
        weth.transferFrom(msg.sender,address(this),amountIn);
        weth.approve(address(router),amountIn);

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


        (bool success, bytes memory amountBytes) = address(uniswapRouter).call(
            abi.encodeWithSelector(
                IV3SwapRouter.exactInputSingle.selector,
                params
            )
        );
        return bytesToUint(amountBytes);
    }


    function bytesToUint(bytes memory _bytes) internal pure returns (uint256 value) {
        assembly {
            value := mload(add(_bytes, 0x20))
        }
    }

    

}
