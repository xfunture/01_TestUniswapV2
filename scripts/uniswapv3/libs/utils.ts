import { Token, TradeType } from '@uniswap/sdk-core'
import { Trade } from '@uniswap/v3-sdk'
import { BigNumber, ethers } from 'ethers'

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
): BigNumber {
  return ethers.utils.parseUnits(amount.toString(), decimals)
}

/**
 * 小单位转大单位
 * @param rawAmount 
 * @param decimals 
 * @returns 
 */
export function toReadableAmount(rawAmount: number, decimals: number): string {
  return ethers.utils.formatUnits(rawAmount, decimals).slice(0, MAX_DECIMALS)
}

export function displayTrade(trade: Trade<Token, Token, TradeType>): string {
  return `${trade.inputAmount.toExact()} ${
    trade.inputAmount.currency.symbol
  } for ${trade.outputAmount.toExact()} ${trade.outputAmount.currency.symbol}`
}


export function createDeadLine():number{
  return Math.floor(Date.now()/1000) + 60 * 20; // 20 minutes from the current Unix time
}
