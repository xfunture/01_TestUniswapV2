import { ethers } from "ethers";
import { Exit } from "hardhat/internal/hardhat-network/provider/vm/exit";
import { ChainId, UNISWAP } from "@uniswap/sdk";
import {Token,WETH,Fetcher,Route,Trade,TokenAmount,TradeType,Percent} from "@uniswap/sdk";
import { getAddress } from "ethers/lib/utils";
import * as fs from 'fs';

// const ethers = require("ethers");
require("dotenv").config()


const SEPOLIA_API_URL = process.env.SEPOLIA_API_URL;

const SEPOLIA_WS_URL = process.env.SEPOLIA_WS_URL;

const SEPOLIA_PRIVATE_KEY:string = process.env.SEPOLIA_PRIVATE_KEY || "";


const ETHMAINNET_API_URL = process.env.ETHMAINNET_API_URL;
const ETHMAINNET_WS_URL = process.env.ETHMAINNET_WS_URL;

const ETHMAINNET_PRIVATE_KEY:string = process.env.ETHMAINNET_PRIVATE_KEY || "";


const API_URL = ETHMAINNET_API_URL;
const WS_URL:string = ETHMAINNET_WS_URL || "";

const addressWETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const addressUniswapV2 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const provider = new ethers.providers.getDefaultProvider(API_URL);


const privateKey = ETHMAINNET_PRIVATE_KEY;

// 利用私钥和provider创建wallet对象
if(privateKey === ""){
    console.log("privateKey can't not be null")
    process.exit();
}
const WALLET = new ethers.Wallet(privateKey, provider);

const UNI_CONTRACT_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const UNI_CONTRACT_ABI = fs.readFileSync("./contracts/abis/UniAbi.json").toString();
const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const UNISWAP_ROUTER_ABI =  fs.readFileSync("./contracts/abis/UniswapV2RouterAbi.json").toString();
const UNISWAP_ROUTER_CONTRACT = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, provider);
const UNI_CONTRACT = new ethers.Contract(UNI_CONTRACT_ADDRESS,UNI_CONTRACT_ABI,WALLET);



function createDeadLine():number{
    return Math.floor(Date.now()/1000) + 60 * 20; // 20 minutes from the current Unix time
}



/**
 * 通过ETH获取输出token
 * 该函数支持使用ETH 进行交换，该函数声明如下：
 * 
    * 指定ETH数量的情况下交换token
    * 该函数的参数：
    * amountOutMin:想要代币的最小数量
    * path:        交换路径，第一个必须是WETH
    * to:          目标地址
    * deadline:    交易截止时间
 * 
 * function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[0] == WETH, 'UniswapV2Router: INVALID_PATH');
        amounts = UniswapV2Library.getAmountsOut(factory, msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);


 * @param token1 : 目标token
 * @param token2 : 我们目前持有的token:ETH
 * @param amount ：输入token 的数量，这里指的是ETH 的数量
 * @param slippage:滑点
 * Slippage tolerance is a setting for the amount of price slippage you are willing to accept for a trade. By setting slippage tolerance, 
 * you basically setting a minimum amount on how many tokens you will accept, in the event that the price increases or decreases. Slippage 
 * tolerance is set as a percentage of the total swap value. For example, if you set slippage tolerance at 3%, it means that the amount of 
 * tokens you will receive can be no higher or lower than 3% of the amount entered. 
 */
async function swapExactEthForTokens(token1:Token,token2:Token,amount:number,slippage = "50"){
    try{
        const pair = await Fetcher.fetchPairData(token1,token2,provider);                   //creating instance of a pair
        const route = await new Route([pair],token2);                                       // a a full specified path from input token to output token
        let amountIn:ethers.BigNumber = ethers.utils.parseEther(amount.toString());         // helper function to convert ETH to Wei
        
        console.log("slippage:",50);
        console.log("amountIn:",ethers.utils.formatEther(amountIn));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.quotient.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(
            route,
            new TokenAmount(token2,amountIn.toString()),                                    //输入token d的数量，token2 这里指的是ETh
            TradeType.EXACT_INPUT                                                           //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        );                                                                                  // information necessary to create a swap transaction.

        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;                 // 指定这次交易在滑点容差0.005的情况下，获取到的最小数量的目标token
        const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString());
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.inputAmount.raw;                                                // needs to be converted to e.g. hex
        const valueHex = await ethers.BigNumber.from(value.toString());
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        console.log("amountOutMin 目标token 的最小数量:",ethers.utils.formatUnits(amountOutMin.toString()));
        console.log("path:",path);
        console.log("to:",to);
        console.log("deadline:",deadline);
        console.log("exact value:",ethers.utils.formatEther(value.toString()));

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.

        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactETHForTokens(
            amountOutMinHex,
            path,
            to,
            deadline,
            {
                value:valueHex,
                maxPriorityFeePerGas:ethers.utils.parseUnits("1","gwei"),
            }
        )
        // Returns a Promise which resolves to the transaction.;
        let sendTxn = (await WALLET).sendTransaction(rawTxn);

        // Resolves to the TransactionReceipt once the transaction has been included in the chain for x confirms blocks.
        let reciept = (await sendTxn).wait()


        // Logs the information about the transaction it has been mined.
        if (reciept) {
            console.log(" - Transaction is mined - " + '\n' +
                "Transaction Hash:", (await sendTxn).hash +
                '\n' + "Block Number: " +
                (await reciept).blockNumber + '\n' +
                "Navigate to https://etherscan.io/tx/" +
                (await sendTxn).hash, "to see your transaction")
            console.log("sendTxn:",sendTxn);
            console.log("reciept:",reciept);
        } else {
            console.log("Error submitting transaction")
        }

    }catch (e)
    {
        console.log(e);
    }
}


/**
 * 输入精确的token数量换取目标token
 * @param token1 : 目标token
 * @param token2 : 输入token
 * @param amount : 输入token的数量
 * @param slippage 
 * 
 * function swapExactTokensForTokens(
//         uint amountIn,
//         uint amountOutMin,
//         address[] calldata path,
//         address to,
//         uint deadline
//     ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
//         amounts = UniswapV2Library.getAmountsOut(factory, amountIn, path);
//         require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
//         TransferHelper.safeTransferFrom(
//             path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]
//         );
//         _swap(amounts, path, to);
//     }
 */


async function swapExactTokensForTokens(token1:Token,token2:Token,amount:number,slippage = "50"){
    try{
        const pair = await Fetcher.fetchPairData(token1,token2,provider);                   //creating instance of a pair
        const route = await new Route([pair],token2);                                       // a a full specified path from input token to output token
        let amountIn:ethers.BigNumber = ethers.utils.parseEther(amount.toString());         // helper function to convert ETH to Wei，大单位转小单位
        
        console.log("slippage:",50);
        console.log("amountIn:",ethers.utils.formatEther(amountIn));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.quotient.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        
        const trade = new Trade(
            route,
            new TokenAmount(token2,amountIn.toString()),                                    //输入token d的数量，token2 这里指的是ETh
            TradeType.EXACT_INPUT                                                           //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        );                                                                                  // information necessary to create a swap transaction.
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).toString();                 // 指定这次交易在滑点容差0.005的情况下，获取到的最小数量的目标token
        const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString());
        const path = [token2.address,token1.address];                                       // An array of token addresses
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.inputAmount.raw;                                                // needs to be converted to e.g. hex
        const valueHex = await ethers.BigNumber.from(value.toString());
        let nonce = await WALLET.getTransactionCount();
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");

        console.log("amountOutMin 目标token 的最小数量:",ethers.utils.formatUnits(amountOutMin.toString()));
        console.log("path:",path);
        console.log("to:",to);
        console.log("deadline:",deadline);
        console.log("exact value:",ethers.utils.formatEther(value.toString()));


        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.

        // const rawApproveTxn = await UNISWAP_ROUTER_CONTRACT.approve(WALLET.address,value);

        // let sendApproveTxn = (await WALLET).sendTransaction(rawApproveTxn);

        // console.log("rawApproveTxn:",rawApproveTxn);
        // console.log("sendApproeveTxn:",rawApproveTxn);

        // const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactTokensForTokens(
        //     amountIn,
        //     amountOutMinHex,
        //     path,
        //     to,
        //     deadline,
        //     {
        //         gasLimit:300000,
        //         // maxPriorityFeePerGas:ethers.utils.parseUnits("1","gwei"),
        //         // nonce:nonce,
        //     }
        // )
        // // Returns a Promise which resolves to the transaction.;
        // let sendTxn = (await WALLET).sendTransaction(rawTxn);

        // // Resolves to the TransactionReceipt once the transaction has been included in the chain for x confirms blocks.
        // let reciept = (await sendTxn).wait()


        // // Logs the information about the transaction it has been mined.
        // if (reciept) {
        //     console.log(" - Transaction is mined - " + '\n' +
        //         "Transaction Hash:", (await sendTxn).hash +
        //         '\n' + "Block Number: " +
        //         (await reciept).blockNumber + '\n' +
        //         "Navigate to https://etherscan.io/tx/" +
        //         (await sendTxn).hash, "to see your transaction")
        //     console.log("sendTxn:",sendTxn);
        //     console.log("reciept:",reciept);
        // } else {
        //     console.log("Error submitting transaction")
        // }

    }catch (e)
    {
        console.log(e);
    }
}

/**
 * erc20 token 授权给UniswapV2 router 合约amount 数量的token ,用于swap
 * @param amount token 合约授权给Router合约的数量
 */
async function apporve(amount:number) {
    // try {
    //     const DAIABI = ['function approve(address spender, uint256 value) returns (bool)'];
    //     const DAIContract = new ethers.Contract(UNI_CONTRACT_ADDRESS, DAIABI, WALLET);
    //     var amountStr=amount.toString();
    //     const approveTx = await DAIContract.approve(UNISWAP_ROUTER_ADDRESS, ethers.utils.parseEther(amountStr));
    //     const approveReceipt = await approveTx.wait();
    //     console.log("approveTx:",approveTx);
    //     console.log("approveReceipt:",approveReceipt);
    // } catch(e) {
    //     console.log(e)
    // }

    try {
        const approveTx = await UNI_CONTRACT.approve(UNISWAP_ROUTER_ADDRESS, ethers.utils.parseEther(amount.toString()));
        const approveReceipt = await approveTx.wait();
        // console.log("approveTx:",approveTx);
        // console.log("approveReceipt:",approveReceipt);
    } catch(e) {
        console.log(e)
    }
    

}

/**
 * 通过输入token 获取ETH
 * @param token1 
 * @param token2 
 * @param amount 
 * @param slippage 
 * 
 * function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[path.length - 1] == WETH, 'UniswapV2Router: INVALID_PATH');
        amounts = UniswapV2Library.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferETH(to, amounts[amounts.length - 1]);
    }
 */

async function swapExactTokensForETH(token1:Token,token2:Token,amount:number,slippage = "50"){
    try{
        const pair = await Fetcher.fetchPairData(token1,token2,provider);                   //creating instance of a pair
        const route = await new Route([pair],token2);                                       // a a full specified path from input token to output token
        let amountIn:ethers.BigNumber = ethers.utils.parseEther(amount.toString());         // helper function to convert ETH to Wei

        console.log("slippage:",50);
        console.log("amountIn:",ethers.utils.formatEther(amountIn));

        const slippageTolerance = new Percent(slippage,"10000")                             // Slippage tolerance，交易发生时，可接受的价格变动的最大范围,Percent(numerator,denominator),
        console.log("slippage tolerance:",slippageTolerance.quotient.toString());           // 分子除以分母，50/10000 = 0.005,这里规定滑点容差不能超过千分之五，也就是成交价格不能超过千分之五
        

        // 调用UNI合约的授权函数，授权给UniswapRouter 合约amounIn 数量的UNI
        // let rawApproveTx = await UNI_CONTRACT.populateTransaction.approve(UNISWAP_ROUTER_ADDRESS,amountIn);
        // console.log("rawApproveTx:",rawApproveTx);

        // let sendApproveTx = await WALLET.sendTransaction(rawApproveTx);

        // let approveReciept = await sendApproveTx.wait();

        // console.log("rawApproveTx:",rawApproveTx);
        // console.log("sendApproveTx:",sendApproveTx);
        // console.log("approveReciept:",approveReciept);

        await apporve(amount);
        
        
        const trade = new Trade(
            route,
            new TokenAmount(token2,amountIn.toString()),                                    //输入token d的数量，token2 这里指的是ETh
            TradeType.EXACT_INPUT                                                           //交易类型，EXACT_INPUT,说明输入token的数量是精确的，这里指的是ETH的数量
        );                                                                                  // information necessary to create a swap transaction.

        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;                 // 指定这次交易在滑点容差0.005的情况下，获取到的最小数量的目标token
        const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString());
        const path = [token2.address,token1.address];                                       // An array of token addresses,代表兑换路径
        const to = WALLET.address;                                                          // 20 minutes from the current Unix time
        const deadline = createDeadLine();
        const value = trade.inputAmount.raw;                                                // needs to be converted to e.g. hex
        const valueHex = await ethers.BigNumber.from(value.toString());
        // const maxPriorityFeePerGas = ethers.utils.formatEther("1","gwei");
        const nonce = await WALLET.getTransactionCount();
        console.log("amountIn:",amountIn);
        console.log("amountOutMin 目标token 的最小数量:",ethers.utils.formatUnits(amountOutMin.toString()));
        console.log("path:",path);
        console.log("to:",to);
        console.log("deadline:",deadline);
        console.log("exact value:",ethers.utils.formatEther(value.toString()));

        // Return a copy of transactionRequest, The default implementation calls checkTransaction and 
        // resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related 
        // operations on Signer.

        const rawTxn = await UNISWAP_ROUTER_CONTRACT.populateTransaction.swapExactTokensForETH(
            valueHex,
            amountOutMinHex,
            path,
            to,
            deadline,
            {
                // gasLimit:ethers.BigNumber.from(50000),
                gasLimit:ethers.utils.parseUnits('200000', 'wei')
                // nonce:nonce,
                // maxPriorityFeePerGas:ethers.utils.parseUnits("2","gwei"),
            }
        )
        // Returns a Promise which resolves to the transaction.;
        let sendTxn = (await WALLET).sendTransaction(rawTxn);

        // Resolves to the TransactionReceipt once the transaction has been included in the chain for x confirms blocks.
        let reciept = (await sendTxn).wait()

        console.log("rawTxn:",rawTxn);
        console.log("sendTxn:",sendTxn);

        // Logs the information about the transaction it has been mined.
        if (reciept) {
            console.log(" - Transaction is mined - " + '\n' +
                "Transaction Hash:", (await sendTxn).hash +
                '\n' + "Block Number: " +
                (await reciept).blockNumber + '\n' +
                "Navigate to https://etherscan.io/tx/" +
                (await sendTxn).hash, "to see your transaction")
                console.log("reciept:",reciept);

        } else {
            console.log("Error submitting transaction")
            console.log("reciept:",reciept);

        }

    }catch (e)
    {
        console.log(e);
    }
}


async function testUniswapV2RouterV2(){

    console.log("BlockNumber:",await provider.getBlockNumber());
    const UNI = new Token(
        ChainId.MAINNET,
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        18
    )
    // ETH 兑 UNI
    // console.time("swapExactEthForTokens");
    // swapExactEthForTokens(UNI,WETH[UNI.chainId],.001)  // first token we want,second token we have ,the amount we want;
    // console.timeEnd("swapExactEthForTokens");

    // ETH 对 UNI
    // console.time("swapExactTokensForTokens");
    // swapExactTokensForTokens(UNI,WETH[UNI.chainId],.001)  // first token we want,second token we have ,the amount we want;
    // console.timeEnd("swapExactTokensForTokens");


    // UNI 兑 ETH
    console.time("swapExactEthForTokens");
    swapExactTokensForETH(WETH[UNI.chainId],UNI,.1)  // first token we want,second token we have ,the amount we want;
    console.timeEnd("swapExactEthForTokens");


 
}


async function testWei(){
   let value = ethers.utils.parseUnits("3","ether");     // 大单位转小单位，gwei 转wei
   let value_ether = ethers.utils.formatUnits(value);   // 
   console.log("value:",value.toString());
   console.log("value_ether:",value_ether);
   let nonce = await WALLET.getTransactionCount();
   console.log("nonce:",nonce);

}

async function main(){

    console.time("testUniswapV2RouterV2");
    await testUniswapV2RouterV2();
    console.timeEnd("testUniswapV2RouterV2");
    // testWei();
}

main();