import { ethers } from "ethers";
import { Exit } from "hardhat/internal/hardhat-network/provider/vm/exit";
import { ChainId, UNISWAP } from "@uniswap/sdk";
import {Token,WETH,Fetcher,Route,Trade,TokenAmount,TradeType,Percent} from "@uniswap/sdk";
import * as fs from 'fs';

// const ethers = require("ethers");
require("dotenv").config()
// 利用Alchemy的rpc节点连接以太坊网络
// 连接goerli测试网

const SEPOLIA_API_URL = process.env.SEPOLIA_API_URL;

const SEPOLIA_WS_URL = process.env.SEPOLIA_WS_URL;

const SEPOLIA_PRIVATE_KEY:string = process.env.SEPOLIA_PRIVATE_KEY || "";

console.log("SEPOLIA_API_URL:",SEPOLIA_API_URL);

const ETHMAINNET_API_URL = process.env.ETHMAINNET_API_URL;


const ETHMAINNET_PRIVATE_KEY:string = process.env.ETHMAINNET_PRIVATE_KEY || "";


const API_URL = ETHMAINNET_API_URL;

const addressWETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const addressUniswapV2 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const provider = new ethers.JsonRpcProvider(API_URL);

const privateKey = ETHMAINNET_PRIVATE_KEY;

// 利用私钥和provider创建wallet对象
if(privateKey === ""){
    console.log("privateKey can't not be null")
    process.exit();
}
const WALLET = new ethers.Wallet(privateKey, provider);


// WETH的ABI
const abiWETH = [
    "function balanceOf(address) public view returns(uint)",
    "function deposit() public payable",
    "function transfer(address, uint) public returns (bool)",
    "function withdraw(uint) public",
];



/**
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = UniswapV2Library.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);import { fs } from "fs";
 view returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",   //swapExactTokensForTokens 根据精确的token交换尽量多的token
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
]




/**
 * 测试通过WETH合约完成存款和取款的功能
 */

async function testWETHDepositAndWithdraw(amountIn:string){

    console.log("---------------------------Begin testWETHDepositAndWithdraw--------------------------");
    //创建WETH合约对象
    const contractWETH = new ethers.Contract(addressWETH,abiWETH,WALLET);

    //读取账户余额
    const address  = await WALLET.getAddress();
    console.log("wallet address:",address);

    // console.log("\n 读取账户余额");
    var balanceWETH :number = await contractWETH.balanceOf(address);
    console.log("\n存款前余额：",ethers.formatEther(balanceWETH));

    console.log("\n2. 调用desposit()函数，存入ETH");
    console.time("deposit");
    var tx = await contractWETH.deposit({value:ethers.parseEther(amountIn)});
    await tx.wait();
    console.timeEnd("deposit");
    console.log("交易哈希：",tx.hash);

    balanceWETH = await contractWETH.balanceOf(address);
    console.log("\n存款后余额：",ethers.formatEther(balanceWETH));

    console.log("\n 调用withdraw 取款");
    console.time("withdraw");
    var tx = await contractWETH.withdraw(balanceWETH);
    await tx.wait();
    console.timeEnd("withdraw");
    console.log("交易哈希：",tx.hash);

    balanceWETH = await contractWETH.balanceOf(address);
    console.log("\n取款后余额：",ethers.formatEther(balanceWETH));

    console.log("---------------------------End testWETHDepositAndWithdraw---------------------------");



}


/**
 * eth to weth
 */

async function depositETHTOWETH(amountIn:string){

    console.log("---------------------------Begin depositETHTOWETH--------------------------");
    //创建WETH合约对象
    const addressWETH = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9'; 
    const contractWETH = new ethers.Contract(addressWETH,abiWETH,WALLET);

    //读取账户余额
    const address  = await WALLET.getAddress();
    console.log("wallet address:",address);

    // console.log("\n 读取账户余额");
    var balanceWETH :number = await contractWETH.balanceOf(address);
    console.log("\n存款前余额：",ethers.formatEther(balanceWETH));

    console.log("\n2. 调用desposit()函数，存入 amountIn ETH");
    console.time("deposit");
    var tx = await contractWETH.deposit({value:ethers.parseEther(amountIn)});
    await tx.wait();
    console.timeEnd("deposit");
    console.log("交易哈希：",tx.hash);

    balanceWETH = await contractWETH.balanceOf(address);
    console.log("\n存款后余额：",ethers.formatEther(balanceWETH));


    console.log("---------------------------End depositETHTOWETH---------------------------");



}


/**
 * 
 * 查询WETH账户余额
 */

async function queryWETHBalances(privateKey:string){

   console.log("---------------------------Begin queryWETHBalances--------------------------");

   // 创建钱包
   const WALLET = new ethers.Wallet(privateKey, provider);

   //创建WETH合约对象
   const contractWETH = new ethers.Contract(addressWETH,abiWETH,WALLET);

   //读取账户余额
   const address  = await WALLET.getAddress();
   console.log("wallet address:",address);

   // console.log("\n 读取账户余额");
   var balanceWETH :number = await contractWETH.balanceOf(address);
   console.log("\n余额：",ethers.formatEther(balanceWETH));

   console.log("---------------------------End queryWETHBalances---------------------------");



}

function createDeadLine():number{
    return Math.floor(Date.now()/1000) + 60 * 20; // 20 minutes from the current Unix time
}

/**
 * 测试通过UniswapV2Router 完成购买代币
 */
async function testUniswapV2Router(){
    console.log("--------------------------Begin testUniswapV2Router-------------------------------------");
    const address = await WALLET.getAddress();
    console.log("my address:",address);
    const addressUniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const contractUniswapV2Router = new ethers.Contract(addressUniswapV2Router,abiUniswapV2Router,WALLET);
    console.log("contract address:",await contractUniswapV2Router.getAddress());

    var amountIn = ethers.parseEther("0.001");
    var amountOutMin = 0;
    const addressWETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
    const addressUNI = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';  // UNI
    const path = [addressWETH,addressUNI];
    const addressTo = address;
    const deadline = createDeadLine();
    console.log("Deadline:",deadline);
    console.log("amountIN:",amountIn);


    // tx = await contractUniswapV2Router.getPair(addressWETH,addressUNI);
    // console.log("getPair:",tx);

    var tx = await contractUniswapV2Router.getAmountsOut(amountIn,path);
    var amountOut = tx[1];
    console.log("amountOut:",ethers.formatUnits(amountOut));






    // 通过WETH交换UNI
    // var tx = await contractUniswapV2Router.swapExactTokensForTokens(
    //                                                  amountIn,      //输入代币的数量 单位是wei
    //                                                  amountOutMin,  //最小输出代币
    //                                                  path,          //代币交换路径，WETH -> DAI
    //                                                  addressTo,     // 代币发送到的地址
    //                                                  deadline,       // 交易过期时间
    //                                                  {
    //                                                     gasLimit:25000,
    //                                                     value:amountIn
    //                                                  }
    //                                                  );
    // await tx.wait();
    // console.log("交易详情：");
    // console.log(tx);

    let network = await provider.getNetwork();

    console.log("network:",network);
     // 通过ETH交换UNI
     var rawTxn = await contractUniswapV2Router.swapExactETHForTokens(
        amountIn,       //最小输入代币
        path,          //代币交换路径，WETH -> DAI
        addressTo,     // 代币发送到的地址
        deadline,       // 交易过期时间
        {
           gasLimit:25000,
           value:amountIn,
        }
        );
    let sendTx = await WALLET.sendTransaction(rawTxn);
    let reciept = sendTx.wait();
    // await tx.wait();
    console.log("交易详情：");
    console.log(sendTx);



    console.log("--------------------------End testUniswapV2Router-------------------------------------");

}

async function swapTokens(token1:Token,token2:Token,amount,slippage = "50"){
    Fetcher.fetchPairData(token1,token2,provider);
}



async function testUniswapV2RouterV2(){

    const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    const UNISWAP_ROUTER_ABI =  fs.readFileSync("./contracts/abis/UniswapV2abi.json").toString();
    const UNISWAP_ROUTER_CONTRACT = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, provider);
    
    const UNI = new Token(
        ChainId.MAINNET,
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        18
    )
}

async function main(){

    // 查询WETH账户余额
    // var myprivatekey:string = process.env.ACCOUNT1_PRIVATE_KEY||"";
    // await queryWETHBalances(myprivatekey);

    // eth 转换为WETH
    // await depositETHTOWETH("0.2");

    // 测试WETH合约的存款和取款函数
    // await testWETHDepositAndWithdraw("0.01");

    // await testUniswapV2Router();

    await testUniswapV2RouterV2();
}

main();
