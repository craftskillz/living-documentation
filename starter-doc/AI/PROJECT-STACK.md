---
type: Technical Doc
title: PROJECT STACK
---

# PROJECT-STACK - Template

This file gives the AI assistant a short, factual overview of the project. It must stay concise, concrete, and continuously maintained.

It does not replace ADRs: it helps the assistant quickly know where to look, which technologies are involved, and which concepts structure the code. For the detailed reason behind a decision, read the relevant ADRs.

## Maintenance Rule

The AI must propose an update to this file when a task:

- introduces, removes, or replaces an important technology;
- changes a structural convention;
- adds or moves an important source area;
- changes a central business or technical concept;
- makes any information below false or incomplete.

Do not document volatile details, temporary TODOs, or information that clearly belongs in an ADR.

## Overview

Replace this paragraph with a short project description:

- what the project does;
- who it is for;
- where the application code, documentation, and main entry points live.

## Technical Stack

Fill only the lines that actually exist in the project. Remove irrelevant categories.

- **Main language**:
- **Runtime**:
- **Frontend framework**:
- **Backend / server framework**:
- **Database / storage**:
- **External APIs / integrations**:
- **Authentication / authorization**:
- **Styles / design system**:
- **State management**:
- **Build / bundler**:
- **Package manager**:
- **Tests**:
- **Lint / formatting**:
- **Observability / logs**:
- **Deployment / hosting**:

## Useful Source Tree

Describe the folders or files the AI must know to orient itself quickly.

```text
src/                 <- main application code
tests/               <- automated tests
documentation/       <- Living Documentation folder, if this is the project docs folder
```

Adapt this tree to the real project. Do not list the whole repository: keep only what helps an AI find where to work.

## Core Concepts

List concepts that often come up in tasks.

- **Concept 1**: explain in one sentence and point to the useful ADR or document.
- **Concept 2**: explain in one sentence and point to the useful ADR or document.
- **Concept 3**: explain in one sentence and point to the useful ADR or document.

## Structural Conventions

List conventions the AI must respect before changing code.

- Naming convention:
- Module organization:
- Error handling:
- Configuration handling:
- Test strategy:

If a convention becomes durable or comes from an important trade-off, create or update an ADR instead of overloading this file.
