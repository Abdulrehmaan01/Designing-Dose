/* =========================================================
   DESIGNING DOSE — interactions
   GSAP + ScrollTrigger + Lenis, progressively enhanced.
   ========================================================= */
(() => {
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const motion = !!(G && ST) && !reduce;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  if (!motion) html.classList.add('no-motion');
  if (G && ST) G.registerPlugin(ST);

  /* ---------- Text roll labels ---------- */
  $$('[data-hover]').forEach((el) => {
    const t = el.textContent.trim();
    el.innerHTML = '';
    const r = document.createElement('span');
    r.className = 'roll';
    r.dataset.t = t;
    r.textContent = t;
    el.append(r);
  });

  /* ---------- Split text into masked words ---------- */
  function splitWords(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const wi = document.createElement('span');
            wi.className = 'wi';
            wi.textContent = part;
            w.append(wi);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          if (n.matches('.rotator, [data-nosplit]')) {
            const w = document.createElement('span');
            w.className = 'w';
            const wi = document.createElement('span');
            wi.className = 'wi';
            n.replaceWith(w);
            wi.append(n);
            w.append(wi);
          } else walk(n);
        }
      });
    };
    walk(el);
    el.classList.add('is-split');
  }
  $$('[data-split]').forEach(splitWords);

  /* Statement scroll-fill words */
  $$('.statement__text').forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) return frag.append(document.createTextNode(' '));
            const s = document.createElement('span');
            s.className = 'fw';
            s.textContent = p;
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('statement__inline-img')) walk(n);
        else if (n.nodeType === 1) n.classList.add('fw');
      });
    };
    walk(el);
  });

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ST.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  const scrollTo = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- Header hide / show ---------- */
  const header = $('.header');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (!document.body.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > lastY && y > 300);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const burger = $('.burger');
  const menu = $('#menu');
  burger?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) burger.click();
  });

  /* ---------- Page transitions (curtain) ---------- */
  const curtain = $('.curtain');
  const p1 = $('.curtain__panel--1');
  const p2 = $('.curtain__panel--2');
  const logo = $('.curtain__logo');

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || !motion) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || a.target === '_blank' || a.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin && location.protocol !== 'file:') return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    try { sessionStorage.setItem('dd_nav', '1'); } catch (_) {}
    G.timeline({ onComplete: () => (location.href = a.href) })
      .set([p1, p2], { yPercent: 100 })
      .to(p1, { yPercent: 0, duration: 0.7, ease: 'expo.inOut' })
      .to(p2, { yPercent: 0, duration: 0.7, ease: 'expo.inOut' }, 0.12)
      .fromTo(logo, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, 0.55);
  });

  window.addEventListener('pageshow', (e) => {
    if (e.persisted && G) {
      G.set([p1, p2], { yPercent: 100 });
      G.set(logo, { opacity: 0 });
    }
  });

  /* ---------- Intro: preloader or curtain reveal ---------- */
  function intro() {
    return new Promise((resolve) => {
      if (!motion) { html.classList.remove('is-preloading', 'is-entering'); return resolve(); }

      if (html.classList.contains('is-preloading')) {
        try { sessionStorage.setItem('dd_seen', '1'); } catch (_) {}
        const pre = $('.preloader');
        const count = $('.js-count', pre);
        const obj = { v: 0 };
        G.timeline({
          onComplete: () => { html.classList.remove('is-preloading'); resolve(); },
        })
          .from('.preloader__pill', { scale: 0, rotate: -180, duration: 0.9, ease: 'back.out(1.6)' })
          .from('.preloader__word > *', { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.2)
          .to(obj, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => (count.textContent = Math.round(obj.v)) }, 0)
          .to('.preloader__pill span:last-child', { scaleX: 0, duration: 1.2, ease: 'power2.inOut' }, 0.4)
          .to('.preloader__inner', { yPercent: -30, opacity: 0, duration: 0.6, ease: 'power3.in' }, 1.7)
          .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, 1.9);
        return;
      }

      if (html.classList.contains('is-entering')) {
        G.set(p2, { yPercent: 0 });
        G.set(logo, { opacity: 1 });
        html.classList.remove('is-entering');
        G.timeline({ onComplete: resolve })
          .to(logo, { opacity: 0, y: -20, duration: 0.35, ease: 'power2.in' }, 0.1)
          .to(p2, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, 0.25)
          .set([p1, p2], { yPercent: 100 })
          .set(logo, { y: 0 });
        setTimeout(resolve, 600); // start page animations while curtain lifts
        return;
      }
      resolve();
    });
  }

  /* ---------- Hero intro animation ---------- */
  function heroIn() {
    if (!motion) return;
    const tl = G.timeline({ defaults: { ease: 'expo.out' } });
    const heroTitle = $('.hero [data-split], .page-hero [data-split]');
    if (heroTitle) {
      heroTitle.dataset.done = '1';
      tl.from($$('.wi', heroTitle), { yPercent: 115, rotate: 4, duration: 1.4, stagger: 0.06 }, 0);
    }
    tl.from('.header__bar', { y: -40, opacity: 0, duration: 1.2 }, 0.1);
    const heroBits = $$('[data-hero]');
    if (heroBits.length) tl.from(heroBits, { y: 40, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.35);
    const bento = $$('.bento > .card:not(.hero__main)');
    if (bento.length) tl.from(bento, { y: 100, opacity: 0, duration: 1.4, stagger: 0.08 }, 0.3);
    const mps = $$('.mp');
    if (mps.length) tl.from(mps, { scale: 0, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'back.out(2)' }, 0.9);
  }

  /* ---------- Scroll animations ---------- */
  function scrollAnims() {
    if (!motion) {
      $$('[data-count]').forEach((el) => (el.textContent = el.dataset.count));
      return;
    }

    // Word reveals
    $$('[data-split]').forEach((el) => {
      if (el.dataset.done) return;
      G.from($$('.wi', el), {
        yPercent: 115, rotate: 3, duration: 1.3, ease: 'expo.out', stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    // Fade-up reveals, batched for natural stagger
    G.set('[data-reveal]', { y: 70 });
    ST.batch('[data-reveal]', {
      start: 'top 90%',
      onEnter: (b) => G.to(b, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, overwrite: true }),
    });

    // Parallax images
    $$('[data-parallax]').forEach((img) => {
      G.fromTo(img, { yPercent: -12 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Clip-path widen
    $$('[data-widen]').forEach((el) => {
      G.fromTo(el, { clipPath: 'inset(0% 7% 0% 7% round 28px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 20%', scrub: true },
      });
    });

    // Statement fill
    $$('.statement__text').forEach((el) => {
      G.to($$('.fw', el), {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true },
      });
    });

    // Counters
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const dec = (el.dataset.count.split('.')[1] || '').length;
      const o = { v: 0 };
      el.textContent = (0).toFixed(dec);
      G.to(o, {
        v: end, duration: 2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
        onUpdate: () => (el.textContent = o.v.toFixed(dec)),
      });
    });

    // Stacking service cards
    const stack = $$('.stack-card');
    stack.forEach((card, i) => {
      card.style.setProperty('--i', i);
      const next = stack[i + 1];
      if (!next) return;
      G.to(card, {
        scale: 0.94 - (stack.length - i) * 0.005, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 140px', scrub: true },
      });
    });

    // Horizontal pinned process
    const mm = G.matchMedia();
    mm.add('(min-width: 901px)', () => {
      $$('.hscroll').forEach((sec) => {
        const track = $('.hscroll__track', sec);
        sec.classList.add('is-pinned');
        const dist = () => track.scrollWidth - window.innerWidth;
        const tween = G.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: sec, start: 'center center', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true },
        });
        $$('.step-card', track).forEach((c) => {
          G.from(c, { rotate: 6, y: 60, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left right', end: 'left 60%', scrub: true } });
        });
        return () => sec.classList.remove('is-pinned');
      });
    });

    // Footer brand
    const brand = $('.footer__brand');
    if (brand) {
      G.from(brand.children, {
        yPercent: 100, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12,
        scrollTrigger: { trigger: brand, start: 'top 95%' },
      });
    }

    // Sticker float in award card
    $$('.sticker').forEach((s, i) => {
      G.to(s, { y: i % 2 ? -10 : 10, rotate: '+=4', duration: 2.4 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });

    // Mega marquee skew on velocity
    $$('.mega-marquee').forEach((m) => {
      ST.create({
        trigger: m,
        onUpdate: (self) => {
          const v = G.utils.clamp(-12, 12, self.getVelocity() / -200);
          G.to(m, { skewX: v, duration: 0.4, overwrite: true, onComplete: () => G.to(m, { skewX: 0, duration: 0.8 }) });
        },
      });
    });
  }

  /* ---------- Hero rotator ---------- */
  function rotator() {
    const r = $('.rotator');
    if (!r || !motion) return;
    const words = $$('span', r);
    let i = 0;
    G.set(words, { clearProps: 'transform' });
    G.set(words.slice(1), { yPercent: 110 });
    setInterval(() => {
      const cur = words[i];
      i = (i + 1) % words.length;
      const nxt = words[i];
      G.to(cur, { yPercent: -110, duration: 0.85, ease: 'power3.inOut' });
      G.fromTo(nxt, { yPercent: 110 }, { yPercent: 0, duration: 0.85, ease: 'power3.inOut' });
    }, 2800);
  }

  /* ---------- Multiplayer cursors wander ---------- */
  function wander() {
    if (!motion) return;
    $$('.mp').forEach((el) => {
      const go = () => G.to(el, {
        x: G.utils.random(-120, 120), y: G.utils.random(-70, 70),
        duration: G.utils.random(1.8, 3.2), ease: 'sine.inOut', onComplete: go,
      });
      go();
    });
  }

  /* ---------- Custom cursor & magnetic ---------- */
  function cursor() {
    if (!fine || !G) return;
    const c = $('.cursor');
    const label = $('.cursor__label', c);
    const xTo = G.quickTo(c, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = G.quickTo(c, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); });
    document.addEventListener('pointerover', (e) => {
      const lab = e.target.closest('[data-cursor]');
      if (lab) { label.textContent = lab.dataset.cursor; c.classList.add('has-label'); return; }
      c.classList.remove('has-label');
      c.classList.toggle('is-hover', !!e.target.closest('a, button, summary, label, input, textarea'));
    });
    document.addEventListener('pointerleave', () => c.classList.remove('has-label', 'is-hover'));

    if (!motion) return;
    $$('[data-magnetic]').forEach((el) => {
      const mx = G.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, .4)' });
      const my = G.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.35);
        my((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  /* ---------- Testimonials slider ---------- */
  function slider() {
    const wrap = $('.testi');
    if (!wrap) return;
    const track = $('.testi__track', wrap);
    const cards = $$('.testi-card', track);
    const status = $('.testi__status', wrap);
    let i = 0;
    const perView = () => (innerWidth <= 640 ? 1 : innerWidth <= 1100 ? 2 : 3);
    const go = (d) => {
      const max = Math.max(0, cards.length - perView());
      i = Math.min(max, Math.max(0, i + d));
      const step = cards[0].offsetWidth + 20;
      track.style.transform = `translateX(${-i * step}px)`;
      if (status) status.textContent = `${String(i + 1).padStart(2, '0')} / ${String(max + 1).padStart(2, '0')}`;
    };
    $('.js-prev', wrap)?.addEventListener('click', () => go(-1));
    $('.js-next', wrap)?.addEventListener('click', () => go(1));
    window.addEventListener('resize', () => go(0));
    go(0);
  }

  /* ---------- Work filters ---------- */
  function filters() {
    const btns = $$('.filter');
    if (!btns.length) return;
    const cards = $$('.work-grid .work-card');
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-pressed', x === b));
      const f = b.dataset.filter;
      const show = cards.filter((c) => f === 'all' || c.dataset.cat.includes(f));
      cards.forEach((c) => c.classList.toggle('is-hidden', !show.includes(c)));
      if (motion) {
        G.fromTo(show, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.07 });
        ST.refresh();
      }
    }));
  }

  /* ---------- Work list hover preview ---------- */
  function rowPreview() {
    const prev = $('.row-preview');
    if (!prev || !fine || !G) return;
    const img = $('img', prev);
    const xTo = G.quickTo(prev, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = G.quickTo(prev, 'y', { duration: 0.6, ease: 'power3' });
    $$('.work-row').forEach((row) => {
      row.addEventListener('pointerenter', () => { img.src = row.dataset.img; prev.classList.add('is-on'); });
      row.addEventListener('pointerleave', () => prev.classList.remove('is-on'));
    });
    window.addEventListener('pointermove', (e) => { xTo(e.clientX + 30); yTo(e.clientY - 120); });
  }

  /* ---------- Pricing toggle ---------- */
  function pricing() {
    const bill = $('.billing');
    if (!bill) return;
    const btns = $$('button', bill);
    const thumb = $('.billing__thumb', bill);
    const place = (b) => { thumb.style.width = b.offsetWidth + 'px'; thumb.style.translate = (b.offsetLeft - 6) + 'px 0'; };
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-pressed', x === b));
      place(b);
      const mode = b.dataset.mode;
      $$('[data-price-' + mode + ']').forEach((el) => {
        const to = parseFloat(el.getAttribute('data-price-' + mode));
        const unit = el.parentElement.querySelector('.js-unit');
        if (unit) unit.textContent = mode === 'monthly' ? '/month' : '/project';
        if (motion) {
          const o = { v: parseFloat(el.textContent.replace(/,/g, '')) };
          G.to(o, { v: to, duration: 0.8, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString()) });
        } else el.textContent = to.toLocaleString();
      });
    }));
    requestAnimationFrame(() => place(btns.find((b) => b.getAttribute('aria-pressed') === 'true')));
    window.addEventListener('resize', () => place(btns.find((b) => b.getAttribute('aria-pressed') === 'true')));
  }

  /* ---------- Contact form ---------- */
  function form() {
    const f = $('.js-form');
    if (!f) return;
    const msg = $('textarea', f);
    const counter = $('.js-chars', f);
    msg?.addEventListener('input', () => (counter.textContent = msg.value.length));
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      $$('input[required], textarea[required]', f).forEach((inp) => {
        const err = inp.closest('.field')?.querySelector('.field__err');
        if (!inp.checkValidity()) {
          ok = false;
          if (err) err.textContent = inp.validity.valueMissing ? 'This field is required.' : 'Please enter a valid value.';
        } else if (err) err.textContent = '';
      });
      if (!ok) { f.querySelector(':invalid')?.focus(); return; }
      const name = f.name.value.split(' ')[0];
      f.innerHTML = `<div class="form-success" role="status">
        <div class="preloader__pill"><span></span><span></span></div>
        <h3 class="h3">Prescription received, <em>${name.replace(/[<>&"]/g, '')}</em>.</h3>
        <p class="lead">We'll review your project and reply within one business day with a first diagnosis.</p></div>`;
      if (motion) G.from('.form-success > *', { y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out' });
    });
    $$('input, textarea', f).forEach((inp) => inp.addEventListener('blur', () => {
      const err = inp.closest('.field')?.querySelector('.field__err');
      if (err && inp.checkValidity()) err.textContent = '';
    }));
  }

  /* ---------- Misc ---------- */
  function misc() {
    $$('.js-top').forEach((b) => b.addEventListener('click', () => scrollTo(0)));
    const clock = $('.js-clock');
    if (clock) {
      const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
      const tick = () => (clock.textContent = fmt.format(new Date()) + ' GMT+5');
      tick();
      setInterval(tick, 15000);
    }
    $$('.marquee-pause').forEach((b) => b.addEventListener('click', () => {
      const m = b.parentElement.querySelectorAll('.marquee');
      const paused = b.textContent.includes('Pause');
      m.forEach((x) => x.classList.toggle('is-paused', paused));
      b.textContent = paused ? 'Play motion' : 'Pause motion';
    }));
    // Anchor links via Lenis
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const t = $(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      scrollTo(t.getBoundingClientRect().top + window.scrollY - 90);
    }));
  }

  /* ---------- Boot ---------- */
  slider(); filters(); rowPreview(); pricing(); form(); misc(); cursor();
  const start = () => intro().then(() => {
    heroIn();
    rotator();
    wander();
    scrollAnims();
    if (ST) window.addEventListener('load', () => ST.refresh());
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
