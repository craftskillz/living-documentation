---
name: MCP create_diagram — conventions et fixes
description: Conventions de layout C4, fixes estimateNodeSize database, edgeLabelWidth par défaut, et feature linkedDiagramId pour drill-down
type: project
---

## Feature `linkedDiagramId` (ajoutée 2026-04-20)

`create_diagram` accepte désormais `linkedDiagramId?: string` sur chaque nœud.
Stocké en JSON comme `nodeLink: { type: 'diagram', value: id }` — cliquer le nœud dans l'éditeur navigue vers le diagramme lié.

**Workflow drill-down C4 :**
1. Créer d'abord le diagramme enfant (ex. Container diagram) → noter son `id`
2. Créer le diagramme parent avec `linkedDiagramId` sur le nœud correspondant
3. Chaîne typique : Context → Container → Component

**Why:** Permet la navigation C4 multi-niveaux sans quitter l'éditeur.

---

## Fix `estimateNodeSize` pour les database shapes (2026-04-20)

Les caps du shape `database` consomment `ry = H × 0.12` en haut et en bas.
Sans correction, le texte était visuellement clippé contre les caps.

**Fix appliqué** dans `src/mcp/tools/diagrams.ts` :
```ts
const rawHFinal = shapeType === 'database' ? rawH / (1 - 0.24) : rawH;
```
Pour 4 lignes : 96px → 128px (corps réel = 97px, caps = 31px, marge confortable).

---

## `edgeLabelWidth` par défaut = 80 (2026-04-20)

Sans `edgeLabelWidth`, les labels d'arête rendaient en une seule ligne très large.
Désormais toutes les edges créées via MCP ont `edgeLabelWidth: 80` → wrapping compact.

**How to apply:** Ne pas remettre `null` — laisser la valeur 80 comme défaut MCP.

---

## Convention de layout C4 Container (2026-04-20)

Layout validé par l'utilisateur :
- **Gauche haut** : callers primaires (personnes/acteurs)
- **Gauche bas** : callers secondaires (APIs entrants, batch) — peut être vide
- **Centre** : système principal (Application Web, etc.)
- **Droite haut** : appelés primaires (device, systèmes externes appelés)
- **Droite bas** : persistence (databases, S3)
- **Bas centre** : annexes (Auth, Observabilité, etc.)

Toutes les positions en multiples de 40.

**How to apply:** Utiliser ce layout pour tout nouveau C4 Container diagram — ne pas revenir au layout top-down symétrique.
