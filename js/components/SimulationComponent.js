/**
 * Composant de simulation Monte Carlo pour valider les calculs
 * Version corrigée pour gérer les régressions sous le niveau de départ
 */
export class SimulationComponent {
    constructor(dataService) {
        this.dataService = dataService;
        this.simulationResults = null;
        this.isRunning = false;
    }

    /**
     * Vérifie si une simulation est en cours
     */
    isSimulationRunning() {
        return this.isRunning;
    }

    /**
     * Simule N runs complets d'amélioration
     * @param {Object} strategy - La stratégie à simuler
     * @param {Number} numSimulations - Nombre de simulations à effectuer
     * @returns {Object} Résultats de la simulation
     */
    async simulateUpgradeRuns(strategy, numSimulations = 10000) {
        console.log(`Starting ${numSimulations} simulations...`);
        console.log('Strategy received:', strategy);
        
        this.isRunning = true;
        
        // Vérifier que la stratégie contient les données nécessaires
        if (!strategy) {
            console.error('Strategy is null or undefined');
            this.isRunning = false;
            return {
                error: 'No strategy provided',
                numSimulations: 0,
                stats: null,
                empiricalCurve: []
            };
        }
        
        const startLevel = strategy.startLevel || 0;
        const endLevel = strategy.endLevel || (strategy.path.length + startLevel);
        
        console.log(`Simulation from level ${startLevel} to ${endLevel}`);
        
        // Utiliser les données complètes de la stratégie
        let fullLevelData = [];
        
        // IMPORTANT: On a besoin des données depuis le niveau 0 jusqu'à endLevel
        // pour gérer les régressions possibles
        if (strategy.fullRates && strategy.fullFlags) {
            // On a toutes les données depuis le niveau 1
            for (let i = 0; i < strategy.fullRates.length && i < endLevel; i++) {
                fullLevelData.push({
                    level: i + 1,
                    rate: strategy.fullRates[i] / 100,
                    noDowngrade: strategy.fullFlags[i]
                });
            }
            console.log(`Données complètes disponibles: ${fullLevelData.length} niveaux`);
        } else if (strategy.path && strategy.rates && strategy.flags) {
            console.log('Construction des données à partir du path');
            
            // Construire les données à partir du path
            // D'abord, ajouter les niveaux avant startLevel si nécessaire
            for (let i = 0; i < startLevel; i++) {
                // Estimer les données pour les niveaux avant le début
                if (i < 4) {
                    fullLevelData.push({
                        level: i + 1,
                        rate: 1.0, // Parchemin de Guerre = 100%
                        noDowngrade: false
                    });
                } else {
                    fullLevelData.push({
                        level: i + 1,
                        rate: 0.3, // Estimation conservative
                        noDowngrade: false
                    });
                }
            }
            
            // Ajouter les données du path
            for (let i = 0; i < strategy.path.length; i++) {
                const step = strategy.path[i];
                fullLevelData.push({
                    level: startLevel + i + 1,
                    rate: (step.rate || strategy.rates[i] || 10) / 100,
                    noDowngrade: step.noDowngrade || (strategy.flags && strategy.flags[i]) || false
                });
            }
        } else {
            console.error('Données insuffisantes dans la stratégie');
            console.error('Structure de la stratégie:', {
                hasFullRates: !!strategy.fullRates,
                hasFullFlags: !!strategy.fullFlags,
                hasPath: !!strategy.path,
                hasRates: !!strategy.rates,
                hasFlags: !!strategy.flags,
                pathLength: strategy.path?.length,
                ratesLength: strategy.rates?.length
            });
            
            this.isRunning = false;
            return {
                error: 'Insufficient strategy data',
                numSimulations: 0,
                stats: null,
                empiricalCurve: []
            };
        }
        
        console.log(`Simulation avec ${fullLevelData.length} niveaux de données`);
        
        // AJOUTER CE LOG
        console.log('=== SIMULATION DEBUG ===');
        console.log('fullLevelData:');
        fullLevelData.forEach(data => {
            console.log(`  Niveau ${data.level}: rate=${(data.rate * 100).toFixed(1)}%, noDowngrade=${data.noDowngrade}`);
        });
        console.log('========================');
        
        // Résultats des simulations
        const completionTrials = [];
        const trialsByLevel = Array(endLevel).fill(null).map(() => []);
        
        // Effectuer les simulations
        for (let sim = 0; sim < numSimulations; sim++) {
            const result = this.simulateSingleRunV2(fullLevelData, startLevel, endLevel);
            
            if (result.completed) {
                completionTrials.push(result.totalTrials);
                
                // Enregistrer les essais par niveau
                result.trialsByLevel.forEach((trials, index) => {
                    if (trialsByLevel[index]) {
                        trialsByLevel[index].push(trials);
                    }
                });
            }
            
            // Log de progression
            if ((sim + 1) % 1000 === 0) {
                console.log(`Progress: ${sim + 1}/${numSimulations} simulations`);
            }
        }
        
        // Vérifier qu'on a des résultats
        if (completionTrials.length === 0) {
            console.error('Aucune simulation n\'a réussi!');
            this.isRunning = false;
            return {
                error: 'No successful completions',
                numSimulations,
                stats: null,
                empiricalCurve: []
            };
        }
        
        console.log(`Simulations réussies: ${completionTrials.length}/${numSimulations}`);
        
        // Calculer les statistiques
        const levelDataForStats = fullLevelData.slice(0, endLevel);
        const stats = this.calculateSimulationStats(completionTrials, trialsByLevel, levelDataForStats);
        
        // Générer la courbe empirique
        const empiricalCurve = this.generateEmpiricalCurve(completionTrials);
        
        this.simulationResults = {
            numSimulations,
            completionTrials,
            trialsByLevel,
            stats,
            empiricalCurve
        };
        
        console.log('Simulation complete:', stats);
        
        this.isRunning = false;
        return this.simulationResults;
    }

    /**
     * Version 2 de la simulation qui utilise toutes les données
     * CORRIGÉE pour compter TOUS les essais, même sous le niveau de départ
     */
    simulateSingleRunV2(fullLevelData, startLevel, targetLevel) {
        let currentLevel = startLevel;
        let totalTrials = 0;
        const trialsByLevel = new Array(targetLevel).fill(0);
        const maxTrials = 100000;
        
        while (currentLevel < targetLevel && totalTrials < maxTrials) {
            totalTrials++;
            
            // Les données sont indexées par niveau - 1 (niveau 1 est à l'index 0)
            const dataIndex = currentLevel;
            
            // Vérification des limites
            if (dataIndex < 0) {
                console.error(`Niveau ${currentLevel + 1} négatif!`);
                break;
            }
            
            if (dataIndex >= fullLevelData.length) {
                console.error(`Niveau ${currentLevel + 1} hors limites! (max: ${fullLevelData.length})`);
                console.error('fullLevelData:', fullLevelData);
                break;
            }
            
            const levelInfo = fullLevelData[dataIndex];
            
            // IMPORTANT: Compter l'essai pour ce niveau TOUJOURS
            // Même si on est en dessous du startLevel à cause d'une régression
            if (currentLevel >= 0 && currentLevel < targetLevel) {
                trialsByLevel[currentLevel]++;
            }
            
            // Tenter l'amélioration
            if (Math.random() < levelInfo.rate) {
                // Succès
                currentLevel++;
            } else {
                // Échec
                if (!levelInfo.noDowngrade && currentLevel > 0) {
                    // Régression d'un niveau
                    currentLevel--;
                }
                // Sinon on reste au même niveau
            }
        }
        
        return {
            completed: currentLevel >= targetLevel,
            totalTrials,
            trialsByLevel,
            finalLevel: currentLevel
        };
    }

    /**
     * Calcule les statistiques des simulations
     */
    calculateSimulationStats(completionTrials, trialsByLevel, levelData) {
        const n = completionTrials.length;
        
        if (n === 0) {
            return { error: 'No successful completions' };
        }
        
        // Statistiques globales
        const mean = completionTrials.reduce((a, b) => a + b, 0) / n;
        const sorted = [...completionTrials].sort((a, b) => a - b);
        const median = sorted[Math.floor(n / 2)];
        const percentile5 = sorted[Math.floor(n * 0.05)];
        const percentile95 = sorted[Math.floor(n * 0.95)];
        const min = sorted[0];
        const max = sorted[n - 1];
        
        // Écart-type
        const variance = completionTrials.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
        const std = Math.sqrt(variance);
        
        // Statistiques par niveau
        const levelStats = trialsByLevel.map((trials, index) => {
            if (trials.length === 0) {
                return {
                    level: index + 1,
                    rate: levelData[index]?.rate || 0,
                    mean: 0,
                    median: 0,
                    min: 0,
                    max: 0
                };
            }
            
            const levelMean = trials.reduce((a, b) => a + b, 0) / trials.length;
            const levelSorted = [...trials].sort((a, b) => a - b);
            
            return {
                level: index + 1,
                rate: levelData[index]?.rate || 0,
                mean: levelMean,
                median: levelSorted[Math.floor(trials.length / 2)],
                min: levelSorted[0],
                max: levelSorted[trials.length - 1]
            };
        });
        
        return {
            totalSimulations: n,
            mean,
            median,
            std,
            min,
            max,
            percentile5,
            percentile95,
            levelStats
        };
    }

    /**
     * Génère la courbe empirique de probabilité cumulative
     */
    generateEmpiricalCurve(completionTrials) {
        if (!completionTrials || completionTrials.length === 0) {
            console.warn('Pas de données de completion pour générer la courbe empirique');
            return [];
        }
        
        const sorted = [...completionTrials].sort((a, b) => a - b);
        const curve = [];
        const n = sorted.length;
        
        // Toujours commencer à (0, 0)
        curve.push({ x: 0, y: 0 });
        
        // Calculer le nombre de points à générer (max 500 points)
        const maxPoints = 500;
        const maxTrials = sorted[sorted.length - 1];
        const minTrials = sorted[0];
        
        // Calculer le pas pour avoir une courbe lisse
        const step = Math.max(1, Math.floor((maxTrials - minTrials) / maxPoints));
        
        // Générer les points de la courbe
        for (let trials = minTrials; trials <= maxTrials; trials += step) {
            // Compter combien de simulations ont réussi en <= trials essais
            let count = 0;
            for (let i = 0; i < n; i++) {
                if (sorted[i] <= trials) {
                    count++;
                } else {
                    break; // Comme c'est trié, on peut arrêter
                }
            }
            
            const probability = (count / n) * 100;
            
            curve.push({
                x: trials,
                y: probability
            });
        }
        
        // Ajouter le dernier point pour être sûr d'atteindre 100%
        if (curve.length > 0 && curve[curve.length - 1].y < 100) {
            curve.push({
                x: maxTrials,
                y: 100
            });
        }
        
        console.log(`Courbe empirique générée: ${curve.length} points, de ${minTrials} à ${maxTrials} essais`);
        
        return curve;
    }

    /**
     * Compare les résultats de simulation avec la courbe théorique
     */
    compareWithTheory(theoreticalCurve) {
        if (!this.simulationResults || !this.simulationResults.empiricalCurve) {
            console.warn('No simulation results available for comparison');
            return null;
        }
        
        if (!theoreticalCurve || theoreticalCurve.length === 0) {
            console.warn('No theoretical curve available for comparison');
            return null;
        }
        
        const empirical = this.simulationResults.empiricalCurve;
        
        // Vérifier que les courbes existent et ne sont pas vides
        if (!empirical || empirical.length === 0) {
            console.warn('Empty empirical curve');
            return null;
        }
        
        const comparison = [];
        
        // Pour chaque point de la courbe théorique, trouver la valeur empirique correspondante
        theoreticalCurve.forEach(theoPoint => {
            if (!theoPoint || typeof theoPoint.x === 'undefined' || typeof theoPoint.y === 'undefined') {
                return; // Skip invalid points
            }
            
            // Trouver le point empirique le plus proche
            let closestEmp = null;
            let minDist = Infinity;
            
            for (const empPoint of empirical) {
                if (empPoint && typeof empPoint.x !== 'undefined') {
                    const dist = Math.abs(empPoint.x - theoPoint.x);
                    if (dist < minDist) {
                        minDist = dist;
                        closestEmp = empPoint;
                    }
                }
            }
            
            if (closestEmp) {
                comparison.push({
                    trials: theoPoint.x,
                    theoretical: theoPoint.y,
                    empirical: closestEmp.y,
                    difference: Math.abs(theoPoint.y - closestEmp.y)
                });
            }
        });
        
        if (comparison.length === 0) {
            console.warn('No comparison points found');
            return null;
        }
        
        // Calculer l'erreur moyenne
        const avgError = comparison.reduce((sum, p) => sum + p.difference, 0) / comparison.length;
        
        return {
            comparison,
            avgError,
            maxError: Math.max(...comparison.map(p => p.difference))
        };
    }

    /**
     * Obtient les données pour afficher sur le graphique
     */
    getChartData() {
        if (!this.simulationResults) return null;
        
        return {
            empiricalCurve: this.simulationResults.empiricalCurve,
            stats: this.simulationResults.stats
        };
    }
}