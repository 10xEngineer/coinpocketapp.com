(function(HelloBlock, Models) {

  function Transaction(address, attrs) {
    var self = this;

    if (attrs.txHash) {
      self.id = attrs.txHash;
      self.time = attrs.estimatedTxTime * 1000;
      self.blockHeight = attrs.blockHeight;
      self.amountDelta = 0;
      self.inputs = [];
      self.outputs = [];

      // add credits
      for (var j=0; j<attrs.outputs.length; j++) {
        var output = attrs.outputs[j];
        if (output.address === address) {
          self.amountDelta += parseInt(output.value, 10);
        }
        self.outputs.push({
          addr: output.address,
          n: output.index,
          value: output.value
        });
      }

      // subtract debits
      for (var k=0; k<attrs.inputs.length; k++) {
        var input = attrs.inputs[k];
        if (input.address === address) {
          self.amountDelta -= parseInt(input.value, 10);
        }
        self.inputs.push({
          addr: input.address,
          n: input.prevTxoutIndex,
          tx_index: input.prevTxHash,
          value: input.value
        });
      }
    } else {
      self.id = attrs.hash;
      self.time = attrs.time * 1000;
      self.blockHeight = attrs.block_height;
      self.amountDelta = 0;
      self.inputs = [];
      self.outputs = [];

      // add credits
      for (var j=0; j<attrs.out.length; j++) {
        var output = attrs.out[j];
        if (output.addr === address) {
          self.amountDelta += parseInt(output.value, 10);
        }
        self.outputs.push(output);
      }

      // subtract debits
      for (var k=0; k<attrs.inputs.length; k++) {
        var input = attrs.inputs[k].prev_out;
        if (input.addr === address) {
          self.amountDelta -= parseInt(input.value, 10);
        }
        self.inputs.push(input);
      }
    }
  }

  Transaction.prototype.confirmations = function(currentBlockHeight) {
    var confirmations = currentBlockHeight - this.blockHeight + 1;

    if (confirmations > 0) { // positive
      return confirmations;
    } else { // negative or NaN
      return 0;
    }
  };

  Transaction.prototype.amountDeltaBTC = function() {
    return this.amountDelta / 100000000.0;
  };

  var transactions = [];
  transactions.socket = new BlockChainInfo.WebSocket();

  transactions.fetchRecent = function(address, offset, hollaback) {
    var self = this;
    HelloBlock.Addresses.transactions(address, { offset: offset }, function(data) {
      var txsData = data.transactions || [],
          recentTransactions = [];

      self.totalCount = txsData.length;

      for (var i=0; i<txsData.length; i++) {
        var txData = txsData[i];
        var transaction = new Transaction(address, txData);
        recentTransactions.push(transaction);
      }

      if (!self.any() && recentTransactions.length > 0) {
        localStorage.setItem('hasTransactions', 'true');
        self.trigger('transactions.updated', recentTransactions);
      }

      if (typeof hollaback === 'function') {
        hollaback(recentTransactions);
      }
    });
  };

  transactions.onNewTransaction = function(address, hollaback) {
    var self = this;
    self.socket.onNewTransactionForAddress(address, function(data) {
      var transaction = new Transaction(address, data.x);
      hollaback([transaction]);

      if (!self.any()) {
        localStorage.setItem('hasTransactions', 'true');
        self.trigger('transactions.updated', recentTransactions);
      }
    });
  };

  transactions.any = function() {
    return localStorage.getItem('hasTransactions') === 'true';
  };

  MicroEvent.mixin(transactions);
  Models.transactions = transactions;
  Models.Transaction = Transaction;

})(HelloBlock, CoinPocketApp.Models);
