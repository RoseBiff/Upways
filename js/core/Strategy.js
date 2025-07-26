import { getSuccessRate } from "./utils.js";

export class Strategy {
  constructor({ startLevel, endLevel, scrollCosts, otherCosts, path, baseRates }) {
    this.startLevel = startLevel;
    this.endLevel = endLevel;
    this.path = path;
    this.computeDerivedValues(scrollCosts, otherCosts, baseRates);
  }

  computeDerivedValues(scrollCosts, otherCosts, baseRates) {
    const canRetroFlags = {};
    const successRates = {};
    const costs = {};
    
    for (let level = 0; level < this.endLevel; level++) {
      const scroll = this.path[level];

      if (!scroll) continue;

      canRetroFlags[level] = scroll.canRetro;
      successRates[level] = getSuccessRate(level, scroll.fixedRates, baseRates);
      costs[level] = scrollCosts[scroll.id] + otherCosts[level];
    }

    this.canRetroFlags = canRetroFlags;
    this.successRates = successRates;
    this.costs = costs;
  }
}
