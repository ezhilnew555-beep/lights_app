/**
 * Reports identifiers used in a file that are never declared or imported.
 *   node scripts/check-undefined.js [files...]   (default: App.js + src/)
 * A lightweight guard for large refactors (no ESLint config in this repo).
 */
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const GLOBALS = new Set(
  (
    "undefined NaN Infinity Object Array String Number Boolean Math Date JSON Promise Symbol Map Set WeakMap WeakSet " +
    "Error TypeError RangeError SyntaxError RegExp parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent " +
    "encodeURI decodeURI console setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame " +
    "fetch global globalThis window navigator process require module exports __DEV__ Intl Proxy Reflect Buffer URL " +
    "URLSearchParams FormData Blob FileReader atob btoa alert performance queueMicrotask AbortController Headers Response " +
    "Request structuredClone arguments BigInt Uint8Array ArrayBuffer TextEncoder TextDecoder XMLHttpRequest WebSocket " +
    "setImmediate clearImmediate document localStorage"
  ).split(/\s+/)
);

const ROOT = path.resolve(__dirname, "..");
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => {
    const p = path.join(d, x.name);
    return x.isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : [];
  });

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [path.join(ROOT, "App.js"), ...walk(path.join(ROOT, "src")).filter((f) => !f.includes(path.join("src", "data")))];

let problems = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  let ast;
  try {
    ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"] });
  } catch (e) {
    console.log(`${path.relative(ROOT, f)}: PARSE ERROR ${e.message}`);
    problems++;
    continue;
  }
  const missing = new Map();
  traverse(ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (p.node.type === "JSXIdentifier") {
        if (!/^[A-Z]/.test(name)) return; // intrinsic tag
        if (p.parentPath.isJSXMemberExpression() && p.parentPath.node.property === p.node) return;
      }
      if (GLOBALS.has(name)) return;
      if (p.scope.hasBinding(name, true)) return;
      if (!missing.has(name)) missing.set(name, p.node.loc.start.line);
    },
  });
  if (missing.size) {
    problems += missing.size;
    console.log(
      `${path.relative(ROOT, f)}: ` + [...missing].map(([n, l]) => `${n}@${l}`).join(", ")
    );
  }
}
console.log(problems ? `\n${problems} undefined reference(s)` : "No undefined references.");
process.exit(problems ? 1 : 0);
