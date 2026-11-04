// ============================================================
// 1. Hero load-in — triggers the line-reveal animation once the
//    page is ready (adds the .loaded class defined in styles.css)
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => hero.classList.add('loaded'));
});

// ============================================================
// 2. Nav background on scroll
// ============================================================
const nav = document.getElementById('nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  nav.classList.toggle('scrolled', y > 40);
  lastScroll = y;
}, { passive: true });

// ============================================================
// 3. Scroll-reveal for sections — fades/slides elements with the
//    .reveal class into place as they enter the viewport.
//    Respects prefers-reduced-motion by just showing everything.
// ============================================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealTargets = document.querySelectorAll('.reveal');

if (prefersReducedMotion) {
  revealTargets.forEach(el => el.classList.add('in-view'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  revealTargets.forEach(el => io.observe(el));
}

// ============================================================
// 4. Chrome orb parallax — the hero orb drifts gently toward the
//    cursor. Disabled on touch devices and reduced-motion.
// ============================================================
const orb = document.getElementById('orb');
const isTouch = window.matchMedia('(pointer: coarse)').matches;

if (orb && !isTouch && !prefersReducedMotion) {
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

  window.addEventListener('mousemove', (e) => {
    const { innerWidth, innerHeight } = window;
    targetX = ((e.clientX / innerWidth) - 0.5) * 30;
    targetY = ((e.clientY / innerHeight) - 0.5) * 30;
  });

  function animateOrb() {
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;
    orb.style.transform = `translate(${currentX}px, calc(-50% + ${currentY}px))`;
    requestAnimationFrame(animateOrb);
  }
  animateOrb();
}

// ============================================================
// 5. Project row tilt — a very subtle 3D tilt that follows the
//    cursor across each project row, reinforcing the "metal
//    catching light" feel from the buttons/orb.
// ============================================================
const tiltEls = document.querySelectorAll('[data-tilt]');

if (!isTouch && !prefersReducedMotion) {
  tiltEls.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${relY * -2}deg) rotateY(${relX * 2}deg) translateX(6px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}