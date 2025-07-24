import { MarkovChainWithIntervals } from '../core/MarkovChain.js';

/**
 * Service de calcul des stratégies d'amélioration - Version 3.6
 * Pierre magique autorisée dans l'optimisation pour tous les niveaux
 */
export class StrategyService {
    constructor(dataService) {
        this.dataService = dataService;
    }

    /**
     * Calcule la stratégie optimale
     * Règles :
     * - Niveaux 1-4 : Parchemin de Guerre uniquement
     * - Niveaux 5-9 : Optimisation incluant Pierre magique
     * - Niveaux 10+ : Pierre magique uniquement (forcé)
     */
    async calculateOptimalStrategy(itemId, startLevel, endLevel) {
        const itemData = await this.dataService.getItemById(itemId);

        // Si on ne dépasse pas le niveau 9, calcul normal avec toutes les options
        if (endLevel <= 9) {
            return this.calculateOptimalStrategyStandard(itemData, startLevel, endLevel);
        }

        // Si on dépasse le niveau 9, optimiser jusqu'à 9 puis forcer pierre magique
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

        // Construire le chemin optimal jusqu'à 9
        let bestPath = [];
        let bestCost = Infinity;

        // Niveaux 1-4 : toujours Parchemin de Guerre
        const basePath = ["Parchemin de Guerre", "Parchemin de Guerre", "Parchemin de Guerre", "Parchemin de Guerre"];

        // Optimiser les niveaux 5-9 (incluant Pierre magique)
        const combinations = this.generateCombinationsForRange(methods, 5);
        
        for (const combo of combinations) {
            const testPath = [...basePath, ...combo];
            
            // Ajouter Pierre magique pour les niveaux 10+
            const fullPath = [...testPath];
            for (let i = 10; i <= endLevel; i++) {
                fullPath.push("Pierre magique");
            }
            
            // Évaluer ce chemin
            const strategy = await this.evaluateFullPath(fullPath, itemData, startLevel, endLevel);
            
            if (strategy.totalCost < bestCost) {
                bestCost = strategy.totalCost;
                bestPath = fullPath;
            }
        }

        // Retourner la meilleure stratégie trouvée
        return this.evaluateFullPath(bestPath, itemData, startLevel, endLevel);
    }

    /**
     * Calcul standard pour les niveaux <= 9
     */
    async calculateOptimalStrategyStandard(itemData, startLevel, endLevel) {
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

        let bestStrategy = null;
        let bestCost = Infinity;

        const combinations = this.generateAllCombinations(methods, 0, endLevel);

        for (const combination of combinations) {
            const strategy = await this.evaluateFullPath(combination, itemData, startLevel, endLevel);

            if (strategy.totalCost < bestCost) {
                bestCost = strategy.totalCost;
                bestStrategy = strategy;
            }
        }

        return bestStrategy;
    }

    /**
     * Génère les combinaisons pour une plage spécifique (5-9)
     */
    generateCombinationsForRange(methods, count) {
        const combinations = [];
        
        function generateCombos(currentCombo, remaining) {
            if (remaining === 0) {
                combinations.push([...currentCombo]);
                return;
            }
            
            for (const method of methods) {
                currentCombo.push(method.name);
                generateCombos(currentCombo, remaining - 1);
                currentCombo.pop();
            }
        }
        
        generateCombos([], count);
        return combinations;
    }

    /**
     * Calcule une stratégie personnalisée
     * Force Pierre magique après niveau 9 uniquement
     */
    async calculateCustomStrategy(customScenario, itemId, startLevel, endLevel) {
        const itemData = await this.dataService.getItemById(itemId);
        
        // S'assurer que le scénario couvre tout le chemin depuis le niveau 1
        if (!customScenario || customScenario.length < endLevel) {
            customScenario = [];
            for (let i = 1; i <= endLevel; i++) {
                if (i <= 4) {
                    customScenario.push("Parchemin de Guerre");
                } else if (i > 9) {
                    customScenario.push("Pierre magique");
                } else {
                    customScenario.push("Parchemin du Dieu Dragon");
                }
            }
        }
        
        // Forcer Pierre magique après niveau 9 uniquement
        const correctedScenario = [...customScenario];
        for (let i = 9; i < correctedScenario.length; i++) {
            if (i + 1 > 9) { // Niveau i+1 car l'index commence à 0
                correctedScenario[i] = "Pierre magique";
            }
        }
        
        return this.evaluateFullPath(correctedScenario, itemData, startLevel, endLevel);
    }

    /**
     * Génère toutes les combinaisons possibles d'objets d'amélioration
     */
    generateAllCombinations(methods, fromLevel, toLevel) {
        const combinations = [];
        const numLevels = toLevel;

        function generateCombos(currentCombo, levelIndex) {
            if (levelIndex === numLevels) {
                combinations.push([...currentCombo]);
                return;
            }

            const currentLevel = levelIndex + 1;

            // Pour les niveaux 1-4, utiliser uniquement Parchemin de Guerre
            if (currentLevel <= 4) {
                currentCombo.push("Parchemin de Guerre");
                generateCombos(currentCombo, levelIndex + 1);
                currentCombo.pop();
            } else if (currentLevel <= 9) {
                // Pour les niveaux 5-9, tester TOUTES les options incluant Pierre magique
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
     * Évalue un chemin complet d'amélioration
     */
    async evaluateFullPath(fullUpgradePath, itemData, startLevel, endLevel) {
        const path = [];
        const fullRates = [];
        const fullFlags = [];
        const fullCosts = [];
        const fullYangCosts = [];

        // Limiter le calcul Markov au niveau 9 maximum pour performance
        const markovEndLevel = Math.min(endLevel, 9);
        
        // Construire les données jusqu'au niveau markovEndLevel
        for (let level = 1; level <= markovEndLevel; level++) {
            const upgradeType = fullUpgradePath[level - 1];
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0, yang_cost: 0 };
            const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);
            
            fullRates.push(rate);
            fullFlags.push(upgradeType === "Pierre magique");
            
            const yangCost = levelData.yang_cost || 0;
            fullYangCosts.push(yangCost);
            
            const yangCostInMillions = yangCost / 1000000;
            const materialCost = await this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.dataService.getUpgradeCost(upgradeType);
            const totalLevelCost = yangCostInMillions + materialCost + upgradeCost;
            
            fullCosts.push(totalLevelCost);
            
            if (level > startLevel && level <= endLevel) {
                path.push({ 
                    name: upgradeType, 
                    rate, 
                    noDowngrade: upgradeType === "Pierre magique",
                    yangCost: yangCost,
                    yangCostInMillions: yangCostInMillions,
                    materialCost: materialCost,
                    upgradeCost: upgradeCost,
                    totalCost: totalLevelCost
                });
            }
        }

        // Créer la chaîne de Markov jusqu'au niveau 9
        const markov = new MarkovChainWithIntervals(
            fullRates, 
            fullFlags, 
            Math.min(startLevel, markovEndLevel), 
            markovEndLevel,
            5000
        );

        // Calculer les waypoints étendus pour les niveaux > 9
        const extendedWaypoints = [...markov.waypoints];
        let additionalCost = 0;
        
        if (endLevel > 9) {
            // Pour les niveaux 10+, calculer avec Pierre magique
            for (let level = 10; level <= endLevel; level++) {
                const levelData = itemData[level.toString()] || { materials: {}, success_rate: 10, yang_cost: 0 };
                const rate = levelData.success_rate || 10;
                const expectedTrials = 100 / rate;
                
                extendedWaypoints[level - 1] = expectedTrials;
                
                // Calculer le coût
                const yangCost = levelData.yang_cost || 0;
                const yangCostInMillions = yangCost / 1000000;
                const materialCost = await this.calculateMaterialCost(levelData.materials || {});
                const upgradeCost = this.dataService.getUpgradeCost("Pierre magique");
                const totalLevelCost = yangCostInMillions + materialCost + upgradeCost;
                
                additionalCost += totalLevelCost * expectedTrials;
                
                if (level > startLevel) {
                    path.push({ 
                        name: "Pierre magique", 
                        rate, 
                        noDowngrade: true,
                        yangCost: yangCost,
                        yangCostInMillions: yangCostInMillions,
                        materialCost: materialCost,
                        upgradeCost: upgradeCost,
                        totalCost: totalLevelCost,
                        expectedTrials: expectedTrials
                    });
                }
            }
        }

        // Calculer le coût total
        const markovCost = fullCosts.slice(0, markovEndLevel).reduce((sum, cost, i) => sum + cost * markov.waypoints[i], 0);
        const totalCost = markovCost + additionalCost;

        return {
            path,
            fullPath: fullUpgradePath,
            rates: fullRates,
            flags: fullFlags,
            costs: fullCosts,
            yangCosts: fullYangCosts,
            waypoints: extendedWaypoints.slice(startLevel, endLevel),
            totalCost,
            markov,
            extendedWaypoints,
            startLevel,  // Ajouter cette ligne
            endLevel,    // Ajouter cette ligne
            intervals: {
                total: markov.intervals.total,
                byLevel: extendedWaypoints.map((w, i) => ({
                    mean: w,
                    std: Math.sqrt(w),
                    ci95: {
                        lower: Math.max(0, w - 1.96 * Math.sqrt(w)),
                        upper: w + 1.96 * Math.sqrt(w)
                    }
                }))
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
                if (level <= 9) {
                    return [100, 100, 90, 80, 70, 60, 50, 30, 20][level - 1] || 0;
                }
                return baseRate || 0;
            case "Parchemin du Dieu Dragon":
                if (level <= 9) {
                    return [100, 75, 65, 55, 45, 40, 35, 25, 20][level - 1] || 0;
                }
                return baseRate || 0;
            case "Parchemin de Guerre":
                return 100;
            default:
                return 0;
        }
    }

    /**
     * Calcule le coût total des matériaux (retourne en millions)
     */
    async calculateMaterialCost(materials) {
        let cost = 0;
        for (const [id, info] of Object.entries(materials)) {
            cost += this.dataService.getMaterialCost(id) * (info.qty || 0);
        }
        return cost;
    }

    /**
     * Estime le nombre d'essais pour une probabilité cible
     */
    estimateTrialsForProbability(strategy, targetProbability = 0.95) {
        if (!strategy || !strategy.markov) return null;
        
        const points = strategy.markov.calculateTrialsProbabilities();
        
        for (const point of points) {
            if (point.y >= targetProbability * 100) {
                return point.x;
            }
        }
        
        return null;
    }

    /**
     * Compare deux stratégies
     */
    compareStrategies(strategy1, strategy2) {
        return {
            costDifference: strategy2.totalCost - strategy1.totalCost,
            costRatio: strategy2.totalCost / strategy1.totalCost,
            trialsDifference: strategy2.markov.totalTrials - strategy1.markov.totalTrials,
            trialsRatio: strategy2.markov.totalTrials / strategy1.markov.totalTrials,
            riskComparison: {
                strategy1: strategy1.riskLevel,
                strategy2: strategy2.riskLevel
            }
        };
    }
}