// ============================================================
// shared.js
// Theme toggle logic shared across all pages.
// updateToggleLabel() is defined in navbar.js which loads
// after this file and owns the actual button.
// ============================================================

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = current === 'dark' || (!current && prefersDark);
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  // updateToggleLabel is defined in navbar.js
  if (typeof updateToggleLabel === 'function') updateToggleLabel(next);
}
