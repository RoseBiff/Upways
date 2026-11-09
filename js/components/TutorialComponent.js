/**
 * TutorialComponent (G2) — Tutoriel premier lancement
 *
 * Objectif : guider l'utilisateur à travers le wizard (objet → niveaux → prix)
 * puis l'onglet Analyse (cartes de stratégie, graphique, liste de préparation)
 * avec un overlay spotlight + bulles animées.
 *
 * Principes de conception :
 *   • Steps data-driven ({ target, titleKey, bodyKey, arrow?, placement?, onEnter? })
 *   • Pas d'auto-clic : on met en lumière et on explique. L'utilisateur reste maître.
 *   • Exception : un "démo fill" optionnel au passage config → analyse pour que
 *     la 2ᵉ moitié du tour ait quelque chose à montrer.
 *   • Persistance : localStorage "upways-tutorial-done".
 *   • Relançable : depuis le bouton dédié ou la combinaison Échap pour fermer.
 *
 * Dépendances : translator (pour i18n), dataService (pour le démo fill).
 */
const STORAGE_KEY = 'upways-tutorial-done';

export class TutorialComponent {
    /**
     * @param {Object} translator  Instance avec .t(key), .addObserver(obs), .currentLang
     * @param {Object} dataService Pour accéder aux items (démo fill optionnel)
     */
    constructor(translator, dataService) {
        this.translator = translator;
        this.dataService = dataService;

        this.active = false;
        this.stepIndex = 0;
        this.steps = [];
        this.observer = null;
        this._pendingTarget = null;
        this._resizeRaf = null;
        this._waitCleanup = null;   // fn() qui démonte le listener waitFor courant
        this._waiting = false;      // true tant qu'on attend l'action utilisateur
        this._includeTimer = null;  // interval pour re-mesurer les cibles étendues (dropdowns)

        this._bindElements();
        this._attachEvents();
        this.translator.addObserver(this);
    }

    // ===== Cycle de vie ====================================================

    _bindElements() {
        this.els = {
            overlay:        document.getElementById('tutorialOverlay'),
            welcome:        document.getElementById('tutorialWelcome'),
            startBtn:       document.getElementById('tutorialStartBtn'),
            skipWelcomeBtn: document.getElementById('tutorialSkipWelcomeBtn'),
            welcomeTitle:   document.getElementById('tutorialWelcomeTitle'),
            welcomeSubtitle:document.getElementById('tutorialWelcomeSubtitle'),
            bubble:         document.getElementById('tutorialBubble'),
            bubbleArrow:    document.getElementById('tutorialBubbleArrow'),
            bubbleTitle:    document.getElementById('tutorialBubbleTitle'),
            bubbleBody:     document.getElementById('tutorialBubbleBody'),
            bubbleStep:     document.getElementById('tutorialBubbleStep'),
            waitHint:       document.getElementById('tutorialBubbleWaitHint'),
            waitText:       document.getElementById('tutorialBubbleWaitText'),
            progressBar:    document.getElementById('tutorialBubbleProgressBar'),
            prevBtn:        document.getElementById('tutorialPrevBtn'),
            nextBtn:        document.getElementById('tutorialNextBtn'),
            skipBtn:        document.getElementById('tutorialSkipBtn'),
            ring:           document.getElementById('tutorialRing'),
            backdropTop:    null, backdropRight: null, backdropBottom: null, backdropLeft: null,
            replayBtn:      document.getElementById('tutorialReplayBtn')
        };
        if (this.els.overlay) {
            this.els.backdropTop    = this.els.overlay.querySelector('.tutorial-backdrop-top');
            this.els.backdropRight  = this.els.overlay.querySelector('.tutorial-backdrop-right');
            this.els.backdropBottom = this.els.overlay.querySelector('.tutorial-backdrop-bottom');
            this.els.backdropLeft   = this.els.overlay.querySelector('.tutorial-backdrop-left');
        }
    }

    _attachEvents() {
        if (!this.els.overlay) return;

        this.els.startBtn?.addEventListener('click',       () => this._beginTour());
        this.els.skipWelcomeBtn?.addEventListener('click', () => this.dismiss(true));
        this.els.skipBtn?.addEventListener('click',        () => this.dismiss(true));
        this.els.nextBtn?.addEventListener('click',        () => this.next());
        this.els.prevBtn?.addEventListener('click',        () => this.prev());

        // Échap pour fermer
        document.addEventListener('keydown', (e) => {
            if (!this.active) return;
            if (e.key === 'Escape')     this.dismiss(true);
            else if (e.key === 'ArrowRight') this.next();
            else if (e.key === 'ArrowLeft')  this.prev();
        });

        // Repositionner la bulle / l'anneau au redim / scroll
        const reposition = () => {
            if (!this.active || !this._pendingTarget) return;
            cancelAnimationFrame(this._resizeRaf);
            this._resizeRaf = requestAnimationFrame(() => this._updatePositioning());
        };
        window.addEventListener('resize', reposition, { passive: true });
        window.addEventListener('scroll', reposition, { passive: true });

        // Après un redimensionnement (rotation du téléphone…), recadrer si la cible est sortie
        // de l'écran ou si la bulle a dû se poser dessus faute de place
        window.addEventListener('resize', () => {
            clearTimeout(this._recenterTimer);
            this._recenterTimer = setTimeout(() => {
                const target = this._pendingTarget;
                if (!this.active || !target) return;
                const r = target.getBoundingClientRect();
                const offscreen = r.bottom < 0 || r.top > window.innerHeight;
                const covered = this.els.bubble.dataset.arrow === 'none';
                if (offscreen || covered) this._positionForTarget(target, this.steps[this.stepIndex]);
            }, 250);
        }, { passive: true });

        // Bouton de relance (header)
        this.els.replayBtn?.addEventListener('click', () => this.start({ force: true }));
    }

    // Observer i18n : re-traduire les libellés statiques + re-rendre si actif
    onTranslationEvent(event) {
        if (event !== 'languageChanged' && event !== 'tooltipsNeedUpdate') return;
        const t = (k) => this.translator.t(k);
        if (this.els.welcomeTitle)    this.els.welcomeTitle.textContent    = t('tutorialWelcomeTitle');
        if (this.els.welcomeSubtitle) this.els.welcomeSubtitle.textContent = t('tutorialWelcomeSubtitle');
        if (this.els.startBtn)        this.els.startBtn.textContent        = t('tutorialStart');
        if (this.els.skipWelcomeBtn)  this.els.skipWelcomeBtn.textContent  = t('tutorialSkipWelcome');
        if (this.els.prevBtn)         this.els.prevBtn.textContent         = t('tutorialPrev');
        if (this.els.nextBtn)         this.els.nextBtn.textContent         = t(this._isLastStep() ? 'tutorialFinish' : 'tutorialNext');
        if (this.els.skipBtn)         this.els.skipBtn.textContent         = t('tutorialSkip');
        if (this.els.replayBtn)       this.els.replayBtn.title             = t('tutorialReplayTitle');
        if (this.active && this.stepIndex >= 0) this._renderStep();
    }

    // ===== API publique ====================================================

    /**
     * Démarre le tutoriel. Avec `force=false`, respecte le drapeau localStorage.
     */
    start({ force = false } = {}) {
        if (!force && this._isDone()) return;
        if (!this.els.overlay) return;

        this.steps = this._buildSteps();
        this.stepIndex = -1;  // -1 = welcome modal
        this.active = true;

        this.els.overlay.classList.add('active', 'show-welcome', 'no-target');
        this.els.overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Masque le tutoriel et le marque comme "vu". Avec `markDone=false`, ne persiste pas
     * (utile quand l'utilisateur abandonne manuellement et qu'on veut relancer).
     */
    dismiss(markDone = true) {
        if (!this.els.overlay) return;
        this.active = false;
        this._teardownWait();
        this._stopIncludeTimer();
        this.els.overlay.classList.remove('active', 'show-welcome', 'has-target', 'no-target');
        this.els.overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        this._clearTargetHighlight();
        this._pendingTarget = null;
        if (markDone) this._markDone();
    }

    // Supprime le listener "waitFor" courant + reset UI de l'attente
    _teardownWait() {
        if (typeof this._waitCleanup === 'function') {
            try { this._waitCleanup(); } catch { /* no-op */ }
        }
        this._waitCleanup = null;
        this._waiting = false;
        if (this.els.waitHint) this.els.waitHint.hidden = true;
        if (this.els.nextBtn)  this.els.nextBtn.classList.remove('is-waiting');
    }

    // Démarre un timer qui re-mesure le spotlight (utile pour élargir sur les dropdowns qui s'ouvrent)
    _startIncludeTimer() {
        this._stopIncludeTimer();
        this._includeTimer = setInterval(() => {
            if (!this.active || !this._pendingTarget) return;
            this._updatePositioning();
        }, 120);
    }
    _stopIncludeTimer() {
        if (this._includeTimer) { clearInterval(this._includeTimer); this._includeTimer = null; }
    }

    /**
     * Suggestion au bouton de relance : micro-animation d'attention (2× pulse).
     * Appelée après la 1ère complétion du tutoriel pour indiquer qu'il reste rejouable.
     */
    hintReplayButton() {
        const btn = this.els.replayBtn;
        if (!btn) return;
        btn.classList.add('pulse-hint');
        setTimeout(() => btn.classList.remove('pulse-hint'), 6000);
    }

    // ===== Navigation ======================================================

    _beginTour() {
        this.els.overlay.classList.remove('show-welcome');
        this.stepIndex = 0;
        this._renderStep();
    }

    next() {
        // Si on est en attente, ignorer les clics (bouton grisé) — mais Échap/dismiss passe.
        if (this._waiting) return;
        if (this._isLastStep()) { this._completeTour(); return; }
        this._teardownWait();
        this._stopIncludeTimer();
        this.stepIndex++;
        this._renderStep();
    }

    prev() {
        if (this.stepIndex <= 0) return;
        this._teardownWait();
        this._stopIncludeTimer();
        this.stepIndex--;
        this._renderStep();
    }

    // Auto-avance : appelé par un waitFor quand la condition est remplie
    _autoAdvance() {
        if (!this.active || !this._waiting) return;
        this._waiting = false;
        // Petit délai pour laisser l'UI respirer (ex: user vient de cliquer)
        setTimeout(() => {
            if (!this.active) return;
            if (this._isLastStep()) this._completeTour();
            else { this.stepIndex++; this._renderStep(); }
        }, 280);
    }

    _isLastStep() {
        return this.stepIndex >= this.steps.length - 1;
    }

    _completeTour() {
        this.dismiss(true);
        // Suggestion : rappeler que le tuto reste rejouable
        setTimeout(() => this.hintReplayButton(), 400);
    }

    // ===== Rendu d'une étape ==============================================

    async _renderStep() {
        // Toujours repartir d'un état propre côté waitFor + timers
        this._teardownWait();
        this._stopIncludeTimer();

        let step = this.steps[this.stepIndex];
        if (!step) return;

        // Étape "conditionnelle" : si la cible n'existe pas et qu'on demande de sauter, on avance
        if (typeof step.skipIf === 'function') {
            try {
                if (step.skipIf()) {
                    if (this._isLastStep()) { this._completeTour(); return; }
                    this.stepIndex++;
                    return this._renderStep();
                }
            } catch (err) { console.warn('Tutorial skipIf error', err); }
        }

        // Hook onEnter (ex: switcher d'onglet, revenir sur l'étape 1 du wizard)
        if (typeof step.onEnter === 'function') {
            try { await step.onEnter(this); } catch (err) { console.warn('Tutorial onEnter error', err); }
        }

        // Texte de la bulle
        const t = (k) => this.translator.t(k) || k;
        this.els.bubbleTitle.textContent = t(step.titleKey);
        this.els.bubbleBody.innerHTML   = t(step.bodyKey);
        this.els.bubbleStep.textContent = `${this.stepIndex + 1} / ${this.steps.length}`;

        // Boutons
        this.els.prevBtn.disabled = (this.stepIndex === 0);
        this.els.prevBtn.setAttribute('aria-disabled', this.els.prevBtn.disabled);
        this.els.nextBtn.textContent = t(this._isLastStep() ? 'tutorialFinish' : 'tutorialNext');

        // Barre de progression
        const pct = ((this.stepIndex + 1) / this.steps.length) * 100;
        this.els.progressBar.style.width = `${pct}%`;

        // Résolution de la cible (selector string ou fonction)
        const target = this._resolveTarget(step.target);
        this._pendingTarget = target;

        // Petit délai pour laisser la transition précédente démarrer
        await new Promise(r => requestAnimationFrame(r));

        // La bulle s'affiche une fois la page arrivée à destination (voir _positionForTarget)
        this._positionForTarget(target, step);

        // Installation éventuelle du waitFor (laisse l'utilisateur agir sur l'UI réelle)
        if (typeof step.waitFor === 'function') {
            const hintKey = step.waitHintKey;
            this._installWait(hintKey, step.waitFor);
        }

        // Si l'étape a des cibles étendues (dropdown, liste déroulante), polliner la position
        if (step.includeTargets && Array.isArray(step.includeTargets) && step.includeTargets.length) {
            this._startIncludeTimer();
        }
    }

    // Installe un waitFor : affiche le hint + attend que la fonction appelle _autoAdvance
    _installWait(hintKey, installFn) {
        if (this.els.waitHint && hintKey) {
            // innerHTML pour que les balises <strong> soient rendues plutôt qu'affichées en dur
            this.els.waitText.innerHTML = this.translator.t(hintKey) || '';
            this.els.waitHint.hidden = false;
        }
        this.els.nextBtn.classList.add('is-waiting');
        this._waiting = true;
        const advance = () => this._autoAdvance();
        try {
            this._waitCleanup = installFn(advance) || (() => {});
        } catch (err) {
            console.warn('Tutorial waitFor install error', err);
            this._waitCleanup = null;
            this._waiting = false;
            this.els.nextBtn.classList.remove('is-waiting');
            if (this.els.waitHint) this.els.waitHint.hidden = true;
        }
    }

    _resolveTarget(target) {
        if (!target) return null;
        if (typeof target === 'function') {
            try { return target(); } catch { return null; }
        }
        if (typeof target === 'string') {
            return document.querySelector(target);
        }
        return target;
    }

    _positionForTarget(target, step) {
        this._clearTargetHighlight();
        this.els.overlay.classList.remove('has-target', 'no-target');

        if (!target) {
            // Pas de cible : bulle centrée + voile plein
            this.els.overlay.classList.add('no-target');
            this._positionBubbleCentered();
            this._resetBackdropFullscreen();
            this._revealBubble();
            return;
        }

        // Bulle cachée pendant le déplacement : elle apparaît directement au bon endroit
        this.els.bubble.classList.remove('visible');

        // Faire défiler la PAGE pour que la cible et la bulle tiennent ensemble à l'écran.
        // Pas de scrollIntoView() : il faisait aussi défiler les blocs en overflow:hidden
        // (carte de configuration), qui restaient ensuite décalés et inaccessibles.
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const wanted = this._scrollDeltaFor(target, step);
        const delta = Math.max(-window.scrollY, Math.min(wanted, maxY - window.scrollY));
        const needsScroll = Math.abs(delta) > 2;
        if (needsScroll) {
            const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            if (reduceMotion) {
                // Instantané : on neutralise le scroll-behavior: smooth du site le temps du saut
                const rootStyle = document.documentElement.style;
                const prev = rootStyle.scrollBehavior;
                rootStyle.scrollBehavior = 'auto';
                window.scrollBy(0, delta);
                rootStyle.scrollBehavior = prev;
            } else {
                window.scrollBy({ top: delta, behavior: 'smooth' });
            }
        }

        // Une fois le défilement terminé : mesurer de nouveau, puis afficher la bulle
        let done = false;
        const hasScrollEnd = 'onscrollend' in window;
        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            window.removeEventListener('scrollend', finish);
            if (!this.active || this._pendingTarget !== target) return;
            this._updatePositioning(step);
            this._revealBubble();
        };
        const timer = setTimeout(finish, needsScroll ? (hasScrollEnd ? 1200 : 450) : 40);
        if (needsScroll && hasScrollEnd) window.addEventListener('scrollend', finish);
    }

    // Haut de la zone utile : sous l'en-tête collant, sauf pour une cible située dedans
    _safeTop(target) {
        const header = document.querySelector('.header');
        if (!header || (target && header.contains(target))) return 0;
        const pos = getComputedStyle(header).position;
        if (pos !== 'sticky' && pos !== 'fixed') return 0;
        return Math.max(0, header.getBoundingClientRect().bottom);
    }

    // Côté visé pour la bulle : celui de l'étape, ou dessous si la place manque en largeur (mobile)
    _preferredSide(r, step) {
        const side = step?.placement || 'bottom';
        if (side !== 'left' && side !== 'right') return side;
        const bw = this.els.bubble.offsetWidth || 320;
        const room = side === 'left' ? r.left : window.innerWidth - r.right;
        return room - 2 * 16 >= bw ? side : 'bottom';
    }

    // Défilement vertical nécessaire pour voir la cible avec la bulle du bon côté
    _scrollDeltaFor(target, step) {
        const r = target.getBoundingClientRect();
        const margin = 16, pad = 8;
        const bh = this.els.bubble.offsetHeight || 200;
        const areaTop = this._safeTop(target) + margin;
        const areaBottom = window.innerHeight - margin;
        const side = this._preferredSide(r, step);

        let blockTop = r.top - pad;
        let blockBottom = r.bottom + pad;
        if (side === 'top') blockTop -= bh + margin;
        else if (side === 'bottom') blockBottom += bh + margin;
        else if (bh > r.height) {                  // bulle à côté, centrée sur la cible
            blockTop -= (bh - r.height) / 2;
            blockBottom += (bh - r.height) / 2;
        }

        if (blockTop >= areaTop && blockBottom <= areaBottom) return 0;      // déjà bien placé
        if (blockBottom - blockTop <= areaBottom - areaTop) {                // tient à l'écran : on centre
            return (blockTop + blockBottom) / 2 - (areaTop + areaBottom) / 2;
        }
        // Cible plus haute que l'écran : la bulle en haut, puis le début de la cible.
        // Écran trop bas pour montrer les deux (téléphone à l'horizontale) : la cible d'abord,
        // la bulle se posera dessus.
        const bubbleSpace = (side === 'left' || side === 'right') ? 0 : bh + margin;
        const targetRoom = areaBottom - areaTop - bubbleSpace - pad;
        return r.top - pad - (targetRoom >= 120 ? bubbleSpace : 0) - areaTop;
    }

    _updatePositioning(step) {
        const target = this._pendingTarget;
        if (!target) return;
        // Cible principale
        const baseRect = target.getBoundingClientRect();
        let rTop    = baseRect.top;
        let rLeft   = baseRect.left;
        let rRight  = baseRect.right;
        let rBottom = baseRect.bottom;

        // Étend le spotlight sur les éléments "reliés" visibles (ex: liste déroulante ouverte)
        const currentStep = step || this.steps[this.stepIndex];
        const include = currentStep?.includeTargets;
        if (include && Array.isArray(include)) {
            for (const sel of include) {
                const el = typeof sel === 'function' ? sel() : document.querySelector(sel);
                if (!el) continue;
                const r = el.getBoundingClientRect();
                if (r.width <= 0 || r.height <= 0) continue;
                // Évite les éléments invisibles
                const cs = getComputedStyle(el);
                if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity || '1') === 0) continue;
                rTop    = Math.min(rTop,    r.top);
                rLeft   = Math.min(rLeft,   r.left);
                rRight  = Math.max(rRight,  r.right);
                rBottom = Math.max(rBottom, r.bottom);
            }
        }

        const rect = { top: rTop, left: rLeft, right: rRight, bottom: rBottom, width: rRight - rLeft, height: rBottom - rTop };
        const pad = 8; // padding autour de la cible

        const top    = Math.max(rect.top - pad, 0);
        const left   = Math.max(rect.left - pad, 0);
        const width  = rect.right + pad - left;
        const height = rect.bottom + pad - top;

        // Anneau lumineux
        Object.assign(this.els.ring.style, {
            top:    `${top}px`,
            left:   `${left}px`,
            width:  `${width}px`,
            height: `${height}px`
        });

        // Backdrops (4 rectangles formant un cadre autour de la cible)
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        Object.assign(this.els.backdropTop.style,    { top: '0px',           left: '0px',           width: '100%',                  height: `${top}px` });
        Object.assign(this.els.backdropLeft.style,   { top: `${top}px`,      left: '0px',           width: `${left}px`,             height: `${height}px` });
        Object.assign(this.els.backdropRight.style,  { top: `${top}px`,      left: `${left + width}px`, width: `${vw - left - width}px`, height: `${height}px` });
        Object.assign(this.els.backdropBottom.style, { top: `${top + height}px`, left: '0px',        width: '100%',                  height: `${vh - top - height}px` });

        // Mettre en avant la cible (conservé pour CSS hook, même si les clics
        // passent naturellement grâce à pointer-events: none sur les backdrops)
        target.classList.add('tutorial-target-highlight');

        this.els.overlay.classList.add('has-target');

        // Positionner la bulle à côté
        this._positionBubbleNearRect({ top, left, width, height }, currentStep);
    }

    _resetBackdropFullscreen() {
        Object.assign(this.els.backdropTop.style,    { top: '0px', left: '0px', width: '100%', height: '100%' });
        Object.assign(this.els.backdropRight.style,  { opacity: '0' });
        Object.assign(this.els.backdropBottom.style, { opacity: '0' });
        Object.assign(this.els.backdropLeft.style,   { opacity: '0' });
        // On retire l'opacité 0 au prochain cycle
        requestAnimationFrame(() => {
            this.els.backdropRight.style.opacity  = '';
            this.els.backdropBottom.style.opacity = '';
            this.els.backdropLeft.style.opacity   = '';
        });
    }

    _positionBubbleCentered() {
        const bubble = this.els.bubble;
        bubble.style.top  = '50%';
        bubble.style.left = '50%';
        bubble.style.transform = 'translate(-50%, -50%) scale(1)';
        bubble.dataset.arrow = 'none';
        bubble.style.setProperty('--bubble-offset', '0');
    }

    _positionBubbleNearRect(rect, step) {
        const bubble = this.els.bubble;
        const bw = bubble.offsetWidth  || 320;
        const bh = bubble.offsetHeight || 200;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 16;
        // Ne pas recouvrir l'en-tête collant quand la hauteur le permet
        const safeTop = this._safeTop(this._pendingTarget) + margin;
        const minTop = (vh - bh - margin >= safeTop) ? safeTop : margin;

        // Côtés où la bulle tient sans recouvrir la cible
        const fits = {
            top:    rect.top - margin - bh >= minTop,
            bottom: rect.top + rect.height + margin + bh <= vh - margin,
            left:   rect.left - margin - bw >= margin,
            right:  rect.left + rect.width + margin + bw <= vw - margin
        };
        // Côté demandé par l'étape, sinon l'opposé, sinon le premier qui a la place
        const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
        const wanted = step?.placement;
        let placement = [wanted, opposite[wanted], 'bottom', 'top', 'right', 'left'].find(p => p && fits[p]);
        // Aucun côté libre (cible plus grande que l'écran) : la bulle se pose sur la cible,
        // du côté le plus dégagé (elle reste au-dessus, voir .tutorial-target-highlight)
        const overlap = !placement;
        if (overlap) placement = (rect.top - minTop > vh - rect.top - rect.height) ? 'top' : 'bottom';

        let top, left;
        switch (placement) {
            case 'top':
                top  = rect.top - bh - margin;
                left = rect.left + rect.width / 2 - bw / 2;
                break;
            case 'left':
                top  = rect.top + rect.height / 2 - bh / 2;
                left = rect.left - bw - margin;
                break;
            case 'right':
                top  = rect.top + rect.height / 2 - bh / 2;
                left = rect.left + rect.width + margin;
                break;
            case 'bottom':
            default:
                top  = rect.top + rect.height + margin;
                left = rect.left + rect.width / 2 - bw / 2;
                break;
        }

        // Clamp dans la fenêtre
        left = Math.max(margin, Math.min(left, vw - bw - margin));
        top  = Math.max(minTop, Math.min(top,  vh - bh - margin));

        bubble.style.top  = `${top}px`;
        bubble.style.left = `${left}px`;
        bubble.style.transform = '';
        // Flèche tournée vers la cible, alignée sur son centre même si la bulle est décalée
        const arrows = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
        bubble.dataset.arrow = overlap ? 'none' : arrows[placement];
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
        bubble.style.setProperty('--arrow-x', `${clamp(rect.left + rect.width / 2 - left, 22, bw - 22)}px`);
        bubble.style.setProperty('--arrow-y', `${clamp(rect.top + rect.height / 2 - top, 22, bh - 22)}px`);
    }

    _revealBubble() {
        // Retrait + ré-ajout pour relancer l'anim de pop
        this.els.bubble.classList.remove('visible');
        // Force reflow
        void this.els.bubble.offsetHeight;
        this.els.bubble.classList.add('visible');
    }

    _clearTargetHighlight() {
        document.querySelectorAll('.tutorial-target-highlight')
            .forEach(el => el.classList.remove('tutorial-target-highlight'));
    }

    // ===== Définition data-driven des étapes ==============================

    _buildSteps() {
        // Helpers pour les onEnter : basculer d'onglet, revenir sur une étape du wizard
        const goToConfig = () => {
            document.querySelector('.nav-btn[data-tab="config"]')?.click();
        };
        const goToAnalysis = () => {
            const btn = document.getElementById('analysisTabBtn');
            if (btn && !btn.classList.contains('disabled')) btn.click();
        };
        // Ramène le wizard à l'étape n UNIQUEMENT en arrière (le wizard ne permet
        // pas de sauter en avant tant que les champs précédents ne sont pas remplis).
        const goWizardBackTo = (n) => {
            const dot = document.querySelector(`.wizard-step-dot[data-step="${n}"]`);
            if (!dot || dot.classList.contains('disabled')) return;
            // Clique seulement si on peut reculer — aller en avant serait un no-op côté ConfigComponent
            dot.click();
        };

        // waitFor helper : attendre qu'un dot de wizard devienne "active"
        const waitWizardStepActive = (n) => (advance) => {
            const dot = document.querySelector(`.wizard-step-dot[data-step="${n}"]`);
            if (!dot) { advance(); return () => {}; }
            if (dot.classList.contains('active')) { setTimeout(advance, 30); return () => {}; }
            const obs = new MutationObserver(() => {
                if (dot.classList.contains('active')) advance();
            });
            obs.observe(dot, { attributes: true, attributeFilter: ['class'] });
            return () => obs.disconnect();
        };

        // waitFor helper : attendre qu'un bouton cesse d'être disabled
        const waitBtnEnabled = (id) => (advance) => {
            const btn = document.getElementById(id);
            if (!btn) { advance(); return () => {}; }
            if (!btn.disabled) { setTimeout(advance, 30); return () => {}; }
            const obs = new MutationObserver(() => {
                if (!btn.disabled) advance();
            });
            obs.observe(btn, { attributes: true, attributeFilter: ['disabled'] });
            return () => obs.disconnect();
        };

        // waitFor helper : attendre le clic sur #analyzeBtn OU l'activation de l'onglet Analyse
        const waitAnalyzeOrTabEnabled = (advance) => {
            const btn  = document.getElementById('analyzeBtn');
            const tab  = document.getElementById('analysisTabBtn');
            let done = false;
            const finish = () => { if (done) return; done = true; advance(); };
            // Si l'onglet est déjà activable, on avance directement
            if (tab && !tab.classList.contains('disabled')) { setTimeout(finish, 30); return () => {}; }
            const onClick = () => finish();
            btn?.addEventListener('click', onClick, { once: true });
            let obs = null;
            if (tab) {
                obs = new MutationObserver(() => {
                    if (!tab.classList.contains('disabled')) finish();
                });
                obs.observe(tab, { attributes: true, attributeFilter: ['class'] });
            }
            return () => {
                btn?.removeEventListener('click', onClick);
                obs?.disconnect();
            };
        };

        // Helper : le matériau est-il actuellement demandé par l'objet sélectionné ?
        const hasMaterialsSection = () => {
            const el = document.getElementById('materialSection');
            if (!el) return false;
            const cs = getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden';
        };

        // Les cibles utilisent des sélecteurs déjà présents dans l'app.
        return [
            // --- Étape 0 : Langue (bubble à gauche + spotlight étendu quand le dropdown est ouvert) ---
            {
                target: '.language-selector',
                titleKey: 'tutorialStepLangTitle',
                bodyKey:  'tutorialStepLangBody',
                placement: 'left',
                includeTargets: ['#languageDropdown'],  // inclut le dropdown quand il est ouvert
                onEnter: () => { goToConfig(); }
            },

            // --- Wizard étape 1 : recherche + sélection ---
            {
                target: '#objectSearch',
                titleKey: 'tutorialStep1Title',
                bodyKey:  'tutorialStep1Body',
                placement: 'top',   // bubble au-dessus pour laisser visible la liste de résultats
                includeTargets: ['#searchResults', '#recentItems', '#selectedItem'],
                onEnter: () => { goToConfig(); goWizardBackTo(1); },
                waitHintKey: 'tutorialHintPickObject',
                // Avance dès qu'un objet est sélectionné (wizardNext1 cesse d'être disabled)
                waitFor: waitBtnEnabled('wizardNext1')
            },
            // Étape dédiée au bouton "Suivant" du wizard (1→2)
            {
                target: '#wizardNext1',
                titleKey: 'tutorialStepNextWizardTitle',
                bodyKey:  'tutorialStepNextWizard1Body',
                placement: 'top',
                waitHintKey: 'tutorialHintClickNext',
                waitFor: waitWizardStepActive(2)
            },

            // --- Wizard étape 2 : niveaux ---
            {
                target: '.level-selectors-wizard, #startLevel',
                titleKey: 'tutorialStep3Title',
                bodyKey:  'tutorialStep3Body',
                placement: 'top'
                // Pas de waitFor : l'utilisateur ajuste librement, puis clique sur Suivant dans la bulle.
            },
            // Étape dédiée au bouton "Suivant" du wizard (2→3)
            {
                target: '#wizardNext2',
                titleKey: 'tutorialStepNextWizardTitle',
                bodyKey:  'tutorialStepNextWizard2Body',
                placement: 'top',
                waitHintKey: 'tutorialHintClickNext',
                waitFor: waitWizardStepActive(3)
            },

            // --- Wizard étape 3a : prix des parchemins / objets d'amélioration ---
            {
                target: '#upgradeItemPrices',
                titleKey: 'tutorialStep4Title',
                bodyKey:  'tutorialStep4Body',
                placement: 'top'
            },
            // --- Wizard étape 3b : matériaux (sauté si l'objet n'en requiert pas) ---
            {
                target: '#materialSection',
                titleKey: 'tutorialStepMaterialsTitle',
                bodyKey:  'tutorialStepMaterialsBody',
                placement: 'top',
                skipIf: () => !hasMaterialsSection()
            },

            // --- Bouton Analyser ---
            {
                target: '#analyzeBtn',
                titleKey: 'tutorialStep5Title',
                bodyKey:  'tutorialStep5Body',
                placement: 'top',
                waitHintKey: 'tutorialHintAnalyze',
                waitFor: waitAnalyzeOrTabEnabled
            },

            // --- Analyse : déroulé HAUT → BAS de la page ---
            // 1) Onglet Analyse (header)
            {
                target: () => {
                    const btn = document.getElementById('analysisTabBtn');
                    return btn && !btn.classList.contains('disabled') ? btn : null;
                },
                titleKey: 'tutorialStep6Title',
                bodyKey:  'tutorialStep6Body',
                placement: 'bottom',
                onEnter: () => goToAnalysis()
            },
            // 2) Choix de scénario (cartes en haut du panneau)
            {
                target: '#strategiesComparison',
                titleKey: 'tutorialStep7Title',
                bodyKey:  'tutorialStep7Body',
                placement: 'bottom',
                onEnter: () => goToAnalysis()
            },
            // 3) ⭐ Pierre philosophale : le chemin d'amélioration ⭐
            {
                target: () => document.querySelector('.scenario-pane.active .pane-path-section')
                           || document.querySelector('.pane-path-section'),
                titleKey: 'tutorialStepPathTitle',
                bodyKey:  'tutorialStepPathBody',
                placement: 'top'
            },
            // 4) Liste de préparation (plus bas dans le panneau)
            {
                target: () => document.querySelector('.scenario-pane.active .pane-preparation'),
                titleKey: 'tutorialStep9Title',
                bodyKey:  'tutorialStep9Body',
                placement: 'top'
            },
            // 5) Graphique de probabilité (tout en bas)
            {
                target: '#strategyDetails',
                titleKey: 'tutorialStep8Title',
                bodyKey:  'tutorialStep8Body',
                placement: 'top'
            },
            // --- Bouton relance ---
            {
                target: '#tutorialReplayBtn',
                titleKey: 'tutorialFinalTitle',
                bodyKey:  'tutorialFinalBody',
                placement: 'bottom'
            }
        ];
    }

    // ===== Persistance =====================================================

    _isDone() {
        try { return localStorage.getItem(STORAGE_KEY) === '1'; }
        catch { return false; }
    }

    _markDone() {
        try { localStorage.setItem(STORAGE_KEY, '1'); }
        catch {}
    }
}
