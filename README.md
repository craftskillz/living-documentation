# Living Documentation

A CLI tool that serves a local Markdown documentation viewer in your browser.

No cloud, no database, no build step — just point it at a folder of `.md` files.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## Features

- **Sidebar** grouped by category, sorted by date (newest first)
- **Full-text search** — instant filter + server-side content search
- **Dark mode** — follows system preference, manually toggleable
- **Export to PDF** — print-friendly layout via `window.print()`
- **Deep links** — share a direct URL to any document (`?doc=…`)
- **Admin panel** — configure title, theme, filename pattern in the browser
- **Zero frontend build** — Tailwind and highlight.js loaded from CDN

---

## Quick start

```bash
npx living-documentation ./path/to/docs
```

Then open [http://localhost:4321](http://localhost:4321).

---

## Installation

### npx (no install)

```bash
npx living-documentation ./docs
```

### Global install

```bash
npm install -g living-documentation
living-documentation ./docs
```

### Local development

```bash
git clone <repo>
cd living-documentation
npm install
npm run dev -- ./docs        # runs via ts-node, no build needed
```

---

## Usage

```
living-documentation [folder] [options]

Arguments:
  folder                Path to the documentation folder (default: ".")

Options:
  -p, --port <number>   Port to listen on (default: 4321)
  -o, --open            Open browser automatically
  -V, --version         Print version
  -h, --help            Show help
```

**Examples:**

```bash
living-documentation ./docs
living-documentation ./docs --port 4000 --open  # override port
living-documentation .                          # current folder
```

---

## Filename convention

Documents are parsed using this default pattern:

```
YYYY_MM_DD_[Category]_title_words.md
```

| Part | Example | Parsed as |
|------|---------|-----------|
| `2024_01_15` | `2024_01_15` | Date → Jan 15, 2024 |
| `[DevOps]` | `[DevOps]` | Category → DevOps |
| `deploy_pipeline` | `deploy_pipeline` | Title → Deploy Pipeline |

**Full example:**
```
2024_01_15_[DevOps]_deploy_pipeline.md
2024_03_20_[Frontend]_react_hooks_guide.md
2023_11_03_[Backend]_api_versioning_strategy.md
```

Files that don't match the pattern are still shown — they appear under **Uncategorized** with the filename as the title.

---

## Config file

A `.living-doc.json` file is created automatically in your docs folder on first run:

```json
{
  "docsFolder": "/absolute/path/to/docs",
  "filenamePattern": "YYYY_MM_DD_[Category]_title",
  "title": "Living Documentation",
  "theme": "system",
  "port": 4321
}
```

You can edit it manually or use the **Admin panel** at [http://localhost:4321/admin](http://localhost:4321/admin).

---

## Project structure

```
living-documentation/
├── bin/
│   └── cli.ts              CLI entry point
├── src/
│   ├── server.ts            Express app
│   ├── routes/
│   │   ├── documents.ts     Documents API
│   │   └── config.ts        Config API
│   ├── lib/
│   │   ├── parser.ts        Filename parser
│   │   └── config.ts        Config management
│   └── frontend/
│       ├── index.html       Main viewer
│       └── admin.html       Admin panel
├── scripts/
│   └── copy-assets.js       Build helper (copies HTML to dist/)
├── package.json
└── tsconfig.json
```

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/documents` | List all documents with metadata |
| `GET` | `/api/documents/:id` | Get document content + rendered HTML |
| `GET` | `/api/documents/search?q=` | Full-text search |
| `GET` | `/api/config` | Read config |
| `PUT` | `/api/config` | Update config (`title`, `theme`, `filenamePattern`) |

---

## Build

```bash
npm run build    # compiles TypeScript → dist/ and copies HTML assets
```

The compiled package is self-contained inside `dist/`. Only `dist/` is included in the npm publish.

---

## License

MIT
