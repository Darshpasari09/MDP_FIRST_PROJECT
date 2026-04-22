/**
 * transitions.js
 * Intercepts every navigation link and applies a page-exit animation
 * before the browser actually navigates.
 */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    // Trigger enter animation when page loads
    document.body.classList.add('page-enter');

    // Intercept all internal link clicks
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      // Skip external, mailto, tel, hash-only, and javascript: links
      if (!href || href.startsWith('http') || href.startsWith('mailto')
          || href.startsWith('tel') || href.startsWith('#')
          || href.startsWith('javascript')) return;

      e.preventDefault();
      navigateTo(href);
    });
  });

  /**
   * Animate out then navigate.
   * Call this from JS (e.g., window.navigate('dashboard.html'))
   * to get transitions on programmatic navigations too.
   */
  window.navigate = function (href) {
    navigateTo(href);
  };

  function navigateTo(href) {
    document.body.classList.remove('page-enter');
    document.body.classList.add('page-exit');
    setTimeout(function () {
      window.location.href = href;
    }, 280);
  }
})();
