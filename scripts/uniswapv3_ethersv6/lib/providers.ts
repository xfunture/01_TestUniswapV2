import { CurrentConfig,Enviroment} from '../config';
import { BaseProvider } from '@ethersproject/providers';
import { BigNumberish,ethers } from 'ethers';

// Single copies of provider and wallet
const mainnetProvider = new ethers.JsonRpcProvider(
    CurrentConfig.rpc.mainnet
)

export const wallet = createWallet();

export async function getNonceFromBlock():Promise<number>{
    return wallet.getNonce();
}

// NONCE 全局变量，该变量在区块链中用于防止重用攻击
// 该变量在项目启动时完成初始化，从链上获取nonce 值
// 每次使用调用getNonceLocal ,每次使用nonce 都会加1
export let NONCE:number;

getNonceFromBlock().then(
    result => {
        NONCE = result
        console.log("first get Nonce:",NONCE);
    }
)


export function getNonceLocal(){
    NONCE = NONCE + 1
    console.log("getNonceLocal NONCE:",NONCE);
    return NONCE;
}

export enum TransactionState{
    Failed = 'Failed',
    New = 'New',
    Rejected = 'Rejected',
    Sending = 'Sending',
    Sent = 'Sent',
}

// Provider Functions
export function getProvider():ethers.JsonRpcApiProvider{
    let rpc_url = CurrentConfig.rpc.local;
    // console.log("getProvider:",rpc_url);
    return new ethers.JsonRpcProvider(rpc_url);
}

export function getMainnetProvider():ethers.JsonRpcProvider{
    return mainnetProvider;
}


export function getWallet(){
    let rpc_url = CurrentConfig.rpc.local;
    console.log("getWallet:",rpc_url);
    // return new ethers.Wallet(CurrentConfig.wallet., PROVIDER);
}


export function getWalletAddress():string{
    return wallet.address;
}

function createWallet():ethers.Wallet{
    let provider = getProvider();
    if(CurrentConfig.env == Enviroment.LOCAL){
        provider = new ethers.JsonRpcProvider(CurrentConfig.rpc.local);
    }
    return new ethers.Wallet(CurrentConfig.wallet.privateKey,provider);
}

export async function sendTransaction(
    transaction:ethers.TransactionRequest
):Promise<ethers.TransactionReceipt>{
    return sendTransactionViaWallet(transaction)
}

async function sendTransactionViaWallet(
    transaction:ethers.TransactionRequest
):Promise<ethers.TransactionReceipt>{
    if(transaction.value){
        transaction.value = BigInt(transaction.value)
    }


    let nonce = await getNonceFromBlock();
    // console.log("sendTransactoin nonce:",nonce);
    // let nonce = getNonceLocal();
    transaction.nonce = nonce;
    transaction.maxPriorityFeePerGas = ethers.parseUnits('1','gwei');
    const txRes = await wallet.sendTransaction(transaction
    );

    let receipt = null;
    const provider = getProvider();
    if(!provider){
        throw new Error("no provider");
    }

    while(receipt === null){
        try{
            receipt = await provider.getTransactionReceipt(txRes.hash)
            if(receipt === null)
            {
                continue;
            }
        } catch (e){
            console.log(`Receipt error:`,e);
            break;
        }
    };
    // console.log("receipt:",receipt);
    // Transaction was successful if status === 1
    if(receipt === null || receipt.status==0){
        throw new Error(`sendTransaction error @{receipt}`);
    }
    return receipt
}