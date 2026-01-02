import { BaseStrategy, toBig, buyMax, buyRatio, upgradeCost } from './base.js';

export class T8 extends BaseStrategy {
    constructor() {
        super(7);
        this.c1 = this.upgrades[0];
        this.c2 = this.upgrades[1];
        this.c3 = this.upgrades[2];
        this.c4 = this.upgrades[3];
        this.c5 = this.upgrades[4];
        this.setPub();
        this.lastC5 = this.c5.level;
    }

    setPub() {
        const lastPub = this.theory.tauPublished;
        this.pub = lastPub * 2.5;
        this.coast = this.pub / 4;
    }

    buyMilestones(state) {
        if (!state.enableMSPurchase) return;
        for (let i = 1; i < this.theory.milestoneUpgrades.length; i++) {
            this.theory.milestoneUpgrades[i].buy(-1);
        }
    }

    buy(state) {
        if (!state.enableVariablePurchase) return;
        if (this.theory.tau >= this.coast && state.enablePublications) return;

        const c5cost = upgradeCost(this.c5);
        const c4cost = upgradeCost(this.c4);
        const c3cost = upgradeCost(this.c3);

        if (this.c5.level > this.lastC5) {
            this.c1.buy(-1);
            this.c2.buy(-1);
            this.lastC5 = this.c5.level;
        }

        buyMax(this.c5, this.theory.currencies[0].value);
        buyMax(this.c4, c5cost);
        buyMax(this.c3, c5cost.min(c4cost));
        buyMax(this.c2, c3cost.min(c4cost).min(c5cost) / 10);
        buyMax(this.c1, c3cost.min(c4cost).min(c5cost) / 10);
    }

    shouldPublish() {
        return this.theory.tau >= this.pub;
    }

    tick(elapsedTime, multiplier, state) {
        this.buyMilestones(state);
        if (state.enablePublications && this.shouldPublish()) {
            this.theory.publish();
            return true;
        }
        this.buy(state);
        return false;
    }
}
