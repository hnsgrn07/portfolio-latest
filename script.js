// ============================================================
// Shared flags
// ============================================================
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ============================================================
// 0. Theme toggle — initial theme is set pre-paint in <head>
// ============================================================
const themeMeta = document.querySelector('meta[name="theme-color"]');
const syncThemeMeta = () => {
  if (themeMeta) themeMeta.content = root.dataset.theme === 'dark' ? '#0B0D12' : '#F8F8F8';
};
syncThemeMeta();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  syncThemeMeta();
  try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked: theme just won't persist */ }
});

// ============================================================
// 1. Hero entrance (once) + stat count-up
// ============================================================
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));

if (!reduceMotion) {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const start = performance.now() + 450;
    const dur = 1300;
    el.textContent = '0';
    const tick = (now) => {
      const t = Math.min(Math.max((now - start) / dur, 0), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// ============================================================
// 2. Nav background + hero zoom/blur-out on scroll
// ============================================================
const nav = document.getElementById('nav');
const hero = document.querySelector('.hero');
let heroP = 0;

function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('scrolled', y > 24);
  if (!reduceMotion) {
    heroP = Math.min(Math.max(y / (hero.offsetHeight * 0.85), 0), 1);
    hero.style.setProperty('--p', heroP.toFixed(4));
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ============================================================
// 3. Blur-in headings — split words, resolve once in view
// ============================================================
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const span = document.createElement('span');
          span.className = 'w';
          span.style.setProperty('--i', i++);
          span.textContent = part;
          frag.appendChild(span);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
}

const blurEls = document.querySelectorAll('[data-blur]');
blurEls.forEach(splitWords);

if (reduceMotion || !('IntersectionObserver' in window)) {
  blurEls.forEach(el => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });
  blurEls.forEach(el => io.observe(el));
}

// ============================================================
// 4. Glass lens cursor
//    A circle follows the pointer with a little lag. Big type marked
//    [data-lens] is cloned into a fixed layer that is clipped to the
//    circle and scaled around the pointer, with red/cyan fringes,
//    so the lens reads as real glass magnifying the headline.
//    It only moves with the pointer, so it stays on under reduced
//    motion — just without the trailing lag.
// ============================================================
if (finePointer) {
  const R = 60;          // lens radius in px
  const ZOOM = 1.2;

  const ring = document.createElement('div');
  ring.className = 'lens-ring';
  const dot = document.createElement('div');
  dot.className = 'lens-dot';
  const layer = document.createElement('div');
  layer.className = 'lens-layer';
  [ring, layer, dot].forEach(el => {
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  });

  const targets = [...document.querySelectorAll('[data-lens]')].map(el => {
    const clone = el.cloneNode(true);
    clone.removeAttribute('data-lens');
    clone.removeAttribute('data-blur');
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    clone.classList.add('lens-clone');
    clone.style.display = 'none';
    layer.appendChild(clone);
    return { el, clone, inHero: hero.contains(el), needsIn: el.hasAttribute('data-blur') };
  });

  root.classList.add('has-lens');

  let mx = -999, my = -999;   // pointer
  let lx = -999, ly = -999;   // lens (eased)
  let visible = false;
  let small = false;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    if (!visible) {
      lx = mx; ly = my;
      visible = true;
      ring.classList.add('is-visible');
      dot.classList.add('is-visible');
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    visible = false;
    ring.classList.remove('is-visible');
    dot.classList.remove('is-visible');
  });

  document.addEventListener('mouseover', (e) => {
    small = !!e.target.closest('a, button, [tabindex]:not(#deck), .skills-list li');
    ring.classList.toggle('is-small', small);
  });

  function frame() {
    const ease = reduceMotion ? 1 : 0.18;
    lx += (mx - lx) * ease;
    ly += (my - ly) * ease;

    ring.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;

    const showGlass = visible && !small;
    layer.style.clipPath = showGlass
      ? `circle(${R - 1}px at ${lx}px ${ly}px)`
      : 'circle(0px at -200px -200px)';

    targets.forEach(t => {
      const r = t.el.getBoundingClientRect();
      const near = showGlass &&
        lx > r.left - R && lx < r.right + R &&
        ly > r.top - R && ly < r.bottom + R;
      const ready = (!t.inHero || heroP < 0.02) && (!t.needsIn || t.el.classList.contains('in'));

      if (near && ready) {
        const s = t.clone.style;
        s.display = '';
        s.left = r.left + 'px';
        s.top = r.top + 'px';
        s.width = r.width + 'px';
        s.transformOrigin = `${lx - r.left}px ${ly - r.top}px`;
        s.transform = `scale(${ZOOM})`;
      } else if (t.clone.style.display !== 'none') {
        t.clone.style.display = 'none';
      }
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ============================================================
// 5. Project deck — stacked cards, arrows, dots, keys, swipe
// ============================================================
const deck = document.getElementById('deck');
if (deck) {
  const cards = [...deck.querySelectorAll('.card')];
  const dotsWrap = document.getElementById('deck-dots');
  const currentEl = document.getElementById('deck-current');
  const totalEl = document.getElementById('deck-total');
  const pad = n => String(n).padStart(2, '0');
  let order = cards.map((_, i) => i);   // order[slot] = card index
  let busy = false;

  totalEl.textContent = pad(cards.length);

  const dots = cards.map((card, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Show project ${i + 1}: ${card.querySelector('h3').textContent}`);
    b.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(b);
    return b;
  });

  function render() {
    order.forEach((cardIdx, slot) => {
      const card = cards[cardIdx];
      const s = Math.min(slot, 3);
      card.dataset.slot = s;
      card.style.setProperty('--slot', s);
      const front = slot === 0;
      card.inert = !front;
      card.setAttribute('aria-hidden', String(!front));
    });
    currentEl.textContent = pad(order[0] + 1);
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === order[0])));
  }

  const reflow = el => void el.offsetWidth;

  function next() {
    if (busy) return;
    busy = true;
    const leaving = cards[order[0]];
    leaving.classList.add('is-leaving');
    order.push(order.shift());
    render();
    setTimeout(() => {
      leaving.classList.add('no-anim');
      leaving.classList.remove('is-leaving');
      reflow(leaving);
      leaving.classList.remove('no-anim');
      busy = false;
    }, reduceMotion ? 0 : 460);
  }

  function prev() {
    if (busy) return;
    busy = true;
    const coming = cards[order[order.length - 1]];
    order.unshift(order.pop());
    coming.classList.add('no-anim', 'is-leaving');
    reflow(coming);
    coming.classList.remove('no-anim');
    render();
    requestAnimationFrame(() => {
      coming.classList.remove('is-leaving');
      setTimeout(() => { busy = false; }, reduceMotion ? 0 : 500);
    });
  }

  function goTo(i) {
    if (i === order[0] || busy) return;
    const at = order.indexOf(i);
    order = order.slice(at).concat(order.slice(0, at));
    render();
  }

  document.querySelectorAll('[data-deck="next"]').forEach(b => b.addEventListener('click', next));
  document.querySelectorAll('[data-deck="prev"]').forEach(b => b.addEventListener('click', prev));

  deck.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });

  let startX = null;
  deck.addEventListener('pointerdown', e => { startX = e.clientX; });
  deck.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
  });

  render();
}
