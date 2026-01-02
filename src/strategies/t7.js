import { BaseStrategy, toBig, buyRatio } from './base.js';

class T7 extends BaseStrategy {
    constructor() {
        super(6);
        this.q1 = this.upgrades[0];
        this.c1 = this.upgrades[1];
        this.c2 = this.upgrades[2];
        this.c3 = this.upgrades[3];
        this.c4 = this.upgrades[4];
        this.c5 = this.upgrades[5];
        this.c6 = this.upgrades[6];
        this.setPub();
        this.scheduledUpgrades = [];
        this.scheduledLevels = [0, 0, 0, 0, 0];
    }

    c6CostNext(rho) {
        if (rho < 100) return toBig(100);
        return toBig(2.81).pow(((rho / 100).log2() / Math.log2(2.81)).ceil()) * 100;
    }

    setPub() {
        const lastPub = this.theory.tauPublished;
        let c6Next = this.c6CostNext(lastPub);
        c6Next *= 2.81 ** 5;
        this.pub = c6Next * 1.03;
        if (this.pub / lastPub < 491) this.pub *= 2.81;
        this.coast = this.pub / 2;
    }

    upgradeByIndex(idx) {
        return [this.q1, this.c3, this.c4, this.c5, this.c6][idx];
    }

    updateSchedule() {
        if (this.scheduledUpgrades.length >= 25) return false;
        const veryBig = parseBigNumber("ee999999");

        while (this.scheduledUpgrades.length < 25) {
            const costs = [
                this.q1.cost.getCost(this.q1.level + this.scheduledLevels[0]) * 4,
                this.c3.cost.getCost(this.c3.level + this.scheduledLevels[1]) * 10,
                this.c4.cost.getCost(this.c4.level + this.scheduledLevels[2]) * 10,
                this.c5.cost.getCost(this.c5.level + this.scheduledLevels[3]) * 4,
                this.c6.cost.getCost(this.c6.level + this.scheduledLevels[4])
            ];

            let minCost = [veryBig, null];
            for (let i = 0; i < costs.length; i++) {
                if (costs[i] < minCost[0]) minCost = [costs[i], i];
            }

            const upgrade = this.upgradeByIndex(minCost[1]);
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
        if (!this.scheduledUpgrades.length) return "Scheduling...";
        let s = "Next: ";
        for (let i = 0; i < Math.min(this.scheduledUpgrades.length, 5); i++) {
            if (this.scheduledUpgrades[i][1] > 1) s += this.scheduledUpgrades[i][1];
            s += this.scheduledUpgrades[i][0] == 0 ? "q_1" : "c_" + (this.scheduledUpgrades[i][0] + 2);
            if (i + 1 < Math.min(this.scheduledUpgrades.length, 5)) s += ", ";
        }
        return s;
    }

    buy() {
        if (this.theory.tau >= this.coast) return;

        const q1level = this.q1.level;
        const c6level = this.c6.level;

        let refresh = false;
        if (buyRatio(this.q1, 10)) refresh = true;
        if (buyRatio(this.c3, 20)) refresh = true;
        if (buyRatio(this.c4, 20)) refresh = true;
        if (buyRatio(this.c5, 10)) refresh = true;
        if (buyRatio(this.c6, 2)) refresh = true;

        if (refresh) {
            this.scheduledUpgrades = [];
            this.scheduledLevels = [0, 0, 0, 0, 0];
        }

        let bought = false;
        while (this.scheduledUpgrades.length) {
            const idx = this.scheduledUpgrades[0][0];
            const upgrade = this.upgradeByIndex(idx);
            const before = upgrade.level;
            upgrade.buy(1);
            if (before == upgrade.level) break;

            bought = true;
            this.scheduledUpgrades[0][1]--;
            this.scheduledLevels[idx]--;
            if (this.scheduledUpgrades[0][1] <= 0) this.scheduledUpgrades.shift();
        }

        if (this.theory.currencies[0].value < this.theory.tauPublished / 1e20) return;
        if (this.updateSchedule() || bought) {}

        if (this.theory.currencies[0].value < this.theory.tauPublished / 1e11) return;
        if (this.theory.currencies[0].value * 4 >= this.c6.cost.getCost(this.c6.level)) return;

        if (q1level < this.q1.level || c6level < this.c6.level) {
            this.c1.buy(-1);
            this.c2.buy(-1);
        }
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
