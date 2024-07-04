import { expect } from 'chai';
import { ethers } from 'hardhat';
import  {
    loadFixture
} from "@nomicfoundation/hardhat-network-helpers";

describe("Token contract",function(){

    async function deployTokenFixture(){
        const [owner,addr1,addr2] = await ethers.getSigners();

        const hardhatToken = await ethers.deployContract("Token");

        await hardhatToken.waitForDeployment();

        return {hardhatToken,owner,addr1,addr2};
    }

    describe("Deployment",function(){
        it("Should set the right owner",async function(){
            const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
            expect(await hardhatToken.owner()).to.equal(owner.address);
        })

        it("Should assign the total supply of tokens to the owner",async function(){
            const {hardhatToken,owner} = await loadFixture(deployTokenFixture);
    
            const ownerBalance = await hardhatToken.balanceOf(owner.address);
    
            expect(await hardhatToken.totalsupply()).to.equal(ownerBalance);
    
        });
    })

    describe("Transaction",function(){

        it("Should transfer tokens between accounts",async function(){

            const {hardhatToken,owner,addr1,addr2} = await loadFixture(deployTokenFixture);
    
            await hardhatToken.transfer(addr1.address, 50);
            expect(await hardhatToken.balanceOf(addr1.address)).to.equal(50);
    
            // Transfer 50 tokens from addr1 to addr2
            // We use .connect(signer) to send a transaction from another account 
            await expect(
                hardhatToken.connect(addr1).transfer(addr2.address,50)
            ).to.changeTokenBalances(hardhatToken,[addr1,addr2],[-50,50]);
    
        });

        it("Should emit Transfer events",async function(){
            const {hardhatToken,owner,addr1,addr2} = await loadFixture(deployTokenFixture);

            await expect(hardhatToken.transfer(addr1.address,50))
            .to.emit(hardhatToken,"Transfer")
            .withArgs(owner.address,addr1.address,50);

            await expect(hardhatToken.connect(addr1).transfer(addr2.address,50))
            .to.emit(hardhatToken,"Transfer")
            .withArgs(addr1.address,addr2.address,50);

        })

        it("Should fail if sender doesn't have enough tokens",async function(){
            const { hardhatToken, owner, addr1 } = await loadFixture(
                deployTokenFixture
              );
            
              const initialOwnerBalance = await hardhatToken.balanceOf(owner.address);

              await expect(
                hardhatToken.connect(addr1).transfer(owner.address,1)
              ).to.be.revertedWith("Not enough tokens");

              expect(await hardhatToken.balanceOf(owner.address)).to.equal(
                initialOwnerBalance
              )
        })


    })

    


});


