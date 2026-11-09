// Import des modules
import { DataService } from './services/DataService.js';
import { StrategyService } from './services/StrategyService.js';
import { ExportService } from './services/ExportService.js';
import { AnalyticsService } from './services/AnalyticsService.js';

import { SearchComponent } from './components/SearchComponent.js';
import { ConfigComponent } from './components/ConfigComponent.js';
import { AnalysisComponent } from './components/AnalysisComponent.js';
import { ChartComponent } from './components/ChartComponent.js';
import { TutorialComponent } from './components/TutorialComponent.js';
import { DmDcComponent } from './components/DmDcComponent.js';

import { Translator } from './utils/translator.js';
import { Formatters } from './utils/formatters.js';
import { UIState, showToast, confirm } from './utils/ui-helpers.js';

// Import des nouvelles classes de calcul
import { Calculator } from './core/Calculator.js';
import { Strategy } from './core/Strategy.js';
import { FindBestStrategy } from './core/Calculator.js';
import { ENGINE_VERSION, ENGINE_BUILD_DATE } from './core/Constants.js';

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
        this.analytics = new AnalyticsService(); // inactif tant que l'identifiant Umami est vide
        this.uiState = new UIState();

        // Composants
        this.searchComponent = null;
        this.configComponent = null;
        this.analysisComponent = null;
        this.chartComponent = null;
        this.tutorialComponent = null;
        this.dmdcComponent = null;

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
                title: "Upways - Calculateur amélioration Metin2 | Optimise tes upgrades",
                description: "Calcule la meilleure stratégie pour améliorer tes objets dans Metin2. Économise temps et yang avec Upways, l'optimiseur d'amélioration gratuit.",
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
                description: "Metin2'de eşyalarını yükseltmek için en iyi stratejiyi hesapla. Upways ile zaman ve yang tasarrufu yap.",
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

            // Appliquer une configuration partagée via URL si présente (après init des composants)
            if (this._pendingSharedConfig) {
                const cfg = this._pendingSharedConfig;
                this._pendingSharedConfig = null;
                // Laisser le temps aux composants de finir leur montage
                setTimeout(() => {
                    this.configComponent.applySharedConfig(cfg);
                }, 150);
            }

            // G2 : Démarrer le tutoriel au premier lancement (hors flux de partage)
            // On laisse quelques centaines de ms pour que l'UI soit totalement rendue.
            if (!this._pendingSharedConfig) {
                setTimeout(() => {
                    this.tutorialComponent?.start({ force: false });
                }, 600);
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

        // Décodage d'un lien de partage : ?share=<base64 URL-safe JSON>
        const share = urlParams.get('share');
        if (share) {
            try {
                // Reconstitution base64 standard + padding
                let b64 = share.replace(/-/g, '+').replace(/_/g, '/');
                while (b64.length % 4 !== 0) b64 += '=';
                const json = decodeURIComponent(escape(atob(b64)));
                const parsed = JSON.parse(json);
                if (parsed && typeof parsed === 'object') {
                    this._pendingSharedConfig = parsed;
                    // Si le lien contient une langue, la poser maintenant pour que l'UI
                    // s'affiche directement dans la bonne langue au premier render
                    if (parsed.language && this.translator.isLanguageAvailable(parsed.language)) {
                        this.translator.setLanguage(parsed.language);
                    }
                }
            } catch (e) {
                console.error('Invalid share param:', e);
                // Toast différé : translator pas encore prêt à 100 % ici
                setTimeout(() => {
                    this.uiState.showToast('error', this.translator.t('shareInvalid'));
                }, 300);
            }
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

        // Composant du tutoriel (G2)
        this.tutorialComponent = new TutorialComponent(this.translator, this.dataService);

        // Section Probabilités DM/DC (onglet Analyse, objets concernés uniquement)
        this.dmdcComponent = new DmDcComponent(this.translator);

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

        // Raccourcis navigation analyse → config
        document.querySelectorAll('.analysis-nav-step[data-goto-step]').forEach(dot => {
            dot.addEventListener('click', () => {
                const step = parseInt(dot.dataset.gotoStep, 10);
                this.switchTab('config');
                this.configComponent.goToStep(step, true);
            });
        });
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
                    this.analytics.track('langue', { langue: lang });
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

        const localeMap = { fr: 'fr_FR', en: 'en_US', ro: 'ro_RO', tr: 'tr_TR', de: 'de_DE' };
        const baseUrl = 'https://metin2upways.com';
        const pageUrl = lang === 'fr' ? baseUrl : `${baseUrl}/?lang=${lang}`;

        // Titre + description standard
        document.title = seo.title + ' | ' + new Date().getFullYear();

        const setMeta = (selector, value) => {
            const el = document.querySelector(selector);
            if (el) el.content = value;
        };
        const setAttr = (selector, attr, value) => {
            const el = document.querySelector(selector);
            if (el) el.setAttribute(attr, value);
        };

        setMeta('meta[name="description"]',       seo.description);
        setMeta('meta[name="keywords"]',           seo.keywords);

        // Open Graph
        setAttr('meta[property="og:url"]',         'content', pageUrl);
        setMeta('meta[property="og:title"]',       seo.title);
        setMeta('meta[property="og:description"]', seo.description);
        setMeta('meta[property="og:locale"]',      localeMap[lang] || 'fr_FR');

        // Twitter / X
        setMeta('meta[name="twitter:title"]',       seo.title);
        setMeta('meta[name="twitter:description"]', seo.description);

        // Attribut lang du document
        document.documentElement.lang = lang;

        // URL canonique
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.href = pageUrl;
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
            itemId,
            itemName
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

        if (this.dmdcComponent) {
            this.dmdcComponent.hide();
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
        } else if (change.type === 'guildBlacksmith') {
            // Recalculer le scénario hybride si une analyse est disponible
            if (Object.keys(this.strategies).length > 0) {
                this.recalculateGuildStrategy();
            }
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

        // Footer : moteur de calcul (version + date de mise à jour)
        this.updateEngineInfo();
    }

    updateEngineInfo() {
        const el = document.getElementById('engineInfo');
        if (!el) return;
        const lang = this.translator.getLanguage();
        const label = this.translator.t('engineLabel');
        const updatedOn = this.translator.t('engineUpdatedOn');
        // Date formatée selon la locale (ex : "16 avril 2026" / "April 16, 2026")
        const formattedDate = new Date(ENGINE_BUILD_DATE + 'T00:00:00').toLocaleDateString(lang, {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        el.textContent = `${label} v${ENGINE_VERSION} · ${updatedOn} ${formattedDate}`;
        el.title = `Build ${ENGINE_BUILD_DATE}`;
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
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
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

        // ── Transition de lancement ──
        // La fusée et les feux d'artifice ne sont joués qu'une fois par session,
        // et jamais si le système demande de réduire les animations.
        const overlay = document.getElementById('loadingOverlay');
        const btn     = document.getElementById('analyzeBtn');
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        let launchAlreadyPlayed = false;
        try { launchAlreadyPlayed = sessionStorage.getItem('upways.launchPlayed') === '1'; } catch (e) { /* stockage indisponible */ }
        const playLaunch = !reduceMotion && !launchAlreadyPlayed;

        if (playLaunch) {
            // Animer le bouton (fusée qui décolle) et afficher l'overlay en mode launch
            if (btn) btn.classList.add('launching');
            if (overlay) overlay.classList.add('launch-mode');
            this._spawnLaunchStars();
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
            if (analysisTabBtn) analysisTabBtn.classList.remove('disabled');

            // Préparer l'onglet analyse SOUS l'overlay (invisible pour l'instant)
            this.switchTab('analysis');
            this.analysisComponent.setStrategies(this.strategies);
            this.analysisComponent.selectStrategy('optimal');
            this.chartComponent.drawTrialsProbabilityChart(this.strategies.optimal);
            this.dmdcComponent.setItem(this.currentItemId);

            // Marquer l'onglet pour l'animation d'entrée en échelons
            const analysisTab = document.getElementById('analysisTab');
            if (analysisTab && !reduceMotion) analysisTab.classList.add('revealing');

            if (playLaunch) {
                // Lever le rideau → révèle les résultats
                await this._playReveal(overlay);
                try { sessionStorage.setItem('upways.launchPlayed', '1'); } catch (e) { /* stockage indisponible */ }
            }

            // Nettoyer la classe d'animation
            setTimeout(() => analysisTab?.classList.remove('revealing'), 700);

            const analysedName = this.formatters.removeUpgradeLevel(this.dataService.itemNames[this.currentItemId] || '');
            this.analytics.track('analyse', {
                objet: Number(this.currentItemId),
                nom: analysedName,
                de: startLevel,
                a: endLevel,
                langue: this.translator.getLanguage()
            });

            const elapsedTime = Date.now() - startTime;
            if (this.config.enableDebugLogs) {
                console.log(`Analysis completed in ${elapsedTime}ms`);
                console.log('Strategies:', this.strategies);
            }
        } catch (error) {
            console.error('Analysis error:', error);
            this.uiState.showToast('error', this.translator.t('errorAnalysis'));
        } finally {
            if (btn) btn.classList.remove('launching');
            // display:none d'abord, puis nettoyage des classes (évite tout flash)
            this.uiState.hideLoading();
            if (overlay) overlay.classList.remove('launch-mode', 'curtain-exit');
        }
    }

    /**
     * Crée les étoiles scintillantes dans l'overlay de lancement
     */
    _spawnLaunchStars() {
        const container = document.getElementById('launchStars');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 55; i++) {
            const star = document.createElement('div');
            star.className = 'launch-star';
            star.style.cssText = [
                `left:${Math.random() * 100}%`,
                `top:${Math.random() * 100}%`,
                `--dur:${(1.5 + Math.random() * 2).toFixed(2)}s`,
                `--delay:${(Math.random() * 2).toFixed(2)}s`,
                `width:${Math.random() < 0.3 ? 3 : 2}px`,
                `height:${Math.random() < 0.3 ? 3 : 2}px`
            ].join(';');
            container.appendChild(star);
        }
    }

    /**
     * Lève le rideau (overlay glisse vers le haut) puis nettoie.
     * NB : on ne retire PAS curtain-exit ici pour éviter un flash.
     *      C'est le finally de runAnalysis qui remet display:none puis nettoie les classes.
     */
    _playReveal(overlay) {
        return new Promise(resolve => {
            if (!overlay) { resolve(); return; }

            // Petit délai pour laisser le DOM de l'analyse se rendre
            setTimeout(() => {
                overlay.classList.add('curtain-exit');
                // Déclencher les feux d'artifice au moment où le rideau commence à monter
                setTimeout(() => this._addFireworks(), 300);

                let resolved = false;
                const done = () => {
                    if (resolved) return;
                    resolved = true;
                    resolve();
                };
                overlay.addEventListener('animationend', done, { once: true });
                // Sécurité : résoudre après 1600ms (animation 1.4s + marge)
                setTimeout(done, 1600);
            }, 80);
        });
    }

    /**
     * Lance des feux d'artifice sur l'écran au moment de la révélation
     */
    _addFireworks() {
        // Couleurs vives pour les particules
        const colors = ['#7c3aed','#a78bfa','#60a5fa','#34d399','#fbbf24','#f472b6','#fb923c'];

        // Créer un conteneur overlay temporaire
        const container = document.createElement('div');
        container.className = 'firework-container';
        document.body.appendChild(container);

        const burst = (cx, cy) => {
            const particleCount = 18 + Math.floor(Math.random() * 10);
            for (let i = 0; i < particleCount; i++) {
                const angle   = (i / particleCount) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
                const dist    = 60 + Math.random() * 110;
                const tx      = Math.cos(angle) * dist;
                const ty      = Math.sin(angle) * dist;
                const color   = colors[Math.floor(Math.random() * colors.length)];
                const size    = 4 + Math.random() * 5;
                const dur     = (0.8 + Math.random() * 0.6).toFixed(2);
                const delay   = (Math.random() * 0.15).toFixed(2);

                const p = document.createElement('div');
                p.className = 'firework-particle';
                p.style.cssText = [
                    `left:${cx}px`, `top:${cy}px`,
                    `width:${size}px`, `height:${size}px`,
                    `background:${color}`,
                    `box-shadow:0 0 ${size * 2}px ${color}`,
                    `--tx:${tx}px`, `--ty:${ty}px`,
                    `--dur:${dur}s`, `--delay:${delay}s`
                ].join(';');
                container.appendChild(p);
            }
        };

        // Positions des explosions (en % de la fenêtre)
        const positions = [
            [0.25, 0.25], [0.5, 0.2], [0.75, 0.3],
            [0.15, 0.5],  [0.85, 0.45], [0.4, 0.55],
            [0.6, 0.15],  [0.5, 0.6]
        ];

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        positions.forEach(([px, py], idx) => {
            setTimeout(() => burst(px * vw, py * vh), idx * 120);
        });

        // Supprimer le conteneur après la fin des animations
        setTimeout(() => container.remove(), 3000);
    }

    /**
     * Calcule toutes les stratégies avec les nouvelles classes
     */
    async calculateAllStrategies() {
        const startLevel = this.configComponent.getStartLevel();
        const endLevel   = this.configComponent.getEndLevel();
        const customScenario = this.analysisComponent.getCustomScenario();

        try {
            if (this.config.enableDebugLogs) {
                console.log('Calculating strategies:', { startLevel, endLevel, customScenario });
            }

            // Stratégie optimale, puis personnalisée : tant que l'utilisateur ne l'a pas
            // modifiée, la personnalisée part du chemin optimal
            const optimal = await this.strategyService.calculateOptimalStrategy(this.currentItemId, startLevel, endLevel);
            this.analysisComponent.seedCustomScenarioFrom(optimal);
            const custom = await this.strategyService.calculateCustomStrategy(
                this.analysisComponent.getCustomScenario(), this.currentItemId, startLevel, endLevel
            );

            this.strategies = { optimal, custom };

            // Forgeron de guilde hybride (toujours calculé si endLevel ≤ 9)
            if (endLevel <= 9) {
                try {
                    const baseItemPrice = this.dataService.getBaseItemPrice(this.currentItemId);
                    const guildBlacksmith = await this.strategyService.calculateHybridGuildStrategy(
                        this.currentItemId, endLevel, baseItemPrice
                    );
                    this.strategies.guildBlacksmith = guildBlacksmith;
                } catch (guildError) {
                    console.warn('Hybrid guild calculation failed:', guildError);
                    this.strategies.guildBlacksmith = null;
                }
            } else {
                this.strategies.guildBlacksmith = null;
            }

            if (this.config.enableDebugLogs) {
                console.log('Optimal strategy:', optimal);
                console.log('Custom strategy:', custom);
                console.log('Guild blacksmith strategy:', this.strategies.guildBlacksmith);
            }
        } catch (error) {
            console.error('Strategy calculation error:', error);
            throw error;
        }
    }

    /**
     * Recalcule uniquement le scénario hybride forgeron de guilde
     */
    async recalculateGuildStrategy() {
        if (!this.strategies.optimal) return;

        const endLevel = this.configComponent.getEndLevel();

        if (endLevel > 9) {
            this.strategies.guildBlacksmith = null;
            this.analysisComponent.setStrategies(this.strategies);
            return;
        }

        this.uiState.showLoading(this.translator.t('calculating'));

        try {
            const baseItemPrice = this.dataService.getBaseItemPrice(this.currentItemId);
            const guildBlacksmith = await this.strategyService.calculateHybridGuildStrategy(
                this.currentItemId, endLevel, baseItemPrice
            );

            this.strategies.guildBlacksmith = guildBlacksmith;
            this.analysisComponent.setStrategies(this.strategies);

        } catch (error) {
            console.error('Hybrid guild recalculation error:', error);
        } finally {
            this.uiState.hideLoading();
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
            this.analytics.track('export', { strategie: currentStrategy });
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
        if (this.dmdcComponent) this.dmdcComponent.destroy();
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