import {ChainId,Token,WETH9,CurrencyAmount,TradeType,Percent} from "@uniswap/sdk-core";
import {Pair,Route,Trade} from "@uniswap/v2-sdk";
import { ethers, providers, BigNumberish } from 'ethers';
import * as fs from 'fs';
import { getAddress } from 'ethers/lib/utils';
import { Rounding } from "@dynamic-amm/sdk";
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

const ZRO_CONTRACT_ADDRESS = "0x6985884C4392D348587B19cb9eAAf157F13271cd";
const ZRO_CONTRACT_ABI = fs.readFileSync("./contracts/abis/ZROAbi.json").toString();
const ZRO_CONTRACT = new ethers.Contract(ZRO_CONTRACT_ADDRESS,ZRO_CONTRACT_ABI,WALLET);


const CRV_CONTRACT_ADDRESS = "0xD533a949740bb3306d119CC777fa900bA034cd52";
const CRV_CONTRACT_ABI = fs.readFileSync("./contracts/abis/CRVAbi.json").toString();
const CRV_CONTRACT = new ethers.Contract(CRV_CONTRACT_ADDRESS,CRV_CONTRACT_ABI,WALLET);

const DATA = {
    "UNI":{
        address:UNI_CONTRACT_ADDRESS,
        abi:UNI_CONTRACT_ABI,
        contract:UNI_CONTRACT
    },
    "DAI":{
        address:DAI_CONTRACT_ADDRESS,
        abi:DAI_CONTRACT_ABI,
        contract:DAI_CONTRACT
    },
    // "CRV":{
    //     address:CRV_CONTRACT_ADDRESS,
    //     abi:CRV_CONTRACT_ABI,
    //     contract:CRV_CONTRACT
    // }
}


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
 * @param tokenA :OUTPUT TOKEN
 * @param tokenB :WETH,INPUT TOKEN
 * @returns 
 */
async function createPair(tokenA:Token,tokenB:Token):Promise<Pair>{
    const pairAddress = Pair.getAddress(tokenA, tokenB);
    const pairContract = new ethers.Contract(pairAddress, UNISWAP_PAIR_ABI, PROVIDER)
    const reserves = await pairContract["getReserves"]()
    const [reserve0, reserve1] = reserves

    const tokens = [tokenA, tokenB]
    const [token0, token1] = tokens[0].sortsBefore(tokens[1]) ? tokens : [tokens[1], tokens[0]]

    const pair = new Pair(CurrencyAmount.fromRawAmount(token0, reserve0), CurrencyAmount.fromRawAmount(token1, reserve1))
    console.log(`${token0.symbol}-${token1.symbol} address:${pairAddress}`);
    return pair;
}

/**
 * 测试在UniswapV2 交换代币的完成流程
 * 包含直接交换，间接交换
 * swap的完整过程如下：
 * 1. 创建Token对象
 * 2. 创建Pair 对象
 *    pair对象规定了交易的输入token和输出token，pair对象第一个值指的是输出token（目标token）,第二个值指的是输入token
 * 3. 创建Route 路由对象
 *    路由对象可以包含一个或多个pair,规定了输入代币到输出代币的完整路径
 *      constructor(pairs: Pair[], input: TInput, output: TOutput)
 * 
 * 4. 创建Trade 交易对象
 *    由交易路由(trade) 创建的Trade 对象，trade 并不能直接发送交易，但是可以计算进行出安全交易相关的参数
 *    输入参数如下：
 *      交易量
 *      交易的滑点容差(slippage tolerance)
 *      交易类型TradeType，有两种交易类型    EXACT_INPUT = 0,EXACT_OUTPUT = 1 对应Swap函数的精确输入token交易量和精确输出token交易量
 *    输出参数如下：
 *      执行价格(execution price)
 *      计算最小的输出代币数量(amountOutMin) 
 *      计算最大的输入代币数量(amountInMax)     
 *      
 *
 *      
 * 5. 创建交易参数
 *    contract.populateTransaction.swapExactETHForTokens
 *    swapExactETHForTokens 是UniswapV2 router 中的一个交换代币的函数
 *    Exact在前规定的是输入代币的数量，Exact在后规定的是输出代币的数量
 *    一个UniswapV2 的函数，如果有payable 关键字，表示该函数可以接收ETH
 *    因此在调用的SwapExactETHForTokens 的时候需要额外增加一个参数:value
 *    SwapExactETHForTokens 函数没有输入代币的数量，由value 规定输入代币的数量
 *    
 *      从步骤1到步骤4 只是为了获取amountOutMin 这个参数,1到4这个过程能否直接省略，
 *      直接调用合约中的getAmountOut 函数计算 最小的代币输出量
 * 
 *    
 *      
 */
async function firstDemo(){
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

    const amountIn = ethers.utils.parseEther("0.1").toString();
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

    console.log("\nrawTxn:\n",rawTxn);
    console.log("\nsendTxn:\n",sendTxn);
    console.log("\nreciept:\n",reciept);

}



/**
 * erc20 token 合约授权给UniswapV2 router 合约amount 数量的token ,用于swap
 * @param CONTRACT: erc20代币contract,用于调用授权函数(approve)
 * @param amount token 合约授权给Router合约的数量
 */
async function approve(CONTRACT:ethers.Contract,amount:string) {
    try {
        const approveTx = await CONTRACT.approve(UNISWAP_ROUTER_ADDRESS, ethers.utils.parseUnits(amount));
        const approveReceipt = await approveTx.wait();
        // console.log("approveTx:",approveTx);
        // console.log("approveReceipt:",approveReceipt);
        console.log("approve txHash:",approveReceipt.transactionHash);
    } catch(e) {
        console.log(e)
    }
    
}

/**
 * 指定精确ETH的数量兑换目标token
 * @param token1 :输出token
 * @param token2 :输入token
 * @param amount :输入token 的数量
 * @param slippage 
 */

async function swapExactEthForTokens(token1:Token,token2:Token,amount:string,slippage = "50"){
    try{
        const pair = await createPair(token1,token2);                                       //creating instance of a pair
        const route = await new Route([pair],token2,token1);                                // a a full specified path from input token to output token
        const midprice = route.midPrice.toSignificant();
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.toSignificant()}`,);
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.invert().toSignificant()}`,);

        const amountIn = ethers.utils.parseEther(amount).toString();                        // helper function to convert ETH to Wei
        console.log("amountIn:",ethers.utils.formatEther(amountIn));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.numerator.toString(),slippageTolerance.denominator.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(route,CurrencyAmount.fromRawAmount(token2,amountIn),
        TradeType.EXACT_INPUT);                                                             //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        console.log("Direct Execution Price:",trade.executionPrice.toSignificant());



        const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact();                 // 指定这次交易在滑点容差0.005的情况下，获取到的最小数量的目标token
        const amountOutMinHex = ethers.utils.parseUnits(amountOutMin).toHexString();
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.inputAmount.toExact();                          
        const valueHex = ethers.utils.parseUnits(value).toHexString();
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        // console.log("UniswapV2 route address:",UNISWAP_ROUTER_ADDRESS);
        // console.log("slippageTolerance:",slippageTolerance.toSignificant());
        console.log("amountOutMin:",amountOutMin);
        // console.log("amountOutMinHex:",amountOutMinHex);
    
    
        // console.log("path:",path);
        // console.log("to:",to);
        // console.log("deadline:",deadline);
        // console.log("amountIn:",value);
        // console.log("valueHex:",valueHex);

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.
        

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

        // console.log("\nrawTxn:\n",rawTxn);
        // console.log("\nsendTxn:\n",sendTxn);
        // console.log("\nreciept:\n",reciept);
        let gasUsed = reciept.cumulativeGasUsed;
        let gasPrice = reciept.effectiveGasPrice;
        let transferFeeEther = gasUsed.mul(gasPrice);
        // let transferFeeDollar = transferFeeEther.mul(3500);    
        let txhash = reciept.transactionHash;
        console.log(`swap transactionHash:${txhash}\ntransferFeeEther:${ethers.utils.formatEther(transferFeeEther)} \nmidprice:${midprice}\n\n`);
       

    }catch (e)
    {
        console.log(e);
    }
}



/**
 * 指定精确token2的数量兑换目标token1
 * @param token1 :输出token
 * @param token2 :输入token
 * @param amount :输入token 的数量
 * @param slippage 
 */

async function swapExactTokensForTokens(token1:Token,token2:Token,amount:string,token2Contract:ethers.Contract,slippage = "50"){
    try{
        console.log(`Swap target token:${token1.symbol} input token:${token2.symbol}`);
        const pair = await createPair(token1,token2);                                       //creating instance of a pair
        const route = await new Route([pair],token2,token1);                                // a a full specified path from input token to output token
        const midprice = route.midPrice.toSignificant();
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.toSignificant()}`,);
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.invert().toSignificant()}`,);

        const amountIn = ethers.utils.parseEther(amount).toString();                        // helper function to convert ETH to Wei
        console.log("amountIn wei:",amountIn);
        console.log("amountIn ether:",ethers.utils.formatEther(amountIn));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.quotient.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(route,CurrencyAmount.fromRawAmount(token2,amountIn),
        TradeType.EXACT_INPUT);                                                             //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        console.log("Direct Execution Price:",trade.executionPrice.toSignificant());



        const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact();                 // 指定这次交易在滑点容差0.005的情况下，获取到的最小数量的目标token
        const amountOutMinHex = ethers.utils.parseUnits(amountOutMin).toHexString();
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.inputAmount.toExact();                          
        const valueHex = ethers.utils.parseUnits(value).toHexString();
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        console.log("slippageTolerance:",slippageTolerance.toSignificant());
        console.log("amountOutMin:",amountOutMin);
    
    
        console.log("to:",to);
        console.log("value:",value);

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.
        
        // approve
        await approve(token2Contract,amount);

        // send transaction
        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactTokensForTokens(
            valueHex,
            amountOutMinHex,
            path,
            to,
            deadline,
            {
                maxPriorityFeePerGas:ethers.utils.parseUnits("1","gwei")
            }
        );

        let sendTxn = await WALLET.sendTransaction(rawTxn);

        let reciept = await sendTxn.wait();

        // console.log("\nrawTxn:\n",rawTxn);
        // console.log("\nsendTxn:\n",sendTxn);
        // console.log("\nreciept:\n",reciept);
        let gasUsed = reciept.cumulativeGasUsed;
        let gasPrice = reciept.effectiveGasPrice;
        let transferFeeEther = gasUsed.mul(gasPrice);
        // let transferFeeDollar = transferFeeEther.mul(3500);    
        let txhash = reciept.transactionHash;
        console.log(`transactionHash:${txhash}\ntransferFeeEther:${ethers.utils.formatEther(transferFeeEther)} \nmidprice:${midprice}`);
       

    }catch (e)
    {
        console.log(e);
    }
}


/**
 * 指定精确token2的数量兑换目标token1
 * @param token1 :输出token
 * @param token2 :输入token
 * @param amount :输入token 的数量
 * @param slippage 
 */

async function swapExactTokensForTokensSupportingFeeOnTransferTokens(token1:Token,token2:Token,amount:string,token2Contract:ethers.Contract,slippage = "50"){
    try{
        console.log(`\n\nSwap target token:${token1.symbol} input token:${token2.symbol}`);
        const pair = await createPair(token1,token2);                                       //creating instance of a pair
        const route = await new Route([pair],token2,token1);                                // a a full specified path from input token to output token
        const midprice = route.midPrice.toSignificant();
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.toSignificant()}`,);
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.invert().toSignificant()}`,);

        const amountIn = ethers.utils.parseEther(amount).toString();                        // helper function to convert ETH to Wei
        console.log("amountIn :",ethers.utils.formatEther(amountIn));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.quotient.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(route,CurrencyAmount.fromRawAmount(token2,amountIn),
        TradeType.EXACT_INPUT);                                                             //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        console.log("Direct Execution Price:",trade.executionPrice.toSignificant());



        const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact();                 // 指定这次交易在滑点容差0.005的情况下，获取到的最小数量的目标token
        const amountOutMinHex = ethers.utils.parseUnits(amountOutMin).toHexString();
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.inputAmount.toExact();                          
        const valueHex = ethers.utils.parseUnits(value).toHexString();
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        console.log("slippageTolerance:",slippageTolerance.toSignificant());
        console.log("amountOutMin:",amountOutMin);
    
    
        console.log("to:",to);
        console.log("value:",value);

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.
        
        // approve
        await approve(token2Contract,amount);

        // send transaction
        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            valueHex,
            amountOutMinHex,
            path,
            to,
            deadline,
            {
                maxPriorityFeePerGas:ethers.utils.parseUnits("1","gwei")
            }
        );

        let sendTxn = await WALLET.sendTransaction(rawTxn);

        let reciept = await sendTxn.wait();

        // console.log("\nrawTxn:\n",rawTxn);
        // console.log("\nsendTxn:\n",sendTxn);
        // console.log("\nreciept:\n",reciept);
        let gasUsed = reciept.cumulativeGasUsed;
        let gasPrice = reciept.effectiveGasPrice;
        let transferFeeEther = gasUsed.mul(gasPrice);
        // let transferFeeDollar = transferFeeEther.mul(3500);    
        let txhash = reciept.transactionHash;
        console.log(`transactionHash:${txhash}\ntransferFeeEther:${ethers.utils.formatEther(transferFeeEther)} \nmidprice:${midprice}`);
       

    }catch (e)
    {
        console.log(e);
    }
}



/**
 * 指定精确ETH 数量兑换token，支持转账时扣除手续费
 * @param token1 :输出token
 * @param token2 :输入token，ETH
 * @param amount :输入token 的数量
 * @param slippage 
 */

async function swapExactETHForTokensSupportingFeeOnTransferTokens(token1:Token,token2:Token,amount:string,slippage = "50"){
    try{
        const pair = await createPair(token1,token2);                                       //creating instance of a pair
        const route = await new Route([pair],token2,token1);                                // a a full specified path from input token to output token
        const midprice = route.midPrice.toSignificant();
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.toSignificant()}`,);
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.invert().toSignificant()}`,);

        const amountIn = ethers.utils.parseEther(amount).toString();                        // helper function to convert ETH to Wei
        console.log("amountIn:",ethers.utils.formatEther(amountIn));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.numerator.toString(),slippageTolerance.denominator.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(route,CurrencyAmount.fromRawAmount(token2,amountIn),
        TradeType.EXACT_INPUT);                                                             //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        console.log("Direct Execution Price:",trade.executionPrice.toSignificant());



        const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact();                 // 指定这次交易在滑点容差0.005的情况下，获取到的最小数量的目标token
        const amountOutMinHex = ethers.utils.parseUnits(amountOutMin).toHexString();
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.inputAmount.toExact();                          
        const valueHex = ethers.utils.parseUnits(value).toHexString();
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        // console.log("UniswapV2 route address:",UNISWAP_ROUTER_ADDRESS);
        // console.log("slippageTolerance:",slippageTolerance.toSignificant());
        console.log("amountOutMin:",amountOutMin);
        // console.log("amountOutMinHex:",amountOutMinHex);
    
    
        // console.log("path:",path);
        // console.log("to:",to);
        // console.log("deadline:",deadline);
        // console.log("amountIn:",value);
        // console.log("valueHex:",valueHex);

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.
        

        // send transaction
        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactETHForTokensSupportingFeeOnTransferTokens(
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

        // console.log("\nrawTxn:\n",rawTxn);
        // console.log("\nsendTxn:\n",sendTxn);
        // console.log("\nreciept:\n",reciept);
        let gasUsed = reciept.cumulativeGasUsed;
        let gasPrice = reciept.effectiveGasPrice;
        let transferFeeEther = gasUsed.mul(gasPrice);
        // let transferFeeDollar = transferFeeEther.mul(3500);    
        let txhash = reciept.transactionHash;
        console.log(`swap transactionHash:${txhash}\ntransferFeeEther:${ethers.utils.formatEther(transferFeeEther)} \nmidprice:${midprice}\n\n`);
       

    }catch (e)
    {
        console.log(e);
    }
}


/**
 * 指定精确token的数量兑换目标ETH
 * @param token1 :输出token
 * @param token2 :WETH
 * @param amount :输入token 的数量
 * @param slippage 
 */

async function swapExactTokensForETH(token1:Token,token2:Token,amount:string,token2Contract:ethers.Contract,slippage = "50",){
    try{
        console.log(`Swap target token:${token1.symbol} input token:${token2.symbol}`);
        const pair = await createPair(token1,token2);                                       //creating instance of a pair
        const route = await new Route([pair],token2,token1);                                // a a full specified path from input token to output token
        const midprice = route.midPrice.toSignificant();
        console.log(`Direct Swap ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.toSignificant()}`,);
        console.log(`Direct Swap ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.invert().toSignificant()}`,);

        const amountIn = ethers.utils.parseEther(amount).toString();                        // helper function to convert ETH to Wei
        console.log("amountIn ether:",ethers.utils.formatEther(amountIn));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.numerator.toString(),slippageTolerance.denominator.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(route,CurrencyAmount.fromRawAmount(token2,amountIn),
        TradeType.EXACT_INPUT);                                                             //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        console.log("Direct Execution Price:",trade.executionPrice.toSignificant());



        const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact();                 // 指定这次交易在滑点容差0.005的情况下，获取到的最小数量的目标token
        const amountOutMinHex = ethers.utils.parseUnits(amountOutMin).toHexString();
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.inputAmount.toExact();                          
        const valueHex = ethers.utils.parseUnits(value).toHexString();
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        // console.log("UniswapV2 route address:",UNISWAP_ROUTER_ADDRESS);
        // console.log("slippageTolerance:",slippageTolerance.toSignificant());
        console.log("amountOutMin:",amountOutMin);
        // console.log("amountOutMinHex:",amountOutMinHex);
    
    
        // console.log("path:",path);
        // console.log("to:",to);
        // console.log("deadline:",deadline);
        // console.log("amountIn:",value);
        // console.log("valueHex:",valueHex);

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.
        
        // approve
        await approve(token2Contract,amount);

        // send transaction
        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactTokensForETH(
            valueHex,
            amountOutMinHex,
            path,
            to,
            deadline,
            {
                gasLimit:ethers.utils.parseUnits('200000', 'wei'),
                maxPriorityFeePerGas:ethers.utils.parseUnits("1","gwei")
            }
        );

        let sendTxn = await WALLET.sendTransaction(rawTxn);

        let reciept = await sendTxn.wait();

        // console.log("\nrawTxn:\n",rawTxn);
        // console.log("\nsendTxn:\n",sendTxn);
        // console.log("\nreciept:\n",reciept);
        let gasUsed = reciept.cumulativeGasUsed;
        let gasPrice = reciept.effectiveGasPrice;
        let transferFeeEther = gasUsed.mul(gasPrice);
        // let transferFeeDollar = transferFeeEther.mul(3500);    
        let txhash = reciept.transactionHash;
        console.log(`transactionHash:${txhash}\ntransferFeeEther:${ethers.utils.formatEther(transferFeeEther)} \nmidprice:${midprice}\n\n`);
       

    }catch (e)
    {
        console.log(e);
    }
}



/**
 * 指定精确token的数量兑换目标ETH，在转账时扣除手续费
 * @param token1 :输出token
 * @param token2 :WETH
 * @param amount :输入token 的数量
 * @param slippage 
 */

async function swapExactTokensForETHSupportingFeeOnTransferTokens(token1:Token,token2:Token,amount:string,token2Contract:ethers.Contract,slippage = "50",){
    try{
        console.log(`Swap target token:${token1.symbol} input token:${token2.symbol}`);
        const pair = await createPair(token1,token2);                                       //creating instance of a pair
        const route = await new Route([pair],token2,token1);                                // a a full specified path from input token to output token
        const midprice = route.midPrice.toSignificant();
        console.log(`Direct Swap ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.toSignificant()}`,);
        console.log(`Direct Swap ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.invert().toSignificant()}`,);

        const amountIn = ethers.utils.parseEther(amount).toString();                        // helper function to convert ETH to Wei
        console.log("amountIn ether:",ethers.utils.formatEther(amountIn));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.numerator.toString(),slippageTolerance.denominator.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(route,CurrencyAmount.fromRawAmount(token2,amountIn),
        TradeType.EXACT_INPUT);                                                             //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        console.log("Direct Execution Price:",trade.executionPrice.toSignificant());



        const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact();                 // 指定这次交易在滑点容差0.005的情况下，获取到的最小数量的目标token
        const amountOutMinHex = ethers.utils.parseUnits(amountOutMin).toHexString();
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.inputAmount.toExact();                          
        const valueHex = ethers.utils.parseUnits(value).toHexString();
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        // console.log("UniswapV2 route address:",UNISWAP_ROUTER_ADDRESS);
        // console.log("slippageTolerance:",slippageTolerance.toSignificant());
        console.log("amountOutMin:",amountOutMin);
        // console.log("amountOutMinHex:",amountOutMinHex);
    
    
        // console.log("path:",path);
        // console.log("to:",to);
        // console.log("deadline:",deadline);
        // console.log("amountIn:",value);
        // console.log("valueHex:",valueHex);

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.
        
        // approve
        await approve(token2Contract,amount);

        // send transaction
        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactTokensForETH(
            valueHex,
            amountOutMinHex,
            path,
            to,
            deadline,
            {
                gasLimit:ethers.utils.parseUnits('200000', 'wei'),
                maxPriorityFeePerGas:ethers.utils.parseUnits("1","gwei")
            }
        );

        let sendTxn = await WALLET.sendTransaction(rawTxn);

        let reciept = await sendTxn.wait();

        // console.log("\nrawTxn:\n",rawTxn);
        // console.log("\nsendTxn:\n",sendTxn);
        // console.log("\nreciept:\n",reciept);
        let gasUsed = reciept.cumulativeGasUsed;
        let gasPrice = reciept.effectiveGasPrice;
        let transferFeeEther = gasUsed.mul(gasPrice);
        // let transferFeeDollar = transferFeeEther.mul(3500);    
        let txhash = reciept.transactionHash;
        console.log(`transactionHash:${txhash}\ntransferFeeEther:${ethers.utils.formatEther(transferFeeEther)} \nmidprice:${midprice}\n\n`);
       

    }catch (e)
    {
        console.log(e);
    }
}


async function getERC20Balance(myAddress:string,CONTRACT_ADDRESS:string,CONTRACT_ABI:string):Promise<number>{

    // const erc20Abi =  [
    //     "uint8   public constant decimals",
    //     "function balanceOf(address) public view returns(uint)",
    //     "function deposit() public payable",
    //     "function transfer(address, uint) public returns (bool)",
    //     "function withdraw(uint) public",
    // ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS,CONTRACT_ABI,PROVIDER);
    // const symbol = await contract.name();
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(myAddress)
    // console.log("symbol:",symbol);
    // console.log("decimals:",decimals);
    // console.log("balance:",ethers.utils.formatUnits(balance,decimals));
    return balance;
}



/**
 * 通过token2 兑换指定数量的ETH
 * @param token1 :输出token
 * @param token2 :输入token
 * @param amount :输入token 的数量
 * @param slippage 
 */

async function swapTokensForExactETH(token1:Token,token2:Token,amount:string,token2Contract:ethers.Contract,slippage = "50"){
    try{
        console.log(`Swap target token:${token1.symbol} input token:${token2.symbol}`);
        const pair = await createPair(token1,token2);                                       //creating instance of a pair
        const route = await new Route([pair],token2,token1);                                // a a full specified path from input token to output token
        const midprice = route.midPrice.toSignificant();
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.toSignificant()}`,);
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.invert().toSignificant()}`,);

        const amountOut = ethers.utils.parseEther(amount).toString();                        // helper function to convert ETH to Wei
        console.log("amountOut wei:",amountOut);
        console.log("amountOut ether:",ethers.utils.formatEther(amountOut));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.quotient.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(route,CurrencyAmount.fromRawAmount(token1,amountOut),
        TradeType.EXACT_OUTPUT);                                                             //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        console.log("Direct Execution Price:",trade.executionPrice.toSignificant());



        const amountInMax = trade.maximumAmountIn(slippageTolerance).toExact();             // 指定这次交易在滑点容差0.005的情况下，最大输入代币的数量
        const amountInMaxHex = ethers.utils.parseUnits(amountInMax).toHexString();
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.outputAmount.toExact();              
        const valueHex = ethers.utils.parseUnits(value).toHexString();
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        console.log("slippageTolerance:",slippageTolerance.toSignificant());
        console.log("amountInMax:",amountInMax);
    
    
        console.log("to:",to);
        console.log("value:",value);

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.
        
        // approve
        await approve(token2Contract,amountInMax);

        // send transaction
        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapTokensForExactETH(
            valueHex,
            amountInMaxHex,
            path,
            to,
            deadline,
            {
                gasLimit:ethers.utils.parseUnits('200000', 'wei'),
                // maxPriorityFeePerGas:ethers.utils.parseUnits("5","gwei"),
                // maxFeePerGas:ethers.utils.parseUnits("5","gwei"),
            }
        );

        let sendTxn = await WALLET.sendTransaction(rawTxn);

        let reciept = await sendTxn.wait();

        // console.log("\nrawTxn:\n",rawTxn);
        // console.log("\nsendTxn:\n",sendTxn);
        // console.log("\nreciept:\n",reciept);
        let gasUsed = reciept.cumulativeGasUsed;
        let gasPrice = reciept.effectiveGasPrice;
        let transferFeeEther = gasUsed.mul(gasPrice);
        // let transferFeeDollar = transferFeeEther.mul(3500);    
        let txhash = reciept.transactionHash;
        console.log(`transactionHash:${txhash}\ntransferFeeEther:${ethers.utils.formatEther(transferFeeEther)} \nmidprice:${midprice}`);
       

    }catch (e)
    {
        console.log(e);
    }
}




/**
 * 通过ETH 兑换指定数量的token
 * @param token1 :输出token
 * @param token2 :输入token
 * @param amount :输入token 的数量
 * @param slippage 
 */

async function swapETHForExactTokens(token1:Token,token2:Token,amount:string,slippage = "50"){
    try{
        console.log(`Swap target token:${token1.symbol} input token:${token2.symbol}`);
        const pair = await createPair(token1,token2);                                       //creating instance of a pair
        const route = await new Route([pair],token2,token1);                                // a a full specified path from input token to output token
        const midprice = route.midPrice.toSignificant();
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.toSignificant()}`,);
        console.log(`Direct ${token1.symbol}-${token2.symbol} mid price:${route.midPrice.invert().toSignificant()}`,);

        const amountOut = ethers.utils.parseEther(amount).toString();                        // helper function to convert ETH to Wei
        console.log("amountOut wei:",amountOut);
        console.log("amountOut ether:",ethers.utils.formatEther(amountOut));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.quotient.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(route,CurrencyAmount.fromRawAmount(token1,amountOut),
        TradeType.EXACT_OUTPUT);                                                             //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        console.log("Direct Execution Price:",trade.executionPrice.toSignificant());



        const amountInMax = trade.maximumAmountIn(slippageTolerance).toExact();             // 指定这次交易在滑点容差0.005的情况下，最大输入代币的数量
        const amountInMaxHex = ethers.utils.parseUnits(amountInMax).toHexString();
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.outputAmount.toExact();              
        const valueHex = ethers.utils.parseUnits(value).toHexString();
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        console.log("slippageTolerance:",slippageTolerance.toSignificant());
        console.log("amountInMax:",amountInMax);
    
    
        console.log("to:",to);
        console.log("value:",value);

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.
        

        // send transaction
        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapETHForExactTokens(
            valueHex,
            path,
            to,
            deadline,
            {
                value:amountInMaxHex,
                gasLimit:ethers.utils.parseUnits('200000', 'wei'),
                // maxPriorityFeePerGas:ethers.utils.parseUnits("5","gwei"),
                // maxFeePerGas:ethers.utils.parseUnits("5","gwei"),
            }
        );

        let sendTxn = await WALLET.sendTransaction(rawTxn);

        let reciept = await sendTxn.wait();

        // console.log("\nrawTxn:\n",rawTxn);
        // console.log("\nsendTxn:\n",sendTxn);
        // console.log("\nreciept:\n",reciept);
        let gasUsed = reciept.cumulativeGasUsed;
        let gasPrice = reciept.effectiveGasPrice;
        let transferFeeEther = gasUsed.mul(gasPrice);
        // let transferFeeDollar = transferFeeEther.mul(3500);    
        let txhash = reciept.transactionHash;
        console.log(`transactionHash:${txhash}\ntransferFeeEther:${ethers.utils.formatEther(transferFeeEther)} \nmidprice:${midprice}`);
       

    }catch (e)
    {
        console.log(e);
    }
}


async function main() {


    // await firstDemo();


    const chainId = 31337;
    const decimals = 18
    const DAI = new Token(chainId,DAI_CONTRACT_ADDRESS,18,'DAI','Dai Stablecoin');
    const weth:Token = new Token(chainId,WETH_CONTRACT_ADDRESS,18,'WETH','Wrapped Ether');
    const USDC:Token = new Token(chainId,USDC_CONTRACT_ADDRESS,6,"USDC");
    const UNI:Token = new Token(chainId,UNI_CONTRACT_ADDRESS,18,"UNI");
    const ZRO:Token = new Token(chainId,ZRO_CONTRACT_ADDRESS,18,"ZRO");
    const CRV:Token = new Token(chainId,CRV_CONTRACT_ADDRESS,18,"CRV");

    console.log(`The chainId is ${chainId}`);


    let beforeBalance = await PROVIDER.getBalance(WALLET.address);
    let beforeDaiBalance = await getERC20Balance(WALLET.address,DAI.address,DAI_CONTRACT_ABI);
    let beforeUniBalance = await getERC20Balance(WALLET.address,UNI.address,UNI_CONTRACT_ABI);


    // 指定ETH数量兑换token
    await swapExactEthForTokens(UNI,weth,"0.2");
    await swapExactEthForTokens(DAI,weth,"0.2");
    // 指定ETH数量兑换token,在转账时扣费
    // await swapExactETHForTokensSupportingFeeOnTransferTokens(DAI,weth,"0.01");


    // 指定token数量兑换ETH
    // await swapExactTokensForETH(weth,DAI,"50",DAI_CONTRACT);
    // await swapExactTokensForETH(weth,UNI,"10",UNI_CONTRACT);
    // await swapExactTokensForETHSupportingFeeOnTransferTokens(weth,UNI,"10",UNI_CONTRACT);


    // 指定token数量兑换兑换其他token
    // await swapExactTokensForTokens(DAI,UNI,"1",UNI_CONTRACT);
    // await swapExactTokensForTokens(UNI,DAI,"10",DAI_CONTRACT);

    // 指定token 数量兑换其他token,支持转账时扣费
    // await swapExactTokensForTokensSupportingFeeOnTransferTokens(DAI,UNI,"10",UNI_CONTRACT);
    // await swapExactTokensForTokensSupportingFeeOnTransferTokens(UNI,DAI,"100",DAI_CONTRACT);

    // 用ERC20 token 兑换指定数量的ETH
    // await swapTokensForExactETH(weth,UNI,"0.01",UNI_CONTRACT,"50");
    // await swapETHForExactTokens(UNI,weth,"10");


    console.log("before swap ether:",ethers.utils.formatEther(beforeBalance.toString()))
    console.log("before swap DAI balance:",ethers.utils.formatUnits(beforeDaiBalance,18));
    console.log("before swap UNI balance:",ethers.utils.formatUnits(beforeUniBalance,18));


    let balance = await PROVIDER.getBalance(WALLET.address);
    let daiBalance = await getERC20Balance(WALLET.address,DAI.address,DAI_CONTRACT_ABI);
    let uniBalance = await getERC20Balance(WALLET.address,UNI.address,UNI_CONTRACT_ABI);
    console.log("\nafter swap ether:",ethers.utils.formatEther(balance.toString()));
    console.log("after swap DAI balance:",ethers.utils.formatUnits(daiBalance,18));
    console.log("after swap UNI balance:",ethers.utils.formatUnits(uniBalance,18));

   

    
}

main();
