import { BaseStrategy, buyRatio } from './base.js';

class T3 extends BaseStrategy {
    constructor() {
        super(2);
        this.b1 = this.upgrades[0];
        this.b2 = this.upgrades[1];
        this.b3 = this.upgrades[2];
        this.c12 = this.upgrades[4];
        this.c22 = this.upgrades[7];
        this.c23 = this.upgrades[8];
        this.c31 = this.upgrades[9];
        this.c32 = this.upgrades[10];
        this.c33 = this.upgrades[11];

        this.phase1 = this.theory.tauPublished / 10;
        this.phase2 = 1.2;
        this.phase3 = 2.4;
        this.pub = 2.5;
        this.phase = 1;

        this.scheduledUpgrades1 = [];
        this.scheduledUpgrades2 = [];
        this.scheduledUpgrades3 = [];
        this.scheduledLevels1 = [0, 0];
        this.scheduledLevels2 = [0, 0, 0, 0];
        this.scheduledLevels3 = [0, 0, 0];
    }

    upgradeByIndex1(idx) {
        return idx === 0 ? this.b1 : this.c31;
    }

    updateSchedule1() {
        if (this.scheduledUpgrades1.length >= 15) return false;
        while (this.scheduledUpgrades1.length < 15) {
            const costs = [
                this.b1.cost.getCost(this.b1.level + this.scheduledLevels1[0]) * 8,
                this.c31.cost.getCost(this.c31.level + this.scheduledLevels1[1])
            ];
            let minCost = [parseBigNumber("ee999999"), null];
            for (let i = 0; i < costs.length; i++) {
                if (costs[i] < minCost[0]) minCost = [costs[i], i];
            }
            if (minCost[1] == null) break;
            const upgrade = this.upgradeByIndex1(minCost[1]);
            const cost = upgrade.cost.getCost(upgrade.level + this.scheduledLevels1[minCost[1]]);
            if (cost >= this.theory.tauPublished / 10) break;
            this.scheduledLevels1[minCost[1]]++;
            const last = this.scheduledUpgrades1[this.scheduledUpgrades1.length - 1];
            if (last && last[0] == minCost[1]) last[1]++;
            else this.scheduledUpgrades1.push([minCost[1], 1]);
        }
        return true;
    }

    updateSchedule2() {
        if (this.scheduledUpgrades2.length >= 15) return false;
        const veryBig = parseBigNumber("ee999999");
        while (this.scheduledUpgrades2.length < 15) {
            let costs;
            if (this.phase <= 2) {
                costs = [
                    this.b2.cost.getCost(this.b2.level + this.scheduledLevels2[0]) * 5,
                    this.c12.cost.getCost(this.c12.level + this.scheduledLevels2[1]) * 100,
                    this.c22.cost.getCost(this.c22.level + this.scheduledLevels2[2]) * 2.5,
                    this.c32.cost.getCost(this.c32.level + this.scheduledLevels2[3])
                ];
            } else if (this.phase == 3) {
                costs = [
                    this.b2.cost.getCost(this.b2.level + this.scheduledLevels2[0]) * 8,
                    this.c12.cost.getCost(this.c12.level + this.scheduledLevels2[1]),
                    this.c22.cost.getCost(this.c22.level + this.scheduledLevels2[2]) * 8,
                    this.c32.cost.getCost(this.c32.level + this.scheduledLevels2[3]) * 8
                ];
            } else {
                costs = [
                    this.b2.cost.getCost(this.b2.level + this.scheduledLevels2[0]),
                    this.c12.cost.getCost(this.c12.level + this.scheduledLevels2[1]),
                    veryBig, veryBig
                ];
            }
            let minCost = [veryBig, null];
            for (let i = 0; i < costs.length; i++) {
                if (costs[i] < minCost[0]) minCost = [costs[i], i];
            }
            if (minCost[1] != null) {
                this.scheduledLevels2[minCost[1]]++;
                const last = this.scheduledUpgrades2[this.scheduledUpgrades2.length - 1];
                if (last && last[0] == minCost[1]) last[1]++;
                else this.scheduledUpgrades2.push([minCost[1], 1]);
            } else break;
        }
        return true;
    }

    updateSchedule3() {
        if (this.scheduledUpgrades3.length >= 15) return false;
        const veryBig = parseBigNumber("ee999999");
        while (this.scheduledUpgrades3.length < 15) {
            const costs = [
                this.b3.cost.getCost(this.b3.level + this.scheduledLevels3[0]) * (this.phase == 4 ? 1 : 8),
                this.c23.cost.getCost(this.c23.level + this.scheduledLevels3[1]),
                this.phase <= 2 ? this.c33.cost.getCost(this.c33.level + this.scheduledLevels3[2]) * 10 : veryBig
            ];
            let minCost = [veryBig, null];
            for (let i = 0; i < costs.length; i++) {
                if (costs[i] < minCost[0]) minCost = [costs[i], i];
            }
            if (minCost[1] != null) {
                this.scheduledLevels3[minCost[1]]++;
                const last = this.scheduledUpgrades3[this.scheduledUpgrades3.length - 1];
                if (last && last[0] == minCost[1]) last[1]++;
                else this.scheduledUpgrades3.push([minCost[1], 1]);
            } else break;
        }
        return true;
    }

    getScheduleDisplay() {
        let s = "";
        if (this.scheduledUpgrades1.length) {
            s += "\\rho_1: ";
            for (let i = 0; i < Math.min(this.scheduledUpgrades1.length, 3); i++) {
                if (this.scheduledUpgrades1[i][1] > 1) s += this.scheduledUpgrades1[i][1];
                s += this.scheduledUpgrades1[i][0] == 0 ? "b_1" : "c_{31}";
                if (i + 1 < Math.min(this.scheduledUpgrades1.length, 3)) s += ",";
            }
        }
        if (this.scheduledUpgrades2.length) {
            if (s) s += "\\\\";
            s += "\\rho_2: ";
            for (let i = 0; i < Math.min(this.scheduledUpgrades2.length, 3); i++) {
                if (this.scheduledUpgrades2[i][1] > 1) s += this.scheduledUpgrades2[i][1];
                s += this.scheduledUpgrades2[i][0] == 0 ? "b_2" : "c_{" + this.scheduledUpgrades2[i][0] + "2}";
                if (i + 1 < Math.min(this.scheduledUpgrades2.length, 3)) s += ",";
            }
        }
        if (this.scheduledUpgrades3.length) {
            if (s) s += "\\\\";
            s += "\\rho_3: ";
            for (let i = 0; i < Math.min(this.scheduledUpgrades3.length, 3); i++) {
                if (this.scheduledUpgrades3[i][1] > 1) s += this.scheduledUpgrades3[i][1];
                s += this.scheduledUpgrades3[i][0] == 0 ? "b_3" : "c_{" + (this.scheduledUpgrades3[i][0] + 1) + "3}";
                if (i + 1 < Math.min(this.scheduledUpgrades3.length, 3)) s += ",";
            }
        }
        return s || "Scheduling...";
    }

    buy() {
        if (this.scheduledUpgrades1.length === 0) this.updateSchedule1();
        if (this.scheduledUpgrades2.length === 0) this.updateSchedule2();
        if (this.scheduledUpgrades3.length === 0) this.updateSchedule3();

        const prevPhase = this.phase;
        if (this.pubMultiplier > this.phase3) this.phase = 4;
        else if (this.pubMultiplier > this.phase2) this.phase = 3;
        else if (this.pubMultiplier > this.phase1) this.phase = 2;

        let refresh1 = false, refresh2 = false, refresh3 = false;

        if (buyRatio(this.b1, 100000)) refresh1 = true;
        if (buyRatio(this.c31, 10000)) refresh1 = true;
        if (buyRatio(this.b2, 10)) refresh2 = true;
        if (buyRatio(this.c12, 100)) refresh2 = true;
        if (buyRatio(this.c22, 10)) refresh2 = true;
        if (buyRatio(this.c32, 10)) refresh2 = true;
        if (buyRatio(this.b3, 100)) refresh3 = true;
        if (buyRatio(this.c23, 2)) refresh3 = true;
        if (buyRatio(this.c33, 100)) refresh3 = true;

        if (prevPhase != this.phase) { refresh2 = true; refresh3 = true; }

        if (refresh1) { this.scheduledUpgrades1 = []; this.scheduledLevels1 = [0, 0]; }
        if (refresh2) { this.scheduledUpgrades2 = []; this.scheduledLevels2 = [0, 0, 0, 0]; }
        if (refresh3) { this.scheduledUpgrades3 = []; this.scheduledLevels3 = [0, 0, 0]; }

        const buyScheduled = (scheduled, levels, getUpgrade) => {
            while (scheduled.length) {
                const idx = scheduled[0][0];
                const upgrade = getUpgrade(idx);
                const before = upgrade.level;
                upgrade.buy(1);
                if (before == upgrade.level) break;
                scheduled[0][1]--;
                levels[idx]--;
                if (scheduled[0][1] <= 0) scheduled.shift();
            }
        };

        buyScheduled(this.scheduledUpgrades1, this.scheduledLevels1, i => this.upgradeByIndex1(i));
        buyScheduled(this.scheduledUpgrades2, this.scheduledLevels2, i => [this.b2, this.c12, this.c22, this.c32][i]);
        buyScheduled(this.scheduledUpgrades3, this.scheduledLevels3, i => [this.b3, this.c23, this.c33][i]);

        if (this.theory.currencies[0].value > this.theory.tauPublished / 1e20) {
            this.updateSchedule1();
            this.updateSchedule2();
            this.updateSchedule3();
        }
    }

    shouldPublish() {
        return this.pubMultiplier > this.pub;
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
