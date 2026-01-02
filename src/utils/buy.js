var toBig = n => BigNumber.from(n);

var upgradeCost = upgrade => upgrade.cost.getCost(upgrade.level);

var publicationMultiplier = theory => 
    theory.nextPublicationMultiplier / theory.publicationMultiplier;

var buyMax = (upgrade, value) => {
    const spend = value.min(upgrade.currency.value);
    const levelBefore = upgrade.level;
    upgrade.buy(upgrade.cost.getMax(upgrade.level, spend));
    return upgrade.level > levelBefore;
};

var buyRatio = (upgrade, ratio) => {
    const bigRatio = typeof ratio === 'object' ? ratio : toBig(ratio);
    return buyMax(upgrade, upgrade.currency.value / bigRatio);
};
