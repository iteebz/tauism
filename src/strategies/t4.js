import { BaseStrategy, toBig, buyMax, upgradeCost } from './base.js';

class T4 extends BaseStrategy {
    constructor() {
        super(3);
        this.c1 = this.upgrades[0];
        this.c2 = this.upgrades[1];
        this.c3 = this.upgrades[2];
        this.q1 = this.upgrades[6];
        this.q2 = this.upgrades[7];
        this.q2weight = 1 / (2 - Math.sqrt(2));
        this.setPub();
        this.ratio = 1 + ((this.q + 1.0) * toBig(2).pow(this.c3.level) / (toBig(2).pow(this.c2.level) * this.getC1));
        this.scheduledUpgrades = [];
        this.scheduledLevels = [0, 0, 0, 0, 0];
    }

    get getC1() {
        return Utils.getStepwisePowerSum(this.c1.level, 2, 10, 0).pow(this.theory.milestoneUpgrades[0].level * 0.05 + 1);
    }

    get q() {
        return parseBigNumber(this.theory.tertiaryEquation.substring(2));
    }

    c3Cost(rho) {
        if (rho < 2000) return toBig(0);
        return toBig(2.468).pow(((rho / 2000).log2() / Math.log2(2.468)).floor()) * 2000;
    }

    c3CostNext(rho) {
        if (rho < 2000) return toBig(2000);
        return toBig(2.468).pow(((rho / 2000).log2() / Math.log2(2.468)).ceil()) * 2000;
    }

    q2Cost(rho) {
        if (rho < 10000) return toBig(0);
        return toBig(1000).pow(((rho / 10000).log10() / 3).floor()) * 10000;
    }

    setPub() {
        const lastPub = this.theory.tauPublished;
        const threshold = this.q2weight * toBig(1000 / 2.468 ** 8);
        let c3Near;
        let c3Last = this.c3Cost(lastPub);
        if (lastPub / c3Last > 5) c3Last *= 2.468;
        let c3Amount;

        let q2Last = this.q2Cost(lastPub);
        while (true) {
            c3Near = this.c3CostNext(q2Last);
            if (c3Near > q2Last * threshold && c3Near < q2Last * this.q2weight) {
                c3Amount = ((c3Last / c3Near).log2() / Math.log2(2.468)).round();
                if (c3Amount == 0 || c3Amount == 10 || c3Amount == 11 ||
                    c3Amount == 19 || c3Amount == 20 || c3Amount == 28 ||
                    c3Amount == 29 || c3Amount == 37 || c3Amount >= 38) {
                    break;
                }
            }
            q2Last /= 1000;
        }

        let block = 5;
        const nc3Near = c3Near * 2.468 ** 38;
        const q2Next = q2Last * 10 ** 15;
        if (nc3Near > q2Next * threshold && nc3Near < q2Next * this.q2weight) block = 4;

        this.pub = c3Near;
        if (block == 5) {
            if (c3Amount <= 5) this.pub *= 2.468 ** 10;
            else if (c3Amount <= 14) this.pub *= 2.468 ** 19;
            else if (c3Amount <= 23) this.pub *= 2.468 ** 28;
            else if (c3Amount <= 32) this.pub *= 2.468 ** 37;
            else this.pub *= 2.468 ** 46;
        } else {
            if (c3Amount <= 5) this.pub *= 2.468 ** 10;
            else if (c3Amount <= 15) this.pub *= 2.468 ** 20;
            else if (c3Amount <= 24) this.pub *= 2.468 ** 29;
            else this.pub *= 2.468 ** 38;
        }

        if (this.pub < lastPub * 10) this.pub = lastPub * 80;
        this.pub *= 1.3;
        this.coast = this.pub / 2.468;
    }

    upgradeByIndex(idx) {
        return [this.c1, this.c2, this.c3, this.q1, this.q2][idx];
    }

    updateSchedule() {
        if (this.scheduledUpgrades.length >= 6) return false;
        const veryBig = parseBigNumber("ee999999");

        while (this.scheduledUpgrades.length < 6) {
            const k = this.q * toBig(2).pow(this.c3.level) / (toBig(2).pow(this.c2.level) * this.getC1);
            const p = k > 0 ? 1 / k : 1;
            const c1w = this.c1.cost.getCost(this.c1.level + this.scheduledLevels[0]) * (10 + (this.c1.level % 10) / 2);
            const q1w = this.q1.cost.getCost(this.q1.level + this.scheduledLevels[3]) * (10 + this.q1.level % 10);
            const c2cost = this.c2.cost.getCost(this.c2.level + this.scheduledLevels[1]);
            const q2cost = this.q2.cost.getCost(this.q2.level + this.scheduledLevels[4]);

            const costs = [
                c1w < c2cost ? c1w : veryBig,
                c2cost * k.max(1),
                this.c3.cost.getCost(this.c3.level + this.scheduledLevels[2]) * p,
                q1w < q2cost ? q1w : veryBig,
                q2cost * 1.7
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
        const names = ["c_1", "c_2", "c_3", "q_1", "q_2"];
        for (let i = 0; i < Math.min(this.scheduledUpgrades.length, 5); i++) {
            if (this.scheduledUpgrades[i][1] > 1) s += this.scheduledUpgrades[i][1];
            s += names[this.scheduledUpgrades[i][0]];
            if (i + 1 < Math.min(this.scheduledUpgrades.length, 5)) s += ", ";
        }
        return s;
    }

    buy() {
        if (this.scheduledUpgrades.length === 0) this.updateSchedule();

        if (this.theory.tau >= this.coast) return;
        if (this.theory.currencies[0].value == 0) this.c1.buy(1);

        const k = (this.q + 1) * toBig(2).pow(this.c3.level) / (toBig(2).pow(this.c2.level) * this.getC1);
        const p = k > 0 ? 1 / k : 1;

        let refresh = false;
        if (buyMax(this.c3, this.theory.currencies[0].value * k)) refresh = true;
        if (buyMax(this.q2, upgradeCost(this.c3) / this.q2weight)) refresh = true;
        if (buyMax(this.q1, upgradeCost(this.c3).min(upgradeCost(this.q2)) / 10)) refresh = true;
        if (buyMax(this.c2, this.theory.currencies[0].value * p)) refresh = true;
        if (buyMax(this.c1, upgradeCost(this.c2) / 10)) refresh = true;

        this.ratio = k;

        if (this.theory.currencies[0].value > this.theory.tauPublished / 1e20 && refresh) {
            this.scheduledUpgrades = [];
            this.scheduledLevels = [0, 0, 0, 0, 0];
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
