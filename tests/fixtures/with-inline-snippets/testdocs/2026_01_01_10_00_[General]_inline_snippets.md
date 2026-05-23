---
**date:** 2026-01-01
**status:** Accepted
**description:** Fixture document containing snippets that are editable from rendered view mode.
**tags:** test, snippets, inline-edit
---

# Inline Snippets

## Section deux

### Section trois

#### Section quatre

This paragraph has **formatting** that breaks signature search.

This sentence contains <span style="color:#3b82f6;">old inline text</span> for editing.

<div style="background:#eff6ff;border-left:4px solid #3b82f6;color:#1e3a5f;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">

Old section body

</div>

| En-tête 1 | En-tête 2 | En-tête 3 |
| --------- | --------- | --------- |
| a         | b         | c         |
| d         | e         | f         |
| s         |           |           |
|           | s         |           |

``` javascript
console.log("Hello World!");
```

> Existing quote
>
> — Existing author

- First bullet
  continuation for first bullet
- Second bullet
lazy continuation for second bullet
  - Nested bullet

1. First numbered
   continuation for first numbered
2. Second numbered
lazy continuation for second numbered
   1. Nested numbered
   - Nested bullet under numbered

1. Chercher le groupe lié à l'app Amplify — il est nommé selon le pattern :
   ```yaml
   /aws/amplify/<app-id>
   ```

```
fields @timestamp, msg, err.message, err.stack
| filter level >= 50
| sort @timestamp desc
| limit 100
```

<details><summary>Simple collapsible</summary>

Just a body paragraph.

</details>

<details><summary>Collapsible with inner code</summary>

Some intro text.

```markdown
![image](./images/foo.png)
```

</details>

<!-- table-style: compact -->
<!-- table-border: bordered -->
<!-- table-color: info -->
| Name | Age |
| ---- | ---:|
| Youssef | 42 |
