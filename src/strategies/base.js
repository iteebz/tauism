import { toBig, buyMax, buyRatio, upgradeCost } from '../utils/buy.js';

export class BaseStrategy {
    constructor(id) {
        this.id = id;
        this.theory = game.activeTheory;
        this.upgrades = this.theory.upgrades;
    }

    get pubMultiplier() {
        return this.theory.nextPublicationMultiplier / this.theory.publicationMultiplier;
    }

    tick(elapsedTime, multiplier, state) {
        throw new Error('Not implemented');
    }

    buy(state) {
        throw new Error('Not implemented');
    }

    shouldPublish() {
        return false;
    }
}

export { toBig, buyMax, buyRatio, upgradeCost };
