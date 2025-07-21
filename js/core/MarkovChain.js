/**
 * Classe de base pour les calculs de chaînes de Markov
 * Version corrigée pour gérer correctement les niveaux de départ > 0
 */
export class MarkovChain {
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
export class MarkovChainWithIntervals extends MarkovChain {
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