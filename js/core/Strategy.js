/**
 * Classe représentant une stratégie d'amélioration
 */

import { getSuccessRate } from './utils.js';
import { SCROLLS } from './Constants.js';

export class Strategy {
  constructor({ startLevel, endLevel, scrollCosts, otherCosts, path, baseRates, itemData = null }) {
    this.startLevel = startLevel;
    this.endLevel = endLevel;
    this.path = path; // Array d'objets scroll
    this.itemData = itemData; // Données complètes de l'item si disponibles
    this.computeDerivedValues(scrollCosts, otherCosts, baseRates);
  }

  computeDerivedValues(scrollCosts, otherCosts, baseRates) {
    const canRetroFlags = [];
    const successRates = [];
    const costs = [];
    const detailedPath = [];

    for (let level = 0; level < this.endLevel; level++) {
      if (level < this.path.length) {
        const scroll = this.path[level];
        const actualLevel = level + 1; // Niveau 1-based pour les données
        
        // Flags de rétrogradation
        canRetroFlags[level] = scroll.canRetro;
        
        // Taux de succès
        let rate;
        if (this.itemData && scroll.fixedRates === null) {
          // Pour Pierre magique et Parchemin de bénédiction, utiliser les données de l'item
          const levelData = this.itemData[actualLevel.toString()];
          rate = levelData?.success_rate || 1;
        } else {
          rate = getSuccessRate(level, scroll.fixedRates, baseRates);
        }
        successRates[level] = rate;
        
        // Coûts
        const scrollCost = scrollCosts[scroll.id] || 0;
        const otherCost = otherCosts[level] || 0;
        costs[level] = scrollCost + otherCost;
        
        // Chemin détaillé pour debug/affichage
        detailedPath.push({
          level: actualLevel,
          scroll: scroll,
          rate: rate,
          cost: costs[level],
          canRetro: scroll.canRetro
        });
      }
    }

    this.canRetroFlags = canRetroFlags;
    this.successRates = successRates;
    this.costs = costs;
    this.detailedPath = detailedPath;
  }

  /**
   * Obtient le coût total moyen de la stratégie
   * @param {Object} expectedVisits - Visites attendues par niveau
   * @returns {number} Coût total moyen
   */
  getExpectedCost(expectedVisits) {
    let totalCost = 0;
    
    for (let level = this.startLevel; level < this.endLevel; level++) {
      if (expectedVisits[level] && this.costs[level] !== undefined) {
        totalCost += expectedVisits[level] * this.costs[level];
      }
    }
    
    return totalCost;
  }

  /**
   * Convertit la stratégie en format compatible avec l'ancien système
   * @returns {Object} Stratégie au format legacy
   */
  toLegacyFormat() {
    return {
      startLevel: this.startLevel,
      endLevel: this.endLevel,
      path: this.path.map(s => s.id),
      costs: this.costs,
      noRetroFlags: this.canRetroFlags.map(canRetro => !canRetro),
      successRates: this.successRates
    };
  }

  /**
   * Clone la stratégie
   * @returns {Strategy} Nouvelle instance
   */
  clone() {
    return new Strategy({
      startLevel: this.startLevel,
      endLevel: this.endLevel,
      scrollCosts: this.getScrollCosts(),
      otherCosts: this.getOtherCosts(),
      path: [...this.path],
      baseRates: this.getBaseRates(),
      itemData: this.itemData
    });
  }

  /**
   * Récupère les coûts des parchemins depuis la stratégie
   * @returns {Object} Map ID -> coût
   */
  getScrollCosts() {
    const scrollCosts = {};
    this.path.forEach((scroll, index) => {
      const otherCost = this.getOtherCosts()[index] || 0;
      scrollCosts[scroll.id] = (this.costs[index] || 0) - otherCost;
    });
    return scrollCosts;
  }

  /**
   * Récupère les autres coûts (yang + matériaux)
   * @returns {Array} Tableau des coûts par niveau
   */
  getOtherCosts() {
    // Cette méthode nécessiterait de stocker otherCosts dans le constructeur
    // Pour l'instant, on retourne un tableau de 0
    return new Array(this.endLevel).fill(0);
  }

  /**
   * Récupère les taux de base
   * @returns {Array} Tableau des taux
   */
  getBaseRates() {
    const baseRates = [];
    
    for (let level = 0; level < this.endLevel; level++) {
      if (this.path[level] && this.path[level].fixedRates === null) {
        // Pour les parchemins sans taux fixes, extraire depuis successRates
        baseRates[level] = this.successRates[level];
      } else {
        baseRates[level] = 100; // Valeur par défaut
      }
    }
    
    return baseRates;
  }

  /**
   * Affiche un résumé de la stratégie
   * @returns {string} Description textuelle
   */
  toString() {
    const pathStr = this.path.map(s => s.internalName || s.name).join(' → ');
    const totalCost = this.costs.reduce((sum, c) => sum + c, 0);
    return `Strategy[${this.startLevel}-${this.endLevel}]: ${pathStr} (Cost: ${totalCost})`;
  }

  /**
   * Vérifie si la stratégie est valide
   * @returns {boolean} True si valide
   */
  isValid() {
    return (
      this.startLevel >= 0 &&
      this.endLevel > this.startLevel &&
      this.path.length > 0 &&
      this.costs.length === this.successRates.length &&
      this.successRates.every(rate => rate > 0 && rate <= 100)
    );
  }
}