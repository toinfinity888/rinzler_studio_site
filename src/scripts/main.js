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
 * Initialize Diagnosis Dashboard Charts
 */
function initDiagnosisDashboard() {
  const phase1 = document.querySelector('.phase-1');
  if (!phase1) return;

  // Donut Chart Animation Setup
  const circumference = 2 * Math.PI * 56; // radius = 56
  const segments = [0.45, 0.28, 0.18]; // proportions for each ring
  const rings = document.querySelectorAll('.diag-donut-ring');
  let offset = 0;

  rings.forEach((ring, i) => {
    const len = segments[i] * circumference;
    const gap = circumference - len;
    ring.style.strokeDasharray = `0 ${circumference}`;
    ring.style.strokeDashoffset = -offset;
    ring.dataset.target = `${len} ${gap}`;
    offset += len + 6; // 6 = small gap between arcs
  });

  // Counter Animation
  const counters = document.querySelectorAll('.diag-stat-num[data-target]');
  let animated = false;

  function animateCounters() {
    if (animated) return;
    animated = true;

    const startTime = performance.now();
    const duration = 1800;

    function update(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4); // easeOutQuart

      counters.forEach(el => {
        const target = parseFloat(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        const isFloat = String(target).includes('.');
        const val = ease * target;
        el.textContent = (isFloat ? val.toFixed(1) : Math.round(val)) + suffix;
      });

      if (t < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function startAnimations() {
    // Add animate class to trigger CSS animations
    phase1.classList.add('animate');

    // Create and apply dynamic keyframes for donut rings
    const ringStyle = document.createElement('style');
    rings.forEach((ring, i) => {
      const name = `diagRingAnim${i}`;
      const [dash, gap] = ring.dataset.target.split(' ');
      ringStyle.textContent += `
        @keyframes ${name} {
          to { stroke-dasharray: ${dash} ${gap}; }
        }
      `;
      ring.style.animation = `${name} 1.8s cubic-bezier(0.23,1,0.32,1) ${1.7 + i * 0.3}s forwards`;
    });
    document.head.appendChild(ringStyle);

    // Start counter animation after delay
    setTimeout(animateCounters, 1400);
  }

  // Trigger animations when phase 1 becomes visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        startAnimations();
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(phase1);
}

/**
 * Initialize all page functionality
 */
function init() {
  console.log('[Main] Initializing Rinzler Studio website...');

  initHeaderScroll();
  initSmoothScroll();
  initCTATracking();
  initDiagnosisDashboard();

  console.log('[Main] Initialization complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init };
