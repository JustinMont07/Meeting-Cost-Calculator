// ============================================================
// footer.js
// Injects the site-wide footer into every page.
// ============================================================

(function () {
  const footerHtml = `
    <footer class="site-footer">
      <div class="site-footer-inner">
        <span class="site-footer-brand">Meeting Cost Calculator</span>
        <nav class="site-footer-links">
          <a href="mission.html">Our Mission</a>
          <a href="contact.html">Contact</a>
          <a href="legal.html">Terms &amp; Privacy</a>
        </nav>
        <span class="site-footer-note">
          All calculations are estimates only. Not financial advice.
        </span>
      </div>
    </footer>
  `;

  document.body.insertAdjacentHTML('beforeend', footerHtml);
})();
