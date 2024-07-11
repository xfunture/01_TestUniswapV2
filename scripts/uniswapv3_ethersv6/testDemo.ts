import { ethers } from 'ethers'
// import FACTORY_ABI from './abis/factory.json' assert { type: 'json' };
// import QUOTER_ABI from './abis/quoter.json' assert { type: 'json' };



// import SWAP_ROUTER_ABI from './abis/swaprouter.json' assert { type: 'json' };
// import POOL_ABI from './abis/pool.json' assert { type: 'json' };
// import TOKEN_IN_ABI from './abis/weth.json' assert { type: 'json' };


import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import Quoter2 from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json';
import { CurrentConfig } from './config';
import { ERC20_ABI, QUOTER2_CONTRACT_ADDRESS, UNISWAPV3_ROUTER2_ADDRESS, UNISWAPV3_ROUTER_ADDRESS, } from './lib/constant';
import 'dotenv/config'
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { Token } from '@uniswap/sdk-core';
import { computePoolAddress, SwapQuoter } from '@uniswap/v3-sdk';
import { fromReadableAmount } from './lib/conversion';
import * as fs from 'fs';
import { createDeadLine } from './lib/utils';

import QUOTER_ABI from './abis/quoter.json';
import SWAP_ROUTER_ABI from './abis/swaprouter.json' ;
import POOL_ABI from './abis/pool.json' ;
import TOKEN_IN_ABI from './abis/weth.json';
import { sign } from 'web3/lib/commonjs/eth.exports';



// Deployment Addresses
// const POOL_FACTORY_CONTRACT_ADDRESS = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'
// const QUOTER_CONTRACT_ADDRESS = '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
// const SWAP_ROUTER_CONTRACT_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
// const SWAP_ROUTER2_CONTRACT_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

// const QUOTER_CONTRACT_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
// const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

/*******************************************************************sepolia 测试链********************************************************************* */
// const chainid = 11155111;
//  const WETH_TOKEN = new Token(
//     chainid,
//     '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
//     18,
//     'WETH',
//     'Wrapped Ether'
// );

//  const USDC_TOKEN = new Token(
//     chainid,
//     '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
//     6,
//     'USDC',
//     'USD//C'
// );


// /*****sepolia 线上环境******** */
// // const rpcUrl = 'https://eth-sepolia.g.alchemy.com/v2/f9yqqeMqy1RDCFh-H_WQKAatBjhq1Oa_'
// /*****sepolia 线上环境******** */

// /*****sepolia 本地环境******** */
// const rpcUrl = "http://localhost:8545";
// const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
// // const privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
// /*****sepolia 本地环境******** */


// const UNISWAPV3_ROUTER2_ABI = fs.readFileSync("./contracts/abis/UniswapV3Router2Abi.json").toString();

// const POOL_FACTORY_CONTRACT_ADDRESS = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'
// const QUOTER_CONTRACT_ADDRESS = '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
// const SWAP_ROUTER_CONTRACT_ADDRESS = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'


/*******************************************************************sepolia 测试链********************************************************************* */


/*******************************************************************mainnet 测试链********************************************************************* */

const chainid = 31337;
 const WETH_TOKEN = new Token(
    chainid,
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    18,
    'WETH',
    'Wrapped Ether'
);

 const USDC_TOKEN = new Token(
    chainid,
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    6,
    'USDC',
    'USD//C'
);



const rpcUrl = 'http://localhost:8545'
const privateKey = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
// const privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

const UNISWAPV3_ROUTER2_ABI = fs.readFileSync("./contracts/abis/UniswapV3Router2Abi.json").toString();

const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const QUOTER_CONTRACT_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
const SWAP_ROUTER_CONTRACT_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'


/*******************************************************************mainnet 测试链********************************************************************** */



// Provider, Contract & Signer Instances
const provider = new ethers.JsonRpcProvider(rpcUrl)
const factoryContract = new ethers.Contract(POOL_FACTORY_CONTRACT_ADDRESS, IUniswapV3PoolABI.abi, provider);
const quoterContract = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, QUOTER_ABI, provider)
const signer = new ethers.Wallet(privateKey, provider)
const swapRouterContract = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, UNISWAPV3_ROUTER2_ABI, signer);
const WETH:Token = WETH_TOKEN;
const USDC:Token = USDC_TOKEN;





async function approveToken(tokenAddress:string, tokenABI:any,routerAddress:string, amount:BigInt, wallet:ethers.Wallet) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);

        const approveTransaction = await tokenContract.approve.populateTransaction(
            routerAddress,
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



async function quoteAndLogSwap(quoterContract:ethers.Contract,
                               tokenIn:Token,
                               tokenOut:Token, 
                               fee:number, 
                               signer:ethers.Wallet, 
                               amountIn:number) {
    const params = {
        tokenIn:tokenIn.address,                                                // tokenIn
        tokenOut:tokenOut.address,                                               // tokenOut
        fee:fee,                                                            // fee
        // recipient: signer.address,
        // deadline:createDeadLine(),
        amountIn:
        fromReadableAmount(                                             // amountIn
            amountIn,  
            tokenIn.decimals
        ),
        sqrtPriceLimitX96:0         
    };
    console.log("quoteAndLogSwap params:",params)
    const quotedAmountOut = await quoterContract.quoteExactInputSingle.staticCall(params);
    // console.log(`-------------------------------`)
    console.log("quotedAmountOut:",quotedAmountOut);
    console.log(`Token Swap will result in: ${ethers.formatUnits(quotedAmountOut[0].toString(), USDC.decimals)} ${USDC.symbol} for ${amountIn} ${WETH.symbol}`);
    const amountOut = ethers.formatUnits(quotedAmountOut[0], USDC.decimals)
    console.log("amountOUt:",amountOut);
    return amountOut;
}

async function prepareSwapParams(poolContract:ethers.Contract, 
                                 signer:ethers.Wallet,
                                 amountIn:BigInt, amountOut:string) {
    return {
        tokenIn: WETH.address,
        tokenOut: USDC.address,
        fee: await poolContract.fee(),
        recipient: signer.address,
        deadline:createDeadLine(),
        amountIn: amountIn,
        amountOutMinimum: amountOut,
        sqrtPriceLimitX96: 0,
    };
}

async function executeSwap(swapRouter:ethers.Contract, params:any, signer:ethers.Wallet) {
    const transaction = await swapRouter.exactInputSingle.populateTransaction(params);
    const receipt = await signer.sendTransaction(transaction);
    console.log(`-------------------------------`)
    console.log("transaction:",transaction);
    console.log(`Receipt: https://sepolia.etherscan.io/tx/${receipt.hash}`);
    console.log(`-------------------------------`)
    return receipt
}


async function main(swapAmount:number) {
    const inputAmount = swapAmount
    const amountIn = ethers.parseUnits(inputAmount.toString(), 18);


    const balance = await provider.getBalance(signer.address);
    console.log("ETH balance:",ethers.formatUnits(balance,18));

    //-------------------------------查询WETH 信息-------------------------------------------------
    const tokenContract = new ethers.Contract(WETH.address, TOKEN_IN_ABI, signer);
    let wethBalance = await tokenContract.balanceOf(signer.address);
    const symbol = await tokenContract.symbol();
    const allowance = await tokenContract.allowance(signer.address,SWAP_ROUTER_CONTRACT_ADDRESS);

    console.log("symbol:",symbol);
    console.log("WETH balance:",ethers.formatUnits(wethBalance,18));
    console.log(`address ${signer.address} approve spender ${SWAP_ROUTER_CONTRACT_ADDRESS} allowance:${ethers.formatUnits(allowance,18).toString()}`);

    //-----------------------------ETH wrap to WETH------------------------------------------------
    const transaction = await tokenContract.deposit(
        {
            value:ethers.parseEther("1")
        }
    )
    const reciept = await transaction.wait();

    console.log("deposit transaction:",transaction);
    console.log("deposit reciept:",reciept);


    try {
        await approveToken(WETH.address,ERC20_ABI,SWAP_ROUTER_CONTRACT_ADDRESS, amountIn, signer)

        wethBalance = await tokenContract.balanceOf(signer.address);
        console.log("after approve:")
        console.log("symbol:",symbol);
        console.log("WETH balance:",ethers.formatUnits(wethBalance,18).toString());
        console.log(`address ${signer.address} approve spender ${SWAP_ROUTER_CONTRACT_ADDRESS} allowance:${ethers.formatUnits(allowance,18).toString()}`);

        const { poolContract, token0, token1, fee } = await getPoolInfo(factoryContract, WETH, USDC);
        console.log(`-------------------------------`)
        console.log(`Fetching Quote for: ${WETH.symbol} to ${USDC.symbol}`);
        console.log(`-------------------------------`)
        console.log(`Swap Amount: ${ethers.formatEther(amountIn)}`);

        const quotedAmountOut:string = await quoteAndLogSwap(quoterContract, WETH,USDC,fee, signer, inputAmount);
        console.log("quotedAmountOut:",quotedAmountOut);
        console.log("quotedAmountOut to string:",quotedAmountOut.toString());
        console.log("quotedAmountOut to string:",quotedAmountOut[0].toString());
        // const params = await prepareSwapParams(poolContract, signer, amountIn, quotedAmountOut[0].toString());
        const params = await prepareSwapParams(poolContract, signer, amountIn, '69');

        console.log("prepareSwapParams params:",params);
        await executeSwap(swapRouterContract, params, signer);

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main(0.5) // Change amount as needed