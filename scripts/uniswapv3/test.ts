import { CurrentConfig } from './config';
import { quote,getPoolConstants } from './libs/quote';
import { toReadableAmount } from './libs/conversion';
import { getPoolInfo } from './libs/pool';
import { createTrade, getTokenTransferApproval } from './libs/trading';
import { getOutputQuote,TokenTrade} from './libs/trading';
import { Trade,SwapRouter,SwapQuoter,Pool,Route,SwapOptions } from '@uniswap/v3-sdk';
import { Currency,CurrencyAmount,Percent,Token,TradeType } from '@uniswap/sdk-core';
import { fromReadableAmount } from './libs/utils';
import { JSBI } from 'jsbi';
import { getProvider, getWalletAddress, sendTransaction } from './libs/providers';
import { generateRoute } from './libs/routing';
import { ERC20_ABI, MAX_FEE_PER_GAS, MAX_PRIORITY_FEE_PER_GAS, QUOTER_CONTRACT_ADDRESS, SWAP_ROUTER_ADDRESS } from './libs/constants';
import { ethers } from 'ethers';
import * as fs from 'fs';

const DAI_CONTRACT_ABI = fs.readFileSync("./contracts/abis/DAIAbi.json").toString();
const USDC_CONTRACT_ABI = fs.readFileSync("./contracts/abis/USDCAbi.json").toString();
const WETH_CONTRACT_ABI  = fs.readFileSync("./contracts/abis/WETHAbi.json").toString();
const UNI_CONTRACT_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const UNI_CONTRACT_ABI = fs.readFileSync("./contracts/abis/UniAbi.json").toString();
console.log("abi:",UNI_CONTRACT_ABI);
async function getERC20Balance(myAddress:string,CONTRACT_ADDRESS:string,CONTRACT_ABI:string):Promise<number>{

    // const erc20Abi =  [
    //     "uint8   public constant decimals",
    //     "function balanceOf(address) public view returns(uint)",
    //     "function deposit() public payable",
    //     "function transfer(address, uint) public returns (bool)",
    //     "function withdraw(uint) public",
    // ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS,CONTRACT_ABI,getProvider());
    // const symbol = await contract.name();
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(myAddress)
    // console.log("symbol:",symbol);
    // console.log("decimals:",decimals);
    // console.log("balance:",ethers.utils.formatUnits(balance,decimals));
    return balance;
}

async function main(){
    console.log("Target symbol:",CurrentConfig.tokens.out.symbol);
    console.log(`Input symbol:${CurrentConfig.tokens.in.symbol} amount:${CurrentConfig.tokens.amountIn}`);

    // const amountOut = await quote();
    // console.log(`Target symbol:${CurrentConfig.tokens.out.symbol} amount:${amountOut}`);

//    const trade = await createTrade();
//    console.log(trade);
const poolInfo = await getPoolInfo();
console.log("poolInfos:",poolInfo);


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

    // const amountOut = await getOutputQuote(swapRoute)
    // console.log("amountOut:",amountOut);


    const provider = getProvider();

    if(!provider){
        throw new Error('Provider required to get pool state');
    }

    const { calldata } = await SwapQuoter.quoteCallParameters(
        swapRoute,
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

    console.log("quoteCallReturnData:",quoteCallReturnData);
    // ethers.utils.defaultAbiCoder.decode(['uint256'],quoteCallReturnData)

    const amountOut = await quote();
    console.log("amountOut:",amountOut);



    const trade:TokenTrade = Trade.createUncheckedTrade({
        route:swapRoute,
        inputAmount:CurrencyAmount.fromRawAmount(
            CurrentConfig.tokens.in,
            fromReadableAmount(
                CurrentConfig.tokens.amountIn,
                CurrentConfig.tokens.in.decimals
            ).toString()
        ),
        outputAmount:CurrencyAmount.fromRawAmount(
            CurrentConfig.tokens.out,
            amountOut
        ),
        tradeType:TradeType.EXACT_INPUT
    })
    console.log("uncheckedTrade:",trade);



    /**execute Trade */
    const walletAddress = getWalletAddress();

    if(!walletAddress || !provider){
        throw new Error("Cannot execute a trade without a connected wallet");
    }


    // Give approval to the router to spend the token
    const tokenApproval = await getTokenTransferApproval(CurrentConfig.tokens.in);
    console.log("tokenApproval:",tokenApproval);

    const options:SwapOptions = {
        slippageTolerance: new Percent(50,10_000),// 50 bips,or 0.50%,该滑点指的是这次交易输出token的数量我们能接受的最大百分比
        deadline:Math. floor(Date.now()/1000) + 60 * 10, // 10 minutes from current unix time
        recipient:walletAddress,
    }
    const methodParameters = SwapRouter.swapCallParameters(trade,options)
    const value = ethers.utils.parseUnits(CurrentConfig.tokens.amountIn.toString(),18);
    const valueHex = value.toHexString();

    console.log("methodParameters:",methodParameters);
    console.log("value:",valueHex);
    const tx = {
        data:methodParameters.calldata,
        to:SWAP_ROUTER_ADDRESS,
        value:valueHex,
        from:walletAddress,
        maxFeePerGas:MAX_FEE_PER_GAS,
        maxPriorityFeePerGas:MAX_PRIORITY_FEE_PER_GAS,
    }

    let beforeBalance = await provider.getBalance(walletAddress);
    console.log("before swap ether:",ethers.utils.formatEther(beforeBalance.toString()))

    const res = await sendTransaction(tx);
    console.log("res:",res);

    let afterbalance = await provider.getBalance(walletAddress);
    console.log("after swap ether:",ethers.utils.formatEther(afterbalance.toString()))





}

main();