/**
 * For buttons whose style sheet entry is filled with the lime accent (P.acc),
 * make every label/icon drawn inside them use the on-accent ink (P.accInk).
 *   node scripts/fix-on-accent.js <file> <styleName> [<styleName>...]
 */
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { setStyles } = require("./set-style");

const [file, ...names] = process.argv.slice(2);
const src = fs.readFileSync(file, "utf8");
const ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"] });

// Does this AST subtree reference styles.<one of set>?
const refersTo = (node, set) => {
  if (!node || typeof node !== "object") return false;
  if (
    node.type === "MemberExpression" &&
    node.object &&
    node.object.name === "styles" &&
    node.property &&
    set.has(node.property.name)
  )
    return true;
  return Object.keys(node).some((k) => {
    if (k === "loc" || k === "start" || k === "end") return false;
    const v = node[k];
    return Array.isArray(v) ? v.some((x) => refersTo(x, set)) : v && typeof v === "object" && refersTo(v, set);
  });
};

const textStyles = new Set();
const colorEdits = [];
const targets = new Set(names);

traverse(ast, {
  JSXElement(p) {
    const style = p.node.openingElement.attributes.find((a) => a.name && a.name.name === "style");
    if (!style || !refersTo(style.value, targets)) return;
    p.traverse({
      JSXOpeningElement(q) {
        for (const a of q.node.attributes) {
          if (!a.name) continue;
          if (a.name.name === "style" && a.value) {
            q.traverse({
              MemberExpression(r) {
                if (r.node.object.name === "styles" && !targets.has(r.node.property.name))
                  textStyles.add(r.node.property.name);
              },
            });
          }
          if (a.name.name === "color" && a.value && a.value.type === "JSXExpressionContainer") {
            const e = a.value.expression;
            if (e.type === "MemberExpression" && ["onSolid", "textInverse", "surf"].includes(e.property.name))
              colorEdits.push({ start: e.start, end: e.end });
          }
        }
      },
    });
  },
});

let out = src;
colorEdits.sort((a, b) => b.start - a.start).forEach((e) => (out = out.slice(0, e.start) + "P.accInk" + out.slice(e.end)));
fs.writeFileSync(file, out);
const ch = {};
textStyles.forEach((n) => (ch[n] = { color: "P.accInk" }));
if (textStyles.size) setStyles(file, ch);
console.log(`${file}: text styles [${[...textStyles].join(", ")}], icon colours ${colorEdits.length}`);
