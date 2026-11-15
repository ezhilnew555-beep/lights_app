const fs = require('fs');
const path = require('path');

const { SCREENS, CONCEPTS, renderGlobalHeader } = require('./shared');
const { renderScreenContent } = require('./screenTemplates');

const concept1 = require('./concept1');
const concept2 = require('./concept2');
const concept3 = require('./concept3');
const concept4 = require('./concept4');
const concept5 = require('./concept5');
const { renderMasterPortalHtml } = require('./portal');

const PROTOTYPES_DIR = path.resolve(__dirname, '..');

const CONCEPT_ENGINES = {
  'Concept-1-Premium-Digital-Bank': concept1,
  'Concept-2-Minimal-Neobank': concept2,
  'Concept-3-Enterprise-Fintech': concept3,
  'Concept-4-AI-Powered-Finance': concept4,
  'Concept-5-Luxury-Wealth': concept5
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildAll() {
  console.log('🚀 Starting LigthsON 5-Concept Prototype Build System...\n');

  // 1. Build Master Hub Portal
  const portalHtml = renderMasterPortalHtml();
  fs.writeFileSync(path.join(PROTOTYPES_DIR, 'index.html'), portalHtml, 'utf8');
  console.log('✅ Generated Master Portal: prototypes/index.html');

  // 2. Build Each Concept
  CONCEPTS.forEach(concept => {
    const conceptDir = path.join(PROTOTYPES_DIR, concept.folder);
    const cssDir = path.join(conceptDir, 'css');
    const jsDir = path.join(conceptDir, 'js');

    ensureDir(conceptDir);
    ensureDir(cssDir);
    ensureDir(jsDir);

    const engine = CONCEPT_ENGINES[concept.id];
    if (!engine) {
      console.error(`❌ Engine not found for ${concept.id}`);
      return;
    }

    // Write CSS
    let cssContent = '';
    if (concept.id === 'Concept-1-Premium-Digital-Bank') cssContent = engine.getConcept1Css();
    else if (concept.id === 'Concept-2-Minimal-Neobank') cssContent = engine.getConcept2Css();
    else if (concept.id === 'Concept-3-Enterprise-Fintech') cssContent = engine.getConcept3Css();
    else if (concept.id === 'Concept-4-AI-Powered-Finance') cssContent = engine.getConcept4Css();
    else if (concept.id === 'Concept-5-Luxury-Wealth') cssContent = engine.getConcept5Css();

    fs.writeFileSync(path.join(cssDir, 'styles.css'), cssContent.trim(), 'utf8');
    console.log(`🎨 [${concept.shortName}] Generated css/styles.css`);

    // Write JS
    let jsContent = '';
    if (concept.id === 'Concept-1-Premium-Digital-Bank') jsContent = engine.getConcept1Js();
    else if (concept.id === 'Concept-2-Minimal-Neobank') jsContent = engine.getConcept2Js();
    else if (concept.id === 'Concept-3-Enterprise-Fintech') jsContent = engine.getConcept3Js();
    else if (concept.id === 'Concept-4-AI-Powered-Finance') jsContent = engine.getConcept4Js();
    else if (concept.id === 'Concept-5-Luxury-Wealth') jsContent = engine.getConcept5Js();

    fs.writeFileSync(path.join(jsDir, 'app.js'), jsContent.trim(), 'utf8');
    console.log(`⚡ [${concept.shortName}] Generated js/app.js`);

    // Write all 19 HTML screens
    SCREENS.forEach(screen => {
      const topbar = renderGlobalHeader(concept.id, screen.id);
      const sidebar = engine.renderSidebar(screen.id);
      const mobileBottomBar = engine.renderMobileBottomBar(screen.id);
      const modal = engine.renderModal();

      let extraHeader = '';
      if (concept.id === 'Concept-3-Enterprise-Fintech' && engine.renderTickerRibbon) {
        extraHeader = engine.renderTickerRibbon();
      }

      let extraContentTop = '';
      if (concept.id === 'Concept-4-AI-Powered-Finance' && engine.renderOmnibar) {
        extraContentTop = engine.renderOmnibar();
      }

      const screenBody = renderScreenContent(concept.id, screen.id);

      const html = `<!DOCTYPE html>
<html lang="en" data-theme="${concept.id.includes('3') || concept.id.includes('4') || concept.id.includes('5') ? 'dark' : 'light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LigthsON — ${concept.name} — ${screen.name}</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  ${topbar}
  ${extraHeader}

  <div class="app-layout">
    ${sidebar}
    <main class="app-main">
      ${extraContentTop}
      ${screenBody}
    </main>
  </div>

  ${mobileBottomBar}
  ${modal}

  <script src="js/app.js"></script>
</body>
</html>`;

      fs.writeFileSync(path.join(conceptDir, screen.file), html, 'utf8');
    });

    console.log(`📄 [${concept.shortName}] Generated all 19 HTML screens.`);
  });

  console.log('\n🎉 ALL 5 CONCEPTS AND MASTER HUB BUILT SUCCESSFULLY! Total 96 HTML files created.\n');
}

buildAll();
