/**
 * ROI Calculator Module
 * Handles both preview calculator (homepage) and full calculator (calculator.html)
 */

// Predefined scenarios with default values
const SCENARIOS = {
  custom: {
    employees: 5,
    hoursPerTask: 2,
    frequency: 10,
    hourlyRate: 45,
    errorRate: 3,
    errorCost: 150,
    errorVolume: 500,
    leadsLost: 10,
    leadValue: 500,
    implCost: 15000,
    monthlyCost: 200,
    efficiency: 70
  },
  email: {
    employees: 3,
    hoursPerTask: 3,
    frequency: 25,
    hourlyRate: 40,
    errorRate: 5,
    errorCost: 50,
    errorVolume: 1000,
    leadsLost: 5,
    leadValue: 200,
    implCost: 8000,
    monthlyCost: 150,
    efficiency: 80
  },
  leads: {
    employees: 4,
    hoursPerTask: 1.5,
    frequency: 30,
    hourlyRate: 50,
    errorRate: 8,
    errorCost: 300,
    errorVolume: 200,
    leadsLost: 20,
    leadValue: 800,
    implCost: 12000,
    monthlyCost: 200,
    efficiency: 75
  },
  invoicing: {
    employees: 2,
    hoursPerTask: 4,
    frequency: 20,
    hourlyRate: 35,
    errorRate: 4,
    errorCost: 200,
    errorVolume: 400,
    leadsLost: 0,
    leadValue: 0,
    implCost: 10000,
    monthlyCost: 100,
    efficiency: 85
  },
  onboarding: {
    employees: 3,
    hoursPerTask: 5,
    frequency: 8,
    hourlyRate: 55,
    errorRate: 2,
    errorCost: 500,
    errorVolume: 50,
    leadsLost: 5,
    leadValue: 1000,
    implCost: 20000,
    monthlyCost: 250,
    efficiency: 65
  },
  reporting: {
    employees: 2,
    hoursPerTask: 8,
    frequency: 4,
    hourlyRate: 60,
    errorRate: 6,
    errorCost: 100,
    errorVolume: 100,
    leadsLost: 0,
    leadValue: 0,
    implCost: 8000,
    monthlyCost: 100,
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
          company: formData.get('company'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          sector: formData.get('sector'),
          message: formData.get('message'),
          source: 'calculator_page',
          _subject: `Nouvelle demande d'audit (Calculateur) - ${formData.get('company')}`
        })
      });

      if (response.ok) {
        showSuccess();
        if (window.plausible) {
          window.plausible('Audit Request', {
            props: { company: formData.get('company'), source: 'calculator' }
          });
        }
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
  }

  console.log('[Calculator] Initialization complete');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, formatCurrency, formatPercent };
