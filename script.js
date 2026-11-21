// ============================================================
// Shared flags
// ============================================================
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp01 = v => Math.min(Math.max(v, 0), 1);

// ============================================================
// 0. Theme toggle — initial theme is set pre-paint in <head>
// ============================================================
const themeMeta = document.querySelector('meta[name="theme-color"]');
const syncThemeMeta = () => {
  if (themeMeta) themeMeta.content = root.dataset.theme === 'dark' ? '#0B0D12' : '#F8F8F8';
};
syncThemeMeta();

// The new theme spreads out from the toggle as a growing circle.
const themeToggle = document.getElementById('theme-toggle');
let switching = false;

themeToggle.addEventListener('click', () => {
  if (switching) return;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  const apply = () => {
    root.dataset.theme = next;
    syncThemeMeta();
    try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked: theme just won't persist */ }
  };

  if (!document.startViewTransition || reduceMotion) { apply(); return; }

  const r = themeToggle.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  switching = true;
  root.classList.add('theme-switching');           // no colour fades inside the wipe
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
    );
  });
  vt.finished.finally(() => {
    root.classList.remove('theme-switching');
    switching = false;
  });
});

// ============================================================
// 2. Hero entrance (once) + stat count-up
// ============================================================
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));

if (!reduceMotion) {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const start = performance.now() + 450;
    const dur = 1300;
    el.textContent = '0';
    const tick = (now) => {
      const t = clamp01((now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// ============================================================
// 3. Section transitions — the same for every section.
//    Entering from below: content resolves out of a blur and
//    settles from 96.5% scale. Leaving at the top: it zooms
//    slightly, blurs and fades, like the hero in the reference.
// ============================================================
const nav = document.getElementById('nav');
const scenes = [...document.querySelectorAll('main > section')].map(sec => ({
  sec,
  els: [...sec.querySelectorAll(':scope > .wrap, :scope > .hero-marquee')],
}));

let ticking = false;
function updateScenes() {
  ticking = false;
  const vh = window.innerHeight;
  nav.classList.toggle('scrolled', window.scrollY > 24);
  if (reduceMotion) return;

  scenes.forEach(s => {
    const r = s.sec.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) return;           // far off screen

    const enter = clamp01((vh - r.top) / (vh * 0.45));     // 0 below fold → 1 settled
    const exit = clamp01((vh * 0.6 - r.bottom) / (vh * 0.6)); // 0 on screen → 1 gone
    const settled = enter >= 1 && exit <= 0;
    const scale = 0.965 + 0.035 * enter + 0.08 * exit;
    const blur = (1 - enter) * 10 + exit * 10;

    s.els.forEach(el => {
      const st = el.style;
      if (settled) {
        if (st.transform) { st.transform = ''; st.filter = ''; st.opacity = ''; }
        return;
      }
      st.transformOrigin = exit > 0 ? '50% 100%' : '50% 0%';
      st.transform = `scale(${scale.toFixed(4)})`;
      st.filter = `blur(${blur.toFixed(2)}px)`;
      st.opacity = Math.max(0, enter - exit * 1.15).toFixed(3);
    });
  });
}
window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(updateScenes); }
}, { passive: true });
window.addEventListener('resize', updateScenes);
updateScenes();

// ============================================================
// 4. Project deck — stacked cards, arrows, dots, keys, swipe
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

// ============================================================
// 5. Glass lens cursor — magnifies the whole page.
//    The nav, main and footer are cloned once into a fixed layer
//    clipped to a circle at the pointer and scaled around it.
//    A MutationObserver mirrors every class/attribute/text change
//    (deck, transitions, hover, counters) onto the clone, so
//    whatever sits under the lens is what you see, magnified,
//    with red/cyan fringes. Runs last so all JS-built DOM exists.
// ============================================================
if (finePointer) {
  const R = 60;          // lens radius, px
  const ZOOM = 1.2;

  const make = (cls) => {
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    return el;
  };
  const ring = make('lens-ring');
  const dot = make('lens-dot');
  const layer = make('lens-layer');
  const pageShift = make('lens-shift');
  const pageZoom = make('lens-zoom');
  const navZoom = make('lens-zoom lens-zoom-nav');
  layer.inert = true;
  pageShift.appendChild(pageZoom);
  layer.append(pageShift, navZoom);
  document.body.append(ring, layer, dot);

  // clone a source and record original → clone for every node
  const map = new WeakMap();
  const pair = (a, b) => {
    map.set(a, b);
    if (b.nodeType === 1) b.removeAttribute('id');
    for (let i = 0; i < a.childNodes.length; i++) pair(a.childNodes[i], b.childNodes[i]);
  };
  const cloneInto = (src, parent) => {
    const c = src.cloneNode(true);
    pair(src, c);
    parent.appendChild(c);
  };
  const sources = [document.querySelector('main'), document.querySelector('.footer')];
  sources.forEach(src => cloneInto(src, pageZoom));
  cloneInto(nav, navZoom);

  const mo = new MutationObserver(records => {
    records.forEach(r => {
      if (r.type === 'attributes') {
        const c = map.get(r.target);
        if (!c || r.attributeName === 'id') return;
        const v = r.target.getAttribute(r.attributeName);
        v === null ? c.removeAttribute(r.attributeName) : c.setAttribute(r.attributeName, v);
      } else if (r.type === 'characterData') {
        const c = map.get(r.target);
        if (c) c.data = r.target.data;
      } else {                                   // childList: re-clone that subtree
        const c = map.get(r.target);
        if (!c) return;
        const fresh = r.target.cloneNode(true);
        pair(r.target, fresh);
        c.replaceWith(fresh);
      }
    });
  });
  [...sources, nav].forEach(src => mo.observe(src, {
    subtree: true, attributes: true, childList: true, characterData: true,
  }));

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

  // :hover can't reach the clone, so mirror it as a class
  let hovered = null;
  document.addEventListener('mouseover', (e) => {
    small = !!e.target.closest('a, button, [tabindex]:not(#deck), .skills-list li');
    ring.classList.toggle('is-small', small);
    const h = e.target.closest('.portrait, .swatch, .cred-row, .skills-list li');
    if (h !== hovered) {
      if (hovered) hovered.classList.remove('is-hover');
      if (h) h.classList.add('is-hover');
      hovered = h;
    }
  });

  let shown = null;
  function frame() {
    const ease = reduceMotion ? 1 : 0.18;
    lx += (mx - lx) * ease;
    ly += (my - ly) * ease;

    ring.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;

    const show = visible && !small;
    if (show !== shown) {
      layer.style.visibility = show ? 'visible' : 'hidden';
      shown = show;
    }
    if (show) {
      const y = window.scrollY;
      layer.style.clipPath = `circle(${R - 1}px at ${lx}px ${ly}px)`;
      pageShift.style.transform = `translate3d(0, ${-y}px, 0)`;
      pageZoom.style.transformOrigin = `${lx}px ${ly + y}px`;
      pageZoom.style.transform = `scale(${ZOOM})`;
      navZoom.style.transformOrigin = `${lx}px ${ly}px`;
      navZoom.style.transform = `scale(${ZOOM})`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
