---
type: Document
title: Home Menu
description: Short presentation of the Home menu and the main navigation in Living Documentation.
tags:
  - home
  - menu
  - navigation
  - folders
  - documents
  - search
timestamp: 2026-06-30T10:10:00Z
status: Draft
---

### **Home** Menu

The <kbd>Home</kbd> menu is the entry point to your documentation.

This is where you find your folders, documents, and the main creation actions.

---

### What you see on the left

<!-- layout-columns -->
<!-- col -->
<!-- image-width: 2/3 -->
![Home sidebar showing folders and documents](/images/DOCUMENTATION/readme-sidebar.png)
<!-- col -->
The left column shows:

- the number of available documents
- the folders in your documentation
- Markdown documents
- useful badges: annotations, attachments, statuses

Clicking a document opens it in the main part of the page.
<!-- /layout-columns -->

---

### What you see on the right

<!-- layout-columns -->
<!-- col -->
When you click the Table of contents button <kbd><i class="fa-solid fa-list-ul"></i></kbd>, a column appears on the right side of the screen and displays a clickable table of contents.

Each table of contents item corresponds to a header:

- `# Element` for H1
- `## Element` for H2
- `### Element` for H3, and so on.

<!-- col -->
<!-- image-width: 2/3 -->
![Interactive table of contents](/images/DOCUMENTATION/table_des_matieres_document.png)
<!-- /layout-columns -->

---

### Folders and order

In **Living Documentation**, a **folder** is a real folder on your disk, and a document is a Markdown file inside it.

The explorer shows folders first, then documents, each in alphabetical order. To choose another order, **drag and drop** an entry: up or down to reorder its folder, or onto another folder to move it there.

The order is saved in an invisible `liv-doc-main.md` file in each folder:

<!-- code-width: 1/2 -->
```markdown
---
order:
  - PROCESS
  - welcome.md
hidden:
  - drafts
---
```

To hide a folder or a document, use <kbd>Hide</kbd> on that entry. <kbd>Show hidden items</kbd> brings hidden entries back, greyed out, so you can show them again. A hidden document stays reachable by link.

#### Create a folder

The <kbd>New Folder</kbd> button lets you add a new section to your documentation.

<!-- image-width: 1/3 -->
![Window for creating a new folder in Living Documentation](/images/DOCUMENTATION/popup-creer-dossier.png)

Folder names are automatically normalized so they remain clean on the file system.

Example:

<!-- code-width: 1/3 -->
```text
PROJECT HERMES
```

becomes:

<!-- code-width: 1/3 -->
```text
PROJECT_HERMES
```

#### Create a document

The <kbd>New Document</kbd> button lets you add a Markdown document.

<!-- image-width: 1/2 -->
![Window for creating a new document in Living Documentation](/images/DOCUMENTATION/popup-creer-document.png)

You choose:

- a title
- a destination folder

The file name is generated from the title, for example `prepare-a-meeting.md`. The title and the date are kept in the document frontmatter.

---

### Find content quickly

The Home menu also helps you quickly find a document.

You can:

- browse folders
- open or close folders
- use search
- identify documents with attachments or annotations

### Simple advice

Start with a small number of folders.

Add new sections only when your documentation becomes difficult to browse.
A simple structure is often more useful than an overly detailed tree.
