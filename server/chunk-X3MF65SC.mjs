import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  require_lib
} from "./chunk-7Y33PHUE.mjs";
import "./chunk-75WGJ5MR.mjs";
import {
  spanMapKey
} from "./chunk-ZBWYCETV.mjs";
import "./chunk-XGOKF7XS.mjs";
import "./chunk-ENPGGBFS.mjs";
import "./chunk-QFNUQB57.mjs";
import {
  __toESM
} from "./chunk-OGQYD6DW.mjs";

// ../extension/core/docmodel.js
var import_jszip = __toESM(require_lib(), 1);
var MODEL_TYPES = Object.freeze(["prose", "sheets", "slides", "mail", "mailbox"]);
var xml = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
var HEADER_ORDER = ["From", "To", "Cc", "Subject", "Date"];
var MBOX_ENVELOPE = "From ainonymize@localhost Thu Jan  1 00:00:00 1970";
var mailLines = (mail) => mailHeaderKeys(mail).map((k) => `${k}: ${mail.headers[k]}`);
var sheetLabel = (sheet, index) => (sheet.name || `Tabelle${index + 1}`).slice(0, 31);
function flattenModel(model) {
  const lines = [];
  const add = (text, set) => {
    if (text) lines.push({ text, set });
  };
  const gap = () => lines.push({ text: "", set: null });
  if (model.type === "prose") {
    model.blocks.forEach((t, i) => add(t, (next) => {
      model.blocks[i] = next;
    }));
  } else if (model.type === "sheets") {
    for (const sheet of model.sheets) {
      for (const row of sheet.rows) {
        row.forEach((cell, c) => add(cell, (next) => {
          row[c] = next;
        }));
      }
    }
    model.sheets.forEach((sheet, si) => add(sheetLabel(sheet, si), (next) => {
      sheet.name = next;
    }));
  } else if (model.type === "slides") {
    for (const slide of model.slides) {
      if (slide.title) add(slide.title, (next) => {
        slide.title = next;
      });
      (slide.blocks || []).forEach((t, i) => add(t, (next) => {
        slide.blocks[i] = next;
      }));
    }
  } else if (model.type === "mail") {
    flattenMailInto(model, add, gap);
  } else if (model.type === "mailbox") {
    model.messages.forEach((msg) => flattenMailInto(msg, add, gap, true));
  } else {
    throw new Error("unknown_model_type:" + model.type);
  }
  const blocks = [];
  let pos = 0;
  for (const line of lines) {
    if (line.set) blocks.push({ start: pos, text: line.text, set: line.set });
    pos += line.text.length + 1;
  }
  return { flat: lines.map((l) => l.text).join("\n"), blocks };
}
function flattenMailInto(mail, add, gap, envelope = false) {
  if (envelope) add(MBOX_ENVELOPE, null);
  for (const key of mailHeaderKeys(mail)) {
    const value = mail.headers[key];
    add(`${key}: ${value}`, (next) => {
      const at = next.indexOf(": ");
      mail.headers[key] = at >= 0 ? next.slice(at + 2) : next;
    });
  }
  gap();
  for (const [i, line] of String(mail.body || "").split("\n").entries()) {
    add(line, (next) => {
      const arr = String(mail.body || "").split("\n");
      arr[i] = next;
      mail.body = arr.join("\n");
    });
  }
  if (envelope) gap();
}
function mailHeaderKeys(mail) {
  const headers = mail.headers || {};
  const known = HEADER_ORDER.filter((k) => headers[k]);
  const rest = Object.keys(headers).filter((k) => !HEADER_ORDER.includes(k) && headers[k]);
  return [...known, ...rest];
}
function applyModel(model, spans, lookup) {
  const { blocks } = flattenModel(model);
  const skipped = [];
  const edits = /* @__PURE__ */ new Map();
  for (const span of spans.filter((s) => s.accepted)) {
    const token = lookup.get(spanMapKey(span));
    let placed = false;
    for (const b of blocks) {
      if (b.start >= span.end || b.start + b.text.length <= span.start) continue;
      const ls = Math.max(span.start, b.start) - b.start;
      const le = Math.min(span.end, b.start + b.text.length) - b.start;
      if (le <= ls) continue;
      if (!edits.has(b)) edits.set(b, []);
      edits.get(b).push([ls, le, placed ? "" : token]);
      placed = true;
    }
    if (!placed) skipped.push(span);
  }
  for (const [b, list] of edits) {
    let text = b.text;
    for (const [s, e, repl] of list.sort((a, z) => z[0] - a[0])) text = text.slice(0, s) + repl + text.slice(e);
    b.set(text);
  }
  return { skipped };
}
var CT_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
var CT_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
var CT_PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
var REL_NS = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
var rel = (id, type, target) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
async function zipOf(files) {
  const zip = new import_jszip.default();
  for (const [name, body] of Object.entries(files)) zip.file(name, body);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
function buildDocx(model) {
  const body = model.blocks.filter((t) => t).map((t) => `<w:p><w:r><w:t xml:space="preserve">${xml(t)}</w:t></w:r></w:p>`).join("");
  return zipOf({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ${REL_NS}>${rel("rId1", "officeDocument", "word/document.xml")}</Relationships>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ${REL_NS}></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`
  });
}
function buildXlsx(model) {
  const strings = [];
  const sheets = model.sheets.map((sheet, si) => {
    const rows = sheet.rows.map((row, r) => {
      const cells = row.map((cell, c) => {
        const ref = colName(c) + (r + 1);
        if (!cell) return `<c r="${ref}"/>`;
        strings.push(cell);
        return `<c r="${ref}" t="s"><v>${strings.length - 1}</v></c>`;
      }).join("");
      return `<row r="${r + 1}">${cells}</row>`;
    }).join("");
    return { index: si + 1, name: sheetLabel(sheet, si), xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>` };
  });
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` + sheets.map((s) => `<Override PartName="/xl/worksheets/sheet${s.index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") + `</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ${REL_NS}>${rel("rId1", "officeDocument", "xl/workbook.xml")}</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` + sheets.map((s) => `<sheet name="${xml(s.name)}" sheetId="${s.index}" r:id="rId${s.index}"/>`).join("") + `</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ${REL_NS}>` + sheets.map((s) => rel(`rId${s.index}`, "worksheet", `worksheets/sheet${s.index}.xml`)).join("") + rel(`rId${sheets.length + 1}`, "sharedStrings", "sharedStrings.xml") + `</Relationships>`,
    "xl/sharedStrings.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">` + strings.map((s) => `<si><t xml:space="preserve">${xml(s)}</t></si>`).join("") + `</sst>`
  };
  for (const s of sheets) files[`xl/worksheets/sheet${s.index}.xml`] = s.xml;
  return zipOf(files);
}
function colName(i) {
  let n = i, out = "";
  do {
    out = String.fromCharCode(65 + n % 26) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}
function buildPptx(model) {
  const pad = (n) => String(n).padStart(3, "0");
  const slides = model.slides.map((slide, i) => {
    const paras = [slide.title, ...slide.blocks || []].filter((t) => t).map((t) => `<a:p><a:r><a:t>${xml(t)}</a:t></a:r></a:p>`).join("");
    return {
      index: i + 1,
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody>${paras}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`
    };
  });
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>` + slides.map((s) => `<Override PartName="/ppt/slides/slide${pad(s.index)}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("") + `</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ${REL_NS}>${rel("rId1", "officeDocument", "ppt/presentation.xml")}</Relationships>`,
    "ppt/presentation.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>` + slides.map((s) => `<p:sldId id="${255 + s.index}" r:id="rId${s.index}"/>`).join("") + `</p:sldIdLst></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ${REL_NS}>` + slides.map((s) => rel(`rId${s.index}`, "slide", `slides/slide${pad(s.index)}.xml`)).join("") + `</Relationships>`
  };
  for (const s of slides) files[`ppt/slides/slide${pad(s.index)}.xml`] = s.xml;
  return zipOf(files);
}
function mailText(mail) {
  return mailLines(mail).join("\n") + "\n\n" + String(mail.body || "");
}
var mboxText = (model) => model.messages.map((m) => `${MBOX_ENVELOPE}
${mailText(m)}
`).join("\n");
var stemOf = (n) => {
  const i = String(n || "").lastIndexOf(".");
  return i > 0 ? n.slice(0, i) : n || "Dokument";
};
async function emitModel(model, name) {
  const stem = stemOf(name);
  switch (model.type) {
    case "prose":
      return { bytes: await buildDocx(model), name: stem + ".docx", kind: "docx", mime: CT_DOCX };
    case "sheets":
      return { bytes: await buildXlsx(model), name: stem + ".xlsx", kind: "xlsx", mime: CT_XLSX };
    case "slides":
      return { bytes: await buildPptx(model), name: stem + ".pptx", kind: "pptx", mime: CT_PPTX };
    case "mail":
      return { bytes: new TextEncoder().encode(mailText(model)), name: stem + ".eml", kind: "text", mime: "message/rfc822" };
    case "mailbox":
      return { bytes: new TextEncoder().encode(mboxText(model)), name: stem + ".mbox", kind: "text", mime: "text/plain" };
    default:
      throw new Error("unknown_model_type:" + model.type);
  }
}
export {
  MODEL_TYPES,
  applyModel,
  emitModel,
  flattenModel
};
