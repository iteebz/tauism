import { MIN_ALLOC_FREQ } from './config.js';

export const state = {
    useR9: false,
    autoFreq: -1,
    enableVariablePurchase: true,
    enableMSPurchase: true,
    enablePublications: true,
    enableTheorySwitch: true,

    get shouldReallocate() {
        return this.autoFreq >= MIN_ALLOC_FREQ;
    },

    serialize() {
        return JSON.stringify({
            useR9: this.useR9,
            autoFreq: this.autoFreq,
            enableVariablePurchase: this.enableVariablePurchase,
            enableMSPurchase: this.enableMSPurchase,
            enablePublications: this.enablePublications,
            enableTheorySwitch: this.enableTheorySwitch
        });
    },

    deserialize(s) {
        if (!s) return;
        try {
            Object.assign(this, JSON.parse(s));
        } catch (e) {}
    }
};
