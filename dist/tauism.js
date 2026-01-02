(() => {
  // src/utils/buy.js
  var toBig = (n) => BigNumber.from(n);
  var upgradeCost = (upgrade) => upgrade.cost.getCost(upgrade.level);
  var buyMax = (upgrade, value) => {
    const spend = value.min(upgrade.currency.value);
    const levelBefore = upgrade.level;
    upgrade.buy(upgrade.cost.getMax(upgrade.level, spend));
    return upgrade.level > levelBefore;
  };
  var buyRatio = (upgrade, ratio) => {
    const bigRatio = typeof ratio === "object" ? ratio : toBig(ratio);
    return buyMax(upgrade, upgrade.currency.value / bigRatio);
  };

  // src/strategies/base.js
  var BaseStrategy = class {
    constructor(id) {
      this.id = id;
      this.theory = game.activeTheory;
      this.upgrades = this.theory.upgrades;
    }
    get pubMultiplier() {
      return this.theory.nextPublicationMultiplier / this.theory.publicationMultiplier;
    }
    tick(elapsedTime, multiplier, state2) {
      throw new Error("Not implemented");
    }
    buy(state2) {
      throw new Error("Not implemented");
    }
    shouldPublish() {
      return false;
    }
  };

  // src/strategies/t1.js
  var T1 = class extends BaseStrategy {
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
      let mult = diff < 3 ? 100 : diff < 5 ? 0.015 : 14e-5;
      this.pub = this.c4NC * mult;
      mult = diff < toBig(3) ? toBig(30) : diff < toBig(5) ? toBig(3e-3) : toBig(3e-5);
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
      if (this.scheduledUpgrades.length >= 25)
        return false;
      const veryBig = parseBigNumber("ee999999");
      while (this.scheduledUpgrades.length < 25) {
        const q1cost = this.q1.cost.getCost(this.q1.level + this.scheduledLevels[0]);
        const q2cost = this.q2.cost.getCost(this.q2.level + this.scheduledLevels[1]);
        const c4cost = this.c4.cost.getCost(this.c4.level + this.scheduledLevels[3]);
        let q1weighted = q1cost * 5;
        if (q1cost * (6.9 + (this.q1.level + this.scheduledLevels[0]) % 10) >= q2cost || q1cost * (15.2 + (this.q1.level + this.scheduledLevels[0]) % 10) >= c4cost) {
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
          if (costs[i] < minCost[0])
            minCost = [costs[i], i];
        }
        const upgrade = this.upgradeByIndex(minCost[1])[0];
        const cost = upgrade.cost.getCost(upgrade.level + this.scheduledLevels[minCost[1]]);
        if (cost >= this.coast)
          break;
        if (minCost[1] != null) {
          this.scheduledLevels[minCost[1]]++;
          const last = this.scheduledUpgrades[this.scheduledUpgrades.length - 1];
          if (last && last[0] == minCost[1])
            last[1]++;
          else
            this.scheduledUpgrades.push([minCost[1], 1]);
        } else
          break;
      }
      return true;
    }
    getScheduleDisplay() {
      if (!this.scheduledUpgrades.length)
        return "";
      let s = "Next\\ upgrades: ";
      for (let i = 0; i < Math.min(this.scheduledUpgrades.length, 5); i++) {
        if (this.scheduledUpgrades[i][1] > 1)
          s += this.scheduledUpgrades[i][1];
        s += this.scheduledUpgrades[i][0] < 2 ? "q_" + (this.scheduledUpgrades[i][0] + 1) : "c_" + (this.scheduledUpgrades[i][0] + 1);
        if (i + 1 < Math.min(this.scheduledUpgrades.length, 5))
          s += ", ";
      }
      return s;
    }
    buy(state2) {
      if (!state2.enableVariablePurchase)
        return;
      if (this.theory.tau >= this.coast && state2.enablePublications)
        return;
      let refresh = false;
      if (buyRatio(this.q1, 50))
        refresh = true;
      if (buyRatio(this.q2, 2))
        refresh = true;
      if (buyRatio(this.c3, 10))
        refresh = true;
      if (buyRatio(this.c4, 2))
        refresh = true;
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
        if (before == upgrade.level)
          break;
        bought = true;
        this.scheduledUpgrades[0][1]--;
        this.scheduledLevels[idx]--;
        if (this.scheduledUpgrades[0][1] <= 0)
          this.scheduledUpgrades.shift();
      }
      if (this.theory.currencies[0].value > this.theory.tauPublished / 1e20) {
        this.updateSchedule();
      }
    }
    shouldPublish() {
      return this.theory.tau > this.pub;
    }
    tick(elapsedTime, multiplier, state2) {
      if (state2.enablePublications && this.shouldPublish()) {
        this.theory.publish();
        return true;
      }
      this.buy(state2);
      return false;
    }
  };

  // src/strategies/t2.js
  var T2 = class extends BaseStrategy {
    constructor() {
      super(1);
      this.pub = 8e3;
      this.qr1 = 4650;
      this.qr2 = 2900;
      this.qr3 = 2250;
      this.qr4 = 1150;
      this.phase = 1;
      this.scheduledUpgrades = [];
      this.scheduledLevels = [0, 0, 0, 0, 0, 0, 0, 0];
    }
    updateSchedule() {
      if (this.phase >= 5)
        return true;
      const veryBig = parseBigNumber("ee999999");
      this.scheduledUpgrades = [];
      this.scheduledLevels = [0, 0, 0, 0, 0, 0, 0, 0];
      while (this.scheduledUpgrades.length < 5) {
        const costs = [];
        for (let i = 0; i < 8; i++) {
          costs.push(this.upgrades[i].cost.getCost(this.upgrades[i].level + this.scheduledLevels[i]));
        }
        if (this.phase > 1) {
          costs[3] = veryBig;
          costs[7] = veryBig;
        }
        if (this.phase > 2) {
          costs[2] = veryBig;
          costs[6] = veryBig;
        }
        if (this.phase > 3) {
          costs[1] = veryBig;
          costs[5] = veryBig;
        }
        let minCost = [veryBig, null];
        for (let i = 0; i < costs.length; i++) {
          if (costs[i] < minCost[0])
            minCost = [costs[i], i];
        }
        if (minCost[1] != null) {
          this.scheduledLevels[minCost[1]]++;
          const last = this.scheduledUpgrades[this.scheduledUpgrades.length - 1];
          if (last && last[0] == minCost[1])
            last[1]++;
          else
            this.scheduledUpgrades.push([minCost[1], 1]);
        } else
          break;
      }
      return true;
    }
    getScheduleDisplay() {
      if (!this.scheduledUpgrades.length)
        return "";
      let s = "Next\\ upgrades: ";
      for (let i = 0; i < Math.min(this.scheduledUpgrades.length, 5); i++) {
        if (this.scheduledUpgrades[i][1] > 1)
          s += this.scheduledUpgrades[i][1];
        s += this.scheduledUpgrades[i][0] <= 3 ? "q_" + (this.scheduledUpgrades[i][0] + 1) : "r_" + (this.scheduledUpgrades[i][0] - 3);
        if (i + 1 < Math.min(this.scheduledUpgrades.length, 5))
          s += ", ";
      }
      return s;
    }
    buy(state2) {
      if (!state2.enableVariablePurchase)
        return;
      this.updateSchedule();
      if (this.pubMultiplier >= this.qr1 && state2.enablePublications) {
        this.phase = 5;
        return;
      }
      this.upgrades[0].buy(-1);
      this.upgrades[4].buy(-1);
      if (this.pubMultiplier >= this.qr2 && state2.enablePublications) {
        this.phase = 4;
        return;
      }
      this.upgrades[1].buy(-1);
      this.upgrades[5].buy(-1);
      if (this.pubMultiplier >= this.qr3 && state2.enablePublications) {
        this.phase = 3;
        return;
      }
      this.upgrades[2].buy(-1);
      this.upgrades[6].buy(-1);
      if (this.pubMultiplier >= this.qr4 && state2.enablePublications) {
        this.phase = 2;
        return;
      }
      this.upgrades[3].buy(-1);
      this.upgrades[7].buy(-1);
    }
    shouldPublish() {
      return this.pubMultiplier > this.pub;
    }
    tick(elapsedTime, multiplier, state2) {
      if (state2.enablePublications && this.shouldPublish()) {
        this.theory.publish();
        return true;
      }
      this.buy(state2);
      return false;
    }
  };

  // src/strategies/t3.js
  var T3 = class extends BaseStrategy {
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
      if (this.scheduledUpgrades1.length >= 15)
        return false;
      while (this.scheduledUpgrades1.length < 15) {
        const costs = [
          this.b1.cost.getCost(this.b1.level + this.scheduledLevels1[0]) * 8,
          this.c31.cost.getCost(this.c31.level + this.scheduledLevels1[1])
        ];
        let minCost = [parseBigNumber("ee999999"), null];
        for (let i = 0; i < costs.length; i++) {
          if (costs[i] < minCost[0])
            minCost = [costs[i], i];
        }
        if (minCost[1] == null)
          break;
        const upgrade = this.upgradeByIndex1(minCost[1]);
        const cost = upgrade.cost.getCost(upgrade.level + this.scheduledLevels1[minCost[1]]);
        if (cost >= this.theory.tauPublished / 10)
          break;
        this.scheduledLevels1[minCost[1]]++;
        const last = this.scheduledUpgrades1[this.scheduledUpgrades1.length - 1];
        if (last && last[0] == minCost[1])
          last[1]++;
        else
          this.scheduledUpgrades1.push([minCost[1], 1]);
      }
      return true;
    }
    updateSchedule2() {
      if (this.scheduledUpgrades2.length >= 15)
        return false;
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
            veryBig,
            veryBig
          ];
        }
        let minCost = [veryBig, null];
        for (let i = 0; i < costs.length; i++) {
          if (costs[i] < minCost[0])
            minCost = [costs[i], i];
        }
        if (minCost[1] != null) {
          this.scheduledLevels2[minCost[1]]++;
          const last = this.scheduledUpgrades2[this.scheduledUpgrades2.length - 1];
          if (last && last[0] == minCost[1])
            last[1]++;
          else
            this.scheduledUpgrades2.push([minCost[1], 1]);
        } else
          break;
      }
      return true;
    }
    updateSchedule3() {
      if (this.scheduledUpgrades3.length >= 15)
        return false;
      const veryBig = parseBigNumber("ee999999");
      while (this.scheduledUpgrades3.length < 15) {
        const costs = [
          this.b3.cost.getCost(this.b3.level + this.scheduledLevels3[0]) * (this.phase == 4 ? 1 : 8),
          this.c23.cost.getCost(this.c23.level + this.scheduledLevels3[1]),
          this.phase <= 2 ? this.c33.cost.getCost(this.c33.level + this.scheduledLevels3[2]) * 10 : veryBig
        ];
        let minCost = [veryBig, null];
        for (let i = 0; i < costs.length; i++) {
          if (costs[i] < minCost[0])
            minCost = [costs[i], i];
        }
        if (minCost[1] != null) {
          this.scheduledLevels3[minCost[1]]++;
          const last = this.scheduledUpgrades3[this.scheduledUpgrades3.length - 1];
          if (last && last[0] == minCost[1])
            last[1]++;
          else
            this.scheduledUpgrades3.push([minCost[1], 1]);
        } else
          break;
      }
      return true;
    }
    buy(state2) {
      const prevPhase = this.phase;
      if (this.pubMultiplier > this.phase3)
        this.phase = 4;
      else if (this.pubMultiplier > this.phase2)
        this.phase = 3;
      else if (this.pubMultiplier > this.phase1)
        this.phase = 2;
      if (!state2.enableVariablePurchase)
        return;
      let refresh1 = false, refresh2 = false, refresh3 = false;
      if (buyRatio(this.b1, 1e5))
        refresh1 = true;
      if (buyRatio(this.c31, 1e4))
        refresh1 = true;
      if (buyRatio(this.b2, 10))
        refresh2 = true;
      if (buyRatio(this.c12, 100))
        refresh2 = true;
      if (buyRatio(this.c22, 10))
        refresh2 = true;
      if (buyRatio(this.c32, 10))
        refresh2 = true;
      if (buyRatio(this.b3, 100))
        refresh3 = true;
      if (buyRatio(this.c23, 2))
        refresh3 = true;
      if (buyRatio(this.c33, 100))
        refresh3 = true;
      if (prevPhase != this.phase) {
        refresh2 = true;
        refresh3 = true;
      }
      if (refresh1) {
        this.scheduledUpgrades1 = [];
        this.scheduledLevels1 = [0, 0];
      }
      if (refresh2) {
        this.scheduledUpgrades2 = [];
        this.scheduledLevels2 = [0, 0, 0, 0];
      }
      if (refresh3) {
        this.scheduledUpgrades3 = [];
        this.scheduledLevels3 = [0, 0, 0];
      }
      const buyScheduled = (scheduled, levels, getUpgrade) => {
        while (scheduled.length) {
          const idx = scheduled[0][0];
          const upgrade = getUpgrade(idx);
          const before = upgrade.level;
          upgrade.buy(1);
          if (before == upgrade.level)
            break;
          scheduled[0][1]--;
          levels[idx]--;
          if (scheduled[0][1] <= 0)
            scheduled.shift();
        }
      };
      buyScheduled(this.scheduledUpgrades1, this.scheduledLevels1, (i) => this.upgradeByIndex1(i));
      buyScheduled(this.scheduledUpgrades2, this.scheduledLevels2, (i) => [this.b2, this.c12, this.c22, this.c32][i]);
      buyScheduled(this.scheduledUpgrades3, this.scheduledLevels3, (i) => [this.b3, this.c23, this.c33][i]);
      if (this.theory.currencies[0].value > this.theory.tauPublished / 1e20) {
        this.updateSchedule1();
        this.updateSchedule2();
        this.updateSchedule3();
      }
    }
    shouldPublish() {
      return this.pubMultiplier > this.pub;
    }
    tick(elapsedTime, multiplier, state2) {
      if (state2.enablePublications && this.shouldPublish()) {
        this.theory.publish();
        return true;
      }
      this.buy(state2);
      return false;
    }
  };

  // src/strategies/t4.js
  var T4 = class extends BaseStrategy {
    constructor() {
      super(3);
      this.c1 = this.upgrades[0];
      this.c2 = this.upgrades[1];
      this.c3 = this.upgrades[2];
      this.q1 = this.upgrades[6];
      this.q2 = this.upgrades[7];
      this.q2weight = 1 / (2 - Math.sqrt(2));
      this.setPub();
      this.ratio = 1 + (this.q + 1) * toBig(2).pow(this.c3.level) / (toBig(2).pow(this.c2.level) * this.getC1);
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
      if (rho < 2e3)
        return toBig(0);
      return toBig(2.468).pow(((rho / 2e3).log2() / Math.log2(2.468)).floor()) * 2e3;
    }
    c3CostNext(rho) {
      if (rho < 2e3)
        return toBig(2e3);
      return toBig(2.468).pow(((rho / 2e3).log2() / Math.log2(2.468)).ceil()) * 2e3;
    }
    q2Cost(rho) {
      if (rho < 1e4)
        return toBig(0);
      return toBig(1e3).pow(((rho / 1e4).log10() / 3).floor()) * 1e4;
    }
    setPub() {
      const lastPub = this.theory.tauPublished;
      const threshold = this.q2weight * toBig(1e3 / 2.468 ** 8);
      let c3Near;
      let c3Last = this.c3Cost(lastPub);
      if (lastPub / c3Last > 5)
        c3Last *= 2.468;
      let c3Amount;
      let q2Last = this.q2Cost(lastPub);
      while (true) {
        c3Near = this.c3CostNext(q2Last);
        if (c3Near > q2Last * threshold && c3Near < q2Last * this.q2weight) {
          c3Amount = ((c3Last / c3Near).log2() / Math.log2(2.468)).round();
          if (c3Amount == 0 || c3Amount == 10 || c3Amount == 11 || c3Amount == 19 || c3Amount == 20 || c3Amount == 28 || c3Amount == 29 || c3Amount == 37 || c3Amount >= 38) {
            break;
          }
        }
        q2Last /= 1e3;
      }
      let block = 5;
      const nc3Near = c3Near * 2.468 ** 38;
      const q2Next = q2Last * 10 ** 15;
      if (nc3Near > q2Next * threshold && nc3Near < q2Next * this.q2weight)
        block = 4;
      this.pub = c3Near;
      if (block == 5) {
        if (c3Amount <= 5)
          this.pub *= 2.468 ** 10;
        else if (c3Amount <= 14)
          this.pub *= 2.468 ** 19;
        else if (c3Amount <= 23)
          this.pub *= 2.468 ** 28;
        else if (c3Amount <= 32)
          this.pub *= 2.468 ** 37;
        else
          this.pub *= 2.468 ** 46;
      } else {
        if (c3Amount <= 5)
          this.pub *= 2.468 ** 10;
        else if (c3Amount <= 15)
          this.pub *= 2.468 ** 20;
        else if (c3Amount <= 24)
          this.pub *= 2.468 ** 29;
        else
          this.pub *= 2.468 ** 38;
      }
      if (this.pub < lastPub * 10)
        this.pub = lastPub * 80;
      this.pub *= 1.3;
      this.coast = this.pub / 2.468;
    }
    upgradeByIndex(idx) {
      return [this.c1, this.c2, this.c3, this.q1, this.q2][idx];
    }
    updateSchedule() {
      if (this.scheduledUpgrades.length >= 6)
        return false;
      const veryBig = parseBigNumber("ee999999");
      while (this.scheduledUpgrades.length < 6) {
        const k = this.q * toBig(2).pow(this.c3.level) / (toBig(2).pow(this.c2.level) * this.getC1);
        const p = k > 0 ? 1 / k : 1;
        const c1w = this.c1.cost.getCost(this.c1.level + this.scheduledLevels[0]) * (10 + this.c1.level % 10 / 2);
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
          if (costs[i] < minCost[0])
            minCost = [costs[i], i];
        }
        const upgrade = this.upgradeByIndex(minCost[1]);
        const cost = upgrade.cost.getCost(upgrade.level + this.scheduledLevels[minCost[1]]);
        if (cost >= this.coast)
          break;
        if (minCost[1] != null) {
          this.scheduledLevels[minCost[1]]++;
          const last = this.scheduledUpgrades[this.scheduledUpgrades.length - 1];
          if (last && last[0] == minCost[1])
            last[1]++;
          else
            this.scheduledUpgrades.push([minCost[1], 1]);
        } else
          break;
      }
      return true;
    }
    buy(state2) {
      if (!state2.enableVariablePurchase)
        return;
      if (this.theory.tau >= this.coast && state2.enablePublications)
        return;
      if (this.theory.currencies[0].value == 0)
        this.c1.buy(1);
      const k = (this.q + 1) * toBig(2).pow(this.c3.level) / (toBig(2).pow(this.c2.level) * this.getC1);
      const p = k > 0 ? 1 / k : 1;
      let refresh = false;
      if (buyMax(this.c3, this.theory.currencies[0].value * k))
        refresh = true;
      if (buyMax(this.q2, upgradeCost(this.c3) / this.q2weight))
        refresh = true;
      if (buyMax(this.q1, upgradeCost(this.c3).min(upgradeCost(this.q2)) / 10))
        refresh = true;
      if (buyMax(this.c2, this.theory.currencies[0].value * p))
        refresh = true;
      if (buyMax(this.c1, upgradeCost(this.c2) / 10))
        refresh = true;
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
    tick(elapsedTime, multiplier, state2) {
      if (state2.enablePublications && this.shouldPublish()) {
        this.theory.publish();
        return true;
      }
      this.buy(state2);
      return false;
    }
  };

  // src/strategies/t5.js
  var T5 = class extends BaseStrategy {
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
    buy(state2) {
      if (!state2.enableVariablePurchase)
        return;
      if (this.theory.tau >= this.coast && state2.enablePublications)
        return;
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
    tick(elapsedTime, multiplier, state2) {
      if (state2.enablePublications && this.shouldPublish()) {
        this.theory.publish();
        return true;
      }
      this.buy(state2);
      return false;
    }
  };

  // src/strategies/t6.js
  var T6 = class extends BaseStrategy {
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
    buy(state2) {
      if (!state2.enableVariablePurchase)
        return;
      if (this.theory.tau >= this.coast && state2.enablePublications)
        return;
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
    tick(elapsedTime, multiplier, state2) {
      if (state2.enablePublications && this.shouldPublish()) {
        this.theory.publish();
        return true;
      }
      this.buy(state2);
      return false;
    }
  };

  // src/strategies/t7.js
  var T7 = class extends BaseStrategy {
    constructor() {
      super(6);
      this.c1 = this.upgrades[0];
      this.c2 = this.upgrades[1];
      this.c3 = this.upgrades[2];
      this.c4 = this.upgrades[3];
      this.c5 = this.upgrades[4];
      this.c6 = this.upgrades[5];
      this.setPub();
    }
    setPub() {
      const lastPub = this.theory.tauPublished;
      this.pub = lastPub * 4;
      this.coast = this.pub / 10;
    }
    buy(state2) {
      if (!state2.enableVariablePurchase)
        return;
      if (this.theory.tau >= this.coast && state2.enablePublications)
        return;
      const c6cost = this.c6.isAvailable ? upgradeCost(this.c6) : parseBigNumber("ee999999");
      const c5cost = this.c5.isAvailable ? upgradeCost(this.c5) : parseBigNumber("ee999999");
      const c4cost = this.c4.isAvailable ? upgradeCost(this.c4) : parseBigNumber("ee999999");
      const c3cost = upgradeCost(this.c3);
      const minCost = c3cost.min(c4cost).min(c5cost).min(c6cost);
      buyMax(this.c6, this.theory.currencies[0].value);
      buyMax(this.c5, this.theory.currencies[0].value);
      buyMax(this.c4, this.theory.currencies[0].value);
      buyMax(this.c3, this.theory.currencies[0].value);
      buyMax(this.c2, minCost / 100);
      buyMax(this.c1, minCost / 100);
    }
    shouldPublish() {
      return this.theory.tau >= this.pub;
    }
    tick(elapsedTime, multiplier, state2) {
      if (state2.enablePublications && this.shouldPublish()) {
        this.theory.publish();
        return true;
      }
      this.buy(state2);
      return false;
    }
  };

  // src/strategies/t8.js
  var T8 = class extends BaseStrategy {
    constructor() {
      super(7);
      this.c1 = this.upgrades[0];
      this.c2 = this.upgrades[1];
      this.c3 = this.upgrades[2];
      this.c4 = this.upgrades[3];
      this.c5 = this.upgrades[4];
      this.setPub();
      this.lastC5 = this.c5.level;
    }
    setPub() {
      const lastPub = this.theory.tauPublished;
      this.pub = lastPub * 2.5;
      this.coast = this.pub / 4;
    }
    buyMilestones(state2) {
      if (!state2.enableMSPurchase)
        return;
      for (let i = 1; i < this.theory.milestoneUpgrades.length; i++) {
        this.theory.milestoneUpgrades[i].buy(-1);
      }
    }
    buy(state2) {
      if (!state2.enableVariablePurchase)
        return;
      if (this.theory.tau >= this.coast && state2.enablePublications)
        return;
      const c5cost = upgradeCost(this.c5);
      const c4cost = upgradeCost(this.c4);
      const c3cost = upgradeCost(this.c3);
      if (this.c5.level > this.lastC5) {
        this.c1.buy(-1);
        this.c2.buy(-1);
        this.lastC5 = this.c5.level;
      }
      buyMax(this.c5, this.theory.currencies[0].value);
      buyMax(this.c4, c5cost);
      buyMax(this.c3, c5cost.min(c4cost));
      buyMax(this.c2, c3cost.min(c4cost).min(c5cost) / 10);
      buyMax(this.c1, c3cost.min(c4cost).min(c5cost) / 10);
    }
    shouldPublish() {
      return this.theory.tau >= this.pub;
    }
    tick(elapsedTime, multiplier, state2) {
      this.buyMilestones(state2);
      if (state2.enablePublications && this.shouldPublish()) {
        this.theory.publish();
        return true;
      }
      this.buy(state2);
      return false;
    }
  };

  // src/strategies/index.js
  var strategies = [T1, T2, T3, T4, T5, T6, T7, T8];
  var createStrategy = (theoryId) => {
    if (theoryId < 0 || theoryId > 7)
      return null;
    return new strategies[theoryId]();
  };

  // src/utils/alloc.js
  var AllocUtils = class {
    static simpleStar() {
      const starUps = Array.from(game.starBonuses).filter((x) => x.id >= 4e3 && x.id < 5e3 && x.isAvailable);
      const variables = Array.from(game.variables).filter((x) => x.id > 0 && x.isAvailable);
      starUps.forEach((x) => x.refund(-1));
      const len = Math.min(starUps.length, variables.length);
      let doubleUps = new Set(Array(len).keys());
      let singleUps = /* @__PURE__ */ new Set();
      const dThreshold = 1e-5;
      const sThreshold = dThreshold / 100;
      const trivialStars = 1e-3 * game.starsTotal;
      const MAX_ITER = 100;
      for (let k = 0; k < MAX_ITER; k++) {
        let toMove = [];
        let toDelete = [];
        let best = null;
        let best2 = null;
        for (const i of doubleUps) {
          const up = starUps[i];
          up.buy(-1);
          const maxLevels = up.level;
          up.refund(-1);
          const doubleLevels = this.nextDouble(variables[i].level);
          if (maxLevels < doubleLevels) {
            toMove.push(i);
            continue;
          }
          const dumpLevels = maxLevels - this.lastDouble(variables[i].level + maxLevels);
          let cost = up.currency.value;
          up.buy(dumpLevels);
          cost -= up.currency.value;
          let dx = game.x;
          up.refund(dumpLevels);
          dx -= game.x;
          if (dx < dThreshold * game.x) {
            toDelete.push(i);
            continue;
          }
          if (best == null || best.dx * cost < dx * best.cost) {
            best2 = best;
            best = { isDouble: true, i, dx, cost, cnt: dumpLevels };
          } else if (best2 == null || best2.dx * cost < dx * best2.cost) {
            best2 = { isDouble: true, i, dx, cost, cnt: dumpLevels };
          }
        }
        toMove.forEach((i) => {
          doubleUps.delete(i);
          singleUps.add(i);
        });
        toDelete.forEach((i) => {
          doubleUps.delete(i);
        });
        toDelete = [];
        for (const i of singleUps) {
          const up = starUps[i];
          const cost = up.cost.getCost(up.level);
          if (cost > up.currency.value) {
            toDelete.push(i);
            continue;
          }
          up.buy(1);
          let dx = game.x;
          up.refund(1);
          dx -= game.x;
          if (dx < sThreshold * game.x) {
            toDelete.push(i);
            continue;
          }
          if (best == null || best.dx * cost < dx * best.cost) {
            best2 = best;
            best = { isDouble: false, i, dx, cost, cnt: 1 };
          } else if (best2 == null || best2.dx * cost < dx * best2.cost) {
            best2 = { isDouble: false, i, dx, cost, cnt: 1 };
          }
        }
        toDelete.forEach((i) => {
          singleUps.delete(i);
        });
        if (best == null)
          break;
        if (best.isDouble) {
          starUps[best.i].buy(best.cnt);
          doubleUps.delete(best.i);
          singleUps.add(best.i);
        } else if (best2 == null) {
          starUps[best.i].buy(-1);
          singleUps.delete(best.i);
        } else {
          const bestup = starUps[best.i];
          let cost = best.cost;
          let dx = best.dx;
          for (let i = 0; i < MAX_ITER; i++) {
            bestup.buy(1);
            cost = bestup.cost.getCost(bestup.level);
            if (cost > bestup.currency.value)
              break;
            if (cost < trivialStars)
              continue;
            bestup.buy(1);
            dx = game.x;
            bestup.refund(1);
            dx -= game.x;
            if (best2.dx * cost > dx * best2.cost)
              break;
          }
        }
      }
    }
    static nextDouble(level) {
      if (level >= 24e3)
        return 400 - level % 400;
      if (level >= 1e4)
        return 200 - level % 200;
      if (level >= 6e3)
        return 100 - level % 100;
      if (level >= 1500)
        return 50 - level % 50;
      if (level >= 10)
        return 25 - level % 25;
      return 10 - level;
    }
    static lastDouble(level) {
      if (level >= 24e3)
        return level % 400;
      if (level >= 1e4)
        return level % 200;
      if (level >= 6e3)
        return level % 100;
      if (level >= 1500)
        return level % 50;
      if (level >= 25)
        return level % 25;
      if (level >= 10)
        return level - 10;
      return level;
    }
    static simpleStudent(useR9) {
      const upgrades = Array.from(game.researchUpgrades).filter((x) => x.id <= 101 && x.isAvailable);
      upgrades.forEach((x) => x.refund(-1));
      if (useR9)
        game.researchUpgrades[8].buy(-1);
      else
        game.researchUpgrades[8].refund(-1);
      const maxLevels = upgrades.map((x) => x.maxLevel);
      const expIndex = upgrades.length - 1;
      let levels = upgrades.map((x) => x.level);
      let sigma = game.sigma.toNumber();
      let curSum = BigNumber.ZERO;
      let history = [];
      const vals = [
        (game.dt * game.acceleration * (game.isRewardActive ? 1.5 : 1)).log(),
        (1 + game.t).log() * 0.7,
        (1 + game.starsTotal).log(),
        (1 + game.db).log() / (100 * (10 + game.db).log10()).sqrt(),
        (1 + game.dmu).log() / 1300,
        (1 + game.dpsi).log() / 255 * (10 + game.dpsi).log10().sqrt()
      ].map((v) => v.toNumber());
      while (true) {
        let cand = null;
        let cval = BigNumber.ZERO;
        for (let i = 0; i < upgrades.length; i++) {
          if (levels[i] >= maxLevels[i])
            continue;
          const cost = i == expIndex ? 2 : this.researchCost(levels[i]);
          const curval = i == expIndex ? curSum / 20 : vals[i] / cost;
          if (curval > cval) {
            cand = cost <= sigma ? i : null;
            cval = curval;
          }
        }
        if (cand == null)
          break;
        history.push(cand);
        if (cand == expIndex) {
          sigma -= 2;
        } else {
          curSum += vals[cand];
          sigma -= this.researchCost(levels[cand]);
        }
        levels[cand] += 1;
      }
      while (history.length > 0) {
        let pool = 1;
        let dims = 0;
        for (let i = 0; i < upgrades.length; i++) {
          if (levels[i] >= maxLevels[i])
            continue;
          let more = i == expIndex ? Math.floor(sigma / 2) : this.maxPurchaseCount(levels[i], sigma);
          pool *= Math.min(more, maxLevels[i] - levels[i]) + 1;
          dims += 1;
        }
        const heur = dims < 6 ? pool / 3 : pool / (dims == 6 ? 20 : 60);
        if (heur > this.MAX_DFS_SIZE)
          break;
        const lastbest = history.pop();
        if (lastbest == expIndex) {
          levels[lastbest] -= 1;
          sigma += 2;
        } else {
          const lastlevel = levels[lastbest] - 1;
          const lastcost = this.researchCost(lastlevel);
          levels[lastbest] -= 1;
          sigma += lastcost;
          curSum -= vals[lastbest];
        }
      }
      const search = (i, sigma2, curSum2) => {
        if (i == expIndex) {
          const cnt = Math.min(levels[i] + sigma2 / 2 >> 0, 6);
          return { cnt: [cnt], maxSum: curSum2 * (1 + cnt / 10) };
        }
        let maxres = null;
        for (let j = levels[i]; j <= maxLevels[i]; j++) {
          let res = search(i + 1, sigma2, curSum2);
          if (maxres == null || res.maxSum >= maxres.maxSum) {
            maxres = res;
            maxres.cnt.push(j);
          }
          sigma2 -= this.researchCost(j);
          if (sigma2 < 0)
            break;
          curSum2 += vals[i];
        }
        return maxres;
      };
      const found = search(0, sigma, curSum);
      for (let i = 0; i <= expIndex; i++)
        upgrades[i].buy(found.cnt[expIndex - i]);
    }
    static researchCost(curLevel) {
      return Math.floor(curLevel / 2 + 1);
    }
    static maxPurchaseCount(curLevel, sigma) {
      let levels = 0;
      if (this.researchCost(curLevel) > sigma)
        return levels;
      if (curLevel % 2 == 1) {
        sigma -= this.researchCost(curLevel);
        curLevel += 1;
        levels += 1;
      }
      curLevel += 1;
      const bulks = Math.floor((-curLevel + Math.sqrt(curLevel * curLevel + 4 * sigma)) / 2);
      sigma -= bulks * (curLevel + bulks);
      curLevel += 2 * bulks - 1;
      levels += 2 * bulks;
      if (this.researchCost(curLevel) <= sigma) {
        levels += 1;
      }
      return levels;
    }
  };
  AllocUtils.MAX_DFS_SIZE = 300;

  // src/main.js
  var permissions = Permissions.PERFORM_GAME_ACTIONS;
  var theoryManager = null;
  var R9 = 1;
  var getR9 = () => (game.sigmaTotal / 20) ** game.researchUpgrades[8].level;
  var init = () => {
    R9 = getR9();
    theory.createCurrency();
    refreshTheoryManager();
  };
  var refreshTheoryManager = () => {
    const theoryId = game.activeTheory?.id;
    if (theoryId == null || theoryId == 8) {
      theoryManager = null;
      return;
    }
    theoryManager = createStrategy(theoryId);
    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
  };
  game.activeTheoryChanged = () => refreshTheoryManager();
  var quaternaryEntries = [];
  for (let i = 0; i < 8; i++) {
    quaternaryEntries.push(new QuaternaryEntry("\u03C4_" + (i + 1), 0));
  }
  theory.primaryEquationHeight = 45;
  init();
})();
