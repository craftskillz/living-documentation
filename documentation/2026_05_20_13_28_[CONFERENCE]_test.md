

<!-- table-border: bordered -->
<!-- table-color: info -->
| Table   | Age |
| ------- | --- |
| Youssef | 10  |
| Youssef | 42  |
| Youssef | 34  |



<!-- code-width: 1/2 -->
<!-- code-align: center -->
```
// code ici

const a="Hello";
console.log(a);
```

<!-- mermaid-width: 1/2 -->
<!-- mermaid-align: center -->
```mermaid
pie title NETFLIX
         "Time spent looking for movie" : 50
         "Time spent watching it" : 30
         "Time spent doing something else" : 20
```

<!-- mermaid-width: 1/2 -->
<!-- mermaid-align: center -->
```mermaid
eventmodeling

tf 01 ui CartUI
tf 02 cmd AddItem
tf 03 evt ItemAdded

```

<!-- mermaid-width: 1/2 -->
<!-- mermaid-align: center -->
```mermaid
radar-beta
  title Restaurant Comparison
  axis food["Food Quality"], service["Service"], price["Price"]
  axis ambiance["Ambiance"]

  curve a["Restaurant A"]{4, 3, 2, 4}
  curve b["Restaurant B"]{3, 4, 3, 3}
  curve c["Restaurant C"]{2, 3, 4, 2}
  curve d["Restaurant D"]{2, 2, 4, 3}

  graticule polygon
  max 5


```

```mermaid
---
config:
  kanban:
    ticketBaseUrl: 'https://mermaidchart.atlassian.net/browse/#TICKET#'
---
kanban
  Todo
    [Create Documentation]
    docs[Create Blog about the new diagram]
  [In progress]
    id6[Create renderer so that it works in all cases. We also add some extra text here for testing purposes. And some more just for the extra flare.]
  id9[Ready for deploy]
    id8[Design grammar]@{ assigned: 'knsv' }
  id10[Ready for test]
    id4[Create parsing tests]@{ ticket: MC-2038, assigned: 'K.Sveidqvist', priority: 'High' }
    id66[last item]@{ priority: 'Very Low', assigned: 'knsv' }
  id11[Done]
    id5[define getData]
    id2[Title of diagram is more than 100 chars when user duplicates diagram with 100 char]@{ ticket: MC-2036, priority: 'Very High'}
    id3[Update DB function]@{ ticket: MC-2037, assigned: knsv, priority: 'High' }

  id12[Can't reproduce]
    id3[Weird flickering in Firefox]

```

```mermaid
mindmap
  root((mindmap))
    Origins
      Long history
      ::icon(fa fa-book)
      Popularisation
        British popular psychology author Tony Buzan
    Research
      On effectiveness<br/>and features
      On Automatic creation
        Uses
            Creative techniques
            Strategic planning
            Argument mapping
    Tools
      Pen and paper
      Mermaid

```

```mermaid
    gitGraph
       commit id: "1"
       commit id: "2"
       branch nice_feature
       checkout nice_feature
       commit id: "3"
       checkout main
       commit id: "4"
       checkout nice_feature
       branch very_nice_feature
       checkout very_nice_feature
       commit id: "5"
       checkout main
       commit id: "6"
       checkout nice_feature
       commit id: "7"
       checkout main
       merge nice_feature id: "customID" tag: "customTag" type: REVERSE
       checkout very_nice_feature
       commit id: "8"
       checkout main
       commit id: "9"
```


```mermaid
quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]
```

```mermaid
flowchart TD
    B["fa:fa-twitter for peace"]
    B-->C[fa:fa-ban forbidden]
    B-->D(fa:fa-spinner)
    B-->E(A fa:fa-camera-retro perhaps?)
```
<!-- image-width: 1/2 -->
<!-- image-align: center -->
![image](/images/top_arbres.png)

```mermaid
pie title CYCLE DOCUMENTAIRE
         "Rédaction initiale" : 50
         "Relecture collective" : 30
         "Publication des mises à jour" : 20
```

```mermaid
timeline
    title FEUILLE DE ROUTE DOCUMENTAIRE
    2023 : Premières notes vivantes
    2024 : Workflow de relecture partagé : Catalogue de diagrammes visuels
    2025 : Documentation assistée par agents
    2026 : Automatisation Workspace
```

```mermaid
sequenceDiagram
    Auteur ->> Relecteur: Le brouillon est prêt pour relecture
    Relecteur -->> Éditeur: Peux-tu valider les notes de publication ?
    Éditeur --x Auteur: Il manque encore un point de checklist
    Relecteur -x Éditeur: Je vais mettre à jour la checklist
    Note right of Éditeur: L'équipe garde des commentaires courts<br/>et actionnables<br/>avant publication.
    Éditeur --> Auteur: La checklist est maintenant alignée
    Auteur -> Relecteur: Peux-tu approuver le guide ?
```

<!-- quote-title: Hello -->
> <!-- table-border: bordered -->
> <!-- table-color: info -->
> | Table   | Age |
> | ------- | --- |
> | Youssef | 10  |
> | Faris   | 42  |
> | Miya    | 34  |

<!-- quote-type: info -->
<!-- quote-title: Info -->
<!-- quote-icon -->
> Citation ici
>
> — Auteur