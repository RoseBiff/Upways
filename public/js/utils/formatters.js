/**
 * Utilitaires de formatage
 */

/**
 * Formate une valeur de coût
 */
export function formatCost(value) {
    if (!value || value === 0) return '0M';
    
    if (value >= 100) {
        const wons = Math.floor(value / 100);
        const millions = Math.floor(value % 100);
        return `${wons.toLocaleString()}.${millions.toString().padStart(2, '0')}w`;
    }
    return `${Math.floor(value)}M`;
}

/**
 * Formate un nombre avec des séparateurs de milliers
 */
export function formatNumber(value) {
    return value.toLocaleString();
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
export function formatRange(min, max, formatter = formatNumber) {
    return `${formatter(min)} - ${formatter(max)}`;
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
export function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...options
    };
    return new Date(date).toLocaleDateString(undefined, defaultOptions);
}

/**
 * Formate une date et heure
 */
export function formatDateTime(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };
    return new Date(date).toLocaleString(undefined, defaultOptions);
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
export function formatCompactNumber(value) {
    if (value < 1000) return value.toString();
    if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
    if (value < 1000000000) return `${(value / 1000000).toFixed(1)}M`;
    return `${(value / 1000000000).toFixed(1)}B`;
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
export function formatQuantity(qty) {
    if (qty < 1000) return qty.toString();
    return formatCompactNumber(qty);
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
        return formatCost(value);
    }

    formatNumber(value) {
        return formatNumber(value);
    }

    formatPercentage(value, decimals = 0) {
        return formatPercentage(value, decimals);
    }

    formatRange(min, max, formatter = formatNumber) {
        return formatRange(min, max, formatter);
    }

    formatLevel(level) {
        return formatLevel(level);
    }

    formatQuantity(qty) {
        return formatQuantity(qty);
    }

    formatSuccessRate(rate) {
        return formatSuccessRate(rate);
    }

    formatTrials(trials) {
        return `${formatNumber(trials)} ${this.translator.t('trials')}`;
    }

    formatInterval(lower, upper, unit = '') {
        const range = formatRange(Math.ceil(lower), Math.ceil(upper));
        return unit ? `${range} ${unit}` : range;
    }
}