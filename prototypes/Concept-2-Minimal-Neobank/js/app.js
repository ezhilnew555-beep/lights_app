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