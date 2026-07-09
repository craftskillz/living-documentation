# rules

## Concepts

* [Respecter les contraintes vis-network du diagram editor](./diagram-vis-network-gotchas.md) - Le rendu diagramme dépend de plusieurs contournements vis-network documentés ; les modifier sans les vérifier peut casser le z-order, les formes custom ou le resize.
* [Internationaliser tous les textes visibles](./i18n-user-visible-strings.md) - Tout texte visible par l'utilisateur doit être déclaré dans les catalogues i18n anglais et français, puis consommé via les attributs data-i18n ou window.t.
* [Éviter les magic numbers](./no-magic-numbers.md) - Les valeurs numériques porteuses de sens métier ou technique doivent être nommées par des constantes plutôt que répétées comme littéraux bruts.
* [Préférer le CLI réel pour la coverage serveur](./playwright-coverage-through-cli.md) - La couverture c8 des modules serveur est plus fiable quand Playwright exerce le vrai CLI/serveur via fixtures isolées plutôt que des imports directs de dist dans les specs.
* [Suivre la tâche courante dans WORKLOG](./track-current-work.md) - Les assistants IA doivent lire et maintenir le worklog de tâche courante pour permettre une reprise fiable entre agents.
