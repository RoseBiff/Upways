/**
 * Calculateur d'amélioration unifié - Version 2.0
 * Architecture modulaire avec support complet Pierre magique
 */

import { SCROLL_IDS, SCROLLS, SCROLL_LIMIT, NAME_TO_ID, ID_TO_NAME } from './Constants.js';
import { Strategy } from './Strategy.js';
import { getSuccessRate, getAvailableScrollsForLevel, convertPathToNames } from './utils.js';

// Classe Matrix (identique à l'originale)
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

  static add(A, B) {
    const result = new Array(A.length);
    for (let i = 0; i < A.length; i++) {
      const row = new Array(A[i].length);
      for (let j = 0; j < A[i].length; j++) {
        row[j] = A[i][j] + B[i][j];
      }
      result[i] = row;
    }
    return result;
  }

  static multiply(A, B) {
    const n = A.length;
    const m = B[0].length;
    const p = B.length;
    const result = Array(n).fill(null).map(() => Array(m).fill(0));
    
    for (let i = 0; i < n; i++) {
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

/**
 * Calculateur principal
 */
export class UpgradeCalculator {
  constructor() {
    this.SCROLL_LIMIT = SCROLL_LIMIT;
    
    // Pour compatibilité avec l'ancien code
    this.nameToId = NAME_TO_ID;
    this.idToName = ID_TO_NAME;
    
    // IDs directs pour compatibilité
    this.BLESSING_SCROLL = SCROLL_IDS.BLESSING_SCROLL;
    this.BLACKSMITH_MANUAL = SCROLL_IDS.BLACKSMITH_MANUAL;
    this.DRAGON_GOD_SCROLL = SCROLL_IDS.DRAGON_GOD_SCROLL;
    this.WAR_SCROLL = SCROLL_IDS.WAR_SCROLL;
    this.MAGIC_STONE = SCROLL_IDS.MAGIC_STONE;
  }

  /**
   * Calcule la stratégie complète
   * @param {Strategy|Object} strategy - Stratégie ou objet legacy
   * @returns {Object} Résultat du calcul
   */
  calculate(strategy) {
    // Convertir en Strategy si nécessaire
    if (!(strategy instanceof Strategy)) {
      strategy = this.convertLegacyStrategy(strategy);
    }

    const legacyFormat = strategy.toLegacyFormat();
    const expectedVisits = this.calculateExpectedVisits(legacyFormat);
    const expectedTotalCost = this.calculateExpectedTotalCost(legacyFormat.costs, expectedVisits);
    const intervals = this.calculateIntervals(expectedVisits, legacyFormat.startLevel, legacyFormat.endLevel);

    return {
      strategy: legacyFormat,
      expectedVisits,
      expectedTotalCost,
      intervals,
      totalTrials: Object.values(expectedVisits).reduce((sum, v) => sum + v, 0),
      method: this.determineMethod(legacyFormat.startLevel, legacyFormat.endLevel)
    };
  }

  /**
   * Convertit une stratégie legacy en Strategy
   */
  convertLegacyStrategy(legacyStrategy) {
    const path = legacyStrategy.path.map(id => SCROLLS[id]).filter(s => s);
    
    // Reconstruire scrollCosts et otherCosts
    const scrollCosts = {};
    const otherCosts = [];
    
    legacyStrategy.path.forEach((scrollId, index) => {
      scrollCosts[scrollId] = scrollCosts[scrollId] || 0;
      otherCosts[index] = legacyStrategy.costs[index] || 0;
    });
    
    // Extraire baseRates depuis successRates
    const baseRates = legacyStrategy.successRates || [];
    
    return new Strategy({
      startLevel: legacyStrategy.startLevel,
      endLevel: legacyStrategy.endLevel,
      scrollCosts,
      otherCosts,
      path,
      baseRates
    });
  }

  /**
   * Calcule les visites attendues
   */
  calculateExpectedVisits(strategy) {
    const { startLevel, endLevel } = strategy;

    if (endLevel <= this.SCROLL_LIMIT) {
      return this.calculateExpectedVisitsWithMarkov(strategy);
    } else if (startLevel < this.SCROLL_LIMIT) {
      const markovVisits = this.calculateExpectedVisitsWithMarkov({
        ...strategy,
        endLevel: this.SCROLL_LIMIT
      });
      const directVisits = this.calculateExpectedVisitsDirectly(strategy);
      
      return { ...markovVisits, ...directVisits };
    } else {
      return this.calculateExpectedVisitsDirectly(strategy);
    }
  }

  /**
   * Calcule les visites attendues avec Markov
   */
  calculateExpectedVisitsWithMarkov(strategy) {
    const { startLevel } = strategy;

    if (startLevel >= this.SCROLL_LIMIT) {
      throw new Error("Start level must be less than maximum scroll limit");
    }

    const Q = this.buildTransitionMatrix(strategy);
    const I = Matrix.identity(Q.length);
    const N = Matrix.inverse(Matrix.subtract(I, Q));

    return N[startLevel];
  }

  /**
   * Calcule les visites attendues directement
   */
  calculateExpectedVisitsDirectly(strategy) {
    const { startLevel, endLevel, successRates } = strategy;

    if (endLevel <= this.SCROLL_LIMIT) {
      throw new Error("End level must be greater than maximum scroll limit");
    }

    const directStartLevel = Math.max(startLevel, this.SCROLL_LIMIT);
    const expectedVisits = {};

    for (let i = directStartLevel; i < endLevel; i++) {
      const rate = successRates[i] || 1;
      expectedVisits[i] = 100 / rate;
    }

    return expectedVisits;
  }

  /**
   * Construit la matrice de transition
   */
  buildTransitionMatrix(strategy) {
    const { endLevel, successRates, noRetroFlags } = strategy;
    const matrixSize = Math.min(endLevel, this.SCROLL_LIMIT);
    const Q = new Array(matrixSize);

    for (let i = 0; i < matrixSize; i++) {
      const row = new Array(matrixSize).fill(0);
      const pSuccess = successRates[i] / 100;
      const pFail = 1 - pSuccess;

      const hasNext = i < matrixSize - 1;
      const noRetro = i === 0 || noRetroFlags[i];

      if (hasNext) row[i + 1] = pSuccess;
      if (noRetro) row[i] = pFail;
      else row[i - 1] = pFail;

      Q[i] = row;
    }

    return Q;
  }

  /**
   * Calcule le coût total attendu
   */
  calculateExpectedTotalCost(costs, expectedVisits) {
    let totalCost = 0;

    for (const [level, visits] of Object.entries(expectedVisits)) {
      totalCost += visits * costs[level];
    }

    return totalCost;
  }

  /**
   * Obtient les probabilités pour un objet d'amélioration (pour compatibilité)
   */
  getProbabilities(itemId, itemData) {
    const scroll = SCROLLS[itemId];
    if (!scroll) return [];
    
    if (scroll.fixedRates) {
      return scroll.fixedRates;
    }

    // Pour Pierre magique et Parchemin de bénédiction
    const probabilities = [];
    for (let level = 1; level <= 9; level++) {
      const levelData = itemData[level.toString()];
      probabilities.push(levelData?.success_rate || 1);
    }

    return probabilities;
  }

  /**
   * Obtient le taux de succès pour un niveau spécifique (pour compatibilité)
   */
  getSuccessRateForLevel(itemId, level, itemData) {
    const scroll = SCROLLS[itemId];
    if (!scroll) return 1;
    
    // Pour Pierre magique et Parchemin de bénédiction
    if (itemId === SCROLL_IDS.MAGIC_STONE || itemId === SCROLL_IDS.BLESSING_SCROLL) {
      const levelData = itemData[level.toString()];
      return levelData?.success_rate || 1;
    }
    
    // Pour les autres, utiliser les probabilités fixes
    if (scroll.fixedRates && level <= scroll.fixedRates.length) {
      return scroll.fixedRates[level - 1];
    }
    
    // Fallback
    const levelData = itemData[level.toString()];
    return levelData?.success_rate || 1;
  }

  /**
   * Construit une stratégie à partir d'un chemin (pour compatibilité)
   */
  buildStrategy(result) {
      const strategy = {
          startLevel: result.startLevel,
          endLevel: result.endLevel,
          successRates: {},
          canRetroFlags: {},
          waypoints: [],
          path: result.path || [],
      };

      let currentLevel = result.startLevel;

      for (const step of result.path || []) {
          const nextLevel = step.targetLevel;
          const rate = step.successRate;
          const canRetro = step.canRetro || false;

          for (let i = currentLevel; i < nextLevel; i++) {
              strategy.successRates[i] = rate;
              strategy.canRetroFlags[i] = canRetro;
          }

          currentLevel = nextLevel;
      }

      strategy.totalTrials = result.totalTrials || 100;

      // 🔁 Ajout de la fonction analytique théorique
      strategy.calculateTrialsProbabilities = () => {
          console.log("[DEBUG] Hooked analytical probability curve into strategy object ✅");
          return MarkovChain.calculateProbabilityCurve(strategy);
      };

      return strategy;
  }

  /**
   * Extrait les taux de base depuis itemData
   */
  extractBaseRates(itemData) {
    const rates = [];
    for (let level = 1; level <= 20; level++) {
      const levelData = itemData[level.toString()];
      rates.push(levelData?.success_rate || 1);
    }
    return rates;
  }

  /**
   * Calcule les intervalles de confiance
   */
  calculateIntervals(expectedVisits, startLevel, endLevel) {
    const totalTrials = Object.values(expectedVisits).reduce((sum, v) => sum + v, 0);
    
    const totalVariance = totalTrials;
    const totalStd = Math.sqrt(totalVariance);
    const z95 = 1.96;

    const byLevel = [];
    for (let level = 0; level < endLevel; level++) {
      const visits = expectedVisits[level] || 0;
      const std = Math.sqrt(visits);
      
      byLevel.push({
        mean: visits,
        std: std,
        ci95: {
          lower: Math.max(0, visits - z95 * std),
          upper: visits + z95 * std
        }
      });
    }

    return {
      total: {
        mean: totalTrials,
        std: totalStd,
        ci95: {
          lower: Math.max(1, totalTrials - z95 * totalStd),
          upper: totalTrials + z95 * totalStd
        }
      },
      byLevel
    };
  }

  /**
   * Détermine la méthode utilisée
   */
  determineMethod(startLevel, endLevel) {
    if (endLevel <= this.SCROLL_LIMIT) return 'markov';
    if (startLevel >= this.SCROLL_LIMIT) return 'direct';
    return 'mixed';
  }

  /**
   * Calcule les probabilités cumulées pour le graphique
   */
  calculateTrialsProbabilities(result, maxTrials = 10000) {
    const { strategy, expectedVisits } = result;
    const points = [];
    
    if (result.method === 'markov' || result.method === 'mixed') {
      const Q = this.buildTransitionMatrix(strategy);
      const n = Q.length;
      let currentPower = Matrix.identity(n);
      let cumulativePercentage = 0;

      for (let trial = 1; trial <= maxTrials; trial++) {
        const percentage = currentPower[strategy.startLevel][n - 1] * strategy.successRates[n - 1];
        cumulativePercentage += percentage;

        points.push({
          x: trial,
          y: cumulativePercentage
        });

        if (cumulativePercentage > 99) break;
        
        currentPower = Matrix.multiply(currentPower, Q);
      }
    } else {
      // Pour direct, approximation
      const validRates = strategy.successRates.filter(r => r > 0);
      const avgRate = validRates.length > 0 
        ? validRates.reduce((sum, r) => sum + r, 0) / validRates.length / 100
        : 0.1;
      
      for (let n = 1; n <= maxTrials; n++) {
        const prob = (1 - Math.pow(1 - avgRate, n)) * 100;
        points.push({ x: n, y: prob });
        if (prob > 99.9) break;
      }
    }

    return points;
  }
}