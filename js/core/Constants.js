export const SCROLL_IDS = {
  BLESSING_SCROLL: 25040,
  BLACKSMITH_MANUAL: 39007,
  DRAGON_GOD_SCROLL: 39022,
  WAR_SCROLL: 39014,
  MAGIC_STONE: 25041,
};

export const SCROLLS = {
    [SCROLL_IDS.BLESSING_SCROLL]: {
        id: SCROLL_IDS.BLESSING_SCROLL,
        name: "Blessing Scroll",
        fixedRates: null,
        canRetro: true,
    },
    [SCROLL_IDS.BLACKSMITH_MANUAL]: {
        id: SCROLL_IDS.BLACKSMITH_MANUAL,
        name: "Blacksmith Manual",
        fixedRates: [100, 100, 100, 100, 70, 60, 50, 30, 20],
        canRetro: true,
    },
    [SCROLL_IDS.DRAGON_GOD_SCROLL]: {
        id: SCROLL_IDS.DRAGON_GOD_SCROLL,
        name: "Dragon God Scroll",
        fixedRates: [100, 100, 100, 100, 45, 40, 35, 25, 20],
        canRetro: true,
    },
    [SCROLL_IDS.WAR_SCROLL]: {
        id: SCROLL_IDS.WAR_SCROLL,
        name: "War Scroll",
        fixedRates: [100, 100, 100, 100],
        canRetro: true,
    },
    [SCROLL_IDS.MAGIC_STONE]: {
        id: SCROLL_IDS.MAGIC_STONE,
        name: "Magic Stone",
        fixedRates: null,
        canRetro: false,
    },
};

export const SCROLL_LIMIT = 9;

/**
 * Version et date du moteur de calcul (affichées en footer).
 * À mettre à jour lorsqu'une correction ou une amélioration mathématique est déployée
 * (voir README pour l'historique).
 */
export const ENGINE_VERSION = '3.3.1';
export const ENGINE_BUILD_DATE = '2026-04-16';
/**
 * Mesure d'audience (Umami, sans cookies). Désactivée tant que websiteId est vide.
 * Pour l'activer : créer un compte gratuit sur umami.is, ajouter le site, coller ici
 * son « Website ID » puis mettre en ligne. Voir README > Mesure d'audience.
 */
export const ANALYTICS = {
    websiteId: '5b0525cd-90e3-4541-81cf-edbd1d846a94', // identifiant du site Umami (public, visible dans la page)
    scriptUrl: 'https://cloud.umami.is/script.js',
    domains: 'metin2upways.com,www.metin2upways.com' // les visites en local ne sont pas comptées
};
