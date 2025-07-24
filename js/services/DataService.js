/**
 * Service de gestion des données - Version 3.4
 * Utilisation complète des IDs d'objets d'amélioration avec traductions
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
        
        // IDs des objets d'amélioration
        this.UPGRADE_ITEM_IDS = {
            "Parchemin de bénédiction": 25040,
            "Manuel de Forgeron": 39007,
            "Parchemin du Dieu Dragon": 39022,
            "Parchemin de Guerre": 39014,
            "Pierre magique": 25041
        };
        
        // Mapping inverse pour la compatibilité
        this.upgradeItemIdToName = {};
        Object.entries(this.UPGRADE_ITEM_IDS).forEach(([name, id]) => {
            this.upgradeItemIdToName[id] = name;
        });
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
        
        for (let i = 1; i <= 4; i++) {
            const vnum = refineData[`MaterialVnum${i}`];
            const count = refineData[`MaterialCount${i}`];
            
            if (vnum && vnum > 0 && count > 0) {
                const materialName = this.getMaterialName(vnum);
                
                materials[vnum] = {
                    qty: count,
                    names: {
                        [this.currentLang]: materialName
                    },
                    img_name: `${vnum}.png`
                };
            }
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
        return this.itemNames[itemId] || this.upgradeItemIdToName[itemId] || `Item ${itemId}`;
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
        return this.upgradeItemIdToName[itemId] || null;
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