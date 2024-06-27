import {
    AlphaRouter,
    SwapOptionsSwapRouter02,
    SwapRoute,
    SwapType,
  } from '@uniswap/smart-order-router'
  import { TradeType, CurrencyAmount, Percent, Token,ChainId } from '@uniswap/sdk-core';
  import { CurrentConfig } from '../config'
  import {
    getMainnetProvider,
    getWalletAddress,
    sendTransaction,
    TransactionState,
    getProvider,
  } from './providers'
  import {
    MAX_FEE_PER_GAS,
    MAX_PRIORITY_FEE_PER_GAS,
    ERC20_ABI,
    TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
    SWAP_ROUTER_ADDRESS,
    CHAINID,
  } from './constants'
  import { ethers } from 'ethers'
import { fromReadableAmount } from './utils';
import { Trade } from '@uniswap/v2-sdk';
import { getTokenTransferApproval } from './trading';
  

  export async function generateRoute():Promise<SwapRoute|null>{
    const router = new AlphaRouter({
        chainId:CHAINID,
        provider:getMainnetProvider()
    })

    const options:SwapOptionsSwapRouter02 = {
        recipient:CurrentConfig.wallet.address,
        slippageTolerance:new Percent(50,10_000),
        deadline:Math.floor(Date.now() / 1000 + 1800),
        type:SwapType.SWAP_ROUTER_02,
    }

    const route = await router.route(
        CurrencyAmount.fromRawAmount(
            CurrentConfig.tokens.in,
            fromReadableAmount(
                CurrentConfig.tokens.amountIn,
                CurrentConfig.tokens.in.decimals
            ).toString()
        ),
        CurrentConfig.tokens.out,
        TradeType.EXACT_INPUT,
        options
    )
    return route;
  }

  export async function executeRoute(
    route:SwapRoute
  ):Promise<TransactionState>{
    const walletAddress = getWalletAddress();
    const provider = getProvider();

    if(!walletAddress || !provider){
        throw new Error('Cannot execute a route without a wallet');
    }

    const tokenApproval = await getTokenTransferApproval(CurrentConfig.tokens.in);
    if (tokenApproval !== TransactionState.Sent) {
        return TransactionState.Failed
    }

    const res = await sendTransaction({
        data:route.methodParameters?.calldata,
        to:SWAP_ROUTER_ADDRESS,
        value:route?.methodParameters?.value,
        from:walletAddress,
        maxFeePerGas:MAX_FEE_PER_GAS,
        maxPriorityFeePerGas:MAX_PRIORITY_FEE_PER_GAS
    })
    return res;
  }