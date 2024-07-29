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



describe("UniswapV3FlashSwapArbitrate Test",function(){
    async function deployUniswapVFlashSwapArbitrageFixture(){
        const [owner,addr1,addr2] = await ethers.getSigners();
        const uniswapv3SwapFlashSwapArbitrate = await ethers.deployContract("UniswapV3FlashSwapArbitrage");

        await uniswapv3SwapFlashSwapArbitrate.waitForDeployment();
        console.log("\towner address:",owner.address,"addr1:",addr1.address,"addr2:",addr2.address);
        console.log("\tuniswapv3Swap contract address:",await uniswapv3SwapFlashSwapArbitrate.getAddress());
        return {uniswapv3Swap: uniswapv3SwapFlashSwapArbitrate,owner,addr1,addr2};
    }

    describe("Deployment",function(){
        it("Should set right owner",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapVFlashSwapArbitrageFixture)
            expect(await uniswapv3Swap.owner()).to.equal(owner.address);
        })
    })
})