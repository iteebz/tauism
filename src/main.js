var theoryManager = null;
var R9 = 1;

var getR9 = () => (game.sigmaTotal / 20) ** game.researchUpgrades[8].level;

var init = () => {
    R9 = getR9();
    theory.createCurrency();
    refreshTheoryManager();
};

var tick = (elapsedTime, multiplier) => {
    if (game.activeTheory?.id === 8) return;

    R9 = getR9();

    if (state.shouldReallocate && game.statistics.tickCount % state.autoFreq == 0) {
        AllocUtils.simpleStar();
        AllocUtils.simpleStudent(true);
        switchTheory();
    }

    if (game.activeTheory !== null) {
        if (game.activeTheory.id !== theoryManager?.id || game.activeTheory.currencies[0].value == 0)
            refreshTheoryManager();

        if (theoryManager?.theory?.isAutoBuyerActive === true)
            theoryManager.theory.isAutoBuyerActive = false;

        buyMilestones();
        if (theoryManager.tick(elapsedTime, multiplier))
            switchTheory();
    }

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
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
    getQuaternaryEntries();
    let iMax = -1;
    let max = 0;
    for (let i = 0; i < Math.min(8, game.researchUpgrades[7].level); i++) {
        const value = parseFloat(quaternaryEntries[i].value) * OVERPUSH[i];
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

    if (game.researchUpgrades[7].level >= 4) {
        let tau;
        try { tau = game.theories[3].tauPublished.log10(); } catch (e) { tau = 1; }
        const tauH = 1.51 * R9 / 2 ** ((tau - TAU_REQUIREMENTS[3]) / 27.0085302950228);
        quaternaryEntries[3].value = formatQValue(Math.max(tauH, parseFloat(quaternaryEntries[3].value)));
    }

    if (game.researchUpgrades[7].level >= 6) {
        let tau;
        try { tau = game.theories[5].tauPublished.log10(); } catch (e) { tau = 1; }
        const tauH = 7 * R9 ** 0.5 / 2 ** ((tau - TAU_REQUIREMENTS[5]) / 70.0732254255212);
        quaternaryEntries[5].value = formatQValue(Math.max(tauH, parseFloat(quaternaryEntries[5].value)));
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
    let s = "";
    if (game.activeTheory && game.activeTheory.id !== 8) {
        s = "\\tau=" + game.activeTheory.tau;
    }
    if (theoryManager?.getScheduleDisplay) {
        const sched = theoryManager.getScheduleDisplay();
        if (sched) s += s ? "\\quad" + sched : sched;
    }
    return s;
};

var getCurrencyBarDelegate = () => createCurrencyBar();

var getInternalState = () => state.serialize();

var setInternalState = (s) => {
    state.deserialize(s);
    refreshTheoryManager();
};

init();
