import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  findLiteralValues
} from "./chunk-WORWWASC.mjs";
import {
  require_lib
} from "./chunk-7Y33PHUE.mjs";
import {
  isBareInitialValue,
  isBarePlaceValue,
  isWordValue,
  leakOccurrences
} from "./chunk-ZBWYCETV.mjs";
import {
  __toESM
} from "./chunk-OGQYD6DW.mjs";

// ../extension/core/container-metadata.js
var import_jszip = __toESM(require_lib(), 1);

// ../extension/core/xml-bytes.js
var UTF8_BOM = [239, 187, 191];
var UTF16LE_BOM = [255, 254];
var UTF16BE_BOM = [254, 255];
function starts(bytes, prefix) {
  return prefix.every((v, i) => bytes[i] === v);
}
function declaredEncoding(xml) {
  const match = /^\s*<\?xml\s+[^?]*?\bencoding\s*=\s*(['"])([^'"]+)\1[^?]*\?>/i.exec(xml);
  return match ? match[2].toLowerCase().replace(/[_-]/g, "") : null;
}
function decodeXmlBytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let encoding = "utf-8", offset = 0;
  if (starts(bytes, UTF8_BOM)) offset = 3;
  else if (starts(bytes, UTF16LE_BOM)) {
    encoding = "utf-16le";
    offset = 2;
  } else if (starts(bytes, UTF16BE_BOM)) {
    encoding = "utf-16be";
    offset = 2;
  }
  const xml = new TextDecoder(encoding, { fatal: true }).decode(bytes.subarray(offset));
  const declared = declaredEncoding(xml);
  const allowed = encoding === "utf-8" ? /* @__PURE__ */ new Set(["utf8"]) : /* @__PURE__ */ new Set(["utf16", encoding.replace(/-/g, "")]);
  if (declared && !allowed.has(declared)) throw new Error("xml_encoding_mismatch");
  return xml;
}
function normalizeXmlUtf8(xml) {
  const text = String(xml).replace(/^\uFEFF/, "");
  return text.replace(/^(\s*<\?xml\s+[^?]*?\bencoding\s*=\s*['"])[^'"]+(['"][^?]*\?>)/i, "$1UTF-8$2");
}

// ../extension/core/container-metadata.js
var IDENTITY_PROPERTIES = [
  // OOXML core properties
  "creator",
  "lastModifiedBy",
  "lastPrintedBy",
  "contributor",
  "publisher",
  "title",
  "subject",
  "description",
  "keywords",
  "category",
  // OOXML extended properties
  "Company",
  "Manager",
  // OpenDocument meta.xml
  "initial-creator",
  "printed-by",
  "keyword",
  "user-defined"
];
var PEOPLE_PARTS = [
  /^word\/people\.xml$/,
  /^ppt\/commentAuthors\.xml$/,
  /^xl\/persons\/[^/]+\.xml$/
];
var PEOPLE_ATTRS = ["author", "initials", "displayName", "name", "userId", "providerId"];
var AUTHOR_ELEMENT_PARTS = [/^xl\/comments\d*\.xml$/, /^xl\/comments\/[^/]+\.xml$/];
var NEUTRAL_AUTHOR = "Autor";
function clearXmlElements(xml, localNames, replacement = "") {
  for (const name of localNames) {
    const re = new RegExp(`<((?:[\\w.-]+:)?${name})(\\s[^>]*)?>([\\s\\S]*?)</\\1>`, "g");
    xml = xml.replace(re, (m, tag, attrs) => `<${tag}${attrs || ""}>${replacement}</${tag}>`);
  }
  return xml;
}
function textNodes(element, out = []) {
  for (const node of Array.from(element?.childNodes || [])) {
    if (node.nodeType === 3 || node.nodeType === 4) out.push(node);
    else if (node.nodeType === 1) textNodes(node, out);
  }
  return out;
}
function scrubContainerMetadataCoverage(name, doc, mutate = false) {
  const nodes = /* @__PURE__ */ new WeakSet(), attributes = /* @__PURE__ */ new WeakSet();
  let changed = false;
  const isProps = /^docProps\/(?:core|app|custom)\.xml$/.test(name) || name === "meta.xml";
  const isPeople = PEOPLE_PARTS.some((re) => re.test(name));
  const isAuthorEl = AUTHOR_ELEMENT_PARTS.some((re) => re.test(name));
  if (!doc?.documentElement || !isProps && !isPeople && !isAuthorEl) return { nodes, attributes, changed };
  const walk = (element) => {
    if (isProps && IDENTITY_PROPERTIES.includes(element.localName)) {
      for (const node of textNodes(element)) {
        nodes.add(node);
        if (mutate && node.data) {
          node.data = "";
          changed = true;
        }
      }
    }
    if (isAuthorEl && element.localName === "author") {
      let first = true;
      for (const node of textNodes(element)) {
        nodes.add(node);
        const replacement = first ? NEUTRAL_AUTHOR : "";
        first = false;
        if (mutate && node.data !== replacement) {
          node.data = replacement;
          changed = true;
        }
      }
    }
    if (isPeople || isProps) for (const attribute of Array.from(element.attributes || [])) {
      if (!PEOPLE_ATTRS.includes(attribute.localName) || !attribute.value) continue;
      attributes.add(attribute);
      const replacement = attribute.localName === "initials" ? "A" : NEUTRAL_AUTHOR;
      if (mutate && attribute.value !== replacement) {
        element.setAttribute(attribute.name, replacement);
        changed = true;
      }
    }
    for (const child of Array.from(element.childNodes || [])) if (child.nodeType === 1) walk(child);
  };
  walk(doc.documentElement);
  return { nodes, attributes, changed };
}
async function scrubContainerMetadata(zip) {
  const changed = [];
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    const isProps = /^docProps\/(core|app|custom)\.xml$/.test(name) || name === "meta.xml";
    const isPeople = PEOPLE_PARTS.some((re) => re.test(name));
    const isAuthorEl = AUTHOR_ELEMENT_PARTS.some((re) => re.test(name));
    if (!isProps && !isPeople && !isAuthorEl) continue;
    let xml;
    try {
      xml = decodeXmlBytes(await zip.file(name).async("uint8array"));
    } catch (e) {
      continue;
    }
    try {
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      if (!doc?.documentElement || doc.documentElement.localName === "parsererror") continue;
      const coverage = scrubContainerMetadataCoverage(name, doc, true);
      const next = normalizeXmlUtf8(new XMLSerializer().serializeToString(doc));
      if (coverage.changed || next !== normalizeXmlUtf8(xml)) {
        zip.file(name, next);
        changed.push(name);
      }
    } catch {
      continue;
    }
  }
  return changed;
}
var THUMBNAIL_PARTS = [/^docProps\/thumbnail\.[a-z0-9]+$/i, /^Thumbnails\//i];
var EMBEDDED_PARTS = [/^(word|xl|ppt)\/embeddings\//i];
var MEDIA_PARTS = [/^(word|xl|ppt)\/media\//i, /^(Pictures|ObjectReplacements)\//i];
var RASTER_MEDIA = /\.(?:png|jpe?g|jpe|gif|bmp|dib|tiff?|webp|heic|heif|avif|ico)$/i;
var PRINTER_PARTS = [/^(word|xl|ppt)\/printerSettings\/[^/]+\.bin$/i];
var BLANK_DEVMODE = (() => {
  const b = new Uint8Array(220);
  const v = new DataView(b.buffer);
  v.setUint16(64, 1025, true);
  v.setUint16(68, 220, true);
  return b;
})();
var RELS_PART = /(?:^|\/)[^/]*\.rels$/;
var BLANK_PNG = Uint8Array.from([
  137,
  80,
  78,
  71,
  13,
  10,
  26,
  10,
  0,
  0,
  0,
  13,
  73,
  72,
  68,
  82,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  1,
  8,
  6,
  0,
  0,
  0,
  31,
  21,
  196,
  137,
  0,
  0,
  0,
  10,
  73,
  68,
  65,
  84,
  120,
  156,
  99,
  0,
  1,
  0,
  0,
  5,
  0,
  1,
  13,
  10,
  45,
  180,
  0,
  0,
  0,
  0,
  73,
  69,
  78,
  68,
  174,
  66,
  96,
  130
]);
async function neutraliseContactLinks(zip) {
  const touched = [];
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir || !RELS_PART.test(name)) continue;
    let xml;
    try {
      xml = decodeXmlBytes(await zip.file(name).async("uint8array"));
    } catch (e) {
      continue;
    }
    const next = xml.replace(/<Relationship\b[^>]*>/gi, (tag) => /\bTargetMode="External"/i.test(tag) ? tag.replace(/(\bTarget=")\s*(mailto|tel):[^"]*(")/i, (m, a, scheme, z) => `${a}${scheme.toLowerCase()}:${z}`) : tag);
    if (next !== xml) {
      zip.file(name, normalizeXmlUtf8(next));
      touched.push(name);
    }
  }
  return touched;
}
function stripUninspectableParts(zip) {
  const touched = { thumbnails: [], embedded: [], images: [], printers: [] };
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    if (THUMBNAIL_PARTS.some((re) => re.test(name))) {
      zip.file(name, BLANK_PNG);
      touched.thumbnails.push(name);
    } else if (PRINTER_PARTS.some((re) => re.test(name))) {
      zip.file(name, BLANK_DEVMODE);
      touched.printers.push(name);
    } else if (EMBEDDED_PARTS.some((re) => re.test(name))) {
      zip.remove(name);
      touched.embedded.push(name);
    } else if (MEDIA_PARTS.some((re) => re.test(name)) && RASTER_MEDIA.test(name)) {
      zip.file(name, BLANK_PNG);
      touched.images.push(name);
    }
  }
  return touched;
}
var SWEEP_PARTS = [
  /^docProps\//,
  /^meta\.xml$/,
  /^(word|xl|ppt)\/(charts|diagrams)\//,
  /^customXml\//,
  /^word\/glossary\//
];
var ISO_TIMESTAMP_RE = /^\s*\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\s*$/;
var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function sweepText(segment, ordered) {
  if (ISO_TIMESTAMP_RE.test(segment)) return segment;
  let next = segment;
  for (const [value, token, escaped] of ordered) {
    for (const v of escaped !== value ? [value, escaped] : [value]) {
      if (!next.includes(v)) continue;
      next = next.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(v)}(?![\\p{L}\\p{N}])`, "gu"), () => token);
    }
  }
  return next;
}
async function sweepMetadataParts(zip, pairs) {
  if (!pairs.length) return;
  const ordered = [...pairs].filter(([value, token]) => value && token).sort((a, b) => b[0].length - a[0].length).map(([value, token]) => [value, token, value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")]);
  if (!ordered.length) return;
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    if (!SWEEP_PARTS.some((re) => re.test(name))) continue;
    let xml;
    try {
      xml = decodeXmlBytes(await zip.file(name).async("uint8array"));
    } catch (e) {
      continue;
    }
    const next = xml.split(/(<[^>]*>)/).map((seg, i) => i % 2 ? seg : sweepText(seg, ordered)).join("");
    if (next !== xml) zip.file(name, normalizeXmlUtf8(next));
  }
}
var INLINE_TAG_RE = /^\/?(?:[\w.-]+:)?(?:r|t|hyperlink|ins|del|smartTag|proofErr|bookmarkStart|bookmarkEnd|commentRangeStart|commentRangeEnd|fldChar|noBreakHyphen|softHyphen|span|a)$/;
var FORMATTING_BLOCK_RE = /<((?:[\w.-]+:)?(?:rPr|pPr|tcPr|tblPr|trPr|sectPr|endParaRPr|defRPr))(?:\s[^>]*)?(?:\/>|>[\s\S]*?<\/\1>)/g;
function xmlSearchText(xml) {
  const attrs = [];
  const body = String(xml).replace(/<\?[\s\S]*?\?>/g, "\n").replace(FORMATTING_BLOCK_RE, "").replace(/<(\/?[^\s>\/!?]+)((?:\s[^>]*?)?)\/?>/g, (m, name, rest) => {
    for (const a of rest.matchAll(/\s[\w:.-]+\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      const v = a[1] ?? a[2] ?? "";
      if (v) attrs.push(v);
    }
    return INLINE_TAG_RE.test(name) ? "" : "\n";
  });
  return { text: body, attrs };
}
function wholeWordIn(haystack, value) {
  const needle = String(value).trim();
  const lower = haystack.toLowerCase(), n = needle.toLowerCase();
  for (let i = lower.indexOf(n); i >= 0; i = lower.indexOf(n, i + 1)) {
    const before = i > 0 ? lower[i - 1] : "", after = lower[i + n.length] || "";
    if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)) return true;
  }
  return false;
}
function leakInAttrs(attrs, value, blob) {
  const n = String(value).trim();
  if (blob !== void 0 && !blob.includes(n.toLowerCase())) return false;
  for (const v of attrs) {
    if (/\s/.test(v.trim())) {
      if (wholeWordIn(v, n)) return true;
      continue;
    }
    if (v.trim().toLowerCase() === n.toLowerCase()) return true;
    if (n.length >= 4 && wholeWordIn(v, n)) return true;
  }
  return false;
}
async function findValuesInContainer(bytes, values, categoryOf = null, exempt = null) {
  const found = /* @__PURE__ */ new Set();
  const exemptCount = (v) => exempt && exempt.get(v) || 0;
  const tally = /* @__PURE__ */ new Map();
  const worth = [...new Set(values)].filter((v) => v && String(v).trim() && !(categoryOf && isBareInitialValue(v, categoryOf(v))));
  if (!worth.length) return found;
  let zip;
  try {
    zip = await import_jszip.default.loadAsync(bytes);
  } catch (e) {
    return found;
  }
  const wordish = categoryOf ? worth.filter((v) => (isWordValue(v) || exemptCount(v) > 0) && typeof categoryOf(v) === "string") : [];
  const bareOk = (v) => categoryOf && isBarePlaceValue(v, categoryOf(v));
  const shortNumeric = worth.filter((v) => !wordish.includes(v) && /^\d{1,6}$/.test(v) && !bareOk(v));
  const strict = worth.filter((v) => !wordish.includes(v) && !shortNumeric.includes(v) && !bareOk(v));
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    let data;
    try {
      data = await zip.file(name).async("uint8array");
    } catch (e) {
      continue;
    }
    for (const hit of findLiteralValues(data, strict)) found.add(hit);
    if (shortNumeric.length) {
      let textForm = null;
      try {
        textForm = decodeXmlBytes(data);
      } catch (e) {
        textForm = null;
      }
      if (textForm === null) for (const hit of findLiteralValues(data, shortNumeric)) found.add(hit);
      else {
        const segments = textForm.split(/(<[^>]*>)/).filter((seg, i) => i % 2 === 0 && !ISO_TIMESTAMP_RE.test(seg));
        for (const v of shortNumeric) {
          if (found.has(v)) continue;
          const re = v.length <= 3 ? new RegExp(`(?<![\\p{L}\\p{N}])(?<![\\p{N}][.,:/\\-\\u2013])${v}(?![\\p{L}\\p{N}])(?![.,:/\\-\\u2013]\\p{N})`, "u") : new RegExp(`(?<!\\d)${v}(?!\\d)`);
          if (segments.some((seg) => re.test(seg))) found.add(v);
        }
      }
    }
    if (wordish.length) {
      let textForm = null;
      try {
        textForm = decodeXmlBytes(data);
      } catch (e) {
        textForm = null;
      }
      if (textForm !== null && /(^|\/)theme\/[^/]*\.xml$/i.test(name)) {
        textForm = textForm.replace(/\s(?:script|typeface|panose|pitchFamily|charset)="[^"]*"/g, "");
      }
      if (textForm !== null && /(^|\/)styles\.xml$/i.test(name)) {
        textForm = textForm.replace(/<cellStyle\b[^>]*\bbuiltinId="[^"]*"[^>]*>/g, (tag) => tag.replace(/\sname="[^"]*"/, ""));
      }
      if (textForm === null) for (const hit of findLiteralValues(data, wordish)) found.add(hit);
      else {
        const view = xmlSearchText(textForm);
        view.attrs = [...new Set(view.attrs)];
        const blob = view.attrs.join("").toLowerCase();
        for (const v of wordish) {
          if (found.has(v)) continue;
          const cap = exemptCount(v);
          if (cap) {
            const n = leakOccurrences(view.text, v, categoryOf(v)).length;
            tally.set(v, (tally.get(v) || 0) + n);
            if (tally.get(v) > cap || leakInAttrs(view.attrs, v, blob)) found.add(v);
            continue;
          }
          if (leakOccurrences(view.text, v, categoryOf(v)).length || leakInAttrs(view.attrs, v, blob)) found.add(v);
        }
      }
    }
    if (found.size === worth.length) break;
  }
  return found;
}

export {
  decodeXmlBytes,
  normalizeXmlUtf8,
  clearXmlElements,
  scrubContainerMetadataCoverage,
  scrubContainerMetadata,
  neutraliseContactLinks,
  stripUninspectableParts,
  sweepMetadataParts,
  xmlSearchText,
  findValuesInContainer
};
