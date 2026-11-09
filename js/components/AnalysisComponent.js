/**
 * Composant d'affichage des résultats d'analyse - Version 3.6
 * Suppression du CSS intégré et simplification de l'affichage
 */
export class AnalysisComponent {
    constructor(dataService, translator, formatters, onStrategyChanged) {
        this.dataService = dataService;
        this.translator = translator;
        this.formatters = formatters;
        this.onStrategyChanged = onStrategyChanged;
        
        this.currentStrategy = 'optimal';
        this.strategies = {};
        this.customScenario = {}; // Changé en objet pour correspondre au format attendu
        this.startLevel = 0;
        this.endLevel = 9;
        this.currentItemId = null;
        this.showIntervals = true;
        this.tooltipInstances = [];
        this.expandedGroups = new Set();
        this._preparationConfidence = 'mean'; // Confiance par défaut : moyenne (réinitialisée à chaque analyse)
        this._preparationScaleFactor = 1; // Facteur d'échelle (P_percentile / moyenne)
        this._preparationMeta = { scaleFactor: 1, isMean: true }; // Métadonnées du calcul courant
        
        this.initElements();
        this.attachEvents();
        this.initTooltip();
        
        // S'abonner aux changements de langue
        this.translator.addObserver(this);
    }

    initElements() {
        this.elements = {
            analysisLevels: document.getElementById('analysisLevels'),
            scenariosPanel: document.getElementById('scenariosPanel'),
            // Pointent vers l'onglet actif (mis à jour dans selectStrategy)
            upgradePath:      document.querySelector('#pane-optimal .pane-path'),
            // Tooltip
            tooltip:        document.getElementById('tooltip'),
            tooltipContent: document.getElementById('tooltipContent')
        };
    }

    attachEvents() {
        // Sélection d'onglet de scénario (onglets cachés, compatibilité interne)
        document.querySelectorAll('.scenario-tab').forEach(btn => {
            btn.addEventListener('click', () => this.selectStrategy(btn.dataset.tab));
        });
        // Sélection via les cartes côte à côte
        document.querySelectorAll('.strategy-card[data-tab]').forEach(card => {
            card.addEventListener('click', () => this.selectStrategy(card.dataset.tab));
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectStrategy(card.dataset.tab);
                }
            });
        });
    }

    initTooltip() {
        this.tooltip = this.elements.tooltip;
        this.tooltipContent = this.elements.tooltipContent;
    }

    /**
     * Gestion des événements de traduction
     */
    onTranslationEvent(event, data) {
        if (event === 'languageChanged' || event === 'tooltipsNeedUpdate') {
            this.updateLanguage();
        }
    }

    /**
     * Configure l'affichage des intervalles
     */
    setShowIntervals(show) {
        this.showIntervals = show;
        if (this.strategies.optimal) {
            this.updateScenarioTabs();
            this.renderCurrentPane();
        }
    }

    /**
     * Définit les stratégies calculées
     */
    setStrategies(strategies) {
        this.strategies = strategies;
        // Réinitialiser la confiance cible à "Moyenne" à chaque nouvelle analyse
        this._preparationConfidence = 'mean';
        this._preparationScaleFactor = 1;
        this._preparationMeta = { scaleFactor: 1, isMean: true };
        this.updateScenarioTabs();
        this.renderCurrentPane();
    }

    /**
     * Définit les paramètres de l'analyse
     */
    setAnalysisParams(params) {
        this.startLevel = params.startLevel;
        this.endLevel = params.endLevel;
        this.currentItemId = params.itemId;
        
        // Mettre à jour l'objet sélectionné
        const selectedItemDiv = document.getElementById('analysisSelectedItem');
        const itemImage = document.getElementById('analysisItemImage');
        const itemNameElement = document.getElementById('analysisItemName');
        
        if (this.currentItemId) {
            const itemName = this.dataService.itemNames[this.currentItemId] || `Item ${this.currentItemId}`;
            const displayName = this.formatters.removeUpgradeLevel(itemName);
            
            selectedItemDiv.style.display = 'flex';
            itemImage.src = this.dataService.getItemImagePath(this.currentItemId);
            itemImage.alt = displayName;
            itemNameElement.textContent = displayName;

            // Mettre à jour les niveaux
            selectedItemDiv.querySelector('.level-start').textContent = `+${this.startLevel}`;
            selectedItemDiv.querySelector('.level-end').textContent = `+${this.endLevel}`;
        } else {
            selectedItemDiv.style.display = 'none';
        }
        
        // Initialiser le scénario personnalisé (il sera recalé sur l'optimal au calcul)
        this.initCustomScenario();
        this._customScenarioEdited = false;
    }

    /**
     * Recale le scénario personnalisé sur le chemin optimal, tant que l'utilisateur
     * ne l'a pas modifié lui-même : « Personnalisé » part du meilleur chemin.
     */
    seedCustomScenarioFrom(strategy) {
        if (this._customScenarioEdited || !Array.isArray(strategy?.fullPath)) return;
        this.initCustomScenario();
        for (let level = 0; level < this.endLevel; level++) {
            const name = strategy.fullPath[level];
            if (name && this.dataService.UPGRADE_ITEM_IDS?.[name] !== undefined) {
                this.customScenario[level] = name;
            }
        }
    }

    /**
     * Initialise le scénario personnalisé avec le chemin complet
     * Utilise maintenant un objet pour être compatible avec les nouvelles classes
     */
    initCustomScenario() {
        this.customScenario = {};
        
        // Initialiser pour tous les niveaux
        for (let level = 0; level < this.endLevel; level++) {
            if (level >= 9) {
                this.customScenario[level] = "Pierre magique";
            } else if (level <= 3) {
                this.customScenario[level] = "Parchemin de Guerre";
            } else {
                this.customScenario[level] = "Parchemin du Dieu Dragon";
            }
        }
    }

    /**
     * Met à jour les coûts affichés dans les boutons d'onglets
     */
    updateScenarioTabs() {
        const tabCosts = {
            optimal:          document.getElementById('tabCostOptimal'),
            custom:           document.getElementById('tabCostCustom'),
            guildBlacksmith:  document.getElementById('tabCostGuild')
        };
        Object.entries(tabCosts).forEach(([key, el]) => {
            if (!el) return;
            const strategy = this.strategies[key];
            el.textContent = strategy ? this.formatters.formatCost(strategy.totalCost || 0) : '';
        });

        // Afficher/masquer l'onglet forgeron de guilde (onglet caché + carte)
        const guildTab = document.querySelector('.scenario-tab[data-tab="guildBlacksmith"]');
        if (guildTab) {
            guildTab.style.display = this.strategies.guildBlacksmith ? '' : 'none';
        }
        const guildCard = document.getElementById('stratCard-guildBlacksmith');
        if (guildCard) {
            guildCard.style.display = this.strategies.guildBlacksmith ? '' : 'none';
        }
        // Mettre à jour l'icône d'avertissement
        document.querySelectorAll('.tab-warning-icon').forEach(icon => {
            icon.title = this.translator.t('destructionWarning');
        });

        // Si l'onglet actif est guild mais qu'il n'y a plus de stratégie, basculer
        if (this.currentStrategy === 'guildBlacksmith' && !this.strategies.guildBlacksmith) {
            this.selectStrategy('optimal');
        }

        // Mettre à jour les stats de toutes les cartes
        this.updateAllCardStats();
    }

    /**
     * Met à jour les statistiques affichées dans chaque carte de scénario
     */
    updateAllCardStats() {
        ['optimal', 'custom', 'guildBlacksmith'].forEach(key => {
            const strategy = this.strategies[key];
            const cardStats = document.getElementById(`cardStats-${key}`);
            if (!cardStats || !strategy) return;
            cardStats.innerHTML = this.buildPaneStatsHtml(key, strategy, true);
        });
        // Positionner le slider après le rendu
        requestAnimationFrame(() => this.slideTabSlider(this.currentStrategy, true));
    }

    /**
     * Déplace le fond coloré (tab-slider) vers la carte du scénario donné.
     * @param {string} key   – clé du scénario ('optimal', 'custom', 'guildBlacksmith')
     * @param {boolean} instant – true pour un placement immédiat (sans animation)
     */
    slideTabSlider(key, instant = false) {
        const slider = document.getElementById('tabSlider');
        const card   = document.getElementById(`stratCard-${key}`);
        const grid   = document.getElementById('strategiesComparison');
        if (!slider || !card || !grid) return;

        const gridRect = grid.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();

        // Coordonnées relatives à la grille
        const left   = cardRect.left - gridRect.left;
        const top    = cardRect.top  - gridRect.top;
        const width  = cardRect.width;
        const height = cardRect.height;

        // Désactiver la transition pour le placement initial
        if (instant) {
            slider.style.transition = 'none';
        }

        slider.style.left   = `${left}px`;
        slider.style.top    = `${top}px`;
        slider.style.width  = `${width}px`;
        slider.style.height = `${height}px`;

        // Variante de couleur du slider
        slider.classList.toggle('guild', key === 'guildBlacksmith');
        slider.classList.toggle('custom', key === 'custom');

        // Réactiver la transition après le placement initial
        if (instant) {
            // Force le reflow avant de réactiver
            slider.offsetHeight;  // eslint-disable-line no-unused-expressions
            slider.style.transition = '';
        }

        // Mettre à jour sur redimensionnement (une seule fois)
        if (!this._sliderRO) {
            this._sliderRO = new ResizeObserver(() => {
                requestAnimationFrame(() => this.slideTabSlider(this.currentStrategy, true));
            });
            this._sliderRO.observe(grid);
        }
    }

    /**
     * Rend le contenu du panneau de l'onglet actif
     */
    async renderCurrentPane() {
        const key      = this.currentStrategy;
        const strategy = this.strategies[key];
        if (!strategy) return;

        const pane = document.getElementById(`pane-${key}`);
        if (!pane) return;

        // Mettre à jour les refs d'éléments
        this.elements.upgradePath      = pane.querySelector('.pane-path');

        // Calculer le scaleFactor de la confiance cible en amont (utilisé par path + prep)
        this._updatePreparationMeta(strategy, this._preparationConfidence);

        // Rendre les stats résumées (absentes du pane forgeron → statsEl est null)
        const statsEl = pane.querySelector('.pane-stats');
        if (statsEl) statsEl.innerHTML = this.buildPaneStatsHtml(key, strategy);

        // Mettre à jour les stats dans la section chart (intervalles + légende)
        this.updateChartStats(key, strategy);

        // Rendre l'entête du chemin (bandeau guild + sélecteur de confiance)
        this._renderPathHeader(pane, strategy);

        // Rendre la liste de préparation (description + résultat, sans sélecteur)
        await this.displayPreparationList(strategy);

        // Rendre le chemin selon le type de stratégie
        if (strategy.type === 'hybrid') {
            await this.renderHybridDetails(strategy, pane);
        } else {
            await this.displayUpgradePath(strategy);
        }
    }

    /**
     * Rend le header du chemin d'amélioration : bandeau P(succès/objet) pour le
     * forgeron de guilde + sélecteur de confiance ciblée.
     */
    _renderPathHeader(pane, strategy) {
        const header = pane.querySelector('.pane-path-header');
        if (!header) return;

        const distribution = strategy.distribution || [];
        const meanTrials = strategy.intervals?.total?.mean || strategy.totalTrials || 1;
        const meanPct = distribution.length > 0 ? this.getCdfAtValue(distribution, meanTrials) : 50;

        const pct = this._preparationConfidence;
        const meanActive = pct === 'mean' ? 'active' : '';
        const medianActive = pct === 50 ? 'active' : '';

        const meanLabel = this.translator.t('avgTrialsShort');
        const medianLabel = this.translator.t('medianShort');

        // Bouton Moyenne : "Moyenne (57 %)", bouton Médiane : "Médiane (50 %)"
        const meanBtn = `<button class="prep-confidence-btn prep-mean-btn ${meanActive}" data-pct="mean">${meanLabel}\u00a0(${meanPct}\u202f%)</button>`;
        const medianBtn = `<button class="prep-confidence-btn prep-median-btn ${medianActive}" data-pct="50">${medianLabel}\u00a0(50\u202f%)</button>`;
        const pctButtons = [70, 80, 90, 95, 99].map(p => {
            const isActive = p === pct ? 'active' : '';
            return `<button class="prep-confidence-btn ${isActive}" data-pct="${p}">${p}\u202f%</button>`;
        }).join('');

        // Bandeau P(succès/objet) pour le forgeron de guilde
        let guildBanner = '';
        if (strategy.type === 'hybrid' && strategy.pSuccessGuild != null) {
            const pPct = (strategy.pSuccessGuild * 100).toFixed(2) + '\u202f%';
            const bannerLabel = this.translator.t('guildSuccessPerItem') || 'P(succès/objet)';
            guildBanner = `
                <div class="guild-info-banner">
                    <span class="guild-info-icon">🎯</span>
                    <span class="guild-info-label">${bannerLabel}</span>
                    <span class="guild-info-value"><strong>${pPct}</strong></span>
                </div>`;
        }

        // Phrase de vulgarisation générale sur la confiance ciblée
        const explain = this.translator.t('preparationExplanation') || '';

        header.innerHTML = `
            ${guildBanner}
            <div class="prep-confidence-selector">
                <span class="prep-confidence-label">${this.translator.t('preparationConfidenceLabel')}</span>
                <div class="prep-confidence-options">
                    ${meanBtn}
                    ${medianBtn}
                    ${pctButtons}
                </div>
            </div>
            ${explain ? `<div class="prep-explain">${explain}</div>` : ''}
        `;

        // Attacher les handlers des boutons du sélecteur
        header.querySelectorAll('.prep-confidence-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const rawPct = btn.dataset.pct;
                this._preparationConfidence = rawPct === 'mean' ? 'mean' : parseInt(rawPct, 10);
                // Recalcul et re-rendu complet
                await this.renderCurrentPane();
            });
        });
    }

    /**
     * Construit le HTML des statistiques résumées pour un onglet
     */
    buildPaneStatsHtml(key, strategy, forCard = false) {
        const totalCost  = this.formatters.formatCost(strategy.totalCost || 0);
        // isGuild = true si le scénario MDP hybride utilise le forgeron de guilde
        const isGuild    = strategy.type === 'hybrid' && strategy.itemsMode === true;

        // Badge de comparaison vs optimal (pour custom et guild)
        let compBadge = '';
        if (key !== 'optimal' && this.strategies.optimal) {
            const optCost   = this.strategies.optimal.totalCost || 0;
            const thisCost  = strategy.totalCost || 0;
            if (thisCost < optCost) {
                compBadge = `<span class="guild-cheaper-badge">↓ ${this.translator.t('guildBlacksmithCheaper')}</span>`;
            } else if (thisCost > optCost) {
                compBadge = `<span class="guild-expensive-badge">↑ ${this.translator.t('guildBlacksmithExpensive')}</span>`;
            }
        }

        // Intervalles percentiles
        let p5 = 0, p25 = 0, p50 = 0, p75 = 0, p95 = 0, mean = 0;
        if (strategy.intervals?.total?.percentiles) {
            p5  = Math.round(strategy.intervals.total.percentiles.p5);
            p25 = Math.round(strategy.intervals.total.percentiles.p25);
            p50 = Math.round(strategy.intervals.total.percentiles.p50);
            p75 = Math.round(strategy.intervals.total.percentiles.p75);
            p95 = Math.round(strategy.intervals.total.percentiles.p95);
            mean = Math.round(strategy.intervals.total.mean || strategy.totalTrials || 0);
        }

        // Label de la statistique principale (objets pour guild, tentatives pour parchemins)
        const trialsLabel = isGuild
            ? this.translator.t('avgItemsShort')
            : this.translator.t('avgTrialsShort');
        const trialsUnit = '';
        const trialsValue = Math.round(strategy.totalTrials || 0);

        // Infos MDP : politique optimale — segments continus guild/parchemins
        let hybridInfo = '';
        if (isGuild && !forCard) {
            const path = strategy.path || [];

            // Calcul des segments continus (ex: guild +0→+6, scroll +6→+9)
            const segments = [];
            let segType = null, segFrom = null;
            for (const step of path) {
                const type = step.name === 'Forgeron de guilde' ? 'guild' : 'scroll';
                const lvlFrom = step.level - 1;
                if (type !== segType) {
                    if (segType !== null) segments.push({ type: segType, from: segFrom, to: lvlFrom });
                    segType = type; segFrom = lvlFrom;
                }
            }
            if (segType !== null && path.length > 0) {
                segments.push({ type: segType, from: segFrom, to: path[path.length - 1].level });
            }

            const pPct = strategy.pSuccessGuild != null
                ? (strategy.pSuccessGuild * 100).toFixed(2) + '\u202f%'
                : '?';

            const segRows = segments.map(seg => {
                const isGuildSeg = seg.type === 'guild';
                const icon  = isGuildSeg ? '🔨' : '📜';
                const label = isGuildSeg
                    ? this.translator.t('hybridGuildPhase')
                    : this.translator.t('hybridScrollPhase');
                return `
                    <div class="mdp-policy-row ${seg.type}">
                        <span class="mdp-policy-icon">${icon}</span>
                        <span class="mdp-policy-label">${label}</span>
                        <span class="mdp-policy-range">+${seg.from}\u202f→\u202f+${seg.to}</span>
                    </div>`;
            }).join('');

            hybridInfo = `
                <div class="mdp-policy-table">
                    ${segRows}
                    <div class="mdp-policy-row proba">
                        <span class="mdp-policy-icon">🎯</span>
                        <span class="mdp-policy-label">${this.translator.t('guildSuccessPerItem') || 'P(succès/objet)'}</span>
                        <span class="mdp-policy-range"><strong>${pPct}</strong></span>
                    </div>
                </div>`;
        }

        const intervalsHtml = (this.showIntervals && strategy.intervals?.total) ? `
            <div class="interval-display">
                <div class="interval-bar">
                    <div class="interval-line"></div>
                    <div class="interval-marker" style="left:5%">
                        <div class="marker-dot"></div>
                        <div class="marker-label">${p5}</div>
                        <div class="marker-percentile">5%</div>
                    </div>
                    <div class="interval-marker" style="left:25%">
                        <div class="marker-dot secondary"></div>
                        <div class="marker-label">${p25}</div>
                        <div class="marker-percentile">Q1</div>
                    </div>
                    <div class="interval-marker" style="left:50%">
                        <div class="marker-dot primary"></div>
                        <div class="marker-label">${p50}</div>
                        <div class="marker-percentile">${this.translator.t('medianShort')}</div>
                    </div>
                    <div class="interval-marker" style="left:75%">
                        <div class="marker-dot secondary"></div>
                        <div class="marker-label">${p75}</div>
                        <div class="marker-percentile">Q3</div>
                    </div>
                    <div class="interval-marker" style="left:95%">
                        <div class="marker-dot"></div>
                        <div class="marker-label">${p95}</div>
                        <div class="marker-percentile">95%</div>
                    </div>
                </div>
            </div>` : '';

        // Légendes de compréhension des statistiques
        const t = (k, vars = {}) => {
            let s = this.translator.t(k) || k;
            for (const [key, val] of Object.entries(vars)) s = s.replace(`{${key}}`, val);
            return s;
        };
        const meanKey      = isGuild ? 'legendMeanGuild'      : 'legendMean';
        const medianKey    = isGuild ? 'legendMedianGuild'    : 'legendMedian';
        const quartilesKey = isGuild ? 'legendQuartilesGuild' : 'legendQuartiles';
        const extremeKey   = isGuild ? 'legendExtremesGuild'  : 'legendExtremes';

        const statsExplain = `
            <div class="stats-legend">
                <div class="stats-legend-row">
                    <span class="legend-dot legend-mean"></span>
                    <span class="legend-text">
                        <strong>${trialsLabel}</strong> — ${t(meanKey, { n: `<strong>${trialsValue}</strong>` })}
                    </span>
                </div>
                <div class="stats-legend-row">
                    <span class="legend-dot legend-median"></span>
                    <span class="legend-text">
                        <strong>${this.translator.t('medianShort')} (${p50})</strong> — ${t(medianKey, { n: `<strong>${p50}</strong>` })}
                    </span>
                </div>
                ${p25 ? `<div class="stats-legend-row">
                    <span class="legend-dot legend-q"></span>
                    <span class="legend-text">
                        <strong>Q1 (${p25}) / Q3 (${p75})</strong> — ${t(quartilesKey, { q1: `<strong>${p25}</strong>`, q3: `<strong>${p75}</strong>` })}
                    </span>
                </div>` : ''}
                ${p5 ? `<div class="stats-legend-row">
                    <span class="legend-dot legend-ci"></span>
                    <span class="legend-text">
                        <strong>5 %–95 % (${p5}–${p95})</strong> — ${t(extremeKey, { p5: `<strong>${p5}</strong>`, p95: `<strong>${p95}</strong>` })}
                    </span>
                </div>` : ''}
            </div>`;

        // Le sélecteur d'objectif de réussite guild a été remplacé par la liste de préparation

        // Dans le panneau (forCard=false), les intervalles et légendes vont dans la section chart
        const panelTrialsContent = forCard
            ? `<div class="stats-grid">
                        <div class="stat-item highlight">
                            <div class="stat-label">${trialsLabel}</div>
                            <div class="stat-value">${trialsValue}${trialsUnit}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">${this.translator.t('medianShort')}</div>
                            <div class="stat-value">${p50}</div>
                        </div>
                    </div>
                    ${intervalsHtml}
                    ${p50 ? statsExplain : ''}`
            : ''; // panneau : vide, les stats sont dans la section chart

        return `
            <div class="pane-stats-inner">
                <div class="pane-main-cost">
                    <span class="pane-cost-label">${this.translator.t('avgCost')}</span>
                    <span class="pane-cost-value">${totalCost}</span>
                    ${compBadge}
                </div>
                ${hybridInfo}
                ${panelTrialsContent ? `<div class="pane-trials-stats">${panelTrialsContent}</div>` : ''}
            </div>`;
    }

    /**
     * Met à jour la section statistiques dans la zone du graphique (intervalles + légende).
     * Appelée depuis renderCurrentPane() pour afficher les stats du scénario actif.
     */
    updateChartStats(key, strategy) {
        const container = document.getElementById('chartStatsContainer');
        if (!container) return;

        const isGuild = strategy.type === 'hybrid' && strategy.itemsMode === true;

        let p5 = 0, p25 = 0, p50 = 0, p75 = 0, p95 = 0, mean = 0;
        if (strategy.intervals?.total?.percentiles) {
            p5  = Math.round(strategy.intervals.total.percentiles.p5);
            p25 = Math.round(strategy.intervals.total.percentiles.p25);
            p50 = Math.round(strategy.intervals.total.percentiles.p50);
            p75 = Math.round(strategy.intervals.total.percentiles.p75);
            p95 = Math.round(strategy.intervals.total.percentiles.p95);
            mean = Math.round(strategy.intervals.total.mean || strategy.totalTrials || 0);
        }

        if (!p50) { container.innerHTML = ''; return; }

        const trialsLabel = isGuild
            ? this.translator.t('avgItemsShort')
            : this.translator.t('avgTrialsShort');
        const trialsValue = Math.round(strategy.totalTrials || 0);

        // Barre d'intervalles
        const intervalsHtml = (this.showIntervals && strategy.intervals?.total) ? `
            <div class="interval-display">
                <div class="interval-bar">
                    <div class="interval-line"></div>
                    <div class="interval-marker" style="left:5%">
                        <div class="marker-dot"></div>
                        <div class="marker-label">${p5}</div>
                        <div class="marker-percentile">5%</div>
                    </div>
                    <div class="interval-marker" style="left:25%">
                        <div class="marker-dot secondary"></div>
                        <div class="marker-label">${p25}</div>
                        <div class="marker-percentile">Q1</div>
                    </div>
                    <div class="interval-marker" style="left:50%">
                        <div class="marker-dot primary"></div>
                        <div class="marker-label">${p50}</div>
                        <div class="marker-percentile">${this.translator.t('medianShort')}</div>
                    </div>
                    <div class="interval-marker" style="left:75%">
                        <div class="marker-dot secondary"></div>
                        <div class="marker-label">${p75}</div>
                        <div class="marker-percentile">Q3</div>
                    </div>
                    <div class="interval-marker" style="left:95%">
                        <div class="marker-dot"></div>
                        <div class="marker-label">${p95}</div>
                        <div class="marker-percentile">95%</div>
                    </div>
                </div>
            </div>` : '';

        // Légendes explicatives
        const t = (k, vars = {}) => {
            let s = this.translator.t(k) || k;
            for (const [vk, val] of Object.entries(vars)) s = s.replace(`{${vk}}`, val);
            return s;
        };
        const meanKey      = isGuild ? 'legendMeanGuild'      : 'legendMean';
        const medianKey    = isGuild ? 'legendMedianGuild'    : 'legendMedian';
        const quartilesKey = isGuild ? 'legendQuartilesGuild' : 'legendQuartiles';
        const extremeKey   = isGuild ? 'legendExtremesGuild'  : 'legendExtremes';

        const statsExplain = `
            <div class="stats-legend">
                <div class="stats-legend-row">
                    <span class="legend-dot legend-mean"></span>
                    <span class="legend-text">
                        <strong>${trialsLabel}</strong> — ${t(meanKey, { n: `<strong>${trialsValue}</strong>` })}
                    </span>
                </div>
                <div class="stats-legend-row">
                    <span class="legend-dot legend-median"></span>
                    <span class="legend-text">
                        <strong>${this.translator.t('medianShort')} (${p50})</strong> — ${t(medianKey, { n: `<strong>${p50}</strong>` })}
                    </span>
                </div>
                ${p25 ? `<div class="stats-legend-row">
                    <span class="legend-dot legend-q"></span>
                    <span class="legend-text">
                        <strong>Q1 (${p25}) / Q3 (${p75})</strong> — ${t(quartilesKey, { q1: `<strong>${p25}</strong>`, q3: `<strong>${p75}</strong>` })}
                    </span>
                </div>` : ''}
                ${p5 ? `<div class="stats-legend-row">
                    <span class="legend-dot legend-ci"></span>
                    <span class="legend-text">
                        <strong>5 %–95 % (${p5}–${p95})</strong> — ${t(extremeKey, { p5: `<strong>${p5}</strong>`, p95: `<strong>${p95}</strong>` })}
                    </span>
                </div>` : ''}
            </div>`;

        // Variante de couleur selon le scénario
        container.className = 'chart-stats';
        if (key === 'guildBlacksmith') container.classList.add('guild');
        else if (key === 'custom') container.classList.add('custom');

        container.innerHTML = `
            <div class="chart-stats-inner">
                ${intervalsHtml}
                ${statsExplain}
            </div>`;
    }

    /**
     * Branche les boutons du sélecteur d'objectif guild et affiche le résultat initial.
     */
    _attachGuildTargetSelector(pane, strategy) {
        const container = pane.querySelector('.guild-target-selector');
        if (!container) return;

        const resultEl = container.querySelector('.guild-target-result');

        // Probabilité de succès PAR OBJET : r[0] issu de l'itération de valeur MDP.
        const p = strategy.pSuccessGuild || 0;

        /**
         * Formule géométrique exacte :
         *   P(au moins 1 succès en N objets) = 1 − (1 − p)^N = pct/100
         *   ⇒ N = ⌈ log(1 − pct/100) / log(1 − p) ⌉
         */
        const computeItemsNeeded = (pct) => {
            if (p <= 0) return '∞';
            if (p >= 1) return 1;
            const pctFrac = pct / 100;
            if (pctFrac >= 1) return '∞';
            return Math.ceil(Math.log(1 - pctFrac) / Math.log(1 - p));
        };

        const update = (pct) => {
            const n = computeItemsNeeded(pct);
            let text = this.translator.t('guildItemsNeeded') || '{n} objets nécessaires pour {pct} % de chances de réussite';
            text = text.replace('{n}', `<strong>${n}</strong>`).replace('{pct}', pct);
            if (resultEl) resultEl.innerHTML = text;
        };

        container.querySelectorAll('.guild-target-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.guild-target-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                update(parseInt(btn.dataset.pct, 10));
            });
        });

        // Affichage initial (90 % par défaut)
        update(90);
    }

    /**
     * Rend le détail du scénario hybride — même affichage que les autres scénarios.
     * Le path fusionné (guild steps + scroll steps) est déjà dans strategy.path/fullPath.
     */
    async renderHybridDetails(strategy, pane) {
        // Affichage standard depuis +0 (le forgeron démarre toujours d'un objet +0)
        const savedStart = this.startLevel;
        this.startLevel = 0;

        await this.displayUpgradePath(strategy);

        this.startLevel = savedStart;
    }

    // ================================================================
    // LISTE DE PRÉPARATION — taux de confiance cible
    // ================================================================

    /**
     * Extrait un percentile arbitraire depuis la distribution PMF
     */
    getPercentileFromDistribution(distribution, pct) {
        let cumulative = 0;
        for (let i = 0; i < distribution.length; i++) {
            cumulative += distribution[i];
            if (cumulative >= pct / 100) return i;
        }
        return distribution.length - 1;
    }

    /**
     * Retourne le percentile (0–100) auquel se situe une valeur dans la distribution.
     * Ex: getCdfAtValue(dist, meanTrials) → ~57 signifie que la moyenne est au P57.
     */
    getCdfAtValue(distribution, value) {
        if (!distribution || distribution.length === 0) return 50;
        let cumulative = 0;
        const idx = Math.floor(value);
        for (let i = 0; i <= Math.min(idx, distribution.length - 1); i++) {
            cumulative += distribution[i];
        }
        return Math.round(cumulative * 100);
    }

    /**
     * Calcule le scaleFactor global pour la confiance ciblée.
     *
     * Approche simple et exacte :
     *   - La distribution jointe `strategy.distribution` capture déjà toutes les corrélations
     *     de la chaîne. Son percentile P_conf donne exactement le nombre total de tentatives
     *     (ou d'objets) nécessaires pour atteindre la confiance cible.
     *   - On sépare les paliers déterministes (rate = 100 %, wp ≈ 1) des paliers stochastiques.
     *     Seuls les paliers stochastiques sont scalés :
     *         scaleFactor = (P_conf - déterministicSum) / (mean - déterministicSum)
     *   - Garantie : déterministicSum + scaleFactor × stochasticMean = P_conf.
     *     Le badge et la somme des matériaux scalés sont donc cohérents par construction.
     */
    _computeScaleFactor(strategy, pct) {
        const distribution = strategy.distribution;
        if (!distribution || distribution.length === 0) {
            return { scaleFactor: 1, isMean: true };
        }
        if (pct === 'mean') {
            return { scaleFactor: 1, isMean: true };
        }

        // Hybride (forgeron de guilde) : ratio simple sur le nombre d'objets
        if (strategy.type === 'hybrid') {
            const meanObjects = strategy.expectedItems || strategy.totalTrials || 1;
            const percentileObjects = this.getPercentileFromDistribution(distribution, pct);
            const sf = meanObjects > 0 ? percentileObjects / meanObjects : 1;
            return { scaleFactor: sf, isMean: false };
        }

        // Stratégie standard
        const path = strategy.path || [];
        const extWp = strategy.extendedWaypoints || [];
        const meanTrials = strategy.intervals?.total?.mean || strategy.totalTrials || 1;
        const percentileTrials = this.getPercentileFromDistribution(distribution, pct);

        // Somme des paliers déterministes (rate = 100 %, wp ≈ 1 tentative garantie)
        let deterministicSum = 0;
        for (let level = 1; level <= this.endLevel; level++) {
            const pathIndex = level - this.startLevel - 1;
            const pathData = pathIndex >= 0 ? path[pathIndex] : null;
            const rate = pathData?.rate;
            const wp = pathData?.expectedTrials || extWp[level - 1] || 0;
            if (rate === 100 && wp <= 1.01) deterministicSum += wp;
        }

        const stochasticMean = meanTrials - deterministicSum;
        const stochasticPerc = percentileTrials - deterministicSum;
        const scaleFactor = stochasticMean > 0 ? Math.max(stochasticPerc / stochasticMean, 0) : 1;

        return { scaleFactor, isMean: false };
    }

    /**
     * Met à jour et stocke les métadonnées de la confiance ciblée.
     * Retourne le scaleFactor à appliquer aux paliers stochastiques.
     */
    _updatePreparationMeta(strategy, pct) {
        const meta = this._computeScaleFactor(strategy, pct);
        this._preparationMeta = meta;
        this._preparationScaleFactor = meta.scaleFactor;
        return meta.scaleFactor;
    }

    /**
     * Calcule le displayStartLevel pour la liste de préparation
     * (logique partagée avec displayRequiredItems / displayRequiredMaterials)
     */
    async _computeDisplayStartLevel(strategy) {
        const itemData = await this.dataService.getItemById(this.currentItemId);
        const path = strategy.path || [];
        const fullPath = strategy.fullPath || [];
        let displayStartLevel = 1;

        if (this.startLevel > 0) {
            let minReachableLevel = this.startLevel;
            let startUpgradeType = "Pierre magique";

            if (this.currentStrategy === 'custom' && this.customScenario[this.startLevel]) {
                startUpgradeType = this.customScenario[this.startLevel];
            } else if (fullPath[this.startLevel]) {
                startUpgradeType = fullPath[this.startLevel];
            } else if (path[0]) {
                startUpgradeType = path[0].name;
            }

            if (startUpgradeType === "Pierre magique") {
                displayStartLevel = this.startLevel + 1;
            } else {
                for (let level = this.startLevel; level > 0; level--) {
                    let upgradeType;
                    if (this.currentStrategy === 'custom' && this.customScenario[level - 1]) {
                        upgradeType = this.customScenario[level - 1];
                    } else if (fullPath && fullPath[level - 1]) {
                        upgradeType = fullPath[level - 1];
                    } else {
                        if (level <= 4) upgradeType = "Parchemin de Guerre";
                        else if (level <= 9) upgradeType = "Parchemin du Dieu Dragon";
                        else upgradeType = "Pierre magique";
                    }
                    const levelData = itemData[level.toString()] || { success_rate: 0 };
                    const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);
                    if (rate === 100 || upgradeType === "Pierre magique") {
                        minReachableLevel = level;
                        break;
                    }
                    minReachableLevel = level - 1;
                }
                displayStartLevel = Math.max(1, minReachableLevel);
            }
        }
        return { displayStartLevel, itemData };
    }

    /**
     * Affiche la section de préparation avec sélecteur de confiance
     */
    async displayPreparationList(strategy) {
        const pane = document.getElementById(`pane-${this.currentStrategy}`);
        const container = pane?.querySelector('.pane-preparation');
        if (!container) return;

        // Vérifier qu'on a une distribution
        if (!strategy.distribution || strategy.distribution.length === 0) {
            container.innerHTML = '';
            return;
        }

        const isHybrid = strategy.type === 'hybrid';
        const pct = this._preparationConfidence;

        // Calculer le percentile réel de la moyenne (pour le libellé de description)
        const meanTrials = strategy.intervals?.total?.mean || strategy.totalTrials || 1;
        const meanPct = this.getCdfAtValue(strategy.distribution, meanTrials);

        // Le scaleFactor est déjà calculé en amont par renderCurrentPane → _updatePreparationMeta
        const effectivePct = pct === 'mean' ? meanPct : pct;
        const resultHtml = await this._buildPreparationResultHtml(strategy, effectivePct);

        // Description dynamique selon la cible
        const descKey = isHybrid ? 'preparationDescriptionGuild' : 'preparationDescription';
        const descText = this.translator.t(descKey).replace('{pct}', effectivePct);

        container.innerHTML = `
            <div class="preparation-section">
                <div class="preparation-header">
                    <h3 class="detail-title">
                        <span class="prep-icon">🎯</span>
                        ${this.translator.t('preparationTitle')}
                    </h3>
                </div>
                <div class="prep-description">
                    ${descText}
                </div>
                <div class="prep-result">
                    ${resultHtml}
                </div>
            </div>
        `;

        // Attacher les tooltips de détail sur le contenu initial
        this._attachPrepDetailTooltips(container);
    }

    /**
     * Attache les tooltips de détail de calcul sur les éléments [data-prep-detail]
     */
    _attachPrepDetailTooltips(container) {
        container.querySelectorAll('[data-prep-detail]').forEach(el => {
            const raw = el.getAttribute('data-prep-detail');
            if (!raw) return;

            let tooltipHtml;
            try {
                const detail = JSON.parse(decodeURIComponent(raw));
                tooltipHtml = this._buildPrepDetailTooltipHtml(detail);
            } catch (e) {
                // Fallback texte simple (au cas où le format change)
                const title = this.translator.t('calculationDetail');
                tooltipHtml = `<div class="tooltip-title">📐 ${title}</div><div class="prep-tooltip-body"><pre>${raw}</pre></div>`;
            }

            // Utiliser l'icône ℹ comme ancre si présente, sinon la ligne entière
            const icon = el.querySelector('.prep-detail-icon');
            const anchor = icon || el;

            anchor.addEventListener('mouseenter', () => this.showTooltip(anchor, tooltipHtml));
            anchor.addEventListener('mouseleave', () => this.hideTooltip());
        });
    }

    /**
     * Construit le HTML d'un tooltip de détail structuré à partir d'un objet
     * { kind: 'scroll'|'material'|'yang'|'blank'|'badge', ... }
     */
    _buildPrepDetailTooltipHtml(detail) {
        const T = (k) => this.translator.t(k);
        const fmtN = (n) => {
            if (typeof n !== 'number' || !isFinite(n)) return String(n);
            return n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString('fr-FR');
        };
        const title = `<div class="tooltip-title">📐 ${T('calculationDetail')}</div>`;
        const hint = `<div class="prep-tooltip-hint">${T('detailVisitsHint')}</div>`;

        switch (detail.kind) {
            case 'scroll': {
                const hasDeterministic = detail.rows.some(r => r.isDeterministic);
                const rowsHtml = detail.rows.map(r => {
                    // Pour un palier à 100% de réussite, aucune rétrogradation possible :
                    // le facteur de sécurité est forcé à 1 (quantité fixe), on l'affiche tel quel
                    // pour éviter l'illusion d'un calcul incohérent (ex. 1 × 1,69 = 1).
                    const factorCell = r.isDeterministic
                        ? `<td class="prep-td-num prep-td-fixed">1<sup class="prep-td-mark">*</sup></td>`
                        : `<td class="prep-td-num">${detail.factor.toFixed(3)}</td>`;
                    return `
                    <tr${r.isDeterministic ? ' class="prep-row-deterministic"' : ''}>
                        <td class="prep-td-level">+${r.level}</td>
                        <td class="prep-td-num">${fmtN(r.visits)}</td>
                        <td class="prep-td-op">×</td>
                        ${factorCell}
                        <td class="prep-td-op">=</td>
                        <td class="prep-td-num prep-td-result">${fmtN(r.scaled)}</td>
                    </tr>
                `;
                }).join('');
                const deterministicNote = hasDeterministic
                    ? `<div class="prep-tooltip-note"><sup>*</sup> ${T('detailDeterministicNote')}</div>`
                    : '';
                return `
                    ${title}
                    <div class="prep-tooltip-body">
                        <div class="prep-tooltip-formula">${T('detailFormulaScroll')}</div>
                        <table class="prep-tooltip-table">
                            <thead>
                                <tr>
                                    <th>${T('detailStep')}</th>
                                    <th>${T('detailVisits')}</th>
                                    <th></th>
                                    <th>${T('calcFactor')}</th>
                                    <th></th>
                                    <th>${T('detailResult')}</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                        <div class="prep-tooltip-summary">
                            <div class="prep-summary-row">
                                <span class="prep-summary-label">${T('detailTotalRaw')}</span>
                                <span class="prep-summary-value">${detail.totalRaw.toFixed(2)}</span>
                            </div>
                            <div class="prep-summary-row prep-summary-final">
                                <span class="prep-summary-label">${T('detailRoundedUp')}</span>
                                <span class="prep-summary-value"><strong>${detail.totalRounded}</strong></span>
                            </div>
                        </div>
                        ${deterministicNote}
                        ${hint}
                    </div>
                `;
            }
            case 'material': {
                const rowsHtml = detail.rows.map(r => `
                    <tr>
                        <td class="prep-td-level">+${r.level}</td>
                        <td class="prep-td-num">${r.qtyPerTrial}</td>
                        <td class="prep-td-op">×</td>
                        <td class="prep-td-num">${fmtN(r.scaled)}</td>
                        <td class="prep-td-op">=</td>
                        <td class="prep-td-num prep-td-result">${fmtN(r.matContrib)}</td>
                    </tr>
                `).join('');
                return `
                    ${title}
                    <div class="prep-tooltip-body">
                        <div class="prep-tooltip-formula">${T('detailFormulaMaterial')}</div>
                        <table class="prep-tooltip-table">
                            <thead>
                                <tr>
                                    <th>${T('detailStep')}</th>
                                    <th>${T('detailPerTrial')}</th>
                                    <th></th>
                                    <th>${T('detailVisits')}</th>
                                    <th></th>
                                    <th>${T('detailResult')}</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                        <div class="prep-tooltip-summary">
                            <div class="prep-summary-row">
                                <span class="prep-summary-label">${T('detailTotalRaw')}</span>
                                <span class="prep-summary-value">${detail.totalRaw.toFixed(2)}</span>
                            </div>
                            <div class="prep-summary-row prep-summary-final">
                                <span class="prep-summary-label">${T('detailRoundedUp')}</span>
                                <span class="prep-summary-value"><strong>${detail.totalRounded}</strong></span>
                            </div>
                        </div>
                        ${hint}
                    </div>
                `;
            }
            case 'yang': {
                const rowsHtml = detail.rows.map(r => `
                    <tr>
                        <td class="prep-td-level">+${r.level}</td>
                        <td class="prep-td-num">${fmtN(r.yangPerTrial)}M</td>
                        <td class="prep-td-op">×</td>
                        <td class="prep-td-num">${fmtN(r.scaled)}</td>
                        <td class="prep-td-op">=</td>
                        <td class="prep-td-num prep-td-result">${fmtN(r.yangTotal)}M</td>
                    </tr>
                `).join('');
                return `
                    ${title}
                    <div class="prep-tooltip-body">
                        <div class="prep-tooltip-formula">${T('detailFormulaYang')}</div>
                        <table class="prep-tooltip-table">
                            <thead>
                                <tr>
                                    <th>${T('detailStep')}</th>
                                    <th>${T('detailYangPerTrial')}</th>
                                    <th></th>
                                    <th>${T('detailVisits')}</th>
                                    <th></th>
                                    <th>Yang</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                        <div class="prep-tooltip-summary">
                            <div class="prep-summary-row prep-summary-final">
                                <span class="prep-summary-label">${T('calcTotal')}</span>
                                <span class="prep-summary-value"><strong>${detail.totalYang.toFixed(2)}M yang</strong></span>
                            </div>
                        </div>
                        ${hint}
                    </div>
                `;
            }
            case 'blank': {
                return `
                    ${title}
                    <div class="prep-tooltip-body">
                        <div class="prep-tooltip-summary">
                            <div class="prep-summary-row">
                                <span class="prep-summary-label">${detail.qty} ${T('calcObjAbbr')} × ${fmtN(detail.unitPrice)}M</span>
                                <span class="prep-summary-value"><strong>${fmtN(detail.total)}M</strong></span>
                            </div>
                        </div>
                    </div>
                `;
            }
            case 'badge': {
                const objSuffix = detail.isHybrid ? ` ${T('calcObjAbbr')}` : '';
                return `
                    ${title}
                    <div class="prep-tooltip-body">
                        <div class="prep-tooltip-formula">${T('detailBadgeIntro')}</div>
                        <div class="prep-tooltip-kv">
                            <div class="prep-kv-row">
                                <span class="prep-kv-label">${T('calcAverage')}</span>
                                <span class="prep-kv-value">${fmtN(detail.mean)}${objSuffix}</span>
                            </div>
                            <div class="prep-kv-row">
                                <span class="prep-kv-label">P${detail.pct}</span>
                                <span class="prep-kv-value">${detail.percentile}${objSuffix}</span>
                            </div>
                            <div class="prep-kv-row prep-kv-highlight">
                                <span class="prep-kv-label">${T('calcFactor')}</span>
                                <span class="prep-kv-value"><strong>${detail.factor.toFixed(3)}</strong></span>
                            </div>
                        </div>
                        ${hint}
                    </div>
                `;
            }
            default:
                return `${title}<div class="prep-tooltip-body">—</div>`;
        }
    }

    /**
     * Construit le HTML du résultat de la liste de préparation
     * Algorithme : on utilise le ratio (P_percentile / moyenne) comme facteur d'échelle
     * appliqué aux visites attendues par niveau depuis la chaîne de Markov.
     */
    async _buildPreparationResultHtml(strategy, pct) {
        const distribution = strategy.distribution;
        if (!distribution || distribution.length === 0) return '';

        const isHybrid = strategy.type === 'hybrid';
        const percentileTrials = this.getPercentileFromDistribution(distribution, pct);
        const meanTrials = strategy.intervals?.total?.mean || strategy.totalTrials || 1;

        // ScaleFactor de confiance ciblée (déjà calculé en amont par renderCurrentPane)
        const meta = this._preparationMeta || this._computeScaleFactor(strategy, pct);
        const scaleFactor = meta.scaleFactor;

        // Pour le guild : nombre d'objets au percentile et guildReach
        const expectedItems = strategy.expectedItems || strategy.totalTrials || 1;
        const numberOfObjects = isHybrid ? percentileTrials : null;
        const q = strategy.pSuccessGuild || 0;
        let guildReach = null;
        if (isHybrid) {
            guildReach = {};
            let reach = 1;
            for (const step of (strategy.path || [])) {
                guildReach[step.level - 1] = reach;
                if (step.name === 'Forgeron de guilde') reach *= (step.rate / 100);
            }
        }

        // Pour le guild, on démarre toujours à +0 ; sinon utiliser _computeDisplayStartLevel
        let displayStartLevel, itemData;
        if (isHybrid) {
            displayStartLevel = 1;
            itemData = await this.dataService.getItemById(this.currentItemId);
        } else {
            ({ displayStartLevel, itemData } = await this._computeDisplayStartLevel(strategy));
        }

        const path = strategy.path || [];
        const fullPath = strategy.fullPath || [];
        const extendedWaypoints = strategy.extendedWaypoints || [];
        const endLevel = isHybrid ? (strategy.endLevel || this.endLevel) : this.endLevel;

        // Accumuler les objets d'amélioration et matériaux + détails par niveau
        const items = {};
        const materials = {};
        let totalYang = 0;
        const yangLevelDetails = [];

        for (let level = displayStartLevel; level <= endLevel; level++) {
            const pathIndex = isHybrid ? (level - 1) : (level - this.startLevel - 1);
            const pathData = pathIndex >= 0 ? path[pathIndex] : null;
            const waypointValue = pathData?.expectedTrials || extendedWaypoints[level - 1] || 0;

            // Déterminer le type d'amélioration
            let upgradeType;
            if (isHybrid) {
                upgradeType = pathData?.name || fullPath[level - 1] || 'Forgeron de guilde';
            } else if (level > 9) {
                upgradeType = "Pierre magique";
            } else if (this.currentStrategy === 'custom') {
                upgradeType = this.customScenario[level - 1] || "Parchemin de bénédiction";
            } else {
                if (fullPath[level - 1]) {
                    upgradeType = fullPath[level - 1];
                } else if (pathData?.name) {
                    upgradeType = pathData.name;
                } else {
                    if (level <= 4) upgradeType = "Parchemin de Guerre";
                    else if (level <= 9) upgradeType = "Parchemin de bénédiction";
                    else upgradeType = "Pierre magique";
                }
            }

            // Calculer le scaledWaypoint (visites totales au percentile cible)
            let scaledWaypoint;
            let isDeterministic = false;
            if (isHybrid) {
                const isRetro = pathData && !pathData.noDowngrade;
                if (isRetro) {
                    // Retro : waypoint = visitsSolved × (1/q), déjà total pour la moyenne
                    // On le scale par le ratio numberOfObjects / expectedItems
                    scaledWaypoint = waypointValue * scaleFactor;
                } else {
                    // Guild ou stay : waypoint est par-objet-par-atteinte
                    // Total = guildReach[k] × waypoint × numberOfObjects
                    scaledWaypoint = (guildReach[level - 1] || 0) * waypointValue * numberOfObjects;
                }
            } else {
                // Stratégie standard : un seul scaleFactor global appliqué à tous les paliers stochastiques
                isDeterministic = pathData?.rate === 100 && waypointValue <= 1.01;
                if (isDeterministic) {
                    scaledWaypoint = waypointValue;
                } else {
                    scaledWaypoint = waypointValue * scaleFactor;
                }
            }

            if (scaledWaypoint < 0.01) continue;

            // Pour les stratégies non-guild, on ignore les niveaux forgeron de guilde
            if (!isHybrid && upgradeType === "Forgeron de guilde") continue;

            // Yang (yangCostInMillions inclut déjà le multiplicateur forgeron pour les niveaux guild)
            const levelData = itemData[level.toString()] || {};
            const yangCostInMillions = pathData?.yangCostInMillions ?? ((levelData.yang_cost || 0) / 1000000);
            const yangContrib = yangCostInMillions * scaledWaypoint;
            totalYang += yangContrib;
            if (yangContrib > 0.001) {
                yangLevelDetails.push({ level, visits: waypointValue, scaled: scaledWaypoint, yangPerTrial: yangCostInMillions, yangTotal: yangContrib });
            }

            // Objet d'amélioration (parchemins, pierres magiques) — pas pour les niveaux guild
            if (upgradeType !== "Forgeron de guilde") {
                if (!items[upgradeType]) {
                    items[upgradeType] = {
                        name: upgradeType,
                        qty: 0,
                        unitCost: this.dataService.getUpgradeCost(upgradeType),
                        levelDetails: []
                    };
                }
                items[upgradeType].qty += scaledWaypoint;
                items[upgradeType].levelDetails.push({ level, visits: waypointValue, scaled: scaledWaypoint, isDeterministic });
            }

            // Matériaux du palier (depuis refine_proto)
            if (levelData.materials) {
                for (const [id, info] of Object.entries(levelData.materials)) {
                    if (!materials[id]) {
                        materials[id] = {
                            id,
                            name: this.translator.getMaterialName(id),
                            qty: 0,
                            unitCost: this.dataService.getMaterialCost(id),
                            levelDetails: []
                        };
                    }
                    const matContrib = (info.qty || 0) * scaledWaypoint;
                    materials[id].qty += matContrib;
                    materials[id].levelDetails.push({ level, qtyPerTrial: info.qty || 0, visits: waypointValue, scaled: scaledWaypoint, matContrib });
                }
            }
        }

        // Sauvegarder les quantités brutes avant ceil pour le tooltip
        for (const item of Object.values(items)) { item.rawQty = item.qty; item.qty = Math.ceil(item.qty); }
        for (const mat of Object.values(materials)) { mat.rawQty = mat.qty; mat.qty = Math.ceil(mat.qty); }

        // Calcul des coûts
        let totalScrollCost = 0;
        Object.values(items).forEach(item => { totalScrollCost += item.qty * item.unitCost; });
        let totalMaterialCost = 0;
        Object.values(materials).forEach(mat => { totalMaterialCost += mat.qty * mat.unitCost; });

        // Coût des objets vierges (guild uniquement)
        let blankItemCost = 0;
        let blankItemQty = 0;
        if (isHybrid && numberOfObjects > 0) {
            blankItemQty = numberOfObjects;
            blankItemCost = (strategy.baseItemPrice || 0) * blankItemQty;
        }

        const grandTotal = totalYang + totalScrollCost + totalMaterialCost + blankItemCost;

        // Construction du HTML
        const trialsKey = isHybrid ? 'preparationTrialsGuild' : 'preparationTrials';
        // Extraction du libellé sans la valeur : "{n} tentatives estimées" → "Tentatives estimées"
        const trialsTemplate = this.translator.t(trialsKey);
        const trialsLabelRaw = trialsTemplate.replace('{n}', '').trim().replace(/^[:–—-]\s*|\s*[:–—-]$/g, '').trim();
        const trialsLabelText = trialsLabelRaw.charAt(0).toUpperCase() + trialsLabelRaw.slice(1);

        // Helper : format nombre
        const fmtN = (n) => n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString('fr-FR');

        // Helper : encoder un objet de détail en data-attr
        const encodeDetail = (obj) => encodeURIComponent(JSON.stringify(obj));

        // Tooltip global (formule) attaché au badge
        const badgeDetail = encodeDetail({
            kind: 'badge',
            mean: meanTrials,
            pct: pct,
            percentile: percentileTrials,
            factor: scaleFactor,
            isHybrid: isHybrid
        });

        // Ligne objet vierge (guild)
        let blankItemHtml = '';
        if (isHybrid && blankItemQty > 0) {
            const rawItemName = this.dataService.itemNames[this.currentItemId] || '';
            const baseItemName = this.formatters.removeUpgradeLevel(rawItemName);
            const blankLabel = baseItemName
                ? `${baseItemName} +0 ${this.translator.t('blankItem')}`
                : this.translator.t('hybridItemsConsumed');
            const blankDetail = encodeDetail({
                kind: 'blank',
                qty: blankItemQty,
                unitPrice: strategy.baseItemPrice || 0,
                total: blankItemCost
            });
            blankItemHtml = `
                <div class="prep-list-section">
                    <div class="prep-list-title">${this.translator.t('preparationObjectsTitle')}</div>
                    <div class="prep-item-row" data-prep-detail="${blankDetail}">
                        <img src="${this.dataService.getItemImagePath(this.currentItemId)}" class="prep-item-icon" onerror="this.style.display='none'">
                        <span class="prep-item-name">${blankLabel}</span>
                        <span class="prep-item-qty">×${blankItemQty}</span>
                        <span class="prep-item-cost">${this.formatters.formatCost(blankItemCost)}</span>
                        <span class="prep-detail-icon" title="">ℹ</span>
                    </div>
                </div>`;
        }

        // Objets d'amélioration (parchemins, pierres)
        const itemsHtml = Object.values(items).map(item => {
            const displayName = this.dataService.getUpgradeItemName(item.name);
            const imgPath = this.dataService.getUpgradeItemImagePath(item.name);
            const detail = encodeDetail({
                kind: 'scroll',
                rows: item.levelDetails.map(d => ({
                    level: d.level,
                    visits: d.visits,
                    scaled: d.scaled,
                    isDeterministic: !!d.isDeterministic
                })),
                factor: scaleFactor,
                totalRaw: item.rawQty,
                totalRounded: item.qty
            });
            return `
                <div class="prep-item-row" data-prep-detail="${detail}">
                    <img src="${imgPath}" class="prep-item-icon" onerror="this.style.display='none'">
                    <span class="prep-item-name">${displayName}</span>
                    <span class="prep-item-qty">×${item.qty}</span>
                    <span class="prep-item-cost">${this.formatters.formatCost(item.qty * item.unitCost)}</span>
                    <span class="prep-detail-icon" title="">ℹ</span>
                </div>
            `;
        }).join('');

        // Matériaux
        const materialsHtml = Object.values(materials).length > 0 ? Object.values(materials).map(mat => {
            const imgPath = this.dataService.getItemImagePath(mat.id);
            const detail = encodeDetail({
                kind: 'material',
                rows: mat.levelDetails.map(d => ({
                    level: d.level,
                    qtyPerTrial: d.qtyPerTrial,
                    scaled: d.scaled,
                    matContrib: d.matContrib
                })),
                totalRaw: mat.rawQty,
                totalRounded: mat.qty
            });
            return `
                <div class="prep-item-row" data-prep-detail="${detail}">
                    <img src="${imgPath}" class="prep-item-icon" onerror="this.style.display='none'">
                    <span class="prep-item-name">${mat.name}</span>
                    <span class="prep-item-qty">×${mat.qty}</span>
                    <span class="prep-item-cost">${this.formatters.formatCost(mat.qty * mat.unitCost)}</span>
                    <span class="prep-detail-icon" title="">ℹ</span>
                </div>
            `;
        }).join('') : '';

        // Yang détail
        let yangDetailEncoded = '';
        if (yangLevelDetails.length > 0) {
            yangDetailEncoded = encodeDetail({
                kind: 'yang',
                rows: yangLevelDetails.map(d => ({
                    level: d.level,
                    yangPerTrial: d.yangPerTrial,
                    scaled: d.scaled,
                    yangTotal: d.yangTotal
                })),
                totalYang: totalYang
            });
        }

        // Section scrolls/items (peut être vide si tout est guild)
        const scrollsSectionHtml = itemsHtml ? `
                <div class="prep-list-section">
                    <div class="prep-list-title">${this.translator.t('preparationScrollsTitle')}</div>
                    ${itemsHtml}
                </div>` : '';

        return `
            <div class="prep-summary">
                <div class="prep-total prep-total-hero">
                    <span class="prep-total-label">${this.translator.t('preparationTotalCost')}</span>
                    <span class="prep-total-value">${this.formatters.formatCost(grandTotal)}</span>
                </div>
                <div class="prep-trials-badge prep-trials-hero" data-prep-detail="${badgeDetail}">
                    <span class="prep-total-label">${trialsLabelText}<span class="prep-detail-icon badge-icon">ℹ</span></span>
                    <span class="prep-total-value">${percentileTrials}</span>
                </div>
            </div>
            <div class="prep-lists">
                ${blankItemHtml}
                ${scrollsSectionHtml}
                ${materialsHtml ? `
                <div class="prep-list-section">
                    <div class="prep-list-title">${this.translator.t('preparationMaterialsTitle')}</div>
                    ${materialsHtml}
                </div>
                ` : ''}
                ${totalYang > 0 ? `
                <div class="prep-list-section">
                    <div class="prep-list-title">${this.translator.t('preparationYangTitle')}</div>
                    <div class="prep-item-row prep-yang-row" ${yangDetailEncoded ? `data-prep-detail="${yangDetailEncoded}"` : ''}>
                        <span class="prep-yang-icon">💰</span>
                        <span class="prep-item-name">Yang</span>
                        <span class="prep-item-qty"></span>
                        <span class="prep-item-cost">${this.formatters.formatCost(totalYang)}</span>
                        ${yangDetailEncoded ? '<span class="prep-detail-icon" title="">ℹ</span>' : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Crée l'indicateur de risque
     */
    createRiskIndicator(strategy) {
        const riskLevel = strategy.riskLevel || 'medium';
        const riskColors = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444'
        };
        
        const riskLabels = {
            low: this.translator.t('riskLow'),
            medium: this.translator.t('riskMedium'),
            high: this.translator.t('riskHigh')
        };
        
        return `
            <div class="risk-indicator">
                <div class="risk-label">${this.translator.t('riskLevel')}:</div>
                <div class="risk-badge" style="background-color: ${riskColors[riskLevel]}20; color: ${riskColors[riskLevel]}">
                    ${riskLabels[riskLevel]}
                </div>
            </div>
        `;
    }

    /**
     * Sélectionne un onglet de scénario
     */
    selectStrategy(key) {
        if (!this.strategies[key] && key !== 'optimal') return;
        this.currentStrategy = key;

        // Mettre à jour les boutons d'onglet (cachés)
        document.querySelectorAll('.scenario-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === key);
        });

        // Mettre à jour les cartes de scénario
        document.querySelectorAll('.strategy-card[data-tab]').forEach(card => {
            card.classList.toggle('active', card.dataset.tab === key);
        });

        // Glisser le slider vers la carte active
        this.slideTabSlider(key);

        // Basculer les panneaux + variantes de couleur
        const isGuild  = key === 'guildBlacksmith';
        const isCustom = key === 'custom';
        document.querySelectorAll('.scenario-pane').forEach(pane => {
            const active = pane.id === `pane-${key}`;
            pane.style.display = active ? '' : 'none';
            pane.classList.toggle('active', active);
            pane.classList.toggle('guild-pane', active && isGuild);
            pane.classList.toggle('custom-pane', active && isCustom);
        });

        // Pointer les éléments vers le panneau actif
        const pane = document.getElementById(`pane-${key}`);
        if (pane) {
            this.elements.upgradePath      = pane.querySelector('.pane-path');
        }

        // Rendre le contenu
        this.renderCurrentPane();

        // Mettre à jour le graphique
        if (window.app?.chartComponent && this.strategies[key]) {
            window.app.chartComponent.update(this.strategies[key]);
        }
    }

    /**
     * Affiche les détails de la stratégie sélectionnée (délègue à renderCurrentPane)
     */
    async displayStrategyDetails() {
        await this.renderCurrentPane();
    }

    /**
     * Affiche le chemin d'amélioration avec groupement amélioré
     */
    async displayUpgradePath(strategy) {
        const isCustom = this.currentStrategy === 'custom';
        const itemData = await this.dataService.getItemById(this.currentItemId);

        const path = strategy.path || [];
        const fullPath = strategy.fullPath || [];
        const extendedWaypoints = strategy.extendedWaypoints || strategy.waypoints || [];

        // Calculer guildReach pour les stratégies hybrides forgeron de guilde
        // guildReach[k] = probabilité qu'un objet atteigne le palier k sans être détruit
        let guildReach = null;
        if (strategy.type === 'hybrid' && strategy.itemsMode &&
            strategy.expectedItems > 0 && isFinite(strategy.expectedItems)) {
            guildReach = {};
            let reach = 1;
            for (const step of path) {
                const k = step.level - 1;
                guildReach[k] = reach;
                if (step.name === 'Forgeron de guilde') {
                    reach *= (step.rate / 100);
                }
            }
        }

        this.cleanupTooltips();

        const pathSteps = [];

        // Déterminer le niveau minimum à afficher
        let displayStartLevel = 1;
        // Niveau de départ effectif pour le marqueur (cadre jaune).
        // Sémantique : le cadre marque la PREMIÈRE étape d'amélioration à réaliser,
        // soit systématiquement startLevel + 1 (puisque startLevel est l'état de départ,
        // pas une étape à effectuer).
        const effectiveStartLevel = this.startLevel > 0 ? this.startLevel + 1 : 0;

        // Analyser si on peut rétrograder depuis le niveau de départ
        if (this.startLevel > 0) {
            let minReachableLevel = this.startLevel;

            // Vérifier le type d'amélioration au niveau de départ
            let startUpgradeType = "Pierre magique";

            // IMPORTANT: Utiliser fullPath pour la stratégie optimale
            if (isCustom && this.customScenario[this.startLevel]) {
                startUpgradeType = this.customScenario[this.startLevel];
            } else if (fullPath[this.startLevel]) {
                startUpgradeType = fullPath[this.startLevel];
            } else if (path[0]) {
                startUpgradeType = path[0].name;
            }

            // Calculer le taux de la PREMIÈRE amélioration (startLevel → startLevel+1).
            // Si ce taux est 100%, aucun échec n'est possible, donc aucune rétrogradation
            // ne peut avoir lieu — les paliers rétrogrades ne doivent pas être affichés.
            const firstUpgradeLevel = this.startLevel + 1;
            const firstLevelData = itemData[firstUpgradeLevel.toString()] || { success_rate: 0 };
            const firstRate = this.calculateSuccessRate(
                firstUpgradeLevel,
                startUpgradeType,
                firstLevelData.success_rate
            );
            const firstStepNoDowngrade = path[0]?.noDowngrade === true;

            // Pas de rétrogradation possible si :
            //  - le premier upgrade est à 100% (jamais d'échec), OU
            //  - le parchemin ne rétrograde pas (Pierre magique / flag noDowngrade)
            if (firstRate >= 100 || startUpgradeType === "Pierre magique" || firstStepNoDowngrade) {
                displayStartLevel = this.startLevel + 1;
            } else {
                // Analyser jusqu'où on peut rétrograder
                for (let level = this.startLevel; level > 0; level--) {
                    let upgradeType;

                    if (isCustom && this.customScenario[level - 1]) {
                        upgradeType = this.customScenario[level - 1];
                    } else if (fullPath && fullPath[level - 1]) {
                        upgradeType = fullPath[level - 1];
                    } else {
                        // Valeurs par défaut
                        if (level <= 4) {
                            upgradeType = "Parchemin de Guerre";
                        } else if (level <= 9) {
                            upgradeType = "Parchemin du Dieu Dragon";
                        } else {
                            upgradeType = "Pierre magique";
                        }
                    }

                    // Calculer le taux
                    const levelData = itemData[level.toString()] || { success_rate: 0 };
                    const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);

                    // Si taux 100% ou Pierre magique, on ne peut pas descendre en dessous
                    if (rate === 100 || upgradeType === "Pierre magique") {
                        minReachableLevel = level;
                        break;
                    }

                    minReachableLevel = level - 1;
                }

                displayStartLevel = Math.max(1, minReachableLevel);
            }
        }
        
        // ScaleFactor de la confiance ciblée (calculé en amont par renderCurrentPane)
        const meta = this._preparationMeta || { scaleFactor: 1, isMean: true };
        const sf = meta.scaleFactor;

        // Construire les steps pour tous les niveaux à afficher
        for (let level = displayStartLevel; level <= this.endLevel; level++) {
            const pathIndex = level - this.startLevel - 1;
            const pathData = pathIndex >= 0 ? path[pathIndex] : null;
            const rawWaypoint = extendedWaypoints[level - 1] || 0;

            if (rawWaypoint > 0.01 || (level >= displayStartLevel && level <= this.endLevel)) {
                const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0, yang_cost: 0 };

                let upgradeType;
                let isEditable = false;
                let customIndex = level - 1;
                const isBelowStart = level <= this.startLevel;
                const isTarget = level > this.startLevel && level <= this.endLevel;
                const isRetrogradePath = level >= displayStartLevel && level <= this.startLevel;

                // Déterminer le type d'amélioration
                if (isCustom) {
                    // Pour la stratégie personnalisée
                    upgradeType = this.customScenario[customIndex] || "Parchemin de bénédiction";
                    // Permettre l'édition pour les niveaux 5-9
                    isEditable = level >= 1 && level <= 9;
                } else {
                    // Pour la stratégie optimale - TOUJOURS utiliser fullPath si disponible
                    if (fullPath && fullPath[level - 1]) {
                        upgradeType = fullPath[level - 1];
                    } else if (pathData?.name) {
                        upgradeType = pathData.name;
                    } else {
                        // Valeurs par défaut uniquement si aucune donnée
                        if (level > 9) {
                            upgradeType = "Pierre magique";
                        } else if (level <= 4) {
                            upgradeType = "Parchemin de Guerre";
                        } else {
                            upgradeType = "Parchemin de bénédiction";
                        }
                    }
                }

                const rate = pathData?.rate || this.calculateSuccessRate(level, upgradeType, levelData.success_rate);

                // Calcul du waypoint scalé selon le type de stratégie
                let waypointValue, effectiveWaypoint;
                const isGuildLevel = guildReach !== null && fullPath[level - 1] === 'Forgeron de guilde';
                const guildReachValue = isGuildLevel ? (guildReach[level - 1] ?? 0) : null;

                if (guildReach !== null) {
                    // Stratégie hybride (forgeron de guilde)
                    // numberOfObjects = expectedItems × sf (scaleFactor = percentile / mean)
                    const numberOfObjects = strategy.expectedItems * sf;
                    const isRetroLevel = pathData && !pathData.noDowngrade;

                    if (isRetroLevel) {
                        // Retro : waypoint = visitsSolved × (1/q), déjà total pour la moyenne
                        waypointValue = rawWaypoint * sf;
                        effectiveWaypoint = waypointValue;
                    } else {
                        // Guild ou stay : waypoint est par-objet-par-atteinte
                        // Total = guildReach[k] × waypoint × numberOfObjects
                        const gr = guildReach[level - 1] || 0;
                        effectiveWaypoint = gr * rawWaypoint * numberOfObjects;
                        waypointValue = effectiveWaypoint;
                    }
                } else {
                    // Stratégie standard : scaleFactor unique appliqué aux paliers stochastiques
                    const isDeterministic = rate === 100 && rawWaypoint <= 1.01;
                    if (isDeterministic) {
                        waypointValue = rawWaypoint;
                    } else {
                        waypointValue = rawWaypoint * sf;
                    }
                    effectiveWaypoint = waypointValue;
                }

                const safeWaypoint = Math.max(waypointValue, 0.01);
                effectiveWaypoint = Math.max(effectiveWaypoint, 0.01);

                const levelInterval = strategy.intervals?.byLevel?.[level - 1] || {
                    mean: safeWaypoint,
                    std: Math.sqrt(safeWaypoint),
                    ci95: {
                        lower: Math.max(0, safeWaypoint - 1.96 * Math.sqrt(safeWaypoint)),
                        upper: safeWaypoint + 1.96 * Math.sqrt(safeWaypoint)
                    }
                };

                // yangCostInMillions de pathData inclut déjà le multiplicateur forgeron de guilde
                // yangCost brut (en yang) utilisé uniquement pour l'affichage dans le tooltip
                const yangCostInMillions = pathData?.yangCostInMillions != null
                    ? pathData.yangCostInMillions
                    : (levelData.yang_cost || 0) / 1000000;
                const yangCost = yangCostInMillions * 1000000;
                const materialCost = pathData?.materialCost || await this.calculateMaterialCost(levelData.materials || {});
                const upgradeCost = pathData?.upgradeCost || this.dataService.getUpgradeCost(upgradeType);
                const totalLevelCostPerTrial = yangCostInMillions + materialCost + upgradeCost;

                const avgCost        = totalLevelCostPerTrial * safeWaypoint;
                const displayAvgCost = totalLevelCostPerTrial * effectiveWaypoint;

                const itemInterval = {
                    lower: Math.ceil(levelInterval.ci95.lower),
                    upper: Math.ceil(levelInterval.ci95.upper)
                };
                const costInterval = {
                    lower: totalLevelCostPerTrial * levelInterval.ci95.lower,
                    upper: totalLevelCostPerTrial * levelInterval.ci95.upper
                };

                const isMagicStoneOnly = level > 9;

                const materials = await this.getMaterialsForLevel(
                    levelData.materials || {},
                    effectiveWaypoint
                );

                pathSteps.push({
                    level,
                    upgradeType,
                    rate,
                    waypoint: waypointValue,
                    safeWaypoint,
                    effectiveWaypoint,
                    isGuildLevel,
                    guildReachValue,
                    isEditable,
                    customIndex,
                    isBelowStart,
                    isTarget,
                    isRetrogradePath,
                    isMagicStoneOnly,
                    isStartLevel: level === effectiveStartLevel && this.startLevel > 0,
                    levelInterval,
                    itemInterval,
                    costInterval,
                    levelCost: totalLevelCostPerTrial,
                    avgCost,
                    displayAvgCost,
                    materials,
                    yangCost,
                    yangCostInMillions,
                    materialCost,
                    upgradeCost,
                    levelData
                });
            }
        }

        // Créer l'affichage
        let pathHtml = '<div class="upgrade-path">';
        let magicStoneSeparatorAdded = false;

        // Afficher les niveaux jusqu'à 19 normalement
        const displayLimit = Math.min(this.endLevel, 19);

        pathSteps.forEach(step => {
            if (step.level <= displayLimit) {
                // Ajouter le séparateur AVANT le niveau 10 si pas encore fait
                if (!magicStoneSeparatorAdded && step.level === 10) {
                    pathHtml += `
                        <div class="magic-stone-separator">
                            <div class="magic-stone-warning">
                                <span class="warning-tooltip">${this.translator.t('magicStoneRestriction') || 'Restriction : utilisation de la Pierre magique à partir de +10 par absence d\'autres données statistiques'}</span>
                            </div>
                        </div>
                    `;
                    magicStoneSeparatorAdded = true;
                }

                pathHtml += this.createPathStepHtml(step, isCustom);
            }
        });
        
        if (this.endLevel > 19) {
            // Affichage groupé pour les niveaux élevés
            const loopSteps = pathSteps.filter(s => s.level >= 10 && s.level <= 19);
            
            pathHtml += `</div><div class="upgrade-loop-section">
                <div class="loop-preview">`;
            
            // Afficher un aperçu des niveaux 10-19
            loopSteps.forEach(step => {
                const miniStep = this.createMiniPathStepHtml(step);
                pathHtml += miniStep;
            });
            
            pathHtml += `</div>
                <div class="loop-indicator">
                    <div class="loop-arrow">🔄</div>
                    <div class="loop-text">
                        ${this.translator.t('repeatPattern') || 'Répétition du motif'}<br>
                        +20 → +${this.endLevel}
                    </div>
                </div>
            </div>
            
            <!-- Résumé des totaux pour les niveaux > 19 -->
            <div class="loop-summary">`;
            
            // Calculer les totaux pour chaque tranche de 10 niveaux
            for (let rangeStart = 20; rangeStart <= this.endLevel; rangeStart += 10) {
                const rangeEnd = Math.min(rangeStart + 9, this.endLevel);
                let rangeTotalTrials = 0;
                let rangeTotalCost = 0;
                
                for (let level = rangeStart; level <= rangeEnd; level++) {
                    const stepData = pathSteps.find(s => s.level === level);
                    if (stepData) {
                        rangeTotalTrials += stepData.safeWaypoint;
                        rangeTotalCost += stepData.avgCost;
                    }
                }
                
                pathHtml += `
                    <div class="range-summary">
                        <span class="range-label">+${rangeStart} → +${rangeEnd}:</span>
                        <span class="range-stats">
                            ${Math.round(rangeTotalTrials)} ${this.translator.t('trials')} • 
                            ${this.formatters.formatCost(rangeTotalCost)}
                        </span>
                    </div>
                `;
            }
            
            pathHtml += `</div>`;
        } else {
            pathHtml += '</div>';
        }

        this.elements.upgradePath.innerHTML = pathHtml;

        // Attacher les événements pour la modification en direct SI on est en custom
        if (isCustom) {
            this.elements.upgradePath.querySelectorAll('.step-select').forEach(select => {
                select.addEventListener('change', () => this.updateCustomPath());
            });
        }

        // Attacher les événements d'expansion/collapse
        this.elements.upgradePath.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', (e) => this.toggleGroup(e.currentTarget));
        });

        // Attacher les tooltips
        this.attachPathTooltips(pathSteps);

        // (connexion gérée en CSS pur via tab-panel)
    }

    createMiniPathStepHtml(step) {
        // Pour les niveaux > 9, l'objet d'amélioration est toujours Pierre magique
        const upgradeType = step.level > 9 ? "Pierre magique" : step.upgradeType;
        const upgradeItemImage = this.dataService.getUpgradeItemImagePath(upgradeType);
        
        return `
            <div class="path-step mini" data-level="${step.level}">
                <div class="step-level">+${step.level}</div>
                <img src="${upgradeItemImage}" 
                    class="step-icon" 
                    alt="${upgradeType}"
                    onerror="this.style.display='none'">
                <div class="step-stats">
                    <span class="step-rate">${step.rate}%</span>
                    <span class="step-trials">${step.waypoint.toFixed(1)}x</span>
                </div>
            </div>
        `;
    }

    /**
     * Bascule l'état d'expansion d'un groupe
     */
    toggleGroup(header) {
        const groupId = header.dataset.groupId;
        const content = header.nextElementSibling;
        
        if (this.expandedGroups.has(groupId)) {
            this.expandedGroups.delete(groupId);
            header.classList.remove('expanded');
            content.style.display = 'none';
        } else {
            this.expandedGroups.add(groupId);
            header.classList.add('expanded');
            content.style.display = '';
        }
    }

    /**
     * Crée le HTML pour une étape du chemin
     */
    createPathStepHtml(step, isCustom) {
        const upgradeOptions = this.dataService.getUpgradeOptions();
        let options = [];
        
        // Permettre toutes les options pour les niveaux 5-9 en mode custom
        if (step.level > 9) {
            options = ["Pierre magique"];
        } else if (isCustom && step.level <  5) {
            options = ["Parchemin de Guerre", "Parchemin de bénédiction", "Manuel de Forgeron", "Parchemin du Dieu Dragon", "Pierre magique"];
        } else if (isCustom) {
            // En mode custom, permettre toutes les options pour les niveaux 5-9
            options = ["Parchemin de bénédiction", "Manuel de Forgeron", "Parchemin du Dieu Dragon", "Pierre magique"];
        }
        
        let stepClass = 'path-step';
        if (step.isStartLevel) stepClass += ' start-level';
        if (step.isRetrogradePath && step.level < this.startLevel) stepClass += ' retrograde-path';
        if (step.isTarget) stepClass += ' target-level';
        if (step.isEditable) stepClass += ' editable';
        
        // Créer la liste des matériaux requis avec images
        const materialsHtml = step.materials.length > 0 ? `
            <div class="step-materials">
                ${step.materials.map(mat => `
                    <div class="material-item" title="${mat.name}: ${mat.avgQty} (${mat.qty}/${this.translator.t('avgRequired').toLowerCase()})">
                        <img src="${this.dataService.getItemImagePath(mat.id)}"
                             class="material-icon"
                             onerror="this.style.display='none'">
                        <span class="material-qty">${mat.avgQty}</span>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        // Pour les paliers guild : afficher le total moyen (effectiveWaypoint)
        const displayTrials = Math.max(step.effectiveWaypoint ?? step.waypoint, 0.01);
        const perItemHint = '';

        // Afficher la décomposition du coût si yang > 0
        const costBreakdown = step.yangCost > 0 ? `
            <div class="step-cost-breakdown" style="font-size: 0.65rem; opacity: 0.8;">
                <span style="color: #fbbf24;">${this.formatters.formatNumber(step.yangCost)} yang</span>
            </div>
        ` : '';

        // Coût total moyen (total sur tous les objets pour guild, par tentative pour scroll)
        const displayCost = step.displayAvgCost ?? step.avgCost;
        const avgCostDisplay = `
            <div class="step-cost">${this.formatters.formatCost(displayCost)}</div>
        `;
        
        // Obtenir l'image et le nom traduit de l'objet d'amélioration
        const upgradeItemImage = this.dataService.getUpgradeItemImagePath(step.upgradeType);
        const upgradeItemDisplayName = step.upgradeType === "Forgeron de guilde"
            ? this.translator.t('guildBlacksmith')
            : this.dataService.getUpgradeItemName(step.upgradeType);

        if (step.isEditable && step.customIndex >= 0) {
            if (this.customScenario[step.customIndex] !== step.upgradeType) {
                this.customScenario[step.customIndex] = step.upgradeType;
            }
            
            return `
                <div class="${stepClass}" data-level="${step.customIndex}">
                    <div class="step-header">
                        <span class="step-level">+${step.level}</span>
                        <img src="${upgradeItemImage}" 
                             class="step-icon" 
                             onerror="this.style.display='none'">
                    </div>
                    <div class="step-content">
                        <select class="step-select" data-level="${step.customIndex}">
                            ${options.map(opt => {
                                const optionData = upgradeOptions.find(o => o.internalName === opt);
                                return `
                                    <option value="${opt}" ${opt === step.upgradeType ? 'selected' : ''}>
                                        ${optionData ? optionData.displayName : opt}
                                    </option>
                                `;
                            }).join('')}
                        </select>
                        <div class="step-stats">
                            <div class="step-rate">${step.rate}%</div>
                            <div class="step-trials">${displayTrials.toFixed(1)}x${perItemHint}</div>
                        </div>
                        ${avgCostDisplay}
                        ${costBreakdown}
                    </div>
                    ${materialsHtml}
                </div>
            `;
        } else {
            return `
                <div class="${stepClass}">
                    <div class="step-header">
                        <span class="step-level">+${step.level}</span>
                        <img src="${upgradeItemImage}"
                             class="step-icon"
                             onerror="this.style.display='none'">
                    </div>
                    <div class="step-content">
                        <div class="step-name">${upgradeItemDisplayName}</div>
                        <div class="step-stats">
                            <div class="step-rate">${step.rate}%</div>
                            <div class="step-trials">${displayTrials.toFixed(1)}x${perItemHint}</div>
                        </div>
                        ${avgCostDisplay}
                        ${costBreakdown}
                    </div>
                    ${materialsHtml}
                </div>
            `;
        }
    }

    /**
     * Met à jour le chemin personnalisé
     */
    updateCustomPath() {
        // L'utilisateur a personnalisé : on ne recale plus sur l'optimal
        this._customScenarioEdited = true;

        // Récupérer les nouvelles valeurs pour TOUS les niveaux
        this.elements.upgradePath.querySelectorAll('.step-select').forEach(select => {
            const index = parseInt(select.dataset.level);
            if (index >= 0) {
                this.customScenario[index] = select.value;
            }
        });

        // Notifier le changement
        if (this.onStrategyChanged) {
            this.onStrategyChanged({
                type: 'custom',
                scenario: this.customScenario
            });
        }
    }

    /**
     * Récupère les matériaux formatés pour un niveau
     */
    async getMaterialsForLevel(materials, waypoint) {
        const result = [];
        const safeWaypoint = Math.max(waypoint, 0.01);
        for (const [id, info] of Object.entries(materials)) {
            const name = this.translator.getMaterialName(id);
            result.push({
                id,
                name: name,
                imgName: info.img_name,
                qty: info.qty,
                avgQty: Math.ceil(info.qty * safeWaypoint),
                imgPath: this.dataService.getItemImagePath(id)
            });
        }
        return result;
    }

    /**
     * Attache les tooltips aux étapes du chemin
     */
    attachPathTooltips(pathSteps) {
        const pathElements = this.elements.upgradePath.querySelectorAll('.path-step');
        
        pathElements.forEach((stepElem, i) => {
            const step = pathSteps.find(s => s.level === parseInt(stepElem.querySelector('.step-level').textContent.slice(1)));
            if (!step) return;
            
            const tooltipHandler = (e) => {
                const displayTrials = Math.max(step.effectiveWaypoint ?? step.waypoint, 0.01);
                const displayCost   = step.displayAvgCost ?? step.avgCost;

                // Section matériaux
                let materialsTooltip = '';
                if (step.materials.length > 0) {
                    materialsTooltip = `
                        <div class="tooltip-section">
                            <div class="tooltip-subtitle">${this.translator.t('itemsRequired')}:</div>
                            ${step.materials.map(mat => `
                                <div class="tooltip-row">
                                    <span>${mat.name}:</span>
                                    <span>${mat.avgQty} (${mat.qty}×/essai)</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                // Décomposition du coût par tentative
                const costBreakdown = `
                    <div class="tooltip-section">
                        <div class="tooltip-subtitle">${this.translator.t('costBreakdown')}:</div>
                        ${step.yangCost > 0 ? `
                            <div class="tooltip-row">
                                <span>${this.translator.t('yangCost')}:</span>
                                <span>${this.formatters.formatNumber(step.yangCost)} yang</span>
                            </div>
                        ` : ''}
                        ${step.materialCost > 0 ? `
                            <div class="tooltip-row">
                                <span>${this.translator.t('materialCost')}:</span>
                                <span>${this.formatters.formatCost(step.materialCost)}</span>
                            </div>
                        ` : ''}
                        ${step.upgradeCost > 0 ? `
                            <div class="tooltip-row">
                                <span>${this.translator.t('upgradeCost')}:</span>
                                <span>${this.formatters.formatCost(step.upgradeCost)}</span>
                            </div>
                        ` : ''}
                        <div class="tooltip-row tooltip-row-total">
                            <span>${this.translator.t('totalCostPerTrial')}:</span>
                            <span>${this.formatters.formatCost(step.levelCost)}</span>
                        </div>
                    </div>
                `;

                // Section spécifique forgeron de guilde
                let guildSection = '';
                if (step.isGuildLevel) {
                    const reachProba = step.guildReachValue != null
                        ? (step.guildReachValue * 100).toFixed(1) + '\u202f%'
                        : '—';
                    const totalYang = step.yangCost > 0
                        ? `${this.formatters.formatNumber(Math.round(step.yangCost * displayTrials))} yang`
                        : null;

                    guildSection = `
                        <div class="tooltip-section tooltip-section-guild">
                            <div class="tooltip-subtitle">🔨 ${this.translator.t('guildBlacksmith')}:</div>
                            <div class="tooltip-row">
                                <span>${this.translator.t('guildReachProba')}:</span>
                                <span><strong>${reachProba}</strong></span>
                            </div>
                            <div class="tooltip-row">
                                <span>${this.translator.t('avgTrialsTotal')}:</span>
                                <span><strong>${displayTrials.toFixed(1)}×</strong></span>
                            </div>
                            <div class="tooltip-row tooltip-row-total">
                                <span>${this.translator.t('totalCostAvg')}:</span>
                                <span><strong>${this.formatters.formatCost(displayCost)}</strong></span>
                            </div>
                            ${totalYang ? `
                            <div class="tooltip-row">
                                <span>${this.translator.t('yangCost')} (total):</span>
                                <span>${totalYang}</span>
                            </div>` : ''}
                        </div>
                    `;
                }

                const tooltipContent = `
                    <div class="tooltip-title">${this.translator.t('level')} +${step.level}</div>
                    ${step.isRetrogradePath && step.level < this.startLevel ? `<div class="tooltip-info">📊 ${this.translator.t('retrogradePossible')}</div>` : ''}
                    ${step.isMagicStoneOnly ? `<div class="tooltip-warning">✨ ${this.translator.t('magicStoneRecommended')}</div>` : ''}
                    <div class="tooltip-row">
                        <span>${this.translator.t('avgTrials')}:</span>
                        <span>${displayTrials.toFixed(1)}</span>
                    </div>
                    <div class="tooltip-row">
                        <span>${this.translator.t('avgCost')}:</span>
                        <span>${this.formatters.formatCost(displayCost)}</span>
                    </div>
                    ${guildSection}
                    ${costBreakdown}
                    ${materialsTooltip}
                `;

                this.showTooltip(stepElem, tooltipContent);
            };
            
            stepElem.addEventListener('mouseenter', tooltipHandler);
            stepElem.addEventListener('mouseleave', () => this.hideTooltip());
            
            // Stocker pour nettoyage
            this.tooltipInstances.push({ element: stepElem, handler: tooltipHandler });
        });
    }

    /**
     * Nettoie les tooltips existants
     */
    cleanupTooltips() {
        this.tooltipInstances.forEach(({ element, handler }) => {
            element.removeEventListener('mouseenter', handler);
            element.removeEventListener('mouseleave', () => this.hideTooltip());
        });
        this.tooltipInstances = [];
    }

    /**
     * Calcule le taux de succès selon la nouvelle mécanique
     */
    calculateSuccessRate(level, upgradeType, baseRate) {
        const itemId = this.dataService.getUpgradeItemId(upgradeType);
        
        switch (itemId) {
            case 25040: // BLESSING_SCROLL
            case 25041: // MAGIC_STONE
                // Pour ces items, TOUJOURS utiliser le taux de base de l'item
                return baseRate || 1;
            case 39007: // BLACKSMITH_MANUAL
                if (level <= 9) {
                    return [100, 100, 100, 100, 70, 60, 50, 30, 20][level - 1] || 20;
                }
                return baseRate || 1;
            case 39022: // DRAGON_GOD_SCROLL
                if (level <= 9) {
                    return [100, 100, 100, 100, 45, 40, 35, 25, 20][level - 1] || 20;
                }
                return baseRate || 1;
            case 39014: // WAR_SCROLL
                if (level <= 4) {
                    return 100;
                }
                return baseRate || 1;
            default:
                return baseRate || 1;
        }
    }

    async calculateMaterialCost(materials) {
        let cost = 0;
        Object.entries(materials).forEach(([id, info]) => {
            cost += this.dataService.getMaterialCost(id) * (info.qty || 0);
        });
        return cost;
    }

    /**
     * Affiche les objets requis
     */
    async displayRequiredItems(strategy) {
        const items = {};
        const path = strategy.path || [];
        const fullPath = strategy.fullPath || [];
        const extendedWaypoints = strategy.extendedWaypoints || strategy.waypoints || [];
        const itemData = await this.dataService.getItemById(this.currentItemId);
        const meta = this._preparationMeta || { scaleFactor: 1, isMean: true };
        const sf = meta.scaleFactor;

        // Déterminer le niveau minimum à prendre en compte (même logique que displayUpgradePath)
        let displayStartLevel = 1;

        if (this.startLevel > 0) {
            let minReachableLevel = this.startLevel;

            // Vérifier le type d'amélioration au niveau de départ
            let startUpgradeType = "Pierre magique";

            if (this.currentStrategy === 'custom' && this.customScenario[this.startLevel]) {
                startUpgradeType = this.customScenario[this.startLevel];
            } else if (fullPath[this.startLevel]) {
                startUpgradeType = fullPath[this.startLevel];
            } else if (path[0]) {
                startUpgradeType = path[0].name;
            }

            // Si c'est une Pierre magique au départ, pas de rétrogradation possible
            if (startUpgradeType === "Pierre magique") {
                displayStartLevel = this.startLevel + 1;
            } else {
                // Analyser jusqu'où on peut rétrograder
                for (let level = this.startLevel; level > 0; level--) {
                    let upgradeType;

                    if (this.currentStrategy === 'custom' && this.customScenario[level - 1]) {
                        upgradeType = this.customScenario[level - 1];
                    } else if (fullPath && fullPath[level - 1]) {
                        upgradeType = fullPath[level - 1];
                    } else {
                        // Valeurs par défaut
                        if (level <= 4) {
                            upgradeType = "Parchemin de Guerre";
                        } else if (level <= 9) {
                            upgradeType = "Parchemin du Dieu Dragon";
                        } else {
                            upgradeType = "Pierre magique";
                        }
                    }

                    // Calculer le taux
                    const levelData = itemData[level.toString()] || { success_rate: 0 };
                    const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);

                    // Si taux 100% ou Pierre magique, on ne peut pas descendre en dessous
                    if (rate === 100 || upgradeType === "Pierre magique") {
                        minReachableLevel = level;
                        break;
                    }

                    minReachableLevel = level - 1;
                }

                displayStartLevel = Math.max(1, minReachableLevel);
            }
        }

        // Parcourir TOUS les niveaux depuis displayStartLevel jusqu'à endLevel
        for (let level = displayStartLevel; level <= this.endLevel; level++) {
            const pathIndex = level - this.startLevel - 1;
            const pathData = pathIndex >= 0 ? path[pathIndex] : null;
            const rawWp = pathData?.expectedTrials || extendedWaypoints[level - 1] || 0;
            const wpRate = pathData?.rate;
            let waypointValue;
            if (wpRate === 100 && rawWp <= 1.01) {
                waypointValue = rawWp;
            } else {
                waypointValue = rawWp * sf;
            }

            if (waypointValue > 0.01) {
                let upgradeType;

                // Forcer Pierre magique pour les niveaux > 9
                if (level > 9) {
                    upgradeType = "Pierre magique";
                } else if (this.currentStrategy === 'custom') {
                    upgradeType = this.customScenario[level - 1] || "Parchemin de bénédiction";
                } else {
                    // Utiliser fullPath pour la stratégie optimale
                    if (fullPath[level - 1]) {
                        upgradeType = fullPath[level - 1];
                    } else if (pathData?.name) {
                        upgradeType = pathData.name;
                    } else {
                        // Par défaut
                        if (level <= 4) {
                            upgradeType = "Parchemin de Guerre";
                        } else if (level <= 9) {
                            upgradeType = "Parchemin de bénédiction";
                        } else {
                            upgradeType = "Pierre magique";
                        }
                    }
                }
                
                // Le forgeron de guilde n'est pas un objet à acheter → traité séparément
                if (upgradeType === "Forgeron de guilde") continue;

                if (!items[upgradeType]) {
                    items[upgradeType] = {
                        name: upgradeType,
                        quantity: 0,
                        unitCost: this.dataService.getUpgradeCost(upgradeType),
                        quantityLower: 0,
                        quantityUpper: 0
                    };
                }

                const levelInterval = strategy.intervals?.byLevel?.[level - 1];
                const safeWaypoint = Math.max(waypointValue, 0.01);
                items[upgradeType].quantity += Math.round(safeWaypoint);
                if (this.showIntervals && levelInterval) {
                    items[upgradeType].quantityLower += Math.ceil(Math.max(levelInterval.ci95.lower, 0.01));
                    items[upgradeType].quantityUpper += Math.ceil(levelInterval.ci95.upper);
                }
            }
        }

        // Rangée spéciale : objets de base consommés par le forgeron de guilde (scénario MDP)
        let guildRowHtml = '';
        if (strategy.type === 'hybrid' && strategy.itemsMode && strategy.expectedItems > 0) {
            const itemsConsumed = strategy.expectedItems < Infinity
                ? Math.ceil(strategy.expectedItems)
                : '∞';
            const baseItemCost  = strategy.baseItemPrice || 0;
            const guildItemsCost = typeof itemsConsumed === 'number'
                ? baseItemCost * itemsConsumed
                : 0;
            // Nom de l'objet vierge : "{nom de l'objet sans niveau} +0 vierge"
            const rawItemName   = this.dataService.itemNames[this.currentItemId] || '';
            const baseItemName  = this.formatters.removeUpgradeLevel(rawItemName);
            const blankLabel    = baseItemName
                ? `${baseItemName} +0 ${this.translator.t('blankItem')}`
                : this.translator.t('hybridItemsConsumed');
            guildRowHtml = `
                <div class="item-row guild-item-row">
                    <img src="${this.dataService.getItemImagePath(this.currentItemId)}" class="item-icon" onerror="this.style.display='none'">
                    <span class="item-name">${blankLabel}</span>
                    <span class="item-qty">${itemsConsumed}</span>
                    <span class="item-cost">${this.formatters.formatCost(guildItemsCost)}</span>
                </div>`;
        }

        this.elements.requiredItems.innerHTML = guildRowHtml + Object.values(items).map(item => {
            const displayName = this.dataService.getUpgradeItemName(item.name);
            return `
                <div class="item-row">
                    <img src="${this.dataService.getUpgradeItemImagePath(item.name)}" class="item-icon" onerror="this.style.display='none'">
                    <span class="item-name">${displayName}</span>
                    <span class="item-qty" ${this.showIntervals ? `title="${item.quantityLower} - ${item.quantityUpper}"` : ''}>${item.quantity}</span>
                    <span class="item-cost">${this.formatters.formatCost(item.quantity * item.unitCost)}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Affiche les matériaux requis
     */
    async displayRequiredMaterials(strategy) {
        const itemData = await this.dataService.getItemById(this.currentItemId);
        const materials = {};
        const path = strategy.path || [];
        const fullPath = strategy.fullPath || [];
        const extendedWaypoints = strategy.extendedWaypoints || strategy.waypoints || [];
        const metaMat = this._preparationMeta || { scaleFactor: 1, isMean: true };
        const sf = metaMat.scaleFactor;

        // Déterminer le niveau minimum (même logique que displayRequiredItems)
        let displayStartLevel = 1;

        if (this.startLevel > 0) {
            let minReachableLevel = this.startLevel;

            // Vérifier le type d'amélioration au niveau de départ
            let startUpgradeType = "Pierre magique";

            if (this.currentStrategy === 'custom' && this.customScenario[this.startLevel]) {
                startUpgradeType = this.customScenario[this.startLevel];
            } else if (fullPath[this.startLevel]) {
                startUpgradeType = fullPath[this.startLevel];
            } else if (path[0]) {
                startUpgradeType = path[0].name;
            }

            // Si c'est une Pierre magique au départ, pas de rétrogradation possible
            if (startUpgradeType === "Pierre magique") {
                displayStartLevel = this.startLevel + 1;
            } else {
                // Analyser jusqu'où on peut rétrograder
                for (let level = this.startLevel; level > 0; level--) {
                    let upgradeType;

                    if (this.currentStrategy === 'custom' && this.customScenario[level - 1]) {
                        upgradeType = this.customScenario[level - 1];
                    } else if (fullPath && fullPath[level - 1]) {
                        upgradeType = fullPath[level - 1];
                    } else {
                        // Valeurs par défaut
                        if (level <= 4) {
                            upgradeType = "Parchemin de Guerre";
                        } else if (level <= 9) {
                            upgradeType = "Parchemin du Dieu Dragon";
                        } else {
                            upgradeType = "Pierre magique";
                        }
                    }

                    // Calculer le taux
                    const levelData = itemData[level.toString()] || { success_rate: 0 };
                    const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);

                    // Si taux 100% ou Pierre magique, on ne peut pas descendre en dessous
                    if (rate === 100 || upgradeType === "Pierre magique") {
                        minReachableLevel = level;
                        break;
                    }

                    minReachableLevel = level - 1;
                }

                displayStartLevel = Math.max(1, minReachableLevel);
            }
        }

        // Pour le scénario guild MDP, calculer reach[k] = P(item atteint le palier k depuis +0).
        // reach[0] = 1 ; à chaque palier guild on multiplie par son taux ; scroll ne détruit pas.
        // Cela permet d'estimer le nombre attendu d'essais à chaque palier guild :
        //   expected_attempts(k) = expectedItems × reach[k]
        let guildReach = null;
        if (strategy.type === 'hybrid' && strategy.itemsMode &&
            strategy.expectedItems > 0 && isFinite(strategy.expectedItems)) {
            guildReach = {};
            let reach = 1;
            for (const step of path) {
                const k = step.level - 1; // palier 0-indexé
                guildReach[k] = reach;
                if (step.name === 'Forgeron de guilde') {
                    reach *= (step.rate / 100); // taux déjà en pourcentage (ex: 25.0)
                }
            }
        }

        // Parcourir TOUS les niveaux depuis displayStartLevel jusqu'à endLevel
        for (let level = displayStartLevel; level <= this.endLevel; level++) {
            const levelData = itemData[level.toString()];
            const pathIndex = level - this.startLevel - 1;
            const pathData = pathIndex >= 0 ? path[pathIndex] : null;
            const rawWpM = pathData?.expectedTrials || extendedWaypoints[level - 1] || 0;
            const wpRateM = pathData?.rate;
            let waypointValue;
            if (wpRateM === 100 && rawWpM <= 1.01) {
                waypointValue = rawWpM;
            } else {
                waypointValue = rawWpM * sf;
            }

            // Waypoint effectif : pour les paliers guild, on multiplie par expectedItems × reach[k]
            let effectiveWaypoint = waypointValue;
            if (guildReach !== null) {
                const k = level - 1; // 0-indexed
                const isGuildLevel = fullPath[level - 1] === 'Forgeron de guilde';
                if (isGuildLevel) {
                    effectiveWaypoint = strategy.expectedItems * (guildReach[k] ?? 0);
                }
                // Pour les niveaux scroll après la phase guild, waypointValue reste correct
            }

            if (levelData?.materials && effectiveWaypoint > 0.01) {
                Object.entries(levelData.materials).forEach(([id, info]) => {
                    if (!materials[id]) {
                        materials[id] = {
                            id,
                            name: this.translator.getMaterialName(id),
                            imgName: info.img_name,
                            quantity: 0,
                            unitCost: this.dataService.getMaterialCost(id)
                        };
                    }
                    materials[id].quantity += info.qty * Math.round(Math.max(effectiveWaypoint, 0.01));
                });
            }
        }

        this.elements.requiredMaterials.innerHTML = Object.values(materials).map(mat => `
            <div class="item-row">
                <img src="${this.dataService.getItemImagePath(mat.id)}" class="item-icon" onerror="this.style.display='none'">
                <span class="item-name">${mat.name}</span>
                <span class="item-qty">${mat.quantity}</span>
                <span class="item-cost">${this.formatters.formatCost(mat.quantity * mat.unitCost)}</span>
            </div>
        `).join('');
    }

    showTooltip(element, content) {
        this.tooltipContent.innerHTML = content;
        this.tooltip.style.display = 'block';

        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.top - tooltipRect.height - 10;

        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 10;
        }

        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';

        // Masquer le tooltip au scroll pour éviter qu'il ne se décale
        this._scrollHideHandler = () => this.hideTooltip();
        window.addEventListener('scroll', this._scrollHideHandler, { once: true, capture: true });
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
        if (this._scrollHideHandler) {
            window.removeEventListener('scroll', this._scrollHideHandler, { capture: true });
            this._scrollHideHandler = null;
        }
    }

    getCurrentStrategy() {
        return this.currentStrategy;
    }

    getCustomScenario() {
        return this.customScenario;
    }

    /**
     * Met à jour l'affichage lors d'un changement de langue
     */
    async updateLanguage() {
        if (this.strategies.optimal) {
            this.updateScenarioTabs();
        }

        if (this.strategies[this.currentStrategy]) {
            await this.renderCurrentPane();
        }

        if (this.currentItemId) {
            const itemNameElement = document.getElementById('analysisItemName');
            if (itemNameElement) {
                const itemName = this.dataService.itemNames[this.currentItemId] || `Item ${this.currentItemId}`;
                itemNameElement.textContent = this.formatters.removeUpgradeLevel(itemName);
            }
        }
    }
    
    /**
     * Nettoyage
     */
    destroy() {
        this.translator.removeObserver(this);
        this.cleanupTooltips();
    }
}