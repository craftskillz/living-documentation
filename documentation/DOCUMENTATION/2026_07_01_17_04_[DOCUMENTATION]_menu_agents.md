---
type: Document
title: Menu Agents
description: Presentation courte du menu Agents pour executer les agents configures dans le Workspace.
tags:
  - agents
  - workspace
  - execution
  - llm
  - run
  - automatisation
  - documentation
timestamp: 2026-07-01T17:04:00Z
status: Draft
---

### Menu **Agents**

Le menu <kbd>Agents</kbd> permet de lancer rapidement les agents que vous avez configurés dans le <kbd>Workspace</kbd>.

Le principe est simple :

- <kbd>Workspace</kbd> sert à créer et configurer les agents
- <kbd>Agents</kbd> sert à les exécuter

Le menu <kbd>Agents</kbd> est disponible depuis n'importe quelle page de **Living Documentation** : Home, Workspace, Admin, Files, Diagrammes, etc.

<!-- image-width: 1/3 -->

![Menu Agents listant les agents disponibles par provider LLM](/images/execution_d_agents.png)

---

### Ce que vous voyez dans le menu

Les agents sont regroupés par provider LLM.

<!-- layout-columns -->

<!-- col -->

Chaque groupe correspond à un modèle ou provider configuré dans le Workspace.

Quand vous ouvrez un groupe, vous voyez les agents disponibles pour ce provider.

<!-- col -->

| Élément                  | Signification                                    |
| ------------------------ | ------------------------------------------------ |
| Provider LLM             | Modèle utilisé pour exécuter l'agent             |
| Agent                    | Tâche documentaire disponible                    |
| Input requis             | L'agent attend une information avant de démarrer |
| Configuration incomplète | L'agent ne peut pas encore être lancé            |

<!-- /layout-columns -->

<!-- quote-type: info -->
<!-- quote-title: Info -->
<!-- quote-icon -->

> Si un agent n'apparaît pas dans ce menu, vérifiez qu'il est bien créé dans le <kbd>Workspace</kbd> et rattaché à un provider LLM.

---

### Lancer un agent

Pour exécuter un agent :

1. cliquez sur <kbd>Agents</kbd>
2. ouvrez le provider LLM souhaité
3. cliquez sur l'agent
4. renseignez l'input si l'agent le demande
5. lancez l'exécution

Certains agents démarrent immédiatement.

D'autres demandent un input, par exemple :

- un id de document
- une question
- un prompt image
- un texte à transformer
- une consigne ponctuelle

---

### Exemple avec input

<!-- layout-columns: 1/2 | gap: sm -->

<!-- col -->

Quand un agent demande une information, **Living Documentation** affiche une popup.

L'input dépend de l'agent.

Dans cet exemple, l'agent attend un prompt complet pour générer une image.

<!-- col -->

<!-- image-width: 2/3 -->

![Popup demandant l'input nécessaire avant d'exécuter un agent](/images/popup_execution_agent.png)

<!-- /layout-columns -->

---

### Pendant l'exécution

Pendant que l'agent travaille, **Living Documentation** affiche des toasts de progression, vous pouvez donc continuer à naviguer dans **Living Documentation** pendant que l'agent travaille.

<!-- layout-columns -->

<!-- col -->

Selon la configuration, vous pouvez voir :

- l'appel au modèle
- les tools utilisés
- les résultats intermédiaires
- un nouvel essai sans tools si le modèle ne les accepte pas

Vous n'avez pas besoin de rester bloqué sur la popup : l'exécution produit un document de résultat.

<!-- col -->

<!-- image-width: full -->

![Toast affichant la progression temps réel d'une exécution agent](/images/feedback_execution_agent.png)

<!-- /layout-columns -->

---

### Le document de résultat

Chaque exécution crée un document de run auquel on peut accéder via un lien direct depuis le toast d'execution.

<!-- image-width: 2/3 -->

![Toast de succès contenant le lien vers le document généré par l'agent](/images/summary_agent_execution.png)

<!-- layout-columns: 1/3 -->

<!-- col -->

Ce document contient généralement :

- l'agent utilisé
- le provider utilisé
- le modèle utilisé
- le statut de l'exécution
- l'input utilisateur
- la réponse de l'agent

<!-- col -->

![Document de run créé après l'exécution d'un agent](/images/run_agent_execution.jpg)

<!-- /layout-columns -->

Si l'option <kbd>Debug agents</kbd> est activée dans <kbd>Admin</kbd>, le document contient aussi les détails techniques de l'exécution **en particulier les différentes conversations réalisées entre les tools et l'agent au cours des itérations agentiques**.

---

### Quand utiliser ce menu ?

Utilisez <kbd>Agents</kbd> quand vous voulez appliquer une tâche déjà préparée.

Exemples :

- traduire un document
- corriger un document
- résumer une note
- générer une image
- transformer un texte en tableau
- améliorer un Markdown existant
- produire un brouillon documentaire

<!-- quote-type: success -->
<!-- quote-title: Quick Win -->
<!-- quote-icon -->

> Un bon agent fait une seule chose, mais la fait souvent et proprement.

---

### Conseil simple

Commencez avec deux ou trois agents très utiles.

Par exemple :

- un agent de correction Markdown
- un agent de traduction
- un agent de génération d'image documentaire

Quand ils sont fiables, ajoutez progressivement des agents plus spécialisés.
