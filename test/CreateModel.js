const { expectEvent, BN } = require('openzeppelin-test-helpers');
const { expect, use } = require('chai');

const dirtyChai = require('dirty-chai');
const bnChai = require('bn-chai');
const { getMarketplace, DEFAULT_BET, getGasCost, getBalance } = require('./helpers/testHelper');

use(dirtyChai);
use(bnChai(BN));

describe('Game tests-Disconnection', function() {
    contract('GIVEN there is an open game', function(accounts) {
        let owner = accounts[0];
        let trainer1 = accounts[1];
        let trainer2 = accounts[2];
        let trainer3 = accounts[3];
        let trainer4 = accounts[4];
        let validator1 = accounts[5];
        let validator2 = accounts[6];
        let fedAggr = accounts[7];
        let modelBuyer = accounts[8];

        let marketplace;
        before(async function() {
            marketplace = await getMarketplace();

            await marketplace.setDataOwner(trainer1, { from: trainer1 });
            await marketplace.setDataOwner(trainer2, { from: trainer2 });
            await marketplace.setDataOwner(trainer3, { from: trainer3 });
            await marketplace.setDataOwner(trainer4, { from: trainer4 });
            await marketplace.setDataOwner(validator1, { from: validator1 });
            await marketplace.setDataOwner(validator2, { from: validator2 });
            await marketplace.setFederatedAggregator(fedAggr, { from: fedAggr });
            await marketplace.setModelBuyer(modelBuyer, { from: modelBuyer })

        });
        describe('WHEN the player one wins by a row', function() {
            let result;
            let initialMse = 1000;
            let iter = 0;
            before(async function() {
                await marketplace.newModel("model1", [validator1], [trainer1, trainer2], modelBuyer, { from: fedAggr });
                await marketplace.saveMse("model1", initialMse, iter, {from: fedAggr});
                result = await marketplace.checkMseForIter("model1", iter, initialMse, {from: modelBuyer})
            });
            it('THEN the result is true', async function() {
                expect(result).to.be.true();
            });
        });
    });
});
