/**
 * Section « Probabilités DM/DC » de l'onglet Analyse.
 * Affichée uniquement pour les objets listés dans DMDC_ITEM_VNUMS (js/core/DmDcProbabilities.js).
 *
 * Pensée pour les joueurs : pas de formule, des phrases simples.
 *  - calculateur « Chance d'avoir au moins X DM »
 *  - graphique : barres = exactement cette valeur, courbe = au moins cette valeur,
 *    survol = « 1 chance sur N », clic sur une barre = envoi dans le calculateur
 */
import { getDmDcDistributions, isDmDcItem, probAtLeast } from '../core/DmDcProbabilities.js';

const STAT_CONFIG = {
    dm: {
        nameKey: 'dmdcDmName',
        shortKey: 'dmdcDmShort',
        color: '#6366f1',      // --primary
        rgb: '99, 102, 241',
        defaultCalc: 40
    },
    dc: {
        nameKey: 'dmdcDcName',
        shortKey: 'dmdcDcShort',
        color: '#f59e0b',      // --secondary
        rgb: '245, 158, 11',
        defaultCalc: 10
    }
};

const ORDER = ['dm', 'dc'];

export class DmDcComponent {
    constructor(translator) {
        this.translator = translator;
        this.container = document.getElementById('dmdcSection');
        this.itemId = null;
        this.charts = {};
        this.calcValues = { dm: STAT_CONFIG.dm.defaultCalc, dc: STAT_CONFIG.dc.defaultCalc };
        this.calcUpdaters = {};
        this.translator.addObserver(this);
    }

    /* ───────────── API publique ───────────── */

    /** Affiche la section si l'objet est concerné, la masque sinon. */
    setItem(itemId) {
        this.itemId = itemId;
        if (!this.container) return;

        if (isDmDcItem(itemId)) {
            this.container.hidden = false;
            this.render();
        } else {
            this.hide();
        }
    }

    hide() {
        this.destroyCharts();
        if (this.container) {
            this.container.hidden = true;
            this.container.innerHTML = '';
        }
    }

    isVisible() {
        return !!this.container && !this.container.hidden;
    }

    onTranslationEvent(event) {
        if (event === 'languageChanged' && this.isVisible()) {
            this.render();
        }
    }

    destroy() {
        this.translator.removeObserver(this);
        this.destroyCharts();
    }

    /* ───────────── Formatage ───────────── */

    get lang() {
        return this.translator?.getLanguage?.() || 'fr';
    }

    t(key, params = {}) {
        let s = this.translator.t(key);
        for (const [k, v] of Object.entries(params)) {
            s = s.split(`{${k}}`).join(v);
        }
        return s;
    }

    fmtDec(v, digits) {
        return v.toLocaleString(this.lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }

    /** Entier signé : +12, −5, 0 */
    fmtSigned(v) {
        if (v > 0) return `+${v}`;
        if (v < 0) return `−${Math.abs(v)}`;
        return '0';
    }

    /** Décimal signé : +7,2 */
    fmtSignedDec(v, digits) {
        const abs = this.fmtDec(Math.abs(v), digits);
        if (v > 0.0000001) return `+${abs}`;
        if (v < -0.0000001) return `−${abs}`;
        return abs;
    }

    /** Pourcentage lisible : précision adaptée à la taille du nombre */
    fmtP(prob) {
        const pct = prob * 100;
        if (pct <= 0) return '0 %';
        if (pct >= 99.995) return '100 %';
        if (pct >= 10) return `${this.fmtDec(pct, 1)} %`;
        if (pct >= 1) return `${this.fmtDec(pct, 2)} %`;
        if (pct < 0.0001) return `< ${this.fmtDec(0.0001, 4)} %`;
        return `${pct.toLocaleString(this.lang, { maximumSignificantDigits: 3 })} %`;
    }

    /** « 1 chance sur N », « 9,3 chances sur 10 », « moins de 1 sur 10 millions », « quasi certain » ou « impossible » */
    fmtOdds(prob) {
        if (prob <= 0) return this.t('dmdcImpossible');
        if (prob >= 0.995) return this.t('dmdcAlmostSure');
        if (prob >= 0.5) {
            const tenths = Math.round(prob * 100) / 10; // ex. 9,3
            const nTxt = Number.isInteger(tenths) ? String(tenths) : this.fmtDec(tenths, 1);
            return this.t('dmdcChancesOutOf10', { n: nTxt });
        }
        const n = 1 / prob;
        // Au-delà de 1 sur 10 millions, un chiffre exact n'apporte rien au joueur
        if (n > 10_000_000) return this.t('dmdcVeryRare');
        const nTxt = n < 10 ? this.fmtDec(n, 1) : Math.round(n).toLocaleString(this.lang);
        return this.t('dmdcOneChanceIn', { n: nTxt });
    }

    /* ───────────── Rendu ───────────── */

    render() {
        if (!this.container) return;
        this.destroyCharts();
        this.calcUpdaters = {};

        const data = getDmDcDistributions();

        this.container.innerHTML = `
            <div class="dmdc-header">
                <h3 class="chart-title" id="dmdcTitle">
                    <span class="dmdc-title-icon" aria-hidden="true">🎲</span>${this.t('dmdcTitle')}
                </h3>
                <p class="chart-subtitle">${this.t('dmdcSubtitle')}</p>
            </div>
            <div class="dmdc-blocks">${ORDER.map(key => this.blockHtml(key, data[key])).join('')}</div>
            <div class="dmdc-note">
                <p><span aria-hidden="true">💡</span> ${this.t('dmdcHint')}</p>
            </div>
        `;

        ORDER.forEach(key => {
            this.bindCalc(key, data[key]);
            this.createChart(key, data[key]);
        });
    }

    blockHtml(key, dist) {
        const cfg = STAT_CONFIG[key];
        const short = this.t(cfg.shortKey);
        const s = dist.stats;

        // « Chance d'avoir au moins {input} {stat} » : l'ordre des mots dépend de la langue
        const [before, after = ''] = this.t('dmdcCalcText', { stat: short }).split('{input}');

        return `
            <article class="dmdc-block dmdc-block--${key}" aria-labelledby="dmdcBlockTitle-${key}">
                <div class="dmdc-block-head">
                    <span class="dmdc-dot" aria-hidden="true"></span>
                    <h4 class="dmdc-block-title" id="dmdcBlockTitle-${key}">${this.t(cfg.nameKey)} (${short})</h4>
                </div>
                <div class="dmdc-calc">
                    <div class="dmdc-calc-expr">
                        <label for="dmdcInput-${key}">${before.trim()}</label>
                        <div class="dmdc-stepper">
                            <button type="button" class="dmdc-step" data-step="-1"
                                    aria-label="${this.t('dmdcDecrease')}">−</button>
                            <input type="number" class="dmdc-calc-input" id="dmdcInput-${key}"
                                   value="${this.calcValues[key]}" step="1"
                                   min="${s.min}" max="${s.max}"
                                   aria-label="${this.t('dmdcCalcAria')}">
                            <button type="button" class="dmdc-step" data-step="1"
                                    aria-label="${this.t('dmdcIncrease')}">+</button>
                        </div>
                        ${after.trim() ? `<span>${after.trim()}</span>` : ''}
                    </div>
                    <output class="dmdc-calc-out" id="dmdcOut-${key}" for="dmdcInput-${key}" aria-live="polite"></output>
                </div>
                <div class="dmdc-chart">
                    <canvas id="dmdcChart-${key}" role="img"
                            aria-label="${this.t(cfg.nameKey)} : ${this.t('dmdcLegendExactly', { stat: short })} / ${this.t('dmdcLegendAtLeast', { stat: short })}"></canvas>
                </div>
            </article>
        `;
    }

    bindCalc(key, dist) {
        const input = document.getElementById(`dmdcInput-${key}`);
        const out = document.getElementById(`dmdcOut-${key}`);
        if (!input || !out) return;

        const update = () => {
            const v = parseFloat(input.value);
            if (Number.isNaN(v)) {
                out.innerHTML = '—';
                this.setMarker(key, null);
                return;
            }
            this.calcValues[key] = input.value;
            const p = probAtLeast(dist, v);
            out.innerHTML = `<strong>${this.fmtP(p)}</strong><span class="dmdc-calc-odds">${this.fmtOdds(p)}</span>`;
            this.setMarker(key, Math.ceil(v));
        };

        input.addEventListener('input', update);

        // Boutons − / +
        input.closest('.dmdc-stepper').querySelectorAll('.dmdc-step').forEach(btn => {
            btn.addEventListener('click', () => {
                const cur = parseFloat(input.value);
                const base = Number.isNaN(cur) ? 0 : Math.round(cur);
                const next = Math.min(dist.stats.max, Math.max(dist.stats.min, base + Number(btn.dataset.step)));
                input.value = next;
                update();
            });
        });

        this.calcUpdaters[key] = (value) => {
            input.value = value;
            update();
        };
        update();
    }

    /* ───────────── Graphiques (Chart.js, déjà chargé par le site) ───────────── */

    createChart(key, dist) {
        const canvas = document.getElementById(`dmdcChart-${key}`);
        if (!canvas || typeof Chart === 'undefined') return;

        const cfg = STAT_CONFIG[key];
        const short = this.t(cfg.shortKey);
        const labels = dist.xs.map(x => String(x));
        const tick = '#94a3b8';
        const grid = 'rgba(148, 163, 184, 0.1)';
        const isMobile = window.matchMedia('(max-width: 640px)').matches;

        // Pas des graduations de l'axe X (et des lignes de grille verticales)
        const step = key === 'dm' ? (isMobile ? 20 : 10) : (isMobile ? 10 : 5);
        const onStep = index => dist.xs[index] % step === 0;

        const chart = new Chart(canvas, {
            data: {
                labels,
                datasets: [
                    {
                        type: 'line',
                        label: this.t('dmdcLegendAtLeast', { stat: short }),
                        data: dist.ge.map(v => v * 100),
                        yAxisID: 'yGe',
                        borderColor: cfg.color,
                        backgroundColor: `rgba(${cfg.rgb}, 0.08)`,
                        fill: 'origin',
                        cubicInterpolationMode: 'monotone',
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: cfg.color,
                        pointHoverBorderColor: '#f1f5f9',
                        pointHoverBorderWidth: 2,
                        order: 1,
                        _kind: 'ge'
                    },
                    {
                        type: 'bar',
                        label: this.t('dmdcLegendExactly', { stat: short }),
                        data: dist.p.map(v => v * 100),
                        yAxisID: 'yEq',
                        backgroundColor: `rgba(${cfg.rgb}, 0.45)`,
                        hoverBackgroundColor: `rgba(${cfg.rgb}, 0.9)`,
                        borderRadius: 2,
                        barPercentage: 0.9,
                        categoryPercentage: 1,
                        order: 2,
                        _kind: 'eq'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 450 },
                interaction: { mode: 'index', intersect: false },
                onHover: (evt, elements) => {
                    evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
                },
                onClick: (evt, elements) => {
                    if (!elements.length) return;
                    const x = dist.xs[elements[0].index];
                    this.calcUpdaters[key]?.(x);
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#cbd5e1',
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                            boxWidth: 10,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderColor: cfg.color,
                        borderWidth: 1,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        boxPadding: 4,
                        callbacks: {
                            title: items => `${short} ${this.fmtSigned(dist.xs[items[0].dataIndex])}`,
                            label: ctx => {
                                const i = ctx.dataIndex;
                                const x = this.fmtSigned(dist.xs[i]);
                                const isGe = ctx.dataset._kind === 'ge';
                                const p = isGe ? dist.ge[i] : dist.p[i];
                                const head = this.t(isGe ? 'dmdcAtLeast' : 'dmdcExactly', { x, stat: short });
                                return `${head} : ${this.fmtP(p)} · ${this.fmtOdds(p)}`;
                            }
                        }
                    },
                    annotation: { annotations: {} }
                },
                scales: {
                    x: {
                        title: {
                            display: !isMobile,
                            text: this.t('dmdcAxisValue', { s: short }),
                            color: tick,
                            font: { size: 13, weight: 'bold' }
                        },
                        ticks: {
                            color: tick,
                            font: { size: 11 },
                            maxRotation: 0,
                            autoSkip: false,
                            callback: (value, index) => (onStep(index) ? this.fmtSigned(dist.xs[index]) : '')
                        },
                        grid: {
                            color: ctx => (onStep(ctx.index) ? grid : 'transparent'),
                            drawTicks: false
                        }
                    },
                    yGe: {
                        position: 'left',
                        min: 0,
                        max: 100,
                        title: {
                            display: !isMobile,
                            text: this.t('dmdcAxisAtLeast', { stat: short }),
                            color: tick,
                            font: { size: 13, weight: 'bold' }
                        },
                        ticks: {
                            color: tick,
                            font: { size: 11 },
                            stepSize: 25,
                            callback: v => `${v} %`
                        },
                        grid: { color: grid }
                    },
                    yEq: {
                        position: 'right',
                        min: 0,
                        title: {
                            display: !isMobile,
                            text: this.t('dmdcAxisExactly', { stat: short }),
                            color: tick,
                            font: { size: 13, weight: 'bold' }
                        },
                        ticks: {
                            color: tick,
                            font: { size: 11 },
                            callback: v => `${this.fmtDec(v, 1)} %`
                        },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });

        this.charts[key] = { chart, dist };

        // Le calculateur a tourné avant la création du graphique : on pose le repère maintenant
        const v = parseFloat(this.calcValues[key]);
        if (!Number.isNaN(v)) this.setMarker(key, Math.ceil(v));
    }

    /** Repère vertical sur le graphique à la valeur choisie dans le calculateur. */
    setMarker(key, value) {
        const entry = this.charts[key];
        if (!entry) return;
        const { chart, dist } = entry;
        const annotations = chart.options.plugins.annotation.annotations;
        const idx = value === null ? -1 : dist.xs.indexOf(value);

        if (idx < 0) {
            delete annotations.calc;
        } else {
            annotations.calc = {
                type: 'line',
                scaleID: 'x',
                value: idx,
                borderColor: 'rgba(241, 245, 249, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 4],
                label: {
                    display: true,
                    content: `≥ ${this.fmtSigned(value)} ${this.t(STAT_CONFIG[key].shortKey)}`,
                    position: 'start',
                    backgroundColor: STAT_CONFIG[key].color,
                    color: '#fff',
                    font: { size: 11, weight: 'bold' },
                    padding: { x: 6, y: 3 },
                    borderRadius: 4
                }
            };
        }
        chart.update('none');
    }

    destroyCharts() {
        Object.values(this.charts).forEach(({ chart }) => chart?.destroy());
        this.charts = {};
    }
}
