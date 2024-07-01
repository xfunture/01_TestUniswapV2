import { CurrentConfig } from './config';
import { quote,getPoolConstants } from './libs/quote';
import { toReadableAmount } from './libs/conversion';
import { getPoolInfo } from './libs/pool';
import { createTrade, getTokenTransferApproval } from './libs/trading';
import { getOutputQuote,TokenTrade} from './libs/trading';
import { Trade,SwapRouter,SwapQuoter,Pool,Route,SwapOptions } from '@uniswap/v3-sdk';
import { Currency,CurrencyAmount,Percent,Token,TradeType } from '@uniswap/sdk-core';
import { fromReadableAmount } from './libs/utils';
import { JSBI } from 'jsbi';
import { getProvider, getWalletAddress, sendTransaction ,wallet} from './libs/providers';
import { generateRoute } from './libs/routing';
import { DAI_TOKEN, ERC20_ABI, MAX_FEE_PER_GAS, MAX_PRIORITY_FEE_PER_GAS, QUOTER_CONTRACT_ADDRESS, SWAP_ROUTER_ADDRESS, UNI_TOKEN } from './libs/constants';
import { ethers, BigNumber, BigNumberish } from 'ethers';
import * as fs from 'fs';

const DAI_CONTRACT_ABI = fs.readFileSync("./contracts/abis/DAIAbi.json").toString();
const WETH_CONTRACT_ABI  = fs.readFileSync("./contracts/abis/WETHAbi.json").toString();
const UNI_CONTRACT_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const UNI_CONTRACT_ABI = fs.readFileSync("./contracts/abis/UniAbi.json").toString();

const USDC_CONTRACT_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_CONTRACT_ABI = fs.readFileSync("./contracts/abis/USDCAbi.json").toString();
const minTokenAbi = [{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}]
const USDC_CONTRACT = new ethers.Contract(USDC_CONTRACT_ADDRESS,minTokenAbi,wallet);




async function getERC20Balance(myAddress:string,CONTRACT_ADDRESS:string):Promise<number>{

    // const erc20Abi =  [
    //     "uint8   public constant decimals",
    //     "function balanceOf(address) public view returns(uint)",
    //     "function deposit() public payable",
    //     "function transfer(address, uint) public returns (bool)",
    //     "function withdraw(uint) public",
    // ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS,minTokenAbi,getProvider());
    // const symbol = await contract.name();
    // const decimals = await contract.decimals();
    const balance = await contract.balanceOf(myAddress)
    // console.log("symbol:",symbol);
    // console.log("decimals:",decimals);
    // console.log("balance:",ethers.utils.formatUnits(balance,decimals));
    return balance;
}

/**
 * 
 * @param receipt 计算交易消耗的gas
 * @returns 
 */
function calculateFee(receipt:ethers.providers.TransactionReceipt):ethers.BigNumber{
    let gasUsed = receipt.cumulativeGasUsed;
    let gasPrice = receipt.effectiveGasPrice;
    return gasUsed.mul(gasPrice);
}

async function firstDemo(){
    const provider = getProvider();
    if(!provider){
        throw new Error('Provider required to get pool state');
    }


    /*****************************************************************************get Amount out********************************************************************* */

    const amountOut = await quote();
    console.log("amountIn:",CurrentConfig.tokens.amountIn);
    console.log("quotedAmountOut:",ethers.utils.formatUnits(amountOut.toString(),CurrentConfig.tokens.out.decimals));
    /*****************************************************************************get Amount out********************************************************************* */



    /*****************************************************************************create trade ********************************************************************* */
    const poolInfo = await getPoolInfo();
    console.log("token0:",poolInfo.token0);
    console.log("token1:",poolInfo.token1);
    console.log("fee:",poolInfo.fee);
    console.log("liquidity:",poolInfo.liquidity);
    console.log("sqrtPriceX96:",poolInfo.sqrtPriceX96);
    console.log("tickSpacing:",poolInfo.tickSpacing);
    console.log("tick:",poolInfo.tick);


    const pool = new Pool(
        CurrentConfig.tokens.in,
        CurrentConfig.tokens.out,
        CurrentConfig.tokens.poolFee,
        poolInfo.sqrtPriceX96.toString(),
        poolInfo.liquidity.toString(),
        poolInfo.tick
    )

    const swapRoute = new Route(
        [pool],
        CurrentConfig.tokens.in,
        CurrentConfig.tokens.out
    )
    const uncheckedTrade:TokenTrade = Trade.createUncheckedTrade({
        route:swapRoute,
        inputAmount:CurrencyAmount.fromRawAmount(CurrentConfig.tokens.in,fromReadableAmount(CurrentConfig.tokens.amountIn,CurrentConfig.tokens.in.decimals).toString()),
        outputAmount:CurrencyAmount.fromRawAmount(CurrentConfig.tokens.out,amountOut.toString()),
        tradeType:TradeType.EXACT_INPUT
    })
    /*****************************************************************************create trade ********************************************************************* */



    /*****************************************************************************execute Trade*********************************************************************************/
 

    /*********************************************approve*********************************************************************************************/
    // Give approval to the router to spend the token
    const tokenApprovalReceipt = await getTokenTransferApproval(CurrentConfig.tokens.in);
    const approvalFee = calculateFee(tokenApprovalReceipt);
    console.log(`tokenApprovalFee: ${ethers.utils.formatEther(approvalFee)}`);
    /*********************************************approve*********************************************************************************************/


    const walletAddress = getWalletAddress();
    if(!walletAddress || !provider){
        throw new Error("Cannot execute a trade without a connected wallet");
    }
    const options:SwapOptions = {
        slippageTolerance: new Percent(50,10_000),// 50 bips,or 0.50%,该滑点指的是这次交易输出token的数量我们能接受的最大百分比
        deadline:Math. floor(Date.now()/1000) + 60 * 10, // 10 minutes from current unix time
        recipient:walletAddress,
    }
    const methodParameters = SwapRouter.swapCallParameters([uncheckedTrade],options)
    const amountIn = ethers.utils.parseUnits(CurrentConfig.tokens.amountIn.toString(),18);
    const amountInHex = amountIn.toHexString();
    console.log("value:",methodParameters.value);
    const tx = {
        data:methodParameters.calldata,
        to:SWAP_ROUTER_ADDRESS,
        value:amountInHex,
        from:walletAddress,
        gasLimit:ethers.utils.hexlify(500000)
        // maxFeePerGas:MAX_FEE_PER_GAS,
        // maxPriorityFeePerGas:MAX_PRIORITY_FEE_PER_GAS,
    }

    let beforeBalance = await provider.getBalance(walletAddress);
    let usdcBalance = await USDC_CONTRACT.balanceOf(wallet.address);
    let daiBalance = await getERC20Balance(wallet.address,DAI_TOKEN.address);
    let uniBalance = await getERC20Balance(wallet.address,UNI_TOKEN.address);
    console.log("\n\nbefore swap")
    console.log("eth balance:",ethers.utils.formatEther(beforeBalance.toString()))
    console.log("usdcBalance:",toReadableAmount(usdcBalance,6));
    console.log("daiBalance:",toReadableAmount(daiBalance,DAI_TOKEN.decimals));
    console.log("uniBalance:",toReadableAmount(uniBalance,UNI_TOKEN.decimals));



    const receipt = await sendTransaction(tx);
    let transferFeeEther = calculateFee(receipt);

    /*****************************************************************************execute Trade*********************************************************************************/




    let afterbalance = await provider.getBalance(walletAddress);
    console.log("\n\nafter swap");
    console.log("eth balance",ethers.utils.formatEther(afterbalance.toString()));
    usdcBalance = await USDC_CONTRACT.balanceOf(wallet.address);
    daiBalance = await getERC20Balance(wallet.address,DAI_TOKEN.address);
    uniBalance = await getERC20Balance(wallet.address,UNI_TOKEN.address);
    console.log("usdcBalance:",toReadableAmount(usdcBalance,6));
    console.log("daiBalance:",toReadableAmount(daiBalance,DAI_TOKEN.decimals));
    console.log("uniBalance:",toReadableAmount(uniBalance,UNI_TOKEN.decimals));
    console.log(`transferFeeEther: ${ethers.utils.formatEther(transferFeeEther)}`);

}


async function testRoute(){

    const route = await generateRoute();

}

async function main(){
    console.log("Target symbol: ",CurrentConfig.tokens.out.symbol);
    console.log(`Input  symbol: ${CurrentConfig.tokens.in.symbol}`);
    console.log(`Input  amount: ${CurrentConfig.tokens.amountIn}`);


    const amoutOut = await quote();
    console.log(`Output  amount: ${ethers.utils.formatUnits(amoutOut,CurrentConfig.tokens.out.decimals)}`);

    await firstDemo();

    // const receipt = await testRoute();









}

main();