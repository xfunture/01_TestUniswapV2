import { expect } from 'chai';
import { ethers } from 'hardhat';
import  {
    loadFixture
} from "@nomicfoundation/hardhat-network-helpers";
import { DAI_TOKEN, WETH_ABI, WETH_TOKEN } from '../scripts/uniswapv3/libs/constants';
import { Token } from '@uniswap/sdk-core';
import { getProvider, wallet } from '../scripts/uniswapv3_ethersv6/lib/providers';
import { ERC20_ABI } from '../scripts/uniswapv3_ethersv6/lib/constant';


const provider = getProvider();
const wethContract = new ethers.Contract(WETH_TOKEN.address,ERC20_ABI,provider);


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
     * eth wrap to weth
     */
    describe("Transaction",function(){

        it("personal address do eth wrap to WETH",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 0.2;
            const inputAmountOut = 0.2;
            const tokenIn:Token = WETH_TOKEN;
            const tokenOut:Token = DAI_TOKEN;
            const poolFee = 3000;
            const contractCddress = await uniswapv3Swap.getAddress()
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = ethers.parseUnits(inputAmountOut.toString(),tokenIn.decimals);
            let ethBalance = await provider.getBalance(wallet.address);
            let wethBalanceBefore = await wethContract.balanceOf(owner);

            console.log(`\tbefore ethBalance: ${ethers.formatEther(ethBalance)}`);
            console.log(`\tbefore wethBalance: ${ethers.formatEther(wethBalanceBefore)}`);


            //---------------------------deposit-------------------------------------
            await uniswapv3Swap.wrapEther({value:amountIn});
            let wethBalanceAfter = await wethContract.balanceOf(owner);
            ethBalance = await provider.getBalance(wallet.address);

            console.log(`\tafter ethBalance: ${ethers.formatEther(ethBalance)}`);
            console.log(`\tafter wethBalance: ${ethers.formatEther(wethBalanceAfter)}`);


            expect(await wethContract.balanceOf(owner)).to.equal(wethBalanceBefore + ethers.parseEther(inputAmount.toString()));

            await uniswapv3Swap.unwrapEther(amountOut);
            let wethBalanceAfterUnwrap = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter unwrap wethBalance: ${ethers.formatEther(wethBalanceAfterUnwrap)}`);

        })
    })

    /**
     * 发送ETH到合约UniswapV3SingleHopSwap
     */
    describe("send ETH",async function(){
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


})
