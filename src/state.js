var state = {
    autoFreq: 42,

    get shouldReallocate() {
        return this.autoFreq >= 10;
    },

    serialize() {
        return JSON.stringify({ autoFreq: this.autoFreq });
    },

    deserialize(s) {
        if (!s) return;
        try { Object.assign(this, JSON.parse(s)); } catch (e) {}
    }
};
