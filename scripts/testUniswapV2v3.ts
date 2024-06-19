import {ChainId,Token,WETH9,CurrencyAmount,TradeType,Percent} from "@uniswap/sdk-core";
import {Pair,Route,Trade} from "@uniswap/v2-sdk";
import { ethers, providers } from 'ethers';
import * as fs from 'fs';
import { getAddress } from 'ethers/lib/utils';
require("dotenv").config()


// ETH 主链
const ETHMAINNET_API_URL = process.env.ETHMAINNET_API_URL;
const ETHMAINNET_WS_URL = process.env.ETHMAINNET_WS_URL;
const ETHMAINNET_PRIVATE_KEY:string = process.env.ETHMAINNET_PRIVATE_KEY || "";

// 本地测试链
const LOCAL_API_URL = "http://127.0.0.1:8545/";
const LOCAL_PRIVATE_KEY:string = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// holesky 测试链
const HOLESKY_API_URL = process.env.HOLESKY_API_URL;
const HOLESKY_WS_URL = process.env.HOLESKY_WS_URL;
const HOLESKY_PRIVATE_KEY = process.env.HOLESKY_PRIVATE_KEY;

// sepolia 测试链
const SEPOLIA_API_URL = process.env.SEPOLIA_API_URL;
const SEPOLIA_WS_URL = process.env.SEPOLIA_WS_URL;
const SEPOLIA_PRIVATE_KEY:string = process.env.SEPOLIA_PRIVATE_KEY || "";



const API_URL = LOCAL_API_URL;
const WS_URL:string = ETHMAINNET_WS_URL || "";

// const PROVIDER = new ethers.providers.getDefaultProvider(API_URL);
const PROVIDER = new ethers.providers.JsonRpcProvider(API_URL);
const privateKey = LOCAL_PRIVATE_KEY;

// 利用私钥和provider创建wallet对象
if(privateKey === ""){
    console.log("privateKey can't not be null")
    process.exit();
}
const WALLET = new ethers.Wallet(privateKey, PROVIDER);


const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const UNISWAP_ROUTER_ABI =  fs.readFileSync("./contracts/abis/UniswapV2RouterAbi.json").toString();
const UNISWAP_ROUTER_CONTRACT = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, WALLET);

const UNISWAP_PAIR_ADDRESS = "0x3356c9A8f40F8E9C1d192A4347A76D18243fABC5";   //sepolia 链 待定
const UNISWAP_PAIR_ABI = fs.readFileSync("./contracts/abis/UniswapV2PairAbi.json").toString();
const UNISAP_PAIR_CONTRACT = new ethers.Contract(UNISWAP_PAIR_ADDRESS,UNISWAP_PAIR_ABI,PROVIDER)


const WETH_CONTRACT_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
// const WETH_CONTRACT_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
// const WETH_CONTRACT_ADDRESS = "0xB26B2De65D07eBB5E54C7F6282424D3be670E1f0";
// const WETH_CONTRACT_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const WETH_CONTRACT_ABI  = fs.readFileSync("./contracts/abis/WETHAbi.json").toString();
const WETH_CONTRACT =  new ethers.Contract(WETH_CONTRACT_ADDRESS,WETH_CONTRACT_ABI,WALLET);

const UNI_CONTRACT_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const UNI_CONTRACT_ABI = fs.readFileSync("./contracts/abis/UniAbi.json").toString();
const UNI_CONTRACT = new ethers.Contract(UNI_CONTRACT_ADDRESS,UNI_CONTRACT_ABI,WALLET);

const DAI_CONTRACT_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const DAI_CONTRACT_ABI = fs.readFileSync("./contracts/abis/DAIAbi.json").toString();
const DAI_CONTRACT =  new ethers.Contract(DAI_CONTRACT_ADDRESS,DAI_CONTRACT_ABI,WALLET);

const USDC_CONTRACT_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_CONTRACT_ABI = fs.readFileSync("./contracts/abis/USDCAbi.json").toString();
const USDC_CONTRACT = new ethers.Contract(USDC_CONTRACT_ADDRESS,USDC_CONTRACT_ABI,WALLET);


function createDeadLine():number{
    return Math.floor(Date.now()/1000) + 60 * 20; // 20 minutes from the current Unix time
}

/**
 * 获取合约的decimals
 * @param chainId 
 * @param tokenAddress 
 * @param tokenAbi 
 * @returns 
 */
async function getDecimals(chainId:ChainId,tokenAddress:string,tokenAbi:string,):Promise<number>{
    const tokenContract = new ethers.Contract(tokenAddress,tokenAbi,PROVIDER)
    return tokenContract["decimals"]();

}


/**
 * 创建Pair对象，就是交易对对象 比如说DAI/WETH
 * 
 * @param token0 :OUTPUT TOKEN
 * @param token1 :WETH,INPUT TOKEN
 * @returns 
 */
async function createPair(token0:Token,token1:Token):Promise<Pair>{
    const pairAddress = Pair.getAddress(token0,token1);
    const pairContract = new ethers.Contract(pairAddress,UNISWAP_PAIR_ABI,PROVIDER);
    const reserves = await pairContract["getReserves"]();
    const [reserves0,reserves1]  = reserves;
    const tokens = [token0,token1];
    const [tokens0,tokens1] = tokens[0].sortsBefore(tokens[1])? tokens:[tokens[1],tokens[0]];
    const pair = new Pair(CurrencyAmount.fromRawAmount(tokens0,reserves0),CurrencyAmount.fromRawAmount(token1,reserves1));
    console.log(`${token0.symbol}-${token1.symbol} address:${pairAddress}`);
    return pair;
}



async function main() {

    // Create DAI token
    // const chainId = ChainId.MAINNET;
    const chainId = 31337;
    const decimals = 18
    const DAI = new Token(chainId,DAI_CONTRACT_ADDRESS,18,'DAI','Dai Stablecoin');
    const weth:Token = new Token(chainId,WETH_CONTRACT_ADDRESS,18,'WETH','Wrapped Ether');
    const USDC:Token = new Token(chainId,USDC_CONTRACT_ADDRESS,6,"USDC");
    console.log(`The chainId is ${chainId}`);
    console.log("DAI:",DAI);
    console.log("WETH:",weth);
    console.log("USDC:",USDC);



    // create DAI-WETH Pair
    const DAIWETHPair = await createPair(DAI,weth);
    // console.log("pair:",pair);
    // console.log("reserve0:",pair.reserve0);
    // console.log("reserve1:",pair.reserve1);

    console.log("\n\n------------------------------Mid Price-----------------------------------------")
    // Mid price
    // Mid price 指的是在一个交易对中一个资产兑换另一个资产的理论价格
    // 比如说DAI-WETH,mid price 指的是一个WETH可以兑多少个DAI
    // route 可以包含多个pair 对象，并且route对象规定了代币交换的路径
    // 在这个例子中，WETH作为input token ,DAI 作为output token 
    const DAIWETHRoute = new Route([DAIWETHPair],weth,DAI);

    console.log("Direct DAI-WETH mid price:",DAIWETHRoute.midPrice.toSignificant());
    console.log("Direct DAI-WETH mid price invert:",DAIWETHRoute.midPrice.invert().toSignificant(6));

    console.log("\n\n------------------------------Indirect Swap-----------------------------------------")
    // indirect 间接兑换
    // 在下面这个例子中，假设并不存在直接的DAI/WETH 交易对
    // 为了获取DAI-WETH 的价格，我们需要选取一个有效路径（valid route）
    // 假设DAI和WETH 之间存在第三个token：USDC
    // 我们可以通过USDC计算DAI-WETH的间接价格
    const USDCWETHPair = await createPair(USDC,weth);
    const DAIUSDCPair = await createPair(DAI,USDC);

    const indirectRoute = new Route([USDCWETHPair,DAIUSDCPair],weth,DAI);

    console.log("Indirect DAI-USDC-WETH mid price:",indirectRoute.midPrice.toSignificant());
    console.log("Indirect DAI-UDC-WETH mid price invert:",indirectRoute.midPrice.invert().toSignificant());

    // Execution Price
    console.log("\n\n------------------------------Execution Price-----------------------------------------")

    const amountIn = ethers.utils.parseEther("0.001").toString();
    console.log("amountIn wei:",amountIn);
    console.log("amountIn ether:",ethers.utils.formatEther(amountIn));
    const DAIWETHTrade = new Trade(DAIWETHRoute,CurrencyAmount.fromRawAmount(weth,amountIn),TradeType.EXACT_INPUT);
    console.log("Direct Execution Price:",DAIWETHTrade.executionPrice.toSignificant());


    //Trading
    console.log("\n\n------------------------------Trading Price-----------------------------------------")
    const slippageTolerance = new Percent('50','10000');   // 滑点容差 50bips or 0.50%
    const amountOutMin = DAIWETHTrade.minimumAmountOut(slippageTolerance).toExact();  //计算最小输出代币，并且转换为小数字符串
    const amountOutMinHex = ethers.utils.parseUnits(amountOutMin).toHexString();
    // const amountOutMinHex = ethers.BigNumber.from(amountOutMin);
    const path = [weth.address,DAI.address]               // 定义交易路径
    const to = WALLET.address;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
    const value = DAIWETHTrade.inputAmount.toExact();
    const valueHex = ethers.utils.parseUnits(value).toHexString();
    // const valueHex = await ethers.BigNumber.from(value.toString());


    console.log("UniswapV2 route address:",UNISWAP_ROUTER_ADDRESS);
    console.log("slippageTolerance:",slippageTolerance.toSignificant());
    console.log("amountOutMin:",amountOutMin);
    console.log("amountOutMinHex:",amountOutMinHex);


    console.log("path:",path);
    console.log("to:",to);
    console.log("deadline:",deadline);
    console.log("value:",value);
    console.log("valueHex:",valueHex);

    // console.log("valueHex:",valueHex);




    // send transaction
    const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactETHForTokens(
        amountOutMinHex,
        path,
        to,
        deadline,
        {
            value:valueHex,
            maxPriorityFeePerGas:ethers.utils.parseUnits("1","gwei")
        }
    );

    let sendTxn = await WALLET.sendTransaction(rawTxn);

    let reciept = await sendTxn.wait();

    console.log("rawTxn:",rawTxn);
    console.log("sendTxn:",sendTxn);
    console.log("reciept:",reciept);






    
}

main();
