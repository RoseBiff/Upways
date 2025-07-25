\# Guide de modification des logiques d'upgrade



\## Architecture simplifiée



La nouvelle architecture centralise toute la logique de calcul dans la classe `UpgradeCalculator`. Voici les points clés pour modifier facilement les logiques :



\### 1. Modifier la limite Markov/Direct (actuellement niveau 9)



Dans `UpgradeCalculator.js` :

```javascript

constructor() {

&nbsp;   this.MARKOV\_LIMIT = 9; // Changer cette valeur pour modifier la limite

&nbsp;   this.MAX\_MARKOV\_TRIALS = 5000;

}

```



\### 2. Modifier les règles d'optimisation



Dans `StrategyService.js`, méthode `generateOptimalPath()` :

```javascript

// Règles fixes par niveau

const rules = {

&nbsp;   1: "Parchemin de Guerre",

&nbsp;   2: "Parchemin de Guerre", 

&nbsp;   3: "Parchemin de Guerre",

&nbsp;   4: "Parchemin de Guerre"

&nbsp;   // Ajouter d'autres règles fixes ici

};

```



\### 3. Modifier l'heuristique de choix automatique



Dans `StrategyService.js`, méthode `chooseBestMethod()` :

```javascript

chooseBestMethod(level, levelData, methods) {

&nbsp;   const baseRate = levelData?.success\_rate || 0;

&nbsp;   

&nbsp;   // Modifier ces seuils selon vos besoins

&nbsp;   if (level > 9 || baseRate < 20) {

&nbsp;       return "Pierre magique";

&nbsp;   } else if (baseRate < 40) {

&nbsp;       return "Parchemin du Dieu Dragon";

&nbsp;   } else {

&nbsp;       return "Parchemin de bénédiction";

&nbsp;   }

}

```



\### 4. Modifier les taux de succès par type d'amélioration



Dans `UpgradeCalculator.js`, méthode `getUpgradeRate()` :

```javascript

getUpgradeRate(level, upgradeType, baseRate) {

&nbsp;   switch (upgradeType) {

&nbsp;       case "Manuel de Forgeron":

&nbsp;           // Modifier ces tableaux de taux

&nbsp;           return level <= 9 ? \[100, 100, 90, 80, 70, 60, 50, 30, 20]\[level - 1] || 0 : baseRate || 0;

&nbsp;       case "Parchemin du Dieu Dragon":

&nbsp;           return level <= 9 ? \[100, 75, 65, 55, 45, 40, 35, 25, 20]\[level - 1] || 0 : baseRate || 0;

&nbsp;       // Ajouter d'autres types...

&nbsp;   }

}

```



\### 5. Modifier le calcul des intervalles de confiance



Dans `UpgradeCalculator.js`, méthodes `createDirectIntervals()` et `createMixedIntervals()` :

```javascript

createDirectIntervals(waypoints, totalTrials) {

&nbsp;   const totalStd = Math.sqrt(totalTrials); // Modifier cette formule

&nbsp;   const z95 = 1.96; // Modifier pour changer l'intervalle (2.58 pour 99%)

&nbsp;   // ...

}

```



\### 6. Modifier la génération de la courbe de probabilité



Dans `ChartComponent.js`, méthode `generateApproximateCurve()` :

```javascript

// Formule actuelle : P(succès après n essais) = 1 - (1-p)^n

const prob = (1 - Math.pow(1 - avgRate, n)) \* 100;

// Modifier cette formule selon vos besoins

```



\### 7. Ajouter de nouveaux types d'objets d'amélioration



1\. Dans `DataService.js`, ajouter l'ID :

```javascript

this.UPGRADE\_ITEM\_IDS = {

&nbsp;   "Parchemin de bénédiction": 25040,

&nbsp;   // Ajouter ici

&nbsp;   "Nouveau Type": 12345

};

```



2\. Dans `UpgradeCalculator.js`, ajouter la logique dans `getUpgradeRate()`



3\. Ajouter les traductions dans `translations.js`



\### 8. Modifier le niveau maximum



Dans `app.js` :

```javascript

this.config = {

&nbsp;   showIntervals: true,

&nbsp;   maxLevel: 200 // Modifier cette valeur

};

```



\### 9. Optimiser les performances pour niveaux élevés



Pour gérer efficacement les niveaux très élevés (100+), vous pouvez :



1\. Limiter les calculs Markov :

```javascript

// Dans UpgradeCalculator.js

determinePhases(startLevel, endLevel) {

&nbsp;   // Forcer le calcul direct si trop de niveaux

&nbsp;   if (endLevel - startLevel > 50) {

&nbsp;       return {

&nbsp;           onlyDirect: true,

&nbsp;           // ...

&nbsp;       };

&nbsp;   }

&nbsp;   // Logique normale...

}

```



2\. Optimiser l'affichage dans `AnalysisComponent.js` :

```javascript

// Grouper automatiquement les niveaux élevés

if (endLevel > 50) {

&nbsp;   // Logique de groupement

}

```



\### 10. Personnaliser les calculs par item



Pour avoir des comportements différents selon l'item :

```javascript

// Dans StrategyService.js

async calculateOptimalStrategy(itemId, startLevel, endLevel) {

&nbsp;   const itemData = await this.dataService.getItemById(itemId);

&nbsp;   

&nbsp;   // Logique spécifique par item

&nbsp;   if (itemId === "special\_item\_id") {

&nbsp;       // Comportement spécial

&nbsp;   }

&nbsp;   

&nbsp;   // Logique normale...

}

```



\## Points d'extension



\### Ajouter une nouvelle méthode de calcul



1\. Créer une nouvelle classe dans `UpgradeCalculator.js` :

```javascript

calculateNewMethod(params) {

&nbsp;   // Votre logique ici

&nbsp;   return {

&nbsp;       method: 'new\_method',

&nbsp;       waypoints: \[...],

&nbsp;       totalTrials: ...,

&nbsp;       totalCost: ...,

&nbsp;       // ...

&nbsp;   };

}

```



2\. L'intégrer dans la méthode `calculate()` :

```javascript

if (phases.useNewMethod) {

&nbsp;   return this.calculateNewMethod(params);

}

```



\### Modifier la structure des données



Les résultats de calcul ont toujours cette structure :

```javascript

{

&nbsp;   method: 'markov' | 'direct' | 'mixed',

&nbsp;   waypoints: \[], // Essais moyens par niveau (depuis startLevel)

&nbsp;   extendedWaypoints: \[], // Tous les waypoints (niveau 0 à endLevel)

&nbsp;   totalTrials: number,

&nbsp;   totalCost: number,

&nbsp;   intervals: {

&nbsp;       total: { mean, std, ci95: { lower, upper } },

&nbsp;       byLevel: \[...]

&nbsp;   },

&nbsp;   riskLevel: 'low' | 'medium' | 'high',

&nbsp;   path: \[...] // Détails par niveau

}

```



Maintenir cette structure permet de garder la compatibilité avec l'affichage.

