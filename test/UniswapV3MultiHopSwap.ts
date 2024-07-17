import { expect } from 'chai';
import { ethers } from 'hardhat';
import  {
    loadFixture
} from "@nomicfoundation/hardhat-network-helpers";
import { DAI_TOKEN, UNI_TOKEN, USDC_TOKEN, WETH_ABI, WETH_TOKEN } from '../scripts/uniswapv3/libs/constants';
import { Token } from '@uniswap/sdk-core';
import { getProvider, wallet } from '../scripts/uniswapv3_ethersv6/lib/providers';
import { ERC20_ABI } from '../scripts/uniswapv3_ethersv6/lib/constant';
import { uniswap } from '../typechain-types';
import { quote2ExactOutput, quote2ExactOutputSingle } from '../scripts/uniswapv3_ethersv6/lib/quote';


const provider = getProvider();
const wethContract = new ethers.Contract(WETH_TOKEN.address,ERC20_ABI,provider);


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

        it("swapExactInputMultihop",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 1;
            const tradeAmount = 0.01;
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
            console.log(`\n\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapv3Swap.wrapEtherToContract({value:amountIn});
            
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            expect(contractwethBalance).to.equal(amountIn);

            const output = await uniswapv3Swap.swapExactInputMultihop(
                                         tokenIn.address,
                                         tokenMiddle.address,
                                         tokenOut.address,
                                         ethers.parseUnits(tradeAmount.toString(),tokenIn.decimals),
                                         0,
                                         poolFee
                                         )

            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter swapExactInput contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            const tokenOutBalance = await getERC20Balance(wallet.address,tokenOut.address)
            console.log(`\tafter swapExactInput tokenOut balance: ${ethers.formatUnits(tokenOutBalance,tokenOut.decimals)}`);

        })



        it("swapExactOutputMultihop",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 1;
            const outputAmount = 100;
            const tokenIn:Token = WETH_TOKEN;
            const tokenMiddle:Token = USDC_TOKEN;
            const tokenOut:Token = UNI_TOKEN;
            const poolFee = 3000;
            const contractCddress = await uniswapv3Swap.getAddress()
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);



            //---------------------------wrapEther-------------------------------------
            let contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\n\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapv3Swap.wrapEtherToContract({value:amountIn});
            
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            expect(contractwethBalance).to.equal(amountIn);


            // const quoteInput = await quote2ExactOutputSingle(tokenIn,tokenOut,outputAmount,poolFee);
            const quoteInput = await quote2ExactOutput(tokenIn,tokenMiddle,tokenOut,outputAmount,poolFee);
            const amountInMax = quoteInput.amountIn;
            console.log("\tamountInMax:",ethers.formatUnits(amountInMax,tokenIn.decimals));

            const tokenOutBalanceBefore = await getERC20Balance(wallet.address,tokenOut.address)

            const output = await uniswapv3Swap.swapExactOutputMultihop(
                tokenIn.address,
                tokenMiddle.address,
                tokenOut.address,
                amountInMax,
                amountOut,
                poolFee
            )


            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter swapExactInput contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            const tokenOutBalance = await getERC20Balance(wallet.address,tokenOut.address)
            console.log(`\tafter swapExactInput tokenOut balance: ${ethers.formatUnits(tokenOutBalance,tokenOut.decimals)}`);
        })

        it("swapExactOutputMultihop reverse",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 1;
            const outputAmount = 100;
            const tokenIn:Token = WETH_TOKEN;
            const tokenMiddle:Token = UNI_TOKEN;
            const tokenOut:Token = USDC_TOKEN;
            const poolFee = 3000;
            const contractCddress = await uniswapv3Swap.getAddress()
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);



            //---------------------------wrapEther-------------------------------------
            let contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\n\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapv3Swap.wrapEtherToContract({value:amountIn});
            
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            expect(contractwethBalance).to.equal(amountIn);


            // const quoteInput = await quote2ExactOutputSingle(tokenIn,tokenOut,outputAmount,poolFee);
            const quoteInput = await quote2ExactOutput(tokenIn,tokenMiddle,tokenOut,outputAmount,poolFee);
            const amountInMax = quoteInput.amountIn;
            console.log("\tamountInMax:",ethers.formatUnits(amountInMax,tokenIn.decimals));

            const tokenOutBalanceBefore = await getERC20Balance(wallet.address,tokenOut.address)

            const output = await uniswapv3Swap.swapExactOutputMultihop(
                tokenIn.address,
                tokenMiddle.address,
                tokenOut.address,
                amountInMax,
                amountOut,
                poolFee
            )


            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter swapExactInput contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            const tokenOutBalance = await getERC20Balance(wallet.address,tokenOut.address)
            console.log(`\tafter swapExactInput tokenOut balance: ${ethers.formatUnits(tokenOutBalance,tokenOut.decimals)}`);
        })
        
        


    })


})