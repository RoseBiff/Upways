/**
 * Composant d'affichage des résultats d'analyse
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
        
        this.initElements();
        this.attachEvents();
        this.initTooltip();
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
     * Initialise le scénario personnalisé
     */
    initCustomScenario() {
        this.customScenario = [];
        for (let i = this.startLevel + 1; i <= this.endLevel; i++) {
            const defaultOption = i <= 4 ? "Parchemin de Guerre" : "Parchemin du Dieu Dragon";
            this.customScenario[i - this.startLevel - 1] = defaultOption;
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
            
            // Mettre à jour toute la structure de la carte
            const totalTrials = Math.round(strategy.markov.totalTrials);
            const totalCost = this.formatters.formatCost(strategy.totalCost);
            
            // Calculer les intervalles basés sur le graphique
            const meanTrials = strategy.markov.totalTrials;
            const points = strategy.markov.calculateTrialsProbabilities();
            
            // Trouver les essais pour 5% et 95% de probabilité
            let trials5 = meanTrials * 0.5;
            let trials95 = meanTrials * 2;
            
            for (const point of points) {
                if (point.y >= 5 && point.x < trials5) {
                    trials5 = point.x;
                }
                if (point.y >= 95 && point.x < trials95) {
                    trials95 = point.x;
                    break;
                }
            }
            
            // Reconstruire le contenu de la carte
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
                            <span class="detail-label">${this.translator.t('avgTrials')}:</span>
                            <span class="detail-value highlight">${totalTrials}</span>
                        </div>
                        
                        ${this.showIntervals ? `
                        <div class="detail-item">
                            <span class="detail-label">${this.translator.t('interval95')}:</span>
                            <span class="detail-value">${Math.round(trials5)} - ${Math.round(trials95)} ${this.translator.t('trials')}</span>
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
    displayStrategyDetails() {
        const strategy = this.strategies[this.currentStrategy];
        if (!strategy) return;

        // Chemin d'amélioration
        this.displayUpgradePath(strategy);
        
        // Objets requis
        this.displayRequiredItems(strategy);
        
        // Matériaux requis
        this.displayRequiredMaterials(strategy);
    }

    /**
     * Affiche le chemin d'amélioration
     */
    displayUpgradePath(strategy) {
        const isCustom = this.currentStrategy === 'custom';
        const itemData = this.dataService.getItemById(this.currentItemId);
        
        if (!strategy.markov || !strategy.markov.waypoints) {
            console.error('Strategy markov data missing');
            return;
        }
        
        const fullWaypoints = strategy.markov.waypoints;
        const fullIntervals = strategy.markov.intervals.byLevel;
        
        // Construire le chemin complet
        const pathSteps = [];
        
        for (let level = 1; level <= this.endLevel; level++) {
            const waypointValue = fullWaypoints[level - 1];
            
            if (waypointValue > 0.01) {
                const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
                
                let upgradeType;
                let isEditable = false;
                let customIndex = -1;
                
                if (level > this.startLevel && level <= this.endLevel) {
                    const pathIndex = level - this.startLevel - 1;
                    upgradeType = strategy.path[pathIndex].name;
                    isEditable = isCustom && level > 4;
                    customIndex = pathIndex;
                } else {
                    upgradeType = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
                }
                
                const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);
                const levelInterval = fullIntervals[level - 1];
                
                // Calculer le coût moyen pour ce niveau
                const materialCost = this.calculateMaterialCost(levelData.materials || {});
                const upgradeCost = this.dataService.getUpgradeCost(upgradeType);
                const levelCost = materialCost + upgradeCost;
                const avgCost = levelCost * waypointValue;
                
                const itemInterval = {
                    lower: Math.ceil(levelInterval.ci95.lower),
                    upper: Math.ceil(levelInterval.ci95.upper)
                };
                const costInterval = {
                    lower: levelCost * levelInterval.ci95.lower,
                    upper: levelCost * levelInterval.ci95.upper
                };
                
                const isBelowStart = level <= this.startLevel;
                const isTarget = level > this.startLevel && level <= this.endLevel;
                
                // Récupérer les matériaux requis pour ce niveau
                const materials = this.getMaterialsForLevel(levelData.materials || {}, waypointValue);
                
                pathSteps.push({
                    level,
                    upgradeType,
                    rate,
                    waypoint: waypointValue,
                    isEditable,
                    customIndex,
                    isBelowStart,
                    isTarget,
                    levelInterval,
                    itemInterval,
                    costInterval,
                    levelCost,
                    avgCost,
                    materials
                });
            }
        }
        
        // Générer le HTML du chemin SANS les statistiques de tentatives
        const pathHtml = pathSteps.map(step => this.createPathStepHtml(step, isCustom)).join('');
        
        this.elements.upgradePath.innerHTML = '<div class="upgrade-path">' + pathHtml + '</div>';

        // Attacher les événements pour la modification en direct
        if (isCustom) {
            this.elements.upgradePath.querySelectorAll('.step-select').forEach(select => {
                select.addEventListener('change', () => this.updateCustomPath());
            });
        }

        // Attacher les tooltips
        this.attachPathTooltips(pathSteps);
    }

    /**
     * Récupère les matériaux formatés pour un niveau
     */
    getMaterialsForLevel(materials, waypoint) {
        const result = [];
        Object.entries(materials).forEach(([id, info]) => {
            result.push({
                id,
                name: this.translator.getLocalizedName(info),
                imgName: info.img_name,
                qty: info.qty,
                avgQty: Math.ceil(info.qty * waypoint)
            });
        });
        return result;
    }

    /**
     * Crée le HTML pour une étape du chemin
     */
    createPathStepHtml(step, isCustom) {
        const options = step.level <= 4 ? ["Parchemin de Guerre"] : 
            ["Parchemin de bénédiction", "Manuel de Forgeron", "Parchemin du Dieu Dragon", "Pierre magique"];
        
        let stepClass = 'path-step';
        if (step.isBelowStart) stepClass += ' below-start';
        if (step.isTarget) stepClass += ' target-level';
        if (step.isEditable) stepClass += ' editable';
        
        // Créer la liste des matériaux requis
        const materialsHtml = step.materials.length > 0 ? `
            <div class="step-materials">
                ${step.materials.map(mat => `
                    <div class="material-item" title="${mat.name}: ${mat.avgQty} ${this.translator.t('avgRequired')}">
                        ${mat.imgName ? `<img src="img/${mat.imgName}" class="material-icon" onerror="this.style.display='none'">` : ''}
                        <span class="material-qty">${mat.qty}</span>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        if (step.isEditable && step.customIndex >= 0) {
            // S'assurer que le customScenario a la bonne valeur
            if (this.customScenario[step.customIndex] !== step.upgradeType) {
                this.customScenario[step.customIndex] = step.upgradeType;
            }
            
            return `
                <div class="${stepClass}" data-level="${step.customIndex}">
                    <div class="step-header">
                        <span class="step-level">+${step.level}</span>
                        <img src="img/${this.getUpgradeIcon(step.upgradeType)}" 
                             class="step-icon" 
                             onerror="this.style.display='none'">
                    </div>
                    <div class="step-content">
                        <select class="step-select" data-level="${step.customIndex}">
                            ${options.map(opt => `
                                <option value="${opt}" ${opt === step.upgradeType ? 'selected' : ''}>
                                    ${this.translator.t(opt)}
                                </option>
                            `).join('')}
                        </select>
                        <div class="step-stats">
                            <div class="step-rate">${step.rate}%</div>
                            <div class="step-trials">${step.waypoint.toFixed(1)}x</div>
                        </div>
                        <div class="step-cost">${this.formatters.formatCost(step.avgCost)}</div>
                    </div>
                    ${materialsHtml}
                </div>
            `;
        } else {
            return `
                <div class="${stepClass}">
                    <div class="step-header">
                        <span class="step-level">+${step.level}</span>
                        <img src="img/${this.getUpgradeIcon(step.upgradeType)}" 
                             class="step-icon" 
                             onerror="this.style.display='none'">
                    </div>
                    <div class="step-content">
                        <div class="step-name">${this.translator.t(step.upgradeType)}</div>
                        <div class="step-stats">
                            <div class="step-rate">${step.rate}%</div>
                            <div class="step-trials">${step.waypoint.toFixed(1)}x</div>
                        </div>
                        <div class="step-cost">${this.formatters.formatCost(step.avgCost)}</div>
                    </div>
                    ${materialsHtml}
                </div>
            `;
        }
    }

    /**
     * Attache les tooltips aux étapes du chemin
     */
    attachPathTooltips(pathSteps) {
        this.elements.upgradePath.querySelectorAll('.path-step').forEach((stepElem, i) => {
            const step = pathSteps[i];
            
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
            
            const tooltipContent = `
                <div class="tooltip-title">Niveau +${step.level}</div>
                ${step.isBelowStart ? '<div class="tooltip-warning">⚠️ Niveau en dessous du départ</div>' : ''}
                <div class="tooltip-row">
                    <span>${this.translator.t('avgTrials')}:</span>
                    <span>${step.waypoint.toFixed(1)}</span>
                </div>
                <div class="tooltip-row">
                    <span>${this.translator.t('avgCost')}:</span>
                    <span>${this.formatters.formatCost(step.avgCost)}</span>
                </div>
                ${this.showIntervals ? `
                <div class="tooltip-row">
                    <span>${this.translator.t('interval95')}:</span>
                    <span>${step.itemInterval.upper} ${this.translator.t('trials')}</span>
                </div>
                ` : ''}
                ${materialsTooltip}
            `;
            
            stepElem.addEventListener('mouseenter', () => this.showTooltip(stepElem, tooltipContent));
            stepElem.addEventListener('mouseleave', () => this.hideTooltip());
        });
    }

    /**
     * Met à jour le chemin personnalisé
     */
    updateCustomPath() {
        // Récupérer les nouvelles valeurs
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
     * Affiche les objets requis
     */
    displayRequiredItems(strategy) {
        if (!strategy.markov || !strategy.markov.waypoints) return;
        
        const items = {};
        const fullWaypoints = strategy.markov.waypoints;
        
        for (let level = 1; level <= this.endLevel; level++) {
            const waypointValue = fullWaypoints[level - 1];
            
            if (waypointValue > 0.01) {
                let upgradeType;
                
                if (level > this.startLevel && level <= this.endLevel) {
                    const pathIndex = level - this.startLevel - 1;
                    upgradeType = strategy.path[pathIndex].name;
                } else {
                    upgradeType = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
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
                if (this.showIntervals) {
                    items[upgradeType].quantityLower += Math.ceil(levelInterval.ci95.lower);
                    items[upgradeType].quantityUpper += Math.ceil(levelInterval.ci95.upper);
                }
            }
        }

        this.elements.requiredItems.innerHTML = Object.values(items).map(item => `
            <div class="item-row">
                <img src="img/${this.getUpgradeIcon(item.name)}" class="item-icon" onerror="this.style.display='none'">
                <span class="item-name">${this.translator.t(item.name)}</span>
                <span class="item-qty" ${this.showIntervals ? `title="${item.quantityLower} - ${item.quantityUpper}"` : ''}>${item.quantity}</span>
                <span class="item-cost">${this.formatters.formatCost(item.quantity * item.unitCost)}</span>
            </div>
        `).join('');
    }

    /**
     * Affiche les matériaux requis
     */
    displayRequiredMaterials(strategy) {
        if (!strategy.markov || !strategy.markov.waypoints) return;
        
        const itemData = this.dataService.getItemById(this.currentItemId);
        const materials = {};
        const fullWaypoints = strategy.markov.waypoints;
        
        for (let level = 1; level <= this.endLevel; level++) {
            const levelData = itemData[level.toString()];
            if (levelData?.materials && fullWaypoints[level - 1] > 0.01) {
                Object.entries(levelData.materials).forEach(([id, info]) => {
                    if (!materials[id]) {
                        materials[id] = {
                            id,
                            name: this.translator.getLocalizedName(info),
                            imgName: info.img_name,
                            quantity: 0,
                            unitCost: this.dataService.getMaterialCost(id)
                        };
                    }
                    materials[id].quantity += info.qty * Math.ceil(fullWaypoints[level - 1]);
                });
            }
        }

        this.elements.requiredMaterials.innerHTML = Object.values(materials).map(mat => `
            <div class="item-row">
                <img src="img/${mat.imgName || 'default.png'}" class="item-icon" onerror="this.style.display='none'">
                <span class="item-name">${mat.name}</span>
                <span class="item-qty">${mat.quantity}</span>
                <span class="item-cost">${this.formatters.formatCost(mat.quantity * mat.unitCost)}</span>
            </div>
        `).join('');
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
                return [100, 100, 90, 80, 70, 60, 50, 30, 20][level - 1] || 0;
            case "Parchemin du Dieu Dragon":
                return [100, 75, 65, 55, 45, 40, 35, 25, 20][level - 1] || 0;
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

    getUpgradeIcon(upgradeType) {
        const iconMap = {
            "Parchemin de bénédiction": "Parchemin_de_bénédiction.png",
            "Manuel de Forgeron": "Manuel_de_Forgeron.png",
            "Parchemin du Dieu Dragon": "Parchemin_du_Dieu_Dragon.png",
            "Parchemin de Guerre": "Parchemin_de_Guerre.png",
            "Pierre magique": "Pierre_magique.png"
        };
        return iconMap[upgradeType] || "default.png";
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
}