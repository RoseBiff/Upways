/**
 * Composant de gestion des graphiques
 */
export class ChartComponent {
    constructor(translator) {
        this.translator = translator;
        this.chart = null;
        
        this.initElements();
    }

    initElements() {
        this.canvas = document.getElementById('probabilityChart');
        this.ctx = this.canvas.getContext('2d');
        this.chartLegend = document.getElementById('chartLegend');
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
        
        // Créer le graphique
        this.chart = new Chart(this.ctx, {
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
        });
        
        // Mettre à jour la légende avec des points clés
        this.updateLegend(strategy, keyPoints);
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
     * Exporte le graphique en image
     */
    async exportChart() {
        if (!this.chart) return null;
        
        return this.chart.toBase64Image();
    }
}