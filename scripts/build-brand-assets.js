/**
 * Builds every raster brand asset from assets/ligthson-app-icon.svg.
 *   node scripts/build-brand-assets.js
 * Renders with headless Chrome (installed on the dev machine) and writes:
 *   assets/brand/icon.png                 1024  app icon (full-bleed, iOS/Android legacy)
 *   assets/brand/adaptive-foreground.png  1024  Android adaptive foreground (safe-zone glyph)
 *   assets/brand/adaptive-monochrome.png  1024  Android 13 themed icon (white glyph)
 *   assets/brand/splash-icon.png          1024  splash glyph (transparent, lime)
 *   assets/brand/notification-icon.png     96   Android status-bar icon (white glyph)
 *   assets/brand/logo.png                  512  rounded app tile for in-app / report use
 *   assets/brand/favicon.png                48  web favicon
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "brand");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const src = fs.readFileSync(path.join(ROOT, "assets", "ligthson-app-icon.svg"), "utf8");
const glyph = src.match(/<g transform="[^"]*">([\s\S]*)<\/g><\/svg>/)[1]; // inner artwork
const BG = "#0A0C0B";
const LIME = "#C6F432";

// Artwork (incl. ring stroke) spans x -1..211, y -31..101 → centre (105, 35).
const art = (scale, color = LIME) => {
  const g = color === LIME ? glyph : glyph.replace(new RegExp(LIME, "g"), color);
  return `<g transform="translate(512 512) scale(${scale}) translate(-105 -35)">${g}</g>`;
};
const svg = (body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${bg || ""}${body}</svg>`;

const VARIANTS = {
  "icon.png": { size: 1024, svg: svg(art(3.3), `<rect width="1024" height="1024" fill="${BG}"/>`) },
  // Adaptive icons are masked to a circle/squircle: keep the glyph inside the 66% safe zone.
  "adaptive-foreground.png": { size: 1024, svg: svg(art(2.55)) },
  "adaptive-monochrome.png": { size: 1024, svg: svg(art(2.55, "#FFFFFF")) },
  "splash-icon.png": { size: 1024, svg: svg(art(4.3)) },
  "notification-icon.png": { size: 96, svg: svg(art(4.3, "#FFFFFF")) },
  "logo.png": { size: 512, svg: src },
  "favicon.png": { size: 48, svg: src },
};

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "brand-"));

for (const [name, v] of Object.entries(VARIANTS)) {
  const svgFile = path.join(tmp, name.replace(".png", ".svg"));
  const htmlFile = path.join(tmp, name.replace(".png", ".html"));
  fs.writeFileSync(svgFile, v.svg);
  // Render large, then downscale in the browser via the <img> size for crisp small icons
  fs.writeFileSync(
    htmlFile,
    `<!doctype html><html><body style="margin:0;background:transparent"><img src="${path.basename(svgFile)}" width="${v.size}" height="${v.size}" style="display:block"></body></html>`
  );
  const shot = path.join(OUT, name);
  const win = Math.max(v.size, 500); // headless Chrome has a minimum window width
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--default-background-color=00000000",
    `--window-size=${win},${win}`,
    `--screenshot=${shot}`,
    `file:///${htmlFile.replace(/\\/g, "/")}`,
  ], { stdio: "ignore" });
  if (win !== v.size) {
    // crop the top-left size×size region
    execFileSync("python", ["-c", `from PIL import Image;im=Image.open(r'${shot}');im.crop((0,0,${v.size},${v.size})).save(r'${shot}')`]);
  }
  console.log(`${name.padEnd(28)} ${v.size}px`);
}
fs.rmSync(tmp, { recursive: true, force: true });
