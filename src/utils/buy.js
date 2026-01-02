export const toBig = n => BigNumber.from(n);

export const upgradeCost = upgrade => upgrade.cost.getCost(upgrade.level);

export const publicationMultiplier = theory => 
    theory.nextPublicationMultiplier / theory.publicationMultiplier;

export const buyMax = (upgrade, value) => {
    const spend = value.min(upgrade.currency.value);
    const levelBefore = upgrade.level;
    upgrade.buy(upgrade.cost.getMax(upgrade.level, spend));
    return upgrade.level > levelBefore;
};

export const buyRatio = (upgrade, ratio) => {
    const bigRatio = typeof ratio === 'object' ? ratio : toBig(ratio);
    return buyMax(upgrade, upgrade.currency.value / bigRatio);
};
