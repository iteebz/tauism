import { BaseStrategy, toBig, buyRatio } from './base.js';

class T8 extends BaseStrategy {
    constructor() {
        super(7);
        this.c1 = this.upgrades[0];
        this.c2 = this.upgrades[1];
        this.c3 = this.upgrades[2];
        this.c4 = this.upgrades[3];
        this.c5 = this.upgrades[4];
        this.setPub();
        this.resetAttractor();
        this.scheduledUpgrades = [];
        this.scheduledLevels = [0, 0, 0, 0, 0];
        this.timer = 0;
    }

    c2CostNext(rho) {
        if (rho < 20) return toBig(20);
        return toBig(64).pow(((rho / 20).log2() / Math.log2(64)).ceil()) * 20;
    }

    c4Cost(rho) {
        if (rho < 100) return toBig(0);
        return toBig(5 ** 1.15).pow(((rho / 100).log2() / Math.log2(5 ** 1.15)).floor()) * 100;
    }

    setPub() {
        const lastPub = this.theory.tauPublished;
        const c4Step = 5 ** 1.15;
        const c4Last = this.c4Cost(lastPub);
        const c2NearC4 = this.c2CostNext(c4Last);
        const coef = c2NearC4 / c4Last > 7 ? 3 : 4;
        this.pub = c4Last * c4Step ** coef * 1.1;
        this.coast = this.pub / 4;
    }

    updateSchedule() {
        if (this.scheduledUpgrades.length >= 25) return false;
        const veryBig = parseBigNumber("ee999999");

        while (this.scheduledUpgrades.length < 25) {
            const costs = [
                this.c1.cost.getCost(this.c1.level + this.scheduledLevels[0]) * (5.5 + ((this.c1.level + this.scheduledLevels[0]) % 10) / 1.5),
                this.c2.cost.getCost(this.c2.level + this.scheduledLevels[1]),
                this.c3.cost.getCost(this.c3.level + this.scheduledLevels[2]) * 4,
                this.c4.cost.getCost(this.c4.level + this.scheduledLevels[3]) * 1.3,
                this.c5.cost.getCost(this.c5.level + this.scheduledLevels[4]) * 2.5
            ];

            let minCost = [veryBig, null];
            for (let i = 0; i < costs.length; i++) {
                if (costs[i] < minCost[0]) minCost = [costs[i], i];
            }

            const cost = this.upgrades[minCost[1]].cost.getCost(this.upgrades[minCost[1]].level + this.scheduledLevels[minCost[1]]);
            if (cost >= this.coast) break;

            if (minCost[1] != null) {
                this.scheduledLevels[minCost[1]]++;
                const last = this.scheduledUpgrades[this.scheduledUpgrades.length - 1];
                if (last && last[0] == minCost[1]) last[1]++;
                else this.scheduledUpgrades.push([minCost[1], 1]);
            }
        }
        return true;
    }

    getScheduleDisplay() {
        if (!this.scheduledUpgrades.length) return "Scheduling...";
        let s = "Next: ";
        for (let i = 0; i < Math.min(this.scheduledUpgrades.length, 5); i++) {
            if (this.scheduledUpgrades[i][1] > 1) s += this.scheduledUpgrades[i][1];
            s += "c_" + (this.scheduledUpgrades[i][0] + 1);
            if (i + 1 < Math.min(this.scheduledUpgrades.length, 5)) s += ", ";
        }
        return s;
    }

    buy() {
        if (this.scheduledUpgrades.length === 0) this.updateSchedule();

        if (this.theory.tau >= this.coast) return;

        let refresh = false;
        if (buyRatio(this.c1, 25)) refresh = true;
        if (buyRatio(this.c2, 2)) refresh = true;
        if (buyRatio(this.c3, 10)) refresh = true;
        if (buyRatio(this.c4, 3)) refresh = true;
        if (buyRatio(this.c5, 5)) refresh = true;

        if (refresh) {
            this.scheduledUpgrades = [];
            this.scheduledLevels = [0, 0, 0, 0, 0];
        }

        let bought = false;
        while (this.scheduledUpgrades.length) {
            const idx = this.scheduledUpgrades[0][0];
            const before = this.upgrades[idx].level;
            this.upgrades[idx].buy(1);
            if (before == this.upgrades[idx].level) break;

            bought = true;
            this.scheduledUpgrades[0][1]--;
            this.scheduledLevels[idx]--;
            if (this.scheduledUpgrades[0][1] <= 0) this.scheduledUpgrades.shift();
        }

        if (this.theory.currencies[0].value > this.theory.tauPublished / 1e20 && (this.updateSchedule() || bought)) {}
    }

    resetAttractor() {
        this.timer = 0;
        this.theory.milestoneUpgrades[0].refund(-1);
        this.theory.milestoneUpgrades[0].buy(-1);
    }

    buyMilestones() {
        for (let i = 1; i < this.theory.milestoneUpgrades.length; i++) {
            this.theory.milestoneUpgrades[i].buy(-1);
        }
    }

    shouldPublish() {
        return this.theory.tau >= this.pub;
    }

    tick(elapsedTime, multiplier) {
        this.buyMilestones();

        if (this.shouldPublish()) {
            this.theory.publish();
            return true;
        }

        this.timer++;
        if (this.timer >= 335) this.resetAttractor();

        this.buy();
        return false;
    }
}
