/* =========================================================
   过关 / PASSAGE — orchestration
   Loader, theme, rail, reveals, index, industry, tide, gate, sound.
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- loader ---------- */
  const loader = $('#loader');
  const bar = $('#loaderBar');
  const pct = $('#loaderPct');
  let progress = 0;
  let loaderDone = false;

  function setLoader(v) {
    progress = Math.max(progress, Math.min(100, v));
    if (bar) bar.style.width = progress + '%';
    if (pct) pct.textContent = String(Math.round(progress)).padStart(2, '0');
  }

  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    setLoader(100);
    setTimeout(() => {
      if (loader) loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      window.setTimeout(() => { if (loader) loader.style.display = 'none'; }, 1000);
    }, reduceMotion ? 40 : 380);
  }

  if (reduceMotion) {
    finishLoader();
  } else {
    const tick = window.setInterval(() => {
      if (progress < 88) setLoader(progress + Math.max(0.6, (88 - progress) * 0.025));
    }, 80);
    window.addEventListener('load', () => {
      window.clearInterval(tick);
      setLoader(94);
      setTimeout(finishLoader, 420);
    }, { once: true });
    // Do not let a slow image hold the experience hostage.
    setTimeout(() => {
      window.clearInterval(tick);
      finishLoader();
    }, 3600);
  }

  // If load already fired before this script, release quickly.
  if (document.readyState === 'complete') {
    setTimeout(finishLoader, 200);
  }

  /* ---------- reveal ---------- */
  const revealItems = $$('[data-reveal]');
  if (revealItems.length && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.14 });
    revealItems.forEach((el) => io.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add('is-in'));
  }

  const board = $('.board');
  if (board) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          board.classList.add('is-in');
          io.unobserve(board);
        }
      });
    }, { threshold: 0.25 });
    io.observe(board);
  }

  const timeline = $('.timeline');
  if (timeline) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          timeline.classList.add('is-in');
          io.unobserve(timeline);
        }
      });
    }, { threshold: 0.35 });
    io.observe(timeline);
  }

  const gatePin = $('.gate-pin');
  if (gatePin) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) gatePin.classList.add('is-on');
      });
    }, { threshold: 0.28 });
    io.observe(gatePin);
  }

  /* ---------- industry accordion ---------- */
  const industries = $$('.industry');
  industries.forEach((item) => {
    const btn = $('button', item);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      industries.forEach((other) => {
        other.classList.remove('is-open');
        const b = $('button', other);
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
    // Desktop: a light hover preview, but never steals a click state.
    if (window.matchMedia('(hover: hover)').matches) {
      item.addEventListener('mouseenter', () => item.classList.add('is-hover'));
      item.addEventListener('mouseleave', () => item.classList.remove('is-hover'));
    }
  });

  /* ---------- index panel ---------- */
  const indexPanel = $('#indexPanel');
  const indexBtn = $('#indexBtn');
  const indexClose = $('#indexClose');
  let lastFocus = null;

  function setIndex(open) {
    if (!indexPanel || !indexBtn) return;
    indexPanel.classList.toggle('is-open', open);
    indexPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    indexBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('is-locked', open);
    if (open) {
      lastFocus = document.activeElement;
      indexPanel.querySelector('a, button')?.focus({ preventScroll: true });
    } else if (lastFocus) {
      lastFocus.focus({ preventScroll: true });
    }
  }

  indexBtn?.addEventListener('click', () => setIndex(!indexPanel.classList.contains('is-open')));
  indexClose?.addEventListener('click', () => setIndex(false));
  indexPanel?.addEventListener('click', (e) => {
    if (e.target === indexPanel) setIndex(false);
    if (e.target.closest('a')) setIndex(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (indexPanel?.classList.contains('is-open')) setIndex(false);
      if (document.querySelector('.seal-modal.is-open')) window.Seal?.close();
    }
  });

  /* ---------- theme, rail, chapter ---------- */
  const sections = $$('main > section');
  const railLinks = $$('#railList a');
  const chapterLabel = $('#chapterLabel');
  const railProgress = $('#railProgress');
  const chapterNames = {
    overture: '00 / 序',
    line: '01 / 线',
    tide: '02 / 潮',
    island: '03 / 岛',
    people: '04 / 人',
    gate: '05 / 门',
    coda: '06 / 海',
  };
  let activeTheme = 'dark';
  let activeId = 'overture';

  function updateChrome() {
    const vh = window.innerHeight;
    let best = sections[0] || null;
    sections.forEach((sec) => {
      const r = sec.getBoundingClientRect();
      if (r.top <= vh * 0.46) best = sec;
    });
    if (!best) return;

    const theme = best.dataset.theme || 'dark';
    if (theme !== activeTheme) {
      activeTheme = theme;
      document.body.dataset.theme = theme;
    }
    if (best.id !== activeId) {
      activeId = best.id;
      if (chapterLabel) chapterLabel.textContent = chapterNames[best.id] || '';
      railLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + best.id));
    }

    const max = document.documentElement.scrollHeight - vh;
    const p = clamp(window.scrollY / Math.max(1, max), 0, 1);
    if (railProgress) railProgress.style.height = (p * 100) + '%';
    document.body.classList.toggle('at-foot', p > 0.985);
  }

  let chromeRaf = 0;
  function requestChrome() {
    if (chromeRaf) return;
    chromeRaf = requestAnimationFrame(() => {
      chromeRaf = 0;
      updateChrome();
    });
  }
  window.addEventListener('scroll', requestChrome, { passive: true });
  window.addEventListener('resize', requestChrome, { passive: true });
  updateChrome();

  /* ---------- smooth-ish anchor focus ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      // Native smooth scrolling is best on touch; only guard focus.
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      try { history.replaceState(null, '', id); } catch (e) { /* file:// */ }
    });
  });

  /* ---------- tide canvas ---------- */
  (function initTide() {
    const canvas = $('#tideCanvas');
    const section = $('#tide');
    if (!canvas || !section) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, DPR = 1, visible = false, raf = 0, t0 = performance.now();

    function size() {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      DPR = Math.min(window.devicePixelRatio || 1, 1.7);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (!visible || document.hidden) return;
      ctx.clearRect(0, 0, W, H);
      const t = (now - t0) * 0.00028;
      const layers = [
        { y: 0.48, a: 0.032, f: 1.0, s: 1.0, c: 'rgba(143,182,164,0.32)', w: 1 },
        { y: 0.58, a: 0.048, f: 0.72, s: 1.18, c: 'rgba(214,162,63,0.30)', w: 1.2 },
        { y: 0.70, a: 0.055, f: 1.35, s: 0.86, c: 'rgba(228,85,47,0.28)', w: 1 },
      ];
      layers.forEach((L, idx) => {
        ctx.beginPath();
        for (let x = -10; x <= W + 10; x += 4) {
          const u = x / W;
          const y = H * L.y
            + Math.sin(u * Math.PI * 2 * L.f + t * L.s + idx * 1.8) * H * L.a
            + Math.sin(u * Math.PI * 5.2 * L.f - t * 0.62 + idx) * H * L.a * 0.34;
          if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = L.c;
        ctx.lineWidth = L.w;
        ctx.stroke();
        // a second, quieter echo line
        ctx.save();
        ctx.translate(0, 10 + idx * 5);
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = L.c;
        ctx.stroke();
        ctx.restore();
      });
    }

    size();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { visible = e.isIntersecting; });
    }, { rootMargin: '10% 0px', threshold: 0 });
    io.observe(section);
    window.addEventListener('resize', () => { size(); }, { passive: true });

    const water = document.querySelector('#tideWater');
    function tideLevel() {
      const r = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = clamp((-r.top) / Math.max(1, total), 0, 1);
      if (water) water.style.height = (18 + p * 66) + '%';
    }
    window.addEventListener('scroll', tideLevel, { passive: true });
    tideLevel();
    raf = requestAnimationFrame(draw);
  })();

  /* ---------- gate canvas + scroll zoom ---------- */
  (function initGate() {
    const canvas = $('#gateCanvas');
    const section = $('#gate');
    if (!canvas || !section) return;
    const bg = $('.gate__bg');
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, DPR = 1, visible = false, raf = 0;
    const dots = [];
    const count = 72;

    function size() {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      DPR = Math.min(window.devicePixelRatio || 1, 1.7);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function seed() {
      dots.length = 0;
      for (let i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.4 + Math.random() * 1.5,
          s: 0.08 + Math.random() * 0.28,
          a: Math.random() * Math.PI * 2,
          p: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (!visible || document.hidden) return;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.5;
      const cy = H * 0.52;
      // a very soft central haze
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.52);
      g.addColorStop(0, 'rgba(214,162,63,0.055)');
      g.addColorStop(0.42, 'rgba(228,85,47,0.02)');
      g.addColorStop(1, 'rgba(6,19,17,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const d of dots) {
        const drift = (now * 0.00002 * d.s + d.p) % 1;
        const x = d.x + Math.sin(now * 0.0002 + d.a) * 16;
        const y = d.y - drift * H * 0.18;
        const wrapped = ((y % H) + H) % H;
        const alpha = 0.08 + 0.38 * Math.sin(Math.PI * drift);
        ctx.beginPath();
        ctx.arc(x, wrapped, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(241,234,219,${alpha})`;
        ctx.fill();
      }
      ctx.restore();
    }

    function scrollProgress() {
      const r = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      return clamp((-r.top) / Math.max(1, total), 0, 1);
    }

    function update() {
      if (bg) {
        const p = scrollProgress();
        bg.style.transform = `scale(${1.07 + p * 0.12}) translate3d(0, ${p * -1.2}%, 0)`;
      }
    }

    size();
    seed();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { visible = e.isIntersecting; });
    }, { rootMargin: '15% 0px', threshold: 0 });
    io.observe(section);
    window.addEventListener('resize', () => { size(); seed(); }, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    update();
    raf = requestAnimationFrame(draw);
  })();

  /* ---------- coda aperture ---------- */
  (function initCodaAperture() {
    const canvas = document.querySelector('#codaCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 600;
    const H = 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = W / 2;
    const cy = H / 2;
    const R = 238;
    const INK = '#061311';
    const CORAL = '#e4552f';
    const TURMERIC = '#a56f20';

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Broken ring: the gate, one last time.
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, R, Math.PI * 0.18, Math.PI * 1.82);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(6,19,17,0.2)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, R - 11, Math.PI * 0.18, Math.PI * 1.82);
      ctx.stroke();
      ctx.restore();

      // Tick ring
      ctx.save();
      ctx.strokeStyle = 'rgba(6,19,17,0.22)';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const r1 = R - 18;
        const r2 = i % 6 === 0 ? R - 28 : R - 23;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }
      ctx.restore();

      // Hainan, returning as a watermark.
      const pts = window.HAINAN_OUTLINE && window.HAINAN_OUTLINE.points;
      if (pts && pts.length) {
        ctx.save();
        ctx.translate(cx, cy + 2);
        ctx.rotate(-0.045);
        ctx.beginPath();
        pts.forEach(([x, y], i) => {
          const px = (x / 1000 - 0.5) * 300;
          const py = (y / 1000 - 0.5) * 300;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.strokeStyle = 'rgba(6,19,17,0.3)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.fillStyle = 'rgba(228,85,47,0.035)';
        ctx.fill();
        ctx.restore();
      }

      // Vertical gate line + 2026.
      ctx.save();
      ctx.strokeStyle = 'rgba(228,85,47,0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 32);
      ctx.lineTo(cx, cy + 34);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - 32, 2, 0, Math.PI * 2);
      ctx.fillStyle = CORAL;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = INK;
      ctx.font = '500 72px "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif';
      ctx.fillText('2026', cx, cy + 88);
      ctx.fillStyle = TURMERIC;
      ctx.font = '500 9px "IBM Plex Mono", "Consolas", monospace';
      ctx.fillText('FIRST YEAR / THE OPEN SEA', cx, cy + 132);
      ctx.fillStyle = 'rgba(6,19,17,0.42)';
      ctx.font = '400 8px "IBM Plex Mono", "Consolas", monospace';
      ctx.fillText('线 还 在 · 门 已 经 开 了', cx, cy + 158);
      ctx.restore();

      // A few dry grains.
      ctx.save();
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (R - 26);
        ctx.fillStyle = `rgba(6,19,17,${Math.random() * 0.08})`;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.random() * 0.8 + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    draw();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) draw(); });
    }, { threshold: 0.2 });
    io.observe(canvas);
  })();

  /* ---------- sound ---------- */
  (function initSound() {
    const btn = $('#soundBtn');
    const label = $('#soundLabel');
    if (!btn || !label) return;
    let audio = null;
    let on = false;
    let available = true;

    function ensure() {
      if (audio) return audio;
      audio = new Audio();
      audio.src = 'assets/audio/ambient-hainan.mp3';
      audio.loop = true;
      audio.preload = 'none';
      audio.volume = 0;
      audio.addEventListener('error', () => {
        available = false;
        btn.style.opacity = '0.4';
        label.textContent = 'SOUND —';
        btn.setAttribute('aria-disabled', 'true');
      });
      return audio;
    }

    async function toggle() {
      if (!available) return;
      const a = ensure();
      if (!on) {
        try {
          a.volume = 0;
          await a.play();
          const target = 0.23;
          let v = 0;
          const fade = setInterval(() => {
            v = Math.min(target, v + 0.015);
            a.volume = v;
            if (v >= target) clearInterval(fade);
          }, 50);
          on = true;
          document.body.classList.add('sound-on');
          btn.setAttribute('aria-pressed', 'true');
          label.textContent = 'SOUND ON';
        } catch (e) {
          available = false;
          label.textContent = 'SOUND —';
          btn.style.opacity = '0.4';
        }
      } else {
        let v = a.volume;
        const fade = setInterval(() => {
          v = Math.max(0, v - 0.02);
          a.volume = v;
          if (v <= 0) {
            clearInterval(fade);
            a.pause();
          }
        }, 45);
        on = false;
        document.body.classList.remove('sound-on');
        btn.setAttribute('aria-pressed', 'false');
        label.textContent = 'SOUND OFF';
      }
    }

    btn.addEventListener('click', toggle);
  })();

  // Seal module is separate; it self-initialises on DOM ready.
})();
