/**
 * Composant de configuration (prix et niveaux)
 */
export class ConfigComponent {
    constructor(dataService, translator, onConfigChanged) {
        this.dataService = dataService;
        this.translator = translator;
        this.onConfigChanged = onConfigChanged;
        
        this.startLevel = 0;
        this.endLevel = 9;
        this.currentItemId = null;
        
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
            analyzeBtn: document.getElementById('analyzeBtn')
        };
    }

    attachEvents() {
        this.elements.startLevel.addEventListener('change', () => this.updateLevelRange());
        this.elements.endLevel.addEventListener('change', () => this.updateLevelRange());
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
        
        // Mettre à jour les options du sélecteur de fin
        const endOptions = this.elements.endLevel.options;
        for (let i = 0; i < endOptions.length; i++) {
            const value = parseInt(endOptions[i].value);
            endOptions[i].disabled = value > maxLevel;
            
            // Ajouter une indication visuelle
            if (value > maxLevel) {
                endOptions[i].text = `+${value} (Non disponible)`;
            } else {
                endOptions[i].text = `+${value}`;
            }
        }
        
        // Si le niveau de fin actuel est trop élevé, le réduire
        if (parseInt(this.elements.endLevel.value) > maxLevel) {
            this.elements.endLevel.value = maxLevel;
            this.endLevel = maxLevel;
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
     * Met à jour la plage de niveaux
     */
    updateLevelRange() {
        const start = parseInt(this.elements.startLevel.value);
        const end = parseInt(this.elements.endLevel.value);
        
        // Mettre à jour les options disponibles pour le niveau de fin
        const endOptions = this.elements.endLevel.options;
        for (let i = 0; i < endOptions.length; i++) {
            const value = parseInt(endOptions[i].value);
            endOptions[i].disabled = value <= start;
        }
        
        // Si le niveau de fin est invalide, le corriger
        if (end <= start) {
            this.elements.endLevel.value = Math.min(start + 1, 9);
        }
        
        this.startLevel = start;
        this.endLevel = parseInt(this.elements.endLevel.value);
        
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