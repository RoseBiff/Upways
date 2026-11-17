/**
 * Valeurs des compétences de familiers (niveaux 81 à 105, types T1 à T8).
 *
 * Source : wiki Metin2 FR (« Page de test », script MediaWiki:Script/Pets.js), relevé du 17/11/2026.
 * Noms officiels : wikis Metin2 FR, EN, RO, TR et DE (pages du système de familiers).
 *
 * Principe :
 *  - chaque compétence a une valeur de base qui ne dépend que du niveau du familier ;
 *  - chaque familier a des compétences « de prédilection » : leur valeur dépend aussi
 *    du type (T1 à T8) et remplace la valeur de base.
 *
 * Données factorisées : une série = 25 valeurs (une par niveau, de 81 à 105).
 * Les séries gardent la numérotation du wiki (V1, V2…) pour pouvoir comparer.
 *
 * Écarts connus avec le wiki :
 *  - V12 (Poids plume, valeur de base) : 14 au niveau 87 sur le wiki, corrigé en 145.
 * À vérifier en jeu (laissé tel quel) :
 *  - Renouvellement de la Petite Meley et de Nessie : T6 et T8 plus faibles que T5 et T7.
 *  - Berserker du Minibourreau ventru en T1-T3 : 7 au niveau 95, sous la valeur de base (8).
 */

export const PET_LEVELS = Array.from({ length: 25 }, (_, i) => 81 + i);
export const PET_TYPES = Array.from({ length: 8 }, (_, i) => i); // index 0 = T1

/** Ordre d'affichage des familiers et des compétences (celui du wiki) */
export const PETS = ["monkey","spider","razador","nemere","dragonette","meley","azrael","executor","baashido","nessie","exedyar","alastor","boss"];
export const PET_SKILLS = ["warrior","sura","ninja","shaman","lycan","berserker","antiMagic","haste","drill","restoration","vampirism","spiritualism","bulwark","reflection","yang","range","immortal","panacea","masterBrewer","monster","eagleEye","drain","feather"];

/** Noms officiels dans les 5 langues du site */
export const PET_NAMES = {
    monkey: {"fr":"Petit singe","en":"Mini Monkey","ro":"Maimuţă Mică","tr":"Küçük Maymun","de":"Kleiner Affe"},
    spider: {"fr":"Petite araignée","en":"Mini Spider","ro":"Păianjen Mic","tr":"Küçük Örümcek","de":"Kleine Spinne"},
    razador: {"fr":"Petit Razador","en":"Mini Razador","ro":"Razador Mic","tr":"Küçük Razadör","de":"Kleiner Razador"},
    nemere: {"fr":"Petit Nemere","en":"Mini Nemere","ro":"Nemere Mic","tr":"Küçük Nemere","de":"Kleiner Nemere"},
    dragonette: {"fr":"Petit dragon","en":"Dragonette","ro":"Dragonette","tr":"Küçük Ejderha","de":"Kleiner Drache"},
    meley: {"fr":"Petite Meley","en":"Mini Meley","ro":"Dragon Roşu","tr":"Küçük Meley","de":"Meleys Baby"},
    azrael: {"fr":"Mini-Azraël","en":"Mini Azrael","ro":"Mini Azrael","tr":"Azrailcik","de":"Azraelchen"},
    executor: {"fr":"Minibourreau ventru","en":"Fat Mini Executor","ro":"Mini Executor Gras","tr":"Tombik Cellatçık","de":"Moppelhenkerchen"},
    baashido: {"fr":"Bébé Baashido","en":"Baby Baashido","ro":"Micul Baashido","tr":"Baashido Yavrusu","de":"Baby Baashido"},
    nessie: {"fr":"Nessie","en":"Nessie","ro":"Nessie","tr":"Nessie","de":"Nessie"},
    exedyar: {"fr":"Exédyar couvécaille","en":"Exedyar Brood","ro":"Micul Exedyar","tr":"Exedyar Yavrusu","de":"Exedyar"},
    alastor: {"fr":"Mini Alastor furieux","en":"Angry Mini Alastor","ro":"Mini Alastor Nervos","tr":"Öfkeli Mini Alastor","de":"Zorniger Mini-Alastor"},
    boss: {"fr":"Commandant bébé","en":"Baby Boss","ro":"Mini Gardian","tr":"Bebek Kumandan","de":"Baby-Kommandant"},
};

/** Noms courts, pour les en-têtes de colonnes (le nom officiel reste au survol) */
export const PET_SHORT_NAMES = {
    monkey: {"fr": "Singe", "en": "Monkey", "ro": "Maimuță", "tr": "Maymun", "de": "Affe"},
    spider: {"fr": "Araignée", "en": "Spider", "ro": "Păianjen", "tr": "Örümcek", "de": "Spinne"},
    razador: {"fr": "Razador", "en": "Razador", "ro": "Razador", "tr": "Razadör", "de": "Razador"},
    nemere: {"fr": "Nemere", "en": "Nemere", "ro": "Nemere", "tr": "Nemere", "de": "Nemere"},
    dragonette: {"fr": "Dragon bleu", "en": "Dragonette", "ro": "Dragonette", "tr": "Ejderha", "de": "Drache"},
    meley: {"fr": "Meley", "en": "Meley", "ro": "Dragon Roșu", "tr": "Meley", "de": "Meley"},
    azrael: {"fr": "Azraël", "en": "Azrael", "ro": "Azrael", "tr": "Azrail", "de": "Azrael"},
    executor: {"fr": "Bourreau", "en": "Executor", "ro": "Executor", "tr": "Cellat", "de": "Henker"},
    baashido: {"fr": "Baashido", "en": "Baashido", "ro": "Baashido", "tr": "Baashido", "de": "Baashido"},
    nessie: {"fr": "Nessie", "en": "Nessie", "ro": "Nessie", "tr": "Nessie", "de": "Nessie"},
    exedyar: {"fr": "Exédyar", "en": "Exedyar", "ro": "Exedyar", "tr": "Exedyar", "de": "Exedyar"},
    alastor: {"fr": "Alastor", "en": "Alastor", "ro": "Alastor", "tr": "Alastor", "de": "Alastor"},
    boss: {"fr": "Commandant", "en": "Baby Boss", "ro": "Gardian", "tr": "Kumandan", "de": "Kommandant"},
};

export const PET_SKILL_NAMES = {
    warrior: {"fr":"Résistance (Guerrier)","en":"Resistance (Warrior)","ro":"Rezistenţă (Războinic)","tr":"Dayanıklılık (Savaşçı)","de":"Widerstand (Krieger)"},
    sura: {"fr":"Résistance (Sura)","en":"Resistance (Sura)","ro":"Rezistenţă (Sura)","tr":"Dayanıklılık (Sura)","de":"Widerstand (Sura)"},
    ninja: {"fr":"Résistance (Ninja)","en":"Resistance (Ninja)","ro":"Rezistenţă (Ninja)","tr":"Dayanıklılık (Ninja)","de":"Widerstand (Ninja)"},
    shaman: {"fr":"Résistance (Chamane)","en":"Resistance (Shaman)","ro":"Rezistenţă (Şaman)","tr":"Dayanıklılık (Şaman)","de":"Widerstand (Schamane)"},
    lycan: {"fr":"Résistance (Lycan)","en":"Resistance (Lycan)","ro":"Rezistenţă (Lycan)","tr":"Dayanıklılık (Lycan)","de":"Widerstand (Lykaner)"},
    berserker: {"fr":"Berserker","en":"Berserker","ro":"Berserker","tr":"Berserker","de":"Berserker"},
    antiMagic: {"fr":"Anti-magie","en":"Anti-Magic","ro":"Anti-Magie","tr":"Büyü Bozma","de":"Magiebruch"},
    haste: {"fr":"Accélération","en":"Haste","ro":"Grabă","tr":"Hızlandırma","de":"Beschleunigung"},
    drill: {"fr":"Drill","en":"Drill","ro":"Antrenament","tr":"Talim","de":"Drill"},
    restoration: {"fr":"Renouvellement","en":"Restoration","ro":"Restaurare","tr":"Yenileme","de":"Erneuerung"},
    vampirism: {"fr":"Vampire","en":"Vampirism","ro":"Vampirism","tr":"Vampir","de":"Vampir"},
    spiritualism: {"fr":"Fantômes","en":"Spiritualism","ro":"Spiritism","tr":"Hayalet","de":"Geister"},
    bulwark: {"fr":"Obstacle","en":"Bulwark","ro":"Obstrucţie","tr":"Engel","de":"Hindernis"},
    reflection: {"fr":"Miroir","en":"Reflection","ro":"Reflexie","tr":"Ayna","de":"Spiegel"},
    yang: {"fr":"Chute de Yangs","en":"Yang Drop","ro":"Drop Yang","tr":"Yang Düşürme","de":"Yang Drop"},
    range: {"fr":"Portée","en":"Range","ro":"Distanţă","tr":"Menzil","de":"Reichweite"},
    immortal: {"fr":"Invincibilité","en":"Immortal","ro":"Imortalitate","tr":"Yenilmezlik","de":"Unbesiegbarkeit"},
    panacea: {"fr":"Soins","en":"Panacea","ro":"Remediu","tr":"İyileştirme","de":"Heilung"},
    masterBrewer: {"fr":"Maître brasseur","en":"Master Brewer","ro":"Maestrul Licorilor","tr":"Mayalama Ustası","de":"Braumeister"},
    monster: {"fr":"Chasseur de monstres","en":"Monster Hunter","ro":"Maestru Vânător","tr":"Canavar Avcısı","de":"Monsterjäger"},
    eagleEye: {"fr":"Regard perçant","en":"Eagle Eyes","ro":"Ochi de Vultur","tr":"Kavrayış","de":"Scharfblick"},
    drain: {"fr":"Sangsue","en":"Life Drain","ro":"Absorbția Vieții","tr":"Can Çekme","de":"Lebensentzug"},
    feather: {"fr":"Poids plume","en":"Light as a Feather","ro":"Ușor ca un Fulg","tr":"Tüy Gibi","de":"Federleicht"},
};

/**
 * Unité des valeurs (wiki DE, tableau « Fertigkeitswerte ») : % sauf la portée (mètres),
 * le renouvellement (PV rendus) et poids plume (valeur sans unité).
 */
export const PET_SKILL_UNITS = { range: 'm', restoration: '', feather: '' };
export const petSkillUnit = (skill) => PET_SKILL_UNITS[skill] ?? '%';

const SERIES = {
    V1: [9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12],
    V2: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    V3: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10],
    V4: [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 18, 18],
    V5: [5400, 5466, 5533, 5600, 5666, 5733, 5800, 5866, 5933, 6000, 6066, 6133, 6200, 6266, 6333, 6400, 6466, 6533, 6600, 6666, 6733, 6800, 6866, 6933, 7000],
    V6: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    V7: [5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7],
    V8: [9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12],
    V9: [82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106],
    V10: [2.1, 2.2, 2.2, 2.2, 2.2, 2.2, 2.3, 2.3, 2.3, 2.3, 2.4, 2.4, 2.4, 2.5, 2.5, 2.5, 2.5, 2.5, 2.6, 2.6, 2.6, 2.7, 2.7, 2.7, 2.7],
    V11: [33, 33, 34, 34, 34, 35, 35, 35, 36, 36, 37, 37, 37, 37, 38, 38, 38, 39, 39, 39, 39, 40, 40, 40, 41],
    V12: [135, 136, 138, 140, 141, 143, 145, 146, 148, 150, 151, 153, 155, 156, 158, 160, 161, 163, 165, 166, 168, 170, 171, 173, 175],
    V13: [5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    V14: [6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
    V15: [7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    V16: [8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    V17: [84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108],
    V18: [88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112],
    V19: [92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116],
    V20: [10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13],
    V21: [11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14],
    V22: [5466, 5533, 5600, 5666, 5733, 5800, 5866, 5933, 6000, 6066, 6133, 6200, 6266, 6333, 6400, 6466, 6533, 6600, 6666, 6733, 6800, 6866, 6933, 7000, 7066],
    V23: [5533, 5600, 5666, 5733, 5800, 5866, 5933, 6000, 6066, 6133, 6200, 6266, 6333, 6400, 6466, 6533, 6600, 6666, 6733, 6800, 6866, 6933, 7000, 7066, 7133],
    V24: [5600, 5666, 5733, 5800, 5866, 5933, 6000, 6066, 6133, 6200, 6266, 6333, 6400, 6466, 6533, 6600, 6666, 6733, 6800, 6866, 6933, 7000, 7066, 7133, 7200],
    V25: [2.2, 2.2, 2.3, 2.3, 2.3, 2.3, 2.4, 2.4, 2.4, 2.5, 2.5, 2.5, 2.5, 2.5, 2.6, 2.6, 2.6, 2.7, 2.7, 2.7, 2.7, 2.8, 2.8, 2.8, 2.8],
    V26: [2.3, 2.3, 2.4, 2.4, 2.4, 2.5, 2.5, 2.5, 2.5, 2.5, 2.6, 2.6, 2.6, 2.7, 2.7, 2.7, 2.7, 2.8, 2.8, 2.8, 2.8, 2.8, 2.9, 2.9, 2.9],
    V27: [9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11],
    V28: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13],
    V29: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11],
    V30: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12],
    V31: [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13],
    V32: [5733, 5800, 5866, 5933, 6000, 6066, 6133, 6200, 6266, 6333, 6400, 6466, 6533, 6600, 6666, 6733, 6800, 6866, 6933, 7000, 7066, 7133, 7200, 7266, 7333],
    V33: [9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11],
    V34: [10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    V35: [11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13],
    V36: [40, 40, 40, 41, 41, 41, 42, 42, 42, 43, 43, 43, 44, 44, 44, 45, 45, 45, 46, 46, 46, 46, 47, 47, 47],
    V37: [49, 49, 50, 50, 50, 51, 51, 51, 52, 52, 52, 53, 53, 53, 54, 54, 54, 55, 55, 55, 55, 56, 56, 56, 57],
    V38: [60, 60, 60, 61, 61, 61, 62, 62, 62, 63, 63, 63, 64, 64, 64, 65, 65, 65, 66, 66, 66, 66, 67, 67, 67],
    V39: [315, 316, 318, 320, 321, 323, 325, 326, 328, 330, 331, 333, 335, 336, 338, 340, 341, 343, 345, 346, 348, 350, 351, 353, 355],
    V40: [495, 496, 498, 500, 501, 503, 505, 506, 508, 510, 511, 513, 515, 516, 518, 520, 521, 523, 525, 526, 528, 530, 531, 533, 535],
    V41: [635, 636, 638, 640, 641, 643, 645, 646, 648, 650, 651, 653, 655, 656, 658, 660, 661, 663, 665, 666, 668, 670, 671, 673, 675],
    V42: [17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19],
    V43: [19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    V44: [20, 20, 20, 20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22],
    V45: [10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    V46: [11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14, 14],
    V47: [13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15],
    V48: [2.4, 2.5, 2.5, 2.5, 2.5, 2.5, 2.6, 2.6, 2.6, 2.7, 2.7, 2.7, 2.7, 2.8, 2.8, 2.8, 2.8, 2.8, 2.9, 2.9, 2.9, 3, 3, 3, 3],
    V49: [9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11],
    V50: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14],
    V51: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    V52: [9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11],
    V53: [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    V54: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    V55: [14, 14, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16],
    V56: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14],
    V57: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7],
    V58: [7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9],
    V59: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    V60: [735, 736, 738, 740, 741, 743, 745, 746, 748, 750, 751, 753, 755, 756, 758, 760, 761, 763, 765, 766, 768, 770, 771, 773, 775],
};

/** Valeur de base de chaque compétence (série par niveau) */
const BASE = {
    warrior: 'V1',
    sura: 'V1',
    ninja: 'V1',
    shaman: 'V1',
    lycan: 'V1',
    berserker: 'V2',
    antiMagic: 'V3',
    haste: 'V4',
    drill: 'V3',
    restoration: 'V5',
    vampirism: 'V6',
    spiritualism: 'V7',
    bulwark: 'V8',
    reflection: 'V6',
    yang: 'V9',
    range: 'V6',
    immortal: 'V10',
    panacea: 'V11',
    masterBrewer: 'V3',
    monster: 'V2',
    eagleEye: 'V6',
    drain: 'V6',
    feather: 'V12',
};

/** Compétences de prédilection : une série par type, de T1 à T8 */
const BOOSTED = {
    monkey: {
        warrior: ['V20', 'V20', 'V20', 'V20', 'V21', 'V21', 'V21', 'V21'],
        sura: ['V20', 'V20', 'V20', 'V20', 'V21', 'V21', 'V21', 'V21'],
        restoration: ['V22', 'V22', 'V23', 'V23', 'V24', 'V24', 'V24', 'V24'],
        yang: ['V17', 'V17', 'V18', 'V18', 'V19', 'V19', 'V19', 'V19'],
        range: ['V13', 'V13', 'V14', 'V14', 'V15', 'V15', 'V16', 'V16'],
    },
    spider: {
        restoration: ['V22', 'V22', 'V23', 'V23', 'V24', 'V24', 'V24', 'V24'],
        reflection: ['V13', 'V13', 'V14', 'V14', 'V15', 'V15', 'V16', 'V16'],
        range: ['V13', 'V13', 'V14', 'V14', 'V15', 'V15', 'V15', 'V15'],
        immortal: ['V10', 'V10', 'V25', 'V25', 'V26', 'V26', 'V26', 'V26'],
    },
    razador: {
        ninja: ['V20', 'V20', 'V20', 'V20', 'V21', 'V21', 'V21', 'V21'],
        berserker: ['V27', 'V27', 'V27', 'V27', 'V28', 'V28', 'V28', 'V28'],
        drill: ['V29', 'V29', 'V30', 'V30', 'V31', 'V31', 'V31', 'V31'],
        restoration: ['V23', 'V23', 'V24', 'V24', 'V32', 'V32', 'V32', 'V32'],
        range: ['V13', 'V13', 'V14', 'V14', 'V15', 'V15', 'V16', 'V16'],
    },
    nemere: {
        shaman: ['V20', 'V20', 'V20', 'V20', 'V21', 'V21', 'V21', 'V21'],
        antiMagic: ['V33', 'V33', 'V34', 'V34', 'V35', 'V35', 'V35', 'V35'],
        restoration: ['V22', 'V22', 'V23', 'V23', 'V24', 'V24', 'V24', 'V24'],
        range: ['V13', 'V13', 'V14', 'V14', 'V15', 'V15', 'V16', 'V16'],
        panacea: ['V36', 'V36', 'V37', 'V37', 'V38', 'V38', 'V38', 'V38'],
        feather: ['V39', 'V39', 'V40', 'V40', 'V41', 'V41', 'V41', 'V41'],
    },
    dragonette: {
        ninja: ['V20', 'V20', 'V20', 'V20', 'V21', 'V21', 'V21', 'V21'],
        berserker: ['V27', 'V27', 'V27', 'V27', 'V28', 'V28', 'V28', 'V28'],
        drill: ['V29', 'V29', 'V30', 'V30', 'V31', 'V31', 'V31', 'V31'],
        restoration: ['V23', 'V23', 'V24', 'V24', 'V32', 'V32', 'V32', 'V32'],
        range: ['V13', 'V13', 'V14', 'V14', 'V15', 'V15', 'V16', 'V16'],
    },
    meley: {
        haste: ['V42', 'V42', 'V43', 'V43', 'V44', 'V44', 'V44', 'V44'],
        restoration: ['V23', 'V23', 'V24', 'V24', 'V32', 'V24', 'V32', 'V24'],
        bulwark: ['V45', 'V45', 'V46', 'V46', 'V47', 'V47', 'V47', 'V47'],
        immortal: ['V25', 'V25', 'V26', 'V26', 'V48', 'V48', 'V48', 'V48'],
        panacea: ['V36', 'V36', 'V37', 'V37', 'V38', 'V38', 'V38', 'V38'],
        masterBrewer: ['V49', 'V49', 'V34', 'V34', 'V50', 'V50', 'V50', 'V50'],
        monster: ['V51', 'V51', 'V52', 'V52', 'V53', 'V53', 'V53', 'V53'],
    },
    azrael: {
        restoration: ['V22', 'V22', 'V23', 'V23', 'V24', 'V24', 'V24', 'V24'],
        reflection: ['V13', 'V13', 'V14', 'V14', 'V15', 'V15', 'V16', 'V16'],
        range: ['V13', 'V13', 'V14', 'V14', 'V15', 'V15', 'V15', 'V15'],
        immortal: ['V10', 'V10', 'V25', 'V25', 'V26', 'V26', 'V26', 'V26'],
    },
    executor: {
        berserker: ['V54', 'V54', 'V54', 'V27', 'V27', 'V27', 'V55', 'V55'],
        antiMagic: ['V3', 'V3', 'V49', 'V49', 'V49', 'V49', 'V56', 'V56'],
        drill: ['V29', 'V29', 'V30', 'V30', 'V31', 'V31', 'V31', 'V31'],
        restoration: ['V23', 'V23', 'V24', 'V24', 'V24', 'V24', 'V24', 'V24'],
        range: ['V57', 'V57', 'V14', 'V14', 'V15', 'V15', 'V15', 'V15'],
    },
    baashido: {
        lycan: ['V20', 'V20', 'V20', 'V20', 'V21', 'V21', 'V21', 'V21'],
        berserker: ['V27', 'V27', 'V27', 'V27', 'V28', 'V28', 'V28', 'V28'],
        drill: ['V29', 'V29', 'V30', 'V30', 'V31', 'V31', 'V31', 'V31'],
        vampirism: ['V6', 'V6', 'V14', 'V14', 'V15', 'V15', 'V15', 'V15'],
        spiritualism: ['V7', 'V7', 'V58', 'V58', 'V59', 'V59', 'V59', 'V59'],
        yang: ['V17', 'V17', 'V18', 'V18', 'V19', 'V19', 'V19', 'V19'],
        feather: ['V39', 'V39', 'V40', 'V40', 'V41', 'V60', 'V60', 'V60'],
    },
    nessie: {
        haste: ['V42', 'V42', 'V43', 'V43', 'V44', 'V44', 'V44', 'V44'],
        restoration: ['V23', 'V23', 'V24', 'V24', 'V32', 'V24', 'V32', 'V24'],
        bulwark: ['V45', 'V45', 'V46', 'V46', 'V47', 'V47', 'V47', 'V47'],
        immortal: ['V25', 'V25', 'V26', 'V26', 'V48', 'V48', 'V48', 'V48'],
        panacea: ['V36', 'V36', 'V37', 'V37', 'V38', 'V38', 'V38', 'V38'],
        masterBrewer: ['V49', 'V49', 'V34', 'V34', 'V50', 'V50', 'V50', 'V50'],
        monster: ['V51', 'V51', 'V52', 'V52', 'V53', 'V53', 'V53', 'V53'],
    },
    exedyar: {
        lycan: ['V20', 'V20', 'V20', 'V20', 'V21', 'V21', 'V21', 'V21'],
        berserker: ['V27', 'V27', 'V27', 'V27', 'V28', 'V28', 'V28', 'V28'],
        drill: ['V29', 'V29', 'V30', 'V30', 'V31', 'V31', 'V31', 'V31'],
        vampirism: ['V6', 'V6', 'V14', 'V14', 'V15', 'V15', 'V15', 'V15'],
        spiritualism: ['V7', 'V7', 'V58', 'V58', 'V59', 'V59', 'V59', 'V59'],
        yang: ['V17', 'V17', 'V18', 'V18', 'V19', 'V19', 'V19', 'V19'],
        feather: ['V39', 'V39', 'V40', 'V40', 'V41', 'V60', 'V60', 'V60'],
    },
    alastor: {
        berserker: ['V27', 'V27', 'V28', 'V28', 'V55', 'V55', 'V55', 'V55'],
        antiMagic: ['V49', 'V49', 'V34', 'V34', 'V56', 'V56', 'V56', 'V56'],
        drill: ['V29', 'V29', 'V30', 'V30', 'V31', 'V31', 'V31', 'V31'],
        bulwark: ['V45', 'V45', 'V46', 'V46', 'V46', 'V46', 'V47', 'V47'],
        range: ['V57', 'V57', 'V14', 'V14', 'V15', 'V15', 'V15', 'V15'],
        monster: ['V51', 'V51', 'V52', 'V52', 'V52', 'V52', 'V52', 'V52'],
    },
    boss: {
        berserker: ['V27', 'V27', 'V28', 'V28', 'V55', 'V55', 'V55', 'V55'],
        antiMagic: ['V49', 'V49', 'V34', 'V34', 'V56', 'V56', 'V56', 'V56'],
        drill: ['V29', 'V29', 'V30', 'V30', 'V31', 'V31', 'V31', 'V31'],
        bulwark: ['V45', 'V45', 'V46', 'V46', 'V46', 'V46', 'V47', 'V47'],
        range: ['V57', 'V57', 'V14', 'V14', 'V15', 'V15', 'V15', 'V15'],
        monster: ['V51', 'V51', 'V52', 'V52', 'V52', 'V52', 'V52', 'V52'],
    },
};

/**
 * Valeur d'une compétence pour un familier, un type (0 = T1) et un niveau (0 = niveau 81).
 * @returns {{ value: number, boosted: boolean }}
 */
export function getPetSkillValue(pet, skill, type, levelIndex) {
    const boosted = BOOSTED[pet]?.[skill];
    if (boosted) return { value: SERIES[boosted[type]][levelIndex], boosted: true };
    return { value: SERIES[BASE[skill]][levelIndex], boosted: false };
}

/** Compétences de prédilection d'un familier */
export function getPetSpecialties(pet) {
    return Object.keys(BOOSTED[pet] || {});
}
