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

### 3.scripts/uniswapv3/test.ts
测试uniswapv3 代币交换的功能，目前还不完善
```
npx hardhat run ./scripts/uniswapv3/test.ts
```


运行测试程序
```
npx hardhat run ./scripts/testUniswapV2v3.ts
```


# Fork MAINNET
为了测试代币交换功能，需要在本地fork 以太坊主链
--forking 指定以太坊节点
--fork-block-number 指定特定区块
```
npx hardhat node --fork https://eth-mainnet.g.alchemy.com/v2/<key> --fork-block-number 20145880
```

# 配置文件
运行项目需要配置以下参数
```
ETHERSCAN_API_KEY=
ALCHEMY_API_URL=
ALCHEMY_PRIVATE_KEY=
ETHMAINNET_API_URL=
ETHMAINNET_PRIVATE_KEY=
COINMARKETCAP_API_KEY=
SEPOLIA_API_URL=
SEPOLIA_WS_URL=
SEPOLIA_PRIVATE_KEY=
HOLESKY_API_URL=
HOLESKY_WS_URL=
HOLESKY_PRIVATE_KEY=
```

# UniswapV3
目前ethers.js 版本已经更新到6.13.1
在该版本的基础上实现了单个代币的交换和多跳代币的交换
```
npx hardhat run ./scripts/uniswapv3_ethersv6/testUniswapV3SingleHopSwap.ts
```
### solidity 版本的代币交换功能
合约代码:  
./contract/UniswapV3SingleHopSwap.sol  
测试代码:  
单跳交换：./test/UniswapV3SingleHopSwap.ts
多跳交换：./test/UniswapV3MultiHopSwap.ts  
运行  
```
npx hardhat test ./test/UniswapV3SingleHopSwap.ts 
npx hardhat test ./test/UniswapV3MultiHopSwap.ts 
npx hardhat test ./test/UniswapV2SingleHopSwap.ts
```