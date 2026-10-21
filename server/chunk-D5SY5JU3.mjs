import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  placeholderById,
  restoreEdits,
  surrogateStillStanding
} from "./chunk-D6LIFNUY.mjs";
import {
  decodeXmlBytes,
  neutraliseContactLinks,
  normalizeXmlUtf8,
  scrubContainerMetadata,
  stripUninspectableParts,
  sweepMetadataParts
} from "./chunk-L4LMT7VQ.mjs";
import "./chunk-WORWWASC.mjs";
import {
  require_lib
} from "./chunk-7Y33PHUE.mjs";
import "./chunk-75WGJ5MR.mjs";
import {
  dropLoneLocality,
  hasStrongSubjectColumn,
  headerNameRole,
  inferIdColumns,
  isRecordRefHeader,
  rowHoldsValues,
  spanMapKey,
  tableCellSpans,
  tableHeaderCategory,
  tableHeaderGuard
} from "./chunk-ZBWYCETV.mjs";
import "./chunk-XGOKF7XS.mjs";
import "./chunk-ENPGGBFS.mjs";
import {
  PLACEHOLDER_REGEX
} from "./chunk-QFNUQB57.mjs";
import {
  __toESM
} from "./chunk-OGQYD6DW.mjs";

// ../extension/core/office.js
var import_jszip = __toESM(require_lib(), 1);
function getParser() {
  return new DOMParser();
}
function getSerializer() {
  return new XMLSerializer();
}
var FAMILIES = {
  xlsx: {
    // T37b/F33: externalLinks was not read at all. It caches the OTHER workbook's sheet names and
    // cell values — a copy of that file's content, sitting in this one.
    parts: /^xl\/(workbook\.xml|sharedStrings\.xml|worksheets\/sheet[^/]*\.xml|comments[^/]*\.xml|comments\/[^/]+\.xml|threadedComments\/[^/]+\.xml|persons\/[^/]+\.xml|externalLinks\/[^/]+\.xml|drawings\/[^/]+\.xml|charts\/[^/]+\.xml)$/,
    // oddHeader/oddFooter & friends are the PAGE header and footer of a worksheet — printed on
    // every sheet of paper ("Akte Mueller", the case worker's name) and invisible on screen
    // unless you open the page setup. definedName holds the value of a named range.
    // `author` is the name on a cell comment: the comment TEXT was rewritten and the name under
    // it was not. `pt` is a chart's cached point — what the legend and the axis actually render.
    blocks: /* @__PURE__ */ new Set([
      "si",
      "is",
      "comment",
      "text",
      "oddHeader",
      "evenHeader",
      "firstHeader",
      "oddFooter",
      "evenFooter",
      "firstFooter",
      "definedName",
      "author",
      "pt",
      "sheetName"
    ]),
    leaf: /* @__PURE__ */ new Set(["t"])
  },
  pptx: {
    parts: /^ppt\/(slides|notesSlides|notesMasters|slideLayouts|slideMasters|charts|diagrams|comments)\/[^/]+\.xml$/,
    // `pt` — a chart's cached series label or category. The chart RENDERS this copy; it is not a
    // reference to the cell, so leaving it alone ships the name on the slide.
    blocks: /* @__PURE__ */ new Set(["p", "pt"]),
    leaf: /* @__PURE__ */ new Set(["t"])
  },
  // An EPUB is a ZIP of XHTML, so it is the same engine with different element names. It was
  // refused as an opaque binary purely because nothing had told this table about it.
  epub: {
    parts: /\.(xhtml|html?)$/i,
    blocks: /* @__PURE__ */ new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "dd", "dt", "blockquote", "figcaption", "caption"]),
    leaf: /* @__PURE__ */ new Set(["span", "a", "em", "strong", "i", "b", "title"])
  },
  odf: {
    parts: /^(content|styles)\.xml$/,
    blocks: /* @__PURE__ */ new Set(["p", "h", "title", "subject", "description"]),
    leaf: /* @__PURE__ */ new Set(["p", "h", "span", "a"])
  }
};
var OFFICE_KINDS = new Set(Object.keys(FAMILIES));
function isOfficeRewritePart(name, kind) {
  return Boolean(FAMILIES[kind]?.parts.test(name));
}
function officeRewriteCoverage(name, kind, doc) {
  const covered = /* @__PURE__ */ new WeakSet();
  const family = FAMILIES[kind];
  if (!family || !isOfficeRewritePart(name, kind) || !doc?.documentElement) return covered;
  if (kind === "xlsx" && /^xl\/worksheets\/sheet[^/]*\.xml$/.test(name)) {
    for (const { fNode } of formulaLiteralTargets(doc)) covered.add(fNode);
  }
  for (const block of collectBlocks(doc.documentElement, family)) for (const node of block.nodes) covered.add(node);
  return covered;
}
var isElement = (n) => n.nodeType === 1;
var isText = (n) => n.nodeType === 3;
var nodeText = (n) => (n.data != null ? n.data : n.nodeValue) || "";
function setNodeText(node, value) {
  try {
    node.data = value;
  } catch (_) {
    node.nodeValue = value;
  }
  if (nodeText(node) !== value) node.nodeValue = value;
}
function textNodesIn(el, out = []) {
  for (const child of Array.from(el.childNodes)) {
    if (isText(child)) out.push(child);
    else if (isElement(child)) textNodesIn(child, out);
  }
  return out;
}
var SHEET_NAME_FORBIDDEN = /[:\\/?*[\]]/;
function isValidSheetName(name) {
  return !!name && name.length <= 31 && !SHEET_NAME_FORBIDDEN.test(name) && !name.startsWith("'") && !name.endsWith("'") && name.toLowerCase() !== "history";
}
function attributeNode(el, attr) {
  return {
    parentNode: null,
    get data() {
      return el.getAttribute(attr) || "";
    },
    set data(value) {
      el.setAttribute(attr, value);
    }
  };
}
var MAX_FORMULA_LITERAL = 255;
function formulaLiteralRanges(f) {
  const out = [];
  let i = 0;
  while (i < f.length) {
    if (f[i] !== '"') {
      i++;
      continue;
    }
    let j = i + 1, content = "";
    for (; ; ) {
      if (j >= f.length) return out;
      if (f[j] === '"') {
        if (f[j + 1] === '"') {
          content += '"';
          j += 2;
          continue;
        }
        break;
      }
      content += f[j++];
    }
    out.push({ start: i + 1, end: j, content });
    i = j + 1;
  }
  return out;
}
function formulaLiteralNode(textNode, index) {
  return {
    parentNode: null,
    get data() {
      return formulaLiteralRanges(nodeText(textNode))[index]?.content ?? "";
    },
    set data(value) {
      const f = nodeText(textNode);
      const r = formulaLiteralRanges(f)[index];
      if (!r || value.length > MAX_FORMULA_LITERAL) return;
      setNodeText(textNode, f.slice(0, r.start) + value.replace(/"/g, '""') + f.slice(r.end));
    }
  };
}
function formulaLiteralTargets(doc) {
  const out = [];
  for (const f of Array.from(doc.getElementsByTagName("*"))) {
    if (f.localName !== "f") continue;
    for (const fNode of Array.from(f.childNodes).filter((n) => n.nodeType === 3 || n.nodeType === 4)) {
      const nodes = [];
      formulaLiteralRanges(nodeText(fNode)).forEach((r, i) => {
        if (r.content.trim().length >= 3 && /[\p{L}\d]/u.test(r.content)) nodes.push(formulaLiteralNode(fNode, i));
      });
      if (nodes.length) out.push({ fNode, nodes });
    }
  }
  return out;
}
function formulaLiteralBlocks(doc) {
  return formulaLiteralTargets(doc).flatMap(({ nodes }) => nodes.map((n) => ({ nodes: [n] })));
}
var ATTRIBUTE_CARRIERS = {
  // T37b/F33: an external link caches the LINKED workbook's sheet names in an attribute, and a
  // threaded comment stores its author's display name in xl/persons. Formulas reference an
  // external sheet by its INDEX ([1]!A1), so rewriting the cached label breaks no reference.
  xlsx: [["sheetName", "val"], ["person", "displayName"]],
  // A picture's alternative text. Every deck author who describes an image for accessibility
  // fills this in, and PowerPoint's own "write a description for me" puts the names it recognises
  // in the picture straight into it. Invisible on the slide.
  pptx: [["cNvPr", "descr"], ["cNvPr", "title"], ["docPr", "descr"], ["docPr", "title"]],
  // A hyperlink's TARGET. "mailto:petra.schneider@example.org" carries the address even when the
  // visible link text is "hier schreiben". Replacing the address inside the URL breaks nothing:
  // the link simply points at a placeholder, exactly as the body text does.
  odf: [["a", "xlink:href"]],
  epub: [["a", "href"], ["img", "alt"]]
};
function attributeCarrierBlocks(doc, kind) {
  const spec = ATTRIBUTE_CARRIERS[kind];
  if (!spec) return [];
  const out = [];
  for (const [localName, attr] of spec) {
    for (const el of Array.from(doc.getElementsByTagName("*"))) {
      if (el.localName !== localName) continue;
      const value = el.getAttribute(attr);
      if (!value || !value.trim()) continue;
      out.push({ nodes: [attributeNode(el, attr)] });
    }
  }
  return out;
}
function sheetNameBlocks(doc) {
  const out = [];
  const sheets = doc.getElementsByTagName ? Array.from(doc.getElementsByTagName("*")) : [];
  for (const el of sheets) {
    if (el.localName !== "sheet") continue;
    const name = el.getAttribute("name");
    if (!name) continue;
    out.push({ nodes: [attributeNode(el, "name")], sheetName: name });
  }
  return out;
}
function renameReferences(xml, renames) {
  let next = xml;
  for (const { from, to } of renames) {
    if (from === to) continue;
    next = next.split(from).join(to);
    const escaped = from.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (escaped !== from) next = next.split(escaped).join(to);
  }
  return next;
}
function collectSheetRenames(parts) {
  const blocks = [];
  for (const part of parts) for (const block of part.blocks) if (block.sheetName) blocks.push(block);
  if (!blocks.length) return [];
  const taken = /* @__PURE__ */ new Set();
  for (const block of blocks) {
    const current = blockText(block);
    if (current === block.sheetName) taken.add(current);
  }
  const renames = [];
  for (const block of blocks) {
    const from = block.sheetName;
    const to = blockText(block);
    if (to === from) continue;
    if (!isValidSheetName(to) || taken.has(to)) {
      setNodeText(block.nodes[0], from);
      taken.add(from);
      console.warn("[ainonymize] a sheet tab could not be renamed without breaking the workbook");
      continue;
    }
    taken.add(to);
    renames.push({ from, to });
  }
  return renames.sort((a, b) => b.from.length - a.from.length);
}
function collectBlocks(root, family) {
  const blocks = [];
  const walk = (el, inBlock) => {
    for (const child of Array.from(el.childNodes)) {
      if (!isElement(child)) continue;
      const name = child.localName;
      if (!inBlock && family.blocks.has(name)) {
        const nodes = textNodesIn(child);
        if (nodes.length) blocks.push({ nodes });
        continue;
      }
      if (!inBlock && family.leaf.has(name)) {
        const nodes = textNodesIn(child);
        if (nodes.length) blocks.push({ nodes });
        continue;
      }
      walk(child, inBlock);
    }
  };
  walk(root, false);
  return blocks;
}
var blockText = (block) => block.nodes.map(nodeText).join("");
function applyToBlock(block, edits) {
  for (const [start, end, repl] of [...edits].sort((a, b) => b[0] - a[0])) {
    let pos = 0, placed = false;
    for (const node of block.nodes) {
      const text = nodeText(node);
      const nStart = pos, nEnd = pos + text.length;
      pos = nEnd;
      if (nEnd <= start || nStart >= end) continue;
      const segStart = Math.max(start, nStart) - nStart;
      const segEnd = Math.min(end, nEnd) - nStart;
      const before = text.slice(0, segStart), after = text.slice(segEnd);
      setNodeText(node, placed ? before + after : before + repl + after);
      placed = true;
    }
  }
}
function preserveSpace(block) {
  for (const node of block.nodes) {
    const owner = node.parentNode;
    if (owner && owner.nodeType === 1 && typeof owner.setAttribute === "function") {
      try {
        owner.setAttribute("xml:space", "preserve");
      } catch (_) {
      }
    }
  }
}
function dropCachedStringResults(doc) {
  let dropped = 0;
  for (const cell of Array.from(doc.getElementsByTagName("*"))) {
    if (cell.localName !== "c" || cell.getAttribute("t") !== "str") continue;
    const children = Array.from(cell.childNodes);
    if (!children.some((n) => n.nodeType === 1 && n.localName === "f")) continue;
    for (const node of children) {
      if (node.nodeType === 1 && node.localName === "v") {
        cell.removeChild(node);
        dropped++;
      }
    }
  }
  return dropped;
}
function cachedValueBlocks(doc) {
  const out = [];
  for (const el of Array.from(doc.getElementsByTagName("*"))) {
    if (el.localName !== "v") continue;
    const nodes = textNodesIn(el);
    if (nodes.length) out.push({ nodes });
  }
  return out;
}
var BUILTIN_DATE_FORMATS = /* @__PURE__ */ new Set([14, 15, 16, 17, 22, 27, 28, 29, 30, 31, 34, 35, 36, 50, 51, 52, 53, 54, 57, 58]);
var DAY_MS = 864e5;
function serialToParts(serial, date1904) {
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const d = new Date(base + Math.round(serial) * DAY_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
function partsToSerial(y, m, d, date1904) {
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return Math.round((Date.UTC(y, m - 1, d) - base) / DAY_MS);
}
var pad2 = (n) => String(n).padStart(2, "0");
function parseDateText(text) {
  const t = String(text).trim();
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (m) return { y: +m[3], m: +m[2], d: +m[1] };
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) return { y: +m[3], m: +m[2], d: +m[1] };
  return null;
}
async function xlsxNumberContext(zip) {
  const dateStyles = /* @__PURE__ */ new Set();
  try {
    const xml = await zip.file("xl/styles.xml")?.async("string");
    if (xml) {
      const doc = getParser().parseFromString(xml, "application/xml");
      const custom = /* @__PURE__ */ new Map();
      for (const f of Array.from(doc.getElementsByTagName("*")).filter((e) => e.localName === "numFmt")) {
        custom.set(Number(f.getAttribute("numFmtId")), f.getAttribute("formatCode") || "");
      }
      const isDateCode = (code) => {
        const bare = code.replace(/"[^"]*"|\[[^\]]*\]|\\./g, "");
        return /[dy]/i.test(bare) && !/[#0?]/.test(bare);
      };
      const xfsParent = Array.from(doc.getElementsByTagName("*")).find((e) => e.localName === "cellXfs");
      const xfs = xfsParent ? Array.from(xfsParent.childNodes).filter((e) => isElement(e) && e.localName === "xf") : [];
      xfs.forEach((xf, i) => {
        const id = Number(xf.getAttribute("numFmtId") || 0);
        if (BUILTIN_DATE_FORMATS.has(id) || custom.has(id) && isDateCode(custom.get(id))) dateStyles.add(i);
      });
    }
  } catch (e) {
  }
  let date1904 = false;
  try {
    const wb = await zip.file("xl/workbook.xml")?.async("string");
    date1904 = !!wb && /<(?:\w+:)?workbookPr\b[^>]*\bdate1904="(?:1|true)"/.test(wb);
  } catch (e) {
  }
  return { dateStyles, date1904 };
}
var childEls = (el, name) => Array.from(el.childNodes).filter((n) => isElement(n) && n.localName === name);
var cellColumn = (ref, seq) => {
  const m = /^([A-Z]+)/.exec(ref || "");
  if (!m) return seq;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
function numericCellBlocks(doc, sharedSi, ctx) {
  const out = [];
  const textOfCell = (c) => {
    const t = c.getAttribute("t");
    if (t === "s") {
      const v = childEls(c, "v")[0];
      const idx = v ? parseInt(v.textContent, 10) : NaN;
      return Number.isInteger(idx) && sharedSi[idx] ? textNodesIn(sharedSi[idx]).map(nodeText).join("") : null;
    }
    if (t === "inlineStr") {
      const is = childEls(c, "is")[0];
      return is ? textNodesIn(is).map(nodeText).join("") : null;
    }
    return null;
  };
  let colCats = null;
  let colGuards = /* @__PURE__ */ new Map();
  const allRows = Array.from(doc.getElementsByTagName("*")).filter((e) => e.localName === "row");
  const sampleText = (c) => {
    const t = textOfCell(c);
    if (t) return t;
    const ct = c.getAttribute("t");
    if (ct && ct !== "n" || childEls(c, "f").length) return "";
    const v = childEls(c, "v")[0];
    const raw = v ? v.textContent.trim() : "";
    return /^-?\d+(?:\.0+)?$/.test(raw) ? raw.replace(/\.0+$/, "") : "";
  };
  const rowCells = (row) => {
    const cs = [];
    let sq = 0;
    for (const c of childEls(row, "c")) {
      const ci = cellColumn(c.getAttribute("r"), sq);
      sq = ci + 1;
      cs.push({ c, ci });
    }
    return cs;
  };
  for (let rowIdx = 0; rowIdx < allRows.length; rowIdx++) {
    const row = allRows[rowIdx];
    const cells = [];
    let seq = 0;
    for (const c of childEls(row, "c")) {
      const ci = cellColumn(c.getAttribute("r"), seq);
      seq = ci + 1;
      cells.push({ c, ci });
    }
    const texts = cells.map(({ c }) => textOfCell(c));
    const mapped = texts.map((t) => t ? tableHeaderCategory(t) : null);
    const softRefs = hasStrongSubjectColumn(mapped, texts) ? texts.filter((t, i) => t && !mapped[i] && isRecordRefHeader(t)).length : 0;
    let headerRow = null;
    if (mapped.filter(Boolean).length + softRefs >= 2) {
      let kept = dropLoneLocality(texts, mapped);
      const sample = allRows.slice(rowIdx + 1, rowIdx + 81).map(rowCells);
      const keptBefore = kept;
      kept = inferIdColumns(texts, kept, cells.map((x) => sample.map((r) => {
        const f = r.find((y) => y.ci === x.ci);
        return f ? sampleText(f.c) : "";
      })));
      if (mapped.filter(Boolean).length >= 2 || kept.some((c, i) => c && !keptBefore[i])) headerRow = { kept, keptBefore };
    }
    if (headerRow) {
      const { kept, keptBefore } = headerRow;
      colCats = /* @__PURE__ */ new Map();
      colGuards = /* @__PURE__ */ new Map();
      cells.forEach((x, i) => {
        if (kept[i]) colCats.set(x.ci, kept[i]);
        const g = texts[i] ? tableHeaderGuard(texts[i]) : null;
        if (kept[i] && !keptBefore[i]) colGuards.set(x.ci, "inferred");
        else if (g) colGuards.set(x.ci, g);
      });
      continue;
    }
    for (let k = 0; k < cells.length; k++) {
      const { c, ci } = cells[k];
      let category = colCats ? colCats.get(ci) : void 0;
      let guard = colGuards.get(ci);
      if (!category && k > 0 && texts[k - 1]) {
        category = tableHeaderCategory(texts[k - 1]) || void 0;
        guard = category ? tableHeaderGuard(texts[k - 1]) : void 0;
      }
      if (!category) continue;
      const t = c.getAttribute("t");
      if (t && t !== "n") continue;
      if (childEls(c, "f").length) continue;
      const v = childEls(c, "v")[0];
      const raw = v ? v.textContent.trim() : "";
      if (!/^-?\d+(?:\.\d+)?$/.test(raw)) continue;
      if (guard === "ref" && !/^\d{8,}$/.test(raw.replace(/\.0+$/, ""))) continue;
      const isDate = ctx.dateStyles.has(Number(c.getAttribute("s") || 0));
      let text = raw;
      if (isDate) {
        const p = serialToParts(Number(raw), ctx.date1904);
        text = `${pad2(p.d)}.${pad2(p.m)}.${p.y}`;
      } else if (/^\d+\.0+$/.test(raw)) text = raw.replace(/\.0+$/, "");
      const node = { nodeType: 3, data: text, numericOriginal: text };
      out.push({ nodes: [node], numeric: { cell: c, isDate, date1904: ctx.date1904, category } });
    }
  }
  return out;
}
function numericEchoBlocks(parts, numberCtx) {
  const known = /* @__PURE__ */ new Map();
  const handled = /* @__PURE__ */ new Set();
  for (const part of parts) for (const b of part.blocks) {
    if (!b.numeric || b.numeric.isDate) continue;
    handled.add(b.numeric.cell);
    const t = b.nodes[0] && b.nodes[0].numericOriginal;
    if (t && /^\d{5,}$/.test(t) && ["CUSTOMER_ID", "REG_ID", "ID_CARD", "HEALTH_INSURANCE", "TAX_ID", "SV_ID"].includes(b.numeric.category) && !known.has(t)) known.set(t, b.numeric.category);
  }
  if (!known.size) return;
  for (const part of parts) {
    if (!/^xl\/worksheets\/sheet[^/]*\.xml$/.test(part.name)) continue;
    const extra = [];
    for (const c of Array.from(part.doc.getElementsByTagName("*")).filter((e) => e.localName === "c")) {
      if (handled.has(c)) continue;
      const t = c.getAttribute("t");
      if (t && t !== "n") continue;
      if (childEls(c, "f").length) continue;
      if (numberCtx.dateStyles.has(Number(c.getAttribute("s") || 0))) continue;
      const v = childEls(c, "v")[0];
      const raw = v ? v.textContent.trim().replace(/\.0+$/, "") : "";
      const category = known.get(raw);
      if (!category) continue;
      const node = { nodeType: 3, data: raw, numericOriginal: raw };
      extra.push({ nodes: [node], numeric: { cell: c, isDate: false, date1904: numberCtx.date1904, category } });
    }
    part.blocks.push(...extra);
  }
}
function commitNumericBlocks(parts) {
  for (const part of parts) {
    for (const block of part.blocks) {
      if (!block.numeric) continue;
      const node = block.nodes[0];
      const text = String(node.data ?? "").trim();
      if (text === node.numericOriginal) continue;
      const { cell, isDate, date1904 } = block.numeric;
      const doc = cell.ownerDocument;
      const ns = cell.namespaceURI;
      let v = childEls(cell, "v")[0];
      let numeric = null;
      if (isDate) {
        const p = parseDateText(text);
        if (p) numeric = String(partsToSerial(p.y, p.m, p.d, date1904));
      } else if (/^-?\d+(?:\.\d+)?$/.test(text)) numeric = text;
      if (numeric !== null && v) {
        setNodeText(v.firstChild || v.appendChild(doc.createTextNode("")), numeric);
        continue;
      }
      if (v) cell.removeChild(v);
      cell.setAttribute("t", "inlineStr");
      const is = doc.createElementNS(ns, "is");
      const tEl = doc.createElementNS(ns, "t");
      tEl.setAttribute("xml:space", "preserve");
      tEl.appendChild(doc.createTextNode(text));
      is.appendChild(tEl);
      cell.appendChild(is);
    }
  }
}
async function loadParts(bytes, kind) {
  const family = FAMILIES[kind];
  if (!family) throw new Error("unsupported_office_kind");
  const zip = await import_jszip.default.loadAsync(bytes);
  const names = Object.keys(zip.files).filter((n) => family.parts.test(n)).sort();
  const parts = [];
  const numberCtx = kind === "xlsx" ? await xlsxNumberContext(zip) : null;
  let sharedSi = [];
  for (const name of names) {
    const xml = decodeXmlBytes(await zip.file(name).async("uint8array"));
    const doc = getParser().parseFromString(xml, "application/xml");
    if (!doc || !doc.documentElement || doc.documentElement.localName === "parsererror") continue;
    if (kind === "xlsx" && /^xl\/worksheets\/sheet[^/]*\.xml$/.test(name)) dropCachedStringResults(doc);
    const blocks = collectBlocks(doc.documentElement, family);
    if (kind === "xlsx" && name === "xl/sharedStrings.xml") {
      sharedSi = Array.from(doc.getElementsByTagName("*")).filter((e) => e.localName === "si");
    }
    if (kind === "xlsx" && /^xl\/worksheets\/sheet[^/]*\.xml$/.test(name)) blocks.push(...formulaLiteralBlocks(doc));
    if (numberCtx && /^xl\/worksheets\/sheet[^/]*\.xml$/.test(name)) blocks.push(...numericCellBlocks(doc, sharedSi, numberCtx));
    if (kind === "xlsx" && /^xl\/externalLinks\//.test(name)) blocks.push(...cachedValueBlocks(doc));
    if (kind === "xlsx" && name === "xl/workbook.xml") blocks.push(...sheetNameBlocks(doc));
    blocks.push(...attributeCarrierBlocks(doc, kind));
    parts.push({ name, doc, blocks });
  }
  if (numberCtx) numericEchoBlocks(parts, numberCtx);
  return { zip, parts, family };
}
function flatten(parts) {
  const blocks = [];
  const pieces = [];
  let pos = 0;
  for (const part of parts) {
    for (const block of part.blocks) {
      const text = blockText(block);
      blocks.push({ block, start: pos, text });
      pieces.push(text);
      pos += text.length + 1;
    }
  }
  return { flatText: pieces.join("\n"), blocks };
}
async function writeParts(zip, parts, renames = []) {
  const serializer = getSerializer();
  const xmlByName = /* @__PURE__ */ new Map();
  for (const part of parts) xmlByName.set(part.name, serializer.serializeToString(part.doc));
  if (renames.length) {
    for (const name of Object.keys(zip.files)) {
      if (zip.files[name].dir || !/^xl\/.*\.xml$/.test(name) || xmlByName.has(name)) continue;
      try {
        xmlByName.set(name, await zip.file(name).async("string"));
      } catch (e) {
      }
    }
    for (const [name, xml] of [...xmlByName]) xmlByName.set(name, renameReferences(xml, renames));
  }
  for (const [name, xml] of xmlByName) zip.file(name, normalizeXmlUtf8(xml));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
async function extractOfficeText(bytes, kind) {
  const { parts } = await loadParts(bytes, kind);
  return flatten(parts).flatText;
}
var colIndex = (ref) => {
  const m = /^([A-Z]+)/.exec(ref || "");
  if (!m) return -1;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
var childrenNamed = (el, name) => Array.from(el.childNodes).filter((n) => isElement(n) && n.localName === name);
async function handledNumericCells(bytes, kind) {
  const out = /* @__PURE__ */ new Set();
  if (kind !== "xlsx") return out;
  const { parts } = await loadParts(bytes, kind);
  for (const part of parts) {
    for (const b of part.blocks) {
      const ref = b.numeric && b.numeric.cell && b.numeric.cell.getAttribute("r");
      if (ref) out.add(`${part.name}!${ref}`);
    }
  }
  return out;
}
async function extractOfficeTableHints(bytes, kind) {
  if (kind !== "xlsx") return [];
  const { parts } = await loadParts(bytes, kind);
  const { blocks } = flatten(parts);
  const byNode = /* @__PURE__ */ new Map();
  for (const b of blocks) if (b.block.nodes.length) byNode.set(b.block.nodes[0], b);
  const blockOf = (el) => {
    if (!el) return null;
    const nodes = textNodesIn(el);
    return nodes.length ? byNode.get(nodes[0]) || null : null;
  };
  const sst = parts.find((p) => p.name === "xl/sharedStrings.xml");
  const shared = sst ? Array.from(sst.doc.getElementsByTagName("*")).filter((e) => e.localName === "si") : [];
  const hints = [];
  for (const part of parts) {
    if (!/^xl\/worksheets\/sheet[^/]*\.xml$/.test(part.name)) continue;
    const rows = Array.from(part.doc.getElementsByTagName("*")).filter((e) => e.localName === "row");
    let colCats = null;
    let colRoles = /* @__PURE__ */ new Map();
    let colGuards = /* @__PURE__ */ new Map();
    const gridRows = rows.map((row) => {
      const cells = [];
      let seq = 0;
      for (const c of childrenNamed(row, "c")) {
        const ci = c.getAttribute("r") ? colIndex(c.getAttribute("r")) : seq;
        seq = ci + 1;
        const t = c.getAttribute("t");
        let flat = null;
        if (t === "s") {
          const v = childrenNamed(c, "v")[0];
          const idx = v ? parseInt(v.textContent, 10) : NaN;
          if (Number.isInteger(idx) && shared[idx]) flat = blockOf(shared[idx]);
        } else if (t === "inlineStr") {
          flat = blockOf(childrenNamed(c, "is")[0]);
        }
        let num = "";
        if (!flat && (!t || t === "n") && !childrenNamed(c, "f").length) {
          const nv = childrenNamed(c, "v")[0];
          const raw = nv ? nv.textContent.trim() : "";
          if (/^-?\d+(?:\.0+)?$/.test(raw)) num = raw.replace(/\.0+$/, "");
        }
        cells.push({ ci, flat, num });
      }
      return cells;
    });
    for (let ri = 0; ri < gridRows.length; ri++) {
      const cells = gridRows[ri];
      if (!cells.length) continue;
      const mapped = cells.map((x) => x.flat ? tableHeaderCategory(x.flat.text) : null);
      const hTexts = cells.map((x) => x.flat ? x.flat.text : null);
      const softRefs = hasStrongSubjectColumn(mapped, hTexts) ? hTexts.filter((t, i) => t && !mapped[i] && isRecordRefHeader(t)).length : 0;
      let headerRow = null;
      if (mapped.filter(Boolean).length + softRefs >= 2 && !rowHoldsValues(hTexts)) {
        let kept = dropLoneLocality(cells.map((x) => x.flat ? x.flat.text : null), mapped);
        const sampleRows = gridRows.slice(ri + 1, ri + 81);
        const keptBefore = kept;
        kept = inferIdColumns(
          cells.map((x) => x.flat ? x.flat.text : null),
          kept,
          cells.map((x) => sampleRows.map((r) => {
            const f = r.find((y) => y.ci === x.ci);
            return f ? f.flat ? f.flat.text : f.num : "";
          }))
        );
        if (mapped.filter(Boolean).length >= 2 || kept.some((c, i) => c && !keptBefore[i])) headerRow = { kept, keptBefore };
      }
      if (headerRow) {
        const { kept, keptBefore } = headerRow;
        colCats = /* @__PURE__ */ new Map();
        colRoles = /* @__PURE__ */ new Map();
        colGuards = /* @__PURE__ */ new Map();
        cells.forEach((x, i) => {
          if (kept[i]) colCats.set(x.ci, kept[i]);
          const role = x.flat ? headerNameRole(x.flat.text) : null;
          if (role) colRoles.set(x.ci, role);
          const guard = x.flat ? tableHeaderGuard(x.flat.text) : null;
          if (kept[i] && !keptBefore[i]) colGuards.set(x.ci, "inferred");
          else if (guard) colGuards.set(x.ci, guard);
        });
        continue;
      }
      for (let k = 1; k < cells.length && cells.length === 2; k++) {
        const left = cells[k - 1];
        const x = cells[k];
        if (!x.flat || !left.flat || colCats && colCats.get(x.ci)) continue;
        const lcat = tableHeaderCategory(left.flat.text);
        if (!lcat) continue;
        for (const sp of tableCellSpans(lcat, x.flat.start, x.flat.text, headerNameRole(left.flat.text), tableHeaderGuard(left.flat.text))) hints.push(sp);
      }
      if (!colCats) continue;
      for (const x of cells) {
        const cat = colCats.get(x.ci);
        if (!cat || !x.flat) continue;
        for (const sp of tableCellSpans(cat, x.flat.start, x.flat.text, colRoles.get(x.ci) || null, colGuards.get(x.ci) || null)) hints.push(sp);
      }
    }
  }
  for (const b of blocks) {
    if (b.block.numeric) for (const sp of tableCellSpans(b.block.numeric.category, b.start, b.text)) hints.push(sp);
  }
  const seen = /* @__PURE__ */ new Set();
  return hints.filter((h) => {
    const k = `${h.start}:${h.end}:${h.category}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
async function anonymizeOffice(bytes, kind, spans, lookup) {
  const { zip, parts } = await loadParts(bytes, kind);
  const { blocks } = flatten(parts);
  const skipped = [];
  const perBlock = /* @__PURE__ */ new Map();
  const queue = (block, edit) => {
    if (!perBlock.has(block)) perBlock.set(block, []);
    perBlock.get(block).push(edit);
  };
  for (const span of spans.filter((s) => s.accepted)) {
    const token = lookup.get(spanMapKey(span));
    const touched = blocks.filter((b) => b.start < span.end && b.start + b.text.length > span.start);
    let placed = false;
    for (const b of touched) {
      const ls = Math.max(span.start, b.start) - b.start;
      const le = Math.min(span.end, b.start + b.text.length) - b.start;
      if (le <= ls) continue;
      queue(b.block, [ls, le, placed ? "" : token]);
      placed = true;
    }
    if (!placed) skipped.push(span);
  }
  for (const [block, edits] of perBlock) {
    applyToBlock(block, edits);
    preserveSpace(block);
  }
  commitNumericBlocks(parts);
  const renames = collectSheetRenames(parts);
  await scrubContainerMetadata(zip);
  stripUninspectableParts(zip);
  await neutraliseContactLinks(zip);
  await sweepMetadataParts(zip, metadataPairs(spans, lookup));
  return { bytes: await writeParts(zip, parts, renames), skipped };
}
function metadataPairs(spans, lookup) {
  const values = /* @__PURE__ */ new Map();
  for (const span of spans.filter((s) => s.accepted && s.text)) {
    const replacement = lookup.get(spanMapKey(span));
    if (typeof replacement !== "string") continue;
    if (!values.has(span.text)) values.set(span.text, /* @__PURE__ */ new Set());
    values.get(span.text).add(replacement);
  }
  return [...values].map(([value, replacements]) => [
    value,
    // sweepMetadataParts skips an empty token; one neutral space removes the value while
    // preserving a valid XML text node.
    replacements.size === 1 ? replacements.values().next().value : " "
  ]);
}
async function restoreOffice(bytes, kind, entries) {
  const { zip, parts } = await loadParts(bytes, kind);
  const list = Array.isArray(entries) ? entries : [];
  const names = placeholderById(list);
  const seen = /* @__PURE__ */ new Set();
  const altered = /* @__PURE__ */ new Set();
  const partial = /* @__PURE__ */ new Set();
  for (const part of parts) {
    for (const block of part.blocks) {
      const text = blockText(block);
      if (!text) continue;
      const r = restoreEdits(text, list);
      if (!r.edits.length) continue;
      for (const id of r.seen) seen.add(id);
      for (const id of r.altered) altered.add(id);
      for (const id of r.partial) partial.add(id);
      applyToBlock(block, r.edits.map((c) => [c.start, c.end, c.repl]));
      preserveSpace(block);
    }
  }
  commitNumericBlocks(parts);
  const out = await writeParts(zip, parts, collectSheetRenames(parts));
  const leftover = await extractOfficeText(out, kind);
  const unresolved = [...new Set([...leftover.matchAll(new RegExp(PLACEHOLDER_REGEX.source, "g"))].map((m) => m[0]))].sort();
  const named = (ids) => [...ids].map((i) => names.get(i) || i).sort();
  const missing = list.filter((e) => !seen.has(e.id || e.placeholder)).map((e) => e.placeholder).sort();
  const residual = list.filter((e) => surrogateStillStanding(e, leftover)).map((e) => e.placeholder).sort();
  return {
    bytes: out,
    text: leftover,
    unresolved,
    altered: named(altered),
    partial: named(partial),
    missing,
    residual
  };
}
export {
  OFFICE_KINDS,
  anonymizeOffice,
  extractOfficeTableHints,
  extractOfficeText,
  handledNumericCells,
  isOfficeRewritePart,
  officeRewriteCoverage,
  restoreOffice
};
