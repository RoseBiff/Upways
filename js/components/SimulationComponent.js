/**
 * Composant de simulation Monte Carlo pour valider les calculs
 */
export class SimulationComponent {
    constructor(dataService) {
        this.dataService = dataService;
        this.simulationResults = null;
    }

    /**
     * Simule N runs complets d'amélioration
     * @param {Object} strategy - La stratégie à simuler
     * @param {Number} numSimulations - Nombre de simulations à effectuer
     * @returns {Object} Résultats de la simulation
     */
    simulateUpgradeRuns(strategy, numSimulations = 1000000) {
        console.log(`Starting ${numSimulations} simulations...`);
        
        const startLevel = strategy.startLevel || 0;
        const endLevel = strategy.endLevel || (strategy.path.length + startLevel);
        
        // Extraire les données du path
        const levelData = [];
        for (let i = 0; i < strategy.path.length; i++) {
            const step = strategy.path[i];
            levelData.push({
                level: startLevel + i + 1,
                rate: step.rate / 100,
                noDowngrade: step.noDowngrade
            });
        }
        
        // Résultats des simulations
        const completionTrials = [];
        const trialsByLevel = Array(levelData.length).fill(null).map(() => []);
        
        // Effectuer les simulations
        for (let sim = 0; sim < numSimulations; sim++) {
            const result = this.simulateSingleRun(levelData, startLevel);
            
            if (result.completed) {
                completionTrials.push(result.totalTrials);
                
                // Enregistrer les essais par niveau
                result.trialsByLevel.forEach((trials, index) => {
                    trialsByLevel[index].push(trials);
                });
            }
            
            // Log de progression
            if ((sim + 1) % 1000 === 0) {
                console.log(`Progress: ${sim + 1}/${numSimulations} simulations`);
            }
        }
        
        // Calculer les statistiques
        const stats = this.calculateSimulationStats(completionTrials, trialsByLevel, levelData);
        
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
        
        return this.simulationResults;
    }

    /**
     * Simule une seule tentative complète d'amélioration
     */
    simulateSingleRun(levelData, startLevel) {
        let currentLevel = startLevel;
        const targetLevel = startLevel + levelData.length;
        let totalTrials = 0;
        const trialsByLevel = [];
        const maxTrials = 100000; // Sécurité pour éviter les boucles infinies
        
        // Initialiser les compteurs par niveau
        for (let i = 0; i < levelData.length; i++) {
            trialsByLevel[i] = 0;
        }
        
        while (currentLevel < targetLevel && totalTrials < maxTrials) {
            const levelIndex = currentLevel - startLevel;
            const levelInfo = levelData[levelIndex];
            
            // Incrémenter les essais
            totalTrials++;
            trialsByLevel[levelIndex]++;
            
            // Tenter l'amélioration
            if (Math.random() < levelInfo.rate) {
                // Succès
                currentLevel++;
            } else {
                // Échec
                if (!levelInfo.noDowngrade && currentLevel > startLevel) {
                    // Régression d'un niveau
                    currentLevel--;
                }
                // Sinon, on reste au même niveau
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
            const levelMean = trials.reduce((a, b) => a + b, 0) / trials.length;
            const levelSorted = [...trials].sort((a, b) => a - b);
            
            return {
                level: levelData[index].level,
                rate: levelData[index].rate,
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
        if (completionTrials.length === 0) return [];
        
        const sorted = [...completionTrials].sort((a, b) => a - b);
        const curve = [];
        const maxTrials = sorted[sorted.length - 1];
        
        // Générer un point tous les N essais pour avoir une courbe lisse
        const step = Math.max(1, Math.floor(maxTrials / 500));
        
        for (let trials = 1; trials <= maxTrials; trials += step) {
            // Compter combien de simulations ont réussi en <= trials essais
            const count = sorted.filter(t => t <= trials).length;
            const probability = (count / sorted.length) * 100;
            
            curve.push({
                x: trials,
                y: probability
            });
        }
        
        // Ajouter le dernier point pour être sûr d'atteindre 100%
        if (curve[curve.length - 1].y < 100) {
            curve.push({
                x: maxTrials,
                y: 100
            });
        }
        
        return curve;
    }

    /**
     * Compare les résultats de simulation avec la courbe théorique
     */
    compareWithTheory(theoreticalCurve) {
        if (!this.simulationResults || !this.simulationResults.empiricalCurve) {
            return null;
        }
        
        const empirical = this.simulationResults.empiricalCurve;
        const comparison = [];
        
        // Pour chaque point de la courbe théorique, trouver la valeur empirique correspondante
        theoreticalCurve.forEach(theoPoint => {
            // Trouver le point empirique le plus proche
            let closestEmp = empirical[0];
            let minDist = Math.abs(empirical[0].x - theoPoint.x);
            
            for (const empPoint of empirical) {
                const dist = Math.abs(empPoint.x - theoPoint.x);
                if (dist < minDist) {
                    minDist = dist;
                    closestEmp = empPoint;
                }
            }
            
            comparison.push({
                trials: theoPoint.x,
                theoretical: theoPoint.y,
                empirical: closestEmp.y,
                difference: Math.abs(theoPoint.y - closestEmp.y)
            });
        });
        
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