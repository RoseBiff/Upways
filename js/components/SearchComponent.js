/**
 * Composant de recherche et sélection d'objets - Version 3.1
 * Suppression du +0 dans l'affichage des équipements
 */
export class SearchComponent {
    constructor(dataService, translator, onItemSelected) {
        this.dataService = dataService;
        this.translator = translator;
        this.onItemSelected = onItemSelected;
        this.currentItem = null;
        this.currentItemId = null;
        this.searchData = null; // Cache des données de recherche
        this.debounceTimer = null;
        
        this.initElements();
        this.attachEvents();
        this.loadRecentItems();
        
        // S'abonner aux changements de langue
        this.translator.addObserver(this);
    }

    initElements() {
        this.elements = {
            objectSearch: document.getElementById('objectSearch'),
            searchResults: document.getElementById('searchResults'),
            selectedItem: document.getElementById('selectedItem'),
            itemName: document.getElementById('itemName'),
            itemImage: document.getElementById('itemImage'),
            recentItems: document.getElementById('recentItems'),
            recentItemsList: document.getElementById('recentItemsList')
        };
    }

    attachEvents() {
        // Utiliser un debounce pour éviter trop de recherches
        this.elements.objectSearch.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.handleSearch(e), 150);
        });
        
        this.elements.objectSearch.addEventListener('focus', () => this.showSearchResults());
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchResults();
            }
        });
    }

    /**
     * Normalise une chaîne pour la recherche (enlève accents, met en minuscules)
     */
    normalizeString(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // Enlève les accents
    }
    
    /**
     * Retire le +0 d'un nom d'équipement
     */
    removeUpgradeLevel(name) {
        if (!name) return '';
        return name.replace(/\+0$/, '').trim();
    }

    /**
     * Gère la recherche d'objets
     */
    async handleSearch(e) {
        const query = this.normalizeString(e.target.value.trim());
        if (!query) {
            this.hideSearchResults();
            return;
        }
        
        // Charger les données de recherche si nécessaire
        if (!this.searchData) {
            this.searchData = await this.dataService.getItemsForSearch();
        }
        
        // Rechercher dans les noms normalisés
        const matches = [];
        
        this.searchData.forEach(item => {
            // Retirer le +0 pour la recherche et l'affichage
            const displayName = this.removeUpgradeLevel(item.name);
            const normalizedName = this.normalizeString(displayName);
            
            // Score basé sur la position de la correspondance
            let score = -1;
            if (normalizedName.includes(query)) {
                score = normalizedName.indexOf(query);
                // Bonus si c'est au début du mot
                if (score === 0) {
                    score = -1;
                } else if (normalizedName[score - 1] === ' ') {
                    score = 0;
                }
                
                matches.push({ 
                    id: item.id, 
                    name: item.name,  // Nom original avec +0
                    displayName: displayName, // Nom sans +0 pour l'affichage
                    score: score
                });
            }
        });
        
        // Trier par score puis alphabétiquement
        matches.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return a.displayName.localeCompare(b.displayName);
        });
        
        this.displaySearchResults(matches.slice(0, 15));
    }

    /**
     * Affiche les résultats de recherche
     */
    displaySearchResults(matches) {
        if (matches.length === 0) {
            this.hideSearchResults();
            return;
        }

        this.elements.searchResults.innerHTML = matches.map(match => {
            const imagePath = this.dataService.getItemImagePath(match.id);
            return `
                <div class="search-result-item" data-item-id="${match.id}">
                    <img src="${imagePath}" onerror="this.style.display='none'">
                    <span>${match.displayName}</span>
                </div>
            `;
        }).join('');

        this.elements.searchResults.querySelectorAll('.search-result-item').forEach(elem => {
            elem.addEventListener('click', () => this.selectItemById(elem.dataset.itemId));
        });

        this.showSearchResults();
    }

    showSearchResults() {
        this.elements.searchResults.style.display = 'block';
    }

    hideSearchResults() {
        this.elements.searchResults.style.display = 'none';
    }

    /**
     * Sélectionne un objet par son ID
     */
    async selectItemById(itemId) {
        // S'assurer que les données de recherche sont chargées
        if (!this.searchData) {
            this.searchData = await this.dataService.getItemsForSearch();
        }
        
        // Trouver le nom dans les données de recherche
        const itemData = this.searchData.find(item => item.id === itemId);
        if (!itemData) return;
        
        const name = itemData.name; // Nom original avec +0
        const displayName = this.removeUpgradeLevel(name); // Nom sans +0
        
        this.currentItem = name;
        this.currentItemId = itemId;
        this.elements.objectSearch.value = displayName;
        this.hideSearchResults();
        
        // Afficher l'objet sélectionné
        this.elements.itemName.textContent = displayName;
        this.elements.itemImage.src = this.dataService.getItemImagePath(itemId);
        this.elements.selectedItem.style.display = 'flex';
        
        // Sauvegarder dans les objets récents
        this.dataService.saveRecentItem(itemId);
        await this.displayRecentItems();
        
        // Pré-charger les données de l'item pour accélérer l'analyse
        this.dataService.preloadItem(itemId);
        
        // Notifier la sélection avec le nom original
        if (this.onItemSelected) {
            this.onItemSelected(itemId, name);
        }
    }

    /**
     * Charge et affiche les objets récents
     */
    async loadRecentItems() {
        this.dataService.loadRecentItems();
        await this.displayRecentItems();
    }

    /**
     * Affiche les objets récents
     */
    async displayRecentItems() {
        const recentItems = this.dataService.recentItems;
        const container = this.elements.recentItems;
        const list = this.elements.recentItemsList;
        
        if (recentItems.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        // S'assurer que les données de recherche sont chargées
        if (!this.searchData) {
            this.searchData = await this.dataService.getItemsForSearch();
        }
        
        container.style.display = 'block';
        list.innerHTML = recentItems
            .map(id => {
                const itemData = this.searchData.find(item => item.id === id);
                if (!itemData) return null;
                
                const displayName = this.removeUpgradeLevel(itemData.name);
                
                return `
                    <button class="recent-item-btn" data-item-id="${id}">
                        ${displayName}
                    </button>
                `;
            })
            .filter(html => html !== null)
            .join('');
        
        list.querySelectorAll('.recent-item-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectItemById(btn.dataset.itemId));
        });
    }

    /**
     * Met à jour l'affichage lors d'un changement de langue
     */
    async updateLanguage() {
        // Invalider le cache de recherche pour forcer le rechargement
        this.searchData = null;
        
        // Mettre à jour l'affichage de l'objet sélectionné
        if (this.currentItemId) {
            // Recharger les données de recherche
            this.searchData = await this.dataService.getItemsForSearch();
            
            // Trouver le nouveau nom
            const itemData = this.searchData.find(item => item.id === this.currentItemId);
            if (itemData) {
                const localized = itemData.name;
                const displayName = this.removeUpgradeLevel(localized);
                
                this.elements.objectSearch.value = displayName;
                this.elements.itemName.textContent = displayName;
                this.currentItem = localized;
            }
        }
        
        // Mettre à jour la recherche si active
        const query = this.elements.objectSearch.value.trim();
        if (query && this.elements.searchResults.style.display !== 'none') {
            this.handleSearch({ target: { value: query } });
        }
        
        // Mettre à jour les objets récents
        await this.displayRecentItems();
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
     * Getters pour accéder aux propriétés
     */
    getSelectedItemId() {
        return this.currentItemId;
    }

    getSelectedItemName() {
        return this.currentItem;
    }

    hasSelectedItem() {
        return this.currentItemId !== null;
    }

    /**
     * Nettoyage
     */
    destroy() {
        // Se désabonner des changements de langue
        this.translator.removeObserver(this);
        
        // Nettoyer les timers
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}