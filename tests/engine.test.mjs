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
