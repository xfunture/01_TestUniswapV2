import { ethers } from 'ethers';
import { CurrentConfig } from '../config';
import { computePoolAddress, SwapQuoter } from '@uniswap/v3-sdk';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import Quoter2 from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';

import { POOL_FACTORY_CONTRACT_ADDRESS,QUOTER2_CONTRACT_ADDRESS,QUOTER_CONTRACT_ADDRESS, UNI_TOKEN, USDC_TOKEN, WETH_TOKEN } from '../lib/constant';

import { getNonceFromBlock, getProvider } from '../lib/providers';
import { toReadableAmount,fromReadableAmount } from '../lib/conversion';
import { createDeadLine } from './utils';
import { Token } from '@uniswap/sdk-core';


/**
 * UniswapV3 quoter1 contract 中的函数
 * 支持单跳兑换的报价函数
 * 指定输入代币的数量，获取输出代币的数量，在一个pool 中
 * 在Quoter 合约中有4个报价函数
 * quoteExactInputSingle - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
 * quoteExactInput - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
 * quoteExactOutputSingle - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
 * quoteExactOutput - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
 * @returns 
 */
export async function quote1ExactInputSingle(tokenIn:Token,tokenOut:Token,amountIn:number,poolFee:number):Promise<BigInt>{
    const quoterContract = new ethers.Contract(
        QUOTER_CONTRACT_ADDRESS,
        Quoter.abi,
        getProvider()
    )
    // console.log("\n\nquote1ExactInputSingle");

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants(tokenIn,tokenOut,poolFee);
    const sqrtPriceLimitX96 = 0;
    
    // console.log("poolConstants.token1:",poolConstants.token1);
    // console.log("poolConstants.token0:",poolConstants.token0);
    // console.log("amountIn:",CurrentConfig.tokens.amountIn);
    const quoteAmountQut = await quoterContract.quoteExactInputSingle.staticCall(
        tokenIn.address,                                                // tokenIn
        tokenOut.address,                                               // tokenOut
        poolConstants.fee,                                                              // fee
        fromReadableAmount(                                                             // amountIn
            amountIn,  
            tokenIn.decimals
        ).toString(),
        sqrtPriceLimitX96                                                               // sqrtPriceLimit
    )
    // return toReadableAmount(quoteAmountQut,CurrentConfig.tokens.out.decimals);
    // console.log("quoter1 amountOut:",ethers.formatUnits(quoteAmountQut.toString(),tokenOut.decimals));
    return quoteAmountQut;
}



/**
 * UniswapV3 quoter2 contract 中的函数
 * 只支持单跳兑换的报价函数
 * 指定输入代币的数量，获取输出代币的数量，在一个pool 中
 * 在Quoter 合约中有4个报价函数
 * quoteExactInputSingle - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
 * 该函数还会返回以下参数：
 * sqrtPriceX96After：假设该笔交易成功之后的sqrtPriceX96
 * initializedTicksCrossed 
 * gasEstimate
 *               
 * quoteExactInput - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
 * quoteExactOutputSingle - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
 * quoteExactOutput - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
 * @returns 
 */
export async function 
quote2ExactInputSingle(tokenIn:Token,tokenOut:Token,amountIn:number,poolFee:number){
    const quoterContract = new ethers.Contract(
        QUOTER2_CONTRACT_ADDRESS,
        Quoter2.abi,
        getProvider()
    )
    // console.log("\n\nquote2ExactInputSingle");

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants(tokenIn,tokenOut,poolFee);
    const sqrtPriceLimitX96 = 0;
    
    // console.log("poolConstants.token1:",poolConstants.token1);
    // console.log("poolConstants.token0:",poolConstants.token0);
    // console.log("amountIn:",CurrentConfig.tokens.amountIn);
    const params = {
        tokenIn:tokenIn.address,                                                // tokenIn
        tokenOut:tokenOut.address,                                               // tokenOut
        fee:poolConstants.fee,                                                              // fee
        amountIn:fromReadableAmount(                                                             // amountIn
            amountIn,  
            tokenIn.decimals
        ).toString(),
        sqrtPriceLimitX96:sqrtPriceLimitX96       
    }
    let nonce = await getNonceFromBlock();
    const output = await quoterContract.quoteExactInputSingle.staticCall(
        params                                                            // sqrtPriceLimit
    )
    // console.log("sqrtPriceX96After:",output.sqrtPriceX96After.toString());
    // console.log("initializedTicksCrossed:",output.initializedTicksCrossed.toString());
    // console.log("quoter2 amountOut:",ethers.formatUnits(output.amountOut,tokenOut.decimals));
    // console.log("gasEstimate:",output.gasEstimate.toString());
    return output;
}


/**
 * UniswapV3 quoter1 contract 中的函数quoteExactInput
 * 支持多跳兑换的报价函数
 * 该函数内部调用的是quoteExactInputSingle
 * 但是该函数支持多跳调用，比如WETH->UNI->USDC
 * 指定输入代币的数量，获取输出代币的数量，在一个pool 中
 * 在Quoter 合约中有4个报价函数
 * quoteExactInputSingle - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
 * quoteExactInput - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
 * quoteExactOutputSingle - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
 * quoteExactOutput - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
 * @returns 
 */
export async function quote1ExactInput(tokenIn:Token,tokenMiddle:Token,tokenOut:Token,amountIn:number,poolFee:number):Promise<BigInt>{
    const quoterContract = new ethers.Contract(
        QUOTER_CONTRACT_ADDRESS,
        Quoter.abi,
        getProvider()
    )
    console.log("\n\nquote1ExactInput contract");

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants(tokenIn,tokenOut,CurrentConfig.tokens.poolFee);
    let path = ethers.solidityPacked(
        ['address','uint24','address','uint24',"address"],
        [tokenIn.address,poolFee,tokenMiddle.address,poolFee,tokenOut.address]

    )

    const quoteAmountQut = await quoterContract.quoteExactInput.staticCall(
        path,
        fromReadableAmount(
            amountIn,
            tokenIn.decimals
            )
    )
    console.log("quoter2 amountOut:",ethers.formatUnits(quoteAmountQut,tokenOut.decimals));

    return quoteAmountQut;
}


/**
 * UniswapV3 quoter1 contract 中的函数quoteExactInput
 * 支持多跳兑换的报价函数
 * 该函数内部调用的是quoteExactInputSingle
 * 但是该函数支持多跳调用，比如WETH->UNI->USDC
 * 指定输入代币的数量，获取输出代币的数量，在一个pool 中
 * 在Quoter 合约中有4个报价函数
 * quoteExactInputSingle - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
 * quoteExactInput - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
 * quoteExactOutputSingle - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
 * quoteExactOutput - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
 * @returns 
 */
export async function quote2ExactInput(tokenIn:Token,tokenMiddle:Token,tokenOut:Token,amountIn:number,poolFee:number){
    const quoterContract = new ethers.Contract(
        QUOTER2_CONTRACT_ADDRESS,
        Quoter2.abi,
        getProvider()
    )
    console.log("\n\nquote2ExactInput");

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants(tokenIn,tokenOut,CurrentConfig.tokens.poolFee);
    let path = ethers.solidityPacked(
        ['address','uint24','address','uint24',"address"],
        [tokenIn.address,poolFee,tokenMiddle.address,poolFee,tokenOut.address]

    )

    const output = await quoterContract.quoteExactInput.staticCall(
        path,
        fromReadableAmount(
            amountIn,
            tokenIn.decimals
            )
    )
    console.log("sqrtPriceX96AfterList:",output.sqrtPriceX96AfterList);
    console.log("initializedTicksCrossedList:",output.initializedTicksCrossedList);
    console.log("quoter2 amountOut:",ethers.formatUnits(output.amountOut,tokenOut.decimals));
    console.log("gasEstimate:",output.gasEstimate.toString());

    return output;
}



/**
 * UniswapV3 quoter1 contract 中的函数
 * 支持单跳兑换的报价函数，指定输出代币的数量，获取输入代币的数量
 * 在Quoter 合约中有4个报价函数
 * quoteExactInputSingle - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
 * quoteExactInput - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
 * quoteExactOutputSingle - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
 * quoteExactOutput - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
 * @returns 
 */
export async function quote1ExactOutputSingle(tokenIn:Token,tokenOut:Token,amountOut:number,poolFee:number):Promise<BigInt>{
    const quoterContract = new ethers.Contract(
        QUOTER_CONTRACT_ADDRESS,
        Quoter.abi,
        getProvider()
    )
    console.log("\n\nquote1ExactOutputSingle");

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants(tokenIn,tokenOut,poolFee);
    const sqrtPriceLimitX96 = 0;
    
    console.log("poolConstants.token1:",poolConstants.token1);
    console.log("poolConstants.token0:",poolConstants.token0);
    // console.log("amountIn:",CurrentConfig.tokens.amountIn);
    const quoteAmountIn = await quoterContract.quoteExactOutputSingle.staticCall(
        tokenIn.address,                                                // tokenIn
        tokenOut.address,                                               // tokenOut
        poolConstants.fee,                                                              // fee
        fromReadableAmount(                                                             // amountIn
            amountOut,  
            tokenOut.decimals
        ).toString(),
        sqrtPriceLimitX96                                                               // sqrtPriceLimit
    )
    // return toReadableAmount(quoteAmountQut,CurrentConfig.tokens.out.decimals);
    console.log("quoter1 amountIn:",ethers.formatUnits(quoteAmountIn.toString(),tokenIn.decimals));
    return quoteAmountIn;
}


/**
 * UniswapV3 quoter2 contract 中的函数
 * 只支持单跳兑换的报价函数,指定输出代币的数量，获取输入代币的数量
 * 在Quoter 合约中有4个报价函数
 * quoteExactInputSingle - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
 * 该函数还会返回以下参数：
 * sqrtPriceX96After：假设该笔交易成功之后的sqrtPriceX96
 * initializedTicksCrossed 
 * gasEstimate
 *               
 * quoteExactInput - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
 * quoteExactOutputSingle - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
 * quoteExactOutput - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
 * @returns 
 */
export async function quote2ExactOutputSingle(tokenIn:Token,tokenOut:Token,amountOut:number,poolFee:number){
    const quoterContract = new ethers.Contract(
        QUOTER2_CONTRACT_ADDRESS,
        Quoter2.abi,
        getProvider()
    )
    // console.log("\n\nquote2ExactOutputSingle");

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants(tokenIn,tokenOut,poolFee);
    const sqrtPriceLimitX96 = 0;
    
    // console.log("poolConstants.token1:",poolConstants.token1);
    // console.log("poolConstants.token0:",poolConstants.token0);
    const params = {
        tokenIn:tokenIn.address,                                                // tokenIn
        tokenOut:tokenOut.address,                                               // tokenOut
        fee:poolFee,                                                              // fee
        amount:fromReadableAmount(                                                             // amountIn
            amountOut,  
            tokenOut.decimals
        ).toString(),
        sqrtPriceLimitX96:sqrtPriceLimitX96       
    }
    const output = await quoterContract.quoteExactOutputSingle.staticCall(
        params                                                            // sqrtPriceLimit
    )
    // console.log("output:",output);
    // console.log("sqrtPriceX96After:",output.sqrtPriceX96After.toString());
    // console.log("initializedTicksCrossed:",output.initializedTicksCrossed.toString());
    // console.log("quoter2 amountIn:",ethers.formatUnits(output.amountIn,tokenIn.decimals));
    // console.log("gasEstimate:",output.gasEstimate.toString());
    return output;
}


/**
 * UniswapV3 quoter1 contract 中的函数quoteExactOutput
 * 支持多跳兑换的报价函数
 * 该函数内部调用的是 quoteExactOutputSingle
 * 但是该函数支持多跳调用，比如WETH->UNI->USDC
 * 指定输入代币的数量，获取输出代币的数量，在一个pool 中
 * 在Quoter 合约中有4个报价函数
 * quoteExactInputSingle - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
 * quoteExactInput - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
 * quoteExactOutputSingle - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
 * quoteExactOutput - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
 * @returns 
 */
export async function quote1ExactOutput(tokenIn:Token,tokenMiddle:Token,tokenOut:Token,amountOut:number,poolFee:number):Promise<BigInt>{
    const quoterContract = new ethers.Contract(
        QUOTER_CONTRACT_ADDRESS,
        Quoter.abi,
        getProvider()
    )
    console.log("\n\nquote1ExactOutput");

    let path = ethers.solidityPacked(
        ['address','uint24','address','uint24',"address"],
        [tokenOut.address,poolFee,tokenMiddle.address,poolFee,tokenIn.address]

    )

    const quoteAmountIn = await quoterContract.quoteExactOutput.staticCall(
        path,
        fromReadableAmount(
            amountOut,
            tokenOut.decimals
            )
    )
    console.log("quoter1 amountIn:",ethers.formatUnits(quoteAmountIn,tokenIn.decimals));

    return quoteAmountIn;
}



/**
 * UniswapV3 quoter1 contract 中的函数quoteExactOutput
 * 支持多跳兑换的报价函数
 * 该函数内部调用的是quoteExactOutputSingle
 * 但是该函数支持多跳调用，比如WETH->UNI->USDC
 * 指定输入代币的数量，获取输出代币的数量，在一个pool 中
 * 在Quoter 合约中有4个报价函数
 * quoteExactInputSingle - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
 * quoteExactInput - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
 * quoteExactOutputSingle - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
 * quoteExactOutput - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
 * @returns 
 */
export async function quote2ExactOutput(tokenIn:Token,tokenMiddle:Token,tokenOut:Token,amountOut:number,poolFee:number){
    const quoterContract = new ethers.Contract(
        QUOTER2_CONTRACT_ADDRESS,
        Quoter2.abi,
        getProvider()
    )
    // console.log("\n\nquote2ExactOutput");

    let path = ethers.solidityPacked(
        ['address','uint24','address','uint24',"address"],
        [tokenOut.address,3000,tokenMiddle.address,3000,tokenIn.address]

    )

    const output = await quoterContract.quoteExactOutput.staticCall(
        path,
        fromReadableAmount(
            amountOut,
            tokenOut.decimals
            )
    )
    // console.log("sqrtPriceX96AfterList:",output.sqrtPriceX96AfterList);
    // console.log("initializedTicksCrossedList:",output.initializedTicksCrossedList);
    // console.log("quoter2 amountIn:",ethers.formatUnits(output.amountIn,tokenIn.decimals));
    // console.log("gasEstimate:",output.gasEstimate.toString());

    return output;
}


/**
 * 获取一个结构对象
 * {
 *  token0:string,
 *  token1:string,
 *  fee:number
 * }
 * 该方法会通过batch Promise 同步查询合约的状态数据，而不是顺序查询。
 * 同步查询而不是顺序查询，是因为顺序查询有可能产生两个区块的数据不一致的问题。
 * 智能合约中slot0结构如下：
 * struct Slot0{
	uint160 sqrtPriceX96;     		    // uint160 代表的是整型160位，除以8 ，第一个变量sqrtPriceX96 占20个字节
	int24 tick;	          		        // 占3个字节，
	uint16 observationIndex;            // 占2个字节
	uint16 observationCardinality;      // 占2个字节
	uint16 observationCardinalityNext; 	// 占2个字节
	uint8 feeProtocol;			        // 占1个字节
	bool unlocked; 				        // 占一个字节,whether the pool is locked，

}
 * @returns 
 */
export async function getPoolConstants(tokenIn:Token,tokenOut:Token,poolFee:number):Promise<{
    poolAddress:string,
    token0:string,
    token1:string,
    fee:number,
    liquidity:BigInt,
    slot0:Array<bigint>
}>{
    const poolAddress = computePoolAddress(
        {
            factoryAddress:POOL_FACTORY_CONTRACT_ADDRESS,
            tokenA:tokenIn,
            tokenB:tokenOut,
            fee:poolFee
        }
    )

    // console.log("currentPoolAddress:",poolAddress);
    const poolContract = new ethers.Contract(
        poolAddress,
        IUniswapV3PoolABI.abi,
        getProvider()
    )
    const [token0,token1,fee,liquidity,slot0] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
    ])
    return {
        poolAddress,
        token0,
        token1,
        fee,
        liquidity,
        slot0
    }

}

/**
 * fee is the fee that is taken from every swap that is executed on the pool in 1 per million - if the fee value of a pool is 500, 500/ 1000000 (or 0.05%) of the trade amount is taken as a fee. This fee goes to the liquidity providers of the Pool.
 * liquidity is the amount of liquidity the Pool can use for trades at the current price.
 * sqrtPriceX96 is the current Price of the pool, encoded as a ratio between token0 and token1.
 * tick is the tick at the current price of the pool.
 * @returns 
 */
export async function getPoolInfo() {

    const currentPoolAddress = computePoolAddress(
        {
            factoryAddress:POOL_FACTORY_CONTRACT_ADDRESS,
            tokenA:CurrentConfig.tokens.in,
            tokenB:CurrentConfig.tokens.out,
            fee: CurrentConfig.tokens.poolFee
        }
    )

    console.log("currentPoolAddress:",currentPoolAddress);
    const poolContract = new ethers.Contract(
        currentPoolAddress,
        IUniswapV3PoolABI.abi,
        getProvider()
    )
    const [fee, liquidity, slot0] =
    await Promise.all([
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
    ])

    return {
        fee,
        liquidity,
        sqrtPriceX96: slot0[0],
        tick: slot0[1],
    } 
}