# contract
This repository contains the smart contract for the Descentralized ML models marketplace and its tests.

## Requirements

- Node v12.10.0
- [Metamask](https://metamask.io/) plugin installed in the browser

## How to deploy the smart contract

- Open a terminal in the project directory
- Install truffle by running the command
```npm install -g truffle```
- Install all the project dependencies running
```npm install```
- Open the [Ganache app](https://www.trufflesuite.com/ganache) and create a new workspace (or select a previously created one)
- Build the contract by running the command
```truffle compile```
- Deploy the contract running
```truffle migrate```

## How to run the tests (WIP)

- Open a terminal in the project directory
- Run the command
```truffle test```

**IMPORTANT:** Remember that a contract deployed to the network will live forever. If you are testing **using the Ganache local testnet** and making changes to the contract as you go, and you want to upload a new updated version of that contract, the easiest way to go is erasing your current workspace in Ganache and creating a new one were you don't have the contract deployed yet.
