const { expectEvent, BN, ether } = require('openzeppelin-test-helpers');
const { expect, use } = require('chai');

const dirtyChai = require('dirty-chai');
const bnChai = require('bn-chai');
const { getMarketplace, DEFAULT_BET, getGasCost, getBalance } = require('./helpers/testHelper');

use(dirtyChai);
use(bnChai(BN));

describe('Model entire training cicle', function() {
    contract('GIVEN a new order for model trainig', function(accounts) {
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
        describe('WHEN training the model using trainer1 and trainer2 as trainers', function() {
            let result = true;
            let mse = 1000;
            let contrib1;
            let contrib2;
            let contrib3;
            let contrib4;
            let improv;
            before(async function() {
                await marketplace.newModel(modelId, [validator1], [trainer1, trainer2], modelBuyer, { from: fedAggr });
                await marketplace.payForModel(modelId, ether('5'), {value: ether('5'), from: modelBuyer});
                await marketplace.saveMse(modelId, mse, 0, {from: fedAggr});
                await marketplace.savePartialMse(modelId, mse, trainer1, 0, {from: fedAggr});
                await marketplace.checkMseForIter(modelId, 0, mse, {from: modelBuyer});
                await marketplace.checkPartialMseForIter(modelId, trainer1, 0, mse, {from: modelBuyer});
                let i;
                for (i = 1; i <= 50; i++) {
                    mse = mse - 10;
                    await marketplace.saveMse(modelId, mse, i, {from: fedAggr});
                    await marketplace.savePartialMse(modelId, mse + 8, trainer1, i, {from: fedAggr});
                    await marketplace.savePartialMse(modelId, mse - 2, trainer2, i, {from: fedAggr});
                    await marketplace.checkMseForIter(modelId, i, mse, {from: modelBuyer});
                    await marketplace.checkPartialMseForIter(modelId, trainer1, i, mse + 8, {from: modelBuyer});
                    await marketplace.checkPartialMseForIter(modelId, trainer1, i, mse - 2, {from: modelBuyer});
                }
                await marketplace.finishModelTraining(modelId, {from: modelBuyer});
                await marketplace.calculateContributions(modelId, {from: fedAggr});
                improv = await marketplace.getImprovement(modelId);
                contrib1 = await marketplace.calculatePaymentForContribution(modelId, trainer1, {from: trainer1});
                contrib2 = await marketplace.calculatePaymentForContribution(modelId, trainer2, {from: trainer2});
                contrib3 = await marketplace.calculatePaymentForValidation(modelId);
                contrib4 = await marketplace.calculatePaymentForOrchestration(modelId);
                await marketplace.payForContribution(modelId, {from: trainer1});
                await marketplace.payForContribution(modelId, {from: trainer2});
                await marketplace.payForValidation(modelId, {from: validator1});
                await marketplace.payForOrchestration(modelId, {from: fedAggr});
            });
            it('THEN the contributions should be correct', async function() {
                expect(result).to.be.true();
                console.log(contrib3.toString(10));
                console.log(contrib4.toString(10));

                expect(contrib1).to.be.a.bignumber.that.is.greaterThan(ether('0.8'));
                expect(contrib2).to.be.a.bignumber.that.is.greaterThan(ether('0.8'));
                expect(contrib1).to.be.a.bignumber.that.is.lessThan(ether('1'));
                expect(contrib2).to.be.a.bignumber.that.is.lessThan(ether('1'));

                expect(contrib3).to.be.a.bignumber.that.is.equal(ether('1'));
                expect(contrib4).to.be.a.bignumber.that.is.equal(ether('0.5'));
            });
        });
    });
});
