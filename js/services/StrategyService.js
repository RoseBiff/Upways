/**
 * Service de calcul des stratégies - Version 2.0
 * Utilise la nouvelle architecture modulaire
 */

import { UpgradeCalculator } from '../core/UpgradeCalculator.js';
import { SCROLL_IDS, SCROLLS, SCROLL_LIMIT } from '../core/Constants.js';
import { Strategy } from '../core/Strategy.js';
import { getAvailableScrollsForLevel, getSuccessRate, convertPathToNames } from '../core/utils.js';

/**
 * Service de calcul des stratégies d'amélioration
 */
export class StrategyService {
  constructor(dataService) {
    this.dataService = dataService;
    this.calculator = new UpgradeCalculator();
  }

  /**
   * Calcule la stratégie optimale
   */
  async calculateOptimalStrategy(itemId, startLevel, endLevel) {
    const itemData = await this.dataService.getItemById(itemId);
    
    // Préparer les coûts
    const costs = await this.prepareCosts(itemData, endLevel);
    
    // Extraire les taux de base
    const baseRates = this.extractBaseRates(itemData, endLevel);
    
    // Trouver la meilleure stratégie
    const finder = new FindBestStrategy(
      startLevel,
      endLevel,
      costs.scrollCosts,
      costs.otherCosts,
      baseRates,
      itemData,
      this.calculator
    );
    
    const bestStrategy = finder.findBest();
    const result = this.calculator.calculate(bestStrategy);
    
    // Convertir en format attendu par l'application
    return await this.formatResult(result, itemData, startLevel, endLevel, costs);
  }

  /**
   * Calcule une stratégie personnalisée
   */
  async calculateCustomStrategy(customScenario, itemId, startLevel, endLevel) {
    const itemData = await this.dataService.getItemById(itemId);
    
    // Valider et corriger le scénario
    const validatedPath = this.validateCustomPath(customScenario, startLevel, endLevel);
    
    // Convertir les noms en objets scroll
    const scrollPath = [];
    for (let i = 0; i < endLevel; i++) {
      const scrollName = validatedPath[i];
      const scroll = Object.values(SCROLLS).find(s => s.internalName === scrollName);
      if (scroll) {
        scrollPath[i] = scroll;
      }
    }
    
    // Préparer les coûts
    const costs = await this.prepareCosts(itemData, endLevel);
    const baseRates = this.extractBaseRates(itemData, endLevel);
    
    // Créer la stratégie
    const strategy = new Strategy({
      startLevel,
      endLevel,
      scrollCosts: costs.scrollCosts,
      otherCosts: costs.otherCosts,
      path: scrollPath,
      baseRates,
      itemData
    });
    
    // Calculer
    const result = this.calculator.calculate(strategy);
    
    // Formater
    return await this.formatResult(result, itemData, startLevel, endLevel, costs);
  }

  /**
   * Extrait les taux de base depuis itemData
   */
  extractBaseRates(itemData, maxLevel) {
    const rates = [];
    for (let level = 0; level < maxLevel; level++) {
      const levelData = itemData[(level + 1).toString()];
      rates[level] = levelData?.success_rate || 100;
    }
    return rates;
  }

  /**
   * Prépare les données de coûts
   */
  async prepareCosts(itemData, endLevel) {
    const scrollCosts = {
      [SCROLL_IDS.BLESSING_SCROLL]: this.dataService.getUpgradeCost("Parchemin de bénédiction"),
      [SCROLL_IDS.BLACKSMITH_MANUAL]: this.dataService.getUpgradeCost("Manuel de Forgeron"),
      [SCROLL_IDS.DRAGON_GOD_SCROLL]: this.dataService.getUpgradeCost("Parchemin du Dieu Dragon"),
      [SCROLL_IDS.WAR_SCROLL]: this.dataService.getUpgradeCost("Parchemin de Guerre"),
      [SCROLL_IDS.MAGIC_STONE]: this.dataService.getUpgradeCost("Pierre magique")
    };

    const otherCosts = [];
    const levelCosts = [];
    
    for (let level = 0; level < endLevel; level++) {
      const levelData = itemData[(level + 1).toString()] || {};
      
      // Coût en yang (en millions)
      const yangCost = (levelData.yang_cost || 0) / 1000000;
      
      // Coût des matériaux
      const matCost = await this.calculateMaterialCost(levelData.materials || {});
      
      // Coût total hors objet d'amélioration
      otherCosts[level] = yangCost + matCost;
      
      // Coût total du niveau (sera complété avec l'objet d'amélioration)
      levelCosts[level] = otherCosts[level];
    }

    return {
      scrollCosts,
      otherCosts,
      levelCosts
    };
  }

  /**
   * Calcule le coût des matériaux
   */
  async calculateMaterialCost(materials) {
    let cost = 0;
    for (const [id, info] of Object.entries(materials)) {
      cost += this.dataService.getMaterialCost(id) * (info.qty || 0);
    }
    return cost;
  }

  /**
   * Valide et corrige un chemin personnalisé
   */
  validateCustomPath(customScenario, startLevel, endLevel) {
    const path = [];
    
    for (let i = 0; i < endLevel; i++) {
      const level = i + 1;
      
      if (level > 9) {
        // Forcer Pierre magique après le niveau 9
        path.push("Pierre magique");
      } else if (customScenario && customScenario[i]) {
        // Utiliser le choix personnalisé
        path.push(customScenario[i]);
      } else {
        // Par défaut selon le niveau
        if (level <= 4) {
          path.push("Parchemin de Guerre");
        } else {
          path.push("Parchemin du Dieu Dragon");
        }
      }
    }
    
    return path;
  }

  /**
   * Formate le résultat pour l'application
   */
  async formatResult(calculatorResult, itemData, startLevel, endLevel, costs) {
    const { strategy, expectedVisits, expectedTotalCost, intervals } = calculatorResult;
    
    // Convertir les IDs en noms
    const fullPath = strategy.path.map(id => SCROLLS[id]?.internalName || 'Unknown');
    
    // Construire le chemin détaillé
    const path = [];
    const extendedWaypoints = new Array(endLevel).fill(0);
    
    // Copier les waypoints
    for (let level = 0; level < endLevel; level++) {
      extendedWaypoints[level] = expectedVisits[level] || 0;
      
      if (level >= startLevel && level < endLevel) {
        const scrollId = strategy.path[level] || SCROLL_IDS.MAGIC_STONE;
        const scroll = SCROLLS[scrollId];
        const scrollName = scroll?.internalName || 'Unknown';
        const levelData = itemData[(level + 1).toString()] || {};
        
        // Utiliser le taux de la stratégie
        let rate = strategy.successRates[level] || 1;
        
        // Calculer les coûts détaillés
        const yangCost = levelData.yang_cost || 0;
        const yangCostInMillions = yangCost / 1000000;
        const materialCost = await this.calculateMaterialCost(levelData.materials || {});
        const upgradeCost = this.dataService.getUpgradeCost(scrollName);
        const totalLevelCost = yangCostInMillions + materialCost + upgradeCost;
        
        path.push({
          level: level + 1,
          name: scrollName,
          rate: rate,
          noDowngrade: strategy.noRetroFlags[level] || false,
          expectedTrials: expectedVisits[level] || 0,
          yangCost: yangCost,
          yangCostInMillions: yangCostInMillions,
          materialCost: materialCost,
          upgradeCost: upgradeCost,
          totalCost: totalLevelCost
        });
      }
    }

    // Créer le résultat final
    const result = {
      method: calculatorResult.method,
      path,
      fullPath,
      rates: strategy.successRates,
      flags: strategy.noRetroFlags,
      waypoints: extendedWaypoints.slice(startLevel, endLevel),
      extendedWaypoints,
      totalTrials: calculatorResult.totalTrials,
      totalCost: expectedTotalCost,
      intervals,
      riskLevel: this.calculateRiskLevel(intervals.total.std / calculatorResult.totalTrials),
      startLevel,
      endLevel,
      // Garder une référence au calculator pour les probabilités
      _calculator: calculatorResult
    };

    // Ajouter la méthode de calcul des probabilités
    result.calculateTrialsProbabilities = () => {
      return this.calculator.calculateTrialsProbabilities(calculatorResult);
    };

    return result;
  }

  /**
   * Calcule le niveau de risque
   */
  calculateRiskLevel(cv) {
    if (cv < 0.20) return 'low';
    if (cv < 0.35) return 'medium';
    return 'high';
  }
}

/**
 * Classe pour trouver la meilleure stratégie
 */
class FindBestStrategy {
  constructor(startLevel, endLevel, scrollCosts, otherCosts, baseRates, itemData, calculator) {
    this.startLevel = startLevel;
    this.endLevel = endLevel;
    this.maxLevel = Math.min(endLevel, SCROLL_LIMIT);
    this.scrollCosts = scrollCosts;
    this.otherCosts = otherCosts;
    this.baseRates = baseRates;
    this.itemData = itemData;
    this.calculator = calculator;
    this.strategies = this.generateStrategies();
  }

  findBest() {
    let bestStrategy = null;
    let lowestCost = Infinity;

    console.log(`Finding best strategy among ${this.strategies.length} candidates...`);

    for (const strategy of this.strategies) {
      const result = this.calculator.calculate(strategy);
      const cost = result.expectedTotalCost;

      if (cost < lowestCost) {
        lowestCost = cost;
        bestStrategy = strategy;
      }
    }

    return this.buildFinalStrategy(bestStrategy);
  }

  /**
   * Filtre les items dominés
   * Version améliorée qui permet Pierre magique dans plus de cas
   */
  filterDominatedItems(level, items) {
    // Pour les derniers niveaux, garder toutes les options
    if (level >= 7) {
      console.log(`Level ${level + 1}: Keeping all options for better optimization`);
      return items;
    }
    
    const seen = new Set();
    const result = [];

    for (const itemA of items) {
      const pA = getSuccessRate(level, itemA.fixedRates, this.baseRates);
      const cA = this.scrollCosts[itemA.id] || 0;

      const key = `${pA}-${cA}`;
      if (seen.has(key)) continue;

      let isDominated = false;
      
      // Un item est dominé seulement si STRICTEMENT inférieur
      for (const itemB of items) {
        if (itemB === itemA) continue;
        
        const pB = getSuccessRate(level, itemB.fixedRates, this.baseRates);
        const cB = this.scrollCosts[itemB.id] || 0;
        
        // Domination stricte seulement
        if (pB > pA && cB < cA) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        seen.add(key);
        result.push(itemA);
      }
    }

    // Toujours inclure Pierre magique si elle a un coût raisonnable
    const magicStone = items.find(item => item.id === SCROLL_IDS.MAGIC_STONE);
    if (magicStone && !result.includes(magicStone)) {
      const magicStoneCost = this.scrollCosts[magicStone.id] || 0;
      // L'inclure si son coût n'est pas excessif
      const avgCost = Object.values(this.scrollCosts).reduce((a, b) => a + b, 0) / Object.keys(this.scrollCosts).length;
      if (magicStoneCost <= avgCost * 3) {
        result.push(magicStone);
      }
    }

    return result;
  }

  /**
   * Génère toutes les stratégies possibles
   */
  generateStrategies() {
    const results = [];
    
    // Permettre Pierre magique à tous les niveaux pour l'optimisation
    const allowMagicStone = true;

    const backtrack = (level = 0, path = []) => {
      if (level === this.maxLevel) {
        const strategy = new Strategy({
          startLevel: this.startLevel,
          endLevel: this.maxLevel,
          scrollCosts: this.scrollCosts,
          otherCosts: this.otherCosts,
          path: [...path],
          baseRates: this.baseRates,
          itemData: this.itemData
        });
        results.push(strategy);
        return;
      }

      const availableScrolls = getAvailableScrollsForLevel(level + 1, allowMagicStone);
      const filteredItems = this.filterDominatedItems(level, availableScrolls);

      for (const item of filteredItems) {
        path.push(item);
        backtrack(level + 1, path);
        path.pop();
      }
    };

    backtrack();
    
    console.log(`Generated ${results.length} strategies from level ${this.startLevel} to ${this.endLevel}.`);
    
    return results;
  }

  /**
   * Construit la stratégie finale avec extension si nécessaire
   */
  buildFinalStrategy(strategy) {
    if (!strategy || this.endLevel <= this.maxLevel) {
      return strategy;
    }

    // Étendre la stratégie pour les niveaux > 9
    const extendedPath = [...strategy.path];
    
    // Ajouter Pierre magique pour tous les niveaux > 9
    for (let level = this.maxLevel; level < this.endLevel; level++) {
      extendedPath.push(SCROLLS[SCROLL_IDS.MAGIC_STONE]);
    }
    
    // Créer la stratégie étendue
    return new Strategy({
      startLevel: strategy.startLevel,
      endLevel: this.endLevel,
      scrollCosts: this.scrollCosts,
      otherCosts: this.otherCosts,
      path: extendedPath,
      baseRates: this.baseRates,
      itemData: this.itemData
    });
  }
}