# Citations

> Un blockquote ordinaire sans titre.

> Un blockquote sur plusieurs lignes et avec titre
>
> <mark>C'est cool ! </mark>

<!-- quote-type: warning -->
<!-- quote-title: Integration tests on macOS (Apple Silicon M5) -->
<!-- quote-icon -->
> On **macOS with Apple Silicon (M5)**, integration tests do not work correctly due to
> communication issues between **Testcontainers** and **Docker**.
>
> **Observed issues:**
> - Testcontainers failing to start or connect to Docker
> - Unstable container networking
> - Timeouts during container initialization
>
> This is a **local development limitation** related to Docker ↔ Testcontainers on macOS Apple Silicon, **not an application issue**.

<!-- quote-type: info -->
<!-- quote-title: Bon à savoir -->
<!-- quote-icon -->
> Un blockquote info sans titre personnalisé afficherait "Info" par défaut.

<!-- quote-type: success -->
<!-- quote-icon -->
> Sans quote-title, on n'a que l'icône si on a coché la checkbox.

<!-- quote-type: error -->
<!-- quote-title: Erreur critique -->
<!-- quote-icon -->
> Quelque chose a vraiment mal tourné.
