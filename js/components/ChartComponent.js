/**
 * Composant de gestion des graphiques - Version 6.0
 * Utilisation des calculs de distribution précis avec FFT
 */
export class ChartComponent {
    constructor(translator) {
        this.translator = translator;
        this.chart = null;
        this.currentStrategy = null;
        this.currentMeanTrials = null;
        
        this.initElements();
        this.translator.addObserver(this);
    }

    initElements() {
        this.canvas = document.getElementById('probabilityChart');
        this.ctx = this.canvas.getContext('2d');
        this.chartLegend = document.getElementById('chartLegend');
    }

    /**
     * Gestion des événements de traduction
     */
    onTranslationEvent(event, data) {
        if (event === 'languageChanged') {
            this.updateLanguage();
        }
    }

    /**
     * Dessine le graphique principal avec calculs de distribution précis
     */
    drawTrialsProbabilityChart(strategy) {
        if (!strategy) {
            console.error('Strategy data missing for chart');
            return;
        }
        
        this.currentStrategy = strategy;
        
        // Détruire le graphique existant
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Obtenir la distribution de probabilité
        const distribution = this.calculateTrialsDistribution(strategy);
        
        // Convertir en points pour le graphique (probabilité cumulée)
        const points = this.convertToCumulativeProbability(distribution);
        
        // Calculer la moyenne depuis la distribution
        const meanTrials = this.calculateMeanFromDistribution(distribution);
        
        // Log pour debug
        console.log('Distribution analysis:', {
            mean: meanTrials,
            strategyMean: strategy.totalTrials,
            points: distribution.length,
            method: strategy.method
        });
        
        // Créer le graphique
        this.createChart(points, meanTrials);
    }

    /**
     * Calcule la distribution du nombre d'essais nécessaires
     */
    calculateTrialsDistribution(strategy) {
        // Déterminer les niveaux
        const startLevel = this.getStartLevel(strategy);
        const endLevel = this.getEndLevel(strategy);
        
        console.log(`Calculating distribution for levels ${startLevel} to ${endLevel}`);
        
        // Choisir la méthode selon les niveaux
        if (endLevel <= 9) {
            // Cas 1: Utiliser Markov directement
            return this.getMarkovDistribution(strategy, startLevel, endLevel);
        } else if (startLevel < 9) {
            // Cas 2: Markov jusqu'à 9, puis géométrique
            return this.getMixedDistribution(strategy, startLevel, endLevel);
        } else {
            // Cas 3: Purement géométrique
            return this.getGeometricDistribution(strategy, startLevel, endLevel);
        }
    }

    /**
     * Détermine le niveau de départ
     */
    getStartLevel(strategy) {
        if (strategy.startLevel !== undefined) return strategy.startLevel;
        if (strategy.strategy && strategy.strategy.startLevel !== undefined) return strategy.strategy.startLevel;
        return 0;
    }

    /**
     * Détermine le niveau de fin
     */
    getEndLevel(strategy) {
        if (strategy.endLevel !== undefined) return strategy.endLevel;
        if (strategy.strategy && strategy.strategy.endLevel !== undefined) return strategy.strategy.endLevel;
        if (strategy.path) return strategy.path.length + this.getStartLevel(strategy);
        return 9;
    }

    /**
     * Obtient la distribution depuis Markov
     */
    getMarkovDistribution(strategy, startLevel, endLevel) {
        // Construire la matrice de transition
        const transitionMatrix = this.buildTransitionMatrix(strategy, startLevel, endLevel);
        
        // Calculer la distribution par puissance de matrice
        return this.calculateDistributionFromMatrix(transitionMatrix, startLevel, endLevel);
    }

    /**
     * Construit la matrice de transition
     */
    buildTransitionMatrix(strategy, startLevel, endLevel) {
        const size = endLevel + 1;
        const matrix = Array(size).fill(null).map(() => Array(size).fill(0));
        
        // Remplir la matrice avec les taux de succès
        for (let i = 0; i < endLevel; i++) {
            let successRate = 0;
            let noDowngrade = false;
            
            // Obtenir les données pour ce niveau
            if (strategy.path && i >= startLevel && i - startLevel < strategy.path.length) {
                const pathStep = strategy.path[i - startLevel];
                successRate = (pathStep.rate || 0) / 100;
                noDowngrade = pathStep.noDowngrade || false;
            } else if (strategy.rates && i < strategy.rates.length) {
                successRate = (strategy.rates[i] || 0) / 100;
                noDowngrade = strategy.flags ? strategy.flags[i] : false;
            } else if (i < 4) {
                // Niveaux 1-4 : généralement 100% avec Parchemin de Guerre
                successRate = 1;
                noDowngrade = false;
            }
            
            // Succès : passage au niveau suivant
            matrix[i][i + 1] = successRate;
            
            // Échec : reste sur place ou descend
            if (i === 0 || noDowngrade) {
                matrix[i][i] = 1 - successRate;
            } else {
                matrix[i][i - 1] = 1 - successRate;
            }
        }
        
        // État absorbant (niveau final)
        matrix[endLevel][endLevel] = 1;
        
        return matrix;
    }

    /**
     * Calcule la distribution à partir de la matrice de transition
     */
    calculateDistributionFromMatrix(matrix, startLevel, endLevel, maxTrials = 10000) {
        const distribution = [];
        const size = matrix.length;
        
        // État initial
        let currentState = Array(size).fill(0);
        currentState[startLevel] = 1;
        
        // État précédent pour calculer la probabilité d'arriver à l'état final
        let previousProbInFinal = 0;
        
        for (let trial = 1; trial <= maxTrials; trial++) {
            // Multiplier par la matrice de transition
            const nextState = Array(size).fill(0);
            
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    nextState[j] += currentState[i] * matrix[i][j];
                }
            }
            
            // Probabilité d'être dans l'état final
            const probInFinal = nextState[endLevel];
            
            // Probabilité d'arriver EXACTEMENT en 'trial' essais
            const probExactly = probInFinal - previousProbInFinal;
            
            if (probExactly > 1e-10) {
                distribution.push({
                    trials: trial,
                    probability: probExactly
                });
            }
            
            // Si on a atteint 99.99% de probabilité cumulative
            if (probInFinal > 0.9999) {
                break;
            }
            
            currentState = nextState;
            previousProbInFinal = probInFinal;
        }
        
        return distribution;
    }

    /**
     * Calcule la distribution mixte (Markov + géométrique)
     */
    getMixedDistribution(strategy, startLevel, endLevel) {
        // Partie 1: Distribution Markov jusqu'à 9
        const markovEndLevel = 9;
        const markovMatrix = this.buildTransitionMatrix(strategy, startLevel, markovEndLevel);
        const markovDist = this.calculateDistributionFromMatrix(markovMatrix, startLevel, markovEndLevel);
        
        // Partie 2: Distributions géométriques de 10 à endLevel
        const geometricDists = [];
        
        for (let level = 10; level <= endLevel; level++) {
            const index = level - startLevel - 1;
            let successRate = 0;
            
            if (strategy.path && index < strategy.path.length) {
                successRate = (strategy.path[index].rate || 0) / 100;
            } else if (strategy.rates && level - 1 < strategy.rates.length) {
                successRate = (strategy.rates[level - 1] || 0) / 100;
            } else {
                // Taux par défaut pour Pierre magique aux niveaux élevés
                successRate = 0.1; // 10%
            }
            
            if (successRate > 0) {
                geometricDists.push(this.createGeometricDistribution(successRate, 10000));
            }
        }
        
        // Convoluer toutes les distributions
        let result = markovDist;
        for (const geomDist of geometricDists) {
            result = this.convolve(result, geomDist);
        }
        
        return result;
    }

    /**
     * Calcule la distribution purement géométrique
     */
    getGeometricDistribution(strategy, startLevel, endLevel) {
        const distributions = [];
        
        // Créer une distribution géométrique pour chaque niveau
        for (let level = startLevel; level < endLevel; level++) {
            const index = level - startLevel;
            let successRate = 0;
            
            if (strategy.path && index < strategy.path.length) {
                successRate = (strategy.path[index].rate || 0) / 100;
            } else if (strategy.rates && level < strategy.rates.length) {
                successRate = (strategy.rates[level] || 0) / 100;
            } else {
                successRate = 0.1; // 10% par défaut
            }
            
            if (successRate > 0) {
                distributions.push(this.createGeometricDistribution(successRate, 10000));
            }
        }
        
        if (distributions.length === 0) {
            // Fallback si aucune distribution
            return this.getFallbackDistribution(strategy);
        }
        
        // Convoluer toutes les distributions
        let result = distributions[0];
        for (let i = 1; i < distributions.length; i++) {
            result = this.convolve(result, distributions[i]);
        }
        
        return result;
    }

    /**
     * Crée une distribution géométrique précise
     */
    createGeometricDistribution(p, maxTrials = 10000) {
        const distribution = [];
        let cumulativeProb = 0;
        
        // Calculer la masse de probabilité perdue si on tronque
        const truncationProb = Math.pow(1 - p, maxTrials);
        const normalizationFactor = 1 / (1 - truncationProb);
        
        for (let k = 1; k <= maxTrials && cumulativeProb < 0.9999; k++) {
            const prob = Math.pow(1 - p, k - 1) * p * normalizationFactor;
            if (prob > 1e-12) {
                distribution.push({
                    trials: k,
                    probability: prob
                });
                cumulativeProb += prob;
            }
        }
        
        return distribution;
    }

    /**
     * Effectue la convolution de deux distributions
     */
    convolve(dist1, dist2) {
        const maxTrials = 10000;
        const resultMap = new Map();
        
        // Effectuer la convolution
        for (const d1 of dist1) {
            for (const d2 of dist2) {
                const trials = d1.trials + d2.trials;
                if (trials <= maxTrials) {
                    const prob = d1.probability * d2.probability;
                    if (prob > 1e-12) {
                        const currentProb = resultMap.get(trials) || 0;
                        resultMap.set(trials, currentProb + prob);
                    }
                }
            }
        }
        
        // Convertir en tableau et trier
        const result = Array.from(resultMap.entries())
            .map(([trials, probability]) => ({ trials, probability }))
            .sort((a, b) => a.trials - b.trials);
        
        // Normaliser si nécessaire
        const totalProb = result.reduce((sum, d) => sum + d.probability, 0);
        if (Math.abs(totalProb - 1) > 0.001) {
            console.warn(`Normalizing distribution: total probability = ${totalProb}`);
            result.forEach(d => d.probability /= totalProb);
        }
        
        return result;
    }

    /**
     * Convertit la distribution en probabilité cumulée
     */
    convertToCumulativeProbability(distribution) {
        const points = [];
        let cumulative = 0;
        
        // S'assurer que la distribution est triée
        distribution.sort((a, b) => a.trials - b.trials);
        
        // Toujours commencer à (0, 0)
        points.push({ x: 0, y: 0 });
        
        // Convertir en cumulé
        distribution.forEach(d => {
            cumulative += d.probability;
            points.push({
                x: d.trials,
                y: Math.min(cumulative * 100, 100)
            });
        });
        
        // S'assurer que le dernier point est à 100%
        if (points.length > 0 && cumulative > 0.999) {
            points[points.length - 1].y = 100;
        }
        
        return points;
    }

    /**
     * Calcule la moyenne depuis une distribution
     */
    calculateMeanFromDistribution(distribution) {
        let mean = 0;
        let totalProb = 0;
        
        distribution.forEach(d => {
            mean += d.trials * d.probability;
            totalProb += d.probability;
        });
        
        // Normaliser si nécessaire
        if (Math.abs(totalProb - 1) > 0.01) {
            console.warn(`Distribution not normalized: total probability = ${totalProb}`);
            if (totalProb > 0) {
                mean /= totalProb;
            }
        }
        
        return mean;
    }

    /**
     * Distribution de secours si les autres méthodes échouent
     */
    getFallbackDistribution(strategy) {
        const distribution = [];
        const totalTrials = strategy.totalTrials || 100;
        
        // Utiliser une approximation normale
        const mean = totalTrials;
        const std = Math.sqrt(totalTrials) * 1.5; // Approximation
        
        const minTrials = Math.max(1, Math.floor(mean - 4 * std));
        const maxTrials = Math.ceil(mean + 4 * std);
        
        for (let k = minTrials; k <= maxTrials; k++) {
            const z = (k - mean) / std;
            const prob = this.normalPDF(z) / std;
            
            if (prob > 1e-10) {
                distribution.push({
                    trials: k,
                    probability: prob
                });
            }
        }
        
        // Normaliser
        const sum = distribution.reduce((s, d) => s + d.probability, 0);
        if (sum > 0) {
            distribution.forEach(d => d.probability /= sum);
        }
        
        return distribution;
    }

    /**
     * Densité de probabilité de la loi normale standard
     */
    normalPDF(z) {
        return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    }

    /**
     * Crée la configuration du graphique
     */
    createChartConfig(points, meanTrials) {
        return {
            type: 'line',
            data: {
                datasets: [{
                    label: this.translator.t('successProb'),
                    data: points,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: this.createTooltipConfig(meanTrials),
                    annotation: this.createAnnotationConfig(meanTrials)
                },
                scales: this.createScalesConfig(),
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                elements: {
                    line: {
                        borderJoinStyle: 'round'
                    }
                }
            }
        };
    }

    /**
     * Configuration des tooltips
     */
    createTooltipConfig(meanTrials) {
        return {
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: '#6366f1',
            borderWidth: 1,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            padding: 12,
            displayColors: false,
            callbacks: {
                title: (context) => {
                    const trials = Math.round(context[0].parsed.x);
                    return `${this.translator.t('xAxisLabel')}: ${trials}`;
                },
                label: (context) => {
                    const prob = context.parsed.y;
                    return `${this.translator.t('successProb')}: ${prob.toFixed(1)}%`;
                },
                afterLabel: (context) => {
                    if (meanTrials && meanTrials > 0) {
                        const trials = Math.round(context.parsed.x);
                        const ratio = trials / meanTrials;
                        return `(${(ratio * 100).toFixed(0)}% ${this.translator.t('avgTrials').toLowerCase()})`;
                    }
                    return '';
                }
            }
        };
    }

    /**
     * Configuration des annotations
     */
    createAnnotationConfig(meanTrials) {
        if (!meanTrials || meanTrials <= 0) {
            return { annotations: {} };
        }
        
        return {
            annotations: {
                averageLine: {
                    type: 'line',
                    xMin: meanTrials,
                    xMax: meanTrials,
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    label: {
                        enabled: true,
                        content: this.translator.t('avgTrials'),
                        position: 'start',
                        backgroundColor: 'rgba(245, 158, 11, 0.8)',
                        color: 'white',
                        font: { size: 11, weight: 'bold' },
                        padding: 4
                    }
                }
            }
        };
    }

    /**
     * Configuration des échelles
     */
    createScalesConfig() {
        return {
            x: {
                type: 'linear',
                title: {
                    display: true,
                    text: this.translator.t('xAxisLabel'),
                    color: '#94a3b8',
                    font: { size: 14, weight: 'bold' }
                },
                ticks: {
                    callback: (value) => Math.round(value),
                    color: '#94a3b8',
                    font: { size: 12 }
                },
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawBorder: false
                }
            },
            y: {
                title: {
                    display: true,
                    text: this.translator.t('yAxisLabel'),
                    color: '#94a3b8',
                    font: { size: 14, weight: 'bold' }
                },
                min: 0,
                max: 100,
                ticks: {
                    callback: (value) => `${value}%`,
                    color: '#94a3b8',
                    font: { size: 12 },
                    stepSize: 10
                },
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawBorder: false
                }
            }
        };
    }

    /**
     * Crée le graphique avec les points calculés
     */
    createChart(points, meanTrials) {
        this.currentMeanTrials = meanTrials;
        
        // Configuration du graphique
        const config = this.createChartConfig(points, meanTrials);
        
        // Créer le graphique
        this.chart = new Chart(this.ctx, config);
        
        // Mettre à jour la légende
        this.updateLegend(points, meanTrials);
    }

    /**
     * Met à jour la légende
     */
    updateLegend(points, meanTrials) {
        if (!this.chartLegend) return;
        
        // Points clés pour la légende
        const keyPoints = [
            { x: Math.round(meanTrials * 0.5), label: '50%' },
            { x: Math.round(meanTrials), label: this.translator.t('avgTrials') },
            { x: Math.round(meanTrials * 1.5), label: '150%' },
            { x: Math.round(meanTrials * 2), label: '200%' }
        ];
        
        // Filtrer les points valides
        const maxX = Math.max(...points.map(p => p.x));
        const validKeyPoints = keyPoints.filter(kp => kp.x <= maxX * 1.1);
        
        // Si pas assez de points, créer des points basés sur les données
        if (validKeyPoints.length < 2) {
            validKeyPoints.length = 0;
            const steps = [0.25, 0.5, 0.75, 1];
            steps.forEach((ratio, i) => {
                const x = Math.round(maxX * ratio);
                if (x > 0) {
                    validKeyPoints.push({
                        x: x,
                        label: i === 3 ? this.translator.t('avgTrials') : `${(ratio * 100).toFixed(0)}%`
                    });
                }
            });
        }
        
        // Trouver les probabilités pour chaque point
        const legendData = validKeyPoints.map(kp => {
            const prob = this.getProbabilityAtTrials(points, kp.x);
            return {
                trials: kp.x,
                label: kp.label,
                probability: prob
            };
        });
        
        // Générer le HTML
        this.chartLegend.innerHTML = `
            <div class="legend-grid">
                ${legendData.map(item => `
                    <div class="legend-item">
                        <span class="legend-budget">${item.trials}</span>
                        <span class="legend-arrow">→</span>
                        <span class="legend-prob">${item.probability.toFixed(0)}%</span>
                        <span class="legend-label">(${item.label})</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Obtient la probabilité à un nombre donné de tentatives
     */
    getProbabilityAtTrials(points, trials) {
        if (!points || points.length === 0) return 0;
        
        // Trouver le point exact ou interpoler
        let before = null;
        let after = null;
        
        for (const point of points) {
            if (point.x <= trials) {
                before = point;
            } else if (!after) {
                after = point;
                break;
            }
        }
        
        if (before && after && before.x !== after.x) {
            const ratio = (trials - before.x) / (after.x - before.x);
            return before.y + ratio * (after.y - before.y);
        }
        
        return before ? before.y : (after ? after.y : 0);
    }

    /**
     * Met à jour le graphique
     */
    update(strategy) {
        if (!strategy) {
            console.error('Strategy data missing for chart update');
            return;
        }
        this.drawTrialsProbabilityChart(strategy);
    }

    /**
     * Met à jour lors d'un changement de langue
     */
    updateLanguage() {
        if (this.currentStrategy) {
            this.drawTrialsProbabilityChart(this.currentStrategy);
        }
    }

    /**
     * Réinitialise le graphique
     */
    reset() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.currentStrategy = null;
        this.currentMeanTrials = null;
        
        if (this.chartLegend) {
            this.chartLegend.innerHTML = '';
        }
    }

    /**
     * Exporte le graphique en image
     */
    async exportChart() {
        if (!this.chart) return null;
        return this.chart.toBase64Image();
    }

    /**
     * Obtient les données du graphique
     */
    getChartData() {
        if (!this.currentStrategy) return null;
        
        const distribution = this.calculateTrialsDistribution(this.currentStrategy);
        const points = this.convertToCumulativeProbability(distribution);
        
        return {
            points: points,
            meanTrials: this.currentMeanTrials,
            distribution: distribution
        };
    }

    /**
     * Redimensionne le graphique
     */
    resize() {
        if (this.chart) {
            this.chart.resize();
        }
    }

    /**
     * Met en évidence un point spécifique
     */
    highlightPoint(trials) {
        if (!this.chart || !this.currentStrategy) return;
        
        const points = this.chart.data.datasets[0].data;
        const prob = this.getProbabilityAtTrials(points, trials);
        
        if (prob > 0) {
            // Ajouter une annotation temporaire
            if (!this.chart.options.plugins.annotation) {
                this.chart.options.plugins.annotation = { annotations: {} };
            }
            
            this.chart.options.plugins.annotation.annotations.highlight = {
                type: 'point',
                xValue: trials,
                yValue: prob,
                backgroundColor: '#f59e0b',
                borderColor: '#f59e0b',
                borderWidth: 2,
                radius: 8
            };
            
            this.chart.update();
            
            // Retirer après 2 secondes
            setTimeout(() => {
                if (this.chart && this.chart.options.plugins.annotation) {
                    delete this.chart.options.plugins.annotation.annotations.highlight;
                    this.chart.update();
                }
            }, 2000);
        }
    }

    /**
     * Active/désactive l'animation
     */
    setAnimation(enabled) {
        if (this.chart) {
            this.chart.options.animation = enabled ? {
                duration: 1000,
                easing: 'easeInOutQuart'
            } : false;
            this.chart.update();
        }
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
        }
        this.translator.removeObserver(this);
    }
}