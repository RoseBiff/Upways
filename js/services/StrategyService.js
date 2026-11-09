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
   * Calcule les tentatives individuelles attendues pour la phase guilde
   * via la formule récursive correcte (destruction = retour à +0) :
   *   E_k = (1 + (1 − P_k) × Σ_{i<k} E_i) / P_k
   *   Total = Σ E_k
   */
  _computeGuildExpectedAttempts(cStar, guildRates) {
    let total = 0;
    for (let k = 0; k < cStar; k++) {
      const P_k = guildRates[k] / 100;
      const E_k = P_k >= 1 ? 1 : (1 + (1 - P_k) * total) / P_k;
      total += E_k;
    }
    return total;
  }

  /**
   * Construit la PMF exacte des tentatives individuelles pour la phase guilde.
   * Modèle : chaque "run" d'item utilise 1 à cStar tentatives individuelles.
   *   - Échec au palier k  → k+1 tentatives (niveaux 0..k, destruction au niveau k)
   *   - Succès complet     → cStar tentatives exactement (1 par palier)
   * On calcule la somme composée (compound distribution) via DP.
   * maxT est calculé dynamiquement à partir des tentatives attendues pour couvrir la queue.
   */
  _buildGuildPhasePMF(cStar, guildRates, pReachGuild, pSuccessGuild) {
    // Calcul de la moyenne via la formule récursive exacte pour dimensionner maxT correctement
    const guildExpAttempts = this._computeGuildExpectedAttempts(cStar, guildRates);
    // 20× la moyenne couvre largement le 99e percentile pour toutes les distributions pratiques
    // On plafonne à 200 000 pour éviter les problèmes mémoire sur des objets extrêmement difficiles
    const maxT = Math.min(
      Math.max(cStar + 1, Math.ceil(guildExpAttempts * 20), 5000),
      200000
    );

    const pmf  = new Float64Array(maxT + 1);

    if (pSuccessGuild >= 1) {
      // Taux 100% à tous les niveaux : exactement cStar tentatives garanties
      if (cStar <= maxT) pmf[cStar] = 1;
      return Array.from(pmf);
    }

    // PMF d'un run raté (conditionnel sur l'échec)
    // P(run raté prend n=k+1 tentatives) = pReachGuild[k]*(1−rate_k)/(1−pSuccessGuild)
    const qFail = 1 - pSuccessGuild;
    const failPMF = new Float64Array(cStar + 1); // failPMF[1..cStar]
    for (let k = 0; k < cStar; k++) {
      const n = k + 1;
      const p = pReachGuild[k] * (1 - guildRates[k] / 100);
      failPMF[n] = p / qFail;
    }

    // DP : P(T=t) = Σ_{j=0}^{∞} P(N=j+1) * P(Σ_j_runs_ratés = t−cStar)
    // où P(N=j+1) = qFail^j * pSuccessGuild
    let failConv = new Float64Array(1);
    failConv[0] = 1.0; // j=0 : somme vide = 0

    for (let j = 0; ; j++) {
      const pJ = Math.pow(qFail, j) * pSuccessGuild;
      if (pJ < 1e-10) break;

      // Contribution : j runs ratés + 1 réussi (=cStar tentatives)
      for (let s = 0; s < failConv.length; s++) {
        if (failConv[s] <= 0) continue;
        const t = s + cStar;
        if (t <= maxT) pmf[t] += pJ * failConv[s];
      }

      // Convoluer failConv avec failPMF pour j+1
      const nextLen = failConv.length + cStar;
      if (nextLen > maxT + 1) break;
      const next = new Float64Array(nextLen);
      for (let s = 0; s < failConv.length; s++) {
        if (failConv[s] <= 0) continue;
        for (let n = 1; n <= cStar; n++) {
          if (failPMF[n] > 0 && s + n < nextLen) {
            next[s + n] += failConv[s] * failPMF[n];
          }
        }
      }
      failConv = next;
    }

    return Array.from(pmf);
  }

  /**
   * Convolution discrète de deux PMF (indexées depuis 0)
   */
  _convolveDistributions(pmf1, pmf2) {
    const len1 = pmf1.length;
    const len2 = pmf2.length;
    const maxLen = Math.min(len1 + len2 - 1, 200001);
    const result = new Float64Array(maxLen);

    for (let i = 0; i < len1; i++) {
      if (!pmf1[i] || pmf1[i] <= 0) continue;
      for (let j = 0; j < len2; j++) {
        if (!pmf2[j] || pmf2[j] <= 0) continue;
        const idx = i + j;
        if (idx < maxLen) result[idx] += pmf1[i] * pmf2[j];
      }
    }

    return Array.from(result);
  }

  /**
   * Calcule le scénario du forgeron de guilde
   *
   * Mécanisme : on part d'un objet +0, chaque échec détruit l'objet (on repart de +0).
   * Taux = baseRate[k] + 10 (plafonné à 100), uniquement pour niveaux 0 → endLevel ≤ 9.
   *
   * Modèle mathématique :
   *   p_k = min(100, baseRate[k] + 10) / 100
   *   P_reach[k] = ∏(i=0..k-1) p_i  (prob d'atteindre le niveau k dans une tentative)
   *   P_success = P_reach[endLevel]
   *   E[coût par tentative] = B + ∑ P_reach[k] * otherCosts[k]
   *   E[coût total] = (1 / P_success) * E[coût par tentative]
   */
  /**
   * Calcule le scénario hybride forgeron de guilde + parchemins optimaux
   *
   * Principe : pour chaque niveau de basculement c (0 ≤ c ≤ endLevel),
   *   - Phase 1 (guilde) : partir de +0, utiliser le forgeron de guilde jusqu'à +c
   *     (taux base+10, destruction sur échec → modèle géométrique)
   *   - Phase 2 (parchemins) : utiliser les parchemins optimaux de +c à +endLevel
   *     (Chaîne de Markov, dégradation sur échec)
   * On cherche c* = argmin( Cost_guilde(c) + Cost_parchemins(c) )
   */
  async calculateHybridGuildStrategy(itemId, endLevel, baseItemPrice) {
    const itemData = await this.dataService.getItemById(itemId);
    if (!itemData) throw new Error('Item not found');

    const { scrollCosts, otherCosts, baseRates } = await this.prepareCosts(
      itemData, Math.max(endLevel, SCROLL_LIMIT + 1)
    );

    // Multiplicateur du coût yang pour le forgeron de guilde (arme ×2, armure ×1,5, bijou ×2,5)
    const guildMultiplierInfo = this.dataService.getGuildMultiplier(itemId);
    const guildMultiplier     = guildMultiplierInfo?.multiplier ?? 1;

    // Pré-calcul des coûts yang et matériaux par palier (en millions)
    const yangCosts = new Array(endLevel).fill(0);
    const matCosts  = new Array(endLevel).fill(0);
    for (let k = 0; k < endLevel; k++) {
      const ld    = itemData[(k + 1).toString()] || {};
      yangCosts[k] = (ld.yang_cost || 0) / 1000000;
      matCosts[k]  = await this.calculateMaterialCost(ld.materials || {});
    }

    // ----------------------------------------------------------------
    // ACTIONS DISPONIBLES À CHAQUE PALIER
    //
    // type 'guild' : taux de base + 10 %, échec → objet détruit (retour +0)
    // type 'retro' : taux du parchemin, échec → rétrogradation (k→k-1, min 0)
    // type 'stay'  : taux de base, échec → reste au palier k (pierre magique)
    // ----------------------------------------------------------------
    const bsRates = SCROLLS[SCROLL_IDS.BLACKSMITH_MANUAL].fixedRates;
    const dgRates = SCROLLS[SCROLL_IDS.DRAGON_GOD_SCROLL].fixedRates;
    const wrRates = SCROLLS[SCROLL_IDS.WAR_SCROLL].fixedRates;

    const actions = [
      {
        id:      'guild',
        name:    'Forgeron de guilde',
        getRate: k => Math.min(1, ((baseRates[k] || 0) + 10) / 100),
        // Le yang est multiplié selon le type d'objet ; les matériaux sont inchangés
        getCost: k => (yangCosts[k] * guildMultiplier) + (matCosts[k] || 0),
        type:    'guild'
      },
      {
        id:      SCROLL_IDS.WAR_SCROLL,
        getRate: k => (k < wrRates.length && wrRates[k] > 0) ? wrRates[k] / 100 : -1,
        getCost: k => (otherCosts[k] || 0) + (scrollCosts[SCROLL_IDS.WAR_SCROLL] || 0),
        type:    'retro'
      },
      {
        id:      SCROLL_IDS.BLACKSMITH_MANUAL,
        getRate: k => k < bsRates.length ? bsRates[k] / 100 : -1,
        getCost: k => (otherCosts[k] || 0) + (scrollCosts[SCROLL_IDS.BLACKSMITH_MANUAL] || 0),
        type:    'retro'
      },
      {
        id:      SCROLL_IDS.DRAGON_GOD_SCROLL,
        getRate: k => k < dgRates.length ? dgRates[k] / 100 : -1,
        getCost: k => (otherCosts[k] || 0) + (scrollCosts[SCROLL_IDS.DRAGON_GOD_SCROLL] || 0),
        type:    'retro'
      },
      {
        id:      SCROLL_IDS.BLESSING_SCROLL,
        getRate: k => Math.max(0.001, (baseRates[k] || 0)) / 100,
        getCost: k => (otherCosts[k] || 0) + (scrollCosts[SCROLL_IDS.BLESSING_SCROLL] || 0),
        type:    'retro'
      },
      {
        id:      SCROLL_IDS.MAGIC_STONE,
        getRate: k => Math.max(0.001, (baseRates[k] || 0)) / 100,
        getCost: k => (otherCosts[k] || 0) + (scrollCosts[SCROLL_IDS.MAGIC_STONE] || 0),
        type:    'stay'
      }
    ];

    // ----------------------------------------------------------------
    // ITÉRATION DE VALEUR (équations de Bellman)
    //
    // V[k] = coût total espéré optimal pour aller du palier k au palier
    //        cible, en ayant déjà l'objet au palier k.
    //
    // Formules par type d'action :
    //   guild : V[k] = c + p·V[k+1] + (1−p)·(I + V[0])
    //   retro : V[k] = c + p·V[k+1] + (1−p)·V[max(0,k−1)]
    //           → cas k=0 : forme fermée V[0] = c/p + V[1]
    //   stay  : V[k] = c/p + V[k+1]  (forme fermée)
    //
    // On itère jusqu'à convergence (garanti car toutes les proba > 0).
    // ----------------------------------------------------------------
    const EPS      = 1e-9;
    const MAX_ITER = 10000;

    const V      = new Array(endLevel + 1).fill(1e12);
    const policy = new Array(endLevel).fill(null);
    V[endLevel]  = 0;

    for (let iter = 0; iter < MAX_ITER; iter++) {
      let maxChange = 0;

      // Itération de Gauss-Seidel : k décroissant pour exploiter V[k+1] à jour
      for (let k = endLevel - 1; k >= 0; k--) {
        let bestQ = Infinity, bestAction = null;

        for (const action of actions) {
          const p = action.getRate(k);
          if (p < 0) continue; // indisponible

          const c = action.getCost(k);
          let Q;

          if (action.type === 'guild') {
            Q = c + p * V[k + 1] + (1 - p) * (baseItemPrice + V[0]);
          } else if (action.type === 'stay') {
            // pierre magique : forme fermée (p > 0 garanti)
            Q = c / p + V[k + 1];
          } else {
            // retro : cas k=0 spécial (rétrogradation reste à 0 → même que stay)
            Q = k === 0
              ? c / p + V[k + 1]
              : c + p * V[k + 1] + (1 - p) * V[k - 1];
          }

          if (Q < bestQ) { bestQ = Q; bestAction = action; }
        }

        maxChange   = Math.max(maxChange, Math.abs(V[k] - bestQ));
        V[k]        = bestQ;
        policy[k]   = bestAction;
      }

      if (maxChange < EPS) break;
    }

    // Coût total espéré = objet initial + V[0] (V[0] inclut déjà le coût des
    // objets de remplacement en cas de destruction au forgeron de guilde)
    const totalCost = baseItemPrice + V[0];

    // ----------------------------------------------------------------
    // PROBABILITÉ DE SUCCÈS PAR OBJET : q = r[0]
    //
    // r[k] = probabilité que l'objet COURANT (sans en racheter un neuf)
    //        parvienne jusqu'au palier cible depuis le palier k.
    //
    //   guild : r[k] = p · r[k+1]                     (échec = destruction)
    //   retro : r[k] = p·r[k+1] + (1−p)·r[max(0,k−1)]
    //           → cas k=0 : r[0] = r[1]  (forme fermée)
    //   stay  : r[k] = r[k+1]                          (réussite certaine à terme)
    //
    // Le nombre d'objets consommés suit alors une loi géométrique de paramètre q.
    // ----------------------------------------------------------------
    const r     = new Array(endLevel + 1).fill(0);
    r[endLevel] = 1;

    for (let iter = 0; iter < MAX_ITER; iter++) {
      let maxChange = 0;
      for (let k = endLevel - 1; k >= 0; k--) {
        const action = policy[k];
        if (!action) { r[k] = 0; continue; }
        const p = action.getRate(k);
        let newR;

        if (action.type === 'guild') {
          newR = p * r[k + 1];
        } else if (action.type === 'stay') {
          newR = r[k + 1];
        } else {
          newR = k === 0 ? r[1] : p * r[k + 1] + (1 - p) * r[k - 1];
        }

        maxChange = Math.max(maxChange, Math.abs(r[k] - newR));
        r[k]      = newR;
      }
      if (maxChange < EPS) break;
    }

    const hasGuild = policy.some(a => a?.type === 'guild');
    // Sans forgeron de guilde, l'objet n'est jamais détruit → q = 1
    const q = hasGuild ? Math.max(0, Math.min(1, r[0])) : 1;

    // ----------------------------------------------------------------
    // TENTATIVES ESPÉRÉES PAR PALIER (système linéaire couplé)
    //
    // n_k = nombre espéré de tentatives au palier k par objet acheté,
    //       en suivant la politique policy[], depuis l'état +0.
    //
    // Formulation A · n = b, avec b_0 = 1, b_{k>0} = 0 :
    //
    //   diag[k] = p_k   si 'stay' ou ('retro' et k==0)  (boucle interne)
    //           = 1     sinon
    //   A[k][k-1] = −p_{k-1}                            (succès k-1 → k)
    //   A[k][k+1] = −(1−p_{k+1})  si 'retro' et k+1>0  (rétrogradation k+1 → k)
    //
    // Résolution : élimination de Gauss–Jordan avec pivot partiel.
    //
    // Seuls les paliers 'retro' utilisent ce résultat ; 'stay' a 1/p comme
    // forme fermée exacte, et 'guild' est géré via guildReach dans
    // displayRequiredMaterials.
    // ----------------------------------------------------------------
    const geoMeanEarly = q > 0 ? 1 / q : Infinity;
    const visitsSolved = new Array(endLevel).fill(0);
    if (endLevel > 0) {
      const N = endLevel;
      // Matrice augmentée [A | b], taille N × (N+1)
      const aug = Array.from({ length: N }, () => new Array(N + 1).fill(0));

      for (let k = 0; k < N; k++) {
        const act = policy[k];
        if (!act) { aug[k][k] = 1; continue; }
        const p_k = act.getRate(k);

        // Terme diagonal : p_k si boucle interne, 1 sinon
        aug[k][k] = (act.type === 'stay' || (act.type === 'retro' && k === 0)) ? p_k : 1;

        // Contribution de n_{k-1} via succès au palier k-1
        if (k > 0 && policy[k - 1]) {
          aug[k][k - 1] = -policy[k - 1].getRate(k - 1);
        }

        // Contribution de n_{k+1} via rétrogradation au palier k+1 → k
        if (k + 1 < N && policy[k + 1] && policy[k + 1].type === 'retro' && (k + 1) > 0) {
          aug[k][k + 1] = -(1 - policy[k + 1].getRate(k + 1));
        }

        // Second membre
        aug[k][N] = k === 0 ? 1 : 0;
      }

      // Élimination de Gauss–Jordan avec pivot partiel
      for (let col = 0; col < N; col++) {
        // Chercher la ligne de pivot
        let pivot = col;
        for (let row = col + 1; row < N; row++) {
          if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
        }
        [aug[col], aug[pivot]] = [aug[pivot], aug[col]];

        if (Math.abs(aug[col][col]) < 1e-12) continue;

        // Réduire toutes les autres lignes
        for (let row = 0; row < N; row++) {
          if (row === col || Math.abs(aug[row][col]) < 1e-15) continue;
          const f = aug[row][col] / aug[col][col];
          for (let c = col; c <= N; c++) aug[row][c] -= f * aug[col][c];
        }
      }

      // Extraire la solution
      for (let k = 0; k < N; k++) {
        if (Math.abs(aug[k][k]) > 1e-12) {
          visitsSolved[k] = Math.max(0, aug[k][N] / aug[k][k]);
        }
      }
    }

    // ----------------------------------------------------------------
    // CONSTRUCTION DU CHEMIN
    // ----------------------------------------------------------------
    const path              = [];
    const fullPath          = [];
    const waypoints         = [];
    const extendedWaypoints = new Array(endLevel).fill(0);

    for (let k = 0; k < endLevel; k++) {
      const action = policy[k];
      if (!action) continue;

      const p       = action.getRate(k);
      const pPct    = Math.round(p * 1000) / 10;  // pourcentage, 1 décimale
      const yangRaw = (itemData[(k + 1).toString()] || {}).yang_cost || 0;
      const matC    = matCosts[k];
      const upgC    = action.type === 'guild' ? 0 : (scrollCosts[action.id] || 0);
      // Pour le forgeron de guilde, appliquer le multiplicateur au yang
      const yangForDisplay = action.type === 'guild' ? yangCosts[k] * guildMultiplier : yangCosts[k];
      const totalLvl = yangForDisplay + matC + upgC;

      // Waypoint : nombre de tentatives attendues à ce palier sur l'ensemble de la stratégie.
      // - guild : 1 par objet (guildReach × expectedItems dans displayRequiredMaterials gère la mise à l'échelle)
      // - stay  : 1/p (forme fermée exacte, pas de couplage inter-paliers)
      // - retro : visitsSolved[k] × (1/q), issu du système linéaire couplé de la chaîne de Markov
      const wp = action.type === 'guild' ? 1
               : action.type === 'stay'  ? (p > 0 ? 1 / p : 1)
               : /* retro */ (visitsSolved[k] > 0 && isFinite(geoMeanEarly)
                   ? visitsSolved[k] * geoMeanEarly
                   : (p > 0 ? 1 / p : 1));

      const internalName = action.type === 'guild'
        ? 'Forgeron de guilde'
        : (this.dataService.idToInternalName?.[action.id] || String(action.id));

      fullPath.push(internalName);
      waypoints.push(wp);
      extendedWaypoints[k] = wp;

      path.push({
        level:              k + 1,
        name:               internalName,
        rate:               pPct,
        noDowngrade:        action.type !== 'retro',
        expectedTrials:     wp,
        yangCost:           yangRaw,
        yangCostInMillions: yangForDisplay,
        materialCost:       matC,
        upgradeCost:        upgC,
        totalCost:          totalLvl
      });
    }

    // ----------------------------------------------------------------
    // DISTRIBUTION GÉOMÉTRIQUE (nombre d'objets consommés)
    //
    // Si le forgeron de guilde est utilisé : chaque objet réussit avec
    // probabilité q (indépendamment). Nombre d'objets ~ Géométrique(q).
    //
    // Si aucun palier n'utilise le forgeron : q = 1, l'objet ne peut pas
    // être détruit → on retombe sur la stratégie parchemins pure.
    // ----------------------------------------------------------------
    if (!hasGuild) {
      // Aucune destruction possible → résultat parchemins pur
      const finder   = new FindBestStrategy(0, endLevel, scrollCosts, otherCosts, baseRates);
      const strat    = finder.findBest();
      const calc     = new Calculator(strat);
      const fallback = await this.formatResult(strat, calc, itemData, 0, endLevel, 'hybrid-scroll');
      return { ...fallback, type: 'hybrid' };
    }

    const geoPct = (pct) => {
      if (q >= 1) return 1;
      if (pct <= 0) return 1;
      if (pct >= 100) return Infinity;
      return Math.ceil(Math.log(1 - pct / 100) / Math.log(1 - q));
    };

    const geoDistrib = [0];
    const geoCdfArr  = [{ x: 0, y: 0 }];
    let cumul = 0;
    for (let n = 1; cumul < 0.9999 && n <= 500000; n++) {
      const pmf = Math.pow(1 - q, n - 1) * q;
      geoDistrib.push(pmf);
      cumul += pmf;
      geoCdfArr.push({ x: n, y: cumul * 100 });
    }

    const geoMean = q > 0 ? 1 / q : Infinity;
    const geoStd  = q > 0 ? Math.sqrt(1 - q) / q : Infinity;

    const itemsIntervals = {
      mean: geoMean,
      std:  geoStd,
      ci95: { lower: geoPct(5), upper: geoPct(95) },
      percentiles: {
        p5:  geoPct(5),
        p25: geoPct(25),
        p50: geoPct(50),
        p75: geoPct(75),
        p95: geoPct(95)
      }
    };

    const byLevelIntervals = waypoints.map(mean => ({
      mean,
      std:  Math.sqrt(mean),
      ci95: { lower: Math.max(0, mean - 1.96 * Math.sqrt(mean)), upper: mean + 1.96 * Math.sqrt(mean) }
    }));

    console.log('MDP Guild strategy résultat:', {
      q:             (q * 100).toFixed(4) + ' %',
      expectedItems: geoMean.toFixed(2),
      p50:           geoPct(50) + ' objets',
      p95:           geoPct(95) + ' objets',
      totalCost:     totalCost.toFixed(2) + ' M',
      policy:        policy.map((a, k) => `+${k}→+${k + 1}: ${a?.id === 'guild' ? 'Guilde' : a?.id}`)
    });

    return {
      type:               'hybrid',
      startLevel:         0,
      endLevel,
      baseItemPrice,
      path,
      fullPath,
      waypoints,
      extendedWaypoints,
      totalTrials:        geoMean,
      pSuccessGuild:      q,
      itemsMode:          true,
      minAttemptsForChart: 1,
      totalCost,
      expectedItems:      geoMean,
      distribution:       geoDistrib,
      intervals: {
        total:   itemsIntervals,
        byLevel: byLevelIntervals
      },
      riskLevel:          this.calculateRiskLevel(geoStd / geoMean),
      guildMultiplierInfo,
      calculateTrialsProbabilities: () => geoCdfArr
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