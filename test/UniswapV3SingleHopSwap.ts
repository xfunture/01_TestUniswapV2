import { expect } from 'chai';
import { ethers } from 'hardhat';
import  {
    loadFixture
} from "@nomicfoundation/hardhat-network-helpers";
import { DAI_TOKEN, WETH_TOKEN } from '../scripts/uniswapv3/libs/constants';
import { Token } from '@uniswap/sdk-core';


describe("UniswapV3 swap",function(){



    async function deployUniswapV3SingleHopSwapFixture(){
        const [owner,addr1,addr2] = await ethers.getSigners();
        const routerAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
        const uniswapv3Swap = await ethers.deployContract("UniswapV3SingleHopSwap",[routerAddress]);

        await uniswapv3Swap.waitForDeployment();

        return {uniswapv3Swap,owner,addr1,addr2};
    }

    describe("Deployment",function(){
        it("Should set right owner",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            expect(await uniswapv3Swap.owner()).to.equal(owner.address);
        })
    })

    describe("Transaction",function(){

        it("UniswapV3 single hop swap",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            console.log("\tUniswapV3SingleHopSwap contract address:",await uniswapv3Swap.getAddress());
            const inputAmount = 0.02;
            const tokenIn:Token = WETH_TOKEN;
            const tokenOut:Token = DAI_TOKEN;
            const poolFee = 500;
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = 0;

            console.log("\towner:",owner.address);
            console.log("\tuniswapV3Swap msg.sender:",await uniswapv3Swap.owner());
            const exactInputSingleAmountOut = await uniswapv3Swap.swapExactInputSingleHop(tokenIn.address,tokenOut.address,amountIn,poolFee);
            console.log("\texactInputSingleAmountOut:",exactInputSingleAmountOut);

            expect(await uniswapv3Swap.owner()).to.equal(owner.address);
        })



       

        
    })
})
