import { expect } from 'chai';
import { ethers } from 'hardhat';
import  {
    loadFixture
} from "@nomicfoundation/hardhat-network-helpers";
import { DAI_TOKEN, UNI_TOKEN, USDC_TOKEN, WETH_ABI, WETH_TOKEN } from '../scripts/uniswapv3/libs/constants';
import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core';
import { getProvider, wallet } from '../scripts/uniswapv3_ethersv6/lib/providers';
import { ERC20_ABI } from '../scripts/uniswapv3_ethersv6/lib/constant';
import { uniswap } from '../typechain-types';
import { quote2ExactOutput, quote2ExactOutputSingle } from '../scripts/uniswapv3_ethersv6/lib/quote';
import {Pair,Route,Trade} from "@uniswap/v2-sdk";
import { ProviderError } from 'web3';
import * as fs from 'fs';
import { createDeadLine } from '../scripts/uniswapv3/libs/utils';


const provider = getProvider();
const wethContract = new ethers.Contract(WETH_TOKEN.address,ERC20_ABI,provider);


const UNISWAP_PAIR_ADDRESS = "0x3356c9A8f40F8E9C1d192A4347A76D18243fABC5";   //sepolia 链 待定
const UNISWAP_PAIR_ABI = fs.readFileSync("./contracts/abis/UniswapV2PairAbi.json").toString();
const UNISAP_PAIR_CONTRACT = new ethers.Contract(UNISWAP_PAIR_ADDRESS,UNISWAP_PAIR_ABI,provider)


const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const UNISWAP_ROUTER_ABI =  fs.readFileSync("./contracts/abis/UniswapV2RouterAbi.json").toString();
const UNISWAP_ROUTER_CONTRACT = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, wallet);

/**
 * 创建Pair对象，就是交易对对象 比如说DAI/WETH
 * 
 * @param tokenA :OUTPUT TOKEN
 * @param tokenB :WETH,INPUT TOKEN
 * @returns 
 */
async function createPair(tokenA:Token,tokenB:Token):Promise<Pair>{
    const pairAddress = Pair.getAddress(tokenA, tokenB);
    const pairContract = new ethers.Contract(pairAddress, UNISWAP_PAIR_ABI, provider)
    const reserves = await pairContract["getReserves"]()
    const [reserve0, reserve1] = reserves
    console.log("reserves:",reserves);

    const tokens = [tokenA, tokenB]
    const [token0, token1] = tokens[0].sortsBefore(tokens[1]) ? tokens : [tokens[1], tokens[0]]

    const pair = new Pair(CurrencyAmount.fromRawAmount(token0, reserve0), CurrencyAmount.fromRawAmount(token1, reserve1))
    console.log(`${token0.symbol}-${token1.symbol} address:${pairAddress}`);
    return pair;
}

async function getERC20Balance(myAddress:string,CONTRACT_ADDRESS:string):Promise<number>{


    const contract = new ethers.Contract(CONTRACT_ADDRESS,ERC20_ABI,getProvider());

    const balance = await contract.balanceOf(myAddress)

    return balance;
}

describe("UniswapV3 swap",function(){



    async function deployUniswapV3SingleHopSwapFixture(){
        const [owner,addr1,addr2] = await ethers.getSigners();
        const routerAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
        const uniswapv3Swap = await ethers.deployContract("UniswapV3SingleHopSwap",[routerAddress]);

        await uniswapv3Swap.waitForDeployment();
        console.log("\towner address:",owner.address,"addr1:",addr1.address,"addr2:",addr2.address);
        console.log("\tuniswapv3Swap contract address:",await uniswapv3Swap.getAddress());
        return {uniswapv3Swap,owner,addr1,addr2};
    }

    describe("Deployment",function(){
        it("Should set right owner",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            expect(await uniswapv3Swap.owner()).to.equal(owner.address);
        })
    })


    /**
     * 发送eth 到UniswapV3SingleHopSwap 合约
     */
    describe("send ETH to contract",async function(){
        it("send eth to contract",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const contractCddress = await uniswapv3Swap.getAddress()
            const inputAmount = 0.02;
            console.log("\tuniswapV3Swap address:",contractCddress);
            const tx = {
                to:contractCddress,
                value:ethers.parseEther(inputAmount.toString())
            }
            const transaction = await wallet.sendTransaction(tx);
            const receipt = await transaction.wait();
            const contractBalance = await provider.getBalance(contractCddress);
            console.log("\tcontract balance:",ethers.formatEther(contractBalance));
            expect(ethers.formatEther(contractBalance)).to.equal(inputAmount.toString());
        })
       
    })

    describe("\nTransaction",function(){

        it("swapExactETHForTokens",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 1;
            const tradeAmount = 0.2;
            const outputAmount = 0.2;
            const tokenIn:Token = WETH_TOKEN;
            const tokenMiddle:Token = USDC_TOKEN;
            const tokenOut:Token = DAI_TOKEN;
            const poolFee = 3000;
            const contractCddress = await uniswapv3Swap.getAddress()
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);



            //---------------------------wrapEther-------------------------------------
            let contractwethBalance = await wethContract.balanceOf(contractCddress);
            let contractethBalance = await provider.getBalance(contractCddress);
            console.log(`\n\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            console.log(`\tbefore wrapEther contract ethBalance: ${ethers.formatEther(contractethBalance)}`);


            await uniswapv3Swap.wrapEtherToContract({value:amountIn});
            
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            contractethBalance = await provider.getBalance(contractCddress);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            console.log(`\tafter wrapEther contract ethBalance: ${ethers.formatEther(contractethBalance)}`);
            expect(contractwethBalance).to.equal(amountIn);

            //----------------------------send eth to contract-----------------------------
            const tx = {
                to:contractCddress,
                value:ethers.parseEther(inputAmount.toString())
            }
            const transaction = await wallet.sendTransaction(tx);
            const receipt = await transaction.wait();
            contractethBalance = await provider.getBalance(contractCddress);
            console.log("\tafter send eth to contarct which eth balance:",ethers.formatEther(contractethBalance));


            const buy_path = [tokenIn.address,tokenOut.address]
            const amount_to_buy_for = ethers.parseUnits(tradeAmount.toString(),tokenIn.decimals);
            
            const amountsOut = await UNISWAP_ROUTER_CONTRACT.getAmountsOut(amount_to_buy_for,buy_path);
            const tokenOutAmount = amountsOut[1];
            console.log("\ttokenOutAmount:",ethers.formatUnits(tokenOutAmount,tokenOut.decimals));
            const to = await uniswapv3Swap.getAddress();
            const deadline = createDeadLine();
            
            let tokenOutBalance = await getERC20Balance(wallet.address,tokenOut.address)
            let tokenOutContractBalance = await getERC20Balance(contractCddress,tokenOut.address);
            console.log(`\tbefore swapExactETHForTokens tokenOut contract balance: ${ethers.formatUnits(tokenOutContractBalance,tokenOut.decimals)}`);
            console.log(`\tbefore swapExactETHForTokens tokenOut balance: ${ethers.formatUnits(tokenOutBalance,tokenOut.decimals)}`);



            const output = await uniswapv3Swap.swapExactETHForTokens(
                                        ethers.parseUnits(tradeAmount.toString(),tokenIn.decimals),
                                        tokenOutAmount,
                                        buy_path,
                                        to,
                                        deadline,
                                        {value:amountIn}
                                         )



            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter swapExactETHForTokens contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            tokenOutBalance = await getERC20Balance(wallet.address,tokenOut.address);
            tokenOutContractBalance = await getERC20Balance(contractCddress,tokenOut.address);
            contractethBalance = await provider.getBalance(contractCddress);
            console.log(`\tafter swapExactETHForTokens tokenOut contract balance: ${ethers.formatUnits(tokenOutContractBalance,tokenOut.decimals)}`);
            console.log(`\tafter swapExactETHForTokens tokenOut balance: ${ethers.formatUnits(tokenOutBalance,tokenOut.decimals)}`);
            console.log("\tafter swapExactETHForTokens contract eth balance:",ethers.formatEther(contractethBalance));

        })



        


    })


})