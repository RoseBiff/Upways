// Import des modules
import { DataService } from './services/DataService.js';
import { StrategyService } from './services/StrategyService.js';
import { ExportService } from './services/ExportService.js';

import { SearchComponent } from './components/SearchComponent.js';
import { ConfigComponent } from './components/ConfigComponent.js';
import { AnalysisComponent } from './components/AnalysisComponent.js';
import { ChartComponent } from './components/ChartComponent.js';

import { Translator } from './utils/translator.js';
import { Formatters } from './utils/formatters.js';
import { Calculator } from './utils/calculations.js';
import { UIState, showToast, confirm } from './utils/ui-helpers.js';

/**
 * Application principale Upways
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
        this.showIntervals = true; // Peut être changé à false pour désactiver les intervalles 95%
        
        // Initialisation
        this.init();
    }

    async init() {
        try {
            // Charger les données
            this.uiState.showLoading(this.translator.t('calculating'));
            await this.dataService.loadData();
            this.dataService.loadSavedSettings();
            
            // Initialiser les composants
            this.initComponents();
            
            // Attacher les événements globaux
            this.attachGlobalEvents();
            
            // Mettre à jour la langue
            this.updateLanguage();
            
            console.log('Application initialized');
        } catch (error) {
            console.error('Initialization error:', error);
            this.uiState.showToast('error', this.translator.t('errorAnalysis'));
        } finally {
            this.uiState.hideLoading();
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
    }

    attachGlobalEvents() {
        // Changement de langue
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.translator.setLanguage(e.target.value);
            this.updateLanguage();
        });

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
     * Gestion des événements
     */
    onItemSelected(itemId, itemName) {
        this.currentItemId = itemId;
        this.currentItemName = itemName;
        this.configComponent.setCurrentItem(itemId);
        
        // Réinitialiser le scénario personnalisé dans le composant d'analyse
        const startLevel = this.configComponent.getStartLevel();
        const endLevel = this.configComponent.getEndLevel();
        this.analysisComponent.setAnalysisParams({
            startLevel,
            endLevel,
            itemId
        });
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
        // Mettre à jour le sélecteur
        document.getElementById('languageSelect').value = this.translator.getLanguage();
        
        // Mettre à jour les traductions de la page
        this.translator.updatePageTranslations();
        
        // Mettre à jour les composants
        this.searchComponent.updateLanguage();
        this.configComponent.updateLanguage();
        
        // Si on a des résultats, les mettre à jour
        if (this.strategies.optimal) {
            this.analysisComponent.displayStrategyDetails();
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
            
            // Passer à l'onglet analyse
            this.switchTab('analysis');
            
            // Définir les stratégies dans le composant
            this.analysisComponent.setStrategies(this.strategies);
            
            // Sélectionner la stratégie optimale par défaut
            this.analysisComponent.selectStrategy('optimal');
            
            // Dessiner le graphique
            this.chartComponent.drawTrialsProbabilityChart(this.strategies.optimal);
            
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
        
        this.uiState.showLoading();
        
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
            this.analysisComponent.displayStrategyDetails();
            
            // Mettre à jour le graphique si on est en stratégie personnalisée
            if (this.analysisComponent.getCurrentStrategy() === 'custom') {
                this.chartComponent.update(custom);
            }
        } catch (error) {
            console.error('Custom strategy calculation error:', error);
            this.uiState.showToast('error', 'Erreur lors du calcul de la stratégie personnalisée');
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
                this.uiState.showToast('error', 'Aucune stratégie sélectionnée');
                return;
            }

            this.uiState.showLoading(this.translator.t('exportSuccess'));

            await this.exportService.exportResults(
                strategy,
                this.currentItemName,
                this.currentItemId,
                this.configComponent.getStartLevel(),
                this.configComponent.getEndLevel(),
                this.dataService
            );

            this.uiState.showToast('success', this.translator.t('exportSuccess'));
        } catch (error) {
            console.error('Export error:', error);
            this.uiState.showToast('error', 'Export failed');
        } finally {
            this.uiState.hideLoading();
        }
    }

    /**
     * Réinitialise l'application
     */
    async resetAll() {
        const confirmed = await this.uiState.confirm(
            'Réinitialiser tous les paramètres ?',
            {
                title: 'Réinitialisation',
                confirmText: 'Réinitialiser',
                cancelText: 'Annuler'
            }
        );

        if (confirmed) {
            this.dataService.resetAll();
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
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UpwaysApp();
});