/**
 * Composant de gestion des graphiques - Version 3.0
 * Support des traductions en temps réel
 */
export class ChartComponent {
    constructor(translator) {
        this.translator = translator;
        this.chart = null;
        this.currentStrategy = null;
        
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
        // Vérifier que la stratégie contient les données nécessaires
        if (!strategy || !strategy.markov) {
            console.error('Strategy data missing for chart');
            return;
        }
        
        // Sauvegarder la stratégie actuelle
        this.currentStrategy = strategy;
        
        // Détruire le graphique existant
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Générer les points pour la courbe
        const points = strategy.markov.calculateTrialsProbabilities();
        const meanTrials = strategy.markov.totalTrials;
        
        // Points clés pour annotations
        const keyPoints = [
            { x: Math.round(meanTrials * 0.5), label: '50%' },
            { x: Math.round(meanTrials), label: this.translator.t('avgTrials') },
            { x: Math.round(meanTrials * 1.5), label: '150%' },
            { x: Math.round(meanTrials * 2), label: '200%' }
        ];
        
        // Configuration du graphique avec traductions
        const config = this.createChartConfig(points, meanTrials);
        
        // Créer le graphique
        this.chart = new Chart(this.ctx, config);
        
        // Mettre à jour la légende
        this.updateLegend(strategy, keyPoints);
    }

    /**
     * Crée la configuration du graphique avec traductions
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
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderColor: '#6366f1',
                        borderWidth: 1,
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
                            title: (context) => {
                                const trials = Math.round(context[0].parsed.x);
                                return `${this.translator.t('xAxisLabel')}: ${trials}`;
                            },
                            label: (context) => {
                                const prob = context.parsed.y;
                                return `${this.translator.t('successProb')}: ${prob.toFixed(1)}%`;
                            },
                            afterLabel: (context) => {
                                const trials = Math.round(context.parsed.x);
                                const ratio = trials / meanTrials;
                                return `(${(ratio * 100).toFixed(0)}% ${this.translator.t('avgTrials').toLowerCase()})`;
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
                            callback: (value) => `${value}%`,
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
                },
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
     * Met à jour la légende du graphique
     */
    updateLegend(strategy, keyPoints) {
        if (!this.chartLegend) return;
        
        const points = strategy.markov.calculateTrialsProbabilities();
        
        // Trouver les probabilités pour les points clés
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
        // Trouver les deux points les plus proches
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
        
        // Si on a trouvé les deux points, interpoler
        if (before && after && before.x !== after.x) {
            const ratio = (trials - before.x) / (after.x - before.x);
            return before.y + ratio * (after.y - before.y);
        }
        
        // Sinon, retourner le plus proche
        return before ? before.y : (after ? after.y : 0);
    }

    /**
     * Détruit le graphique
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        // Se désabonner des changements de langue
        this.translator.removeObserver(this);
    }

    /**
     * Met à jour le graphique avec de nouvelles données
     */
    update(strategy) {
        if (!strategy || !strategy.markov) {
            console.error('Strategy data missing for chart update');
            return;
        }
        this.drawTrialsProbabilityChart(strategy);
    }

    /**
     * Met à jour l'affichage lors d'un changement de langue
     */
    updateLanguage() {
        // Si on a une stratégie actuelle, redessiner le graphique avec les nouvelles traductions
        if (this.currentStrategy) {
            this.drawTrialsProbabilityChart(this.currentStrategy);
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
        if (!this.currentStrategy || !this.currentStrategy.markov) return null;
        
        return {
            points: this.currentStrategy.markov.calculateTrialsProbabilities(),
            meanTrials: this.currentStrategy.markov.totalTrials
        };
    }

    /**
     * Met à jour la taille du graphique
     */
    resize() {
        if (this.chart) {
            this.chart.resize();
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
        
        // Effacer la légende
        if (this.chartLegend) {
            this.chartLegend.innerHTML = '';
        }
    }

    /**
     * Met en évidence un point spécifique sur le graphique
     */
    highlightPoint(trials) {
        if (!this.chart || !this.currentStrategy) return;
        
        const points = this.currentStrategy.markov.calculateTrialsProbabilities();
        const point = points.find(p => Math.round(p.x) === trials);
        
        if (point) {
            // Ajouter une annotation temporaire
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
            
            // Retirer après 2 secondes
            setTimeout(() => {
                delete this.chart.options.plugins.annotation.annotations.highlight;
                this.chart.update();
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
}