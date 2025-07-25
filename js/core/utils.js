/**
 * Fonctions utilitaires pour les calculs d'amélioration
 */

import { SCROLLS, SCROLL_IDS } from './Constants.js';

/**
 * Obtient le taux de succès pour un niveau donné
 * @param {number} level - Le niveau (0-based)
 * @param {Array|null} fixedRates - Taux fixes du parchemin
 * @param {Array} baseRates - Taux de base de l'item
 * @returns {number} Le taux de succès
 */
export function getSuccessRate(level, fixedRates, baseRates) {
  if (fixedRates && level < fixedRates.length) {
    return fixedRates[level];
  }
  return baseRates[level] || 1;
}

/**
 * Obtient le taux de succès pour un parchemin spécifique
 * @param {number} scrollId - L'ID du parchemin
 * @param {number} level - Le niveau (1-based pour cette fonction)
 * @param {Object} itemData - Les données de l'item
 * @returns {number} Le taux de succès
 */
export function getSuccessRateForScroll(scrollId, level, itemData) {
  const scroll = SCROLLS[scrollId];
  if (!scroll) return 1;
  
  // Pour Pierre magique et Parchemin de bénédiction, toujours utiliser les taux de l'item
  if (scrollId === SCROLL_IDS.MAGIC_STONE || scrollId === SCROLL_IDS.BLESSING_SCROLL) {
    const levelData = itemData[level.toString()];
    return levelData?.success_rate || 1;
  }
  
  // Pour les autres, utiliser les taux fixes s'ils existent
  if (scroll.fixedRates && level <= scroll.fixedRates.length) {
    return scroll.fixedRates[level - 1];
  }
  
  // Fallback sur les données de l'item
  const levelData = itemData[level.toString()];
  return levelData?.success_rate || 1;
}

/**
 * Détermine si un parchemin est disponible pour un niveau donné
 * @param {number} scrollId - L'ID du parchemin
 * @param {number} level - Le niveau (1-based)
 * @returns {boolean} True si le parchemin est disponible
 */
export function isScrollAvailableForLevel(scrollId, level) {
  const scroll = SCROLLS[scrollId];
  if (!scroll) return false;
  
  // Parchemin de Guerre seulement pour niveaux 1-4
  if (scrollId === SCROLL_IDS.WAR_SCROLL && level > 4) {
    return false;
  }
  
  // Les autres parchemins sont disponibles pour tous les niveaux jusqu'à 9
  // Pierre magique peut être utilisée à tous les niveaux (pas seulement > 9)
  return true;
}

/**
 * Obtient la liste des parchemins disponibles pour un niveau
 * @param {number} level - Le niveau (1-based)
 * @param {boolean} allowMagicStone - Si true, inclut la Pierre magique même avant niveau 10
 * @returns {Array} Liste des parchemins disponibles
 */
export function getAvailableScrollsForLevel(level, allowMagicStone = true) {
  const availableScrolls = [];
  
  Object.values(SCROLLS).forEach(scroll => {
    if (isScrollAvailableForLevel(scroll.id, level)) {
      // Pour Pierre magique, vérifier si on l'autorise
      if (scroll.id === SCROLL_IDS.MAGIC_STONE && !allowMagicStone && level <= 9) {
        return;
      }
      availableScrolls.push(scroll);
    }
  });
  
  return availableScrolls;
}

/**
 * Calcule le coût total pour un niveau
 * @param {number} scrollCost - Coût du parchemin
 * @param {number} yangCost - Coût en yang (en millions)
 * @param {number} materialCost - Coût des matériaux
 * @returns {number} Coût total
 */
export function calculateLevelCost(scrollCost, yangCost, materialCost) {
  return scrollCost + yangCost + materialCost;
}

/**
 * Convertit un chemin d'IDs en chemin de noms
 * @param {Array} pathIds - Tableau d'IDs de parchemins
 * @returns {Array} Tableau de noms
 */
export function convertPathToNames(pathIds) {
  return pathIds.map(id => {
    const scroll = SCROLLS[id];
    return scroll ? scroll.internalName : 'Unknown';
  });
}

/**
 * Convertit un chemin de noms en chemin d'IDs
 * @param {Array} pathNames - Tableau de noms de parchemins
 * @returns {Array} Tableau d'IDs
 */
export function convertPathToIds(pathNames) {
  return pathNames.map(name => {
    const scroll = Object.values(SCROLLS).find(s => s.internalName === name);
    return scroll ? scroll.id : null;
  }).filter(id => id !== null);
}

/**
 * Vérifie si deux parchemins ont des propriétés équivalentes pour l'optimisation
 * @param {Object} scrollA - Premier parchemin
 * @param {Object} scrollB - Second parchemin
 * @param {number} level - Niveau à vérifier
 * @param {Array} baseRates - Taux de base
 * @param {Object} costs - Coûts des parchemins
 * @returns {boolean} True si équivalents
 */
export function areScrollsEquivalent(scrollA, scrollB, level, baseRates, costs) {
  const rateA = getSuccessRate(level, scrollA.fixedRates, baseRates);
  const rateB = getSuccessRate(level, scrollB.fixedRates, baseRates);
  const costA = costs[scrollA.id] || 0;
  const costB = costs[scrollB.id] || 0;
  
  return rateA === rateB && costA === costB && scrollA.canRetro === scrollB.canRetro;
}