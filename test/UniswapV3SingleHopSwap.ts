import { expect } from 'chai';
import { ethers } from 'hardhat';
import  {
    loadFixture
} from "@nomicfoundation/hardhat-network-helpers";
import { DAI_TOKEN, USDC_TOKEN, WETH_ABI, WETH_TOKEN } from '../scripts/uniswapv3/libs/constants';
import { Token } from '@uniswap/sdk-core';
import { getProvider, wallet } from '../scripts/uniswapv3_ethersv6/lib/providers';
import { ERC20_ABI } from '../scripts/uniswapv3_ethersv6/lib/constant';
import { uniswap } from '../typechain-types';
import { quote2ExactOutputSingle } from '../scripts/uniswapv3_ethersv6/lib/quote';


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

    /**
     * eth wrap to weth
     */
    describe("\nWrapEther and UnwrapEther",function(){

        it("Wrap ETH to WETH",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 0.2;
            const inputAmountOut = 0.2;
            const tokenIn:Token = WETH_TOKEN;
            const tokenOut:Token = DAI_TOKEN;
            const poolFee = 3000;
            const contractCddress = await uniswapv3Swap.getAddress()
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = ethers.parseUnits(inputAmountOut.toString(),tokenOut.decimals);


            let ethBalance = await provider.getBalance(wallet.address);
            let wethBalanceBefore = await wethContract.balanceOf(owner);

            console.log(`\tbefore ethBalance: ${ethers.formatEther(ethBalance)}`);
            console.log(`\tbefore owner wethBalance: ${ethers.formatEther(wethBalanceBefore)}`);


            //---------------------------deposit-------------------------------------
            await uniswapv3Swap.wrapEtherToOwner({value:amountIn});
            let wethBalanceAfter = await wethContract.balanceOf(owner);
            ethBalance = await provider.getBalance(wallet.address);

            console.log(`\tafter ethBalance: ${ethers.formatEther(ethBalance)}`);
            console.log(`\tafter owner wethBalance: ${ethers.formatEther(wethBalanceAfter)}`);


            expect(await wethContract.balanceOf(owner)).to.equal(wethBalanceBefore + ethers.parseEther(inputAmount.toString()));

            let contractBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter deposit contract balance: ${ethers.formatEther(contractBalance)}`);

        })

        it("unwrap WETH to ETH to contract",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 0.5;
            const outputAmount = 0.2;
            const tokenIn:Token = WETH_TOKEN;
            const tokenOut:Token = DAI_TOKEN;
            const poolFee = 3000;
            const contractCddress = await uniswapv3Swap.getAddress()
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenIn.decimals);


            //---------------------------wrapEther-------------------------------------
            let contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\n\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapv3Swap.wrapEtherToContract({value:amountIn});
            
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            expect(contractwethBalance).to.equal(amountIn);

            //---------------------------unwrapEther-------------------------------------
            let contractethBalance = await provider.getBalance(contractCddress);
            console.log(`\n\tbefore unwrapEther contract ethBalance: ${ethers.formatEther(contractethBalance)}`);
            
            await uniswapv3Swap.unwrapEtherToContract(amountOut);

            contractethBalance = await provider.getBalance(contractCddress);
            console.log(`\tafter unwrapEther contract ethBalance: ${ethers.formatEther(contractethBalance)}`);


            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter unwrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            //unwrapEther 之后合约的eth 余额应该等于amountOut
            expect(contractethBalance).to.equal(amountOut);

            //unwrapEther 之后合约的weth 余额应该等于inputAmount - inputAmountOut
            expect(contractwethBalance).to.equal(ethers.parseEther((inputAmount - outputAmount).toString()))


            

        })

    })


    /**
     * describe Transaction1 的代码会影响Transaction2的运行结果，如果想要获得准确的Transaction2 的运行结果
     * 需要把describe Transaction1 的代码注释掉
     */
    describe("\nWrapEther and UnwrapEther",function(){
        it("unwrap weth to eth to owner",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 2;
            const outputAmount = 1;
            const tokenIn:Token = WETH_TOKEN;
            const tokenOut:Token = DAI_TOKEN;
            const poolFee = 3000;
            const contractCddress = await uniswapv3Swap.getAddress()
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenOut.decimals);


            //---------------------------wrapEther-------------------------------------
            let ownerethBalance = await provider.getBalance(wallet.address)
            console.log(`\tbefore wrapEther owner ethBalance: ${ethers.formatEther(ownerethBalance)}`);

            let contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapv3Swap.wrapEtherToContract({value:amountIn});
            
            ownerethBalance = await provider.getBalance(wallet.address)
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter wrapEther owner ethBalance: ${ethers.formatEther(ownerethBalance)}`);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            expect(contractwethBalance).to.equal(amountIn);

            //---------------------------unwrapEther to owner-------------------------------------
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            ownerethBalance = await provider.getBalance(wallet.address)
            console.log(`\n\tbefore unwrapEther owner ethBalance: ${ethers.formatEther(ownerethBalance)}`);
            console.log(`\tbefore unwrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            
            await uniswapv3Swap.unwrapEtherToOwner(amountOut);

            ownerethBalance = await provider.getBalance(wallet.address)
            console.log(`\tafter unwrapEther owner ethBalance: ${ethers.formatEther(ownerethBalance)}`);


            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter unwrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            expect(contractwethBalance).to.equal(ethers.parseEther((inputAmount - outputAmount).toString()))

        })
    })

    describe("\nTransaction",function(){
        it("swapExactInputSingle",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 1;
            const tradeAmount = 0.02;
            const outputAmount = 0.2;
            const tokenIn:Token = WETH_TOKEN;
            const tokenOut:Token = DAI_TOKEN;
            const poolFee = 3000;
            const contractCddress = await uniswapv3Swap.getAddress()
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenIn.decimals);



            //---------------------------wrapEther-------------------------------------
            let contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\n\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapv3Swap.wrapEtherToContract({value:amountIn});
            
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            expect(contractwethBalance).to.equal(amountIn);

            //---------------------------wrapEther-------------------------------------
            const output = await uniswapv3Swap.swapExactInputSingle(tokenIn.address,tokenOut.address,ethers.parseUnits(tradeAmount.toString(),tokenIn.decimals),poolFee);
            // console.log("output:",output);
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter swapExactInputSingle contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            const tokenOutBalance = await getERC20Balance(wallet.address,tokenOut.address)
            console.log(`\tafter swapExactInputSingle tokenOut balance: ${ethers.formatUnits(tokenOutBalance,tokenOut.decimals)}`);





        })

        it("swapExactInput",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 1;
            const tradeAmount = 0.02;
            const outputAmount = 0.2;
            const tokenIn:Token = WETH_TOKEN;
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

            const output = await uniswapv3Swap.swapExactInput(
                                         tokenIn.address,
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

        it("swapExactOutputSingle",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 1;
            const tradeAmount = 0.02;
            const outputAmount = 100;
            const tokenIn:Token = WETH_TOKEN;
            const tokenOut:Token = DAI_TOKEN;
            const poolFee = 3000;
            const contractCddress = await uniswapv3Swap.getAddress()
            const amountIn = ethers.parseUnits(inputAmount.toString(),tokenIn.decimals);
            const amountOut = ethers.parseUnits(outputAmount.toString(),tokenIn.decimals);



            //---------------------------wrapEther-------------------------------------
            let contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\n\tbefore wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);

            await uniswapv3Swap.wrapEtherToContract({value:amountIn});
            
            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter wrapEther contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            expect(contractwethBalance).to.equal(amountIn);


            const quoteInput = await quote2ExactOutputSingle(tokenIn,tokenOut,outputAmount,poolFee);
            const amountInMax = quoteInput.amountIn;
            console.log("amountInMax:",amountInMax);

            const output = await uniswapv3Swap.swapExactOutputSingle(
                tokenIn.address,
                tokenOut.address,
                amountInMax,
                amountOut,
                poolFee
            )


            contractwethBalance = await wethContract.balanceOf(contractCddress);
            console.log(`\tafter swapExactOutputSingle contract wethBalance: ${ethers.formatEther(contractwethBalance)}`);
            const tokenOutBalance = await getERC20Balance(wallet.address,tokenOut.address)
            console.log(`\tafter swapExactOutputSingle tokenOut balance: ${ethers.formatUnits(tokenOutBalance,tokenOut.decimals)}`);
        })


        it("swapExactOutput",async function(){
            const {uniswapv3Swap,owner,addr1,addr2 } = await loadFixture(deployUniswapV3SingleHopSwapFixture)
            const inputAmount = 1;
            const outputAmount = 100;
            const tokenIn:Token = WETH_TOKEN;
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


            const quoteInput = await quote2ExactOutputSingle(tokenIn,tokenOut,outputAmount,poolFee);
            const amountInMax = quoteInput.amountIn;
            console.log("\tamountInMax:",amountInMax);

            const output = await uniswapv3Swap.swapExactOutput(
                tokenIn.address,
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