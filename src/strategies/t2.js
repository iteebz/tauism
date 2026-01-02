import { BaseStrategy } from './base.js';

class T2 extends BaseStrategy {
    constructor() {
        super(1);
        this.pub = 8000;
        this.qr1 = 4650;
        this.qr2 = 2900;
        this.qr3 = 2250;
        this.qr4 = 1150;
        this.phase = 1;
        this.scheduledUpgrades = [];
        this.scheduledLevels = [0, 0, 0, 0, 0, 0, 0, 0];
    }

    updateSchedule() {
        if (this.phase >= 5) return true;
        const veryBig = parseBigNumber("ee999999");
        this.scheduledUpgrades = [];
        this.scheduledLevels = [0, 0, 0, 0, 0, 0, 0, 0];

        while (this.scheduledUpgrades.length < 5) {
            const costs = [];
            for (let i = 0; i < 8; i++) {
                costs.push(this.upgrades[i].cost.getCost(this.upgrades[i].level + this.scheduledLevels[i]));
            }

            if (this.phase > 1) { costs[3] = veryBig; costs[7] = veryBig; }
            if (this.phase > 2) { costs[2] = veryBig; costs[6] = veryBig; }
            if (this.phase > 3) { costs[1] = veryBig; costs[5] = veryBig; }

            let minCost = [veryBig, null];
            for (let i = 0; i < costs.length; i++) {
                if (costs[i] < minCost[0]) minCost = [costs[i], i];
            }

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
            s += this.scheduledUpgrades[i][0] <= 3 ? "q_" + (this.scheduledUpgrades[i][0] + 1) : "r_" + (this.scheduledUpgrades[i][0] - 3);
            if (i + 1 < Math.min(this.scheduledUpgrades.length, 5)) s += ", ";
        }
        return s;
    }

    buy() {
        this.updateSchedule();

        if (this.pubMultiplier >= this.qr1) {
            this.phase = 5;
            return;
        }
        this.upgrades[0].buy(-1);
        this.upgrades[4].buy(-1);

        if (this.pubMultiplier >= this.qr2) {
            this.phase = 4;
            return;
        }
        this.upgrades[1].buy(-1);
        this.upgrades[5].buy(-1);

        if (this.pubMultiplier >= this.qr3) {
            this.phase = 3;
            return;
        }
        this.upgrades[2].buy(-1);
        this.upgrades[6].buy(-1);

        if (this.pubMultiplier >= this.qr4) {
            this.phase = 2;
            return;
        }
        this.upgrades[3].buy(-1);
        this.upgrades[7].buy(-1);
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
