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
 * Trigger .animate class on each journey phase when it enters the viewport.
 * Works for phase-1, phase-2, and phase-3 independently.
 */
function initPhaseObservers() {
  const phases = document.querySelectorAll('.journey-phase');
  if (!phases.length) return;

  phases.forEach(phase => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          phase.classList.add('animate');
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });
    observer.observe(phase);
  });
}

/**
 * Initialize FAQ accordion functionality
 */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          otherItem.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current item
      item.classList.toggle('active', !isActive);
      question.setAttribute('aria-expanded', !isActive);
    });
  });
}

/**
 * Initialize Audit Modal functionality
 */
function initAuditModal() {
  const modal = document.getElementById('audit-modal');
  const closeBtn = document.getElementById('modal-close');
  const form = document.getElementById('audit-form');

  if (!modal) return;

  // Configuration - Get your Formspree ID at https://formspree.io
  const FORMSPREE_ID = 'xqewrjzy'; // Replace with your Formspree form ID

  // Open modal when clicking audit links
  document.querySelectorAll('a[href="#audit-booking"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  // Close modal
  closeBtn?.addEventListener('click', closeModal);

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Envoi en cours...
    `;

    const formData = new FormData(form);

    try {
      // Send to Formspree (better deliverability than FormSubmit)
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.get('name'),
          company: formData.get('company'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          sector: formData.get('sector'),
          message: formData.get('message'),
          _subject: `Nouvelle demande d'audit - ${formData.get('company')}`
        })
      });

      if (response.ok) {
        // Show success
        showSuccess();

        // Track conversion
        if (window.plausible) {
          window.plausible('Audit Request', {
            props: { company: formData.get('company'), sector: formData.get('sector') }
          });
        }

        // Reset form
        form.reset();
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Une erreur est survenue. Veuillez réessayer ou nous contacter directement.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  function showSuccess() {
    const modalContent = modal.querySelector('.modal-container');
    modalContent.innerHTML = `
      <div class="modal-success">
        <div class="success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h3 class="success-title">Demande envoyée !</h3>
        <p class="success-text">Merci pour votre intérêt. Nous vous contacterons dans les 24 heures pour planifier votre audit gratuit.</p>
        <button class="btn btn-primary" onclick="document.getElementById('audit-modal').classList.remove('active'); document.body.style.overflow = ''; location.reload();">
          Fermer
        </button>
      </div>
    `;
  }

  function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      form?.querySelector('input')?.focus();
    }, 100);
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
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
  initPhaseObservers();
  initFAQ();
  initAuditModal();
  initAurora();

  console.log('[Main] Initialization complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init };
