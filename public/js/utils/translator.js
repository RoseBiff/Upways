import { translations } from '../core/translations.js';

/**
 * Gestionnaire de traductions
 */
export class Translator {
    constructor(dataService) {
        this.dataService = dataService;
        this.currentLang = 'fr';
        this.loadLanguage();
    }

    /**
     * Charge la langue sauvegardée
     */
    loadLanguage() {
        const savedLang = this.dataService.loadLanguage();
        if (savedLang && translations[savedLang]) {
            this.currentLang = savedLang;
        }
    }

    /**
     * Change la langue courante
     */
    setLanguage(lang) {
        if (translations[lang]) {
            this.currentLang = lang;
            this.dataService.saveLanguage(lang);
            return true;
        }
        return false;
    }

    /**
     * Obtient la langue courante
     */
    getLanguage() {
        return this.currentLang;
    }

    /**
     * Traduit une clé
     */
    t(key) {
        return translations[this.currentLang]?.[key] || translations['fr']?.[key] || key;
    }

    /**
     * Obtient le nom localisé d'un objet
     */
    getLocalizedName(item, lang = null) {
        const targetLang = lang || this.currentLang;
        
        // Si c'est un string direct, le retourner
        if (typeof item === 'string') return item;
        
        // Si l'objet a un champ names
        if (item && item.names) {
            // Essayer la langue cible
            if (item.names[targetLang]) return item.names[targetLang];
            
            // Fallback: fr -> en -> première langue disponible
            if (item.names.fr) return item.names.fr;
            if (item.names.en) return item.names.en;
            
            // Retourner la première langue disponible
            const availableLanguages = Object.keys(item.names);
            if (availableLanguages.length > 0) {
                return item.names[availableLanguages[0]];
            }
        }
        
        return 'Unknown';
    }

    /**
     * Met à jour tous les éléments avec data-i18n
     */
    updatePageTranslations() {
        // Textes
        document.querySelectorAll('[data-i18n]').forEach(elem => {
            elem.textContent = this.t(elem.getAttribute('data-i18n'));
        });
        
        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
            elem.placeholder = this.t(elem.getAttribute('data-i18n-placeholder'));
        });
        
        // Titres (attribut title)
        document.querySelectorAll('[data-i18n-title]').forEach(elem => {
            elem.title = this.t(elem.getAttribute('data-i18n-title'));
        });
        
        // Attributs aria-label
        document.querySelectorAll('[data-i18n-aria-label]').forEach(elem => {
            elem.setAttribute('aria-label', this.t(elem.getAttribute('data-i18n-aria-label')));
        });
    }

    /**
     * Obtient toutes les langues disponibles
     */
    getAvailableLanguages() {
        return Object.keys(translations);
    }

    /**
     * Vérifie si une langue est disponible
     */
    isLanguageAvailable(lang) {
        return lang in translations;
    }

    /**
     * Obtient le nom d'une langue dans sa propre langue
     */
    getLanguageName(lang) {
        const names = {
            fr: 'Français',
            en: 'English',
            ro: 'Română',
            tr: 'Türkçe',
            de: 'Deutsch'
        };
        return names[lang] || lang;
    }

    /**
     * Obtient le drapeau emoji d'une langue
     */
    getLanguageFlag(lang) {
        const flags = {
            fr: '🇫🇷',
            en: '🇬🇧',
            ro: '🇷🇴',
            tr: '🇹🇷',
            de: '🇩🇪'
        };
        return flags[lang] || '';
    }

    /**
     * Formate une phrase avec des variables
     */
    format(key, variables = {}) {
        let text = this.t(key);
        
        Object.entries(variables).forEach(([varKey, value]) => {
            text = text.replace(new RegExp(`{${varKey}}`, 'g'), value);
        });
        
        return text;
    }

    /**
     * Pluralise une traduction
     */
    plural(key, count) {
        const singular = this.t(key);
        const plural = this.t(`${key}_plural`);
        
        // Si pas de forme plurielle, utiliser le singulier
        if (plural === `${key}_plural`) {
            return singular;
        }
        
        return count === 1 ? singular : plural;
    }

    /**
     * Obtient une traduction avec contexte
     */
    tc(key, context) {
        const contextKey = `${key}_${context}`;
        const translation = this.t(contextKey);
        
        // Si pas de traduction contextuelle, utiliser la normale
        if (translation === contextKey) {
            return this.t(key);
        }
        
        return translation;
    }

    /**
     * Applique les traductions à un élément HTML
     */
    translateElement(element) {
        // Texte
        if (element.hasAttribute('data-i18n')) {
            element.textContent = this.t(element.getAttribute('data-i18n'));
        }
        
        // Placeholder
        if (element.hasAttribute('data-i18n-placeholder')) {
            element.placeholder = this.t(element.getAttribute('data-i18n-placeholder'));
        }
        
        // Title
        if (element.hasAttribute('data-i18n-title')) {
            element.title = this.t(element.getAttribute('data-i18n-title'));
        }
        
        // Aria-label
        if (element.hasAttribute('data-i18n-aria-label')) {
            element.setAttribute('aria-label', this.t(element.getAttribute('data-i18n-aria-label')));
        }
    }

    /**
     * Clone les traductions pour éviter les modifications
     */
    getTranslations(lang = null) {
        const targetLang = lang || this.currentLang;
        return { ...translations[targetLang] };
    }
}