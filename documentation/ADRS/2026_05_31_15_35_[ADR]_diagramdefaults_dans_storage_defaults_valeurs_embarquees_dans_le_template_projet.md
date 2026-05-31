---
**date:** 2026-05-31
**status:** To be validated
**description:** `STORAGE_DEFAULTS` dans `config.ts` inclut désormais des `diagramDefaults` non-null avec des tailles, couleurs et polices spécifiques par type de forme et pour les flèches, afin que tout nouveau projet démarre avec un style visuel cohérent dès la première utilisation.
**tags:** diagram, defaults, config, STORAGE_DEFAULTS, living-doc-json, starter, shapes, arrows, colorKey, fontSize
---

## Contexte

Après l'introduction de `diagramDefaults` dans `StoredConfig`, sa valeur dans `STORAGE_DEFAULTS` était `null`. Tout nouveau projet démarrait donc avec les valeurs système hardcodées (box 100×40, police 13, gris), peu différenciantes et non représentatives d'un usage réel.

## Décision

`STORAGE_DEFAULTS.diagramDefaults` est initialisé avec des valeurs opinionées :

```ts
diagramDefaults: {
  arrows: { arrowDir: 'to', dashes: false, fontSize: 16 },
  shapes: {
    box:        { width: 146, height: 52,  fontSize: 16, colorKey: 'c-lime'   },
    ellipse:    { width: 118, height: 67,  fontSize: 16, colorKey: 'c-red'    },
    circle:     { width: 90,  height: 81,  fontSize: 16, colorKey: 'c-amber'  },
    database:   { width: 121, height: 106, fontSize: 16, colorKey: 'c-cyan'   },
    actor:      { width: 30,  height: 52,  fontSize: 16, colorKey: 'c-gray'   },
    'post-it':  { width: 120, height: 100, fontSize: 13, colorKey: 'c-orange' },
    'text-free':{ width: 123, height: 44,  fontSize: 16, colorKey: 'c-gray'   },
  },
},
```

## Portée

Ces valeurs s'appliquent **uniquement** aux nouveaux projets (pas de `.living-doc.json` existant). `readAndMigrate()` fusionne `STORAGE_DEFAULTS` avec le fichier existant via `{ ...STORAGE_DEFAULTS, ...(raw as Partial<StoredConfig>) }` — les projets existants qui ont déjà `diagramDefaults` dans leur fichier ne sont pas affectés.

Les utilisateurs peuvent modifier ces defaults à tout moment via le panneau ⚙ de l'éditeur de diagrammes.

## Conséquences

- Les nouveaux projets ont immédiatement un style de diagramme utilisable et visuellement différencié par type de forme.
- La valeur `null` reste supportée et signifie "utiliser les valeurs système hardcodées".
- Ce changement est une décision de produit (style par défaut opinioné) et peut être révisé en modifiant `STORAGE_DEFAULTS`.
