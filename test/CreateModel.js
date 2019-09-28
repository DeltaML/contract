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
        let modelId = "model1";
        let marketplace;
        let initialMse = 1000;
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
        describe('WHEN a new model is created with mse 1000 and I check if its mse is 1000', function() {
            let result;
            let initialMse = 1000;
            let iter = 0;
            before(async function() {
                await marketplace.newModel(modelId, [validator1], [trainer1, trainer2], modelBuyer, { from: fedAggr });
                await marketplace.saveMse(modelId, initialMse, iter, {from: fedAggr});
                result = await marketplace.checkMseForIter(modelId, iter, initialMse, {from: modelBuyer})
            });
            it('THEN the result is true', async function() {
                expect(result).to.be.true();
            });
        });
        describe('WHEN saving new mse and partial mses and we check if they were saved correctly', function() {
            let resultPartialMse1;
            let resultPartialMse2;
            before(async function() {
                await marketplace.savePartialMse(modelId, 900, trainer1, 0, {from: fedAggr});
                await marketplace.savePartialMse(modelId, 800, trainer2, 0, {from: fedAggr});
                resultPartialMse1 = await marketplace.checkPartialMseForIter(modelId, trainer1, 0, 900, {from: modelBuyer});
                resultPartialMse2 = await marketplace.checkPartialMseForIter(modelId, trainer2, 0, 800, {from: modelBuyer});
           });
            it('THEN the result is true', async function() {
                expect(resultPartialMse1).to.be.true();
                expect(resultPartialMse2).to.be.true();
            });
        });
        describe('WHEN saving new mses for next iter and partial mses and we check if they were saved correctly', function() {
            let result;
            let resultPartialMse1;
            let resultPartialMse2;
            before(async function() {
                await marketplace.saveMse(modelId, 800, 1, {from: fedAggr});
                await marketplace.savePartialMse(modelId, 890, trainer1, 1, {from: fedAggr});
                await marketplace.savePartialMse(modelId, 700, trainer2, 1, {from: fedAggr});
                result = await marketplace.checkMseForIter(modelId, 1, 800, {from: modelBuyer});
                resultPartialMse1 = await marketplace.checkPartialMseForIter(modelId, trainer1, 1, 890, {from: modelBuyer});
                resultPartialMse2 = await marketplace.checkPartialMseForIter(modelId, trainer2, 1, 700, {from: modelBuyer});
            });
            it('THEN the result is true', async function() {
                expect(result).to.be.true();
                expect(resultPartialMse1).to.be.true();
                expect(resultPartialMse2).to.be.true();
            });
        });
        describe('WHEN the initialMse is 900 and the mses for trainer 1 and 2 are 800 and 700 respectively', function() {
            let mseDifference1;
            let mseDifference2;
            let contribPercentageDummy;
            let contribPercentage;
            before(async function() {
                mseDifference1 = (await marketplace.mseDifference(900, 800)).toNumber();
                mseDifference2 = (await marketplace.mseDifference(900, 700)).toNumber();
                contribPercentageDummy = (await marketplace.contributionPercentage(100, 200)).toNumber();
                contribPercentage = (await marketplace.contributionPercentage(mseDifference1, mseDifference1 + mseDifference2)).toNumber();
            });
            it('THEN the contribution percentage should be around 33%', async function() {
                expect(mseDifference1).to.equal(100);
                expect(mseDifference2).to.equal(200);
                expect(contribPercentageDummy).to.be.equal(50);
                expect(contribPercentage).to.be.above(30);
                expect(contribPercentage).to.be.below(35);
            });
        });
        describe('WHEN calculating contributions for iter 1 (already saved in previous test)', function() {
            let contributionTrainer1;
            let contributionTrainer2;
            before(async function() {
                await marketplace.finishModelTraining(modelId, {from: modelBuyer});
                await marketplace.calculateContributions(modelId, {from: fedAggr});
                contributionTrainer1 = await marketplace.getDOContribution(modelId, trainer1, {from: trainer1});
                contributionTrainer2 = await marketplace.getDOContribution(modelId, trainer2, {from: trainer2});
            });
            it('THEN the contributions should be above 26% and 73% for trainer1 and trainer2 respectively', async function() {
                expect(contributionTrainer1.toNumber()).to.equal(26);
                expect(contributionTrainer2.toNumber()).to.equal(73);
            });
        });
    });
});
