import { SCROLL_IDS, SCROLLS, SCROLL_LIMIT } from "./Constants.js";
import { Strategy } from "./Strategy.js";
import { getSuccessRate, binomial } from "./utils.js";

class Matrix {
  static identity(n) {
    const matrix = new Array(n);
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      row[i] = 1;
      matrix[i] = row;
    }
    return matrix;
  }

  static subtract(A, B) {
    const result = new Array(A.length);
    for (let i = 0; i < A.length; i++) {
      const row = new Array(A[i].length);
      for (let j = 0; j < A[i].length; j++) {
        row[j] = A[i][j] - B[i][j];
      }
      result[i] = row;
    }
    return result;
  }

  static multiply(A, B) {
    const n = A.length;
    const m = B[0].length;
    const p = B.length;
    
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
      result[i] = new Array(m).fill(0);
      for (let j = 0; j < m; j++) {
        for (let k = 0; k < p; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }

  static inverse(matrix) {
    const n = matrix.length;
    const identity = Matrix.identity(n);
    const augmented = matrix.map((row, i) => [...row, ...identity[i]]);
    const doubleN = 2 * n;
    const EPSILON = 1e-10;

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      const pivot = augmented[i][i];
      if (Math.abs(pivot) < EPSILON) {
        throw new Error("Singular matrix");
      }

      for (let j = 0; j < doubleN; j++) {
        augmented[i][j] /= pivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < doubleN; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    return augmented.map((row) => row.slice(n));
  }
}

export class Calculator {
  constructor(strategy) {
    this.strategy = strategy;
    this.expectedVisits = this.calculateExpectedVisits();
    this.expectedTotalCost = this.calculateExpectedTotalCost();
  }

  calculateExpectedVisits() {
    const { startLevel, endLevel, costs, successRates } = this.strategy;

    if (costs.length !== successRates.length) {
      throw new Error(
        "Mismatch: costs and successRates must have the same length."
      );
    }

    let expectedVisits;

    if (endLevel <= SCROLL_LIMIT) {
      expectedVisits = this.calculateExpectedVisitsWithMarkov();
    } else if (startLevel < SCROLL_LIMIT) {
      expectedVisits = {
        ...this.calculateExpectedVisitsWithMarkov(),
        ...this.calculateExpectedVisitsDirectly(),
      };
    } else {
      expectedVisits = this.calculateExpectedVisitsDirectly();
    }

    return expectedVisits;
  }

  calculateExpectedVisitsWithMarkov() {
    const { startLevel } = this.strategy;

    if (startLevel >= SCROLL_LIMIT) {
      throw new Error("Start level must be less than maximum scroll limit");
    }

    const Q = this.buildTransitionMatrix();
    const I = Matrix.identity(Q.length);
    const N = Matrix.inverse(Matrix.subtract(I, Q));

    return N[startLevel];
  }

  calculateExpectedVisitsDirectly() {
    const { startLevel, endLevel, successRates } = this.strategy;

    if (endLevel <= SCROLL_LIMIT) {
      throw new Error("End level must be greater than maximum scroll limit");
    }

    const directStartLevel = Math.max(startLevel, SCROLL_LIMIT);
    const expectedVisits = {};

    for (let i = directStartLevel; i < endLevel; i++) {
      expectedVisits[i] = 100 / successRates[i];
    }

    return expectedVisits;
  }

  buildTransitionMatrix() {
    const { endLevel: size, successRates, canRetroFlags } = this.strategy;
    const matrixSize = Math.min(size, SCROLL_LIMIT);
    const Q = new Array(matrixSize);

    for (let i = 0; i < matrixSize; i++) {
      const row = new Array(matrixSize).fill(0);
      const pSuccess = successRates[i] / 100;
      const pFail = 1 - pSuccess;

      const hasNext = i < matrixSize - 1;
      const noRetro = i === 0 || !canRetroFlags[i];

      if (hasNext) row[i + 1] = pSuccess;
      if (noRetro) row[i] = pFail;
      else row[i - 1] = pFail;

      Q[i] = row;
    }

    return Q;
  }

  calculateExpectedTotalCost() {
    const { costs } = this.strategy;
    const expectedVisits = this.expectedVisits;

    let totalCost = 0;

    for (const [level, visits] of Object.entries(expectedVisits)) {
      totalCost += visits * costs[level];
    }

    return totalCost;
  }
}

export class DistributionCalculator extends Calculator {
  constructor(strategy, maxTrial = 10000, cumulativeSumLimit = 0.999) {
    super(strategy);
    this.maxTrial = maxTrial;
    this.cumulativeSumLimit = cumulativeSumLimit;
  }

  calculateExpectedVisitsDistribution() {
    const { startLevel, endLevel } = this.strategy;

    let expectedVisitsDistribution;

    if (endLevel <= SCROLL_LIMIT) {
      expectedVisitsDistribution =
        this.calculateExpectedVisitsDistributionWithMarkov();
    } else if (startLevel < SCROLL_LIMIT) {
      expectedVisitsDistribution = this.convolution(
        this.calculateExpectedVisitsDistributionWithMarkov(),
        this.calculateExpectedVisitsDistributionDirectly()
      );
    } else {
      expectedVisitsDistribution =
        this.calculateExpectedVisitsDistributionDirectly();
    }

    return expectedVisitsDistribution;
  }

  calculateExpectedVisitsDistributionWithMarkov() {
    const { startLevel, successRates } = this.strategy;

    if (startLevel >= SCROLL_LIMIT) {
      throw new Error("Start level must be less than maximum scroll limit");
    }

    const Q = this.buildTransitionMatrix();
    const size = Q.length;
    const lastSuccessProb = successRates[size - 1] / 100;

    const expectedVisitDistribution = [0];
    let cumulativeSum = 0;

    let powerMatrix = Matrix.identity(size);

    for (let trial = 1; trial < this.maxTrial; trial++) {
      const percentage = powerMatrix[startLevel][size - 1] * lastSuccessProb;
      cumulativeSum += percentage;

      expectedVisitDistribution.push(percentage);

      if (cumulativeSum > this.cumulativeSumLimit) break;

      powerMatrix = Matrix.multiply(powerMatrix, Q);
    }

    return expectedVisitDistribution;
  }

  calculateExpectedVisitsDistributionDirectly() {
    const { endLevel } = this.strategy;

    if (endLevel <= SCROLL_LIMIT) {
      throw new Error("End level must be greater than maximum scroll limit");
    }

    const successRateCounts = this.createSuccessRateCounts();
    let expectedVisitDistribution = [1];

    for (const [successRate, count] of Object.entries(successRateCounts)) {
      const p = parseFloat(successRate) / 100;
      const dist = [];
      let cumulativeSum = 0;

      for (let trial = 0; trial < this.maxTrial; trial++) {
        const prob = this.negativeBinomial(trial, count, p);
        dist.push(prob);
        cumulativeSum += prob;

        if (cumulativeSum > this.cumulativeSumLimit) break;
      }

      expectedVisitDistribution = this.convolution(
        expectedVisitDistribution,
        dist
      );
    }

    return expectedVisitDistribution;
  }

  createSuccessRateCounts() {
    const { startLevel, endLevel, successRates } = this.strategy;
    const directStartLevel = Math.max(startLevel, SCROLL_LIMIT);
    const successRateCounts = {};

    for (let level = directStartLevel; level < endLevel; level++) {
      const successRate = successRates[level];

      successRateCounts[successRate] =
        (successRateCounts[successRate] || 0) + 1;
    }

    return successRateCounts;
  }

  negativeBinomial(n, k, p) {
    if (n < k) return 0;

    const comb = binomial(n - 1, k - 1);
    return comb * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  convolution(a, b) {
    const result = new Array(a.length + b.length - 1).fill(0);

    for (let i = 0; i < a.length; i++) {
      let cumulative = 0;
      for (let j = 0; j < b.length; j++) {
        const p = a[i] * b[j];
        result[i + j] += p;
        cumulative += p;
        if (cumulative > this.cumulativeSumLimit) break;
      }
    }

    return result;
  }
}

export class FindBestStrategy {
  constructor(startLevel, endLevel, scrollCosts, otherCosts, baseRates) {
    this.startLevel = startLevel;
    this.endLevel = endLevel;
    this.strategyEndLevel = Math.min(endLevel, SCROLL_LIMIT);
    this.scrollCosts = scrollCosts;
    this.otherCosts = otherCosts;
    this.baseRates = baseRates;
  }

  findBest() {
    if (this.startLevel >= this.strategyEndLevel) {
      return this.buildDirectStrategy();
    }

    let bestStrategy = null;
    let lowestCost = Infinity;

    for (const strategy of this.generateStrategies()) {
      const calculator = new Calculator(strategy);
      const cost = calculator.expectedTotalCost;

      if (cost < lowestCost) {
        lowestCost = cost;
        bestStrategy = strategy;
      }
    }

    return this.buildFinalStrategy(bestStrategy);
  }

  filterDominatedItems(level, items) {
    const seen = new Set();
    const result = [];

    for (const itemA of items) {
      const pA = getSuccessRate(level, itemA.fixedRates, this.baseRates);
      const cA = this.scrollCosts[itemA.id];

      const key = `${pA}-${cA}`;
      if (seen.has(key)) continue;

      const dominated = items.some((itemB) => {
        if (itemB === itemA) return false;
        const pB = getSuccessRate(level, itemB.fixedRates, this.baseRates);
        const cB = this.scrollCosts[itemB.id];
        return pB >= pA && cB <= cA && (pB > pA || cB < cA);
      });

      if (!dominated) {
        seen.add(key);
        result.push(itemA);
      }
    }

    return result;
  }

  selectedScrolls() {
    const scrolls = Object.values(SCROLLS).filter((scroll) => scroll.canRetro);
    const scrollsAfter3 = scrolls.filter(
      (scroll) => scroll.id !== SCROLL_IDS.WAR_SCROLL
    );

    return {
      scrolls,
      scrollsAfter3,
    };
  }

  generateStrategies() {
    const results = [];
    const { scrolls, scrollsAfter3 } = this.selectedScrolls();

    const backtrack = (level = 0, path = []) => {
      if (level === this.strategyEndLevel) {
        results.push(this.buildCandidateStrategy([...path]));
        return;
      }

      let baseItems = level <= 3 ? scrolls : scrollsAfter3;
      const filteredItems = this.filterDominatedItems(level, baseItems);

      if (level > 3) {
        filteredItems.push(SCROLLS[SCROLL_IDS.MAGIC_STONE]);
      }

      for (const item of filteredItems) {
        path.push(item);
        backtrack(level + 1, path);
        path.pop();
      }
    };

    backtrack();
    console.log(`Generated ${results.length} strategies.`);
    return results;
  }

  buildCandidateStrategy(path) {
    const strategy = new Strategy({
      startLevel: this.startLevel,
      endLevel: this.strategyEndLevel,
      scrollCosts: this.scrollCosts,
      otherCosts: this.otherCosts,
      path: path,
      baseRates: this.baseRates,
    });

    return strategy;
  }

  buildFinalStrategy(strategy) {
    if (this.endLevel <= this.strategyEndLevel) {
      return strategy;
    }

    const path = strategy.path;
    this.completePathWithMagicStone(path, this.strategyEndLevel);

    const finalStrategy = new Strategy({
      startLevel: this.startLevel,
      endLevel: this.endLevel,
      scrollCosts: this.scrollCosts,
      otherCosts: this.otherCosts,
      path: path,
      baseRates: this.baseRates,
    });

    return finalStrategy;
  }

  buildDirectStrategy() {
    const path = [];
    this.completePathWithMagicStone(path, this.startLevel);

    return new Strategy({
      startLevel: this.startLevel,
      endLevel: this.endLevel,
      scrollCosts: this.scrollCosts,
      otherCosts: this.otherCosts,
      path: path,
      baseRates: this.baseRates,
    });
  }

  completePathWithMagicStone(path, startLevel) {
    for (let level = startLevel; level < this.endLevel; level++) {
      const scroll = SCROLLS[SCROLL_IDS.MAGIC_STONE];
      path[level] = scroll;
    }
  }
}