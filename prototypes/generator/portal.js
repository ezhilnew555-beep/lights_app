const { SCREENS, CONCEPTS } = require('./shared');

function renderMasterPortalHtml() {
  const conceptCards = CONCEPTS.map(c => {
    let accentColor = '#0D9488';
    let bgGradient = 'linear-gradient(135deg, #0D9488, #14B8A6)';
    let desc = '';
    let inspiration = '';
    let badge = '';

    if (c.id.includes('1')) {
      accentColor = '#0D9488';
      bgGradient = 'linear-gradient(135deg, #0F766E, #0D9488, #14B8A6)';
      desc = 'Vibrant card-based architecture with warm stone neutrals, multi-layer shadows, tactile micro-animations, and high consumer engagement.';
      inspiration = 'Revolut • Monzo • N26 • Wise';
      badge = 'Consumer Flagship';
    } else if (c.id.includes('2')) {
      accentColor = '#2563EB';
      bgGradient = 'linear-gradient(135deg, #111111, #2563EB)';
      desc = 'Radical data clarity, extreme whitespace, monochrome discipline with single electric accent, monospace precision, and zero decorative fluff.';
      inspiration = 'Copilot Money • Linear • Monarch';
      badge = 'Hyper-Minimalist';
    } else if (c.id.includes('3')) {
      accentColor = '#38BDF8';
      bgGradient = 'linear-gradient(135deg, #080D1A, #0F2A4A, #1E3A8A)';
      desc = 'Institutional financial workstation with live market ticker, high density multi-pane grid, portfolio risk ratios (Sharpe, Beta), and terminal feel.';
      inspiration = 'Bloomberg Terminal • J.P. Morgan • FactSet';
      badge = 'Institutional Workstation';
    } else if (c.id.includes('4')) {
      accentColor = '#8B5CF6';
      bgGradient = 'linear-gradient(135deg, #4C1D95, #8B5CF6, #06B6D4)';
      desc = 'Conversational copilot with ambient neural auroras, frosted glassmorphism, voice waveform agent, and autonomous cashflow projections.';
      inspiration = 'Perplexity • Copilot • Autonomous Agents';
      badge = 'Autonomous AI';
    } else if (c.id.includes('5')) {
      accentColor = '#D4AF37';
      bgGradient = 'linear-gradient(135deg, #1A1615, #D4AF37, #8C6D3F)';
      desc = 'Editorial opulence, obsidian black velvet and champagne gold, serif typography, private net worth vault, and bespoke concierge touchpoints.';
      inspiration = 'Private Family Office • Amex Centurion';
      badge = 'Sovereign Luxury';
    }

    return `
      <div class="concept-card">
        <div class="concept-card-hero" style="background: ${bgGradient};">
          <span class="concept-card-badge">${badge}</span>
          <h2 class="concept-card-title">${c.name}</h2>
          <p class="concept-card-inspo">Inspired by ${inspiration}</p>
        </div>
        <div class="concept-card-body">
          <p class="concept-card-desc">${desc}</p>
          <div class="concept-action-btns">
            <a href="${c.folder}/dashboard.html" class="btn btn-primary" target="_blank">
              Launch Prototype (19 Screens) →
            </a>
            <a href="${c.folder}/design-system.html" class="btn btn-secondary" target="_blank">
              View Design Tokens
            </a>
          </div>
          <div class="screen-links-toggle">
            <span class="screen-toggle-title">Quick Jump to Screen:</span>
            <div class="quick-screen-tags">
              ${SCREENS.slice(0, 8).map(s => `
                <a href="${c.folder}/${s.file}" target="_blank" class="quick-screen-tag">${s.name}</a>
              `).join('')}
              <a href="${c.folder}/index.html" target="_blank" class="quick-screen-tag" style="color: ${accentColor}; font-weight: 700;">+ All 19 Screens</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LigthsON — 5 Standalone Fintech UI/UX Concepts Suite</title>
  <style>
    :root {
      --bg: #090B10;
      --surface: #11151F;
      --surface-elevated: #181E2C;
      --border: #232B3E;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --primary: #0D9488;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 0 0 80px 0;
    }
    .portal-header {
      background: linear-gradient(180deg, #11151F 0%, #090B10 100%);
      border-bottom: 1px solid var(--border);
      padding: 60px 30px 50px 30px;
      text-align: center;
      position: relative;
    }
    .portal-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(13, 148, 136, 0.15);
      border: 1px solid rgba(13, 148, 136, 0.3);
      color: #14B8A6;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin-bottom: 18px;
    }
    .portal-title {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 14px;
      background: linear-gradient(135deg, #FFFFFF 40%, #94A3B8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .portal-subtitle {
      font-size: 17px;
      color: var(--text-muted);
      max-width: 800px;
      margin: 0 auto 30px auto;
    }
    .portal-metrics {
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
    }
    .portal-metric-item {
      text-align: center;
    }
    .portal-metric-num {
      font-size: 28px;
      font-weight: 800;
      color: #14B8A6;
    }
    .portal-metric-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Container */
    .portal-content {
      max-width: 1400px;
      margin: 40px auto 0 auto;
      padding: 0 24px;
    }

    .section-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    /* Concept Cards Grid */
    .concepts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 24px;
      margin-bottom: 60px;
    }
    .concept-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    .concept-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }
    .concept-card-hero {
      padding: 28px;
      color: #FFFFFF;
      position: relative;
    }
    .concept-card-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(8px);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .concept-card-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin-bottom: 6px;
    }
    .concept-card-inspo {
      font-size: 12.5px;
      opacity: 0.9;
    }
    .concept-card-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .concept-card-desc {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .concept-action-btns {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 18px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #0D9488;
      color: #FFFFFF;
    }
    .btn-primary:hover { background: #14B8A6; }
    .btn-secondary {
      background: var(--surface-elevated);
      color: var(--text);
      border-color: var(--border);
    }
    .btn-secondary:hover { background: var(--border); }

    .screen-links-toggle {
      margin-top: auto;
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }
    .screen-toggle-title {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: block;
      margin-bottom: 8px;
    }
    .quick-screen-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .quick-screen-tag {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      background: var(--surface-elevated);
      color: var(--text-muted);
      text-decoration: none;
      border: 1px solid var(--border);
      transition: all 0.15s ease;
    }
    .quick-screen-tag:hover {
      background: var(--border);
      color: #FFFFFF;
    }

    /* Interactive Live Device Previewer */
    .preview-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 60px;
    }
    .preview-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
    }
    .preview-selectors {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .preview-select {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface-elevated);
      color: var(--text);
      font-size: 13.5px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }
    .device-toggles {
      display: flex;
      gap: 6px;
    }
    .device-btn {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface-elevated);
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .device-btn.active {
      background: #0D9488;
      color: #FFFFFF;
      border-color: #0D9488;
    }
    .iframe-wrapper {
      display: flex;
      justify-content: center;
      background: #050608;
      border-radius: 14px;
      padding: 24px;
      overflow-x: auto;
      border: 1px solid var(--border);
    }
    iframe#previewFrame {
      border: none;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      transition: width 0.3s ease, height 0.3s ease;
      width: 100%;
      height: 750px;
    }

    /* Screen Directory Matrix Table */
    .matrix-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 30px;
      overflow-x: auto;
    }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    .matrix-table th {
      padding: 12px 14px;
      border-bottom: 2px solid var(--border);
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    .matrix-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
    }
    .matrix-table tr:hover td {
      background: var(--surface-elevated);
    }
    .matrix-link {
      color: #14B8A6;
      text-decoration: none;
      font-weight: 600;
    }
    .matrix-link:hover { text-decoration: underline; }
  </style>
</head>
<body>

  <header class="portal-header">
    <div class="portal-badge">⚡ LigthsON UI/UX Architecture Lab</div>
    <h1 class="portal-title">5 Standalone Fintech Design Concepts</h1>
    <p class="portal-subtitle">
      Comprehensive design exploration suite covering 19 screens across 5 distinct fintech design philosophies. Complete with Light & Dark themes, responsive viewports, realistic mock data, and interactive charting.
    </p>

    <div class="portal-metrics">
      <div class="portal-metric-item">
        <div class="portal-metric-num">5</div>
        <div class="portal-metric-label">Unique Concepts</div>
      </div>
      <div class="portal-metric-item">
        <div class="portal-metric-num">95</div>
        <div class="portal-metric-label">Total HTML Screens</div>
      </div>
      <div class="portal-metric-item">
        <div class="portal-metric-num">100%</div>
        <div class="portal-metric-label">Offline & Standalone</div>
      </div>
      <div class="portal-metric-item">
        <div class="portal-metric-num">Light & Dark</div>
        <div class="portal-metric-label">Theme Engine</div>
      </div>
    </div>
  </header>

  <div class="portal-content">

    <h2 class="section-title">Design Concept Explorations</h2>
    <p class="section-subtitle">Click any concept to launch its standalone prototype or jump to specific screens.</p>

    <div class="concepts-grid">
      ${conceptCards}
    </div>

    <!-- Live Interactive Device Previewer -->
    <div class="preview-section">
      <div class="preview-controls">
        <div>
          <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 4px;">Interactive Live Previewer</h3>
          <p style="font-size: 13px; color: var(--text-muted);">Inspect any screen across all 5 concepts in Mobile, Tablet, or Full Desktop view.</p>
        </div>
        <div class="preview-selectors">
          <select id="conceptSelect" class="preview-select" onchange="updatePreview()">
            ${CONCEPTS.map(c => `<option value="${c.folder}">${c.name}</option>`).join('')}
          </select>
          <select id="screenSelect" class="preview-select" onchange="updatePreview()">
            ${SCREENS.map(s => `<option value="${s.file}">${s.name}</option>`).join('')}
          </select>
          <div class="device-toggles">
            <button class="device-btn" onclick="setDevice('mobile')">📱 Mobile (390px)</button>
            <button class="device-btn" onclick="setDevice('tablet')">📟 Tablet (768px)</button>
            <button class="device-btn active" onclick="setDevice('desktop')">💻 Desktop (100%)</button>
          </div>
        </div>
      </div>

      <div class="iframe-wrapper">
        <iframe id="previewFrame" src="Concept-1-Premium-Digital-Bank/dashboard.html"></iframe>
      </div>
    </div>

    <!-- Master Screen Directory Matrix -->
    <div class="matrix-section">
      <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 4px;">Master 95-Screen Directory Matrix</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Direct access to every screen across all 5 prototype projects.</p>

      <table class="matrix-table">
        <thead>
          <tr>
            <th>Screen Name</th>
            <th>Concept 1 (Premium Bank)</th>
            <th>Concept 2 (Minimal Neo)</th>
            <th>Concept 3 (Enterprise)</th>
            <th>Concept 4 (Autonomous AI)</th>
            <th>Concept 5 (Luxury Wealth)</th>
          </tr>
        </thead>
        <tbody>
          ${SCREENS.map(s => `
            <tr>
              <td><strong>${s.name}</strong></td>
              <td><a href="Concept-1-Premium-Digital-Bank/${s.file}" target="_blank" class="matrix-link">Open C1 →</a></td>
              <td><a href="Concept-2-Minimal-Neobank/${s.file}" target="_blank" class="matrix-link">Open C2 →</a></td>
              <td><a href="Concept-3-Enterprise-Fintech/${s.file}" target="_blank" class="matrix-link">Open C3 →</a></td>
              <td><a href="Concept-4-AI-Powered-Finance/${s.file}" target="_blank" class="matrix-link">Open C4 →</a></td>
              <td><a href="Concept-5-Luxury-Wealth/${s.file}" target="_blank" class="matrix-link">Open C5 →</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

  </div>

  <script>
    function updatePreview() {
      const concept = document.getElementById('conceptSelect').value;
      const screen = document.getElementById('screenSelect').value;
      document.getElementById('previewFrame').src = concept + '/' + screen;
    }

    function setDevice(device) {
      const frame = document.getElementById('previewFrame');
      const btns = document.querySelectorAll('.device-btn');
      btns.forEach(b => b.classList.remove('active'));

      if (device === 'mobile') {
        frame.style.width = '390px';
        frame.style.height = '780px';
        btns[0].classList.add('active');
      } else if (device === 'tablet') {
        frame.style.width = '768px';
        frame.style.height = '820px';
        btns[1].classList.add('active');
      } else {
        frame.style.width = '100%';
        frame.style.height = '750px';
        btns[2].classList.add('active');
      }
    }
  </script>
</body>
</html>
  `;
}

module.exports = {
  renderMasterPortalHtml
};
