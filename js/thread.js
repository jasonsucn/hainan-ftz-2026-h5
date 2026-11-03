/* =========================================================
   01 · THE LINE — a thread that becomes an island, then a gate.
   Canvas 2D. No libraries. Data: simplified Hainan outline.
   ========================================================= */
(function () {
  'use strict';

  const canvas = document.getElementById('threadCanvas');
  const section = document.getElementById('line');
  if (!canvas || !section) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const OUTLINE = window.HAINAN_OUTLINE;
  const N = 720;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobileQuery = window.matchMedia('(max-width: 860px)');

  let W = 0;
  let H = 0;
  let DPR = 1;
  let linePts = [];
  let islandPts = [];
  let gatePts = [];
  let raf = 0;
  let lastP = -1;
  let dragOpen = 0;
  let pointerX = 0.5;
  let pointerY = 0.5;
  let smoothPointerX = 0.5;
  let smoothPointerY = 0.5;
  let visible = true;
  let built = false;
  let ticks = [];
  let particles = [];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const TAU = Math.PI * 2;

  function resample(points, count) {
    const pts = points.slice();
    if (pts.length > 1) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.001) pts.pop();
    }
    const seg = [];
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      seg.push(len);
      total += len;
    }
    const out = [];
    let target = 0;
    let walked = 0;
    let i = 0;
    for (let k = 0; k < count; k++) {
      target = (total * k) / count;
      while (walked + seg[i] < target && i < pts.length - 1) {
        walked += seg[i];
        i++;
      }
      const t = seg[i] ? (target - walked) / seg[i] : 0;
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
    }
    return out;
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    DPR = Math.min(window.devicePixelRatio || 1, 1.85);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // A thread across the viewport.
    linePts = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = -W * 0.045 + t * W * 1.09;
      const y = H * 0.565 + Math.sin(t * Math.PI * 2.1) * H * 0.009 + Math.sin(t * Math.PI * 5) * H * 0.0025;
      linePts.push([x, y]);
    }

    // The island: use the real simplified coastline.
    const mobile = isMobileQuery.matches;
    const size = mobile ? Math.min(W * 0.74, H * 0.34) : Math.min(W * 0.42, H * 0.62);
    const cx = W * (mobile ? 0.5 : 0.41);
    const cy = H * (mobile ? 0.37 : 0.485);
    const gateCx = W * 0.5;
    const gateCy = H * (mobile ? 0.44 : 0.485);
    const rotation = -0.045;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const raw = (OUTLINE && OUTLINE.points ? OUTLINE.points : []).map(([nx, ny]) => {
      let x = (nx / 1000 - 0.5) * size;
      let y = (ny / 1000 - 0.5) * size;
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;
      return [cx + rx, cy + ry];
    });

    // Start the island at its top-most point so the line→island morph
    // does not make a 300° twist.
    if (raw.length) {
      let top = 0;
      for (let i = 1; i < raw.length; i++) if (raw[i][1] < raw[top][1]) top = i;
      const shifted = raw.slice(top).concat(raw.slice(0, top));
      islandPts = resample(shifted, N);
    } else {
      islandPts = linePts.map((p) => [p[0], p[1]]);
    }

    // The gate: a thin ellipse that can open on the right.
    const R = Math.min(W * (mobile ? 0.34 : 0.40), H * 0.33);
    gatePts = [];
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const a = -Math.PI / 2 + t * TAU;
      gatePts.push([gateCx + Math.cos(a) * R, gateCy + Math.sin(a) * R * 1.04]);
    }

    // Fixed tick marks around the island (ports / checkpoints).
    ticks = [];
    for (let i = 0; i < 22; i++) {
      const idx = Math.floor((i / 22) * N);
      const p = islandPts[idx];
      const q = islandPts[(idx + 2) % N];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy) || 1;
      ticks.push({ p, nx: -dy / len, ny: dx / len, big: i % 5 === 0 });
    }

    // Sparse salt grains, used only near the gate.
    particles = [];
    const pCount = mobile ? 54 : 110;
    for (let i = 0; i < pCount; i++) {
      particles.push({
        a: Math.random() * TAU,
        r: Math.random(),
        s: 0.15 + Math.random() * 0.5,
        z: Math.random(),
        phase: Math.random() * TAU,
      });
    }

    built = true;
    lastP = -1;
  }

  function stateAt(p) {
    const mixIsland = easeInOut(clamp((p - 0.10) / 0.28, 0, 1));
    const mixGate = easeInOut(clamp((p - 0.64) / 0.22, 0, 1));
    const scrollOpen = smoothstep(0.87, 0.985, p);
    const open = clamp(Math.max(scrollOpen, dragOpen), 0, 1);
    return { mixIsland, mixGate, open };
  }

  function buildPath(points, closed) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    if (closed) ctx.closePath();
  }

  function draw(p, now) {
    if (!built) return;
    const { mixIsland, mixGate, open } = stateAt(p);
    const mobile = isMobileQuery.matches;
    const cx = W * (mobile ? 0.5 : 0.41);
    const cy = H * (mobile ? 0.37 : 0.485);
    const gateCx = W * 0.5;
    const gateCy = H * (mobile ? 0.44 : 0.485);

    // Smooth pointer, tiny influence only.
    smoothPointerX += (pointerX - smoothPointerX) * 0.045;
    smoothPointerY += (pointerY - smoothPointerY) * 0.045;
    const px = (smoothPointerX - 0.5) * 2;
    const py = (smoothPointerY - 0.5) * 2;

    const pts = new Array(N);
    for (let i = 0; i < N; i++) {
      let l = linePts[i];
      let isl = islandPts[i];
      let g = gatePts[i];

      let x = lerp(l[0], isl[0], mixIsland);
      let y = lerp(l[1], isl[1], mixIsland);
      x = lerp(x, g[0], mixGate);
      y = lerp(y, g[1], mixGate);

      // A breathing thread: very small, content-like.
      if (!reduceMotion) {
        const breath = Math.sin(now * 0.00055 + i * 0.026) * (0.6 + mixGate * 1.4);
        x += (px * 3.2 + breath * 0.55) * (1 - mixIsland * 0.5);
        y += (py * 2.4 + breath) * (1 - mixGate * 0.55);
      }
      pts[i] = [x, y];
    }

    ctx.clearRect(0, 0, W, H);

    // Soft light behind the center as the line becomes an island/gate.
    if (mixIsland > 0.02) {
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.42);
      const a = 0.05 * mixIsland + 0.10 * mixGate;
      glow.addColorStop(0, `rgba(214,162,63,${a})`);
      glow.addColorStop(0.44, `rgba(228,85,47,${a * 0.35})`);
      glow.addColorStop(1, 'rgba(6,19,17,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }

    // Island body: barely there, just enough to hold the thread.
    if (mixIsland > 0.06) {
      buildPath(pts, true);
      ctx.closePath();
      ctx.save();
      ctx.globalAlpha = smoothstep(0.02, 0.5, mixIsland) * 0.62;
      const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.42);
      fill.addColorStop(0, 'rgba(13,36,30,0.78)');
      fill.addColorStop(0.6, 'rgba(8,26,22,0.46)');
      fill.addColorStop(1, 'rgba(6,19,17,0.08)');
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }

    // The thread itself: three passes, no shadowBlur.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    buildPath(pts, mixIsland > 0.02 || mixGate > 0.02);
    ctx.strokeStyle = `rgba(228,85,47,${0.22 + 0.1 * mixIsland})`;
    ctx.lineWidth = 12 + mixGate * 4;
    ctx.stroke();
    ctx.strokeStyle = `rgba(228,85,47,${0.8 + 0.1 * mixGate})`;
    ctx.lineWidth = 3.1;
    ctx.stroke();
    ctx.strokeStyle = `rgba(241,234,219,${0.96})`;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // A dashed inner line, like a stitching thread.
    ctx.save();
    ctx.setLineDash([0.8, 14]);
    ctx.lineDashOffset = reduceMotion ? 0 : -now * 0.018;
    ctx.strokeStyle = `rgba(214,162,63,${0.22 + mixIsland * 0.25})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();

    // Beads along the thread.
    const beadStep = 22;
    for (let i = 0; i < N; i += beadStep) {
      const b = pts[i];
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.0016 + i * 0.05);
      const r = 0.9 + pulse * 0.75 + mixGate * 0.35;
      ctx.beginPath();
      ctx.arc(b[0], b[1], r, 0, TAU);
      ctx.fillStyle = i % 66 === 0 ? `rgba(228,85,47,${0.55 + pulse * 0.3})` : `rgba(241,234,219,${0.28 + pulse * 0.26})`;
      ctx.fill();
    }

    // Island ticks: port / checkpoint marks, not a map label.
    if (mixIsland > 0.42) {
      ctx.save();
      ctx.globalAlpha = smoothstep(0.42, 0.72, mixIsland);
      for (const t of ticks) {
        const len = t.big ? 8 : 4.5;
        ctx.beginPath();
        ctx.moveTo(t.p[0] + t.nx * 5, t.p[1] + t.ny * 5);
        ctx.lineTo(t.p[0] + t.nx * (5 + len), t.p[1] + t.ny * (5 + len));
        ctx.strokeStyle = t.big ? 'rgba(228,85,47,0.92)' : 'rgba(214,162,63,0.54)';
        ctx.lineWidth = t.big ? 1.2 : 0.8;
        ctx.stroke();
        if (t.big) {
          ctx.beginPath();
          ctx.arc(t.p[0], t.p[1], 2.2, 0, TAU);
          ctx.fillStyle = 'rgba(241,234,219,0.9)';
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // The gate opens: cut a wedge, then let light through.
    if (mixGate > 0.01) {
      const R = Math.min(W * (mobile ? 0.34 : 0.40), H * 0.33);
      const openAngle = 0.035 + open * 0.46;
      if (open > 0.002) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(gateCx, gateCy);
        ctx.arc(gateCx, gateCy, R * 1.8, -openAngle, openAngle);
        ctx.closePath();
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();

        // Warm light spill through the opening.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const beam = ctx.createRadialGradient(gateCx, gateCy, 0, gateCx, gateCy, R * 1.4);
        beam.addColorStop(0, `rgba(241,234,219,${0.34 * open})`);
        beam.addColorStop(0.28, `rgba(214,162,63,${0.22 * open})`);
        beam.addColorStop(1, 'rgba(6,19,17,0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(gateCx, gateCy);
        ctx.arc(gateCx, gateCy, R * 1.55, -openAngle * 0.55, openAngle * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Sparse salt grains drift toward the gate opening.
    if (mixGate > 0.08) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const q of particles) {
        const t = (now * 0.00004 * q.s + q.z) % 1;
        const radial = R(0.18, 0.95, t);
        const ang = q.a + Math.sin(now * 0.0002 + q.phase) * 0.15;
        const x = gateCx + Math.cos(ang) * radial * (0.5 + 0.6 * q.z);
        const y = gateCy + Math.sin(ang) * radial * (0.6 + 0.4 * q.z);
        const alpha = (0.08 + 0.42 * Math.sin(Math.PI * t)) * mixGate;
        ctx.beginPath();
        ctx.arc(x, y, 0.7 + q.s * 1.2, 0, TAU);
        ctx.fillStyle = `rgba(241,234,219,${alpha})`;
        ctx.fill();
      }
      ctx.restore();
    }

    function R(min, max, t) {
      return min + (max - min) * t;
    }
  }

  function progress() {
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp((-rect.top) / total, 0, 1);
  }

  function setState(p) {
    const copy = document.getElementById('lineCopy');
    const date = document.getElementById('lineDate');
    const stage = document.getElementById('lineStage');
    const policy = document.getElementById('policyStack');
    const stats = document.getElementById('lineStats');
    const gate = document.getElementById('lineGate');
    const drag = document.getElementById('lineDrag');
    if (copy) copy.classList.toggle('is-dim', p > 0.22);
    if (date) date.classList.toggle('is-dim', p > 0.18);
    if (stage) {
      stage.classList.toggle('is-on', p > 0.20);
      const cap = stage.querySelector('span + span');
      if (cap) cap.textContent = p > 0.68 ? '一条线，正在成为一扇门' : '一条线，正在成为一座岛';
    }
    if (policy) {
      const on = p > 0.30 && p < 0.68;
      policy.classList.toggle('is-on', on);
      policy.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    if (stats) {
      const on = p > 0.40 && p < 0.73;
      stats.classList.toggle('is-on', on);
      stats.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    if (gate) {
      const on = p > 0.78;
      gate.classList.toggle('is-on', on);
      gate.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    if (drag) {
      const on = p > 0.82;
      drag.classList.toggle('is-on', on);
      drag.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const p = progress();
    if (Math.abs(p - lastP) > 0.0005 || lastP < 0) {
      draw(p, now);
      setState(p);
      lastP = p;
    } else if (p > 0.80) {
      // keep the gate breathing even when the scroll is still
      draw(p, now);
    }
  }

  function init() {
    if (!OUTLINE || !OUTLINE.points) return;
    build();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { visible = e.isIntersecting; });
    }, { rootMargin: '20% 0px 20% 0px', threshold: 0 });
    io.observe(section);

    const p = progress();
    draw(p, performance.now());
    setState(p);
    lastP = p;
    raf = requestAnimationFrame(frame);

    window.addEventListener('resize', () => {
      clearTimeout(window.__threadResize);
      window.__threadResize = setTimeout(() => {
        build();
        draw(progress(), performance.now());
        lastP = -1;
      }, 180);
    }, { passive: true });

    window.addEventListener('pointermove', (e) => {
      pointerX = clamp(e.clientX / window.innerWidth, 0, 1);
      pointerY = clamp(e.clientY / window.innerHeight, 0, 1);
    }, { passive: true });

    // Optional drag on the gate hint: a small reward, not a gate.
    const knob = document.getElementById('lineDrag');
    if (knob) {
      let dragging = false;
      let startX = 0;
      const start = (e) => {
        dragging = true;
        startX = (e.touches ? e.touches[0].clientX : e.clientX);
        knob.style.cursor = 'grabbing';
      };
      const move = (e) => {
        if (!dragging) return;
        const x = (e.touches ? e.touches[0].clientX : e.clientX);
        const w = knob.getBoundingClientRect().width || 1;
        dragOpen = clamp((x - startX) / (w * 0.7), 0, 1);
        lastP = -1;
      };
      const end = () => {
        dragging = false;
        knob.style.cursor = '';
        if (dragOpen > 0.5) dragOpen = 1;
        lastP = -1;
      };
      knob.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        start(e);
        knob.setPointerCapture && knob.setPointerCapture(e.pointerId);
      });
      knob.addEventListener('pointermove', move);
      knob.addEventListener('pointerup', end);
      knob.addEventListener('pointercancel', end);
      knob.addEventListener('click', () => {
        if (dragOpen < 0.5) { dragOpen = 1; lastP = -1; }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
