/**
 * Mesure d'audience — Umami (sans cookies, aucune donnée personnelle).
 *
 * Ne fait rien tant que ANALYTICS.websiteId est vide (voir js/core/Constants.js).
 * Les pages vues sont comptées automatiquement par Umami ; ce service ajoute
 * quelques événements utiles : objet analysé, langue, export, partage, budget, DM/DC,
 * clic vers le Discord.
 *
 * Les deux outils partagent la même page (index.html) : l'outil Familiers (?tool=pets) est
 * renommé « /familiers » avant l'envoi à Umami, pour apparaître à part dans les pages vues
 * (et ses événements avec lui).
 */
import { ANALYTICS } from '../core/Constants.js';

/** Fonction appelée par Umami avant chaque envoi (attribut data-before-send) */
const BEFORE_SEND = 'upwaysUmamiBeforeSend';

/**
 * Adresse envoyée à Umami : « /?tool=pets&lang=en » devient « /familiers?lang=en ».
 * Les autres adresses sont inchangées. Garde la forme reçue (relative ou complète).
 */
export function umamiPageUrl(url, origin = 'https://metin2upways.com') {
    if (typeof url !== 'string' || !url) return url;
    try {
        const absolute = /^[a-z][a-z0-9+.-]*:/i.test(url);
        const u = new URL(url, origin);
        if (u.searchParams.get('tool') !== 'pets') return url;
        u.pathname = '/familiers';
        u.searchParams.delete('tool');
        u.searchParams.delete('view');
        const relative = `${u.pathname}${u.search}${u.hash}`;
        return absolute ? `${u.origin}${relative}` : relative;
    } catch (e) {
        return url;
    }
}

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
        // Doit exister avant le chargement du script Umami
        window[BEFORE_SEND] = (type, payload) => {
            if (!payload || typeof payload !== 'object') return payload;
            const origin = window.location.origin;
            return { ...payload, url: umamiPageUrl(payload.url, origin), referrer: umamiPageUrl(payload.referrer, origin) };
        };
        const script = document.createElement('script');
        script.defer = true;
        script.src = this.config.scriptUrl;
        script.dataset.websiteId = this.config.websiteId;
        script.dataset.beforeSend = BEFORE_SEND;
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
