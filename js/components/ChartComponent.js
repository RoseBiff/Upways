/**
 * Composant de gestion des graphiques - Version 5.1
 * Amélioration de la précision des calculs pour correspondre à la simulation
 */
export class ChartComponent {
    constructor(translator) {
        this.translator = translator;
        this.chart = null;
        this.currentStrategy = null;
        this.currentMeanTrials = null;
        
        this.initElements();
        
        // S'abonner aux changements de langue
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
     * Dessine le graphique Tentatives vs Probabilité de succès
     */
    drawTrialsProbabilityChart(strategy) {
        if (!strategy) {
            console.error('Strategy data missing for chart');
            return;
        }
        
        this.currentStrategy = strategy;
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Obtenir la distribution de probabilité
        const distribution = this.calculateTrialsDistribution(strategy);
        
        // Convertir en points pour le graphique (probabilité cumulée)
        const points = this.convertToCumulativeProbability(distribution);
        
        // Calculer la moyenne
        const meanTrials = this.calculateMeanFromDistribution(distribution);
        
        // Log pour debug
        console.log('Distribution théorique - Moyenne:', meanTrials);
        console.log('Distribution théorique - Nombre de points:', distribution.length);
        
        this.createChart(points, meanTrials);
    }

    /**
     * Calcule la distribution du nombre d'essais nécessaires
     */
    calculateTrialsDistribution(strategy) {
        const startLevel = strategy.startLevel || 0;
        const endLevel = strategy.endLevel || (strategy.path.length + startLevel);
        
        console.log(`Calculating distribution for levels ${startLevel} to ${endLevel}`);
        
        if (endLevel <= 9) {
            // Cas 1: Utiliser Markov directement
            return this.getMarkovDistribution(strategy);
        } else if (startLevel < 9) {
            // Cas 2: Markov jusqu'à 9, puis géométrique
            return this.getMixedDistribution(strategy, startLevel, endLevel);
        } else {
            // Cas 3: Purement géométrique
            return this.getGeometricDistribution(strategy, startLevel, endLevel);
        }
    }

    /**
     * Obtient la distribution depuis Markov (version améliorée)
     */
    getMarkovDistribution(strategy) {
        if (!strategy.markov || !strategy.markov.calculateTrialsProbabilities) {
            console.error('Markov data missing');
            return this.getFallbackDistribution(strategy);
        }
        
        // Utiliser directement les waypoints de Markov pour calculer la distribution
        const startLevel = strategy.startLevel || 0;
        const endLevel = Math.min(strategy.endLevel || 9, 9);
        
        // Créer une matrice de transition complète
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
            
            if (i >= startLevel && i - startLevel < strategy.path.length) {
                const pathStep = strategy.path[i - startLevel];
                successRate = pathStep.rate / 100;
                noDowngrade = pathStep.noDowngrade;
            } else if (i < 4) {
                // Niveaux 1-4 : 100% avec Parchemin de Guerre
                successRate = 1;
                noDowngrade = false;
            }
            
            // Succès
            matrix[i][i + 1] = successRate;
            
            // Échec
            if (i === 0 || noDowngrade) {
                matrix[i][i] = 1 - successRate;
            } else {
                matrix[i][i - 1] = 1 - successRate;
            }
        }
        
        // État absorbant
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
            const pathIndex = level - startLevel - 1;
            if (pathIndex < strategy.path.length) {
                const step = strategy.path[pathIndex];
                const p = step.rate / 100;
                geometricDists.push(this.createGeometricDistribution(p, 10000));
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
        for (let i = 0; i < strategy.path.length; i++) {
            const step = strategy.path[i];
            const p = step.rate / 100;
            distributions.push(this.createGeometricDistribution(p, 10000));
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
     * Effectue la convolution de deux distributions (version optimisée)
     */
    convolve(dist1, dist2) {
        const maxTrials = 10000;
        
        // Utiliser des Map pour une meilleure performance
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
     * Convertit la distribution en probabilité cumulée pour le graphique
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
        
        // Vérifier que la distribution est normalisée
        if (Math.abs(totalProb - 1) > 0.01) {
            console.warn(`Distribution not normalized: total probability = ${totalProb}`);
            if (totalProb > 0) {
                mean /= totalProb;
            }
        }
        
        return mean;
    }

    /**
     * Distribution de secours si Markov échoue
     */
    getFallbackDistribution(strategy) {
        const distribution = [];
        let totalProb = 0;
        
        // Approximation normale basée sur les taux de succès
        const rates = strategy.path.map(p => p.rate / 100);
        const meanTrials = rates.reduce((sum, r) => sum + 1/r, 0);
        const variance = rates.reduce((sum, r) => sum + (1-r)/(r*r), 0);
        const std = Math.sqrt(variance);
        
        // Générer la distribution
        const minTrials = strategy.path.length;
        const maxTrials = Math.ceil(meanTrials + 4 * std);
        
        for (let k = minTrials; k <= maxTrials && totalProb < 0.999; k++) {
            const z = (k - meanTrials) / std;
            const prob = this.normalPDF(z) / std;
            
            if (prob > 1e-10) {
                distribution.push({
                    trials: k,
                    probability: prob
                });
                totalProb += prob;
            }
        }
        
        // Normaliser
        const sum = distribution.reduce((s, d) => s + d.probability, 0);
        distribution.forEach(d => d.probability /= sum);
        
        return distribution;
    }

    /**
     * Densité de probabilité de la loi normale standard
     */
    normalPDF(z) {
        return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    }

    /**
     * Crée le graphique avec les points calculés
     */
    createChart(points, meanTrials) {
        this.currentMeanTrials = meanTrials;
        
        // Points clés pour annotations
        const keyPoints = [
            { x: Math.round(meanTrials * 0.5), label: '50%' },
            { x: Math.round(meanTrials), label: this.translator.t('avgTrials') },
            { x: Math.round(meanTrials * 1.5), label: '150%' },
            { x: Math.round(meanTrials * 2), label: '200%' }
        ];
        
        // Configuration du graphique
        const config = {
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
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#6366f1',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                plugins: {
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderColor: '#6366f1',
                        borderWidth: 1,
                        cornerRadius: 6,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (tooltipItems) => {
                                if (tooltipItems.length > 0) {
                                    const trials = Math.round(tooltipItems[0].parsed.x);
                                    return this.translator.t('xAxisLabel') + ': ' + trials;
                                }
                                return '';
                            },
                            label: (context) => {
                                const prob = context.parsed.y;
                                return this.translator.t('successProb') + ': ' + prob.toFixed(1) + '%';
                            },
                            afterLabel: (context) => {
                                const trials = Math.round(context.parsed.x);
                                const ratio = trials / meanTrials;
                                const percent = (ratio * 100).toFixed(0);
                                
                                let result = '(' + percent + '% ' + this.translator.t('avgTrials').toLowerCase() + ')';
                                
                                if (this.currentStrategy && this.currentStrategy.totalCost) {
                                    const estimatedCost = (this.currentStrategy.totalCost * ratio).toFixed(1);
                                    result += '\n' + (this.translator.t('estimatedCost') || 'Coût estimé') + ': ' + estimatedCost + 'M';
                                }
                                
                                return result;
                            }
                        }
                    },
                    annotation: {
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
                                    font: {
                                        size: 11,
                                        weight: 'bold'
                                    },
                                    padding: 4
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: this.translator.t('xAxisLabel'),
                            color: '#94a3b8',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: (value) => Math.round(value),
                            color: '#94a3b8',
                            font: {
                                size: 12
                            }
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
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%',
                            color: '#94a3b8',
                            font: {
                                size: 12
                            },
                            stepSize: 10
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)',
                            drawBorder: false
                        }
                    }
                }
            }
        };
        
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        this.chart = new Chart(this.ctx, config);
        this.updateLegend(keyPoints, points);
    }

    /**
     * Met à jour la légende du graphique
     */
    updateLegend(keyPoints, points) {
        if (!this.chartLegend) return;
        
        const legendData = keyPoints.map(kp => {
            const point = points.find(p => Math.round(p.x) === kp.x);
            const prob = point ? point.y : this.interpolateProbability(points, kp.x);
            return {
                trials: kp.x,
                label: kp.label,
                probability: prob
            };
        });
        
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
     * Interpole la probabilité pour un nombre de tentatives donné
     */
    interpolateProbability(points, trials) {
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
     * Ajoute une courbe empirique au graphique existant
     */
    addEmpiricalCurve(empiricalData, label = 'Simulation') {
        if (!this.chart || !empiricalData) return;
        
        this.chart.data.datasets.push({
            label: label,
            data: empiricalData,
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.4
        });
        
        this.chart.options.plugins.tooltip.callbacks.label = (context) => {
            if (context.datasetIndex === 0) {
                const prob = context.parsed.y;
                const trials = Math.round(context.parsed.x);
                
                let result = [this.translator.t('successProb') + ' (Théorie): ' + prob.toFixed(1) + '%'];
                
                if (this.chart.data.datasets.length > 1) {
                    const empiricalData = this.chart.data.datasets[1].data;
                    
                    let closestPoint = null;
                    let minDistance = Infinity;
                    
                    empiricalData.forEach(point => {
                        const distance = Math.abs(point.x - trials);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestPoint = point;
                        }
                    });
                    
                    if (closestPoint && minDistance < 5) {
                        result.push(this.translator.t('successProb') + ' (Simulation): ' + closestPoint.y.toFixed(1) + '%');
                        const diff = prob - closestPoint.y;
                        result.push('Écart: ' + (diff > 0 ? '+' : '') + diff.toFixed(1) + '%');
                    }
                }
                
                return result;
            }
            return null;
        };
        
        this.toggleLegend(true);
        this.chart.update();
    }

    /**
     * Retire la courbe empirique
     */
    removeEmpiricalCurve() {
        if (!this.chart) return;
        
        this.chart.data.datasets = this.chart.data.datasets.slice(0, 1);
        this.chart.update();
    }

    /**
     * Active/désactive l'affichage de la légende
     */
    toggleLegend(show = true) {
        if (!this.chart) return;
        
        this.chart.options.plugins.legend.display = show;
        this.chart.update();
    }

    /**
     * Autres méthodes utilitaires
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.translator.removeObserver(this);
    }

    update(strategy) {
        if (!strategy) {
            console.error('Strategy data missing for chart update');
            return;
        }
        this.drawTrialsProbabilityChart(strategy);
    }

    updateLanguage() {
        if (this.currentStrategy) {
            this.drawTrialsProbabilityChart(this.currentStrategy);
        }
    }

    async exportChart() {
        if (!this.chart) return null;
        return this.chart.toBase64Image();
    }

    getChartData() {
        if (!this.chart) return null;
        
        return {
            chart: this.chart,
            strategy: this.currentStrategy
        };
    }

    resize() {
        if (this.chart) {
            this.chart.resize();
        }
    }

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

    highlightPoint(trials) {
        if (!this.chart || !this.currentStrategy) return;
        
        const point = this.chart.data.datasets[0].data.find(p => Math.round(p.x) === trials);
        
        if (point) {
            this.chart.options.plugins.annotation.annotations.highlight = {
                type: 'point',
                xValue: point.x,
                yValue: point.y,
                backgroundColor: '#f59e0b',
                borderColor: '#f59e0b',
                borderWidth: 2,
                radius: 8
            };
            
            this.chart.update();
            
            setTimeout(() => {
                delete this.chart.options.plugins.annotation.annotations.highlight;
                this.chart.update();
            }, 2000);
        }
    }

    setAnimation(enabled) {
        if (this.chart) {
            this.chart.options.animation = enabled ? {
                duration: 1000,
                easing: 'easeInOutQuart'
            } : false;
            this.chart.update();
        }
    }
}