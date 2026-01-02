import { BaseStrategy, toBig, buyRatio } from './base.js';

export class T1 extends BaseStrategy {
    constructor() {
        super(0);
        this.q1 = this.upgrades[0];
        this.q2 = this.upgrades[1];
        this.c3 = this.upgrades[4];
        this.c4 = this.upgrades[5];
        this.lastPub = this.theory.tauPublished;
        this.setPub();
        this.scheduledUpgrades = [];
        this.scheduledLevels = [0, 0, 0, 0];
    }

    get c4NC() {
        const BN10 = toBig(10);
        return BN10.pow(((this.lastPub / BN10.pow(BN10)).log10() / 8).ceil() * 8 + 10);
    }

    setPub() {
        const diff = (this.c4NC / this.lastPub).log10();
        let mult = diff < 3 ? 100 : diff < 5 ? 0.015 : 0.00014;
        this.pub = this.c4NC * mult;
        mult = diff < toBig(3) ? toBig(30) : diff < toBig(5) ? toBig(0.003) : toBig(0.00003);
        this.coast = this.c4NC * mult;
    }

    upgradeByIndex(idx) {
        const map = [
            [this.q1, 5],
            [this.q2, 1.11],
            [this.c3, 5],
            [this.c4, 1]
        ];
        return map[idx];
    }

    updateSchedule() {
        if (this.scheduledUpgrades.length >= 25) return false;
        const veryBig = parseBigNumber("ee999999");

        while (this.scheduledUpgrades.length < 25) {
            const q1cost = this.q1.cost.getCost(this.q1.level + this.scheduledLevels[0]);
            const q2cost = this.q2.cost.getCost(this.q2.level + this.scheduledLevels[1]);
            const c4cost = this.c4.cost.getCost(this.c4.level + this.scheduledLevels[3]);

            let q1weighted = q1cost * 5;
            if (q1cost * (6.9 + (this.q1.level + this.scheduledLevels[0]) % 10) >= q2cost ||
                q1cost * (15.2 + (this.q1.level + this.scheduledLevels[0]) % 10) >= c4cost) {
                q1weighted = veryBig;
            }

            const costs = [
                q1weighted,
                q2cost * 1.11,
                this.c3.cost.getCost(this.c3.level + this.scheduledLevels[2]) * 5,
                c4cost
            ];

            let minCost = [veryBig, null];
            for (let i = 0; i < costs.length; i++) {
                if (costs[i] < minCost[0]) minCost = [costs[i], i];
            }

            const upgrade = this.upgradeByIndex(minCost[1])[0];
            const cost = upgrade.cost.getCost(upgrade.level + this.scheduledLevels[minCost[1]]);
            if (cost >= this.coast) break;

            if (minCost[1] != null) {
                this.scheduledLevels[minCost[1]]++;
                const last = this.scheduledUpgrades[this.scheduledUpgrades.length - 1];
                if (last && last[0] == minCost[1]) last[1]++;
                else this.scheduledUpgrades.push([minCost[1], 1]);
            } else break;
        }
        return true;
    }

    getScheduleDisplay() {
        if (!this.scheduledUpgrades.length) return "";
        let s = "Next\\ upgrades: ";
        for (let i = 0; i < Math.min(this.scheduledUpgrades.length, 5); i++) {
            if (this.scheduledUpgrades[i][1] > 1) s += this.scheduledUpgrades[i][1];
            s += this.scheduledUpgrades[i][0] < 2 ? "q_" + (this.scheduledUpgrades[i][0] + 1) : "c_" + (this.scheduledUpgrades[i][0] + 1);
            if (i + 1 < Math.min(this.scheduledUpgrades.length, 5)) s += ", ";
        }
        return s;
    }

    buy(state) {
        if (!state.enableVariablePurchase) return;
        if (this.theory.tau >= this.coast && state.enablePublications) return;

        let refresh = false;
        if (buyRatio(this.q1, 50)) refresh = true;
        if (buyRatio(this.q2, 2)) refresh = true;
        if (buyRatio(this.c3, 10)) refresh = true;
        if (buyRatio(this.c4, 2)) refresh = true;

        if (refresh) {
            this.scheduledUpgrades = [];
            this.scheduledLevels = [0, 0, 0, 0];
        }

        let bought = false;
        while (this.scheduledUpgrades.length) {
            const idx = this.scheduledUpgrades[0][0];
            const [upgrade, ratio] = this.upgradeByIndex(idx);
            const before = upgrade.level;
            buyRatio(upgrade, ratio);
            if (before == upgrade.level) break;

            bought = true;
            this.scheduledUpgrades[0][1]--;
            this.scheduledLevels[idx]--;
            if (this.scheduledUpgrades[0][1] <= 0) this.scheduledUpgrades.shift();
        }

        if (this.theory.currencies[0].value > this.theory.tauPublished / 1e20) {
            this.updateSchedule();
        }
    }

    shouldPublish() {
        return this.theory.tau > this.pub;
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
