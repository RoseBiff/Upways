import { MarkovChainWithIntervals } from '../core/MarkovChain.js';

/**
 * Service de calcul des stratégies d'amélioration
 */
export class StrategyService {
    constructor(dataService) {
        this.dataService = dataService;
    }

    /**
     * Calcule la stratégie optimale avec une exploration exhaustive déterministe
     * IMPORTANT: Pour les niveaux > 9, on force l'utilisation de pierres magiques uniquement
     */
    async calculateOptimalStrategy(itemId, startLevel, endLevel) {
        const itemData = this.dataService.getItemById(itemId);

        // Définir les méthodes d'amélioration disponibles pour les niveaux 5-9
        const methods = [
            {
                name: "Parchemin de bénédiction",
                getRate: (level) => itemData[level.toString()]?.success_rate || 0,
                noDowngrade: false
            },
            {
                name: "Manuel de Forgeron", 
                getRate: (level) => [100, 100, 90, 80, 70, 60, 50, 30, 20][level - 1] || 0,
                noDowngrade: false
            },
            {
                name: "Parchemin du Dieu Dragon",
                getRate: (level) => [100, 75, 65, 55, 45, 40, 35, 25, 20][level - 1] || 0,
                noDowngrade: false
            },
            {
                name: "Pierre magique",
                getRate: (level) => itemData[level.toString()]?.success_rate || 0,
                noDowngrade: true
            }
        ];

        // Déterminer le niveau max pour l'optimisation (max 9)
        const optimizationEndLevel = Math.min(endLevel, 9);
        
        let bestStrategy = null;
        let bestCost = Infinity;

        // Générer toutes les combinaisons possibles pour la plage de niveaux jusqu'à +9
        const combinations = this.generateAllCombinations(methods, startLevel, optimizationEndLevel);

        // Évaluer chaque combinaison
        for (const combination of combinations) {
            const strategy = this.evaluateStrategyDeterministic(combination, itemData, startLevel, endLevel);

            if (strategy.totalCost < bestCost) {
                bestCost = strategy.totalCost;
                bestStrategy = strategy;
            }
        }

        return bestStrategy;
    }

    /**
     * Calcule une stratégie personnalisée
     */
    async calculateCustomStrategy(customScenario, itemId, startLevel, endLevel) {
        const itemData = this.dataService.getItemById(itemId);
        
        // S'assurer que le scénario est bien défini
        if (!customScenario || customScenario.length === 0) {
            // Initialiser avec un scénario par défaut
            customScenario = [];
            for (let i = startLevel + 1; i <= endLevel; i++) {
                if (i <= 4) {
                    customScenario.push("Parchemin de Guerre");
                } else if (i > 9) {
                    customScenario.push("Pierre magique");
                } else {
                    // Par défaut, utiliser Parchemin du Dieu Dragon pour les niveaux 5-9
                    customScenario.push("Parchemin du Dieu Dragon");
                }
            }
        }
        
        return this.evaluateStrategy(customScenario, itemData, startLevel, endLevel);
    }

    /**
     * Génère toutes les combinaisons possibles d'objets d'amélioration
     */
    generateAllCombinations(methods, startLevel, endLevel) {
        const combinations = [];
        const numLevels = endLevel - startLevel;

        // Fonction récursive pour générer les combinaisons
        function generateCombos(currentCombo, levelIndex) {
            if (levelIndex === numLevels) {
                combinations.push([...currentCombo]);
                return;
            }

            const currentLevel = startLevel + levelIndex + 1;

            // Pour les niveaux 1-4, utiliser uniquement Parchemin de Guerre
            if (currentLevel <= 4) {
                currentCombo.push("Parchemin de Guerre");
                generateCombos(currentCombo, levelIndex + 1);
                currentCombo.pop();
            } else if (currentLevel <= 9) {
                // Pour les niveaux 5-9, tester tous les objets d'amélioration
                const availableMethods = methods.filter(method => 
                    method.name !== "Parchemin de Guerre"
                );

                for (const method of availableMethods) {
                    currentCombo.push(method.name);
                    generateCombos(currentCombo, levelIndex + 1);
                    currentCombo.pop();
                }
            } else {
                // Pour les niveaux > 9, uniquement Pierre magique
                currentCombo.push("Pierre magique");
                generateCombos(currentCombo, levelIndex + 1);
                currentCombo.pop();
            }
        }

        generateCombos([], 0);
        return combinations;
    }

    /**
     * Évalue une stratégie spécifique de manière déterministe
     */
    evaluateStrategyDeterministic(upgradePath, itemData, startLevel, endLevel) {
        const path = [];
        const rates = [];
        const flags = [];
        const costs = [];

        // Construire les taux de succès pour TOUS les niveaux (0 à endLevel)
        const fullRates = [];
        const fullFlags = [];
        const fullCosts = [];

        // Remplir les taux pour les niveaux 0 à startLevel (valeurs par défaut)
        for (let level = 1; level <= startLevel; level++) {
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
            const defaultOption = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
            const rate = this.calculateSuccessRate(level, defaultOption, levelData.success_rate);

            fullRates.push(rate);
            fullFlags.push(defaultOption === "Pierre magique");
            const materialCost = this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.dataService.getUpgradeCost(defaultOption);
            fullCosts.push(materialCost + upgradeCost);
        }

        // Ajouter les taux pour le chemin spécifié
        for (let i = 0; i < upgradePath.length; i++) {
            const level = startLevel + i + 1;
            let upgradeType = upgradePath[i];
            
            // Forcer pierre magique pour les niveaux > 9
            if (level > 9) {
                upgradeType = "Pierre magique";
            }
            
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
            const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);

            path.push({ 
                name: upgradeType, 
                rate, 
                noDowngrade: upgradeType === "Pierre magique" 
            });

            fullRates.push(rate);
            fullFlags.push(upgradeType === "Pierre magique");

            const materialCost = this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.dataService.getUpgradeCost(upgradeType);
            fullCosts.push(materialCost + upgradeCost);
        }
        
        // Pour les niveaux au-delà du chemin fourni (si endLevel > upgradePath.length)
        for (let level = startLevel + upgradePath.length + 1; level <= endLevel; level++) {
            const upgradeType = "Pierre magique"; // Toujours pierre magique pour > 9
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
            const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);
            
            path.push({ 
                name: upgradeType, 
                rate, 
                noDowngrade: true 
            });
            
            fullRates.push(rate);
            fullFlags.push(true);
            
            const materialCost = this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.dataService.getUpgradeCost(upgradeType);
            fullCosts.push(materialCost + upgradeCost);
        }

        // Créer la chaîne de Markov
        const markov = new MarkovChainWithIntervals(fullRates, fullFlags, startLevel, endLevel);

        // Extraire les waypoints pour les niveaux pertinents
        const relevantWaypoints = [];
        for (let i = startLevel + 1; i <= endLevel; i++) {
            relevantWaypoints.push(markov.waypoints[i - 1]);
        }

        // Calculer le coût total
        const totalCost = fullCosts.reduce((sum, cost, i) => sum + cost * markov.waypoints[i], 0);

        return {
            path,
            rates: fullRates.slice(startLevel, endLevel),
            flags: fullFlags.slice(startLevel, endLevel),
            costs: fullCosts.slice(startLevel, endLevel),
            waypoints: relevantWaypoints,
            totalCost,
            markov,
            intervals: {
                total: markov.intervals.total,
                byLevel: relevantWaypoints.map((_, i) => markov.intervals.byLevel[startLevel + i])
            },
            riskLevel: markov.riskLevel
        };
    }

    /**
     * Évalue une stratégie avec la logique corrigée de la chaîne de Markov
     */
    evaluateStrategy(upgradePath, itemData, startLevel, endLevel) {
        const path = [];
        const rates = [];
        const flags = [];
        const costs = [];
        
        // Construire les taux de succès pour TOUS les niveaux (0 à endLevel)
        const fullRates = [];
        const fullFlags = [];
        const fullCosts = [];
        
        // Remplir les taux pour les niveaux 0 à startLevel
        for (let level = 1; level <= startLevel; level++) {
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
            const defaultOption = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
            const rate = this.calculateSuccessRate(level, defaultOption, levelData.success_rate);
            
            fullRates.push(rate);
            fullFlags.push(defaultOption === "Pierre magique");
            const materialCost = this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.dataService.getUpgradeCost(defaultOption);
            fullCosts.push(materialCost + upgradeCost);
        }
        
        // Ajouter les taux pour le chemin réel (startLevel+1 à endLevel)
        for (let i = 0; i < upgradePath.length; i++) {
            const level = startLevel + i + 1;
            let upgradeType = upgradePath[i];
            
            // Forcer pierre magique pour les niveaux > 9
            if (level > 9 && upgradeType !== "Pierre magique") {
                console.warn(`Niveau ${level}: forcé à Pierre magique`);
                upgradeType = "Pierre magique";
            }
            
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
            const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);
            
            path.push({ 
                name: upgradeType, 
                rate, 
                noDowngrade: upgradeType === "Pierre magique" 
            });
            
            fullRates.push(rate);
            fullFlags.push(upgradeType === "Pierre magique");
            
            const materialCost = this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.dataService.getUpgradeCost(upgradeType);
            fullCosts.push(materialCost + upgradeCost);
        }
        
        // Créer la chaîne de Markov avec tous les taux
        const markov = new MarkovChainWithIntervals(fullRates, fullFlags, startLevel, endLevel);
        
        // Extraire uniquement les waypoints pour les niveaux qui nous intéressent
        const relevantWaypoints = [];
        for (let i = startLevel + 1; i <= endLevel; i++) {
            relevantWaypoints.push(markov.waypoints[i - 1]);
        }
        
        // Calculer le coût total en utilisant les waypoints complets
        const totalCost = fullCosts.reduce((sum, cost, i) => sum + cost * markov.waypoints[i], 0);
        
        return {
            path,
            rates: fullRates.slice(startLevel, endLevel),
            flags: fullFlags.slice(startLevel, endLevel),
            costs: fullCosts.slice(startLevel, endLevel),
            waypoints: relevantWaypoints,
            totalCost,
            markov,
            intervals: {
                total: markov.intervals.total,
                byLevel: relevantWaypoints.map((_, i) => markov.intervals.byLevel[startLevel + i])
            },
            riskLevel: markov.riskLevel
        };
    }

    /**
     * Calcule le taux de succès selon le type d'amélioration
     */
    calculateSuccessRate(level, upgradeType, baseRate) {
        switch (upgradeType) {
            case "Parchemin de bénédiction":
            case "Pierre magique":
                return baseRate || 0;
            case "Manuel de Forgeron":
                // Taux fixes jusqu'au niveau 9
                if (level <= 9) {
                    return [100, 100, 90, 80, 70, 60, 50, 30, 20][level - 1] || 0;
                }
                // Au-delà, utiliser le taux de base
                return baseRate || 0;
            case "Parchemin du Dieu Dragon":
                // Taux fixes jusqu'au niveau 9
                if (level <= 9) {
                    return [100, 75, 65, 55, 45, 40, 35, 25, 20][level - 1] || 0;
                }
                // Au-delà, utiliser le taux de base
                return baseRate || 0;
            case "Parchemin de Guerre":
                return 100;
            default:
                return 0;
        }
    }

    /**
     * Calcule le coût total des matériaux
     */
    calculateMaterialCost(materials) {
        let cost = 0;
        Object.entries(materials).forEach(([id, info]) => {
            cost += this.dataService.getMaterialCost(id) * (info.qty || 0);
        });
        return cost;
    }
}