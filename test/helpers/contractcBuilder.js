const {
  DEFAULT_MAX_BLOCKS_PER_MOVE,
  DEFAULT_MIN_MAX_BLOCKS_PER_MOVE,
  DEFAULT_MAX_MAX_BLOCKS_PER_MOVE,
  ONE_ETHER
} = require('./constants');

const Marketplace = artifacts.require('Marketplace');

const getMarketplace = () => this.using.marketplace || Marketplace.deployed();

const createMarketplace = async ({
}) => {
  this.using.marketplace = await Marketplace.new();
  return this.using.marketplace;
};

module.exports = () => {
  this.using = {};
  return {
    createMarketplace,
    getMarketplace
  };
};
