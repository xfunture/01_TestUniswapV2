# Test UniswapV2 Swap function

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
目前已经完成了UniswapV2 所有代币交换函数的测试工作
包含以下交换代币函数：
* swapExactTokensForTokens 用指定数量的代币交换其他代币
* swapTokensForExactTokens 使用代币交换指定数量的其他代币
* swapTokensForExactETH    使用代币交换指定数量的ETH
* swapExactTokensForETH    使用指定数量的代币交换ETH
* swapETHForExactTokens    使用ETH交换指定数量的代币
* swapExactTokensForTokensSupportingFeeOnTransferTokens 使用指定数量的代币交换其他代币，支持转账时扣费
* swapExactETHForTokensSupportingFeeOnTransferTokens 使用ETH交换指定数量的代币，支持转账时扣费
* swapExactTokensForETHSupportingFeeOnTransferTokens 使用指定数量的代币交换ETH，支持转账时扣费

运行测试程序
```
npx hardhat run ./scripts/testUniswapV3.ts
```


# Fork MAINNET
为了测试代币交换功能，需要在本地fork 以太坊主链
--forking 指定以太坊节点
--fork-block-number 指定特定区块
```
npx hardhat node --forking https://eth-mainnet.g.alchemy.com/v2/<key> --fork-block-number 20145880
```
