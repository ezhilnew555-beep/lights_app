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