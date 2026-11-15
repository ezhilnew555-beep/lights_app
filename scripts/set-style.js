/**
 * Set properties on named entries of a file's top-level `styles` sheet.
 *   const { setStyles } = require("./set-style");
 *   setStyles("src/x.js", { addButton: { backgroundColor: "P.acc" } });
 * Values are inserted as source text. Existing keys are replaced, new ones appended.
 */
const fs = require("fs");

const setStyles = (file, changes) => {
  let s = fs.readFileSync(file, "utf8");
  const start = s.indexOf("const styles = ");
  if (start < 0) throw new Error(`${file}: no styles sheet`);
  for (const [name, props] of Object.entries(changes)) {
    const re = new RegExp(`(\\n\\s*${name}: \\{)([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)(\\})`, "g");
    re.lastIndex = start;
    const m = re.exec(s);
    if (!m || m.index < start) {
      console.warn(`${file}: style "${name}" not found`);
      continue;
    }
    let body = m[2];
    for (const [k, v] of Object.entries(props)) {
      const kre = new RegExp(`(\\n?[ \\t]*)${k}:\\s*[^,\\n]+(,?)`);
      if (v === null) body = body.replace(kre, "");
      else if (kre.test(body)) body = body.replace(kre, `$1${k}: ${v}$2`);
      else body = body.replace(/\s*$/, "") + `${/[,{]\s*$/.test(body) || !body.trim() ? "" : ","} ${k}: ${v},\n  `;
    }
    s = s.slice(0, m.index) + m[1] + body + m[3] + s.slice(m.index + m[0].length);
  }
  fs.writeFileSync(file, s);
};

module.exports = { setStyles };
