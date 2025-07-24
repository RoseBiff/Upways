/**
 * Composant d'affichage des résultats d'analyse - Version 3.6
 * Utilisation des noms traduits pour les objets d'amélioration
 */
export class AnalysisComponent {
    constructor(dataService, translator, formatters, onStrategyChanged) {
        this.dataService = dataService;
        this.translator = translator;
        this.formatters = formatters;
        this.onStrategyChanged = onStrategyChanged;
        
        this.currentStrategy = 'optimal';
        this.strategies = {};
        this.customScenario = [];
        this.startLevel = 0;
        this.endLevel = 9;
        this.currentItemId = null;
        this.showIntervals = true;
        this.tooltipInstances = [];
        this.expandedGroups = new Set(); // Pour gérer l'expansion des groupes
        
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
     */
    initCustomScenario() {
        this.customScenario = [];
        
        // Inclure TOUS les niveaux depuis 1 jusqu'à endLevel
        for (let level = 1; level <= this.endLevel; level++) {
            if (level <= 4) {
                this.customScenario[level - 1] = "Parchemin de Guerre";
            } else if (level > 9) {
                // Forcer pierre magique pour les niveaux > 9
                this.customScenario[level - 1] = "Pierre magique";
            } else {
                // Par défaut, utiliser Parchemin du Dieu Dragon pour les niveaux 5-9
                this.customScenario[level - 1] = "Parchemin du Dieu Dragon";
            }
        }
    }

    /**
     * Met à jour l'affichage des cartes de stratégie
     */
    updateStrategyCards() {
        Object.entries(this.strategies).forEach(([key, strategy]) => {
            if (!strategy) return;
            
            const card = document.querySelector(`.strategy-card[data-strategy="${key}"]`);
            if (!card) return;

            // Données principales
            const totalTrials = Math.round(strategy.markov.totalTrials);
            const totalCost = this.formatters.formatCost(strategy.totalCost);
            
            // Récupérer les points du graphique
            const points = strategy.markov.calculateTrialsProbabilities();
            
            // Trouver les essais correspondant à 5% et 95% de probabilité
            let trials5 = null;
            let trials95 = null;
            
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                
                if (trials5 === null && point.y >= 5) {
                    trials5 = point.x;
                }
                
                if (trials95 === null && point.y >= 95) {
                    trials95 = point.x;
                    break;
                }
            }
            
            if (trials95 === null && points.length > 0) {
                trials95 = points[points.length - 1].x;
            }
            
            if (trials5 === null && points.length > 0) {
                trials5 = points[0].x;
            }
            
            trials5 = Math.round(trials5 || totalTrials * 0.5);
            trials95 = Math.round(trials95 || totalTrials * 2);
            
            // Reconstruire le contenu de la carte avec traductions
            card.innerHTML = `
                <div class="strategy-header">
                    <span class="strategy-icon">${key === 'optimal' ? '⭐' : '🎨'}</span>
                    <h3>${this.translator.t(key === 'optimal' ? 'optimal' : 'custom')}</h3>
                </div>
                
                <div class="strategy-body">
                    <div class="strategy-main-stats">
                        <div class="main-stat">
                            <span class="main-stat-label">${this.translator.t('avgCost')}</span>
                            <span class="main-stat-value">${totalCost}</span>
                        </div>
                    </div>
                    
                    <div class="strategy-details">
                        <div class="detail-item">
                            <span class="detail-label">${this.translator.t('avgTrialsTotal')}:</span>
                            <span class="detail-value highlight">${totalTrials}</span>
                        </div>
                        
                        ${this.showIntervals ? `
                        <div class="detail-item">
                            <span class="detail-label">${this.translator.t('interval95')}:</span>
                            <span class="detail-value">${trials5} - ${trials95} ${this.translator.t('trials')}</span>
                        </div>
                        ` : ''}
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
        
        // Utiliser les waypoints étendus si disponibles
        const fullWaypoints = strategy.extendedWaypoints || strategy.markov.waypoints;
        const fullIntervals = strategy.markov.intervals.byLevel;

        // Nettoyer les anciens tooltips
        this.cleanupTooltips();

        // Construire le chemin complet
        const pathSteps = [];
        
        for (let level = 1; level <= this.endLevel; level++) {
            const waypointValue = fullWaypoints[level - 1] || 0;
        
            if (waypointValue > 0.01 || (level >= this.startLevel && level <= this.endLevel)) {
                const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0, yang_cost: 0 };
            
                let upgradeType;
                let isEditable = false;
                let customIndex = level - 1;

                // Déterminer le type d'amélioration
                if (isCustom) {
                    upgradeType = this.customScenario[customIndex] || "Parchemin de bénédiction";
                    // Éditable uniquement pour les niveaux 5-9
                    isEditable = level >= 5 && level <= 9;
                } else {
                    if (strategy.fullPath && strategy.fullPath[customIndex]) {
                        upgradeType = strategy.fullPath[customIndex];
                    } else if (level > this.startLevel && level <= this.endLevel) {
                        const pathIndex = level - this.startLevel - 1;
                        upgradeType = strategy.path[pathIndex].name;
                    } else {
                        if (level <= 4) {
                            upgradeType = "Parchemin de Guerre";
                        } else if (level <= 9) {
                            upgradeType = "Parchemin de bénédiction";
                        } else {
                            upgradeType = "Pierre magique";
                        }
                    }
                }

                const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);
                const levelInterval = fullIntervals[level - 1] || {
                    mean: waypointValue,
                    std: Math.sqrt(waypointValue),
                    ci95: {
                        lower: Math.max(0, waypointValue - 1.96 * Math.sqrt(waypointValue)),
                        upper: waypointValue + 1.96 * Math.sqrt(waypointValue)
                    }
                };

                // Calculer les coûts
                const yangCost = levelData.yang_cost || 0;
                const materialCost = this.calculateMaterialCost(levelData.materials || {});
                const upgradeCost = this.dataService.getUpgradeCost(upgradeType);
                
                const yangCostInMillions = yangCost / 1000000;
                const totalLevelCostPerTrial = yangCostInMillions + materialCost + upgradeCost;
                const avgCost = totalLevelCostPerTrial * waypointValue;

                const itemInterval = {
                    lower: Math.ceil(levelInterval.ci95.lower),
                    upper: Math.ceil(levelInterval.ci95.upper)
                };
                const costInterval = {
                    lower: totalLevelCostPerTrial * levelInterval.ci95.lower,
                    upper: totalLevelCostPerTrial * levelInterval.ci95.upper
                };

                const isBelowStart = level <= this.startLevel;
                const isTarget = level > this.startLevel && level <= this.endLevel;
                const isMagicStoneOnly = level > 9;

                // Récupérer les matériaux
                const materials = await this.getMaterialsForLevel(levelData.materials || {}, waypointValue);

                pathSteps.push({
                    level,
                    upgradeType,
                    rate,
                    waypoint: waypointValue,
                    isEditable,
                    customIndex,
                    isBelowStart,
                    isTarget,
                    isMagicStoneOnly,
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
        let pathHtml = '';
        
        if (this.endLevel > 20) {
            pathHtml = this.createGroupedPathDisplay(pathSteps, isCustom);
        } else {
            pathHtml = '<div class="upgrade-path">';
            pathSteps.forEach(step => {
                pathHtml += this.createPathStepHtml(step, isCustom);
            });
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

    /**
     * Crée un affichage groupé pour les chemins très longs
     */
    createGroupedPathDisplay(pathSteps, isCustom) {
        let html = '<div class="upgrade-path grouped">';
        
        // Afficher les premiers niveaux individuellement
        const individualLimit = 20;
        
        // Afficher tous les niveaux jusqu'à individualLimit individuellement
        for (let i = 0; i < pathSteps.length && pathSteps[i].level <= individualLimit; i++) {
            html += this.createPathStepHtml(pathSteps[i], isCustom);
        }
        
        // Grouper les niveaux restants par dizaines
        const groupSize = 10;
        let currentGroupStart = individualLimit + 1; // Commencer à 21
        
        while (currentGroupStart <= this.endLevel) {
            const groupEnd = Math.min(currentGroupStart + groupSize - 1, this.endLevel);
            
            // Collecter les steps de ce groupe
            const groupSteps = pathSteps.filter(step => 
                step.level >= currentGroupStart && step.level <= groupEnd
            );
            
            if (groupSteps.length > 0) {
                // Calculer les totaux du groupe
                let totalCost = 0;
                let totalTrials = 0;
                const groupMaterials = new Map();
                
                groupSteps.forEach(step => {
                    totalCost += step.avgCost;
                    totalTrials += step.waypoint;
                    
                    // Agréger les matériaux
                    step.materials.forEach(mat => {
                        if (groupMaterials.has(mat.id)) {
                            const existing = groupMaterials.get(mat.id);
                            existing.avgQty += mat.avgQty;
                        } else {
                            groupMaterials.set(mat.id, {
                                ...mat,
                                avgQty: mat.avgQty
                            });
                        }
                    });
                });
                
                const groupKey = `${currentGroupStart}-${groupEnd}`;
                const isExpanded = this.expandedGroups.has(groupKey);
                
                html += `
                    <div class="path-group" data-group="${groupKey}">
                        <div class="group-header ${isExpanded ? 'expanded' : ''}" data-group-id="${groupKey}">
                            <div class="group-toggle">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="${isExpanded ? '6 9 12 15 18 9' : '9 6 15 12 9 18'}"/>
                                </svg>
                            </div>
                            <div class="group-info">
                                <span class="group-range">+${currentGroupStart} → +${groupEnd}</span>
                                <span class="group-summary">
                                    ${Math.round(totalTrials)} ${this.translator.t('trials')} • 
                                    ${this.formatters.formatCost(totalCost)}
                                </span>
                            </div>
                            <div class="group-upgrade-icon">
                                <img src="${this.dataService.getUpgradeItemImagePath('Pierre magique')}" 
                                     class="group-upgrade-icon-img" 
                                     title="${this.dataService.getUpgradeItemName('Pierre magique')}"
                                     onerror="this.style.display='none'">
                            </div>
                        </div>
                        <div class="group-content" style="${isExpanded ? '' : 'display: none;'}">
                            ${groupSteps.map(step => this.createPathStepHtml(step, isCustom)).join('')}
                        </div>
                    </div>
                `;
            }
            
            currentGroupStart += groupSize;
        }
        
        html += '</div>';
        return html;
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
        
        if (step.level <= 4) {
            options = ["Parchemin de Guerre"];
        } else if (step.level > 9) {
            options = ["Pierre magique"];
        } else {
            options = ["Parchemin de bénédiction", "Manuel de Forgeron", "Parchemin du Dieu Dragon", "Pierre magique"];
        }
        
        let stepClass = 'path-step';
        if (step.isBelowStart) stepClass += ' below-start';
        if (step.isTarget) stepClass += ' target-level';
        if (step.isEditable) stepClass += ' editable';
        if (step.isMagicStoneOnly) stepClass += ' magic-stone-only';
        
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
        
        // Obtenir l'image de l'objet d'amélioration
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
                            <div class="step-trials">${step.waypoint.toFixed(1)}x</div>
                        </div>
                        <div class="step-cost">${this.formatters.formatCost(step.avgCost)}</div>
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
                            <div class="step-trials">${step.waypoint.toFixed(1)}x</div>
                        </div>
                        <div class="step-cost">${this.formatters.formatCost(step.avgCost)}</div>
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
        // Récupérer les nouvelles valeurs
        this.elements.upgradePath.querySelectorAll('.step-select').forEach(select => {
            const index = parseInt(select.dataset.level);
            if (index >= 0) {
                const level = index + 1;
                if (level >= 5 && level <= 9) {
                    // Permettre toutes les options pour les niveaux 5-9
                    this.customScenario[index] = select.value;
                } else if (level > 9) {
                    // Forcer Pierre magique pour les niveaux > 9
                    this.customScenario[index] = "Pierre magique";
                    select.value = "Pierre magique";
                }
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
        for (const [id, info] of Object.entries(materials)) {
            const name = this.translator.getMaterialName(id);
            result.push({
                id,
                name: name,
                imgName: info.img_name,
                qty: info.qty,
                avgQty: Math.ceil(info.qty * waypoint),
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
                    ${step.isBelowStart ? `<div class="tooltip-warning">⚠️ ${this.translator.t('belowStartLevel')}</div>` : ''}
                    ${step.isMagicStoneOnly ? `<div class="tooltip-warning">✨ ${this.translator.t('magicStoneRecommended')}</div>` : ''}
                    <div class="tooltip-row">
                        <span>${this.translator.t('avgTrials')}:</span>
                        <span>${step.waypoint.toFixed(1)}</span>
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
     * Helpers
     */
    calculateSuccessRate(level, upgradeType, baseRate) {
        switch (upgradeType) {
            case "Parchemin de bénédiction":
            case "Pierre magique":
                return baseRate || 0;
            case "Manuel de Forgeron":
                if (level <= 9) {
                    return [100, 100, 90, 80, 70, 60, 50, 30, 20][level - 1] || 0;
                }
                return baseRate || 0;
            case "Parchemin du Dieu Dragon":
                if (level <= 9) {
                    return [100, 75, 65, 55, 45, 40, 35, 25, 20][level - 1] || 0;
                }
                return baseRate || 0;
            case "Parchemin de Guerre":
                return 100;
            default:
                return 0;
        }
    }

    calculateMaterialCost(materials) {
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
        const fullWaypoints = strategy.extendedWaypoints || strategy.markov.waypoints;
        
        for (let level = 1; level <= this.endLevel; level++) {
            const waypointValue = fullWaypoints[level - 1] || 0;
            
            if (waypointValue > 0.01) {
                let upgradeType;
                
                if (this.currentStrategy === 'custom') {
                    upgradeType = this.customScenario[level - 1] || "Parchemin de bénédiction";
                } else {
                    if (strategy.fullPath && strategy.fullPath[level - 1]) {
                        upgradeType = strategy.fullPath[level - 1];
                    } else if (level > this.startLevel && level <= this.endLevel) {
                        const pathIndex = level - this.startLevel - 1;
                        upgradeType = strategy.path[pathIndex].name;
                    } else {
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
                
                const levelInterval = strategy.markov.intervals.byLevel[level - 1];
                items[upgradeType].quantity += Math.round(waypointValue);
                if (this.showIntervals && levelInterval) {
                    items[upgradeType].quantityLower += Math.ceil(levelInterval.ci95.lower);
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
        const fullWaypoints = strategy.extendedWaypoints || strategy.markov.waypoints;
        
        for (let level = 1; level <= this.endLevel; level++) {
            const levelData = itemData[level.toString()];
            const waypointValue = fullWaypoints[level - 1] || 0;
            
            if (levelData?.materials && waypointValue > 0.01) {
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
                    materials[id].quantity += info.qty * Math.round(waypointValue);
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