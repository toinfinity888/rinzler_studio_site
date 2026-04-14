/**
 * Main JavaScript Entry Point
 * Initializes all scripts and handles page interactions
 */

/**
 * Initialize header scroll behavior
 */
function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const scrollThreshold = 50;

  function updateHeader() {
    if (window.scrollY > scrollThreshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
}

/**
 * Initialize smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');

      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        if (history.pushState) {
          history.pushState(null, null, targetId);
        }
      }
    });
  });
}

/**
 * Initialize CTA click tracking
 */
function initCTATracking() {
  document.querySelectorAll('[data-cta]').forEach(button => {
    button.addEventListener('click', function() {
      if (window.plausible) {
        window.plausible('CTA Click', {
          props: {
            ctaId: this.dataset.ctaId,
            section: this.dataset.section
          }
        });
      }
    });
  });
}

/**
 * Initialize all page functionality
 */
function init() {
  console.log('[Main] Initializing Rinzler Studio website...');

  initHeaderScroll();
  initSmoothScroll();
  initCTATracking();

  console.log('[Main] Initialization complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init };
