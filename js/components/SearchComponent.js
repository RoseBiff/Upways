/**
 * Composant de recherche et sélection d'objets
 */
export class SearchComponent {
    constructor(dataService, translator, onItemSelected) {
        this.dataService = dataService;
        this.translator = translator;
        this.onItemSelected = onItemSelected;
        this.currentItem = null;
        this.currentItemId = null;
        
        this.initElements();
        this.attachEvents();
        this.loadRecentItems();
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
        this.elements.objectSearch.addEventListener('input', (e) => this.handleSearch(e));
        this.elements.objectSearch.addEventListener('focus', () => this.showSearchResults());
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchResults();
            }
        });
    }

    /**
     * Gère la recherche d'objets
     */
    handleSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            this.hideSearchResults();
            return;
        }
        
        // Rechercher dans les noms traduits
        const matches = [];
        const data = this.dataService.data;
        
        Object.entries(data).forEach(([id, item]) => {
            const name = this.translator.getLocalizedName(item).toLowerCase();
            if (name.includes(query)) {
                matches.push({ 
                    id, 
                    name: this.translator.getLocalizedName(item), 
                    score: name.startsWith(query) ? 0 : 1 
                });
            }
        });
        
        // Trier par score (commence par) puis alphabétiquement
        matches.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return a.name.localeCompare(b.name);
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
            const item = this.dataService.getItemById(match.id);
            return `
                <div class="search-result-item" data-item-id="${match.id}">
                    <img src="img/${item.img_name || 'default.png'}" 
                         onerror="this.style.display='none'">
                    <span>${match.name}</span>
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
    selectItemById(itemId) {
        const item = this.dataService.getItemById(itemId);
        if (!item) return;
        
        const name = this.translator.getLocalizedName(item);
        this.currentItem = name;
        this.currentItemId = itemId;
        this.elements.objectSearch.value = name;
        this.hideSearchResults();
        
        // Afficher l'objet sélectionné
        this.elements.itemName.textContent = name;
        this.elements.itemImage.src = `img/${item.img_name || 'default.png'}`;
        this.elements.selectedItem.style.display = 'flex';
        
        // Sauvegarder dans les objets récents
        this.dataService.saveRecentItem(itemId);
        this.displayRecentItems();
        
        // Notifier la sélection
        if (this.onItemSelected) {
            this.onItemSelected(itemId, name);
        }
    }

    /**
     * Charge et affiche les objets récents
     */
    loadRecentItems() {
        this.dataService.loadRecentItems();
        this.displayRecentItems();
    }

    /**
     * Affiche les objets récents
     */
    displayRecentItems() {
        const recentItems = this.dataService.recentItems;
        const container = this.elements.recentItems;
        const list = this.elements.recentItemsList;
        
        if (recentItems.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        list.innerHTML = recentItems
            .filter(id => this.dataService.getItemById(id)) // Vérifier que l'item existe
            .map(id => {
                const item = this.dataService.getItemById(id);
                const name = this.translator.getLocalizedName(item);
                return `
                    <button class="recent-item-btn" data-item-id="${id}">
                        ${name}
                    </button>
                `;
            }).join('');
        
        list.querySelectorAll('.recent-item-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectItemById(btn.dataset.itemId));
        });
    }

    /**
     * Met à jour l'affichage lors d'un changement de langue
     */
    updateLanguage() {
        // Mettre à jour l'affichage de l'objet sélectionné
        if (this.currentItemId) {
            const item = this.dataService.getItemById(this.currentItemId);
            const localized = this.translator.getLocalizedName(item);
            this.elements.objectSearch.value = localized;
            this.elements.itemName.textContent = localized;
        }
        
        // Mettre à jour la recherche si active
        const query = this.elements.objectSearch.value.trim();
        if (query && this.elements.searchResults.style.display !== 'none') {
            this.handleSearch({ target: { value: query } });
        }
        
        // Mettre à jour les objets récents
        this.displayRecentItems();
    }

    /**
     ≤ Getters pour accéder aux propriétés
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
}