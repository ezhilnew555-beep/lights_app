const { SCREENS, CONCEPTS, ICONS, MOCK_DATA, renderGlobalHeader } = require('./shared');

function getConcept3Css() {
  return `
/* ==========================================================================
   CONCEPT 3: ENTERPRISE FINTECH (Bloomberg Terminal / J.P. Morgan / FactSet)
   ========================================================================== */

:root {
  --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'IBM Plex Sans', Roboto, sans-serif;
  --font-mono: 'IBM Plex Mono', Consolas, 'Courier New', monospace;

  /* Theme Tokens: Light (Institutional Navy & Slate) */
  --bg-app: #F1F5F9;
  --bg-surface: #FFFFFF;
  --bg-surface-muted: #E2E8F0;
  --bg-surface-elevated: #FFFFFF;
  --border-subtle: #CBD5E1;
  --border-focus: #0F2A4A;

  --text-primary: #0F172A;
  --text-secondary: #334155;
  --text-muted: #64748B;
  --text-inverse: #FFFFFF;

  --primary: #0F2A4A;
  --primary-light: #1E3A8A;
  --primary-soft: #DBEAFE;
  --primary-dark: #091E36;

  --income: #15803D;
  --income-soft: #DCFCE7;
  --expense: #B91C1C;
  --expense-soft: #FEE2E2;

  --warning: #B45309;
  --warning-soft: #FEF3C7;
  --accent-indigo: #4338CA;
  --accent-indigo-soft: #EEF2FF;
  --accent-amber: #D97706;
  --accent-flame: #C2410C;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 6px 18px rgba(0, 0, 0, 0.1);
  --shadow-primary: 0 2px 8px rgba(15, 42, 74, 0.2);

  --radius-sm: 3px;
  --radius-md: 5px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  --sidebar-w: 240px;
  --topbar-h: 56px;
}

[data-theme="dark"] {
  --bg-app: #080D1A;
  --bg-surface: #0E1726;
  --bg-surface-muted: #152238;
  --bg-surface-elevated: #1B2B47;
  --border-subtle: #203354;
  --border-focus: #38BDF8;

  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --text-inverse: #080D1A;

  --primary: #38BDF8;
  --primary-light: #7DD3FC;
  --primary-soft: rgba(56, 189, 248, 0.15);
  --primary-dark: #0284C7;

  --income: #22C55E;
  --income-soft: rgba(34, 197, 94, 0.15);
  --expense: #F87171;
  --expense-soft: rgba(248, 113, 113, 0.15);

  --warning: #FBBF24;
  --warning-soft: rgba(251, 191, 36, 0.15);
  --accent-indigo: #818CF8;
  --accent-indigo-soft: rgba(129, 140, 248, 0.15);
  --accent-amber: #FBBF24;
  --accent-flame: #FB923C;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 3px 8px rgba(0, 0, 0, 0.6);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.7);
  --shadow-primary: 0 2px 12px rgba(56, 189, 248, 0.25);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-main);
  background: var(--bg-app);
  color: var(--text-primary);
  line-height: 1.4;
  min-height: 100vh;
}

/* Institutional Live Market Ticker Ribbon */
.ticker-ribbon {
  background: #091321;
  color: #94A3B8;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 5px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid #1E293B;
  overflow-x: auto;
  white-space: nowrap;
}

.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ticker-up { color: #22C55E; }
.ticker-down { color: #F87171; }

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
  padding: 0 20px;
}

.proto-topbar-left, .proto-topbar-right { display: flex; align-items: center; gap: 12px; }
.proto-hub-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}

.proto-hub-icon {
  width: 24px; height: 24px; border-radius: var(--radius-sm);
  background: var(--primary-soft); color: var(--primary);
  display: flex; align-items: center; justify-content: center; font-size: 11px;
}

.proto-divider { width: 1px; height: 18px; background: var(--border-subtle); }
.proto-concept-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; font-family: var(--font-mono);
  color: var(--text-secondary);
}

.proto-concept-indicator {
  width: 7px; height: 7px; border-radius: 50%;
  background: #22C55E; box-shadow: 0 0 6px #22C55E;
}

.proto-switcher-wrap { display: flex; align-items: center; gap: 6px; }
.proto-switcher-label { font-size: 11px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono); }
.proto-select {
  padding: 5px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 12px; font-family: var(--font-mono); outline: none;
}

.proto-theme-btn, .proto-ds-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 12px; font-weight: 600;
  text-decoration: none; cursor: pointer;
}

.proto-ds-btn.active { background: var(--primary); color: #fff; }
.theme-icon-dark { display: none; }
[data-theme="dark"] .theme-icon-light { display: none; }
[data-theme="dark"] .theme-icon-dark { display: inline-flex; }

/* Layout Shell */
.app-layout { display: flex; min-height: calc(100vh - var(--topbar-h) - 30px); }

/* Workstation Left Sidebar */
.app-sidebar {
  width: var(--sidebar-w);
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: sticky;
  top: var(--topbar-h);
  height: calc(100vh - var(--topbar-h) - 30px);
  overflow-y: auto;
  padding: 16px 10px;
}

.app-brand {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 6px 14px 6px; border-bottom: 1px solid var(--border-subtle); margin-bottom: 12px;
}

.brand-logo-glow {
  width: 28px; height: 28px; border-radius: var(--radius-sm);
  background: #0F2A4A; color: #38BDF8; display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-family: var(--font-mono); font-size: 13px;
}

.brand-name { font-size: 14px; font-weight: 800; font-family: var(--font-mono); letter-spacing: 0.02em; }
.brand-tag { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }

.nav-section-title {
  font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;
  font-family: var(--font-mono); padding: 8px 6px 4px 6px;
}

.nav-menu { list-style: none; display: flex; flex-direction: column; gap: 2px; margin-bottom: 14px; }
.nav-item a {
  display: flex; align-items: center; gap: 8px; padding: 7px 10px;
  border-radius: var(--radius-sm); color: var(--text-secondary); text-decoration: none;
  font-size: 12.5px; font-weight: 600; transition: all 0.15s ease;
}

.nav-item a:hover { background: var(--bg-surface-muted); color: var(--text-primary); }
.nav-item.active a { background: var(--primary); color: #FFFFFF; }
.nav-item.active a svg { stroke: #FFFFFF; }

.sidebar-badge {
  margin-left: auto; font-size: 10px; font-family: var(--font-mono); font-weight: 700;
  padding: 1px 5px; border-radius: var(--radius-sm); background: var(--border-subtle); color: var(--text-primary);
}

.sidebar-user-card {
  margin-top: auto; padding: 10px; border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle); background: var(--bg-surface-muted);
  display: flex; align-items: center; gap: 8px; font-family: var(--font-mono);
}

.user-avatar {
  width: 28px; height: 28px; border-radius: var(--radius-sm);
  background: #0F2A4A; color: #fff; font-weight: 700; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
}

.user-name { font-size: 12px; font-weight: 700; }
.user-sub { font-size: 10px; color: var(--text-muted); }

/* Main Workstation View */
.app-main {
  flex: 1;
  padding: 20px 24px 40px 24px;
  max-width: 1440px;
  overflow-y: auto;
}

.screen-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;
  flex-wrap: wrap; gap: 10px;
}

.screen-pretitle { font-size: 10px; font-family: var(--font-mono); font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
.screen-title { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; font-family: var(--font-mono); }
.screen-actions { display: flex; align-items: center; gap: 8px; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 6px 12px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600;
  cursor: pointer; border: 1px solid var(--border-subtle); background: var(--bg-surface);
  color: var(--text-primary); text-decoration: none; font-family: var(--font-mono);
}

.btn-primary { background: #0F2A4A; color: #FFFFFF; border-color: #0F2A4A; }
[data-theme="dark"] .btn-primary { background: #38BDF8; color: #080D1A; border-color: #38BDF8; }
.btn-secondary { background: var(--bg-surface); }
.btn-sm { padding: 4px 8px; font-size: 11px; }

/* Bento Terminal Cards */
.card-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.card-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.card-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
.card-grid-2-1 { display: grid; grid-template-columns: 2.2fr 1fr; gap: 12px; margin-bottom: 16px; }
.card-grid-1-2 { display: grid; grid-template-columns: 1fr 2.2fr; gap: 12px; margin-bottom: 16px; }

.card {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--border-subtle);
}

.card-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;
}

.card-title { font-size: 13px; font-weight: 700; font-family: var(--font-mono); text-transform: uppercase; }
.card-desc { font-size: 11px; color: var(--text-muted); }

.stat-card {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 14px;
  border: 1px solid var(--border-subtle);
  display: flex; flex-direction: column; gap: 4px;
}

.stat-header { display: flex; align-items: center; justify-content: space-between; }
.stat-label { font-size: 11px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono); text-transform: uppercase; }
.stat-icon-wrap { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
.stat-val { font-size: 20px; font-weight: 800; font-family: var(--font-mono); }
.stat-footer { font-size: 11px; font-family: var(--font-mono); }
.stat-delta-positive { color: var(--income); }
.stat-delta-negative { color: var(--expense); }

/* Quick Action Strip */
.quick-actions-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.action-pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
  border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 12px;
  font-family: var(--font-mono); text-decoration: none;
}

.action-pill:hover { background: var(--bg-surface-muted); }
.action-icon-circle { width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; }

/* Corporate Virtual Card */
.virtual-debit-card {
  background: linear-gradient(135deg, #091E36, #0F2A4A);
  border: 1px solid #203354;
  border-radius: var(--radius-md);
  padding: 20px;
  color: #F1F5F9;
  margin-bottom: 14px;
  font-family: var(--font-mono);
}

.card-chip { width: 34px; height: 24px; border-radius: 3px; background: #CA8A04; margin-bottom: 18px; }
.card-num-preview { font-size: 14px; letter-spacing: 0.15em; margin-bottom: 14px; }
.card-bottom-row { display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; }

/* Institutional Data Tables */
.proto-table {
  width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; font-family: var(--font-mono);
}

.proto-table th {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);
  padding: 7px 10px; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface-muted);
}

.proto-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-subtle); }
.proto-table tr:hover td { background: var(--bg-surface-muted); }

/* Txn List */
.txn-list { display: flex; flex-direction: column; gap: 3px; }
.txn-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono);
}

.txn-left { display: flex; align-items: center; gap: 10px; }
.txn-icon { font-size: 14px; }
.txn-title { font-size: 12px; font-weight: 700; }
.txn-meta { font-size: 10px; color: var(--text-muted); }
.txn-amount { font-size: 12px; font-weight: 700; }
.txn-income { color: var(--income); }
.txn-expense { color: var(--expense); }

/* Badges */
.badge {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px;
  border-radius: var(--radius-sm); font-size: 10px; font-weight: 700; font-family: var(--font-mono);
}

.badge-primary { background: var(--primary-soft); color: var(--primary); }
.badge-income { background: var(--income-soft); color: var(--income); }
.badge-expense { background: var(--expense-soft); color: var(--expense); }
.badge-warning { background: var(--warning-soft); color: var(--warning); }
.badge-indigo { background: var(--accent-indigo-soft); color: var(--accent-indigo); }

.progress-bar-track {
  width: 100%; height: 6px; background: var(--bg-surface-muted); border-radius: var(--radius-sm); overflow: hidden;
}

.progress-bar-fill { height: 100%; background: var(--primary); }

.form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.form-label { font-size: 11px; font-weight: 700; font-family: var(--font-mono); color: var(--text-secondary); }
.form-input, .form-select {
  padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 12px; font-family: var(--font-mono); outline: none;
}

.chart-container { position: relative; width: 100%; height: 220px; }

/* Mobile & Modal */
.mobile-bottom-bar {
  display: none; position: fixed; bottom: 0; left: 0; right: 0; height: 50px;
  background: var(--bg-surface); border-top: 1px solid var(--border-subtle);
  z-index: 990; justify-content: space-around; align-items: center;
}

.mobile-nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  text-decoration: none; color: var(--text-muted); font-size: 10px; font-family: var(--font-mono);
}

.mobile-nav-item.active { color: var(--primary); font-weight: 700; }

.proto-modal-backdrop {
  display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(8, 13, 26, 0.7); z-index: 1000; align-items: center; justify-content: center; padding: 16px;
}

.proto-modal-backdrop.active { display: flex; }
.proto-modal-card {
  background: var(--bg-surface); border-radius: var(--radius-sm); max-width: 480px; width: 100%;
  padding: 20px; border: 1px solid var(--border-subtle); font-family: var(--font-mono);
}

@media (max-width: 1024px) {
  .card-grid-4, .card-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .card-grid-2-1, .card-grid-1-2 { grid-template-columns: 1fr; }
  .app-main { padding: 16px; }
}

@media (max-width: 768px) {
  .app-sidebar { display: none; }
  .mobile-bottom-bar { display: flex; }
  .card-grid-4, .card-grid-3, .card-grid-2 { grid-template-columns: 1fr; }
  .app-main { padding: 12px 12px 64px 12px; }
}
  `;
}

function getConcept3Js() {
  return `
function initProtoTheme() {
  const savedTheme = localStorage.getItem('proto_theme') || 'dark'; // Default dark for enterprise terminal
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

// Enterprise Chart Renderers
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
  const innerRadius = radius * 0.58;

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
  ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
  ctx.font = '700 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('OUTFLOW', cx, cy - 6);

  ctx.fillStyle = isDark ? '#F1F5F9' : '#0F172A';
  ctx.font = '800 15px monospace';
  ctx.fillText('₹78.2K', cx, cy + 12);
}

function drawLineChart(canvasId, points, color = '#38BDF8') {
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
  const pad = 22;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, idx) => ({
    x: pad + (idx / (points.length - 1)) * (w - pad * 2),
    y: h - pad - ((p - min) / range) * (h - pad * 2)
  }));

  ctx.beginPath();
  ctx.moveTo(coords[0].x, coords[0].y);
  coords.forEach(pt => ctx.lineTo(pt.x, pt.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  coords.forEach(pt => {
    ctx.fillStyle = color;
    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4); // Square terminal dots
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
  const pad = 16;
  const maxVal = Math.max(...bars.map(b => Math.max(b.income, b.expense)));
  const slotW = (w - pad * 2) / bars.length;
  const barW = Math.min(14, slotW * 0.32);

  bars.forEach((b, i) => {
    const x = pad + i * slotW + slotW / 2;
    const incH = (b.income / maxVal) * (h - pad * 2);
    const expH = (b.expense / maxVal) * (h - pad * 2);

    ctx.fillStyle = '#22C55E';
    ctx.fillRect(x - barW - 1, h - pad - incH, barW, incH);

    ctx.fillStyle = '#F87171';
    ctx.fillRect(x + 1, h - pad - expH, barW, expH);

    ctx.fillStyle = '#64748B';
    ctx.font = '700 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, x, h - 2);
  });
}

function renderAllCharts() {
  drawDonutChart('expenseDonutCanvas', [
    { value: 30000, color: '#38BDF8' },
    { value: 16450, color: '#F87171' },
    { value: 12100, color: '#FBBF24' },
    { value: 8900, color: '#818CF8' },
    { value: 6800, color: '#22C55E' },
    { value: 4000, color: '#06B6D4' }
  ]);

  drawLineChart('netWorthGrowthCanvas', [36, 38, 39.5, 41.2, 42.8, 44.5, 46.2, 48.65], '#38BDF8');
  drawLineChart('portfolioGrowthCanvas', [24, 25.2, 27, 28.5, 29.8, 31.4, 34.2], '#818CF8');
  drawLineChart('fireProjectionCanvas', [48, 75, 110, 160, 230, 310, 410, 450], '#FB923C');

  drawBarChart('cashflowBarCanvas', [
    { label: 'APR', income: 220000, expense: 72000 },
    { label: 'MAY', income: 235000, expense: 81000 },
    { label: 'JUN', income: 225000, expense: 69000 },
    { label: 'JUL', income: 240000, expense: 84000 },
    { label: 'AUG', income: 245000, expense: 76000 },
    { label: 'SEP', income: 245000, expense: 78250 }
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
      </a>
    </li>
  `).join('');

  return `
    <aside class="app-sidebar">
      <div class="app-brand">
        <div class="brand-logo-glow">B•T</div>
        <div>
          <div class="brand-name">LigthsON WS</div>
          <div class="brand-tag">Terminal Station</div>
        </div>
      </div>

      <span class="nav-section-title">Workstation Modules</span>
      <ul class="nav-menu">
        ${navItems}
      </ul>

      <div class="sidebar-user-card">
        <div class="user-avatar">INST</div>
        <div>
          <div class="user-name">ACC-882194</div>
          <div class="user-sub">256-Bit TLS Synced</div>
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
        <span>Desk</span>
      </a>
      <a href="calendar.html" class="mobile-nav-item ${currentScreenId === 'calendar' ? 'active' : ''}">
        ${ICONS.calendar}
        <span>Cash</span>
      </a>
      <a href="investments.html" class="mobile-nav-item ${currentScreenId === 'investments' ? 'active' : ''}">
        ${ICONS.investments}
        <span>Assets</span>
      </a>
      <a href="profile.html" class="mobile-nav-item ${currentScreenId === 'profile' ? 'active' : ''}">
        ${ICONS.profile}
        <span>Audit</span>
      </a>
    </nav>
  `;
}

function renderModal() {
  return `
    <div id="addTransactionModal" class="proto-modal-backdrop" onclick="if(event.target===this) closeModal('addTransactionModal')">
      <div class="proto-modal-card">
        <div class="card-header">
          <h3 class="card-title">Order Entry / Cash Debit</h3>
          <button class="btn btn-sm" onclick="closeModal('addTransactionModal')">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Notional Amount (INR)</label>
          <input type="number" class="form-input" value="1250" />
        </div>
        <div class="form-group">
          <label class="form-label">Book / Cost Center</label>
          <select class="form-select">
            <option>Direct Operating Outflow</option>
            <option>Discretionary Capital</option>
            <option>Systematic Inflow</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button class="btn" style="flex: 1;" onclick="closeModal('addTransactionModal')">Cancel</button>
          <button class="btn btn-primary" style="flex: 1;" onclick="alert('Order Executed & Logged'); closeModal('addTransactionModal');">Authorize Order</button>
        </div>
      </div>
    </div>
  `;
}

function renderTickerRibbon() {
  return `
    <div class="ticker-ribbon">
      <div class="ticker-item"><span>NIFTY 50</span> <strong>24,812.40</strong> <span class="ticker-up">▲ +0.58%</span></div>
      <div class="ticker-item"><span>SENSEX</span> <strong>81,195.20</strong> <span class="ticker-up">▲ +0.52%</span></div>
      <div class="ticker-item"><span>USD/INR</span> <strong>83.54</strong> <span class="ticker-down">▼ -0.05%</span></div>
      <div class="ticker-item"><span>10Y G-SEC</span> <strong>6.84%</strong> <span class="ticker-up">▲ +0.02%</span></div>
      <div class="ticker-item"><span>GOLD 24K</span> <strong>₹74,250</strong> <span class="ticker-up">▲ +0.43%</span></div>
      <div class="ticker-item"><span>BRENT CRUDE</span> <strong>$74.20</strong> <span class="ticker-down">▼ -1.18%</span></div>
      <div class="ticker-item"><span>INDIA VIX</span> <strong>12.45</strong> <span class="ticker-down">▼ -3.10%</span></div>
    </div>
  `;
}

module.exports = {
  getConcept3Css,
  getConcept3Js,
  renderSidebar,
  renderMobileBottomBar,
  renderModal,
  renderTickerRibbon
};
