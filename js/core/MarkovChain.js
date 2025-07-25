/**
 * Classe de base pour les calculs de chaînes de Markov
 * Utilise la même approche matricielle que Calculator.js
 */

// Réutiliser la classe Matrix de UpgradeCalculator
class Matrix {
  static identity(n) {
    const matrix = new Array(n);
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      row[i] = 1;
      matrix[i] = row;
    }
    return matrix;
  }

  static subtract(A, B) {
    const result = new Array(A.length);
    for (let i = 0; i < A.length; i++) {
      const row = new Array(A[i].length);
      for (let j = 0; j < A[i].length; j++) {
        row[j] = A[i][j] - B[i][j];
      }
      result[i] = row;
    }
    return result;
  }

  static add(A, B) {
    const result = new Array(A.length);
    for (let i = 0; i < A.length; i++) {
      const row = new Array(A[i].length);
      for (let j = 0; j < A[i].length; j++) {
        row[j] = A[i][j] + B[i][j];
      }
      result[i] = row;
    }
    return result;
  }

  static multiply(A, B) {
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

  static inverse(matrix) {
    const n = matrix.length;
    const identity = Matrix.identity(n);
    const augmented = matrix.map((row, i) => [...row, ...identity[i]]);
    const doubleN = 2 * n;
    const EPSILON = 1e-10;

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      const pivot = augmented[i][i];
      if (Math.abs(pivot) < EPSILON) {
        throw new Error("Singular matrix");
      }

      for (let j = 0; j < doubleN; j++) {
        augmented[i][j] /= pivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < doubleN; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    return augmented.map((row) => row.slice(n));
  }
}

/**
 * Classe MarkovChain compatible avec l'ancienne interface
 */
export class MarkovChain {
  constructor(successRates, noDowngradeFlags, startLevel = 0, endLevel = 9) {
    this.successRates = successRates;
    this.noDowngradeFlags = noDowngradeFlags;
    this.startLevel = startLevel;
    this.endLevel = endLevel;
    
    // Vérification de validité
    if (this.startLevel >= this.endLevel) {
      throw new Error(`Invalid level range: startLevel (${startLevel}) must be less than endLevel (${endLevel})`);
    }
    
    if (this.endLevel > 9) {
      console.warn(`MarkovChain should only be used for levels <= 9. Use UpgradeCalculator for higher levels.`);
    }
    
    this.n = this.endLevel;
    this.waypoints = [];
    this.totalTrials = 0;
    this.calculate();
  }

  calculate() {
    const Q = this.buildTransitionMatrix();
    const I = Matrix.identity(this.n);
    const N = Matrix.inverse(Matrix.subtract(I, Q));
    
    // Extraire les waypoints depuis le niveau de départ
    this.waypoints = new Array(this.endLevel);
    
    for (let i = 0; i < this.endLevel; i++) {
      this.waypoints[i] = N[this.startLevel][i];
    }
    
    this.totalTrials = this.waypoints.reduce((sum, val) => sum + val, 0);
  }

  buildTransitionMatrix() {
    const Q = new Array(this.n);
    
    for (let i = 0; i < this.n; i++) {
      const row = new Array(this.n).fill(0);
      const pSuccess = this.successRates[i] / 100;
      const pFail = 1 - pSuccess;
      
      const hasNext = i < this.n - 1;
      const noRetro = i === 0 || this.noDowngradeFlags[i];
      
      if (hasNext) row[i + 1] = pSuccess;
      if (noRetro) row[i] = pFail;
      else row[i - 1] = pFail;
      
      Q[i] = row;
    }
    
    return Q;
  }
}

/**
 * Classe étendue avec calculs de variance et intervalles
 */
export class MarkovChainWithIntervals extends MarkovChain {
  constructor(successRates, noDowngradeFlags, startLevel = 0, endLevel = 9, maxTrial = 10000) {
    super(successRates, noDowngradeFlags, startLevel, endLevel);
    this.maxTrial = maxTrial;
    this.calculateVariances();
    this.calculateIntervals();
    this._probabilityPoints = null;
  }

  calculateVariances() {
    const Q = this.buildTransitionMatrix();
    const I = Matrix.identity(this.n);
    const N = Matrix.inverse(Matrix.subtract(I, Q));
    
    // Calcul de la variance: Var = N(2N_dg - I) - N_sq
    const N_dg = this.diagonalMatrix(N);
    const twoN_dg_minus_I = Matrix.subtract(this.matrixScalar(N_dg, 2), I);
    const N_squared = this.matrixElementwiseSquare(N);
    const variance_matrix = Matrix.subtract(
      Matrix.multiply(N, twoN_dg_minus_I),
      N_squared
    );
    
    // Variance totale
    const variances = variance_matrix[this.startLevel];
    this.totalVariance = variances.reduce((sum, val) => sum + val, 0);
    this.totalStd = Math.sqrt(Math.max(0, this.totalVariance));
    
    // Variances par niveau
    this.levelVariances = variances.map(v => Math.max(0, v));
    this.levelStds = this.levelVariances.map(v => Math.sqrt(v));
  }

  calculateIntervals() {
    const z95 = 1.96;
    const z99 = 2.58;
    
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
    
    this.cv = this.totalStd / this.totalTrials;
    this.riskLevel = this.cv < 0.20 ? 'low' : this.cv < 0.35 ? 'medium' : 'high';
  }

  /**
   * Calcule la probabilité cumulée de succès en fonction du nombre de tentatives
   */
  calculateTrialsProbabilities() {
    if (this._probabilityPoints !== null) {
      return this._probabilityPoints;
    }

    const Q = this.buildTransitionMatrix();
    const n = this.n;
    const points = [];

    let currentPower = Matrix.identity(n);
    let cumulativePercentage = 0;

    for (let trial = 1; trial <= this.maxTrial; trial++) {
      const percentage = currentPower[this.startLevel][n - 1] * this.successRates[n - 1];
      cumulativePercentage += percentage;

      points.push({
        x: trial,
        y: cumulativePercentage
      });

      if (cumulativePercentage > 99) break;
      
      currentPower = Matrix.multiply(currentPower, Q);
    }

    this._probabilityPoints = points;
    return points;
  }

  // Méthodes utilitaires
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
}

/**
 * Classe pour les calculs directs (niveaux > 9)
 * Compatible avec l'interface MarkovChain pour simplicité
 */
export class DirectCalculation {
  constructor(successRates, startLevel, endLevel) {
    this.successRates = successRates;
    this.startLevel = startLevel;
    this.endLevel = endLevel;
    this.waypoints = [];
    this.totalTrials = 0;
    this.calculate();
  }

  calculate() {
    this.waypoints = new Array(this.endLevel);
    
    for (let level = 0; level < this.endLevel; level++) {
      if (level >= this.startLevel && level < this.endLevel) {
        const rate = this.successRates[level] || 10;
        this.waypoints[level] = 100 / rate;
      } else {
        this.waypoints[level] = 0;
      }
    }
    
    this.totalTrials = this.waypoints.reduce((sum, val) => sum + val, 0);
    this.calculateIntervals();
  }

  calculateIntervals() {
    const totalStd = Math.sqrt(this.totalTrials);
    const z95 = 1.96;
    
    this.intervals = {
      total: {
        mean: this.totalTrials,
        std: totalStd,
        ci95: {
          lower: Math.max(1, this.totalTrials - z95 * totalStd),
          upper: this.totalTrials + z95 * totalStd
        }
      },
      byLevel: this.waypoints.map((mean) => ({
        mean: mean,
        std: Math.sqrt(mean),
        ci95: {
          lower: Math.max(0, mean - z95 * Math.sqrt(mean)),
          upper: mean + z95 * Math.sqrt(mean)
        }
      }))
    };
    
    this.cv = totalStd / this.totalTrials;
    this.riskLevel = this.cv < 0.20 ? 'low' : this.cv < 0.35 ? 'medium' : 'high';
  }

  calculateTrialsProbabilities() {
    const points = [];
    const avgRate = this.successRates.slice(this.startLevel, this.endLevel).reduce((sum, r) => sum + r, 0) / 
                   (this.endLevel - this.startLevel);
    const p = avgRate / 100;
    
    for (let n = 1; n <= Math.min(this.totalTrials * 3, 10000); n++) {
      const prob = (1 - Math.pow(1 - p, n)) * 100;
      points.push({ x: n, y: prob });
      
      if (prob > 99.9) break;
    }
    
    return points;
  }
}