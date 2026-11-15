/**
 * Pulse design migration codemod.
 *
 *   node scripts/pulse-codemod.js [--dry] [files...]
 *
 * For every screen/component file:
 *  1. Hard-coded hex colours in string literals become Pulse tokens (P.*),
 *     chosen by hue family AND by what the colour paints (text vs. fill vs.
 *     border), so white text on a filled button stays legible in dark mode.
 *  2. COLORS.primary* used as a fill becomes COLORS.primaryFill.
 *  3. Top-level StyleSheet.create(...) is wrapped in themedStyles(() => ...)
 *     so styles rebuild when the theme changes.
 *  4. Text / TextInput come from the Pulse typography layer instead of
 *     react-native, which applies Space Grotesk / JetBrains Mono.
 *
 * Edits are applied by source position (AST-located), so formatting is kept
 * and template-literal HTML (PDF reports) is never touched.
 */

const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

// ── Colour families ─────────────────────────────────────────────────
// Each family: [fg, bg, border, any]
const FAM = {
  white: ["onSolid", "surf", "line", "surf"],
  canvas: ["onSolid", "bg", "line", "bg"],
  tint: ["onSolid", "surf2", "line", "surf2"],
  line: ["mute", "line", "line", "line"],
  ink: ["ink", "solid", "ink", "ink"],
  ink2: ["ink2", "solid2", "line", "ink2"],
  mute: ["mute", "line", "line", "mute"],
  brand: ["primary", "solid", "ink", "inv"],
  pos: ["pos", "pos", "pos", "pos"],
  posSoft: ["pos", "posSoft", "posSoft", "posSoft"],
  neg: ["neg", "neg", "neg", "neg"],
  negSoft: ["neg", "negSoft", "negSoft", "negSoft"],
  amber: ["amber", "amber", "amber", "amber"],
  amberSoft: ["amber", "amberSoft", "amberSoft", "amberSoft"],
  inv: ["inv", "inv", "inv", "inv"],
  invSoft: ["inv", "invSoft", "invSoft", "invSoft"],
};

const HEX = {
  white: ["#FFFFFF", "#FFF", "#FCFEFF", "#F7FAFE", "#FEFEFE", "WHITE"],
  canvas: ["#F8FAFC", "#F9FAFB", "#FAFAFA", "#FAFAF9", "#F5F7FA", "#F8F9FA", "#F5F5F5", "#F7F7F7"],
  tint: ["#E0EDFF", "#EEF4FB", "#D9E8F7", "#E9F2FD", "#EDF4FD", "#EEF6FF", "#FAF5FF", "#E0F7FA", "#F3E5F5", "#FAE8FF", "#B3E5FC", "#D6E5FA", 
    "#F1F5F9", "#F3F4F6", "#F5F5F4", "#EFF6FF", "#F0F9FF", "#EAF2FF", "#E0F2FE", "#DBEAFE",
    "#BFDBFE", "#D8E8F8", "#D2E3F5", "#CCFBF1", "#E8F0FE", "#EBF5FF", "#F0F4F8", "#EEF2F6",
    "#E6F0FF", "#F0F7FF", "#E3F2FD", "#EEEEEE", "#EEE", "#F0F0F0",
  ],
  line: ["#E2E8F0", "#E5E7EB", "#D1D5DB", "#CBD5E1", "#E7E5E4", "#D6D3D1", "#DDD", "#DDDDDD", "#E0E0E0", "#CCC", "#CCCCCC", "#D0D0D0", "#E5E5E5"],
  ink: ["#1E3A5F", "#1E293B", "#0F172A", "#111827", "#1F2937", "#1C1917", "#000", "#000000", "#333", "#333333", "#222", "#222222", "#111", "#212121", "#1A1A1A", "BLACK"],
  ink2: ["#334155", "#374151", "#475569", "#4B5563", "#57534E", "#44403C", "#444", "#555", "#555555", "#424242"],
  mute: ["#64748B", "#6B7280", "#94A3B8", "#9CA3AF", "#A8A29E", "#78716C", "#666", "#666666", "#777", "#888", "#888888", "#999", "#999999", "#757575", "#9E9E9E", "#AAA"],
  brand: ["#0277BD", 
    "#2563EB", "#3B82F6", "#1D4ED8", "#1E40AF", "#60A5FA", "#0EA5E9", "#0284C7", "#0D9488",
    "#14B8A6", "#0F766E", "#1976D2", "#4F8EF7", "#007AFF", "#1E3A8A", "#0369A1", "#2196F3",
    "#1565C0", "#93C5FD",
  ],
  pos: ["#14532D", "#10B981", "#059669", "#16A34A", "#22C55E", "#0F9D6E", "#15803D", "#047857", "#34D399", "#4CAF50", "#065F46", "#166534", "#00C853", "#2E7D32", "#4ADE80"],
  posSoft: ["#D1FAE5", "#DCFCE7", "#ECFDF5", "#F0FDF4", "#A7F3D0", "#BBF7D0", "#E8F5E9", "#86EFAC"],
  neg: ["#BE123C", "#9F1239", "#EF4444", "#DC2626", "#E11D48", "#991B1B", "#B91C1C", "#F43F5E", "#FF3B30", "#F44336", "#E53935", "#D32F2F", "#F87171", "#FF4444", "#7F1D1D"],
  negSoft: ["#FECDD3", "#FFD2D2", "#FEF2F2", "#FEE2E2", "#FECACA", "#FFE4E6", "#FFF1F2", "#FFEBEE", "#FCA5A5"],
  amber: ["#7C2D12", "#9A3412", "#F59E0B", "#D97706", "#FBBF24", "#B45309", "#92400E", "#EA580C", "#F97316", "#FFD700", "#FFC107", "#FF9800", "#CA8A04", "#EAB308", "#FB923C", "#C2410C", "#78350F", "#A16207", "#854D0E"],
  amberSoft: ["#FEF3C7", "#FFFBEB", "#FDE68A", "#FFEDD5", "#FFF7ED", "#FEF9C3", "#FFF8E1", "#FCD34D", "#FED7AA"],
  inv: ["#5B21B6", "#8B5CF6", "#7C3AED", "#6366F1", "#4F46E5", "#4338CA", "#A855F7", "#EC4899", "#6D28D9", "#9333EA", "#3730A3", "#DB2777", "#06B6D4", "#0891B2"],
  invSoft: ["#EDE9FE", "#F5F3FF", "#E0E7FF", "#EEF2FF", "#FCE7F3", "#C7D2FE", "#DDD6FE", "#ECFEFF", "#CFFAFE"],
};

const HEX_TO_FAMILY = {};
for (const [fam, list] of Object.entries(HEX)) for (const h of list) HEX_TO_FAMILY[h] = fam;

const norm = (v) => {
  const s = v.trim().toUpperCase();
  if (s === "WHITE" || s === "BLACK") return s;
  if (/^#[0-9A-F]{3}$/.test(s) || /^#[0-9A-F]{6}$/.test(s)) return s;
  if (/^#[0-9A-F]{8}$/.test(s)) return null; // alpha hex — leave
  return null;
};

// ── Context classification ──────────────────────────────────────────
const SKIP_KEYS = /^(shadowColor|statusBarColor|navigationBarColor|androidStatusBar)$/i;
const FG_KEYS = /^(color|tintColor|\w*TintColor|placeholderTextColor|\w*TextColor|textColor|iconColor|labelColor|arrowColor|selectionColor|stroke|fill|dotColor|selectedDotColor|indicatorColor|\w*IconColor|thumbColor|progressColor|activeColor|inactiveColor|titleColor|valueColor|amountColor|headerTint)$/;
const BG_KEYS = /^(backgroundColor|\w*Background\w*|bg|\w*Bg|colors|\w*BackgroundColor|overlayColor|fillColor|barColor|trackColor|surfaceColor|cardColor|selectedColor|rippleColor)$/i;
const BORDER_KEYS = /^(border\w*Color|underlineColorAndroid|outlineColor|dividerColor|lineColor|separatorColor)$/i;

const keyName = (node) => {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "JSXIdentifier") return node.name;
  return null;
};

const classifyName = (name) => {
  if (!name) return "any";
  if (SKIP_KEYS.test(name)) return "skip";
  if (BORDER_KEYS.test(name)) return "border";
  if (FG_KEYS.test(name)) return "fg";
  if (BG_KEYS.test(name)) return "bg";
  if (/border/i.test(name)) return "border";
  if (/bg|background|fill|surface|card|gradient/i.test(name)) return "bg";
  if (/text|color|fg|tint|icon|ink|label|title|stroke/i.test(name)) return "fg";
  return "any";
};

/** Walk up from a literal to the property / attribute / variable naming it. */
const contextOf = (p) => {
  let cur = p;
  for (let i = 0; i < 8 && cur; i++) {
    const parent = cur.parentPath;
    if (!parent) break;
    const n = parent.node;
    if (n.type === "ObjectProperty" && cur.key === "value") return classifyName(keyName(n.key));
    if (n.type === "JSXAttribute") return classifyName(keyName(n.name));
    if (n.type === "VariableDeclarator") return classifyName(keyName(n.id));
    if (n.type === "AssignmentExpression") {
      const l = n.left;
      return classifyName(l.type === "MemberExpression" ? keyName(l.property) : keyName(l));
    }
    if (n.type === "CallExpression") {
      // e.g. setColor("#fff") / someFn(..)
      const callee = n.callee;
      const nm = callee.type === "Identifier" ? callee.name : callee.type === "MemberExpression" ? keyName(callee.property) : null;
      return classifyName(nm && nm.replace(/^set/, ""));
    }
    if (n.type === "ReturnStatement") return "any";
    if (
      n.type === "ConditionalExpression" ||
      n.type === "LogicalExpression" ||
      n.type === "ArrayExpression" ||
      n.type === "JSXExpressionContainer" ||
      n.type === "TSAsExpression" ||
      n.type === "ParenthesizedExpression" ||
      n.type === "ArrowFunctionExpression"
    ) {
      cur = parent;
      continue;
    }
    break;
  }
  return "any";
};

const ROLE_INDEX = { fg: 0, bg: 1, border: 2, any: 3 };

// ── File transform ──────────────────────────────────────────────────
function transform(file) {
  const src = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parser.parse(src, { sourceType: "module", plugins: ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator"] });
  } catch (e) {
    console.error("PARSE FAIL", file, e.message);
    return null;
  }

  const edits = [];
  const unknown = new Set();
  let usesP = false;
  let usesThemed = false;
  let themeImportsCOLORS = false;
  let themeImportNode = null;
  let rnImportNode = null;
  let hasPulseTextImport = false;

  traverse(ast, {
    ImportDeclaration(p) {
      const s = p.node.source.value;
      if (/theme\/theme$/.test(s)) {
        themeImportNode = p.node;
        if (p.node.specifiers.some((sp) => sp.imported && sp.imported.name === "COLORS")) themeImportsCOLORS = true;
      }
      if (s === "react-native") rnImportNode = p.node;
      if (/components\/pulse(\/Text)?$/.test(s) || /\.\/Text$/.test(s) && file.includes("pulse")) hasPulseTextImport = true;
    },
  });

  traverse(ast, {
    StringLiteral(p) {
      // Ignore import sources, object keys, JSX text etc.
      if (p.parentPath.isImportDeclaration() || p.parentPath.isExportDeclaration()) return;
      if (p.parentPath.isObjectProperty() && p.key === "key") return;
      const h = norm(p.node.value);
      if (!h) return;
      const isNamed = h === "WHITE" || h === "BLACK";
      const fam = HEX_TO_FAMILY[h];
      const ctx = contextOf(p);
      if (ctx === "skip") return;
      if (isNamed && ctx === "any") return; // "white" as a plain word — leave
      if (!fam) {
        unknown.add(p.node.value);
        return;
      }
      const token = FAM[fam][ROLE_INDEX[ctx]];
      const expr = `P.${token}`;
      const inJsxAttr = p.parentPath.isJSXAttribute();
      edits.push({ start: p.node.start, end: p.node.end, text: inJsxAttr ? `{${expr}}` : expr });
      usesP = true;
    },
    MemberExpression(p) {
      if (!themeImportsCOLORS) return;
      const n = p.node;
      if (n.object.type !== "Identifier" || n.object.name !== "COLORS" || n.computed) return;
      const prop = n.property.name;
      const ctx = contextOf(p);
      let next = null;
      if (/^primary(Dark|Light)?$/.test(prop) && ctx === "bg") next = "primaryFill";
      else if (prop === "primaryDark" && ctx === "fg") next = "primary";
      else if (prop === "surface" && ctx === "fg") next = "textInverse";
      if (next && next !== prop) edits.push({ start: n.property.start, end: n.property.end, text: next });
    },
    CallExpression(p) {
      const c = p.node.callee;
      if (
        c.type === "MemberExpression" &&
        c.object.type === "Identifier" &&
        c.object.name === "StyleSheet" &&
        keyName(c.property) === "create"
      ) {
        // only module-level declarations
        const decl = p.parentPath;
        if (decl.isVariableDeclarator() && decl.parentPath.parentPath.isProgram()) {
          edits.push({ start: p.node.start, end: p.node.start, text: "themedStyles(() => " });
          edits.push({ start: p.node.end, end: p.node.end, text: ")" });
          usesThemed = true;
        }
      }
    },
  });

  // ── Imports ──
  const importEdits = [];
  const rel = (target) => {
    let r = path.relative(path.dirname(file), path.join(ROOT, target)).replace(/\\/g, "/");
    if (!r.startsWith(".")) r = "./" + r;
    return r;
  };

  let movedText = [];
  if (rnImportNode && !hasPulseTextImport) {
    const keep = [];
    for (const sp of rnImportNode.specifiers) {
      if (sp.type === "ImportSpecifier" && (sp.imported.name === "Text" || sp.imported.name === "TextInput")) {
        movedText.push(sp.imported.name === sp.local.name ? sp.local.name : `${sp.imported.name} as ${sp.local.name}`);
      } else keep.push(src.slice(sp.start, sp.end));
    }
    if (movedText.length) {
      const def = rnImportNode.specifiers.find((s) => s.type !== "ImportSpecifier");
      const named = keep.filter((k) => !def || k !== src.slice(def.start, def.end));
      let text;
      if (!def && named.length === 0) text = "";
      else {
        const parts = [];
        if (def) parts.push(src.slice(def.start, def.end));
        if (named.length) parts.push(`{\n  ${named.join(",\n  ")},\n}`);
        text = `import ${parts.join(", ")} from "react-native";`;
      }
      text += `\nimport { ${movedText.join(", ")} } from "${rel("src/components/pulse/Text")}";`;
      importEdits.push({ start: rnImportNode.start, end: rnImportNode.end, text });
    }
  }

  const needed = [];
  if (usesP) needed.push("P");
  if (usesThemed) needed.push("themedStyles");
  if (needed.length) {
    if (themeImportNode) {
      const have = new Set(themeImportNode.specifiers.map((s) => s.local.name));
      const add = needed.filter((n) => !have.has(n));
      if (add.length) {
        const last = themeImportNode.specifiers[themeImportNode.specifiers.length - 1];
        importEdits.push({ start: last.end, end: last.end, text: `, ${add.join(", ")}` });
      }
    } else {
      const anchor = rnImportNode || ast.program.body.find((n) => n.type === "ImportDeclaration");
      const line = `\nimport { ${needed.join(", ")} } from "${rel("src/theme/theme")}";`;
      // Append after the react-native import (or first import)
      const at = anchor ? anchor.end : 0;
      importEdits.push({ start: at, end: at, text: line, after: true });
    }
  }

  const all = [...edits, ...importEdits];
  if (!all.length) return { changed: false, unknown };

  // Apply from the end; for equal positions keep insertion order stable.
  all.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = src;
  // Merge edits that touch the rn import range with "after" inserts at same pos
  for (const e of all) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  if (!DRY) fs.writeFileSync(file, out);
  return { changed: true, colors: edits.filter((e) => e.text.includes("P.")).length, text: movedText.length, themed: usesThemed, unknown };
}

// ── Run ─────────────────────────────────────────────────────────────
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return p.endsWith(".js") ? [p] : [];
  });

const argFiles = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((f) => path.resolve(f));
const files = argFiles.length
  ? argFiles
  : [...walk(path.join(ROOT, "src/screens")), ...walk(path.join(ROOT, "src/components"))].filter(
      (f) => !f.includes(path.join("components", "pulse"))
    );

const unknownAll = {};
for (const f of files) {
  const r = transform(f);
  if (!r) continue;
  const rel = path.relative(ROOT, f);
  if (r.changed) console.log(`${DRY ? "[dry] " : ""}${rel}: colours=${r.colors} text=${r.text} themed=${r.themed}`);
  for (const u of r.unknown) unknownAll[u] = (unknownAll[u] || 0) + 1;
}
if (Object.keys(unknownAll).length) console.log("Unmapped colours:", unknownAll);
