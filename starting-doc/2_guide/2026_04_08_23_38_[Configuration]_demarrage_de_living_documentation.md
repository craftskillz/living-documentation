1 . Lancez l'outil en pointant vers votre dossier de documentation, le mieux étant de versionner ce dossier au sein de votre projet :

```bash
npx living-documentation ./docs
```

Le serveur démarre sur le port **4321** par défaut. Ouvrez [http://localhost:4321](http://localhost:4321) dans votre navigateur.

Options disponibles :

```bash
npx living-documentation ./docs --port 3000 --open
```

- `--port` — choisir le port (défaut : 4321)
- `--open` — ouvrir automatiquement le navigateur au démarrage
