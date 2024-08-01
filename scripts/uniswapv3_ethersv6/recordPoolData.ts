
import { quote1ExactInputSingle,getPoolConstants, quote1ExactInput, quote2ExactInputSingle, quote2ExactInput, quote1ExactOutputSingle, quote2ExactOutputSingle, quote1ExactOutput, quote2ExactOutput } from './lib/quote';
import { toReadableAmount } from './lib/conversion';
import { getPoolInfo } from './lib/pool';
import { createTrade, getInTokenTransferApproval, getOutTokenTransferApproval, getTokenTransferApproval } from './lib/trading';
import { getOutputQuote,TokenTrade} from './lib/trading';
import { Trade,SwapRouter,SwapQuoter,Pool,Route,SwapOptions, FeeAmount } from '@uniswap/v3-sdk';
import { Currency,CurrencyAmount,Percent,Token,TradeType } from '@uniswap/sdk-core';
import { createDeadLine, fromReadableAmount, priceFromSqrtPriceX96, priceFromTick } from './lib/utils';
import { getNonceFromBlock, getNonceLocal, getWalletAddress, sendTransaction ,wallet} from './lib/providers';
import { DAI_TOKEN, ERC20_ABI, QUOTER_CONTRACT_ADDRESS, UNI_TOKEN, UNISWAPV3_ROUTER2_ADDRESS, UNISWAPV3_ROUTER_ADDRESS, USDC_TOKEN, WETH_TOKEN } from './lib/constant';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import Quoter2 from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json';
import { assertArgumentCount, ethers, type ContractRunner } from 'ethers';
import * as fs from 'fs';

import WETH_ABI from './abis/weth.json';
import { StateMutability } from '../../typechain-types/common';
import moment from 'moment';
import { CurrentConfig } from './config';

export function getProvider():ethers.JsonRpcApiProvider{
    let rpc_url = "https://eth-mainnet.g.alchemy.com/v2/cuT7e3X1csYwxDNQOI-l0QibriBl2CAC";
    return new ethers.JsonRpcProvider(rpc_url);
}


const provider = getProvider();


function sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算同一个交易对不同手续费池子之间的价差，报价合约用的是UniswapV3 quote2
 */
async function calculatePoolPriceDiffByQuote2(){
    console.log("\n-----------------------------calculatePoolPriceDiffByQuote2-----------------------------------------")
    const tokenIn:Token = WETH_TOKEN;
    const tokenMiddle:Token = UNI_TOKEN;
    const tokenOut:Token = USDC_TOKEN;
    const amountIn:number = 1;
    const amountOut:number = 100;
    let poolFee:number = FeeAmount.MEDIUM;


    console.log("Target symbol: ",tokenOut.symbol);
    console.log(`Input  symbol: ${tokenIn.symbol}`);
    console.log(`Output symbol: ${tokenOut.symbol}`);
    console.log(`Input  amount: ${amountIn}`);

    poolFee = FeeAmount.HIGH;
    let output1 = await quote2ExactInputSingle(tokenIn,tokenOut,amountIn,poolFee);
    let outputAmount1 = output1.amountOut;
    let gasFeeData = (await provider.getFeeData());
    let highPoolGasDollar;    // 消耗的gas,产生的总费用 单位美元
    if(gasFeeData.gasPrice != null){
        let totalGas = ethers.formatUnits(output1.gasEstimate * gasFeeData.gasPrice,18);
        // let highPoolGasDollar = Number(highPoolTotalGas) * Number(output1.amountOut);
        highPoolGasDollar = Number(totalGas) * Number(ethers.formatUnits(outputAmount1.toString(),tokenOut.decimals));

    }
    let feeHigh = Number(ethers.formatUnits(outputAmount1.toString(),tokenOut.decimals)) * poolFee / 1000000;
    console.log(`input:${tokenIn.symbol} outpout:${tokenOut.symbol} poolFee:${poolFee} outputAmount:${ethers.formatUnits(outputAmount1.toString(),tokenOut.decimals)} fee:${feeHigh} gasEstimate:${output1.gasEstimate} gasFee dollar:${highPoolGasDollar}`);



    poolFee = FeeAmount.MEDIUM;
    let output2 = await quote2ExactInputSingle(tokenIn,tokenOut,amountIn,poolFee);
    let outputAmount2 = output2.amountOut;
    gasFeeData = (await provider.getFeeData());
    let mediumPoolGasDollar;    // 消耗的gas,产生的总费用 单位美元
    if(gasFeeData.gasPrice != null){
        let totalGas = ethers.formatUnits(output1.gasEstimate * gasFeeData.gasPrice,18);
        // let highPoolGasDollar = Number(highPoolTotalGas) * Number(output1.amountOut);
        mediumPoolGasDollar = Number(totalGas) * Number(ethers.formatUnits(outputAmount2.toString(),tokenOut.decimals));

    }
    let feeMedium = Number(ethers.formatUnits(outputAmount2.toString(),tokenOut.decimals)) * poolFee / 1000000;
    console.log(`input:${tokenIn.symbol} outpout:${tokenOut.symbol} poolFee:${poolFee} outputAmount:${ethers.formatUnits(outputAmount2.toString(),tokenOut.decimals)} fee:${feeMedium} gasEstimate:${output2.gasEstimate} gasFee dollar:${mediumPoolGasDollar}`);



    poolFee = FeeAmount.LOW;
    let output3 = await quote2ExactInputSingle(tokenIn,tokenOut,amountIn,poolFee);
    let outputAmount3 = output3.amountOut;
    let lowPoolGasDollar;    // 消耗的gas,产生的总费用 单位美元
    gasFeeData = (await provider.getFeeData());
    if(gasFeeData.gasPrice != null){
        let totalGas = ethers.formatUnits(output1.gasEstimate * gasFeeData.gasPrice,18);
        // let highPoolGasDollar = Number(highPoolTotalGas) * Number(output1.amountOut);
        lowPoolGasDollar = Number(totalGas) * Number(ethers.formatUnits(outputAmount3.toString(),tokenOut.decimals));

    }
    let feeLow = Number(ethers.formatUnits(outputAmount3.toString(),tokenOut.decimals)) * poolFee / 1000000;
    console.log(`input:${tokenIn.symbol} outpout:${tokenOut.symbol} poolFee:${poolFee} outputAmount:${ethers.formatUnits(outputAmount3.toString(),tokenOut.decimals)} fee:${feeLow} gasEstimate:${output3.gasEstimate} gasFee dollar:${lowPoolGasDollar}`);

    const diffHighAndMedium = ethers.formatUnits(outputAmount2 - outputAmount1,tokenOut.decimals);
    const diffMediumAndLow = ethers.formatUnits(outputAmount3 - outputAmount2,tokenOut.decimals);
    const diffHighAndLow = ethers.formatUnits(outputAmount3 - outputAmount1,tokenOut.decimals);



    console.log(`\nHigh Pool and  Medium Pool diff:${diffHighAndMedium} feeSum:${feeHigh +feeMedium}`);
    console.log(`Medium Pool and Low Pool diff:${diffMediumAndLow} feeSum:${feeMedium+feeLow}`);
    console.log(`High Pool and Low Pool diff:${diffHighAndLow} feeSum:${feeHigh+feeLow}`);

    let dateNow = moment().format("YYYY-MM-D HH:mm:SS");
    let blockNumber = await provider.getBlockNumber();
    let highQuoteAmount = ethers.formatUnits(outputAmount1,tokenOut.decimals);
    let mediumQuoteAmount = ethers.formatUnits(outputAmount2,tokenOut.decimals);
    let lowQuoteAmount = ethers.formatUnits(outputAmount3,tokenOut.decimals);

    let buffer:string = `${dateNow},${blockNumber},${tokenIn.symbol},${tokenOut.symbol},${FeeAmount.HIGH},${highQuoteAmount},${output3.gasEstimate},${highPoolGasDollar},${FeeAmount.MEDIUM},${mediumQuoteAmount},${output2.gasEstimate},${mediumPoolGasDollar},${FeeAmount.LOW},${lowQuoteAmount},${output1.gasEstimate},${lowPoolGasDollar},${diffHighAndMedium},${feeHigh + feeMedium},${diffMediumAndLow},${feeMedium + feeLow},${diffHighAndLow},${feeHigh + feeLow}\n`;

    writeToCsv(buffer,tokenIn.symbol,tokenOut.symbol);
}


async function writeToCsv(buffer:string,token0:any,token1:any){
    const content = buffer;
    fs.appendFileSync(`${token0}_${token1}_uniswapv3.csv`, buffer, (err: any) => {
        if (err) {
            console.log("writeToCsv error:", err);
        }
    });
}



async function main(){

    // calculatePoolPriceDiffByQuote2();


    while(true){
        try{
            calculatePoolPriceDiffByQuote2();
            await sleep(1000 * 2);
        }catch(error)
        {
            console.log("error:",error);
            continue;
        }


       
    }
    
    
}




main()