import { BaseStrategy, toBig, buyMax, upgradeCost } from './base.js';

export class T5 extends BaseStrategy {
    constructor() {
        super(4);
        this.q1 = this.upgrades[0];
        this.q2 = this.upgrades[1];
        this.c1 = this.upgrades[2];
        this.c2 = this.upgrades[3];
        this.c3 = this.upgrades[4];
        this.setPub();
    }

    setPub() {
        const lastPub = this.theory.tauPublished;
        this.pub = lastPub * (lastPub < toBig("e150") ? 25 : 5);
        this.coast = this.pub / 10;
    }

    buy(state) {
        if (!state.enableVariablePurchase) return;
        if (this.theory.tau >= this.coast && state.enablePublications) return;

        const c1cost = upgradeCost(this.c1);
        buyMax(this.c3, c1cost);
        buyMax(this.c2, c1cost);

        const q2cost = upgradeCost(this.q2);
        if (q2cost / 5 < c1cost) {
            buyMax(this.q2, this.theory.currencies[0].value);
            buyMax(this.q1, q2cost / 10);
        }

        buyMax(this.c1, this.theory.currencies[0].value);
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
