
let lastSelectedWidgetId
let widgetName = document.querySelector('#widget-name')
let widgetInfo = document.querySelector('.widget-info')
let placeholder = document.querySelector('.no-selected-widget')


let form = document.querySelector('#formLauncher')
let diceLaunchButton = document.querySelector('#diceLaunch')
let diceRelaunchButton = document.querySelector('#diceRelaunch')
let pseudoInput = document.querySelector('#pseudo')
let nbDiceInput = document.querySelector('#nbDice')
let miseTo15Input = document.querySelector('#miseTo15')
let explodeInput = document.querySelector('#explode')
let addOneInput = document.querySelector('#addOne')
let result = document.querySelector('#result')
let lastRolls = [];

/**
 * Code du lanceur de dé
 */
var OrderedResults = (function () {
    function OrderedResults() {
        this[1] = 0;
        this[2] = 0;
        this[3] = 0;
        this[4] = 0;
        this[5] = 0;
        this[6] = 0;
        this[7] = 0;
        this[8] = 0;
        this[9] = 0;
        this[10] = 0;
        this[11] = 0;
    }
    OrderedResults.prototype.hasMoreRaises = function (required) {
        for (var i = 11; i > 0; i--) {
            required -= this[i] * i;
            if (required <= 0)
                return true;
        }
        return false;
    }; //An implementation with a custom indexer keeping track of the sum could be faster
    OrderedResults.prototype.getCopy = function () {
        var copy = new OrderedResults();
        for (var i = 1; i <= 11; i++) {
            copy[i] = this[i];
        }
        return copy;
    };
    OrderedResults.prototype.toArray = function () {
        var numbers = new Array();
        for (var i = 1; i <= 11; i++) {
            for (var j = this[i]; j > 0; j--) {
                numbers.push(i);
            }
        }
        return numbers;
    };
    OrderedResults.prototype.toString = function () {
        return this.toArray().join(',');
    };
    return OrderedResults;
})();
var RaiseSet = (function () {
    function RaiseSet(set, raises) {
        this.set = set;
        this.raises = raises;
    }
    RaiseSet.prototype.toString = function () {
        return "(" + this.set.join(',') + "): " + this.raises + " raises";
    };
    return RaiseSet;
})();
var Roller = (function () {
    function Roller(isLoggingEnabled) {
        if (isLoggingEnabled === void 0) { isLoggingEnabled = false; }
        this.isLoggingEnabled = isLoggingEnabled;
    }
    Roller.prototype.roll = function (trait, skill, bonus, forceExploding /*see 3 dramatic wounds ;)*/, addOneToDieValue /* see some advantages*/) {
        if (forceExploding === void 0) { forceExploding = false; }
        if (addOneToDieValue === void 0) { addOneToDieValue = false; }
        var results = this.getDice(trait + skill + bonus, forceExploding || skill >= 5);
        if (addOneToDieValue) {
            for (var i = 10; i >= 1; i--) {
                results[i + 1] = results[i];
            }
            results[1] = 0;
        }
        return results;
    };
    Roller.prototype.rollSingle = function () {
        return Math.ceil(Math.random() * 10);
    };
    Roller.prototype.getDice = function (numberOfDice, areExploding) {
        var orderedResults = new OrderedResults();
        for (var i = 0; i < numberOfDice; i++) {
            var current = void 0;
            do {
                current = this.rollSingle();
                orderedResults[current]++;
            } while (areExploding && current == 10);
        }
        return orderedResults;
    };
    Roller.prototype.reroll = function (results, isExploding) {
        for (var i = 1; i <= 11; i++) {
            if (results[i] > 0) {
                var newResult = this.rollSingle();
                results[i]--;
                results[newResult]++;
                return;
            }
        }
    };
    Roller.prototype.removeDice = function (results, lowerThan) {
        for (var i = 1; i < lowerThan; i++) {
            results[i] = 0;
        }
    };
    Roller.prototype.getRaises = function (results, numberRequired, allowDoubleRaises) {
        var rollCopy = results.getCopy(); //to avoid destroying the rolls in the process
        return allowDoubleRaises ?
            this.calculateRaises(rollCopy, numberRequired + 5, 2).concat(this.calculateRaises(rollCopy, numberRequired, 1))
            : this.calculateRaises(rollCopy, numberRequired, 1);
    };
    Roller.prototype.calculateRaises = function (results, numberRequired, raisesPerSet) {
        var raiseSets = new Array(), initialH = 11;
        if (numberRequired == 10) {
            for (var i = 0; i < results[10]; i++) {
                raiseSets.push(new RaiseSet([10], raisesPerSet));
            }
            results[10] = 0;
            if (results[11] == 0) {
                initialH = 9; //we've already used all 10s, so we start with 9    
            }
        }
        var numberAccepted = numberRequired;
        while (results.hasMoreRaises(numberAccepted)) {
            for (var h = Math.min(initialH, numberAccepted); h > 0; h--) {
                var l = Math.min(numberAccepted - h, h); /*important when we need 15s for raises*/
                this.log('higher: ' + h);
                while (results[h] > 0) {
                    var justFoundASet = false;
                    if (h == 11 && numberAccepted == 11) {
                        for (var i = 0; i < results[11]; i++) {
                            raiseSets.push(new RaiseSet([11], raisesPerSet));
                        }
                        results[11] = 0;
                        justFoundASet = true;
                        break;
                    }
                    for (var j = l; j > 0; j--) {
                        justFoundASet = false;
                        var currentSet = new OrderedResults();
                        currentSet[h] = 1;
                        var currentSum = h;
                        do {
                            this.log('lower: ' + j);
                            if (results[j] <= currentSet[j]) {
                                j--;
                                continue;
                            }
                            else {
                                currentSum += j;
                                currentSet[j]++;
                                if (currentSum == numberAccepted) {
                                    justFoundASet = true;
                                    for (var h2 = h; h2 >= j; h2--) {
                                        results[h2] -= currentSet[h2];
                                    }
                                    raiseSets.push(new RaiseSet(currentSet.toArray(), raisesPerSet));
                                    break;
                                }
                                else
                                    j = Math.min(numberAccepted - currentSum, j);
                            }
                        } while (j > 0);
                        if (justFoundASet)
                            break;
                    }
                    if (!justFoundASet)
                        break; //no possible set with this combination of h + numberRequired
                }
            }
            numberAccepted++;
        }
        return raiseSets;
    };
    Roller.prototype.log = function (message) {
        if (this.isLoggingEnabled) {
            console.log(message);
        }
    };
    return Roller;
})();
const roller = new Roller();

miro.onReady(() => {
    reinitData();
})

diceRelaunchButton.addEventListener('click', relaunchDice);
form.addEventListener('change', formChange);
form.addEventListener('submit', launchDice);


function formChange() {
    const formData = new FormData(form);
    const data = {
        pseudo: formData.get('pseudo'),
        nbDice: formData.get('nbDice'),
        rolls: lastRolls.toArray()
    }
    localStorage.setItem('7TH_SEA_ROLLER', JSON.stringify(data));
}

function reinitData() {
    const data = localStorage.getItem('7TH_SEA_ROLLER');
    const parseData = data ? JSON.parse(data) : null;
    if(parseData) {
        pseudoInput.value = parseData.pseudo;
        nbDiceInput.value = parseData.nbDice;
        if(parseData.rolls) {
            lastRolls = createOrderedResult(parseData.rolls);
            printResultInSidebar(lastRolls, calculateRaise(lastRolls, miseTo15Input.checked));
        }
    }
}

function createOrderedResult(arr) {
    const result = new OrderedResults()
    arr.forEach((v) => result[v]++)
    return result
}

/**
 * Extraction du nombre de Raise et du détail de celle-ci.
 */
function calculateRaise(rolls, highDifficult) {
    const raiseSets = roller.getRaises(rolls, highDifficult ? 15 : 10, false)
    var sum = 0
    for (var _i = 0; _i < raiseSets.length; _i++) {
        var set = raiseSets[_i];
        sum += set.raises
    }
    return {
        count: sum.toString(),
        sets: raiseSets.join('\n')
    }
}

/**
 * Orchestration du lancement de dé.
 */
async function launchDice(e) {
    e.preventDefault()
    const rolls = roller.roll(nbDiceInput.valueAsNumber, 0, explodeInput.checked, addOneInput.checked)
    printResult(rolls)
    lastRolls = rolls
    formChange()
    return false
}

async function relaunchDice() {
    roller.reroll(lastRolls, explodeInput.checked);
    formChange()
    printResult(lastRolls);
}

async function printResult(rolls) {
    const raises = calculateRaise(rolls, miseTo15Input.checked)
    await printResultInSticker(rolls, raises);
    printResultInSidebar(rolls, raises);
}

async function printResultInSticker(rolls, raises) {
    const stickersToUpdate = await searchSticker();
    const textToPrint = `${pseudoInput.value}\n\n Résultats :\n ${rolls.toString()} \n\nMises :\n ${raises.count}`

    if(stickersToUpdate) {
        miro.board.widgets.update(stickersToUpdate.map((s) => ({
            ...s,
            text: textToPrint
        })))
    } else {
        miro.board.widgets.create({type: 'sticker', text: textToPrint, capabilities: {
            editable: false
        }})
    }
}

async function searchSticker() {
    const stickers = await miro.board.widgets.get({type: "sticker"});
    const userStickers = stickers.filter((w) => {
        return w.text.indexOf(`${pseudoInput.value}`) >= 0;
    });
    return userStickers.length ? userStickers : null;
}

function printResultInSidebar(rolls, raises) {
    result.innerHTML = `${rolls.toString()} (${raises.count})`;
}

const LS_KEY = 'rtb-plugin-widget-info'


/**
 * Manipulation du local storage
  */
function saveData(widgetId, text) {
  let data = JSON.parse(localStorage.getItem(LS_KEY)) || {}
  data[widgetId] = text
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

function getData(widgetId) {
  let data = JSON.parse(localStorage.getItem(LS_KEY)) || {}
  return data[widgetId] || ''
}
