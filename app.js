/**
 * Système de traduction multilingue
 */
const translations = {
    fr: {
        // Onglets
        configTab: "Configuration",
        analysisTab: "Analyse",
        
        // Configuration
        selectItem: "Sélection de l'objet",
        searchPlaceholder: "Rechercher un objet...",
        selected: "Sélectionné",
        recentItems: "Objets récents",
        priceConfig: "Configuration des prix",
        upgradeItems: "Objets d'amélioration",
        materials: "Matériaux",
        runAnalysis: "Lancer l'analyse",
        upgradeLevels: "Niveaux d'amélioration",
        fromLevel: "De",
        toLevel: "À",
        
        // Analyse
        analysisResults: "Résultats de l'analyse",
        optimal: "Optimale",
        custom: "Personnalisée",
        avgCost: "Coût moyen",
        avgTrials: "Tentatives moyennes",
        trialsPerLevel: "Tentatives par niveau",
        successProb: "P(succès)",
        interval95: "Intervalle 95%",
        upgradePath: "Chemin d'amélioration",
        requiredItems: "Objets requis",
        requiredMaterials: "Matériaux requis",
        trialsProbability: "Tentatives vs Probabilité de succès",
        trialsProbabilityDesc: "Ce graphique montre la probabilité de réussir l'amélioration en fonction du nombre de tentatives",
        
        // Tooltips
        trialInterval: "Essais",
        itemInterval: "Objets",
        costInterval: "Coût",
        globalStats: "Statistiques globales",
        
        // Statistiques
        totalTrials: "Essais moyens",
        costRange95: "Intervalle 95%",
        trialsRange95: "Intervalle 95%",
        riskLevel: "Niveau de risque",
        recommendation: "Recommandation",
        
        // Risques
        riskLow: "Faible",
        riskMedium: "Moyen",
        riskHigh: "Élevé",
        
        // Général
        level: "Niveau",
        quantity: "Quantité",
        unitCost: "Coût unitaire",
        total: "Total",
        calculating: "Calcul en cours...",
        trials: "tentatives",
        
        // Toasts
        selectItemFirst: "Veuillez d'abord sélectionner un objet",
        analysisComplete: "Analyse terminée",
        exportSuccess: "Export réussi",
        errorAnalysis: "Erreur lors de l'analyse",
        invalidLevelRange: "Le niveau de fin doit être supérieur au niveau de départ",
        
        // Objets d'amélioration
        "Parchemin de bénédiction": "Parchemin de bénédiction",
        "Manuel de Forgeron": "Manuel de Forgeron",
        "Parchemin du Dieu Dragon": "Parchemin du Dieu Dragon",
        "Parchemin de Guerre": "Parchemin de Guerre",
        "Pierre magique": "Pierre magique"
    },
    en: {
        configTab: "Configuration",
        analysisTab: "Analysis",
        selectItem: "Item Selection",
        searchPlaceholder: "Search for an item...",
        selected: "Selected",
        recentItems: "Recent items",
        priceConfig: "Price Configuration",
        upgradeItems: "Upgrade Items",
        materials: "Materials",
        runAnalysis: "Run Analysis",
        upgradeLevels: "Upgrade levels",
        fromLevel: "From",
        toLevel: "To",
        analysisResults: "Analysis Results",
        optimal: "Optimal",
        custom: "Custom",
        avgCost: "Average Cost",
        avgTrials: "Average Trials",
        trialsPerLevel: "Trials per level",
        successProb: "P(success)",
        interval95: "95% Interval",
        upgradePath: "Upgrade Path",
        requiredItems: "Required Items",
        requiredMaterials: "Required Materials",
        trialsProbability: "Trials vs Success Probability",
        trialsProbabilityDesc: "This graph shows the probability of successfully upgrading based on number of trials",
        trialInterval: "Trials",
        itemInterval: "Items",
        costInterval: "Cost",
        globalStats: "Global statistics",
        totalTrials: "Average Trials",
        costRange95: "95% Interval",
        trialsRange95: "95% Interval",
        riskLevel: "Risk Level",
        recommendation: "Recommendation",
        riskLow: "Low",
        riskMedium: "Medium",
        riskHigh: "High",
        level: "Level",
        quantity: "Quantity",
        unitCost: "Unit Cost",
        total: "Total",
        calculating: "Calculating...",
        trials: "trials",
        selectItemFirst: "Please select an item first",
        analysisComplete: "Analysis complete",
        exportSuccess: "Export successful",
        errorAnalysis: "Analysis error",
        invalidLevelRange: "End level must be greater than start level",
        
        // Upgrade items
        "Parchemin de bénédiction": "Blessing Scroll",
        "Manuel de Forgeron": "Blacksmith Handbook",
        "Parchemin du Dieu Dragon": "Dragon God Scroll",
        "Parchemin de Guerre": "War Scroll",
        "Pierre magique": "Magic Stone"
    },
    ro: {
        configTab: "Configurare",
        analysisTab: "Analiză",
        selectItem: "Selectarea obiectului",
        searchPlaceholder: "Căutați un obiect...",
        selected: "Selectat",
        recentItems: "Obiecte recente",
        priceConfig: "Configurare prețuri",
        upgradeItems: "Obiecte de upgrade",
        materials: "Materiale",
        runAnalysis: "Pornește analiza",
        upgradeLevels: "Niveluri de upgrade",
        fromLevel: "De la",
        toLevel: "La",
        analysisResults: "Rezultatele analizei",
        optimal: "Optimă",
        custom: "Personalizată",
        avgCost: "Cost mediu",
        avgTrials: "Încercări medii",
        trialsPerLevel: "Încercări per nivel",
        successProb: "P(succes)",
        interval95: "Interval 95%",
        upgradePath: "Calea de upgrade",
        requiredItems: "Obiecte necesare",
        requiredMaterials: "Materiale necesare",
        trialsProbability: "Încercări vs Probabilitate de succes",
        trialsProbabilityDesc: "Acest grafic arată probabilitatea de a reuși upgrade-ul în funcție de numărul de încercări",
        trialInterval: "Încercări",
        itemInterval: "Obiecte",
        costInterval: "Cost",
        globalStats: "Statistici globale",
        totalTrials: "Încercări medii",
        costRange95: "Interval 95%",
        trialsRange95: "Interval 95%",
        riskLevel: "Nivel de risc",
        recommendation: "Recomandare",
        riskLow: "Scăzut",
        riskMedium: "Mediu",
        riskHigh: "Ridicat",
        level: "Nivel",
        quantity: "Cantitate",
        unitCost: "Cost unitar",
        total: "Total",
        calculating: "Se calculează...",
        trials: "încercări",
        selectItemFirst: "Vă rugăm selectați mai întâi un obiect",
        analysisComplete: "Analiză completă",
        exportSuccess: "Export reușit",
        errorAnalysis: "Eroare la analiză",
        invalidLevelRange: "Nivelul final trebuie să fie mai mare decât nivelul de start",
        
        // Obiecte de upgrade
        "Parchemin de bénédiction": "Pergament de Binecuvântare",
        "Manuel de Forgeron": "Manual de Fierar",
        "Parchemin du Dieu Dragon": "Pergament al Zeului Dragon",
        "Parchemin de Guerre": "Pergament de Război",
        "Pierre magique": "Piatră Magică"
    },
    tr: {
        configTab: "Yapılandırma",
        analysisTab: "Analiz",
        selectItem: "Eşya Seçimi",
        searchPlaceholder: "Eşya ara...",
        selected: "Seçildi",
        recentItems: "Son eşyalar",
        priceConfig: "Fiyat Yapılandırması",
        upgradeItems: "Yükseltme Eşyaları",
        materials: "Malzemeler",
        runAnalysis: "Analizi Başlat",
        upgradeLevels: "Yükseltme seviyeleri",
        fromLevel: "Başlangıç",
        toLevel: "Bitiş",
        analysisResults: "Analiz Sonuçları",
        optimal: "Optimal",
        custom: "Özel",
        avgCost: "Ortalama Maliyet",
        avgTrials: "Ortalama Deneme",
        trialsPerLevel: "Seviye başına deneme",
        successProb: "P(başarı)",
        interval95: "%95 Aralık",
        upgradePath: "Yükseltme Yolu",
        requiredItems: "Gerekli Eşyalar",
        requiredMaterials: "Gerekli Malzemeler",
        trialsProbability: "Deneme vs Başarı Olasılığı",
        trialsProbabilityDesc: "Bu grafik, deneme sayısına göre başarıyla yükseltme olasılığını gösterir",
        trialInterval: "Deneme",
        itemInterval: "Eşya",
        costInterval: "Maliyet",
        globalStats: "Genel istatistikler",
        totalTrials: "Ortalama Deneme",
        costRange95: "%95 Aralık",
        trialsRange95: "%95 Aralık",
        riskLevel: "Risk Seviyesi",
        recommendation: "Öneri",
        riskLow: "Düşük",
        riskMedium: "Orta",
        riskHigh: "Yüksek",
        level: "Seviye",
        quantity: "Miktar",
        unitCost: "Birim Maliyet",
        total: "Toplam",
        calculating: "Hesaplanıyor...",
        trials: "deneme",
        selectItemFirst: "Lütfen önce bir eşya seçin",
        analysisComplete: "Analiz tamamlandı",
        exportSuccess: "Dışa aktarma başarılı",
        errorAnalysis: "Analiz hatası",
        invalidLevelRange: "Bitiş seviyesi başlangıç seviyesinden büyük olmalıdır",
        
        // Yükseltme eşyaları
        "Parchemin de bénédiction": "Kutsama Kağıdı",
        "Manuel de Forgeron": "Demirci El Kitabı",
        "Parchemin du Dieu Dragon": "Ejderha Tanrı Kağıdı",
        "Parchemin de Guerre": "Savaş Kağıdı",
        "Pierre magique": "Sihirli Taş"
    },
    de: {
        configTab: "Konfiguration",
        analysisTab: "Analyse",
        selectItem: "Gegenstand auswählen",
        searchPlaceholder: "Gegenstand suchen...",
        selected: "Ausgewählt",
        recentItems: "Letzte Gegenstände",
        priceConfig: "Preiskonfiguration",
        upgradeItems: "Verbesserungsgegenstände",
        materials: "Materialien",
        runAnalysis: "Analyse starten",
        upgradeLevels: "Verbesserungsstufen",
        fromLevel: "Von",
        toLevel: "Bis",
        analysisResults: "Analyseergebnisse",
        optimal: "Optimal",
        custom: "Benutzerdefiniert",
        avgCost: "Durchschnittskosten",
        avgTrials: "Durchschn. Versuche",
        trialsPerLevel: "Versuche pro Stufe",
        successProb: "P(Erfolg)",
        interval95: "95% Intervall",
        upgradePath: "Verbesserungspfad",
        requiredItems: "Benötigte Gegenstände",
        requiredMaterials: "Benötigte Materialien",
        trialsProbability: "Versuche vs Erfolgswahrscheinlichkeit",
        trialsProbabilityDesc: "Dieses Diagramm zeigt die Wahrscheinlichkeit einer erfolgreichen Verbesserung basierend auf der Anzahl der Versuche",
        trialInterval: "Versuche",
        itemInterval: "Gegenstände",
        costInterval: "Kosten",
        globalStats: "Globale Statistiken",
        totalTrials: "Durchschn. Versuche",
        costRange95: "95% Intervall",
        trialsRange95: "95% Intervall",
        riskLevel: "Risikoniveau",
        recommendation: "Empfehlung",
        riskLow: "Niedrig",
        riskMedium: "Mittel",
        riskHigh: "Hoch",
        level: "Stufe",
        quantity: "Anzahl",
        unitCost: "Stückkosten",
        total: "Gesamt",
        calculating: "Berechnung läuft...",
        trials: "Versuche",
        selectItemFirst: "Bitte wählen Sie zuerst einen Gegenstand aus",
        analysisComplete: "Analyse abgeschlossen",
        exportSuccess: "Export erfolgreich",
        errorAnalysis: "Analysefehler",
        invalidLevelRange: "Endstufe muss größer als Startstufe sein",
        
        // Verbesserungsgegenstände
        "Parchemin de bénédiction": "Segensrolle",
        "Manuel de Forgeron": "Schmiedehandbuch",
        "Parchemin du Dieu Dragon": "Drachengott-Rolle",
        "Parchemin de Guerre": "Kriegsrolle",
        "Pierre magique": "Magischer Stein"
    }
};

/**
 * Classe de base pour les calculs de chaînes de Markov
 * Version corrigée pour gérer correctement les niveaux de départ > 0
 */
class MarkovChain {
    constructor(successRates, noDowngradeFlags, startLevel = 0, endLevel = 9) {
        this.successRates = successRates;
        this.noDowngradeFlags = noDowngradeFlags;
        this.startLevel = startLevel;
        this.endLevel = endLevel;
        // On doit toujours considérer tous les états possibles (0 à endLevel)
        // car on peut retomber en dessous du niveau de départ
        this.n = this.endLevel;
        this.waypoints = [];
        this.totalTrials = 0;
        this.calculate();
    }

    calculate() {
        const P = this.buildTransitionMatrix();
        const Q = this.extractQ(P);
        const N = this.computeFundamentalMatrix(Q);
        
        // Extraire les waypoints depuis le niveau de départ
        // waypoints[i] = nombre moyen de fois qu'on passe par le niveau i
        // en partant du niveau startLevel pour atteindre endLevel
        this.waypoints = new Array(this.endLevel);
        
        // Pour chaque niveau i, waypoints[i] = N[startLevel][i]
        for (let i = 0; i < this.endLevel; i++) {
            this.waypoints[i] = N[this.startLevel][i];
        }
        
        // Le nombre total d'essais est la somme de tous les waypoints
        this.totalTrials = this.waypoints.reduce((sum, val) => sum + val, 0);
    }

    buildTransitionMatrix() {
        // La matrice complète inclut tous les états de 0 à endLevel
        const P = Array(this.n + 1).fill(null).map(() => Array(this.n + 1).fill(0));
        
        for (let i = 0; i < this.n; i++) {
            const successRate = this.successRates[i] / 100;
            const failRate = 1 - successRate;
            
            // Probabilité de succès : passer au niveau suivant
            P[i][i + 1] = successRate;
            
            // Probabilité d'échec : rester au même niveau ou descendre
            if (i === 0 || this.noDowngradeFlags[i]) {
                // Niveau 0 ou Pierre magique : on reste au même niveau
                P[i][i] = failRate;
            } else {
                // Autres cas : on descend d'un niveau
                P[i][i - 1] = failRate;
            }
        }
        
        // État absorbant (niveau final)
        P[this.n][this.n] = 1;
        
        return P;
    }

    extractQ(P) {
        // Q contient uniquement les états transitoires (0 à n-1)
        return P.slice(0, this.n).map(row => row.slice(0, this.n));
    }

    computeFundamentalMatrix(Q) {
        const I = this.identityMatrix(this.n);
        const IminusQ = this.matrixSubtract(I, Q);
        
        try {
            return this.matrixInverse(IminusQ);
        } catch (e) {
            console.warn('Matrix inversion failed, using iterative method');
            return this.computeByIterativeMethod(Q);
        }
    }

    computeByIterativeMethod(Q, maxIterations = 50000) {
        let N = this.identityMatrix(this.n);
        let Qpower = this.identityMatrix(this.n);
        
        for (let k = 1; k <= maxIterations; k++) {
            Qpower = this.matrixMultiply(Qpower, Q);
            N = this.matrixAdd(N, Qpower);
            
            if (k % 1000 === 0) {
                const maxElement = Math.max(...Qpower.flat().map(Math.abs));
                if (maxElement < 1e-10) {
                    break;
                }
            }
        }
        
        return N;
    }

    identityMatrix(n) {
        return Array(n).fill(null).map((_, i) => 
            Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
    }

    matrixSubtract(A, B) {
        return A.map((row, i) => row.map((val, j) => val - B[i][j]));
    }

    matrixAdd(A, B) {
        return A.map((row, i) => row.map((val, j) => val + B[i][j]));
    }

    matrixMultiply(A, B) {
        const n = A.length;
        const m = B[0].length;
        const p = B.length;
        const result = Array(n).fill(null).map(() => Array(m).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                for (let k = 0; k < p; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        
        return result;
    }

    matrixInverse(matrix) {
        const n = matrix.length;
        const augmented = matrix.map((row, i) => 
            [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]
        );
        
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
            
            const pivot = augmented[i][i];
            if (Math.abs(pivot) < 1e-10) {
                throw new Error("Singular matrix");
            }
            
            for (let j = 0; j < 2 * n; j++) {
                augmented[i][j] /= pivot;
            }
            
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = augmented[k][i];
                    for (let j = 0; j < 2 * n; j++) {
                        augmented[k][j] -= factor * augmented[i][j];
                    }
                }
            }
        }
        
        return augmented.map(row => row.slice(n));
    }
}

/**
 * Classe étendue avec calculs de variance et intervalles
 * Version corrigée pour gérer les niveaux de départ > 0
 */
class MarkovChainWithIntervals extends MarkovChain {
    constructor(successRates, noDowngradeFlags, startLevel = 0, endLevel = 9, maxTrial = 10000) {
        super(successRates, noDowngradeFlags, startLevel, endLevel);
        this.calculateVariances();
        this.calculateIntervals();
        this._points = null; // Points pour les probabilités cumulées
        this.maxTrial = maxTrial;
    }

    calculateVariances() {
        const P = this.buildTransitionMatrix();
        const Q = this.extractQ(P);
        const N = this.computeFundamentalMatrix(Q);
        
        // Calcul de la variance selon la formule correcte
        // Var = N(2N_dg - I) - N_sq
        const N_dg = this.diagonalMatrix(N);
        const I = this.identityMatrix(this.n);
        const twoN_dg_minus_I = this.matrixSubtract(this.matrixScalar(N_dg, 2), I);
        const variance_matrix = this.matrixSubtract(
            this.matrixMultiply(N, twoN_dg_minus_I),
            this.matrixElementwiseSquare(N)
        );
        
        // Variance totale pour partir du niveau de départ
        const variances = variance_matrix[this.startLevel];
        this.totalVariance = variances.reduce((sum, val) => sum + val, 0);
        this.totalStd = Math.sqrt(Math.max(0, this.totalVariance));
        
        // Variances par niveau (uniquement pour les niveaux visités)
        this.levelVariances = [];
        this.levelStds = [];
        for (let j = 0; j < this.n; j++) {
            const variance = Math.max(0, variances[j]);
            this.levelVariances.push(variance);
            this.levelStds.push(Math.sqrt(variance));
        }
    }

    diagonalMatrix(matrix) {
        const n = matrix.length;
        const diag = Array(n).fill(null).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            diag[i][i] = matrix[i][i];
        }
        return diag;
    }

    matrixScalar(matrix, scalar) {
        return matrix.map(row => row.map(val => val * scalar));
    }

    matrixElementwiseSquare(matrix) {
        return matrix.map(row => row.map(val => val * val));
    }

    calculateIntervals() {
        // Utiliser la loi normale pour approximer les intervalles
        const z95 = 1.96; // 95% de confiance
        const z99 = 2.58; // 99% de confiance
        
        this.intervals = {
            total: {
                mean: this.totalTrials,
                std: this.totalStd,
                ci95: {
                    lower: Math.max(1, this.totalTrials - z95 * this.totalStd),
                    upper: this.totalTrials + z95 * this.totalStd
                },
                ci99: {
                    lower: Math.max(1, this.totalTrials - z99 * this.totalStd),
                    upper: this.totalTrials + z99 * this.totalStd
                }
            },
            byLevel: this.waypoints.map((mean, i) => ({
                mean: mean,
                std: this.levelStds[i],
                ci95: {
                    lower: Math.max(0, mean - z95 * this.levelStds[i]),
                    upper: mean + z95 * this.levelStds[i]
                }
            }))
        };
        
        // Coefficient de variation pour évaluer le risque
        this.cv = this.totalStd / this.totalTrials;
        this.riskLevel = this.cv < 0.20 ? 'low' : this.cv < 0.35 ? 'medium' : 'high';
    }

    /**
     * Calcule et mémorise la loi de probabilité cumulée de réussite en fonction du nombre de tentatives.
     * Si déjà calculée, ne recalcule pas.
     */
    calculateTrialsProbabilities() {
        if (this._points !== null) {
            return this._points; // déjà calculé
        }

        const P = this.buildTransitionMatrix();
        const Q = this.extractQ(P);
        const n = Q.length;

        const points = [];

        let currentPower = this.identityMatrix(n);
        let cumulativePercentage = 0;

        for (let trial_index = 1; trial_index <= this.maxTrial; trial_index++) {
            const percentage = currentPower[this.startLevel][n - 1] * this.successRates[n - 1];
            cumulativePercentage += percentage;

            points.push({
                x: trial_index,
                y: cumulativePercentage
            });

            if (percentage > 0 && percentage < 0.01) {
                break;
            }

            currentPower = this.matrixMultiply(currentPower, Q);
        }

        this._points = points;
        return points;
    }

    normalCDF(z) {
        // Approximation de la fonction de répartition normale
        const t = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989423 * Math.exp(-z * z / 2);
        const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return z > 0 ? 1 - p : p;
    }
}

/**
 * Application principale Upways optimisée
 */
class UpwaysApp {
    constructor() {
        this.data = {};
        this.currentLang = 'fr';
        this.currentItem = null;
        this.currentItemId = null;
        this.startLevel = 0;
        this.endLevel = 9;
        this.upgradeCosts = {};
        this.materialCosts = {};
        this.strategies = {};
        this.currentStrategy = 'optimal';
        this.customScenario = [];
        this.recentItems = [];
        
        // Noms internes des objets d'amélioration (clés de traduction)
        this.upgradeOptions = [
            "Parchemin de bénédiction",
            "Manuel de Forgeron",
            "Parchemin du Dieu Dragon",
            "Parchemin de Guerre",
            "Pierre magique"
        ];

        this.init();
    }

    async init() {
        try {
            this.loadLanguage();
            await this.loadData();
            this.loadSavedSettings();
            this.loadRecentItems();
            this.initElements();
            this.attachEvents();
            this.updateLanguage();
            this.displayUpgradeItemPrices();
            this.initTooltip();
            
            console.log('Application initialized');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('error', this.t('errorAnalysis'));
        }
    }

    // Helper pour obtenir le nom dans la langue courante avec fallback
    getLocalizedName(item, lang = null) {
        const targetLang = lang || this.currentLang;
        
        // Si c'est un string direct, le retourner
        if (typeof item === 'string') return item;
        
        // Si l'objet a un champ names
        if (item && item.names) {
            // Essayer la langue cible
            if (item.names[targetLang]) return item.names[targetLang];
            
            // Fallback: fr -> en -> première langue disponible
            if (item.names.fr) return item.names.fr;
            if (item.names.en) return item.names.en;
            
            // Retourner la première langue disponible
            const availableLanguages = Object.keys(item.names);
            if (availableLanguages.length > 0) {
                return item.names[availableLanguages[0]];
            }
        }
        
        return 'Unknown';
    }

    // Traduction générale et traduction des objets d'amélioration
    t(key) {
        return translations[this.currentLang]?.[key] || key;
    }

    // Traduction spécifique pour les objets d'amélioration
    translateUpgradeItem(itemName) {
        return this.t(itemName);
    }

    loadLanguage() {
        const savedLang = localStorage.getItem('upways-lang');
        if (savedLang && translations[savedLang]) {
            this.currentLang = savedLang;
        }
    }

    updateLanguage() {
        document.getElementById('languageSelect').value = this.currentLang;
        
        document.querySelectorAll('[data-i18n]').forEach(elem => {
            elem.textContent = this.t(elem.getAttribute('data-i18n'));
        });
        
        document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
            elem.placeholder = this.t(elem.getAttribute('data-i18n-placeholder'));
        });

        // Si un objet est déjà sélectionné, mettre à jour son affichage
        if (this.currentItemId) {
          const item = this.data[this.currentItemId];
          const localized = this.getLocalizedName(item);
          this.elements.objectSearch.value = localized;
          this.elements.itemName.textContent  = localized;
        }
        // Si l’utilisateur a déjà saisi une requête, regénérer les suggestions
        const q = this.elements.objectSearch.value.trim();
        if (q) {
          this.handleSearch({ target: { value: q } });
        } else {
          this.hideSearchResults();
        }
    }

    // Chargement des données
    async loadData() {
        const response = await fetch('data_full.json');
        this.data = await response.json();
        console.log(`${Object.keys(this.data).length} items loaded`);
    }

    loadSavedSettings() {
        const saved = localStorage.getItem('upways-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.upgradeCosts = settings.upgradeCosts || {};
                this.materialCosts = settings.materialCosts || {};
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }

        // Initialiser les coûts par défaut
        this.upgradeOptions.forEach(option => {
            if (!(option in this.upgradeCosts)) {
                this.upgradeCosts[option] = 0;
            }
        });
    }

    saveSettings() {
        const settings = {
            upgradeCosts: this.upgradeCosts,
            materialCosts: this.materialCosts
        };
        localStorage.setItem('upways-settings', JSON.stringify(settings));
    }

    // Gestion des objets récents
    loadRecentItems() {
        const saved = localStorage.getItem('upways-recent-items');
        if (saved) {
            try {
                this.recentItems = JSON.parse(saved);
                this.displayRecentItems();
            } catch (e) {
                this.recentItems = [];
            }
        }
    }

    saveRecentItem(itemId) {
        // Retirer l'objet s'il existe déjà
        this.recentItems = this.recentItems.filter(id => id !== itemId);
        
        // Ajouter en début de liste
        this.recentItems.unshift(itemId);
        
        // Garder seulement les 5 derniers
        this.recentItems = this.recentItems.slice(0, 5);
        
        localStorage.setItem('upways-recent-items', JSON.stringify(this.recentItems));
        this.displayRecentItems();
    }

    displayRecentItems() {
        const container = document.getElementById('recentItems');
        const list = document.getElementById('recentItemsList');
        
        if (this.recentItems.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        list.innerHTML = this.recentItems
            .filter(id => this.data[id]) // Vérifier que l'item existe
            .map(id => {
                const item = this.data[id];
                const name = this.getLocalizedName(item);
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
     * Évalue une stratégie spécifique de manière déterministe
     * Version adaptée de evaluateStrategy() pour l'exploration exhaustive
     */
    evaluateStrategyDeterministic(upgradePath, itemData) {
        const path = [];
        const rates = [];
        const flags = [];
        const costs = [];

        // Construire les taux de succès pour TOUS les niveaux (0 à endLevel)
        const fullRates = [];
        const fullFlags = [];
        const fullCosts = [];

        // Remplir les taux pour les niveaux 0 à startLevel (valeurs par défaut)
        for (let level = 1; level <= this.startLevel; level++) {
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
            const defaultOption = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
            const rate = this.calculateSuccessRate(level, defaultOption, levelData.success_rate);

            fullRates.push(rate);
            fullFlags.push(defaultOption === "Pierre magique");
            const materialCost = this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.upgradeCosts[defaultOption] || 0;
            fullCosts.push(materialCost + upgradeCost);
        }

        // Ajouter les taux pour le chemin spécifié (startLevel+1 à endLevel)
        for (let i = 0; i < upgradePath.length; i++) {
            const level = this.startLevel + i + 1;
            const upgradeType = upgradePath[i];
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
            const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);

            path.push({ 
                name: upgradeType, 
                rate, 
                noDowngrade: upgradeType === "Pierre magique" 
            });

            fullRates.push(rate);
            fullFlags.push(upgradeType === "Pierre magique");

            const materialCost = this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.upgradeCosts[upgradeType] || 0;
            fullCosts.push(materialCost + upgradeCost);
        }

        // Créer la chaîne de Markov
        const markov = new MarkovChainWithIntervals(fullRates, fullFlags, this.startLevel, this.endLevel);

        // Extraire les waypoints pour les niveaux pertinents
        const relevantWaypoints = [];
        for (let i = this.startLevel + 1; i <= this.endLevel; i++) {
            relevantWaypoints.push(markov.waypoints[i - 1]);
        }

        // Calculer le coût total
        const totalCost = fullCosts.reduce((sum, cost, i) => sum + cost * markov.waypoints[i], 0);

        return {
            path,
            rates: fullRates.slice(this.startLevel, this.endLevel),
            flags: fullFlags.slice(this.startLevel, this.endLevel),
            costs: fullCosts.slice(this.startLevel, this.endLevel),
            waypoints: relevantWaypoints,
            totalCost,
            markov,
            intervals: {
                total: markov.intervals.total,
                byLevel: relevantWaypoints.map((_, i) => markov.intervals.byLevel[this.startLevel + i])
            },
            riskLevel: markov.riskLevel
        };
    }

    /**
    * Génère toutes les combinaisons possibles d'objets d'amélioration
    * pour la plage de niveaux donnée
    */
    generateAllCombinations(methods, startLevel, endLevel) {
        const combinations = [];
        const numLevels = endLevel - startLevel;

        // Fonction récursive pour générer les combinaisons
        function generateCombos(currentCombo, levelIndex) {
            if (levelIndex === numLevels) {
                combinations.push([...currentCombo]);
                return;
            }

            const currentLevel = startLevel + levelIndex + 1;

            // Pour les niveaux 1-4, utiliser uniquement Parchemin de Guerre
            if (currentLevel <= 4) {
                currentCombo.push("Parchemin de Guerre");
                generateCombos(currentCombo, levelIndex + 1);
                currentCombo.pop();
            } else {
                // Pour les niveaux 5-9, tester tous les objets d'amélioration
                const availableMethods = methods.filter(method => 
                    method.name !== "Parchemin de Guerre"
                );

                for (const method of availableMethods) {
                    currentCombo.push(method.name);
                    generateCombos(currentCombo, levelIndex + 1);
                    currentCombo.pop();
                }
            }
        }

        generateCombos([], 0);
        return combinations;
    }

    // Éléments DOM
    initElements() {
        this.elements = {
            // Recherche
            objectSearch: document.getElementById('objectSearch'),
            searchResults: document.getElementById('searchResults'),
            selectedItem: document.getElementById('selectedItem'),
            itemName: document.getElementById('itemName'),
            itemImage: document.getElementById('itemImage'),
            recentItems: document.getElementById('recentItems'),
            recentItemsList: document.getElementById('recentItemsList'),
            
            // Niveaux
            startLevel: document.getElementById('startLevel'),
            endLevel: document.getElementById('endLevel'),
            analysisLevels: document.getElementById('analysisLevels'),
            
            // Prix
            upgradeItemPrices: document.getElementById('upgradeItemPrices'),
            materialSection: document.getElementById('materialSection'),
            materialPrices: document.getElementById('materialPrices'),
            
            // Analyse
            analyzeBtn: document.getElementById('analyzeBtn'),
            strategyDetails: document.getElementById('strategyDetails'),
            upgradePath: document.getElementById('upgradePath'),
            requiredItems: document.getElementById('requiredItems'),
            requiredMaterials: document.getElementById('requiredMaterials'),
            chartLegend: document.getElementById('chartLegend'),
            
            // Autres
            loadingOverlay: document.getElementById('loadingOverlay'),
            toastContainer: document.getElementById('toastContainer'),
            exportBtn: document.getElementById('exportBtn'),
            tooltip: document.getElementById('tooltip'),
            tooltipContent: document.getElementById('tooltipContent')
        };
    }

    // Tooltip system
    initTooltip() {
        this.tooltip = this.elements.tooltip;
        this.tooltipContent = this.elements.tooltipContent;
    }

    showTooltip(element, content, x, y) {
        this.tooltipContent.innerHTML = content;
        this.tooltip.style.display = 'block';
        
        // Position du tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.top - tooltipRect.height - 10;
        
        // Ajuster si sort de l'écran
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    // Événements
    attachEvents() {
        // Langue
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.currentLang = e.target.value;
            localStorage.setItem('upways-lang', this.currentLang);
            this.updateLanguage();
            
            // Mettre à jour l'affichage de l'objet sélectionné et des récents
            if (this.currentItem) {
                this.elements.itemName.textContent = this.currentItem;
            }
            this.displayRecentItems();
            
            // Mettre à jour les prix des matériaux et des objets d'amélioration
            this.displayUpgradeItemPrices();
            if (this.currentItemId) {
                this.displayMaterialPrices();
            }
            
            // Mettre à jour les résultats si on est dans l'onglet analyse
            if (document.getElementById('analysisTab').classList.contains('active') && this.strategies.optimal) {
                this.displayStrategyDetails();
            }
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Recherche
        this.elements.objectSearch.addEventListener('input', (e) => this.handleSearch(e));
        this.elements.objectSearch.addEventListener('focus', () => this.showSearchResults());
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchResults();
            }
        });

        // Niveaux
        this.elements.startLevel.addEventListener('change', () => this.updateLevelRange());
        this.elements.endLevel.addEventListener('change', () => this.updateLevelRange());

        // Analyse
        this.elements.analyzeBtn.addEventListener('click', () => this.runAnalysis());

        // Stratégies
        document.querySelectorAll('.strategy-card').forEach(card => {
            card.addEventListener('click', () => this.selectStrategy(card.dataset.strategy));
        });

        // Export
        this.elements.exportBtn.addEventListener('click', () => this.exportResults());

        // Reset
        document.getElementById('resetBtn').addEventListener('click', () => this.resetAll());
    }

    // Gestion des niveaux
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
        
        // Réinitialiser le scénario personnalisé
        this.initCustomScenario();
    }

    // Navigation
    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });
    }

    // Recherche d'objets
    handleSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            this.hideSearchResults();
            return;
        }
        
        // Rechercher dans les noms traduits
        const matches = [];
        Object.entries(this.data).forEach(([id, item]) => {
            const name = this.getLocalizedName(item).toLowerCase();
            if (name.includes(query)) {
                matches.push({ id, name: this.getLocalizedName(item), score: name.startsWith(query) ? 0 : 1 });
            }
        });
        
        // Trier par score (commence par) puis alphabétiquement
        matches.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return a.name.localeCompare(b.name);
        });
        
        this.displaySearchResults(matches.slice(0, 15));
    }

    displaySearchResults(matches) {
        if (matches.length === 0) {
            this.hideSearchResults();
            return;
        }

        this.elements.searchResults.innerHTML = matches.map(match => `
            <div class="search-result-item" data-item-id="${match.id}">
                <img src="img/${this.data[match.id].img_name || 'default.png'}" 
                     onerror="this.style.display='none'">
                <span>${match.name}</span>
            </div>
        `).join('');

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

    selectItemById(itemId) {
        const item = this.data[itemId];
        if (!item) return;
        
        const name = this.getLocalizedName(item);
        this.currentItem = name;
        this.currentItemId = itemId;
        this.elements.objectSearch.value = name;
        this.hideSearchResults();
        
        // Afficher l'objet sélectionné
        this.elements.itemName.textContent = name;
        this.elements.itemImage.src = `img/${item.img_name || 'default.png'}`;
        this.elements.selectedItem.style.display = 'flex';
        
        // Activer le bouton d'analyse
        this.elements.analyzeBtn.disabled = false;
        
        // Afficher les prix des matériaux
        this.displayMaterialPrices();
        
        // Initialiser le scénario personnalisé
        this.initCustomScenario();
        
        // Sauvegarder dans les objets récents
        this.saveRecentItem(itemId);
    }

    // Affichage des prix
    displayUpgradeItemPrices() {
        this.elements.upgradeItemPrices.innerHTML = this.upgradeOptions.map(option => `
            <div class="price-item">
                <img src="img/${this.getUpgradeIcon(option)}" class="price-icon" onerror="this.style.display='none'">
                <label>${this.translateUpgradeItem(option)}</label>
                <input type="number" class="price-input" data-type="upgrade" data-name="${option}" 
                       value="${this.upgradeCosts[option] || 0}" min="0" step="0.1">
                <span class="currency">M</span>
            </div>
        `).join('');

        this.elements.upgradeItemPrices.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('change', () => this.updatePrice(input));
        });
    }

    displayMaterialPrices() {
        if (!this.currentItemId) return;
        
        const materials = this.getAllMaterialsWithImages();
        if (materials.length === 0) {
            this.elements.materialSection.style.display = 'none';
            return;
        }

        this.elements.materialSection.style.display = 'block';
        this.elements.materialPrices.innerHTML = materials.map(mat => `
            <div class="price-item">
                ${mat.imgName ? `<img src="img/${mat.imgName}" class="price-icon" onerror="this.style.display='none'">` : ''}
                <label>${mat.name}</label>
                <input type="number" class="price-input" data-type="material" data-name="${mat.id}" 
                       value="${this.materialCosts[mat.id] || 0}" min="0" step="0.1">
                <span class="currency">M</span>
            </div>
        `).join('');

        this.elements.materialPrices.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('change', () => this.updatePrice(input));
        });
    }

    updatePrice(input) {
        const type = input.dataset.type;
        const name = input.dataset.name;
        const value = parseFloat(input.value) || 0;
        
        if (type === 'upgrade') {
            this.upgradeCosts[name] = value;
        } else {
            this.materialCosts[name] = value;
        }
        
        this.saveSettings();
        
        // Si on est dans l'onglet analyse et qu'on a une stratégie personnalisée, la mettre à jour
        if (this.currentStrategy === 'custom' && this.strategies.custom) {
            this.updateCustomPath();
        }
    }

    getAllMaterials() {
        if (!this.currentItemId) return [];
        
        const materials = new Set();
        const itemData = this.data[this.currentItemId];
        
        for (let i = this.startLevel + 1; i <= this.endLevel; i++) {
            const levelData = itemData[i.toString()];
            if (levelData?.materials) {
                Object.keys(levelData.materials).forEach(mat => materials.add(mat));
            }
        }
        
        return Array.from(materials).sort();
    }

    getAllMaterialsWithImages() {
        if (!this.currentItemId) return [];
        
        const materialsMap = new Map();
        const itemData = this.data[this.currentItemId];
        
        for (let i = this.startLevel + 1; i <= this.endLevel; i++) {
            const levelData = itemData[i.toString()];
            if (levelData?.materials) {
                Object.entries(levelData.materials).forEach(([id, info]) => {
                    if (!materialsMap.has(id)) {
                        materialsMap.set(id, {
                            id,
                            name: this.getLocalizedName(info),
                            imgName: info.img_name
                        });
                    }
                });
            }
        }
        
        return Array.from(materialsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    // Scénario personnalisé
    initCustomScenario() {
        if (!this.currentItemId) return;

        const itemData = this.data[this.currentItemId];
        this.customScenario = [];
        
        for (let i = this.startLevel + 1; i <= this.endLevel; i++) {
            const defaultOption = i <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
            this.customScenario[i - this.startLevel - 1] = defaultOption;
        }
    }

    // Analyse principale
    async runAnalysis() {
        if (!this.currentItemId) {
            this.showToast('error', this.t('selectItemFirst'));
            return;
        }

        if (this.endLevel <= this.startLevel) {
            this.showToast('error', this.t('invalidLevelRange'));
            return;
        }

        this.showLoading();
        
        try {
            // Calculer toutes les stratégies
            await this.calculateAllStrategies();
            
            // Passer à l'onglet analyse
            this.switchTab('analysis');
            
            // Mettre à jour l'affichage des niveaux
            this.elements.analysisLevels.textContent = `(+${this.startLevel} → +${this.endLevel})`;
            
            // Sélectionner la stratégie optimale par défaut
            this.selectStrategy('optimal');
            
            this.showToast('success', this.t('analysisComplete'));
        } catch (error) {
            console.error('Analysis error:', error);
            this.showToast('error', this.t('errorAnalysis'));
        } finally {
            this.hideLoading();
        }
    }

    async calculateAllStrategies() {
        const [optimal, custom] = await Promise.all([
            this.calculateOptimalStrategy(),
            this.calculateCustomStrategy()
        ]);
        
        this.strategies = { optimal, custom };
        
        // Mettre à jour l'affichage des cartes
        this.updateStrategyCards();
    }

    /**
     * Calcule la stratégie optimale avec une exploration exhaustive déterministe
     * Remplace la méthode calculateOptimalStrategy() existante
     */
    async calculateOptimalStrategy() {
        const itemData = this.data[this.currentItemId];

        // Définir les méthodes d'amélioration disponibles pour les niveaux 5-9
        const methods = [
            {
                name: "Parchemin de bénédiction",
                getRate: (level) => itemData[level.toString()]?.success_rate || 0,
                noDowngrade: false
            },
            {
                name: "Manuel de Forgeron", 
                getRate: (level) => [100, 100, 90, 80, 70, 60, 50, 30, 20][level - 1] || 0,
                noDowngrade: false
            },
            {
                name: "Parchemin du Dieu Dragon",
                getRate: (level) => [100, 75, 65, 55, 45, 40, 35, 25, 20][level - 1] || 0,
                noDowngrade: false
            },
            {
                name: "Pierre magique",
                getRate: (level) => itemData[level.toString()]?.success_rate || 0,
                noDowngrade: true
            }
        ];

        let bestStrategy = null;
        let bestCost = Infinity;

        // Générer toutes les combinaisons possibles pour la plage de niveaux sélectionnée
        const combinations = this.generateAllCombinations(methods, this.startLevel, this.endLevel);

        // Évaluer chaque combinaison
        for (const combination of combinations) {
            const strategy = this.evaluateStrategyDeterministic(combination, itemData);

            if (strategy.totalCost < bestCost) {
                bestCost = strategy.totalCost;
                bestStrategy = strategy;
            }
        }

        return bestStrategy;
    }

    async calculateCustomStrategy() {
        const itemData = this.data[this.currentItemId];
        return this.evaluateStrategy(this.customScenario, itemData);
    }

    /**
     * Évalue une stratégie avec la logique corrigée de la chaîne de Markov
     */
    evaluateStrategy(upgradePath, itemData) {
        const path = [];
        const rates = [];
        const flags = [];
        const costs = [];
        
        // Construire les taux de succès pour TOUS les niveaux (0 à endLevel)
        // car on peut retomber en dessous du niveau de départ
        const fullRates = [];
        const fullFlags = [];
        const fullCosts = [];
        
        // D'abord, remplir les taux pour les niveaux 0 à startLevel
        // (on utilise les valeurs par défaut car on ne passera pas par ces niveaux normalement)
        for (let level = 1; level <= this.startLevel; level++) {
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
            const defaultOption = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
            const rate = this.calculateSuccessRate(level, defaultOption, levelData.success_rate);
            
            fullRates.push(rate);
            fullFlags.push(defaultOption === "Pierre magique");
            const materialCost = this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.upgradeCosts[defaultOption] || 0;
            fullCosts.push(materialCost + upgradeCost);
        }
        
        // Ensuite, ajouter les taux pour le chemin réel (startLevel+1 à endLevel)
        for (let i = 0; i < upgradePath.length; i++) {
            const level = this.startLevel + i + 1;
            const upgradeType = upgradePath[i];
            const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
            const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);
            
            path.push({ 
                name: upgradeType, 
                rate, 
                noDowngrade: upgradeType === "Pierre magique" 
            });
            
            fullRates.push(rate);
            fullFlags.push(upgradeType === "Pierre magique");
            
            const materialCost = this.calculateMaterialCost(levelData.materials || {});
            const upgradeCost = this.upgradeCosts[upgradeType] || 0;
            fullCosts.push(materialCost + upgradeCost);
        }
        
        // Créer la chaîne de Markov avec tous les taux
        const markov = new MarkovChainWithIntervals(fullRates, fullFlags, this.startLevel, this.endLevel);
        
        // Extraire uniquement les waypoints pour les niveaux qui nous intéressent
        // waypoints[i] correspond au niveau startLevel + i + 1
        const relevantWaypoints = [];
        for (let i = this.startLevel + 1; i <= this.endLevel; i++) {
            relevantWaypoints.push(markov.waypoints[i - 1]);
        }
        
        // Calculer le coût total en utilisant les waypoints complets
        const totalCost = fullCosts.reduce((sum, cost, i) => sum + cost * markov.waypoints[i], 0);
        
        return {
            path,
            rates: fullRates.slice(this.startLevel, this.endLevel),
            flags: fullFlags.slice(this.startLevel, this.endLevel),
            costs: fullCosts.slice(this.startLevel, this.endLevel),
            waypoints: relevantWaypoints,
            totalCost,
            markov,
            intervals: {
                total: markov.intervals.total,
                byLevel: relevantWaypoints.map((_, i) => markov.intervals.byLevel[this.startLevel + i])
            },
            riskLevel: markov.riskLevel
        };
    }

    // Mise à jour de l'affichage
    updateStrategyCards() {
        Object.entries(this.strategies).forEach(([key, strategy]) => {
            if (!strategy) return;
            
            const costElem = document.getElementById(`${key}Cost`);
            const rangeElem = document.getElementById(`${key}Range`);
            
            if (costElem) costElem.textContent = this.formatCost(strategy.totalCost);
            
            // Afficher l'intervalle de tentatives 95%
            if (rangeElem && strategy.intervals) {
                const interval = strategy.intervals.total.ci95;
                rangeElem.innerHTML = `
                    <div style="font-size: 0.75rem; opacity: 0.8;">${this.t('avgTrials')}: ${Math.round(strategy.markov.totalTrials)}</div>
                    <div>${Math.ceil(interval.lower)} - ${Math.ceil(interval.upper)} ${this.t('trials')}</div>
                `;
            }
        });
    }

    selectStrategy(key) {
        this.currentStrategy = key;
        
        // Mettre à jour les cartes
        document.querySelectorAll('.strategy-card').forEach(card => {
            card.classList.toggle('optimal', card.dataset.strategy === key);
        });

        // Mettre à jour les détails
        this.displayStrategyDetails();
    }

    displayStrategyDetails() {
        const strategy = this.strategies[this.currentStrategy];
        if (!strategy) return;

        // Chemin d'amélioration (éditable pour la stratégie personnalisée)
        this.displayUpgradePath(strategy);
        
        // Objets requis
        this.displayRequiredItems(strategy);
        
        // Matériaux requis
        this.displayRequiredMaterials(strategy);
        
        // Graphique Tentatives vs Probabilité
        this.drawTrialsProbabilityChart(strategy);
        //if (this.currentStrategy === 'optimal') {
        //    const captureBtn = document.createElement('button');
        //    captureBtn.className = 'btn btn-primary';
        //    captureBtn.style.cssText = 'margin-top: 20px; width: 100%;';
        //    captureBtn.innerHTML = '<i class="fas fa-camera"></i> Télécharger l\'image du chemin optimal';
        //    captureBtn.onclick = () => this.captureOptimalPath();
        //        
        //    // L'ajouter après le graphique
        //    const chartSection = document.querySelector('.chart-section');
        //    if (chartSection && !chartSection.querySelector('.capture-btn')) {
        //        captureBtn.classList.add('capture-btn');
        //        chartSection.appendChild(captureBtn);
        //    }
        //}
    }

    displayUpgradePath(strategy) {
        const isCustom = this.currentStrategy === 'custom';
        const itemData = this.data[this.currentItemId];
        
        // Obtenir tous les waypoints de la chaîne de Markov
        const fullWaypoints = strategy.markov.waypoints;
        const fullIntervals = strategy.markov.intervals.byLevel;
        
        // Construire le chemin complet incluant tous les niveaux visités
        const pathSteps = [];
        
        // Parcourir tous les niveaux qui ont des waypoints significatifs
        for (let level = 1; level <= this.endLevel; level++) {
            const waypointValue = fullWaypoints[level - 1];
            
            // Afficher seulement les niveaux avec un nombre significatif de passages
            if (waypointValue > 0.01) {
                const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };
                
                // Déterminer l'objet d'amélioration utilisé pour ce niveau
                let upgradeType;
                let isEditable = false;
                let customIndex = -1;
                
                if (level > this.startLevel && level <= this.endLevel) {
                    // Niveau dans le chemin principal
                    const pathIndex = level - this.startLevel - 1;
                    upgradeType = strategy.path[pathIndex].name;
                    isEditable = isCustom && level > 4;
                    customIndex = pathIndex;
                } else {
                    // Niveau en dessous du niveau de départ (on y est retombé)
                    upgradeType = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
                }
                
                const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);
                const levelInterval = fullIntervals[level - 1];
                const levelCost = this.calculateMaterialCost(levelData.materials || {}) + (this.upgradeCosts[upgradeType] || 0);
                
                const itemInterval = {
                    lower: Math.ceil(levelInterval.ci95.lower),
                    upper: Math.ceil(levelInterval.ci95.upper)
                };
                const costInterval = {
                    lower: levelCost * levelInterval.ci95.lower,
                    upper: levelCost * levelInterval.ci95.upper
                };
                
                // Marquer visuellement les niveaux en dessous du départ
                const isBelowStart = level <= this.startLevel;
                const isTarget = level > this.startLevel && level <= this.endLevel;
                
                pathSteps.push({
                    level,
                    upgradeType,
                    rate,
                    waypoint: waypointValue,
                    isEditable,
                    customIndex,
                    isBelowStart,
                    isTarget,
                    levelInterval,
                    itemInterval,
                    costInterval
                });
            }
        }
        
        // Ajouter les statistiques de tentatives
        const trialsStatsHtml = `
            <div class="trials-summary">
                <h4 data-i18n="trialsPerLevel">${this.t('trialsPerLevel')}</h4>
                <div class="trials-stats">
                    <div class="stat-item">
                        <span class="stat-label">${this.t('totalTrials')}:</span>
                        <span class="stat-value">${Math.round(strategy.markov.totalTrials)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">${this.t('interval95')}:</span>
                        <span class="stat-value">${Math.ceil(strategy.intervals.total.ci95.lower)} - ${Math.ceil(strategy.intervals.total.ci95.upper)}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Générer le HTML du chemin
        const pathHtml = pathSteps.map(step => {
            const options = step.level <= 4 ? ["Parchemin de Guerre"] : 
                this.upgradeOptions.filter(opt => opt !== "Parchemin de Guerre");
            
            let stepClass = 'path-step';
            if (step.isBelowStart) stepClass += ' below-start';
            if (step.isTarget) stepClass += ' target-level';
            if (step.isEditable) stepClass += ' editable';
            
            if (step.isEditable) {
                // Chemin éditable pour la stratégie personnalisée
                return `
                    <div class="${stepClass}" data-level="${step.customIndex}">
                        <div class="step-header">
                            <span class="step-level">+${step.level}</span>
                            <img src="img/${this.getUpgradeIcon(step.upgradeType)}" 
                                 class="step-icon" 
                                 onerror="this.style.display='none'">
                        </div>
                        <select class="step-select" data-level="${step.customIndex}">
                            ${options.map(opt => `
                                <option value="${opt}" ${opt === step.upgradeType ? 'selected' : ''}>
                                    ${this.translateUpgradeItem(opt)}
                                </option>
                            `).join('')}
                        </select>
                        <div class="step-stats">
                            <div class="step-rate">${step.rate}%</div>
                            <div class="step-trials" title="${this.t('avgTrials')}: ${step.waypoint.toFixed(1)}">${step.waypoint.toFixed(1)}x</div>
                        </div>
                    </div>
                `;
            } else {
                // Chemin non éditable
                return `
                    <div class="${stepClass}">
                        <div class="step-header">
                            <span class="step-level">+${step.level}</span>
                            <img src="img/${this.getUpgradeIcon(step.upgradeType)}" 
                                 class="step-icon" 
                                 onerror="this.style.display='none'">
                        </div>
                        <div class="step-name">${this.translateUpgradeItem(step.upgradeType)}</div>
                        <div class="step-stats">
                            <div class="step-rate">${step.rate}%</div>
                            <div class="step-trials" title="${this.t('avgTrials')}: ${step.waypoint.toFixed(1)}">${step.waypoint.toFixed(1)}x</div>
                        </div>
                    </div>
                `;
            }
        }).join('');
        
        this.elements.upgradePath.innerHTML = trialsStatsHtml + '<div class="upgrade-path">' + pathHtml + '</div>';

        // Attacher les événements pour la modification en direct
        if (isCustom) {
            this.elements.upgradePath.querySelectorAll('.step-select').forEach(select => {
                select.addEventListener('change', () => this.updateCustomPath());
            });
        }

        // Attacher les tooltips
        this.elements.upgradePath.querySelectorAll('.path-step').forEach((stepElem, i) => {
            const step = pathSteps[i];
            
            const tooltipContent = `
                <div class="tooltip-title">Niveau +${step.level}</div>
                ${step.isBelowStart ? '<div class="tooltip-warning">⚠️ Niveau en dessous du départ</div>' : ''}
                <div class="tooltip-row">
                    <span>${this.t('trialInterval')}:</span>
                    <span>${step.levelInterval.ci95.lower.toFixed(1)} - ${step.levelInterval.ci95.upper.toFixed(1)}</span>
                </div>
                <div class="tooltip-row">
                    <span>${this.t('itemInterval')}:</span>
                    <span>${step.itemInterval.lower} - ${step.itemInterval.upper}</span>
                </div>
                <div class="tooltip-row">
                    <span>${this.t('costInterval')}:</span>
                    <span>${this.formatCost(step.costInterval.lower)} - ${this.formatCost(step.costInterval.upper)}</span>
                </div>
            `;
            
            stepElem.addEventListener('mouseenter', (e) => this.showTooltip(stepElem, tooltipContent));
            stepElem.addEventListener('mouseleave', () => this.hideTooltip());
        });
    }

    updateCustomPath() {
        // Récupérer les nouvelles valeurs
        this.elements.upgradePath.querySelectorAll('.step-select').forEach(select => {
            const index = parseInt(select.dataset.level);
            this.customScenario[index] = select.value;
        });

        // Recalculer la stratégie personnalisée
        this.calculateCustomStrategy().then(custom => {
            this.strategies.custom = custom;
            this.updateStrategyCards();
            this.displayStrategyDetails();
        });
    }

    displayRequiredItems(strategy) {
        const items = {};
        const itemData = this.data[this.currentItemId];
        const fullWaypoints = strategy.markov.waypoints;
        
        // Parcourir tous les niveaux qui ont des waypoints significatifs
        for (let level = 1; level <= this.endLevel; level++) {
            const waypointValue = fullWaypoints[level - 1];
            
            if (waypointValue > 0.01) {
                // Déterminer l'objet d'amélioration utilisé pour ce niveau
                let upgradeType;
                
                if (level > this.startLevel && level <= this.endLevel) {
                    // Niveau dans le chemin principal
                    const pathIndex = level - this.startLevel - 1;
                    upgradeType = strategy.path[pathIndex].name;
                } else {
                    // Niveau en dessous du niveau de départ ou par défaut
                    upgradeType = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
                }
                
                if (!items[upgradeType]) {
                    items[upgradeType] = {
                        name: upgradeType,
                        quantity: 0,
                        unitCost: this.upgradeCosts[upgradeType] || 0,
                        quantityLower: 0,
                        quantityUpper: 0
                    };
                }
                
                const levelInterval = strategy.markov.intervals.byLevel[level - 1];
                items[upgradeType].quantity += Math.round(waypointValue);
                items[upgradeType].quantityLower += Math.ceil(levelInterval.ci95.lower);
                items[upgradeType].quantityUpper += Math.ceil(levelInterval.ci95.upper);
            }
        }

        this.elements.requiredItems.innerHTML = Object.values(items).map(item => `
            <div class="item-row">
                <img src="img/${this.getUpgradeIcon(item.name)}" class="item-icon" onerror="this.style.display='none'">
                <span class="item-name">${this.translateUpgradeItem(item.name)}</span>
                <span class="item-qty" title="${item.quantityLower} - ${item.quantityUpper}">${item.quantity}</span>
                <span class="item-cost">${this.formatCost(item.quantity * item.unitCost)}</span>
            </div>
        `).join('');
    }

    displayRequiredMaterials(strategy) {
        const itemData = this.data[this.currentItemId];
        const materials = {};
        
        // Calculer les matériaux requis en considérant tous les niveaux visités
        // y compris ceux en dessous du niveau de départ (en cas d'échecs)
        const fullWaypoints = strategy.markov.waypoints;
        
        for (let level = 1; level <= this.endLevel; level++) {
            const levelData = itemData[level.toString()];
            if (levelData?.materials && fullWaypoints[level - 1] > 0.01) {
                Object.entries(levelData.materials).forEach(([id, info]) => {
                    if (!materials[id]) {
                        materials[id] = {
                            id,
                            name: this.getLocalizedName(info),
                            imgName: info.img_name,
                            quantity: 0,
                            unitCost: this.materialCosts[id] || 0
                        };
                    }
                    materials[id].quantity += info.qty * Math.ceil(fullWaypoints[level - 1]);
                });
            }
        }

        this.elements.requiredMaterials.innerHTML = Object.values(materials).map(mat => `
            <div class="item-row">
                <img src="img/${mat.imgName || 'default.png'}" class="item-icon" onerror="this.style.display='none'">
                <span class="item-name">${mat.name}</span>
                <span class="item-qty">${mat.quantity}</span>
                <span class="item-cost">${this.formatCost(mat.quantity * mat.unitCost)}</span>
            </div>
        `).join('');
    }

    /**
     * Dessine le graphique Tentatives vs Probabilité de succès
     */
    drawTrialsProbabilityChart(strategy) {
        const canvas = document.getElementById('probabilityChart');
        const ctx = canvas.getContext('2d');
        
        // Détruire le graphique existant
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Générer les points pour la courbe
        const meanTrials = strategy.markov.totalTrials;
        const points = strategy.markov.calculateTrialsProbabilities();
        
        // Points clés pour la légende
        // const keyPoints = [
        //     { trials: Math.ceil(meanTrials * 0.8), prob: strategy.markov.calculateTrialsProbability(meanTrials * 0.8) },
        //     { trials: Math.ceil(meanTrials), prob: strategy.markov.calculateTrialsProbability(meanTrials) },
        //     { trials: Math.ceil(meanTrials * 1.2), prob: strategy.markov.calculateTrialsProbability(meanTrials * 1.2) },
        //     { trials: Math.ceil(meanTrials * 1.5), prob: strategy.markov.calculateTrialsProbability(meanTrials * 1.5) }
        // ];
        
        // Créer le graphique
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Probabilité de succès',
                    data: points,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const trials = Math.round(context.parsed.x);
                                const prob = context.parsed.y;
                                return `${trials} ${this.t('trials')} → ${prob.toFixed(0)}% de réussite`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: this.t('trials'),
                            color: '#94a3b8'
                        },
                        ticks: {
                            callback: (value) => Math.round(value),
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Probabilité de réussite (%)',
                            color: '#94a3b8'
                        },
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: (value) => `${value}%`,
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            }
        });
        
        // Afficher la légende avec les points clés
        // this.elements.chartLegend.innerHTML = `
        //     <div class="legend-grid">
        //         ${keyPoints.map(point => `
        //             <div class="legend-item">
        //                 <span class="legend-budget">${point.trials}</span>
        //                 <span class="legend-arrow">→</span>
        //                 <span class="legend-prob">${(point.prob * 100).toFixed(0)}%</span>
        //             </div>
        //         `).join('')}
        //     </div>
        // `;
    }

    // Export amélioré
    async exportResults() {
        try {
            this.showLoading();

            const strategy = this.strategies[this.currentStrategy];
            if (!strategy) {
                this.showToast('error', 'Aucune stratégie sélectionnée');
                return;
            }

            // Créer un conteneur temporaire pour la capture
            const captureContainer = document.createElement('div');
            captureContainer.style.cssText = `
                width: 1200px;
                background: #1a1f2e;
                padding: 20px;
                position: absolute;
                left: -9999px;
                top: 0;
            `;
            document.body.appendChild(captureContainer);

            // 1. Récupérer la source de l'image de l'objet déjà chargée dans le DOM
            const selectedImgSrc = this.elements.itemImage.src;  // ex: "img/Parchemin_de_Guerre.png"
                    
            // 2. Créer et styliser l'élément <img>
            const objImg = document.createElement('img');
            objImg.src = selectedImgSrc;
            objImg.alt = this.currentItem;  // texte alternatif
            objImg.style.cssText = `
              width: 80px;
              height: auto;
              object-fit: contain;
              display: block;
              margin: 0 auto 20px;  /* centré et espacé du titre */
            `;
            

            // Créer le header avec logo
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 30px;
                padding: 20px;
                background: #0f1419;
                border-radius: 10px;
            `;

            // Ajouter le logo et le titre
            header.innerHTML = `
                <div style="display: flex; align-items: center; gap: 20px;">
                    <img src="logo.png" alt="Logo" style="height: 50px;">
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0;">Upways</h1>
                </div>
                <div style="text-align: right;">
                    <div style="color: #6B7280; font-size: 14px;">${new Date().toLocaleDateString()}</div>
                    <a href="https://metin2upways.com" style="color: #6366f1; text-decoration: none; font-size: 18px; font-weight: bold;">
                        metin2upways.com
                    </a>
                </div>
            `;
            captureContainer.appendChild(header);

            // Créer la bulle pour le chemin d'amélioration
            const pathSection = document.createElement('div');
            pathSection.style.cssText = `
                background: #0f1419;
                border-radius: 10px;
                padding: 25px;
                margin-bottom: 20px;
            `;
            
            // Calculer le coût total moyen
            const totalCost = Math.round(strategy.totalCost);

            pathSection.innerHTML = `
                <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 12px; text-align: center;">
                    Chemin d'amélioration optimal
                </h2>
                <!-- Nom de l'objet -->
                <div style="color: #ffffff; font-size: 18px; text-align: center; margin-bottom: 8px;">
                    ${this.currentItem}
                </div>
                <!-- Image de l'objet -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <img
                        src="${this.elements.itemImage.src}"
                        alt="${this.currentItem}"
                        style="
                            width: 50px;      /* largeur fixe */
                            height: auto;     /* hauteur automatique pour garder le ratio */
                            object-fit: contain;
                            display: inline-block;
                        "
                    />
                </div>
                <!-- Coût total moyen -->
                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="color: #6B7280; font-size: 16px;">Coût total moyen</div>
                    <div style="color: #6366f1; font-size: 28px; font-weight: bold;">
                        ${this.formatCost(totalCost)}
                    </div>
                </div>
            `;


            
            // Créer le chemin d'amélioration HORIZONTAL
            const pathDisplay = document.createElement('div');
            pathDisplay.style.cssText = `
                display: flex;
                align-items: stretch;
                justify-content: space-between;
                flex-wrap: nowrap;
                width: 100%;
                gap: 20px;
                padding: 20px;
                overflow-x: auto;
            `;

            // Construire le chemin optimal
            const itemData = this.data[this.currentItemId];
            const fullWaypoints = strategy.markov.waypoints;

            let hasAddedStep = false;

            for (let level = 1; level <= this.endLevel; level++) {
                const waypointValue = fullWaypoints[level - 1];

                if (waypointValue > 0.01) {
                    const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };

                    let upgradeType;
                    if (level > this.startLevel && level <= this.endLevel) {
                        const pathIndex = level - this.startLevel - 1;
                        upgradeType = strategy.path[pathIndex].name;
                    } else {
                        upgradeType = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
                    }

                    const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);

                    // Ajouter un "+" avant l'étape (sauf pour la première)
                    //if (hasAddedStep) {
                    //    const plusDiv = document.createElement('div');
                    //    plusDiv.style.cssText = `
                    //        font-size: 16px;
                    //        color: #6366f1;
                    //        font-weight: bold;
                    //        padding: 0 3px;
                    //        flex-shrink: 0;
                    //    `;
                    //    plusDiv.textContent = '+';
                    //    pathDisplay.appendChild(plusDiv);
                    //}

                    // Créer l'étape
                    const stepDiv = document.createElement('div');
                    stepDiv.style.cssText = `
                        background: #1a1f2e;
                        border: 2px solid ${level <= this.startLevel ? '#f59e0b' : '#2d3748'};
                        border-radius: 8px;
                        padding: 12px 10px;
                        text-align: center;
                        width: 100px;
                        flex-shrink: 0;
                        white-space: normal;
                        overflow-wrap: break-word;
                        word-break: break-word;
                    `;

                    stepDiv.innerHTML = `
                        <div style="font-size: 12px; color: #6366f1; font-weight: bold; margin-bottom: 5px;">+${level}</div>
                        <img src="img/${this.getUpgradeIcon(upgradeType)}" style="width: 40px; height: 40px; margin: 0 auto 5px; display: block;">
                        <div style="font-size: 10px; color: #cbd5e1; margin-bottom: 3px;">${this.translateUpgradeItem(upgradeType)}</div>
                        <div style="color: #48bb78; font-size: 14px; font-weight: bold;">${rate}%</div>
                        <div style="color: #6366f1; font-size: 12px; margin-top: 3px;">${waypointValue.toFixed(1)}x</div>
                    `;

                    pathDisplay.appendChild(stepDiv);
                    hasAddedStep = true;
                }
            }

            pathSection.appendChild(pathDisplay);
            captureContainer.appendChild(pathSection);


            // Capturer avec html2canvas
            const canvas = await html2canvas(captureContainer, {
                backgroundColor: '#1a1f2e',
                scale: 2,
                logging: false,
                windowWidth: 1200,
                windowHeight: captureContainer.scrollHeight
            });

            // Télécharger l'image
            const link = document.createElement('a');
            link.download = `upways-${this.currentItem}-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL();
            link.click();

            // Nettoyer
            document.body.removeChild(captureContainer);

            this.showToast('success', this.t('exportSuccess'));
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('error', 'Export failed');
        } finally {
            this.hideLoading();
        }
    }

    applyExportStyles(element) {
        // Stratégies
        const strategiesHtml = element.querySelector('.strategies-summary');
        if (strategiesHtml) {
            strategiesHtml.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;';
        }

        element.querySelectorAll('.strategy-card').forEach(el => {
            el.style.cssText = `
                background: ${el.classList.contains('optimal') ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#1e293b'};
                border: 2px solid ${el.classList.contains('optimal') ? 'transparent' : 'rgba(148, 163, 184, 0.1)'};
                border-radius: 1rem;
                padding: 1.5rem;
                color: ${el.classList.contains('optimal') ? 'white' : '#f1f5f9'};
            `;
        });

        // Styles pour les icônes et stats
        element.querySelectorAll('.strategy-header').forEach(el => {
            el.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;';
        });

        element.querySelectorAll('.strategy-icon').forEach(el => {
            el.style.cssText = 'font-size: 1.5rem;';
        });

        element.querySelectorAll('.stat-label').forEach(el => {
            el.style.cssText = 'font-size: 0.875rem; opacity: 0.8;';
        });

        element.querySelectorAll('.stat-value').forEach(el => {
            el.style.cssText = 'font-size: 1rem; font-weight: 700;';
        });

        // Chemin d'amélioration
        element.querySelectorAll('.upgrade-path').forEach(el => {
            el.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 2rem; padding: 0; flex-wrap: wrap;';
        });

        element.querySelectorAll('.path-step').forEach(el => {
            let baseStyle = `
                background: #1e293b;
                border: 1px solid rgba(148, 163, 184, 0.1);
                border-radius: 0.75rem;
                padding: 0.75rem;
                text-align: center;
                flex: 1;
                min-width: 90px;
                margin: 0 auto 0 auto;
            `;
            
            if (el.classList.contains('below-start')) {
                baseStyle = `
                    background: #334155;
                    border: 1px solid #f59e0b;
                    border-radius: 0.75rem;
                    padding: 0.75rem;
                    text-align: center;
                    flex: 1;
                    min-width: 90px;
                    opacity: 0.8;
                `;
            } else if (el.classList.contains('target-level')) {
                baseStyle = `
                    background: #1e293b;
                    border: 2px solid #6366f1;
                    border-radius: 0.75rem;
                    padding: 0.75rem;
                    text-align: center;
                    flex: 1;
                    min-width: 90px;
                `;
            }
            
            el.style.cssText = baseStyle;
        });

        element.querySelectorAll('.step-header').forEach(el => {
            el.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;';
        });

        element.querySelectorAll('.step-level').forEach(el => {
            let bgColor = '#6366f1';
            if (el.closest('.below-start')) {
                bgColor = '#f59e0b';
            }
            el.style.cssText = `background: ${bgColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;`;
        });

        element.querySelectorAll('.step-icon').forEach(el => {
            el.style.cssText = 'width: 36px; height: 36px; object-fit: contain;';
        });

        element.querySelectorAll('.step-name').forEach(el => {
            el.style.cssText = 'font-size: 0.75rem; color: #cbd5e1; margin-bottom: 0.5rem;';
        });

        element.querySelectorAll('.step-rate').forEach(el => {
            el.style.cssText = 'color: #10b981; font-weight: 600; font-size: 0.875rem;';
        });

        element.querySelectorAll('.step-trials').forEach(el => {
            el.style.cssText = 'color: #6366f1; font-weight: 600; font-size: 0.875rem;';
        });

        // Sections
        element.querySelectorAll('.detail-section, .chart-section').forEach(el => {
            el.style.cssText = `
                background: #1e293b;
                border: 1px solid rgba(148, 163, 184, 0.1);
                border-radius: 1rem;
                padding: 2rem;
                margin-bottom: 1.5rem;
            `;
        });

        // Titres
        element.querySelectorAll('h3, h4').forEach(el => {
            el.style.cssText = 'font-weight: 600; margin-bottom: 1rem; color: #f1f5f9;';
        });

        // Grilles
        element.querySelectorAll('.detail-grid').forEach(el => {
            el.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;';
        });

        element.querySelectorAll('.detail-card').forEach(el => {
            el.style.cssText = `
                background: #1e293b;
                border: 1px solid rgba(148, 163, 184, 0.1);
                border-radius: 1rem;
                padding: 1.5rem;
            `;
        });

        // Listes d'items
        element.querySelectorAll('.items-list').forEach(el => {
            el.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';
        });

        element.querySelectorAll('.item-row').forEach(el => {
            el.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid rgba(148, 163, 184, 0.1);';
        });

        element.querySelectorAll('.item-icon').forEach(el => {
            el.style.cssText = 'width: 32px; height: 32px; object-fit: contain;';
        });

        element.querySelectorAll('.item-name').forEach(el => {
            el.style.cssText = 'flex: 1; font-size: 0.875rem; color: #cbd5e1;';
        });

        element.querySelectorAll('.item-qty').forEach(el => {
            el.style.cssText = 'font-weight: 600; color: #f1f5f9; min-width: 50px; text-align: right;';
        });

        element.querySelectorAll('.item-cost').forEach(el => {
            el.style.cssText = 'font-weight: 600; color: #6366f1; min-width: 80px; text-align: right;';
        });

        // Graphique
        const chartContainer = element.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.style.cssText = 'height: 400px; margin-bottom: 1.5rem;';
        }

        // Légende
        const legendGrid = element.querySelector('.legend-grid');
        if (legendGrid) {
            legendGrid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; max-width: 600px; margin: 0 auto;';
        }

        element.querySelectorAll('.legend-item').forEach(el => {
            el.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #cbd5e1; justify-content: center;';
        });

        element.querySelectorAll('.legend-budget').forEach(el => {
            el.style.cssText = 'font-weight: 600; color: #6366f1;';
        });

        element.querySelectorAll('.legend-prob').forEach(el => {
            el.style.cssText = 'color: #f1f5f9;';
        });
    }

    // Utilitaires
    calculateSuccessRate(level, upgradeType, baseRate) {
        switch (upgradeType) {
            case "Parchemin de bénédiction":
            case "Pierre magique":
                return baseRate || 0;
            case "Manuel de Forgeron":
                return [100, 100, 90, 80, 70, 60, 50, 30, 20][level - 1] || 0;
            case "Parchemin du Dieu Dragon":
                return [100, 75, 65, 55, 45, 40, 35, 25, 20][level - 1] || 0;
            case "Parchemin de Guerre":
                return 100;
            default:
                return 0;
        }
    }

    calculateMaterialCost(materials) {
        let cost = 0;
        Object.entries(materials).forEach(([id, info]) => {
            cost += (this.materialCosts[id] || 0) * (info.qty || 0);
        });
        return cost;
    }

    formatCost(value) {
        if (!value || value === 0) return '0M';
        
        if (value >= 100) {
            const wons = Math.floor(value / 100);
            const millions = Math.floor(value % 100);
            return `${wons.toLocaleString()}.${millions.toString().padStart(2, '0')}w`;
        }
        return `${Math.floor(value)}M`;
    }

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

    showLoading() {
        this.elements.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.elements.loadingOverlay.style.display = 'none';
    }

    showToast(type, message) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : '✗'}</span>
            <span>${message}</span>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    resetAll() {
        if (confirm('Réinitialiser tous les paramètres ?')) {
            localStorage.clear();
            location.reload();
        }
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UpwaysApp();
});