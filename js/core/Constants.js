/**
 * Constantes centralisées pour le système d'amélioration
 */

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
    internalName: "Parchemin de bénédiction",
    fixedRates: null, // Utilise les taux de l'item
    canRetro: true,
  },
  [SCROLL_IDS.BLACKSMITH_MANUAL]: {
    id: SCROLL_IDS.BLACKSMITH_MANUAL,
    name: "Blacksmith Manual",
    internalName: "Manuel de Forgeron",
    fixedRates: [100, 100, 100, 100, 70, 60, 50, 30, 20],
    canRetro: true,
  },
  [SCROLL_IDS.DRAGON_GOD_SCROLL]: {
    id: SCROLL_IDS.DRAGON_GOD_SCROLL,
    name: "Dragon God Scroll",
    internalName: "Parchemin du Dieu Dragon",
    fixedRates: [100, 100, 100, 100, 45, 40, 35, 25, 20],
    canRetro: true,
  },
  [SCROLL_IDS.WAR_SCROLL]: {
    id: SCROLL_IDS.WAR_SCROLL,
    name: "War Scroll",
    internalName: "Parchemin de Guerre",
    fixedRates: [100, 100, 100, 100], // Seulement pour niveaux 1-4
    canRetro: true,
  },
  [SCROLL_IDS.MAGIC_STONE]: {
    id: SCROLL_IDS.MAGIC_STONE,
    name: "Magic Stone",
    internalName: "Pierre magique",
    fixedRates: null, // Utilise les taux de l'item
    canRetro: false, // Pas de rétrogradation
  },
};

export const SCROLL_LIMIT = 9;

// Mapping des noms internes vers IDs pour compatibilité
export const NAME_TO_ID = Object.values(SCROLLS).reduce((acc, scroll) => {
  acc[scroll.internalName] = scroll.id;
  return acc;
}, {});

// Mapping inverse ID vers nom interne
export const ID_TO_NAME = Object.values(SCROLLS).reduce((acc, scroll) => {
  acc[scroll.id] = scroll.internalName;
  return acc;
}, {});