# Upways

Optimiseur d'amélioration Metin2 : calcule la stratégie la moins coûteuse pour monter un objet,
avec la distribution exacte du nombre de tentatives (médiane, percentiles) — https://metin2upways.com

## Lancer le site en local

Les modules JavaScript ne se chargent pas en `file://` : il faut un petit serveur.

```bash
python -m http.server 8000
```

Puis ouvrir http://localhost:8000

## Tests

Aucune dépendance à installer (Node 20 ou plus) :

```bash
node --test
```

Les tests figent les résultats actuels du moteur (stratégies de référence, budget, DM/DC, format des
montants, cohérence des 5 langues). Si une modification change un chiffre, le test échoue et montre
l'écart ; si le changement est voulu, mettre à jour la valeur de référence dans `tests/engine.test.mjs`.

## Organisation

| Dossier | Contenu |
|---|---|
| `js/core/` | Moteur de calcul (Calculator, Strategy), DM/DC (`DmDcProbabilities.js`), budget (`Budget.js`), familiers (`PetSkills.js`), traductions |
| `js/services/` | Données, stratégies, export image, mesure d'audience |
| `js/components/` | Interface (recherche, configuration, analyse, graphiques, DM/DC, tutoriel, familiers) |
| `data/` | Paliers d'amélioration, noms d'objets (5 langues), icônes — voir `data/README.md` |
| `tests/` | Tests de référence |

## Outils (onglets de l'en-tête)

Le site regroupe deux outils, choisis par les onglets de l'en-tête :

- **Amélioration** (`/`) : l'optimiseur d'amélioration.
- **Familiers** (`/?tool=pets`), deux sous-outils choisis par des cartes reliées au panneau :
  - **Compétences** (mis de côté : masqué tant que `PETS_SKILLS_ENABLED` vaut `false` dans
    `js/app.js` ; code et données conservés) : deux réglages seulement, les compétences comparées (par défaut 5, voir
    `DEFAULT_SKILLS`) et le type (T8 par défaut). Puis : (1) le maximum au niveau 105 de chaque familier
    pour ces compétences, trié sur la compétence détaillée ; (2) un clic sur une compétence montre sa
    progression du niveau 81 au 105 en escalier, avec les niveaux où elle augmente — les familiers aux
    valeurs identiques sont regroupés ; (3) sa valeur au niveau 105 de T1 à T8. Valeurs pour une
    compétence au niveau 20.
    Code : `js/components/PetsComponent.js` ; données et noms dans les 5 langues : `js/core/PetSkills.js` ;
    icônes : `data/pets/` et `data/pet-skills/`. Au survol d'une icône de compétence : infobulle du livre
    façon jeu (icône, nom du livre, description) — textes dans
    `js/core/PetSkillInfo.js` (wikis FR et EN ; roumain, turc et allemand traduits),
    affichage `js/components/SkillTooltip.js`.
  - **Mon familier** (`/?tool=pets&view=tracker`) : verdict (bon ou mauvais familier ?) à partir du
    type, de l'âge, du niveau et de la seule valeur affichée aujourd'hui pour PV / Défense / PM (et stats
    Champion). Score de chaque stat : place de la valeur affichée entre le minimum et le maximum
    possibles pour un familier du même type, niveau et âge avec la base moyenne (milieu de la
    fourchette) — 0 % = gain minimum à chaque palier, 50 % = gain moyen, 100 % = gain maximum ; le
    verdict global est la moyenne des scores. Second score : position parmi tous les familiers,
    tous niveaux confondus, entre le plus faible possible (niveau 1, 0 jour, base minimum) et le plus
    fort possible (niveau 105, 800 jours, meilleur type, base et gains maximum). La base à l'éclosion et les paliers précédents sont
    facultatifs (ils ne changent pas le verdict). Avec eux : détail palier par palier, score des
    paliers seuls. Aussi : projection au niveau 105 (moyenne, minimum et maximum possibles),
    comparaison avec un T6 / T7 / T8 moyen du même âge, et pour chaque compétence choisie sa valeur
    (niveau de compétence 20, unité %, m ou sans unité) selon le niveau du familier et ses prochains
    paliers. Hypothèse d'âge : tous les paliers sont comptés avec l'âge saisi (bonus plafonné à
    800 jours). Calculs : `js/core/PetGrowth.js` (fourchettes des 8 types, bonus d'âge) ; interface :
    `js/components/PetTrackerComponent.js`. Les relevés restent dans le navigateur (`localStorage`),
    avec export / import JSON.

Les valeurs des familiers viennent du wiki Metin2 FR (« Page de test »). Pour corriger une valeur,
modifier la série concernée dans `js/core/PetSkills.js` (les écarts connus avec le wiki sont listés en
tête du fichier), puis lancer `node --test`.

Pour ajouter un outil : un lien `.tool-tab` dans l'en-tête de `index.html`, une vue `<main>` à côté de
`#upgradeView` et `#petsView`, et son cas dans `showTool()` (`js/app.js`).

## Ajouter une arme à DM/DC

Ajouter son vnum +0 dans `DMDC_ITEM_VNUMS` (`js/core/DmDcProbabilities.js`) et mettre à jour le nombre
d'armes attendu dans `tests/engine.test.mjs`.

## Mettre à jour Chart.js ou ses plugins

Les versions sont figées dans `index.html` avec une empreinte SRI : le navigateur refuse un fichier
différent. Pour changer de version, modifier l'URL **et** recalculer l'empreinte :

```bash
curl -s https://cdn.jsdelivr.net/npm/chart.js@X.Y.Z/dist/chart.umd.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

## Mesure d'audience

Deux outils gratuits, sans cookies, complémentaires :

1. **Cloudflare Web Analytics** (visites, pays, mobile/ordinateur, sites d'origine) : aucun code.
   Tableau de bord Cloudflare → Workers & Pages → projet → Metrics → Web Analytics → Enable.
2. **Umami** (ce que font les visiteurs : objets analysés, langues, export, partage, budget, DM/DC,
   familiers) :
   créer un compte gratuit sur https://umami.is (offre Hobby), ajouter le site `metin2upways.com`,
   copier son « Website ID » dans `ANALYTICS.websiteId` (`js/core/Constants.js`), puis mettre en ligne.
   Tant que l'identifiant est vide, rien n'est chargé ni envoyé. Les visites en local ne sont pas comptées.

   Pages : l'outil Familiers partage la page d'accueil (`/?tool=pets`) ; il est envoyé à Umami sous
   l'adresse `/familiers` (fonction `umamiPageUrl`, `js/services/AnalyticsService.js`), ses événements
   aussi. Dans Umami : Pages → `/familiers` pour les visites ; Événements pour l'usage détaillé.

   Événements des outils et des familiers :

   | Événement | Quand | Données |
   |---|---|---|
   | `outil` | changement d'outil dans l'en-tête | `outil` |
   | `familiers onglet` | carte Compétences / Mon familier (seulement si Compétences est affiché) | `onglet` |
   | `familiers competence` | compétence ajoutée / retirée de la comparaison | `competence`, `action` |
   | `familiers competences` | boutons Toutes / Aucune / Par défaut | `action` |
   | `familiers type` | type choisi (T1 à T8) | `type` |
   | `familiers detail` | compétence détaillée (clic sur sa colonne) | `competence` |
   | `familiers infobulle` | survol de l'icône d'une compétence (une fois par compétence) | `competence` |
   | `suivi familier` | ajout, exemple, choix d'un familier, suppression, export, import | `action` (+ `familiers`) |
   | `suivi type` / `suivi race` / `suivi stat` | type choisi, race choisie, stat consultée | `type` / `race` / `stat` |
   | `suivi valeur` | première valeur saisie pour une stat, valeur du jour ou palier (une fois par visite) | `stat`, `saisie`, `type` |
   | `suivi base` | base à l'éclosion renseignée (une fois par visite et par stat) | `stat` |
   | `suivi competence` | compétence choisie dans un emplacement | `competence` |
   | `suivi verdict` | premier verdict d'un familier (une fois par visite) | `type`, `verdict`, `exemple`, `base` |
   | `suivi alerte` | alerte « risque de finir sous un T6 / T8 moyen » affichée | `stat`, `type` |

## Mise en ligne

Automatique : chaque `git push` sur `main` déclenche Cloudflare (Workers Builds), qui lance les tests
(`node --test`) puis publie le site (`npx wrangler deploy`). Si un test échoue, rien ne part en ligne.
Suivi : Cloudflare → Workers & Pages → le Worker → Deployments, et une coche verte ou une croix rouge
à côté du commit sur GitHub.

- `wrangler.jsonc` : nom du Worker (identique à celui du tableau de bord) et dossier publié.
- `.assetsignore` : ce qui n'est pas publié (tests, README, fichiers Git, pense-bête…).
- `scripts/stamp-date.mjs` : lancé à chaque mise en ligne, il écrit la date du jour dans le pied de
  page (« Site mis à jour le… ») et dans `sitemap.xml`. La date du moteur de calcul
  (`ENGINE_BUILD_DATE`, `js/core/Constants.js`) ne change qu'à la main, quand les calculs changent.

## Serveur Discord

Invitation permanente : https://discord.gg/a8vwkzD6Qd

Toute la structure du serveur (rôles, catégories, salons, tags du forum, messages d'accueil) est
décrite dans `scripts/discord/setup_server.py` et appliquée par le bot **UpwaysBot** :

```bash
python scripts/discord/setup_server.py --dry-run   # montre ce qui serait fait
python scripts/discord/setup_server.py             # applique
```

- Aucune dépendance. Le script est relançable : il ne modifie que ce qui diffère de sa section
  `CONFIGURATION` et ne supprime jamais rien.
- `discordbot.txt` (racine) : token du bot. Secret : ignoré par Git **et** par `.assetsignore`.
- `scripts/discord/state.json` : identifiants Discord de ce que le script a créé (rien de secret).
- `scripts/discord/server-icon.png` : icône du serveur et avatar du bot.

## Historique

## Upways v3.3 - Intégration de DistributionCalculator

### 📋 Résumé des changements

Cette mise à jour majeure intègre la nouvelle classe `DistributionCalculator` pour calculer des intervalles de confiance précis basés sur la distribution mathématique exacte des essais nécessaires pour améliorer les objets dans Metin2.

### 🆕 Nouvelles fonctionnalités

#### 1. **Calcul de distribution précis**
- Intégration de `DistributionCalculator` qui calcule la distribution exacte du nombre d'essais
- Support des trois méthodes de calcul :
  - **Markov** : Pour les niveaux 1-9 (avec possibilité de régression)
  - **Direct** : Pour les niveaux 10+ (sans régression)
  - **Mixte** : Combinaison des deux pour les plages chevauchantes

#### 2. **Intervalles de confiance basés sur les percentiles**
- Remplacement des intervalles approximatifs par des percentiles exacts :
  - **P5** : 5e percentile (5% des cas nécessitent moins d'essais)
  - **P25** : 25e percentile (premier quartile)
  - **P50** : 50e percentile (médiane)
  - **P75** : 75e percentile (troisième quartile)
  - **P95** : 95e percentile (95% des cas nécessitent moins d'essais)

#### 3. **Amélioration de l'interface utilisateur**
- Les cartes de stratégie affichent maintenant l'intervalle 5%-95% réel
- Option d'afficher les percentiles détaillés (P25, P50, P75)
- Le graphique affiche des lignes pour les percentiles 5% et 95%
- Légende du graphique enrichie avec les percentiles

#### 4. **Configuration des limites de calcul**
```javascript
// Paramètres par défaut
maxTrials: 50000          // Nombre maximum d'essais à calculer
cumulativeSumLimit: 0.999  // Arrêt quand 99.9% de probabilité cumulative

// Modification des limites
app.strategyService.setCalculationLimits(100000, 0.9999);
```

### 📝 Fichiers modifiés

#### **Calculator.js**
- Ajout de la méthode `Matrix.multiply()` manquante
- Classe `DistributionCalculator` déjà présente, prête à l'emploi

#### **StrategyService.js** (v3.3)
- Import et utilisation de `DistributionCalculator`
- Nouvelle méthode `calculatePercentilesFromDistribution()` pour extraire les percentiles
- Nouvelle méthode `calculateIntervalsFromDistribution()` pour créer les intervalles
- Méthode `convertDistributionToCumulative()` pour le graphique
- Configuration des limites de calcul via `setCalculationLimits()`

#### **ChartComponent.js** (v7.2)
- Utilisation directe de la distribution fournie par la stratégie
- Affichage des lignes de percentiles 5% et 95% sur le graphique
- Légende améliorée avec affichage des percentiles
- Support des tooltips enrichis avec informations statistiques

#### **AnalysisComponent.js** (v3.2)
- Mise à jour des cartes de stratégie pour afficher les vrais intervalles 5%-95%
- Affichage optionnel des percentiles détaillés (P25, P50, P75)
- Support complet des nouveaux intervalles dans les tooltips

#### **translations.js**
- Ajout des traductions pour les percentiles dans toutes les langues :
  - `percentiles`, `percentile5`, `percentile25`, `percentile50`, `percentile75`, `percentile95`
  - `confidenceInterval`, `distribution`
  - `interval95` modifié pour clarifier "5% - 95%"

### 🔧 Détails techniques

#### Structure des intervalles

Les intervalles sont maintenant structurés ainsi :
```javascript
intervals: {
    total: {
        mean: number,        // Moyenne calculée depuis la distribution
        std: number,         // Écart-type calculé depuis la distribution
        ci95: {
            lower: number,   // 5e percentile
            upper: number    // 95e percentile
        },
        percentiles: {
            p5: number,
            p25: number,
            p50: number,     // Médiane
            p75: number,
            p95: number
        }
    },
    byLevel: [...]          // Intervalles par niveau (approximation)
}
```

#### Algorithmes utilisés

1. **Méthode Markov** (niveaux 1-9) :
   - Construction d'une matrice de transition
   - Calcul par puissance de matrice pour obtenir la distribution
   - Prise en compte des régressions possibles

2. **Méthode directe** (niveaux 10+) :
   - Distribution binomiale négative pour chaque niveau
   - Convolution des distributions pour le total

3. **Méthode mixte** :
   - Markov jusqu'au niveau 9
   - Convolution avec les distributions géométriques pour 10+

### 🎯 Bénéfices

1. **Précision** : Les intervalles sont maintenant mathématiquement exacts, pas des approximations
2. **Transparence** : Les utilisateurs voient la vraie variabilité des résultats
3. **Flexibilité** : Possibilité d'ajuster la précision selon les besoins
4. **Performance** : Calculs optimisés avec limites configurables

### 🚀 Utilisation

L'intégration est transparente pour l'utilisateur final. Les calculs sont automatiquement effectués lors de l'analyse et les résultats sont affichés dans l'interface.

Pour les développeurs, il est possible d'ajuster les paramètres :
```javascript
// Augmenter la précision (plus lent)
window.app.strategyService.setCalculationLimits(100000, 0.9999);

// Réduire la précision (plus rapide)
window.app.strategyService.setCalculationLimits(10000, 0.99);
```

### 📊 Exemple de résultat

Pour une amélioration de +0 à +9 :
- **Moyenne** : 157 tentatives
- **Intervalle 5%-95%** : 23 - 412 tentatives
- **Médiane (P50)** : 123 tentatives
- **Interprétation** : 
  - 5% des joueurs réussiront en moins de 23 tentatives
  - 50% des joueurs réussiront en moins de 123 tentatives
  - 95% des joueurs réussiront en moins de 412 tentatives

Cette approche donne une vision beaucoup plus réaliste de la variabilité inhérente au système d'amélioration.
