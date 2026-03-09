// ============================================================
// shared.js
// Theme toggle functions shared across all pages.
// Both index.html and breakdown.html load this script.
// ============================================================

// -------------------------------------------------------
// toggleTheme()
// Reads the current effective theme (manual or OS default),
// flips it, saves to localStorage, and updates the button.
// -------------------------------------------------------
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = current === 'dark' || (!current && prefersDark);
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateToggleLabel(next);
}

// -------------------------------------------------------
// updateToggleLabel(theme)
// Updates the toggle button text to match the active mode.
// -------------------------------------------------------
function updateToggleLabel(theme) {
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  btn.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

// Set the correct label on initial page load
(function () {
  const storedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
  updateToggleLabel(isDark ? 'dark' : 'light');
})();
