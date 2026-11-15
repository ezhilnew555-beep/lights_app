/**
 * Print or replace the JSX element that starts on a given line.
 *   node scripts/jsx-block.js <file> <line>                 → print element source
 *   node scripts/jsx-block.js <file> <line> <replacementFile> → replace it
 * Used during the Pulse migration to swap legacy header blocks precisely.
 */
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const [file, lineArg, replFile] = process.argv.slice(2);
const line = parseInt(lineArg, 10);
const src = fs.readFileSync(file, "utf8");
const ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"] });

let found = null;
traverse(ast, {
  JSXElement(p) {
    if (!found && p.node.loc.start.line === line) {
      found = p.node;
      p.stop();
    }
  },
});
if (!found) {
  console.error("No JSX element starts on line", line);
  process.exit(1);
}
if (!replFile) {
  console.log(src.slice(found.start, found.end));
} else {
  const repl = fs.readFileSync(replFile, "utf8").replace(/\s+$/, "");
  fs.writeFileSync(file, src.slice(0, found.start) + repl + src.slice(found.end));
  console.log(`replaced ${file}:${line} (${found.end - found.start} chars)`);
}
