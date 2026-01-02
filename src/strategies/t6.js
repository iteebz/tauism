import { BaseStrategy, toBig, buyRatio, upgradeCost } from './base.js';

class T6 extends BaseStrategy {
    constructor() {
        super(5);
        this.q1 = this.upgrades[0];
        this.q2 = this.upgrades[1];
        this.r1 = this.upgrades[2];
        this.r2 = this.upgrades[3];
        this.c1 = this.upgrades[4];
        this.c2 = this.upgrades[5];
        this.c5 = this.upgrades[8];
        this.setPub();
        this.ratio = (this.getMaxC5 * this.r / 2) / (this.getC1 * this.getC2);
        this.scheduledUpgrades = [];
        this.scheduledLevels = [0, 0, 0, 0, 0, 0, 0];
    }

    get getC1() {
        return Utils.getStepwisePowerSum(this.c1.level, 2, 10, 1).pow(1 + this.theory.milestoneUpgrades[3].level * 0.05);
    }

    get getC2() {
        return toBig(2).pow(this.c2.level);
    }

    get maxRho() {
        let max = toBig(0);
        for (let i = 0; i < this.upgrades.length; i++) {
            const upgrade = this.upgrades[i];
            if (upgrade.level) {
                const cost = upgrade.cost.getCost(upgrade.level - 1);
                max = max.max(cost);
            }
        }
        return max.max(this.theory.currencies[0].value);
    }

    get getMaxC5() {
        const rho = this.maxRho;
        if (rho < 15) return 0;
        return toBig(2).pow((rho / 15).log2() / Math.log2(3.9));
    }

    get r() {
        const string = this.theory.tertiaryEquation;
        const begin = string.indexOf("r=");
        const end = string.indexOf(",", begin);
        return parseBigNumber(string.substring(begin + 2, end)).max(Number.MIN_VALUE);
    }

    upgradeByIndex(idx) {
        return [this.q1, this.q2, this.r1, this.r2, this.c1, this.c2, this.c5][idx];
    }

    updateSchedule() {
        if (this.scheduledUpgrades.length >= 6) return false;
        const veryBig = parseBigNumber("ee999999");
        const rHalf = this.r / 2;

        while (this.scheduledUpgrades.length < 6) {
            const k = (this.getMaxC5 * rHalf) / (this.getC1 * this.getC2);
            const c1w = this.c1.cost.getCost(this.c1.level + this.scheduledLevels[4]) * (8 + this.c1.level % 10);
            const c2cost = this.c2.cost.getCost(this.c2.level + this.scheduledLevels[5]);
            const q2cost = this.q2.cost.getCost(this.q2.level + this.scheduledLevels[1]);
            const r2cost = this.r2.cost.getCost(this.r2.level + this.scheduledLevels[3]);
            const c2weight = (c2cost * 2 ** 0.5 > r2cost.min(q2cost)) ? 2 ** 0.5 : 1;

            const costs = [
                this.q1.cost.getCost(this.q1.level + this.scheduledLevels[0]) * (7 + (this.q1.level % 10) / 2),
                q2cost,
                this.r1.cost.getCost(this.r1.level + this.scheduledLevels[2]) * (2 + (this.r1.level % 10) / 4),
                r2cost,
                c1w < c2cost ? c1w : veryBig,
                c2cost * k.max(1) * c2weight,
                this.c5.cost.getCost(this.c5.level + this.scheduledLevels[6]) / k.max(Number.MIN_VALUE).min(1)
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
            const idx = this.scheduledUpgrades[i][0];
            if (idx <= 1) s += "q_" + (idx + 1);
            else if (idx <= 3) s += "r_" + (idx - 1);
            else if (idx <= 5) s += "c_" + (idx - 3);
            else s += "c_5";
            if (i + 1 < Math.min(this.scheduledUpgrades.length, 5)) s += ", ";
        }
        return s;
    }

    c5Cost(rho) {
        if (rho < 15) return toBig(0);
        return toBig(3.9).pow(((rho / 15).log2() / Math.log2(3.9)).floor()) * 15;
    }

    setPub() {
        const lastPub = this.theory.tauPublished.log10().toNumber();
        let target;
        if (lastPub % 10 < 3) target = Math.floor(lastPub / 10) * 10 + 7 + Math.log10(3);
        else if (lastPub % 10 < 6) target = Math.floor(lastPub / 10) * 10 + 11 + Math.log10(5);
        else target = Math.floor(lastPub / 10) * 10 + 14;

        const c5Near = this.c5Cost(toBig(10).pow(target));
        this.pub = c5Near * 4.2;
        this.coast = this.pub / 4;
    }

    buy() {
        if (this.scheduledUpgrades.length === 0) this.updateSchedule();

        if (this.theory.tau >= this.coast) return;

        let refresh = false;
        if (buyRatio(this.r2, 10)) refresh = true;
        if (buyRatio(this.q2, 10)) refresh = true;
        if (buyRatio(this.r1, 100)) refresh = true;
        if (buyRatio(this.q1, 100)) refresh = true;
        if (buyRatio(this.c5, 100)) refresh = true;
        if (buyRatio(this.c2, 10000)) refresh = true;
        if (buyRatio(this.c1, 100000)) refresh = true;

        const rHalf = this.r / 2;
        const veryBig = parseBigNumber("ee999999");
        let k = 1;

        for (let n = 0; n < 50; n++) {
            k = (this.getMaxC5 * rHalf) / (this.getC1 * this.getC2);
            const c1w = upgradeCost(this.c1) * (8 + this.c1.level % 10);
            const c2cost = upgradeCost(this.c2);
            const c2weight = (c2cost * 2 ** 0.5 > upgradeCost(this.r2).min(upgradeCost(this.q2))) ? 2 ** 0.5 : 1;

            const costs = [
                upgradeCost(this.q1) * (7 + (this.q1.level % 10) / 2),
                upgradeCost(this.q2),
                upgradeCost(this.r1) * (2 + (this.r1.level % 10) / 4),
                upgradeCost(this.r2),
                c1w < c2cost ? c1w : veryBig,
                c2cost * k.max(1) * c2weight,
                veryBig,
                veryBig,
                upgradeCost(this.c5) / k.max(Number.MIN_VALUE).min(1)
            ];

            let minCost = [veryBig, null];
            for (let i = 0; i < 9; i++) {
                if (costs[i] < minCost[0]) minCost = [costs[i], i];
            }

            if (minCost[1] != null && upgradeCost(this.upgrades[minCost[1]]) <= this.theory.currencies[0].value) {
                this.upgrades[minCost[1]].buy(1);
                refresh = true;
            } else break;
        }

        this.ratio = k;

        if (this.theory.currencies[0].value > this.theory.tauPublished / 1e20 && refresh) {
            this.scheduledUpgrades = [];
            this.scheduledLevels = [0, 0, 0, 0, 0, 0, 0];
            this.updateSchedule();
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
