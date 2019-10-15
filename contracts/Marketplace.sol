pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
  Precondition: the ids of the data owners are their addresses.
*/
contract Marketplace {
    struct ModelData {
        string modelId;
        address[] trainers;
        address[] validators;
        uint[] msesByIter; // El MB chequea con su mse contra esto
        mapping(address => uint[]) partialMsesByIter;
        uint currIter;
        uint improvement; // Percentage
        uint frozenPayment;
        mapping(address => uint) contributions; // Percentages
        Status status;
        address owner; // Model Buyer's are the owners
        address federatedAggregator; // federatedAggregator orchestrator
    }

    mapping(address => bool) public dataOwners;
    mapping(address => bool) public federatedAggregators;
    mapping(address => bool) public modelBuyers;
    mapping(string => ModelData) public models;
    mapping(string => uint256) private payments;
    mapping(string => uint256) public prices;

    enum Status {INITIATED, STOPPED, FINISHED}

    constructor() public {
        prices["LINEAR_REGRESSION"] = 5883045064;
    }

    /******************************************************************************************************************/
    /******************************                       EVENTS                      *********************************/
    /******************************************************************************************************************/

    event ModelCreationPayment(address owner, uint256 amount);
    event ContributionPayment(address receiver, uint256 amount);
    event ValidationPayment(address receiver, uint256 amount);
    event OrchestrationPayment(address receiver, uint256 amount);
    event ModelBuyerReturnPayment(address receiver, uint256 amount);

    /******************************************************************************************************************/
    /******************************                     MODIFIERS                     *********************************/
    /******************************************************************************************************************/

    modifier onlyDataOwner() {
        require(dataOwners[msg.sender], "Must be a Data Owner to call this function");
        _;
    }

    modifier onlyFederatedAggr() {
        require(federatedAggregators[msg.sender], "Must be a Fed. Aggr. to call this function");
        _;
    }

    modifier onlyModelBuyer() {
        require(modelBuyers[msg.sender], "Must be a Model Buyer to call this function");
        _;
    }

    modifier onlyModelBuyerOrFederatedAggr() {
        require(modelBuyers[msg.sender] || federatedAggregators[msg.sender], "Must be a Model Buyer or Fed. Aggr. to call this function");
        _;
    }

    modifier isInitiated(string memory modelId) {
        require(models[modelId].status == Status.INITIATED, "Model training must be initiated to call this function");
        _;
    }

    modifier isFinished(string memory modelId) {
        require(models[modelId].status == Status.FINISHED, "Model training must be finished to call this function");
        _;
    }

    /******************************************************************************************************************/
    /******************************                 REGISTERING ACTORS                *********************************/
    /******************************************************************************************************************/

    /**
      Adds a new Data Owner to the DataOwners set.
      @param doAddress the data owner address used as value in the mapping
    */
    function setDataOwner(address doAddress) public {
        dataOwners[doAddress] = true;
    }

    function setFederatedAggregator(address fedAggrAddress) public {
        federatedAggregators[fedAggrAddress] = true;
    }

    function setModelBuyer(address modelBuyerAddress) public {
        modelBuyers[modelBuyerAddress] = true;
    }

    /******************************************************************************************************************/
    /******************************                   MODEL CREATION                  *********************************/
    /******************************************************************************************************************/

    function initModel(string memory modelId, address[] memory validators, address[] memory trainers, address modelBuyer, address federatedAggregator) private pure returns (ModelData memory) {
        ModelData memory model = ModelData({
            trainers: trainers,
            validators: validators,
            modelId: modelId,
            msesByIter: new uint[](200),
            improvement: 0,
            currIter: 0,
            frozenPayment: 0,
            status: Status.INITIATED,
            owner: modelBuyer,
            federatedAggregator: federatedAggregator
        });
        return model;
    }

    function newModel(string memory modelId, address[] memory validators, address[] memory trainers, address modelBuyer) public onlyFederatedAggr {
        models[modelId] = initModel(modelId, validators, trainers, modelBuyer, msg.sender);
    }

    /**
      Called from ModelBuyer when ordering training of model.
    */
    function payForModel(string memory modelId, uint256 pay) public payable onlyModelBuyer {
        require(msg.value == pay, "Payment amount is not correct.");
        if (payments[modelId] == 0) {
            payments[modelId] = 0;
        }
        payments[modelId] += pay;
        emit ModelCreationPayment(address(this), pay);
    }

    function finishModelTraining(string memory modelId) public onlyModelBuyer isInitiated(modelId) {
        models[modelId].status = Status.FINISHED;
    }

    /******************************************************************************************************************/
    /******************************                 METRICS PERSISTENCE               *********************************/
    /******************************************************************************************************************/

    function updateCurrentIterForModel(string memory modelId, uint iter) private {
        if (iter > models[modelId].currIter) {
            models[modelId].currIter = iter;
        }
    }

    function saveMse(string memory modelId, uint mse, uint iter) public onlyFederatedAggr isInitiated(modelId) {
        updateCurrentIterForModel(modelId, iter);
        models[modelId].msesByIter[iter] = mse;
    }

    function savePartialMse(string memory modelId, uint mse, address trainer, uint iter) public onlyFederatedAggr isInitiated(modelId) {
        require(dataOwners[trainer], "Address passed as parameter is not from valid data owner");
        if (models[modelId].partialMsesByIter[trainer].length == 0) {
            models[modelId].partialMsesByIter[trainer] = new uint[](200);
        }
        updateCurrentIterForModel(modelId, iter);
        models[modelId].partialMsesByIter[trainer][iter] = mse;
    }

    /******************************************************************************************************************/
    /******************************                  METRICS GETTERS                  *********************************/
    /******************************************************************************************************************/

    function getDOContribution(string memory modelId, address dataOwnerId) public onlyDataOwner view returns (uint) {
        return _getDOContribution(modelId, dataOwnerId);
    }

    function _getDOContribution(string memory modelId, address dataOwnerId) private view returns (uint) {
        uint contribution = models[modelId].contributions[dataOwnerId];
        return contribution;
    }

    function getImprovement(string memory modelId) public view returns (uint) {
        uint improvement = models[modelId].improvement;
        return improvement;
    }

    /******************************************************************************************************************/
    /******************************                 METRICS VALIDATION                *********************************/
    /******************************************************************************************************************/

    function checkMseForIter(string memory modelId, uint iter, uint mse) public onlyModelBuyer view returns (bool) {
        require(models[modelId].msesByIter.length > 0, "Mse array not initialized.");
        require(models[modelId].msesByIter[iter] > 0, "Mse for iter not initialized.");
        return models[modelId].msesByIter[iter] == mse;
    }

    function checkPartialMseForIter(string memory modelId, address trainer, uint iter, uint mse) public onlyModelBuyer view returns (bool) {
        require(dataOwners[trainer], "Address passed as parameter is not from valid data owner");
        require(models[modelId].partialMsesByIter[trainer].length > 0, "Partial mse array not initialized.");
        require(models[modelId].partialMsesByIter[trainer][iter] > 0, "Partial mse for iter not initialized.");
        return models[modelId].partialMsesByIter[trainer][iter] == mse;
    }

    /******************************************************************************************************************/
    /******************************                     CALCULATIONS                  *********************************/
    /******************************************************************************************************************/

    // Calculates the overall improvement of the model since its initial state expressed as percentage.
    // TODO: Put back as private before deploying
    function calculateImprovement(uint initialMse, uint currMse) public pure returns (uint) {
        return ((initialMse - currMse) * 100) / initialMse;
    }

    // Calculates the contribution made by a data owner in the training of the model, expressed as percentage.
    // TODO: Put back as private before deploying
    function mseDifference(uint intialMse, uint currMse) public pure returns (uint) {
        uint difference = intialMse - currMse;
        if (difference >= 0) {
            return difference;
        } else {
          return 0;
        }
    }

    // TODO: Put back as private before deploying
    function contributionPercentage(uint mseDiff, uint totalDifference) public pure returns (uint) {
        return (mseDiff * 100) / totalDifference;
    }

    // Calculates the contributions made by each of the data owners that participated in the training of the model
    // expressed as percentage.
    function calculateContributions(string memory modelId) public onlyFederatedAggr isFinished(modelId) {
        ModelData storage model = models[modelId];
        uint iter = model.currIter;
        model.improvement = calculateImprovement(model.msesByIter[0], model.msesByIter[iter]);
        uint contributionsSum = 0;
        for (uint i = 0; i < model.trainers.length; i++) {
            address trainer = model.trainers[i];
            model.contributions[trainer] = mseDifference(model.msesByIter[0], model.partialMsesByIter[trainer][iter]);
            contributionsSum = contributionsSum + model.contributions[trainer];
        }
        for (uint i = 0; i < model.trainers.length; i++) {
            address trainer = model.trainers[i];
            model.contributions[trainer] = contributionPercentage(model.contributions[trainer], contributionsSum);
        }
    }

    function calculatePaymentForContribution(string memory modelId, address dataOwner) public onlyDataOwner view returns (uint) {
        return _calculatePaymentForContribution(modelId, dataOwner);
    }

    function _calculatePaymentForContribution(string memory modelId, address dataOwner) private isFinished(modelId) view returns (uint) {
        uint paymentForImprov = (payments[modelId] * getImprovement(modelId)) / 100;
        uint paymentForImprovForTraining = (paymentForImprov * 70) / 100;
        uint paymentForContribution = (paymentForImprovForTraining * _getDOContribution(modelId, dataOwner)) / 100;
        return paymentForContribution;
    }

    /**
      Returns the amount of wei that a payee should get. This payee belongs to a group where each is payed equally.
      @param modelId the model being trained
      @param take part of the payment dedicated for this subset of the payees
      @param payeesCount amount of the payees that belong to the group that is payed equally.
    */
    function calculateFixedPayment(string memory modelId, uint take, uint payeesCount) private view returns (uint) {
        return ((payments[modelId] * take) / 100) / payeesCount;
    }

    /**
      Returns the amount of wei that a data owner working as validator should get for his work.
      @param modelId the model being trained
    */
    function calculatePaymentForValidation(string memory modelId) public view returns (uint) {
        return calculateFixedPayment(modelId, 20, models[modelId].validators.length);
    }

    /**
      Returns the amount of wei that a Fed. Aggr. should get for his work aggregating updates and orchestrating the
      training of the model.
      @param modelId the model being trained
    */
    function calculatePaymentForOrchestration(string memory modelId) public view returns (uint) {
        return calculateFixedPayment(modelId, 10, 1);
    }

    /******************************************************************************************************************/
    /******************************                      PAYMENTS                     *********************************/
    /******************************************************************************************************************/


    /**
        Private payment functions
     */

    function executePayForContribution(string memory modelId, address payable dataOwnerAddress) private isFinished(modelId) {
        uint prize = _calculatePaymentForContribution(modelId, dataOwnerAddress);
        dataOwnerAddress.transfer(prize);
        emit ContributionPayment(dataOwnerAddress, prize);
    }

    function executePayForValidation(string memory modelId, address payable dataOwnerAddress) private isFinished(modelId) {
        uint prize = calculatePaymentForValidation(modelId);
        dataOwnerAddress.transfer(prize);
        emit ValidationPayment(dataOwnerAddress, prize);
    }

    function executePayForOrchestration(string memory modelId, address payable faAddress) private isFinished(modelId) {
        uint prize = calculatePaymentForOrchestration(modelId);
        faAddress.transfer(prize);
        emit OrchestrationPayment(faAddress, prize);
    }

    function returnModelBuyerPayment(string memory modelId, address payable modelBuyer) private isFinished(modelId) {
        uint prize = address(this).balance;
        modelBuyer.transfer(prize);
        emit ModelBuyerReturnPayment(modelBuyer, prize);
    }

    function generateTrainingPayments(string memory modelId) public onlyModelBuyer isFinished(modelId) {
        ModelData storage model = models[modelId];
        // Pay trainers
        for (uint i = 0; i < model.trainers.length; i++) {
            address payable trainer = address(uint160(model.trainers[i]));
            executePayForContribution(modelId, trainer);
        }
        // Pay validators
        for (uint i = 0; i < model.validators.length; i++) {
            address payable validator = address(uint160(model.validators[i]));
            executePayForValidation(modelId, validator);
        }
        // Pay orchestrator
        executePayForOrchestration(modelId, address(uint160(model.federatedAggregator)));
        // Return payments to model buyer
        returnModelBuyerPayment(modelId, address(uint160(model.owner)));
    }

    /**
      Function called from Data Owner with his address.
      Pays the Data Owner for his work done training the model.
    */
    function payForContribution(string memory modelId) public onlyDataOwner {
        executePayForContribution(modelId, msg.sender);
    }

    function payForValidation(string memory modelId) public onlyDataOwner {
        executePayForValidation(modelId, msg.sender);
    }

    function payForOrchestration(string memory modelId) public onlyFederatedAggr {
        executePayForOrchestration(modelId, msg.sender);
    }


}
