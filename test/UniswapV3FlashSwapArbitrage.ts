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
            const inputAmount = 100;
            const tradeAmount = 50;
            const transferAmount = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountIn = ethers.parseUnits(tradeAmount.toString(),tokenIn.decimals);
            const outputAmount = 500;
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);
            const poolFee = FeeAmount.MEDIUM;
            const contractCddress = await uniswapv3Swap.getAddress();
            // const output = await uniswapv3Swap.swapExactOutputSingle(tokenIn.address,tokenOut.address,0,amountOut);


            //------------------------------------------------wrapEther---------------------------------------------------------------------
            let contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\n\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapv3Swap.wrapEtherToContract({value:transferAmount});
            
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            expect(contractwethBalance).to.equal(transferAmount);


           
            //-------------------------------------------------Buy DAI-------------------------------------------------------------------
            // 人为制造套利机会
            // 购买50个ETH的DAI，会造成pool0(0.3%)的
            const fee0 = 3000;
            const fee1 = 500;
            const tokenOutContract = new ethers.Contract(tokenOut.address,ERC20_ABI,wallet);
            let tokenOutBalance = await tokenOutContract.balanceOf(owner);
            console.log(`\tbefore buy tokenOut:${tokenOut.symbol} balance:${ethers.formatUnits(tokenOutBalance,tokenOut.decimals)}`);
            await uniswapv3Swap.swapExactInputSingle(
                    tokenIn.address,
                    tokenOut.address,
                    amountIn,
                    fee0
            );
            

            tokenOutBalance = await tokenOutContract.balanceOf(owner);
            console.log(`\tafter buy tokenOut:${tokenOut.symbol} balance:${ethers.formatUnits(tokenOutBalance,tokenOut.decimals)}`);


            //--------------------------Transfer DAI to UniswapV3FlashSwapArbitrage contract-------------------------------------------------------
            const arbitrageContractAddress = await uniswapv3SwapFlashSwapArbitrate.getAddress();
            let arbitrageTokenOutBalance = await tokenOutContract.balanceOf(arbitrageContractAddress);
            console.log(`\tbefore transfer arbitrage contract tokenOut:${tokenOut.symbol} balance:${ethers.formatUnits(arbitrageTokenOutBalance,tokenOut.decimals)}`);
            let tx = await tokenOutContract.transfer(arbitrageContractAddress,tokenOutBalance);
            await tx.wait();
            arbitrageTokenOutBalance = await tokenOutContract.balanceOf(arbitrageContractAddress);
            console.log(`\tafter transfer arbitrage contract tokenOut:${tokenOut.symbol} balance:${ethers.formatUnits(arbitrageTokenOutBalance,tokenOut.decimals)}`);


            //-------------------------------------------------execute arbitrage------------------------------------------------------------------
            const pool0 = "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8";
            const pool1 = "0x60594a405d53811d3BC4766596EFD80fd545A270";
            const arbitrageInputAmount = 500;
            const arbitrageAmountIn = ethers.parseUnits(arbitrageInputAmount.toString(),tokenOut.decimals);        
            await uniswapv3SwapFlashSwapArbitrate.flashSwap(
                pool0,                                          // address pool0,
                fee1,                                           // uint24 fee1,
                DAI_TOKEN.address,                              // address tokenIn,
                WETH_TOKEN.address,                             // address tokenOut,
                arbitrageAmountIn                               // uint256 amountIn
            )


            




        })

    })
})