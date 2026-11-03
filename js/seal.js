/* =========================================================
   06 · SOUVENIR PASS — a custom-drawn seal, not an official document.
   ========================================================= */
(function () {
  'use strict';

  const modal = document.getElementById('sealModal');
  const openBtn = document.getElementById('sealBtn');
  const closeBtn = document.getElementById('sealClose');
  const againBtn = document.getElementById('sealAgain');
  const downloadBtn = document.getElementById('sealDownload');
  const canvas = document.getElementById('sealCanvas');
  if (!modal || !canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 640;
  const H = 640;
  const CX = W / 2;
  const CY = H / 2;
  const INK = '#061311';
  const CORAL = '#e4552f';
  const TURMERIC = '#b47b28';
  const PAPER = '#f1eadb';
  let serial = '';
  let lastFocus = null;

  const pad = (n) => String(n).padStart(2, '0');

  function makeSerial() {
    const d = new Date();
    const salt = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `HN-${d.getFullYear()}-${pad(d.getMonth() + 1)}${pad(d.getDate())}-${salt}`;
  }

  function arcText(text, radius, centerAngle, size, color, tracking) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `500 ${size}px "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chars = Array.from(text);
    const widths = chars.map((c) => ctx.measureText(c).width + (tracking || 0));
    const total = widths.reduce((a, b) => a + b, 0);
    let a = centerAngle - total / (2 * radius);
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i];
      a += w / (2 * radius);
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(chars[i], 0, -radius);
      ctx.restore();
      a += w / (2 * radius);
    }
    ctx.restore();
  }

  function drawHainan(scale, alpha) {
    const pts = window.HAINAN_OUTLINE && window.HAINAN_OUTLINE.points;
    if (!pts || !pts.length) return;
    ctx.save();
    ctx.translate(CX, CY + 4);
    ctx.scale(scale, scale);
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const px = (x / 1000 - 0.5) * 400;
      const py = (y / 1000 - 0.5) * 400;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = `rgba(228,85,47,${alpha})`;
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    serial = makeSerial();
    ctx.clearRect(0, 0, W, H);

    // A quiet paper disc; the card behind it is already salt.
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, 300, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(241,234,219,0.22)';
    ctx.fill();
    ctx.restore();

    // Outer double ring + tick ring.
    ctx.save();
    ctx.translate(CX, CY);
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.82;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, 296, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = CORAL;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, 279, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const r1 = 282;
      const r2 = i % 8 === 0 ? 270 : 275;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();

    // Circular type.
    arcText('HAINAN · FREE TRADE PORT · 2026', 252, -Math.PI / 2, 15, TURMERIC, 2.2);
    arcText('全 岛 封 关 运 作 第 一 年 · P A S S A G E', 252, Math.PI / 2, 13, INK, 1.4);

    // Inner hairline ring.
    ctx.save();
    ctx.strokeStyle = 'rgba(6,19,17,0.22)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(CX, CY, 218, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    drawHainan(0.72, 0.3);

    // Central word.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = '600 124px "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif';
    ctx.fillText('过', CX - 66, CY - 18);
    ctx.fillText('关', CX + 66, CY - 18);
    ctx.restore();

    // A thin coral rule under the word.
    ctx.save();
    ctx.strokeStyle = CORAL;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CX - 92, CY + 78);
    ctx.lineTo(CX + 92, CY + 78);
    ctx.stroke();
    ctx.restore();

    // Small metadata.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = '500 13px "IBM Plex Mono", "Consolas", monospace';
    ctx.fillText('2025.12.18  —  2026.12.18', CX, CY + 108);
    ctx.fillStyle = 'rgba(6,19,17,0.58)';
    ctx.font = '400 10px "IBM Plex Mono", "Consolas", monospace';
    ctx.fillText('SOUVENIR PASS / 纪念关封 / NOT AN OFFICIAL DOCUMENT', CX, CY + 140);
    ctx.fillStyle = CORAL;
    ctx.fillText(`NO. ${serial}`, CX, CY + 168);
    ctx.restore();

    // A dry-ink speckle pass: subtle, not decorative noise.
    ctx.save();
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 280;
      const x = CX + Math.cos(a) * r;
      const y = CY + Math.sin(a) * r;
      const alpha = Math.random() * 0.07;
      ctx.fillStyle = `rgba(6,19,17,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 0.9 + 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // A faint coral offset, like a hand-stamped edge.
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = CORAL;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(CX + 2, CY + 2, 296, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function open() {
    draw();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    lastFocus = document.activeElement;
    closeBtn?.focus({ preventScroll: true });
  }

  function close() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    lastFocus?.focus({ preventScroll: true });
  }

  function download() {
    const link = document.createElement('a');
    link.download = `hainan-passage-2026-${serial}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  againBtn?.addEventListener('click', draw);
  downloadBtn?.addEventListener('click', download);

  window.Seal = { open, close, draw };
})();
