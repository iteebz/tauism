class T5 extends BaseStrategy {
    constructor() {
        super(4);
        this.q1 = this.upgrades[0];
        this.q2 = this.upgrades[1];
        this.c1 = this.upgrades[2];
        this.c2 = this.upgrades[3];
        this.c3 = this.upgrades[4];
        this.setPub();
        this.scheduledUpgrades = [];
        this.scheduledLevels = [0, 0, 0, 0];
    }

    get q() {
        return parseBigNumber(this.theory.tertiaryEquation.substring(2)).max(Number.MIN_VALUE);
    }

    get getC1() {
        return Utils.getStepwisePowerSum(this.c1.level, 2, 10, 1);
    }

    get getC2() {
        return toBig(2).pow(this.c2.level);
    }

    get getC3() {
        return toBig(2).pow(this.c3.level * (1 + 0.05 * this.theory.milestoneUpgrades[2].level));
    }

    predictQ(multiplier) {
        let vc2 = this.getC2;
        let vc3 = this.getC3;
        let q = this.q;
        let dqPred = (this.getC1 / vc2 * q * (vc3 - q / vc2)) * multiplier;
        let qPred = q + dqPred.max(0);
        qPred = qPred.min(vc2 * vc3);
        return qPred;
    }

    upgradeByIndex(idx) {
        return [this.q1, this.q2, this.c2, this.c3][idx];
    }

    updateSchedule() {
        if (this.scheduledUpgrades.length >= 6) return false;
        const veryBig = parseBigNumber("ee999999");

        while (this.scheduledUpgrades.length < 6) {
            let costs = [
                this.q1.cost.getCost(this.q1.level + this.scheduledLevels[0]) * (5.5 + ((this.q1.level + this.scheduledLevels[0]) % 10) * 0.35),
                this.q2.cost.getCost(this.q2.level + this.scheduledLevels[1]),
                this.c2.cost.getCost(this.c2.level + this.scheduledLevels[2]),
                this.c3.cost.getCost(this.c3.level + this.scheduledLevels[3])
            ];
            if (costs[0] > this.pub * 0.28) costs[0] = veryBig;

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
        let s = "";
        if (this.scheduledUpgrades.length) {
            s = "Next: ";
            for (let i = 0; i < Math.min(this.scheduledUpgrades.length, 5); i++) {
                if (this.scheduledUpgrades[i][1] > 1) s += this.scheduledUpgrades[i][1];
                s += this.scheduledUpgrades[i][0] <= 1 ? "q_" + (this.scheduledUpgrades[i][0] + 1) : "c_" + this.scheduledUpgrades[i][0];
                if (i + 1 < Math.min(this.scheduledUpgrades.length, 5)) s += ", ";
            }
        }
        return s || "Scheduling...";
    }

    c3CostNext(rho) {
        if (rho < 1000) return toBig(1000);
        return toBig(88550700).pow(((rho / 1000).log2() / Math.log2(88550700)).ceil()) * 1000;
    }

    q2Cost(rho) {
        if (rho < 15) return toBig(0);
        return toBig(64).pow(((rho / 15).log2() / 6).floor()) * 15;
    }

    setPub() {
        const lastPub = this.theory.tauPublished;
        let c3Next = this.c3CostNext(lastPub);
        let q2Near = this.q2Cost(c3Next);
        const ratio = 9.5;

        while (c3Next / q2Near >= ratio) {
            c3Next *= 88550700;
            q2Near = this.q2Cost(c3Next);
        }

        let counter = 1;
        let c3Prev = c3Next / 88550700;
        let q2NearP = this.q2Cost(c3Prev);
        while (c3Prev / q2NearP >= ratio && c3Prev > 0) {
            c3Prev /= 88550700;
            q2NearP = this.q2Cost(c3Prev);
            counter++;
        }

        const target = 105;
        const step = (c3Next / (ratio * c3Prev * target)).pow(1 / (counter * 3 - 1));
        this.pub = c3Prev * target;
        while (lastPub * 64 >= this.pub) {
            this.pub *= step;
        }

        if (this.pub > c3Next) {
            this.pub = c3Next * target;
        }

        this.coast = this.pub / 2;
    }

    buy(multiplier) {
        if (this.scheduledUpgrades.length === 0) this.updateSchedule();

        if (this.theory.tau >= this.coast) return;

        let refresh = false;
        if (buyRatio(this.q1, 100)) refresh = true;
        if (buyRatio(this.q2, 4)) refresh = true;
        if (buyRatio(this.c1, 10000)) refresh = true;
        if (buyRatio(this.c3, 2)) refresh = true;

        const veryBig = parseBigNumber("ee999999");

        for (let i = 0; i < 40; i++) {
            const c2worth = this.predictQ(multiplier) >= this.getC3 * this.getC2 * 2 / 3;

            let costs = [
                upgradeCost(this.q1) * (5.5 + (this.q1.level % 10) * 0.35),
                upgradeCost(this.q2),
                c2worth ? veryBig : upgradeCost(this.c1) * 2,
                c2worth ? upgradeCost(this.c2) : veryBig,
                upgradeCost(this.c3)
            ];
            if (costs[0] > this.pub * 0.28) costs[0] = veryBig;

            let minCost = [veryBig, null];
            for (let j = 0; j < costs.length; j++) {
                if (costs[j] < minCost[0]) minCost = [costs[j], j];
            }
            if (minCost[1] == null) break;

            const upgrade = [this.q1, this.q2, this.c1, this.c2, this.c3][minCost[1]];

            if (upgradeCost(upgrade) <= this.theory.currencies[0].value) {
                upgrade.buy(1);
                refresh = true;
            } else break;
        }

        if (this.theory.currencies[0].value > this.theory.tauPublished / 1e20 && refresh) {
            this.scheduledUpgrades = [];
            this.scheduledLevels = [0, 0, 0, 0];
            this.updateSchedule();
        }
    }

    tick(elapsedTime, multiplier) {
        if (this.shouldPublish()) {
            this.theory.publish();
            return true;
        }
        this.buy(multiplier);
        return false;
    }

    shouldPublish() {
        return this.theory.tau >= this.pub;
    }
}
