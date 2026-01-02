import { BaseStrategy, toBig, buyMax, buyRatio, upgradeCost } from './base.js';

export class T7 extends BaseStrategy {
    constructor() {
        super(6);
        this.c1 = this.upgrades[0];
        this.c2 = this.upgrades[1];
        this.c3 = this.upgrades[2];
        this.c4 = this.upgrades[3];
        this.c5 = this.upgrades[4];
        this.c6 = this.upgrades[5];
        this.setPub();
    }

    setPub() {
        const lastPub = this.theory.tauPublished;
        this.pub = lastPub * 4;
        this.coast = this.pub / 10;
    }

    buy(state) {
        if (!state.enableVariablePurchase) return;
        if (this.theory.tau >= this.coast && state.enablePublications) return;

        const c6cost = this.c6.isAvailable ? upgradeCost(this.c6) : parseBigNumber("ee999999");
        const c5cost = this.c5.isAvailable ? upgradeCost(this.c5) : parseBigNumber("ee999999");
        const c4cost = this.c4.isAvailable ? upgradeCost(this.c4) : parseBigNumber("ee999999");
        const c3cost = upgradeCost(this.c3);

        const minCost = c3cost.min(c4cost).min(c5cost).min(c6cost);

        buyMax(this.c6, this.theory.currencies[0].value);
        buyMax(this.c5, this.theory.currencies[0].value);
        buyMax(this.c4, this.theory.currencies[0].value);
        buyMax(this.c3, this.theory.currencies[0].value);
        buyMax(this.c2, minCost / 100);
        buyMax(this.c1, minCost / 100);
    }

    shouldPublish() {
        return this.theory.tau >= this.pub;
    }

    tick(elapsedTime, multiplier, state) {
        if (state.enablePublications && this.shouldPublish()) {
            this.theory.publish();
            return true;
        }
        this.buy(state);
        return false;
    }
}
