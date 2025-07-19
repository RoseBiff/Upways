/**
 * Classe pour gérer les calculs de chaînes de Markov
 * Utilisée pour calculer le nombre moyen d'essais nécessaires pour chaque niveau
 */
class MarkovChain {
    constructor(successRates, noDowngradeFlags) {
        this.successRates = successRates;
        this.noDowngradeFlags = noDowngradeFlags;
        this.n = successRates.length;
        this.waypoints = [];
        this.totalTrials = 0;
        this.calculate();
    }

    /**
     * Calcule la matrice fondamentale et les essais moyens
     */
    calculate() {
        // Construction de la matrice de transition
        const P = this.buildTransitionMatrix();
        
        // Extraction de la sous-matrice Q (états transitoires)
        const Q = this.extractQ(P);
        
        // Calcul de la matrice fondamentale N = (I - Q)^(-1)
        const N = this.computeFundamentalMatrix(Q);
        
        // Les essais moyens pour atteindre chaque niveau depuis le début
        this.waypoints = N[0];
        this.totalTrials = this.waypoints.reduce((sum, val) => sum + val, 0);
    }

    /**
     * Construit la matrice de transition de la chaîne de Markov
     */
    buildTransitionMatrix() {
        const P = Array(this.n + 1).fill(null).map(() => Array(this.n + 1).fill(0));
        
        for (let i = 0; i < this.n; i++) {
            const successRate = this.successRates[i] / 100;
            const failRate = 1 - successRate;
            
            // Probabilité de réussir l'amélioration
            P[i][i + 1] = successRate;
            
            // Probabilité d'échouer
            if (i === 0 || this.noDowngradeFlags[i]) {
                // Pierre magique ou niveau 1 : reste au même niveau
                P[i][i] = failRate;
            } else {
                // Autres cas : régresse d'un niveau
                P[i][i - 1] = failRate;
            }
        }
        
        // État absorbant final (niveau max atteint)
        P[this.n][this.n] = 1;
        
        return P;
    }

    /**
     * Extrait la sous-matrice Q des états transitoires
     */
    extractQ(P) {
        return P.slice(0, this.n).map(row => row.slice(0, this.n));
    }

    /**
     * Calcule la matrice fondamentale N = (I - Q)^(-1)
     */
    computeFundamentalMatrix(Q) {
        const I = this.identityMatrix(this.n);
        const IminusQ = this.matrixSubtract(I, Q);
        
        try {
            return this.matrixInverse(IminusQ);
        } catch (e) {
            // Fallback : approximation par série si l'inversion échoue
            console.warn('Inversion de matrice échouée, utilisation de l\'approximation par série');
            return this.computeBySeriesApproximation(Q);
        }
    }

    /**
     * Crée une matrice identité de taille n
     */
    identityMatrix(n) {
        return Array(n).fill(null).map((_, i) => 
            Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
    }

    /**
     * Soustrait deux matrices
     */
    matrixSubtract(A, B) {
        return A.map((row, i) => row.map((val, j) => val - B[i][j]));
    }

    /**
     * Inverse une matrice par la méthode de Gauss-Jordan
     */
    matrixInverse(matrix) {
        const n = matrix.length;
        // Créer la matrice augmentée [A|I]
        const augmented = matrix.map((row, i) => 
            [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]
        );
        
        // Élimination de Gauss-Jordan
        for (let i = 0; i < n; i++) {
            // Recherche du pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            
            // Échange des lignes
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
            
            // Vérification de la singularité
            const pivot = augmented[i][i];
            if (Math.abs(pivot) < 1e-10) {
                throw new Error("Matrice singulière");
            }
            
            // Normalisation de la ligne pivot
            for (let j = 0; j < 2 * n; j++) {
                augmented[i][j] /= pivot;
            }
            
            // Élimination
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = augmented[k][i];
                    for (let j = 0; j < 2 * n; j++) {
                        augmented[k][j] -= factor * augmented[i][j];
                    }
                }
            }
        }
        
        // Extraction de la partie inverse
        return augmented.map(row => row.slice(n));
    }

    /**
     * Approximation de la matrice fondamentale par série
     * N ≈ I + Q + Q² + Q³ + ...
     */
    computeBySeriesApproximation(Q, iterations = 100000) {
        let N = this.identityMatrix(this.n);
        let Qpower = this.identityMatrix(this.n);
        
        for (let k = 1; k <= iterations; k++) {
            Qpower = this.matrixMultiply(Qpower, Q);
            N = this.matrixAdd(N, Qpower);
            
            // Vérifier la convergence périodiquement
            if (k % 1000 === 0 && this.hasConverged(Qpower)) {
                console.log(`Convergence atteinte après ${k} itérations`);
                break;
            }
        }
        
        return N;
    }

    /**
     * Multiplie deux matrices
     */
    matrixMultiply(A, B) {
        const n = A.length;
        const result = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < n; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        
        return result;
    }

    /**
     * Additionne deux matrices
     */
    matrixAdd(A, B) {
        return A.map((row, i) => row.map((val, j) => val + B[i][j]));
    }

    /**
     * Vérifie si une matrice a convergé (toutes les valeurs proches de 0)
     */
    hasConverged(matrix, threshold = 1e-10) {
        return matrix.every(row => row.every(val => Math.abs(val) < threshold));
    }
}

/**
 * Classe principale de l'application Upways
 */
class UpwaysApp {
    constructor() {
        // Données et configuration
        this.data = {};
        this.upgradeOptions = [
            "Parchemin de bénédiction",
            "Manuel de Forgeron",
            "Parchemin du Dieu Dragon",
            "Parchemin de Guerre",
            "Pierre magique"
        ];
        
        // État de l'application
        this.currentItem = null;
        this.upgradeCosts = {};
        this.materialCosts = {};
        this.upgradeSelections = Array(9).fill("Parchemin de bénédiction");
        
        // Initialisation
        this.init();
    }

    /**
     * Initialise l'application
     */
    async init() {
        try {
            // Charger les données
            await this.loadData();
            
            // Initialiser les éléments DOM
            this.initializeElements();
            
            // Ajouter les écouteurs d'événements
            this.attachEventListeners();
            
            console.log('Application initialisée avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            this.showError('Erreur lors du chargement des données');
        }
    }

    /**
     * Charge les données depuis le fichier JSON
     */
    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            this.data = await response.json();
            
            // Initialiser les coûts par défaut
            this.upgradeOptions.forEach(option => {
                this.upgradeCosts[option] = 0;
            });
            
            console.log(`${Object.keys(this.data).length} objets chargés`);
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            throw error;
        }
    }

    /**
     * Initialise les références aux éléments DOM
     */
    initializeElements() {
        this.elements = {
            objectSearch: document.getElementById('objectSearch'),
            suggestions: document.getElementById('suggestions'),
            upgradeTable: document.getElementById('upgradeTable'),
            upgradeRows: document.getElementById('upgradeRows'),
            totalTrials: document.getElementById('totalTrials'),
            totalCost: document.getElementById('totalCost'),
            optimalPath: document.getElementById('optimalPath'),
            pathCards: document.getElementById('pathCards'),
            optimalCost: document.getElementById('optimalCost'),
            setPricesBtn: document.getElementById('setPricesBtn'),
            calculateOptimalBtn: document.getElementById('calculateOptimalBtn'),
            costModal: document.getElementById('costModal'),
            costInputs: document.getElementById('costInputs'),
            saveCostBtn: document.getElementById('saveCostBtn'),
            cancelCostBtn: document.getElementById('cancelCostBtn'),
            tooltip: document.getElementById('tooltip')
        };
    }

    /**
     * Attache les écouteurs d'événements
     */
    attachEventListeners() {
        // Recherche d'objet
        this.elements.objectSearch.addEventListener('input', (e) => this.handleSearch(e));
        this.elements.objectSearch.addEventListener('focus', () => this.showSuggestions());
        
        // Fermer les suggestions en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.object-selector')) {
                this.hideSuggestions();
            }
        });

        // Boutons principaux
        this.elements.setPricesBtn.addEventListener('click', () => this.showCostModal());
        this.elements.calculateOptimalBtn.addEventListener('click', () => this.calculateOptimalPath());
        
        // Modal
        this.elements.saveCostBtn.addEventListener('click', () => this.saveCosts());
        this.elements.cancelCostBtn.addEventListener('click', () => this.hideCostModal());

        // Tooltip global
        document.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));
    }

    /**
     * Gère la recherche d'objets
     */
    handleSearch(e) {
        const query = e.target.value.toLowerCase();
        const matches = Object.keys(this.data)
            .filter(name => name.toLowerCase().includes(query))
            .sort(); // Trier par ordre alphabétique
        
        this.updateSuggestions(matches);
    }

    /**
     * Affiche les suggestions
     */
    showSuggestions() {
        if (this.elements.objectSearch.value.length === 0) {
            // Afficher tous les objets si le champ est vide
            this.updateSuggestions(Object.keys(this.data).sort());
        }
        this.elements.suggestions.classList.add('show');
    }

    /**
     * Cache les suggestions
     */
    hideSuggestions() {
        this.elements.suggestions.classList.remove('show');
    }

    /**
     * Met à jour la liste des suggestions
     */
    updateSuggestions(matches) {
        this.elements.suggestions.innerHTML = '';
        
        // Limiter à 20 suggestions pour la performance
        matches.slice(0, 20).forEach(match => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = match;
            item.addEventListener('click', () => this.selectItem(match));
            this.elements.suggestions.appendChild(item);
        });

        if (matches.length > 0) {
            this.elements.suggestions.classList.add('show');
        } else {
            this.elements.suggestions.classList.remove('show');
        }
    }

    /**
     * Sélectionne un objet
     */
    selectItem(itemName) {
        this.currentItem = itemName;
        this.elements.objectSearch.value = itemName;
        this.hideSuggestions();
        this.updateUpgradeTable();
        this.elements.upgradeTable.style.display = 'block';
        this.elements.upgradeTable.classList.add('fade-in');
        
        // Masquer le chemin optimal précédent
        this.elements.optimalPath.style.display = 'none';
    }

    /**
     * Met à jour la table des améliorations
     */
    updateUpgradeTable() {
        const itemData = this.data[this.currentItem];
        this.elements.upgradeRows.innerHTML = '';
        
        const successRates = [];
        const noDowngradeFlags = [];
        const costs = [];

        // Créer les lignes pour chaque niveau
        for (let i = 1; i <= 9; i++) {
            const levelData = itemData[i.toString()] || { materials: {}, success_rate: 0 };
            const upgradeType = this.upgradeSelections[i - 1];
            
            // Calculer le taux de réussite
            const successRate = this.calculateSuccessRate(i, upgradeType, levelData.success_rate);
            successRates.push(successRate);
            noDowngradeFlags.push(upgradeType === "Pierre magique");

            // Calculer le coût unitaire
            const materialCost = this.calculateMaterialCost(levelData.materials);
            const upgradeCost = this.upgradeCosts[upgradeType] || 0;
            costs.push(materialCost + upgradeCost);

            // Créer la ligne
            const row = this.createUpgradeRow(i, successRate, upgradeType, levelData.materials);
            this.elements.upgradeRows.appendChild(row);
        }

        // Calculer les essais moyens avec Markov
        const markov = new MarkovChain(successRates, noDowngradeFlags);
        
        // Mettre à jour l'affichage
        let totalCost = 0;
        for (let i = 0; i < 9; i++) {
            const levelCost = costs[i] * markov.waypoints[i];
            totalCost += levelCost;
            
            // Mettre à jour les badges dans la ligne
            const row = this.elements.upgradeRows.children[i];
            row.querySelector('.trials-badge').textContent = `x ${markov.waypoints[i].toFixed(2)}`;
            row.querySelector('.cost-badge').textContent = `Coût: ${this.formatCost(levelCost)}`;
        }

        // Mettre à jour les totaux
        this.elements.totalTrials.textContent = `Total essais : ${markov.totalTrials.toFixed(2)}`;
        this.elements.totalCost.textContent = `Coût total moyen : ${this.formatCost(totalCost)}`;
    }

    /**
     * Calcule le taux de réussite selon le type d'amélioration
     */
    calculateSuccessRate(level, upgradeType, baseRate) {
        switch (upgradeType) {
            case "Parchemin de bénédiction":
            case "Pierre magique":
                return baseRate;
            case "Manuel de Forgeron":
                const forgeronRates = [100, 100, 90, 80, 70, 60, 50, 30, 20];
                return forgeronRates[level - 1];
            case "Parchemin du Dieu Dragon":
                const dragonRates = [100, 75, 65, 55, 45, 40, 35, 25, 20];
                return dragonRates[level - 1];
            case "Parchemin de Guerre":
                return 100;
            default:
                return 0;
        }
    }

    /**
     * Crée une ligne de la table d'amélioration
     */
    createUpgradeRow(level, successRate, upgradeType, materials) {
        const row = document.createElement('div');
        row.className = 'upgrade-row';

        // Badge de probabilité
        const probBadge = document.createElement('div');
        probBadge.className = 'prob-badge';
        probBadge.textContent = successRate.toString() + '%';
        row.appendChild(probBadge);

        // Dropdown de sélection
        const select = document.createElement('select');
        select.className = 'upgrade-select';
        
        // Retirer "Parchemin de Guerre" après le niveau 4
        const availableOptions = level <= 4 ? 
            this.upgradeOptions : 
            this.upgradeOptions.filter(opt => opt !== "Parchemin de Guerre");
        
        availableOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            opt.selected = option === upgradeType;
            select.appendChild(opt);
        });

        select.addEventListener('change', (e) => {
            this.upgradeSelections[level - 1] = e.target.value;
            this.updateUpgradeTable();
        });
        row.appendChild(select);

        // Icône de l'amélioration
        const icon = document.createElement('img');
        icon.className = 'upgrade-icon';
        icon.src = `img/${this.getUpgradeIcon(upgradeType)}`;
        icon.alt = upgradeType;
        icon.onerror = () => {
            // Fallback si l'image n'existe pas
            icon.style.display = 'none';
        };
        row.appendChild(icon);

        // Badge d'essais
        const trialsBadge = document.createElement('div');
        trialsBadge.className = 'trials-badge';
        trialsBadge.textContent = 'x 0.00';
        row.appendChild(trialsBadge);

        // Conteneur des matériaux
        const materialsDiv = document.createElement('div');
        materialsDiv.className = 'materials';
        
        Object.entries(materials).forEach(([name, info]) => {
            const materialItem = document.createElement('div');
            materialItem.className = 'material-item';
            
            const materialIcon = document.createElement('img');
            materialIcon.className = 'material-icon';
            materialIcon.src = `img/${info.img_name}`;
            materialIcon.alt = name;
            materialIcon.onerror = () => {
                // Fallback si l'image n'existe pas
                materialIcon.style.display = 'none';
            };
            
            // Tooltip sur l'icône
            materialIcon.addEventListener('mouseenter', (e) => this.showTooltip(e, `${name} x${info.qty}`));
            materialIcon.addEventListener('mouseleave', () => this.hideTooltip());
            
            const qty = document.createElement('span');
            qty.className = 'material-qty';
            qty.textContent = `x${info.qty}`;
            
            materialItem.appendChild(materialIcon);
            materialItem.appendChild(qty);
            materialsDiv.appendChild(materialItem);
        });
        row.appendChild(materialsDiv);

        // Badge de coût
        const costBadge = document.createElement('div');
        costBadge.className = 'cost-badge';
        costBadge.textContent = 'Coût: 0M';
        row.appendChild(costBadge);

        return row;
    }

    /**
     * Retourne le nom du fichier d'icône pour un type d'amélioration
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
     * Calcule le coût total des matériaux
     */
    calculateMaterialCost(materials) {
        let cost = 0;
        Object.entries(materials).forEach(([name, info]) => {
            cost += (this.materialCosts[name] || 0) * info.qty;
        });
        return cost;
    }

    /**
     * Formate un coût en millions ou wons
     */
    formatCost(value) {
        if (value >= 100) {
            const wons = Math.floor(value / 100);
            const millions = Math.floor(value % 100);
            return `${wons.toLocaleString('fr-FR')}.${millions.toString().padStart(2, '0')}w`;
        } else {
            return `${Math.floor(value)}M`;
        }
    }

    /**
     * Affiche le modal de définition des coûts
     */
    showCostModal() {
        if (!this.currentItem) {
            alert("Veuillez d'abord sélectionner un objet");
            return;
        }

        // Collecter tous les matériaux uniques de l'objet
        const materials = new Set();
        const itemData = this.data[this.currentItem];
        
        for (let i = 1; i <= 9; i++) {
            const levelData = itemData[i.toString()];
            if (levelData && levelData.materials) {
                Object.keys(levelData.materials).forEach(mat => materials.add(mat));
            }
        }

        // Créer le contenu du modal
        this.elements.costInputs.innerHTML = '';

        // Section des objets d'amélioration
        const upgradeSection = document.createElement('div');
        upgradeSection.className = 'cost-section';
        upgradeSection.innerHTML = '<h3>Coûts des objets d\'amélioration en Milion de yang (M) :</h3>';
        
        this.upgradeOptions.forEach(option => {
            const row = this.createCostInputRow(option, this.upgradeCosts[option] || 0, 'upgrade');
            upgradeSection.appendChild(row);
        });
        this.elements.costInputs.appendChild(upgradeSection);

        // Section des matériaux
        if (materials.size > 0) {
            const materialSection = document.createElement('div');
            materialSection.className = 'cost-section';
            materialSection.innerHTML = '<h3>Coûts des matériaux en Milion de yang (M) :</h3>';
            
            Array.from(materials).sort().forEach(material => {
                const row = this.createCostInputRow(material, this.materialCosts[material] || 0, 'material');
                materialSection.appendChild(row);
            });
            this.elements.costInputs.appendChild(materialSection);
        }

        this.elements.costModal.classList.add('show');
    }

    /**
     * Crée une ligne d'input pour les coûts
     */
    createCostInputRow(name, value, type) {
        const row = document.createElement('div');
        row.className = 'cost-input-row';
        
        const label = document.createElement('label');
        label.textContent = name;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.min = '0';
        input.step = '0.01';
        input.dataset.name = name;
        input.dataset.type = type;
        
        row.appendChild(label);
        row.appendChild(input);
        
        return row;
    }

    /**
     * Cache le modal des coûts
     */
    hideCostModal() {
        this.elements.costModal.classList.remove('show');
    }

    /**
     * Sauvegarde les coûts définis
     */
    saveCosts() {
        const inputs = this.elements.costInputs.querySelectorAll('input');
        inputs.forEach(input => {
            const name = input.dataset.name;
            const type = input.dataset.type;
            const value = parseFloat(input.value) || 0;
            
            if (type === 'upgrade') {
                this.upgradeCosts[name] = value;
            } else {
                this.materialCosts[name] = value;
            }
        });
        
        this.hideCostModal();
        this.updateUpgradeTable();
    }

    /**
     * Calcule et affiche le chemin optimal
     */
    calculateOptimalPath() {
        if (!this.currentItem) {
            alert("Veuillez d'abord sélectionner un objet");
            return;
        }

        const itemData = this.data[this.currentItem];
        
        // Définir les méthodes d'amélioration disponibles
        const methods = [
            { 
                name: "Parchemin de bénédiction", 
                getRate: (lvl) => itemData[lvl.toString()]?.success_rate || 0, 
                noDowngrade: false 
            },
            { 
                name: "Manuel de Forgeron", 
                getRate: (lvl) => [100, 100, 90, 80, 70, 60, 50, 30, 20][lvl - 1], 
                noDowngrade: false 
            },
            { 
                name: "Parchemin du Dieu Dragon", 
                getRate: (lvl) => [100, 75, 65, 55, 45, 40, 35, 25, 20][lvl - 1], 
                noDowngrade: false 
            },
            { 
                name: "Pierre magique", 
                getRate: (lvl) => itemData[lvl.toString()]?.success_rate || 0, 
                noDowngrade: true 
            }
        ];

        // Les 4 premiers niveaux utilisent forcément le Parchemin de Guerre
        const fixed = Array(4).fill({ 
            name: "Parchemin de Guerre", 
            rate: 100, 
            noDowngrade: false 
        });

        let bestPath = null;
        let bestCost = Infinity;

        // Explorer toutes les combinaisons possibles pour les niveaux 5-9
        const combinations = this.generateCombinations(methods, 5);
        
        combinations.forEach(combo => {
            const path = [...fixed];
            const rates = [...fixed.map(f => f.rate)];
            const flags = [...fixed.map(f => f.noDowngrade)];
            const costs = [];

            // Calculer les coûts pour les 4 premiers niveaux
            for (let i = 1; i <= 4; i++) {
                const levelData = itemData[i.toString()] || { materials: {} };
                const materialCost = this.calculateMaterialCost(levelData.materials);
                const upgradeCost = this.upgradeCosts["Parchemin de Guerre"] || 0;
                costs.push(materialCost + upgradeCost);
            }

            // Ajouter les niveaux 5-9
            combo.forEach((method, idx) => {
                const level = idx + 5;
                const rate = method.getRate(level);
                rates.push(rate);
                flags.push(method.noDowngrade);
                
                const levelData = itemData[level.toString()] || { materials: {} };
                const materialCost = this.calculateMaterialCost(levelData.materials);
                const upgradeCost = this.upgradeCosts[method.name] || 0;
                costs.push(materialCost + upgradeCost);
                
                path.push({ 
                    name: method.name, 
                    rate: rate, 
                    noDowngrade: method.noDowngrade 
                });
            });

            // Calculer le coût total avec la chaîne de Markov
            const markov = new MarkovChain(rates, flags);
            const totalCost = costs.reduce((sum, cost, i) => sum + cost * markov.waypoints[i], 0);

            // Garder le meilleur chemin
            if (totalCost < bestCost) {
                bestCost = totalCost;
                bestPath = { 
                    path, 
                    rates, 
                    flags, 
                    costs, 
                    waypoints: markov.waypoints, 
                    totalCost 
                };
            }
        });

        this.displayOptimalPath(bestPath);
    }

    /**
     * Génère toutes les combinaisons possibles de méthodes
     */
    generateCombinations(methods, length) {
        if (length === 0) return [[]];
        
        const smallerCombos = this.generateCombinations(methods, length - 1);
        const combinations = [];
        
        methods.forEach(method => {
            smallerCombos.forEach(combo => {
                combinations.push([...combo, method]);
            });
        });
        
        return combinations;
    }

    /**
     * Affiche le chemin optimal
     */
    displayOptimalPath(optimalPath) {
        this.elements.pathCards.innerHTML = '';
        
        optimalPath.path.forEach((step, i) => {
            const card = document.createElement('div');
            card.className = 'path-card';
            
            // Niveau
            const level = document.createElement('div');
            level.className = 'path-level';
            level.textContent = `+${i + 1}`;
            
            // Icône
            const icon = document.createElement('img');
            icon.className = 'path-icon';
            icon.src = `img/${this.getUpgradeIcon(step.name)}`;
            icon.alt = step.name;
            icon.onerror = () => {
                icon.style.display = 'none';
            };
            
            // Nom
            const name = document.createElement('div');
            name.className = 'path-name';
            name.textContent = step.name;
            
            // Essais
            const trials = document.createElement('div');
            trials.className = 'path-info';
            trials.textContent = `Essais: ${optimalPath.waypoints[i].toFixed(2)}`;
            
            // Coût
            const cost = document.createElement('div');
            cost.className = 'path-info';
            const levelCost = optimalPath.costs[i] * optimalPath.waypoints[i];
            cost.textContent = `Coût moy: ${this.formatCost(levelCost)}`;
            
            card.appendChild(level);
            card.appendChild(icon);
            card.appendChild(name);
            card.appendChild(trials);
            card.appendChild(cost);
            
            this.elements.pathCards.appendChild(card);
        });

        // Afficher le coût total
        this.elements.optimalCost.textContent = 
            `Coût total optimal : ${this.formatCost(optimalPath.totalCost)}`;
        this.elements.optimalPath.style.display = 'block';
        this.elements.optimalPath.classList.add('fade-in');
    }

    /**
     * Affiche le tooltip
     */
    showTooltip(event, text) {
        this.elements.tooltip.textContent = text;
        this.elements.tooltip.classList.add('show');
        this.updateTooltipPosition(event);
    }

    /**
     * Cache le tooltip
     */
    hideTooltip() {
        this.elements.tooltip.classList.remove('show');
    }

    /**
     * Met à jour la position du tooltip
     */
    updateTooltipPosition(event) {
        if (this.elements.tooltip.classList.contains('show')) {
            const x = event.clientX + 10;
            const y = event.clientY - 30;
            this.elements.tooltip.style.left = `${x}px`;
            this.elements.tooltip.style.top = `${y}px`;
        }
    }

    /**
     * Affiche un message d'erreur
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        this.elements.upgradeTable.appendChild(errorDiv);
    }
}

// Initialiser l'application au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const app = new UpwaysApp();
});