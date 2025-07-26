/**
 * Composant d'affichage des résultats d'analyse - Version 3.5
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
        
        this.initElements();
        this.attachEvents();
        this.initTooltip();
        
        // S'abonner aux changements de langue
        this.translator.addObserver(this);
    }

    initElements() {
        this.elements = {
            analysisLevels: document.getElementById('analysisLevels'),
            strategyDetails: document.getElementById('strategyDetails'),
            upgradePath: document.getElementById('upgradePath'),
            requiredItems: document.getElementById('requiredItems'),
            requiredMaterials: document.getElementById('requiredMaterials'),
            
            // Cards de stratégies
            optimalCost: document.getElementById('optimalCost'),
            optimalRange: document.getElementById('optimalRange'),
            customCost: document.getElementById('customCost'),
            customRange: document.getElementById('customRange'),
            
            // Tooltip
            tooltip: document.getElementById('tooltip'),
            tooltipContent: document.getElementById('tooltipContent')
        };
    }

    attachEvents() {
        // Sélection de stratégie
        document.querySelectorAll('.strategy-card').forEach(card => {
            card.addEventListener('click', () => this.selectStrategy(card.dataset.strategy));
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
            this.updateStrategyCards();
            this.displayStrategyDetails();
        }
    }

    /**
     * Définit les stratégies calculées
     */
    setStrategies(strategies) {
        this.strategies = strategies;
        this.updateStrategyCards();
    }

    /**
     * Définit les paramètres de l'analyse
     */
    setAnalysisParams(params) {
        this.startLevel = params.startLevel;
        this.endLevel = params.endLevel;
        this.currentItemId = params.itemId;
        
        // Mettre à jour l'affichage des niveaux
        this.elements.analysisLevels.textContent = `(+${this.startLevel} → +${this.endLevel})`;
        
        // Initialiser le scénario personnalisé
        this.initCustomScenario();
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
     * Met à jour l'affichage des cartes de stratégie avec un design simplifié
     */
    updateStrategyCards() {
        Object.entries(this.strategies).forEach(([key, strategy]) => {
            if (!strategy) return;
            
            const card = document.querySelector(`.strategy-card[data-strategy="${key}"]`);
            if (!card) return;

            // Données principales
            const totalTrials = Math.round(strategy.totalTrials || 0);
            const totalCost = this.formatters.formatCost(strategy.totalCost || 0);
            
            // Intervalles basés sur la distribution
            let trials5 = null;
            let trials50 = null; // Médiane
            let trials95 = null;
            let trialsQ1 = null;
            let trialsQ3 = null;
            
            if (strategy.intervals?.total?.percentiles) {
                // Utiliser les valeurs calculées depuis la distribution
                trials5 = Math.round(strategy.intervals.total.percentiles.p5);
                trialsQ1 = Math.round(strategy.intervals.total.percentiles.p25);
                trials50 = Math.round(strategy.intervals.total.percentiles.p50);
                trialsQ3 = Math.round(strategy.intervals.total.percentiles.p75);
                trials95 = Math.round(strategy.intervals.total.percentiles.p95);
            } else if (strategy.intervals?.total?.ci95) {
                // Fallback sur ci95
                trials5 = Math.round(strategy.intervals.total.ci95.lower);
                trials95 = Math.round(strategy.intervals.total.ci95.upper);
                trials50 = Math.round((trials5 + trials95) / 2);
                trialsQ1 = Math.round((trials5 + trials50) / 2);
                trialsQ3 = Math.round((trials50 + trials95) / 2);
            } else {
                // Fallback avec approximation
                trials5 = Math.round(totalTrials * 0.5);
                trialsQ1 = Math.round(totalTrials * 0.75);
                trials50 = totalTrials;
                trialsQ3 = Math.round(totalTrials * 1.25);
                trials95 = Math.round(totalTrials * 2);
            }
            
            // S'assurer que les valeurs sont cohérentes
            trials5 = Math.max(1, Math.min(trials5, totalTrials));
            trials95 = Math.max(totalTrials, trials95);
            
            // Reconstruire le contenu de la carte avec un design simplifié
            card.innerHTML = `
                <div class="strategy-header">
                    <span class="strategy-icon">${key === 'optimal' ? '⭐' : '🎨'}</span>
                    <h3>${this.translator.t(key === 'optimal' ? 'optimal' : 'custom')}</h3>
                </div>
                
                <div class="strategy-body">
                    <!-- Coût principal en grand -->
                    <div class="strategy-main-stats">
                        <div class="main-stat">
                            <span class="main-stat-label">${this.translator.t('avgCost')}</span>
                            <span class="main-stat-value">${totalCost}</span>
                        </div>
                    </div>
                    
                    <!-- Statistiques détaillées -->
                    <div class="strategy-details">
                        <!-- Section Tentatives -->
                        <div class="detail-section stats-section">
                            <div class="section-header">
                                <span class="section-icon">📊 ${this.translator.t('trialsStatistics')}</span>
                            </div>
                            
                            <div class="stats-grid">
                                <div class="stat-item highlight">
                                    <div class="stat-label">${this.translator.t('avgTrialsShort')}</div>
                                    <div class="stat-value">${totalTrials}</div>
                                </div>
                                
                                <div class="stat-item">
                                    <div class="stat-label">${this.translator.t('medianShort')}</div>
                                    <div class="stat-value">${trials50}</div>
                                </div>
                            </div><br>
                                        ${this.showIntervals && strategy.intervals?.total ? `
                        <!-- Section Intervalles avec visualisation améliorée -->
                        <div class="detail-section intervals-section">

                            
                            <div class="interval-display">
                                <div class="interval-bar">
                                    <div class="interval-line"></div>
                                    <div class="interval-marker" style="left: 5%">
                                        <div class="marker-dot"></div>
                                        <div class="marker-label">${trials5}</div>
                                        <div class="marker-percentile">5%</div>
                                    </div>
                                    <div class="interval-marker" style="left: 25%">
                                        <div class="marker-dot secondary"></div>
                                        <div class="marker-label">${trialsQ1}</div>
                                        <div class="marker-percentile">Q1</div>
                                    </div>
                                    <div class="interval-marker" style="left: 50%">
                                        <div class="marker-dot primary"></div>
                                        <div class="marker-label">${trials50}</div>
                                        <div class="marker-percentile">${this.translator.t('medianShort')}</div>
                                    </div>
                                    <div class="interval-marker" style="left: 75%">
                                        <div class="marker-dot secondary"></div>
                                        <div class="marker-label">${trialsQ3}</div>
                                        <div class="marker-percentile">Q3</div>
                                    </div>
                                    <div class="interval-marker" style="left: 95%">
                                        <div class="marker-dot"></div>
                                        <div class="marker-label">${trials95}</div>
                                        <div class="marker-percentile">95%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                        

                        ` : ''}
                        
                        <!-- Indicateur de risque -->

                    </div>
                </div>
            `;
            
            // Maintenir l'état actif si nécessaire
            if (key === this.currentStrategy) {
                card.classList.add('active');
            }
        });
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
     * Sélectionne une stratégie
     */
    selectStrategy(key) {
        this.currentStrategy = key;
        
        // Mettre à jour les cartes
        document.querySelectorAll('.strategy-card').forEach(card => {
            card.classList.toggle('active', card.dataset.strategy === key);
        });

        // Mettre à jour les détails
        this.displayStrategyDetails();
        
        // Mettre à jour le graphique
        if (window.app && window.app.chartComponent && this.strategies[key]) {
            window.app.chartComponent.update(this.strategies[key]);
        }
    }

    /**
     * Affiche les détails de la stratégie sélectionnée
     */
    async displayStrategyDetails() {
        const strategy = this.strategies[this.currentStrategy];
        if (!strategy) return;

        // Chemin d'amélioration
        await this.displayUpgradePath(strategy);
        
        // Objets requis
        await this.displayRequiredItems(strategy);
        
        // Matériaux requis
        await this.displayRequiredMaterials(strategy);
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

        this.cleanupTooltips();

        const pathSteps = [];
        
        // Déterminer le niveau minimum à afficher
        let displayStartLevel = 1;
        
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
            
            // Si c'est une Pierre magique au départ, pas de rétrogradation possible
            if (startUpgradeType === "Pierre magique") {
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
        
        // Construire les steps pour tous les niveaux à afficher
        for (let level = displayStartLevel; level <= this.endLevel; level++) {
            const pathIndex = level - this.startLevel - 1;
            const pathData = pathIndex >= 0 ? path[pathIndex] : null;
            const waypointValue = extendedWaypoints[level - 1] || 0;
        
            if (waypointValue > 0.01 || (level >= displayStartLevel && level <= this.endLevel)) {
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
                    isEditable = level >= 5 && level <= 9;
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
                
                const safeWaypoint = Math.max(waypointValue, 0.01);
                
                const levelInterval = strategy.intervals?.byLevel?.[level - 1] || {
                    mean: safeWaypoint,
                    std: Math.sqrt(safeWaypoint),
                    ci95: {
                        lower: Math.max(0, safeWaypoint - 1.96 * Math.sqrt(safeWaypoint)),
                        upper: safeWaypoint + 1.96 * Math.sqrt(safeWaypoint)
                    }
                };

                const yangCost = pathData?.yangCost || levelData.yang_cost || 0;
                const materialCost = pathData?.materialCost || await this.calculateMaterialCost(levelData.materials || {});
                const upgradeCost = pathData?.upgradeCost || this.dataService.getUpgradeCost(upgradeType);
                
                const yangCostInMillions = yangCost / 1000000;
                const totalLevelCostPerTrial = yangCostInMillions + materialCost + upgradeCost;
                const avgCost = totalLevelCostPerTrial * safeWaypoint;

                const itemInterval = {
                    lower: Math.ceil(levelInterval.ci95.lower),
                    upper: Math.ceil(levelInterval.ci95.upper)
                };
                const costInterval = {
                    lower: totalLevelCostPerTrial * levelInterval.ci95.lower,
                    upper: totalLevelCostPerTrial * levelInterval.ci95.upper
                };

                const isMagicStoneOnly = level > 9;

                const materials = await this.getMaterialsForLevel(levelData.materials || {}, waypointValue);

                pathSteps.push({
                    level,
                    upgradeType,
                    rate,
                    waypoint: waypointValue,
                    safeWaypoint: safeWaypoint,
                    isEditable,
                    customIndex,
                    isBelowStart,
                    isTarget,
                    isRetrogradePath,
                    isMagicStoneOnly,
                    isStartLevel: level === this.startLevel && this.startLevel > 0,
                    levelInterval,
                    itemInterval,
                    costInterval,
                    levelCost: totalLevelCostPerTrial,
                    avgCost,
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

        // Mettre à jour la connexion visuelle
        setTimeout(() => this.updateStrategyConnection(), 100);
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
        } else if (step.level <= 4) {
            options = ["Parchemin de Guerre"];
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
                    <div class="material-item" title="${mat.name}: ${mat.qty} (${this.translator.t('avgRequired')}: ${mat.avgQty})">
                        <img src="${this.dataService.getItemImagePath(mat.id)}" 
                             class="material-icon" 
                             onerror="this.style.display='none'">
                        <span class="material-qty">${mat.qty}</span>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        // Afficher la décomposition du coût si yang > 0
        const costBreakdown = step.yangCost > 0 ? `
            <div class="step-cost-breakdown" style="font-size: 0.65rem; opacity: 0.8;">
                <span style="color: #fbbf24;">${this.formatters.formatNumber(step.yangCost)} yang</span>
            </div>
        ` : '';
        
        // Afficher le coût total moyen
        const avgCostDisplay = `
            <div class="step-cost">${this.formatters.formatCost(step.avgCost)}</div>
        `;
        
        // Obtenir l'image et le nom traduit de l'objet d'amélioration
        const upgradeItemImage = this.dataService.getUpgradeItemImagePath(step.upgradeType);
        const upgradeItemDisplayName = this.dataService.getUpgradeItemName(step.upgradeType);

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
                            <div class="step-trials">${Math.max(step.waypoint, 0.01).toFixed(1)}x</div>
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
                            <div class="step-trials">${Math.max(step.waypoint, 0.01).toFixed(1)}x</div>
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
                // Créer le contenu du tooltip avec les matériaux
                let materialsTooltip = '';
                if (step.materials.length > 0) {
                    materialsTooltip = `
                        <div class="tooltip-section">
                            <div class="tooltip-subtitle">${this.translator.t('itemsRequired')}:</div>
                            ${step.materials.map(mat => `
                                <div class="tooltip-row">
                                    <span>${mat.name}:</span>
                                    <span>${mat.qty} (${this.translator.t('avgRequired')}: ${mat.avgQty})</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                // Ajouter la décomposition des coûts
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
                        <div class="tooltip-row" style="border-top: 1px solid var(--border-color); padding-top: 0.25rem; margin-top: 0.25rem;">
                            <span>${this.translator.t('totalCostPerTrial')}:</span>
                            <span>${this.formatters.formatCost(step.levelCost)}</span>
                        </div>
                    </div>
                `;
                
                const tooltipContent = `
                    <div class="tooltip-title">${this.translator.t('level')} +${step.level}</div>
                    ${step.isRetrogradePath && step.level < this.startLevel ? `<div class="tooltip-info">📊 ${this.translator.t('retrogradePossible')}</div>` : ''}
                    ${step.isMagicStoneOnly ? `<div class="tooltip-warning">✨ ${this.translator.t('magicStoneRecommended')}</div>` : ''}
                    <div class="tooltip-row">
                        <span>${this.translator.t('avgTrials')}:</span>
                        <span>${Math.max(step.waypoint, 0.01).toFixed(1)}</span>
                    </div>
                    <div class="tooltip-row">
                        <span>${this.translator.t('avgCost')}:</span>
                        <span>${this.formatters.formatCost(step.avgCost)}</span>
                    </div>
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

    updateStrategyConnection() {
        // Supprimer l'ancienne connexion si elle existe
        const existingConnection = document.querySelector('.strategy-connection');
        if (existingConnection) {
            existingConnection.remove();
        }

        // Créer la nouvelle connexion
        const activeCard = document.querySelector(`.strategy-card[data-strategy="${this.currentStrategy}"]`);
        const pathSection = document.querySelector('.detail-section');

        if (activeCard && pathSection) {
            const connection = document.createElement('div');
            connection.className = 'strategy-connection';

            const container = document.getElementById('analysisTab');
            const cardRect = activeCard.getBoundingClientRect();
            const pathRect = pathSection.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const cardBottom = cardRect.bottom - containerRect.top;
            const pathTop = pathRect.top - containerRect.top;
            const centerX = cardRect.left + cardRect.width / 2 - containerRect.left;

            const height = pathTop - cardBottom - 10;

            connection.style.left = centerX + 'px';
            connection.style.top = cardBottom + 'px';
            connection.style.height = height + 'px';

            container.appendChild(connection);

            requestAnimationFrame(() => {
                connection.classList.add('active');
            });
        }
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
        
        // Commencer au niveau suivant le niveau de départ (startLevel + 1)
        const startDisplayLevel = this.startLevel + 1;
        
        for (let level = startDisplayLevel; level <= this.endLevel; level++) {
            const pathIndex = level - startDisplayLevel;
            const pathData = path[pathIndex];
            const waypointValue = pathData?.expectedTrials || extendedWaypoints[level - 1] || 0;
            
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

        this.elements.requiredItems.innerHTML = Object.values(items).map(item => {
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
        const extendedWaypoints = strategy.extendedWaypoints || strategy.waypoints || [];
        
        // Commencer au niveau suivant le niveau de départ (startLevel + 1)
        const startDisplayLevel = this.startLevel + 1;
        
        for (let level = startDisplayLevel; level <= this.endLevel; level++) {
            const levelData = itemData[level.toString()];
            const pathIndex = level - startDisplayLevel;
            const pathData = path[pathIndex];
            const waypointValue = pathData?.expectedTrials || extendedWaypoints[level - 1] || 0;
            
            if (levelData?.materials && waypointValue > 0.01 && level > this.startLevel) {
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
                    materials[id].quantity += info.qty * Math.round(Math.max(waypointValue, 0.01));
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
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
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
            this.updateStrategyCards();
        }
        
        if (this.strategies[this.currentStrategy]) {
            await this.displayStrategyDetails();
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