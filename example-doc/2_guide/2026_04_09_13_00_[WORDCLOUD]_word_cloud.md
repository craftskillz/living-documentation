## Word Cloud — visualiser le vocabulaire dominant

Le **Word Cloud** génère un nuage de mots à partir du contenu de n'importe quel dossier de votre système de fichiers. Utile pour identifier les thèmes dominants d'une base de code ou d'une documentation.

---

### Lancer le Word Cloud

1. Cliquez sur **`☁ Word Cloud`** dans le header principal.

   Un overlay plein écran s'ouvre.

2. Dans le champ **Search root**, saisissez le chemin du dossier à analyser.

   Vous pouvez aussi cliquer **`Browse`** pour naviguer dans votre système de fichiers et sélectionner un dossier.

3. Cochez les **extensions de fichiers** à inclure dans l'analyse :

   | Famille    | Extensions disponibles                        |
   |------------|-----------------------------------------------|
   | Docs       | `.md`, `.txt`                                 |
   | JS/TS      | `.js`, `.ts`, `.jsx`, `.tsx`                  |
   | JVM        | `.java`, `.kt`, `.scala`                      |
   | Systèmes   | `.py`, `.go`, `.rs`, `.cs`, `.swift`, `.rb`   |
   | Web        | `.html`, `.css`                               |
   | Config     | `.yml`, `.yaml`, `.json`                      |

4. Cliquez **`Launch`**.

   Living Documentation scanne récursivement le dossier, lit tous les fichiers correspondants, et génère le nuage de mots.

---

### Filtrage automatique

Le Word Cloud applique automatiquement plusieurs filtres pour ne conserver que les mots porteurs de sens :

- **Mots vides humains** (EN + FR) : `the`, `and`, `le`, `de`, `avec`, etc.
- **Mots-clés du langage** : selon les extensions sélectionnées (`function`, `import`, `class`, `return`…)
- **Lignes d'import/package** : supprimées avant la tokenisation

---

### Persistance

Le dossier racine et les extensions sélectionnées sont mémorisés en `localStorage` sous les clés `wc-root` et `wc-exts`. Ils sont rechargés automatiquement à la prochaine ouverture.

---

### Cas d'usage

- **Audit d'une documentation** : vérifier que les termes métier apparaissent bien en bonne place
- **Revue d'une base de code** : détecter les concepts dominants dans un module
- **Onboarding** : donner à un nouveau développeur une vision rapide du vocabulaire du projet
