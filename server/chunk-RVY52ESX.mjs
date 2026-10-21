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
  spanMapKey
} from "./chunk-ZBWYCETV.mjs";
import "./chunk-XGOKF7XS.mjs";
import "./chunk-ENPGGBFS.mjs";
import {
  PLACEHOLDER_REGEX
} from "./chunk-QFNUQB57.mjs";
import {
  __toESM
} from "./chunk-OGQYD6DW.mjs";

// ../extension/core/docx.js
var import_jszip = __toESM(require_lib(), 1);
var W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
var XML_NS = "http://www.w3.org/XML/1998/namespace";
function getParser() {
  return new DOMParser();
}
function getSerializer() {
  return new XMLSerializer();
}
function childElements(node) {
  return Array.from(node.childNodes).filter((n) => n.nodeType === 1);
}
function getRunText(rEl) {
  let out = "";
  for (const c of childElements(rEl)) {
    if (c.localName === "t" || c.localName === "delText") out += c.textContent;
    else if (c.localName === "tab") out += "	";
    else if (c.localName === "br" || c.localName === "cr") out += "\n";
  }
  return out;
}
function setRunText(rEl, doc, newText) {
  let tag = "w:t";
  for (const c of childElements(rEl)) {
    if (c.localName === "delText") tag = "w:delText";
    if (["t", "delText", "tab", "br", "cr"].includes(c.localName)) rEl.removeChild(c);
  }
  const parts = String(newText).split("\n");
  parts.forEach((part, i) => {
    if (i > 0) rEl.appendChild(doc.createElementNS(W_NS, "w:br"));
    if (!part) return;
    const t = doc.createElementNS(W_NS, tag);
    t.setAttributeNS(XML_NS, "xml:space", "preserve");
    t.appendChild(doc.createTextNode(part));
    rEl.appendChild(t);
  });
}
function orderedRuns(pEl) {
  const runs = [];
  const walk = (el) => {
    for (const c of childElements(el)) {
      if (c.localName === "r") {
        runs.push(c);
        continue;
      }
      if (c.localName === "p" || c.localName === "tbl") continue;
      walk(c);
    }
  };
  walk(pEl);
  return runs;
}
var paraText = (pEl) => orderedRuns(pEl).map(getRunText).join("");
function iterParagraphs(rootEl) {
  const paras = [];
  const walk = (el) => {
    for (const child of childElements(el)) {
      if (child.localName === "p") paras.push(child);
      walk(child);
    }
  };
  walk(rootEl);
  return paras;
}
var ATTR_CARRIERS = [["docPr", "descr"], ["docPr", "title"], ["fldSimple", "w:instr"]];
function carrierBlocks(part) {
  const out = [];
  const all = Array.from(part.root.getElementsByTagName("*"));
  for (const [localName, attr] of ATTR_CARRIERS) {
    for (const el of all) {
      if (el.localName !== localName) continue;
      const value = el.getAttribute(attr);
      if (!value || !value.trim()) continue;
      out.push({
        text: value,
        doc: part.doc,
        part,
        setText: (next) => el.setAttribute(attr, next)
      });
    }
  }
  for (const el of all) {
    if (el.localName !== "instrText") continue;
    const value = el.textContent || "";
    if (!value.trim()) continue;
    out.push({
      text: value,
      doc: part.doc,
      part,
      setText: (next) => {
        el.textContent = next;
      }
    });
  }
  return out;
}
function flatten(parts) {
  const blocks = [];
  const chunks = [];
  let pos = 0;
  for (const part of parts) {
    const paras = iterParagraphs(part.root).map((p) => [p, paraText(p)]);
    if (!paras.some(([, text]) => text.trim())) continue;
    if (chunks.length) {
      chunks.push("");
      pos += 1;
    }
    for (const [p, text] of paras) {
      blocks.push({ p, start: pos, text, doc: part.doc, part });
      chunks.push(text);
      pos += text.length + 1;
    }
    for (const carrier of carrierBlocks(part)) {
      blocks.push({ ...carrier, start: pos });
      chunks.push(carrier.text);
      pos += carrier.text.length + 1;
    }
  }
  return { flatText: chunks.join("\n"), blocks };
}
function replaceSpansInParagraph(pEl, doc, replacements) {
  const sorted = [...replacements].sort((a, b) => b[0] - a[0]);
  for (const [start, end, repl] of sorted) {
    const runs = orderedRuns(pEl);
    let pos = 0;
    const bounds = [];
    for (const run of runs) {
      const length = getRunText(run).length;
      bounds.push([run, pos, pos + length]);
      pos += length;
    }
    let placed = false;
    for (const [run, rstart, rend] of bounds) {
      if (rend <= start || rstart >= end) continue;
      const text = getRunText(run);
      const segStart = Math.max(start, rstart) - rstart;
      const segEnd = Math.min(end, rend) - rstart;
      const before = text.slice(0, segStart);
      const after = text.slice(segEnd);
      if (!placed) {
        setRunText(run, doc, before + repl + after);
        placed = true;
      } else {
        setRunText(run, doc, before + after);
      }
    }
  }
}
function blockFor(ordered, start, end) {
  for (const block of ordered) {
    const blockEnd = block.start + block.text.length;
    if (start >= block.start && end <= blockEnd) return block;
    if (start < block.start) break;
  }
  return null;
}
function blocksTouching(ordered, start, end) {
  return ordered.filter((block) => block.start < end && block.start + block.text.length > start);
}
var TEXT_PART_ORDER = [
  /^word\/document\.xml$/,
  /^word\/header\d*\.xml$/,
  /^word\/footer\d*\.xml$/,
  /^word\/footnotes\.xml$/,
  /^word\/endnotes\.xml$/,
  /^word\/comments\.xml$/,
  // AutoText / building blocks: ordinary WordprocessingML in a part of its own.
  /^word\/glossary\/document\.xml$/
];
function isDocxRewritePart(name) {
  return TEXT_PART_ORDER.some((pattern) => pattern.test(name));
}
function docxRewriteCoverage(name, doc) {
  const covered = /* @__PURE__ */ new WeakSet();
  if (!isDocxRewritePart(name) || !doc?.documentElement) return covered;
  const body = childElements(doc.documentElement).find((n) => n.localName === "body");
  for (const paragraph of iterParagraphs(body || doc.documentElement)) {
    for (const run of orderedRuns(paragraph)) {
      for (const child of childElements(run)) {
        if (!["t", "delText"].includes(child.localName)) continue;
        for (const text of Array.from(child.childNodes || [])) if (text.nodeType === 3 || text.nodeType === 4) covered.add(text);
      }
    }
  }
  return covered;
}
function textPartNames(zip) {
  const all = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const out = [];
  for (const re of TEXT_PART_ORDER) {
    for (const name of all.filter((n) => re.test(n)).sort()) if (!out.includes(name)) out.push(name);
  }
  return out;
}
async function loadDoc(bytes) {
  const zip = await import_jszip.default.loadAsync(bytes);
  const parts = [];
  for (const name of textPartNames(zip)) {
    let doc;
    try {
      doc = getParser().parseFromString(decodeXmlBytes(await zip.file(name).async("uint8array")), "application/xml");
    } catch (e) {
      continue;
    }
    if (!doc || !doc.documentElement) continue;
    parts.push({ name, doc, root: docxSanitizerRoot(doc) });
  }
  if (!parts.length) throw new Error("no readable text part in this .docx");
  return { zip, parts };
}
async function writeDoc(zip, parts) {
  const ser = getSerializer();
  for (const part of parts) zip.file(part.name, normalizeXmlUtf8(ser.serializeToString(part.doc)));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
var AUTHOR_ATTRS = /* @__PURE__ */ new Set(["author", "initials", "userId"]);
var NEUTRAL_AUTHOR = "Autor";
function scrubAuthorAttributes(root, mutate = true) {
  const attributes = /* @__PURE__ */ new WeakSet();
  const walk = (el) => {
    const attrs = el.attributes;
    for (let i = 0; attrs && i < attrs.length; i++) {
      const attr = attrs[i];
      const local = attr.localName || attr.name;
      if (!AUTHOR_ATTRS.has(local) || !attr.value) continue;
      attributes.add(attr);
      if (mutate) el.setAttribute(attr.name, local === "initials" ? "A" : NEUTRAL_AUTHOR);
    }
    for (const child of childElements(el)) walk(child);
  };
  walk(root);
  return attributes;
}
function docxSanitizerRoot(doc) {
  return childElements(doc.documentElement).find((node) => node.localName === "body") || doc.documentElement;
}
function docxAuthorCoverage(name, doc) {
  const attributes = /* @__PURE__ */ new WeakSet();
  if (!isDocxRewritePart(name) || !doc?.documentElement) return attributes;
  return scrubAuthorAttributes(docxSanitizerRoot(doc), false);
}
async function extractDocxText(bytes) {
  const { parts } = await loadDoc(bytes);
  return flatten(parts).flatText;
}
async function anonymizeDocx(bytes, spans, lookup) {
  const { zip, parts } = await loadDoc(bytes);
  const { blocks } = flatten(parts);
  const ordered = [...blocks].sort((a, b) => a.start - b.start);
  const skipped = [];
  const perPara = /* @__PURE__ */ new Map();
  const perCarrier = /* @__PURE__ */ new Map();
  const queue = (block, repl) => {
    if (block.setText) {
      if (!perCarrier.has(block)) perCarrier.set(block, []);
      perCarrier.get(block).push(repl);
      return;
    }
    if (!perPara.has(block.p)) perPara.set(block.p, { doc: block.doc, repls: [] });
    perPara.get(block.p).repls.push(repl);
  };
  for (const span of spans.filter((s) => s.accepted)) {
    const token = lookup.get(spanMapKey(span));
    const block = blockFor(ordered, span.start, span.end);
    if (block) {
      queue(block, [span.start - block.start, span.end - block.start, token]);
      continue;
    }
    const touched = blocksTouching(ordered, span.start, span.end);
    let placed = false;
    for (const b of touched) {
      const ls = Math.max(span.start, b.start) - b.start;
      const le = Math.min(span.end, b.start + b.text.length) - b.start;
      if (le <= ls) continue;
      queue(b, [ls, le, placed ? "" : token]);
      placed = true;
    }
    if (!placed) skipped.push(span);
  }
  for (const [p, { doc, repls }] of perPara) replaceSpansInParagraph(p, doc, repls);
  for (const [block, edits] of perCarrier) {
    let value = block.text;
    for (const [ls, le, token] of [...edits].sort((a, b) => b[0] - a[0])) {
      value = value.slice(0, ls) + token + value.slice(le);
    }
    block.setText(value);
  }
  for (const part of parts) scrubAuthorAttributes(part.root);
  await scrubContainerMetadata(zip);
  stripUninspectableParts(zip);
  await neutraliseContactLinks(zip);
  await sweepMetadataParts(zip, metadataPairs(spans, lookup));
  const out = await writeDoc(zip, parts);
  return { bytes: out, skipped };
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
async function restoreDocx(bytes, entries) {
  const { zip, parts } = await loadDoc(bytes);
  const list = Array.isArray(entries) ? entries : [];
  const names = placeholderById(list);
  const seen = /* @__PURE__ */ new Set();
  const altered = /* @__PURE__ */ new Set();
  const partial = /* @__PURE__ */ new Set();
  const restoreBlocks = flatten(parts).blocks;
  const refilled = /* @__PURE__ */ new Set();
  for (let bi = 0; bi < restoreBlocks.length; bi++) {
    const block = restoreBlocks[bi];
    const text = block.setText ? block.text : paraText(block.p);
    if (!text) continue;
    const { edits, seen: blockSeen, altered: blockAltered, partial: blockPartial } = restoreEdits(text, list);
    if (!edits.length) continue;
    const repls = edits.map((c) => [c.start, c.end, c.repl]);
    for (const id of blockSeen) seen.add(id);
    for (const id of blockAltered) altered.add(id);
    for (const id of blockPartial) partial.add(id);
    const spill = [];
    for (const repl of repls) {
      const lines = String(repl[2]).split("\n");
      if (lines.length < 2) continue;
      let take = 0;
      while (take < lines.length - 1) {
        const next = restoreBlocks[bi + 1 + take];
        if (!next || next.setText || refilled.has(next.p) || !orderedRuns(next.p).length) break;
        const nextText = paraText(next.p);
        if (nextText.trim() && !/^[\s,.;:)\]]/.test(nextText)) break;
        take++;
      }
      if (!take) {
        repl[2] = lines.join(" ");
        continue;
      }
      repl[2] = lines.slice(0, lines.length - take).join(" ");
      for (let j = 0; j < take; j++) {
        const target = restoreBlocks[bi + 1 + j];
        refilled.add(target.p);
        spill.push([target.p, lines[lines.length - take + j], target.doc]);
      }
    }
    if (repls.length && block.setText) {
      let value = text;
      for (const [ls, le, val] of [...repls].sort((a, b) => b[0] - a[0])) {
        value = value.slice(0, ls) + val + value.slice(le);
      }
      block.setText(value);
    } else if (repls.length) {
      replaceSpansInParagraph(block.p, block.doc, repls);
    }
    for (const [p, line, ownerDoc] of spill) {
      const run = orderedRuns(p)[0];
      setRunText(run, ownerDoc, line + paraText(p));
      for (const other of orderedRuns(p).slice(1)) setRunText(other, ownerDoc, "");
    }
  }
  const out = await writeDoc(zip, parts);
  const leftover = flatten((await loadDoc(out)).parts).flatText;
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
  anonymizeDocx,
  docxAuthorCoverage,
  docxRewriteCoverage,
  docxSanitizerRoot,
  extractDocxText,
  isDocxRewritePart,
  restoreDocx,
  scrubAuthorAttributes
};
