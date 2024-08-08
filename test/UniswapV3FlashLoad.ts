import { expect } from 'chai';
import { ethers } from 'hardhat';
import  {
    loadFixture
} from "@nomicfoundation/hardhat-network-helpers";
import { DAI_TOKEN, WETH_ABI, WETH_TOKEN } from '../scripts/uniswapv3/libs/constants';
import { Token } from '@uniswap/sdk-core';
import { getProvider, wallet } from '../scripts/uniswapv3_ethersv6/lib/providers';
import { ERC20_ABI } from '../scripts/uniswapv3_ethersv6/lib/constant';
import { uniswap } from '../typechain-types';
import { FeeAmount } from '@uniswap/v3-sdk';


const provider = getProvider();
const wethContract = new ethers.Contract(WETH_TOKEN.address,ERC20_ABI,wallet);



describe("UniswapV3FlashSwapArbitrate Test",function(){
    async function deployUniswapV3FlashLoadFixture(){
        const [owner,addr1,addr2] = await ethers.getSigners();
        const pool = "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8";
        const uniswapV3FlashLoad = await ethers.deployContract("UniswapV3FlashLoad",[pool]);

        await uniswapV3FlashLoad.waitForDeployment();

        const routerAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
        const uniswapv3Swap = await ethers.deployContract("UniswapV3SingleHopSwap",[routerAddress]);

        await uniswapv3Swap.waitForDeployment();

        console.log("\towner address:",owner.address,"addr1:",addr1.address,"addr2:",addr2.address);
        console.log("\tuniswapV3FlashLoad contract address:",await uniswapV3FlashLoad.getAddress());
        console.log("\tuniswapv3Swap contract address:",await uniswapv3Swap.getAddress());
        return  {uniswapV3FlashLoad ,uniswapv3Swap,owner,addr1,addr2};
    }

    describe("Deployment",function(){
        it("Should set right owner",async function(){
            const {uniswapV3FlashLoad,uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3FlashLoadFixture)
            // expect(await uniswapv3SwapFlashSwapArbitrate.owner()).to.equal(owner.address);
        })
    })

    describe("Test Flash load",function(){
        it("Flash load",async function(){
            const {uniswapV3FlashLoad,uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3FlashLoadFixture)
            const tokenIn = WETH_TOKEN;
            const tokenOut = DAI_TOKEN;
            const inputAmount = 1;
            const tradeAmount = 0.1;
            const transferAmount = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountIn = ethers.parseUnits(tradeAmount.toString(),tokenIn.decimals);
            const outputAmount = 500;
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);
            const poolFee = FeeAmount.MEDIUM;
            const uniswapv3SwapAddress = await uniswapv3Swap.getAddress();
            const uniswapV3FlashLoadAddress = await uniswapV3FlashLoad.getAddress();
            let contractwethBalance;
            // const output = await uniswapv3Swap.swapExactOutputSingle(tokenIn.address,tokenOut.address,0,amountOut);


            //------------------------------------------------wrapEther to owner---------------------------------------------------------------------
            let ownerWethBalance = await wethContract.balanceOf(owner);
            console.log(`\n\tbefore wrapEther owner weth Balance: ${ethers.formatEther(ownerWethBalance)}`);
            let tx = await wethContract.deposit({value:transferAmount});
            await tx.wait();
            ownerWethBalance = await wethContract.balanceOf(owner);
            console.log(`\n\tafter wrapEther owner weth Balance: ${ethers.formatEther(ownerWethBalance)}`);

            
            //-----------------------------------------transfer weth to uniswapV3FlashLoad---------------------------------------------------------------------
            
           
            // const tokenOutContract = new ethers.Contract(tokenOut.address,ERC20_ABI,wallet);


            // tx = await wethContract.transfer(uniswapV3FlashLoadAddress,amountIn);
            // await tx.wait();
            // contractwethBalance = await wethContract.balanceOf(uniswapV3FlashLoadAddress);
            // console.log(`\n\tafter transfer weth to uniswapV3FlashLoad contract balance: ${ethers.formatEther(contractwethBalance)}`);
            
            //------------------------------------------------owner approve to UniswapV3FLashLoad---------------------------------------------------------------------
            // 授权是为了在回调函数uniswapV3FlashCallback 中归还fee 数量的借款利息
            // 归还借款之前需要将owner 中fee数量的代币转给UniswapV3FlashLoad 合约
            const approveAmount = amountIn;
            tx = await wethContract.approve(uniswapV3FlashLoadAddress,approveAmount);
            await tx.wait();


            //------------------------------------------------Flash Load---------------------------------------------------------------------
            const amountToBorrowWETH = ethers.parseUnits('1',WETH_TOKEN.decimals)
            contractwethBalance = await wethContract.balanceOf(uniswapV3FlashLoadAddress);
            console.log(`\n\tbefore flash load uniswapV3FlashLoad weth balance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapV3FlashLoad.flash(0,amountToBorrowWETH);
            
            contractwethBalance = await wethContract.balanceOf(uniswapV3FlashLoadAddress);
            console.log(`\n\tafter flash load uniswapV3FlashLoad weth balance: ${ethers.formatEther(contractwethBalance)}`);


        })
    })

})