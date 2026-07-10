---
type: Rule
title: Avoid magic numbers
description: Numeric values with domain meaning must be named constants instead of repeated raw literals.
tags:
  - code-quality
  - maintainability
id: no-magic-numbers
severity: warning
appliesto:
  - src/**/*.ts
  - src/frontend/**/*.js
---

Numeric values with domain meaning should be named where they are introduced.

Prefer a constant whose name explains the intent:

```ts
const DEFAULT_CUSTOM_SHAPE_SIZE = 65;
```

Avoid repeating raw values in code when the value carries product, rendering, sizing, timing, or protocol meaning.
