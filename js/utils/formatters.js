/**
 * Utilitaires de formatage - Version 2.2
 * Ajout de la fonction pour retirer le niveau d'amélioration
 */

/**
 * Formate une valeur de coût en millions/wons selon la valeur
 * @param {number} value - Valeur en millions
 * @param {string} lang - Code de langue
 */
export function formatCost(value, lang = 'fr') {
    if (!value || value === 0) return '0M';
    
    // Déterminer le séparateur décimal selon la langue
    const decimalSeparator = lang === 'en' ? '.' : ',';
    
    // Si >= 100M, afficher en Wons (1W = 100M)
    if (value >= 100) {
        const wons = value / 100;
        
        // Si c'est un nombre entier de wons
        if (wons === Math.floor(wons)) {
            return `${Math.floor(wons)}w`;
        }
        
        // Sinon, afficher avec 2 décimales
        return `${wons.toFixed(2).replace('.', decimalSeparator)}w`;
    }
    
    // Si < 100M, afficher en millions
    // Si c'est un nombre entier
    if (value === Math.floor(value)) {
        return `${Math.floor(value)}M`;
    }
    
    // Sinon, afficher avec 1 décimale max
    return `${value.toFixed(1).replace('.', decimalSeparator)}M`;
}

/**
 * Formate un nombre avec des séparateurs de milliers selon la langue
 */
export function formatNumber(value, lang = 'fr') {
    return value.toLocaleString(lang);
}

/**
 * Formate un nombre en yang avec séparateurs de milliers
 * @param {number} value - Valeur en yangs
 * @param {string} lang - Code de langue
 */
export function formatYang(value, lang = 'fr') {
    if (!value || value === 0) return '0';
    
    // Utiliser toLocaleString pour avoir les séparateurs appropriés
    return value.toLocaleString(lang) + ' yang';
}

/**
 * Convertit des millions en yangs
 * @param {number} millions - Valeur en millions
 * @returns {number} Valeur en yangs
 */
export function millionsToYang(millions) {
    return millions * 1000000;
}

/**
 * Convertit des yangs en millions
 * @param {number} yang - Valeur en yangs
 * @returns {number} Valeur en millions
 */
export function yangToMillions(yang) {
    return yang / 1000000;
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
 * Normalise une chaîne pour la recherche (enlève accents, met en minuscules)
 */
export function normalizeString(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Enlève les accents
}

/**
 * Retire le niveau d'amélioration (+0) d'un nom d'équipement
 * @param {string} name - Le nom de l'équipement
 * @param {boolean} keepUpgradeLevel - Si true, garde le niveau d'amélioration
 * @returns {string} Le nom sans le niveau d'amélioration
 */
export function removeUpgradeLevel(name, keepUpgradeLevel = false) {
    if (!name || keepUpgradeLevel) return name || '';
    
    // Retirer le +0 à la fin du nom
    return name.replace(/\+0$/, '').trim();
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

    formatYang(value) {
        const lang = this.translator.getLanguage();
        return formatYang(value, lang);
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

    normalizeString(str) {
        return normalizeString(str);
    }
    
    removeUpgradeLevel(name, keepUpgradeLevel = false) {
        return removeUpgradeLevel(name, keepUpgradeLevel);
    }
}