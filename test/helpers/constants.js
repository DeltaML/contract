const { constants, BN } = require('openzeppelin-test-helpers');

const { ZERO_ADDRESS } = constants;
const ONE_ETHER = new BN(10).pow(new BN(18));

module.exports = {
  ZERO_ADDRESS,
  ONE_ETHER,
  DEFAULT_MAX_MAX_BLOCKS_PER_MOVE: 200,
  DEFAULT_MIN_MAX_BLOCKS_PER_MOVE: 10,
  DEFAULT_MAX_BLOCKS_PER_MOVE: 50,
  DEFAULT_BET: ONE_ETHER
};
