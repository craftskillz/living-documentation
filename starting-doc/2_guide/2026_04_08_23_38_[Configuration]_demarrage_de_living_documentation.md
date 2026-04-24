1 . Lancez l'outil en pointant vers votre dossier de documentation, le mieux étant de versionner ce dossier au sein de votre projet :

```bash
npx living-documentation ./docs
```

Le serveur démarre sur le port **4321** par défaut. Ouvrez [http://localhost:4321](http://localhost:4321) dans votre navigateur.

---

### Options disponibles

Pour connaitre toutes les options disponibles faites
```bash
npx living-documentation -h
```

```
Usage: living-documentation [options] [folder]

Serve a local Markdown documentation viewer

Arguments:
  folder               Path to documentation folder (default: ".")

Options:
  -V, --version        output the version number
  -i, --init           Initialize a demo project
  -p, --port <number>  Port to listen on (default: "4321")
  -o, --open           Open browser automatically
  -h, --help           display help for command
```