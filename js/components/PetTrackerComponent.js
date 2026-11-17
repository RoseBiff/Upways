import {
    PETS, PET_NAMES, PET_SKILLS, PET_SKILL_NAMES, PET_LEVELS, getPetSkillValue, petSkillUnit
} from '../core/PetSkills.js';
import {
    GROWTH_STATS, CHAMPION_STATS, MAX_LEVEL, MAX_CHAMPION_LEVEL,
    analyzeStat, expectedCurve, growthParams, ageBonus, palierLevels, isChampionStat, scaleMax, verdictFor
} from '../core/PetGrowth.js';

/**
 * Outil Familiers > Mon familier : verdict statistique (bon ou mauvais familier ?) et suivi des
 * paliers d'un ou plusieurs familiers.
 *
 * Le minimum : type, âge, niveau et la valeur affichée aujourd'hui pour chaque stat. La base à
 * l'éclosion et les paliers précédents sont facultatifs (ils affinent le détail sans changer le
 * verdict). Hypothèses : tous les paliers ont été franchis avec l'âge actuel du familier (bonus
 * d'âge plafonné à 800 jours), et les compétences sont au niveau 20 (valeurs du wiki).
 * Tout est gardé dans le navigateur (localStorage), avec export / import en JSON.
 * Calculs : js/core/PetGrowth.js ; valeurs des compétences : js/core/PetSkills.js.
 */

const STORAGE_KEY = 'upways-pet-tracker';
const LOCALES = { fr: 'fr-FR', en: 'en-US', ro: 'ro-RO', tr: 'tr-TR', de: 'de-DE' };
const MAIN_STATS = ['hp', 'def', 'sp'];

const STAT_LABELS = {
    hp: 'ptStatHp', def: 'ptStatDef', sp: 'ptStatSp',
    sungma: 'ptStatSungma', pen: 'ptStatPen', prec: 'ptStatPrec',
};
// Couleur de chaque stat (mêmes valeurs que dans styles.css, section « MON FAMILIER »)
const STAT_RGB = {
    hp: '244, 63, 94', def: '245, 158, 11', sp: '59, 130, 246',
    sungma: '168, 85, 247', pen: '249, 115, 22', prec: '20, 184, 166',
};
const TYPE_RGB = { 5: '148, 163, 184', 6: '129, 140, 248', 7: '251, 191, 36' };
const VERDICT_LABELS = {
    excellent: 'ptVerdictExcellent', good: 'ptVerdictGood', average: 'ptVerdictAverage',
    below: 'ptVerdictBelow', poor: 'ptVerdictPoor',
};

// Exemple : le T7 de 800 jours du suivi Excel d'origine (base et paliers connus)
const EXAMPLE_PET = {
    race: 'baashido', type: 6, age: 800, level: 48, championLevel: 0,
    skills: [{ skill: 'berserker' }, { skill: 'feather' }, { skill: '' }],
    stats: {
        hp:  { base: 1.5, totals: [3.3, 4.8, 5.9, 7.1, 8.3, 9.7, 10.8, 12.6] },
        def: { base: 1.8, totals: [2.9, 4.2, 5.9, 7.3, 8.4, 9.4] },
        sp:  { base: 1.1, totals: [2.9, 4.5, 5.5, 7.6, 9.4, 11.3, 13.1, 14.7] },
    },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const parseNum = (v) => {
    const s = String(v ?? '').trim().replace(',', '.').replace(/[^\d.+-]/g, '');
    if (s === '' || s === '.' || s === '-' || s === '+') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
};
const clampInt = (v, lo, hi, fallback) => {
    const n = parseNum(v);
    return n === null ? fallback : Math.min(hi, Math.max(lo, Math.round(n)));
};
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export class PetTrackerComponent {
    /**
     * @param {Translator} translator
     * @param {AnalyticsService} analytics
     * @param {UIState} uiState      toasts et confirmations
     * @param {(summary: object|null) => void} onSummary  résumé du familier suivi (badge de l'onglet)
     */
    constructor(translator, analytics, uiState, onSummary) {
        this.translator = translator;
        this.analytics = analytics;
        this.uiState = uiState;
        this.onSummary = onSummary;
        this.root = document.getElementById('petTracker');
        this.mounted = false;
        this.chart = null;
        this.currentStat = 'hp';
        this.analyses = {};
        this.data = this.load();
    }

    mount() {
        if (this.mounted) return;
        this.mounted = true;
        this.bindEvents();
        this.render();
    }

    updateLanguage() {
        if (this.mounted) this.render();
        else this.emitSummary();
    }

    /* ── Textes et nombres ────────────────────────────────── */

    t(key, vars) {
        let s = this.translator.t(key);
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
        return s;
    }
    get lang() { return this.translator.getLanguage(); }

    num(x, digits = 2, minDigits = 0) {
        if (x === null || x === undefined || !Number.isFinite(x)) return '–';
        return new Intl.NumberFormat(LOCALES[this.lang] || 'fr-FR', {
            maximumFractionDigits: digits, minimumFractionDigits: Math.min(minDigits, digits),
        }).format(x);
    }
    /** Nombre signé, au moins une décimale (+1,0 et non +1) */
    signed(x, digits = 2) {
        if (x === null || x === undefined || !Number.isFinite(x)) return '–';
        const r = Math.round(x * 10 ** digits) / 10 ** digits;
        return (r > 0 ? '+' : r < 0 ? '−' : '±') + this.num(Math.abs(r), digits, 1);
    }
    /** Pourcentage d'une stat (12,6 %) */
    pct(x, digits = 2) {
        const s = this.num(x, digits);
        return this.lang === 'fr' ? `${s} %` : `${s}%`;
    }
    /** Score 0..1 → « 66 % » */
    score(p) {
        if (p === null || p === undefined) return '–';
        const v = String(Math.round(p * 100));
        return this.lang === 'fr' ? `${v} %` : `${v}%`;
    }
    typeLabel(type) { return `T${type + 1}`; }
    raceName(race) {
        if (!race || !PET_NAMES[race]) return this.t('ptRaceChoose');
        return PET_NAMES[race][this.lang] || PET_NAMES[race].en;
    }
    skillName(skill) { return PET_SKILL_NAMES[skill][this.lang] || PET_SKILL_NAMES[skill].en; }
    /** Valeur d'une compétence avec son unité (12 %, 9 m, 7 066) */
    skillValue(value, skill) {
        const text = this.num(value, 1);
        const unit = petSkillUnit(skill);
        if (!unit) return text;
        return this.lang === 'fr' || unit === 'm' ? `${text}\u202f${unit}` : `${text}${unit}`;
    }

    /* ── Données ──────────────────────────────────────────── */

    load() {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (raw && Array.isArray(raw.pets)) {
                const pets = raw.pets.map(p => this.normalizePet(p)).filter(Boolean);
                const currentId = pets.some(p => p.id === raw.currentId) ? raw.currentId : pets[0]?.id ?? null;
                return { pets, currentId };
            }
        } catch (e) { /* stockage indisponible ou abîmé : on repart de zéro */ }
        return { pets: [], currentId: null };
    }

    save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, ...this.data })); }
        catch (e) { /* stockage indisponible */ }
    }

    /** Remet d'aplomb un familier (fichier importé, ancienne version) */
    normalizePet(p) {
        if (!p || typeof p !== 'object') return null;
        const stats = {};
        for (const stat of GROWTH_STATS) {
            const s = p.stats?.[stat] || {};
            const entries = {};
            if (s.entries && typeof s.entries === 'object') {
                for (const [level, e] of Object.entries(s.entries)) {
                    const l = Number(level);
                    if (!Number.isInteger(l) || l < 1 || l > scaleMax(stat)) continue;
                    if (Number.isFinite(e?.total)) entries[l] = { total: e.total };
                }
            }
            stats[stat] = { base: Number.isFinite(s.base) ? s.base : null, entries };
        }
        // Compétences : toujours considérées au niveau 20 (valeurs du wiki)
        const skills = Array.from({ length: 3 }, (_, i) => {
            const sk = p.skills?.[i];
            return { skill: PET_SKILLS.includes(sk?.skill) ? sk.skill : '' };
        });
        return {
            id: typeof p.id === 'string' && p.id ? p.id : uid(),
            name: typeof p.name === 'string' ? p.name.slice(0, 40) : '',
            race: PETS.includes(p.race) ? p.race : '',
            type: Number.isInteger(p.type) && p.type >= 0 && p.type <= 7 ? p.type : 0,
            age: Number.isFinite(p.age) ? Math.max(0, Math.round(p.age)) : 0,
            level: Number.isFinite(p.level) ? Math.min(MAX_LEVEL, Math.max(1, Math.round(p.level))) : 1,
            championLevel: Number.isFinite(p.championLevel) ? Math.min(MAX_CHAMPION_LEVEL, Math.max(0, Math.round(p.championLevel))) : 0,
            skills,
            stats,
        };
    }

    get pet() {
        return this.data.pets.find(p => p.id === this.data.currentId) || null;
    }

    addPet(source = 'ajout') {
        const pet = this.normalizePet({ name: this.t('ptDefaultName') });
        this.data.pets.push(pet);
        this.data.currentId = pet.id;
        this.currentStat = 'hp';
        this.save();
        this.render();
        this.analytics?.track('suivi familier', { action: source });
        this.root.querySelector('[data-field="name"]')?.focus();
    }

    addExample() {
        const stats = {};
        for (const [stat, s] of Object.entries(EXAMPLE_PET.stats)) {
            const cadence = growthParams(stat, EXAMPLE_PET.type).cadence;
            const entries = {};
            s.totals.forEach((total, i) => { entries[(i + 1) * cadence] = { total }; });
            stats[stat] = { base: s.base, entries };
        }
        const pet = this.normalizePet({ ...EXAMPLE_PET, name: this.t('ptExampleName'), stats });
        this.data.pets.push(pet);
        this.data.currentId = pet.id;
        this.currentStat = 'hp';
        this.save();
        this.render();
        this.analytics?.track('suivi familier', { action: 'exemple' });
    }

    async deletePet() {
        const pet = this.pet;
        if (!pet) return;
        const ok = await this.uiState.confirm(this.t('ptDeleteConfirm', { name: esc(pet.name || this.t('ptDefaultName')) }), {
            title: this.t('ptDeleteTitle'),
            confirmText: this.t('ptDelete'),
            cancelText: this.t('cancelButton'),
        });
        if (!ok) return;
        this.data.pets = this.data.pets.filter(p => p.id !== pet.id);
        this.data.currentId = this.data.pets[0]?.id ?? null;
        this.save();
        this.render();
        this.analytics?.track('suivi familier', { action: 'suppression' });
    }

    exportPets() {
        if (!this.data.pets.length) return;
        const blob = new Blob([JSON.stringify({ app: 'upways', kind: 'pets', v: 1, pets: this.data.pets }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'upways-familiers.json';
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        this.uiState.showToast('success', this.t('ptExportDone'));
        this.analytics?.track('suivi familier', { action: 'export', familiers: this.data.pets.length });
    }

    async importPets(file) {
        try {
            const json = JSON.parse(await file.text());
            const list = Array.isArray(json?.pets) ? json.pets : Array.isArray(json) ? json : [json];
            const pets = list.map(p => this.normalizePet({ ...p, id: uid() })).filter(Boolean);
            if (!pets.length) throw new Error('vide');
            this.data.pets.push(...pets);
            this.data.currentId = pets[0].id;
            this.save();
            this.render();
            this.uiState.showToast('success', this.t('ptImportDone', { count: pets.length }));
            this.analytics?.track('suivi familier', { action: 'import', familiers: pets.length });
        } catch (e) {
            this.uiState.showToast('error', this.t('ptImportError'));
        }
    }

    /** Stats affichées : les 3 principales, plus les stats Champion dès qu'il y a un niveau Champion */
    visibleStats(pet = this.pet) {
        if (!pet) return MAIN_STATS;
        const champion = pet.championLevel > 0 || CHAMPION_STATS.some(s => Object.keys(pet.stats[s].entries).length);
        return champion ? GROWTH_STATS : MAIN_STATS;
    }

    /** Niveau de référence d'une stat : niveau du familier, ou niveau Champion */
    scaleLevel(pet, stat) {
        return isChampionStat(stat) ? pet.championLevel : pet.level;
    }

    /** Relevés d'une stat ; tous les paliers sont comptés avec l'âge actuel du familier */
    entriesFor(pet, stat) {
        return Object.entries(pet.stats[stat].entries)
            .filter(([, e]) => Number.isFinite(e.total))
            .map(([level, e]) => ({ level: Number(level), total: e.total }));
    }

    /** Entrée d'un palier (celle relevée au niveau le plus haut) */
    entryForPalier(pet, stat, k) {
        const { cadence } = growthParams(stat, pet.type);
        let best = null;
        for (const [l, e] of Object.entries(pet.stats[stat].entries)) {
            if (Math.floor(Number(l) / cadence) !== k) continue;
            if (!best || Number(l) >= best.level) best = { ...e, level: Number(l) };
        }
        return best;
    }

    /** Écrit la valeur d'un palier (une seule entrée par palier) */
    writePalier(pet, stat, k, level, patch) {
        const { cadence } = growthParams(stat, pet.type);
        const entries = pet.stats[stat].entries;
        let current = { total: null };
        for (const [l, e] of Object.entries(entries)) {
            if (Math.floor(Number(l) / cadence) !== k) continue;
            if (Number(l) >= (current._l ?? 0)) current = { ...e, _l: Number(l) };
            delete entries[l];
        }
        delete current._l;
        Object.assign(current, patch);
        if (current.total !== null) entries[level] = current;
    }

    analyze(pet, stat) {
        return analyzeStat({
            stat,
            type: pet.type,
            base: pet.stats[stat].base,
            entries: this.entriesFor(pet, stat),
            age: pet.age,
        });
    }

    /* ── Événements (délégation : le contenu est reconstruit) ── */

    bindEvents() {
        this.root.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el || !this.root.contains(el)) return;
            const action = el.dataset.action;
            if (action === 'add') this.addPet();
            else if (action === 'example') this.addExample();
            else if (action === 'delete') this.deletePet();
            else if (action === 'export') this.exportPets();
            else if (action === 'import') this.root.querySelector('[data-role="import-file"]')?.click();
            else if (action === 'type') this.setType(Number(el.dataset.type));
            else if (action === 'pick') this.pickPet(el.dataset.petId);
            else if (action === 'stat') this.setStat(el.dataset.stat);
        });

        this.root.addEventListener('keydown', (e) => {
            const card = e.target.closest('[data-action="stat"]');
            if (card && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                this.setStat(card.dataset.stat);
            }
            const typeBtn = e.target.closest('[data-action="type"]');
            if (typeBtn && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                const step = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1;
                const next = (this.pet.type + step + 8) % 8;
                this.setType(next);
                this.root.querySelector(`[data-action="type"][data-type="${next}"]`)?.focus();
            }
        });

        this.root.addEventListener('input', (e) => this.onInput(e.target));

        this.root.addEventListener('change', (e) => {
            const el = e.target;
            if (el.dataset.role === 'import-file' && el.files?.[0]) {
                this.importPets(el.files[0]);
                el.value = '';
            } else if ((el.dataset.cell === 'total' || el.dataset.quick) && parseNum(el.value) !== null) {
                const stat = el.dataset.quick || this.currentStat;
                this.analytics?.trackOnce(`suivi-valeur-${stat}-${el.dataset.quick ? 'jeu' : 'palier'}`, 'suivi valeur',
                    { stat, saisie: el.dataset.quick ? 'valeur du jour' : 'palier', type: this.typeLabel(this.pet.type) });
            } else if (el.dataset.base !== undefined && parseNum(el.value) !== null) {
                this.analytics?.trackOnce(`suivi-base-${this.currentStat}`, 'suivi base', { stat: this.currentStat });
            } else if (el.dataset.field === 'race') {
                this.analytics?.track('suivi race', { race: el.value });
            } else if (el.dataset.skillPart === 'skill' && el.value) {
                this.analytics?.track('suivi competence', { competence: el.value });
            }
        });
    }

    onInput(el) {
        const pet = this.pet;
        if (!pet) return;

        // Identité
        const field = el.dataset.field;
        if (field) {
            if (field === 'name') {
                pet.name = el.value.slice(0, 40);
                this.updatePetChip(pet);
                this.save();
                this.emitSummary();
                return;
            }
            if (field === 'race') { pet.race = PETS.includes(el.value) ? el.value : ''; this.updatePetChip(pet); }
            if (field === 'age') pet.age = clampInt(el.value, 0, 5000, 0);
            if (field === 'level') pet.level = clampInt(el.value, 1, MAX_LEVEL, 1);
            if (field === 'championLevel') {
                const before = this.visibleStats(pet).length;
                pet.championLevel = clampInt(el.value, 0, MAX_CHAMPION_LEVEL, 0);
                this.save();
                if (this.visibleStats(pet).length !== before) {
                    if (!this.visibleStats(pet).includes(this.currentStat)) this.currentStat = 'hp';
                    this.renderQuick();
                    this.renderStats();
                    return;
                }
            }
            this.save();
            this.renderSkillBodies();
            if (field === 'age') this.renderStatDetail();   // espérances et fourchettes changent
            else this.refresh();
            return;
        }

        // Valeur affichée aujourd'hui (au niveau actuel du familier)
        if (el.dataset.quick) {
            const stat = el.dataset.quick;
            const level = this.scaleLevel(pet, stat);
            const k = Math.floor(level / growthParams(stat, pet.type).cadence);
            const value = parseNum(el.value);
            if (k < 1) pet.stats[stat].base = value;              // avant le 1er palier : c'est la base
            else this.writePalier(pet, stat, k, level, { total: value });
            this.save();
            this.refresh();
            return;
        }

        // Compétences
        if (el.dataset.skillSlot !== undefined) {
            const i = Number(el.dataset.skillSlot);
            pet.skills[i].skill = PET_SKILLS.includes(el.value) ? el.value : '';
            this.save();
            this.updateSkillSlot(i);
            return;
        }

        // Base à l'éclosion (facultative)
        if (el.dataset.base !== undefined) {
            pet.stats[this.currentStat].base = parseNum(el.value);
            this.save();
            this.refresh();
            return;
        }

        // Valeur d'un palier
        const cell = el.dataset.cell;
        if (cell) {
            this.writePalier(pet, this.currentStat, Number(el.dataset.k), Number(el.dataset.level), { [cell]: parseNum(el.value) });
            this.save();
            this.refresh();
        }
    }

    setType(type) {
        const pet = this.pet;
        if (!pet || pet.type === type) return;
        pet.type = type;
        this.save();
        this.analytics?.track('suivi type', { type: this.typeLabel(type) });
        this.renderIdentityType();
        this.renderSkillBodies();
        this.renderStats();
    }

    setStat(stat) {
        if (this.currentStat === stat) return;
        this.currentStat = stat;
        this.renderStats();
        this.analytics?.track('suivi stat', { stat });
    }

    /* ── Rendu ────────────────────────────────────────────── */

    /** Bouton d'un familier suivi : image de sa race, nom et type */
    petChipHtml(pet) {
        const on = pet.id === this.data.currentId;
        const img = pet.race
            ? `<img class="pt-pet-chip-img" src="data/pets/${pet.race}.png" alt="" width="24" height="30">`
            : `<span class="pt-pet-chip-img pt-pet-chip-none" aria-hidden="true">🐾</span>`;
        return `<button type="button" class="pt-pet-chip${on ? ' is-active' : ''}" aria-pressed="${on}"
                    data-action="pick" data-pet-id="${esc(pet.id)}" title="${esc(this.raceName(pet.race))}">
                    ${img}<span class="pt-pet-chip-name">${esc(pet.name || this.t('ptDefaultName'))}</span><span class="pt-pet-chip-type">${this.typeLabel(pet.type)}</span>
                </button>`;
    }

    /** Met à jour le bouton du familier (nom, type ou race modifiés) sans tout reconstruire */
    updatePetChip(pet) {
        const chip = this.root.querySelector(`.pt-pet-chip[data-pet-id="${CSS.escape(pet.id)}"]`);
        if (chip) chip.outerHTML = this.petChipHtml(pet);
    }

    pickPet(id) {
        if (!id || id === this.data.currentId || !this.data.pets.some(p => p.id === id)) return;
        this.data.currentId = id;
        this.save();
        this.render();
        this.analytics?.track('suivi familier', { action: 'choix' });
    }

    render() {
        this.destroyChart();
        const pet = this.pet;
        if (!pet) {
            this.root.innerHTML = `
                <div class="pt-empty">
                    <div class="pt-empty-icon" aria-hidden="true">🐾</div>
                    <h3 class="pt-empty-title">${esc(this.t('ptEmptyTitle'))}</h3>
                    <p class="pt-empty-text">${esc(this.t('ptEmptyText'))}</p>
                    <div class="pt-empty-actions">
                        <button type="button" class="btn btn-primary" data-action="add">${esc(this.t('ptAddPet'))}</button>
                        <button type="button" class="btn btn-secondary" data-action="example">${esc(this.t('ptLoadExample'))}</button>
                        <button type="button" class="btn btn-secondary" data-action="import">${esc(this.t('ptImport'))}</button>
                    </div>
                    <input type="file" accept=".json,application/json" data-role="import-file" hidden>
                </div>`;
            this.analyses = {};
            this.emitSummary();
            return;
        }

        this.root.innerHTML = `
            ${this.toolbarHtml()}
            <section class="pt-identity" aria-label="${esc(this.t('ptIdentity'))}">
                ${this.identityHtml(pet)}
                <div class="pt-quick" data-role="quick"></div>
            </section>
            <div class="pt-overall" data-role="overall"></div>
            <section class="pt-skills-card">
                <div class="pt-section-head">
                    <h3 class="pt-section-title">${esc(this.t('ptSkillsTitle'))}</h3>
                    <span class="pt-section-sub">${esc(this.t('ptSkillsSub'))}</span>
                </div>
                <div class="pt-skills-grid" data-role="skills"></div>
            </section>
            <div class="scenarios-panel pt-stats-panel" data-role="stats"></div>
            <p class="pt-note">${esc(this.t('ptDataNote'))}</p>`;
        this.renderQuick();
        this.renderSkills();
        this.renderStats();
    }

    toolbarHtml() {
        return `
            <div class="pt-toolbar">
                <div class="pets-field pt-toolbar-pets">
                    <span class="pets-field-label" id="ptPetsLabel">${esc(this.t('ptPetSelect'))}</span>
                    <div class="pt-pet-chips" role="group" aria-labelledby="ptPetsLabel">${this.data.pets.map(p => this.petChipHtml(p)).join('')}</div>
                </div>
                <div class="pt-toolbar-actions">
                    <button type="button" class="btn btn-secondary btn-small" data-action="add">＋ ${esc(this.t('ptNew'))}</button>
                    <button type="button" class="btn btn-secondary btn-small" data-action="example">${esc(this.t('ptLoadExample'))}</button>
                    <button type="button" class="btn btn-secondary btn-small" data-action="export">${esc(this.t('ptExport'))}</button>
                    <button type="button" class="btn btn-secondary btn-small" data-action="import">${esc(this.t('ptImport'))}</button>
                    <button type="button" class="btn btn-secondary btn-small pt-btn-danger" data-action="delete">${esc(this.t('ptDelete'))}</button>
                    <input type="file" accept=".json,application/json" data-role="import-file" hidden>
                </div>
            </div>`;
    }

    identityHtml(pet) {
        const races = PETS.map(r => `<option value="${r}"${pet.race === r ? ' selected' : ''}>${esc(this.raceName(r))}</option>`).join('');
        return `
            <div class="pt-identity-grid">
                <label class="pets-field pt-field-name">
                    <span class="pets-field-label">${esc(this.t('ptName'))}</span>
                    <input class="pt-input" type="text" maxlength="40" data-field="name" value="${esc(pet.name)}" autocomplete="off">
                </label>
                <label class="pets-field">
                    <span class="pets-field-label">${esc(this.t('ptRace'))}</span>
                    <select class="pets-select" data-field="race">
                        ${pet.race ? '' : `<option value="" selected disabled>${esc(this.t('ptRaceChoose'))}</option>`}${races}
                    </select>
                </label>
                <div class="pets-field pt-field-type">
                    <span class="pets-field-label" id="ptTypeLabel">${esc(this.t('ptType'))}</span>
                    <div data-role="type">${this.typeControlHtml(pet)}</div>
                </div>
                <label class="pets-field pt-field-small pt-field-age">
                    <span class="pets-field-label">${esc(this.t('ptAge'))}</span>
                    <input class="pt-input" type="text" inputmode="numeric" data-field="age" value="${pet.age}">
                    <span class="pt-type-hint">${esc(this.t('ptAgeHint'))}</span>
                </label>
                <label class="pets-field pt-field-small">
                    <span class="pets-field-label">${esc(this.t('ptLevel'))}</span>
                    <input class="pt-input" type="text" inputmode="numeric" data-field="level" value="${pet.level}">
                </label>
                <label class="pets-field pt-field-small">
                    <span class="pets-field-label">${esc(this.t('ptChampionLevel'))}</span>
                    <input class="pt-input" type="text" inputmode="numeric" data-field="championLevel" value="${pet.championLevel}">
                </label>
            </div>`;
    }

    typeControlHtml(pet) {
        const buttons = Array.from({ length: 8 }, (_, t) => {
            const on = pet.type === t;
            return `<button type="button" class="pets-segment${on ? ' active' : ''}" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}"
                        data-action="type" data-type="${t}">T${t + 1}</button>`;
        }).join('');
        const hint = pet.type % 2 === 0 ? this.t('ptTypeDynamic') : this.t('ptTypeFixed');
        return `<div class="pets-segmented" role="radiogroup" aria-labelledby="ptTypeLabel">${buttons}</div>
                <span class="pt-type-hint">${esc(hint)}</span>`;
    }

    renderIdentityType() {
        const box = this.root.querySelector('[data-role="type"]');
        if (box) box.innerHTML = this.typeControlHtml(this.pet);
        this.updatePetChip(this.pet);
    }

    /** Valeurs affichées aujourd'hui : le minimum pour obtenir le verdict */
    renderQuick() {
        const box = this.root.querySelector('[data-role="quick"]');
        const pet = this.pet;
        if (!box || !pet) return;
        const items = this.visibleStats(pet).map(stat => `
            <label class="pt-quick-item pt-stat-${stat}">
                <span class="pt-quick-name"><span class="pt-stat-dot" aria-hidden="true"></span>${esc(this.t(STAT_LABELS[stat]))}</span>
                <span class="pt-quick-input">
                    <input class="pt-input" type="text" inputmode="decimal" data-quick="${stat}" placeholder="${esc(this.t('ptQuickPlaceholder'))}">
                    <span class="pt-quick-unit" aria-hidden="true">%</span>
                </span>
            </label>`).join('');
        box.innerHTML = `
            <span class="pets-field-label">${esc(this.t('ptQuickTitle'))}</span>
            <div class="pt-quick-list">${items}</div>
            <p class="pt-quick-hint">${esc(this.t('ptQuickHint'))}</p>`;
        this.syncInputs();
    }

    /* Compétences : valeur au niveau du familier, courbe 81 → 105 et prochains paliers */

    renderSkills() {
        const box = this.root.querySelector('[data-role="skills"]');
        const pet = this.pet;
        if (!box || !pet) return;
        box.innerHTML = pet.skills.map((slot, i) => {
            const options = PET_SKILLS.map(s => `<option value="${s}"${slot.skill === s ? ' selected' : ''}>${esc(this.skillName(s))}</option>`).join('');
            return `
                <div class="pt-skill-slot" data-skill-row="${i}">
                    <div class="pt-skill-head">
                        <img class="pt-skill-icon" alt="" width="28" height="28">
                        <select class="pets-select pt-skill-select" data-skill-slot="${i}" data-skill-part="skill" aria-label="${esc(this.t('ptSkills'))} ${i + 1}">
                            <option value="">${esc(this.t('ptSkillNone'))}</option>${options}
                        </select>
                    </div>
                    <div class="pt-skill-body" data-skill-body="${i}"></div>
                </div>`;
        }).join('');
        this.renderSkillBodies();
    }

    renderSkillBodies() {
        this.pet?.skills.forEach((_, i) => this.updateSkillSlot(i));
    }

    updateSkillSlot(i) {
        const pet = this.pet;
        const row = this.root.querySelector(`[data-skill-row="${i}"]`);
        if (!row || !pet) return;
        const slot = pet.skills[i];
        const img = row.querySelector('.pt-skill-icon');
        img.style.visibility = slot.skill ? 'visible' : 'hidden';
        if (slot.skill) { img.src = `data/pet-skills/${slot.skill}.png`; img.dataset.skillTip = slot.skill; }
        else delete img.dataset.skillTip;
        row.classList.toggle('is-empty', !slot.skill);
        const body = row.querySelector('[data-skill-body]');

        if (!slot.skill) { body.innerHTML = `<p class="pt-muted pt-skill-msg">${esc(this.t('ptSkillChoose'))}</p>`; return; }
        if (!pet.race) { body.innerHTML = `<p class="pt-muted pt-skill-msg">${esc(this.t('ptSkillNeedRace'))}</p>`; return; }

        const values = PET_LEVELS.map((_, idx) => getPetSkillValue(pet.race, slot.skill, pet.type, idx).value);
        const idxNow = Math.min(pet.level, MAX_LEVEL) - PET_LEVELS[0];       // < 0 : pas encore niveau 81
        const unlocked = idxNow >= 0;
        const now = unlocked ? values[idxNow] : values[0];
        const max = values[values.length - 1];
        const min = Math.min(...values);

        // Niveaux où la valeur augmente, à venir
        const steps = [];
        values.forEach((v, idx) => {
            if (idx > 0 && v > values[idx - 1] && idx > idxNow) steps.push({ level: PET_LEVELS[idx], value: v });
        });

        const bars = values.map((v, idx) => {
            const h = max > min ? 18 + 82 * (v - min) / (max - min) : 60;
            const cls = idx === idxNow ? ' is-now' : idx < idxNow ? ' is-past' : '';
            const step = idx > 0 && v > values[idx - 1] ? ' is-step' : '';
            return `<span class="pt-skill-bar${cls}${step}" style="height:${h.toFixed(0)}%" title="${esc(this.t('ptSkillNextItem', { level: PET_LEVELS[idx], value: this.skillValue(v, slot.skill) }))}"></span>`;
        }).join('');

        const stepList = steps.length
            ? steps.slice(0, 4).map(s => `<span class="pt-skill-step">${esc(this.t('ptSkillNextItem', { level: s.level, value: this.skillValue(s.value, slot.skill) }))}</span>`).join('')
              + (steps.length > 4 ? `<span class="pt-skill-step pt-muted">+${steps.length - 4}</span>` : '')
            : `<span class="pt-skill-step is-done">${esc(this.t('ptSkillMaxed'))}</span>`;

        body.innerHTML = `
            <div class="pt-skill-values">
                <div class="pt-skill-value is-now">
                    <span class="pt-tile-label">${esc(unlocked ? this.t('ptSkillNow', { level: pet.level }) : this.t('ptSkillUnlock'))}</span>
                    <span class="pt-skill-number">${this.skillValue(now, slot.skill)}</span>
                </div>
                <div class="pt-skill-value">
                    <span class="pt-tile-label">${esc(this.t('ptSkillAtMax'))}</span>
                    <span class="pt-skill-number">${this.skillValue(max, slot.skill)}</span>
                </div>
            </div>
            <div class="pt-skill-bars" aria-hidden="true">${bars}</div>
            <div class="pt-skill-axis" aria-hidden="true"><span>81</span><span>105</span></div>
            <div class="pt-skill-steps"><span class="pt-tile-label">${esc(this.t('ptSkillNext'))}</span>${stepList}</div>`;
    }

    /** Cartes des stats (reliées au panneau de détail) + panneau */
    renderStats() {
        const box = this.root.querySelector('[data-role="stats"]');
        const pet = this.pet;
        if (!box || !pet) return;
        const stats = this.visibleStats(pet);
        if (!stats.includes(this.currentStat)) this.currentStat = 'hp';
        const idx = stats.indexOf(this.currentStat);

        const cards = stats.map((stat, i) => `
            <div class="strategy-card pt-stat-card pt-stat-${stat}${stat === this.currentStat ? ' active' : ''}${i === 0 ? ' tab-first' : ''}${i === stats.length - 1 ? ' tab-last' : ''}"
                 data-action="stat" data-stat="${stat}" role="tab" tabindex="0" aria-selected="${stat === this.currentStat}">
                <div class="strategy-header">
                    <span class="pt-stat-dot" aria-hidden="true"></span>
                    <h3>${esc(this.t(STAT_LABELS[stat]))}</h3>
                    <span class="pt-verdict-chip" data-card-verdict="${stat}"></span>
                </div>
                <div class="strategy-card-stats" data-card="${stat}"></div>
            </div>`).join('');

        const attach = idx === 0 ? ' attach-left' : idx === stats.length - 1 ? ' attach-right' : '';
        box.innerHTML = `
            <div class="strategies-comparison pt-stat-cards${stats.length > 3 ? ' pt-stat-cards-many' : ''}" role="tablist">${cards}</div>
            <div class="scenario-pane pt-stat-pane pt-stat-${this.currentStat}${attach}" role="tabpanel" data-role="detail"></div>`;
        this.renderStatDetail();
    }

    renderStatDetail() {
        const pane = this.root.querySelector('[data-role="detail"]');
        const pet = this.pet;
        if (!pane || !pet) return;
        const stat = this.currentStat;
        const g = growthParams(stat, pet.type);
        const levels = palierLevels(stat, pet.type);
        const bonus = ageBonus(pet.age);
        const champion = isChampionStat(stat);

        const rows = levels.map((level, i) => `
            <tr data-k="${i + 1}" data-level="${level}">
                <td class="pt-col-k">${i + 1}</td>
                <td class="pt-col-level">${level}</td>
                <td class="pt-col-total"><input class="pt-input pt-cell" type="text" inputmode="decimal" data-cell="total" data-k="${i + 1}" data-level="${level}"
                    aria-label="${esc(this.t('ptColTotal'))} ${level}"></td>
                <td class="pt-col-gain" data-out="gain"></td>
                <td class="pt-col-exp" data-out="expected"></td>
                <td class="pt-col-dev" data-out="dev"></td>
            </tr>`).join('');

        const info = this.t('ptGrowthInfo', {
            type: this.typeLabel(pet.type),
            kind: g.dynamic ? this.t('ptKindDynamic') : this.t('ptKindFixed'),
            min: this.num(g.min), max: this.num(g.max), cadence: g.cadence,
        }) + (bonus ? ` · ${this.t('ptAgeBonus', { bonus: this.num(bonus) })}` : '');

        const baseField = champion ? '' : `
            <label class="pets-field pt-base">
                <span class="pets-field-label">${esc(this.t('ptBaseOptional'))}</span>
                <input class="pt-input" type="text" inputmode="decimal" data-base placeholder="${esc(this.t('ptBaseUnknown'))}">
            </label>`;

        pane.innerHTML = `
            <div class="pt-detail">
                <div class="pt-detail-head">
                    ${baseField}
                    <p class="pt-growth-info"><span>${esc(info)}</span><span class="pt-muted" data-role="base-hint"></span></p>
                </div>
                <div class="pt-alert" data-role="alert" hidden></div>
                <div class="pt-detail-grid">
                    <div class="pt-side">
                        <div class="pt-tiles" data-role="tiles"></div>
                        <div class="pt-chart-box" data-role="chart-box">
                            <canvas data-role="chart" aria-label="${esc(this.t('ptChartTitle'))}"></canvas>
                        </div>
                    </div>
                    <details class="pt-table-wrap" data-role="paliers"${this.paliersOpen ? ' open' : ''}>
                        <summary class="pt-table-summary">
                            <span>${esc(this.t('ptPaliersTitle'))}</span>
                            <span class="pt-muted">${esc(this.t('ptPaliersOptional'))}</span>
                            <svg class="pets-filter-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                        </summary>
                        <table class="pt-table">
                            <thead><tr>
                                <th>${esc(this.t('ptColPalier'))}</th><th>${esc(this.t(champion ? 'ptColChampion' : 'ptColLevel'))}</th>
                                <th>${esc(this.t('ptColTotal'))}</th><th>${esc(this.t('ptColGain'))}</th>
                                <th>${esc(this.t('ptColExpected'))}</th><th>${esc(this.t('ptColDeviation'))}</th>
                            </tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                        <p class="pt-hint">${esc(this.t('ptTableHint'))}</p>
                    </details>
                </div>
            </div>`;
        pane.querySelector('[data-role="paliers"]').addEventListener('toggle', (e) => { this.paliersOpen = e.target.open; });
        this.destroyChart();
        this.refresh();
    }

    /** Recopie les valeurs enregistrées dans les champs (sauf celui en cours de saisie) */
    syncInputs() {
        const pet = this.pet;
        if (!pet) return;
        const active = document.activeElement;
        const set = (input, value) => { if (input && input !== active) input.value = value; };
        const fmt = (v) => (Number.isFinite(v) ? this.num(v, 2) : '');

        this.root.querySelectorAll('[data-quick]').forEach(input => {
            const stat = input.dataset.quick;
            const level = this.scaleLevel(pet, stat);
            const k = Math.floor(level / growthParams(stat, pet.type).cadence);
            set(input, fmt(k < 1 ? pet.stats[stat].base : this.entryForPalier(pet, stat, k)?.total));
        });
        const stat = this.currentStat;
        set(this.root.querySelector('[data-base]'), fmt(pet.stats[stat].base));
        this.root.querySelectorAll('[data-role="detail"] tbody tr').forEach(tr => {
            const e = this.entryForPalier(pet, stat, Number(tr.dataset.k));
            set(tr.querySelector('[data-cell="total"]'), fmt(e?.total));
        });
    }

    /* ── Calculs affichés (sans toucher au champ en cours de saisie) ── */

    refresh() {
        const pet = this.pet;
        if (!pet) return;
        this.analyses = {};
        for (const stat of this.visibleStats(pet)) this.analyses[stat] = this.analyze(pet, stat);
        for (const stat of this.visibleStats(pet)) this.updateCard(stat);
        this.syncInputs();
        this.updateOverall();
        this.updateDetail();
        this.emitSummary();
    }

    updateCard(stat) {
        const a = this.analyses[stat];
        const box = this.root.querySelector(`[data-card="${stat}"]`);
        const chip = this.root.querySelector(`[data-card-verdict="${stat}"]`);
        if (!box) return;
        if (!a.paliers) {
            box.innerHTML = `<p class="pt-card-empty">${esc(this.t('ptNoData'))}</p>`;
            if (chip) { chip.textContent = ''; chip.className = 'pt-verdict-chip'; }
            return;
        }
        box.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item"><div class="stat-label">${esc(this.t('ptShown', { level: a.lastLevel }))}</div><div class="stat-value">${this.pct(a.total, 2)}</div></div>
                <div class="stat-item"><div class="stat-label">${esc(this.t('ptScoreShort'))}</div><div class="stat-value">${this.score(a.score)}</div></div>
            </div>`;
        if (chip) {
            chip.textContent = this.t(VERDICT_LABELS[a.verdict]);
            chip.className = `pt-verdict-chip is-${a.verdict}`;
        }
    }

    overall() {
        const withData = Object.values(this.analyses).filter(a => a.paliers > 0);
        if (!withData.length) return null;
        const avg = (f) => withData.reduce((s, a) => s + f(a), 0) / withData.length;
        const mean = avg(a => a.score);
        const all = avg(a => a.allPets.score);
        return { mean, verdict: verdictFor(mean), all, allVerdict: verdictFor(all), level: Math.max(...withData.map(a => a.lastLevel)), withData };
    }

    updateOverall() {
        const box = this.root.querySelector('[data-role="overall"]');
        const pet = this.pet;
        if (!box) return;
        const o = this.overall();
        if (!o) {
            box.innerHTML = `<p class="pt-overall-empty">${esc(this.t('ptOverallEmpty'))}</p>`;
            box.className = 'pt-overall';
            return;
        }
        const parts = (f) => o.withData.map(a => `${esc(this.t(STAT_LABELS[a.stat]))} ${this.score(f(a))}`).join(' · ');
        const sameLevel = o.withData.every(a => a.lastLevel === o.level);
        box.className = `pt-overall is-${o.verdict}`;
        box.innerHTML = `
            <div class="pt-overall-row is-${o.verdict}">
                <div class="pt-overall-score">
                    <span class="pt-overall-value">${this.score(o.mean)}</span>
                    <span class="pt-overall-label">${esc(this.t('ptEvolutionShort'))}</span>
                </div>
                <div class="pt-overall-text">
                    <span class="pets-field-label">${esc(this.t(sameLevel ? 'ptEvolutionTitle' : 'ptOverall', { type: this.typeLabel(pet.type), age: pet.age, level: o.level }))}</span>
                    <strong class="pt-overall-verdict">${esc(this.t(VERDICT_LABELS[o.verdict]))}</strong>
                    <span class="pt-overall-detail">${esc(this.t('ptOverallText', { type: this.typeLabel(pet.type) }))}</span>
                    <span class="pt-overall-detail pt-muted">${parts(a => a.score)}</span>
                </div>
            </div>
            <div class="pt-overall-row pt-overall-all is-${o.allVerdict}">
                <div class="pt-overall-score">
                    <span class="pt-overall-value">${this.score(o.all)}</span>
                    <span class="pt-overall-label">${esc(this.t('ptAllPetsShort'))}</span>
                </div>
                <div class="pt-overall-text">
                    <span class="pets-field-label">${esc(this.t('ptAllPetsTitle'))}</span>
                    <strong class="pt-overall-verdict">${esc(this.t(VERDICT_LABELS[o.allVerdict]))}</strong>
                    <span class="pt-overall-detail">${esc(this.t('ptAllPetsText'))}</span>
                    <span class="pt-overall-detail pt-muted">${parts(a => a.allPets.score)}</span>
                </div>
            </div>`;
        const fromExample = pet.name === this.t('ptExampleName');
        this.analytics?.trackOnce(`suivi-verdict-${pet.id}`, 'suivi verdict', {
            type: this.typeLabel(pet.type), verdict: o.verdict, exemple: fromExample ? 'oui' : 'non',
            base: MAIN_STATS.some(s => Number.isFinite(pet.stats[s].base)) ? 'oui' : 'non',
        });
    }

    updateDetail() {
        const pet = this.pet;
        const stat = this.currentStat;
        const a = this.analyses[stat];
        const pane = this.root.querySelector('[data-role="detail"]');
        if (!pane || !a) return;
        const type = this.typeLabel(pet.type);
        const maxLevel = scaleMax(stat);
        const scaleLevel = this.scaleLevel(pet, stat);

        // Indication sur la base
        const hint = pane.querySelector('[data-role="base-hint"]');
        if (hint) hint.textContent = isChampionStat(stat) ? '' : a.baseKnown ? this.t('ptBaseHint') : this.t('ptBaseUnknownHint');

        // Tableau : gain, espérance, écart par palier saisi
        const segByK = new Map(a.segments.map(s => [s.k, s]));
        pane.querySelectorAll('tbody tr').forEach(tr => {
            const k = Number(tr.dataset.k);
            tr.classList.toggle('is-future', !!scaleLevel && Number(tr.dataset.level) > scaleLevel);
            const s = segByK.get(k);
            const gainCell = tr.querySelector('[data-out="gain"]');
            const expCell = tr.querySelector('[data-out="expected"]');
            const devCell = tr.querySelector('[data-out="dev"]');
            tr.classList.toggle('is-filled', !!s);
            tr.classList.toggle('is-out', !!s?.outOfRange);
            if (!s) {
                gainCell.textContent = '';
                expCell.innerHTML = `<span class="pt-muted">${this.num(a.mid + ageBonus(pet.age), 2)}</span>`;
                devCell.innerHTML = '';
                return;
            }
            if (s.gain === null) {
                gainCell.innerHTML = `<span class="pt-muted" title="${esc(this.t('ptGainUnknown'))}">?</span>`;
                expCell.textContent = this.num(s.expected, 2);
                devCell.innerHTML = '';
                return;
            }
            gainCell.innerHTML = this.signed(s.gain, 2) + (s.span > 1 ? ` <span class="pt-span">${esc(this.t('ptSpan', { n: s.span }))}</span>` : '');
            expCell.textContent = this.num(s.expected, 2);
            const tone = s.deviation >= 0.05 ? 'is-good' : s.deviation <= -0.05 ? 'is-bad' : 'is-neutral';
            const warn = s.outOfRange
                ? ` <span class="pt-out" title="${esc(this.t('ptOutOfRange', { lo: this.num(s.lo), hi: this.num(s.hi) }))}">!</span>` : '';
            devCell.innerHTML = `<span class="pt-dev ${tone}">${this.signed(s.deviation, 2)}</span>${warn}`;
        });

        // Cases : score, position parmi tous les familiers, projection, comparaison avec T6 / T7 / T8
        const tiles = pane.querySelector('[data-role="tiles"]');
        const tile = (label, value, sub = '', cls = '') =>
            `<div class="pt-tile ${cls}"><span class="pt-tile-label">${esc(label)}</span><span class="pt-tile-value">${value}</span>${sub ? `<span class="pt-tile-sub">${sub}</span>` : ''}</div>`;
        let html = '';
        if (a.paliers) {
            html += tile(this.t('ptScore'), this.score(a.score),
                `${esc(this.t('ptScoreSub', { min: this.pct(a.minTotal, 2), mean: this.pct(a.expectedTotal, 2), max: this.pct(a.maxTotal, 2) }))}
                 <br><span class="pt-muted">${esc(this.t('ptScoreRef', { type, level: a.lastLevel }))}</span>`, `is-${a.verdict}`);
            const ap = a.allPets;
            html += tile(this.t('ptAllPetsTile'), this.score(ap.score),
                esc(this.t('ptAllPetsTileSub', { min: this.pct(ap.min, 1), max: this.pct(ap.max, 1), maxType: this.typeLabel(ap.maxType), maxLevel: ap.maxLevel })),
                `is-${verdictFor(ap.score)}`);
        }
        const range = a.final.min !== a.final.max
            ? esc(this.t('ptRangePossible', { min: this.pct(a.final.min, 1), max: this.pct(a.final.max, 1) })) : '';
        html += tile(this.t('ptProjection', { level: maxLevel }), this.pct(a.final.mean, 1), range);
        for (const c of a.compare) {
            const sub = c.deltaAtLevel !== null ? esc(this.t('ptAtLevelDelta', { level: a.lastLevel, delta: this.signed(c.deltaAtLevel, 2) })) : '';
            html += tile(this.t('ptVsType', { type: this.typeLabel(c.type), level: maxLevel }), this.pct(c.finalMean, 1), sub, 'is-compare');
        }
        if (!a.dynamic && a.paliers) {
            if (a.draw !== null) {
                html += tile(this.t('ptFixedDrawLabel'), this.pct(a.draw, 2), esc(this.t('ptFixedDraw', { min: this.num(a.min), max: this.num(a.max) })));
            } else if (a.drawRange) {
                html += tile(this.t('ptFixedDrawLabel'), `${this.num(a.drawRange[0])} – ${this.num(a.drawRange[1])}`, esc(this.t('ptDrawRange')));
            }
        }
        if (a.compare.length) html += `<p class="pt-tiles-note">${esc(this.t('ptCompareNote', { days: Math.min(pet.age, 800) }))}</p>`;
        tiles.innerHTML = html;

        // Alerte : même avec les meilleurs paliers restants, sous un T6 / T8 moyen au niveau max
        const alertBox = pane.querySelector('[data-role="alert"]');
        const weak = a.paliers ? a.compare.filter(c => !c.reachable) : [];
        if (weak.length) {
            alertBox.hidden = false;
            alertBox.innerHTML = `<span class="pt-alert-icon" aria-hidden="true">!</span><span>${esc(this.t('ptAlert', {
                type: weak.map(c => this.typeLabel(c.type)).join(' / '), level: maxLevel,
            }))}</span>`;
            this.analytics?.trackOnce(`suivi-alerte-${pet.id}-${stat}`, 'suivi alerte', { stat, type });
        } else {
            alertBox.hidden = true;
            alertBox.innerHTML = '';
        }

        this.updateChart(a);
    }

    /* ── Graphique ────────────────────────────────────────── */

    destroyChart() {
        if (this.chart) { this.chart.destroy(); this.chart = null; }
    }

    updateChart(a) {
        const pet = this.pet;
        const box = this.root.querySelector('[data-role="chart-box"]');
        const canvas = this.root.querySelector('[data-role="chart"]');
        if (!box || !canvas) return;
        if (typeof window.Chart === 'undefined') { box.hidden = true; return; }
        box.hidden = false;
        const stat = a.stat;
        const rgb = STAT_RGB[stat];
        // Courbe du type : base moyenne (jamais celle du familier suivi) ; bande = minimum – maximum possibles
        const curve = expectedCurve(stat, pet.type, null, pet.age);   // familiers comparés : base moyenne
        const type = this.typeLabel(pet.type);
        const observed = [
            ...(a.baseKnown ? [{ x: 0, y: a.base }] : []),
            ...a.segments.map(s => ({ x: s.level, y: s.total })),
        ];

        const datasets = [
            { label: this.t('ptChartBand', { type }), data: curve.map(p => ({ x: p.level, y: p.min })), borderWidth: 0, pointRadius: 0, fill: false, borderColor: 'transparent', order: 5 },
            { label: this.t('ptChartBand', { type }), data: curve.map(p => ({ x: p.level, y: p.max })), borderWidth: 0, pointRadius: 0, borderColor: 'transparent',
              backgroundColor: `rgba(${rgb}, 0.14)`, fill: '-1', order: 5 },
            { label: this.t('ptChartExpected', { type }), data: curve.map(p => ({ x: p.level, y: p.mean })), borderColor: `rgba(${rgb}, 0.8)`,
              borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false, order: 4 },
            ...a.compare.map(c => {
                const cc = expectedCurve(stat, c.type, null, pet.age, { band: false });
                return { label: this.t('ptChartExpected', { type: this.typeLabel(c.type) }), data: cc.map(p => ({ x: p.level, y: p.mean })),
                    borderColor: `rgba(${TYPE_RGB[c.type]}, 0.75)`, borderDash: [2, 4], borderWidth: 1.5, pointRadius: 0, fill: false, order: 3 };
            }),
            { label: this.t('ptChartYou'), data: observed, borderColor: `rgb(${rgb})`, backgroundColor: `rgb(${rgb})`,
              borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 5.5, fill: false, order: 1 },
        ];

        if (this.chart) {
            this.chart.data.datasets = datasets;
            this.chart.options.scales.x.max = scaleMax(stat);
            this.chart.update('none');
            return;
        }
        const fmt = (v) => this.pct(v, 2);
        this.chart = new window.Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                parsing: false,
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                plugins: {
                    legend: {
                        labels: {
                            color: '#cbd5e1', boxWidth: 14, boxHeight: 2, font: { size: 11 },
                            filter: (item) => item.datasetIndex !== 0,
                        },
                    },
                    tooltip: {
                        filter: (item) => item.datasetIndex > 1,
                        callbacks: {
                            title: (items) => `${this.t(isChampionStat(stat) ? 'ptColChampion' : 'ptColLevel')} ${items[0]?.parsed.x}`,
                            label: (item) => `${item.dataset.label}${this.lang === 'fr' ? ' : ' : ': '}${fmt(item.parsed.y)}`,
                        },
                    },
                    annotation: { annotations: {} },
                    zoom: { zoom: { wheel: { enabled: false }, pinch: { enabled: false } }, pan: { enabled: false } },
                },
                scales: {
                    x: { type: 'linear', min: 0, max: scaleMax(stat), ticks: { color: '#94a3b8', stepSize: isChampionStat(stat) ? 5 : 15 },
                         grid: { color: 'rgba(148, 163, 184, 0.08)' } },
                    y: { ticks: { color: '#94a3b8', callback: (v) => fmt(v) }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
                },
            },
        });
    }

    /* ── Résumé pour l'onglet « Mon familier » ────────────── */

    emitSummary() {
        const pet = this.pet;
        if (!pet) { this.onSummary?.(null); return; }
        if (!this.mounted || !Object.keys(this.analyses).length) {
            this.analyses = {};
            for (const s of this.visibleStats(pet)) this.analyses[s] = this.analyze(pet, s);
        }
        const o = this.overall();
        this.onSummary?.({
            name: pet.name || this.t('ptDefaultName'),
            type: this.typeLabel(pet.type),
            verdict: o?.verdict ?? null,
            verdictLabel: o ? this.t(VERDICT_LABELS[o.verdict]) : null,
            score: o?.mean ?? null,
            scoreLabel: o ? this.score(o.mean) : null,
        });
    }
}
