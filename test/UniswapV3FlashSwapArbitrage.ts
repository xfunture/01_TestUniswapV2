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
const wethContract = new ethers.Contract(WETH_TOKEN.address,ERC20_ABI,provider);



describe("UniswapV3FlashSwapArbitrate Test",function(){
    async function deployUniswapVFlashSwapArbitrageFixture(){
        const [owner,addr1,addr2] = await ethers.getSigners();
        const uniswapv3SwapFlashSwapArbitrate = await ethers.deployContract("UniswapV3FlashSwapArbitrage");

        await uniswapv3SwapFlashSwapArbitrate.waitForDeployment();

        const routerAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
        const uniswapv3Swap = await ethers.deployContract("UniswapV3SingleHopSwap",[routerAddress]);

        await uniswapv3Swap.waitForDeployment();

        console.log("\towner address:",owner.address,"addr1:",addr1.address,"addr2:",addr2.address);
        console.log("\tuniswapv3SwapFlashSwapArbitrate contract address:",await uniswapv3SwapFlashSwapArbitrate.getAddress());
        console.log("\tuniswapv3Swap contract address:",await uniswapv3Swap.getAddress());
        return  {uniswapv3SwapFlashSwapArbitrate,uniswapv3Swap,owner,addr1,addr2};
    }

    describe("Deployment",function(){
        it("Should set right owner",async function(){
            const {uniswapv3SwapFlashSwapArbitrate,uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapVFlashSwapArbitrageFixture)
            expect(await uniswapv3SwapFlashSwapArbitrate.owner()).to.equal(owner.address);
        })
    })

    describe("excute Arbitrage",async function(){
        it("run arbitrage",async function(){
        const {uniswapv3SwapFlashSwapArbitrate,uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapVFlashSwapArbitrageFixture)
           
            const tokenIn = WETH_TOKEN;
            const tokenOut = DAI_TOKEN;
            const inputAmount = 0.4;
            const tradeAmount = 0.2
            const transferAmount = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountIn = ethers.parseUnits(tradeAmount.toString(),tokenIn.decimals);
            const outputAmount = 500;
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);
            const poolFee = FeeAmount.MEDIUM;
            const contractCddress = await uniswapv3Swap.getAddress();
            // const output = await uniswapv3Swap.swapExactOutputSingle(tokenIn.address,tokenOut.address,0,amountOut);


            //---------------------------wrapEther-------------------------------------
            let contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\n\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapv3Swap.wrapEtherToContract({value:transferAmount});
            
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            expect(contractwethBalance).to.equal(transferAmount);


            
            await uniswapv3Swap.swapExactInputSingle(
                    tokenIn.address,
                    tokenOut.address,
                    amountIn,
                    poolFee
            )



        })

    })
})