var theoryManager = null;
var R9 = 1;

var getR9 = () => (game.sigmaTotal / 20) ** game.researchUpgrades[8].level;

var init = () => {
    R9 = getR9();
    theory.createCurrency();
    refreshTheoryManager();
};

var tick = (elapsedTime, multiplier) => {
    R9 = getR9();

    if (state.shouldReallocate && game.statistics.tickCount % state.autoFreq == 0) {
        AllocUtils.simpleStar();
        AllocUtils.simpleStudent(true);
        switchTheory();
    }

    if (theoryManager) {
        buyMilestones();
        const published = theoryManager.tick(elapsedTime, multiplier);
        if (published) refreshTheoryManager();
    }

    theory.invalidatePrimaryEquation();
    theory.invalidateQuaternaryValues();
};

var buyMilestones = () => {
    if (!game.activeTheory) return;
    for (let i = 0; i < game.activeTheory.milestoneUpgrades.length; i++) {
        if (i == 0 && theoryManager?.id == 7) continue;
        game.activeTheory.milestoneUpgrades[i].buy(-1);
    }
};

var switchTheory = () => {
    let iMax = -1;
    let max = 0;
    for (let i = 0; i < Math.min(8, game.researchUpgrades[7].level); i++) {
        const value = parseFloat(formatQValue(getTauH(i))) * OVERPUSH[i];
        if (value > max) {
            iMax = i;
            max = value;
        }
    }
    if (iMax >= 0) game.activeTheory = game.theories[iMax];
};

var refreshTheoryManager = () => {
    const theoryId = game.activeTheory?.id;
    if (theoryId == null || theoryId == 8) {
        theoryManager = null;
        return;
    }
    theoryManager = createStrategy(theoryId);
    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
};

game.activeTheoryChanged = () => refreshTheoryManager();

var getTauH = (i) => {
    let tau;
    try {
        tau = game.theories[i].tauPublished.log10();
    } catch (e) {
        tau = 1;
    }
    return TAU_BASE[i] * R9 ** (1 / TAU_TIME_MULT[i]) / 2 ** ((tau - TAU_REQUIREMENTS[i]) / TAU_DECAY[i]);
};

var formatQValue = (input) => {
    let s = ("" + input).substring(0, 9);
    if (s.charAt(8) == '.') s = s.substring(0, 8);
    return s;
};

var quaternaryEntries = [];
for (let i = 0; i < 8; i++) {
    quaternaryEntries.push(new QuaternaryEntry("τ_" + (i + 1), 0));
}

var getQuaternaryEntries = () => {
    for (let i = 0; i < Math.min(8, game.researchUpgrades[7].level); i++) {
        quaternaryEntries[i].value = formatQValue(getTauH(i));
    }
    for (let i = game.researchUpgrades[7].level; i < 8; i++) {
        quaternaryEntries[i].value = formatQValue(0);
    }
    return quaternaryEntries;
};

theory.primaryEquationHeight = 45;

var getPrimaryEquation = () => {
    if (!game.activeTheory || game.activeTheory.id == 8 || !theoryManager) return "";

    let text = "\\begin{eqnarray}";
    if (theoryManager.id != 1 && theoryManager.id != 2) {
        text += "Coast\\;" + theoryManager.theory.latexSymbol + "&=&" + theoryManager.coast + "\\\\";
    } else {
        text += "Phase&=&" + (theoryManager.phase || 1) + "\\\\";
    }

    let pubTau = theoryManager.pub;
    if (theoryManager.id == 1) {
        pubTau = theoryManager.theory.tauPublished * theoryManager.pub ** (1 / 0.198);
    } else if (theoryManager.id == 2) {
        pubTau = theoryManager.theory.tauPublished * theoryManager.pub ** (1 / 0.147);
    }

    text += "Next\\;\\overline{" + theoryManager.theory.latexSymbol + "}&=&" + pubTau + "\\end{eqnarray}";
    return text;
};

var getSecondaryEquation = () => {
    if (theoryManager?.getScheduleDisplay) {
        return theoryManager.getScheduleDisplay();
    }
    return "";
};

var getCurrencyBarDelegate = () => createCurrencyBar();

var getInternalState = () => state.serialize();

var setInternalState = (s) => {
    state.deserialize(s);
    refreshTheoryManager();
};

init();
