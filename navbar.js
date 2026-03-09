// ============================================================
// navbar.js
// Injects the site-wide navigation bar and owns the theme
// toggle button entirely — avoids timing issues with shared.js.
// ============================================================

(function () {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  function activeIf(page) {
    return currentPage === page ? 'active" aria-current="page' : '';
  }

  const navHtml = `
    <nav class="site-nav navbar navbar-expand-md" id="site-navbar">
      <div class="container-fluid px-4">
        <a class="navbar-brand site-nav-brand" href="index.html">Meeting Cost</a>
        <button class="navbar-toggler site-nav-toggler" type="button"
          data-bs-toggle="collapse" data-bs-target="#navbarContent"
          aria-controls="navbarContent" aria-expanded="false"
          aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarContent">
          <ul class="navbar-nav ms-auto gap-1 align-items-md-center">
            <li class="nav-item">
              <a class="nav-link site-nav-link ${activeIf('index.html')}" href="index.html">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link site-nav-link ${activeIf('people.html')}" href="people.html">People</a>
            </li>
            <li class="nav-item">
              <a class="nav-link site-nav-link ${activeIf('breakdown.html')}" href="breakdown.html">Meetings</a>
            </li>
            <li class="nav-item">
              <a class="nav-link site-nav-link ${activeIf('mission.html')}" href="mission.html">Our Mission</a>
            </li>
            <li class="nav-item">
              <a class="nav-link site-nav-link ${activeIf('contact.html')}" href="contact.html">Contact</a>
            </li>
            <li class="nav-item ms-md-2">
              <button class="btn btn-sm site-nav-theme-btn" id="theme-btn" onclick="toggleTheme()">
                ☀️ Light Mode
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `;

  document.body.insertAdjacentHTML('afterbegin', navHtml);

  // Set correct label immediately now that the button is in the DOM
  _updateThemeBtn();
})();

// Called by toggleTheme() in shared.js after every toggle
function updateToggleLabel(theme) {
  _updateThemeBtn(theme);
}

// Internal helper — reads current theme if none passed in
function _updateThemeBtn(theme) {
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  if (!theme) {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = stored === 'dark' || (!stored && prefersDark) ? 'dark' : 'light';
  }
  btn.innerHTML = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}
