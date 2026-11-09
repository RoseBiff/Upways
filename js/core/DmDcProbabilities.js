/**
 * Probabilités des Dégâts Moyens (DM) et Dégâts de Compétence (DC)
 *
 * DC = iSkillBonus     = MINMAX(-30, (int)(gauss_random(0, 5) + 0.5f), 30)
 * DM = iNormalHitBonus :
 *   si |DC| <= 20 : DM = -2·DC + |number(-8,8) + number(-8,8)| + number(1,4)
 *   sinon         : DM = -2·DC + number(1,5)
 *
 * La distribution DC est EMPIRIQUE (pickle iSkillBonus_probs, DC de -27 à +28).
 * La distribution DM en est déduite EXACTEMENT par la formule du jeu (DM de -55 à +60),
 * sans Monte Carlo ni calcul théorique de gauss_random.
 */

/**
 * Armes concernées (vnum +0). Toutes reçoivent leurs DM/DC par le même tirage (ApplyAddon).
 * Sources : wiki officiel Metin2 (pages « 30er Waffen », « 75er Waffen », « Durchschnittsschaden »).
 * Exclues volontairement : armes serpent (fonctionnement différent), armes jeunes héros (bonus fixe).
 */
export const DMDC_ITEM_VNUMS = new Set([
    // ── Niveau 30 ──
    '290',  // Épée de la lune pleine (guerrier, ninja, sura)
    '3210', // Lame de fer rouge (guerrier)
    '1170', // Dague de feuille noire (ninja)
    '2150', // Arc à cornes (ninja)
    '5110', // Gong antique (chamane)
    '7160', // Éventail vent d'automne (chamane)
    '6010', // Lance de phoenix (lycan)

    // ── Niveau 70 / 75 ──
    '180',  // Épée empoisonnée (guerrier, ninja, sura)
    '3160', // Épée de rancune (guerrier)
    '1130', // Chakram aile du diable (ninja)
    '2170', // Arc de corbeau d'acier (ninja)
    '5120', // Gong de bambou (chamane)
    '190',  // Épée du lion (sura)
    '6060', // Griffe de faucon (lycan)
    '6070', // Griffe épineuse (lycan)

    // ── Zodiaque ──
    '310',  // Épée du zodiaque (guerrier, ninja, sura)
    '3220', // Glaive du zodiaque (guerrier)
    '1180', // Dague du zodiaque (ninja)
    '2200', // Arc du zodiaque (ninja)
    '300',  // Lame du zodiaque (sura)
    '5160', // Cloche du zodiaque (chamane)
    '7300', // Éventail du zodiaque (chamane)
    '6120'  // Griffe du zodiaque (lycan)
]);

/**
 * Indique si un objet (vnum +0 ou +1..+9) affiche la section DM/DC.
 */
export function isDmDcItem(itemId) {
    if (itemId === null || itemId === undefined) return false;
    const id = String(itemId);
    if (DMDC_ITEM_VNUMS.has(id)) return true;
    const n = Number(id);
    if (!Number.isFinite(n)) return false;
    // Convention Metin2 : vnum +X = vnum +0 + X
    return DMDC_ITEM_VNUMS.has(String(Math.floor(n / 10) * 10));
}

// DC empirique (iSkillBonus_probs du pickle) — valeurs inchangées
const DC_RAW = {
    "-27":1.2732421116475958e-08,"-26":2.5464842232951917e-08,"-25":1.4005663228123554e-07,"-24":2.9284568567894704e-07,
    "-23":8.276073725709374e-07,"-22":2.0117225364032014e-06,"-21":5.271222342221047e-06,"-20":1.200667311283683e-05,
    "-19":2.7463832348238643e-05,"-18":5.971505503627225e-05,"-17":0.0001248286566259303,"-16":0.00025053585030889743,
    "-15":0.0004843412992707455,"-14":0.0008980685910295153,"-13":0.0016012802092924825,"-12":0.0027431491998602796,
    "-11":0.004514458160742182,"-10":0.007139705141063894,"-9":0.010852440941364934,"-8":0.015848732114417917,
    "-7":0.02224187174331724,"-6":0.02999400634008363,"-5":0.03886460773740573,"-4":0.04839459575950789,
    "-3":0.05790358801918898,"-2":0.06657441772919358,"-1":0.07355090596396537,"0":0.1577379035696845,
    "1":0.07808349509237741,"2":0.07355090596396537,"3":0.06657441772919358,"4":0.05790358801918898,
    "5":0.04839459575950789,"6":0.03886460773740573,"7":0.02999400634008363,"8":0.02224187174331724,
    "9":0.015848732114417917,"10":0.010852440941364934,"11":0.007139705141063894,"12":0.004514458160742182,
    "13":0.0027431491998602796,"14":0.0016012802092924825,"15":0.0008980685910295153,"16":0.0004843412992707455,
    "17":0.00025053585030889743,"18":0.0001248286566259303,"19":5.971505503627225e-05,"20":2.7463832348238643e-05,
    "21":1.200667311283683e-05,"22":5.271222342221047e-06,"23":2.0117225364032014e-06,"24":8.276073725709374e-07,
    "25":2.9284568567894704e-07,"26":1.4005663228123554e-07,"27":2.5464842232951917e-08,"28":1.2732421116475958e-08
};

function normalize(d) {
    const out = {};
    let t = 0;
    for (const k in d) t += d[k];
    for (const k in d) out[+k] = d[k] / t;
    return out;
}

// DM exact à partir de DC
function computeDM(dcProbs) {
    const absSum = {};
    for (let a = -8; a <= 8; a++) {
        for (let b = -8; b <= 8; b++) {
            const s = Math.abs(a + b);
            absSum[s] = (absSum[s] || 0) + 1 / 289;
        }
    }
    const dm = {};
    for (const k in dcProbs) {
        const c = +k, p = dcProbs[k];
        if (Math.abs(c) <= 20) {
            for (const s in absSum) {
                for (let r = 1; r <= 4; r++) {
                    const v = -2 * c + (+s) + r;
                    dm[v] = (dm[v] || 0) + p * absSum[s] * 0.25;
                }
            }
        } else {
            for (let r = 1; r <= 5; r++) {
                const v = -2 * c + r;
                dm[v] = (dm[v] || 0) + p * 0.2;
            }
        }
    }
    return dm;
}

// Séries triées : P(X = x) et P(X >= x)
function series(d) {
    const xs = Object.keys(d).map(Number).sort((a, b) => a - b);
    const p = xs.map(x => d[x]);
    const ge = new Array(xs.length);
    let acc = 0;
    for (let i = xs.length - 1; i >= 0; i--) {
        acc += p[i];
        ge[i] = Math.min(acc, 1);
    }
    return { xs, p, ge };
}

function stats(d) {
    const xs = Object.keys(d).map(Number);
    return { min: Math.min(...xs), max: Math.max(...xs) };
}

let _cache = null;

/**
 * Distributions DM et DC (calculées une seule fois).
 * @returns {{ dm: {xs:number[], p:number[], ge:number[], stats:object}, dc: {...} }}
 */
export function getDmDcDistributions() {
    if (_cache) return _cache;
    const dc = normalize(DC_RAW);
    const dm = computeDM(dc);
    const dmSer = series(dm);
    const dcSer = series(dc);
    _cache = {
        dm: { ...dmSer, stats: stats(dm) },
        dc: { ...dcSer, stats: stats(dc) }
    };
    return _cache;
}

/**
 * P(X >= v) pour une distribution donnée (v arrondi à l'entier supérieur).
 */
export function probAtLeast(dist, v) {
    const target = Math.ceil(v);
    let acc = 0;
    for (let i = 0; i < dist.xs.length; i++) {
        if (dist.xs[i] >= target) acc += dist.p[i];
    }
    return Math.min(acc, 1);
}
