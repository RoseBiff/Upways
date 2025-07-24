// Import des modules
import { DataService } from './services/DataService.js';
import { StrategyService } from './services/StrategyService.js';
import { ExportService } from './services/ExportService.js';

import { SearchComponent } from './components/SearchComponent.js';
import { ConfigComponent } from './components/ConfigComponent.js';
import { AnalysisComponent } from './components/AnalysisComponent.js';
import { ChartComponent } from './components/ChartComponent.js';
import { SimulationComponent } from './components/SimulationComponent.js';

import { Translator } from './utils/translator.js';
import { Formatters } from './utils/formatters.js';
import { Calculator } from './utils/calculations.js';
import { UIState, showToast, confirm } from './utils/ui-helpers.js';

/**
 * Application principale Upways - Version 3.1
 * Réinitialisation de l'onglet analyse lors du changement d'objet
 */
class UpwaysApp {
    constructor() {
        // Services
        this.dataService = new DataService();
        this.translator = new Translator(this.dataService);
        this.formatters = new Formatters(this.translator);
        this.calculator = new Calculator(this.dataService);
        this.strategyService = new StrategyService(this.dataService);
        this.exportService = new ExportService(this.formatters, this.translator);
        this.uiState = new UIState();

        // Composants
        this.searchComponent = null;
        this.configComponent = null;
        this.analysisComponent = null;
        this.chartComponent = null;

        // État de l'application
        this.currentItemId = null;
        this.currentItemName = null;
        this.strategies = {};
        this.showIntervals = true;
        
        // SEO multilingue
        this.seoData = {
            fr: {
                title: "Upways - Calculateur amélioration Metin2 | Optimiser vos upgrades",
                description: "Calculez la meilleure stratégie pour améliorer vos objets dans Metin2. Économisez temps et yang avec Upways, l'optimiseur d'amélioration gratuit.",
                keywords: "metin2, upways, amélioration, upgrade, calculateur, optimiseur"
            },
            en: {
                title: "Upways - Metin2 Upgrade Calculator | Optimize your upgrades",
                description: "Calculate the best strategy to upgrade your items in Metin2. Save time and yang with Upways, the free upgrade optimizer.",
                keywords: "metin2, upways, upgrade, calculator, optimizer, enhancement"
            },
            ro: {
                title: "Upways - Calculator upgrade Metin2 | Optimizează upgrade-urile",
                description: "Calculează cea mai bună strategie pentru a-ți îmbunătăți obiectele în Metin2. Economisește timp și yang cu Upways, optimizatorul gratuit.",
                keywords: "metin2, upways, upgrade, calculator, optimizator, îmbunătățire"
            },
            tr: {
                title: "Upways - Metin2 Yükseltme Hesaplayıcısı | Yükseltmeleri optimize et",
                description: "Metin2'de eşyalarınızı yükseltmek için en iyi stratejiyi hesaplayın. Upways ile zaman ve yang tasarrufu yapın.",
                keywords: "metin2, upways, yükseltme, hesaplayıcı, optimizasyon"
            },
            de: {
                title: "Upways - Metin2 Upgrade Rechner | Optimiere deine Upgrades",
                description: "Berechne die beste Strategie um deine Gegenstände in Metin2 zu verbessern. Spare Zeit und Yang mit Upways.",
                keywords: "metin2, upways, verbesserung, upgrade, rechner, optimierer"
            }
        };
        
        // Initialisation
        this.init();
    }

    async init() {
        // Gérer les paramètres d'URL pour la langue
        this.handleUrlParams();
        
        try {
            // Charger uniquement les paramètres sauvegardés
            this.dataService.loadSavedSettings();
            
            // Initialiser les composants
            this.initComponents();
            
            // Attacher les événements globaux
            this.attachGlobalEvents();
            
            // Mettre à jour la langue et le SEO
            this.updateLanguage();
            
            console.log('Application initialized with optimized loading');
        } catch (error) {
            console.error('Initialization error:', error);
            this.uiState.showToast('error', this.translator.t('errorAnalysis'));
        }
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang');
        
        if (lang && this.translator.isLanguageAvailable(lang)) {
            this.translator.setLanguage(lang);
        }
    }

    updateSEO() {
        const lang = this.translator.getLanguage();
        const seo = this.seoData[lang] || this.seoData.fr;
        
        // Mettre à jour le titre avec l'année courante
        document.title = seo.title + ' | ' + new Date().getFullYear();
        
        // Mettre à jour les meta tags
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = seo.description;
        }
        
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) {
            metaKeywords.content = seo.keywords;
        }
        
        // Mettre à jour l'attribut lang du document
        document.documentElement.lang = lang;
        
        // Mettre à jour l'URL canonique avec la langue
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            const baseUrl = 'https://metin2upways.com';
            canonical.href = lang === 'fr' ? baseUrl : `${baseUrl}/?lang=${lang}`;
        }
    }

    initComponents() {
    // Composant de recherche
    this.searchComponent = new SearchComponent(
        this.dataService,
        this.translator,
        (itemId, itemName) => this.onItemSelected(itemId, itemName)
    );

    // Composant de configuration
    this.configComponent = new ConfigComponent(
        this.dataService,
        this.translator,
        (change) => this.onConfigChanged(change)
    );

    // Composant d'analyse
    this.analysisComponent = new AnalysisComponent(
        this.dataService,
        this.translator,
        this.formatters,
        (change) => this.onStrategyChanged(change)
    );

    // Composant de graphique
    this.chartComponent = new ChartComponent(this.translator);
    
    // Configurer l'affichage des intervalles
    this.analysisComponent.setShowIntervals(this.showIntervals);

    // ========== AJOUTER ICI LE COMPOSANT DE SIMULATION ==========
    
    // Créer le composant de simulation
    this.simulationComponent = new SimulationComponent(this.dataService);
    
    // Créer le bouton de simulation (mais ne pas l'afficher tout de suite)
    this.createSimulationButton();
}

    attachGlobalEvents() {
        // Sélecteur de langue personnalisé
        this.initCustomLanguageSelector();

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Bouton d'analyse
        document.getElementById('analyzeBtn').addEventListener('click', () => this.runAnalysis());

        // Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportResults());

        // Reset
        document.getElementById('resetBtn').addEventListener('click', () => this.resetAll());
    }

    /**
     * Initialise le sélecteur de langue personnalisé
     */
    initCustomLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        const button = document.getElementById('languageSelectorButton');
        const dropdown = document.getElementById('languageDropdown');
        const options = dropdown.querySelectorAll('.language-option');

        // Ouvrir/fermer le dropdown
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            selector.classList.toggle('open');
        });

        // Sélectionner une langue
        options.forEach(option => {
            option.addEventListener('click', async () => {
                const lang = option.dataset.lang;
                
                // Attendre le changement de langue
                this.uiState.showLoading(this.translator.t('calculating'));
                
                try {
                    await this.translator.setLanguage(lang);
                    this.updateLanguage();
                } catch (error) {
                    console.error('Error changing language:', error);
                    this.uiState.showToast('error', 'Error changing language');
                } finally {
                    this.uiState.hideLoading();
                }
                
                selector.classList.remove('open');
            });
        });

        // Fermer le dropdown en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!selector.contains(e.target)) {
                selector.classList.remove('open');
            }
        });
    }

    /**
     * Met à jour l'affichage du sélecteur de langue personnalisé
     */
    updateLanguageSelector() {
        const lang = this.translator.getLanguage();
        const button = document.getElementById('languageSelectorButton');
        const dropdown = document.getElementById('languageDropdown');
        
        // Obtenir les informations de la langue sélectionnée
        const selectedOption = dropdown.querySelector(`[data-lang="${lang}"]`);
        if (selectedOption) {
            // Copier le drapeau SVG
            const flagSvg = selectedOption.querySelector('.language-flag').cloneNode(true);
            const languageName = selectedOption.querySelector('span').textContent;
            
            // Mettre à jour le bouton
            const buttonFlag = button.querySelector('.language-flag');
            const buttonName = button.querySelector('.language-name');
            
            buttonFlag.parentNode.replaceChild(flagSvg, buttonFlag);
            buttonName.textContent = languageName;
            
            // Marquer l'option active
            dropdown.querySelectorAll('.language-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.lang === lang);
            });
        }
    }

    /**
     * Gestion des événements
     */
    async onItemSelected(itemId, itemName) {
        // Si on change d'objet et qu'une analyse avait été faite
        if (this.currentItemId && this.currentItemId !== itemId && Object.keys(this.strategies).length > 0) {
            // Réinitialiser l'état de l'analyse
            this.resetAnalysisState();
        }
        
        this.currentItemId = itemId;
        this.currentItemName = itemName;
        await this.configComponent.setCurrentItem(itemId);
        
        // Réinitialiser le scénario personnalisé dans le composant d'analyse
        const startLevel = this.configComponent.getStartLevel();
        const endLevel = this.configComponent.getEndLevel();
        this.analysisComponent.setAnalysisParams({
            startLevel,
            endLevel,
            itemId
        });
    }

    /**
     * Réinitialise l'état de l'analyse
     */
    resetAnalysisState() {
        // Vider les stratégies
        this.strategies = {};
        
        // Bloquer l'onglet analyse
        const analysisTabBtn = document.getElementById('analysisTabBtn');
        if (analysisTabBtn) {
            analysisTabBtn.classList.add('disabled');
        }
        
        // Revenir à l'onglet configuration
        this.switchTab('config');
        
        // Réinitialiser le graphique
        if (this.chartComponent) {
            this.chartComponent.reset();
        }
    }

    onConfigChanged(change) {
        if (change.type === 'levels') {
            // Les niveaux ont changé, réinitialiser les stratégies
            this.strategies = {};
            
            // Mettre à jour le composant d'analyse avec les nouveaux niveaux
            if (this.currentItemId) {
                this.analysisComponent.setAnalysisParams({
                    startLevel: change.startLevel,
                    endLevel: change.endLevel,
                    itemId: this.currentItemId
                });
            }
        } else if (change.type === 'price' && this.analysisComponent.getCurrentStrategy() === 'custom' && Object.keys(this.strategies).length > 0) {
            // Un prix a changé et on est en stratégie personnalisée avec des stratégies calculées
            this.recalculateCustomStrategy();
        }
    }

    onStrategyChanged(change) {
        if (change.type === 'custom') {
            // Le scénario personnalisé a changé
            this.recalculateCustomStrategy();
        }
    }

    /**
     * Met à jour la langue dans toute l'application
     */
    updateLanguage() {
        const lang = this.translator.getLanguage();
        
        // Mettre à jour l'URL sans recharger la page
        const url = new URL(window.location);
        if (lang === 'fr') {
            url.searchParams.delete('lang');
        } else {
            url.searchParams.set('lang', lang);
        }
        window.history.replaceState({}, '', url);
        
        // Mettre à jour le SEO
        this.updateSEO();
        
        // Mettre à jour le sélecteur de langue personnalisé
        this.updateLanguageSelector();
        
        // Mettre à jour les traductions de la page
        this.translator.updatePageTranslations();
        
        // Mettre à jour les composants
        this.searchComponent.updateLanguage();
        this.configComponent.updateLanguage();
        
        // Mettre à jour le composant d'analyse
        if (this.analysisComponent) {
            this.analysisComponent.updateLanguage();
        }
        
        // Mettre à jour le graphique
        if (this.chartComponent) {
            this.chartComponent.updateLanguage();
        }
    }

    /**
     * Change d'onglet
     */
    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });
    }

    /**
     * Crée le bouton de simulation
     */
    createSimulationButton() {
        // Attendre que le DOM soit prêt
        setTimeout(() => {
            const chartTitle = document.querySelector('.chart-section .chart-title');
            if (!chartTitle) return;
            
            // Créer un conteneur pour les boutons si nécessaire
            let buttonContainer = chartTitle.querySelector('.chart-buttons');
            if (!buttonContainer) {
                buttonContainer = document.createElement('div');
                buttonContainer.className = 'chart-buttons';
                chartTitle.appendChild(buttonContainer);
            }
            
            // Créer le bouton de simulation
            const simulateBtn = document.createElement('button');
            simulateBtn.className = 'btn btn-secondary btn-small';
            simulateBtn.innerHTML = '<span class="btn-icon">🎲</span> Simuler';
            simulateBtn.style.display = 'none'; // Caché par défaut
            simulateBtn.id = 'simulateBtn';
            
            simulateBtn.onclick = () => this.runSimulation();
            
            buttonContainer.appendChild(simulateBtn);
        }, 100);
    }

    /**
     * Lance la simulation Monte Carlo
     */
    /**
     * Lance la simulation Monte Carlo
     */
    async runSimulation() {
        // Récupérer la stratégie actuelle
        const currentStrategyType = this.analysisComponent.getCurrentStrategy();
        const strategy = this.strategies[currentStrategyType];

        if (!strategy) {
            this.uiState.showToast('error', 'Aucune stratégie sélectionnée');
            return;
        }

        // Afficher le loading
        this.uiState.showLoading('Simulation en cours...');

        // Lancer la simulation avec un délai pour l'UI
        setTimeout(async () => {
            try {
                // Nombre de simulations
                const numSims = 10000;
                
                // Lancer la simulation
                const results = this.simulationComponent.simulateUpgradeRuns(strategy, numSims);
                
                // Retirer l'ancienne courbe empirique si elle existe
                this.chartComponent.removeEmpiricalCurve();
                
                // Ajouter la nouvelle courbe empirique
                this.chartComponent.addEmpiricalCurve(
                    results.empiricalCurve, 
                    `Simulation (${numSims} essais)`
                );
                
                // Activer la légende
                this.chartComponent.toggleLegend(true);
                
                // Afficher les statistiques dans la console
                console.log('=== Résultats de simulation ===');
                console.log('Statistiques:', results.stats);
                
                // Comparer avec la théorie
                if (this.chartComponent.chart) {
                    const theoreticalCurve = this.chartComponent.chart.data.datasets[0].data;
                    const comparison = this.simulationComponent.compareWithTheory(theoreticalCurve);
                    
                    if (comparison) {
                        console.log('=== Comparaison théorie vs simulation ===');
                        console.log(`Erreur moyenne: ${comparison.avgError.toFixed(2)}%`);
                        console.log(`Erreur maximale: ${comparison.maxError.toFixed(2)}%`);
                    }
                }
                
                // Message de succès
                this.uiState.showToast('success', 
                    `Simulation terminée: ${results.stats.mean.toFixed(0)} essais en moyenne (5%: ${results.stats.percentile5}, 95%: ${results.stats.percentile95})`
                );
                
                // ========== LOGS DE COMPARAISON DÉTAILLÉE ==========
                console.log('\n=== Comparaison détaillée ===');
                
                // Récupérer la moyenne théorique
                let theoreticalMean;
                if (strategy.endLevel && strategy.endLevel > 9) {
                    // Pour les niveaux > 9, utiliser les waypoints étendus ou calculer manuellement
                    if (strategy.extendedWaypoints) {
                        theoreticalMean = strategy.extendedWaypoints.reduce((sum, w) => sum + w, 0);
                    } else {
                        // Calculer manuellement : Markov jusqu'à 9 + somme des 1/p pour chaque niveau > 9
                        theoreticalMean = strategy.markov ? strategy.markov.totalTrials : 0;
                        for (let i = 0; i < strategy.path.length; i++) {
                            const level = strategy.startLevel + i + 1;
                            if (level > 9) {
                                const rate = strategy.path[i].rate / 100;
                                theoreticalMean += 1 / rate;
                            }
                        }
                    }
                } else {
                    theoreticalMean = strategy.markov ? strategy.markov.totalTrials : 0;
                }
                const empiricalMean = results.stats.mean;
                
                console.log(`Moyenne théorique: ${theoreticalMean.toFixed(2)}`);
                console.log(`Moyenne empirique: ${empiricalMean.toFixed(2)}`);
                console.log(`Écart absolu: ${(empiricalMean - theoreticalMean).toFixed(2)}`);
                console.log(`Écart relatif: ${((empiricalMean - theoreticalMean) / theoreticalMean * 100).toFixed(2)}%`);
                
                // Comparer les percentiles
                if (this.chartComponent.chart && this.chartComponent.chart.data.datasets[0].data) {
                    const theoreticalData = this.chartComponent.chart.data.datasets[0].data;
                    
                    // Trouver les percentiles théoriques
                    const findPercentileTrials = (data, percentile) => {
                        for (let i = 0; i < data.length; i++) {
                            if (data[i].y >= percentile) {
                                return data[i].x;
                            }
                        }
                        return data[data.length - 1].x;
                    };
                    
                    const theo5 = findPercentileTrials(theoreticalData, 5);
                    const theo50 = findPercentileTrials(theoreticalData, 50);
                    const theo95 = findPercentileTrials(theoreticalData, 95);
                    
                    console.log('\n=== Comparaison des percentiles ===');
                    console.log(`5e percentile - Théorique: ${theo5}, Empirique: ${results.stats.percentile5}, Écart: ${((results.stats.percentile5 - theo5) / theo5 * 100).toFixed(1)}%`);
                    console.log(`Médiane - Théorique: ${theo50}, Empirique: ${results.stats.median}, Écart: ${((results.stats.median - theo50) / theo50 * 100).toFixed(1)}%`);
                    console.log(`95e percentile - Théorique: ${theo95}, Empirique: ${results.stats.percentile95}, Écart: ${((results.stats.percentile95 - theo95) / theo95 * 100).toFixed(1)}%`);
                    
                    console.log('\n=== Statistiques par niveau ===');
                    results.stats.levelStats.forEach(levelStat => {
                        console.log(`Niveau ${levelStat.level}: Moyenne=${levelStat.mean.toFixed(2)}, Min=${levelStat.min}, Max=${levelStat.max}`);
                    });
                }
                // ==========================================================
                
            } catch (error) {
                console.error('Erreur de simulation:', error);
                this.uiState.showToast('error', 'Erreur lors de la simulation');
            } finally {
                this.uiState.hideLoading();
            }
        }, 100);
    }
    /**
     * Lance l'analyse
     */
    async runAnalysis() {
        if (!this.searchComponent.hasSelectedItem()) {
            this.uiState.showToast('error', this.translator.t('selectItemFirst'));
            return;
        }

        const startLevel = this.configComponent.getStartLevel();
        const endLevel = this.configComponent.getEndLevel();

        if (endLevel <= startLevel) {
            this.uiState.showToast('error', this.translator.t('invalidLevelRange'));
            return;
        }

        this.uiState.showLoading(this.translator.t('calculating'));
        
        try {
            // Configurer le composant d'analyse AVANT de calculer les stratégies
            this.analysisComponent.setAnalysisParams({
                startLevel,
                endLevel,
                itemId: this.currentItemId
            });
            
            // Calculer toutes les stratégies
            await this.calculateAllStrategies();
            
            // Débloquer l'onglet analyse
            const analysisTabBtn = document.getElementById('analysisTabBtn');
            if (analysisTabBtn) {
                analysisTabBtn.classList.remove('disabled');
            }
            
            // Passer à l'onglet analyse
            this.switchTab('analysis');
            
            // Définir les stratégies dans le composant
            this.analysisComponent.setStrategies(this.strategies);
            
            // Sélectionner la stratégie optimale par défaut
            this.analysisComponent.selectStrategy('optimal');
            
            // Dessiner le graphique
            this.chartComponent.drawTrialsProbabilityChart(this.strategies.optimal);
            
            this.uiState.showToast('success', this.translator.t('analysisComplete'));

            // Dessiner le graphique
            this.chartComponent.drawTrialsProbabilityChart(this.strategies.optimal);
            
            // ========== AJOUTER ICI ==========
            // Afficher le bouton de simulation
            const simulateBtn = document.getElementById('simulateBtn');
            if (simulateBtn) {
                simulateBtn.style.display = '';
            }
            // =================================

            this.uiState.showToast('success', this.translator.t('analysisComplete'));
        } catch (error) {
            console.error('Analysis error:', error);
            this.uiState.showToast('error', this.translator.t('errorAnalysis'));
        } finally {
            this.uiState.hideLoading();
        }
    }

    /**
     * Calcule toutes les stratégies
     */
    async calculateAllStrategies() {
        const startLevel = this.configComponent.getStartLevel();
        const endLevel = this.configComponent.getEndLevel();
        
        // Récupérer le scénario personnalisé du composant d'analyse
        const customScenario = this.analysisComponent.getCustomScenario();

        const [optimal, custom] = await Promise.all([
            this.strategyService.calculateOptimalStrategy(this.currentItemId, startLevel, endLevel),
            this.strategyService.calculateCustomStrategy(
                customScenario,
                this.currentItemId,
                startLevel,
                endLevel
            )
        ]);
        
        this.strategies = { optimal, custom };
    }

    /**
     * Recalcule la stratégie personnalisée
     */
    async recalculateCustomStrategy() {
        if (!this.strategies.optimal) return;

        const startLevel = this.configComponent.getStartLevel();
        const endLevel = this.configComponent.getEndLevel();
        const customScenario = this.analysisComponent.getCustomScenario();
        
        this.uiState.showLoading(this.translator.t('calculating'));
        
        try {
            const custom = await this.strategyService.calculateCustomStrategy(
                customScenario,
                this.currentItemId,
                startLevel,
                endLevel
            );
            
            this.strategies.custom = custom;
            this.analysisComponent.setStrategies(this.strategies);
            
            // Forcer la mise à jour de l'affichage
            await this.analysisComponent.displayStrategyDetails();
            
            // Mettre à jour le graphique si on est en stratégie personnalisée
            if (this.analysisComponent.getCurrentStrategy() === 'custom') {
                this.chartComponent.update(custom);
            }
        } catch (error) {
            console.error('Custom strategy calculation error:', error);
            this.uiState.showToast('error', this.translator.t('customStrategyError'));
        } finally {
            this.uiState.hideLoading();
        }
    }

    /**
     * Exporte les résultats
     */
    async exportResults() {
        try {
            const currentStrategy = this.analysisComponent.getCurrentStrategy();
            const strategy = this.strategies[currentStrategy];
            
            if (!strategy) {
                this.uiState.showToast('error', this.translator.t('noStrategySelected'));
                return;
            }

            this.uiState.showLoading(this.translator.t('calculating'));

            // Récupérer le nom traduit de l'objet
            const translatedItemName = this.dataService.itemNames[this.currentItemId] || `Item ${this.currentItemId}`;

            await this.exportService.exportResults(
                strategy,
                translatedItemName,
                this.currentItemId,
                this.configComponent.getStartLevel(),
                this.configComponent.getEndLevel(),
                this.dataService,
                { mode: 'share' }
            );

            this.uiState.showToast('success', this.translator.t('exportSuccess'));
        } catch (error) {
            console.error('Export error:', error);
            this.uiState.showToast('error', this.translator.t('exportFailed'));
        } finally {
            this.uiState.hideLoading();
        }
    }

    /**
     * Réinitialise l'application
     */
    async resetAll() {
        const confirmed = await this.uiState.confirm(
            this.translator.t('resetConfirm'),
            {
                title: this.translator.t('resetConfirmTitle'),
                confirmText: this.translator.t('resetConfirmButton'),
                cancelText: this.translator.t('cancelButton')
            }
        );

        if (confirmed) {
            this.dataService.resetAll();
            // Réactiver le blocage de l'onglet Analyse
            document.getElementById('analysisTabBtn').classList.add('disabled');
            location.reload();
        }
    }
    
    /**
     * Configure l'affichage des intervalles à 95%
     */
    setShowIntervals(show) {
        this.showIntervals = show;
        if (this.analysisComponent) {
            this.analysisComponent.setShowIntervals(show);
        }
    }

    /**
     * Nettoyage global de l'application
     */
    destroy() {
        // Nettoyer tous les composants
        if (this.searchComponent) this.searchComponent.destroy();
        if (this.configComponent) this.configComponent.destroy();
        if (this.analysisComponent) this.analysisComponent.destroy();
        if (this.chartComponent) this.chartComponent.destroy();
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UpwaysApp();
    
    // Gérer le nettoyage lors de la fermeture
    window.addEventListener('beforeunload', () => {
        if (window.app) {
            window.app.destroy();
        }
    });
});