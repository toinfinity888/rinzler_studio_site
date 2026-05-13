/**
 * ROI Calculator Module
 * Handles both preview calculator (homepage) and full calculator (calculator.html)
 */

// Predefined scenarios with default values — hotel-relevant baselines.
// Internal keys preserved for math + Plausible payload compatibility (see
// specs/002-hotel-marketing-pivot/research.md §6). User-facing labels are
// rendered from the <select> in calculator.html.
//   email      → Réponses aux emails clients
//   leads      → Demandes Booking.com / OTA
//   onboarding → Questions répétitives avant arrivée
//   invoicing  → Suivi des réservations directes
//   reporting  → Reporting direction
const SCENARIOS = {
  custom: {
    employees: 3,
    hoursPerTask: 0.5,
    frequency: 40,
    hourlyRate: 28,
    errorRate: 3,
    errorCost: 80,
    errorVolume: 200,
    leadsLost: 8,
    leadValue: 350,
    implCost: 6000,
    monthlyCost: 120,
    efficiency: 70
  },
  email: {
    // Réponses aux emails clients — petit hôtel, demandes courantes
    employees: 2,
    hoursPerTask: 0.4,
    frequency: 50,
    hourlyRate: 28,
    errorRate: 5,
    errorCost: 60,
    errorVolume: 240,
    leadsLost: 4,
    leadValue: 250,
    implCost: 4500,
    monthlyCost: 90,
    efficiency: 80
  },
  leads: {
    // Demandes Booking.com / OTA — réponses rapides = meilleure conversion
    employees: 2,
    hoursPerTask: 0.5,
    frequency: 30,
    hourlyRate: 28,
    errorRate: 8,
    errorCost: 120,
    errorVolume: 140,
    leadsLost: 12,
    leadValue: 320,
    implCost: 5000,
    monthlyCost: 100,
    efficiency: 75
  },
  invoicing: {
    // Suivi des réservations directes — visibilité + relance + récupération
    employees: 1,
    hoursPerTask: 0.75,
    frequency: 20,
    hourlyRate: 30,
    errorRate: 4,
    errorCost: 150,
    errorVolume: 100,
    leadsLost: 6,
    leadValue: 380,
    implCost: 5500,
    monthlyCost: 110,
    efficiency: 85
  },
  onboarding: {
    // Questions répétitives avant arrivée (parking, check-in, animal, petit-déj…)
    employees: 2,
    hoursPerTask: 0.3,
    frequency: 60,
    hourlyRate: 28,
    errorRate: 2,
    errorCost: 70,
    errorVolume: 260,
    leadsLost: 2,
    leadValue: 200,
    implCost: 4000,
    monthlyCost: 80,
    efficiency: 85
  },
  reporting: {
    // Reporting direction — tableau de bord mensuel à la place de tableaux Excel
    employees: 1,
    hoursPerTask: 3,
    frequency: 2,
    hourlyRate: 40,
    errorRate: 6,
    errorCost: 80,
    errorVolume: 30,
    leadsLost: 0,
    leadValue: 0,
    implCost: 3500,
    monthlyCost: 60,
    efficiency: 90
  }
};

// French number formatting
const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value));
};

const formatPercent = (value) => {
  return `${Math.round(value)}%`;
};

const formatHours = (value) => {
  return `${Math.round(value)}h`;
};

const formatMonths = (value) => {
  if (value >= 99) return '99+';
  return value.toFixed(1);
};

// Local storage helpers
const STORAGE_KEY = 'rinzler_roi_calculator';

const saveToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save calculator data:', e);
  }
};

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Could not load calculator data:', e);
    return null;
  }
};

/**
 * Animate number value changes
 */
function animateValue(element, endValue, prefix = '') {
  if (!element) return;

  const startValue = parseFloat(element.textContent.replace(/[^\d.-]/g, '')) || 0;
  const duration = 400;
  const startTime = performance.now();

  // Add updating class for visual feedback
  element.classList.add('updating');

  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (endValue - startValue) * eased;

    element.textContent = prefix + formatCurrency(currentValue);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.classList.remove('updating');
    }
  };

  requestAnimationFrame(update);
}

/**
 * Preview Calculator (Homepage)
 * Simple 4-input calculator with instant results
 */
function initPreviewCalculator() {
  const previewSection = document.querySelector('.roi-preview');
  if (!previewSection) return;

  const inputs = {
    employees: document.getElementById('preview-employees'),
    hours: document.getElementById('preview-hours'),
    frequency: document.getElementById('preview-frequency'),
    hourly: document.getElementById('preview-hourly')
  };

  const resultEl = document.getElementById('preview-savings');
  if (!resultEl || !inputs.employees) return;

  const calculatePreview = () => {
    const employees = parseFloat(inputs.employees.value) || 0;
    const hoursPerTask = parseFloat(inputs.hours.value) || 0;
    const frequency = parseFloat(inputs.frequency.value) || 0;
    const hourlyRate = parseFloat(inputs.hourly.value) || 0;

    // Weekly hours saved (assuming 70% automation efficiency)
    const weeklyHoursSaved = employees * hoursPerTask * frequency * 0.7;

    // Monthly savings (4.33 weeks per month)
    const monthlySavings = weeklyHoursSaved * hourlyRate * 4.33;

    // Animate number update
    animateValue(resultEl, monthlySavings);
  };

  // Attach listeners
  Object.values(inputs).forEach(input => {
    if (input) {
      input.addEventListener('input', calculatePreview);
      input.addEventListener('change', calculatePreview);
    }
  });

  // Initial calculation
  calculatePreview();

  // Track calculator usage
  if (window.plausible) {
    window.plausible('Calculator View', { props: { page: 'preview' } });
  }
}

/**
 * Full Calculator (calculator.html)
 * Complete ROI calculator with all inputs
 */
function initFullCalculator() {
  const calcContainer = document.querySelector('.calc-container');
  if (!calcContainer) return;

  // Get all input elements
  const inputs = {
    scenario: document.getElementById('calc-scenario'),
    employees: document.getElementById('calc-employees'),
    hoursPerTask: document.getElementById('calc-hours-task'),
    frequency: document.getElementById('calc-frequency'),
    hourlyRate: document.getElementById('calc-hourly-rate'),
    errorRate: document.getElementById('calc-error-rate'),
    errorCost: document.getElementById('calc-error-cost'),
    errorVolume: document.getElementById('calc-error-volume'),
    leadsLost: document.getElementById('calc-leads-lost'),
    leadValue: document.getElementById('calc-lead-value'),
    implCost: document.getElementById('calc-impl-cost'),
    monthlyCost: document.getElementById('calc-monthly-cost'),
    efficiency: document.getElementById('calc-efficiency')
  };

  // Get result elements
  const results = {
    savings: document.getElementById('result-savings'),
    roi: document.getElementById('result-roi'),
    payback: document.getElementById('result-payback'),
    hours: document.getElementById('result-hours'),
    barBeforeHours: document.getElementById('bar-before-hours'),
    barAfterHours: document.getElementById('bar-after-hours'),
    efficiencyValue: document.getElementById('efficiency-value')
  };

  // Validate inputs exist
  if (!inputs.employees || !results.savings) {
    console.warn('Calculator inputs not found');
    return;
  }

  // Load saved data or use defaults
  const loadValues = () => {
    const saved = loadFromStorage();
    if (saved) {
      Object.entries(saved).forEach(([key, value]) => {
        if (inputs[key] && key !== 'scenario') {
          inputs[key].value = value;
        }
      });
    }
    updateEfficiencyDisplay();
  };

  // Save current values
  const saveValues = () => {
    const data = {};
    Object.entries(inputs).forEach(([key, input]) => {
      if (input && key !== 'scenario') {
        data[key] = input.value;
      }
    });
    saveToStorage(data);
  };

  // Update efficiency slider display
  const updateEfficiencyDisplay = () => {
    if (results.efficiencyValue && inputs.efficiency) {
      results.efficiencyValue.textContent = `${inputs.efficiency.value}%`;
    }
  };

  // Apply scenario presets
  const applyScenario = (scenarioKey) => {
    const scenario = SCENARIOS[scenarioKey];
    if (!scenario) return;

    if (inputs.employees) inputs.employees.value = scenario.employees;
    if (inputs.hoursPerTask) inputs.hoursPerTask.value = scenario.hoursPerTask;
    if (inputs.frequency) inputs.frequency.value = scenario.frequency;
    if (inputs.hourlyRate) inputs.hourlyRate.value = scenario.hourlyRate;
    if (inputs.errorRate) inputs.errorRate.value = scenario.errorRate;
    if (inputs.errorCost) inputs.errorCost.value = scenario.errorCost;
    if (inputs.errorVolume) inputs.errorVolume.value = scenario.errorVolume;
    if (inputs.leadsLost) inputs.leadsLost.value = scenario.leadsLost;
    if (inputs.leadValue) inputs.leadValue.value = scenario.leadValue;
    if (inputs.implCost) inputs.implCost.value = scenario.implCost;
    if (inputs.monthlyCost) inputs.monthlyCost.value = scenario.monthlyCost;
    if (inputs.efficiency) inputs.efficiency.value = scenario.efficiency;

    updateEfficiencyDisplay();
    calculate();
  };

  // Main calculation function
  const calculate = () => {
    const values = {
      employees: parseFloat(inputs.employees?.value) || 0,
      hoursPerTask: parseFloat(inputs.hoursPerTask?.value) || 0,
      frequency: parseFloat(inputs.frequency?.value) || 0,
      hourlyRate: parseFloat(inputs.hourlyRate?.value) || 0,
      errorRate: parseFloat(inputs.errorRate?.value) || 0,
      errorCost: parseFloat(inputs.errorCost?.value) || 0,
      errorVolume: parseFloat(inputs.errorVolume?.value) || 0,
      leadsLost: parseFloat(inputs.leadsLost?.value) || 0,
      leadValue: parseFloat(inputs.leadValue?.value) || 0,
      implCost: parseFloat(inputs.implCost?.value) || 0,
      monthlyCost: parseFloat(inputs.monthlyCost?.value) || 0,
      efficiency: parseFloat(inputs.efficiency?.value) / 100 || 0.7
    };

    // Calculate components

    // 1. Labor cost savings
    const weeklyHoursManual = values.employees * values.hoursPerTask * values.frequency;
    const monthlyHoursManual = weeklyHoursManual * 4.33;
    const hoursSaved = monthlyHoursManual * values.efficiency;
    const laborSavings = hoursSaved * values.hourlyRate;

    // 2. Error cost reduction
    const currentMonthlyErrors = values.errorVolume * (values.errorRate / 100);
    const errorReduction = currentMonthlyErrors * values.efficiency;
    const errorSavings = errorReduction * values.errorCost;

    // 3. Opportunity recovery
    const leadsRecovered = values.leadsLost * values.efficiency;
    const opportunitySavings = leadsRecovered * values.leadValue;

    // Total monthly savings
    const totalMonthlySavings = laborSavings + errorSavings + opportunitySavings;

    // Net monthly savings (minus operating costs)
    const netMonthlySavings = totalMonthlySavings - values.monthlyCost;

    // Annual savings
    const annualSavings = netMonthlySavings * 12;

    // ROI calculation
    const roi = values.implCost > 0
      ? ((annualSavings - values.implCost) / values.implCost) * 100
      : 0;

    // Payback period (months)
    const paybackMonths = netMonthlySavings > 0
      ? values.implCost / netMonthlySavings
      : 999;

    // Hours after automation
    const hoursAfterAutomation = monthlyHoursManual * (1 - values.efficiency);

    // Update display
    animateValue(results.savings, netMonthlySavings);

    if (results.roi) {
      results.roi.textContent = formatPercent(Math.max(0, roi));
    }
    if (results.payback) {
      results.payback.textContent = formatMonths(Math.max(0, paybackMonths));
    }
    if (results.hours) {
      results.hours.textContent = formatHours(hoursSaved);
    }

    // Update comparison bars
    if (results.barBeforeHours) {
      results.barBeforeHours.textContent = formatHours(monthlyHoursManual);
    }
    if (results.barAfterHours) {
      results.barAfterHours.textContent = formatHours(hoursAfterAutomation);
      const afterBarEl = results.barAfterHours.closest('.calc-bar');
      if (afterBarEl) {
        const percentage = monthlyHoursManual > 0
          ? (hoursAfterAutomation / monthlyHoursManual) * 100
          : 0;
        afterBarEl.style.setProperty('--bar-width', `${Math.max(10, percentage)}%`);
      }
    }

    // Save to storage
    saveValues();
  };

  // Attach event listeners
  Object.entries(inputs).forEach(([key, input]) => {
    if (!input) return;

    if (key === 'scenario') {
      input.addEventListener('change', (e) => {
        applyScenario(e.target.value);
      });
    } else if (key === 'efficiency') {
      input.addEventListener('input', () => {
        updateEfficiencyDisplay();
        calculate();
      });
    } else {
      input.addEventListener('input', calculate);
      input.addEventListener('change', calculate);
    }
  });

  // Initialize
  loadValues();
  calculate();

  // Track calculator usage
  if (window.plausible) {
    window.plausible('Calculator View', { props: { page: 'full' } });
  }
}

/**
 * Initialize audit modal for calculator page
 */
function initCalcAuditModal() {
  const modal = document.getElementById('audit-modal');
  if (!modal) return;

  const closeBtn = document.getElementById('modal-close');
  const form = document.getElementById('audit-form');

  const FORMSPREE_ID = 'xqewrjzy';

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

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Envoi en cours...
    `;

    const formData = new FormData(form);

    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.get('name'),
          // Input name attribute stays "company" (Plausible payload compat); the field collects hotel name.
          hotel: formData.get('company'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          typology: formData.get('typology'),
          rooms: formData.get('rooms') || undefined,
          pms_stack: formData.get('pms_stack') || undefined,
          message: formData.get('message'),
          source: 'calculator_page',
          _subject: `Nouvelle demande de diagnostic digital hôtel (Calculateur) — ${formData.get('company')}`
        })
      });

      if (response.ok) {
        showSuccess();
        // Event name "Audit Request" preserved for dashboard comparability
        // (see specs/002-hotel-marketing-pivot/contracts/plausible-events.md).
        if (window.plausible) {
          const props = {
            hotel: formData.get('company'),
            typology: formData.get('typology'),
            source: 'calculator'
          };
          const roomsValue = formData.get('rooms');
          if (roomsValue) {
            props.rooms = Number(roomsValue);
          }
          window.plausible('Audit Request', { props });
        }
        form.reset();
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Une erreur est survenue. Veuillez réessayer ou nous contacter à hello@rinzlerstudio.com.');
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
        <p class="success-text">Merci pour votre intérêt. Nous vous recontactons sous 24 h pour planifier votre diagnostic digital hôtel.</p>
        <button class="btn btn-primary" onclick="document.getElementById('audit-modal').classList.remove('active'); document.body.style.overflow = '';">
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
 * Initialize header scroll behavior for calculator page
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
 * Initialize mobile menu for calculator page
 */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const nav = document.getElementById('header-nav');

  if (!menuBtn || !nav) return;

  function toggleMenu() {
    const isActive = menuBtn.classList.contains('active');
    menuBtn.classList.toggle('active', !isActive);
    nav.classList.toggle('active', !isActive);
    menuBtn.setAttribute('aria-expanded', !isActive);
    document.body.style.overflow = isActive ? '' : 'hidden';
  }

  function closeMenu() {
    menuBtn.classList.remove('active');
    nav.classList.remove('active');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', toggleMenu);

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('active')) {
      closeMenu();
    }
  });
}

/**
 * Initialize info tooltips
 * Click to show/hide tooltip content
 */
function initInfoTooltips() {
  const tooltipTriggers = document.querySelectorAll('.info-tooltip-trigger[data-tooltip]');
  if (!tooltipTriggers.length) return;

  // Close all tooltips
  const closeAllTooltips = () => {
    tooltipTriggers.forEach(trigger => trigger.classList.remove('active'));
  };

  // Handle tooltip trigger clicks
  tooltipTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isActive = trigger.classList.contains('active');

      // Close all other tooltips first
      closeAllTooltips();

      // Toggle current tooltip
      if (!isActive) {
        trigger.classList.add('active');
      }
    });
  });

  // Close tooltips when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.info-tooltip-trigger')) {
      closeAllTooltips();
    }
  });

  // Close tooltips on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllTooltips();
    }
  });

  // Close tooltips when scrolling
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(closeAllTooltips, 100);
  }, { passive: true });
}

/**
 * Initialize calculators when DOM is ready
 */
function init() {
  console.log('[Calculator] Initializing ROI Calculator...');

  // Initialize preview calculator (homepage)
  initPreviewCalculator();

  // Initialize full calculator (calculator page)
  initFullCalculator();

  // Initialize calculator page specific features
  if (document.querySelector('.calculator-page')) {
    initHeaderScroll();
    initMobileMenu();
    initCalcAuditModal();
    initInfoTooltips();
  }

  console.log('[Calculator] Initialization complete');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, formatCurrency, formatPercent };
