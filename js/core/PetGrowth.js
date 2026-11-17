/**
 * Croissance des statistiques d'un familier (PV, Défense, PM, et stats Champion) et outils
 * statistiques pour savoir si un familier est bon ou mauvais.
 *
 * Règles (wikis Metin2 EN/FR/DE/PT, recoupées avec le suivi Excel de Rudy) :
 *  - chaque stat gagne un « palier » tous les `cadence` niveaux (niveaux 1 à 105 ; niveaux
 *    Champion 1 à 30 pour les stats Champion) ;
 *  - types impairs (T1, T3, T5, T7) = dynamiques : chaque palier est un nouveau tirage uniforme
 *    entre min et max ;
 *  - types pairs (T2, T4, T6, T8) = fixes : une seule valeur tirée à l'éclosion, appliquée à
 *    tous les paliers ;
 *  - bonus d'âge : +0,001 % par jour de vie (plafonné à +0,8 % à 800 jours), ajouté à min et max,
 *    uniquement pour les paliers franchis après avoir atteint cet âge ;
 *  - la valeur affichée en jeu inclut la « base » tirée à l'éclosion (PV 0,1 à 2,3 %, Défense et
 *    PM 0,1 à 2,0 %). Peu de joueurs la connaissent : elle est facultative.
 *  - verdict : un score simple, la place de la valeur affichée entre le minimum et le maximum
 *    possibles pour un familier du même type, niveau et âge avec la base moyenne (milieu de la
 *    fourchette) : 0 % = gain minimum à chaque palier, 50 % = gain moyen, 100 % = gain maximum.
 *    Le verdict ne dépend donc pas de la base saisie ; avec elle, on sait en plus isoler la part
 *    des paliers.
 *  - position parmi tous les familiers, tous niveaux confondus : entre le plus faible possible
 *    (niveau 1, 0 jour, base minimum) et le plus fort possible (niveau 105, 800 jours, meilleur
 *    type, base et gains maximum).
 *  - un seul relevé (la valeur affichée aujourd'hui) suffit ; les paliers précédents affinent le
 *    détail palier par palier.
 *
 * Stats Champion (Résistance Sung Ma, Pénétration, Précision) : fourchettes du tableau de
 * référence, encore peu documentées — à confirmer en jeu.
 *
 * Toutes les valeurs sont en points de pourcentage (1,35 = 1,35 %). Types : index 0 = T1.
 */

export const MAX_LEVEL = 105;
export const MAX_CHAMPION_LEVEL = 30;
export const AGE_CAP_DAYS = 800;
export const AGE_BONUS_PER_DAY = 0.001;

/** Stats suivies ; `scale` : niveau normal (1-105) ou niveau Champion (1-30) */
export const GROWTH_STATS = ['hp', 'def', 'sp', 'sungma', 'pen', 'prec'];
export const CHAMPION_STATS = ['sungma', 'pen', 'prec'];

// [cadence, min, max] pour T1 à T8
const GROWTH = {
    hp:     [[6, 0.1, 0.5], [5, 0.2, 0.3], [6, 0.1, 0.7], [5, 0.3, 0.4], [6, 0.1, 0.9], [5, 0.5, 0.6], [6, 0.1, 1.0], [5, 0.5, 0.7]],
    def:    [[8, 0.1, 0.2], [7, 0.2, 0.3], [8, 0.1, 0.3], [7, 0.3, 0.4], [8, 0.1, 0.4], [7, 0.4, 0.5], [8, 0.1, 0.6], [7, 0.5, 0.6]],
    sp:     [[6, 0.1, 0.5], [4, 0.2, 0.3], [6, 0.1, 0.7], [4, 0.3, 0.4], [6, 0.1, 0.9], [4, 0.4, 0.5], [6, 0.1, 1.1], [4, 0.5, 0.6]],
    sungma: [[5, 0.1, 0.5], [4, 0.2, 0.3], [5, 0.1, 0.7], [4, 0.3, 0.4], [5, 0.1, 0.9], [4, 0.5, 0.6], [5, 0.1, 1.0], [4, 0.5, 0.7]],
    pen:    [[5, 0.1, 0.5], [4, 0.2, 0.3], [5, 0.1, 0.7], [4, 0.3, 0.4], [5, 0.1, 0.9], [4, 0.5, 0.6], [5, 0.1, 1.0], [4, 0.5, 0.7]],
    prec:   [[4, 0.1, 0.5], [3, 0.2, 0.3], [4, 0.1, 0.7], [3, 0.3, 0.4], [4, 0.1, 0.9], [3, 0.5, 0.6], [4, 0.1, 1.0], [3, 0.5, 0.7]],
};

/**
 * Base à l'éclosion : fourchette de tirage (wiki FR). Stats Champion : supposées partir de 0
 * à l'éveil (à confirmer en jeu).
 */
export const BASE_RANGE = {
    hp: [0.1, 2.3], def: [0.1, 2.0], sp: [0.1, 2.0],
    sungma: [0, 0], pen: [0, 0], prec: [0, 0],
};

/** Types auxquels on compare (accessibles par Sort sur familier) */
export const COMPARE_TYPES = [5, 6, 7]; // T6, T7, T8

const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const isChampionStat = (stat) => CHAMPION_STATS.includes(stat);
export const scaleMax = (stat) => (isChampionStat(stat) ? MAX_CHAMPION_LEVEL : MAX_LEVEL);
export const isDynamicType = (type) => type % 2 === 0;

/** Bonus d'âge par palier, en points de % */
export function ageBonus(days) {
    const d = Number.isFinite(days) ? clamp(days, 0, AGE_CAP_DAYS) : 0;
    return round(d * AGE_BONUS_PER_DAY);
}

export function growthParams(stat, type) {
    const [cadence, min, max] = GROWTH[stat][type];
    return { cadence, min, max, width: round(max - min), mid: round((min + max) / 2), dynamic: isDynamicType(type) };
}

/** Niveaux où la stat gagne un palier : cadence, 2×cadence… jusqu'au niveau max */
export function palierLevels(stat, type) {
    const { cadence } = growthParams(stat, type);
    const levels = [];
    for (let l = cadence; l <= scaleMax(stat); l += cadence) levels.push(l);
    return levels;
}

/* ── Lois de probabilité ─────────────────────────────────────────── */

/** Fonction de répartition de la loi normale centrée réduite */
export function normalCdf(z) {
    // Abramowitz & Stegun 7.1.26 (erreur < 1,5e-7)
    const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
        * Math.exp(-(z * z) / 2);
    return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Répartition de la somme de n uniformes sur [0, 1] (loi d'Irwin-Hall), exacte */
function irwinHallCdf(x, n) {
    if (x <= 0) return 0;
    if (x >= n) return 1;
    let sum = 0;
    let binom = 1;
    let fact = 1;
    for (let i = 2; i <= n; i++) fact *= i;
    for (let k = 0; k <= Math.floor(x); k++) {
        if (k > 0) binom = binom * (n - k + 1) / k;
        sum += (k % 2 ? -1 : 1) * binom * (x - k) ** n;
    }
    return clamp(sum / fact, 0, 1);
}

/**
 * Répartition de la somme de n tirages uniformes de même largeur `width`, dont les bornes
 * basses totalisent `shift` : P(somme ≤ value). Exacte jusqu'à 12 tirages, loi normale au-delà.
 */
export function sumCdf(value, n, shift, width) {
    if (n <= 0 || width <= 0) return value >= shift - 1e-9 ? 1 : 0;
    const u = (value - shift) / width;
    if (n <= 12) return irwinHallCdf(u, n);
    return clamp(normalCdf((u - n / 2) / Math.sqrt(n / 12)), 0, 1);
}

/** Quantile de la même loi (par dichotomie) */
export function sumQuantile(p, n, shift, width) {
    if (n <= 0 || width <= 0) return shift;
    let lo = shift;
    let hi = shift + n * width;
    for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (sumCdf(mid, n, shift, width) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

/* ── Analyse d'un familier ───────────────────────────────────────── */

/** Appréciation à partir du score (0 = gains minimum partout, 0,5 = moyens, 1 = maximum) */
export function verdictFor(score) {
    if (score === null || score === undefined) return null;
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'average';
    if (score >= 0.2) return 'below';
    return 'poor';
}

/** Place d'une valeur entre un minimum et un maximum (0 à 1) */
const position = (x, lo, hi) => (hi > lo ? clamp((x - lo) / (hi - lo), 0, 1) : 0.5);

export const baseMean = (stat) => (BASE_RANGE[stat][0] + BASE_RANGE[stat][1]) / 2;

/**
 * Valeurs extrêmes d'une stat parmi tous les familiers, tous niveaux confondus : le plus faible
 * (niveau 1, aucun palier, base minimum) et le plus fort (niveau max, 800 jours, base maximum,
 * gain maximum à chaque palier, meilleur type).
 */
export function allPetsRange(stat) {
    const [bLo, bHi] = BASE_RANGE[stat];
    const bMax = ageBonus(AGE_CAP_DAYS);
    let best = null;
    for (let t = 0; t < 8; t++) {
        const g = growthParams(stat, t);
        const hi = bHi + palierLevels(stat, t).length * (g.max + bMax);
        if (!best || hi > best.value + 1e-9) best = { value: hi, type: t };
    }
    return { min: round(bLo), max: round(best.value), maxType: best.type, maxLevel: scaleMax(stat) };
}

/**
 * Analyse une stat d'un familier.
 * @param {object} p
 * @param {string} p.stat       'hp' | 'def' | 'sp' | 'sungma' | 'pen' | 'prec'
 * @param {number} p.type       0 = T1 … 7 = T8
 * @param {number|null} p.base  valeur affichée à l'éclosion, ou null si inconnue
 * @param {Array<{level:number,total:number,age?:number}>} p.entries  valeurs affichées en jeu
 *        (niveau où elles ont été relevées ; un seul relevé suffit, les paliers manqués sont permis)
 * @param {number} p.age        âge du familier en jours (âge par défaut des relevés)
 */
export function analyzeStat({ stat, type, base = null, entries = [], age = 0 }) {
    const g = growthParams(stat, type);
    const levels = palierLevels(stat, type);
    const totalPaliers = levels.length;
    const bNow = ageBonus(age);
    const [bLo, bHi] = BASE_RANGE[stat];
    const baseKnown = Number.isFinite(base) || bHi <= bLo;
    const baseValue = Number.isFinite(base) ? base : baseKnown ? bLo : null;
    const popBase = baseMean(stat);
    const baseRef = popBase;     // familiers comparés : toujours la base moyenne, jamais celle du familier suivi

    // Une entrée par palier : celle relevée au niveau le plus haut si plusieurs tombent sur le même
    const byPalier = new Map();
    for (const e of entries) {
        if (!e || !Number.isFinite(e.total) || !Number.isFinite(e.level)) continue;
        const k = Math.min(Math.floor(e.level / g.cadence), totalPaliers);
        if (k < 1) continue;
        const prev = byPalier.get(k);
        if (!prev || e.level >= prev.level) {
            byPalier.set(k, { k, level: e.level, total: e.total, age: Number.isFinite(e.age) ? e.age : age });
        }
    }
    const filled = [...byPalier.values()].sort((a, b) => a.k - b.k);

    // Segments entre deux relevés (le premier part de la base, s'il est connu)
    const segments = [];
    let prevK = 0;
    let prevTotal = baseKnown ? baseValue : null;
    let shift = 0;       // somme des bornes basses des paliers (âge compris)
    let expected = 0;    // espérance cumulée du gain
    let bonusSum = 0;    // somme des bonus d'âge
    for (const e of filled) {
        const span = e.k - prevK;
        const b = ageBonus(e.age);
        const lo = round(g.min + b);
        const hi = round(g.max + b);
        const mid = round((lo + hi) / 2);
        const gain = prevTotal === null ? null : round(e.total - prevTotal);
        const perPalier = gain === null ? null : round(gain / span);
        // Valeurs affichées à 0,1 près : jusqu'à 0,1 d'écart sur un gain
        const tol = 0.1 / span + 1e-9;
        segments.push({
            k: e.k,
            palierLevel: levels[e.k - 1],
            level: e.level,
            total: e.total,
            age: e.age,
            span,
            bonus: b,
            gain,
            expected: round(span * mid),
            deviation: gain === null ? null : round(gain - span * mid),
            perPalier,
            lo,
            hi,
            mid,
            outOfRange: perPalier === null ? null : perPalier < lo - tol ? 'low' : perPalier > hi + tol ? 'high' : null,
        });
        shift += span * lo;
        expected += span * mid;
        bonusSum += span * b;
        prevK = e.k;
        prevTotal = e.total;
    }

    const n = prevK;                                    // paliers franchis au dernier relevé
    const last = filled[filled.length - 1] || null;
    const total = last ? last.total : null;
    const lastLevel = last ? last.level : 0;

    // Score : place de la valeur affichée entre le minimum et le maximum possibles pour un familier
    // du même type, niveau et âge, avec la base moyenne (gain minimum / maximum à chaque palier)
    const minTotal = n ? round(popBase + shift) : null;
    const maxTotal = n ? round(popBase + shift + n * g.width) : null;
    const expectedTotal = n ? round(popBase + expected) : null;
    const score = n ? position(total, minTotal, maxTotal) : null;

    // Position parmi tous les familiers (tous niveaux, types et âges)
    const range = n ? allPetsRange(stat) : null;
    const allPets = range ? { ...range, score: round(position(total, range.min, range.max)) } : null;

    // Part des paliers seule : base connue (types dynamiques) ou valeur tirée retrouvée (types fixes)
    const gain = n && baseKnown ? round(total - baseValue) : null;
    let growthScore = null;
    let sigma = null;
    let z = null;
    let draw = null;
    let drawRange = null;
    if (n) {
        if (g.dynamic) {
            if (gain !== null) {
                sigma = round(Math.sqrt(n / 12) * g.width);
                z = sigma > 0 ? round((gain - expected) / sigma) : 0;
                growthScore = position(gain, shift, shift + n * g.width);
            }
        } else {
            const known = segments.filter(s => s.gain !== null);
            const span = known.reduce((t, s) => t + s.span, 0);
            if (span) {
                draw = round((known.reduce((t, s) => t + s.gain - s.span * s.bonus, 0)) / span);
            } else {
                // Base inconnue et un seul relevé : valeurs tirées compatibles avec la valeur affichée
                const vLo = clamp((total - bHi - bonusSum) / n, g.min, g.max);
                const vHi = clamp((total - bLo - bonusSum) / n, g.min, g.max);
                drawRange = [round(vLo), round(vHi)];
            }
            if (draw !== null) growthScore = position(draw, g.min, g.max);
        }
    }

    // Projection au niveau max (105 ou Champion 30) : moyenne, minimum et maximum possibles,
    // paliers restants à l'âge actuel
    const remaining = totalPaliers - n;
    let final;
    if (!n) {
        // Aucun relevé : un familier de ce type avec la base moyenne
        const lo = popBase + totalPaliers * (g.min + bNow);
        final = { mean: round(popBase + totalPaliers * (g.mid + bNow)), min: round(lo), max: round(lo + totalPaliers * g.width) };
    } else if (g.dynamic) {
        const lo = total + remaining * (g.min + bNow);
        final = { mean: round(total + remaining * (g.mid + bNow)), min: round(lo), max: round(lo + remaining * g.width) };
    } else if (draw !== null) {
        const point = round(total + remaining * (draw + bNow));
        final = { mean: point, min: point, max: point };
    } else {
        // Valeur tirée encore incertaine : fourchette compatible avec la valeur affichée
        const lo = total + remaining * (drawRange[0] + bNow);
        const hi = total + remaining * (drawRange[1] + bNow);
        final = { mean: round((lo + hi) / 2), min: round(lo), max: round(hi) };
    }

    // Comparaison avec T6 / T7 / T8 moyens : base moyenne et même âge
    const compare = COMPARE_TYPES.filter(t => t !== type).map(t => {
        const o = growthParams(stat, t);
        const oTotal = palierLevels(stat, t).length;
        const atLevel = n ? round(baseRef + Math.min(Math.floor(lastLevel / o.cadence), oTotal) * (o.mid + bNow)) : null;
        const finalMean = round(baseRef + oTotal * (o.mid + bNow));
        return {
            type: t,
            atLevel,
            deltaAtLevel: atLevel === null ? null : round(total - atLevel),
            finalMean,
            reachable: final.max >= finalMean - 1e-9,     // atteignable avec les meilleurs paliers restants
        };
    });

    return {
        stat,
        type,
        ...g,
        baseKnown,
        base: baseValue,
        baseRef: round(baseRef),
        baseRange: [bLo, bHi],
        levels,
        totalPaliers,
        segments,
        paliers: n,
        lastLevel,
        total,
        score: score === null ? null : round(score),
        verdict: verdictFor(score),
        minTotal,
        maxTotal,
        allPets,
        expectedTotal,
        deviation: n ? round(total - expectedTotal) : null,
        gain,
        expected: round(expected),
        growthDeviation: gain === null ? null : round(gain - expected),
        growthScore: growthScore === null ? null : round(growthScore),
        sigma,
        z,
        draw,
        drawRange,
        remaining,
        final,
        compare,
        outOfRange: segments.some(s => s.outOfRange),
    };
}

/**
 * Courbe attendue pour un type (valeurs affichées) à chaque palier : moyenne, minimum et maximum
 * possibles. `base` : base connue (même base pour tous), ou null pour la base moyenne (milieu de
 * la fourchette).
 */
export function expectedCurve(stat, type, base = null, age = 0, { band = true } = {}) {
    const g = growthParams(stat, type);
    const b = ageBonus(age);
    const ref = Number.isFinite(base) ? base : baseMean(stat);
    const levels = [0, ...palierLevels(stat, type)];
    return levels.map((level, k) => {
        const lo = ref + k * (g.min + b);
        return {
            level,
            mean: round(ref + k * (g.mid + b)),
            min: band ? round(lo) : null,
            max: band ? round(lo + k * g.width) : null,
        };
    });
}
