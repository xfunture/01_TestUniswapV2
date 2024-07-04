//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import "hardhat/console.sol";

contract Token{
    string public name = 'My Hardhat Token';

    string public symbol = 'MHT';

    uint256 public totalsupply = 1000000;

    address public owner;

    mapping(address => uint256) balances;

    event Transfer(address indexed _from,address indexed _to, uint256 _value);


    constructor(){
        balances[msg.sender] = totalsupply;
        owner = msg.sender;

    }

    function transfer(address to,uint256 amount) external {
        require(balances[msg.sender] >= amount,"Not enough tokens");

        console.log(
            "Transfer from %s to $s %s tokens",
            msg.sender,
            to,
            amount
        );
        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transfer(msg.sender,to,amount);
    }

    function balanceOf(address account) external view returns(uint256){
        return balances[account];
    }


}

