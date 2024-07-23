import { CurrentConfig } from './config';
import { quote1ExactInputSingle,getPoolConstants, quote1ExactInput, quote2ExactInputSingle, quote2ExactInput, quote1ExactOutputSingle, quote2ExactOutputSingle, quote1ExactOutput, quote2ExactOutput } from './lib/quote';
import { toReadableAmount } from './lib/conversion';
import { getPoolInfo } from './lib/pool';
import { createTrade, getInTokenTransferApproval, getOutTokenTransferApproval, getTokenTransferApproval } from './lib/trading';
import { getOutputQuote,TokenTrade} from './lib/trading';
import { Trade,SwapRouter,SwapQuoter,Pool,Route,SwapOptions, FeeAmount } from '@uniswap/v3-sdk';
import { Currency,CurrencyAmount,Percent,Token,TradeType } from '@uniswap/sdk-core';
import { createDeadLine, fromReadableAmount, priceFromSqrtPriceX96, priceFromTick } from './lib/utils';
import { getNonceFromBlock, getNonceLocal, getProvider, getWalletAddress, sendTransaction ,wallet} from './lib/providers';
import * as fs from 'fs';
import { DAI_TOKEN, ERC20_ABI, QUOTER_CONTRACT_ADDRESS, UNI_TOKEN, UNISWAPV3_ROUTER2_ADDRESS, UNISWAPV3_ROUTER_ADDRESS, USDC_TOKEN, WETH_TOKEN } from './lib/constant';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import Quoter2 from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json';
import { assertArgumentCount, ethers } from 'ethers';


// import {eth, Web3} from 'web3';
// import { sign } from 'web3/lib/commonjs/eth.exports';
// import { Web3Account } from 'web3-eth-accounts';
import WETH_ABI from './abis/weth.json';
import { declare } from '../../typechain-types/contracts/interfaces/IApproveAndCall';


// const web3 = new Web3(CurrentConfig.rpc.local);


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

const provider = getProvider();
const router_address = UNISWAPV3_ROUTER2_ADDRESS;
const router_abi = UNISWAPV3_ROUTER_ABI;
const swapRouterContract = new ethers.Contract(router_address,router_abi,provider);


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
 * 将ETH 兑换为WETH
 */
async function ethToWETH(){
    //----------------------ETH wrap to WETH(deposit)-----------------------------
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`${wallet.address} eth balance:${ethers.formatEther(ethBalance.toString())}`);

    const tokenIn:Token = WETH_TOKEN;
    const wethContract = new ethers.Contract(tokenIn.address,WETH_ABI,wallet);
    let wethBalance = await wethContract.balanceOf(wallet.address);
    console.log(`before deposit ${wallet.address} wethBalance: ${ethers.formatEther(wethBalance.toString())}`);

    const depositTransaction = await wethContract.deposit(
        {
            value:ethers.parseEther("0.3")
        }
    )
    const reciept = await depositTransaction.wait();
    wethBalance = await wethContract.balanceOf(wallet.address);
    console.log(`after deposit ${wallet.address} wethBalance: ${ethers.formatEther(wethBalance.toString())}`);
    
    // console.log("deposit transaction:",depositTransaction);
    // console.log("deposit reciept:",reciept);
        
}



// /**
//  * 通过web3.js 发送交易
//  * @param walle
//  * t_address 
//  * @param from 
//  * @param to 
//  * @param encodeData 
//  * @returns 
//  */
// async function sendTransactionWeb3(wallet_address:string,from:string,to:string,encodeData:string){

//     let nonce = await web3.eth.getTransactionCount(CurrentConfig.wallet.address);
//     let gasPrice = await web3.eth.getGasPrice();
//     let gas = 320000;

//     const approveTx = {
//         nonce:nonce,
//         gasPrice:gasPrice,
//         from:from,
//         to:to,
//         value:BigInt(0),
//         gas:gas,
//         data:encodeData,
//     }

//     let signedTransaction = await web3.eth.accounts.signTransaction(approveTx,wallet.privateKey)
//     console.log("signedTransaction:",signedTransaction);
//     let sendTransaction = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
//     console.log("sendTransaction:",sendTransaction);

//     return sendTransaction;
// }

// /**
//  * 通过web3.js 测试UniswapV3 exactInputSingle
//  * 测试失败
//  * 原因：Error: Transaction reverted without a reason string
//  */
// async function testWeb3(){

//     console.log("TestWeb3");




//     const account = web3.eth.accounts.privateKeyToAccount(CurrentConfig.wallet.privateKey)


//     const tokenIn:Token = WETH_TOKEN;
//     const tokenOut:Token = UNI_TOKEN;
//     const inputAmount = 0.02;
//     const amountIn = web3.utils.toWei(inputAmount,'ether');
//     const poolFee = 3000;

//      // 获取Pool合约相关变量
//      const poolConstants = await getPoolConstants(tokenIn,tokenOut,poolFee);
//      const sqrtPriceLimitX96 = 0;
     
//      console.log("poolConstants.token1:",poolConstants.token1);
//      console.log("poolConstants.token0:",poolConstants.token0);

//     const uniswapv3Router = new web3.eth.Contract(JSON.parse(UNISWAPV3_ROUTER_ABI),UNISWAPV3_ROUTER_ADDRESS);
//     const erc20Contract = new web3.eth.Contract(JSON.parse(WETH_CONTRACT_ABI),tokenIn.address);
//     // Router1 
//     //  struct ExactInputSingleParams {
//     //     address tokenIn;
//     //     address tokenOut;
//     //     uint24 fee;
//     //     address recipient;
//     //     uint256 deadline;
//     //     uint256 amountIn;
//     //     uint256 amountOutMinimum;
//     //     uint160 sqrtPriceLimitX96;
//     // }

    
//     const approveEncodeData = erc20Contract.methods.approve(wallet.address,amountIn).encodeABI();
//     console.log("approveEncodeData:",approveEncodeData);

//     sendTransactionWeb3(wallet.address,wallet.address,tokenIn.address,approveEncodeData);




//     /**********************build transaction from exactInputSingle */


//     const params = {
//         tokenIn:tokenIn.address,
//         tokenOut:tokenOut.address,
//         fee:BigInt(poolFee),
//         recipient:account.address,
//         deadline:createDeadLine(),
//         amountIn:BigInt(amountIn),
//         amountOutMinimum:BigInt(0),
//         sqrtPriceLimitX96:BigInt(0)

//     }
//     const exactInputSingleEncodeData = uniswapv3Router.methods.exactInputSingle(params).encodeABI();
//     console.log("exactInputSingleEncodeData:",exactInputSingleEncodeData);


//     const block = await web3.eth.getBlock('latest');
//     console.log("block:",block);
//     const gasLimit = BigInt(100000);
//     let nonce = await web3.eth.getTransactionCount(account.address);
//     let gasPrice = await web3.eth.getGasPrice();
//     let gas = 320000;
//     nonce = await web3.eth.getTransactionCount(account.address);
//     console.log("nonce:",nonce);

    
//     const tx = {
//         nonce:nonce,
//         gasPrice:gasPrice,
//         from:account.address,
//         to:UNISWAPV3_ROUTER_ADDRESS,
//         value:amountIn,
//         gas:gas,
//         data:exactInputSingleEncodeData,
//     }

//     const signedTx = await web3.eth.accounts.signTransaction(tx,CurrentConfig.wallet.privateKey);
//     const sendTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

//     console.log("sendTx:",sendTx);


// }



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
        poolContract.fee(),
    ])
    return {token0:token0,token1:token1,fee:fee}
}

async function getPoolState(poolContract:ethers.Contract){
    const slot = await poolContract.slot0();
    const state = {
        sqrtPriceX96:slot[0],
        tick:slot[1],

    }
    return state;
}


/**
 * 输入指定数量的输入代币进行交换输出代币
 * @param tokenIn        :输入代币
 * @param tokenOut       :输出代币
 * @param inputAmount    :输入代币数量
 * @param router_address :Router 的地址
 * @param poolFee        手续费
 */
async function exactInputSingle(tokenIn:Token,tokenOut:Token,inputAmount:number,router_address:string,poolFee:number){
    const tokenContract = new ethers.Contract(tokenIn.address,WETH_ABI,wallet);
    let tokenInBalance = await tokenContract.balanceOf(wallet.address);
    const tokenOutBalance1 = await getERC20Balance(wallet.address,tokenOut.address);
    const amountIn:BigInt = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
    console.log(`tokenIn:${tokenIn.symbol} balance: ${ethers.formatUnits(tokenInBalance.toString(),tokenIn.decimals)} amountIn:${inputAmount}`);
    if(tokenInBalance < amountIn){
        throw("balance not enough to trade")
    }

    //-------------------------approve------------------------------------------------
    const approvalReceipt = await getTokenTransferApproval(tokenContract,router_address,tokenIn,inputAmount);
    const allowance = await tokenContract.allowance(wallet.address,router_address);
    const approvalFee = calculateFee(approvalReceipt)
    console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} approve fee:${ethers.formatUnits(approvalFee.toString(),18)}`);
    console.log(`address ${wallet.address} approve spender ${UNISWAPV3_ROUTER2_ADDRESS} allowance:${ethers.formatUnits(allowance,tokenIn.decimals).toString()}`);

     //------------------------quote2ExactInputSingle---------------------------------
    const quoteOutput = await quote2ExactInputSingle(tokenIn,tokenOut,inputAmount,poolFee);

    

    //-----------------------------build transaction------------------------------------
    const router2Params = {
        tokenIn:tokenIn.address,
        tokenOut:tokenOut.address,
        fee:poolFee,
        recipient:wallet.address,
        amountIn:amountIn,
        amountOutMinimum:quoteOutput.amountOut,
        sqrtPriceLimitX96:0,
    }
    console.log("router2Params:",router2Params);
    const transaction:ethers.ContractTransaction = await swapRouterContract.exactInputSingle.populateTransaction(
        router2Params
    )

    //-----------------------------send transaction--------------------------------------
    const receipt = await sendTransaction(transaction)

    console.log("receipt:",receipt);
    if(receipt != null){
        let sendFee = calculateFee(receipt);
        console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} transaction fee:${ethers.formatUnits(sendFee.toString(),18)}`);

    }

    const tokenOutBalance2 = await getERC20Balance(wallet.address,tokenOut.address);
    const tokenOutAdd = tokenOutBalance2 - tokenOutBalance1;
    console.log("quote2 amountOut:",ethers.formatUnits(quoteOutput.amountOut,tokenOut.decimals));
    console.log("tokenOut add balance:",ethers.formatUnits(tokenOutAdd,tokenOut.decimals));
    console.log("tokenOut balance:",ethers.formatUnits(tokenOutBalance2,tokenOut.decimals));

}



/**
 * 通过输入代币交换指定数量的输出代币
 * @param tokenIn        :输入代币
 * @param tokenOut       :输出代币
 * @param inputAmount    :输入代币数量
 * @param router_address :Router 的地址
 * @param poolFee        手续费
 */
async function exactOutputSingle(tokenIn:Token,tokenOut:Token,outputAmount:number,router_address:string,poolFee:number){
    const tokenContract = new ethers.Contract(tokenIn.address,WETH_ABI,wallet);
    let tokenInBalance = await tokenContract.balanceOf(wallet.address);
    const tokenOutBalance1 = await getERC20Balance(wallet.address,tokenOut.address);
    const amountOut:BigInt = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);
    console.log(`tokenIn:${tokenIn.symbol} balance: ${ethers.formatUnits(tokenInBalance.toString(),tokenIn.decimals)} amountOut:${outputAmount}`);


    
     //------------------------quote2ExactOutputSingle---------------------------------
    const quoteInput = await quote2ExactOutputSingle(tokenIn,tokenOut,outputAmount,poolFee);

    if(tokenInBalance < quoteInput.amountIn){
        throw("balance not enough to trade")
    }

    //-------------------------approve------------------------------------------------
    const approvalReceipt = await getInTokenTransferApproval(tokenContract,router_address,tokenIn,quoteInput.amountIn);
    const allowance = await tokenContract.allowance(wallet.address,router_address);
    const approvalFee = calculateFee(approvalReceipt)
    console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} approve amount:${ethers.formatUnits(quoteInput.amountIn,tokenIn.decimals)} approve fee:${ethers.formatUnits(approvalFee.toString(),18)}`);
    console.log(`address ${wallet.address} approve spender ${UNISWAPV3_ROUTER2_ADDRESS} allowance:${ethers.formatUnits(allowance,tokenIn.decimals).toString()}`);


    //-----------------------------build transaction------------------------------------
    const router2Params = {
        tokenIn:tokenIn.address,
        tokenOut:tokenOut.address,
        fee:poolFee,
        recipient:wallet.address,
        amountOut:amountOut,
        amountInMaximum:quoteInput.amountIn,
        sqrtPriceLimitX96:0,
    }
    console.log("router2Params:",router2Params);
    const transaction:ethers.ContractTransaction = await swapRouterContract.exactOutputSingle.populateTransaction(
        router2Params
    )

    //-----------------------------send transaction--------------------------------------
    const receipt = await sendTransaction(transaction)

    console.log("receipt:",receipt);
    if(receipt != null){
        let sendFee = calculateFee(receipt);
        console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} transaction fee:${ethers.formatUnits(sendFee.toString(),18)}`);

    }

    const tokenOutBalance2 = await getERC20Balance(wallet.address,tokenOut.address);
    const tokenOutAdd = tokenOutBalance2 - tokenOutBalance1;
    console.log("quote2 amountIn:",ethers.formatUnits(quoteInput.amountIn,tokenIn.decimals));
    console.log("tokenOut add balance:",ethers.formatUnits(tokenOutAdd,tokenOut.decimals));
    console.log("tokenOut balance:",ethers.formatUnits(tokenOutBalance2,tokenOut.decimals));

}



/**
 * 通过输入代币交换指定数量的输出代币
 * @param tokenIn        :输入代币
 * @param tokenOut       :输出代币
 * @param inputAmount    :输入代币数量
 * @param router_address :Router 的地址
 * @param poolFee        手续费
 */
async function exactOutput(tokenIn:Token,tokenOut:Token,outputAmount:number,router_address:string,poolFee:number){
    const tokenContract = new ethers.Contract(tokenIn.address,WETH_ABI,wallet);
    let tokenInBalance = await tokenContract.balanceOf(wallet.address);
    const tokenOutBalance1 = await getERC20Balance(wallet.address,tokenOut.address);
    const amountOut:BigInt = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);
    console.log(`tokenIn:${tokenIn.symbol} balance: ${ethers.formatUnits(tokenInBalance.toString(),tokenIn.decimals)} amountOut:${outputAmount}`);


    
     //------------------------quote2ExactOutputSingle---------------------------------
    const quoteInput = await quote2ExactOutputSingle(tokenIn,tokenOut,outputAmount,poolFee);

    if(tokenInBalance < quoteInput.amountIn){
        throw("balance not enough to trade")
    }

    //-------------------------approve------------------------------------------------
    const approvalReceipt = await getInTokenTransferApproval(tokenContract,router_address,tokenIn,quoteInput.amountIn);
    const allowance = await tokenContract.allowance(wallet.address,router_address);
    const approvalFee = calculateFee(approvalReceipt)
    console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} approve amount:${ethers.formatUnits(quoteInput.amountIn,tokenIn.decimals)} approve fee:${ethers.formatUnits(approvalFee.toString(),18)}`);
    console.log(`address ${wallet.address} approve spender ${UNISWAPV3_ROUTER2_ADDRESS} allowance:${ethers.formatUnits(allowance,tokenIn.decimals).toString()}`);


    //-----------------------------build transaction------------------------------------
    const path = ethers.solidityPacked(
        ['address','uint24','address'],
        [tokenOut.address,poolFee,tokenIn.address]
    )
    const exactOutputParams = {
        path:path,
        recipient:wallet.address,
        amountOut:amountOut,
        amountInMaximum:quoteInput.amountIn,
    }
    console.log("router2Params:",exactOutputParams);
    const transaction:ethers.ContractTransaction = await swapRouterContract.exactOutput.populateTransaction(
        exactOutputParams
    )

    //-----------------------------send transaction--------------------------------------
    const receipt = await sendTransaction(transaction)

    console.log("receipt:",receipt);
    if(receipt != null){
        let sendFee = calculateFee(receipt);
        console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} transaction fee:${ethers.formatUnits(sendFee.toString(),18)}`);

    }

    const tokenOutBalance2 = await getERC20Balance(wallet.address,tokenOut.address);
    const tokenOutAdd = tokenOutBalance2 - tokenOutBalance1;
    console.log("quote2 amountIn:",ethers.formatUnits(quoteInput.amountIn,tokenIn.decimals));
    console.log("tokenOut add balance:",ethers.formatUnits(tokenOutAdd,tokenOut.decimals));
    console.log("tokenOut balance:",ethers.formatUnits(tokenOutBalance2,tokenOut.decimals));

}



/**
 * 通过输入代币交换指定数量的输出代币,支持多跳兑换，目前该函数支持的是三个代币的交换
 * @param tokenIn        :输入代币
 * @param tokenOut       :输出代币
 * @param inputAmount    :输入代币数量
 * @param router_address :Router 的地址
 * @param poolFee        手续费
 */
async function exactOutputMultihop(tokenIn:Token,tokenMiddle:Token,tokenOut:Token,outputAmount:number,router_address:string,poolFee:number){
    const tokenContract = new ethers.Contract(tokenIn.address,WETH_ABI,wallet);
    let tokenInBalance = await tokenContract.balanceOf(wallet.address);
    const tokenOutBalance1 = await getERC20Balance(wallet.address,tokenOut.address);
    const amountOut:BigInt = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);
    console.log(`tokenIn:${tokenIn.symbol} balance: ${ethers.formatUnits(tokenInBalance.toString(),tokenIn.decimals)} amountOut:${outputAmount}`);


    
     //------------------------quote2ExactOutputSingle---------------------------------
    const quoteInput = await quote2ExactOutput(tokenIn,tokenMiddle,tokenOut,outputAmount,poolFee);

    if(tokenInBalance < quoteInput.amountIn){
        throw("balance not enough to trade")
    }

    //-------------------------approve------------------------------------------------
    const approvalReceipt = await getInTokenTransferApproval(tokenContract,router_address,tokenIn,quoteInput.amountIn);
    const allowance = await tokenContract.allowance(wallet.address,router_address);
    const approvalFee = calculateFee(approvalReceipt)
    console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} approve amount:${ethers.formatUnits(quoteInput.amountIn,tokenIn.decimals)} approve fee:${ethers.formatUnits(approvalFee.toString(),18)}`);
    console.log(`address ${wallet.address} approve spender ${UNISWAPV3_ROUTER2_ADDRESS} allowance:${ethers.formatUnits(allowance,tokenIn.decimals).toString()}`);


    //-----------------------------build transaction------------------------------------
    const path = ethers.solidityPacked(
        ['address','uint24','address'],
        [tokenOut.address,poolFee,tokenIn.address]
    )
    const exactOutputParams = {
        path:path,
        recipient:wallet.address,
        amountOut:amountOut,
        amountInMaximum:quoteInput.amountIn,
    }
    console.log("router2Params:",exactOutputParams);
    const transaction:ethers.ContractTransaction = await swapRouterContract.exactOutput.populateTransaction(
        exactOutputParams
    )

    //-----------------------------send transaction--------------------------------------
    const receipt = await sendTransaction(transaction)

    console.log("receipt:",receipt);
    if(receipt != null){
        let sendFee = calculateFee(receipt);
        console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} transaction fee:${ethers.formatUnits(sendFee.toString(),18)}`);

    }

    const tokenOutBalance2 = await getERC20Balance(wallet.address,tokenOut.address);
    const tokenOutAdd = tokenOutBalance2 - tokenOutBalance1;
    console.log("quote2 amountIn:",ethers.formatUnits(quoteInput.amountIn,tokenIn.decimals));
    console.log("tokenOut add balance:",ethers.formatUnits(tokenOutAdd,tokenOut.decimals));
    console.log("tokenOut balance:",ethers.formatUnits(tokenOutBalance2,tokenOut.decimals));

}


/**
 * 输入指定数量的输入代币进行交换输出代币
 * @param tokenIn        :输入代币
 * @param tokenOut       :输出代币
 * @param inputAmount    :输入代币数量
 * @param router_address :Router 的地址
 * @param poolFee        手续费
 */
async function exactInput(tokenIn:Token,tokenOut:Token,inputAmount:number,router_address:string,poolFee:number){
    const tokenContract = new ethers.Contract(tokenIn.address,WETH_ABI,wallet);
    let tokenInBalance = await tokenContract.balanceOf(wallet.address);
    const tokenOutBalance1 = await getERC20Balance(wallet.address,tokenOut.address);
    const amountIn:BigInt = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
    console.log(`tokenIn:${tokenIn.symbol} balance: ${ethers.formatUnits(tokenInBalance.toString(),tokenIn.decimals)} amountIn:${inputAmount}`);
    if(tokenInBalance < amountIn){
        throw("balance not enough to trade")
    }

    //-------------------------approve------------------------------------------------
    const approvalReceipt = await getTokenTransferApproval(tokenContract,router_address,tokenIn,inputAmount);
    const allowance = await tokenContract.allowance(wallet.address,router_address);
    const approvalFee = calculateFee(approvalReceipt)
    console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} approve fee:${ethers.formatUnits(approvalFee.toString(),18)}`);
    console.log(`address ${wallet.address} approve spender ${UNISWAPV3_ROUTER2_ADDRESS} allowance:${ethers.formatUnits(allowance,tokenIn.decimals).toString()}`);

     //------------------------quote2ExactInputSingle---------------------------------
    const quoteOutput = await quote2ExactInputSingle(tokenIn,tokenOut,inputAmount,poolFee);

    

    //-----------------------------build transaction------------------------------------
    // struct ExactInputParams {
    //     bytes path;
    //     address recipient;
    //     uint256 amountIn;
    //     uint256 amountOutMinimum;
    // }
    const path = ethers.solidityPacked(
                ['address','uint24','address'],
                [tokenIn.address,poolFee,tokenOut.address]
            )

    const exactInputParams = {
        path:path,
        recipient:wallet.address,
        amountIn:amountIn,
        amountOutMinimum:quoteOutput.amountOut,
    }
    console.log("router2Params:",exactInputParams);
    const transaction:ethers.ContractTransaction = await swapRouterContract.exactInput.populateTransaction(
        exactInputParams
    )

    //-----------------------------send transaction--------------------------------------
    const receipt = await sendTransaction(transaction)

    console.log("receipt:",receipt);
    if(receipt != null){
        let sendFee = calculateFee(receipt);
        console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} transaction fee:${ethers.formatUnits(sendFee.toString(),18)}`);

    }

    const tokenOutBalance2 = await getERC20Balance(wallet.address,tokenOut.address);
    const tokenOutAdd = tokenOutBalance2 - tokenOutBalance1;
    console.log("quote2 amountOut:",ethers.formatUnits(quoteOutput.amountOut,tokenOut.decimals));
    console.log("tokenOut add balance:",ethers.formatUnits(tokenOutAdd,tokenOut.decimals));
    console.log("tokenOut balance:",ethers.formatUnits(tokenOutBalance2,tokenOut.decimals));


}


/**
 * 指定数量的输入代币交换输出代币，使用多跳交换
 * @param tokenIn        :输入代币
 * @param tokenOut       :输出代币
 * @param tokenMiddle    :中间代币
 * @param inputAmount    :输入代币数量
 * @param router_address :Router 的地址
 * @param poolFee        手续费
 */
async function exactInputMultihop(tokenIn:Token,tokenMiddle:Token,tokenOut:Token,inputAmount:number,router_address:string,poolFee:number){
    const tokenContract = new ethers.Contract(tokenIn.address,WETH_ABI,wallet);
    let tokenInBalance = await tokenContract.balanceOf(wallet.address);
    const tokenOutBalance1 = await getERC20Balance(wallet.address,tokenOut.address);
    const amountIn:BigInt = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
    console.log(`tokenIn:${tokenIn.symbol} balance: ${ethers.formatUnits(tokenInBalance.toString(),tokenIn.decimals)} amountIn:${inputAmount}`);
    if(tokenInBalance < amountIn){
        throw("balance not enough to trade")
    }

    //-------------------------approve------------------------------------------------
    const approvalReceipt = await getTokenTransferApproval(tokenContract,router_address,tokenIn,inputAmount);
    const allowance = await tokenContract.allowance(wallet.address,router_address);
    const approvalFee = calculateFee(approvalReceipt)
    console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} approve fee:${ethers.formatUnits(approvalFee.toString(),18)}`);
    console.log(`address ${wallet.address} approve spender ${UNISWAPV3_ROUTER2_ADDRESS} allowance:${ethers.formatUnits(allowance,tokenIn.decimals).toString()}`);

     //------------------------quote2ExactInputSingle---------------------------------
    const quoteOutput = await quote2ExactInput(tokenIn,tokenMiddle,tokenOut,inputAmount,poolFee);

    

    //-----------------------------build transaction------------------------------------
    // struct ExactInputParams {
    //     bytes path;
    //     address recipient;
    //     uint256 amountIn;
    //     uint256 amountOutMinimum;
    // }
    const path = ethers.solidityPacked(
                ['address','uint24','address','uint24','address'],
                [tokenIn.address,poolFee,tokenMiddle.address,poolFee,tokenOut.address]
            )

    const exactInputParams = {
        path:path,
        recipient:wallet.address,
        amountIn:amountIn,
        amountOutMinimum:quoteOutput.amountOut,
    }
    console.log("router2Params:",exactInputParams);
    const transaction:ethers.ContractTransaction = await swapRouterContract.exactInput.populateTransaction(
        exactInputParams
    )

    //-----------------------------send transaction--------------------------------------
    const receipt = await sendTransaction(transaction)

    console.log("receipt:",receipt);
    if(receipt != null){
        let sendFee = calculateFee(receipt);
        console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} transaction fee:${ethers.formatUnits(sendFee.toString(),18)}`);

    }

    const tokenOutBalance2 = await getERC20Balance(wallet.address,tokenOut.address);
    const tokenOutAdd = tokenOutBalance2 - tokenOutBalance1;
    console.log("quote2 amountOut:",ethers.formatUnits(quoteOutput.amountOut,tokenOut.decimals));
    console.log("tokenOut add balance:",ethers.formatUnits(tokenOutAdd,tokenOut.decimals));
    console.log("tokenOut balance:",ethers.formatUnits(tokenOutBalance2,tokenOut.decimals));


}






/**
 * 测试UniswapV3 中的exactInputSingle 进行代币交换，但是一直报错
 * UniswapV3 router 和 UniswapV3 router2 两个Router 地址进行调用exactInputSingle
 * UniswapV3 router 报的错是
 * Error: Transaction reverted without a reason string
 * UniswapV3 router2 报的错是：
 * reverted with reason string "STF"
 * 该问题已经解决，
 * 在approve 之前，先将eth wrap to weth 就能解决该问题
 */

async function testExactInputSingle(){

    const tokenIn:Token = WETH_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const inputAmount = 0.02;
    const outputAmount:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;
    const sqrtPriceLimitX96 = 0;
    const tokenContract = new ethers.Contract(tokenIn.address,WETH_ABI,wallet);

    const ethBalance = await provider.getBalance(wallet.address);
    const tokenOutBalance1 = await getERC20Balance(wallet.address,tokenOut.address);
    console.log("ethBalance:",ethers.formatEther(ethBalance.toString()));


    


    //-----------------------------获取流动性池--------------------------------------
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





    const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
    const approvalAmount = amountIn;




   //-------------------------approve------------------------------------------------
    const approvalReceipt = await getTokenTransferApproval(tokenContract,router_address,tokenIn,inputAmount);
    const allowance = await tokenContract.allowance(wallet.address,router_address);
    const approvalFee = calculateFee(approvalReceipt)
    console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} approve fee:${ethers.formatUnits(approvalFee.toString(),tokenIn.decimals)}`);
    console.log("allowance:",allowance);
    console.log(`address ${wallet.address} approve spender ${UNISWAPV3_ROUTER2_ADDRESS} allowance:${ethers.formatUnits(allowance,18).toString()}`);


    //------------------------quote2ExactInputSingle---------------------------------
    const quoteOutput = await quote2ExactInputSingle(tokenIn,tokenOut,inputAmount,poolFee);
    // console.log("output:",output);
    // console.log("output amountOut:",output.amountOut);
    


    //-----------------------------generate params------------------------------------
    const router1Params = {
        tokenIn:tokenIn.address,
        tokenOut:tokenOut.address,
        fee:immutables.fee,
        recipient:wallet.address,
        deadline:createDeadLine(),
        amountIn:amountIn,
        amountOutMinimum:0,
        sqrtPriceLimitX96:0
    }


    const router2Params = {
        tokenIn:tokenIn.address,
        tokenOut:tokenOut.address,
        fee:immutables.fee,
        recipient:wallet.address,
        amountIn:amountIn,
        amountOutMinimum:quoteOutput.amountOut,
        sqrtPriceLimitX96:0,
    }
    console.log("router2Params:",router2Params);


    //-----------------------------build transaction------------------------------------
    const transaction:ethers.ContractTransaction = await swapRouterContract.exactInputSingle.populateTransaction(
        router2Params
    )


    const receipt = await sendTransaction(transaction)

    console.log("receipt:",receipt);
    if(receipt != null){
        let sendFee = calculateFee(receipt);
        console.log(`tokenIn:${tokenIn.symbol} tokenOut:${tokenOut.symbol} transaction fee:${ethers.formatUnits(sendFee.toString(),tokenIn.decimals)}`);

    }

    // wethBalance = await tokenContract.balanceOf(wallet.address);
    // console.log("after swap wethBalance:",ethers.formatEther(wethBalance.toString()));

    const tokenOutBalance2 = await getERC20Balance(wallet.address,tokenOut.address);
    const tokenOutAdd = tokenOutBalance2 - tokenOutBalance1;
    console.log("quote2 amountOut:",ethers.formatUnits(quoteOutput.amountOut,tokenOut.decimals));
    console.log("tokenOut add balance:",ethers.formatUnits(tokenOutAdd,tokenOut.decimals));
    console.log("tokenOut balance:",ethers.formatUnits(tokenOutBalance2,tokenOut.decimals));

}



async function testExactInputSingleV2(){

    const ethBalance = await provider.getBalance(wallet.address);
    console.log("ethBalance:",ethers.formatEther(ethBalance.toString()))


    const tokenIn:Token = WETH_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const inputAmount = 0.02;
    const outputAmount:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;
    const sqrtPriceLimitX96 = 0;


    await exactInputSingle(tokenIn,tokenOut,inputAmount,router_address,poolFee);


}


async function testExactInput(){

    const ethBalance = await provider.getBalance(wallet.address);
    console.log("ethBalance:",ethers.formatEther(ethBalance.toString()))


    const tokenIn:Token = WETH_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const inputAmount = 0.02;
    const outputAmount:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;
    const sqrtPriceLimitX96 = 0;


    await exactInput(tokenIn,tokenOut,inputAmount,router_address,poolFee);


}



async function testExactInputMultihop(){

    const ethBalance = await provider.getBalance(wallet.address);
    console.log("ethBalance:",ethers.formatEther(ethBalance.toString()))


    const tokenIn:Token = WETH_TOKEN;
    const tokenMiddle:Token = DAI_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const inputAmount = 0.02;
    const outputAmount:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;
    const sqrtPriceLimitX96 = 0;


    await exactInputMultihop(tokenIn,tokenMiddle,tokenOut,inputAmount,router_address,poolFee);


}




async function testExactOutputSingle(){

    const ethBalance = await provider.getBalance(wallet.address);
    console.log("ethBalance:",ethers.formatEther(ethBalance.toString()))


    const tokenIn:Token = WETH_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const outputAmount:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;
    const sqrtPriceLimitX96 = 0;


    await exactOutputSingle(tokenIn,tokenOut,outputAmount,router_address,poolFee);


}



async function testExactOutput(){

    const ethBalance = await provider.getBalance(wallet.address);
    console.log("ethBalance:",ethers.formatEther(ethBalance.toString()))


    const tokenIn:Token = WETH_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const outputAmount:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;
    const sqrtPriceLimitX96 = 0;

    await exactOutput(tokenIn,tokenOut,outputAmount,router_address,poolFee);


}




async function testExactOutputMultihop(){

    const ethBalance = await provider.getBalance(wallet.address);
    console.log("ethBalance:",ethers.formatEther(ethBalance.toString()))


    const tokenIn:Token = WETH_TOKEN;
    const tokenMiddle:Token = DAI_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const outputAmount:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;
    const sqrtPriceLimitX96 = 0;

    await exactOutput(tokenIn,tokenOut,outputAmount,router_address,poolFee);


}

/**
 * 1. 根据tick计算当前资产的价格
 * 2. 根据sqrtPriceX96 计算当前资产的价格
 */
async function testSqrtPrice(){
    const tokenIn:Token = WETH_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const inputAmount = 0.02;
    const outputAmount:number = 100;
    const poolFee:number = FeeAmount.MEDIUM;
    const sqrtPriceLimitX96 = 0;
    const tokenContract = new ethers.Contract(tokenIn.address,WETH_ABI,wallet);

    const ethBalance = await provider.getBalance(wallet.address);
    const tokenOutBalance1 = await getERC20Balance(wallet.address,tokenOut.address);
    console.log("ethBalance:",ethers.formatEther(ethBalance.toString()));

    //-----------------------------获取流动性池--------------------------------------
    const poolConstants = await getPoolConstants(tokenIn,tokenOut,poolFee);
    const poolContract = new ethers.Contract(
        poolConstants.poolAddress,
        IUniswapV3PoolABI.abi,
        getProvider()
    )

    const sqrtPriceX96 = poolConstants.slot0[0];
    const tick = poolConstants.slot0[1];
    // const tickToPrice = 1.0001 ** Number(-tick) * 10**tokenIn.decimals / 10 ** tokenOut.decimals;
    const tickToPrice = priceFromTick(Number(tick),tokenIn.decimals,tokenOut.decimals);
    
    // const tokenInPrice = ((Number(sqrtPriceX96) / Q96) ** 2) / (10 ** tokenIn.decimals) * (10 ** tokenOut.decimals) ;
    const tokenInPrice = priceFromSqrtPriceX96(Number(sqrtPriceX96),tokenIn.decimals,tokenOut.decimals);

    console.log("sqrtPriceX96:",sqrtPriceX96);
    console.log("tick:",tick);
    console.log("tokenIn.decimals:",tokenIn.decimals);
    console.log("tokenOut.decimals:",tokenOut.decimals);
    console.log("tick to price:",tickToPrice);
    console.log("sqrtPriceX96 to price:",tokenInPrice);
    

    const immutables = await getPoolImmutables(poolContract);
    const state = getPoolState(poolContract);

    console.log("pool address:",poolConstants.poolAddress);
    console.log("pool liquidity:",poolConstants.liquidity);
    console.log("pool slot0:",poolConstants.slot0);



}


async function calculatePoolPriceDiff(){
    const tokenIn:Token = WETH_TOKEN;
    const tokenMiddle:Token = UNI_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    // const tokenMiddle:Token = APE_TOKEN;
    // const tokenMiddle:Token = DAI_TOKEN;
    // const tokenOut:Token = APE_TOKEN;
    const amountIn:number = 1;
    const amountOut:number = 100;
    let poolFee:number = FeeAmount.MEDIUM;


    console.log("Target symbol: ",tokenOut.symbol);
    console.log(`Input  symbol: ${tokenIn.symbol}`);
    console.log(`Output symbol: ${tokenOut.symbol}`);
    console.log(`Input  amount: ${amountIn}`);

    poolFee = FeeAmount.HIGH;
    let outputAmount1 = await quote1ExactInputSingle(tokenIn,tokenOut,amountIn,poolFee);
    let feeHigh = Number(ethers.formatUnits(outputAmount1.toString(),tokenOut.decimals)) * poolFee / 1000000;
    console.log(`input:${tokenIn.symbol} outpout:${tokenOut.symbol} poolFee:${poolFee} outputAmount:${ethers.formatUnits(outputAmount1.toString(),tokenOut.decimals)} fee:${feeHigh}`);

    poolFee = FeeAmount.MEDIUM;
    let outputAmount2 = await quote1ExactInputSingle(tokenIn,tokenOut,amountIn,poolFee);
    let feeMedium = Number(ethers.formatUnits(outputAmount1.toString(),tokenOut.decimals)) * poolFee / 1000000;
    console.log(`input:${tokenIn.symbol} outpout:${tokenOut.symbol} poolFee:${poolFee} outputAmount:${ethers.formatUnits(outputAmount1.toString(),tokenOut.decimals)} fee:${feeMedium}`);

    poolFee = FeeAmount.LOW;
    let outputAmount3 = await quote1ExactInputSingle(tokenIn,tokenOut,amountIn,poolFee);
    let feeLow = Number(ethers.formatUnits(outputAmount1.toString(),tokenOut.decimals)) * poolFee / 1000000;
    console.log(`input:${tokenIn.symbol} outpout:${tokenOut.symbol} poolFee:${poolFee} outputAmount:${ethers.formatUnits(outputAmount2.toString(),tokenOut.decimals)} fee:${feeLow}`);

    const diff1HighAndMedium = ethers.formatUnits(outputAmount2 - outputAmount1,tokenOut.decimals);
    const diffMediumAndLow = ethers.formatUnits(outputAmount3 - outputAmount2,tokenOut.decimals);
    const diffHighAndLow = ethers.formatUnits(outputAmount3 - outputAmount1,tokenOut.decimals);



    console.log(`10000 Pool and  3000 Pool diff1HighAndMedium:${diff1HighAndMedium} feeSum:${feeHigh +feeMedium}`);
    console.log(`3000 Pool fee and 500 Pool diffMediumAndLow:${diffMediumAndLow} feeSum:${feeMedium+feeLow}`);
    console.log(`10000 Pool and 500 Pool diffHighAndLow:${diffHighAndLow} feeSum:${feeHigh+feeLow}`);






}



async function main(){


    // await ethToWETH();
    
    // await testWeb3();

    // testQuote();

    // await testExactInputSingle();


    // await testExactInputSingleV2();

    // await testExactInput();

    // await testExactInputMultihop();

    // await testExactOutputSingle();

    // await testExactOutput();

    // await testExactOutputMultihop();

    // await testSqrtPrice();

    await calculatePoolPriceDiff();


}



main();
