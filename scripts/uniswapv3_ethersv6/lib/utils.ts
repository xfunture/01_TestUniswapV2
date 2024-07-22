import { Token, TradeType } from '@uniswap/sdk-core'
import { Trade } from '@uniswap/v3-sdk'
import { ethers } from 'ethers'

const MAX_DECIMALS = 4

/**
 * 大单位转小单位
 * @param amount 
 * @param decimals 
 * @returns 
 */
export function fromReadableAmount(
  amount: number,
  decimals: number
): BigInt {
  return ethers.parseUnits(amount.toString(), decimals)
}

/**
 * 小单位转大单位
 * @param rawAmount 
 * @param decimals 
 * @returns 
 */
export function toReadableAmount(rawAmount: number, decimals: number): string {
  return ethers.formatUnits(rawAmount, decimals).slice(0, MAX_DECIMALS)
}

export function displayTrade(trade: Trade<Token, Token, TradeType>): string {
  return `${trade.inputAmount.toExact()} ${
    trade.inputAmount.currency.symbol
  } for ${trade.outputAmount.toExact()} ${trade.outputAmount.currency.symbol}`
}


export function createDeadLine():number{
  return Math.floor(Date.now()/1000) + 60 * 20; // 20 minutes from the current Unix time
}

/**
 * 根据tick 计算当前tokenIn 资产相对于tokenOut 资产的价格
 * @param tick 从slot0 中获取的第二个参数tick
 * @param tokenInDecimals tokenIn decimals
 * @param tokenOutDecimals tokenOut decimals
 * @returns 
 */
export function priceFromTick(tick:number,tokenInDecimals:number,tokenOutDecimals:number):number{
  return 1.0001 ** (-tick) * 10**tokenInDecimals / 10 ** tokenOutDecimals;
}

/**
 * 从sqrtPriceX96 中计算tokenIn 相对于tokenOut 的价格
 * @param sqrtPriceX96 从slot0 中获取的第一个参数sqrtPriceX96
 * @param tokenInDecimals tokenIn decimals
 * @param tokenOutDecimals tokenOut decimals
 * @returns 
 */
export function priceFromSqrtPriceX96(sqrtPriceX96:number,tokenInDecimals:number,tokenOutDecimals:number):number{
  const Q96 = 2 ** 96
  return 1 / ( ( (sqrtPriceX96 / Q96) ** 2 ) / (10 ** tokenInDecimals) * (10 ** tokenOutDecimals) )
  // return 1 / (( (sqrtPriceX96 / Q96) ** 2 ) * (10 ** tokenOutDecimals) / (10 ** tokenInDecimals));
}