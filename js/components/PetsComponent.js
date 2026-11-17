import {
    PETS, PET_SKILLS, PET_LEVELS, PET_TYPES, PET_NAMES, PET_SHORT_NAMES, PET_SKILL_NAMES,
    getPetSkillValue, getPetSpecialties, petSkillUnit
} from '../core/PetSkills.js';

/**
 * Outil Familiers > Compétences, organisé autour de trois questions :
 *  1. quel familier a le meilleur maximum : tableau familiers × compétences choisies (niveau 105),
 *     trié sur la compétence détaillée ;
 *  2. à quel niveau une compétence augmente : courbe en escalier du niveau 81 au 105, les familiers
 *     aux valeurs identiques étant regroupés sur une seule ligne ;
 *  3. ce que change le type : valeurs au niveau 105 de T1 à T8, par groupe de familiers.
 * Deux réglages seulement (compétences comparées et type), gardés dans le navigateur.
 * Valeurs pour une compétence au niveau 20 (wiki Metin2 FR, « Page de test »).
 */

const STORAGE_KEY = 'upways-pets-skills-v3';
const LOCALES = { fr: 'fr-FR', en: 'en-US', ro: 'ro-RO', tr: 'tr-TR', de: 'de-DE' };
/** Compétences affichées au premier passage (un joueur en compare rarement plus de 4 ou 5) */
const DEFAULT_SKILLS = ['berserker', 'antiMagic', 'drill', 'monster', 'restoration'];
const DEFAULT_TYPE = 7;                      // T8 : celui qui atteint les valeurs maximales
const LAST = PET_LEVELS.length - 1;          // index du niveau 105
const MAX_LISTED_STEPS = 6;                  // au-delà, on résume le nombre de hausses
const GROUP_COLORS = ['#f59e0b', '#a78bfa', '#2dd4bf', '#f472b6', '#60a5fa', '#fb7185', '#34d399', '#facc15'];
const PLAIN_COLOR = '#94a3b8';               // familiers sans prédilection

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class PetsComponent {
    constructor(translator, analytics) {
        this.translator = translator;
        this.analytics = analytics;
        this.mounted = false;
        this.chart = null;
        this.state = this.loadState();
        this.root = document.getElementById('petSkills');
    }

    /** Premier affichage de l'outil : branche les événements et construit la page */
    mount() {
        if (this.mounted || !this.root) return;
        this.mounted = true;
        this.bindEvents();
        this.render();
    }

    updateLanguage() {
        if (this.mounted) this.render();
    }

    t(key, vars) {
        let s = this.translator.t(key);
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
        return s;
    }
    get lang() { return this.translator.getLanguage(); }

    /* ── État ─────────────────────────────────────────────── */

    loadState() {
        const state = { skills: [...DEFAULT_SKILLS], type: DEFAULT_TYPE, focus: DEFAULT_SKILLS[0] };
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (saved && typeof saved === 'object') {
                if (Array.isArray(saved.skills)) state.skills = PET_SKILLS.filter(s => saved.skills.includes(s));
                if (PET_TYPES.includes(saved.type)) state.type = saved.type;
                if (PET_SKILLS.includes(saved.focus)) state.focus = saved.focus;
            }
        } catch (e) { /* stockage indisponible ou abîmé : réglages par défaut */ }
        return state;
    }

    save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
        catch (e) { /* stockage indisponible */ }
    }

    /** Compétence détaillée : celle choisie, sinon la première comparée */
    get focus() {
        const { skills, focus } = this.state;
        return skills.includes(focus) ? focus : skills[0] ?? null;
    }

    toggleSkill(skill) {
        const on = this.state.skills.includes(skill);
        this.state.skills = on
            ? this.state.skills.filter(s => s !== skill)
            : PET_SKILLS.filter(s => s === skill || this.state.skills.includes(s));
        if (!on) this.state.focus = skill;               // une compétence ajoutée passe au détail
        this.save();
        this.refresh();
        this.analytics?.track('familiers competence', { competence: skill, action: on ? 'retrait' : 'ajout' });
    }

    setSkills(action) {
        this.state.skills = action === 'all' ? [...PET_SKILLS] : action === 'none' ? [] : [...DEFAULT_SKILLS];
        this.save();
        this.refresh();
        this.analytics?.track('familiers competences', { action: { all: 'tout', none: 'aucune' }[action] ?? 'defaut' });
    }

    setType(type) {
        if (!PET_TYPES.includes(type) || type === this.state.type) return;
        this.state.type = type;
        this.save();
        this.refresh();
        this.analytics?.track('familiers type', { type: `T${type + 1}` });
    }

    setFocus(skill) {
        if (!PET_SKILLS.includes(skill) || skill === this.focus) return;
        this.state.focus = skill;
        this.save();
        this.refresh();
        this.analytics?.track('familiers detail', { competence: skill });
    }

    /* ── Données ──────────────────────────────────────────── */

    skillName(skill) { return PET_SKILL_NAMES[skill][this.lang] || PET_SKILL_NAMES[skill].en; }
    petName(pet) { return PET_NAMES[pet][this.lang] || PET_NAMES[pet].en; }
    petShortName(pet) { return PET_SHORT_NAMES[pet][this.lang] || PET_SHORT_NAMES[pet].en; }
    value(pet, skill, type, idx) { return getPetSkillValue(pet, skill, type, idx).value; }
    isSpecial(pet, skill) { return getPetSpecialties(pet).includes(skill); }

    /** Valeur avec son unité : 12 %, 9 m, 7 066 */
    fmt(value, skill) {
        const text = new Intl.NumberFormat(LOCALES[this.lang] || 'fr-FR', { maximumFractionDigits: 1 }).format(value);
        const unit = petSkillUnit(skill);
        if (!unit) return text;
        return this.lang === 'fr' || unit === 'm' ? `${text} ${unit}` : `${text}${unit}`;
    }

    /**
     * Familiers aux valeurs identiques pour une compétence, sur les types donnés (niveaux 81 à 105).
     * Chaque groupe sépare les familiers de prédilection des autres.
     */
    groups(skill, types) {
        const byCurve = new Map();
        for (const pet of PETS) {
            const key = types.map(t => PET_LEVELS.map((_, i) => this.value(pet, skill, t, i)).join(',')).join('|');
            if (!byCurve.has(key)) byCurve.set(key, []);
            byCurve.get(key).push(pet);
        }
        return [...byCurve.values()].map(pets => ({
            pets,
            special: pets.filter(p => this.isSpecial(p, skill)),
            plain: pets.filter(p => !this.isSpecial(p, skill)),
        }));
    }

    /** « Mini Alastor, Bébé Boss », « Sans prédilection (6) », « Mini Exécuteur + les 6 autres »… */
    groupLabel(group) {
        const names = group.special.map(p => this.petName(p)).join(', ');
        const n = group.plain.length;
        if (!n) return names;
        if (!group.special.length) return n === PETS.length ? this.t('psAllPets') : this.t('psPlain', { n });
        return `${names} + ${this.t('psOthers', { n })}`;
    }

    /* ── Affichage ────────────────────────────────────────── */

    render() {
        this.root.innerHTML = `
            ${this.controlsHtml()}
            <section class="pets-table-card ps-card">
                <header class="ps-card-head">
                    <h3 class="ps-card-title">${esc(this.t('psMaxTitle', { level: PET_LEVELS[LAST] }))}</h3>
                    <p class="ps-card-hint">${esc(this.t('psMaxHint'))}</p>
                </header>
                <div data-role="max"></div>
            </section>
            <section class="pets-table-card ps-card ps-detail" data-role="detail"></section>`;
        this.refresh();
    }

    refresh() {
        this.updateControls();
        this.renderMax();
        this.renderDetail();
    }

    controlsHtml() {
        const chips = PET_SKILLS.map(s => `
            <button type="button" class="ps-chip" data-skill="${s}" aria-pressed="false">
                <img class="ps-chip-icon" src="data/pet-skills/${s}.png" alt="" width="20" height="20" loading="lazy" data-skill-tip="${s}">
                <span>${esc(this.skillName(s))}</span>
            </button>`).join('');
        const types = PET_TYPES.map(t =>
            `<button type="button" class="pets-segment" role="radio" aria-checked="false" data-type="${t}">T${t + 1}</button>`).join('');
        // Téléphone : liste des compétences repliée au départ, le tableau reste en vue
        const open = !window.matchMedia?.('(max-width: 640px)').matches;
        return `
            <section class="pets-table-card ps-controls">
                <details class="ps-control ps-picker"${open ? ' open' : ''}>
                    <summary class="ps-picker-summary">
                        <span class="pets-field-label">${esc(this.t('psSkillsLabel'))}</span>
                        <span class="ps-count" data-role="count"></span>
                        <svg class="ps-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                    </summary>
                    <div class="ps-picker-body">
                        <span class="ps-actions">
                            <button type="button" class="pets-filter-action" data-skills="all">${esc(this.t('psAll'))}</button>
                            <button type="button" class="pets-filter-action" data-skills="none">${esc(this.t('psNone'))}</button>
                            <button type="button" class="pets-filter-action" data-skills="default">${esc(this.t('psDefault'))}</button>
                        </span>
                        <div class="ps-chips">${chips}</div>
                    </div>
                </details>
                <div class="ps-control ps-control-type">
                    <span class="pets-field-label" id="psTypeLabel">${esc(this.t('psType'))}</span>
                    <div class="pets-segmented" role="radiogroup" aria-labelledby="psTypeLabel">${types}</div>
                </div>
            </section>`;
    }

    updateControls() {
        const selected = new Set(this.state.skills);
        const count = this.root.querySelector('[data-role="count"]');
        if (count) count.textContent = `${selected.size} / ${PET_SKILLS.length}`;
        this.root.querySelectorAll('.ps-chip').forEach(b => b.setAttribute('aria-pressed', String(selected.has(b.dataset.skill))));
        this.root.querySelectorAll('.pets-segment[data-type]').forEach(b => {
            const on = Number(b.dataset.type) === this.state.type;
            b.classList.toggle('active', on);
            b.setAttribute('aria-checked', String(on));
            b.tabIndex = on ? 0 : -1;
        });
    }

    /** 1. Tableau des maximums : familiers × compétences comparées, trié sur la compétence détaillée */
    renderMax() {
        const box = this.root.querySelector('[data-role="max"]');
        const { skills, type } = this.state;
        const focus = this.focus;
        if (!skills.length) {
            box.innerHTML = `<p class="pets-empty">${esc(this.t('psEmpty'))}</p>`;
            return;
        }
        const val = (pet, skill) => this.value(pet, skill, type, LAST);
        const best = {};
        for (const s of skills) {
            const values = PETS.map(p => val(p, s));
            const max = Math.max(...values);
            best[s] = values.some(v => v < max) ? max : null;     // pas de « meilleur » si tous sont égaux
        }
        const rows = [...PETS].sort((a, b) => val(b, focus) - val(a, focus));   // tri stable : ordre du jeu à égalité

        const head = skills.map(s => `
            <th scope="col" class="pets-col-head${s === focus ? ' is-focus' : ''}">
                <button type="button" class="ps-col-btn" data-focus="${s}" aria-pressed="${s === focus}">
                    <img class="pets-head-img pets-head-img-skill" src="data/pet-skills/${s}.png" alt="" width="24" height="24" loading="lazy" data-skill-tip="${s}">
                    <span class="pets-head-name">${esc(this.skillName(s))}</span>
                </button>
            </th>`).join('');
        const body = rows.map(pet => `
            <tr>
                <th scope="row" class="pets-row-head">
                    <span class="pets-head">
                        <img class="pets-head-img pets-head-img-pet" src="data/pets/${pet}.png" alt="" width="32" height="40" loading="lazy">
                        <span class="pets-head-name ps-name-full">${esc(this.petName(pet))}</span>
                        <span class="pets-head-name ps-name-short">${esc(this.petShortName(pet))}</span>
                    </span>
                </th>
                ${skills.map(s => {
                    const v = val(pet, s);
                    const cls = [this.isSpecial(pet, s) ? 'is-boosted' : '', v === best[s] ? 'is-best' : '', s === focus ? 'is-focus' : '']
                        .filter(Boolean).join(' ');
                    return `<td${cls ? ` class="${cls}"` : ''}>${esc(this.fmt(v, s))}</td>`;
                }).join('')}
            </tr>`).join('');
        box.innerHTML = `
            <div class="pets-table-scroll">
                <table class="pets-table ps-max">
                    <thead><tr><th scope="col" class="pets-corner">${esc(this.t('psPet'))}</th>${head}</tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }

    /** 2 et 3. Détail d'une compétence : progression par niveau et différences entre types */
    renderDetail() {
        const box = this.root.querySelector('[data-role="detail"]');
        const skill = this.focus;
        this.destroyChart();
        if (!skill) { box.hidden = true; box.innerHTML = ''; return; }
        box.hidden = false;
        const type = this.state.type;
        const typeLabel = `T${type + 1}`;
        const name = this.skillName(skill);

        // Progression au type choisi : un groupe par courbe distincte, le meilleur en premier
        const curve = (pet) => PET_LEVELS.map((_, i) => this.value(pet, skill, type, i));
        const groups = this.groups(skill, [type])
            .map(g => ({ ...g, values: curve(g.pets[0]) }))
            .sort((a, b) => b.values[LAST] - a.values[LAST] || b.special.length - a.special.length);
        let colorIndex = 0;
        for (const g of groups) g.color = g.special.length ? GROUP_COLORS[colorIndex++ % GROUP_COLORS.length] : PLAIN_COLOR;

        const groupItems = groups.map(g => {
            const steps = [];
            for (let i = 1; i <= LAST; i++) if (g.values[i] !== g.values[i - 1]) steps.push({ level: PET_LEVELS[i], value: g.values[i] });
            const stepsHtml = !steps.length
                ? `<span class="pt-muted">${esc(this.t('psNoStep'))}</span>`
                : steps.length > MAX_LISTED_STEPS
                    ? `<span class="pt-muted">${esc(this.t('psStepsMany', { n: steps.length }))}</span>`
                    : steps.map(s => `<span class="ps-step">${esc(this.t('psStep', { level: s.level, value: this.fmt(s.value, skill) }))}</span>`).join('');
            return `
                <li class="ps-group">
                    <span class="ps-swatch" style="--c:${g.color}" aria-hidden="true"></span>
                    <span class="ps-group-name" title="${esc(g.pets.map(p => this.petName(p)).join(', '))}">${esc(this.groupLabel(g))}</span>
                    <span class="ps-group-range">${esc(this.fmt(g.values[0], skill))} → ${esc(this.fmt(g.values[LAST], skill))}</span>
                    <span class="ps-steps">${stepsHtml}</span>
                </li>`;
        }).join('');

        box.innerHTML = `
            <header class="ps-card-head ps-detail-head">
                <img class="ps-detail-icon" src="data/pet-skills/${skill}.png" alt="" width="36" height="36" data-skill-tip="${skill}">
                <div>
                    <h3 class="ps-card-title">${esc(this.t('psDetailTitle', { skill: name }))}</h3>
                    <p class="ps-card-hint">${esc(this.t('psDetailSub', { type: typeLabel }))}</p>
                </div>
            </header>
            <div class="ps-detail-body">
                <div class="ps-chart-box"><canvas aria-label="${esc(this.t('psDetailTitle', { skill: name }))}" role="img"></canvas></div>
                <ul class="ps-groups">${groupItems}</ul>
                <h4 class="ps-sub-title">${esc(this.t('psTypesTitle', { skill: name, level: PET_LEVELS[LAST] }))}</h4>
                ${this.typesTableHtml(skill)}
            </div>`;
        this.drawChart(box.querySelector('canvas'), skill, groups);
    }

    /** 3. Valeur au niveau 105 de T1 à T8, par groupe de familiers aux valeurs identiques */
    typesTableHtml(skill) {
        const type = this.state.type;
        const rows = this.groups(skill, PET_TYPES)
            .map(g => ({ ...g, values: PET_TYPES.map(t => this.value(g.pets[0], skill, t, LAST)) }))
            .sort((a, b) => (b.special.length > 0) - (a.special.length > 0) || b.values[7] - a.values[7]);
        const head = PET_TYPES.map(t => `<th scope="col"${t === type ? ' class="is-focus"' : ''}>T${t + 1}</th>`).join('');
        const body = rows.map(g => {
            const same = g.values.every(v => v === g.values[0]);
            const cells = same
                ? `<td colspan="${PET_TYPES.length}" class="ps-same">${esc(this.t('psSameAllTypes', { value: this.fmt(g.values[0], skill) }))}</td>`
                : g.values.map((v, t) => `<td class="${['is-boosted', t === type ? 'is-focus' : ''].filter(Boolean).join(' ')}">${esc(this.fmt(v, skill))}</td>`).join('');
            return `<tr><th scope="row" class="pets-row-head ps-types-group">${esc(this.groupLabel(g))}</th>${cells}</tr>`;
        }).join('');
        return `
            <div class="pets-table-scroll ps-types-scroll">
                <table class="pets-table ps-types">
                    <thead><tr><th scope="col" class="pets-corner">${esc(this.t('psPets'))}</th>${head}</tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }

    drawChart(canvas, skill, groups) {
        const box = canvas.parentElement;
        if (typeof window.Chart === 'undefined') { box.hidden = true; return; }
        const fmt = (v) => this.fmt(v, skill);
        const datasets = groups.map(g => ({
            label: this.groupLabel(g),
            data: g.values.map((y, i) => ({ x: PET_LEVELS[i], y })),
            stepped: 'before',                    // la hausse s'affiche au niveau où elle a lieu
            borderColor: g.color,
            backgroundColor: g.color,
            borderWidth: g.special.length ? 2.5 : 2,
            borderDash: g.special.length ? [] : [6, 4],
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: false,
        }));
        this.chart = new window.Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                parsing: false,
                interaction: { mode: 'index', axis: 'x', intersect: false },
                plugins: {
                    legend: { display: false },          // légende : liste des groupes sous le graphique
                    tooltip: {
                        callbacks: {
                            title: (items) => `${this.t('psLevel')} ${items[0]?.parsed.x}`,
                            label: (item) => `${item.dataset.label}${this.lang === 'fr' ? ' : ' : ': '}${fmt(item.parsed.y)}`,
                        },
                    },
                    annotation: { annotations: {} },
                    zoom: { zoom: { wheel: { enabled: false }, pinch: { enabled: false } }, pan: { enabled: false } },
                },
                scales: {
                    x: {
                        type: 'linear', min: PET_LEVELS[0], max: PET_LEVELS[LAST],
                        ticks: { color: '#94a3b8', stepSize: 4 },
                        grid: { color: 'rgba(148, 163, 184, 0.08)' },
                        title: { display: true, text: this.t('psLevelAxis'), color: '#94a3b8', font: { size: 11 } },
                    },
                    y: { grace: '8%', ticks: { color: '#94a3b8', callback: (v) => fmt(v) }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
                },
            },
        });
    }

    destroyChart() {
        this.chart?.destroy();
        this.chart = null;
    }

    /* ── Événements ───────────────────────────────────────── */

    bindEvents() {
        this.root.addEventListener('click', (e) => {
            const chip = e.target.closest('.ps-chip');
            if (chip) { this.toggleSkill(chip.dataset.skill); return; }
            const bulk = e.target.closest('[data-skills]');
            if (bulk) { this.setSkills(bulk.dataset.skills); return; }
            const type = e.target.closest('.pets-segment[data-type]');
            if (type) { this.setType(Number(type.dataset.type)); return; }
            const col = e.target.closest('[data-focus]');
            if (col) this.setFocus(col.dataset.focus);
        });
        // Type : flèches gauche / droite comme un groupe de boutons radio
        this.root.addEventListener('keydown', (e) => {
            if (!e.target.matches?.('.pets-segment[data-type]') || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            e.preventDefault();
            const next = (this.state.type + (e.key === 'ArrowRight' ? 1 : -1) + PET_TYPES.length) % PET_TYPES.length;
            this.setType(next);
            this.root.querySelector(`.pets-segment[data-type="${next}"]`)?.focus();
        });
    }
}
