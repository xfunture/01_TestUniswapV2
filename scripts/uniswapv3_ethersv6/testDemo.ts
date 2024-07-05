import { ethers } from 'ethers'
// import FACTORY_ABI from './abis/factory.json' assert { type: 'json' };
// import QUOTER_ABI from './abis/quoter.json' assert { type: 'json' };



// import SWAP_ROUTER_ABI from './abis/swaprouter.json' assert { type: 'json' };
// import POOL_ABI from './abis/pool.json' assert { type: 'json' };
// import TOKEN_IN_ABI from './abis/weth.json' assert { type: 'json' };


import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import Quoter2 from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json';
import { CurrentConfig } from './config';
import {ERC20_ABI,POOL_FACTORY_CONTRACT_ADDRESS,QUOTER2_CONTRACT_ADDRESS,QUOTER_CONTRACT_ADDRESS,UNISWAPV3_ROUTER2_ADDRESS,UNISWAPV3_ROUTER_ADDRESS, USDC_TOKEN, WETH_TOKEN} from './lib/constant';
import 'dotenv/config'
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { Token } from '@uniswap/sdk-core';
import { computePoolAddress, SwapQuoter } from '@uniswap/v3-sdk';
import { fromReadableAmount } from './lib/conversion';



// Deployment Addresses
// const POOL_FACTORY_CONTRACT_ADDRESS = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'
// const QUOTER_CONTRACT_ADDRESS = '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
const SWAP_ROUTER_CONTRACT_ADDRESS = UNISWAPV3_ROUTER_ADDRESS;

// Provider, Contract & Signer Instances
const provider = new ethers.JsonRpcProvider(CurrentConfig.rpc.local)
const factoryContract = new ethers.Contract(POOL_FACTORY_CONTRACT_ADDRESS, IUniswapV3PoolABI.abi, provider);
const quoterContract = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, Quoter.abi, provider)
const signer = new ethers.Wallet(CurrentConfig.wallet.privateKey, provider)

// Token Configuration
// const WETH = {
//     chainId: 11155111,
//     address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
//     decimals: 18,
//     symbol: 'WETH',
//     name: 'Wrapped Ether',
//     isToken: true,
//     isNative: true,
//     wrapped: true
//   }
  
// const USDC = {
//     chainId: 11155111,
//     address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
//     decimals: 6,
//     symbol: 'USDC',
//     name: 'USD//C',
//     isToken: true,
//     isNative: true,
//     wrapped: false
// }

const WETH:Token = WETH_TOKEN;
const USDC:Token = USDC_TOKEN;

async function approveToken(tokenAddress:string, tokenABI:any, amount:BigInt, wallet:ethers.Wallet) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);

        const approveTransaction = await tokenContract.approve.populateTransaction(
            SWAP_ROUTER_CONTRACT_ADDRESS,
            ethers.parseEther(amount.toString())
        );

        const transactionResponse = await wallet.sendTransaction(approveTransaction);
        console.log(`-------------------------------`)
        console.log(`Sending Approval Transaction...`)
        console.log(`-------------------------------`)
        console.log(`Transaction Sent: ${transactionResponse.hash}`)
        console.log(`-------------------------------`)
        const receipt = await transactionResponse.wait();
        if(receipt != null)
        {
            console.log(`Approval Transaction Confirmed! https://sepolia.etherscan.io/txn/${receipt.hash}`);
        }else{
            console.log("Approval Transaction error");
        }
    } catch (error) {
        console.error("An error occurred during token approval:", error);
        throw new Error("Token approval failed");
    }
}

async function getPoolInfo(factoryContract:ethers.Contract, tokenIn:Token, tokenOut:Token) {
    // const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000);
    const poolAddress = computePoolAddress(
        {
            factoryAddress:POOL_FACTORY_CONTRACT_ADDRESS,
            tokenA:tokenIn,
            tokenB:tokenOut,
            fee: 3000
        }
    )
    if (!poolAddress) {
        throw new Error("Failed to get pool address");
    }
    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI.abi, provider);
    const [token0, token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
    ]);
    return { poolContract, token0, token1, fee };
}



async function quoteAndLogSwap(quoterContract:ethers.Contract,tokenIn:Token,tokenOut:Token, fee:number, signer:ethers.Wallet, amountIn:number) {
    const quotedAmountOut = await quoterContract.quoteExactInputSingle.staticCall(
        tokenIn.address,                                                // tokenIn
        tokenOut.address,                                               // tokenOut
        fee,                                                              // fee
        fromReadableAmount(                                                             // amountIn
            amountIn,  
            tokenIn.decimals
        ).toString(),
        0             
    );
    console.log(`-------------------------------`)
    console.log(`Token Swap will result in: ${ethers.formatUnits(quotedAmountOut[0].toString(), USDC.decimals)} ${USDC.symbol} for ${ethers.formatEther(amountIn)} ${WETH.symbol}`);
    const amountOut = ethers.formatUnits(quotedAmountOut[0], USDC.decimals)
    return amountOut;
}

async function prepareSwapParams(poolContract:ethers.Contract, signer:ethers.Wallet, amountIn:BigInt, amountOut:BigInt) {
    return {
        tokenIn: WETH.address,
        tokenOut: USDC.address,
        fee: await poolContract.fee(),
        recipient: signer.address,
        amountIn: amountIn,
        amountOutMinimum: amountOut,
        sqrtPriceLimitX96: 0,
    };
}

async function executeSwap(swapRouter:ethers.Contract, params:any, signer:ethers.Wallet) {
    const transaction = await swapRouter.exactInputSingle.populateTransaction(params);
    const receipt = await signer.sendTransaction(transaction);
    console.log(`-------------------------------`)
    console.log(`Receipt: https://sepolia.etherscan.io/tx/${receipt.hash}`);
    console.log(`-------------------------------`)
}


async function main(swapAmount:number) {
    const inputAmount = swapAmount
    const amountIn = ethers.parseUnits(inputAmount.toString(), 18);

    try {
        await approveToken(WETH.address, ERC20_ABI, amountIn, signer)
        const { poolContract, token0, token1, fee } = await getPoolInfo(factoryContract, WETH, USDC);
        console.log(`-------------------------------`)
        console.log(`Fetching Quote for: ${WETH.symbol} to ${USDC.symbol}`);
        console.log(`-------------------------------`)
        console.log(`Swap Amount: ${ethers.formatEther(amountIn)}`);

        const quotedAmountOut = await quoteAndLogSwap(quoterContract, WETH,USDC,fee, signer, inputAmount);

        // const params = await prepareSwapParams(poolContract, signer, amountIn, quotedAmountOut[0].toString());
        // const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, UNISWAPV3_ROUTER2_ADDRESS, signer);
        // await executeSwap(swapRouter, params, signer);
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main(0.02) // Change amount as needed