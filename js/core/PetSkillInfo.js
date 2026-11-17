/**
 * Livres de compétence des familiers : nom du livre et description, comme dans l'infobulle du jeu.
 *
 * Sources : wiki Metin2 FR (« Système de familiers ») pour le français, wiki EN (« Pet System »)
 * pour l'anglais. Roumain, turc et allemand : traductions d'Upways à partir de ces textes.
 */

const FR_RES = (cls) => `La maîtrise de cette compétence permet à votre familier d'augmenter votre résistance contre les attaques des ${cls}.`;
const EN_RES = (cls) => `Resistance to ${cls} attacks.`;
const RO_RES = (cls) => `Când însoțitorul tău stăpânește această competență, îți crește rezistența împotriva atacurilor ${cls}.`;
const TR_RES = (cls) => `Petin bu beceride ustalaştığında ${cls} saldırılarına karşı dayanıklılığını artırır.`;
const DE_RES = (cls) => `Beherrscht dein Pet diese Fertigkeit, erhöht es deinen Widerstand gegen Angriffe von ${cls}.`;

/** Nom du livre (titre de l'infobulle) */
export const PET_SKILL_BOOKS = {
    fr: {
        warrior: 'Livre de résistance (Guerrier)', sura: 'Livre de résistance (Sura)', ninja: 'Livre de résistance (Ninja)',
        shaman: 'Livre de résistance (Chamane)', lycan: 'Livre de résistance (Lycan)',
        berserker: 'Livre de Berserker', antiMagic: "Livre d'anti-magie", haste: "Livre d'accélération", drill: 'Livre du Drill',
        restoration: 'Livre du renouvellement', vampirism: 'Livre de vampire', spiritualism: 'Livre des fantômes',
        bulwark: "Livre d'obstacle", reflection: 'Livre du miroir', yang: 'Livre chute des Yangs', range: 'Livre de la portée',
        immortal: "Livre d'invincibilité", panacea: 'Livre de soins', masterBrewer: 'Livre de Maître Brasseur',
        monster: 'Livre chasseur monstres', eagleEye: 'Livre de regard perçant', drain: 'Livre de sangsue', feather: 'Livre de poids plume',
    },
};
/** Autres langues : « Livre » + nom de la compétence */
export const PET_SKILL_BOOK_PATTERN = { en: '{name} Book', ro: 'Carte: {name}', tr: '{name} Kitabı', de: 'Buch: {name}' };

/** Description (texte de l'infobulle) */
export const PET_SKILL_DESCRIPTIONS = {
    fr: {
        warrior: FR_RES('Guerriers'), sura: FR_RES('Suras'), ninja: FR_RES('Ninjas'), shaman: FR_RES('Chamanes'), lycan: FR_RES('Lycans'),
        berserker: 'En maîtrisant cette compétence, votre familier augmente votre valeur d\'attaque.',
        antiMagic: 'En maîtrisant cette compétence, votre familier vous permet de neutraliser la magie de vos adversaires.',
        haste: 'Réduit le temps de recharge de vos skills.',
        drill: 'En maîtrisant cette compétence, les chances de coups perçants augmentent.',
        restoration: 'En maîtrisant cette compétence, votre familier peut restaurer vos PV dès qu\'ils tombent sous les 20 %.',
        vampirism: 'En maîtrisant cette compétence, votre familier vous permet d\'aspirer les PV de vos adversaires.',
        spiritualism: 'En maîtrisant cette compétence, votre familier vous permet d\'aspirer les PM de vos adversaires.',
        bulwark: 'En maîtrisant cette compétence, votre familier vous permet de bloquer les dommages physiques.',
        reflection: 'En maîtrisant cette compétence, votre familier vous permet de renvoyer les dommages physiques.',
        yang: 'En maîtrisant cette compétence, votre familier augmente la chute des Yangs.',
        range: 'En maîtrisant cette compétence, votre familier augmente la portée de votre arc.',
        immortal: 'En maîtrisant cette compétence, votre familier vous confère une certaine chance d\'invincibilité temporaire.',
        panacea: 'Si votre familier maîtrise cette compétence, il peut neutraliser les effets de poisons, de saignements et de ralentissements.',
        masterBrewer: 'En maîtrisant cette compétence, votre familier vous confère une régénération par potion accrue.',
        monster: 'En maîtrisant cette compétence, votre familier augmente l\'effet « force contre les monstres ».',
        eagleEye: 'En maîtrisant cette compétence, votre familier augmente l\'EXP que vous acquérez.',
        drain: 'En maîtrisant cette compétence, votre familier vous rend capable d\'absorber les PV des monstres éliminés.',
        feather: 'En maîtrisant cette compétence, votre familier obtient la compétence de la Foulée de plume.',
    },
    en: {
        warrior: EN_RES('Warrior'), sura: EN_RES('Sura'), ninja: EN_RES('Ninja'), shaman: EN_RES('Shaman'), lycan: EN_RES('Lycan'),
        berserker: 'Attack value increased.',
        antiMagic: 'Reduce enemy magic resistance.',
        haste: 'Skill cooldown reduced.',
        drill: 'Increased chance of piercing hits.',
        restoration: 'HP will be restored as soon as it drops below 20%.',
        vampirism: 'Leech HP from the enemy.',
        spiritualism: 'Leech SP from the enemy.',
        bulwark: 'Physical damage is blocked.',
        reflection: 'Damage taken is reflected back at the enemy.',
        yang: 'Yang drop rate is increased.',
        range: 'Range of your bow is increased.',
        immortal: 'Chance of temporary invincibility.',
        panacea: 'Chance to remove bleeding, slow and poison effects.',
        masterBrewer: 'After learning this skill, your pet increases the effectiveness of regeneration potions.',
        monster: 'After learning this skill, your pet increases the effectiveness of strength against monsters.',
        eagleEye: 'After learning this skill, your pet increases the EXP you gain.',
        drain: 'After learning this skill, your pet gives you the ability to absorb HP from monsters killed.',
        feather: 'After learning this skill, your pet has the Feather Walk ability.',
    },
    ro: {
        warrior: RO_RES('Războinicilor'), sura: RO_RES('Sura'), ninja: RO_RES('Ninja'), shaman: RO_RES('Șamanilor'), lycan: RO_RES('Lycanilor'),
        berserker: 'Când însoțitorul tău stăpânește această competență, îți crește valoarea de atac.',
        antiMagic: 'Când însoțitorul tău stăpânește această competență, reduce rezistența la magie a adversarilor.',
        haste: 'Reduce timpul de reîncărcare al competențelor tale.',
        drill: 'Când însoțitorul tău stăpânește această competență, crește șansa de lovituri perforante.',
        restoration: 'Când însoțitorul tău stăpânește această competență, îți poate reface PV imediat ce scad sub 20%.',
        vampirism: 'Când însoțitorul tău stăpânește această competență, poți absorbi PV de la adversari.',
        spiritualism: 'Când însoțitorul tău stăpânește această competență, poți absorbi PM de la adversari.',
        bulwark: 'Când însoțitorul tău stăpânește această competență, poți bloca daunele fizice.',
        reflection: 'Când însoțitorul tău stăpânește această competență, poți reflecta daunele fizice.',
        yang: 'Când însoțitorul tău stăpânește această competență, crește drop-ul de Yang.',
        range: 'Când însoțitorul tău stăpânește această competență, crește distanța arcului tău.',
        immortal: 'Când însoțitorul tău stăpânește această competență, ai o șansă de invincibilitate temporară.',
        panacea: 'Când însoțitorul tău stăpânește această competență, poate anula efectele de otravă, sângerare și încetinire.',
        masterBrewer: 'Când însoțitorul tău stăpânește această competență, poțiunile de regenerare sunt mai eficiente.',
        monster: 'Când însoțitorul tău stăpânește această competență, crește efectul „putere împotriva monștrilor”.',
        eagleEye: 'Când însoțitorul tău stăpânește această competență, crește EXP-ul pe care îl primești.',
        drain: 'Când însoțitorul tău stăpânește această competență, poți absorbi PV de la monștrii uciși.',
        feather: 'Când însoțitorul tău stăpânește această competență, obține abilitatea Pas de Fulg.',
    },
    tr: {
        warrior: TR_RES('Savaşçı'), sura: TR_RES('Sura'), ninja: TR_RES('Ninja'), shaman: TR_RES('Şaman'), lycan: TR_RES('Lycan'),
        berserker: 'Petin bu beceride ustalaştığında saldırı değerini artırır.',
        antiMagic: 'Petin bu beceride ustalaştığında rakiplerinin büyü direncini düşürür.',
        haste: 'Becerilerinin bekleme süresini kısaltır.',
        drill: 'Petin bu beceride ustalaştığında delici vuruş şansın artar.',
        restoration: 'Petin bu beceride ustalaştığında HP\'n %20\'nin altına düştüğü anda yenileyebilir.',
        vampirism: 'Petin bu beceride ustalaştığında rakiplerinden HP emebilirsin.',
        spiritualism: 'Petin bu beceride ustalaştığında rakiplerinden SP emebilirsin.',
        bulwark: 'Petin bu beceride ustalaştığında fiziksel hasarı engelleyebilirsin.',
        reflection: 'Petin bu beceride ustalaştığında fiziksel hasarı geri yansıtabilirsin.',
        yang: 'Petin bu beceride ustalaştığında Yang düşme oranını artırır.',
        range: 'Petin bu beceride ustalaştığında yayının menzilini artırır.',
        immortal: 'Petin bu beceride ustalaştığında geçici yenilmezlik şansı kazanırsın.',
        panacea: 'Petin bu beceride ustalaştığında zehir, kanama ve yavaşlatma etkilerini kaldırabilir.',
        masterBrewer: 'Petin bu beceride ustalaştığında yenilenme iksirlerinin etkisini artırır.',
        monster: 'Petin bu beceride ustalaştığında “canavarlara karşı güç” etkisini artırır.',
        eagleEye: 'Petin bu beceride ustalaştığında kazandığın EXP\'yi artırır.',
        drain: 'Petin bu beceride ustalaştığında öldürülen canavarlardan HP emebilirsin.',
        feather: 'Petin bu beceride ustalaştığında Tüy Adım yeteneğini kazanır.',
    },
    de: {
        warrior: DE_RES('Kriegern'), sura: DE_RES('Suras'), ninja: DE_RES('Ninjas'), shaman: DE_RES('Schamanen'), lycan: DE_RES('Lykanern'),
        berserker: 'Beherrscht dein Pet diese Fertigkeit, erhöht es deinen Angriffswert.',
        antiMagic: 'Beherrscht dein Pet diese Fertigkeit, senkt es die Magieresistenz deiner Gegner.',
        haste: 'Verringert die Abklingzeit deiner Fertigkeiten.',
        drill: 'Beherrscht dein Pet diese Fertigkeit, steigt die Chance auf durchbohrende Treffer.',
        restoration: 'Beherrscht dein Pet diese Fertigkeit, kann es deine TP wiederherstellen, sobald sie unter 20 % fallen.',
        vampirism: 'Beherrscht dein Pet diese Fertigkeit, kannst du deinen Gegnern TP entziehen.',
        spiritualism: 'Beherrscht dein Pet diese Fertigkeit, kannst du deinen Gegnern MP entziehen.',
        bulwark: 'Beherrscht dein Pet diese Fertigkeit, kannst du körperlichen Schaden blocken.',
        reflection: 'Beherrscht dein Pet diese Fertigkeit, kannst du körperlichen Schaden zurückwerfen.',
        yang: 'Beherrscht dein Pet diese Fertigkeit, erhöht es den Yang-Drop.',
        range: 'Beherrscht dein Pet diese Fertigkeit, erhöht es die Reichweite deines Bogens.',
        immortal: 'Beherrscht dein Pet diese Fertigkeit, hast du eine Chance auf vorübergehende Unbesiegbarkeit.',
        panacea: 'Beherrscht dein Pet diese Fertigkeit, kann es Gift-, Blutungs- und Verlangsamungseffekte aufheben.',
        masterBrewer: 'Beherrscht dein Pet diese Fertigkeit, wirken deine Regenerationstränke stärker.',
        monster: 'Beherrscht dein Pet diese Fertigkeit, verstärkt es den Effekt „Stark gegen Monster“.',
        eagleEye: 'Beherrscht dein Pet diese Fertigkeit, erhöht es die EXP, die du erhältst.',
        drain: 'Beherrscht dein Pet diese Fertigkeit, kannst du TP von getöteten Monstern aufnehmen.',
        feather: 'Beherrscht dein Pet diese Fertigkeit, erhält es die Fähigkeit Federschritt.',
    },
};
