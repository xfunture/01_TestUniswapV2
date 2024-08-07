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
    async function deployUniswapV3FlashLoadFixture(){
        const [owner,addr1,addr2] = await ethers.getSigners();
        const uniswapV3FlashLoad = await ethers.deployContract("UniswapV3FlashLoad");

        await uniswapV3FlashLoad.waitForDeployment();

        const routerAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
        const uniswapv3Swap = await ethers.deployContract("UniswapV3SingleHopSwap",[routerAddress]);

        await uniswapv3Swap.waitForDeployment();

        console.log("\towner address:",owner.address,"addr1:",addr1.address,"addr2:",addr2.address);
        console.log("\tuniswapv3SwapFlashSwapArbitrate contract address:",await uniswapV3FlashLoad.getAddress());
        console.log("\tuniswapv3Swap contract address:",await uniswapv3Swap.getAddress());
        return  {uniswapv3SwapFlashSwapArbitrate: uniswapV3FlashLoad,uniswapv3Swap,owner,addr1,addr2};
    }

    describe("Deployment",function(){
        it("Should set right owner",async function(){
            const {uniswapv3SwapFlashSwapArbitrate,uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3FlashLoadFixture)
            // expect(await uniswapv3SwapFlashSwapArbitrate.owner()).to.equal(owner.address);
        })
    })

})