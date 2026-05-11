// ── Dark mode toggle ─────────────────────────────────────────────────────────

function loadDarkPref() {
  const saved = localStorage.getItem("ld-dark");
  if (saved !== null) return saved === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDarkMode(dark) {
  document.documentElement.classList.toggle("dark", dark);
  document.getElementById("dark-icon").textContent = dark ? "☀" : "☾";
}

function setupDarkToggle() {
  document.getElementById("dark-toggle").addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("ld-dark", isDark);
    document.getElementById("dark-icon").textContent = isDark ? "☀" : "☾";
  });
}
