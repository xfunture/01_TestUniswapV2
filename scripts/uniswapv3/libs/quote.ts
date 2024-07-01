import { ethers } from 'ethers';
import { CurrentConfig } from '../config';
import { computePoolAddress, SwapQuoter } from '@uniswap/v3-sdk';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import Quoter2 from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';

import { POOL_FACTORY_CONTRACT_ADDRESS,QUOTER2_CONTRACT_ADDRESS,QUOTER_CONTRACT_ADDRESS, UNI_TOKEN, USDC_TOKEN, WETH_TOKEN } from '../libs/constants';

import { getProvider } from '../libs/providers';
import { toReadableAmount,fromReadableAmount } from '../libs/conversion';
import { createDeadLine } from './utils';
import { getAddress } from 'ethers/lib/utils';


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
export async function quote1ExactInputSingle():Promise<ethers.BigNumber>{
    const quoterContract = new ethers.Contract(
        QUOTER_CONTRACT_ADDRESS,
        Quoter.abi,
        getProvider()
    )
    console.log("\n\nquoter1 contract:",QUOTER_CONTRACT_ADDRESS);

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants();
    const sqrtPriceLimitX96 = 0;
    
    console.log("poolConstants.token1:",poolConstants.token1);
    console.log("poolConstants.token0:",poolConstants.token0);
    // console.log("amountIn:",CurrentConfig.tokens.amountIn);
    const quoteAmountQut = await quoterContract.callStatic.quoteExactInputSingle(
        CurrentConfig.tokens.in.address,                                                // tokenIn
        CurrentConfig.tokens.out.address,                                               // tokenOut
        poolConstants.fee,                                                              // fee
        fromReadableAmount(                                                             // amountIn
            CurrentConfig.tokens.amountIn,  
            CurrentConfig.tokens.in.decimals
        ).toString(),
        sqrtPriceLimitX96                                                               // sqrtPriceLimit
    )
    // return toReadableAmount(quoteAmountQut,CurrentConfig.tokens.out.decimals);
    console.log("quoter1 amountOut:",ethers.utils.formatUnits(quoteAmountQut.toString(),CurrentConfig.tokens.out.decimals));
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
export async function quote2ExactInputSingle(){
    const quoterContract = new ethers.Contract(
        QUOTER2_CONTRACT_ADDRESS,
        Quoter2.abi,
        getProvider()
    )
    console.log("\n\nquoter2 contract:",QUOTER_CONTRACT_ADDRESS);

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants();
    const sqrtPriceLimitX96 = 0;
    
    console.log("poolConstants.token1:",poolConstants.token1);
    console.log("poolConstants.token0:",poolConstants.token0);
    // console.log("amountIn:",CurrentConfig.tokens.amountIn);
    const params = {
        tokenIn:CurrentConfig.tokens.in.address,                                                // tokenIn
        tokenOut:CurrentConfig.tokens.out.address,                                               // tokenOut
        fee:poolConstants.fee,                                                              // fee
        amountIn:fromReadableAmount(                                                             // amountIn
            CurrentConfig.tokens.amountIn,  
            CurrentConfig.tokens.in.decimals
        ).toString(),
        sqrtPriceLimitX96:sqrtPriceLimitX96       
    }
    const output = await quoterContract.callStatic.quoteExactInputSingle(
        params                                                            // sqrtPriceLimit
    )
    console.log("sqrtPriceX96After:",output.sqrtPriceX96After.toString());
    console.log("initializedTicksCrossed:",output.initializedTicksCrossed.toString());
    console.log("quoter2 amountOut:",ethers.utils.formatUnits(output.amountOut,CurrentConfig.tokens.out.decimals));
    console.log("gasEstimate:",output.gasEstimate.toString());
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
export async function quote1ExactInput():Promise<ethers.BigNumber>{
    const quoterContract = new ethers.Contract(
        QUOTER_CONTRACT_ADDRESS,
        Quoter.abi,
        getProvider()
    )
    console.log("\n\nquoter1 contract:",QUOTER_CONTRACT_ADDRESS);

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants();
    let path = ethers.utils.solidityPack(
        ['address','uint24','address','uint24',"address"],
        [WETH_TOKEN.address,3000,UNI_TOKEN.address,3000,USDC_TOKEN.address]

    )

    const quoteAmountQut = await quoterContract.callStatic.quoteExactInput(
        path,
        fromReadableAmount(
            CurrentConfig.tokens.amountIn,
            CurrentConfig.tokens.in.decimals
            )
    )
    console.log("quoter2 amountOut:",ethers.utils.formatUnits(quoteAmountQut,CurrentConfig.tokens.out.decimals));

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
export async function quote2ExactInput(){
    const quoterContract = new ethers.Contract(
        QUOTER2_CONTRACT_ADDRESS,
        Quoter2.abi,
        getProvider()
    )
    console.log("\n\nquoter2 contract:",QUOTER_CONTRACT_ADDRESS);

    // 获取Pool合约相关变量
    const poolConstants = await getPoolConstants();
    let path = ethers.utils.solidityPack(
        ['address','uint24','address','uint24',"address"],
        [WETH_TOKEN.address,3000,UNI_TOKEN.address,3000,USDC_TOKEN.address]

    )

    const output = await quoterContract.callStatic.quoteExactInput(
        path,
        fromReadableAmount(
            CurrentConfig.tokens.amountIn,
            CurrentConfig.tokens.in.decimals
            )
    )
    console.log("sqrtPriceX96AfterList:",output.sqrtPriceX96AfterList);
    console.log("initializedTicksCrossedList:",output.initializedTicksCrossedList);
    console.log("quoter2 amountOut:",ethers.utils.formatUnits(output.amountOut,CurrentConfig.tokens.out.decimals));
    console.log("gasEstimate:",output.gasEstimate.toString());

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
 * @returns 
 */
export async function getPoolConstants():Promise<{
    token0:string,
    token1:string,
    fee:number,
    liquidity:ethers.BigNumber,
    slot0:ethers.BigNumber
}>{
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
    const [token0,token1,fee,liquidity,slot0] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
    ])
    return {
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