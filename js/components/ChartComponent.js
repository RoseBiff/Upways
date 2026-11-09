/**
 * Composant de gestion des graphiques - Version 8.2
 * Ajout du zoom interactif et amélioration de l'interactivité
 */
import { formatCompactNumber, formatNumber } from '../utils/formatters.js';

export class ChartComponent {
    constructor(translator) {
        this.translator = translator;
        this.chart = null;
        this.currentStrategy = null;
        this.currentMeanTrials = null;
        this.currentMedianTrials = null;
        this.showCumulative = true; // Toggle pour le type de courbe
        
        this.initElements();
        this.translator.addObserver(this);
    }

    initElements() {
        this.canvas = document.getElementById('probabilityChart');
        this.ctx = this.canvas.getContext('2d');
        this.chartLegend = document.getElementById('chartLegend');
        this.chartControls = document.querySelector('.chart-controls');
        
        // Créer les boutons après avoir trouvé les éléments
        this.createControls();
    }

    attachEvents() {
        // Cette méthode peut être utilisée pour d'autres événements si nécessaire
    }

    createControls() {
        // Attendre que le DOM soit prêt si nécessaire
        if (!this.chartControls) {
            setTimeout(() => this.createControls(), 100);
            return;
        }

        // Créer le bouton de toggle si nécessaire
        if (!document.getElementById('toggleCurveType')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'toggleCurveType';
            toggleBtn.className = 'btn btn-secondary';
            toggleBtn.innerHTML = `<span class="btn-icon">📊</span> ${this.translator.t('distributionView')}`;
            toggleBtn.addEventListener('click', () => this.toggleCurveType());
            this.chartControls.appendChild(toggleBtn);
        }

        // Créer les boutons de zoom si nécessaires
        if (!document.getElementById('zoomControls')) {
            const zoomContainer = document.createElement('div');
            zoomContainer.id = 'zoomControls';
            zoomContainer.className = 'zoom-controls';
            zoomContainer.innerHTML = `
                <button id="zoomInBtn" class="btn btn-secondary btn-zoom" title="${this.translator.t('zoomIn') || 'Zoom In'}">
                    <span class="btn-icon">🔍+</span>
                </button>
                <button id="zoomOutBtn" class="btn btn-secondary btn-zoom" title="${this.translator.t('zoomOut') || 'Zoom Out'}">
                    <span class="btn-icon">🔍-</span>
                </button>
                <button id="resetZoomBtn" class="btn btn-secondary btn-zoom" title="${this.translator.t('resetZoom') || 'Reset Zoom'}">
                    <span class="btn-icon">🔄</span>
                </button>
            `;
            
            // Ajouter les événements aux boutons de zoom
            zoomContainer.querySelector('#zoomInBtn').addEventListener('click', () => this.zoomIn());
            zoomContainer.querySelector('#zoomOutBtn').addEventListener('click', () => this.zoomOut());
            zoomContainer.querySelector('#resetZoomBtn').addEventListener('click', () => this.resetZoom());
            
            this.chartControls.appendChild(zoomContainer);
        }

        // Créer le bouton d'export si nécessaire
        if (!document.getElementById('exportChartBtn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'exportChartBtn';
            exportBtn.className = 'btn btn-secondary';
            exportBtn.innerHTML = `<span class="btn-icon">💾</span> ${this.translator.t('exportChart') || 'Export'}`;
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Export button clicked');
                this.showExportMenu();
            });
            this.chartControls.appendChild(exportBtn);
            console.log('Export button created and added');
        }
    }

    /**
     * Zoom avant
     */
    zoomIn() {
        if (!this.chart) return;
        this.chart.zoom({x: 1.1}); 
    }

    /**
     * Zoom arrière
     */
    zoomOut() {
        if (!this.chart) return;
        this.chart.zoom({x: 0.9});
    }

    /**
     * Réinitialise le zoom
     */
    resetZoom() {
        if (!this.chart) return;
        this.chart.resetZoom();
    }

    /**
     * Affiche le menu d'export
     */
    showExportMenu() {
        console.log('showExportMenu called');
        
        // Créer un menu dropdown pour les options d'export
        const existingMenu = document.getElementById('chartExportMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.id = 'chartExportMenu';
        menu.className = 'export-menu';
        menu.innerHTML = `
            <div class="export-menu-item" data-export="image">
                <span class="export-icon">🖼️</span>
                <span>${this.translator.t('exportAsImage') || 'Export as Image'}</span>
            </div>
            <div class="export-menu-item" data-export="json">
                <span class="export-icon">📄</span>
                <span>${this.translator.t('exportAsJSON') || 'Export as JSON'}</span>
            </div>
        `;

        // Positionner le menu
        const exportBtn = document.getElementById('exportChartBtn');
        if (!exportBtn) {
            console.error('Export button not found');
            return;
        }
        
        const rect = exportBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 8}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.minWidth = `${rect.width}px`;

        document.body.appendChild(menu);
        console.log('Export menu added to DOM');

        // Gérer les clics sur les options
        menu.addEventListener('click', (e) => {
            console.log('Menu clicked', e.target);
            const item = e.target.closest('.export-menu-item');
            if (item) {
                const type = item.dataset.export;
                console.log('Export type:', type);
                if (type === 'image') {
                    this.exportAsImage();
                } else if (type === 'json') {
                    this.exportAsJSON();
                }
                menu.remove();
            }
        });

        // Fermer le menu en cliquant ailleurs
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target.id !== 'exportChartBtn') {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }

    /**
     * Exporte le graphique en image
     */
    async exportAsImage() {
        if (!this.chart) return;

        try {
            const imageData = await this.exportChart();
            const link = document.createElement('a');
            link.download = `metin2-upgrade-chart-${Date.now()}.png`;
            link.href = imageData;
            link.click();

            // Notification de succès
            this.showToast(this.translator.t('chartExportedAsImage') || 'Chart exported as image', 'success');
        } catch (error) {
            console.error('Error exporting chart as image:', error);
            this.showToast(this.translator.t('chartExportError') || 'Error exporting chart', 'error');
        }
    }

    /**
     * Exporte les données du graphique en JSON
     */
    exportAsJSON() {
        if (!this.currentStrategy) return;

        try {
            const data = this.getChartData();
            const exportData = {
                timestamp: new Date().toISOString(),
                item: this.currentStrategy.itemName || 'Unknown',
                levels: {
                    start: this.currentStrategy.startLevel,
                    end: this.currentStrategy.endLevel
                },
                statistics: {
                    mean: this.currentMeanTrials,
                    median: this.currentMedianTrials,
                    percentiles: this.currentStrategy.intervals?.total?.percentiles || null,
                    standardDeviation: this.currentStrategy.intervals?.total?.std || null
                },
                chartType: data.type,
                dataPoints: data.points
            };

            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.download = `metin2-upgrade-data-${Date.now()}.json`;
            link.href = url;
            link.click();
            
            URL.revokeObjectURL(url);

            // Notification de succès
            this.showToast(this.translator.t('dataExportedAsJSON') || 'Data exported as JSON', 'success');
        } catch (error) {
            console.error('Error exporting data as JSON:', error);
            this.showToast(this.translator.t('dataExportError') || 'Error exporting data', 'error');
        }
    }

    /**
     * Affiche une notification toast
     */
    showToast(message, type = 'info') {
        console.log(`Toast: [${type}] ${message}`);
        
        // Créer notre propre toast si le système global n'existe pas
        const toastContainer = document.getElementById('toastContainer') || document.body;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;
        
        toastContainer.appendChild(toast);
        
        // Retirer après 3 secondes
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Bascule entre courbe cumulée et non cumulée
     */
    toggleCurveType() {
        this.showCumulative = !this.showCumulative;
        const toggleBtn = document.getElementById('toggleCurveType');
        if (toggleBtn) {
            toggleBtn.innerHTML = this.showCumulative ? 
                `<span class="btn-icon">📊</span> ${this.translator.t('distributionView')}` :
                `<span class="btn-icon">📈</span> ${this.translator.t('cumulativeView')}`;
        }
        
        if (this.currentStrategy) {
            this.drawTrialsProbabilityChart(this.currentStrategy);
        }
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
     * Dessine le graphique principal
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
        
        let points = [];
        let meanTrials = strategy.totalTrials || 100;
        let medianTrials = strategy.intervals?.total?.percentiles?.p50 || meanTrials;
        
        // Générer les points selon le type de courbe
        if (this.showCumulative) {
            // Courbe cumulée (existante)
            if (typeof strategy.calculateTrialsProbabilities === 'function') {
                console.log('Using strategy.calculateTrialsProbabilities (cumulative)');
                points = strategy.calculateTrialsProbabilities();
            } else {
                console.log('Using fallback probability calculation (cumulative)');
                points = this.generateSimplePoints(strategy);
            }
        } else {
            // Courbe non cumulée (distribution)
            if (strategy.distribution && Array.isArray(strategy.distribution)) {
                console.log('Using distribution array');
                points = this.generateDistributionPoints(strategy);
            } else {
                console.log('Using fallback distribution calculation');
                points = this.generateSimpleDistributionPoints(strategy);
            }
        }
        
        this.currentMeanTrials = meanTrials;
        this.currentMedianTrials = medianTrials;
        this.isGuildStrategy = strategy.type === 'hybrid' && strategy.itemsMode === true;

        // Mettre à jour le sous-titre selon le type de scénario
        const subtitleEl = document.querySelector('.chart-subtitle');
        if (subtitleEl) {
            const key = this.isGuildStrategy ? 'chartSubtitleGuild' : 'chartSubtitle';
            subtitleEl.textContent = this.translator.t(key);
            subtitleEl.setAttribute('data-i18n', key);
        }

        // Vérifier que les points sont valides
        if (!points || points.length === 0) {
            console.error('No valid points generated');
            const minRequired = (strategy.endLevel - strategy.startLevel) || 1;
            points = this.showCumulative ? 
                [{ x: 0, y: 0 }, { x: meanTrials, y: 50 }, { x: meanTrials * 2, y: 100 }] :
                [{ x: Math.max(minRequired, meanTrials), y: 50 }];
        }
        
        // Log pour debug
        console.log('Chart data:', {
            type: this.showCumulative ? 'cumulative' : 'distribution',
            strategyMean: meanTrials,
            strategyMedian: medianTrials,
            pointsCount: points.length,
            firstPoint: points[0],
            lastPoint: points[points.length - 1],
            hasDistribution: !!strategy.distribution,
            distributionLength: strategy.distribution?.length
        });
        
        // Créer le graphique
        this.createChart(points, meanTrials, medianTrials, strategy);
    }

    /**
     * Génère les points pour la distribution non cumulée
     */
    generateDistributionPoints(strategy) {
        const points = [];
        
        // La distribution est un tableau, pas un objet avec des méthodes
        const distribution = strategy.distribution;
        if (!distribution || !Array.isArray(distribution)) {
            console.error('Invalid distribution data');
            return this.generateSimpleDistributionPoints(strategy);
        }
        
        // Le minimum varie selon le mode :
        // - mode objets (forgeron de guilde) : au moins 1 objet
        // - mode tentatives (autres scénarios) : au moins (endLevel - startLevel) tentatives
        const minTrialsRequired = strategy.minAttemptsForChart ?? (strategy.endLevel - strategy.startLevel);

        // Parcourir la distribution en commençant au minimum requis
        for (let i = minTrialsRequired; i < distribution.length; i++) {
            const pmf = distribution[i];
            if (pmf > 0.0001) { // Seuil minimal
                points.push({ 
                    x: i, 
                    y: pmf * 100 // Convertir en pourcentage
                });
            }
        }
        
        // Si aucun point trouvé, utiliser le fallback
        if (points.length === 0) {
            console.warn('No valid distribution points found, using fallback');
            return this.generateSimpleDistributionPoints(strategy);
        }
        
        return points;
    }

    /**
     * Génère une distribution simple (fallback)
     */
    generateSimpleDistributionPoints(strategy) {
        const points = [];
        const totalTrials = strategy.totalTrials || 100;
        
        // Le minimum varie selon le mode (cf. generateDistributionPoints)
        const minTrialsRequired = strategy.minAttemptsForChart ?? (strategy.endLevel - strategy.startLevel);

        // Approximation avec une distribution normale-like
        const mean = Math.max(totalTrials, minTrialsRequired);
        const std = Math.sqrt(mean) * 2; // Approximation
        
        const minX = Math.max(minTrialsRequired, Math.floor(mean - 3 * std));
        const maxX = Math.ceil(mean + 3 * std);
        
        // Générer une courbe en cloche simple
        for (let x = minX; x <= maxX; x++) {
            const z = (x - mean) / std;
            const pmf = Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
            points.push({ 
                x: x, 
                y: pmf * 100 // Convertir en pourcentage
            });
        }
        
        return points;
    }

    /**
     * Génère des points simples basés sur les waypoints et les taux (fallback pour cumulée)
     */
    generateSimplePoints(strategy) {
        const points = [];
        const totalTrials = strategy.totalTrials || 100;
        
        // Utiliser les waypoints pour une meilleure approximation
        if (strategy.waypoints && strategy.waypoints.length > 0) {
            // Calculer un taux effectif basé sur les waypoints
            const effectiveRates = strategy.waypoints
                .filter(w => w > 0)
                .map(w => 1 / w);
            
            if (effectiveRates.length > 0) {
                const harmonicMean = effectiveRates.length / effectiveRates.reduce((sum, r) => sum + 1/r, 0);
                
                console.log(`Using waypoints - Effective rate: ${(harmonicMean * 100).toFixed(1)}%`);
                
                // Générer la courbe
                points.push({ x: 0, y: 0 });
                
                const numLevels = strategy.endLevel - strategy.startLevel;
                const adjustedRate = harmonicMean / Math.sqrt(numLevels);
                
                for (let n = 1; n <= totalTrials * 5; n++) {
                    const prob = 1 - Math.pow(1 - adjustedRate, n);
                    points.push({ x: n, y: Math.min(prob * 100, 100) });
                    
                    if (prob > 0.999) break;
                }
                
                return points;
            }
        }
        
        // Fallback: utiliser une approximation simple
        console.log('Using simple fallback');
        points.push({ x: 0, y: 0 });
        
        for (let n = 1; n <= totalTrials * 3; n++) {
            const prob = 1 - Math.exp(-n / totalTrials);
            points.push({ x: n, y: Math.min(prob * 100, 100) });
            
            if (prob > 0.999) break;
        }
        
        return points;
    }

    /**
     * Crée la configuration du graphique
     */
    createChartConfig(points, meanTrials, medianTrials, strategy) {
        // Garder le calcul EXACT original (pas d'arrondi)
        const maxY = this.showCumulative ? 100 : Math.max(...points.map(p => p.y)) * 1.1;
        
        return {
            type: this.showCumulative ? 'line' : 'bar',
            data: {
                datasets: [{
                    label: this.showCumulative ? 
                        this.translator.t('successProb') : 
                        this.translator.t('trialsProbability'),
                    data: points,
                    borderColor: '#6366f1',
                    backgroundColor: this.showCumulative ? 
                        'rgba(99, 102, 241, 0.1)' : 
                        'rgba(99, 102, 241, 0.6)',
                    fill: this.showCumulative,
                    tension: this.showCumulative ? 0.4 : 0,
                    borderWidth: this.showCumulative ? 3 : 1,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    barPercentage: 0.9,
                    categoryPercentage: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: this.createTooltipConfig(meanTrials),
                    annotation: this.createAnnotationConfig(meanTrials, medianTrials, strategy),
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.1
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x', // SEUL CHANGEMENT : zoom uniquement sur X
                            drag: {
                                enabled: true,
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                borderColor: '#6366f1',
                                borderWidth: 1,
                                threshold: 10
                            }
                        },
                        pan: {
                            enabled: true,
                            mode: 'x', // SEUL CHANGEMENT : pan uniquement sur X
                            speed: 10,
                            threshold: 10
                        },
                        limits: {
                            x: {
                                min: 0,
                                max: Math.max(...points.map(p => p.x)) * 1.5
                            },
                            y: {
                                min: 0,
                                max: maxY * 1.2 // Garder le comportement original
                            }
                        }
                    }
                },
                scales: this.createScalesConfig(maxY),
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
                    const lang = this.translator?.getLanguage?.() || 'fr';
                    const trials = Math.round(context[0].parsed.x);
                    const labelKey = this.currentStrategy?.itemsMode ? 'xAxisLabelItems' : 'xAxisLabel';
                    return `${this.translator.t(labelKey)}: ${formatNumber(trials, lang)}`;
                },
                label: (context) => {
                    const prob = context.parsed.y;
                    const label = this.showCumulative ? 
                        this.translator.t('successProb') : 
                        this.translator.t('probability');
                    return `${label}: ${prob.toFixed(2)}%`;
                },
                afterLabel: (context) => {
                    if (meanTrials && meanTrials > 0) {
                        const trials = Math.round(context.parsed.x);
                        const ratio = trials / meanTrials;
                        const trialsKey = this.isGuildStrategy ? 'avgItemsShort' : 'avgTrials';
                        return `(${(ratio * 100).toFixed(0)}% ${this.translator.t(trialsKey).toLowerCase()})`;
                    }
                    return '';
                }
            }
        };
    }

    /**
     * Configuration des annotations avec percentiles et médiane
     */
    createAnnotationConfig(meanTrials, medianTrials, strategy) {
        const annotations = {};
        
        // Ligne de la moyenne
        if (meanTrials && meanTrials > 0) {
            annotations.averageLine = {
                type: 'line',
                xMin: meanTrials,
                xMax: meanTrials,
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                    enabled: true,
                    content: this.translator.t(this.isGuildStrategy ? 'avgItemsShort' : 'avgTrials'),
                    position: 'start',
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    color: 'white',
                    font: { size: 11, weight: 'bold' },
                    padding: 4
                }
            };
        }
        
        // Ligne de la médiane (P50) - plus visible pour la distribution
        if (medianTrials && medianTrials > 0 && (Math.abs(medianTrials - meanTrials) > 5 || !this.showCumulative)) {
            annotations.medianLine = {
                type: 'line',
                xMin: medianTrials,
                xMax: medianTrials,
                borderColor: '#8b5cf6',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                    enabled: true,
                    content: this.translator.t('percentile50'),
                    position: 'start',
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    color: 'white',
                    font: { size: 11, weight: 'bold' },
                    padding: 4,
                    yAdjust: -20 // Décaler pour éviter le chevauchement
                }
            };
        }
        
        // Ajouter les percentiles si disponibles (seulement pour la vue cumulée)
        if (this.showCumulative && strategy.intervals?.total?.percentiles) {
            const percentiles = strategy.intervals.total.percentiles;
            
            // P5 - 5e percentile
            if (percentiles.p5) {
                annotations.p5Line = {
                    type: 'line',
                    xMin: percentiles.p5,
                    xMax: percentiles.p5,
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderDash: [3, 3],
                    label: {
                        enabled: true,
                        content: '5%',
                        position: 'end',
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        color: 'white',
                        font: { size: 10 },
                        padding: 2
                    }
                };
            }
            
            // P95 - 95e percentile
            if (percentiles.p95) {
                annotations.p95Line = {
                    type: 'line',
                    xMin: percentiles.p95,
                    xMax: percentiles.p95,
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderDash: [3, 3],
                    label: {
                        enabled: true,
                        content: '95%',
                        position: 'end',
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        color: 'white',
                        font: { size: 10 },
                        padding: 2
                    }
                };
            }
        }
        
        return { annotations };
    }

    calculateSmartYMax(points) {
        if (!points || points.length === 0) return 100;
        
        // Pour la vue cumulée, toujours 100% (c'est logique)
        if (this.showCumulative) {
            return 100;
        }
        
        // Pour la vue distribution, calculer intelligemment
        const maxValue = Math.max(...points.map(p => p.y));
        
        // Ajouter une marge de 10-20% au-dessus de la valeur max
        const withMargin = maxValue * 1.15;
        
        // Arrondir à un nombre "rond" pour l'esthétique
        if (withMargin <= 1) {
            return 1;
        } else if (withMargin <= 5) {
            return Math.ceil(withMargin); // Arrondir à l'entier supérieur
        } else if (withMargin <= 10) {
            return Math.ceil(withMargin / 2) * 2; // Arrondir au multiple de 2
        } else if (withMargin <= 20) {
            return Math.ceil(withMargin / 5) * 5; // Arrondir au multiple de 5
        } else if (withMargin <= 50) {
            return Math.ceil(withMargin / 10) * 10; // Arrondir au multiple de 10
        } else {
            return Math.ceil(withMargin / 25) * 25; // Arrondir au multiple de 25
        }
    }

    /**
     * Configuration des échelles
     */
    createScalesConfig(maxY = 100) {
        // Calculer un stepSize approprié selon la valeur max
        let stepSize;
        if (this.showCumulative) {
            stepSize = 10; // Toujours 10% pour la vue cumulée
        } else {
            // Pour la distribution, adapter le stepSize à la valeur max
            if (maxY <= 5) {
                stepSize = 0.5;
            } else if (maxY <= 10) {
                stepSize = 1;
            } else if (maxY <= 20) {
                stepSize = 2;
            } else if (maxY <= 50) {
                stepSize = 5;
            } else {
                stepSize = 10;
            }
        }
        
        return {
            x: {
                type: 'linear',
                title: {
                    display: true,
                    text: this.currentStrategy?.itemsMode
                        ? this.translator.t('xAxisLabelItems')
                        : this.translator.t('xAxisLabel'),
                    color: '#94a3b8',
                    font: { size: 14, weight: 'bold' }
                },
                ticks: {
                    callback: (value) => {
                        const lang = this.translator?.getLanguage?.() || 'fr';
                        const rounded = Math.round(value);
                        // Notation compacte au-delà de 10 000 pour éviter l'encombrement
                        // (ex : +20+ ou mode items), sinon séparateur de milliers standard
                        if (rounded >= 10000) return formatCompactNumber(rounded, lang);
                        return formatNumber(rounded, lang);
                    },
                    color: '#94a3b8',
                    font: { size: 12 },
                    maxRotation: 0
                },
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawBorder: false
                }
            },
            y: {
                title: {
                    display: true,
                    text: this.showCumulative ? 
                        this.translator.t('yAxisLabel') : 
                        this.translator.t('probability'),
                    color: '#94a3b8',
                    font: { size: 14, weight: 'bold' }
                },
                min: 0,
                max: maxY, // Utiliser la valeur calculée intelligemment
                ticks: {
                    callback: (value) => `${value.toFixed(this.showCumulative ? 0 : 1)}%`,
                    color: '#94a3b8',
                    font: { size: 12 },
                    stepSize: stepSize // Adapter le stepSize
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
    createChart(points, meanTrials, medianTrials, strategy) {
        // Configuration du graphique
        const config = this.createChartConfig(points, meanTrials, medianTrials, strategy);
        
        // Créer le graphique
        this.chart = new Chart(this.ctx, config);
        
        // Mettre à jour la légende
        this.updateLegend(points, meanTrials, medianTrials, strategy);
    }

    /**
     * Met à jour la légende avec les percentiles et statistiques claires
     */
    updateLegend(points, meanTrials, medianTrials, strategy) {
        if (!this.chartLegend) return;
        
        // Pour la vue distribution, afficher des statistiques différentes
        const isGuild = this.isGuildStrategy;
        const avgTrialsKey = isGuild ? 'avgItemsShort' : 'avgTrials';
        if (!this.showCumulative) {
            const mode = this.findMode(points);
            const std = strategy.intervals?.total?.std || null;

            this.chartLegend.innerHTML = `
                <div class="legend-grid">
                    <div class="legend-item mean">
                        <span class="legend-label">${this.translator.t(avgTrialsKey)}:</span>
                        <span class="legend-value">${Math.round(meanTrials)}</span>
                    </div>
                    ${medianTrials ? `
                    <div class="legend-item median">
                        <span class="legend-label">${this.translator.t('median')}:</span>
                        <span class="legend-value">${Math.round(medianTrials)}</span>
                    </div>
                    ` : ''}
                    ${mode ? `
                    <div class="legend-item mode">
                        <span class="legend-label">${this.translator.t('mode')}:</span>
                        <span class="legend-value">${mode.x} (${mode.y.toFixed(1)}%)</span>
                    </div>
                    ` : ''}
                    ${std ? `
                    <div class="legend-item std">
                        <span class="legend-label">${this.translator.t('standardDeviation')}:</span>
                        <span class="legend-value">${Math.round(std)}</span>
                    </div>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        // Vue cumulée (code existant)
        const keyPoints = [];
        
        if (strategy.intervals?.total?.percentiles) {
            const p = strategy.intervals.total.percentiles;
            
            if (p.p5) keyPoints.push({ 
                x: Math.round(p.p5), 
                label: '5%',
                description: `(${this.translator.t('percentile5')})`,
                type: 'percentile' 
            });
            
            if (p.p50) keyPoints.push({ 
                x: Math.round(p.p50), 
                label: '50%',
                description: `(${this.translator.t('percentile50')})`,
                type: 'median' 
            });
            
            keyPoints.push({ 
                x: Math.round(meanTrials), 
                label: `${Math.round((meanTrials / p.p50) * 50)}%`,
                description: `(${this.translator.t(avgTrialsKey)})`,
                type: 'mean'
            });

            if (p.p95) keyPoints.push({
                x: Math.round(p.p95), 
                label: '95%',
                description: `(${this.translator.t('percentile95')})`,
                type: 'percentile' 
            });
        } else {
            // Fallback si pas de percentiles
            keyPoints.push(
                { x: Math.round(meanTrials * 0.5), label: '50%', description: '', type: 'estimate' },
                { x: Math.round(meanTrials), label: '100%', description: `(${this.translator.t(avgTrialsKey)})`, type: 'mean' },
                { x: Math.round(meanTrials * 1.5), label: '150%', description: '', type: 'estimate' },
                { x: Math.round(meanTrials * 2), label: '200%', description: '', type: 'estimate' }
            );
        }
        
        // Filtrer les points valides et trouver les probabilités
        const legendData = keyPoints
            .filter(kp => kp.x > 0 && kp.x <= Math.max(...points.map(p => p.x)))
            .map(kp => {
                const prob = this.getProbabilityAtTrials(points, kp.x);
                return {
                    trials: kp.x,
                    label: kp.label,
                    description: kp.description,
                    probability: prob,
                    type: kp.type
                };
            });
        
        // Générer le HTML avec des styles différents selon le type
        this.chartLegend.innerHTML = `
            <div class="legend-grid">
                ${legendData.map(item => {
                    let displayLabel = '';
                    let displayClass = item.type;
                    
                    // Déterminer le label selon le type
                    switch(item.type) {
                        case 'percentile':
                            if (item.label === '5%') {
                                displayLabel = this.translator.t('percentile5');
                            } else if (item.label === '95%') {
                                displayLabel = this.translator.t('percentile95');
                            } else {
                                displayLabel = item.description.replace(/[()]/g, '');
                            }
                            break;
                        case 'median':
                            displayLabel = this.translator.t('median');
                            displayClass = 'median';
                            break;
                        case 'mean':
                            displayLabel = this.translator.t(avgTrialsKey);
                            displayClass = 'mean';
                            break;
                        default:
                            displayLabel = item.description || item.label;
                    }
                    
                    return `
                    <div class="legend-item ${displayClass}">
                        <span class="legend-budget">${item.trials}</span>
                        <span class="legend-arrow">→</span>
                        <span class="legend-prob">${item.probability.toFixed(0)}%</span>
                        <span class="legend-label">${displayLabel}</span>
                    </div>
                `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Trouve le mode dans la distribution
     */
    findMode(points) {
        if (!points || points.length === 0) return null;
        
        let maxPoint = points[0];
        for (const point of points) {
            if (point.y > maxPoint.y) {
                maxPoint = point;
            }
        }
        
        return maxPoint;
    }

    /**
     * Obtient la probabilité à un nombre donné de tentatives
     */
    getProbabilityAtTrials(points, trials) {
        if (!points || points.length === 0) return 0;
        
        // Pour la distribution non cumulée, retourner la valeur exacte ou 0
        if (!this.showCumulative) {
            const point = points.find(p => Math.round(p.x) === Math.round(trials));
            return point ? point.y : 0;
        }
        
        // Pour la cumulée, interpoler
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
        // Mettre à jour le bouton de toggle
        const toggleBtn = document.getElementById('toggleCurveType');
        if (toggleBtn) {
            toggleBtn.innerHTML = this.showCumulative ? 
                `<span class="btn-icon">📊</span> ${this.translator.t('distributionView')}` :
                `<span class="btn-icon">📈</span> ${this.translator.t('cumulativeView')}`;
        }

        // Mettre à jour le bouton d'export
        const exportBtn = document.getElementById('exportChartBtn');
        if (exportBtn) {
            exportBtn.innerHTML = `<span class="btn-icon">💾</span> ${this.translator.t('exportChart') || 'Export'}`;
        }

        // Mettre à jour les tooltips des boutons de zoom
        const zoomInBtn = document.getElementById('zoomInBtn');
        if (zoomInBtn) {
            zoomInBtn.title = this.translator.t('zoomIn') || 'Zoom In';
        }
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        if (zoomOutBtn) {
            zoomOutBtn.title = this.translator.t('zoomOut') || 'Zoom Out';
        }
        const resetZoomBtn = document.getElementById('resetZoomBtn');
        if (resetZoomBtn) {
            resetZoomBtn.title = this.translator.t('resetZoom') || 'Reset Zoom';
        }
        
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
        this.currentMedianTrials = null;
        this.showCumulative = true; // Réinitialiser à la vue cumulée
        
        if (this.chartLegend) {
            this.chartLegend.innerHTML = '';
        }

        // Retirer le menu d'export s'il existe
        const exportMenu = document.getElementById('chartExportMenu');
        if (exportMenu) {
            exportMenu.remove();
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
        
        const points = this.showCumulative ?
            (this.currentStrategy.calculateTrialsProbabilities ? 
                this.currentStrategy.calculateTrialsProbabilities() : []) :
            this.generateDistributionPoints(this.currentStrategy);
        
        return {
            points: points,
            meanTrials: this.currentMeanTrials,
            medianTrials: this.currentMedianTrials,
            distribution: this.currentStrategy.distribution || null,
            percentiles: this.currentStrategy.intervals?.total?.percentiles || null,
            type: this.showCumulative ? 'cumulative' : 'distribution'
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
     * Définit le type de courbe à afficher
     */
    setCurveType(cumulative) {
        if (this.showCumulative !== cumulative) {
            this.showCumulative = cumulative;
            if (this.currentStrategy) {
                this.drawTrialsProbabilityChart(this.currentStrategy);
            }
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
        
        // Retirer le menu d'export s'il existe
        const exportMenu = document.getElementById('chartExportMenu');
        if (exportMenu) {
            exportMenu.remove();
        }
    }
}