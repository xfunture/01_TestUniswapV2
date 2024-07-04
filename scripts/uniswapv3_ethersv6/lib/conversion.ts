import { ethers } from 'ethers';
const READABLE_FROM_LEN = 8;

/**
 * 大单位转小单位
 * @param amount number
 * @param decimals number
 * @returns 
 */
export function fromReadableAmount(amount:number,decimals:number):BigInt{
    return ethers.parseUnits(amount.toString(),decimals);
}

/**
 * 小单位转大单位
 * @param rawAmount number
 * @param decimals  number
 * @returns 
 */
export function toReadableAmount(rawAmount:number,decimals:number):string{
    // return ethers.utils.formatUnits(rawAmount,decimals).slice(0,READABLE_FROM_LEN);
    return ethers.formatUnits(rawAmount,decimals);
}

