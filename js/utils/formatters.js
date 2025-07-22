/**
 * Utilitaires de formatage
 */

/**
 * Formate une valeur de coût avec séparateur approprié selon la langue
 */
export function formatCost(value, lang = 'fr') {
    if (!value || value === 0) return '0M';
    
    // Déterminer le séparateur décimal selon la langue
    const decimalSeparator = lang === 'en' ? '.' : ',';
    
    if (value >= 100) {
        const wons = Math.floor(value / 100);
        const millions = Math.floor(value % 100);
        return `${wons.toLocaleString(lang)}${decimalSeparator}${millions.toString().padStart(2, '0')}w`;
    }
    return `${Math.floor(value)}M`;
}

/**
 * Formate un nombre avec des séparateurs de milliers selon la langue
 */
export function formatNumber(value, lang = 'fr') {
    return value.toLocaleString(lang);
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(value, decimals = 0) {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Formate une plage de valeurs
 */
export function formatRange(min, max, formatter = formatNumber, lang = 'fr') {
    return `${formatter(min, lang)} - ${formatter(max, lang)}`;
}

/**
 * Formate une durée en secondes
 */
export function formatDuration(seconds) {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}

/**
 * Formate une date
 */
export function formatDate(date, lang = 'fr', options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...options
    };
    return new Date(date).toLocaleDateString(lang, defaultOptions);
}

/**
 * Formate une date et heure
 */
export function formatDateTime(date, lang = 'fr', options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };
    return new Date(date).toLocaleString(lang, defaultOptions);
}

/**
 * Tronque un texte avec des points de suspension
 */
export function truncateText(text, maxLength = 50) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalise la première lettre d'un texte
 */
export function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convertit un nombre en notation compacte (K, M, B)
 */
export function formatCompactNumber(value, lang = 'fr') {
    if (value < 1000) return value.toString();
    if (value < 1000000) return `${(value / 1000).toFixed(1).replace('.', lang === 'fr' ? ',' : '.')}K`;
    if (value < 1000000000) return `${(value / 1000000).toFixed(1).replace('.', lang === 'fr' ? ',' : '.')}M`;
    return `${(value / 1000000000).toFixed(1).replace('.', lang === 'fr' ? ',' : '.')}B`;
}

/**
 * Formate un ratio de succès
 */
export function formatSuccessRate(rate) {
    return `${rate}%`;
}

/**
 * Formate un niveau
 */
export function formatLevel(level) {
    return `+${level}`;
}

/**
 * Formate une quantité d'objets
 */
export function formatQuantity(qty, lang = 'fr') {
    if (qty < 1000) return qty.toString();
    return formatCompactNumber(qty, lang);
}

/**
 * Vérifie si une valeur est numérique
 */
export function isNumeric(value) {
    return !isNaN(value) && isFinite(value);
}

/**
 * Arrondit à un nombre de décimales
 */
export function roundTo(value, decimals = 2) {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
}

/**
 * Classe utilitaire pour créer un formateur avec contexte
 */
export class Formatters {
    constructor(translator) {
        this.translator = translator;
    }

    formatCost(value) {
        const lang = this.translator.getLanguage();
        return formatCost(value, lang);
    }

    formatNumber(value) {
        const lang = this.translator.getLanguage();
        return formatNumber(value, lang);
    }

    formatPercentage(value, decimals = 0) {
        return formatPercentage(value, decimals);
    }

    formatRange(min, max, formatter = formatNumber) {
        const lang = this.translator.getLanguage();
        return formatRange(min, max, formatter, lang);
    }

    formatLevel(level) {
        return formatLevel(level);
    }

    formatQuantity(qty) {
        const lang = this.translator.getLanguage();
        return formatQuantity(qty, lang);
    }

    formatSuccessRate(rate) {
        return formatSuccessRate(rate);
    }

    formatTrials(trials) {
        const lang = this.translator.getLanguage();
        return `${formatNumber(trials, lang)} ${this.translator.t('trials')}`;
    }

    formatInterval(lower, upper, unit = '') {
        const lang = this.translator.getLanguage();
        const range = formatRange(Math.ceil(lower), Math.ceil(upper), formatNumber, lang);
        return unit ? `${range} ${unit}` : range;
    }
}