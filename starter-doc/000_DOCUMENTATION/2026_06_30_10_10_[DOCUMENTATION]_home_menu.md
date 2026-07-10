---
type: Document
title: Home Menu
description: Short presentation of the Home menu and the main navigation in Living Documentation.
tags:
  - home
  - menu
  - navigation
  - folders
  - categories
  - documents
  - search
timestamp: 2026-06-30T10:10:00Z
status: Draft
---

### **Home** Menu

The <kbd>Home</kbd> menu is the entry point to your documentation.

This is where you find your folders, categories, documents, and the main creation actions.

---

### What you see on the left

<!-- layout-columns -->
<!-- col -->
<!-- image-width: 2/3 -->
![Home sidebar showing documents organized by categories](/images/DOCUMENTATION/readme-sidebar.png)
<!-- col -->
The left column shows:

- the number of available documents
- the folders in your documentation
- the categories detected in file names
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

### Folders and categories

In **Living Documentation**, folders and categories are not the same thing.

- a **folder** is a real folder on your disk
- a **category** comes from the Markdown file name

For example:

<!-- code-width: 1/2 -->
```text
PROCESS/2026_06_30_10_00_[GUIDE]_prepare_a_meeting.md
```

Here:

- `PROCESS` is the folder
- `GUIDE` is the category
- `prepare_a_meeting` is the document title

#### Create a folder

The <kbd>New Folder</kbd> button lets you add a new section to your documentation.

<!-- image-width: 1/3 -->
![Window for creating a new folder in Living Documentation](/images/DOCUMENTATION/popup-creer-dossier.png)

Folder names are automatically normalized so they remain clean on the file system.

Example:

<!-- code-width: 1/3 -->
```text
204_PROJECT HERMES
```

becomes:

<!-- code-width: 1/3 -->
```text
204_PROJECT_HERMES
```

#### Create a document

The <kbd>New Document</kbd> button lets you add a Markdown document.

<!-- image-width: 1/2 -->
![Window for creating a new document in Living Documentation](/images/DOCUMENTATION/popup-creer-document.png)

You choose:

- a title
- a category
- a destination folder

The file name is then generated automatically according to the pattern configured in <kbd>Admin</kbd>.

---

### Find content quickly

The Home menu also helps you quickly find a document.

You can:

- browse folders
- open or close categories
- use search
- identify documents with attachments or annotations

### Simple advice

Start with a small number of folders.

Add new sections only when your documentation becomes difficult to browse.
A simple structure is often more useful than an overly detailed tree.
