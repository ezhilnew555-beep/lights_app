const { SCREENS, CONCEPTS, ICONS, MOCK_DATA, renderGlobalHeader } = require('./shared');

function getConcept4Css() {
  return `
/* ==========================================================================
   CONCEPT 4: AI-POWERED FINANCE (Perplexity / Copilot / Conversational)
   ========================================================================== */

:root {
  --font-main: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Fira Code', 'SF Mono', Consolas, monospace;

  /* Theme Tokens: Light (Neural Pearl & Cyan Glass) */
  --bg-app: #F8FAFC;
  --bg-surface: rgba(255, 255, 255, 0.75);
  --bg-surface-muted: rgba(241, 245, 249, 0.65);
  --bg-surface-elevated: rgba(255, 255, 255, 0.9);
  --border-subtle: rgba(226, 232, 240, 0.8);
  --border-focus: #8B5CF6;

  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --text-inverse: #FFFFFF;

  --primary: #8B5CF6;
  --primary-light: #A78BFA;
  --primary-soft: rgba(139, 92, 246, 0.12);
  --primary-dark: #7C3AED;

  --income: #10B981;
  --income-soft: rgba(16, 185, 129, 0.12);
  --expense: #F43F5E;
  --expense-soft: rgba(244, 63, 94, 0.12);

  --warning: #F59E0B;
  --warning-soft: rgba(245, 158, 11, 0.12);
  --accent-cyan: #06B6D4;
  --accent-cyan-soft: rgba(6, 182, 212, 0.12);
  --accent-magenta: #EC4899;
  --accent-flame: #F97316;

  --shadow-sm: 0 4px 12px rgba(139, 92, 246, 0.05);
  --shadow-md: 0 8px 24px rgba(139, 92, 246, 0.08);
  --shadow-lg: 0 16px 36px rgba(139, 92, 246, 0.12);
  --shadow-primary: 0 8px 25px rgba(139, 92, 246, 0.28);

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-full: 9999px;

  --sidebar-w: 250px;
  --topbar-h: 62px;
}

[data-theme="dark"] {
  --bg-app: #080612;
  --bg-surface: rgba(18, 14, 35, 0.7);
  --bg-surface-muted: rgba(26, 20, 48, 0.6);
  --bg-surface-elevated: rgba(33, 26, 61, 0.85);
  --border-subtle: rgba(139, 92, 246, 0.2);
  --border-focus: #A78BFA;

  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-muted: #64748B;
  --text-inverse: #080612;

  --primary: #A78BFA;
  --primary-light: #C4B5FD;
  --primary-soft: rgba(167, 139, 250, 0.18);
  --primary-dark: #8B5CF6;

  --income: #34D399;
  --income-soft: rgba(52, 211, 153, 0.18);
  --expense: #FB7185;
  --expense-soft: rgba(251, 113, 133, 0.18);

  --warning: #FBBF24;
  --warning-soft: rgba(251, 191, 36, 0.18);
  --accent-cyan: #22D3EE;
  --accent-cyan-soft: rgba(34, 211, 238, 0.18);
  --accent-magenta: #F472B6;
  --accent-flame: #FB923C;

  --shadow-sm: 0 4px 16px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 8px 28px rgba(0, 0, 0, 0.6);
  --shadow-lg: 0 16px 44px rgba(139, 92, 246, 0.2);
  --shadow-primary: 0 8px 28px rgba(167, 139, 250, 0.35);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-main);
  background: var(--bg-app);
  color: var(--text-primary);
  line-height: 1.5;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

/* Ambient Neural Aurora Background Blobs */
body::before {
  content: '';
  position: fixed;
  top: -150px;
  right: -100px;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

body::after {
  content: '';
  position: fixed;
  bottom: -150px;
  left: 100px;
  width: 450px;
  height: 450px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, rgba(139, 92, 246, 0.04) 50%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Global Switcher Topbar */
.proto-topbar {
  position: sticky;
  top: 0;
  z-index: 999;
  height: var(--topbar-h);
  background: var(--bg-surface);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.proto-topbar-left, .proto-topbar-right { display: flex; align-items: center; gap: 12px; }
.proto-hub-link {
  display: inline-flex; align-items: center; gap: 8px;
  text-decoration: none; color: var(--text-primary); font-size: 13.5px; font-weight: 700;
}

.proto-hub-icon {
  width: 28px; height: 28px; border-radius: 10px;
  background: linear-gradient(135deg, #8B5CF6, #06B6D4);
  color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px;
}

.proto-divider { width: 1px; height: 18px; background: var(--border-subtle); }
.proto-concept-badge {
  display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; color: var(--text-secondary);
}

.proto-concept-indicator {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--primary); box-shadow: 0 0 10px var(--primary);
}

.proto-switcher-wrap { display: flex; align-items: center; gap: 8px; }
.proto-switcher-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
.proto-select {
  padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 13px; outline: none;
}

.proto-theme-btn, .proto-ds-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px;
  border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-weight: 600;
  text-decoration: none; cursor: pointer; backdrop-filter: blur(8px);
}

.proto-ds-btn.active { background: var(--primary); color: #fff; }
.theme-icon-dark { display: none; }
[data-theme="dark"] .theme-icon-light { display: none; }
[data-theme="dark"] .theme-icon-dark { display: inline-flex; }

/* AI Omnibar Floating HUD */
.ai-omnibar-wrap {
  position: relative;
  margin-bottom: 24px;
}

.ai-omnibar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-focus);
  box-shadow: 0 8px 30px rgba(139, 92, 246, 0.15);
}

.ai-omnibar input {
  flex: 1;
  background: transparent;
  border: none;
  font-family: var(--font-main);
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
}

.ai-sparkle-icon {
  font-size: 20px;
  animation: spinSlow 8s linear infinite;
}

@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* App Shell */
.app-layout { display: flex; position: relative; z-index: 1; min-height: calc(100vh - var(--topbar-h)); }

/* Futuristic Sidebar */
.app-sidebar {
  width: var(--sidebar-w);
  background: var(--bg-surface);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: sticky;
  top: var(--topbar-h);
  height: calc(100vh - var(--topbar-h));
  overflow-y: auto;
  padding: 18px 12px;
}

.app-brand {
  display: flex; align-items: center; gap: 10px; padding: 4px 8px 16px 8px;
  border-bottom: 1px solid var(--border-subtle); margin-bottom: 14px;
}

.brand-logo-glow {
  width: 36px; height: 36px; border-radius: 12px;
  background: linear-gradient(135deg, #8B5CF6, #06B6D4); color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.35);
}

.brand-name { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
.brand-tag { font-size: 10.5px; color: var(--primary); font-weight: 700; text-transform: uppercase; }

.nav-section-title {
  font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;
  letter-spacing: 0.06em; padding: 8px 10px 4px 10px;
}

.nav-menu { list-style: none; display: flex; flex-direction: column; gap: 3px; margin-bottom: 14px; }
.nav-item a {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border-radius: var(--radius-md); color: var(--text-secondary); text-decoration: none;
  font-size: 13px; font-weight: 600; transition: all 0.2s ease;
}

.nav-item a:hover { background: var(--primary-soft); color: var(--primary); }
.nav-item.active a {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #FFFFFF; box-shadow: var(--shadow-primary);
}
.nav-item.active a svg { stroke: #FFFFFF; }

.sidebar-badge {
  margin-left: auto; font-size: 10.5px; font-weight: 700; padding: 2px 7px;
  border-radius: var(--radius-full); background: var(--primary-soft); color: var(--primary);
}

.sidebar-user-card {
  margin-top: auto; padding: 12px; border-radius: var(--radius-md);
  background: var(--bg-surface-muted); border: 1px solid var(--border-subtle);
  display: flex; align-items: center; gap: 10px;
}

.user-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #8B5CF6, #EC4899); color: #fff;
  font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center;
}

.user-name { font-size: 12.5px; font-weight: 700; }
.user-sub { font-size: 10.5px; color: var(--primary); font-weight: 600; }

/* Main Area */
.app-main {
  flex: 1; padding: 26px 36px 50px 36px; max-width: 1400px; overflow-y: auto;
}

.screen-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 22px; flex-wrap: wrap; gap: 14px;
}

.screen-pretitle { font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; }
.screen-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.screen-actions { display: flex; align-items: center; gap: 10px; }

/* Frosted Glass Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 9px 16px; border-radius: var(--radius-md); font-size: 13.5px; font-weight: 600;
  cursor: pointer; border: 1px solid var(--border-subtle); background: var(--bg-surface);
  color: var(--text-primary); text-decoration: none; backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #8B5CF6, #06B6D4);
  color: #FFFFFF; border-color: transparent; box-shadow: var(--shadow-primary);
}

.btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
.btn-secondary { background: var(--bg-surface); }
.btn-sm { padding: 5px 12px; font-size: 12px; border-radius: var(--radius-sm); }

/* Bento Cards with Glassmorphism */
.card-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 22px; }
.card-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 22px; }
.card-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-bottom: 22px; }
.card-grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; margin-bottom: 22px; }
.card-grid-1-2 { display: grid; grid-template-columns: 1fr 2fr; gap: 18px; margin-bottom: 22px; }

.card {
  background: var(--bg-surface);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.card:hover { box-shadow: var(--shadow-md); border-color: var(--border-focus); }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.card-title { font-size: 15.5px; font-weight: 700; }
.card-desc { font-size: 12.5px; color: var(--text-muted); }

.stat-card {
  background: var(--bg-surface);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  padding: 18px;
  border: 1px solid var(--border-subtle);
  display: flex; flex-direction: column; gap: 6px; box-shadow: var(--shadow-sm);
}

.stat-header { display: flex; align-items: center; justify-content: space-between; }
.stat-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.stat-icon-wrap {
  width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  background: var(--primary-soft); color: var(--primary);
}
.stat-val { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.stat-footer { font-size: 12px; font-weight: 600; }
.stat-delta-positive { color: var(--income); }
.stat-delta-negative { color: var(--expense); }

/* Quick Action Strip */
.quick-actions-bar { display: flex; gap: 10px; margin-bottom: 22px; flex-wrap: wrap; }
.action-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;
  border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-weight: 600;
  text-decoration: none; backdrop-filter: blur(8px);
}
.action-pill:hover { border-color: var(--primary); color: var(--primary); }
.action-icon-circle { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; }

/* Holographic Virtual Card */
.virtual-debit-card {
  background: linear-gradient(135deg, #4C1D95 0%, #7C3AED 50%, #06B6D4 100%);
  border-radius: var(--radius-xl);
  padding: 24px;
  color: #FFFFFF;
  box-shadow: 0 10px 30px rgba(124, 58, 237, 0.35);
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.card-chip { width: 40px; height: 30px; border-radius: 6px; background: #FDE047; margin-bottom: 20px; }
.card-num-preview { font-family: var(--font-mono); font-size: 16px; letter-spacing: 0.16em; margin-bottom: 16px; }
.card-bottom-row { display: flex; justify-content: space-between; align-items: flex-end; }

/* Tables & Lists */
.proto-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.proto-table th {
  font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);
  padding: 9px 12px; border-bottom: 1px solid var(--border-subtle);
}
.proto-table td { padding: 12px; border-bottom: 1px solid var(--border-subtle); }
.proto-table tr:hover td { background: var(--primary-soft); }

.txn-list { display: flex; flex-direction: column; gap: 8px; }
.txn-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-radius: var(--radius-md); background: var(--bg-surface-muted);
}
.txn-left { display: flex; align-items: center; gap: 10px; }
.txn-icon { width: 34px; height: 34px; border-radius: 10px; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; font-size: 16px; }
.txn-title { font-size: 13.5px; font-weight: 700; }
.txn-meta { font-size: 11.5px; color: var(--text-muted); }
.txn-amount { font-family: var(--font-mono); font-size: 14px; font-weight: 700; }
.txn-income { color: var(--income); }
.txn-expense { color: var(--expense); }

/* Badges */
.badge {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px;
  border-radius: var(--radius-full); font-size: 11px; font-weight: 700;
}
.badge-primary { background: var(--primary-soft); color: var(--primary); }
.badge-income { background: var(--income-soft); color: var(--income); }
.badge-expense { background: var(--expense-soft); color: var(--expense); }
.badge-warning { background: var(--warning-soft); color: var(--warning); }
.badge-indigo { background: var(--accent-cyan-soft); color: var(--accent-cyan); }

.progress-bar-track {
  width: 100%; height: 6px; background: var(--bg-surface-muted); border-radius: var(--radius-full); overflow: hidden;
}
.progress-bar-fill {
  height: 100%; background: linear-gradient(90deg, #8B5CF6, #06B6D4);
}

.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-label { font-size: 12.5px; font-weight: 600; color: var(--text-secondary); }
.form-input, .form-select {
  padding: 9px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);
  background: var(--bg-surface); color: var(--text-primary); font-size: 13.5px; outline: none;
}

.chart-container { position: relative; width: 100%; height: 230px; }

/* Mobile & Modal */
.mobile-bottom-bar {
  display: none; position: fixed; bottom: 0; left: 0; right: 0; height: 60px;
  background: var(--bg-surface); backdrop-filter: blur(16px);
  border-top: 1px solid var(--border-subtle); z-index: 990; justify-content: space-around; align-items: center;
}
.mobile-nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  text-decoration: none; color: var(--text-muted); font-size: 10.5px; font-weight: 600;
}
.mobile-nav-item.active { color: var(--primary); }

.proto-modal-backdrop {
  display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(8, 6, 18, 0.7); backdrop-filter: blur(8px);
  z-index: 1000; align-items: center; justify-content: center; padding: 18px;
}
.proto-modal-backdrop.active { display: flex; }
.proto-modal-card {
  background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 500px; width: 100%;
  padding: 24px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-lg);
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
  .app-main { padding: 14px 14px 74px 14px; }
}
  `;
}

function getConcept4Js() {
  return `
function initProtoTheme() {
  const savedTheme = localStorage.getItem('proto_theme') || 'dark'; // Dark aurora default for AI concept
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

// AI Chart Renderers
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
  const innerRadius = radius * 0.64;

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
  ctx.fillStyle = isDark ? '#A78BFA' : '#8B5CF6';
  ctx.font = '700 11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('AI PREDICTION', cx, cy - 6);

  ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
  ctx.font = '800 17px system-ui';
  ctx.fillText('₹78,250', cx, cy + 14);
}

function drawLineChart(canvasId, points, color = '#8B5CF6') {
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
  grad.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
  grad.addColorStop(1, 'rgba(6, 182, 212, 0)');

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
  ctx.lineWidth = 3;
  ctx.stroke();

  coords.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
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
  const barW = Math.min(16, slotW * 0.32);

  bars.forEach((b, i) => {
    const x = pad + i * slotW + slotW / 2;
    const incH = (b.income / maxVal) * (h - pad * 2);
    const expH = (b.expense / maxVal) * (h - pad * 2);

    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.roundRect(x - barW - 2, h - pad - incH, barW, incH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.roundRect(x + 2, h - pad - expH, barW, expH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, x, h - 4);
  });
}

function renderAllCharts() {
  drawDonutChart('expenseDonutCanvas', [
    { value: 30000, color: '#8B5CF6' },
    { value: 16450, color: '#EC4899' },
    { value: 12100, color: '#06B6D4' },
    { value: 8900, color: '#3B82F6' },
    { value: 6800, color: '#10B981' },
    { value: 4000, color: '#F59E0B' }
  ]);

  drawLineChart('netWorthGrowthCanvas', [36, 38, 39.5, 41.2, 42.8, 44.5, 46.2, 48.65], '#8B5CF6');
  drawLineChart('portfolioGrowthCanvas', [24, 25.2, 27, 28.5, 29.8, 31.4, 34.2], '#06B6D4');
  drawLineChart('fireProjectionCanvas', [48, 75, 110, 160, 230, 310, 410, 450], '#EC4899');

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
        ${s.id === 'ai-assistant' ? '<span class="sidebar-badge">Active</span>' : ''}
      </a>
    </li>
  `).join('');

  return `
    <aside class="app-sidebar">
      <div class="app-brand">
        <div class="brand-logo-glow">⚡</div>
        <div>
          <div class="brand-name">LigthsON AI</div>
          <div class="brand-tag">Neural Autonomous</div>
        </div>
      </div>

      <span class="nav-section-title">Copilot Navigation</span>
      <ul class="nav-menu">
        ${navItems}
      </ul>

      <div class="sidebar-user-card">
        <div class="user-avatar">AI</div>
        <div>
          <div class="user-name">Lumina Agent</div>
          <div class="user-sub">Continuous Learning</div>
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
        <span>Feed</span>
      </a>
      <a href="ai-assistant.html" class="mobile-nav-item ${currentScreenId === 'ai-assistant' ? 'active' : ''}">
        ${ICONS.ai}
        <span>Lumina</span>
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
          <h3 class="card-title">AI Natural Language Entry</h3>
          <button class="btn btn-sm" onclick="closeModal('addTransactionModal')">✕</button>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px;">
          Type or speak naturally: e.g. "Spent 1,480 rupees at Swiggy for dinner"
        </p>
        <div class="form-group">
          <input type="text" class="form-input" placeholder="Natural language prompt..." value="Spent ₹1,480 at Swiggy Gourmet" />
        </div>
        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button class="btn" style="flex: 1;" onclick="closeModal('addTransactionModal')">Cancel</button>
          <button class="btn btn-primary" style="flex: 1;" onclick="alert('AI Parsed & Added Entry!'); closeModal('addTransactionModal');">Auto-Parse & Save</button>
        </div>
      </div>
    </div>
  `;
}

function renderOmnibar() {
  return `
    <div class="ai-omnibar-wrap">
      <div class="ai-omnibar">
        <span class="ai-sparkle-icon">✨</span>
        <input type="text" placeholder="Ask Lumina AI anything... (e.g. 'Can I afford an iPhone 16 Pro this month?')" onkeypress="if(event.key==='Enter') window.location.href='ai-assistant.html'" />
        <button class="btn btn-primary btn-sm" onclick="window.location.href='ai-assistant.html'">Ask AI</button>
      </div>
    </div>
  `;
}

module.exports = {
  getConcept4Css,
  getConcept4Js,
  renderSidebar,
  renderMobileBottomBar,
  renderModal,
  renderOmnibar
};
