---
type: Document
title: Blocs De Code
---

# Blocs de code

Les blocs de code sont délimités par trois backticks ` ``` ` suivi du nom du langage. Living Documentation utilise **highlight.js** pour la coloration syntaxique. Le thème, la hauteur maximale et le bouton de copie sont configurables dans le panneau admin.

---

## JavaScript

Coloration syntaxique pour le JS moderne : destructuration, async/await, template literals.

:::compare
```javascript
const response = await fetch("/api/docs/mon-document");
const { html, content } = await response.json();
document.getElementById("viewer").innerHTML = html;
```
:::

## TypeScript

Interfaces, generics, types de retour , tout est coloré distinctement.

:::compare
```typescript
interface DocSummary {
  id: string;
  title: string;
  category: string;
  formattedDate?: string;
}

async function loadDocs(): Promise<DocSummary[]> {
  const res = await fetch("/api/docs");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```
:::

## Bash

Les commandes shell s'affichent avec un style "terminal". Les commentaires `#` sont mis en évidence.

:::compare
```bash
# Démarrer Living Documentation
npx living-ai-documentation

# Sur un port personnalisé
npx living-ai-documentation --port 8080
```
:::

## JSON

Clés, valeurs, booléens et null ont chacun leur couleur.

:::compare
```json
{
  "siteTitle": "Ma Documentation",
  "theme": "system",
  "language": "fr",
  "codeBlockMaxHeight": 400,
  "imageRoundedCorners": true
}
```
:::

## YAML

Idéal pour les pipelines CI/CD, les fichiers de config, les Docker Compose.

:::compare
```yaml
name: CI
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```
:::

## Python

:::compare
```python
import requests

BASE = "http://localhost:4321/api"

def get_docs():
    r = requests.get(f"{BASE}/docs")
    r.raise_for_status()
    return r.json()
```
:::

## SQL

**Syntaxe :**

:::compare
```sql
SELECT
  u.email,
  COUNT(d.id) AS nb_documents,
  MAX(d.created_at) AS derniere_contribution
FROM users u
LEFT JOIN documents d ON d.author_id = u.id
WHERE u.active = true
GROUP BY u.email
ORDER BY nb_documents DESC
LIMIT 10;
```
:::

---

## Bloc long , repliage automatique

Au-delà de la hauteur maximale configurée (défaut : 400 px), le bloc affiche un bouton **"Afficher plus"**. Utile pour coller un fichier entier sans encombrer la page.

:::compare
```typescript
// fichier complet , sera automatiquement replié
import express from "express";
import { readFile, writeFile, readdir } from "fs/promises";
import { join, extname } from "path";

const app = express();
app.use(express.json());

app.get("/api/docs", async (req, res) => {
  const folder = process.env.DOCS_FOLDER ?? "./docs";
  const files = await readdir(folder, { recursive: true });
  const docs = await Promise.all(
    files
      .filter((f) => extname(f) === ".md")
      .map(async (f) => {
        const fullPath = join(folder, f);
        const content = await readFile(fullPath, "utf-8");
        const firstLine = content.split("\n")[0].replace(/^#+\s*/, "");
        return { id: f.replace(".md", ""), title: firstLine };
      }),
  );
  res.json(docs);
});

app.get("/api/docs/:id", async (req, res) => {
  const folder = process.env.DOCS_FOLDER ?? "./docs";
  const filePath = join(folder, `${req.params.id}.md`);
  try {
    const content = await readFile(filePath, "utf-8");
    res.json({ id: req.params.id, content });
  } catch {
    res.status(404).json({ error: "Document not found" });
  }
});

app.put("/api/docs/:id", async (req, res) => {
  const folder = process.env.DOCS_FOLDER ?? "./docs";
  const filePath = join(folder, `${req.params.id}.md`);
  await writeFile(filePath, req.body.content, "utf-8");
  res.json({ ok: true });
});

app.listen(4321, () => console.log("Living Documentation running on :4321"));
```
:::