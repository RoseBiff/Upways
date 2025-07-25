/**
 * Service de gestion des données - Version complète avec nouvelle mécanique
 */
export class DataService {
    constructor() {
        // Données de base
        this.equipmentRefines = null;
        this.refineProto = null;
        this.itemNames = {};
        this.currentLang = 'fr';
        
        // Cache pour les items
        this.itemsCache = new Map();
        
        // Settings
        this.upgradeCosts = {};
        this.materialCosts = {};
        this.recentItems = [];
        
        // Cache pour les noms de matériaux
        this.materialNamesCache = new Map();
        
        // État de chargement
        this.dataLoaded = false;
        this.loadingPromise = null;
        
        // IDs des objets d'amélioration (identiques à Calculator.js)
        this.BLESSING_SCROLL = 25040;
        this.BLACKSMITH_MANUAL = 39007;
        this.DRAGON_GOD_SCROLL = 39022;
        this.WAR_SCROLL = 39014;
        this.MAGIC_STONE = 25041;
        
        // Mapping nom interne -> ID
        this.UPGRADE_ITEM_IDS = {
            "Parchemin de bénédiction": this.BLESSING_SCROLL,
            "Manuel de Forgeron": this.BLACKSMITH_MANUAL,
            "Parchemin du Dieu Dragon": this.DRAGON_GOD_SCROLL,
            "Parchemin de Guerre": this.WAR_SCROLL,
            "Pierre magique": this.MAGIC_STONE
        };
        
        // Mapping inverse ID -> nom interne
        this.idToInternalName = {
            [this.BLESSING_SCROLL]: "Parchemin de bénédiction",
            [this.BLACKSMITH_MANUAL]: "Manuel de Forgeron",
            [this.DRAGON_GOD_SCROLL]: "Parchemin du Dieu Dragon",
            [this.WAR_SCROLL]: "Parchemin de Guerre",
            [this.MAGIC_STONE]: "Pierre magique"
        };
        
        // Probabilités fixes pour certains objets (PAS pour Pierre magique ni Parchemin de bénédiction)
        this.FIXED_PROBABILITIES = {
            [this.BLACKSMITH_MANUAL]: [100, 100, 100, 100, 70, 60, 50, 30, 20],
            [this.DRAGON_GOD_SCROLL]: [100, 100, 100, 100, 45, 40, 35, 25, 20],
            [this.WAR_SCROLL]: [100, 100, 100, 100]
            // PAS de probabilités fixes pour MAGIC_STONE ni BLESSING_SCROLL !
        };
    }

    /**
     * Charge les données de base (appelé une seule fois)
     */
    async loadBaseData() {
        if (this.dataLoaded) return;
        
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this._loadBaseData();
        await this.loadingPromise;
        this.loadingPromise = null;
    }

    async _loadBaseData() {
        try {
            console.log('Loading base data structure...');
            
            const [equipmentRefines, refineProto] = await Promise.all([
                this.loadJSON('data/equipment_refines.json'),
                this.loadJSON('data/refine_proto.json')
            ]);
            
            this.equipmentRefines = equipmentRefines;
            this.refineProto = refineProto;
            
            await this.loadItemNames(this.currentLang);
            
            this.dataLoaded = true;
            console.log('Base data loaded');
            
        } catch (error) {
            console.error('Error loading base data:', error);
            throw error;
        }
    }

    /**
     * Charge un fichier JSON
     */
    async loadJSON(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${path}`);
        }
        return await response.json();
    }

    /**
     * Charge les noms d'items pour une langue
     */
    async loadItemNames(lang) {
        try {
            const names = await this.loadJSON(`data/locale/${lang}/item_names.json`);
            this.itemNames = names;
            this.currentLang = lang;
            
            this.materialNamesCache.clear();
            this.itemsCache.clear();
            
        } catch (error) {
            console.error(`Error loading names for language ${lang}:`, error);
            if (lang !== 'fr') {
                await this.loadItemNames('fr');
            }
        }
    }

    /**
     * Récupère un item par son ID (chargement à la demande)
     */
    async getItemById(itemId) {
        if (this.itemsCache.has(itemId)) {
            return this.itemsCache.get(itemId);
        }

        await this.loadBaseData();

        if (!this.equipmentRefines[itemId]) {
            return null;
        }

        const item = this.transformItem(itemId);
        this.itemsCache.set(itemId, item);
        
        return item;
    }

    /**
     * Transforme un item dans la structure attendue
     */
    transformItem(itemId) {
        const refineList = this.equipmentRefines[itemId];
        const itemName = this.itemNames[itemId] || `Item ${itemId}`;
        
        const item = {
            id: itemId,
            names: {
                [this.currentLang]: itemName
            },
            img_name: `${itemId}.png`
        };
        
        refineList.forEach((refineId, index) => {
            const level = index + 1;
            const refineData = this.refineProto[refineId.toString()];
            
            if (refineData) {
                item[level] = {
                    materials: this.extractMaterials(refineData),
                    success_rate: refineData.Prob || 0,
                    yang_cost: refineData.Cost || 0,
                    refine_id: refineId
                };
            }
        });
        
        return item;
    }

    /**
     * Extrait les matériaux d'un refine
     */
    extractMaterials(refineData) {
        const materials = {};
        
        if (refineData.Materials && Array.isArray(refineData.Materials)) {
            refineData.Materials.forEach(material => {
                if (material.Vnum && material.Vnum > 0 && material.Count > 0) {
                    const materialName = this.getMaterialName(material.Vnum);
                    
                    materials[material.Vnum] = {
                        qty: material.Count,
                        names: {
                            [this.currentLang]: materialName
                        },
                        img_name: `${material.Vnum}.png`
                    };
                }
            });
        }
        
        return materials;
    }

    /**
     * Récupère le nom d'un matériau (avec cache)
     */
    getMaterialName(vnum) {
        const cacheKey = `${vnum}_${this.currentLang}`;
        
        if (this.materialNamesCache.has(cacheKey)) {
            return this.materialNamesCache.get(cacheKey);
        }
        
        const name = this.itemNames[vnum] || `Material ${vnum}`;
        this.materialNamesCache.set(cacheKey, name);
        
        return name;
    }

    /**
     * Récupère le nom traduit d'un objet d'amélioration par son nom interne
     */
    getUpgradeItemName(internalName) {
        const id = this.UPGRADE_ITEM_IDS[internalName];
        if (!id) return internalName;
        
        return this.itemNames[id] || internalName;
    }

    /**
     * Récupère le nom traduit d'un objet d'amélioration par son ID
     */
    getUpgradeItemNameById(itemId) {
        return this.itemNames[itemId] || this.idToInternalName[itemId] || `Item ${itemId}`;
    }

    /**
     * Récupère toutes les options d'amélioration avec leurs noms traduits
     */
    getUpgradeOptions() {
        return Object.keys(this.UPGRADE_ITEM_IDS).map(internalName => ({
            internalName,
            displayName: this.getUpgradeItemName(internalName),
            id: this.UPGRADE_ITEM_IDS[internalName]
        }));
    }

    /**
     * Récupère les données de base pour la recherche (allégé)
     */
    async getItemsForSearch() {
        await this.loadBaseData();
        
        const searchData = [];
        
        for (const itemId in this.equipmentRefines) {
            const name = this.itemNames[itemId];
            if (name) {
                searchData.push({
                    id: itemId,
                    name: name
                });
            }
        }
        
        return searchData;
    }

    /**
     * Récupère le coût d'un objet d'amélioration par nom interne
     */
    getUpgradeCost(internalName) {
        return this.upgradeCosts[internalName] || 0;
    }

    /**
     * Récupère le coût d'un objet d'amélioration par ID
     */
    getUpgradeCostById(itemId) {
        const internalName = this.idToInternalName[itemId];
        if (!internalName) return 0;
        return this.getUpgradeCost(internalName);
    }

    /**
     * Récupère tous les coûts d'amélioration sous forme de mapping ID -> coût
     */
    getUpgradeCostsByIds() {
        return {
            [this.BLESSING_SCROLL]: this.getUpgradeCost("Parchemin de bénédiction"),
            [this.BLACKSMITH_MANUAL]: this.getUpgradeCost("Manuel de Forgeron"),
            [this.DRAGON_GOD_SCROLL]: this.getUpgradeCost("Parchemin du Dieu Dragon"),
            [this.WAR_SCROLL]: this.getUpgradeCost("Parchemin de Guerre"),
            [this.MAGIC_STONE]: this.getUpgradeCost("Pierre magique")
        };
    }

    /**
     * Récupère le coût d'un matériau
     */
    getMaterialCost(materialId) {
        return this.materialCosts[materialId] || 0;
    }

    /**
     * Met à jour le coût d'un objet d'amélioration
     */
    updateUpgradeCost(internalName, cost) {
        this.upgradeCosts[internalName] = parseFloat(cost) || 0;
        this.saveSettings();
    }

    /**
     * Met à jour le coût d'un matériau
     */
    updateMaterialCost(materialId, cost) {
        this.materialCosts[materialId] = parseFloat(cost) || 0;
        this.saveSettings();
    }

    /**
     * Obtient le taux de succès pour un niveau et un type d'amélioration
     * IMPORTANT : Pierre magique et Parchemin de bénédiction utilisent TOUJOURS le taux de l'item
     */
    async getSuccessRate(itemId, level, upgradeItemId) {
        const itemData = await this.getItemById(itemId);
        if (!itemData) return 0;
        
        const levelData = itemData[level.toString()];
        if (!levelData) return 0;
        
        // Pour Pierre magique et Parchemin de bénédiction, TOUJOURS utiliser le taux de l'item
        if (upgradeItemId === this.MAGIC_STONE || upgradeItemId === this.BLESSING_SCROLL) {
            return levelData.success_rate || 1;
        }
        
        // Pour les autres, utiliser les taux fixes s'ils existent
        const rates = this.FIXED_PROBABILITIES[upgradeItemId];
        if (rates && level <= rates.length) {
            return rates[level - 1];
        }
        
        // Sinon utiliser le taux de l'item
        return levelData.success_rate || 1;
    }

    /**
     * Obtient les probabilités pour un objet d'amélioration
     * IMPORTANT : Pierre magique et Parchemin de bénédiction utilisent TOUJOURS les taux de l'item
     */
    getProbabilities(itemId, itemData) {
        // Probabilités fixes pour certains objets (PAS Pierre magique ni Parchemin)
        if (this.FIXED_PROBABILITIES[itemId]) {
            return this.FIXED_PROBABILITIES[itemId];
        }

        // Pour Pierre magique et Parchemin de bénédiction, utiliser les données de l'item
        const probabilities = [];
        for (let level = 1; level <= 9; level++) {
            const levelData = itemData[level.toString()];
            probabilities.push(levelData?.success_rate || 1);
        }

        return probabilities;
    }

    /**
     * Charge les paramètres sauvegardés depuis localStorage
     */
    loadSavedSettings() {
        const saved = localStorage.getItem('upways-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.upgradeCosts = settings.upgradeCosts || {};
                this.materialCosts = settings.materialCosts || {};
                console.log('Settings loaded:', settings);
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }

        // Initialiser les coûts par défaut pour les objets d'amélioration
        const defaultUpgradeOptions = Object.keys(this.UPGRADE_ITEM_IDS);

        defaultUpgradeOptions.forEach(option => {
            if (!(option in this.upgradeCosts)) {
                this.upgradeCosts[option] = 0;
            }
        });

        console.log('Upgrade costs initialized:', this.upgradeCosts);

        return {
            upgradeCosts: this.upgradeCosts,
            materialCosts: this.materialCosts
        };
    }

    /**
     * Sauvegarde les paramètres dans localStorage
     */
    saveSettings() {
        const settings = {
            upgradeCosts: this.upgradeCosts,
            materialCosts: this.materialCosts
        };
        localStorage.setItem('upways-settings', JSON.stringify(settings));
    }

    /**
     * Charge les objets récents depuis localStorage
     */
    loadRecentItems() {
        const saved = localStorage.getItem('upways-recent-items');
        if (saved) {
            try {
                this.recentItems = JSON.parse(saved);
            } catch (e) {
                this.recentItems = [];
            }
        }
        return this.recentItems;
    }

    /**
     * Sauvegarde un objet dans les récents
     */
    saveRecentItem(itemId) {
        this.recentItems = this.recentItems.filter(id => id !== itemId);
        this.recentItems.unshift(itemId);
        this.recentItems = this.recentItems.slice(0, 5);
        
        localStorage.setItem('upways-recent-items', JSON.stringify(this.recentItems));
        return this.recentItems;
    }

    /**
     * Charge la langue sauvegardée
     */
    loadLanguage() {
        return localStorage.getItem('upways-lang') || 'fr';
    }

    /**
     * Sauvegarde la langue
     */
    saveLanguage(lang) {
        localStorage.setItem('upways-lang', lang);
    }

    /**
     * Change la langue et recharge les noms
     */
    async changeLanguage(lang) {
        await this.loadItemNames(lang);
        this.saveLanguage(lang);
    }

    /**
     * Réinitialise toutes les données locales
     */
    resetAll() {
        localStorage.clear();
        this.upgradeCosts = {};
        this.materialCosts = {};
        this.recentItems = [];
        this.itemsCache.clear();
        this.materialNamesCache.clear();
    }
    
    /**
     * Vérifie si les données de base sont chargées
     */
    isDataLoaded() {
        return this.dataLoaded;
    }

    /**
     * Récupère le chemin de l'image d'un item
     */
    getItemImagePath(itemId) {
        return `data/item/${itemId}.png`;
    }

    /**
     * Récupère le chemin de l'image d'un objet d'amélioration par son nom interne
     */
    getUpgradeItemImagePath(internalName) {
        const itemId = this.UPGRADE_ITEM_IDS[internalName];
        return itemId ? `data/item/${itemId}.png` : '';
    }

    /**
     * Récupère l'ID d'un objet d'amélioration par son nom interne
     */
    getUpgradeItemId(internalName) {
        return this.UPGRADE_ITEM_IDS[internalName] || null;
    }

    /**
     * Récupère le nom interne d'un objet d'amélioration par son ID
     */
    getUpgradeItemInternalName(itemId) {
        return this.idToInternalName[itemId] || null;
    }

    /**
     * Récupère le coût en yang pour un niveau spécifique
     */
    async getYangCost(itemId, level) {
        const item = await this.getItemById(itemId);
        if (item && item[level]) {
            return item[level].yang_cost || 0;
        }
        return 0;
    }

    /**
     * Pré-charge un item spécifique
     */
    async preloadItem(itemId) {
        await this.getItemById(itemId);
    }

    /**
     * Obtient le niveau maximum disponible pour un item
     */
    async getMaxLevelForItem(itemId) {
        const item = await this.getItemById(itemId);
        if (!item) return 0;
        
        let maxLevel = 0;
        for (let level = 1; level <= 255; level++) {
            if (item[level.toString()]) {
                maxLevel = level;
            } else {
                break;
            }
        }
        
        return maxLevel;
    }

    /**
     * Pré-charge les données nécessaires pour l'optimisation
     */
    async preloadOptimizationData(itemId, startLevel, endLevel) {
        const itemData = await this.getItemById(itemId);
        
        // Pré-charger les noms traduits des objets d'amélioration
        const upgradeNames = {};
        for (const [id, name] of Object.entries(this.idToInternalName)) {
            upgradeNames[id] = this.getUpgradeItemName(name);
        }
        
        // Pré-charger les noms des matériaux utilisés
        const materialNames = new Map();
        for (let level = startLevel + 1; level <= endLevel; level++) {
            const levelData = itemData[level.toString()];
            if (levelData?.materials) {
                for (const matId of Object.keys(levelData.materials)) {
                    if (!materialNames.has(matId)) {
                        materialNames.set(matId, this.getMaterialName(matId));
                    }
                }
            }
        }
        
        return {
            itemData,
            upgradeNames,
            materialNames
        };
    }

    /**
     * Valide qu'un item peut être amélioré jusqu'au niveau demandé
     */
    async validateUpgradeRange(itemId, startLevel, endLevel) {
        const maxLevel = await this.getMaxLevelForItem(itemId);
        
        if (startLevel < 0) {
            return { valid: false, error: 'startLevelNegative' };
        }
        
        if (endLevel > maxLevel) {
            return { valid: false, error: 'endLevelTooHigh', maxLevel };
        }
        
        if (startLevel >= endLevel) {
            return { valid: false, error: 'invalidRange' };
        }
        
        return { valid: true };
    }

    /**
     * Méthode de compatibilité pour l'ancien code
     */
    get data() {
        console.warn('DataService.data is deprecated. Use getItemById() instead.');
        return {};
    }

    /**
     * Méthode de compatibilité pour l'ancien code
     */
    async loadData() {
        await this.loadBaseData();
        this.loadSavedSettings();
        return true;
    }
}