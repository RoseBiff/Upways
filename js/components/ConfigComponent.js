export class ConfigComponent {
    constructor(dataService, translator, onConfigChanged) {
        this.dataService = dataService;
        this.translator = translator;
        this.onConfigChanged = onConfigChanged;
        
        this.startLevel = 0;
        this.endLevel = 9;
        this.currentItemId = null;
        this.maxItemLevel = 21; // Par défaut
        
        this.upgradeOptions = [
            "Parchemin de bénédiction",
            "Manuel de Forgeron",
            "Parchemin du Dieu Dragon",
            "Parchemin de Guerre",
            "Pierre magique"
        ];
        
        this.initElements();
        this.attachEvents();
        this.displayUpgradeItemPrices();
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
     * Met à jour les limites de niveau selon l'objet sélectionné
     */
    updateLevelLimits() {
        if (!this.currentItemId) return;
        
        const itemData = this.dataService.getItemById(this.currentItemId);
        if (!itemData) return;
        
        // Trouver le niveau maximum de l'objet
        let maxLevel = 0;
        for (let level = 1; level <= 21; level++) {
            if (itemData[level.toString()]) {
                maxLevel = level;
            }
        }
        
        this.maxItemLevel = maxLevel;
        
        // Masquer complètement les options non disponibles au lieu de les désactiver
        this.updateLevelSelectors();
        
        // Si le niveau actuel est trop élevé, le réduire
        if (parseInt(this.elements.startLevel.value) > maxLevel - 1) {
            this.elements.startLevel.value = Math.max(0, maxLevel - 1);
            this.startLevel = parseInt(this.elements.startLevel.value);
        }
        
        if (parseInt(this.elements.endLevel.value) > maxLevel) {
            this.elements.endLevel.value = maxLevel;
            this.endLevel = maxLevel;
        }
        
        // S'assurer que endLevel > startLevel
        if (this.endLevel <= this.startLevel) {
            this.endLevel = Math.min(this.startLevel + 1, maxLevel);
            this.elements.endLevel.value = this.endLevel;
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
     * Met à jour les sélecteurs de niveau en cachant les options non disponibles
     */
    updateLevelSelectors() {
        // Mettre à jour le sélecteur de départ
        const startOptions = this.elements.startLevel.options;
        for (let i = 0; i < startOptions.length; i++) {
            const value = parseInt(startOptions[i].value);
            if (value >= this.maxItemLevel) {
                startOptions[i].style.display = 'none';
            } else {
                startOptions[i].style.display = '';
                startOptions[i].text = `+${value}`;
            }
        }
        
        // Mettre à jour le sélecteur de fin
        const endOptions = this.elements.endLevel.options;
        const currentStartLevel = parseInt(this.elements.startLevel.value);
        
        for (let i = 0; i < endOptions.length; i++) {
            const value = parseInt(endOptions[i].value);
            if (value > this.maxItemLevel || value <= currentStartLevel) {
                endOptions[i].style.display = 'none';
            } else {
                endOptions[i].style.display = '';
                endOptions[i].text = `+${value}`;
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
        
        this.elements.upgradeItemPrices.innerHTML = this.upgradeOptions.map(option => {
            const translatedName = this.translator.t(option);
            return `
                <div class="price-item">
                    <img src="img/${this.getUpgradeIcon(option)}" class="price-icon" onerror="this.style.display='none'">
                    <label>${translatedName}</label>
                    <input type="number" class="price-input" data-type="upgrade" data-name="${option}" 
                           value="${costs[option] || 0}" min="0" step="0.1">
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
    displayMaterialPrices() {
        if (!this.currentItemId) return;
        
        const materials = this.getAllMaterialsWithImages();
        if (materials.length === 0) {
            this.elements.materialSection.style.display = 'none';
            return;
        }

        const costs = this.dataService.materialCosts;

        this.elements.materialSection.style.display = 'block';
        this.elements.materialPrices.innerHTML = materials.map(mat => `
            <div class="price-item">
                ${mat.imgName ? `<img src="img/${mat.imgName}" class="price-icon" onerror="this.style.display='none'">` : ''}
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
    getAllMaterialsWithImages() {
        if (!this.currentItemId) return [];
        
        const materialsMap = new Map();
        const itemData = this.dataService.getItemById(this.currentItemId);
        
        for (let i = this.startLevel + 1; i <= this.endLevel; i++) {
            const levelData = itemData[i.toString()];
            if (levelData?.materials) {
                Object.entries(levelData.materials).forEach(([id, info]) => {
                    if (!materialsMap.has(id)) {
                        materialsMap.set(id, {
                            id,
                            name: this.translator.getLocalizedName(info),
                            imgName: info.img_name
                        });
                    }
                });
            }
        }
        
        return Array.from(materialsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Obtient l'icône pour un type d'amélioration
     */
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

    /**
     * Définit l'objet actuellement sélectionné
     */
    setCurrentItem(itemId) {
        this.currentItemId = itemId;
        this.displayMaterialPrices();
        this.elements.analyzeBtn.disabled = false;
        
        // Mettre à jour les limites de niveau selon l'objet
        this.updateLevelLimits();
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
                version: "1.0",
                date: new Date().toISOString(),
                item: {
                    id: this.currentItemId,
                    name: this.currentItemId ? this.translator.getLocalizedName(this.dataService.getItemById(this.currentItemId)) : null
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
            
            // Utiliser le UIState si disponible, sinon alert
            if (window.app && window.app.uiState) {
                window.app.uiState.showToast('success', this.translator.t('configExported'));
            } else {
                alert(this.translator.t('configExported'));
            }
        } catch (error) {
            console.error('Export config error:', error);
            if (window.app && window.app.uiState) {
                window.app.uiState.showToast('error', this.translator.t('exportConfigError'));
            } else {
                alert(this.translator.t('exportConfigError'));
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
            
            // Vérifier la version
            if (!config.version || config.version !== "1.0") {
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
                window.app.searchComponent.selectItemById(config.item.id);
            }
            
            // Appliquer les niveaux
            if (config.levels) {
                if (config.levels.start !== undefined) {
                    this.elements.startLevel.value = config.levels.start;
                }
                if (config.levels.end !== undefined) {
                    this.elements.endLevel.value = config.levels.end;
                }
                this.updateLevelRange();
            }
            
            // Appliquer la langue
            if (config.language && window.app && window.app.translator) {
                if (window.app.translator.isLanguageAvailable(config.language)) {
                    window.app.translator.setLanguage(config.language);
                    window.app.updateLanguage();
                }
            }
            
            // Réinitialiser l'input
            event.target.value = '';
            
            if (window.app && window.app.uiState) {
                window.app.uiState.showToast('success', this.translator.t('configImported'));
            } else {
                alert(this.translator.t('configImported'));
            }
        } catch (error) {
            console.error('Import config error:', error);
            if (window.app && window.app.uiState) {
                window.app.uiState.showToast('error', this.translator.t('importConfigError'));
            } else {
                alert(this.translator.t('importConfigError'));
            }
        }
    }

    /**
     * Met à jour l'affichage lors d'un changement de langue
     */
    updateLanguage() {
        this.displayUpgradeItemPrices();
        if (this.currentItemId) {
            this.displayMaterialPrices();
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
}