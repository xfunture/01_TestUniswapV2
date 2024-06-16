// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.24;

// import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "hardhat/console.sol";


// contract Arbitrage is DyDxFlashLoan {
//     IUniswapV2Router02 public immutable uRouter;
//     IUniswapV2Router02 public immutable sRouter;

//     address public owner;

//     constructor(address _uRouter, address _sRouter) {
//         uRouter = IUniswapV2Router02(_uRouter);
//         sRouter = IUniswapV2Router02(_sRouter);
//         owner = msg.sender;
//     }

//     function executeTrade(
//         address _tokenA,
//         address _tokenB,
//         uint256 _flashAmount,
//         bool _startOnUniswap
//     ) external {
//         console.log("Balance before", IERC20(_tokenA).balanceOf(address(this)));
//         uint balanceBefore = IERC20(_tokenA).balanceOf(address(this));
//         bytes memory data = abi.encode(
//             _startOnUniswap,
//             _tokenA,
//             _tokenB,
//             _flashAmount,
//             balanceBefore
//         );
//         flashloan(_tokenA, _flashAmount, data);
//     }

//     function callFunction(
//         address,
//         Info calldata,
//         bytes calldata data
//     ) external onlyPool {
//         (
//             bool _startOnUniswap,
//             address _tokenA,
//             address _tokenB,
//             uint256 flashAmount,
//             uint256 balanceBefore
//         ) = abi.decode(data, (bool, address, address, uint256, uint256));

//         console.log("Balance after:", IERC20(_tokenA).balanceOf(address(this)));
//         uint balanceAfter = IERC20(_tokenA).balanceOf(address(this));

//         require(
//             balanceAfter - balanceBefore == flashAmount,
//             "Didn't receive flash loan"
//         );

//         address[] memory tokens = new address[](2);

//         tokens[0] = _tokenA;
//         tokens[1] = _tokenB;

//         if (_startOnUniswap == true) {
//             swapOnUniswap(flashAmount, 0, tokens);

//             tokens[0] = _tokenB;
//             tokens[1] = _tokenA;

//             swapOnSushiswap(
//                 IERC20(tokens[0]).balanceOf(address(this)),
//                 0,
//                 tokens
//             );
//         } else {
//             // console.log("Ho 10 WETH e li swappo per x COMPOUND");
//             console.log(
//                 "Balance of WETH before swap:",
//                 IERC20(tokens[0]).balanceOf(address(this))
//             );
//             swapOnSushiswap(flashAmount, 0, tokens);
//             tokens[0] = _tokenB;
//             tokens[1] = _tokenA;

//             // console.log("Ho x COMPOUND e li swappo per >10 WETH");
//             swapOnUniswap(
//                 IERC20(tokens[0]).balanceOf(address(this)),
//                 0,
//                 tokens
//             );
//             console.log(
//                 "Balance of WETH after swap:",
//                 IERC20(tokens[1]).balanceOf(address(this))
//             );
//         }
//     }

//     function swapOnUniswap(
//         uint _amountIn,
//         uint _amountOut,
//         address[] memory _path
//     ) internal {
//         require(
//             IERC20(_path[0]).approve(address(uRouter), _amountIn),
//             "Uniswap failed the approval"
//         );

//         uint[] memory amounts = uRouter.swapExactTokensForTokens(
//             _amountIn,
//             _amountOut,
//             _path,
//             address(this),
//             (block.timestamp + 1200)
//         );

//         console.log(
//             "UNISWAP: Input tokens (COMP):",
//             amounts[0],
//             "Output tokens (ETH):",
//             amounts[1]
//         );
//     }

//     function swapOnSushiswap(
//         uint _amountIn,
//         uint _amountOut,
//         address[] memory _path
//     ) internal {
//         require(
//             IERC20(_path[0]).approve(address(sRouter), _amountIn),
//             "Sushiswap failed the approval"
//         );

//         uint[] memory amounts = sRouter.swapExactTokensForTokens(
//             _amountIn,
//             _amountOut,
//             _path,
//             address(this),
//             (block.timestamp + 1200)
//         );

//         console.log(
//             "SUSHISWAP: Input tokens (ETH):",
//             amounts[0],
//             "Output tokens (COMP):",
//             amounts[1]
//         );
//     }

//     function withdraw(address _tokenAddress) external {
//         console.log("Owner balance:", IERC20(_tokenAddress).balanceOf(owner));
//         require(owner == msg.sender, "Only owner can withdraw");
//         ERC20(_tokenAddress).transfer(
//             owner,
//             IERC20(_tokenAddress).balanceOf(address(this))
//         );
//         console.log("Owner balance", IERC20(_tokenAddress).balanceOf(owner));
//     }
// }


// /**
//  *   const address = new ethers.Wallet(process.env.PRIVATE_KEY, mainnetProvider);
//   if (process.env.IS_DEPLOYED === true) {
//     const options = {
//       gasLimit: 2500000,
//       maxFeePerGas: 40000000000,
//     };
//     const trade = await arbitrageContract
//       .connect(address)
//       .executeTrade(
//         process.env.TOKEN_WETH_MAINNET,
//         process.env.TOKEN_COMPOUND_MAINNET,
//         ethers.BigNumber.from("10000000000000000000"),
//         startOnUniswap,
//         options
//       );

//     receipt = await trade.wait();
//     console.log("sending eth to contract...");
//     const withdraw = await arbitrageContract
//       .connect(address)
//       .withdraw(process.env.TOKEN_WETH_MAINNET);
//     await withdraw.wait();
//     console.log("sent eth to owner successfully");
//   } else {
//     console.log("CURRENTLY ON TEST MODE");
//   }
//  */