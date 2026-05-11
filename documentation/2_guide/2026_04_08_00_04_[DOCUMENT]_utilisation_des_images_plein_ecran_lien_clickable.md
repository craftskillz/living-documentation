# En utilisant l'éditeur
<details><summary>Cliquer pour voir les détails</summary>

Si vous ne maitrisez pas le markdown, vous pouvez utiliser l'éditeur de document et insérer un **Snippet** de type :
- lien
- lien vers un document
- lien vers une ancre
- lien vers une ancre d'un autre document
![image](./images/liens_snippets.png)
</details>

---

# En codant
<details><summary>Cliquer pour voir les détails</summary>

Les images peuvent être intégrés dans vos documents de différentes façons mais au final les images sont représentées dans votre document par du code `markdown`

Une image peut être **simple** ou **liée à une destination**

- simple
```markdown
![Découvrons les ADRs](./images/decouverte_adrs.png)
```

- liée à un autre document de `living documentation`
```
[![Découvrons les ADRs](./images/decouverte_adrs.png)](?doc=3_concept%252F2026_04_08_20_58_%255BDOCUMENTING%255D_ADRS)
```

- liée à un **diagramme** de `living documentation`
```
[![The Living Documentation Tool](./images/living_documentation_tool.png)](/diagram?id=d1775684671412)
```

- liée à autre chose (généralement une page web)
```
[![NPM Package Living Documentation](npm_logo.png)](https://www.npmjs.com/package/living-documentation)
```
</details>
