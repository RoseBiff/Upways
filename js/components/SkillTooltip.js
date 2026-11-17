/**
 * Infobulle des livres de compétence de familier, au survol des icônes de compétence
 * (élément portant data-skill-tip="<compétence>") : même présentation que dans le jeu
 * (icône, nom du livre en doré, description), sans le prix de vente.
 * Une seule infobulle pour tout le site, positionnée près de l'icône survolée.
 */
import { PET_SKILL_NAMES } from '../core/PetSkills.js';
import { PET_SKILL_BOOKS, PET_SKILL_BOOK_PATTERN, PET_SKILL_DESCRIPTIONS } from '../core/PetSkillInfo.js';

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class SkillTooltip {
    constructor(translator, analytics) {
        this.translator = translator;
        this.analytics = analytics;
        this.anchor = null;
        this.el = document.createElement('div');
        this.el.className = 'skill-tip';
        this.el.setAttribute('role', 'tooltip');
        this.el.hidden = true;
        document.body.append(this.el);

        const anchorOf = (e) => e.target?.closest?.('[data-skill-tip]');
        document.addEventListener('mouseover', (e) => { const a = anchorOf(e); if (a) this.show(a); });
        document.addEventListener('mouseout', (e) => {
            const a = anchorOf(e);
            if (a && a === this.anchor && !a.contains(e.relatedTarget)) this.hide();
        });
        document.addEventListener('focusin', (e) => { const a = anchorOf(e); if (a) this.show(a); });
        document.addEventListener('focusout', (e) => { if (anchorOf(e) === this.anchor) this.hide(); });
        // Écran tactile : un appui sur l'icône l'affiche, un appui ailleurs la ferme
        document.addEventListener('pointerdown', (e) => { if (!anchorOf(e)) this.hide(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
        window.addEventListener('scroll', () => this.hide(), { passive: true, capture: true });
        window.addEventListener('resize', () => this.hide());
    }

    get lang() { return this.translator.getLanguage(); }

    content(skill) {
        const lang = this.lang;
        const name = PET_SKILL_NAMES[skill][lang] || PET_SKILL_NAMES[skill].en;
        const book = PET_SKILL_BOOKS[lang]?.[skill]
            ?? (PET_SKILL_BOOK_PATTERN[lang] || PET_SKILL_BOOK_PATTERN.en).replace('{name}', name);
        const desc = PET_SKILL_DESCRIPTIONS[lang]?.[skill] ?? PET_SKILL_DESCRIPTIONS.en[skill];
        return `
            <img class="skill-tip-icon" src="data/pet-skills/${skill}.png" alt="" width="32" height="32">
            <div class="skill-tip-title">${esc(book)}</div>
            <div class="skill-tip-desc">${esc(desc)}</div>
`;
    }

    show(anchor) {
        const skill = anchor.dataset.skillTip;
        if (!PET_SKILL_NAMES[skill]) return;
        if (this.anchor === anchor && !this.el.hidden) return;
        this.anchor = anchor;
        this.el.innerHTML = this.content(skill);
        this.el.hidden = false;
        this.place(anchor);
        this.analytics?.trackOnce?.(`skill-tip-${skill}`, 'familiers infobulle', { competence: skill });
    }

    /** Au-dessus de l'icône, sinon en dessous ; toujours dans l'écran */
    place(anchor) {
        const r = anchor.getBoundingClientRect();
        const tip = this.el.getBoundingClientRect();
        const gap = 8;
        let top = r.top - tip.height - gap;
        if (top < gap) top = r.bottom + gap;
        top = Math.min(top, window.innerHeight - tip.height - gap);
        let left = r.left + r.width / 2 - tip.width / 2;
        left = Math.max(gap, Math.min(left, window.innerWidth - tip.width - gap));
        this.el.style.top = `${Math.round(Math.max(gap, top))}px`;
        this.el.style.left = `${Math.round(left)}px`;
    }

    hide() {
        if (this.el.hidden) return;
        this.el.hidden = true;
        this.anchor = null;
    }
}
