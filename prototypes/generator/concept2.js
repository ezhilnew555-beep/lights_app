const { SCREENS, CONCEPTS, ICONS, MOCK_DATA, renderGlobalHeader } = require('./shared');
const { renderScreenContent } = require('./screenTemplates');

function getConcept2Css() {
  return `
/* ==========================================================================
   CONCEPT 2: MINIMAL NEOBANK (Linear / Copilot Money / Monarch)
   ========================================================================== */

:root {
  --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;

  /* Theme Tokens: Light (Hyper-Minimalist Monocrome) */
  --bg-app: #FFFFFF;
  --bg-surface: #FFFFFF;
  --bg-surface-muted: #F7F7F8;
  --bg-surface-elevated: #F4F4F5;
  --border-subtle: #E5E5E7;
  --border-focus: #111111;

  --text-primary: #111111;
  --text-secondary: #6E6E73;
  --text-muted: #A1A1A6;
  --text-inverse: #FFFFFF;

  --primary: #111111;
  --primary-light: #2563EB;
  --primary-soft: #EFF6FF;
  --primary-dark: #000000;

  --income: #16A34A;
  --income-soft: #F0FDF4;
  --expense: #DC2626;
  --expense-soft: #FEF2F2;

  --warning: #D97706;
  --warning-soft: #FFFBEB;
  --accent-indigo: #2563EB;
  --accent-indigo-soft: #EFF6FF;
  --accent-amber: #D97706;
  --accent-flame: #EA580C;

  --shadow-sm: none;
  --shadow-md: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-primary: none;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-xl: 14px;
  --radius-full: 9999px;

  --sidebar-w: 220px;
  --topbar-h: 52px;
}

[data-theme="dark"] {
  --bg-app: #0A0A0B;
  --bg-surface: #111113;
  --bg-surface-muted: #161619;
  --bg-surface-elevated: #1C1C20;
  --border-subtle: #232328;
  --border-focus: #FFFFFF;

  --text-primary: #EDEDED;
  --text-secondary: #8E8E93;
  --text-muted: #55555A;
  --text-inverse: #0A0A0B;

  --primary: #FFFFFF;
  --primary-light: #3B82F6;
  --primary-soft: rgba(59, 130, 246, 0.12);
  --primary-dark: #D4D4D8;

  --income: #22C55E;
  --income-soft: rgba(34, 197, 94, 0.12);
  --expense: #EF4444;
  --expense-soft: rgba(239, 68, 68, 0.12);

  --warning: #F59E0B;
  --warning-soft: rgba(245, 158, 11, 0.12);
  --accent-indigo: #3B82F6;
  --accent-indigo-soft: rgba(59, 130, 246, 0.12);
  --accent-amber: #F59E0B;
  --accent-flame: #F97316;

  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.6);
  --shadow-primary: none;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-main);
  background: var(--bg-app);
  color: var(--text-primary);
  line-height: 1.45;
  transition: background-color 0.2s ease, color 0.2s ease;
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
  padding: 0 18px;
}

.proto-topbar-left, .proto-topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.proto-hub-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.proto-hub-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: var(--border-subtle);
  font-size: 11px;
}

.proto-divider {
  width: 1px;
  height: 16px;
  background: var(--border-subtle);
}

.proto-concept-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.proto-concept-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-light);
}

.proto-switcher-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.proto-switcher-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.proto-select {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12.5px;
  outline: none;
  cursor: pointer;
}

.proto-theme-btn, .proto-ds-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12.5px;
  cursor: pointer;
  text-decoration: none;
}

.proto-theme-btn:hover, .proto-ds-btn:hover {
  background: var(--bg-surface-muted);
}

.proto-ds-btn.active {
  background: var(--text-primary);
  color: var(--bg-app);
}

.theme-icon-dark { display: none; }
[data-theme="dark"] .theme-icon-light { display: none; }
[data-theme="dark"] .theme-icon-dark { display: inline-flex; }

/* Minimalist App Shell */
.app-layout {
  display: flex;
  min-height: calc(100vh - var(--topbar-h));
}

/* Linear-Style Slim Left Rail */
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
  padding: 16px 8px;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 16px 8px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 12px;
}

.brand-logo-glow {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--text-primary);
  color: var(--bg-app);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
}

.brand-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.brand-tag {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.nav-section-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 8px 8px 4px 8px;
}

.nav-menu {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 12px;
}

.nav-item a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.nav-item a:hover {
  background: var(--bg-surface-muted);
  color: var(--text-primary);
}

.nav-item.active a {
  background: var(--bg-surface-elevated);
  color: var(--text-primary);
  font-weight: 600;
}

.sidebar-badge {
  margin-left: auto;
  font-size: 10px;
  font-family: var(--font-mono);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: var(--border-subtle);
  color: var(--text-secondary);
}

.sidebar-user-card {
  margin-top: auto;
  padding: 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--border-subtle);
  color: var(--text-primary);
  font-weight: 700;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-name { font-size: 12px; font-weight: 600; }
.user-sub { font-size: 10.5px; color: var(--text-muted); }

/* Main Area */
.app-main {
  flex: 1;
  padding: 24px 32px 50px 32px;
  max-width: 1320px;
  overflow-y: auto;
}

.screen-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 16px;
  flex-wrap: wrap;
  gap: 14px;
}

.screen-pretitle {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  text-transform: uppercase;
}

.screen-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.screen-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Linear-style Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  transition: all 0.15s ease;
  text-decoration: none;
}

.btn:hover {
  background: var(--bg-surface-muted);
}

.btn-primary {
  background: var(--text-primary);
  color: var(--bg-app);
  border-color: var(--text-primary);
}

.btn-primary:hover {
  opacity: 0.9;
  background: var(--text-primary);
}

.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-lg { padding: 10px 18px; font-size: 14px; }

/* Grid & Minimal Cards */
.card-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
.card-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 22px; }
.card-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 22px; }
.card-grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 22px; }
.card-grid-1-2 { display: grid; grid-template-columns: 1fr 2fr; gap: 14px; margin-bottom: 22px; }

.card {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 18px;
  border: 1px solid var(--border-subtle);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
}

.card-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-card {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.stat-icon-wrap {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-muted);
}

.stat-val {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.stat-footer {
  font-size: 11.5px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.stat-delta-positive { color: var(--income); }
.stat-delta-negative { color: var(--expense); }

/* Linear-style Quick Action strip */
.quick-actions-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.action-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
}

.action-pill:hover {
  background: var(--bg-surface-muted);
}

.action-icon-circle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Minimalist Virtual Card */
.virtual-debit-card {
  background: var(--bg-surface-muted);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.card-chip {
  width: 32px;
  height: 24px;
  border-radius: 4px;
  background: var(--border-subtle);
  margin-bottom: 18px;
}

.card-num-preview {
  font-family: var(--font-mono);
  font-size: 15px;
  letter-spacing: 0.12em;
  margin-bottom: 14px;
}

.card-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 11px;
}

/* Data Tables */
.proto-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.proto-table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.proto-table td {
  padding: 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.proto-table tr:hover td {
  background: var(--bg-surface-muted);
}

/* Linear-style Txn list */
.txn-list { display: flex; flex-direction: column; gap: 4px; }
.txn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border-bottom: 1px solid var(--border-subtle);
}

.txn-left { display: flex; align-items: center; gap: 10px; }
.txn-icon { width: 28px; height: 28px; border-radius: var(--radius-sm); background: var(--bg-surface-muted); display: flex; align-items: center; justify-content: center; font-size: 13px; }
.txn-title { font-size: 13px; font-weight: 600; }
.txn-meta { font-size: 11px; color: var(--text-muted); }
.txn-amount { font-family: var(--font-mono); font-size: 13px; font-weight: 600; }
.txn-income { color: var(--income); }
.txn-expense { color: var(--expense); }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border-subtle);
}

.badge-primary { background: var(--bg-surface-muted); color: var(--text-primary); }
.badge-income { background: var(--income-soft); color: var(--income); border-color: transparent; }
.badge-expense { background: var(--expense-soft); color: var(--expense); border-color: transparent; }
.badge-warning { background: var(--warning-soft); color: var(--warning); border-color: transparent; }
.badge-indigo { background: var(--accent-indigo-soft); color: var(--accent-indigo); border-color: transparent; }

/* Progress bar */
.progress-bar-track {
  width: 100%;
  height: 4px;
  background: var(--border-subtle);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--text-primary);
}

/* Forms */
.form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
.form-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.form-input, .form-select, .form-textarea {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--border-focus);
}

/* Canvas chart container */
.chart-container {
  position: relative;
  width: 100%;
  height: 220px;
}

/* Mobile & Modal */
.mobile-bottom-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 54px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  z-index: 990;
  justify-content: space-around;
  align-items: center;
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 10px;
}

.mobile-nav-item.active { color: var(--text-primary); font-weight: 600; }

.proto-modal-backdrop {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.proto-modal-backdrop.active { display: flex; }
.proto-modal-card {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  max-width: 480px;
  width: 100%;
  padding: 22px;
  border: 1px solid var(--border-subtle);
}

@media (max-width: 1024px) {
  .card-grid-4, .card-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .card-grid-2-1, .card-grid-1-2 { grid-template-columns: 1fr; }
  .app-main { padding: 18px; }
}

@media (max-width: 768px) {
  .app-sidebar { display: none; }
  .mobile-bottom-bar { display: flex; }
  .card-grid-4, .card-grid-3, .card-grid-2 { grid-template-columns: 1fr; }
  .app-main { padding: 14px 14px 70px 14px; }
}
  `;
}

function getConcept2Js() {
  return `
function initProtoTheme() {
  const savedTheme = localStorage.getItem('proto_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleProtoTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
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

// Minimalist Chart Renders (Precision sparklines and clean bars)
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
  const radius = Math.min(cx, cy) * 0.75;
  const innerRadius = radius * 0.70; // Thinner ring

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
  ctx.fillStyle = isDark ? '#EDEDED' : '#111111';
  ctx.font = '700 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('₹78,250', cx, cy + 5);
}

function drawLineChart(canvasId, points, color = '#111111') {
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

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const lineColor = isDark ? '#EDEDED' : '#111111';

  const coords = points.map((p, idx) => ({
    x: pad + (idx / (points.length - 1)) * (w - pad * 2),
    y: h - pad - ((p - min) / range) * (h - pad * 2)
  }));

  // Clean Line Only, No Heavy Gradients
  ctx.beginPath();
  ctx.moveTo(coords[0].x, coords[0].y);
  coords.forEach(pt => ctx.lineTo(pt.x, pt.y));
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Subtle End Dot
  const last = coords[coords.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
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
  const barW = Math.min(12, slotW * 0.28);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  bars.forEach((b, i) => {
    const x = pad + i * slotW + slotW / 2;
    const incH = (b.income / maxVal) * (h - pad * 2);
    const expH = (b.expense / maxVal) * (h - pad * 2);

    ctx.fillStyle = '#16A34A';
    ctx.fillRect(x - barW - 1, h - pad - incH, barW, incH);

    ctx.fillStyle = '#DC2626';
    ctx.fillRect(x + 1, h - pad - expH, barW, expH);

    ctx.fillStyle = isDark ? '#8E8E93' : '#A1A1A6';
    ctx.font = '500 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, x, h - 2);
  });
}

function renderAllCharts() {
  drawDonutChart('expenseDonutCanvas', [
    { value: 30000, color: '#111111' },
    { value: 16450, color: '#55555A' },
    { value: 12100, color: '#8E8E93' },
    { value: 8900, color: '#A1A1A6' },
    { value: 6800, color: '#D4D4D8' },
    { value: 4000, color: '#E5E5E7' }
  ]);

  drawLineChart('netWorthGrowthCanvas', [36, 38, 39.5, 41.2, 42.8, 44.5, 46.2, 48.65]);
  drawLineChart('portfolioGrowthCanvas', [24, 25.2, 27, 28.5, 29.8, 31.4, 34.2]);
  drawLineChart('fireProjectionCanvas', [48, 75, 110, 160, 230, 310, 410, 450]);

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
        ${s.id === 'ai-assistant' ? '<span class="sidebar-badge">AI</span>' : ''}
      </a>
    </li>
  `).join('');

  return `
    <aside class="app-sidebar">
      <div class="app-brand">
        <div class="brand-logo-glow">L</div>
        <div>
          <div class="brand-name">LigthsON</div>
          <div class="brand-tag">Minimal Neo</div>
        </div>
      </div>

      <span class="nav-section-title">Navigation</span>
      <ul class="nav-menu">
        ${navItems}
      </ul>

      <div class="sidebar-user-card">
        <div class="user-avatar">AS</div>
        <div>
          <div class="user-name">${MOCK_DATA.user.name}</div>
          <div class="user-sub">Linear Data Mode</div>
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
        <span>Home</span>
      </a>
      <a href="calendar.html" class="mobile-nav-item ${currentScreenId === 'calendar' ? 'active' : ''}">
        ${ICONS.calendar}
        <span>Calendar</span>
      </a>
      <a href="investments.html" class="mobile-nav-item ${currentScreenId === 'investments' ? 'active' : ''}">
        ${ICONS.investments}
        <span>Invest</span>
      </a>
      <a href="profile.html" class="mobile-nav-item ${currentScreenId === 'profile' ? 'active' : ''}">
        ${ICONS.profile}
        <span>Profile</span>
      </a>
    </nav>
  `;
}

function renderModal() {
  return `
    <div id="addTransactionModal" class="proto-modal-backdrop" onclick="if(event.target===this) closeModal('addTransactionModal')">
      <div class="proto-modal-card">
        <div class="card-header">
          <h3 class="card-title">New Entry</h3>
          <button class="btn btn-sm" onclick="closeModal('addTransactionModal')">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹)</label>
          <input type="number" class="form-input" value="1250" />
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select">
            <option>Food & Dining</option>
            <option>Shopping</option>
            <option>Housing</option>
            <option>SIP</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" class="form-input" value="Quick Groceries" />
        </div>
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="btn" style="flex: 1;" onclick="closeModal('addTransactionModal')">Cancel</button>
          <button class="btn btn-primary" style="flex: 1;" onclick="alert('Logged!'); closeModal('addTransactionModal');">Save Entry</button>
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  getConcept2Css,
  getConcept2Js,
  renderSidebar,
  renderMobileBottomBar,
  renderModal
};
