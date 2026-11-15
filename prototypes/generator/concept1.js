const { SCREENS, CONCEPTS, ICONS, MOCK_DATA, renderGlobalHeader } = require('./shared');

function getConcept1Css() {
  return `
/* ==========================================================================
   CONCEPT 1: PREMIUM DIGITAL BANK (Warm Precision / Revolut / Monzo / N26)
   ========================================================================== */

:root {
  --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: 'SF Mono', Consolas, 'Courier New', monospace;

  /* Theme Tokens: Light (Warm Precision) */
  --bg-app: #FAFAF9;
  --bg-surface: #FFFFFF;
  --bg-surface-muted: #F5F5F4;
  --bg-surface-elevated: #FFFFFF;
  --border-subtle: #E7E5E4;
  --border-focus: #14B8A6;

  --text-primary: #1C1917;
  --text-secondary: #57534E;
  --text-muted: #A8A29E;
  --text-inverse: #FFFFFF;

  --primary: #0D9488;
  --primary-light: #14B8A6;
  --primary-soft: #CCFBF1;
  --primary-dark: #0F766E;

  --income: #059669;
  --income-soft: #D1FAE5;
  --expense: #E11D48;
  --expense-soft: #FFE4E6;

  --warning: #D97706;
  --warning-soft: #FEF3C7;
  --accent-indigo: #4F46E5;
  --accent-indigo-soft: #EEF2FF;
  --accent-amber: #F59E0B;
  --accent-flame: #EA580C;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 12px 28px rgba(0, 0, 0, 0.08), 0 4px 10px rgba(0, 0, 0, 0.04);
  --shadow-primary: 0 8px 20px rgba(13, 148, 136, 0.22);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  --sidebar-w: 260px;
  --topbar-h: 60px;
}

[data-theme="dark"] {
  --bg-app: #0F172A;
  --bg-surface: #1E293B;
  --bg-surface-muted: #141E33;
  --bg-surface-elevated: #24324D;
  --border-subtle: #2D3D58;
  --border-focus: #2DD4BF;

  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --text-inverse: #0F172A;

  --primary: #14B8A6;
  --primary-light: #2DD4BF;
  --primary-soft: rgba(20, 184, 166, 0.18);
  --primary-dark: #0D9488;

  --income: #10B981;
  --income-soft: rgba(16, 185, 129, 0.18);
  --expense: #F43F5E;
  --expense-soft: rgba(244, 63, 94, 0.18);

  --warning: #FBBF24;
  --warning-soft: rgba(251, 191, 36, 0.18);
  --accent-indigo: #818CF8;
  --accent-indigo-soft: rgba(129, 140, 248, 0.18);
  --accent-amber: #FBBF24;
  --accent-flame: #FB923C;

  --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 6px 16px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 16px 36px rgba(0, 0, 0, 0.6);
  --shadow-primary: 0 8px 24px rgba(20, 184, 166, 0.3);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: var(--font-main);
  background: var(--bg-app);
  color: var(--text-primary);
  line-height: 1.5;
  transition: background-color 0.25s ease, color 0.25s ease;
  min-height: 100vh;
  overflow-x: hidden;
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
  padding: 0 20px;
  box-shadow: var(--shadow-sm);
}

.proto-topbar-left, .proto-topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.proto-hub-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text-primary);
  font-size: 14px;
}

.proto-hub-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
}

.proto-divider {
  width: 1px;
  height: 20px;
  background: var(--border-subtle);
}

.proto-concept-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.proto-concept-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 8px var(--primary);
}

.proto-switcher-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.proto-switcher-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.proto-select {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-muted);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
}

.proto-theme-btn, .proto-ds-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-muted);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}

.proto-theme-btn:hover, .proto-ds-btn:hover {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: var(--primary-light);
}

.proto-ds-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.theme-icon-dark { display: none; }
[data-theme="dark"] .theme-icon-light { display: none; }
[data-theme="dark"] .theme-icon-dark { display: inline-flex; }

/* Main App Shell */
.app-layout {
  display: flex;
  min-height: calc(100vh - var(--topbar-h));
}

/* Sidebar Navigation */
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
  padding: 20px 14px;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px 20px 10px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 16px;
}

.brand-logo-glow {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFF;
  font-weight: 800;
  font-size: 18px;
  box-shadow: var(--shadow-primary);
}

.brand-info {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.brand-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 10px 12px 6px 12px;
}

.nav-menu {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 16px;
}

.nav-item a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 600;
  transition: all 0.18s ease;
}

.nav-item a:hover {
  background: var(--bg-surface-muted);
  color: var(--text-primary);
}

.nav-item.active a {
  background: var(--primary);
  color: #FFFFFF;
  box-shadow: var(--shadow-primary);
}

.nav-item.active a svg {
  stroke: #FFFFFF;
}

.sidebar-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background: var(--primary-soft);
  color: var(--primary);
}

.nav-item.active .sidebar-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #FFFFFF;
}

.sidebar-user-card {
  margin-top: auto;
  padding: 12px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface-muted);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0D9488, #4F46E5);
  color: #FFF;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-name {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.user-sub {
  font-size: 11px;
  color: var(--text-muted);
}

/* Main Content Area */
.app-main {
  flex: 1;
  padding: 28px 36px 60px 36px;
  max-width: 1400px;
  overflow-y: auto;
}

/* Breadcrumbs & Header */
.screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26px;
  flex-wrap: wrap;
  gap: 16px;
}

.screen-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.screen-pretitle {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.screen-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.screen-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Button Component Tokens */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-primary {
  background: var(--primary);
  color: #FFFFFF;
  box-shadow: var(--shadow-primary);
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border-color: var(--border-subtle);
}

.btn-secondary:hover {
  background: var(--bg-surface-muted);
}

.btn-soft {
  background: var(--primary-soft);
  color: var(--primary);
}

.btn-soft:hover {
  background: var(--primary-light);
  color: #FFF;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12.5px;
  border-radius: var(--radius-sm);
}

.btn-lg {
  padding: 14px 26px;
  font-size: 15.5px;
  border-radius: var(--radius-lg);
}

/* Cards & Grid Containers */
.card-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 26px;
}

.card-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 26px;
}

.card-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 26px;
}

.card-grid-2-1 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 26px;
}

.card-grid-1-2 {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
  margin-bottom: 26px;
}

.card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 22px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-desc {
  font-size: 13px;
  color: var(--text-muted);
}

/* Metric / Stat Card */
.stat-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.stat-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-soft);
  color: var(--primary);
}

.stat-val {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.stat-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
}

.stat-delta-positive {
  color: var(--income);
}

.stat-delta-negative {
  color: var(--expense);
}

/* Hero Virtual Card Widget (Revolut/Monzo Style) */
.virtual-debit-card {
  background: linear-gradient(135deg, #0F766E 0%, #0D9488 45%, #14B8A6 100%);
  border-radius: 20px;
  padding: 26px;
  color: #FFFFFF;
  box-shadow: var(--shadow-primary);
  position: relative;
  overflow: hidden;
  margin-bottom: 24px;
}

.virtual-debit-card::after {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
}

.card-chip {
  width: 44px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, #FDE047, #CA8A04);
  box-shadow: inset 0 0 4px rgba(0,0,0,0.3);
  margin-bottom: 24px;
}

.card-num-preview {
  font-family: var(--font-mono);
  font-size: 17px;
  letter-spacing: 0.18em;
  margin-bottom: 18px;
  opacity: 0.95;
}

.card-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.card-holder-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.card-network-logo {
  font-size: 20px;
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.05em;
}

/* Quick Action Dial */
.quick-actions-bar {
  display: flex;
  gap: 14px;
  margin-bottom: 26px;
  flex-wrap: wrap;
}

.action-pill {
  flex: 1;
  min-width: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
  text-decoration: none;
}

.action-pill:hover {
  transform: translateY(-2px);
  border-color: var(--primary-light);
  box-shadow: var(--shadow-md);
  color: var(--primary);
}

.action-icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-soft);
  color: var(--primary);
}

/* Transaction List Items */
.txn-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.txn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-muted);
  transition: background 0.15s ease;
}

.txn-row:hover {
  background: var(--border-subtle);
}

.txn-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.txn-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.txn-info {
  display: flex;
  flex-direction: column;
}

.txn-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.txn-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.txn-amount {
  font-family: var(--font-mono);
  font-size: 14.5px;
  font-weight: 700;
}

.txn-income { color: var(--income); }
.txn-expense { color: var(--expense); }

/* Badges and Tags */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 11.5px;
  font-weight: 700;
}

.badge-primary { background: var(--primary-soft); color: var(--primary); }
.badge-income { background: var(--income-soft); color: var(--income); }
.badge-expense { background: var(--expense-soft); color: var(--expense); }
.badge-warning { background: var(--warning-soft); color: var(--warning); }
.badge-indigo { background: var(--accent-indigo-soft); color: var(--accent-indigo); }

/* Interactive Charts Canvas Wrappers */
.chart-container {
  position: relative;
  width: 100%;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

canvas.proto-canvas {
  width: 100% !important;
  height: 100% !important;
}

/* Tables */
.proto-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.proto-table th {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.proto-table td {
  padding: 14px;
  font-size: 13.5px;
  border-bottom: 1px solid var(--border-subtle);
}

.proto-table tr:hover td {
  background: var(--bg-surface-muted);
}

/* Form Inputs */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-input, .form-select, .form-textarea {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-muted);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--border-focus);
  background: var(--bg-surface);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
}

/* Progress bar */
.progress-bar-track {
  width: 100%;
  height: 8px;
  background: var(--bg-surface-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--primary), var(--primary-light));
  transition: width 0.4s ease;
}

/* Mobile Bottom Dock Bar */
.mobile-bottom-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  z-index: 990;
  justify-content: space-around;
  align-items: center;
  padding: 0 10px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.05);
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

.mobile-nav-item.active {
  color: var(--primary);
}

/* Modal Window */
.proto-modal-backdrop {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.proto-modal-backdrop.active {
  display: flex;
}

.proto-modal-card {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  max-width: 520px;
  width: 100%;
  padding: 28px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-subtle);
  animation: modalPop 0.22s ease-out;
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Responsive Breakpoints */
@media (max-width: 1024px) {
  .card-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .card-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .card-grid-2-1, .card-grid-1-2 { grid-template-columns: 1fr; }
  .app-main { padding: 20px; }
}

@media (max-width: 768px) {
  .app-sidebar { display: none; }
  .mobile-bottom-bar { display: flex; }
  .card-grid-4, .card-grid-3, .card-grid-2 { grid-template-columns: 1fr; }
  .app-main { padding: 16px 16px 80px 16px; }
  .proto-topbar { padding: 0 12px; }
  .proto-concept-badge { display: none; }
}
  `;
}

function getConcept1Js() {
  return `
// Theme management
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

// Interactive Quick Action Modal
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

// Lightweight Chart Renderers using Canvas (Zero external dependency, works offline)
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
  const radius = Math.min(cx, cy) * 0.78;
  const innerRadius = radius * 0.62;

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

  // Center text
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? '#94A3B8' : '#57534E';
  ctx.font = '600 11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('TOTAL SPEND', cx, cy - 8);

  ctx.fillStyle = isDark ? '#F8FAFC' : '#1C1917';
  ctx.font = '800 18px system-ui';
  ctx.fillText('₹78,250', cx, cy + 14);
}

function drawLineChart(canvasId, points, color = '#0D9488') {
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

  const coords = points.map((p, idx) => {
    const x = pad + (idx / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return { x, y };
  });

  // Draw Area Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '33');
  grad.addColorStop(1, color + '00');

  ctx.beginPath();
  ctx.moveTo(coords[0].x, h - pad);
  coords.forEach(pt => ctx.lineTo(pt.x, pt.y));
  ctx.lineTo(coords[coords.length - 1].x, h - pad);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw Line
  ctx.beginPath();
  ctx.moveTo(coords[0].x, coords[0].y);
  coords.forEach(pt => ctx.lineTo(pt.x, pt.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Dots
  coords.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
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
  const barW = Math.min(18, slotW * 0.35);

  bars.forEach((b, i) => {
    const x = pad + i * slotW + slotW / 2;
    const incH = (b.income / maxVal) * (h - pad * 2);
    const expH = (b.expense / maxVal) * (h - pad * 2);

    // Income bar
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.roundRect(x - barW - 2, h - pad - incH, barW, incH, [4, 4, 0, 0]);
    ctx.fill();

    // Expense bar
    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.roundRect(x + 2, h - pad - expH, barW, expH, [4, 4, 0, 0]);
    ctx.fill();

    // Month label
    ctx.fillStyle = '#A8A29E';
    ctx.font = '600 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, x, h - 4);
  });
}

function renderAllCharts() {
  drawDonutChart('expenseDonutCanvas', [
    { value: 30000, color: '#0D9488' },
    { value: 16450, color: '#E11D48' },
    { value: 12100, color: '#D97706' },
    { value: 8900, color: '#4F46E5' },
    { value: 6800, color: '#06B6D4' },
    { value: 4000, color: '#10B981' }
  ]);

  drawLineChart('netWorthGrowthCanvas', [36, 38, 39.5, 41.2, 42.8, 44.5, 46.2, 48.65], '#0D9488');
  drawLineChart('portfolioGrowthCanvas', [24, 25.2, 27, 28.5, 29.8, 31.4, 34.2], '#4F46E5');
  drawLineChart('fireProjectionCanvas', [48, 75, 110, 160, 230, 310, 410, 450], '#EA580C');

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
        ${s.id === 'ai-assistant' ? '<span class="sidebar-badge">AI</span>' : ''}
        ${s.id === 'rewards' ? '<span class="sidebar-badge">14.8k</span>' : ''}
      </a>
    </li>
  `).join('');

  return `
    <aside class="app-sidebar">
      <div class="app-brand">
        <div class="brand-logo-glow">⚡</div>
        <div class="brand-info">
          <span class="brand-name">LigthsON</span>
          <span class="brand-tag">Premium Digital</span>
        </div>
      </div>

      <span class="nav-section-title">Core Navigation</span>
      <ul class="nav-menu">
        ${navItems}
      </ul>

      <div class="sidebar-user-card">
        <div class="user-avatar">AS</div>
        <div class="user-details">
          <span class="user-name">${MOCK_DATA.user.name}</span>
          <span class="user-sub">${MOCK_DATA.user.wealthTier}</span>
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
      <a href="ai-assistant.html" class="mobile-nav-item ${currentScreenId === 'ai-assistant' ? 'active' : ''}">
        ${ICONS.ai}
        <span>Lumina</span>
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
          <h3 class="card-title">Add New Transaction</h3>
          <button class="btn btn-sm btn-secondary" onclick="closeModal('addTransactionModal')">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Transaction Type</label>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-sm btn-primary" style="flex: 1;">Expense (-)</button>
            <button class="btn btn-sm btn-secondary" style="flex: 1;">Income (+)</button>
            <button class="btn btn-sm btn-secondary" style="flex: 1;">Transfer</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹)</label>
          <input type="number" class="form-input" placeholder="e.g. 1500" value="1250" />
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select">
            <option>Food & Dining</option>
            <option>Shopping & Retail</option>
            <option>Housing & Rent</option>
            <option>Utilities & Bills</option>
            <option>Mutual Fund SIP</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Merchant / Description</label>
          <input type="text" class="form-input" placeholder="e.g. Starbucks, Amazon" value="Blinkit Quick Delivery" />
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button class="btn btn-secondary" style="flex: 1;" onclick="closeModal('addTransactionModal')">Cancel</button>
          <button class="btn btn-primary" style="flex: 1;" onclick="alert('Transaction Added Successfully!'); closeModal('addTransactionModal');">Save Transaction</button>
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  getConcept1Css,
  getConcept1Js,
  renderSidebar,
  renderMobileBottomBar,
  renderModal
};
