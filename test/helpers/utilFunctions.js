const { BN, time } = require('openzeppelin-test-helpers');
const BigNumber = require('bignumber.js');

const getBalance = async address => new BN(await web3.eth.getBalance(address));

const getGasCost = async result => {
  const tx = await web3.eth.getTransaction(result.tx);
  const gasUsed = new BigNumber(result.receipt.cumulativeGasUsed);
  return new BN(gasUsed.times(tx.gasPrice).toFixed());
};

const advanceBlocks = async numberOfBlocks =>
  Promise.all([...Array(numberOfBlocks)].map(() => time.advanceBlock()));
module.exports = {
  getBalance,
  getGasCost,
  advanceBlocks
};
