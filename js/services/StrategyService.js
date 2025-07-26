/**
 * Service de calcul des stratégies - Version 3.3
 * Intégration de DistributionCalculator pour les intervalles de confiance précis
 */

import { Calculator, DistributionCalculator } from '../core/Calculator.js';
import { Strategy } from '../core/Strategy.js';
import { FindBestStrategy } from '../core/Calculator.js';
import { SCROLL_IDS, SCROLLS, SCROLL_LIMIT } from '../core/Constants.js';

/**
 * Service de calcul des stratégies d'amélioration
 */
export class StrategyService {
  constructor(dataService) {
    this.dataService = dataService;
    // Configuration pour les limites de calcul
    this.config = {
      maxTrials: 50000, // Limite configurable pour les calculs de distribution
      cumulativeSumLimit: 0.999 // Arrêter quand on atteint 99.9% de probabilité cumulative
    };
  }

  /**
   * Configure les limites de calcul
   */
  setCalculationLimits(maxTrials, cumulativeSumLimit) {
    this.config.maxTrials = maxTrials;
    this.config.cumulativeSumLimit = cumulativeSumLimit;
  }

  /**
   * Calcule la stratégie optimale
   */
  async calculateOptimalStrategy(itemId, startLevel, endLevel) {
    const itemData = await this.dataService.getItemById(itemId);
    
    // Préparer les données au format attendu par FindBestStrategy
    const { scrollCosts, otherCosts, baseRates } = await this.prepareCosts(itemData, Math.max(endLevel, SCROLL_LIMIT + 1));
    
    // Debug des coûts
    console.log('Optimal strategy - Scroll costs:', scrollCosts);
    console.log('Optimal strategy - Start:', startLevel, 'End:', endLevel);
    
    // Utiliser FindBestStrategy pour trouver la meilleure stratégie
    const finder = new FindBestStrategy(
      startLevel,
      endLevel,
      scrollCosts,
      otherCosts,
      baseRates
    );
    
    const bestStrategy = finder.findBest();
    
    // Calculer avec Calculator
    const calculator = new Calculator(bestStrategy);
    
    // Convertir au format attendu par l'application
    return await this.formatResult(bestStrategy, calculator, itemData, startLevel, endLevel, 'optimal');
  }

  /**
   * Calcule une stratégie personnalisée
   */
  async calculateCustomStrategy(customScenario, itemId, startLevel, endLevel) {
    const itemData = await this.dataService.getItemById(itemId);
    
    // Préparer les données
    const { scrollCosts, otherCosts, baseRates } = await this.prepareCosts(itemData, Math.max(endLevel, SCROLL_LIMIT + 1));
    
    // Debug des coûts
    console.log('Custom strategy - Scroll costs:', scrollCosts);
    console.log('Custom strategy - Scenario:', customScenario);
    console.log('Custom strategy - Start:', startLevel, 'End:', endLevel);
    
    // Convertir le scénario personnalisé en path d'objets scroll
    const path = this.buildCustomPath(customScenario, startLevel, endLevel);
    
    // Créer la stratégie
    const strategy = new Strategy({
      startLevel,
      endLevel,
      scrollCosts,
      otherCosts,
      path,
      baseRates
    });
    
    // Debug la stratégie créée
    console.log('Custom strategy costs:', strategy.costs);
    console.log('Custom strategy path:', path.map(s => s.name));
    
    // Calculer
    const calculator = new Calculator(strategy);
    
    // Formater
    return await this.formatResult(strategy, calculator, itemData, startLevel, endLevel, 'custom');
  }

  /**
   * Prépare les données de coûts au format attendu par les nouvelles classes
   */
  async prepareCosts(itemData, maxLevel) {
    // scrollCosts : objet avec les coûts par ID de parchemin
    const scrollCosts = {
      [SCROLL_IDS.BLESSING_SCROLL]: this.dataService.getUpgradeCost("Parchemin de bénédiction"),
      [SCROLL_IDS.BLACKSMITH_MANUAL]: this.dataService.getUpgradeCost("Manuel de Forgeron"),
      [SCROLL_IDS.DRAGON_GOD_SCROLL]: this.dataService.getUpgradeCost("Parchemin du Dieu Dragon"),
      [SCROLL_IDS.WAR_SCROLL]: this.dataService.getUpgradeCost("Parchemin de Guerre"),
      [SCROLL_IDS.MAGIC_STONE]: this.dataService.getUpgradeCost("Pierre magique")
    };

    // otherCosts : objet avec les autres coûts par niveau (0-indexed)
    const otherCosts = {};
    
    // baseRates : objet avec les taux de base par niveau (0-indexed)
    const baseRates = {};
    
    // IMPORTANT: Préparer les coûts pour TOUS les niveaux possibles (0 à maxLevel)
    // même si on ne les utilise pas tous, car le Calculator peut avoir besoin
    // des coûts pour des niveaux inférieurs au startLevel (régressions)
    for (let level = 0; level < maxLevel; level++) {
      const levelData = itemData[(level + 1).toString()] || {};
      
      // Coût en yang (en millions)
      const yangCost = (levelData.yang_cost || 0) / 1000000;
      
      // Coût des matériaux
      const matCost = await this.calculateMaterialCost(levelData.materials || {});
      
      // Coût total hors objet d'amélioration
      otherCosts[level] = yangCost + matCost;
      
      // Taux de base de l'item - IMPORTANT: Ne jamais avoir 0
      let rate = levelData.success_rate || 1;
      // S'assurer que le taux n'est jamais 0 pour éviter des divisions par zéro
      if (rate <= 0) {
        console.warn(`Level ${level + 1} has invalid success rate: ${rate}, using 1`);
        rate = 1;
      }
      baseRates[level] = rate;
    }

    console.log('Prepared baseRates:', baseRates);

    return {
      scrollCosts,
      otherCosts,
      baseRates
    };
  }

  /**
   * Construit le path pour une stratégie personnalisée
   */
  buildCustomPath(customScenario, startLevel, endLevel) {
    const path = [];
    
    console.log('Building custom path with scenario:', customScenario);
    
    // IMPORTANT: Construire le path pour TOUS les niveaux de 0 à endLevel
    // même si on commence à un niveau plus élevé, car le Calculator peut
    // avoir besoin de calculer des coûts pour des niveaux inférieurs (régressions)
    for (let level = 0; level < endLevel; level++) {
      let scrollName;
      
      // Utiliser customScenario pour tous les niveaux disponibles
      if (customScenario[level] !== undefined) {
        scrollName = customScenario[level];
      } else if (level > 9) {
        scrollName = "Pierre magique";
      } else if (level <= 3) {
        scrollName = "Parchemin de Guerre";
      } else {
        // Pour les niveaux 4-9 non définis dans customScenario
        scrollName = "Parchemin du Dieu Dragon";
      }
      
      // Convertir le nom en objet scroll
      const scrollId = this.dataService.UPGRADE_ITEM_IDS[scrollName];
      console.log(`Level ${level}: "${scrollName}" -> ID: ${scrollId}`);
      
      if (scrollId && SCROLLS[scrollId]) {
        path[level] = SCROLLS[scrollId];
      } else {
        // Fallback sur Pierre magique si introuvable
        console.warn(`Unknown scroll name: "${scrollName}" at level ${level}, using Magic Stone as fallback`);
        path[level] = SCROLLS[SCROLL_IDS.MAGIC_STONE];
      }
    }
    
    console.log('Built path:', path.map(s => s ? s.name : 'null'));
    
    return path;
  }

  /**
   * Calcule les percentiles à partir de la distribution
   */
  calculatePercentilesFromDistribution(distribution) {
    let cumulative = 0;
    let p5 = null, p25 = null, p50 = null, p75 = null, p95 = null;
    
    for (let i = 0; i < distribution.length; i++) {
      cumulative += distribution[i];
      
      if (p5 === null && cumulative >= 0.05) p5 = i;
      if (p25 === null && cumulative >= 0.25) p25 = i;
      if (p50 === null && cumulative >= 0.50) p50 = i;
      if (p75 === null && cumulative >= 0.75) p75 = i;
      if (p95 === null && cumulative >= 0.95) p95 = i;
      
      if (p95 !== null) break;
    }
    
    // Calculer la moyenne et l'écart-type depuis la distribution
    let mean = 0;
    let variance = 0;
    
    for (let i = 0; i < distribution.length; i++) {
      mean += i * distribution[i];
    }
    
    for (let i = 0; i < distribution.length; i++) {
      variance += Math.pow(i - mean, 2) * distribution[i];
    }
    
    const std = Math.sqrt(variance);
    
    return {
      p5: p5 || 0,
      p25: p25 || 0,
      p50: p50 || 0,
      p75: p75 || 0,
      p95: p95 || 0,
      mean,
      std
    };
  }

  /**
   * Calcule les intervalles basés sur la distribution réelle
   */
  calculateIntervalsFromDistribution(distribution, waypoints) {
    const stats = this.calculatePercentilesFromDistribution(distribution);
    
    return {
      total: {
        mean: stats.mean,
        std: stats.std,
        ci95: {
          lower: stats.p5,
          upper: stats.p95
        },
        percentiles: {
          p5: stats.p5,
          p25: stats.p25,
          p50: stats.p50,
          p75: stats.p75,
          p95: stats.p95
        }
      },
      // Pour les niveaux individuels, on utilise une approximation
      byLevel: waypoints.map(mean => ({
        mean,
        std: Math.sqrt(mean),
        ci95: {
          lower: Math.max(0, mean - 1.96 * Math.sqrt(mean)),
          upper: mean + 1.96 * Math.sqrt(mean)
        }
      }))
    };
  }

  /**
   * Formate le résultat pour l'application
   */
  async formatResult(strategy, calculator, itemData, startLevel, endLevel, strategyType) {
    const expectedVisits = calculator.expectedVisits;
    let expectedTotalCost = calculator.expectedTotalCost;
    
    // Vérifier si le coût est NaN ou invalide
    if (isNaN(expectedTotalCost) || expectedTotalCost === null || expectedTotalCost === undefined) {
      console.error(`ERROR: expectedTotalCost is invalid (${expectedTotalCost}) for ${strategyType} strategy`);
      expectedTotalCost = 0;
    }
    
    // Calculer la distribution pour des intervalles précis
    console.log(`Calculating distribution for ${strategyType} strategy...`);
    const distributionCalculator = new DistributionCalculator(
      strategy, 
      this.config.maxTrials, 
      this.config.cumulativeSumLimit
    );
    const distribution = distributionCalculator.calculateExpectedVisitsDistribution();
    console.log(`Distribution calculated: ${distribution.length} points`);
    
    // Convertir expectedVisits (objet) en waypoints (tableau)
    const waypoints = [];
    const extendedWaypoints = [];
    
    // S'assurer que extendedWaypoints a la bonne taille
    for (let level = 0; level < endLevel; level++) {
      const visits = expectedVisits[level] || 0;
      extendedWaypoints[level] = visits;
      if (level >= startLevel && level < endLevel) {
        waypoints.push(visits);
      }
    }
    
    // Construire le chemin détaillé avec les noms internes
    const path = [];
    const fullPath = [];
    
    // IMPORTANT: fullPath doit contenir les noms réels utilisés par la stratégie
    for (let level = 0; level < endLevel; level++) {
      const scroll = strategy.path[level];
      if (!scroll) continue;
      
      // Nom interne pour l'UI
      const internalName = this.dataService.idToInternalName[scroll.id] || scroll.name;
      fullPath.push(internalName);
      
      if (level >= startLevel && level < endLevel) {
        const levelData = itemData[(level + 1).toString()] || {};
        const yangCost = levelData.yang_cost || 0;
        const yangCostInMillions = yangCost / 1000000;
        const materialCost = await this.calculateMaterialCost(levelData.materials || {});
        const upgradeCost = this.dataService.getUpgradeCost(internalName);
        const totalLevelCost = yangCostInMillions + materialCost + upgradeCost;
        
        path.push({
          level: level + 1,
          name: internalName,
          rate: strategy.successRates[level] || 1,
          noDowngrade: !strategy.canRetroFlags[level], // Inverser la logique
          expectedTrials: expectedVisits[level] || 0,
          yangCost: yangCost,
          yangCostInMillions: yangCostInMillions,
          materialCost: materialCost,
          upgradeCost: upgradeCost,
          totalCost: totalLevelCost
        });
      }
    }
    
    // Calculer les intervalles basés sur la distribution réelle
    const intervals = this.calculateIntervalsFromDistribution(distribution, waypoints);
    
    // Debug et recalcul si nécessaire
    if ((expectedTotalCost === 0 || isNaN(expectedTotalCost)) && waypoints.length > 0) {
      console.warn(`Warning: Total cost is ${expectedTotalCost} for ${strategyType} strategy, debugging...`);
      console.log('Strategy costs:', strategy.costs);
      console.log('Expected visits:', expectedVisits);
      console.log('Calculator expectedVisits:', calculator.expectedVisits);
      console.log('Calculator expectedTotalCost:', calculator.expectedTotalCost);
      console.log('StartLevel:', startLevel, 'EndLevel:', endLevel);
      
      // Recalculer manuellement
      let manualTotalCost = 0;
      let hasValidCosts = false;
      
      for (let level = 0; level < endLevel; level++) {
        const visits = expectedVisits[level] || 0;
        if (visits > 0 && strategy.costs[level] !== undefined && !isNaN(strategy.costs[level])) {
          const levelCost = strategy.costs[level];
          const levelTotal = visits * levelCost;
          console.log(`Level ${level}: ${visits} visits * ${levelCost} cost = ${levelTotal}`);
          if (!isNaN(levelTotal)) {
            manualTotalCost += levelTotal;
            hasValidCosts = true;
          }
        }
      }
      
      console.log('Manual total cost:', manualTotalCost);
      
      // Si le calcul manuel donne un résultat valide, l'utiliser
      if (hasValidCosts && !isNaN(manualTotalCost) && manualTotalCost > 0) {
        expectedTotalCost = manualTotalCost;
        console.log('Using manual calculation:', expectedTotalCost);
      }
    }
    
    // Créer le résultat final
    const result = {
      method: this.determineMethod(startLevel, endLevel),
      path,
      fullPath,
      rates: Object.values(strategy.successRates),
      flags: Object.values(strategy.canRetroFlags).map(canRetro => !canRetro), // Inverser pour compatibility
      // Ajouter les rates et flags complets pour le graphique
      fullRates: Object.keys(strategy.successRates).sort((a, b) => parseInt(a) - parseInt(b)).map(k => strategy.successRates[k]),
      fullFlags: Object.keys(strategy.canRetroFlags).sort((a, b) => parseInt(a) - parseInt(b)).map(k => !strategy.canRetroFlags[k]),
      waypoints,
      extendedWaypoints,
      totalTrials: waypoints.reduce((sum, w) => sum + w, 0),
      totalCost: expectedTotalCost || 0, // S'assurer que ce n'est jamais NaN
      intervals,
      riskLevel: this.calculateRiskLevel(intervals.total.std / intervals.total.mean), // CV = coefficient de variation
      startLevel,
      endLevel,
      // Ajouter la stratégie originale pour debug
      strategy: strategy,
      calculator: calculator,
      // Ajouter la distribution pour le graphique
      distribution: distribution,
      // Pour le graphique - utiliser la distribution cumulative
      calculateTrialsProbabilities: () => this.convertDistributionToCumulative(distribution)
    };

    console.log(`${strategyType} strategy result:`, {
      totalCost: result.totalCost,
      totalTrials: result.totalTrials,
      path: result.fullPath.slice(startLevel, endLevel),
      intervalP5: result.intervals.total.ci95.lower,
      intervalP95: result.intervals.total.ci95.upper
    });

    return result;
  }

  /**
   * Convertit la distribution en probabilité cumulative pour le graphique
   */
  convertDistributionToCumulative(distribution) {
    const points = [];
    let cumulative = 0;
    
    points.push({ x: 0, y: 0 });
    
    for (let i = 0; i < distribution.length; i++) {
      cumulative += distribution[i];
      points.push({ x: i, y: cumulative * 100 });
      
      // Arrêter à 99.99% pour éviter trop de points
      if (cumulative > 0.9999) break;
    }
    
    return points;
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
   * Détermine la méthode utilisée
   */
  determineMethod(startLevel, endLevel) {
    if (endLevel <= SCROLL_LIMIT) return 'markov';
    if (startLevel >= SCROLL_LIMIT) return 'direct';
    return 'mixed';
  }

  /**
   * Calcule le niveau de risque basé sur le coefficient de variation
   */
  calculateRiskLevel(cv) {
    if (cv < 0.20) return 'low';
    if (cv < 0.35) return 'medium';
    return 'high';
  }
}