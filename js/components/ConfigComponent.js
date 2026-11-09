/**
 * Composant de configuration - Version 3.5
 * Support des niveaux élevés (jusqu'à 255)
 */
export class ConfigComponent {
    constructor(dataService, translator, onConfigChanged) {
        this.dataService = dataService;
        this.translator = translator;
        this.onConfigChanged = onConfigChanged;
        
        this.startLevel = 0;
        this.endLevel = 9;
        this.currentItemId = null;
        this.maxItemLevel = 21; // Par défaut
        
        this.initElements();
        this.attachEvents();
        this.displayUpgradeItemPrices();
        
        // S'abonner aux changements de langue
        this.translator.addObserver(this);
    }

    initElements() {
        this.elements = {
            startLevel: document.getElementById('startLevel'),
            endLevel: document.getElementById('endLevel'),
            upgradeItemPrices: document.getElementById('upgradeItemPrices'),
            materialSection: document.getElementById('materialSection'),
            materialPrices: document.getElementById('materialPrices'),
            guildBlacksmithSection: document.getElementById('guildBlacksmithSection'),
            baseItemPriceInput: document.getElementById('baseItemPriceInput'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            exportConfigBtn: document.getElementById('exportConfigBtn'),
            importConfigBtn: document.getElementById('importConfigBtn'),
            importConfigInput: document.getElementById('importConfigInput'),
            shareConfigBtn: document.getElementById('shareConfigBtn')
        };

        // Wizard
        this.currentStep = 1;
        this.initWizard();
    }

    /**
     * Initialise le wizard : branche les boutons de navigation et les points d'étape
     */
    initWizard() {
        document.getElementById('wizardNext1')?.addEventListener('click', () => this.goToStep(2));
        document.getElementById('wizardNext2')?.addEventListener('click', () => this.goToStep(3));
        document.getElementById('wizardPrev2')?.addEventListener('click', () => this.goToStep(1, true));
        document.getElementById('wizardPrev3')?.addEventListener('click', () => this.goToStep(2, true));

        // Clic sur les points d'étape : navigation arrière uniquement
        document.querySelectorAll('.wizard-step-dot').forEach(dot => {
            const dotStep = parseInt(dot.dataset.step);
            dot.addEventListener('click', () => {
                // On ne peut reculer que, jamais sauter en avant
                if (dotStep < this.currentStep) {
                    this.goToStep(dotStep, true);
                }
            });
        });
    }

    /**
     * Navigue vers l'étape indiquée (1, 2 ou 3)
     * @param {number} step
     * @param {boolean} backwards - true pour animation inverse
     */
    goToStep(step, backwards = false) {
        // Sauvegarder la position de scroll pour éviter le saut vers le haut
        const savedScrollY = window.scrollY;

        // Marquer l'ancienne étape comme complétée si on avance
        const dots = document.querySelectorAll('.wizard-step-dot');
        const lines = document.querySelectorAll('.wizard-line');

        // Cacher le panel actuel
        const current = document.getElementById(`wizardStep${this.currentStep}`);
        if (current) current.classList.remove('active', 'slide-back');

        this.currentStep = step;

        // Afficher le nouveau panel
        const next = document.getElementById(`wizardStep${step}`);
        if (next) {
            next.classList.remove('active', 'slide-back');
            // forcer reflow pour relancer l'animation
            void next.offsetWidth;
            if (backwards) {
                next.classList.add('active', 'slide-back');
            } else {
                next.classList.add('active');
            }
        }

        // Mettre à jour les dots et lignes
        dots.forEach(dot => {
            const dotStep = parseInt(dot.dataset.step);
            dot.classList.toggle('active', dotStep === step);
            dot.classList.toggle('completed', dotStep < step);
        });

        lines.forEach((line, idx) => {
            line.classList.toggle('completed', (idx + 1) < step);
        });

        // Restaurer la position de scroll (annule le saut vers le haut dû au reflow)
        requestAnimationFrame(() => {
            window.scrollTo(0, savedScrollY);
        });
    }

    attachEvents() {
        this.elements.startLevel.addEventListener('change', () => this.updateLevelRange());
        this.elements.endLevel.addEventListener('change', () => this.updateLevelRange());

        // Attacher les événements pour import/export config
        if (this.elements.exportConfigBtn) {
            this.elements.exportConfigBtn.addEventListener('click', () => this.exportConfig());
        }

        if (this.elements.importConfigBtn && this.elements.importConfigInput) {
            this.elements.importConfigBtn.addEventListener('click', () => {
                this.elements.importConfigInput.click();
            });
            this.elements.importConfigInput.addEventListener('change', (e) => this.importConfig(e));
        }

        if (this.elements.shareConfigBtn) {
            this.elements.shareConfigBtn.addEventListener('click', () => this.shareConfigLink());
        }

        // Prix de l'objet +0 (forgeron de guilde)
        if (this.elements.baseItemPriceInput) {
            this.elements.baseItemPriceInput.value = this.dataService.getBaseItemPrice(this.currentItemId);
            this.elements.baseItemPriceInput.addEventListener('change', () => {
                const price = parseFloat(this.elements.baseItemPriceInput.value) || 0;
                this.dataService.updateBaseItemPrice(this.currentItemId, price);
                if (this.onConfigChanged) {
                    this.onConfigChanged({ type: 'guildBlacksmith', price });
                }
            });
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
     * Met à jour les limites de niveau selon l'objet sélectionné
     */
    async updateLevelLimits() {
        if (!this.currentItemId) return;
        
        const maxLevel = await this.dataService.getMaxLevelForItem(this.currentItemId);
        if (!maxLevel) return;
        
        this.maxItemLevel = maxLevel;
        
        // Reconstruire les sélecteurs avec les bonnes options
        this.rebuildLevelSelectors();
        
        // Réinitialiser les niveaux aux valeurs par défaut
        this.startLevel = 0;
        this.endLevel = Math.min(9, maxLevel);
        
        this.elements.startLevel.value = this.startLevel;
        this.elements.endLevel.value = this.endLevel;
        
        // Mettre à jour l'affichage
        this.updateLevelSelectors();
        
        // Notifier le changement
        if (this.onConfigChanged) {
            this.onConfigChanged({
                type: 'levels',
                startLevel: this.startLevel,
                endLevel: this.endLevel
            });
        }
    }

    /**
     * Reconstruit les sélecteurs de niveau avec le bon nombre d'options
     */
    rebuildLevelSelectors() {
        // Sauvegarder les valeurs actuelles
        const currentStart = parseInt(this.elements.startLevel.value);
        const currentEnd = parseInt(this.elements.endLevel.value);
        
        // Reconstruire le sélecteur de départ
        this.elements.startLevel.innerHTML = '';
        for (let i = 0; i < this.maxItemLevel; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `+${i}`;
            this.elements.startLevel.appendChild(option);
        }
        
        // Reconstruire le sélecteur de fin
        this.elements.endLevel.innerHTML = '';
        for (let i = 1; i <= this.maxItemLevel; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `+${i}`;
            this.elements.endLevel.appendChild(option);
        }
        
        // Ne pas restaurer les valeurs, laisser les valeurs par défaut définies dans updateLevelLimits
    }

    /**
     * Met à jour les sélecteurs de niveau en cachant les options non disponibles
     */
    updateLevelSelectors() {
        const currentStartLevel = parseInt(this.elements.startLevel.value);
        
        // Mettre à jour le sélecteur de fin pour n'afficher que les options valides
        const endOptions = this.elements.endLevel.options;
        let firstValidOption = null;
        
        for (let i = 0; i < endOptions.length; i++) {
            const value = parseInt(endOptions[i].value);
            if (value <= currentStartLevel) {
                endOptions[i].style.display = 'none';
                endOptions[i].disabled = true;
            } else {
                endOptions[i].style.display = '';
                endOptions[i].disabled = false;
                if (!firstValidOption) {
                    firstValidOption = value;
                }
            }
        }
        
        // Si le niveau de fin actuel n'est pas valide, le corriger
        if (this.endLevel <= currentStartLevel && firstValidOption !== null) {
            this.endLevel = firstValidOption;
            this.elements.endLevel.value = this.endLevel;
        }
    }

    /**
     * Met à jour la plage de niveaux
     */
    updateLevelRange() {
        const start = parseInt(this.elements.startLevel.value);
        const end = parseInt(this.elements.endLevel.value);
        
        this.startLevel = start;
        
        // S'assurer que le niveau de fin est valide
        if (end <= start) {
            // Trouver le prochain niveau valide
            const endOptions = this.elements.endLevel.options;
            let nextValidLevel = null;
            
            for (let i = 0; i < endOptions.length; i++) {
                const value = parseInt(endOptions[i].value);
                if (value > start) {
                    nextValidLevel = value;
                    break;
                }
            }
            
            if (nextValidLevel !== null) {
                this.endLevel = nextValidLevel;
                this.elements.endLevel.value = this.endLevel;
            } else {
                // Cas extrême : pas de niveau valide après le début
                this.endLevel = Math.min(start + 1, this.maxItemLevel);
            }
        } else {
            this.endLevel = end;
        }
        
        // Mettre à jour les options disponibles
        this.updateLevelSelectors();
        
        // Mettre à jour l'affichage des matériaux si nécessaire
        if (this.currentItemId) {
            this.displayMaterialPrices();
        }

        // Mettre à jour la visibilité du forgeron de guilde
        this.updateGuildBlacksmithVisibility();

        // Notifier le changement
        if (this.onConfigChanged) {
            this.onConfigChanged({
                type: 'levels',
                startLevel: this.startLevel,
                endLevel: this.endLevel
            });
        }
    }

    showMoonlightTooltip(element) {
        const tooltip = document.getElementById('tooltip');
        const tooltipContent = document.getElementById('tooltipContent');
        
        if (!tooltip || !tooltipContent) return;
        
        // Contenu du tooltip
        tooltipContent.innerHTML = `
            <div class="tooltip-title">${this.translator.t('moonlightTooltipTitle')}</div>
            <div class="tooltip-content">
                <p>${this.translator.t('moonlightTooltipContent')}</p>
                <div class="tooltip-formula">
                    <div class="formula-row">
                        <span>${this.translator.t('price200Moonlight') || 'Prix 200 Coffres'}</span>
                        <span>÷ 10</span>
                        <span>= ${this.translator.t('price1Scroll') || 'Prix 1 Parchemin'}</span>
                    </div>
                </div>
            </div>
        `;
        
        tooltip.style.display = 'block';
        
        // Positionner le tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.top - tooltipRect.height - 10;
        
        // Ajuster si sort de l'écran
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 10;
            tooltip.classList.add('tooltip-bottom');
        } else {
            tooltip.classList.remove('tooltip-bottom');
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    hideMoonlightTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Affiche / masque la section forgeron de guilde selon les conditions
     * (objet sélectionné ET niveau de fin ≤ 9)
     */
    updateGuildBlacksmithVisibility() {
        if (!this.elements.guildBlacksmithSection) return;

        const available = !!this.currentItemId && this.endLevel <= 9;
        this.elements.guildBlacksmithSection.style.display = available ? 'block' : 'none';

        if (!available) return;

        // Mettre à jour l'icône de l'objet de base
        const iconEl = document.getElementById('guildItemIcon');
        if (iconEl && this.currentItemId) {
            iconEl.src = this.dataService.getItemImagePath(this.currentItemId);
            iconEl.style.display = '';
        }

        // Synchroniser la valeur du prix depuis le dataService (propre à l'objet courant)
        if (this.elements.baseItemPriceInput) {
            this.elements.baseItemPriceInput.value = this.dataService.getBaseItemPrice(this.currentItemId);
        }
    }

    attachDragonScrollEvents() {
        const dragonScrollInput = document.getElementById('dragonScrollPrice');
        const moonlightInput = document.getElementById('moonlightPrice');
        
        if (!dragonScrollInput || !moonlightInput) return;
        
        // Attacher le tooltip
        const helpIcon = document.querySelector('.moonlight-help');
        if (helpIcon) {
            helpIcon.addEventListener('mouseenter', (e) => this.showMoonlightTooltip(e.target));
            helpIcon.addEventListener('mouseleave', () => this.hideMoonlightTooltip());
        }
        
        // Conversion Parchemin → Rayon de lune
        dragonScrollInput.addEventListener('input', (e) => {
            const dragonPrice = parseFloat(e.target.value) || 0;
            moonlightInput.value = (dragonPrice * 10).toFixed(1);
        });
        
        // Conversion Rayon de lune → Parchemin
        moonlightInput.addEventListener('input', (e) => {
            const moonlightPrice = parseFloat(e.target.value) || 0;
            const dragonPrice = Math.max(0, moonlightPrice / 10); // Garantir >= 0
            dragonScrollInput.value = dragonPrice.toFixed(1);
            
            // Mettre à jour et sauvegarder directement
            this.dataService.updateUpgradeCost("Parchemin du Dieu Dragon", dragonPrice);
            
            // Notifier le changement
            if (this.onConfigChanged) {
                this.onConfigChanged({
                    type: 'price',
                    priceType: 'upgrade',
                    name: "Parchemin du Dieu Dragon",
                    value: dragonPrice
                });
            }
        });
    }

    /**
     * Affiche les prix des objets d'amélioration
     */
    displayUpgradeItemPrices() {
        const costs = this.dataService.upgradeCosts;
        const upgradeOptions = this.dataService.getUpgradeOptions();
        
        this.elements.upgradeItemPrices.innerHTML = upgradeOptions.map(option => {
            const imagePath = this.dataService.getUpgradeItemImagePath(option.internalName);
            
            // Traitement spécial pour le Parchemin du Dieu Dragon
            if (option.internalName === "Parchemin du Dieu Dragon") {
                return `
                    <div class="price-item price-item-special">
                        <img src="${imagePath}" class="price-icon" onerror="this.style.display='none'">
                        <label>${option.displayName}</label>
                        <input type="number" class="price-input" data-type="upgrade" data-name="${option.internalName}" 
                            value="${costs[option.internalName] || 0}" min="0" step="0.1" id="dragonScrollPrice">
                        <span class="currency">M</span>
                        
                        <div class="price-separator"></div>
                        
                        <img src="rdl.png" class="price-icon" onerror="this.style.display='none'">
                        <div class="moonlight-label-container">
                            <label>${this.translator.t('moonlightBeam') || 'Rayons de lune'} x200</label>
                            <span class="help-icon moonlight-help" data-tooltip="moonlight">?</span>
                        </div>
                        <input type="number" class="price-input moonlight-price" 
                            value="${(costs[option.internalName] || 0) * 10}" min="0" step="0.1" id="moonlightPrice">
                        <span class="currency">M</span>
                    </div>
                `;
            }
            
            // Code normal pour les autres objets
            return `
                <div class="price-item">
                    <img src="${imagePath}" class="price-icon" onerror="this.style.display='none'">
                    <label>${option.displayName}</label>
                    <input type="number" class="price-input" data-type="upgrade" data-name="${option.internalName}" 
                        value="${costs[option.internalName] || 0}" min="0" step="0.1">
                    <span class="currency">M</span>
                </div>
            `;
        }).join('');

        // Attacher les événements normaux
        this.elements.upgradeItemPrices.querySelectorAll('.price-input:not(.moonlight-price)').forEach(input => {
            input.addEventListener('change', () => this.updatePrice(input));
        });
        
        // Attacher les événements spéciaux pour Parchemin du Dieu Dragon
        this.attachDragonScrollEvents();
    }

    /**
     * Affiche les prix des matériaux pour l'objet sélectionné
     */
    async displayMaterialPrices() {
        if (!this.currentItemId) return;
        
        const materials = await this.getAllMaterialsWithImages();
        if (materials.length === 0) {
            this.elements.materialSection.style.display = 'none';
            return;
        }

        const costs = this.dataService.materialCosts;

        this.elements.materialSection.style.display = 'block';
        this.elements.materialPrices.innerHTML = materials.map(mat => `
            <div class="price-item">
                ${mat.imgPath ? `<img src="${mat.imgPath}" class="price-icon" onerror="this.style.display='none'">` : ''}
                <label>${mat.name}</label>
                <input type="number" class="price-input" data-type="material" data-name="${mat.id}" 
                    value="${costs[mat.id] || 0}" min="0" step="0.1">
                <span class="currency">M</span>
            </div>
        `).join('');

        this.elements.materialPrices.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('change', () => this.updatePrice(input));
        });
    }

    /**
     * Met à jour un prix
     */
    updatePrice(input) {
        const type = input.dataset.type;
        const name = input.dataset.name;
        const value = parseFloat(input.value) || 0;
        
        if (type === 'upgrade') {
            this.dataService.updateUpgradeCost(name, value);
        } else {
            this.dataService.updateMaterialCost(name, value);
        }
        
        // Notifier le changement
        if (this.onConfigChanged) {
            this.onConfigChanged({
                type: 'price',
                priceType: type,
                name: name,
                value: value
            });
        }
    }

    /**
     * Obtient tous les matériaux avec leurs images
     */
    async getAllMaterialsWithImages() {
        if (!this.currentItemId) return [];
        
        const materialsMap = new Map();
        const itemData = await this.dataService.getItemById(this.currentItemId);
        
        // Si pas de données d'item, retourner tableau vide
        if (!itemData) return [];
        
        // Déterminer le niveau minimum potentiellement atteignable par rétrogradation
        let minLevel = 1;
        
        // Si on a un niveau de départ > 0, on pourrait potentiellement rétrograder
        // Dans le pire cas avec des parchemins classiques, on peut rétrograder jusqu'au niveau 0
        // Donc on prend tous les matériaux depuis le niveau 1 par sécurité
        if (this.startLevel > 0) {
            minLevel = 1;
        }
        
        // Parcourir TOUS les niveaux depuis minLevel jusqu'à endLevel
        // pour collecter tous les matériaux potentiellement nécessaires
        for (let level = minLevel; level <= this.endLevel; level++) {
            const levelData = itemData[level.toString()];
            if (levelData && levelData.materials) {
                Object.entries(levelData.materials).forEach(([id, info]) => {
                    if (!materialsMap.has(id)) {
                        // Récupérer le nom traduit via le translator
                        const name = this.translator.getMaterialName(id);
                        materialsMap.set(id, {
                            id: id,
                            name: name,
                            imgPath: this.dataService.getItemImagePath(id)
                        });
                    }
                });
            }
        }
        
        // Retourner le tableau trié par nom
        return Array.from(materialsMap.values()).sort((a, b) => {
            if (a.name && b.name) {
                return a.name.localeCompare(b.name);
            }
            return 0;
        });
    }

    /**
     * Définit l'objet actuellement sélectionné
     */
    async setCurrentItem(itemId) {
        this.currentItemId = itemId;

        // Mettre à jour les limites de niveau ET réinitialiser les niveaux
        await this.updateLevelLimits();

        // Afficher les matériaux
        await this.displayMaterialPrices();

        // Afficher la section forgeron de guilde si applicable
        this.updateGuildBlacksmithVisibility();

        // Activer le bouton d'analyse
        this.elements.analyzeBtn.disabled = false;

        // Wizard : activer le bouton Suivant de l'étape 1
        const next1Btn = document.getElementById('wizardNext1');
        if (next1Btn) next1Btn.disabled = false;
    }

    /**
     * Active/désactive le bouton d'analyse
     */
    setAnalyzeButtonEnabled(enabled) {
        this.elements.analyzeBtn.disabled = !enabled;
    }

    /**
     * Exporte la configuration
     */
    exportConfig() {
        try {
            const config = this.buildConfigSnapshot();

            const json = JSON.stringify(config, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `upways-config-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            // Utiliser le UIState si disponible
            if (window.app && window.app.uiState) {
                window.app.uiState.showToast('success', this.translator.t('configExported'));
            }
        } catch (error) {
            console.error('Export config error:', error);
            if (window.app && window.app.uiState) {
                window.app.uiState.showToast('error', this.translator.t('exportConfigError'));
            }
        }
    }

    /**
     * Importe la configuration
     */
    async importConfig(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const config = JSON.parse(text);
            
            // Vérifier la version (accepter toutes les versions pour compatibilité)
            if (!config.version) {
                throw new Error('Invalid config version');
            }
            
            // Appliquer les prix
            if (config.prices) {
                if (config.prices.upgrade) {
                    Object.entries(config.prices.upgrade).forEach(([key, value]) => {
                        this.dataService.updateUpgradeCost(key, value);
                    });
                }
                if (config.prices.materials) {
                    Object.entries(config.prices.materials).forEach(([key, value]) => {
                        this.dataService.updateMaterialCost(key, value);
                    });
                }
            }
            
            // Appliquer les paramètres du forgeron de guilde
            if (config.guildBlacksmith) {
                if (config.guildBlacksmith.baseItemPrices && typeof config.guildBlacksmith.baseItemPrices === 'object') {
                    // Nouveau format : dict itemId -> prix
                    this.dataService.baseItemPrices = { ...config.guildBlacksmith.baseItemPrices };
                    this.dataService.saveSettings();
                } else if (config.guildBlacksmith.baseItemPrice !== undefined) {
                    // Ancien format : prix unique, appliqué à l'objet courant uniquement
                    this.dataService.updateBaseItemPrice(this.currentItemId, config.guildBlacksmith.baseItemPrice);
                }
                this.updateGuildBlacksmithVisibility();
            }

            // Recharger l'affichage des prix
            this.displayUpgradeItemPrices();
            
            // Sélectionner l'objet si présent
            if (config.item && config.item.id && window.app && window.app.searchComponent) {
                await window.app.searchComponent.selectItemById(config.item.id);
            }
            
            // Appliquer les niveaux APRÈS avoir sélectionné l'objet
            if (config.levels) {
                // Attendre que l'objet soit chargé
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (config.levels.start !== undefined && config.levels.start < this.maxItemLevel) {
                    this.elements.startLevel.value = config.levels.start;
                    this.startLevel = config.levels.start;
                }
                if (config.levels.end !== undefined && config.levels.end <= this.maxItemLevel) {
                    this.elements.endLevel.value = config.levels.end;
                    this.endLevel = config.levels.end;
                }
                this.updateLevelRange();
            }
            
            // Appliquer la langue
            if (config.language && window.app && window.app.translator) {
                if (window.app.translator.isLanguageAvailable(config.language)) {
                    await window.app.translator.setLanguage(config.language);
                    window.app.updateLanguage();
                }
            }
            
            // Réinitialiser l'input
            event.target.value = '';
            
            if (window.app && window.app.uiState) {
                window.app.uiState.showToast('success', this.translator.t('configImported'));
            }

            // Wizard : avancer directement à l'étape 3 après import
            setTimeout(() => this.goToStep(3), 400);
        } catch (error) {
            console.error('Import config error:', error);
            if (window.app && window.app.uiState) {
                window.app.uiState.showToast('error', this.translator.t('importConfigError'));
            }
        }
    }

    /**
     * Construit un snapshot sérialisable de la configuration courante
     * (partagé entre l'export JSON et l'export URL).
     */
    buildConfigSnapshot() {
        return {
            version: "3.3",
            date: new Date().toISOString(),
            item: {
                id: this.currentItemId,
                name: this.currentItemId ? this.dataService.itemNames[this.currentItemId] : null
            },
            levels: {
                start: this.startLevel,
                end: this.endLevel
            },
            prices: {
                upgrade: this.dataService.upgradeCosts,
                materials: this.dataService.materialCosts
            },
            guildBlacksmith: {
                baseItemPrices: this.dataService.baseItemPrices
            },
            language: this.translator.getLanguage()
        };
    }

    /**
     * Encode la config courante en base64 URL-safe et la place dans l'URL,
     * puis copie le lien complet dans le presse-papiers.
     */
    async shareConfigLink() {
        // Un objet doit être sélectionné pour qu'un lien ait du sens
        if (!this.currentItemId) {
            if (window.app?.uiState) {
                window.app.uiState.showToast('warning', this.translator.t('shareNoItem'));
            }
            return;
        }

        try {
            const config = this.buildConfigSnapshot();
            const json = JSON.stringify(config);
            // base64 URL-safe (compatible UTF-8 via encodeURIComponent / unescape)
            const base64 = btoa(unescape(encodeURIComponent(json)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const url = new URL(window.location.href);
            // On nettoie les autres params susceptibles de polluer le lien partagé
            url.searchParams.delete('debug');
            url.searchParams.set('share', base64);
            const fullUrl = url.toString();

            // Met à jour l'URL visible sans recharger la page
            window.history.replaceState({}, '', fullUrl);
            window.app?.analytics?.track('partage', { objet: Number(this.currentItemId) });

            // Copie dans le presse-papiers (avec fallback pour contextes non sécurisés)
            let copied = false;
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(fullUrl);
                    copied = true;
                } catch (e) {
                    // fallback ci-dessous
                }
            }
            if (!copied) {
                const textarea = document.createElement('textarea');
                textarea.value = fullUrl;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
                document.body.removeChild(textarea);
            }

            if (window.app?.uiState) {
                if (copied) {
                    window.app.uiState.showToast('success', this.translator.t('shareCopied'));
                } else {
                    window.app.uiState.showToast('warning', this.translator.t('shareCopyError'));
                }
            }
        } catch (error) {
            console.error('Share config error:', error);
            if (window.app?.uiState) {
                window.app.uiState.showToast('error', this.translator.t('shareCopyError'));
            }
        }
    }

    /**
     * Applique un snapshot de configuration reçu (ex : depuis l'URL).
     * Variante programmatique d'importConfig — ne consomme pas un fichier.
     */
    async applySharedConfig(config) {
        try {
            if (!config || !config.version) {
                throw new Error('Invalid shared config');
            }

            if (config.prices) {
                if (config.prices.upgrade) {
                    Object.entries(config.prices.upgrade).forEach(([key, value]) => {
                        this.dataService.updateUpgradeCost(key, value);
                    });
                }
                if (config.prices.materials) {
                    Object.entries(config.prices.materials).forEach(([key, value]) => {
                        this.dataService.updateMaterialCost(key, value);
                    });
                }
            }

            if (config.guildBlacksmith) {
                if (config.guildBlacksmith.baseItemPrices && typeof config.guildBlacksmith.baseItemPrices === 'object') {
                    this.dataService.baseItemPrices = { ...config.guildBlacksmith.baseItemPrices };
                    this.dataService.saveSettings();
                } else if (config.guildBlacksmith.baseItemPrice !== undefined) {
                    this.dataService.updateBaseItemPrice(this.currentItemId, config.guildBlacksmith.baseItemPrice);
                }
                this.updateGuildBlacksmithVisibility();
            }

            this.displayUpgradeItemPrices();

            if (config.item && config.item.id && window.app?.searchComponent) {
                await window.app.searchComponent.selectItemById(config.item.id);
            }

            if (config.levels) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (config.levels.start !== undefined && config.levels.start < this.maxItemLevel) {
                    this.elements.startLevel.value = config.levels.start;
                    this.startLevel = config.levels.start;
                }
                if (config.levels.end !== undefined && config.levels.end <= this.maxItemLevel) {
                    this.elements.endLevel.value = config.levels.end;
                    this.endLevel = config.levels.end;
                }
                this.updateLevelRange();
            }

            if (config.language && window.app?.translator) {
                if (window.app.translator.isLanguageAvailable(config.language)) {
                    await window.app.translator.setLanguage(config.language);
                    window.app.updateLanguage();
                }
            }

            if (window.app?.uiState) {
                window.app.uiState.showToast('success', this.translator.t('shareApplied'));
            }

            // Avance au wizard étape 3 comme pour importConfig
            setTimeout(() => this.goToStep(3), 400);
            return true;
        } catch (error) {
            console.error('Apply shared config error:', error);
            if (window.app?.uiState) {
                window.app.uiState.showToast('error', this.translator.t('shareInvalid'));
            }
            return false;
        }
    }

    /**
     * Met à jour l'affichage lors d'un changement de langue
     */
    async updateLanguage() {
        this.displayUpgradeItemPrices();
        if (this.currentItemId) {
            await this.displayMaterialPrices();
            this.updateGuildBlacksmithSectionLabels();
        }
    }

    /**
     * Met à jour les labels traduits de la section forgeron de guilde
     */
    updateGuildBlacksmithSectionLabels() {
        if (!this.elements.guildBlacksmithSection) return;
        const titleEl = this.elements.guildBlacksmithSection.querySelector('.guild-section-title');
        if (titleEl) titleEl.textContent = this.translator.t('guildBlacksmithSection');
        const descEl = this.elements.guildBlacksmithSection.querySelector('.guild-desc');
        if (descEl) descEl.textContent = this.translator.t('guildBlacksmithDesc');
        const priceLabel = this.elements.guildBlacksmithSection.querySelector('.guild-price-label');
        if (priceLabel) priceLabel.textContent = this.translator.t('baseItemPrice');
    }

    /**
     * Getters pour les niveaux
     */
    getStartLevel() {
        return this.startLevel;
    }

    getEndLevel() {
        return this.endLevel;
    }
    
    /**
     * Remet le wizard à l'étape 1 (utilisé après un reset)
     */
    resetWizard() {
        const next1Btn = document.getElementById('wizardNext1');
        if (next1Btn) next1Btn.disabled = true;
        this.goToStep(1);
    }

    /**
     * Réinitialise les niveaux aux valeurs par défaut
     */
    resetLevels() {
        this.startLevel = 0;
        this.endLevel = Math.min(9, this.maxItemLevel);
        this.elements.startLevel.value = this.startLevel;
        this.elements.endLevel.value = this.endLevel;
        this.updateLevelSelectors();
    }
    
    /**
     * Nettoyage
     */
    destroy() {
        // Se désabonner des changements de langue
        this.translator.removeObserver(this);
    }
}