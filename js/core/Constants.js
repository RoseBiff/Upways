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