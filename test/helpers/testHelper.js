const constants = require('./constants');
const contractsBuilder = require('./contractcBuilder');
const utilFunctions = require('./utilFunctions');

module.exports = {
  ...constants,
  ...contractsBuilder(),
  ...utilFunctions
};
