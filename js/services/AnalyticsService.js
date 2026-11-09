/**
 * Mesure d'audience — Umami (sans cookies, aucune donnée personnelle).
 *
 * Ne fait rien tant que ANALYTICS.websiteId est vide (voir js/core/Constants.js).
 * Les pages vues sont comptées automatiquement par Umami ; ce service ajoute
 * quelques événements utiles : objet analysé, langue, export, partage, budget, DM/DC.
 */
import { ANALYTICS } from '../core/Constants.js';

export class AnalyticsService {
    constructor(config = ANALYTICS) {
        this.config = config || {};
        this.enabled = typeof document !== 'undefined' && !!this.config.websiteId;
        this.queue = [];
        this.sentOnce = new Set();
        if (this.enabled) this.load();
    }

    load() {
        if (document.querySelector('script[data-upways-analytics]')) return;
        const script = document.createElement('script');
        script.defer = true;
        script.src = this.config.scriptUrl;
        script.dataset.websiteId = this.config.websiteId;
        if (this.config.domains) script.dataset.domains = this.config.domains;
        script.setAttribute('data-upways-analytics', '');
        script.onload = () => this.flush();
        document.head.appendChild(script);
    }

    /**
     * Envoie un événement (nom ≤ 50 caractères, données simples).
     * Sans effet si la mesure d'audience n'est pas activée ou bloquée par le navigateur.
     */
    track(name, data) {
        if (!this.enabled) return;
        const umami = window.umami;
        if (umami && typeof umami.track === 'function') {
            try { umami.track(name, data); } catch (e) { /* jamais bloquant */ }
        } else if (this.queue.length < 20) {
            this.queue.push([name, data]); // envoyé dès que le script est chargé
        }
    }

    /** Envoie un événement une seule fois pour une clé donnée (ex. une fois par analyse). */
    trackOnce(key, name, data) {
        if (this.sentOnce.has(key)) return;
        this.sentOnce.add(key);
        this.track(name, data);
    }

    flush() {
        const pending = this.queue;
        this.queue = [];
        pending.forEach(([name, data]) => this.track(name, data));
    }
}
