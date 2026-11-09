# Dossier `data/`

Tout ce qui alimente le simulateur d'amélioration (refine) Metin2.

## `refine_proto.json` — catalogue des paliers

Chaque entrée = un `RefineSet` (un palier +X → +X+1) avec son coût, sa proba et ses matos.

```json
"7": {
  "RefineSet": 7,
  "Cost": 30000,
  "Prob": 50,
  "Materials": [ { "Vnum": 30053, "Count": 1 } ]
}
```

→ "Le palier 7 coûte 30 000 yangs, 50% de réussite, demande 1× item vnum 30053."

## `equipment_refines.json` — lien équipement → paliers

Clé = vnum de base de l'item (+0). Valeur = la liste ordonnée des `RefineSet` à enchaîner pour aller de +0 à +9.

```json
"10": [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

→ "L'Épée (vnum 10) utilise les paliers 1→9 de `refine_proto` pour passer de +0 à +9."

## `item/` — icônes PNG

Fichiers nommés par vnum, ex. `7500.png`, `30053.png`. Vaut pour les équipements comme pour les matériaux (parchemins, pierres, etc.).

## `locale/{de,en,fr,ro,tr}/item_names.json` — noms affichés

Un fichier par langue, mapping vnum → nom jeu.

```json
"10": "Épée+0",
"20": "Épée longue+0"
```

## `guild_blacksmith.png`

Juste l'icône du PNJ forgeron pour l'UI.

---

**En résumé du flow :** on prend un item dans `equipment_refines.json` (vnum 10), on récupère son nom dans `locale/fr/item_names.json` ("Épée"), son icône dans `item/10.png`, et pour chaque niveau +X on va chercher le coût/proba/matos dans `refine_proto.json`.
