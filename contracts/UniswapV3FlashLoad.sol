// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";



//UniswapV3 闪电贷回调接口
//需要实现并重写uniswapv3FlashCallback() 函数


interface IUniswapV3FlashCallback{

    // 实现该方法，你必须偿还由Pool.flash 发送的代币及计算出的费用金额
    // 调用此方法的合约必须经由官方的UniswapV3Factory 部署的UniswapV3Pool 检查
    // $param fee0 闪电贷结束时，应支付给池token0 的费用金额
    // @param fee1 闪电贷结束时，应支付给池token1 的费用金额
    // @param data 通过IUniswapV3PoolActions@flash 调用，由调用者传递的任何数据
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external;

}

contract UniswapV3FlashLoad{

    //IUniswapV3Pool flash 的入参data
    struct FlashCallbackData{
        uint256 amount0;      // token0 的数量
        uint256 amount1;      // token1 的数量
        address caller;       // 调用者的地址
    }
    IUniswapV3Pool private immutable pool;
    IERC20 private immutable token0;
    IERC20 private immutable token1;
    address public owner;

    constructor(address _pool){
        pool = IUniswapV3Pool(_pool);
        token0 = IERC20(pool.token0());
        token1 = IERC20(pool.token1());
        owner = msg.sender;
    }

    // amount0: token0 的借贷数量
    // amount1: token1 的借贷数量
    function flash(uint256 amount0,uint256 amount1) external{
        bytes memory data = abi.encode(
            FlashCallbackData({
                amount0:amount0,
                amount1:amount1,
                caller:msg.sender
            })
        );

        // 向pool 借钱
        // pool 负责调用transfer 函数向recipient 转移amount 数量的token
        IUniswapV3Pool(pool).flash(address(this),amount0,amount1,data);
    }

    function uniswapV3FlashCallback(
            uint256 fee0,
            uint256 fee1,
            bytes calldata data
    ) external
    {
        console.log("uniswapV3FlashCallback function begin\n");
        console.log("msg.sender:",msg.sender);
        //该函数是回调函数，必须由pool进行调用
        require(msg.sender == address(pool),"not authoried");
        
        //解码数据
        FlashCallbackData memory decoded = abi.decode(data,(FlashCallbackData));
        
        // 定制化的代码，一般写的是实现套利步骤
        if(fee0 > 0){
            // 从个人账户转fee0 数量的token0 到该合约，用于偿还债务
            token0.transferFrom(decoded.caller,address(this),fee0);
        }

        if(fee1 > 0){
            // 从个人账户转fee1 数量的token1 到该合约，用于偿还债务
            token1.transferFrom(decoded.caller,address(this),fee1);
        }

        // 偿还债务，借款金额加手续费
        if(fee0 > 0){
            token0.transfer(address(pool),decoded.amount0 + fee0);
        }

        if(fee1 > 0){
            token1.transfer(address(pool),decoded.amount1 + fee1);
        }

    }
}


interface IUniswapV3Pool{
    function token0() external view returns (address);
    function token1() external view returns (address);
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;

}

interface IERC20{
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient,uint256 amount) external returns (bool);
    function transferFrom(address sender,address recipient,uint256 amount) external returns (bool);
    function allownance(address owner,address spender) external view returns (uint256);
    function approve(address spender,uint256 amount) external returns (bool);
}