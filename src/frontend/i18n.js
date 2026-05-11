// ── i18n loader ───────────────────────────────────────────────────────────────
// Regular script (not ES module) — works in all three pages.
// Exposes window.t(key), window.initI18n(lang), window.applyI18n().
(function () {
  let _dict = {};

  window.t = function (key) {
    return _dict[key] !== undefined ? _dict[key] : key;
  };

  window.initI18n = async function (lang) {
    try {
      const res = await fetch('/i18n/' + (lang || 'en') + '.json');
      if (res.ok) _dict = await res.json();
    } catch { /* keep empty dict — keys used as fallback text */ }
  };

  window.applyI18n = function () {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = window.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = window.t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = window.t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = window.t(el.dataset.i18nHtml);
    });
  };
})();
