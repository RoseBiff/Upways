/**
 * Tests de référence d'Upways — lancer depuis la racine du projet :
 *     node --test tests/
 *
 * Ils figent les résultats actuels du moteur : si une modification change un chiffre,
 * le test échoue et montre l'écart. Si le changement est voulu, mettre à jour la référence.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- Doublures minimales du navigateur : fetch (fichiers locaux) et localStorage ---
globalThis.fetch = async (path) => ({
    ok: true,
    status: 200,
    json: async () => JSON.parse(readFileSync(join(ROOT, String(path)), 'utf8'))
});
const store = new Map();
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
};
// Le moteur est très bavard en debug : on coupe les logs pendant les tests
console.log = () => {};
console.warn = () => {};

const { DataService } = await import('../js/services/DataService.js');
const { StrategyService } = await import('../js/services/StrategyService.js');
const { computeBudgetProbability } = await import('../js/core/Budget.js');
const { getDmDcDistributions, isDmDcItem, probAtLeast, DMDC_ITEM_VNUMS } = await import('../js/core/DmDcProbabilities.js');
const { formatCost } = await import('../js/utils/formatters.js');
const { translations } = await import('../js/core/translations.js');
const pets = await import('../js/core/PetSkills.js');
const growth = await import('../js/core/PetGrowth.js');
const { existsSync } = await import('node:fs');

const dataService = new DataService();
await dataService.loadData();
const strategyService = new StrategyService(dataService);

const close = (actual, expected, tol = 1e-9, msg = '') =>
    assert.ok(Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)),
        `${msg} attendu ${expected}, obtenu ${actual}`);

// ─────────────────────────────────────────────────────────────
// Moteur d'amélioration : valeurs de référence (prix par défaut = 0, coût = yang + matériaux)
// ─────────────────────────────────────────────────────────────
const REFERENCES = [
    { item: '10',  from: 0, to: 9,  cost: 0.4776333333333333, mean: 14.713734193210684, p5: 10, p50: 14,  p95: 22 },  // Épée
    { item: '290', from: 0, to: 9,  cost: 1.183142857142857,  mean: 14.899963068121405, p5: 10, p50: 14,  p95: 22 },  // Épée de la lune pleine
    { item: '180', from: 0, to: 9,  cost: 2.223461904761905,  mean: 27.00219146528605,  p5: 13, p50: 25,  p95: 49 },  // Épée empoisonnée
    { item: '360', from: 0, to: 15, cost: 215.61314285714286, mean: 177.53483768726582, p5: 93, p50: 170, p95: 294 }, // Épée serpent +0 → +15
    { item: '360', from: 9, to: 15, cost: 199.93333333333334, mean: 145.91401067573878, p5: 64, p50: 138, p95: 259 }  // Épée serpent +9 → +15
];

for (const ref of REFERENCES) {
    test(`stratégie optimale ${ref.item} +${ref.from} → +${ref.to}`, async () => {
        const s = await strategyService.calculateOptimalStrategy(ref.item, ref.from, ref.to);
        const p = s.intervals.total.percentiles;
        close(s.totalCost, ref.cost, 1e-9, 'coût moyen');
        close(s.intervals.total.mean, ref.mean, 1e-9, 'tentatives moyennes');
        assert.equal(p.p5, ref.p5, 'P5');
        assert.equal(p.p50, ref.p50, 'médiane');
        assert.equal(p.p95, ref.p95, 'P95');
        const sum = s.distribution.reduce((a, b) => a + b, 0);
        assert.ok(sum > 0.99 && sum <= 1 + 1e-9, `la distribution doit sommer à ~1 (obtenu ${sum})`);
    });
}

test('le chemin optimal de l\'Épée +0 → +9 est stable', async () => {
    const s = await strategyService.calculateOptimalStrategy('10', 0, 9);
    assert.deepEqual(s.fullPath.slice(0, 9), [
        'Parchemin de bénédiction', 'Manuel de Forgeron', 'Manuel de Forgeron', 'Manuel de Forgeron',
        'Pierre magique', 'Pierre magique', 'Pierre magique', 'Pierre magique', 'Pierre magique'
    ]);
});

test('« Personnalisé » recopié du chemin optimal donne exactement le même résultat', async () => {
    const optimal = await strategyService.calculateOptimalStrategy('180', 0, 9);
    const scenario = Object.fromEntries(optimal.fullPath.slice(0, 9).map((name, level) => [level, name]));
    const custom = await strategyService.calculateCustomStrategy(scenario, '180', 0, 9);
    close(custom.totalCost, optimal.totalCost, 1e-12, 'coût');
    close(custom.intervals.total.mean, optimal.intervals.total.mean, 1e-12, 'tentatives');
});

// ─────────────────────────────────────────────────────────────
// Budget → probabilité : inverse exact de la liste de préparation
// ─────────────────────────────────────────────────────────────
test('budget égal au coût d\'un percentile → probabilité de ce percentile', async () => {
    for (const [item, from, to] of [['10', 0, 9], ['180', 0, 9], ['360', 9, 15]]) {
        const s = await strategyService.calculateOptimalStrategy(item, from, to);
        // mêmes paliers déterministes que la liste de préparation
        let detT = 0, detC = 0;
        for (let level = 1; level <= to; level++) {
            const pd = s.path[level - from - 1];
            const wp = pd?.expectedTrials || 0;
            if (pd?.rate === 100 && wp <= 1.01) { detT += wp; detC += wp * (pd.totalCost || 0); }
        }
        let cdf = 0;
        const cdfAt = s.distribution.map((p) => (cdf += p));
        for (const pct of [25, 50, 75, 90, 95]) {
            const P = cdfAt.findIndex((c) => c >= pct / 100);
            const cost = detC + (s.totalCost - detC) * (P - detT) / (s.intervals.total.mean - detT);
            const res = computeBudgetProbability(s, cost, { startLevel: from, endLevel: to });
            close(res.probability, cdfAt[P], 1e-9, `${item} P${pct}`);
        }
        // plus de budget → jamais moins de chances
        const a = computeBudgetProbability(s, s.totalCost * 0.8, { startLevel: from, endLevel: to }).probability;
        const b = computeBudgetProbability(s, s.totalCost * 1.5, { startLevel: from, endLevel: to }).probability;
        assert.ok(b >= a, 'la probabilité doit croître avec le budget');
    }
});

// ─────────────────────────────────────────────────────────────
// DM / DC
// ─────────────────────────────────────────────────────────────
test('DM/DC : plages, total et valeur de référence de la page d\'origine', () => {
    const { dm, dc } = getDmDcDistributions();
    assert.equal(dc.stats.min, -27); assert.equal(dc.stats.max, 28);
    assert.equal(dm.stats.min, -55); assert.equal(dm.stats.max, 60);
    close(dc.p.reduce((a, b) => a + b, 0), 1, 1e-12, 'somme DC');
    close(dm.p.reduce((a, b) => a + b, 0), 1, 1e-12, 'somme DM');
    close(probAtLeast(dm, 30), 0.016247339986527012, 1e-12, 'P(DM ≥ 30)');
    close(probAtLeast(dc, 10), 0.028716575261888717, 1e-12, 'P(DC ≥ 10)');
});

test('DM/DC : 23 armes concernées, armes serpent exclues', () => {
    assert.equal(DMDC_ITEM_VNUMS.size, 23);
    for (const vnum of ['290', '299', '180', '6060', '310', '7300']) assert.ok(isDmDcItem(vnum), vnum);
    for (const vnum of ['10', '360', '380', '1210', '2230', '3250', '5200', '6150', '7330']) assert.ok(!isDmDcItem(vnum), vnum);
});

// ─────────────────────────────────────────────────────────────
// Affichage et traductions
// ─────────────────────────────────────────────────────────────
test('format des montants', () => {
    const cases = [[0, '0M'], [0.0006, '0,6k'], [0.045, '45k'], [0.4464, '0,45M'], [0.5, '0,5M'], [5.5, '5,5M'], [150, '1,50w']];
    for (const [value, expected] of cases) assert.equal(formatCost(value, 'fr'), expected, String(value));
    assert.equal(formatCost(0.4464, 'en'), '0.45M');
});

test('les 5 langues ont les mêmes clés et les mêmes {variables}', () => {
    const fr = translations.fr;
    for (const lang of ['en', 'ro', 'tr', 'de']) {
        const t = translations[lang];
        const missing = Object.keys(fr).filter((k) => !(k in t));
        assert.deepEqual(missing, [], `clés manquantes en ${lang}`);
        for (const [key, value] of Object.entries(fr)) {
            if (typeof value !== 'string' || typeof t[key] !== 'string') continue;
            const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
            assert.equal(vars(t[key]), vars(value), `${lang}.${key}`);
        }
    }
});

// --- Outil Familiers (js/core/PetSkills.js) ---

test('familiers : valeurs de référence du wiki', () => {
    const v = (pet, skill, type, level) => pets.getPetSkillValue(pet, skill, type, pets.PET_LEVELS.indexOf(level));
    // Compétence de prédilection : dépend du type
    assert.deepEqual(v('monkey', 'warrior', 0, 81), { value: 10, boosted: true });
    assert.deepEqual(v('monkey', 'warrior', 7, 105), { value: 14, boosted: true });
    assert.deepEqual(v('nemere', 'feather', 7, 105), { value: 675, boosted: true });
    assert.deepEqual(v('spider', 'immortal', 4, 90), { value: 2.5, boosted: true });
    // Valeur de base : même valeur quel que soit le type
    assert.deepEqual(v('spider', 'warrior', 0, 81), { value: 9, boosted: false });
    assert.deepEqual(v('spider', 'warrior', 7, 81), { value: 9, boosted: false });
    assert.deepEqual(v('boss', 'restoration', 3, 105), { value: 7000, boosted: false });
    // Coquille du wiki corrigée : Poids plume niveau 87 = 145 (14 sur le wiki)
    assert.deepEqual(v('monkey', 'feather', 0, 87), { value: 145, boosted: false });
});

test('familiers : tableau complet, valeurs numériques, croissantes avec le niveau', () => {
    assert.equal(pets.PETS.length, 13);
    assert.equal(pets.PET_SKILLS.length, 23);
    assert.equal(pets.PET_LEVELS.length, 25);
    assert.equal(pets.PET_TYPES.length, 8);
    for (const pet of pets.PETS) for (const skill of pets.PET_SKILLS) for (const type of pets.PET_TYPES) {
        let previous = -Infinity;
        pets.PET_LEVELS.forEach((level, i) => {
            const { value } = pets.getPetSkillValue(pet, skill, type, i);
            assert.ok(Number.isFinite(value), `${pet}.${skill}.T${type + 1}.${level}`);
            assert.ok(value >= previous, `${pet}.${skill}.T${type + 1} baisse au niveau ${level}`);
            previous = value;
        });
    }
});

test('familiers : noms dans les 5 langues et icônes présentes', () => {
    for (const lang of ['fr', 'en', 'ro', 'tr', 'de']) {
        for (const pet of pets.PETS) {
            assert.ok(pets.PET_NAMES[pet]?.[lang], `nom ${lang} de ${pet}`);
            assert.ok(pets.PET_SHORT_NAMES[pet]?.[lang], `nom court ${lang} de ${pet}`);
        }
        for (const skill of pets.PET_SKILLS) assert.ok(pets.PET_SKILL_NAMES[skill]?.[lang], `nom ${lang} de ${skill}`);
    }
    for (const pet of pets.PETS) assert.ok(existsSync(join(ROOT, 'data/pets', `${pet}.png`)), `icône ${pet}`);
    for (const skill of pets.PET_SKILLS) assert.ok(existsSync(join(ROOT, 'data/pet-skills', `${skill}.png`)), `icône ${skill}`);
});

// --- Suivi de familier (js/core/PetGrowth.js) : chiffres du suivi Excel d'un T7 de 800 jours ---

const relevés = (cadence, totals) => totals.map((total, i) => ({ level: (i + 1) * cadence, total }));

test('suivi familier : gains, espérance et écarts identiques au suivi Excel', () => {
    const pv = growth.analyzeStat({ stat: 'hp', type: 6, base: 1.5, age: 800, entries: relevés(6, [3.3, 4.8, 5.9, 7.1, 8.3, 9.7, 10.8, 12.6]) });
    assert.equal(pv.gain, 11.1);
    assert.equal(pv.expected, 10.8);
    assert.equal(pv.growthDeviation, 0.3);
    // Comparaisons : familiers T6 / T8 avec la base moyenne (1,2 en PV), pas celle du familier suivi
    assert.deepEqual(pv.compare.map(c => [c.type + 1, c.deltaAtLevel]), [[6, -0.75], [8, -1.2]]);

    const def = growth.analyzeStat({ stat: 'def', type: 6, base: 1.8, age: 800, entries: relevés(8, [2.9, 4.2, 5.9, 7.3, 8.4, 9.4]) });
    assert.equal(def.gain, 7.6);
    assert.equal(def.growthDeviation, 0.7);
    assert.deepEqual(def.compare.map(c => [c.type + 1, c.deltaAtLevel]), [[6, 0.85], [8, 0.25]]);
    // Palier 3 : +1,7 alors que le maximum théorique est 1,4 → signalé « hors plage », pas rejeté
    assert.deepEqual(def.segments.filter(s => s.outOfRange).map(s => [s.k, s.outOfRange]), [[3, 'high']]);

    const pm = growth.analyzeStat({ stat: 'sp', type: 6, base: 1.1, age: 800, entries: relevés(6, [2.9, 4.5, 5.5, 7.6, 9.4, 11.3, 13.1, 14.7]) });
    assert.equal(pm.gain, 13.6);
    assert.equal(pm.growthDeviation, 2.4);
    assert.deepEqual(pm.compare.map(c => [c.type + 1, c.deltaAtLevel]), [[6, -1.35], [8, -2.55]]);
});

test('suivi familier : score, paliers manqués, type fixe, bonus d\'âge', () => {
    const pv = growth.analyzeStat({ stat: 'hp', type: 6, base: 1.5, age: 800, entries: relevés(6, [3.3, 4.8, 5.9, 7.1, 8.3, 9.7, 10.8, 12.6]) });
    close(pv.growthScore, (11.1 - 7.2) / 7.2, 1e-4);   // paliers seuls : gain entre 8 × 0,9 et 8 × 1,8
    close(pv.z, 0.408, 1e-2);

    // Paliers 4 et 5 non saisis : le gain du palier 6 est réparti sur 3 paliers
    const trous = growth.analyzeStat({ stat: 'hp', type: 6, base: 1.5, age: 800, entries: [{ level: 18, total: 5.9 }, { level: 36, total: 9.7 }] });
    assert.deepEqual(trous.segments.map(s => [s.k, s.span, s.gain]), [[3, 3, 4.4], [6, 3, 3.8]]);

    // Type fixe (T6) : une seule valeur tirée, retrouvée à partir des gains
    const t6 = growth.analyzeStat({ stat: 'hp', type: 5, base: 1, age: 0, entries: [{ level: 10, total: 2.1 }, { level: 25, total: 3.75 }] });
    assert.equal(t6.draw, 0.55);
    assert.equal(t6.growthScore, 0.5);

    assert.equal(growth.ageBonus(100), 0.1);
    assert.equal(growth.ageBonus(5000), 0.8);
    assert.equal(growth.palierLevels('def', 6).length, 13);
    assert.equal(growth.palierLevels('sp', 7).length, 26);
    close(growth.sumCdf(5, 10, 0, 1), 0.5, 1e-9);
});

test('suivi familier : sans la base ni les paliers précédents, le verdict ne change pas', () => {
    const complet = growth.analyzeStat({ stat: 'hp', type: 6, base: 1.5, age: 800, entries: relevés(6, [3.3, 4.8, 5.9, 7.1, 8.3, 9.7, 10.8, 12.6]) });
    const minimal = growth.analyzeStat({ stat: 'hp', type: 6, base: null, age: 800, entries: [{ level: 48, total: 12.6 }] });
    // Score sur la valeur affichée, comparé à la base moyenne : identique avec ou sans la base
    assert.equal(minimal.score, complet.score);
    assert.equal(minimal.verdict, complet.verdict);
    assert.equal(minimal.deviation, complet.deviation);
    assert.deepEqual(minimal.final, complet.final);           // projection au niveau 105
    assert.equal(minimal.gain, null);                          // gain non calculable sans la base
    assert.equal(minimal.segments[0].gain, null);
    // Comparaison T6 / T8 sans la base : familier T6 / T8 moyen (base moyenne 1,2)
    assert.deepEqual(minimal.compare.map(c => [c.type + 1, c.deltaAtLevel]), [[6, -0.75], [8, -1.2]]);

    // Type fixe, base inconnue : la valeur tirée se déduit de deux relevés
    const fixe = growth.analyzeStat({ stat: 'hp', type: 5, base: null, age: 0, entries: [{ level: 10, total: 2.1 }, { level: 25, total: 3.75 }] });
    assert.equal(fixe.draw, 0.55);
    // … ou reste une fourchette avec un seul relevé
    const fixe1 = growth.analyzeStat({ stat: 'hp', type: 5, base: null, age: 0, entries: [{ level: 25, total: 3.75 }] });
    assert.deepEqual(fixe1.drawRange, [0.5, 0.6]);
});

test('suivi familier : score entre le minimum et le maximum possibles (T7, 800 jours, niv. 81)', () => {
    const at81 = (stat, total) => growth.analyzeStat({ stat, type: 6, base: null, age: 800, entries: [{ level: 81, total }] });
    const pv = at81('hp', 19.1);
    // Base moyenne 1,2 ; 13 paliers entre +0,9 et +1,8 (bonus d'âge compris)
    assert.deepEqual([pv.minTotal, pv.expectedTotal, pv.maxTotal], [12.9, 18.75, 24.6]);
    close(pv.score, 0.5299, 1e-4);
    assert.equal(pv.verdict, 'average');
    const def = at81('def', 15);
    assert.deepEqual([def.minTotal, def.maxTotal], [10.05, 15.05]);
    close(def.score, 0.99, 1e-4);
    close(at81('sp', 22.7).score, 0.7654, 1e-4);
    // Projection au niveau 105 : minimum et maximum possibles avec les paliers restants
    assert.deepEqual([pv.final.min, pv.final.max], [19.1 + 4 * 0.9, 19.1 + 4 * 1.8].map(x => Math.round(x * 1e4) / 1e4));
    // Au-delà du maximum (base plus haute que la moyenne) : score plafonné à 100 %
    assert.equal(at81('def', 16).score, 1);

    // Parmi tous les familiers, tous niveaux : du plus faible (niveau 1, base minimum 0,1)
    // au plus fort (T8 niv. 105 : 21 paliers de PV à +1,5 avec 800 jours, base maximum 2,3)
    assert.deepEqual(pv.allPets, { min: 0.1, max: 33.8, maxType: 7, maxLevel: 105, score: 0.5638 });
    assert.deepEqual([def.allPets.min, def.allPets.max], [0.1, 23]);
    close(def.allPets.score, 0.6507, 1e-4);
});

test('suivi familier : une base saisie (même aberrante) ne change pas les familiers comparés', () => {
    const relevé = [{ level: 48, total: 12.6 }];
    const sans = growth.analyzeStat({ stat: 'hp', type: 6, base: null, age: 800, entries: relevé });
    const aberrante = growth.analyzeStat({ stat: 'hp', type: 6, base: 100, age: 800, entries: relevé });
    assert.deepEqual(aberrante.compare, sans.compare);
    assert.equal(aberrante.baseRef, 1.2);
    assert.equal(aberrante.score, sans.score);
    assert.deepEqual(aberrante.allPets, sans.allPets);
});
