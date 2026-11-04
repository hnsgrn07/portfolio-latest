// ============================================================
// 1. Hero load-in — triggers the line-reveal animation once the
//    page is ready.
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => hero.classList.add('loaded'));
});

// ============================================================
// 2. Theme toggle — switches data-theme on <html> and remembers
//    the choice. The inline script in <head> sets the initial
//    value before paint; this just handles the click + persistence.
// ============================================================
const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ============================================================
// 3. Nav background on scroll + mobile dropdown menu
// ============================================================
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

const burger = document.getElementById('navBurger');
const dropdown = document.getElementById('navDropdown');

burger.addEventListener('click', () => {
  const isOpen = dropdown.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  burger.setAttribute('aria-expanded', String(isOpen));
});

dropdown.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    dropdown.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});

// ============================================================
// 4. Scroll reveal — fades elements IN as they enter the
//    viewport and back OUT as they leave (either direction).
//    Three flavors: .reveal (simple fade), .reveal-drop (children
//    drop in staggered), .reveal-scale (children scale in staggered).
// ============================================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setStaggerDelays(container, itemSelector, stepMs) {
  const items = container.querySelectorAll(itemSelector);
  items.forEach((item, i) => {
    item.style.transitionDelay = `${i * stepMs}ms`;
  });
}

document.querySelectorAll('.reveal-drop').forEach(el => setStaggerDelays(el, '.reveal-drop-item', 70));
document.querySelectorAll('.reveal-scale').forEach(el => setStaggerDelays(el, '.reveal-scale-item', 90));

if (prefersReducedMotion) {
  document.querySelectorAll('.reveal, .reveal-drop-item, .reveal-scale-item').forEach(el => el.classList.add('in-view'));
} else {
  const toggleInView = (entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    });
  };

  const sectionObserver = new IntersectionObserver(toggleInView, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => sectionObserver.observe(el));

  const groupObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const items = entry.target.querySelectorAll('.reveal-drop-item, .reveal-scale-item');
      items.forEach(item => item.classList.toggle('in-view', entry.isIntersecting));
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal-drop, .reveal-scale').forEach(el => groupObserver.observe(el));
}

// ============================================================
// 5. Count-up numbers (impact stats) — runs once per element the
//    first time it enters view.
// ============================================================
const countEls = document.querySelectorAll('[data-count]');

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

if (prefersReducedMotion) {
  countEls.forEach(el => { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
} else {
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  countEls.forEach(el => countObserver.observe(el));
}

// ============================================================
// 6. Skill bar fill — widths animate to their data-fill value
//    the first time the skills block scrolls into view.
// ============================================================
const skillBars = document.querySelector('.skill-bars');

if (skillBars) {
  if (prefersReducedMotion) {
    skillBars.querySelectorAll('.skill-fill').forEach(el => { el.style.width = el.dataset.fill + '%'; });
  } else {
    const skillObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.skill-fill').forEach(bar => { bar.style.width = bar.dataset.fill + '%'; });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    skillObserver.observe(skillBars);
  }
}

// ============================================================
// 7. Hero photo — shows the placeholder box until a real photo
//    is found at assets/photo.jpg (no broken-image icon).
// ============================================================
const heroPhoto = document.getElementById('heroPhoto');
const photoFrame = heroPhoto.closest('.hero-photo-frame');

heroPhoto.addEventListener('load', () => {
  if (heroPhoto.naturalWidth > 1) photoFrame.classList.add('has-photo');
});
heroPhoto.addEventListener('error', () => {
  photoFrame.classList.remove('has-photo');
});