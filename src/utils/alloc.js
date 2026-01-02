class AllocUtils {
    static simpleStar() {
        const starUps = Array.from(game.starBonuses).filter(x => x.id >= 4000 && x.id < 5000 && x.isAvailable);
        const variables = Array.from(game.variables).filter(x => x.id > 0 && x.isAvailable);

        starUps.forEach(x => x.refund(-1));

        const len = Math.min(starUps.length, variables.length);

        let doubleUps = new Set(Array(len).keys());
        let singleUps = new Set();

        const dThreshold = 0.00001;
        const sThreshold = dThreshold / 100;
        const trivialStars = 0.001 * game.starsTotal;
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

            toMove.forEach(i => { doubleUps.delete(i); singleUps.add(i); });
            toDelete.forEach(i => { doubleUps.delete(i); });
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

            toDelete.forEach(i => { singleUps.delete(i); });

            if (best == null) break;

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
                    if (cost > bestup.currency.value) break;
                    if (cost < trivialStars) continue;

                    bestup.buy(1);
                    dx = game.x;
                    bestup.refund(1);
                    dx -= game.x;

                    if (best2.dx * cost > dx * best2.cost) break;
                }
            }
        }
    }

    static nextDouble(level) {
        if (level >= 24000) return 400 - (level % 400);
        if (level >= 10000) return 200 - (level % 200);
        if (level >= 6000) return 100 - (level % 100);
        if (level >= 1500) return 50 - (level % 50);
        if (level >= 10) return 25 - (level % 25);
        return 10 - level;
    }

    static lastDouble(level) {
        if (level >= 24000) return level % 400;
        if (level >= 10000) return level % 200;
        if (level >= 6000) return level % 100;
        if (level >= 1500) return level % 50;
        if (level >= 25) return level % 25;
        if (level >= 10) return level - 10;
        return level;
    }

    static simpleStudent(useR9) {
        const upgrades = Array.from(game.researchUpgrades).filter(x => x.id <= 101 && x.isAvailable);
        upgrades.forEach(x => x.refund(-1));

        if (useR9) game.researchUpgrades[8].buy(-1);
        else game.researchUpgrades[8].refund(-1);

        const maxLevels = upgrades.map(x => x.maxLevel);
        const expIndex = upgrades.length - 1;
        let levels = upgrades.map(x => x.level);
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
        ].map(v => v.toNumber());

        while (true) {
            let cand = null;
            let cval = BigNumber.ZERO;

            for (let i = 0; i < upgrades.length; i++) {
                if (levels[i] >= maxLevels[i]) continue;

                const cost = (i == expIndex) ? 2 : this.researchCost(levels[i]);
                const curval = (i == expIndex) ? curSum / 20 : vals[i] / cost;

                if (curval > cval) {
                    cand = (cost <= sigma) ? i : null;
                    cval = curval;
                }
            }

            if (cand == null) break;

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
                if (levels[i] >= maxLevels[i]) continue;
                let more = (i == expIndex) ? Math.floor(sigma / 2) : this.maxPurchaseCount(levels[i], sigma);
                pool *= Math.min(more, maxLevels[i] - levels[i]) + 1;
                dims += 1;
            }

            const heur = dims < 6 ? pool / 3 : pool / (dims == 6 ? 20 : 60);

            if (heur > this.MAX_DFS_SIZE) break;

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

        const search = (i, sigma, curSum) => {
            if (i == expIndex) {
                const cnt = Math.min(levels[i] + sigma / 2 >> 0, 6);
                return { cnt: [cnt], maxSum: curSum * (1 + cnt / 10) };
            }
            let maxres = null;
            for (let j = levels[i]; j <= maxLevels[i]; j++) {
                let res = search(i + 1, sigma, curSum);
                if (maxres == null || res.maxSum >= maxres.maxSum) {
                    maxres = res;
                    maxres.cnt.push(j);
                }
                sigma -= this.researchCost(j);
                if (sigma < 0) break;
                curSum += vals[i];
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

        if (this.researchCost(curLevel) > sigma) return levels;

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
}

AllocUtils.MAX_DFS_SIZE = 300;
