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
import { UIState, showToast, confirm } from './utils/ui-helpers.js';

// Import des nouvelles classes de calcul
import { Calculator } from './core/Calculator.js';
import { Strategy } from './core/Strategy.js';
import { FindBestStrategy } from './core/Calculator.js';

/**
 * Application principale Upways - Version 3.0 avec nouvelles mécaniques
 */
class UpwaysApp {
    constructor() {
        // Services
        this.dataService = new DataService();
        this.translator = new Translator(this.dataService);
        this.formatters = new Formatters(this.translator);
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
        
        // Configuration
        this.config = {
            showIntervals: true,
            maxLevel: 200,
            enableDebugLogs: false
        };
        
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
        this.handleUrlParams();
        
        try {
            this.dataService.loadSavedSettings();
            this.initComponents();
            this.attachGlobalEvents();
            this.updateLanguage();
            
            console.log('Application initialized with new Calculator/Strategy classes');
            
            if (this.config.enableDebugLogs) {
                console.log('Debug mode enabled');
                console.log('Available classes:', { Calculator, Strategy, FindBestStrategy });
            }
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
        
        // Activer le mode debug si présent dans l'URL
        if (urlParams.get('debug') === 'true') {
            this.config.enableDebugLogs = true;
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
        
        // Configuration initiale
        this.analysisComponent.setShowIntervals(this.config.showIntervals);
    }

    attachGlobalEvents() {
        // Sélecteur de langue
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

    initCustomLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        const button = document.getElementById('languageSelectorButton');
        const dropdown = document.getElementById('languageDropdown');
        const options = dropdown.querySelectorAll('.language-option');

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            selector.classList.toggle('open');
        });

        options.forEach(option => {
            option.addEventListener('click', async () => {
                const lang = option.dataset.lang;
                
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

        document.addEventListener('click', (e) => {
            if (!selector.contains(e.target)) {
                selector.classList.remove('open');
            }
        });
    }

    updateLanguageSelector() {
        const lang = this.translator.getLanguage();
        const button = document.getElementById('languageSelectorButton');
        const dropdown = document.getElementById('languageDropdown');
        
        const selectedOption = dropdown.querySelector(`[data-lang="${lang}"]`);
        if (selectedOption) {
            const flagSvg = selectedOption.querySelector('.language-flag').cloneNode(true);
            const languageName = selectedOption.querySelector('span').textContent;
            
            const buttonFlag = button.querySelector('.language-flag');
            const buttonName = button.querySelector('.language-name');
            
            buttonFlag.parentNode.replaceChild(flagSvg, buttonFlag);
            buttonName.textContent = languageName;
            
            dropdown.querySelectorAll('.language-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.lang === lang);
            });
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

    /**
     * Gestion des événements
     */
    async onItemSelected(itemId, itemName) {
        // Valider que l'item peut être amélioré
        const validation = await this.dataService.validateUpgradeRange(itemId, 0, 9);
        if (!validation.valid) {
            this.uiState.showToast('error', this.translator.t('invalidItem'));
            return;
        }
        
        // Réinitialiser si changement d'objet
        if (this.currentItemId && this.currentItemId !== itemId && Object.keys(this.strategies).length > 0) {
            this.resetAnalysisState();
        }
        
        this.currentItemId = itemId;
        this.currentItemName = itemName;
        await this.configComponent.setCurrentItem(itemId);
        
        // Configurer le composant d'analyse
        const startLevel = this.configComponent.getStartLevel();
        const endLevel = this.configComponent.getEndLevel();
        this.analysisComponent.setAnalysisParams({
            startLevel,
            endLevel,
            itemId
        });
        
        if (this.config.enableDebugLogs) {
            console.log('Item selected:', { itemId, itemName, startLevel, endLevel });
        }
    }

    resetAnalysisState() {
        this.strategies = {};
        
        const analysisTabBtn = document.getElementById('analysisTabBtn');
        if (analysisTabBtn) {
            analysisTabBtn.classList.add('disabled');
        }
        
        this.switchTab('config');
        
        if (this.chartComponent) {
            this.chartComponent.reset();
        }
    }

    onConfigChanged(change) {
        if (change.type === 'levels') {
            this.strategies = {};
            
            if (this.currentItemId) {
                this.analysisComponent.setAnalysisParams({
                    startLevel: change.startLevel,
                    endLevel: change.endLevel,
                    itemId: this.currentItemId
                });
            }
        } else if (change.type === 'price' && this.analysisComponent.getCurrentStrategy() === 'custom' && Object.keys(this.strategies).length > 0) {
            this.recalculateCustomStrategy();
        }
    }

    onStrategyChanged(change) {
        if (change.type === 'custom') {
            this.recalculateCustomStrategy();
        }
    }

    updateLanguage() {
        const lang = this.translator.getLanguage();
        
        // Mettre à jour l'URL
        const url = new URL(window.location);
        if (lang === 'fr') {
            url.searchParams.delete('lang');
        } else {
            url.searchParams.set('lang', lang);
        }
        window.history.replaceState({}, '', url);
        
        // Mettre à jour le SEO
        this.updateSEO();
        
        // Mettre à jour les composants
        this.updateLanguageSelector();
        this.translator.updatePageTranslations();
        this.searchComponent.updateLanguage();
        this.configComponent.updateLanguage();
        
        if (this.analysisComponent) {
            this.analysisComponent.updateLanguage();
        }
        
        if (this.chartComponent) {
            this.chartComponent.updateLanguage();
        }
    }

    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });
    }

    /**
     * Lance l'analyse avec les nouvelles classes Calculator et Strategy
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

        // Valider la plage
        const validation = await this.dataService.validateUpgradeRange(this.currentItemId, startLevel, endLevel);
        if (!validation.valid) {
            let errorMsg = this.translator.t('invalidLevelRange');
            if (validation.error === 'endLevelTooHigh') {
                errorMsg = this.translator.t('maxLevelExceeded').replace('{max}', validation.maxLevel);
            }
            this.uiState.showToast('error', errorMsg);
            return;
        }

        this.uiState.showLoading(this.translator.t('calculating'));
        
        const startTime = Date.now();
        
        try {
            // Configurer le composant d'analyse
            this.analysisComponent.setAnalysisParams({
                startLevel,
                endLevel,
                itemId: this.currentItemId
            });
            
            // Calculer les stratégies
            await this.calculateAllStrategies();
            
            // Débloquer l'onglet analyse
            const analysisTabBtn = document.getElementById('analysisTabBtn');
            if (analysisTabBtn) {
                analysisTabBtn.classList.remove('disabled');
            }
            
            // Passer à l'onglet analyse
            this.switchTab('analysis');
            
            // Afficher les résultats
            this.analysisComponent.setStrategies(this.strategies);
            this.analysisComponent.selectStrategy('optimal');
            
            // Dessiner le graphique
            this.chartComponent.drawTrialsProbabilityChart(this.strategies.optimal);
            
            const elapsedTime = Date.now() - startTime;
            if (this.config.enableDebugLogs) {
                console.log(`Analysis completed in ${elapsedTime}ms`);
                console.log('Strategies:', this.strategies);
            }
            
            this.uiState.showToast('success', this.translator.t('analysisComplete'));
        } catch (error) {
            console.error('Analysis error:', error);
            this.uiState.showToast('error', this.translator.t('errorAnalysis'));
        } finally {
            this.uiState.hideLoading();
        }
    }

    /**
     * Calcule toutes les stratégies avec les nouvelles classes
     */
    async calculateAllStrategies() {
        const startLevel = this.configComponent.getStartLevel();
        const endLevel = this.configComponent.getEndLevel();
        const customScenario = this.analysisComponent.getCustomScenario();

        try {
            if (this.config.enableDebugLogs) {
                console.log('Calculating strategies:', { startLevel, endLevel, customScenario });
            }
            
            const [optimal, custom] = await Promise.all([
                this.strategyService.calculateOptimalStrategy(this.currentItemId, startLevel, endLevel),
                this.strategyService.calculateCustomStrategy(customScenario, this.currentItemId, startLevel, endLevel)
            ]);
            
            this.strategies = { optimal, custom };
            
            if (this.config.enableDebugLogs) {
                console.log('Optimal strategy:', optimal);
                console.log('Custom strategy:', custom);
            }
        } catch (error) {
            console.error('Strategy calculation error:', error);
            throw error;
        }
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
            
            await this.analysisComponent.displayStrategyDetails();
            
            if (this.analysisComponent.getCurrentStrategy() === 'custom') {
                this.chartComponent.update(custom);
            }
            
            if (this.config.enableDebugLogs) {
                console.log('Custom strategy recalculated:', custom);
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

            const translatedItemName = this.dataService.itemNames[this.currentItemId] || `Item ${this.currentItemId}`;

            await this.exportService.exportResults(
                strategy,
                translatedItemName,
                this.currentItemId,
                this.configComponent.getStartLevel(),
                this.configComponent.getEndLevel(),
                this.dataService,
                { 
                    mode: 'share',
                    strategyType: currentStrategy // Ajout du type de stratégie
                }
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
            document.getElementById('analysisTabBtn').classList.add('disabled');
            location.reload();
        }
    }

    /**
     * Configure l'affichage des intervalles
     */
    setShowIntervals(show) {
        this.config.showIntervals = show;
        if (this.analysisComponent) {
            this.analysisComponent.setShowIntervals(show);
        }
    }

    /**
     * Active/désactive le mode debug
     */
    setDebugMode(enabled) {
        this.config.enableDebugLogs = enabled;
        console.log('Debug mode:', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Nettoyage
     */
    destroy() {
        if (this.searchComponent) this.searchComponent.destroy();
        if (this.configComponent) this.configComponent.destroy();
        if (this.analysisComponent) this.analysisComponent.destroy();
        if (this.chartComponent) this.chartComponent.destroy();
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UpwaysApp();
    
    window.addEventListener('beforeunload', () => {
        if (window.app) {
            window.app.destroy();
        }
    });
});