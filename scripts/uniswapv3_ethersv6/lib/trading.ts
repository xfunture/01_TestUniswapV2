import { Currency,CurrencyAmount,Percent,Token,TradeType } from '@uniswap/sdk-core';
import { Pool,Route,SwapOptions,SwapQuoter,SwapRouter,Trade } from '@uniswap/v3-sdk';
import { ethers } from 'ethers';
import { JSBI } from 'jsbi';

import { CurrentConfig } from '../config';
import { ERC20_ABI, QUOTER_CONTRACT_ADDRESS, UNISWAPV3_ROUTER_ADDRESS, TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER, MAX_FEE_PER_GAS, MAX_PRIORITY_FEE_PER_GAS } from './constant';
import { getPoolInfo } from './pool';
import {
    getProvider,
    getWalletAddress,
    sendTransaction,
    TransactionState
} from './providers';

import { fromReadableAmount } from './utils';

export type TokenTrade = Trade<Token,Token,TradeType>
// Promise<TokenTrade>
export async function createTrade(){
    const poolInfo = await getPoolInfo();

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

    const amountOut = await getOutputQuote(swapRoute)
    console.log(amountOut);


    // const uncheckedTrade = Trade.createUncheckedTrade({
    //     route:swapRoute,
    //     inputAmount:CurrencyAmount.fromRawAmount(
    //         CurrentConfig.tokens.in,
    //         fromReadableAmount(
    //             CurrentConfig.tokens.amountIn,
    //             CurrentConfig.tokens.in.decimals
    //         ).toString()
    //     ),
    //     outputAmount:CurrencyAmount.fromRawAmount(
    //         CurrentConfig.tokens.out,
    //         amountOut
    //     ),
    //     tradeType:TradeType.EXACT_INPUT
    // })
    // return uncheckedTrade;
}

export async function executeTrade(
    trade:TokenTrade
):Promise<ethers.TransactionReceipt>{
    const walletAddress = getWalletAddress();
    const provider = getProvider();

    if(!walletAddress || !provider){
        throw new Error("Cannot execute a trade without a connected wallet");
    }

    // Give approval to the router to spend the token
    const tokenApproval = await getTokenTransferApproval(UNISWAPV3_ROUTER_ADDRESS,CurrentConfig.tokens.in,CurrentConfig.tokens.amountIn);

    // Fail if transfer approvals do not go through
    if(tokenApproval.status == 0){
        return tokenApproval;
    }

    const options:SwapOptions = {
        slippageTolerance: new Percent(50,10_000),// 50 bips,or 0.50%,该滑点指的是这次交易输出token的数量我们能接受的最大百分比
        deadline:Math. floor(Date.now()/1000) + 60 * 10, // 10 minutes from current unix time
        recipient:walletAddress,
    }

    const methodParameters = SwapRouter.swapCallParameters([trade],options)

    const tx = {
        data:methodParameters.calldata,
        to:UNISWAPV3_ROUTER_ADDRESS,
        value:methodParameters.value,
        from:walletAddress,
        // maxFeePerGas:MAX_FEE_PER_GAS,
        // maxPriorityFeePerGas:MAX_PRIORITY_FEE_PER_GAS,
    }

    const res = await sendTransaction(tx);
    return res
}

export async function getOutputQuote(route:Route<Currency,Currency>){
    const provider = getProvider();

    if(!provider){
        throw new Error('Provider required to get pool state');
    }

    const { calldata } = await SwapQuoter.quoteCallParameters(
        route,
        CurrencyAmount.fromRawAmount(
            CurrentConfig.tokens.in,
            fromReadableAmount(
                CurrentConfig.tokens.amountIn,
                CurrentConfig.tokens.in.decimals
            ).toString()
        ),
        TradeType.EXACT_INPUT,
        {
            useQuoterV2:true,
        }
    )

    const quoteCallReturnData = await provider.call({
        to:QUOTER_CONTRACT_ADDRESS,
        data:calldata
    })

    return quoteCallReturnData;

    // return ethers.utils.defaultAbiCoder.decode(['uint256'],quoteCallReturnData)

}

export async function getTokenTransferApproval(
    tokenContract:ethers.Contract,
    routerAddress:string,
    token:Token,
    amountIn:number
):Promise<ethers.TransactionReceipt>{
    const provider = getProvider();
    const address = getWalletAddress()
    if(!provider || !address){
        throw new Error("no provider");
    }


    const transaction = await tokenContract.approve.populateTransaction(
        routerAddress,
        fromReadableAmount(
            amountIn,
            token.decimals
        ).toString()
    )

    return sendTransaction(transaction)

}


export async function getInTokenTransferApproval(
    tokenContract:ethers.Contract,
    routerAddress:string,
    token:Token,
    amountIn:number
):Promise<ethers.TransactionReceipt>{
    const provider = getProvider();
    const address = getWalletAddress()
    if(!provider || !address){
        throw new Error("no provider");
    }

    const transaction = await tokenContract.approve.populateTransaction(
        routerAddress,
        amountIn
    )

    return sendTransaction(transaction)

}


export async function getOutTokenTransferApproval(
    token:Token,
    amountOut:BigInt
):Promise<ethers.TransactionReceipt>{
    const provider = getProvider();
    const address = getWalletAddress()
    if(!provider || !address){
        throw new Error("no provider");
    }

    const tokenContract = new ethers.Contract(
        token.address,
        ERC20_ABI,
        provider
    )

    const transaction = await tokenContract.approve.populateTransaction(
        UNISWAPV3_ROUTER_ADDRESS,
        amountOut
    )

    return sendTransaction(transaction)

}