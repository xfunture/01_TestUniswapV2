import { CurrentConfig } from './config';
import { quote1ExactInputSingle,getPoolConstants, quote1ExactInput, quote2ExactInputSingle, quote2ExactInput, quote1ExactOutputSingle, quote2ExactOutputSingle, quote1ExactOutput, quote2ExactOutput } from './lib/quote';
import { toReadableAmount } from './lib/conversion';
import { getPoolInfo } from './lib/pool';
import { createTrade, getOutTokenTransferApproval, getTokenTransferApproval } from './lib/trading';
import { getOutputQuote,TokenTrade} from './lib/trading';
import { Trade,SwapRouter,SwapQuoter,Pool,Route,SwapOptions, FeeAmount } from '@uniswap/v3-sdk';
import { Currency,CurrencyAmount,Percent,Token,TradeType } from '@uniswap/sdk-core';
import { createDeadLine, fromReadableAmount } from './lib/utils';
import { getProvider, getWalletAddress, sendTransaction ,wallet} from './lib/providers';
import * as fs from 'fs';
import { ERC20_ABI, QUOTER_CONTRACT_ADDRESS, UNI_TOKEN, UNISWAPV3_ROUTER2_ADDRESS, UNISWAPV3_ROUTER_ADDRESS, USDC_TOKEN, WETH_TOKEN } from './lib/constant';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import Quoter2 from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json';
import { assertArgumentCount, ethers } from 'ethers';


import {eth, Web3} from 'web3';
import { sign } from 'web3/lib/commonjs/eth.exports';
import { Web3Account } from 'web3-eth-accounts';
import WETH_ABI from './abis/weth.json';


const web3 = new Web3(CurrentConfig.rpc.local);


const DAI_CONTRACT_ABI = fs.readFileSync("./contracts/abis/DAIAbi.json").toString();
const WETH_CONTRACT_ABI  = fs.readFileSync("./contracts/abis/WETHAbi.json").toString();
const UNI_CONTRACT_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const UNI_CONTRACT_ABI = fs.readFileSync("./contracts/abis/UniAbi.json").toString();

const USDC_CONTRACT_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_CONTRACT_ABI = fs.readFileSync("./contracts/abis/USDCAbi.json").toString();
const minTokenAbi = [{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}]
const USDC_CONTRACT = new ethers.Contract(USDC_CONTRACT_ADDRESS,minTokenAbi,wallet);

const UNISWAPV3_ROUTER_ABI = fs.readFileSync("./contracts/abis/UniswapV3RouterAbi.json").toString();
const UNISWAPV3_ROUTER2_ABI = fs.readFileSync("./contracts/abis/UniswapV3Router2Abi.json").toString();
const UNISWAPV3_ROUTER_CONTRACT = new ethers.Contract(UNISWAPV3_ROUTER_ADDRESS,UNISWAPV3_ROUTER_ABI,wallet);
const UNISWAPV3_ROUTER2_CONTRACT = new ethers.Contract(UNISWAPV3_ROUTER2_ADDRESS,UNISWAPV3_ROUTER2_ABI,wallet);



async function getERC20Balance(myAddress:string,CONTRACT_ADDRESS:string):Promise<number>{


    const contract = new ethers.Contract(CONTRACT_ADDRESS,minTokenAbi,getProvider());

    const balance = await contract.balanceOf(myAddress)

    return balance;
}

/**
 * 
 * @param receipt 计算交易消耗的gas
 * @returns 
 */
function calculateFee(receipt:ethers.TransactionReceipt):BigInt{
    let gasUsed = receipt.cumulativeGasUsed;
    let gasPrice = receipt.gasPrice;
    return gasUsed * gasPrice;
}




/**
 * 通过web3.js 发送交易
 * @param walle
 * t_address 
 * @param from 
 * @param to 
 * @param encodeData 
 * @returns 
 */
async function sendTransaction(wallet_address:string,from:string,to:string,encodeData:string){

    let nonce = await web3.eth.getTransactionCount(CurrentConfig.wallet.address);
    let gasPrice = await web3.eth.getGasPrice();
    let gas = 320000;

    const approveTx = {
        nonce:nonce,
        gasPrice:gasPrice,
        from:from,
        to:to,
        value:BigInt(0),
        gas:gas,
        data:encodeData,
    }

    let signedTransaction = await web3.eth.accounts.signTransaction(approveTx,wallet.privateKey)
    console.log("signedTransaction:",signedTransaction);
    let sendTransaction = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
    console.log("sendTransaction:",sendTransaction);

    return sendTransaction;
}

/**
 * 通过web3.js 测试UniswapV3 exactInputSingle
 * 测试失败
 * 原因：Error: Transaction reverted without a reason string
 */
async function testWeb3(){

    console.log("TestWeb3");




    const account = web3.eth.accounts.privateKeyToAccount(CurrentConfig.wallet.privateKey)


    const tokenIn:Token = WETH_TOKEN;
    const tokenOut:Token = UNI_TOKEN;
    const inputAmount = 0.02;
    const amountIn = web3.utils.toWei(inputAmount,'ether');
    const poolFee = 3000;

     // 获取Pool合约相关变量
     const poolConstants = await getPoolConstants(tokenIn,tokenOut,poolFee);
     const sqrtPriceLimitX96 = 0;
     
     console.log("poolConstants.token1:",poolConstants.token1);
     console.log("poolConstants.token0:",poolConstants.token0);

    const uniswapv3Router = new web3.eth.Contract(JSON.parse(UNISWAPV3_ROUTER_ABI),UNISWAPV3_ROUTER_ADDRESS);
    const erc20Contract = new web3.eth.Contract(JSON.parse(WETH_CONTRACT_ABI),tokenIn.address);
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

    
    const approveEncodeData = erc20Contract.methods.approve(wallet.address,amountIn).encodeABI();
    console.log("approveEncodeData:",approveEncodeData);

    sendTransaction(wallet.address,wallet.address,tokenIn.address,approveEncodeData);




    /**********************build transaction from exactInputSingle */


    const params = {
        tokenIn:tokenIn.address,
        tokenOut:tokenOut.address,
        fee:BigInt(poolFee),
        recipient:account.address,
        deadline:createDeadLine(),
        amountIn:BigInt(amountIn),
        amountOutMinimum:BigInt(0),
        sqrtPriceLimitX96:BigInt(0)

    }
    const exactInputSingleEncodeData = uniswapv3Router.methods.exactInputSingle(params).encodeABI();
    console.log("exactInputSingleEncodeData:",exactInputSingleEncodeData);


    const block = await web3.eth.getBlock('latest');
    console.log("block:",block);
    const gasLimit = BigInt(100000);
    let nonce = await web3.eth.getTransactionCount(account.address);
    let gasPrice = await web3.eth.getGasPrice();
    let gas = 320000;
    nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:",nonce);

    
    const tx = {
        nonce:nonce,
        gasPrice:gasPrice,
        from:account.address,
        to:UNISWAPV3_ROUTER_ADDRESS,
        value:amountIn,
        gas:gas,
        data:exactInputSingleEncodeData,
    }

    const signedTx = await web3.eth.accounts.signTransaction(tx,CurrentConfig.wallet.privateKey);
    const sendTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    console.log("sendTx:",sendTx);


}



async function testQuote(){

    const tokenIn:Token = WETH_TOKEN;
    const tokenMiddle:Token = UNI_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    // const tokenMiddle:Token = APE_TOKEN;
    // const tokenMiddle:Token = DAI_TOKEN;
    // const tokenOut:Token = APE_TOKEN;
    const amountIn:number = 0.02;
    const amountOut:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;


    console.log("Target symbol: ",tokenOut.symbol);
    console.log(`Input  symbol: ${tokenIn.symbol}`);
    console.log(`Input  amount: ${amountIn}`);

    let amountOut1 = await quote1ExactInputSingle(tokenIn,tokenOut,amountIn,poolFee);

    let amountOut2 = await quote2ExactInputSingle(tokenIn,tokenOut,amountIn,poolFee);

    let amountOut3 = await quote1ExactInput(tokenIn,tokenMiddle,tokenOut,amountIn,poolFee);

    let amountOut4 = await quote2ExactInput(tokenIn,tokenMiddle,tokenOut,amountIn,poolFee);

    let amountIn1 = await quote1ExactOutputSingle(tokenIn,tokenOut,amountOut,poolFee);

    let amountIn2 = await quote2ExactOutputSingle(tokenIn,tokenOut,amountOut,poolFee);

    let amountIn3 = await quote1ExactOutput(tokenIn,tokenMiddle,tokenOut,amountOut,poolFee);
    
    let amountIn4 = await quote2ExactOutput(tokenIn,tokenMiddle,tokenOut,amountOut,poolFee);
    
}


async function getPoolImmutables(poolContract:ethers.Contract){
    const [token0,token1,fee ] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee()
    ])
    return {token0:token0,token1:token1,fee:fee}
}

async function getPoolState(poolContract:ethers.Contract){
    const slot = await poolContract.slot0();
    const state = {
        sqrtPriceX96:slot[0]
    }
    return state;
}



async function prepareSwapParams(tokenIn:Token,tokenOut:Token,poolFee:number, amountIn:BigInt, amountOut:BigInt) {
    return {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee: poolFee,
        recipient: wallet.address,
        amountIn: amountIn,
        amountOutMinimum: amountOut,
        sqrtPriceLimitX96: 0,
    };
}

/**
 * 测试UniswapV3 中的exactInputSingle 进行代币交换，但是一直报错
 * UniswapV3 router 和 UniswapV3 router2 两个Router 地址进行调用exactInputSingle
 * UniswapV3 router 报的错是
 * Error: Transaction reverted without a reason string
 * UniswapV3 router2 报的错是：
 * reverted with reason string "STF"
 */

async function testMultiHopSwapV2(){

    const provider = getProvider();
    const tokenIn:Token = WETH_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const inputAmount = 0.02;
    const outputAmount:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;
    const sqrtPriceLimitX96 = 0;

    const ethBalance = await provider.getBalance(wallet.address);
    console.log("ethBalance:",ethers.formatEther(ethBalance.toString()));


    



    const poolConstants = await getPoolConstants(tokenIn,tokenOut,3000);

    const poolContract = new ethers.Contract(
        poolConstants.poolAddress,
        IUniswapV3PoolABI.abi,
        getProvider()
    )

    const immutables = await getPoolImmutables(poolContract);
    const state = getPoolState(poolContract);

    console.log("immutables:",immutables);
    console.log("wallet address:",wallet.address);



    const router_address = UNISWAPV3_ROUTER2_ADDRESS;
    const router_abi = UNISWAPV3_ROUTER_ABI;
    const swapRouterContract = new ethers.Contract(router_address,router_abi,provider);

    const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);

    const approvalAmount = amountIn;



    //----------------------ETH wrap to WETH(deposit)-----------------------------
    const tokenContract = new ethers.Contract(immutables.token1,WETH_ABI,wallet);
    let wethBalance = await tokenContract.balanceOf(wallet.address);
    console.log("before deposit wethBalance:",ethers.formatEther(wethBalance.toString()));

    const depositTransaction = await tokenContract.deposit(
        {
            value:ethers.parseEther("1")
        }
    )
    const reciept = await depositTransaction.wait();
    wethBalance = await tokenContract.balanceOf(wallet.address);
    console.log("after deposit wethBalance:",ethers.formatEther(wethBalance.toString()));
    // console.log("deposit transaction:",depositTransaction);
    // console.log("deposit reciept:",reciept);
        
    //------------------------quote2ExactInputSingle---------------------------------
    const output = await quote2ExactInputSingle(tokenIn,tokenOut,inputAmount,poolFee);
    console.log("output:",output);
    console.log("output amountOut:",output.amountOut);

    // console.log("nonce:",nonce);


   //-------------------------approve------------------------------------------------
    const approvalReceipt = await getTokenTransferApproval(tokenContract,router_address,tokenIn,inputAmount);
    const allowance = await tokenContract.allowance(wallet.address,router_address);
    const approvalFee = calculateFee(approvalReceipt)
    console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} approve fee:${ethers.formatUnits(approvalFee.toString(),tokenIn.decimals)}`);
    console.log("allowance:",allowance);
    console.log(`address ${wallet.address} approve spender ${UNISWAPV3_ROUTER2_ADDRESS} allowance:${ethers.formatUnits(allowance,18).toString()}`);




    //-----------------------------execute trade------------------------------------
    const router1Params = {
        tokenIn:tokenIn.address,
        tokenOut:tokenOut.address,
        fee:immutables.fee,
        recipient:wallet.address,
        deadline:createDeadLine(),
        amountIn:amountIn.toString(),
        amountOutMinimum:0,
        sqrtPriceLimitX96:0
    }


    const router2Params = {
        tokenIn:tokenIn.address,
        tokenOut:tokenOut.address,
        fee:immutables.fee,
        recipient:wallet.address,
        deadline:createDeadLine(),
        amountIn:amountIn.toString(),
        amountOutMinimum:0,
        sqrtPriceLimitX96:0,
    }
    console.log("router2Params:",router2Params);
    const nonce = await wallet.getNonce();
    console.log("nonce:",nonce);



    // swapRouterContract.functions.execute()
    const transaction = await swapRouterContract.exactInputSingle.populateTransaction(
        router2Params,
        {
        //     gasLimit:100000n,
        //     value:amountIn,
        //     // gasPrice: ethers.utils.parseUnits('10', 'gwei'),
        //     maxFeePerGas:ethers.parseUnits("20","gwei"),
        //     maxPriorityFeePerGas:ethers.parseUnits("2","gwei")
            nonce:nonce
        //     // type:TradeType.EXACT_INPUT
        }
    )

    const sendTx = await wallet.sendTransaction(transaction);

    const receipt = await sendTx.wait();


    console.log("transaction:",transaction);
    console.log("sendTx:",sendTx);
    console.log("receipt:",receipt);

    wethBalance = await tokenContract.balanceOf(wallet.address);
    console.log("after swap wethBalance:",ethers.formatEther(wethBalance.toString()));
    

}



async function main(){

    // await testWeb3();

    // testQuote();

    testMultiHopSwapV2();


}



main();

