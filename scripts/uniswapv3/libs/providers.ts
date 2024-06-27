import { CurrentConfig,Enviroment} from '../config';
import { BaseProvider } from '@ethersproject/providers';
import { BigNumber,ethers,providers } from 'ethers';

// Single copies of provider and wallet
const mainnetProvider = new ethers.providers.JsonRpcProvider(
    CurrentConfig.rpc.mainnet
)

const wallet = createWallet();



export enum TransactionState{
    Failed = 'Failed',
    New = 'New',
    Rejected = 'Rejected',
    Sending = 'Sending',
    Sent = 'Sent',
}

// Provider Functions
export function getProvider():providers.Provider{
    let rpc_url = CurrentConfig.rpc.local;
    console.log("getProvider:",rpc_url);
    return new ethers.providers.JsonRpcProvider(rpc_url);
}

export function getMainnetProvider():BaseProvider{
    return mainnetProvider;
}

export function getWalletAddress():string{
    return wallet.address;
}

function createWallet():ethers.Wallet{
    let provider = mainnetProvider;
    if(CurrentConfig.env == Enviroment.LOCAL){
        provider = new ethers.providers.JsonRpcProvider(CurrentConfig.rpc.local);
    }
    return new ethers.Wallet(CurrentConfig.wallet.privateKey,provider);
}

export async function sendTransaction(
    transaction:ethers.providers.TransactionRequest
):Promise<TransactionState>{
    return sendTransactionViaWallet(transaction)
}

async function sendTransactionViaWallet(
    transaction:ethers.providers.TransactionRequest
):Promise<TransactionState>{
    if(transaction.value){
        transaction.value = BigNumber.from(transaction.value)
    }
    const txRes = await wallet.sendTransaction(transaction);

    let receipt = null;
    const provider = getProvider();
    if(!provider){
        return TransactionState.Failed;
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
    console.log("receipt:",receipt);
    // Transaction was successful if status === 1
    if(receipt){
        return TransactionState.Sent
    }else{
        return TransactionState.Failed
    }
}