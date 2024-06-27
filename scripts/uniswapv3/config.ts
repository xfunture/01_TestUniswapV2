import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import {WETH_TOKEN,USDC_TOKEN,DAI_TOKEN,UNI_TOKEN} from './libs/constants';



export enum Enviroment{
    LOCAL,
    MAINNET,
    WALLET_EXTENSION,
}


// Inputs that configure this example to run
export interface ExampleConfig {
    env:Enviroment
    rpc:{
        local:string,
        mainnet:string,
    }
    wallet:{
        address:string,
        privateKey:string,
    }
    tokens:{
        in:Token,
        amountIn:number,
        out:Token,
        poolFee:number
    }
}

// Example Configuration

export const CurrentConfig:ExampleConfig = {
    env:Enviroment.LOCAL,
    rpc:{
        local:'http://localhost:8545',
        mainnet:'https://eth-mainnet.g.alchemy.com/v2/cuT7e3X1csYwxDNQOI-l0QibriBl2CAC',
    },
    wallet:{
        address:'0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        privateKey:'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    tokens:{
        in:WETH_TOKEN,
        amountIn:0.2,
        out:USDC_TOKEN,
        poolFee:FeeAmount.MEDIUM,
    }
}