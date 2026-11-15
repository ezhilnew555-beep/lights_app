const { SCREENS, CONCEPTS, ICONS, MOCK_DATA, renderGlobalHeader } = require('./shared');

function getConcept5Css() {
  return `
/* ==========================================================================
   CONCEPT 5: LUXURY WEALTH PLATFORM (Private Banking / Amex Centurion)
   ========================================================================== */

:root {
  --font-serif: 'Playfair Display', 'Cormorant Garamond', Didot, 'Bodoni MT', Georgia, serif;
  --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Cinzel', Roboto, sans-serif;
  --font-mono: 'Cinzel', 'SF Mono', Consolas, serif;

  /* Theme Tokens: Light (Parchment Alabaster & Champagne Gold) */
  --bg-app: #FBF9F5;
  --bg-surface: #FFFFFF;
  --bg-surface-muted: #F4EFE6;
  --bg-surface-elevated: #FFFFFF;
  --border-subtle: #E8DFD1;
  --border-focus: #C5A059;

  --text-primary: #1A1615;
  --text-secondary: #59524C;
  --text-muted: #9E958C;
  --text-inverse: #FFFFFF;

  --primary: #C5A059;
  --primary-light: #D4AF37;
  --primary-soft: #F9F5EC;
  --primary-dark: #8C6D3F;

  --income: #2E7D32;
  --income-soft: #E8F5E9;
  --expense: #C2185B;
  --expense-soft: #FCE4EC;

  --warning: #B78103;
  --warning-soft: #FFF8E1;
  --accent-gold: #D4AF37;
  --accent-bronze: #8C6D3F;

  --shadow-sm: 0 2px 6px rgba(197, 160, 89, 0.08);
  --shadow-md: 0 6px 18px rgba(197, 160, 89, 0.12);
  --shadow-lg: 0 16px 36px rgba(26, 22, 21, 0.08);
  --shadow-primary: 0 4px 16px rgba(197, 160, 89, 0.25);

  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  --sidebar-w: 260px;
  --topbar-h: 64px;
}

[data-theme="dark"] {
  --bg-app: #080808;
  --bg-surface: #121212;
  --bg-surface-muted: #1A1A1A;
  --bg-surface-elevated: #222222;
  --border-subtle: #2A251D;
  --border-focus: #D4AF37;

  --text-primary: #FAF7F2;
  --text-secondary: #B8B0A2;
  --text-muted: #6B6357;
  --text-inverse: #080808;

  --primary: #D4AF37;
  --primary-light: #E5C158;
  --primary-soft: rgba(212, 175, 55, 0.12);
  --primary-dark: #AA7C11;

  --income: #4ADE80;
  --income-soft: rgba(74, 222, 128, 0.12);
  --expense: #FB7185;
  --expense-soft: rgba(251, 113, 133, 0.12);

  --warning: #FBBF24;
  --warning-soft: rgba(251, 191, 36, 0.12);
  --accent-gold: #D4AF37;
  --accent-bronze: #C5A059;

  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.8);
  --shadow-md: 0 6px 20px rgba(0, 0, 0, 0.9);
  --shadow-lg: 0 16px 40px rgba(212, 175, 55, 0.15);
  --shadow-primary: 0 4px 20px rgba(212, 175, 55, 0.35);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-main);
  background: var(--bg-app);
  color: var(--text-primary);
  line-height: 1.55;
  min-height: 100vh;
}

/* Global Switcher Topbar */
.proto-topbar {
  position: sticky;
  top: 0;
  z-index: 999;
  height: var(--topbar-h);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.proto-topbar-left, .proto-topbar-right { display: flex; align-items: center; gap: 14px; }
.proto-hub-link {
  display: inline-flex; align-items: center; gap: 8px;
  text-decoration: none; color: var(--text-primary); font-size: 13.5px;
  font-family: var(--font-serif); letter-spacing: 0.04em;
}

.proto-hub-icon {
  width: 26px; height: 26px; border-radius: var(--radius-sm);
  background: var(--primary-soft); color: var(--primary);
  display: flex; align-items: center; justify-content: center; font-size: 12px;
}

.proto-divider { width: 1px; height: 18px; background: var(--border-subtle); }
.proto-concept-badge {
  display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--primary);
}

.proto-concept-indicator {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--primary); box-shadow: 0 0 8px var(--primary);
}

.proto-switcher-wrap { display: flex; align-items: center; gap: 8px; }
.proto-switcher-label { font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.proto-select {
  padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 12px; font-family: var(--font-serif); outline: none;
}

.proto-theme-btn, .proto-ds-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px;
  border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 12px; font-weight: 600;
  text-decoration: none; cursor: pointer; letter-spacing: 0.04em;
}

.proto-ds-btn.active { background: var(--primary); color: #080808; font-weight: 700; }
.theme-icon-dark { display: none; }
[data-theme="dark"] .theme-icon-light { display: none; }
[data-theme="dark"] .theme-icon-dark { display: inline-flex; }

/* Shell */
.app-layout { display: flex; min-height: calc(100vh - var(--topbar-h)); }

/* Bespoke Luxury Sidebar */
.app-sidebar {
  width: var(--sidebar-w);
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: sticky;
  top: var(--topbar-h);
  height: calc(100vh - var(--topbar-h));
  overflow-y: auto;
  padding: 22px 14px;
}

.app-brand {
  display: flex; align-items: center; gap: 10px; padding: 6px 8px 18px 8px;
  border-bottom: 1px solid var(--border-subtle); margin-bottom: 16px;
}

.brand-logo-glow {
  width: 32px; height: 32px; border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #D4AF37, #8C6D3F); color: #080808;
  display: flex; align-items: center; justify-content: center; font-weight: 900;
  font-family: var(--font-serif); font-size: 15px; box-shadow: var(--shadow-primary);
}

.brand-name { font-size: 15px; font-weight: 700; font-family: var(--font-serif); letter-spacing: 0.08em; text-transform: uppercase; }
.brand-tag { font-size: 10px; color: var(--primary); letter-spacing: 0.12em; text-transform: uppercase; }

.nav-section-title {
  font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;
  letter-spacing: 0.1em; padding: 10px 8px 6px 8px; font-family: var(--font-serif);
}

.nav-menu { list-style: none; display: flex; flex-direction: column; gap: 2px; margin-bottom: 16px; }
.nav-item a {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border-radius: var(--radius-sm); color: var(--text-secondary); text-decoration: none;
  font-size: 13px; font-weight: 600; letter-spacing: 0.02em; transition: all 0.2s ease;
}

.nav-item a:hover { background: var(--bg-surface-muted); color: var(--text-primary); }
.nav-item.active a {
  background: var(--bg-surface-muted); color: var(--primary);
  border-left: 2px solid var(--primary); font-weight: 700;
}
.nav-item.active a svg { stroke: var(--primary); }

.sidebar-badge {
  margin-left: auto; font-size: 10px; font-family: var(--font-serif);
  padding: 1px 6px; border-radius: var(--radius-sm); background: var(--primary-soft); color: var(--primary);
}

.sidebar-user-card {
  margin-top: auto; padding: 14px; border-radius: var(--radius-sm);
  background: var(--bg-surface-muted); border: 1px solid var(--border-subtle);
  display: flex; align-items: center; gap: 10px;
}

.user-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #D4AF37, #AA7C11); color: #080808;
  font-weight: 800; font-family: var(--font-serif); font-size: 12px;
  display: flex; align-items: center; justify-content: center;
}

.user-name { font-size: 13px; font-weight: 700; font-family: var(--font-serif); }
.user-sub { font-size: 10.5px; color: var(--primary); letter-spacing: 0.05em; text-transform: uppercase; }

/* Main Area */
.app-main {
  flex: 1; padding: 30px 40px 60px 40px; max-width: 1380px; overflow-y: auto;
}

.screen-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 28px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 18px;
  flex-wrap: wrap; gap: 14px;
}

.screen-pretitle { font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.12em; }
.screen-title { font-size: 28px; font-weight: 700; font-family: var(--font-serif); letter-spacing: 0.02em; }
.screen-actions { display: flex; align-items: center; gap: 10px; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 8px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600;
  cursor: pointer; border: 1px solid var(--border-subtle); background: var(--bg-surface);
  color: var(--text-primary); text-decoration: none; letter-spacing: 0.04em; transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #D4AF37, #AA7C11);
  color: #080808; border-color: transparent; font-weight: 700; box-shadow: var(--shadow-primary);
}

.btn-primary:hover { opacity: 0.95; }
.btn-secondary { background: var(--bg-surface); }
.btn-sm { padding: 5px 12px; font-size: 11.5px; }

/* Luxury Cards */
.card-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 26px; }
.card-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 26px; }
.card-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-bottom: 26px; }
.card-grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; margin-bottom: 26px; }
.card-grid-1-2 { display: grid; grid-template-columns: 1fr 2fr; gap: 18px; margin-bottom: 26px; }

.card {
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  padding: 22px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
}

.card-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;
}

.card-title { font-size: 16px; font-weight: 700; font-family: var(--font-serif); }
.card-desc { font-size: 12px; color: var(--text-muted); }

.stat-card {
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  padding: 18px;
  border: 1px solid var(--border-subtle);
  display: flex; flex-direction: column; gap: 6px; box-shadow: var(--shadow-sm);
}

.stat-header { display: flex; align-items: center; justify-content: space-between; }
.stat-label { font-size: 11.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.stat-icon-wrap { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
.stat-val { font-size: 26px; font-weight: 700; font-family: var(--font-serif); letter-spacing: 0.02em; }
.stat-footer { font-size: 12px; font-weight: 600; color: var(--primary); }
.stat-delta-positive { color: var(--income); }
.stat-delta-negative { color: var(--expense); }

/* Quick Action Strip */
.quick-actions-bar { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
.action-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;
  border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-weight: 600;
  text-decoration: none; letter-spacing: 0.04em;
}
.action-pill:hover { border-color: var(--primary); color: var(--primary); }
.action-icon-circle { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; }

/* Centurion Black Card */
.virtual-debit-card {
  background: radial-gradient(circle at 80% 20%, #2A2418 0%, #0A0A0A 70%);
  border: 1px solid #AA7C11;
  border-radius: var(--radius-md);
  padding: 24px;
  color: #FAF7F2;
  margin-bottom: 20px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8);
}

.card-chip { width: 42px; height: 30px; border-radius: 4px; background: linear-gradient(135deg, #D4AF37, #8C6D3F); margin-bottom: 22px; }
.card-num-preview { font-family: var(--font-mono); font-size: 16px; letter-spacing: 0.2em; margin-bottom: 16px; color: #D4AF37; }
.card-bottom-row { display: flex; justify-content: space-between; align-items: flex-end; }

/* Tables & Lists */
.proto-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.proto-table th {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted); padding: 10px 12px; border-bottom: 1px solid var(--border-subtle);
}
.proto-table td { padding: 12px; border-bottom: 1px solid var(--border-subtle); }
.proto-table tr:hover td { background: var(--bg-surface-muted); }

.txn-list { display: flex; flex-direction: column; gap: 6px; }
.txn-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-radius: var(--radius-sm); border-bottom: 1px solid var(--border-subtle);
}
.txn-left { display: flex; align-items: center; gap: 12px; }
.txn-icon { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-surface-muted); display: flex; align-items: center; justify-content: center; font-size: 15px; }
.txn-title { font-size: 13.5px; font-weight: 700; }
.txn-meta { font-size: 11.5px; color: var(--text-muted); }
.txn-amount { font-family: var(--font-serif); font-size: 15px; font-weight: 700; }
.txn-income { color: var(--income); }
.txn-expense { color: var(--expense); }

/* Badges */
.badge {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px;
  border-radius: var(--radius-sm); font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
}
.badge-primary { background: var(--primary-soft); color: var(--primary); border: 1px solid var(--primary); }
.badge-income { background: var(--income-soft); color: var(--income); }
.badge-expense { background: var(--expense-soft); color: var(--expense); }
.badge-warning { background: var(--warning-soft); color: var(--warning); }
.badge-indigo { background: var(--primary-soft); color: var(--primary); }

.progress-bar-track {
  width: 100%; height: 5px; background: var(--bg-surface-muted); border-radius: var(--radius-full); overflow: hidden;
}
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, #D4AF37, #8C6D3F); }

.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }
.form-input, .form-select {
  padding: 9px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 13px; outline: none;
}

.chart-container { position: relative; width: 100%; height: 230px; }

/* Mobile & Modal */
.mobile-bottom-bar {
  display: none; position: fixed; bottom: 0; left: 0; right: 0; height: 56px;
  background: var(--bg-surface); border-top: 1px solid var(--border-subtle);
  z-index: 990; justify-content: space-around; align-items: center;
}
.mobile-nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  text-decoration: none; color: var(--text-muted); font-size: 10px; font-family: var(--font-serif);
}
.mobile-nav-item.active { color: var(--primary); font-weight: 700; }

.proto-modal-backdrop {
  display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(8, 8, 8, 0.8); z-index: 1000; align-items: center; justify-content: center; padding: 18px;
}
.proto-modal-backdrop.active { display: flex; }
.proto-modal-card {
  background: var(--bg-surface); border-radius: var(--radius-sm); max-width: 480px; width: 100%;
  padding: 24px; border: 1px solid var(--border-focus);
}

@media (max-width: 1024px) {
  .card-grid-4, .card-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .card-grid-2-1, .card-grid-1-2 { grid-template-columns: 1fr; }
  .app-main { padding: 20px; }
}

@media (max-width: 768px) {
  .app-sidebar { display: none; }
  .mobile-bottom-bar { display: flex; }
  .card-grid-4, .card-grid-3, .card-grid-2 { grid-template-columns: 1fr; }
  .app-main { padding: 16px 16px 70px 16px; }
}
  `;
}

function getConcept5Js() {
  return `
function initProtoTheme() {
  const savedTheme = localStorage.getItem('proto_theme') || 'dark'; // Dark obsidian default for luxury
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleProtoTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('proto_theme', next);
  renderAllCharts();
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

// Luxury Chart Renderers
function drawDonutChart(canvasId, slices) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const radius = Math.min(cx, cy) * 0.76;
  const innerRadius = radius * 0.65;

  let total = slices.reduce((acc, s) => acc + s.value, 0);
  let startAngle = -Math.PI / 2;
  ctx.clearRect(0, 0, rect.width, rect.height);

  slices.forEach(slice => {
    const sliceAngle = (slice.value / total) * (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    startAngle += sliceAngle;
  });

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? '#D4AF37' : '#8C6D3F';
  ctx.font = '700 10px serif';
  ctx.textAlign = 'center';
  ctx.fillText('DISBURSEMENT', cx, cy - 6);

  ctx.fillStyle = isDark ? '#FAF7F2' : '#1A1615';
  ctx.font = '700 17px serif';
  ctx.fillText('₹78,250', cx, cy + 14);
}

function drawLineChart(canvasId, points, color = '#D4AF37') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const w = rect.width;
  const h = rect.height;
  const pad = 24;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, idx) => ({
    x: pad + (idx / (points.length - 1)) * (w - pad * 2),
    y: h - pad - ((p - min) / range) * (h - pad * 2)
  }));

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(212, 175, 55, 0.25)');
  grad.addColorStop(1, 'rgba(212, 175, 55, 0)');

  ctx.beginPath();
  ctx.moveTo(coords[0].x, h - pad);
  coords.forEach(pt => ctx.lineTo(pt.x, pt.y));
  ctx.lineTo(coords[coords.length - 1].x, h - pad);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(coords[0].x, coords[0].y);
  coords.forEach(pt => ctx.lineTo(pt.x, pt.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  coords.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

function drawBarChart(canvasId, bars) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const w = rect.width;
  const h = rect.height;
  const pad = 20;
  const maxVal = Math.max(...bars.map(b => Math.max(b.income, b.expense)));
  const slotW = (w - pad * 2) / bars.length;
  const barW = Math.min(14, slotW * 0.32);

  bars.forEach((b, i) => {
    const x = pad + i * slotW + slotW / 2;
    const incH = (b.income / maxVal) * (h - pad * 2);
    const expH = (b.expense / maxVal) * (h - pad * 2);

    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(x - barW - 1, h - pad - incH, barW, incH);

    ctx.fillStyle = '#C2185B';
    ctx.fillRect(x + 1, h - pad - expH, barW, expH);

    ctx.fillStyle = '#9E958C';
    ctx.font = '600 10px serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, x, h - 4);
  });
}

function renderAllCharts() {
  drawDonutChart('expenseDonutCanvas', [
    { value: 30000, color: '#D4AF37' },
    { value: 16450, color: '#C2185B' },
    { value: 12100, color: '#8C6D3F' },
    { value: 8900, color: '#AA7C11' },
    { value: 6800, color: '#E5C158' },
    { value: 4000, color: '#2E7D32' }
  ]);

  drawLineChart('netWorthGrowthCanvas', [36, 38, 39.5, 41.2, 42.8, 44.5, 46.2, 48.65], '#D4AF37');
  drawLineChart('portfolioGrowthCanvas', [24, 25.2, 27, 28.5, 29.8, 31.4, 34.2], '#C5A059');
  drawLineChart('fireProjectionCanvas', [48, 75, 110, 160, 230, 310, 410, 450], '#D4AF37');

  drawBarChart('cashflowBarCanvas', [
    { label: 'Apr', income: 220000, expense: 72000 },
    { label: 'May', income: 235000, expense: 81000 },
    { label: 'Jun', income: 225000, expense: 69000 },
    { label: 'Jul', income: 240000, expense: 84000 },
    { label: 'Aug', income: 245000, expense: 76000 },
    { label: 'Sep', income: 245000, expense: 78250 }
  ]);
}

window.addEventListener('DOMContentLoaded', () => {
  initProtoTheme();
  renderAllCharts();
  window.addEventListener('resize', renderAllCharts);
});
  `;
}

function renderSidebar(currentScreenId) {
  const navItems = SCREENS.map(s => `
    <li class="nav-item ${s.id === currentScreenId ? 'active' : ''}">
      <a href="${s.file}">
        ${ICONS[s.icon] || ICONS.dashboard}
        <span>${s.name}</span>
        ${s.id === 'rewards' ? '<span class="sidebar-badge">Centurion</span>' : ''}
      </a>
    </li>
  `).join('');

  return `
    <aside class="app-sidebar">
      <div class="app-brand">
        <div class="brand-logo-glow">♛</div>
        <div>
          <div class="brand-name">LigthsON Private</div>
          <div class="brand-tag">Sovereign Wealth</div>
        </div>
      </div>

      <span class="nav-section-title">Client Portfolio</span>
      <ul class="nav-menu">
        ${navItems}
      </ul>

      <div class="sidebar-user-card">
        <div class="user-avatar">AS</div>
        <div>
          <div class="user-name">${MOCK_DATA.user.name}</div>
          <div class="user-sub">Sovereign Member</div>
        </div>
      </div>
    </aside>
  `;
}

function renderMobileBottomBar(currentScreenId) {
  return `
    <nav class="mobile-bottom-bar">
      <a href="dashboard.html" class="mobile-nav-item ${currentScreenId === 'dashboard' ? 'active' : ''}">
        ${ICONS.dashboard}
        <span>Vault</span>
      </a>
      <a href="investments.html" class="mobile-nav-item ${currentScreenId === 'investments' ? 'active' : ''}">
        ${ICONS.investments}
        <span>Holdings</span>
      </a>
      <a href="fire.html" class="mobile-nav-item ${currentScreenId === 'fire' ? 'active' : ''}">
        ${ICONS.fire}
        <span>Runway</span>
      </a>
      <a href="profile.html" class="mobile-nav-item ${currentScreenId === 'profile' ? 'active' : ''}">
        ${ICONS.profile}
        <span>Private Desk</span>
      </a>
    </nav>
  `;
}

function renderModal() {
  return `
    <div id="addTransactionModal" class="proto-modal-backdrop" onclick="if(event.target===this) closeModal('addTransactionModal')">
      <div class="proto-modal-card">
        <div class="card-header">
          <h3 class="card-title">Bespoke Disbursement Entry</h3>
          <button class="btn btn-sm" onclick="closeModal('addTransactionModal')">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Capital Sum (₹ INR)</label>
          <input type="number" class="form-input" value="1250" />
        </div>
        <div class="form-group">
          <label class="form-label">Asset Classification</label>
          <select class="form-select">
            <option>Private Lifestyle Outflow</option>
            <option>Alternative Equity Placement</option>
            <option>Sovereign Yield Distribution</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 18px;">
          <button class="btn" style="flex: 1;" onclick="closeModal('addTransactionModal')">Cancel</button>
          <button class="btn btn-primary" style="flex: 1;" onclick="alert('Disbursement Recorded to Private Ledger'); closeModal('addTransactionModal');">Confirm Record</button>
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  getConcept5Css,
  getConcept5Js,
  renderSidebar,
  renderMobileBottomBar,
  renderModal
};
