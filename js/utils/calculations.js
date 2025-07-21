/**
 * Utilitaires de calcul
 */

/**
 * Calcule le taux de succès selon le type d'amélioration
 */
export function calculateSuccessRate(level, upgradeType, baseRate) {
    switch (upgradeType) {
        case "Parchemin de bénédiction":
        case "Pierre magique":
            return baseRate || 0;
        case "Manuel de Forgeron":
            return [100, 100, 90, 80, 70, 60, 50, 30, 20][level - 1] || 0;
        case "Parchemin du Dieu Dragon":
            return [100, 75, 65, 55, 45, 40, 35, 25, 20][level - 1] || 0;
        case "Parchemin de Guerre":
            return 100;
        default:
            return 0;
    }
}

/**
 * Calcule le coût total des matériaux
 */
export function calculateMaterialCost(materials, materialCosts) {
    let cost = 0;
    Object.entries(materials).forEach(([id, info]) => {
        cost += (materialCosts[id] || 0) * (info.qty || 0);
    });
    return cost;
}

/**
 * Calcule le coût total d'une amélioration (matériaux + objet)
 */
export function calculateUpgradeCost(materials, materialCosts, upgradeItem, upgradeCost) {
    const matCost = calculateMaterialCost(materials, materialCosts);
    const itemCost = upgradeCost || 0;
    return matCost + itemCost;
}

/**
 * Calcule les statistiques d'un ensemble de valeurs
 */
export function calculateStatistics(values) {
    if (!values || values.length === 0) {
        return { mean: 0, std: 0, min: 0, max: 0, median: 0 };
    }

    // Moyenne
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Écart-type
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    // Min et Max
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Médiane
    const sorted = [...values].sort((a, b) => a - b);
    const median = values.length % 2 === 0
        ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
        : sorted[Math.floor(values.length / 2)];

    return { mean, std, min, max, median };
}

/**
 * Calcule l'intervalle de confiance
 */
export function calculateConfidenceInterval(mean, std, n, confidence = 0.95) {
    const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.58 : 1.96;
    const margin = z * (std / Math.sqrt(n));
    
    return {
        lower: mean - margin,
        upper: mean + margin
    };
}

/**
 * Calcule le percentile d'une valeur dans une distribution
 */
export function calculatePercentile(values, percentile) {
    if (!values || values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    
    if (Number.isInteger(index)) {
        return sorted[index];
    } else {
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
}

/**
 * Calcule la probabilité binomiale
 */
export function binomialProbability(n, k, p) {
    const coefficient = factorial(n) / (factorial(k) * factorial(n - k));
    return coefficient * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/**
 * Calcule la factorielle
 */
export function factorial(n) {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

/**
 * Calcule la probabilité cumulative binomiale
 */
export function cumulativeBinomialProbability(n, k, p) {
    let cumulative = 0;
    for (let i = 0; i <= k; i++) {
        cumulative += binomialProbability(n, i, p);
    }
    return cumulative;
}

/**
 * Vérifie si un niveau peut descendre en cas d'échec
 */
export function canDowngrade(level, upgradeType) {
    return level > 0 && upgradeType !== "Pierre magique";
}

/**
 * Obtient le niveau après échec
 */
export function getLevelAfterFailure(currentLevel, upgradeType) {
    if (currentLevel === 0 || upgradeType === "Pierre magique") {
        return currentLevel;
    }
    return currentLevel - 1;
}

/**
 * Calcule le nombre optimal d'essais pour atteindre une probabilité cible
 */
export function calculateOptimalTrials(successRate, targetProbability = 0.95) {
    if (successRate <= 0) return Infinity;
    if (successRate >= 1) return 1;
    
    const p = successRate;
    const target = targetProbability;
    
    // P(succès après n essais) = 1 - (1-p)^n
    // target = 1 - (1-p)^n
    // (1-p)^n = 1 - target
    // n = log(1 - target) / log(1 - p)
    
    return Math.ceil(Math.log(1 - target) / Math.log(1 - p));
}

/**
 * Calcule la probabilité de succès après n essais
 */
export function calculateSuccessProbabilityAfterTrials(successRate, trials) {
    if (successRate <= 0) return 0;
    if (successRate >= 1) return 1;
    
    return 1 - Math.pow(1 - successRate, trials);
}

/**
 * Estime le coût total basé sur le nombre moyen d'essais
 */
export function estimateTotalCost(avgTrials, costPerTrial) {
    return avgTrials * costPerTrial;
}

/**
 * Calcule le ratio coût/bénéfice
 */
export function calculateCostBenefitRatio(totalCost, itemValue) {
    if (itemValue <= 0) return Infinity;
    return totalCost / itemValue;
}

/**
 * Détermine le niveau de risque basé sur le coefficient de variation
 */
export function calculateRiskLevel(cv) {
    if (cv < 0.20) return 'low';
    if (cv < 0.35) return 'medium';
    return 'high';
}

/**
 * Classe utilitaire pour les calculs avec contexte
 */
export class Calculator {
    constructor(dataService) {
        this.dataService = dataService;
    }

    calculateSuccessRate(level, upgradeType, baseRate) {
        return calculateSuccessRate(level, upgradeType, baseRate);
    }

    calculateMaterialCost(materials) {
        return calculateMaterialCost(materials, this.dataService.materialCosts);
    }

    calculateUpgradeCost(materials, upgradeItem) {
        const upgradeCost = this.dataService.getUpgradeCost(upgradeItem);
        return calculateUpgradeCost(materials, this.dataService.materialCosts, upgradeItem, upgradeCost);
    }

    calculateTotalCost(strategy) {
        let total = 0;
        const itemData = this.dataService.getItemById(strategy.itemId);
        
        strategy.path.forEach((step, index) => {
            const level = strategy.startLevel + index + 1;
            const levelData = itemData[level.toString()] || {};
            const cost = this.calculateUpgradeCost(levelData.materials || {}, step.name);
            total += cost * step.expectedTrials;
        });
        
        return total;
    }
}