---
type: Document
title: Demarrage De Living Documentation
---

1 . Pour ouvrir un dossier de documentation existant, lancez l'outil en pointant vers ce dossier. Le mieux est de versionner ce dossier au sein de votre projet :

```bash
npx living-ai-documentation ./docs
```

Le serveur démarre sur le port **4321** par défaut. Ouvrez [http://localhost:4321](http://localhost:4321) dans votre navigateur.

Pour créer un nouveau projet de documentation, lancez la commande sans chemin :

```bash
npx living-ai-documentation
```

L'outil demande alors le dossier à créer, vérifie qu'il n'est pas non vide, puis demande la langue du starter (`en` ou `fr`).

---

### Options disponibles

Pour connaitre toutes les options disponibles faites

```bash
npx living-ai-documentation -h
```

```
Usage: living-ai-documentation [options] [folder]

Serve a local Markdown documentation viewer over HTTP on your machine.

Arguments:
  folder                         Relative path to an existing documentation
                                 folder. Omit it to start the interactive
                                 initializer.

Options:
  -V, --version                  output the version number
  --starter-language <language>  Starter language for the interactive
                                 initializer: en or fr
  -p, --port <number>            HTTP port to listen on (1-65535) (default:
                                 "4321")
  -o, --open                     Open the viewer in the default browser after
                                 startup
  -h, --help                     display help for command
```
