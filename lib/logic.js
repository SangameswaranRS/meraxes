
/* global getAssetRegistry getFactory emit query */

/**
 * Track the trade of a commodity from one trader to another
 * @param {org.example.trading.Trade} trade - the trade to be processed
 * @transaction
 */
async function tradeCommodity(trade) { // eslint-disable-line no-unused-vars

    // set the new owner of the commodity
    trade.commodity.owner = trade.newOwner;
    const assetRegistry = await getAssetRegistry('org.example.trading.Commodity');

    // emit a notification that a trade has occurred
    const tradeNotification = getFactory().newEvent('org.example.trading', 'TradeNotification');
    tradeNotification.commodity = trade.commodity;
    emit(tradeNotification);

    // persist the state of the commodity
    await assetRegistry.update(trade.commodity);
}

/**
 * Remove all high volume commodities
 * @param {org.example.trading.RemoveHighQuantityCommodities} remove - the remove to be processed
 * @transaction
 */
async function removeHighQuantityCommodities(remove) { // eslint-disable-line no-unused-vars

    const assetRegistry = await getAssetRegistry('org.example.trading.Commodity');
    const results = await query('selectCommoditiesWithHighQuantity');

    // since all registry requests have to be serialized anyway, there is no benefit to calling Promise.all
    // on an array of promises
    results.forEach(async trade => {
        const removeNotification = getFactory().newEvent('org.example.trading', 'RemoveNotification');
        removeNotification.commodity = trade;
        emit(removeNotification);
        await assetRegistry.remove(trade);
    });
}

/**
 * Transfer money from one account to another
 * @param {org.example.trading.MoneyTransfer} txn - the txn facilitating money transfer
 * @transaction
 */
async function moneyTransfer(txn){
	let amountToBeTransferred = txn.amountToBeTransferred;
	let accountBalance = txn.transferInitTrader.accountBalance;
  	let beneficiaryAccountBalance = txn.beneficiaryTrader.accountBalance;
  	let currentParticipantId = getCurrentParticipant().getFullyQualifiedIdentifier();
  	let transferInitTraderId = txn.transferInitTrader.getFullyQualifiedIdentifier();
  	if(currentParticipantId!==transferInitTraderId){
    	throw new Error("Cross Access of accounts blocked. Invalid current Participant to initiate transaction");
    }
	if(accountBalance >= amountToBeTransferred){
    	//Balance Sufficient 
      	accountBalance -= amountToBeTransferred;
      	beneficiaryAccountBalance+=amountToBeTransferred;
        const participantRegistry = await getParticipantRegistry('org.example.trading.Trader');
      	txn.transferInitTrader.accountBalance = accountBalance;
      	txn.beneficiaryTrader.accountBalance = beneficiaryAccountBalance;
      	await participantRegistry.update(txn.transferInitTrader);
      	await participantRegistry.update(txn.beneficiaryTrader);
      	let factory = getFactory();
      	let MoneyTransferCompletionNotification = factory.newEvent('org.example.trading', 'MoneyTransferCompletionNotification');
      	MoneyTransferCompletionNotification.transferInitTrader = txn.transferInitTrader;
      	MoneyTransferCompletionNotification.beneficiaryTrader = txn.beneficiaryTrader;
      	emit(MoneyTransferCompletionNotification);
      	return "Transaction Initiated";
      	
    }else{
    	throw new Error("Balance Insufficient");  
    }
}
