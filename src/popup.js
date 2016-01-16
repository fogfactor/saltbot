$(document).ready(function() {
	$("#upload_c").on("click", function(e) {
		e.stopPropagation();
	});
	$("#upload_r").on("click", function(e) {
		e.stopPropagation();
	});
	
	$("#bic").on("click", function (e) {
		$('#upload_c').trigger('click');		
	});
	$("#bir").on("click", function (e) {
		$('#upload_r').trigger('click');
	});
});

var elementChanged = function(changetype, data) {
	data = data || null;
	chrome.tabs.query({
		active : true,
		currentWindow : true
	}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			type : changetype,
			text : data
		}, function(response) {
			console.log(response.farewell);
		});
	});
}

var btnClicked = function(clicktype, data) {
	data = data || null;
	chrome.tabs.query({
		active : true,
		currentWindow : true
	}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			type : clicktype,
			text : data
		}, function(response) {
			console.log(response.farewell);
		});
	});
};

var drClick = function() {
	btnClicked("dr");
};
var prClick = function() {
	btnClicked("pr");
};
var erClick = function() {
	btnClicked("er");
};
var ecClick = function() {
	btnClicked("ec");
}
var tvClick = function() {
	btnClicked("tv");
};
var taClick = function() {
	btnClicked("ta");
};
var teClick = function() {
	btnClicked("te");
}
var limitChange = function() {
	if (document.getElementById("tl").checked) {
		elementChanged("limit_enable", document.getElementById("limit").value);
	}
	else {
		elementChanged("limit_disable", document.getElementById("limit").value);
	}
}

var changeStrategyClickO = function() {
	btnClicked("cs_o");
};
var changeStrategyClickCS = function() {
	chrome.storage.local.get(["chromosomes_v1"], function(results) {
		console.log(results);
		if (Object.keys(results).length === 0){
			btnClicked("cs_cs_warning");
		}else {
			var data = JSON.stringify(results.chromosomes_v1[0]);
        	btnClicked("cs_cs", data);
		}
	});
};
var changeStrategyClickRC = function() {
	btnClicked("cs_rc");
};
var changeStrategyClickIPU = function() {
	btnClicked("cs_ipu");
};
var onFileReadRecord = function(e) {
	console.log("File read successful.");
	var t = e.target.result;
	btnClicked("ir", t);
};
var onFileReadChromosome = function(e) {
	console.log("File read successful.");
	var t = e.target.result;
	btnClicked("ic", t);
}
var irClick = function() {
	console.log("Attempting records import...");
	var files = document.getElementById('upload_r').files;
	if(files.length>0)
		console.log("Upload successful.");
	else 
		console.log("Upload canceled.");	
	console.log("Attempting to read file...");
	
	var file = files[0];	
	var reader = new FileReader();
	reader.onload = onFileReadRecord;
	reader.readAsText(file);
};
var icClick = function() {
	console.log("Attempting chromosome import...");
	var files = document.getElementById('upload_c').files;
	if(files.length>0)
		console.log("Upload successful.");
	else 
		console.log("Upload canceled.");	
	console.log("Attempting to read file...");
	
	var file = files[0];	
	var reader = new FileReader();
	reader.onload = onFileReadChromosome;
	reader.readAsText(file);
};

//---------------------------------------------------------------------------------------------------------
// SIMULATOR SECTION
//---------------------------------------------------------------------------------------------------------

var Order = function(typeStr, chromosome) {
	this.type = typeStr;
	this.chromosome = chromosome;
};
var Simulator = function() {
	this.data = [];
	this.money = [];
	this.minimum = 400;
};
Simulator.prototype.updateMoney = function(index, odds, selection, amount, correct) {
	var oddsArr = odds.split(":");
	if (!correct) {
		this.money[index] -= amount;
		if (this.money[index] < this.minimum)
			this.money[index] = this.minimum;
	} else {
		if (selection == 0)
			this.money[index] += amount * parseFloat(oddsArr[1]) / parseFloat(oddsArr[0]);
		else if (selection == 1)
			this.money[index] += amount * parseFloat(oddsArr[0]) / parseFloat(oddsArr[1]);
	}
};
Simulator.prototype.getBetAmount = function(strategy, index) {
	var amountToBet;
	var tournament = false;
	var debug = false;
	var balance = this.money[index];

	if (!strategy.confidence)
		amountToBet = Math.ceil(balance * .1);
	else
		amountToBet = strategy.getBetAmount(balance, tournament, debug);

	return amountToBet;
};
Simulator.prototype.applyPenalties = function(c) {
	// anti-domination
	var adOdds = c.timeWeight + c.winPercentageWeight + c.crowdFavorWeight + c.illumFavorWeight;
	var adTime = c.oddsWeight + c.winPercentageWeight + c.crowdFavorWeight + c.illumFavorWeight;
	var adWPer = c.oddsWeight + c.timeWeight + c.crowdFavorWeight + c.illumFavorWeight;
	var adCFW = c.oddsWeight + c.timeWeight + c.winPercentageWeight + c.illumFavorWeight;
	var adIFW = c.oddsWeight + c.timeWeight + c.winPercentageWeight + c.crowdFavorWeight;
	if (c.oddsWeight > adOdds || c.timeWeight > adTime || c.winPercentageWeight > adWPer || c.crowdFavorWeight > adCFW || c.illumFavorWeight > adIFW)
		return 0.05;
	return 1;
};
Simulator.prototype.evalMutations = function(mode) {
	var self = this;
	chrome.storage.local.get(["matches_v1", "characters_v1", "chromosomes_v1"], function(results) {
		var matches = results.matches_v1;
		var data = [];
		var correct = [];
		var totalBettedOn = [];
		var strategies = [];
		var totalPercentCorrect = [];
		self.money = [];
		var updater = new Updater();

		// create orders from string passed in
		var orders = [];
		if (mode == "evolution") {
			// queue up the entire last batch of chromosomes
			var chromosomes = results.chromosomes_v1;
			if (chromosomes) {
				for (var z = 0; z < chromosomes.length; z++)
					orders.push(new Order("cs", new Chromosome().loadFromObject(chromosomes[z])));
			} else {
				var msg = "Pool not initialized.";
				document.getElementById('msgbox').value = msg;
				throw msg;
			}
		} else if (mode == "mass") {

			orders.push(new Order("cs", new Chromosome().loadFromObject(results.chromosomes_v1[0])));
		} else {
			if (document.getElementById("ct").checked)
				orders.push(new Order("ct"));
			if (document.getElementById("cs").checked)
				orders.push(new Order("cs", new Chromosome().loadFromObject(results.chromosomes_v1[0])));
			if (document.getElementById("rc").checked)
				orders.push(new Order("rc"));
		}

		// process orders for strategy creation
		for (var h = 0; h < orders.length; h++) {
			var order = orders[h];
			var strategy;
			switch(order.type) {
			case "ct":
				strategy = new CoinToss();
				break;
			case "cs":
				strategy = new ConfidenceScore(order.chromosome);
				break;
			case "rc":
				strategy = new RatioConfidence();
				break;
			case "ipu":
				strategy = new InternetPotentialUpset(order.chromosome);
				break;
			}
			strategy.debug = false;

			data.push([]);
			correct.push(0);
			totalBettedOn.push(0);
			strategies.push(strategy);
			totalPercentCorrect.push(0);
			self.money.push(self.minimum);
		}

		var characterRecords = [];
		var namesOfCharactersWhoAlreadyHaveRecords = [];

		var nonupsetDenominators = [];
		var upsetDenominators = [];
		var denominators = [];
		var upsetsBetOn = 0;
		var nonUpsetsBetOn = 0;
		var minimizedLosses=0;
		var lossMinimizationAmount=0;

		// process matches
		for (var i = 0; i < matches.length; i++) {

			var info = {
				"character1" : updater.getCharacter(matches[i].c1, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
				"character2" : updater.getCharacter(matches[i].c2, characterRecords, namesOfCharactersWhoAlreadyHaveRecords),
				"matches" : results.matches_v1
			};

			for (var n = 0; n < strategies.length; n++) {
				//reset abstain every time
				strategies[n].abstain = false;
			}

			var actualWinner = (matches[i].w == 0) ? matches[i].c1 : matches[i].c2;

			var predictions = [];
			for (var j = 0; j < strategies.length; j++) {
				predictions.push(strategies[j].execute(info));
			}

			// now update characters
			updater.updateCharactersFromMatch(matches[i], info.character1, info.character2);

			// check results
			if (strategies.length != predictions.length)
				throw "Strategies and predictions are not the same length.";
			for (var k = 0; k < strategies.length; k++) {
				var prediction = predictions[k];
				var strategy = strategies[k];
				var predictionWasCorrect = prediction == actualWinner;
				if (!strategy.abstain) {
					correct[k] += (predictionWasCorrect) ? 1 : 0;

					totalBettedOn[k] += 1;
					totalPercentCorrect[k] = correct[k] / totalBettedOn[k] * 100;
					data[k].push([totalBettedOn[k], totalPercentCorrect[k]]);

					if (mode == "mass")
						if (matches[i].o != "U") {
							var t = matches[i].o.split(":");
							var o1 = parseFloat(t[0]);
							var o2 = parseFloat(t[1]);
							var greaterNumber = o1 < o2 ? o2 / o1 : o1 / o2;
							denominators.push(greaterNumber);

							var isAnUpset = (matches[i].w == 0 && o2 > o1) || (matches[i].w == 1 && o1 > o2);
							if (isAnUpset) {
								upsetDenominators.push(greaterNumber);
								if (predictionWasCorrect)
									upsetsBetOn += 1;
							} else {
								nonupsetDenominators.push(greaterNumber);
								if (predictionWasCorrect)
									nonUpsetsBetOn += 1;
							}
							
							if (!predictionWasCorrect && strategy.confidence && strategy.confidence< 0.9){
								lossMinimizationAmount+=1-strategy.confidence;
								minimizedLosses+=1;
							}
								

							// var avgOddsC1 = updater.getCharAvgOdds(matches[i].c1);
							// var avgOddsC2 = updater.getCharAvgOdds(matches[i].c2);

						}
				}
				//update simulated money
				if (matches[i].o != "U") {
					var moneyBefore = self.money[k];
					strategy.adjustLevel(moneyBefore);
					var betAmount = self.getBetAmount(strategy, k);
					// the 20,000 limit is to compensate for the fact that I haven't been recording the money of the matches -- that amount wouldn't swing the odds
					if (betAmount > 20000)
						betAmount = 20000;
					self.updateMoney(k, matches[i].o, prediction == matches[i].c1 ? 0 : 1, betAmount, predictionWasCorrect);
					if (k == 0 && false)
						console.log("m " + i + ": " + moneyBefore + " o: " + matches[i].o + " b: " + betAmount + " -> " + self.money[k]);
				}
			}
		}

		if (mode == "mass") {
			var dSum = 0;
			for (var z in denominators) {
				dSum += denominators[z];
			}

			var udSum = 0;
			for (var zz in upsetDenominators) {
				udSum += upsetDenominators[zz];
			}

			var nudSum = 0;
			for (var zzz in nonupsetDenominators) {
				nudSum += nonupsetDenominators[zzz];
			}

			console.log("avg denom: " + (dSum / denominators.length).toFixed(0) + ", avg upset: " + (udSum / upsetDenominators.length).toFixed(0) + ", avg nonupset: " + (nudSum / nonupsetDenominators.length).toFixed(0) + 
			", \nupsets called correctly: " + (upsetsBetOn / upsetDenominators.length * 100).toFixed(2) + "%, (" + upsetsBetOn + "/" + upsetDenominators.length + ")"+
			", \nnonupsets called correctly: " + (nonUpsetsBetOn / nonupsetDenominators.length * 100).toFixed(2) + "%, (" + nonUpsetsBetOn + "/" + nonupsetDenominators.length + ")"+
			", \nminimized losses: "+ (minimizedLosses / matches.length * 100).toFixed(2) + "%, (" + minimizedLosses + "/" + matches.length + "), avg loss minimization amount: "
			+(lossMinimizationAmount/minimizedLosses * 100).toFixed(2) + "%");

		}

		if (mode == "evolution" || mode == "mass") {
			//go through totalPercentCorrect, weed out the top 10, breed them, save them
			var sortingArray = [];
			var parents = [];
			var nextGeneration = [];
			var money = true;
			var accuracy = false;
			var unshackle = true;

			if (mode == "evolution") {
				for (var l = 0; l < orders.length; l++) {
					var penalty = self.applyPenalties(orders[l].chromosome);
					if (unshackle) penalty = 1;
					sortingArray.push([orders[l].chromosome, totalPercentCorrect[l], self.money[l], penalty]);
				}
				sortingArray.sort(function(a, b) {
					if (!money && accuracy)
						return (b[1] * b[3]) - (a[1] * a[3]);
					if (money && !accuracy)
						return (b[2] * b[3]) - (a[2] * a[3]);
					return (b[1] * b[2] * b[3]) - (a[1] * a[2] * a[3]);
				});

				var top = Math.round(sortingArray.length / 2);
				for (var o = 0; o < top; o++) {
					parents.push(sortingArray[o][0]);
					//ranking guarantees that we send the best one
					sortingArray[o][0].rank = o + 1;
					nextGeneration.push(sortingArray[o][0]);
				}
				// i really only need to see the best one
				console.log(sortingArray[0][0].toDisplayString() + " -> " + sortingArray[0][1].toFixed(4) + "%,  $" + parseInt(sortingArray[0][2]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
				//
				for (var mf = 0; mf < parents.length; mf++) {
					var parent1 = null;
					var parent2 = null;
					var child = null;
					if (mf == 0) {
						parent1 = parents[0];
						parent2 = parents[parents.length - 1];
					} else if (mf <= 4) {
						parent1 = parents[0];
						parent2 = parents[mf];
					} else {
						parent1 = parents[mf - 1];
						parent2 = parents[mf];
					}
					child = parent1.mate(parent2);
					nextGeneration.push(child);
				}
			}

			var bestPercent;
			var bestMoney;
			if (mode == "evolution") {
				bestPercent = sortingArray[0][1];
				bestMoney = sortingArray[0][2];

				chrome.storage.local.set({
					'chromosomes_v1' : nextGeneration,
					'best_chromosome' : sortingArray[0][0]
				}, function() {
					roundsOfEvolution += 1;
					console.log("\n\n-------- end of gen" + nextGeneration.length + "  " + roundsOfEvolution + ", m proc'd w/ CS " + totalBettedOn[0] + "/" + matches.length + "=" + (totalBettedOn[0] / matches.length * 100).toFixed(0) + "%m -> " + bestPercent.toFixed(1) + "%c, $" + bestMoney.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "   -----------------\n\n");
					document.getElementById('msgbox').value = "g(" + roundsOfEvolution + "), best: " + bestPercent.toFixed(1) + "%, $" + bestMoney.toFixed(0);
					setTimeout(function() {
						simulator.evalMutations("evolution");
					}, 5000);
				});
			} else if (mode == "mass") {
				console.log("\n\n--------------- matches processed: " + matches.length);
				var ipuSum = 0;
				for (var l = 0; l < orders.length; l++) {
					if (orders[l].type == "ipu")
						ipuSum += self.money[l];
					else
						console.log(orders[l].type + ": " + totalPercentCorrect[l] + "%, $" + self.money[l]);
				}
				console.log("average IPU money: " + (ipuSum / (self.money.length - 1)));
			}

		} else {
			self.data = data;
			for (var l = 0; l < orders.length; l++) {
				console.log(orders[l].type + ": " + totalPercentCorrect[l]);
			}
		}

	});
};
Simulator.prototype.initializePool = function() {
	var pool = [new Chromosome(), new Chromosome()];
	while (pool.length < 100) {
		if (pool.length < 20) {
			var offspring = pool[0].mate(pool[1]);
			var foundDuplicate = false;
			for (var i in pool) {
				var ch = pool[i];
				if (ch.equals(offspring))
					foundDuplicate = true;
			}
			if (!foundDuplicate)
				pool.push(offspring);
		} else {
			var chromosome1 = pool[Math.floor(Math.random() * pool.length)];
			var chromosome2 = pool[Math.floor(Math.random() * pool.length)];
			pool.push(chromosome1.mate(chromosome2));
		}

	}
	var newPool = [];
	for (var i = 0; i < pool.length; i++) {
		if (i % 5 == 0) {
			console.log(pool[i].toDisplayString());
			newPool.push(pool[i]);
		}
	}
	chrome.storage.local.set({
		'chromosomes_v1' : newPool
	}, function() {
		document.getElementById('msgbox').value = "initial pool population complete";
	});

};

simulator = new Simulator();
roundsOfEvolution = 0;

document.addEventListener('DOMContentLoaded', function() {
	chrome.storage.local.get('settings_v1', function(result) {
		if (result) {
			document.getElementById("tl").checked = result.settings_v1.limit_enabled;
			document.getElementById("limit").value = result.settings_v1.limit || 10000;
			console.log(document.getElementById("tl"));
			console.log(document.getElementById("limit").value);
		}
		console.log(result);
	});
	
	
	document.getElementById("bdr").addEventListener("click", drClick);
	document.getElementById("bpr").addEventListener("click", prClick);
	document.getElementById("ber").addEventListener("click", erClick);
	document.getElementById("bir").addEventListener("change", irClick);
	document.getElementById("bec").addEventListener("click", ecClick);
	document.getElementById("bic").addEventListener("change", icClick);
	document.getElementById("ugw").addEventListener("click", function() {
		simulator.evalMutations("evolution");
	});
	document.getElementById("rgw").addEventListener("click", function() {
		simulator.initializePool();
	});
	document.getElementById("tv").addEventListener("click", tvClick);
	document.getElementById("ta").addEventListener("click", taClick);
	document.getElementById("te").addEventListener("click", teClick);
	document.getElementById("cs_o").addEventListener("click", changeStrategyClickO);
	document.getElementById("cs_cs").addEventListener("click", changeStrategyClickCS);
	document.getElementById("cs_rc").addEventListener("click", changeStrategyClickRC);
	document.getElementById("cs_ipu").addEventListener("click", changeStrategyClickIPU);
	
	document.getElementById("tl").addEventListener("change", limitChange);
	document.getElementById("limit").addEventListener("change", limitChange);
	chrome.alarms.create("chromosome update", {
		delayInMinutes : 0.1,
		periodInMinutes : 1.0
	});

});

