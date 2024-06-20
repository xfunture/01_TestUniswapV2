# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

SwapExactETHForTokens
SwapExactTokensForETH


# Test Swap
scripts 目录下的脚本程序，第一个V2代表的是Uniswap的版本，第二个v2代表的是js程序的版本
### 1.scripts/testUniswapV2v2.ts
使用uniswap/sdk 库实现交换代币的功能,全部swap函数都在MAINNET 上测试过

### 2.scripts/testUniswapV2v3.ts
使用uniswap/v2-sdk库 实现交换代币的功能，并且在fork MAINNET 链上测试过。
