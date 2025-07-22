/**
 * Service de gestion des données
 * Charge les données depuis le JSON et gère le localStorage
 */
export class DataService {
    constructor() {
        this.data = {};
        this.upgradeCosts = {};
        this.materialCosts = {};
        this.recentItems = [];
    }

    /**
     * Charge les données depuis le fichier JSON
     */
    async loadData() {
        try {
            console.log('Loading data_full.json...');
            const response = await fetch('data_full.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const jsonText = await response.text();
            console.log('JSON loaded, size:', jsonText.length);
            
            this.data = JSON.parse(jsonText);
            console.log(`${Object.keys(this.data).length} items loaded`);
            
            // Vérifier que les données sont valides
            if (Object.keys(this.data).length === 0) {
                throw new Error('No items found in data file');
            }
            
            return this.data;
        } catch (error) {
            console.error('Error loading data:', error);
            
            // Essayer de charger depuis un chemin alternatif
            try {
                console.log('Trying alternative path: ./data_full.json');
                const response = await fetch('./data_full.json');
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                this.data = await response.json();
                console.log(`${Object.keys(this.data).length} items loaded from alternative path`);
                return this.data;
            } catch (altError) {
                console.error('Alternative path also failed:', altError);
                throw altError;
            }
        }
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
        const defaultUpgradeOptions = [
            "Parchemin de bénédiction",
            "Manuel de Forgeron",
            "Parchemin du Dieu Dragon",
            "Parchemin de Guerre",
            "Pierre magique"
        ];

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
        // Retirer l'objet s'il existe déjà
        this.recentItems = this.recentItems.filter(id => id !== itemId);
        
        // Ajouter en début de liste
        this.recentItems.unshift(itemId);
        
        // Garder seulement les 5 derniers
        this.recentItems = this.recentItems.slice(0, 5);
        
        localStorage.setItem('upways-recent-items', JSON.stringify(this.recentItems));
        return this.recentItems;
    }

    /**
     * Met à jour le coût d'un objet d'amélioration
     */
    updateUpgradeCost(itemName, cost) {
        this.upgradeCosts[itemName] = parseFloat(cost) || 0;
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
     * Récupère les données d'un objet par son ID
     */
    getItemById(itemId) {
        return this.data[itemId];
    }

    /**
     * Récupère le coût d'un objet d'amélioration
     */
    getUpgradeCost(itemName) {
        return this.upgradeCosts[itemName] || 0;
    }

    /**
     * Récupère le coût d'un matériau
     */
    getMaterialCost(materialId) {
        return this.materialCosts[materialId] || 0;
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
     * Réinitialise toutes les données locales
     */
    resetAll() {
        localStorage.clear();
        this.upgradeCosts = {};
        this.materialCosts = {};
        this.recentItems = [];
    }
    
    /**
     * Vérifie si les données sont chargées
     */
    isDataLoaded() {
        return Object.keys(this.data).length > 0;
    }
}