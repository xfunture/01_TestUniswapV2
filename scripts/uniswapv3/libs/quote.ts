import { ethers } from 'ethers';
import { CurrentConfig } from '../config';
import { computePoolAddress } from '@uniswap/v3-sdk';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json';

import { POOL_FACTORY_CONTRACT_ADDRESS,QUOTE_CONTRACT_ADDRESS } from '../libs/constants';

import { getProvider } from '../libs/providers';
import { toReadableAmount,fromReadableAmount } from '../libs/conversion';


/**
 * 指定输入代币的数量，获取输出代币的数量，在一个pool 中
 * 在Quoter 合约中有4个报价函数
 * quoteExactInputSingle - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
 * quoteExactInput - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
 * quoteExactOutputSingle - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
 * quoteExactOutput - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
 * @returns 
 */
export async function quote():Promise<string>{
    const quoterContract = new ethers.Contract(
        QUOTE_CONTRACT_ADDRESS,
        Quoter.abi,
        getProvider()
    )
    const poolConstants = await getPoolConstants()

    const quoteAmountQut = await quoterContract.callStatic.quoteExactInputSingle(
        poolConstants.token0,
        poolConstants.token1,
        poolConstants.fee,
        fromReadableAmount(
            CurrentConfig.tokens.amountIn,
            CurrentConfig.tokens.in.decimals
        ).toString(),
        0
    )
    return toReadableAmount(quoteAmountQut,CurrentConfig.tokens.out.decimals);
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
async function getPoolConstants():Promise<{
    token0:string,
    token1:string,
    fee:number,
    // liquidity:number,
    // slot0:number
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
    console.log("poolContract:",poolContract);
    const [token0,token1,fee,liquidity,slot0] = await Promise.all([
        poolContract.token0,
        poolContract.token1,
        poolContract.fee,
        poolContract.liquidity,
        poolContract.slot0,
    ])
    return {
        token0,
        token1,
        fee,
        // liquidity,
        // slot0
    }

}