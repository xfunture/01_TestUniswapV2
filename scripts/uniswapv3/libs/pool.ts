import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { computePoolAddress, Pool } from '@uniswap/v3-sdk';
import { ethers } from 'ethers';

import { CurrentConfig } from '../config';
import { POOL_FACTORY_CONTRACT_ADDRESS } from './constants';
import { getProvider } from './providers';
import { computeAddress } from 'ethers/lib/utils';

interface PoolInfo{
    token0:string,
    token1:string,
    fee:number,
    tickSpacing:number,
    sqrtPriceX96:ethers.BigNumber,
    liquidity:ethers.BigNumber,
    tick:number
}
/**
 * 
 * @returns 
 * fee is the fee that is taken from every swap that is executed on the pool in 1 per million - if the fee value of a pool is 500, 500/ 1000000 (or 0.05%) of the trade amount is taken as a fee. This fee goes to the liquidity providers of the Pool.
 * liquidity is the amount of liquidity the Pool can use for trades at the current price.
 * sqrtPriceX96 is the current Price of the pool, encoded as a ratio between token0 and token1.
 * tick is the tick at the current price of the pool.
 */
export async function getPoolInfo():Promise<PoolInfo>{
    const provider = getProvider();
    if(!provider){
        throw new Error('No provider');
    }

    const currentPoolAddress = computePoolAddress({
        factoryAddress:POOL_FACTORY_CONTRACT_ADDRESS,
        tokenA:CurrentConfig.tokens.in,
        tokenB:CurrentConfig.tokens.out,
        fee:CurrentConfig.tokens.poolFee
    })

    const poolContract = new ethers.Contract(
        currentPoolAddress,
        IUniswapV3PoolABI.abi,
        provider
    )

    const [token0,token1,fee,tickSpacing,liquidity,slot0] = 
        await Promise.all([
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee(),
            poolContract.tickSpacing(),
            poolContract.liquidity(),
            poolContract.slot0()
        ]);
    
    return {token0,token1,fee,tickSpacing,liquidity,sqrtPriceX96:slot0[0],tick:slot0[1]}
    
    
}