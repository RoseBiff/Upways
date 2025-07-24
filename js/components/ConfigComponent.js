/**
 * Composant de configuration - Version 3.4
 * Réinitialisation des niveaux lors du changement d'objet
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
            analyzeBtn: document.getElementById('analyzeBtn'),
            exportConfigBtn: document.getElementById('exportConfigBtn'),
            importConfigBtn: document.getElementById('importConfigBtn'),
            importConfigInput: document.getElementById('importConfigInput')
        };
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
        for (let i = 0; i < endOptions.length; i++) {
            const value = parseInt(endOptions[i].value);
            if (value <= currentStartLevel) {
                endOptions[i].style.display = 'none';
            } else {
                endOptions[i].style.display = '';
            }
        }
    }

    /**
     * Met à jour la plage de niveaux
     */
    updateLevelRange() {
        const start = parseInt(this.elements.startLevel.value);
        const end = parseInt(this.elements.endLevel.value);
        
        this.startLevel = start;
        this.endLevel = end;
        
        // Mettre à jour les options disponibles
        this.updateLevelSelectors();
        
        // Si le niveau de fin est invalide, le corriger
        if (this.endLevel <= this.startLevel) {
            this.endLevel = Math.min(this.startLevel + 1, this.maxItemLevel);
            this.elements.endLevel.value = this.endLevel;
        }
        
        // Mettre à jour l'affichage des matériaux si nécessaire
        if (this.currentItemId) {
            this.displayMaterialPrices();
        }
        
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
     * Affiche les prix des objets d'amélioration
     */
    displayUpgradeItemPrices() {
        const costs = this.dataService.upgradeCosts;
        const upgradeOptions = this.dataService.getUpgradeOptions();
        
        this.elements.upgradeItemPrices.innerHTML = upgradeOptions.map(option => {
            const imagePath = this.dataService.getUpgradeItemImagePath(option.internalName);
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

        this.elements.upgradeItemPrices.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('change', () => this.updatePrice(input));
        });
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
        
        // Parcourir les niveaux actuels pour collecter les matériaux
        for (let i = this.startLevel + 1; i <= this.endLevel; i++) {
            const levelData = itemData[i.toString()];
            if (levelData?.materials) {
                Object.entries(levelData.materials).forEach(([id, info]) => {
                    if (!materialsMap.has(id)) {
                        // Récupérer le nom traduit
                        const name = this.translator.getMaterialName(id);
                        materialsMap.set(id, {
                            id,
                            name: name,
                            imgPath: this.dataService.getItemImagePath(id)
                        });
                    }
                });
            }
        }
        
        return Array.from(materialsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
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
        
        // Activer le bouton d'analyse
        this.elements.analyzeBtn.disabled = false;
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
            const config = {
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
                language: this.translator.getLanguage()
            };
            
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
        } catch (error) {
            console.error('Import config error:', error);
            if (window.app && window.app.uiState) {
                window.app.uiState.showToast('error', this.translator.t('importConfigError'));
            }
        }
    }

    /**
     * Met à jour l'affichage lors d'un changement de langue
     */
    async updateLanguage() {
        this.displayUpgradeItemPrices();
        if (this.currentItemId) {
            await this.displayMaterialPrices();
        }
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