---
**date:** 2026-07-01
**status:** Draft
**description:** Presentation courte du menu Workspace pour configurer des providers LLM et des agents documentaires.
**tags:** workspace, agents, llm, mcp, providers, automatisation, documentation
---

### Menu **Workspace**

Le menu <kbd>Workspace</kbd> permet de créer vos propres agents documentaires.

Ces agents peuvent vous aider à rédiger, traduire, résumer, améliorer ou transformer vos documents **Markdown**.

<!-- image-width: 2/3 -->
![Workspace reliant Living Documentation, providers LLM, agents, MCP et provider image](/images/DOCUMENTATION/concept-07-workspace-providers-agents.png)

### A quoi sert le Workspace ?

Le Workspace sert à relier trois éléments :

- un **provider LLM** : le modèle d'IA utilisé
- un **agent** : une consigne métier réutilisable
- les **outils Living Documentation** : lire un document, le mettre à jour, générer une image, etc.

L'idée est simple : au lieu de réécrire le même prompt à chaque fois, vous créez un agent une fois, puis vous le relancez quand vous en avez besoin.

---

### Les principaux nœuds

Dans le Workspace, chaque élément est représenté par un nœud.

<!-- layout-columns -->

<!-- col -->

![image](/images/workspace_configuration.png)

<!-- col -->

| Nœud | Rôle |
| --- | --- |
| **Living Documentation** | Le centre du Workspace. |
| **LLM provider** | Le modèle utilisé par les agents. |
| **Agent** | Une tâche documentaire précise. |
| **MCP** | Les outils internes accessibles aux agents. |

Les LLM et leurs agents ont des code couleurs indiquant leur capacités 
- Jaune : LLM Spécialisés dans la génération d'image
- Orange : LLM Agentic capable d'executer des appels tools chain
- Rose : LLM ChatOnly ans capacités agentiques permettant uniquement de répondre à un prompt

<!-- /layout-columns -->





Un agent est attaché à un provider LLM.

Par exemple :

```text
OpenRouter DeepSeek V4 Pro
└── Agent "Corriger un document Markdown"
```

---

### Créer un provider LLM

Un provider LLM contient les informations nécessaires pour appeler un modèle :

- l'endpoint
- le token API
- le modèle
- le mode d'utilisation des tools

Pour le token, utilisez de préférence une variable d'environnement :

<!-- code-width: 1/3 -->
```text
env:LLM_API_KEY
```

Cela évite d'écrire votre clé API directement dans la configuration.

### Tools ou Chat only ?

Un provider peut fonctionner dans deux modes.

| Mode | Usage |
| --- | --- |
| **Allow MCP tools** | L'agent peut utiliser les outils Living Documentation. |
| **Chat only** | L'agent répond sans appeler d'outil. |

Si votre agent doit lire ou modifier un document, il lui faut généralement le mode **Allow MCP tools**.

Si le modèle refuse les tools, utilisez **Chat only** et demandez-lui seulement une réponse textuelle.

---

### Créer un agent

Un agent est une consigne réutilisable.

Exemple d'agent simple :

<!-- code-width: 2/3 -->
```text
Tu es un assistant de documentation.
Lis le document fourni par l'utilisateur.
Améliore la clarté du texte sans changer le sens.
Conserve le Markdown.
Mets à jour le document quand tu as terminé.
```

Vous pouvez ensuite lancer cet agent en lui donnant l'id d'un document.

### Exemple d'usages

Un agent peut servir à :

- reformuler un document trop brouillon
- corriger les fautes
- traduire un document
- créer une synthèse
- préparer une note de réunion
- générer une image pour illustrer un document
- transformer un texte en tableau
- améliorer un document Markdown avec des snippets

---

### Les documents de run

Quand vous lancez un agent, **Living Documentation** crée un document de résultat.

Ce document contient :

- l'agent utilisé
- le provider utilisé
- l'entrée utilisateur
- la réponse du modèle
- les informations de debug si elles sont activées

Ces documents sont utiles pour garder une trace de ce que l'agent a fait.

Ils sont enregistrés dans l'espace de travail de l'agent, par exemple :

<!-- code-width: 1/2 -->
```text
AI/WORKSPACE/mon_agent/
```

---

### Providers image

Certains providers LLM peuvent être configurés en mode **Image generation**.

Ils servent à générer des images depuis un agent, par exemple pour illustrer un document.

Dans ce cas, le provider possède un identifiant technique que l'agent peut utiliser comme `imageProviderId`.

<!-- quote-type: info -->
<!-- quote-title: Info -->
<!-- quote-icon -->
> Les images générées par agent sont stockées séparément des fichiers joints classiques.

---

### Conseil simple

Commencez avec un seul provider LLM et un seul agent.

Quand ce premier agent fonctionne bien, créez ensuite des agents plus spécialisés : traduction, résumé, correction, illustration, génération de procédure, amélioration Markdown.
