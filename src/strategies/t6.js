import { BaseStrategy, toBig, buyMax, buyRatio, upgradeCost } from './base.js';

class T6 extends BaseStrategy {
    constructor() {
        super(5);
        this.q1 = this.upgrades[0];
        this.q2 = this.upgrades[1];
        this.r1 = this.upgrades[2];
        this.r2 = this.upgrades[3];
        this.c1 = this.upgrades[4];
        this.c2 = this.upgrades[5];
        this.c3 = this.upgrades[6];
        this.c4 = this.upgrades[7];
        this.c5 = this.upgrades[8];
        this.setPub();
    }

    setPub() {
        const lastPub = this.theory.tauPublished;
        this.pub = lastPub * 20;
        this.coast = this.pub / 100;
    }

    getScheduleDisplay() {
        return "Ratio\\ buying:\\ q,r,c";
    }

    buy() {
        if (this.theory.tau >= this.coast) return;

        const c5cost = this.c5.isAvailable ? upgradeCost(this.c5) : parseBigNumber("ee999999");
        const c4cost = this.c4.isAvailable ? upgradeCost(this.c4) : parseBigNumber("ee999999");

        buyMax(this.c3, c4cost.min(c5cost));
        buyMax(this.c2, c4cost.min(c5cost));
        buyMax(this.c5, this.theory.currencies[1].value);
        buyMax(this.c4, this.theory.currencies[1].value);
        buyMax(this.c1, c4cost.min(c5cost) / 10);

        const q2cost = upgradeCost(this.q2);
        const r2cost = upgradeCost(this.r2);
        const qrmin = q2cost.min(r2cost);

        buyMax(this.q2, this.theory.currencies[0].value);
        buyMax(this.r2, this.theory.currencies[0].value);
        buyMax(this.q1, qrmin / 8);
        buyMax(this.r1, qrmin / 8);
    }

    shouldPublish() {
        return this.theory.tau >= this.pub;
    }

    tick(elapsedTime, multiplier) {
        if (this.shouldPublish()) {
            this.theory.publish();
            return true;
        }
        this.buy();
        return false;
    }
}
