import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  MappingEntry,
  PiiSpan
} from "./chunk-XGOKF7XS.mjs";
import {
  COMMON_WORDS,
  FUNCTION_WORDS,
  GERMAN_COMMON_WORDS,
  genderOfGivenName,
  hasCommonCompoundHead,
  hasEnglishRoleHead,
  isCommonWord,
  isEnglishRoleWord,
  isRoleNoun,
  looksLikeGivenName,
  vocabularyVerdict
} from "./chunk-ENPGGBFS.mjs";
import {
  AFFILIATION_CONTEXT,
  AFFILIATION_STEMS,
  AFFILIATION_TERMS,
  CRIMINAL_CONTEXT,
  CRIMINAL_OFFENCES,
  CRIMINAL_TRIGGERS,
  HEALTH_BLOCK_HEADERS,
  HEALTH_CONTEXT,
  HEALTH_DRUG_NAMES,
  HEALTH_SUBJECT_TERMS,
  HEALTH_TERMS,
  KEEP_TERMS,
  NON_NAME_WORDS,
  PLACEHOLDER_CLOSE,
  PLACEHOLDER_OPEN,
  PRONOUNS,
  RELIGION_CONTEXT,
  RELIGION_STEMS,
  RELIGION_TERMS,
  REVIEW_REQUIRED_CATEGORIES,
  ROLE_STEMS,
  SETTINGS
} from "./chunk-QFNUQB57.mjs";

// ../extension/core/table-flat.js
var FLAT_MAX_WIDTH = 16;
var DATE_HEADER_WORD_RE = /(?:dat(?:um|e)|termin|eingang|ausgang|seit|bis\b|von\b|eintritt|austritt|fällig|ablauf|beginn|ende\b)/i;
var FLAT_DATE_RE = /^(?:\d{1,2}\s?[./-]\s?\d{1,2}\s?[./-]\s?\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\.? ?[\p{L}]{3,9}\.? \d{2,4}|[\p{L}]{3,9}\.? \d{1,2},? \d{4})$/u;
var FLAT_AMOUNT_RE = /^[-+]?\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?\s?(?:€|eur|euro|%)?$/i;
var FLAT_TIME_RE = /^\d{1,2}:\d{2}(?:\s?[-–]\s?\d{1,2}:\d{2})?$/;
var FLAT_ID_RE = /^(?=.*\d)[\p{L}\p{N}][\p{L}\p{N}\-_./:# ]{2,38}$/u;
var FLAT_ID_CATS = /* @__PURE__ */ new Set(["CUSTOMER_ID", "REG_ID", "ID_CARD", "HEALTH_INSURANCE", "TAX_ID", "SV_ID"]);
var FLAT_STRONG_CATS = /* @__PURE__ */ new Set(["DOB", "EMAIL", "PHONE", "IBAN", ...FLAT_ID_CATS]);
function plausibleBirthYear(t) {
  const m = /(?:^|[./-])(\d{4})(?:$|-)|[./-](\d{2})$/.exec(t) || /^(\d{4})-/.exec(t);
  if (!m) return true;
  if (m[1]) return +m[1] <= 2020;
  const yy = +m[2];
  return yy < 21 || yy > 26;
}
function flatHeaderLike(t) {
  if (!t || t.length > 45 || /@/.test(t)) return false;
  if (!new RegExp("\\p{L}", "u").test(t)) return false;
  if ((t.match(/\d/g) || []).length > 2) return false;
  if (t.split(/\s+/).length > 5) return false;
  if (FLAT_DATE_RE.test(t)) return false;
  return true;
}
function flatCellFits(cat, t) {
  if (!t) return null;
  if (/^(?:[-–—.•?*/]+|n\/?a|k\.?a\.?|unbekannt|keine?)$/i.test(t)) return null;
  if (cat === "DOB") return FLAT_DATE_RE.test(t);
  if (cat === "EMAIL") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  if (cat === "PHONE") return /^[+(]?\d[\d\s()/.+-]{5,28}$/.test(t) && (t.match(/\d/g) || []).length >= 6 && !FLAT_DATE_RE.test(t);
  if (cat === "IBAN") return /^[A-Za-z]{2}\d{2}[\dA-Za-z ]{10,32}$/.test(t);
  if (FLAT_ID_CATS.has(cat)) {
    if (/\s\/\s/.test(t)) {
      const parts = t.split(/\s+\/\s+/);
      return parts.length > 1 && parts.every((x) => flatCellFits(cat, x.trim()) === true);
    }
    const grouped = /^\d[\d ]*\d$/.test(t) && (t.match(/\d/g) || []).length >= 9;
    if (!FLAT_ID_RE.test(t) || FLAT_DATE_RE.test(t) || !grouped && FLAT_AMOUNT_RE.test(t) || FLAT_TIME_RE.test(t)) return false;
    const words = t.split(/\s+/);
    if (words.length > 3 && !(words.length <= 6 && words.every((w) => /^\d{1,5}$/.test(w)) && (t.match(/\d/g) || []).length >= 9)) return false;
    if (words.length > 1 && !/\d{3,}/.test(t.replace(/\d{1,2}\.\d{1,2}\./g, ""))) return false;
    return true;
  }
  if (cat === "PERSON") return /^[\p{L}][\p{L}'’.\- ,()/]{1,58}$/u.test(t);
  if (cat === "NATIONALITY" || cat === "BIRTH_PLACE") return /^[\p{L}][\p{L}'’.\- ,()/]{1,40}$/u.test(t);
  return t.length <= 120;
}
function rowAt(T, p, width, cats) {
  let passes = 0;
  for (let j = 0; j < width; j++) {
    const c = cats[j];
    if (!c) continue;
    const r = flatCellFits(c, T[p + j]);
    if (r === false && FLAT_STRONG_CATS.has(c)) return { ok: false, passes: 0 };
    if (r === true && FLAT_STRONG_CATS.has(c)) passes++;
  }
  return { ok: passes > 0, passes };
}
function rowIsBlankOnly(T, p, width, cats) {
  let blank = false;
  for (let j = 0; j < width; j++) {
    if (!FLAT_STRONG_CATS.has(cats[j])) continue;
    const r = flatCellFits(cats[j], T[p + j]);
    if (r === false || r === true) return false;
    blank = true;
  }
  return blank;
}
var RAGGED_DELTAS = [-1, -2, 1];
function evalBlock(T, n, s, width, cats) {
  let hasStrong = false;
  for (let j = 0; j < width; j++) if (FLAT_STRONG_CATS.has(cats[j])) hasStrong = true;
  if (!hasStrong) return null;
  let strongCols = 0;
  for (let j = 0; j < width; j++) if (FLAT_STRONG_CATS.has(cats[j])) strongCols++;
  let rows = 0;
  let strongPasses = 0;
  const rowStarts = [];
  const ragged = [];
  let p = s + width;
  while (p + width <= n) {
    const r = rowAt(T, p, width, cats);
    if (!r.ok && rows === 0 && p === s + width && p + 2 * width <= n && rowIsBlankOnly(T, p, width, cats) && rowAt(T, p + width, width, cats).ok) {
      p += width;
      continue;
    }
    if (r.ok) {
      rows++;
      strongPasses += r.passes;
      rowStarts.push(p);
      p += width;
      continue;
    }
    let resync = null;
    if (rows >= 1 && strongCols >= 3 && ragged.length <= rows) {
      for (const d of RAGGED_DELTAS) {
        const len = width + d;
        const q = p + len;
        if (len < 2 || q + width > n) continue;
        const nr = rowAt(T, q, width, cats);
        if (!nr.ok) continue;
        let found = 0;
        let from = p;
        for (let j = 0; j < width; j++) {
          if (!FLAT_STRONG_CATS.has(cats[j])) continue;
          for (let k = from; k < p + len; k++) if (flatCellFits(cats[j], T[k]) === true) {
            found++;
            from = k + 1;
            break;
          }
        }
        if (found >= strongCols - 1) {
          resync = { len, q };
          break;
        }
      }
    }
    if (!resync) break;
    ragged.push({ p, len: resync.len });
    p = resync.q;
  }
  if (rows < 2 && !(rows === 1 && strongPasses >= 2)) return null;
  let mapped = 0;
  for (const c of cats) if (c) mapped++;
  return { s, width, rows, end: p, mapped, strongPasses, ragged };
}
function flatTableScan(lines, hooks, spans, ranges) {
  const n = lines.length;
  const T = lines.map((l) => l[1].trim());
  const like = T.map(flatHeaderLike);
  const catHard = T.map((t, i2) => like[i2] ? hooks.headerCategory(t) : null);
  const soft = T.map((t, i2) => like[i2] && !catHard[i2] && !!hooks.recordRefHeader && hooks.recordRefHeader(t));
  const cat = catHard.map((c, i2) => c || (soft[i2] ? "REG_ID" : null));
  const consumed = new Array(n).fill(false);
  const blockStarts = [];
  const dobSweeps = [];
  let i = 0;
  while (i < n) {
    if (!like[i]) {
      i++;
      continue;
    }
    let b = i;
    while (b + 1 < n && like[b + 1] && b - i < 40) b++;
    const mapped = [];
    for (let k = i; k <= b; k++) if (cat[k]) mapped.push(k);
    let sweepFrom = null;
    if (mapped.length >= 2) {
      blockStarts.push(i);
      let dateHeaders = 0;
      for (let k = i; k <= b && k < i + 30; k++) if (like[k] && DATE_HEADER_WORD_RE.test(T[k]) && cat[k] !== "DOB") dateHeaders++;
      if (mapped.some((k) => cat[k] === "DOB") && dateHeaders === 0) sweepFrom = b + 1;
    }
    let best = null;
    if (mapped.length >= 2) {
      for (let s2 = i; s2 <= mapped[0]; s2++) {
        for (let e = mapped[1]; e <= b; e++) {
          const width2 = e - s2 + 1;
          if (width2 > FLAT_MAX_WIDTH) break;
          const r = evalBlock(T, n, s2, width2, cat.slice(s2, e + 1));
          if (r && (!best || r.rows > best.rows || r.rows === best.rows && r.strongPasses > best.strongPasses)) best = r;
        }
      }
    }
    if (sweepFrom !== null && (!best || best.rows < 3)) dobSweeps.push(sweepFrom);
    if (!best) {
      i = b + 1;
      continue;
    }
    const { s, width, end } = best;
    let finalCats = hooks.dropLocality(T.slice(s, s + width), cat.slice(s, s + width));
    if (soft.slice(s, s + width).some(Boolean)) {
      const subject = hooks.hasSubjectColumn(finalCats, T.slice(s, s + width));
      finalCats = finalCats.map((c, j) => soft[s + j] && !subject ? null : c);
    }
    for (let j = 0; j < width; j++) {
      if (finalCats[j] || cat[s + j] && !soft[s + j]) ranges.push([lines[s + j][0], lines[s + j][0] + lines[s + j][1].length]);
    }
    const raggedAt = new Map(best.ragged.map((r) => [r.p, r.len]));
    for (let p = s + width; p < end; ) {
      const rl = raggedAt.get(p);
      if (rl) {
        let from = p;
        for (let j = 0; j < width; j++) {
          const c = finalCats[j];
          if (!c) continue;
          if (c === "PERSON") {
            if (j === 0 && /^[\p{L}'’.\- ]{2,}, ?[\p{L}'’.\- ]{2,}$/u.test(T[p])) {
              hooks.pushCell(spans, c, lines[p][0], lines[p][1], null, hooks.headerGuard(T[s + j]));
            }
            continue;
          }
          if (!FLAT_STRONG_CATS.has(c)) continue;
          for (let k = from; k < p + rl; k++) {
            if (flatCellFits(c, T[k]) === true) {
              hooks.pushCell(spans, c, lines[k][0], lines[k][1], hooks.headerRole(T[s + j]), hooks.headerGuard(T[s + j]));
              from = k + 1;
              break;
            }
          }
        }
        p += rl;
        continue;
      }
      for (let j = 0; j < width; j++) {
        const c = finalCats[j];
        if (!c) continue;
        const [lstart, ltext] = lines[p + j];
        if (flatCellFits(c, T[p + j]) === false) continue;
        hooks.pushCell(spans, c, lstart, ltext, hooks.headerRole(T[s + j]), hooks.headerGuard(T[s + j]));
      }
      p += width;
    }
    for (let k = s; k < end; k++) consumed[k] = true;
    i = end;
  }
  for (const from of dobSweeps) {
    const until = blockStarts.find((x) => x >= from) ?? n;
    let emptyRun = 0;
    for (let p = from; p < until && p - from < 400; p++) {
      if (T[p].length > 200) break;
      if (like[p] && (cat[p] || DATE_HEADER_WORD_RE.test(T[p]))) break;
      if (consumed[p]) continue;
      if (/^\d{1,2}\.\d{1,2}\.(?:19|20)?\d{2}$|^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/(?:19|20)\d{2}$/.test(T[p])) {
        if (!plausibleBirthYear(T[p])) continue;
        hooks.pushCell(spans, "DOB", lines[p][0], lines[p][1], null, null);
        emptyRun = 0;
      } else if (++emptyRun > 120) break;
    }
  }
  labelValueScan(lines, T, catHard, consumed, hooks, spans);
  inlineRowScan(lines, T, consumed, hooks, spans, ranges);
  return consumed;
}
function labelValueScan(lines, T, cat, consumed, hooks, spans) {
  const n = lines.length;
  for (let i = 0; i < n - 1; i++) {
    const c = cat[i];
    if (!c || consumed[i]) continue;
    const text = c === "NATIONALITY" || c === "BIRTH_PLACE";
    if (!text && !FLAT_STRONG_CATS.has(c)) continue;
    if (c === "EMAIL" || c === "PHONE" || c === "IBAN") continue;
    const vals = [];
    let j = i + 1;
    while (j < n && !consumed[j] && vals.length < 4) {
      if (cat[j]) break;
      if (flatCellFits(c, T[j]) !== true) break;
      vals.push(j);
      j++;
      if (c !== "DOB" && c !== "TAX_ID" && c !== "SV_ID" && c !== "HEALTH_INSURANCE" && c !== "ID_CARD" && !(text && T[j - 1].split(/\s+/).length <= 3)) break;
    }
    if (!vals.length) continue;
    if (text && !(j < n && cat[j])) continue;
    for (const v of vals) {
      const [lstart, ltext] = lines[v];
      hooks.pushCell(spans, c, lstart, ltext, hooks.headerRole(T[i]), hooks.headerGuard(T[i]));
    }
  }
}
var FLAT_DATE_IN_LINE_RE = /(?<![\d.\-/])(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\. ?[\p{L}]{3,9} \d{4})(?![\d])/gu;
var KVNR_IN_LINE_RE = /(?<![\p{L}\d])[A-Z]\d{9}(?!\d)/gu;
var TAXID_IN_LINE_RE = /(?<![\d.,\/-])\d{2} ?\d{3} ?\d{3} ?\d{3}(?![\d.,\/-])/g;
var SVNR_IN_LINE_RE = /(?<![\d.,\/-])\d{2} ?\d{6} ?[A-Z] ?\d{3}(?![\d.,\/-])/g;
var DATE_WORD_RE = /(?:dat(?:um|e)|termin)$/u;
var AMOUNT_NEXT_RE = /^(?:net|gross|amount|total|sum|date|value|price|netto|brutto|betrag|summe|datum|wert|preis|\(?EUR\)?)$/i;
function headerColumns(words, hooks) {
  const cols = [];
  let dates = 0;
  let i = 0;
  while (i < words.length) {
    let hit = null;
    for (let nn = Math.min(3, words.length - i); nn >= 1 && !hit; nn--) {
      const phrase = words.slice(i, i + nn).join(" ");
      const c = hooks.headerCategory(phrase) || (hooks.recordRefHeader && nn <= 2 && hooks.recordRefHeader(phrase) ? "REG_ID" : null);
      if (c && nn > 1) {
        const own = new Set(words.slice(i, i + nn).map((w) => hooks.headerCategory(w)).filter(Boolean));
        if (own.size > 1) continue;
        if (hooks.headerCategory(words[i]) === c && words.slice(i + 1, i + nn).some((w) => hooks.headerCategory(w))) continue;
      }
      if (c) hit = { cat: c, n: nn };
    }
    if (hit && hit.n === 1 && hooks.recordRefHeader && !hooks.headerCategory(words[i]) && AMOUNT_NEXT_RE.test(words[i + 1] || "")) hit = null;
    if (hit) {
      cols.push({ cat: hit.cat, dateIndex: hit.cat === "DOB" ? dates : -1, at: i, words: hit.n, soft: !hooks.headerCategory(words.slice(i, i + hit.n).join(" ")) });
      if (hit.cat === "DOB") dates++;
      i += hit.n;
      continue;
    }
    if (DATE_WORD_RE.test(words[i].toLowerCase().replace(/[.:]+$/, ""))) dates++;
    i++;
  }
  const subject = hooks.hasStrongSubject ? hooks.hasStrongSubject(cols.map((c) => c.cat), cols.map((c) => words.slice(c.at, c.at + c.words).join(" "))) : cols.some((c) => c.cat === "PERSON");
  return subject ? cols : cols.filter((c) => !c.soft);
}
var INLINE_ID_TOKEN_RE = /^(?=[^\s]*\d)[\p{L}\p{N}][\p{L}\p{N}\-_/.#]{2,30}$/u;
function inlineIdToken(tok, minPureDigits = 5) {
  const t = tok.replace(/[.,;:)]+$/, "");
  if (!INLINE_ID_TOKEN_RE.test(t)) return null;
  if (FLAT_DATE_RE.test(t) || FLAT_AMOUNT_RE.test(t) || FLAT_TIME_RE.test(t)) return null;
  const digits = (t.match(/\d/g) || []).length;
  if (/^\d+$/.test(t)) {
    if (digits < minPureDigits) return null;
  } else if (digits < 3 || !new RegExp("\\p{L}", "u").test(t) && !(digits >= 6 && /^\d{2,6}(?:-\d{2,8})+$/.test(t))) return null;
  if (/^[+(]/.test(t) || /\d[./]\d/.test(t) && !new RegExp("\\p{L}", "u").test(t)) return null;
  return t;
}
function inlineIdPlan(cols, words, hooks) {
  const k = cols.findIndex((c2) => FLAT_ID_CATS.has(c2.cat) && c2.cat !== "HEALTH_INSURANCE" && c2.cat !== "TAX_ID" && c2.cat !== "SV_ID" && !hooks.headerGuard(words.slice(c2.at, c2.at + c2.words).join(" ")));
  if (k < 0) return null;
  const c = cols[k];
  if (cols[k + 1] && cols[k + 1].cat === "DOB") return { cat: c.cat, where: "before-dob", dateIndex: cols[k + 1].dateIndex };
  if (cols[k - 1] && cols[k - 1].cat === "DOB") return { cat: c.cat, where: "after-dob", dateIndex: cols[k - 1].dateIndex };
  if (k === 0 && c.at === 0) return { cat: c.cat, where: "first" };
  if (k === cols.length - 1 && c.at + c.words === words.length) return { cat: c.cat, where: "last" };
  return { cat: c.cat, where: "unique" };
}
function inlineIdInRow(rt, plan) {
  const toks = [...rt.matchAll(/\S+/g)];
  const dates = [...rt.matchAll(FLAT_DATE_IN_LINE_RE)];
  const minPure = plan.where === "first" ? 4 : 5;
  const ok = (m) => inlineIdToken(m[0], minPure) && !dates.some((d) => d.index <= m.index && d.index + d[0].length >= m.index + m[0].length);
  let pick = null;
  if (plan.where === "unique") {
    const strict = toks.filter((m) => /^[A-Z]{1,5}-\d{3,}(?:[-/][A-Z0-9]+)*[.,;]?$/.test(m[0]) && ok(m));
    if (strict.length !== 1) return null;
    pick = strict[0];
  } else if (plan.where === "first") {
    if (toks.length && ok(toks[0])) pick = toks[0];
  } else if (plan.where === "last") {
    const m = toks[toks.length - 1];
    if (m && ok(m)) pick = m;
  } else {
    const d = dates[plan.dateIndex] || dates[0];
    if (!d) return null;
    if (plan.where === "before-dob") {
      for (const m of toks) if (m.index < d.index && ok(m)) pick = m;
    } else {
      for (const m of toks) if (m.index > d.index && ok(m)) {
        pick = m;
        break;
      }
    }
  }
  if (!pick) return null;
  const t = inlineIdToken(pick[0], minPure);
  return { index: pick.index, 0: t, length: t.length };
}
function proseLike(t) {
  let low = 0;
  for (const w of t.split(/\s+/)) if (new RegExp("^\\p{Ll}[\\p{L}]{2,}$", "u").test(w.replace(/[.,;:!?)]+$/, ""))) low++;
  return low >= 4;
}
var RELIGION_NONE_RE = /^(?:keine?|konfessionslos|ohne|-)$/i;
function inlineTextCells(rt, dateMatches, dateIndex, tailCats) {
  const cats = tailCats.filter((c) => c === "BIRTH_PLACE" || c === "NATIONALITY" || c === "RELIGION");
  if (!cats.length || cats.length !== tailCats.length || cats.length === 1 && cats[0] !== "BIRTH_PLACE") return [];
  if (cats.indexOf("BIRTH_PLACE") > 0) return [];
  const m = dateMatches[dateIndex];
  const from = m.index + m[0].length;
  const next = dateMatches.find((d) => d.index >= from);
  const seg = rt.slice(from, next ? next.index : rt.length);
  const toks = [...seg.matchAll(/\S+/g)].map((t) => ({ text: t[0], index: from + t.index }));
  if (toks.length < cats.length || toks.length > cats.length + 4) return [];
  const out = [];
  let end = toks.length;
  for (let i = cats.length - 1; i >= 0; i--) {
    const c = cats[i];
    const take = c === "BIRTH_PLACE" && i === 0 ? toks.slice(0, end) : toks.slice(end - 1, end);
    if (!take.length) return [];
    const text = take.map((t) => t.text).join(" ");
    end -= take.length;
    if (c === "RELIGION" && RELIGION_NONE_RE.test(text)) continue;
    if (!/^[\p{L}][\p{L}'’.\-(), ]*$/u.test(text)) return [];
    out.push([c, Object.assign([text], { index: take[0].index })]);
  }
  return out;
}
var ID_DOC_HEADER_WORD_RE = /(^|\s)(Führerschein|Fuehrerschein|Personalausweis|Reisepass|Ausweis)(?=\s)(?!\s+(?:Nr|Nummer|No)\b)/u;
var GROUPED_DOC_ID_IN_LINE_RE = /(?<![\p{L}\d-])[A-Z][A-Z0-9]?(?: \d{3,5}){2}(?: \d{1,2})?(?![\p{L}\d-]| \d)/gu;
var HEADER_LC_WORD_RE = /^(?:address|net|gross|reference|number|name|date|amount|status|type|id|ref|no|code)$/u;
function inlineRowScan(lines, T, consumed, hooks, spans, ranges) {
  const n = lines.length;
  for (let h = 0; h < n; h++) {
    let t = T[h];
    if (t && /^(?:Nr\.?|Nummer|No\.?)$/.test(T[h + 1] || "") && /[-–]$/.test(t)) t = `${t} ${T[h + 1]}`;
    else if (t && /^(?:Nr\.?|Nummer|No\.?)$/.test(T[h + 1] || "") && ID_DOC_HEADER_WORD_RE.test(t)) t = t.replace(ID_DOC_HEADER_WORD_RE, `$1$2 ${T[h + 1]}`);
    if (consumed[h] || !t || t.length > 200 || (t.match(/\d/g) || []).length > 3) continue;
    const words = t.split(/\s+/);
    if (words.length < 3 || words.length > 30) continue;
    if (/^[^\s:]{2,40}:\s+\S/u.test(t)) continue;
    let cols = headerColumns(words, hooks);
    if (cols.some((c) => c.soft) && (/[,;]/.test(t) || words.some((w) => new RegExp("^\\p{Ll}", "u").test(w) && !HEADER_LC_WORD_RE.test(w)))) cols = cols.filter((c) => !c.soft);
    const dob = cols.find((c) => c.cat === "DOB");
    const kv = cols.some((c) => c.cat === "HEALTH_INSURANCE");
    const tax = cols.some((c) => c.cat === "TAX_ID");
    const sv = cols.some((c) => c.cat === "SV_ID");
    const idPlan = inlineIdPlan(cols, words, hooks);
    const idDoc = cols.some((c) => c.cat === "ID_CARD");
    const tailCats = [];
    if (dob) {
      for (const c of cols.slice(cols.indexOf(dob) + 1)) {
        if (c.cat === "DOB") break;
        tailCats.push(c.cat);
      }
    }
    const proseish = words.filter((w) => new RegExp("^\\p{Ll}", "u").test(w)).length * 3 > words.length || /[.!?]$/.test(t) || new RegExp("[.!?][ \\t]+\\p{Lu}", "u").test(t);
    const loneTax = tax && cols.length === 1 && words.length >= 4 && !proseish;
    const weakHeader = cols.length === 1 && words.length >= 3 && words.some((w) => new RegExp("^\\p{Ll}", "u").test(w)) && !loneTax;
    if (weakHeader && !(idPlan && idPlan.where === "unique" && words.length >= 5 && !proseish)) continue;
    if (cols.length < 2 && !loneTax && !idDoc && !(idPlan && cols.length === 1 && idPlan.where !== "before-dob" && idPlan.where !== "after-dob")) continue;
    if (!dob && !kv && !tax && !sv && !idPlan && !idDoc) continue;
    const found = [];
    let miss = 0;
    let p = h + 1;
    for (; p < n && p - h < 400; p++) {
      if (consumed[p]) break;
      const rt = T[p];
      if (!rt) continue;
      if (proseLike(rt) && !(idPlan && inlineIdInRow(rt, idPlan))) break;
      const row = [];
      if (dob) {
        const ms = [...rt.matchAll(FLAT_DATE_IN_LINE_RE)];
        if (ms.length > dob.dateIndex) {
          row.push(["DOB", ms[dob.dateIndex]]);
          for (const cell of inlineTextCells(rt, ms, dob.dateIndex, tailCats)) row.push(cell);
        }
      }
      if (kv) {
        const ms = [...rt.matchAll(KVNR_IN_LINE_RE)];
        if (ms.length) row.push(["HEALTH_INSURANCE", ms[0]]);
      }
      if (tax) {
        const ms = [...rt.matchAll(TAXID_IN_LINE_RE)];
        if (ms.length) row.push(["TAX_ID", ms[0]]);
      }
      if (sv) {
        const ms = [...rt.matchAll(SVNR_IN_LINE_RE)];
        if (ms.length) row.push(["SV_ID", ms[0]]);
      }
      if (idPlan) {
        const m = inlineIdInRow(rt, idPlan);
        if (m) row.push([idPlan.cat, m]);
      }
      if (idDoc && !row.some(([c]) => c === "ID_CARD")) {
        const ms = [...rt.matchAll(GROUPED_DOC_ID_IN_LINE_RE)];
        if (ms.length === 1) row.push(["ID_CARD", ms[0]]);
      }
      if (row.length) {
        found.push([p, row]);
        miss = 0;
      } else if (++miss > (idPlan || tax || kv || sv ? 5 : 2)) break;
    }
    if (weakHeader) {
      const sig = (m) => String(m[1][0]).replace(/\d/g, "9").replace(/[A-Za-z]/g, "A");
      const idRows = found.filter(([, row]) => row.some(([c]) => c === idPlan.cat));
      const shapes = /* @__PURE__ */ new Map();
      for (const [, row] of idRows) {
        const m = row.find(([c]) => c === idPlan.cat);
        shapes.set(sig(m), (shapes.get(sig(m)) || 0) + 1);
      }
      if (![...shapes.values()].some((n2) => n2 >= 3)) continue;
    }
    if (found.length < 2 && !(found.length === 1 && found[0][1].length >= 2 && cols.length >= 2)) continue;
    ranges.push([lines[h][0], lines[h][0] + lines[h][1].length]);
    for (const [pl, row] of found) {
      const lead = lines[pl][1].length - lines[pl][1].trimStart().length;
      for (const [c, m] of row) hooks.pushCell(spans, c, lines[pl][0] + lead + m.index, m[0], null, null);
      consumed[pl] = true;
    }
    consumed[h] = true;
    h = p - 1;
  }
}

// ../extension/core/institution-names.js
var MEMBER_BEFORE_RE = new RegExp("(?:mitglied(?:schaft)?|member(?:ship)?|beitritt|aufnahme|beitrag|organisiert|getauft|angeh\xF6rig\\p{L}*|geh\xF6rt|geh\xF6ren)(?:[ \\t]+(?:der|in der|im|bei der|in die|zur|zum|of|of the|in the|in))?(?:[ \\t]+(?:local|\xF6rtlichen))?[ \\t:]*$", "iu");
var CHURCH_ADJ = "(?:(?:lutherische[rn]?|reformierte[rn]?|katholische[rn]?|evangelische[rn]?|methodistische[rn]?|freikirchliche[rn]?|orthodoxe[rn]?|apostolische[rn]?|Luth\\.|Ref\\.|Evang\\.|Kath\\.|Ev\\.)[ \\t]*)";
var CHURCH_NOUN = "(?:Kirchengemeinde|Kirchgemeinde|Kirchenkreis|Kirchenbezirk|Kirche|Pfarrei|Pfarramt|Pfarrgemeinde|Propstei|Dekanat|Landeskirche|Kita|Kindertagesst\xE4tte|Friedhof|Krankenhaus|Klinik|Klinikum|Schule|Grundschule|Gymnasium|Kindergarten|Hochschule|Universit\xE4t|Fachhochschule|Stiftung|Akademie|Verlag|Bank|Pflegedienst|Altenheim|Seniorenheim|Stift|Jugendwerk|Presse|Zentrum|Gemeindehaus|Diakonie|Bildungswerk|Familienbildung|Beratung)";
var CHURCH_AFTER_RE = new RegExp(`^(?:[ \\t]*[-\u2010][ \\t]*|[ \\t]+)?(?:${CHURCH_ADJ}[-\u2010]?[ \\t]*){0,3}${CHURCH_NOUN}(?![\\p{L}])`, "iu");
function religionInstitutionMention(text, start, end, anyCase = false) {
  const word = text.slice(start, end);
  const before = text.slice(Math.max(0, start - 40), start);
  const capital = anyCase || new RegExp("^\\p{Lu}", "u").test(word) || new RegExp("\\p{Lu}[\\p{L}.]*[-\u2010]$", "u").test(before);
  if (!capital) return false;
  if (MEMBER_BEFORE_RE.test(before)) return false;
  return CHURCH_AFTER_RE.test(text.slice(end, end + 70));
}
var UNION_INSTITUTION_AFTER_RE = /^(?:[ \t]*[·|–-][ \t]*)?[ \t]*(?:Verwaltungsstelle|Bezirksleitung|Bezirk|Vorstand|Geschäftsstelle|Zentrale|Landesbezirk|Hauptverwaltung|Mitgliederservice|Rechtsschutz)(?![\p{L}])|^[ \t-]*(?:Tarif|Haustarif|Flächentarif|ERA|Tarifvertrag|Tarifvertrags)(?![\p{L}])/iu;
var UNION_TARIFF_BEFORE_RE = /(?:Tarif(?:vertrag|vertrags|bindung|gruppe)?|Entgeltgruppe[ \t]+\S+|Tarifgebiet|Manteltarifvertrag|MTV)[ \t]*(?:der|des|für|nach|zwischen)?[ \t]*$/iu;
var LETTERHEAD_AFTER_RE = /^[ \t]*[·|][ \t]*\S/u;
function affiliationInstitutionMention(text, start, end) {
  const before = text.slice(Math.max(0, start - 40), start);
  if (MEMBER_BEFORE_RE.test(before)) return false;
  return UNION_INSTITUTION_AFTER_RE.test(text.slice(end, end + 40)) || UNION_TARIFF_BEFORE_RE.test(before) || LETTERHEAD_AFTER_RE.test(text.slice(end, end + 12));
}
var HEALTH_PROVIDER_BEFORE_RE = new RegExp("(?:(?:praxis|klinik|klinikum|zentrum|institut|abteilung|fach\xE4rzt\\p{L}*|facharzt|ambulanz|schule|verband|gesellschaft|verein|gutachterverfahren|leistungsmanagement|akademie|stiftung|richtlinien?)[ \\t]+(?:f\xFCr|der|des|fuer|und|&|zur|zum)[ \\t]+(?:[\\p{L}-]+[ \\t]+(?:und|&)[ \\t]+)?|(?:gutachter\\p{L}*|\xE4rztekammer|psychotherapeutenkammer)[ \\t]+|(?:praxis|physiopraxis)[ \\t]+(?:\\p{Lu}[\\p{L}.-]*[ \\t]+){1,2})$", "iu");
var HEALTH_PROVIDER_AFTER_RE = /^(?:[- ]?(?:praxis|richtlinie|zentrum|team|gruppe|angebot|ambulanz|leistungen|leistung|kosten|abrechnung|verordnung|verband|gmbh|ag|ltd|e\.?[ \t]?v\b)(?![\p{L}])|[ \t]+(?:Praxis|Zentrum|Team|GmbH|AG|Ltd)\b)/iu;
function healthProviderMention(text, start, end) {
  return HEALTH_PROVIDER_BEFORE_RE.test(text.slice(Math.max(0, start - 60), start)) || HEALTH_PROVIDER_AFTER_RE.test(text.slice(end, end + 20));
}

// ../extension/core/recognizers.js
var Wd = "0-9A-Za-z\xC0-\xD6\xD8-\xF6\xF8-\xFF\u0100-\u024F\u1E00-\u1EFF\uFB00-\uFB06_";
var BL = `(?<![${Wd}])`;
var BR = `(?![${Wd}])`;
var HS = "[^\\S\\r\\n]";
var CAP = "A-Z\xC0-\xD6\xD8-\xDE\\u0100-\\u024F\\u1E00-\\u1EFF\\u0300-\\u036F";
var LOW = "a-z\xDF-\xF6\xF8-\xFF\\u0100-\\u024F\\u1E00-\\u1EFF\\u0300-\\u036F";
function ibanIsValid(candidate) {
  const s = candidate.replace(/\s+/g, "").toUpperCase();
  if (s.length < 15 || !/^[A-Z]{2}/.test(s) || !/^\d{2}/.test(s.slice(2, 4))) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let digits = "";
  for (const ch of rearranged) {
    if (/[A-Z]/.test(ch)) digits += (ch.charCodeAt(0) - 55).toString();
    else if (/[0-9]/.test(ch)) digits += ch;
    else return false;
  }
  return mod97(digits) === 1;
}
function mod97(digits) {
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97;
  return rem;
}
function bicIsValid(candidate) {
  const s = candidate.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s);
}
function mod11_10CheckDigit(tenDigits) {
  let product = 10;
  for (const ch of tenDigits) {
    let s = (Number(ch) + product) % 10;
    if (s === 0) s = 10;
    product = s * 2 % 11;
  }
  return (11 - product) % 10;
}
function taxIdIsValid(candidate) {
  const digits = candidate.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (digits[0] === "0") return false;
  const first10 = digits.slice(0, 10);
  const counts = {};
  for (const c of first10) counts[c] = (counts[c] || 0) + 1;
  const repeated = Object.entries(counts).filter(([, n]) => n >= 2);
  if (repeated.length !== 1) return false;
  const [rd, rn] = repeated[0];
  if (rn > 3) return false;
  if (rn === 3) {
    if (first10.includes(rd + rd + rd)) return false;
  }
  return mod11_10CheckDigit(first10) === Number(digits[10]);
}
function steuernummerIsValid() {
  return false;
}
function vatIsValid(candidate) {
  const s = candidate.replace(/\s+/g, "").toUpperCase();
  if (!/^DE\d{9}$/.test(s)) return false;
  const body = s.slice(2);
  return mod11_10CheckDigit(body.slice(0, 8)) === Number(body[8]);
}
var ISO_3166_1_ALPHA2 = new Set("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" "));
function isinIsValid(candidate) {
  const s = candidate.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(s)) return false;
  if (!ISO_3166_1_ALPHA2.has(s.slice(0, 2))) return false;
  let digits = "";
  for (const c of s.slice(0, -1)) digits += parseInt(c, 36).toString();
  let total = 0;
  let alt = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
    alt = !alt;
  }
  return (10 - total % 10) % 10 === Number(s[s.length - 1]);
}
function luhnIsValid(candidate) {
  const digits = candidate.replace(/\D/g, "");
  let total = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
    alt = !alt;
  }
  return digits.length >= 13 && total % 10 === 0;
}
var rx = (src, flags = "") => new RegExp(src, flags.includes("g") ? flags : flags + "g");
var IBAN_RE = rx(`${BL}[A-Z]{2} ?\\d{2}(?: ?[A-Z0-9]){11,30}${BR}`);
var IBAN_HYPHEN_RE = rx(`${BL}[A-Z]{2}\\d{2}(?:-[A-Z0-9]{4}){3,7}(?:-[A-Z0-9]{1,4})?${BR}`);
var BIC_RE = rx(`${BL}[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?${BR}`);
var NINO_SPACED_RE = rx(`${BL}[A-Z]{2}[ ]\\d{2}[ ]\\d{2}[ ]\\d{2}[ ][A-D]${BR}`);
var WRAP_SEP = "(?:[ ]|[ \\t]*\\r?\\n[ \\t]*)";
var TAX_ID_WRAPPED_RE = rx(`${BL}\\d{2}${WRAP_SEP}\\d{3}${WRAP_SEP}\\d{3}${WRAP_SEP}\\d{3}${BR}`);
var VAT_WRAPPED_RE = rx(`${BL}DE${WRAP_SEP}?\\d{3}${WRAP_SEP}\\d{3}${WRAP_SEP}\\d{3}${BR}`);
var EU_VAT_WRAPPED_RE = rx(`${BL}([A-Z]{2})${WRAP_SEP}?(\\d{1,4}(?:${WRAP_SEP}\\d{1,4}){1,5})${BR}`);
var TAX_ID_RE = rx(`${BL}\\d{2} ?\\d{3} ?\\d{3} ?\\d{3}${BR}`);
var TAX_ID_SHORT_RE = rx(`${BL}\\d{2} ?\\d{3} ?\\d{3} ?\\d{2}${BR}`);
var UTR_RE = rx(`${BL}(?:\\d{4}[ ]\\d{3}[ ]\\d{3}|\\d{5}[ ]?\\d{5})${BR}`);
var STEUERNUMMER_RE = rx(`${BL}(?:\\d{1,4}\\s*/\\s*\\d{3,5}\\s*/\\s*\\d{3,5}|\\d{5}/\\d{4,5})${BR}`);
var VAT_RE = rx(`${BL}DE[ ]?\\d(?:[ ]?\\d){8}${BR}`);
var EU_VAT_COUNTRIES = new Set(
  "AT BE BG CY CZ DE DK EE EL ES FI FR GB HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK XI".split(" ")
);
var EU_VAT_RE = rx(`${BL}([A-Z]{2})[ ]?([A-Z0-9]{8,12})${BR}`);
var EU_VAT_SPACED_RE = rx(`${BL}([A-Z]{2})[ ]?(\\d{1,4}(?:[ ]\\d{1,4}){1,5})${BR}`);
var SV_RE = rx(`${BL}\\d{2}(?:\\s?\\d{6}|\\s?\\d{3}\\s?\\d{3})\\s?[A-Z]\\s?\\d{3}(?:\\s?\\d)?${BR}`);
var REG_RE = rx(`${BL}HR[AB]\\s?\\d{1,6}${BR}`);
var COURT_FILE_UNIT_EXCLUDE = "(?!(?:Stk|St|St\xFCck|Pck|Pos)\\.?(?:[ \\t]|/|$))";
var COURT_FILE_RE = rx(
  `${BL}\\d{1,3}\\s+${COURT_FILE_UNIT_EXCLUDE}[A-Z\xC4\xD6\xDC][A-Za-z\xC4\xD6\xDC\xDF]{0,5}\\.?(?:\\s+\\d{1,6}\\s+${COURT_FILE_UNIT_EXCLUDE}[A-Z\xC4\xD6\xDC][A-Za-z\xC4\xD6\xDC\xDF]{0,5}\\.?)?\\s+\\d{1,6}/\\d{2,4}${BR}|${BL}\\d{4}/[A-Za-z\xC4\xD6\xDC\xDF]{2,8}/\\d{1,6}(?:-[A-Z\xC4\xD6\xDC][a-z\xE4\xF6\xFC\xDF]+)?${BR}`
);
var CASE_BARE_RE = rx(`${BL}case[ \\t]+([A-Z][A-Z0-9-]*\\d[A-Z0-9-]*)${BR}`);
function isSignificantCaseToken(token) {
  if (token.length >= 5) return true;
  if (token.includes("-")) return true;
  const digitCount = (token.match(/\d/g) || []).length;
  return digitCount >= 2;
}
var PERSON_RECORD_SHORT_RE = rx(
  `(?:personalnummer|personal-?nr|pers\\.?-?nr|fahrer-?nr|fahrer-?id|fahrernummer|mitarbeiternummer|stammnummer|stamm-?nr|emp\\.? ?no|employee (?:no|number|id)|patient(?:en)?-?(?:nr|nummer)|mitglieds?-?(?:nr|nummer)|matrikel-?(?:nr|nummer)|kunden-?(?:nr|nummer)|probanden-?(?:nr|nummer)|sch\xFCler-?(?:nr|nummer))\\.?[ \\t]*:?[ \\t]*(?<num>\\d{3,4})(?![\\d.,/:\\-]\\d)${BR}`,
  "i"
);
var GROUPED_ID_RE = rx(`(?<![\\d.,/-])\\d{1,5}(?:[ ]\\d{1,5}){2,4}(?![\\d]|[.,/-]\\d)`);
var RECORD_ROOTS = "stamm|kunden?|kunde|mandanten?|mandats?|mandant|mitglieds?|mitglied|sch\xFCler|schueler|studenten?|student|matrikel|personal|mitarbeiter|besch\xE4ftigten|versicherten|versicherungs|versicherung|vertrags?|miet|mietvertrags?|darlehens|kredit|antrags?|fall|vorgangs?|akten|aktenzeichen|schadens?|schaden|leistungs|bearbeitungs|aufnahme|einweisungs|patienten?|patient|pathologie|histologie|labor|befund|rezept|verordnungs|\xFCberweisungs|teilnehmer|probanden?|proband|bewerber|bewerbungs|fahrer|gast|reservierungs|buchungs|depot|ausweis|personalausweis|reisepass|pass|f\xFChrerschein|fuehrerschein|steuer|sozialversicherungs|renten|kranken|krankenversicherten|krankenkassen|pflege|bedarfsgemeinschafts|melde|kassen|abo|abonnenten|leser|beitrags|policen|police|bausparvertrags?|vermittler|lieferanten|debitoren|kreditoren|kandidaten|leasingvertrags?|ansprechpartner|employee|customer|client|member|student|patient|account|policy|claim|case|booking|reservation|passport|licen[cs]e|insurance|payroll|matriculation|contract|subscriber|applicant|candidate|participant|driver|guest|tenant|membership|loyalty";
var RECORD_NR_RE = rx(
  `${BL}(?:${RECORD_ROOTS})(?:s|n|en)?[ \\t]?-?[ \\t]?(?:nr|nummer|no|number|id|kennung|ref|referenz|zeichen)\\.?[ \\t]*[:#]?[ \\t]*(?<tok>[A-Z]{1,6}[- ]?\\d[\\dA-Z/\\-.]{1,19}[\\dA-Z]|\\d{2,6}[-/]\\d{1,8}(?:[-/][A-Z0-9]+)?|\\d{5,12})${BR}`,
  "i"
);
var CREDIT_CARD_RE = rx(`${BL}(?:\\d[ -]?){13,19}${BR}`);
var ACCOUNT_RE = rx(`${BL}\\d{6,10}${BR}`);
var BLZ_RE = rx(`${BL}\\d{8}${BR}`);
var PSEP = "[^\\S\\r\\n]{0,2}[/.\\-]?[^\\S\\r\\n]{0,2}";
var PHONE_INTL_OPEN = `(?:\\+|00)\\d{1,3}${PSEP}(?:\\(0\\)${PSEP})?\\(?\\d{1,5}\\)?`;
var PHONE_NAT_OPEN = `\\(?0\\d{2,4}\\)?`;
var PHONE_RE = rx(
  `${BL}(?:${PHONE_INTL_OPEN}|${PHONE_NAT_OPEN})${PSEP}\\d{2,}(?:${PSEP}\\d+)*`
);
var PHONE_WRAP_RE = rx(
  `${BL}(?:${PHONE_INTL_OPEN}|${PHONE_NAT_OPEN})(?:[^\\S\\r\\n]{0,2}[/\\-])?[^\\S\\r\\n]*\\r?\\n[^\\S\\r\\n]*[1-9]\\d+(?:${PSEP}\\d+)*${BR}`
);
var PHONE_WRAP_LABEL_RE = /(?:tel(?:efon|\.)?|mobil(?:e|funk)?|handy|fax|fon\b|phone|durchwahl|rufnummer|erreichbar|unter|anrufen|rückruf|whatsapp|call)[^\n]{0,80}$|\d[^\n]{0,6}[·|;,/][^\S\r\n]*$/i;
var PLAIN_PHONE_RE = rx(`(?:phone|telefon|tel\\.?|mobil|handy|cell|mobile|fax|rufnummer)[^\\n\\d]{0,45}(?<num>\\d{10,11})${BR}`, "i");
var NANP_PHONE_RE = rx(
  `${BL}(?:1[\\s.\\-])?\\(?[2-9]\\d{2}\\)?[\\s.\\-][^\\S\\r\\n]?[2-9]\\d{2}[\\s.\\-]\\d{4}${BR}`
);
var PHONE_WORD_TOKEN = "(?:null|eins|zwei|drei|vier|f\xFCnf|fuenf|sechs|sieben|acht|neun|\\d{1,3})";
var OBFUSCATED_PHONE_RE = rx(
  `${BL}(?:telefon(?:isch)?|tel\\.?|handy|mobil(?:nummer)?|rufnummer)\\s*:?\\s*(${PHONE_WORD_TOKEN}(?:[ \\t/\\-]+${PHONE_WORD_TOKEN}){4,})${BR}`,
  "i"
);
var CREDENTIAL_LABELS = `verifizierungscode|verifikationscode|verifizierungsnummer|verifikationsnummer|best(?:\xE4|ae)tigungscode|best(?:\xE4|ae)tigungsnummer|sicherheitscode|sicherheitsschl(?:\xFC|ue)ssel|pr(?:\xFC|ue)fcode|pr(?:\xFC|ue)fnummer|pr(?:\xFC|ue)fziffer|aktivierungscode|freischaltcode|zugangscode|zugangsschl(?:\xFC|ue)ssel|einmalpasswort|einmal-passwort|einmalkennwort|einmal-?pin|photo-?tan|m-?tan|i-?tan|tan|geheimzahl|kennwort|passwort|lizenzschl(?:\xFC|ue)ssel|produktschl(?:\xFC|ue)ssel|verification code|confirmation code|confirmation number|security code|access code|activation code|one-?time (?:password|passcode|code)|otp|passcode|pass code|2fa code|two-factor code|recovery code|backup code|backup codes|authentication code|login code|sms code|api key|access token|licence key|license key|product key|activation key`;
var CREDENTIAL_VALUE = `(?:[A-Za-z0-9][A-Za-z0-9\\-]{2,}|\\d(?:[ \\t]\\d){3,}|\\d{2,4}(?:[ \\t]\\d{2,4}){1,4})`;
var CREDENTIAL_RE = rx(
  // Real sentences put words between the label and its colon — a gloss ("Einmalpasswort (OTP):"),
  // a qualifier ("Ihr Verifizierungscode fuer die Anmeldung lautet:"), a scope ("access code for
  // the portal is:"). The run is bounded, lazy and may not contain a colon of its own, so it stops
  // at this label's separator and can never reach the next line's.
  // The run between the label and its separator may cross ONE line break, because a parenthetical
  // wraps ("Your account recovery code (keep this safe in case you lose access to your\nemail):").
  // It is bounded at 60 characters and may not contain a separator of its own, so it cannot reach
  // past the label it belongs to.
  `${BL}(?:${CREDENTIAL_LABELS})${BR}[^:=]{0,60}?(?:[:=]|${BL}(?:is|ist|lautet|reads|lautet)${BR})[^\\S\\r\\n]*(?:\\r?\\n[^\\S\\r\\n]*){0,2}(?:<[^>\\r\\n]{1,24}>[^\\S\\r\\n]*)*(${CREDENTIAL_VALUE})${BR}`,
  "i"
);
var ACCESS_CODE_RE = rx(
  `${BL}(?:schl(?:\xFC|ue)ssel(?:box|tresor|safe|kasten)|tresorcode|t(?:\xFC|ue)r-?code|t(?:\xFC|ue)r-?pin|haust(?:\xFC|ue)r-?code|alarm-?(?:code|pin)|schlie(?:\xDF|ss)fach-?code|zahlenschloss|key-?safe|key-?box|lockbox|door code|entry code|gate code|alarm code|safe code|keypad code)${BR}(?:[ \\t]+(?:code|pin))?[ \\t]*[:=]?[ \\t]*((?=[A-Za-z0-9]*\\d)[A-Za-z0-9]{3,10})${BR}`,
  "i"
);
var SECRET_PREFIXES = /* @__PURE__ */ new Set([
  "sess",
  "session",
  "sid",
  "tok",
  "token",
  "tkn",
  "sk",
  "pk",
  "rk",
  "api",
  "apikey",
  "key",
  "secret",
  "live",
  "auth",
  "bearer",
  "refresh",
  "access",
  "ghp",
  "gho",
  "ghs",
  "ghu",
  "ghr",
  "glpat",
  "pat",
  "jwt",
  "oauth",
  "client"
]);
var SECRET_PREFIXED_RE = /(?<![A-Za-z0-9_])((?:[A-Za-z]{2,8}_){1,3})([A-Za-z0-9]{4,})(?![A-Za-z0-9_])/g;
var JWT_RE = /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}(?![A-Za-z0-9_-])/g;
var AWS_KEY_RE = /(?<![A-Za-z0-9])(?:AKIA|ASIA)[0-9A-Z]{16}(?![A-Za-z0-9])/g;
var SLACK_TOKEN_RE = /(?<![A-Za-z0-9])xox[abprs]-[A-Za-z0-9-]{10,}(?![A-Za-z0-9-])/g;
var BEARER_RE = /(?<![A-Za-z])Bearer[ \t]+([A-Za-z0-9._~+/=-]{12,})/g;
var BARE_CODE_LINE_RE = /^[^\S\r\n]*(?:[-*•][^\S\r\n]*)?([A-Za-z0-9][A-Za-z0-9-]{3,})[^\S\r\n]*$/;
function codeBlockFrom(text, from, spans) {
  let pos = from;
  for (let i = 0; i < 12; i++) {
    const nl = text.indexOf("\n", pos);
    if (nl < 0) return;
    let end = text.indexOf("\n", nl + 1);
    if (end < 0) end = text.length;
    const line = text.slice(nl + 1, end);
    const m = BARE_CODE_LINE_RE.exec(line);
    if (!m || !/\d/.test(m[1])) return;
    const start = nl + 1 + line.indexOf(m[1]);
    add(spans, start, start + m[1].length, m[1], "CREDENTIAL", 0.85);
    pos = end;
  }
}
var CUSTOMER_RE = rx(`${BL}[A-Z0-9][A-Z0-9\\-/.]{3,}[A-Z0-9]${BR}`, "i");
var USER_HANDLE_RE = rx(
  `${BL}(?:benutzername|nutzername|username|login(?:[- ]?name)?)(?:[ \\t]*(?::|=)[ \\t]*|[ \\t]+ist[ \\t]+)([A-Z0-9][A-Z0-9._-]{2,63})${BR}`,
  "i"
);
var LOG_HANDLE_RE = rx(
  `(?:(?:Accepted|Failed)[ \\t]+(?:publickey|password|keyboard-interactive/pam)[ \\t]+for[ \\t]+(?:invalid[ \\t]+user[ \\t]+)?|session[ \\t]+(?:opened|closed)[ \\t]+for[ \\t]+user[ \\t]+\\S+[ \\t]+by[ \\t]+|\\buid=|\\buser=|\\bby[ \\t]+user[ \\t]+)(?<h>[A-Za-z\xC0-\u024F][A-Za-z0-9\xC0-\u024F._-]{2,40})`
);
var HANDLE_CUE_RE = /(?<![\p{L}])(?:Benutzer(?:in)?|Benutzerkonto|Besucher-Account|Account|Konto|Reset für|Passwort-Reset für|Kennung|by=|DB_USER=|login=)[ \t]*([A-Za-z\u00E0-\u00FF][A-Za-z0-9\u00E0-\u00FF._-]{3,30})(?![\p{L}\p{N}._@-])/gu;
function handleReadsAsName(h, text) {
  if (/[._\d]/.test(h)) return true;
  const core = h.slice(1, 6);
  if (core.length < 4) return false;
  const re = new RegExp(`(?<![\\p{L}])[A-Z\xC0-\xD6\xD8-\xDE]${core.slice(1).split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[ -]?").join("")}`, "iu");
  const m = re.exec(text);
  return !!m && m[0][0].toLowerCase() === core[0] && m[0][0] !== m[0][0].toLowerCase();
}
var SYSTEM_HANDLE_RE = /^(?:root|admin|administrator|nobody|daemon|system|service|guest|sshd|www-data|postgres|oracle|backup|svc[-_.].*|srv[-_.].*|sys[-_.].*|jenkins|git|ubuntu|ec2-user|test|user)$/i;
var CUSTOMER_PREFIX_RE = rx(`${BL}(?:KDN|KND|KD|PN)-\\d{4,}${BR}`, "i");
var NAME_PARTICLE = `(?:[${CAP}${LOW}]['\u2019])?`;
var NAME_GAP = `[ ]`;
var NAME = `${NAME_PARTICLE}[${CAP}][${LOW}]+(?:[-'\u2019][${CAP}][${LOW}]+)?(?:${NAME_GAP}+(?:von|van|de|der|zu|den|zum|del|di|la)${BR}){0,2}(?:${NAME_GAP}+${NAME_PARTICLE}[${CAP}][${LOW}]+(?:[-'\u2019][${CAP}][${LOW}]+)?){0,2}`;
var TITLE = `(?:Herrn?|Frau|Fr\xE4ulein|Hr\\.|Fr\\.|Dr\\.|Prof\\.|Dipl\\.-?[A-Za-z\xE4\xF6\xFC\\u0300-\\u036F]*|Mag\\.|Ing\\.)`;
var SALUTATION_RE = rx(`${BL}${TITLE}(?:${HS}+${TITLE})*${HS}+(${NAME})`);
var NAME_LABELS = [
  "Anleger",
  "Anlegerin",
  "Name",
  "Vorname",
  "Nachname",
  "Familienname",
  "Geburtsname",
  "Zeichner",
  "Zeichnerin",
  "Kunde",
  "Kundin",
  "Vertragspartner",
  "Vertragspartnerin",
  "Gesch\xE4ftsf\xFChrer",
  "Gesch\xE4ftsf\xFChrerin",
  "Antragsteller",
  "Antragstellerin",
  "Beg\xFCnstigter",
  "Beg\xFCnstigte",
  "Bevollm\xE4chtigter",
  "Bevollm\xE4chtigte",
  "Kontoinhaber",
  "Kontoinhaberin",
  "Zeichnungsberechtigter",
  "Inhaber",
  "Gesellschafter",
  "Darlehensgeber",
  "Darlehensnehmer",
  "Mandant",
  "Mandantin",
  "Empf\xE4nger",
  "Auftraggeber",
  "Zahlungsempf\xE4nger",
  "Zahlungspflichtiger",
  "Versicherungsnehmer",
  "Versicherte",
  "B\xFCrge",
  "Vollmachtgeber",
  "Erblasser",
  // English name labels (NER also catches these; this is a high-precision backup)
  "Full name",
  "First name",
  "Last name",
  "Surname",
  "Applicant",
  "Customer",
  "Client",
  "Beneficiary",
  "Account holder",
  "Cardholder",
  "Policyholder",
  "Tenant",
  "Landlord",
  "Employee",
  "Employer",
  "Patient",
  "Guarantor",
  "Signatory",
  "Recipient",
  "Contact",
  "Borrower",
  "Lender",
  "Insured",
  "Trustee",
  "Witness",
  // Party roles a letter or a court document puts in front of the name.
  "Beschuldigter",
  "Beschuldigte",
  "Angeklagter",
  "Angeklagte",
  "Kl\xE4ger",
  "Kl\xE4gerin",
  "Beklagter",
  "Beklagte",
  "Betroffener",
  "Betroffene",
  "Patientin"
];
var LABEL_NAME_RE = rx(`${BL}(?:${NAME_LABELS.join("|")})${BR}(${HS}*:${HS}*|${HS}+)(${NAME})`);
var LABEL_NAME_CAPS_RE = rx(
  `${BL}(?:${NAME_LABELS.join("|")})${BR}${HS}*:${HS}*([${CAP}][${CAP}]+(?:-[${CAP}]+)?(?:${HS}+[${CAP}][${CAP}]+(?:-[${CAP}]+)?){0,2})${BR}`,
  "i"
);
var LEGAL_FORMS = [
  "AG",
  "GmbH",
  "mbH",
  "gGmbH",
  "UG",
  "KG",
  "KGaA",
  "OHG",
  "GbR",
  "SE",
  "PartG",
  "PartmbB",
  "Co",
  "Ltd",
  "Inc"
];
var ORG_HEAD_WORDS = [
  ...LEGAL_FORMS,
  "eG",
  "eV",
  "AB",
  "AS",
  "ApS",
  "Oy",
  "NV",
  "BV",
  "SA",
  "SAS",
  "SARL",
  "SpA",
  "PLC",
  "LLC",
  "LLP",
  "Corp",
  "Corporation",
  "Company",
  "Praxis",
  "Gemeinschaftspraxis",
  "Kanzlei",
  "Klinik",
  "Klinikum",
  "Krankenhaus",
  "Apotheke",
  "Institut",
  "Agentur",
  "Verlag",
  "Stiftung",
  "Verein",
  "Genossenschaft",
  "Sparkasse",
  "Bank",
  "Versicherung",
  "Amtsgericht",
  "Landgericht",
  "Finanzamt",
  "Beh\xF6rde",
  "Universit\xE4t",
  "Hochschule",
  "Schule",
  "Hotel",
  "Restaurant",
  "Redaktion",
  "Vertrieb",
  "Zentrale",
  // A homeowners' association is never one natural person's own business (r6-prec). NOT
  // "Hausverwaltung", "Pflegekasse", "Krankenkasse": a wrapped sentence that starts on them
  // ("Hausverwaltung speichert die Kontaktdaten … der Mieterin") would read as a letterhead.
  "Wohnungseigent\xFCmergemeinschaft",
  "Eigent\xFCmergemeinschaft"
];
var ORG_HEAD_RE = new RegExp(
  `(?:^|[\\s(])(?:${ORG_HEAD_WORDS.join("|")})\\.?(?:${BR})`,
  "i"
);
var ORG_HEAD_NOUNS = ORG_HEAD_WORDS.filter((w) => w.length >= 5);
var ORG_HEAD_COMPOUND_RE = new RegExp(
  `(?:^|[\\s(])[${CAP}${LOW}]{2,}(?:${ORG_HEAD_NOUNS.join("|")})\\.?(?:${BR})`,
  "i"
);
var ORG_HEAD_FIRST_RE = new RegExp(
  `^(?:[\\s\\-*\u2022]|<[a-z][a-z0-9]*>)*[${CAP}${LOW}]{0,20}(?:${ORG_HEAD_NOUNS.join("|")})\\.?(?:${BR})`,
  "i"
);
function lineLedByOrgHead(line) {
  return ORG_HEAD_FIRST_RE.test(line.trim());
}
var INSTITUTION_HEAD_RE = new RegExp(
  `(?:Amtsgericht|Landgericht|Oberlandesgericht|Verwaltungsgericht|Sozialgericht|Arbeitsgericht|Finanzgericht|Bundesgerichtshof|Bundesverfassungsgericht|Staatsanwaltschaft|Finanzamt|Jobcenter|Bundesamt|Landesamt|Ordnungsamt|Standesamt|Jugendamt|Sozialamt|Gesundheitsamt|Einwohnermeldeamt|Stadtverwaltung|Gemeindeverwaltung|Kreisverwaltung|Polizeipr\xE4sidium|Polizeiinspektion|Polizeidirektion|Ministerium|Senatsverwaltung|Rathaus|B\xFCrgeramt|Institut|Klinikum|Klinik|Krankenhaus|Universit\xE4t|Hochschule|Akademie|Fakult\xE4t|Gesellschaft|Stiftung|Zentrum|Verband|Kammer|Notariat|Kanzlei|Bibliothek|Museum)(?:e?[ns]|en)?${BR}`,
  "i"
);
var ORG_SOFT_LINE_MAX = 60;
function lineNamesOrganisation(line) {
  const t = line.trim();
  if (!t) return false;
  if (INSTITUTION_HEAD_RE.test(t) || COMPANY_TAIL_RE.test(t) || COMPANY_ANYWHERE_RE.test(t)) return true;
  return t.length <= ORG_SOFT_LINE_MAX && (ORG_HEAD_RE.test(t) || ORG_HEAD_COMPOUND_RE.test(t));
}
var PERSON_TITLE_WORDS = [
  "Dr\\.?",
  "Prof\\.?",
  "med\\.?",
  "RA",
  "Rechtsanwalt",
  "Rechtsanw\xE4ltin",
  "Rechtsanwaltin",
  "Steuerberater",
  "Steuerberaterin",
  "Notar",
  "Notarin",
  "Zahnarzt",
  "Zahn\xE4rztin",
  "Zahnaerztin",
  "Facharzt",
  "Fach\xE4rztin",
  "Fachaerztin"
];
var PERSON_TITLE_NAME_RE = new RegExp(
  // eslint-disable-next-line no-misleading-character-class -- deliberate: Unicode combining-diacritic range for accented names, not a bug
  `${BL}(?:${PERSON_TITLE_WORDS.join("|")})${HS}+(?:(?:${PERSON_TITLE_WORDS.join("|")})${HS}+)*(?:${NAME})`,
  "u"
);
function lineHasPersonTitleName(line) {
  return PERSON_TITLE_NAME_RE.test(line);
}
function personSpanNearby(text, start, spans) {
  if (!spans || !spans.length) return false;
  const lineFrom = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineToIdx = text.indexOf("\n", start);
  const lineEnd = lineToIdx === -1 ? text.length : lineToIdx;
  let prevFrom = -1;
  let prevEnd = -1;
  if (lineFrom > 0) {
    const prevLineEnd = lineFrom - 1;
    const prevLineStart = text.lastIndexOf("\n", prevLineEnd - 1) + 1;
    if (text.slice(prevLineStart, prevLineEnd).trim()) {
      prevFrom = prevLineStart;
      prevEnd = prevLineEnd;
    }
  }
  for (const s of spans) {
    if (s.category !== "PERSON") continue;
    if (s.start >= lineFrom && s.start < lineEnd) return true;
    if (prevFrom >= 0 && s.start >= prevFrom && s.start < prevEnd) return true;
  }
  return false;
}
var PERSONAL_OWNER_BEFORE_RE = new RegExp("(?:(?<![\\p{L}])(?:wohnhaft|wohnort|wohnsitz|wohnt|privat)(?![\\p{L}])|mein(?:e|em|er)?\\s+(?:telefon|handy|mobil|adresse|anschrift|nummer|rufnummer|iban|konto)|my\\s+(?:phone|mobile|cell|address|number|iban)|residing|home\\s+address|(?<![\\p{L}])(?:seine|ihre|deren|dessen)\\s+(?:mobil|handy|telefon|rufnummer)\\p{L}*|(?<![\\p{L}])(?:mobil|handy)(?:nummer)?(?![\\p{L}])|konto\\s+(?:des|der)\\s+(?:mandant|verk\xE4ufer|k\xE4ufer|mieter|vermieter|kunde|kundin|versicherungsnehmer|kontoinhaber|arbeitnehmer|patient|antragsteller)\\p{L}*[^\\n]{0,20}iban|auszahlung[^\\n]{0,30}iban|geb(?:oren|\\.)(?:\\s+am)?\\s+\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}[^\\n]{0,50}(?:telefon|tel\\.|mobil|wohnhaft|anschrift)?)[^\\n]{0,20}$", "iu");
function personalOwnerBefore(text, start, end = start) {
  const from = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  if (PERSONAL_OWNER_BEFORE_RE.test(text.slice(Math.max(from, start - 90), start))) return true;
  return /^[ \t]*\((?:privat|mobil|handy|private|home|mobile)(?![\p{L}])/iu.test(text.slice(end, end + 20));
}
var SOLE_TRADER_MARK_RE = new RegExp("(?:^|[^\\p{L}])(?:e\\.[^\\S\\n]?K(?:fm|fr)?\\.|Inh\\.|Inhaber(?:in)?|GbR|Einzelunternehm\\p{L}*|Einzelfirma|[Ff]reiberufl\\p{L}*|[Ff]reelancer?|Praxis|Kanzlei|Rechtsanw(?:alt|\xE4ltin|\xE4lte)|Steuerberater(?:in)?|Notar(?:in|iats?)?|Psychotherapeut(?:in)?|Physiotherap\\p{L}*|Heilprakti\\p{L}*|Hebamme|Tierarzt|Tier\xE4rztin|Zahnarzt|Zahn\xE4rztin|Ergotherap\\p{L}*|Logop\xE4d\\p{L}*|Architekt(?:in|en)?|Sachverst\xE4ndige[rn]?|Dolmetscher(?:in)?|\xDCbersetzer(?:in)?|Fotograf(?:in)?|Meisterbetrieb|(?:Maler|Elektro|Sanit\xE4r|Heizungsbau|Dachdecker|Tischler|Schreiner|Friseur|B\xE4cker|Fleischer|Kfz|Installateur|Zimmerer|Metallbau|Fliesenleger|Maurer|Glaser|Schlosser)\\p{L}*meister(?:in)?)(?![\\p{L}])", "u");
var CAPITAL_OR_INSTITUTION_RE = /(?:^|[^\p{L}])(?:GmbH|gGmbH|AG|UG|eG|SE|Ltd|Inc|LLC|mbH|KGaA|e\.[^\S\n]?V\.|Klinikum|Klinik|Krankenhaus|Universität|Hochschule|Amt|Gericht|Behörde|Stadt|Gemeinde|Landkreis|Kasse|Bank|Sparkasse|Versicherung|MVZ|Kirchen?gemeinde|Pfarrei|Pfarrgemeinde|Gewerkschaft|IG[^\S\n]Metall)(?![\p{L}])/u;
var LEGAL_FORM_RE = /(?:^|[^\p{L}])(?:GmbH|gGmbH|UG|AG|KG|oHG|OHG|KGaA|SE|eG|mbH)(?![\p{L}])/u;
var REGISTER_COURT_RE = new RegExp("(?<![\\p{L}])(?:AG|Amtsgericht)[^\\S\\n]+\\p{Lu}[\\p{L}-]*", "gu");
function soleTraderContext(text, start) {
  const ls = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const le = text.indexOf("\n", start);
  let scope = text.slice(ls, le === -1 ? text.length : le);
  if (/^[^\S\n]*$/.test(text.slice(ls, start)) && ls > 0) {
    let ps = ls;
    for (let k = 0; k < 2 && ps > 0; k++) ps = text.lastIndexOf("\n", ps - 2) + 1;
    scope = text.slice(ps, ls) + scope;
  }
  return SOLE_TRADER_MARK_RE.test(scope) && !CAPITAL_OR_INSTITUTION_RE.test(scope);
}
var ORG_ADDR_SEG_SPLIT_RE = /[,·|]|[^\S\n][-–][^\S\n]/u;
var ORG_ADDR_ROLE_OF_RE = /^(?:Geschäftsführer|Geschäftsführerin|Inhaber|Inhaberin|Vorstand|Vorständin|Prokurist|Prokuristin|Direktor|Direktorin|Leiter|Leiterin|Managing[^\S\n]+Director|Director|CEO|Chairman)[^\S\n]+(?:der|des|von|bei|of|at)[^\S\n]/iu;
var ORG_ADDR_NEW_PARTY_RE = new RegExp("(?:^|[^\\p{L}])(?:und|sowie|and|gegen|against|wohnhaft|wohnt|geboren|geb\\.|Mandant\\p{L}*|Kl\xE4ger\\p{L}*|Beklagte\\p{L}*|Antragsteller\\p{L}*)(?![\\p{L}])", "iu");
var PUBLIC_BODY_SEG_RE = new RegExp("(?:^|[^\\p{L}])(?:Stadt|Gemeinde|Landkreis|Kreis|Hansestadt|Landeshauptstadt|Bezirksamt|Samtgemeinde|Verbandsgemeinde|Amt|Freistaat|Bundesland|Land)[^\\S\\n]+\\p{Lu}[\\p{L}.-]*(?:[^\\S\\n]+(?:an[^\\S\\n]+der[^\\S\\n]+|am[^\\S\\n]+|im[^\\S\\n]+)?\\p{Lu}[\\p{L}.()-]*)*$", "u");
var REPRESENTATIVE_CUE_RE = new RegExp("(?:vertreten[^\\S\\n]+(?:durch|von)|represented[^\\S\\n]+by|handelnd[^\\S\\n]+durch|Gesch[\xE4a]e?ftsf(?:\xFC|ue)hr\\p{L}*|Vorstand|Prokurist\\p{L}*|Managing[^\\S\\n]+Directors?|z\\.?[^\\S\\n]?Hd\\.?|zu[^\\S\\n]+H\xE4nden|Attn\\.?|Attention)", "iu");
function addressFollowsOrganisation(text, start) {
  const ls = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const prefix = text.slice(ls, start);
  if (!/[,;·|]\s*$/.test(prefix) || (prefix.match(/;/g) || []).length >= 2) return false;
  const segs = prefix.split(ORG_ADDR_SEG_SPLIT_RE).map((x) => x.trim()).filter(Boolean);
  for (let k = 0, i = segs.length - 1; i >= 0 && k < 4; i--, k++) {
    const seg = segs[i].replace(/^(?:An|Per|Via|Bei|Von|Von[^\S\n]+der|Von[^\S\n]+dem)[^\S\n]+(?:die|das|den|dem|der)?[^\S\n]*/u, "").trim();
    if (!seg || seg.length > 90) return false;
    if (ORG_ADDR_ROLE_OF_RE.test(seg) && i > 0) return false;
    if (COMPANY_TAIL_RE.test(seg) || PUBLIC_BODY_SEG_RE.test(seg)) return true;
    if (INSTITUTION_HEAD_RE.test(seg) && !lineHasPersonTitleName(seg)) return true;
    if (ORG_ADDR_NEW_PARTY_RE.test(seg) && !REPRESENTATIVE_CUE_RE.test(seg)) return false;
  }
  return false;
}
var BUSINESS_ADDRESS_LABEL_RE = /(?:Gesch[äa]ftsanschrift|Firmenanschrift|Dienstliche[^\S\n]+Anschrift|Dienstanschrift|Betriebsanschrift|Unternehmensanschrift|Sitz[^\S\n]+der[^\S\n]+(?:Gesellschaft|Firma)|Hauptsitz)[^\n]{0,40}$/iu;
function businessAddressContext(text, start) {
  const ls = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const prefix = text.slice(ls, start);
  if (BUSINESS_ADDRESS_LABEL_RE.test(prefix)) return true;
  const POBOX = /(?:Postfach|Postbox|P\.?[^\S\n]?O\.?[^\S\n]?Box)/iu;
  if (new RegExp(POBOX.source + "[^\\S\\n]*[\\d ]{0,12}[,;\xB7|]?[^\\S\\n]*$", "iu").test(prefix) || /^(?:Postfach|Postbox)(?![\p{L}])/iu.test(text.slice(start, start + 9))) return true;
  if (/^[^\S\n]*$/.test(prefix) && ls > 0) {
    const ps = text.lastIndexOf("\n", ls - 2) + 1;
    if (new RegExp("^[^\\S\\n]*" + POBOX.source, "iu").test(text.slice(ps, ls))) return true;
  }
  return false;
}
function isOrgAddressLine(text, start, spans) {
  if (personalOwnerBefore(text, start)) return false;
  if (soleTraderContext(text, start)) return false;
  if (businessAddressContext(text, start)) return true;
  if (addressFollowsOrganisation(text, start)) return true;
  const line = lineAround(text, start);
  const head = line.indexOf(",");
  if (head === -1) return false;
  const headText = line.slice(0, head);
  if (!ORG_HEAD_RE.test(headText)) return false;
  if (COMPANY_ANYWHERE_RE.test(headText)) return true;
  if (personSpanNearby(text, start, spans)) return false;
  if (!INSTITUTION_HEAD_RE.test(headText) && lineHasPersonTitleName(line)) return false;
  return true;
}
var LETTERHEAD_MAX_LINES = 6;
var PERSON_LINE_CUE_RE = /(?:^|[^\p{L}])(?:wohnhaft|geboren|geb\.|zuletzt|Erblasser(?:in)?|Angeklagte[rn]?|Beschuldigte[rn]?|Antragsteller(?:in)?|Betroffene[rn]?|Kläger(?:in)?|Beklagte[rn]?|Schuldner(?:in)?|Gläubiger(?:in)?|Mieter(?:in)?|Patient(?:in)?|Versicherte[rn]?|Herrn?|Frau|Kunde|Kundin|Mandant(?:in)?)(?![\p{L}])/u;
function isInstitutionLetterhead(text, start) {
  let lines = 0;
  for (let i = 0; i < start; i++) if (text.charCodeAt(i) === 10 && ++lines >= LETTERHEAD_MAX_LINES) return false;
  if (PERSON_LINE_CUE_RE.test(lineAround(text, start))) return false;
  let at = text.lastIndexOf("\n", Math.max(0, start - 1));
  for (let back = 0; back < 2 && at > 0; back++) {
    const from = text.lastIndexOf("\n", at - 1) + 1;
    const line = text.slice(from, at).trim();
    at = from - 1;
    if (!line) {
      back--;
      continue;
    }
    if (INSTITUTION_HEAD_RE.test(line)) return true;
  }
  return false;
}
var COMPANY_SUFFIX_RE = new RegExp(
  `^${HS}*(?:${LEGAL_FORMS.join("|")}|e\\.?\\s?V\\.?|e\\.?\\s?G\\.?|&\\s?Co\\.?|S\\.?A\\.?|N\\.?V\\.?|B\\.?V\\.?)${BR}`
);
var COMPANY_FORM_RE = new RegExp(`^(?:${LEGAL_FORMS.join("|")})\\.?$`, "i");
var COMPANY_ANYWHERE_RE = new RegExp(
  `(?:^|[\\s(,]|(?<=[A-Za-z\xE4\xF6\xFC\xDF])-)(?:${LEGAL_FORMS.join("|")}|e\\.?\\s?V\\.?|gGmbH)\\.?(?=$|[\\s.,;:)])`
);
var COMPANY_TAIL_RE = new RegExp(
  `(?:^|[\\s.,])(?:${LEGAL_FORMS.join("|")}|e\\.?\\s?V\\.?|e\\.?\\s?G\\.?|S\\.?A\\.?|N\\.?V\\.?|B\\.?V\\.?|AB|AS|Oy|PLC|LLC|LLP)\\.?$`,
  "i"
);
var COMPANY_TAIL_HYPHEN_RE = /[A-Za-zäöüß]-(?:GmbH|AG|KG|UG|eG|SE|mbH|OHG)\.?$/;
var hasCompanyLegalSuffix = (value) => COMPANY_TAIL_RE.test(value.trim()) || COMPANY_TAIL_HYPHEN_RE.test(value.trim());
var lineHasLegalForm = (line) => COMPANY_ANYWHERE_RE.test(line);
var LETTERHEAD_SEP_RE = /[^\S\r\n]+[·•|][^\S\r\n]+/;
var PUBLIC_BODY_LEAD_RE = new RegExp(
  `^(?:Stadt|Gemeinde|Landkreis|Kreis|Hansestadt|Landeshauptstadt|Bezirksamt|Samtgemeinde|Verbandsgemeinde|Amt|Erzbistum|Bistum|Pfarrei|Kirchengemeinde|Landeskirche|Freistaat|Bundesland|Regierungspr\xE4sidium|Bezirksregierung)${HS}+[${CAP}]`,
  "u"
);
var PARTNERSHIP_RE = /(?:&|\bund)[^\S\r\n]*(?:Partner(?:in(?:nen)?)?|PARTNER|Kollegen|KOLLEGEN|Kolleginnen|Söhne|Sohn|Co\.?)(?![\p{L}])|(?:^|\s)(?:mbB|PartG(?:mbB)?)(?![\p{L}])/u;
var EN_INSTITUTION_RE = /(?:^|\s)(?:Hospital|Medical Cent(?:er|re)|Clinic|University|College|Council|Church|Congregation|Parish|Ministry|School|Trust|Authority)(?![\p{L}])/u;
var LETTERHEAD_INSTITUTION_RE = new RegExp("(?:Gymnasium|[Ss]chule|Kirchengemeinde|Pfarramt|Labor|Kindertagesst\xE4tte|Kita)(?![\\p{L}])|\\p{L}{3,}(?:amt|stelle|abteilung|verwaltung|beratung)(?![\\p{L}])", "u");
var GOVERNANCE_SEGMENT_RE = new RegExp("^(?:Gesch\xE4ftsf\xFChr\\p{L}*|Geschaeftsfuehr\\p{L}*|Vorstand|Vorsitz\\p{L}*|Aufsichtsrat\\p{L}*|Inhaber(?:in)?|Managing Directors?|Directors?|Board|Registered office|Sitz|Registergericht|Amtsgericht|Verwalter(?:in)?|(?:Der|Die)\\s+(?:Ober)?[Bb]\xFCrgermeister(?:in)?|(?:Ober)?[Bb]\xFCrgermeister(?:in)?|Leitung|Laborleitung|Praxisleitung|Ansprechpartner(?:in)?)\\b", "iu");
var CHURCH_UNION_HEAD_RE = /(?:Kirchengemeinde|Kirchgemeinde|Pfarrgemeinde|Pfarrei|Gewerkschaft|IG[^\S\n]Metall)/i;
function letterheadLineIsOrg(line, text, lineStart, spans) {
  if (!LETTERHEAD_SEP_RE.test(line)) return false;
  const segs = line.split(LETTERHEAD_SEP_RE);
  const head = segs[0].trim().replace(/^[\s\-*•]+/, "");
  if (!head || head.length > 80) return false;
  const nerOrgHead = (spans || []).some((s) => s.category === "ORG" && s.source === "ner" && !s.splitPiece && s.score >= 0.85 && s.start >= lineStart && s.end <= lineStart + segs[0].length + 1 && s.end - s.start >= head.length * 0.7);
  const strong = COMPANY_ANYWHERE_RE.test(head) || COMPANY_TAIL_RE.test(head) || PARTNERSHIP_RE.test(head) || PUBLIC_BODY_LEAD_RE.test(head) || nerOrgHead;
  const institution = INSTITUTION_HEAD_RE.test(head) || EN_INSTITUTION_RE.test(head) || LETTERHEAD_INSTITUTION_RE.test(head) || CHURCH_UNION_HEAD_RE.test(head);
  const soft = ORG_HEAD_RE.test(head) || ORG_HEAD_COMPOUND_RE.test(head);
  if (!strong && !institution && !soft) return false;
  const lineEnd = lineStart + line.length;
  let segStart = lineStart;
  const segRanges = [];
  let rest = line;
  for (const seg of segs) {
    const at = rest.indexOf(seg);
    segRanges.push([segStart + at, segStart + at + seg.length, seg]);
    segStart += at + seg.length;
    rest = rest.slice(at + seg.length);
  }
  const personHere = (spans || []).some((s) => {
    if (s.category !== "PERSON" || s.start < lineStart || s.start >= lineEnd) return false;
    const r = segRanges.find(([a, b]) => s.start >= a && s.start < b);
    if (strong && r === segRanges[0]) return false;
    return !(r && GOVERNANCE_SEGMENT_RE.test(r[2].trim()));
  });
  if (personHere) return false;
  if (strong) return true;
  return !lineHasPersonTitleName(line);
}
var COMPANY_WITHIN_RE = new RegExp(
  `^(?:[ ]+(?:&[ ]+)?[${CAP}][\\p{L}.'\u2019-]*){0,2}[ ]+(?:GmbH|AG|KG|KGaA|UG|OHG|SE|Ltd|Inc|LLC|LLP|PLC)(?![\\p{L}])`,
  "u"
);
function companyFollows(text, nameEnd) {
  return COMPANY_WITHIN_RE.test(text.slice(nameEnd, nameEnd + 60));
}
function isCompanyName(name, text, nameEnd) {
  if (COMPANY_SUFFIX_RE.test(text.slice(nameEnd))) return true;
  const tokens = name.split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const trailing = (text.slice(nameEnd).match(/^\S*/) || [""])[0];
  const tail = (tokens[tokens.length - 1] + trailing).replace(/[),.;:!?\]"'\u201c\u201d\u00bb\u00ab]+$/, "");
  return COMPANY_FORM_RE.test(tail) || COMPANY_TAIL_RE.test(name.replace(/[),.;:]+$/, ""));
}
var HOUSE_NUMBER = `\\d{1,4}(?:[ \\t]?[a-zA-Z])?(?:/\\d{1,4}[a-zA-Z]?)?(?:-\\d{1,4}[a-zA-Z]?)?`;
var STREET_RE = rx(
  `${BL}(?:[${CAP}][${LOW}]+[ ]){0,2}[${CAP}][A-Za-z\xE4\xF6\xFC\xDF\\u0300-\\u036F.\\-]*(?:stra\xDFe|strasse|str\\.|gasse|weg|allee|platz|ring|damm|ufer|chaussee|steig|hof)[ \\t]+${HOUSE_NUMBER}${BR}`
);
var STREET_UPPER_RE = rx(
  `${BL}[A-Z\xC4\xD6\xDC][A-Z\xC4\xD6\xDC.\\-]{2,}(?:STRASSE|STRA\xDFE|STR\\.|GASSE|WEG|ALLEE|PLATZ|RING|DAMM|UFER|CHAUSSEE|STEIG|HOF)[ \\t]+${HOUSE_NUMBER}${BR}`
);
var STREET2_RE = rx(
  `${BL}(?:[${CAP}][${LOW}]+[ -]){1,3}(?:Stra\xDFe|Strasse|Str\\.|Gasse|Weg|Allee|Platz|Ring|Damm|Ufer|Chaussee|Steig|Hof|Markt)[ \\t]+${HOUSE_NUMBER}${BR}`
);
var STREET_PREP_NOT_STREET = /* @__PURE__ */ new Set([
  "montag",
  "dienstag",
  "mittwoch",
  "donnerstag",
  "freitag",
  "samstag",
  "sonntag",
  "januar",
  "februar",
  "m\xE4rz",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "dezember",
  "jahr",
  "monat",
  "woche",
  "tag",
  "abend",
  "morgen",
  "mittag",
  "nachmittag",
  "vormittag",
  "seite",
  "abschnitt",
  "absatz",
  "kapitel",
  "artikel",
  "anlage",
  "anhang",
  "tabelle",
  "abbildung",
  "schritt",
  "punkt",
  "teil",
  "stufe",
  "satz",
  "zeile",
  "spalte",
  "bild",
  "blatt",
  "folie",
  "stand",
  "datum",
  "wochenende",
  "feiertag",
  "quartal",
  "halbjahr",
  "zeitpunkt",
  "ergebnis",
  "durchschnitt"
]);
var STREET_PREP_TOPONYM_RE = /(?:berg|wald|hang|tal|thal|feld|hof|bach|brink|kamp|anger|park|garten|markt|winkel|blick|höhe|busch|horst|born|brunnen|kuhle|kamp|heide|moor|ried|weide|wiese|acker|graben|mühle|teich|see|stein|dorf|wall|brücke|insel|aue|au|hügel|kopf|rain|leite|lehne|mark)$/i;
var STREET_PREP_CUE_RE = new RegExp("(?:wohn\\p{L}*|anschrift|adresse|ans\xE4ssig|ansaessig|umzug|umgezogen|zieht|zog|lebt|leben|wohnung|haus|sitz|zustell\\p{L}*|post an|liegt in|\\bin [\\p{Lu}][\\p{L}-]+,)[^\\n.]{0,50}$", "iu");
var STREET_PREP_BUSINESS_RE = /(?:baustelle|standort|filiale|werk|objekt|projekt|liegenschaft|gelände|niederlassung|betriebsstätte|lager|hallo?|depot|zweigstelle|geschäftsstelle|praxis|kanzlei|büro|schule|kita|klinik|krankenhaus)[\p{L}-]*[ \t:,(–-]*$/iu;
var STREET_PREP_RE = rx(
  `${BL}(?:Am|An der|An den|Auf dem|Auf der|Im|In der|Zum|Zur|Unter den|Hinter dem|Vor dem|Bei der|Beim)[ \\t]+([${CAP}][${LOW}]+(?:[ -][${CAP}][${LOW}]+)?)[ \\t]+\\d{1,3}(?:[ \\t]?[a-zA-Z])?(?:/\\d{1,3})?${BR}`
);
var CITY_CONNECTOR = `(?:am|an|auf|im|in|ob|vor|bei|der|den|dem|des|a\\.|i\\.|u\\.)`;
var CITY_NAME = `[${CAP}][${LOW}]+(?:[ -](?:${CITY_CONNECTOR}[ -]){0,2}[${CAP}][${LOW}]+){0,3}(?:[ \\t]?\\([${CAP}][${LOW}]+\\))?`;
var STREET_TAIL_RE = rx(
  `^[ \\t]*[,\xB7][ \\t]*(?:\\d{5}[ \\t]+)?${CITY_NAME}${BR}`
);
var LOCALITY_TAIL_RE = rx(`\\d{5}[ \\t]{1,2}${CITY_NAME}$`);
var STREET_BY_POSTCODE_RE = rx(
  `${BL}(?:[${CAP}][${LOW}]+|[${CAP}][${LOW}]+[ -][${CAP}][${LOW}]+)[ \\t]\\d{1,4}(?:[ \\t]?[a-zA-Z])?(?:/\\d+[a-zA-Z]?)?(?:-\\d+[a-zA-Z]?)?(?=(?:,[ \\t]*|[ \\t]+|[ \\t]*\\n[ \\t]*)\\d{5}[ \\t])`
);
var LIST_NEXT_RE = /^(?:[ \t]*\([^()\n]{1,40}\))?(?:[ \t]*,[ \t]*(?:und[ \t]+|oder[ \t]+)?|[ \t]+(?:und|oder)[ \t]+|[ \t]*;[ \t]*)([A-Za-z0-9][A-Za-z0-9\-/.]{2,}[A-Za-z0-9])/;
var idShape = (v) => v.replace(/[A-Za-z]/g, "A").replace(/\d/g, "9");
function extendLabelledList(text, spans, from) {
  const seeds = spans.slice(from).filter((sp) => sp.category === "CUSTOMER_ID" && sp.source === "regex");
  for (const seed of seeds) {
    const shape = idShape(seed.text);
    if (!/[A-Za-z]/.test(shape) || !/9/.test(shape)) continue;
    let end = seed.end;
    for (let n = 0; n < 12; n++) {
      const m = LIST_NEXT_RE.exec(text.slice(end, end + 80));
      if (!m || idShape(m[1]) !== shape) break;
      const start = end + m[0].length - m[1].length;
      if (!spans.some((sp) => sp.category === seed.category && sp.start === start && sp.end === start + m[1].length)) {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(seed)), seed, { start, end: start + m[1].length, text: m[1] });
        spans.push(copy);
      }
      end = start + m[1].length;
    }
  }
}
var VIN_RE = rx(`${BL}[A-HJ-NPR-Z0-9]{17}${BR}`);
var PLZ_CITY_CAPS_RE = rx(
  `(?<![\\d/\\-${CAP}${LOW}])\\d{5}(?!\\d)[ \\t]{1,2}[${CAP}]{4,}(?:[ -][${CAP}]{3,}){0,2}(?![${CAP}${LOW}])`
);
var PLZ_CITY_RE = rx(
  `(?:(?<![\\d/\\-${CAP}${LOW}])\\d{5}(?!\\d)[ \\t]{1,2}${CITY_NAME}|(?<=[\\n\\r,][ \\t]{0,3})\\d{5}(?!\\d)[ \\t]*\\r?\\n[ \\t]*${CITY_NAME}|(?<=^|[\\n\\r])[ \\t]*\\d{5}(?!\\d)[ \\t]*\\r?\\n[ \\t]*${CITY_NAME})${BR}`,
  "m"
);
var FOREIGN_LOCALITY_RE = rx(
  `${BL}\\d{2,4}[ \\t-]?\\d{2,3}(?:[ \\t][A-Z]{2})?[ \\t]+${CITY_NAME},[ \\t]*(?:Sweden|Schweden|Poland|Polen|Netherlands|Niederlande|Denmark|D\xE4nemark|Norway|Norwegen|Finland|Finnland|Czech Republic|Tschechien|Portugal|Spain|Spanien|Italy|Italien|France|Frankreich|Belgium|Belgien|Hungary|Ungarn|Romania|Rum\xE4nien)${BR}`
);
var FOREIGN_STREET_RE = rx(
  `${BL}(?:(?:ul\\.|ulica|aleja|al\\.)[ \\t]+[${CAP}][${LOW}]+(?:[ \\t]+[${CAP}][${LOW}]+)?|[${CAP}][${LOW}]+(?:gatan|gata|v\xE4gen|vagen|gade|veien|vei|katu|tie|straat|laan|plein|utca|strada|rua|calle|via))[ \\t]+\\d{1,4}[a-zA-Z]?${BR}`,
  "i"
);
var WEAK_STREET_SUFFIX_RE = /(?:weg|platz|ring|damm|ufer|steig|hof|markt|tie|via|vei|rua|katu)$/i;
var UNIT_AFTER_NUMBER_RE = /^[ \t]*(?:mm|cm|dm|m|km|m²|qm|m³|kg|g|mg|t|l|ml|cl|Stk\.?|Stück|Pack|Paletten?|EUR|€|USD|\$|%|Prozent|°C|°|Grad|Zoll|W|kW|V|A|Hz|MHz|GHz|KB|MB|GB|TB|px|pt|dpi|Uhr|Jahre|Monate|Tage|Minuten|Sekunden|x)(?![\p{L}])/u;
var ADDRESS_LABEL_CONTEXT = [
  "anschrift",
  "adresse",
  "wohnhaft",
  "wohnort",
  "sitz",
  "zustellung",
  "lieferadresse",
  "rechnungsadresse",
  "meldeadresse",
  "address",
  "residing",
  "domiciled"
];
var STREET_EN_RE = rx(
  `${BL}\\d{1,5}[a-zA-Z]?${HS}+(?:[A-Z][A-Za-z\\u0300-\\u036F.'-]+${HS}+){1,3}(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Court|Ct|Boulevard|Blvd|Way|Place|Pl|Square|Sq|Terrace|Close|Crescent|Parkway|Highway|Hwy)\\.?${BR}`
);
var COUNTRY_TAIL = `(?:,[ \\t]*(?:United States|United States of America|USA|U\\.S\\.A\\.|US|United Kingdom|UK|England|Scotland|Wales|Northern Ireland|Ireland|Germany|Deutschland|Austria|\xD6sterreich|Switzerland|Schweiz|France|Frankreich|Spain|Spanien|Italy|Italien|Netherlands|Niederlande|Belgium|Belgien|Poland|Polen|Sweden|Schweden|Denmark|D\xE4nemark|Norway|Norwegen|Finland|Finnland|Canada|Kanada|Australia|Australien))?`;
var UK_POSTCODE = `[A-Z]{1,2}\\d[A-Z\\d]?[ \\t]?\\d[A-Z]{2}`;
var TOWN_EN = `[A-Z][A-Za-z\\u0300-\\u036F.'-]+(?:[ \\t]+(?:upon|on|under|le|de|la)[ \\t]+[A-Z][A-Za-z\\u0300-\\u036F.'-]+|[ \\t]+[A-Z][A-Za-z\\u0300-\\u036F.'-]+){0,3}`;
var UK_LOCALITY_RE = rx(`${BL}${TOWN_EN},?[ \\t]+${UK_POSTCODE}${COUNTRY_TAIL}${BR}`);
var US_STATE = `A[LKZR]|C[AOT]|DE|DC|FL|GA|HI|I[DLNA]|K[SY]|LA|M[EDAINSOT]|N[EVHJMYCD]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[TA]|W[AVIY]|AS|GU|MP|PR|VI`;
var US_LOCALITY_RE = rx(
  `${BL}${TOWN_EN},[ \\t]*(?:${US_STATE})[ \\t]+\\d{5}(?:-\\d{4})?${COUNTRY_TAIL}${BR}`
);
var HOUSE_STREET_BEFORE_LOCALITY_RE = (
  // eslint-disable-next-line no-misleading-character-class -- deliberate: Unicode combining-diacritic range for accented names, not a bug
  /(\d{1,5}[a-zA-Z]?)[ \t]+((?:[A-Z][A-Za-z̀-ͯ.'-]+[ \t]+){0,2}[A-Z][A-Za-z̀-ͯ.'-]+)[ \t]*,?[ \t]*$/
);
var PLZ_CITY_COUNTRY_RE = rx(
  `(?<![\\d/\\-${CAP}${LOW}])\\d{5}(?!\\d)[ \\t]{1,2}${CITY_NAME},[ \\t]*(?:Germany|Deutschland|Austria|\xD6sterreich|Switzerland|Schweiz)${BR}`
);
var SSN_US_RE = rx(`${BL}\\d{3}-\\d{2}-\\d{4}${BR}`);
var PERSONNUMMER_RE = rx(`${BL}(?:(?:19|20)\\d{6}|\\d{6})[-+]\\d{4}${BR}`);
var NINO_RE = rx(`${BL}[A-Za-z]{2}\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\s?[A-Za-z]${BR}`);
var AHV_CH_RE = rx(`${BL}756\\.?\\d{4}\\.?\\d{4}\\.?\\d{2}${BR}`);
var SV_AT_RE = rx(`${BL}\\d{4}[ .]?\\d{6}${BR}`);
var MONTHS = "Januar|Februar|M\xE4rz|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
var DAY_ORD = `\\d{1,2}(?:st|nd|rd|th)?`;
var DOB_DATE = `(?:\\d{1,2}\\s*[.\\/-]\\s*\\d{1,2}\\s*[.\\/-]\\s*\\d{2,4}|\\d(?:[ ]\\d)?[ ][.|\\/-][ ]\\d(?:[ ]\\d)?[ ][.|\\/-][ ]\\d(?:[ ]\\d){1,3}|(?:\\d[ ]){7}\\d|\\d{4}-\\d{1,2}-\\d{1,2}|${DAY_ORD}\\.?\\s+(?:${MONTHS})\\.?\\s+\\d{4}|(?:${MONTHS})\\.?\\s+${DAY_ORD}\\s*,?\\s+\\d{4})`;
var DOB_YEAR_AFTER_CUE_RE = rx(`${BL}(?:geboren|geb\\.|born)(?:[ \\t]+(?:in|im[ \\t]+Jahr(?:e)?))?[ \\t]+((?:19|20)\\d{2})(?![\\d.\\-/])`, "i");
var DOB_NEXT_DATE_RE = new RegExp(`^(?:[ \\t]*[,;/&][ \\t]*|[ \\t]+(?:und|and)[ \\t]+|[ \\t]+)(${DOB_DATE})(?![\\d])`, "i");
var DOB_BIRTHDAY_LINE_RE = rx(`Geburtstag[\\p{L}]*[^\\r\\n]{0,200}`, "iu");
var BARE_DATE_LINE_RE = new RegExp(`^(?:\\d{1,2}\\.\\d{1,2}\\.(?:19|20)\\d{2}|(?:19|20)\\d{2}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/(?:19|20)\\d{2}|(?:19|20)\\d{2}/\\d{2}/\\d{2}|\\d{1,2}\\.? (?:${MONTHS})\\.? (?:19|20)\\d{2})$`, "iu");
var NAME_PARTICLES = /* @__PURE__ */ new Set(["von", "van", "de", "der", "den", "da", "di", "zu", "zur", "del", "la", "le", "bin", "al", "el", "ben", "vom", "ter", "ten", "dos", "do", "du"]);
function nameShapedLine(line) {
  const t = line.trim();
  if (t.length < 2 || t.length > 48 || /[\d@:/()]/.test(t)) return false;
  const toks = t.split(/[ ,]+/).filter(Boolean);
  if (toks.length < 1 || toks.length > 4) return false;
  if (!toks.every((w) => NAME_PARTICLES.has(w.toLowerCase()) || new RegExp("^\\p{Lu}[\\p{L}'\u2019-]*\\.?$", "u").test(w))) return false;
  const words = toks.filter((w) => !NAME_PARTICLES.has(w.toLowerCase()));
  if (!words.length) return false;
  if (words.length === 1 && isCommonWord(words[0])) return false;
  return words.some((w) => looksLikeGivenName(w.replace(/\.$/, "")));
}
var MINOR_DOB_YEAR = 2005;
var KINSHIP_NEAR_RE = /\b(?:tochter|sohn|kind(?:er)?|enkel(?:in)?|nichte|neffe|stieftochter|stiefsohn|pflegekind|child|daughter|son|grand(?:son|daughter)|niece|nephew)\b/i;
function bareDateOfBirthLines(text, spans) {
  const lines = tableLines(text);
  const maxYear = (/* @__PURE__ */ new Date()).getUTCFullYear() - 3;
  for (let i = 1; i < lines.length; i++) {
    const [at, raw] = lines[i];
    const t = raw.trim();
    if (t.length < 8 || t.length > 20 || !BARE_DATE_LINE_RE.test(t)) continue;
    const yr = Number((/(19|20)\d{2}/.exec(t) || [0])[0]);
    if (yr < 1900 || yr > maxYear) continue;
    const prev = lines[i - 1][1];
    const prev2 = i >= 2 ? lines[i - 2][1] : "";
    const roleLine = prev.trim().length > 0 && prev.trim().length <= 60 && !BARE_DATE_LINE_RE.test(prev.trim()) && !/\d/.test(prev);
    if (!(nameShapedLine(prev) || roleLine && nameShapedLine(prev2))) continue;
    if (yr >= MINOR_DOB_YEAR && !KINSHIP_NEAR_RE.test(`${prev2}
${prev}
${lines[i + 1] ? lines[i + 1][1] : ""}`)) continue;
    const start = at + raw.indexOf(t);
    if (spans.some((sp) => sp.start < start + t.length && sp.end > start)) continue;
    add(spans, start, start + t.length, t, "DOB", 0.8);
  }
}
var DOB_LABEL_LINE_RE = new RegExp(`^(?:geburtsdatum|geburtstag|geb\\.?-?[ ]?datum|date[ ]of[ ]birth|birth[ ]?date|dob)(?:[ ]*[/:,-]?[ ]*[\\p{L}.]{2,20}){0,3}[ ]*:?$`, "iu");
var DATE_AT_LINE_START_RE = new RegExp(`^(${DOB_DATE})(?![\\d])`, "i");
function dobLabelAboveLines(text, spans) {
  const lines = tableLines(text);
  for (let i = 0; i + 1 < lines.length; i++) {
    const label = lines[i][1].trim();
    if (!label || label.length > 40 || !DOB_LABEL_LINE_RE.test(label)) continue;
    const [at, raw] = lines[i + 1];
    const m = DATE_AT_LINE_START_RE.exec(raw.trimStart());
    if (!m) continue;
    const start = at + raw.length - raw.trimStart().length;
    if (spans.some((sp) => sp.start < start + m[1].length && sp.end > start)) continue;
    add(spans, start, start + m[1].length, m[1], "DOB", 0.85);
  }
}
var INLINE_NAME_DATE_RE = new RegExp(`^(?:\\d{1,6}[ \\t]+)?(?<name>(?:\\p{Lu}[\\p{L}'\u2019-]+,?[ \\t]+){1,3})(?<d>${DOB_DATE})(?![\\d/.\\-])`, "iu");
function inlineNameDateOfBirth(text, spans) {
  const maxYear = (/* @__PURE__ */ new Date()).getUTCFullYear() - 3;
  for (const [at, raw] of tableLines(text)) {
    if (raw.length > 400 || raw.length < 14) continue;
    const m = INLINE_NAME_DATE_RE.exec(raw.trimStart());
    if (!m || m.groups.name.trim().split(/[ \t,]+/).filter(Boolean).length < 2 || !nameShapedLine(m.groups.name.replace(/,/g, " "))) continue;
    const yr = Number((/(19|20)\d{2}/.exec(m.groups.d) || [0])[0]);
    if (yr < 1900 || yr > maxYear) continue;
    if (yr >= MINOR_DOB_YEAR && !KINSHIP_NEAR_RE.test(raw)) continue;
    const lead = raw.length - raw.trimStart().length;
    const start = at + lead + m[0].length - m.groups.d.length;
    if (spans.some((sp) => sp.start < start + m.groups.d.length && sp.end > start)) continue;
    add(spans, start, start + m.groups.d.length, m.groups.d, "DOB", 0.75);
    const tail = ROW_DOC_NUMBER_RE.exec(raw.slice(start - at + m.groups.d.length));
    if (tail && /\d.*\d.*\d/.test(tail[1]) && /[A-Z]/.test(tail[1])) {
      const ds = start + m.groups.d.length + tail[0].length - tail[1].length;
      add(spans, ds, ds + tail[1].length, tail[1], "ID_CARD", 0.75);
    }
  }
}
var ROW_DOC_NUMBER_RE = /^[ \t]+([A-Z][A-Z0-9]{8,9})(?=[ \t,;]|$)/;
var ROW_KEY_NAME_RE = new RegExp(`^(?<id>\\d{4,8})[ \\t]+(?<name>(?:\\p{Lu}[\\p{L}'\u2019-]+,?[ \\t]+){2,3})`, "u");
function rowKeyBeforeName(text, spans) {
  for (const [at, raw] of tableLines(text)) {
    if (raw.length > 400 || raw.length < 12) continue;
    const lead = raw.length - raw.trimStart().length;
    const m = ROW_KEY_NAME_RE.exec(raw.trimStart());
    if (!m) continue;
    const id = m.groups.id;
    if (/^(?:19|20)\d{2}$/.test(id)) continue;
    if (!nameShapedLine(m.groups.name.replace(/,/g, " "))) continue;
    const start = at + lead;
    for (let i = spans.length - 1; i >= 0; i--) {
      const sp = spans[i];
      if (sp.category === "ADDRESS" && sp.start === start && /^\d{4,8}[ \t]+[\p{L}'’-]+$/u.test(sp.text)) spans.splice(i, 1);
    }
    if (spans.some((sp) => sp.start < start + id.length && sp.end > start)) continue;
    add(spans, start, start + id.length, id, "CUSTOMER_ID", 0.75);
  }
}
function embeddedAccountNumbers(text, spans) {
  const seen = /* @__PURE__ */ new Set();
  for (const sp of spans.slice()) {
    if (sp.category !== "IBAN") continue;
    const d = sp.text.replace(/[\s-]/g, "");
    if (!/^DE\d{20}$/.test(d)) continue;
    const acc = d.slice(12);
    const bare = acc.replace(/^0+/, "");
    if (bare.length < 6 || seen.has(acc)) continue;
    seen.add(acc);
    const re = new RegExp(`(?<![\\d.,/-])(?:${acc}|${bare})(?![\\d]|[.,/-]\\d)`, "g");
    for (const m of text.matchAll(re)) {
      if (spans.some((x) => x.start < m.index + m[0].length && x.end > m.index)) continue;
      add(spans, m.index, m.index + m[0].length, m[0], "ACCOUNT", 0.85);
    }
  }
}
var DOB_JSON_FIELD_RE = rx(`"field"[ \\t]*:[ \\t]*"(?:geburtsdatum|date_of_birth|dob|birthdate|birth_date)"[^}\\r\\n]{0,80}?"(?:new|old|value)"[ \\t]*:[ \\t]*"(${DOB_DATE})"`, "i");
var DOB_RE = rx(
  `(?:geb\\.?(?:oren)?(?:\\s+am)?(?:[-\\s]?(?:datum|dat\\.)|-)?|Geburtsdatum|Geburtstag|geboren|date[\\s_]+of[\\s_]+birth|birth[\\s_]*date|d\\.?o\\.?b\\.?|born(?:\\s+on)?|birthday|Geburt)(?:(?:\\s+[${CAP}${LOW}]{1,3}\\.?)?["'\`]?[ \\t]*[:=]?|[^:=\\r\\n]{0,30}?[:=]|[ \\t]*\\([^)\\r\\n]{1,40}\\)[ \\t]*[:=]?|(?:\\s+(?:ist|war|lautet|is|was|am|der|den|on|the)){1,3}[ \\t,]*)\\s*["'\`]?\\s*(${DOB_DATE})`,
  "i"
);
var DOB_NOUN_RE = rx(
  `(?:Geburtsdatum|Geburtstag|geboren|date[\\s_]+of[\\s_]+birth|birth[\\s_]*date|birthday|DOB)[^.\\d\\r\\n:=]{0,40}?[ \\t](${DOB_DATE})`,
  "i"
);
var DOB_LIST_CUE_RE = rx(`(?:Geburtsdat(?:um|en)|Geburtstage|dates?[ ]of[ ]birth|birthdays|DOBs)[ \\t]*[:=][^\\r\\n]{0,240}`, "i");
var DOB_YEAR_ONLY_RE = rx(`${BL}Jahrgang[ \\t]+((?:19|20)\\d{2})${BR}`, "i");
var DOB_BEFORE_CUE_RE = rx(`(${DOB_DATE})[ \\t]*,?[ \\t]*(?:geboren|geb\\.(?![ \\t]*(?:in|nach)\\b)|born)${BR}`, "i");
var DOB_STAR_DATE = `(?:\\d{1,2}\\s*[.\\/-]\\s*\\d{1,2}\\s*[.\\/-]\\s*\\d{4}|\\d{1,2}\\.?\\s+(?:${MONTHS})\\.?\\s+\\d{4})`;
var DOB_STAR_RE = rx(`\\*[ \\t]?(${DOB_STAR_DATE})${BR}`);
var ACCOUNT_METADATA_DATE_RE = rx(
  `${BL}(?:registriert(?:\\s+am)?|registrierungsdatum|kontoerstellung|konto\\s+erstellt(?:\\s+am)?|letzter\\s+login(?:\\s+am)?|abgelesen(?:\\s+am)?|ablesedatum|ablesung(?:\\s+vom)?|letzte\\s+ablesung|vertragsbeginn|vertragsende|k\xFCndigung\\s+zum)\\s*:?\\s*(${DOB_DATE})`,
  "i"
);
var ISIN_RE = rx(`${BL}[A-Z]{2}[A-Z0-9]{9}\\d${BR}`);
var WKN_RE = rx(`${BL}[A-Z0-9]{6}${BR}`);
var ID_CARD_RE = rx(
  `${BL}(?:(?:\\d[ ]){7,9}\\d|[0-9A-Z]{1,4}(?:[ \\t-][0-9A-Z]{1,8}){2,4}|[0-9A-Z]{8,11}|[A-Z][0-9A-Z]{0,4}[ \\t-]\\d{5,8}|[A-Z]{5}\\d{6}[A-Z0-9]{5}\\d{0,2})${BR}`
);
var ID_DOC_BEFORE_NUMBER_RE = /(?:personalausweis|reisepass|führerschein|fuehrerschein|ausweis|passport|driving licen[cs]e|driver'?s licen[cs]e|identity card)[^\n]{0,150}[ \t,.;:(](?:nummer|number|nr\.?|no\.?)[ \t]*:?[ \t]*$/i;
var PLATE_RE = rx(`${BL}[${CAP}]{1,3}[ \\t]?-[ \\t]?[A-Z]{1,2}[ \\t]?\\d{1,4}[ \\t]?[EH]?${BR}`);
var PLATE_SPACED_RE = rx(`${BL}[${CAP}]{1,3}[ \\t][A-Z]{1,2}(?:[ \\t]|[ \\t]?\\r?\\n[ \\t]*)?\\d{1,4}[ \\t]?[EH]?${BR}`);
var PLATE_UK_RE = rx(`${BL}[A-HJ-NP-Y][A-Z]\\d{2}[ ]?[A-HJ-NP-Z]{3}${BR}`);
var CTX_PLATE_UK = [
  "registration",
  "reg.",
  "reg ",
  "reg:",
  "number plate",
  "vehicle",
  "kennzeichen",
  "licence plate",
  "license plate",
  "car ",
  "van ",
  "plate"
];
var CTX_PLATE = [
  "kennzeichen",
  "kfz",
  "amtliches kennzeichen",
  "fahrzeug",
  "zulassung",
  "pkw",
  "lkw",
  "nummernschild",
  "licence plate",
  "license plate",
  "registration number",
  "vehicle",
  "number plate",
  "registration",
  "reg.",
  "reg ",
  "reg:",
  "plate",
  "car",
  "wagen",
  "auto",
  "motorrad",
  "transporter",
  "kombi"
];
var STANDARDS_PREFIXES = /* @__PURE__ */ new Set(["din", "iso", "en", "vde"]);
var STANDARDS_BEFORE_RE = new RegExp("(?:^|[^\\p{L}])((?:\\p{L}{2,4}[^\\S\\r\\n]+){1,3})$", "u");
function hasStandardsPrefixBefore(text, at) {
  const m = STANDARDS_BEFORE_RE.exec(text.slice(Math.max(0, at - 24), at));
  if (!m) return false;
  return m[1].trim().split(/\s+/).some((w) => STANDARDS_PREFIXES.has(w.toLowerCase()));
}
var IPV4_RE = rx(`${BL}(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)${BR}`);
var IPV6_RE = rx(
  `${BL}(?:[0-9A-Fa-f]{1,4}:){1,7}:(?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6})?${BR}|${BL}(?:[0-9A-Fa-f]{1,4}:){2,7}[0-9A-Fa-f]{1,4}${BR}`
);
var MAC_RE = rx(`${BL}(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}${BR}`);
var PROFILE_URL_RE = rx(
  `${BL}(?:https?://)?(?:www\\.)?(?:linkedin\\.com/in|xing\\.com/profile|github\\.com|instagram\\.com|facebook\\.com|twitter\\.com|x\\.com|t\\.me|mastodon\\.social|tiktok\\.com/@|threads\\.net/@)/?[A-Za-z0-9](?:[A-Za-z0-9._-]{1,62})`,
  "i"
);
var SOCIAL_HANDLE_RE = rx(`(?<![A-Za-z0-9._%+-])@([A-Za-z0-9](?:[A-Za-z0-9._]{2,29}))${BR}`);
var CTX_SOCIAL = [
  "instagram",
  "twitter",
  "telegram",
  "tiktok",
  "mastodon",
  "threads",
  "snapchat",
  "signal",
  "discord",
  "handle",
  "profil",
  "profile",
  "account",
  "socials",
  "erreichbar \xFCber",
  "erreichbar unter",
  "folgen sie",
  "auf x",
  "bluesky"
];
function looksLikeIpv6(candidate) {
  return /[a-fA-F]/.test(candidate) || candidate.includes("::") || (candidate.match(/:/g) || []).length >= 3;
}
function isNonIdentifyingIp(candidate) {
  const v4 = candidate.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    const c = Number(v4[3]);
    if (a === 0 || a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    return false;
  }
  const low = candidate.toLowerCase();
  if (low === "::" || low === "::1") return true;
  if (/^fe[89ab][0-9a-f]?:/.test(low)) return true;
  if (/^f[cd][0-9a-f]{2}:/.test(low)) return true;
  if (/^ff[0-9a-f]{2}:/.test(low)) return true;
  if (/^2001:0?db8:/.test(low)) return true;
  return false;
}
var PHONE_YEAR_PART_RE = /(?:^|[-/])(?:19|20)\d{2}(?:[-/]|$)/;
var COMPANY_NUMBER_BEFORE_RE = /(?:company (?:number|no\.?|registration)|registered in [a-z ]+? (?:no\.?|number)|registernummer|handelsregister|\bHR[AB]\b)[\s:.#]*$/i;
var PHONE_DATE_INSIDE_RE = /\d{1,2}\.\d{1,2}\.(?:19|20)\d{2}/;
var CODE_YEAR_BEFORE_RE = /[A-Z]{2,}-(?:19|20)\d{2}-[ \t]?$/;
function isReferenceNotPhone(text, at, value) {
  if (/^\+/.test(value)) return false;
  if (PHONE_DATE_INSIDE_RE.test(value) || CODE_YEAR_BEFORE_RE.test(text.slice(Math.max(0, at - 14), at))) return true;
  if (PHONE_YEAR_PART_RE.test(value.replace(/\s+/g, ""))) return true;
  return COMPANY_NUMBER_BEFORE_RE.test(text.slice(Math.max(0, at - 60), at));
}
var ROLE_MAILBOXES = /* @__PURE__ */ new Set([
  "info",
  "kontakt",
  "contact",
  "service",
  "support",
  "hilfe",
  "help",
  "helpdesk",
  "office",
  "buero",
  "b\xFCro",
  "mail",
  "email",
  "e-mail",
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "postmaster",
  "webmaster",
  "hostmaster",
  "admin",
  "administrator",
  "abuse",
  "billing",
  "rechnung",
  "rechnungen",
  "buchhaltung",
  "accounting",
  "invoice",
  "invoices",
  "bestellung",
  "bestellungen",
  "order",
  "orders",
  "shop",
  "versand",
  "sales",
  "vertrieb",
  "bewerbung",
  "bewerbungen",
  "jobs",
  "karriere",
  "career",
  "careers",
  "recruiting",
  "hr",
  "presse",
  "press",
  "media",
  "marketing",
  "newsletter",
  "datenschutz",
  "privacy",
  "dpo",
  "legal",
  "recht",
  "compliance",
  "security",
  "sicherheit",
  "team",
  "hallo",
  "hello",
  "hey",
  "anfrage",
  "anfragen",
  "beratung",
  "termin",
  "termine",
  "empfang",
  "reception",
  "zentrale",
  "test",
  "example",
  "demo",
  "sample",
  "user",
  "username",
  "your-email",
  "youremail",
  // Functional mailboxes of a DEPARTMENT. Missing these did more than leave one address marked:
  // an accepted EMAIL anchors a data subject (see SUBJECT_ANCHOR_CATEGORIES in detect.js), so a
  // public tender notice addressed to nobody counted as somebody's document on the strength of
  // "procurement@…" and had its procurement reference marked as personal data.
  "procurement",
  "einkauf",
  "beschaffung",
  "vergabe",
  "ausschreibung",
  "tender",
  "tenders",
  "finance",
  "finanzen",
  "controlling",
  "treasury",
  "kasse",
  "kassen",
  "mahnwesen",
  "personal",
  "personalabteilung",
  "payroll",
  "lohn",
  "gehalt",
  "ausbildung",
  "training",
  "logistik",
  "logistics",
  "lager",
  "warehouse",
  "einkaufsbuero",
  "poststelle",
  "post",
  "qualitaet",
  "qualit\xE4t",
  "quality",
  "qm",
  "technik",
  "technical",
  "it",
  "edv",
  "helpline",
  "hotline",
  "kundenservice",
  "kundendienst",
  "customerservice",
  "customercare",
  "care",
  "reklamation",
  "reklamationen",
  "complaints",
  "feedback",
  "verwaltung",
  "administration",
  "sekretariat",
  "secretariat",
  "geschaeftsstelle",
  "gesch\xE4ftsstelle",
  "pressestelle",
  "redaktion",
  "editor",
  "editorial",
  "webshop",
  "onlineshop",
  "buchung",
  "buchungen",
  "booking",
  "bookings",
  "reservierung",
  "reservation",
  "reservations",
  "anmeldung"
]);
var ROLE_COMPOUND_RE = /^[a-zäöüß]{3,}(?:service|support|management|verwaltung|abteilung|stelle|amt|buero|büro|board|zentrale|sekretariat|beratung|meldung|betreuung)$/;
var ROLE_EXTRA = /* @__PURE__ */ new Set([
  "beschwerde",
  "beschwerden",
  "kredit",
  "kredite",
  "retoure",
  "retouren",
  "schaden",
  "schaeden",
  "betriebsrat",
  "personalrat",
  "dsb",
  "auftrag",
  "auftraege",
  "widerspruch",
  "vermietung",
  "leasing",
  // 2026-10-14 (P3): dispatch, delivery, billing, lab results, a school office, a mayor's office,
  // a funding desk, English lettings/accounts desks — each measured as an organisation's mailbox.
  "dispo",
  "disposition",
  "lieferung",
  "lieferungen",
  "abrechnung",
  "befund",
  "befunde",
  "soziales",
  "schulleitung",
  "buergermeister",
  "b\xFCrgermeister",
  "antrag",
  "antraege",
  "baufinanzierung",
  "finanzierung",
  "betrieb",
  "lettings",
  "accounts",
  "enquiries",
  "admissions",
  // 2026-10-14 (P4, hold-out): appointments, appointments committee, welcome desk, benefits,
  // whistleblowing, site management, deeds, consultation service, town hall, club board.
  "termine",
  "berufungen",
  "berufung",
  "welcome",
  "leistungen",
  "leistung",
  "speakup",
  "bauleitung",
  "urkunden",
  "konsil",
  "rathaus",
  "geschaeftsfuehrung",
  "kanzlei",
  // 2026-10-15 (R8 orgc): further department / function mailboxes measured as a legal person's own address —
  // fines, subscriptions, quality, members, projects, club treasurer / board, workshop, reception, fleet, treasury,
  // housing benefit, whistleblowing, withdrawal, people, tax, onboarding, documentation, register court, citizens'
  // office, investor relations. (Consumer-provider domains are exempt, see isRoleLocal.)
  "bussgeld",
  "buergeramt",
  "b\xFCrgeramt",
  "abo",
  "abos",
  "abonnenten",
  "qs",
  "mitglieder",
  "projektteam",
  "projektbuero",
  "projektb\xFCro",
  "werkstatt",
  "rezeption",
  "fuhrpark",
  "kaemmerei",
  "k\xE4mmerei",
  "wohngeld",
  "hinweisgeber",
  "widerruf",
  "people",
  "onboarding",
  "dokumentation",
  "registergericht",
  "ir",
  "patientbilling",
  "buergermeisterin",
  "b\xFCrgermeisterin"
]);
var NUMBERED_UNIT_LOCAL_RE = /^(?:klasse|class|station|gruppe)\d{1,2}[a-z]?$/;
var isRoleLocal = (w, address = "") => ROLE_MAILBOXES.has(w) || NUMBERED_UNIT_LOCAL_RE.test(w) || !CONSUMER_MAIL_DOMAINS.has(address.slice(address.lastIndexOf("@") + 1).toLowerCase()) && (ROLE_EXTRA.has(w) || ROLE_COMPOUND_RE.test(w));
var DEPARTMENT_HEADS = /* @__PURE__ */ new Set([
  "sekretariat",
  "secretariat",
  "buero",
  "b\xFCro",
  "verwaltung",
  "abteilung",
  "station",
  "ambulanz",
  "schaden",
  "personal",
  "kasse",
  "vertrieb",
  "einkauf",
  "antrag",
  "konsil",
  "buergeramt",
  "b\xFCrgeramt",
  "bussgeld",
  "wohngeld",
  "mitglieder",
  "projekt",
  "projekte",
  "vorstand",
  "fuhrpark",
  "rezeption",
  "werkstatt",
  "kaemmerei",
  "k\xE4mmerei",
  "kita"
]);
function isReservedMailDomain(domain) {
  return /\.(example|test|invalid|localhost)$/.test(domain.toLowerCase().replace(/\.+$/, ""));
}
var CONSUMER_MAIL_DOMAINS = /* @__PURE__ */ new Set([
  "gmx.de",
  "gmx.net",
  "gmx.at",
  "gmx.ch",
  "gmx.com",
  "web.de",
  "t-online.de",
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.de",
  "hotmail.com",
  "hotmail.de",
  "live.com",
  "live.de",
  "yahoo.com",
  "yahoo.de",
  "freenet.de",
  "posteo.de",
  "posteo.net",
  "mailbox.org",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "proton.de",
  "arcor.de",
  "online.de",
  "mail.de",
  "email.de",
  "aol.com",
  "aol.de",
  "onet.pl",
  "wp.pl",
  "o2.pl",
  "interia.pl",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "gmx.co.uk",
  "btinternet.com",
  "sky.com",
  "msn.com",
  "t-online.net",
  "vodafone.de",
  "1und1.de",
  "ymail.com"
]);
function foldForMatch(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").replace(/ı/g, "i").replace(/ł/g, "l").replace(/ø/g, "o").replace(/đ/g, "d").toLowerCase();
}
function mailboxDomainNamesPerson(address, names) {
  const at = address.lastIndexOf("@");
  if (at <= 0 || !names || !names.size) return false;
  const labels = address.slice(at + 1).toLowerCase().split(".").filter(Boolean);
  if (labels.length < 2) return false;
  labels.pop();
  if (labels.length > 1 && /^(?:co|com|org|ac|gov|net)$/.test(labels[labels.length - 1])) labels.pop();
  for (const label of labels) {
    for (const part of label.split(/[-_]+/)) {
      const folded = foldForMatch(part);
      if (folded.length >= 4 && (names.has(part) || names.has(folded))) return true;
    }
  }
  return false;
}
var GENERAL_CONTACT_LOCALS = /* @__PURE__ */ new Set([
  "info",
  "kontakt",
  "contact",
  "mail",
  "post",
  "buero",
  "b\xFCro",
  "office",
  "praxis",
  "kanzlei",
  "anfrage",
  "termin",
  "termine",
  "hallo",
  "hello",
  "sekretariat",
  "verwaltung",
  "empfang",
  "anmeldung",
  "zentrale"
]);
function isRoleMailboxOnRoutableDomain(address) {
  const at = address.lastIndexOf("@");
  if (at <= 0 || !mailboxIsNonPersonal(address) || isReservedMailDomain(address.slice(at + 1))) return false;
  return GENERAL_CONTACT_LOCALS.has(lookupLocal(address, at));
}
function lookupLocal(address, at) {
  return address.slice(0, at).normalize("NFC").toLowerCase();
}
function mailboxNamesPerson(address, names) {
  const at = address.lastIndexOf("@");
  if (at <= 0) return false;
  const local = lookupLocal(address, at);
  if (isRoleLocal(local, address)) return false;
  if (local.includes("*")) return true;
  if (CONSUMER_MAIL_DOMAINS.has(address.slice(at + 1).toLowerCase())) return true;
  const parts = local.split(/[._\-+]+/).filter(Boolean);
  for (const part of parts) {
    if (looksLikeGivenName(part.replace(/\d+$/, ""))) return true;
    if (part.length > 2 && names && names.has(part.replace(/\d+$/, "")) && !isRoleLocal(part.replace(/\d+$/, ""), address)) return true;
  }
  const dotted = local.split(/[._]/).filter(Boolean);
  while (dotted.length > 2 && /^\d+$/.test(dotted[dotted.length - 1])) dotted.pop();
  if (dotted.length >= 2 && local.includes(".") || dotted.length >= 2 && local.includes("_")) {
    const head = dotted[0].replace(/\d+$/, "");
    const hyphenOk = head.length <= 2 || looksLikeGivenName(head) || names && names.has(head);
    const alpha = dotted.every((p2) => (hyphenOk ? /^[\p{L}]+(?:-[\p{L}]+)*\d{0,4}$/u : /^[\p{L}]+\d{0,4}$/u).test(p2));
    const named = dotted.some((p2) => p2.replace(/\d+$/, "").length >= 3);
    if (alpha && named && !isRoleLocal(dotted[dotted.length - 1].replace(/\d+$/, ""), address) && !isRoleLocal(dotted[dotted.length - 1].split("-").pop().replace(/\d+$/, ""), address) && !DEPARTMENT_HEADS.has(dotted[0])) return true;
  }
  return false;
}
function mailboxIsOrganisational(address, names) {
  const at = address.lastIndexOf("@");
  if (at <= 0) return false;
  const local = lookupLocal(address, at);
  if (isRoleLocal(local, address)) return true;
  if (mailboxNamesPerson(address, names)) return false;
  return local.split(/[._\-+]+/).filter(Boolean).length > 1;
}
function mailboxIsNonPersonal(address) {
  const at = address.lastIndexOf("@");
  if (at <= 0) return false;
  const local = lookupLocal(address, at);
  if (isRoleLocal(local, address)) return true;
  const parts = local.split(/[._\-+]+/).filter(Boolean);
  if (parts.length > 1 && isRoleLocal(parts[parts.length - 1], address) && !parts.some((p) => looksLikeGivenName(p))) {
    return true;
  }
  return isReservedMailDomain(address.slice(at + 1));
}
var MBI_RE = rx(`${BL}[1-9][AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\\d-?[AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\\d-?[AC-HJKMNP-RT-Y]{2}\\d{2}${BR}`);
var HEALTH_INS_RE = rx(
  `${BL}[A-Za-z](?:[ \\-]|\\r?\\n[ \\t]*)?\\d(?:[ ]?(?:\\r?\\n[ \\t]*)?\\d){8,9}(?:[ ][A-Z](?![${Wd}]))?${BR}|${BL}[A-Za-z](?:[ ]\\d){9}${BR}`
);
var HEALTH_INS_LABEL_HEAD_RE = rx(
  `${BL}(?:krankenversicherten-?(?:nr|nummer)|krankenversicherungs-?(?:nr|nummer)|versicherten-?(?:nr|nummer)|vers\\.?-?[ \\t]?nr|kv-?nr|pkv-?(?:vers\\.?-?)?nr|insured[ \\t]+(?:number|no|id)|member[ \\t]+id|(?:health[ \\t]+)?insurance[ \\t]+(?:number|no|id))\\.?[ \\t]*(?:\\((?:[A-Za-z ]{2,24})\\)[ \\t]*)?(?:(?:ist|lautet|is|war|was)[ \\t]+)?[:#]?[ \\t]*(?:\\r?\\n[ \\t]*(?:\\p{Lu}[\\p{L} .&-]{1,28},[ \\t]*)?)?`,
  "iu"
);
var HEALTH_INS_LABEL_TOKEN_RE = new RegExp(`(?<tok>[A-Z0-9][A-Z0-9 \\-]{4,17}[A-Z0-9])(?![\\p{L}\\p{N}])`, "uy");
var INSURER_ABOVE_RE = /(?:medicare|medicaid|medigap|payer|health[ \t]+(?:insurance|plan)|insurer|blue[ \t]+cross|krankenkasse|krankenversicherung|versicherungsnummer)/i;
var PKV_NUMBER_RE = rx(`${BL}PKV-\\d{6,12}${BR}`);
var US_POLICY_NUMBER_RE = rx(`(?<![\\p{L}\\p{N}])(?:policy|member|subscriber|plan)[ \\t]*(?:no\\.?|number|id|#)?[ \\t:]*(?<num>[A-Z]{2,4}-?\\d{8,10})(?![\\p{L}\\p{N}])`, "iu");
var ICD10_RE = rx(`${BL}[A-TV-Z]\\d{2}(?:\\.\\d{1,2})?${BR}`);
var ABSENCE_VALUE_RE = /^(?:keine?|kein|ohne|nicht|n\.?\s?a\.?|k\.?\s?a\.?|none|n\/a|entfällt|unbekannt|-+|\.+)\b/i;
function isAbsenceValue(value) {
  const v = String(value || "").trim();
  return !v || ABSENCE_VALUE_RE.test(v) || /\b(?:keine Angabe|ohne Angabe|nicht angegeben|nicht bekannt|no data)\b/i.test(v);
}
var RELIGION_LABEL_RE = rx(
  `(?:Konfession|Religionszugeh\xF6rigkeit|Religion|Glaubensrichtung|Weltanschauung|Faith|Denomination|Religious affiliation)(?:[^\\n:.\xB7|(]|\\.(?![ \\t]+[A-Z\xC4\xD6\xDC])|\\([^)\\n]{0,30}\\)|\\([^\\n:)]{0,30}){0,30}:\\s*([A-Za-z\xE4\xF6\xFC\xDF\\u0300-\\u036F][^\\n,;(]*?)\\s*(?:[\\n,;(]|$)`,
  "i"
);
var NAT_STATUTE_HEAD_RE = /^(?:Act|Acts|Law|Laws|Code|Test|Status|Certificate|Form|Policy|Rules?|Section|Office|Application|Requirements?|Check|Services?|Department|Authority|Documents?|Proof|Evidence|Verification|Clause|Gesetz|Recht|Antrag)$/;
var NATIONALITY_LABEL_RE = rx(
  `(?:Staatsangeh\xF6rigkeit|Staatsb\xFCrgerschaft|Nationalit\xE4t|Geburtsland|ethnische Herkunft|Nationality|Citizenship|Ethnicity|Ethnic origin|Country of birth|Country of origin|National origin)\\s*:?\\s*([A-Za-z\xE4\xF6\xFC\xDF\\u0100-\\u017F\\u0300-\\u036F][A-Za-z\xE4\xF6\xFC\xDF\\u0100-\\u017F\\u0300-\\u036F \\-]*[A-Za-z\xE4\xF6\xFC\xDF\\u0100-\\u017F\\u0300-\\u036F])`,
  "i"
);
var HEALTH_LABELS = `Gesundheitsangabe|Gesundheitszustand|Erkrankung|Krankheit|Vorerkrankung|Behinderung|Grad der Behinderung|Pflegegrad|Merkzeichen|Medikation|Medikamente|Arzneimittel|Verordnung|Diagnosen|Diagnose|Diagnosis|Medical condition|Health condition|Illness|Disease|Disability|Allergien|Allergie|Unvertr\xE4glichkeiten|Allergies|Allergy`;
var LBL_PAD = `[^${CAP}${LOW}\\d\\n]*`;
var HEALTH_LABEL_RE = rx(
  // The label word may be the tail of a German compound ("Verdachtsdiagnose:", "Vorerkrankung:"),
  // so the left edge is the start of the whole word, never the middle of it — matching inside the
  // compound made the capture begin at whatever followed the fragment.
  // "Rx" and "GdB" are abbreviations: standalone only. As a compound tail "rx" is the end of "Marx" and the
  // label rule then captured the whole next field ("Interviewerin: Dr. Lena Marx. Teilnehmerin: Paris Krämer, …").
  `${BL}(?:[${CAP}${LOW}]*(?:${HEALTH_LABELS})|Rx|GdB)${BR}[^:|\\t\\n]{0,24}?[:|\\t]${LBL_PAD}([${CAP}${LOW}\\d][^\\n;]*?)(?=[^\\S\\r\\n]*(?:\\.(?:[^\\S\\r\\n]|$)|;|$)|[ \\t]+[${CAP}][${LOW}\\-]{3,}(?:[ \\t][${CAP}]?[${LOW}]+)?:(?:[ \\t]|$))`,
  "im"
);
var HEALTH_LABEL_NOCOLON_RE = rx(
  `^[ \\t]*(?:Diagnosen|Hauptdiagnose|Nebendiagnosen|Vorerkrankungen|Allergien|Dauermedikation)[ \\t]+([${CAP}][^\\n;]*?)(?=[ \\t]*(?:\\.(?:[ \\t]|$)|;|$))`,
  "m"
);
var ALLERGY_PAREN_RE = rx(`${BL}([${CAP}][${LOW}]{3,})[ \\t]*\\((?:Allergie|Unvertr\xE4glichkeit|allergi)`, "");
var HEALTH_DEGREE_RE = rx(
  `${BL}(?:Grad[ \\t]+der[ \\t]+Behinderung|GdB|Behinderungsgrad|Pflegegrad|Pflegestufe|Schwerbehinderung|Grade[ \\t]+of[ \\t]+disability|Degree[ \\t]+of[ \\t]+disability|Care[ \\t]+level)${BR}[^\\S\\r\\n]*[:=]?[^\\S\\r\\n]*(?:von[ \\t]+)?(?:\\d{1,3}[ \\t]*%?|(?:eins|zwei|drei|vier|f\xFCnf)${BR})`,
  "i"
);
var HEALTH_ASSISTIVE_RE = rx(
  `${BL}(?:uses|needs|requires|relies[ \\t]+on|is[ \\t]+dependent[ \\t]+on|benutzt|nutzt|ben\xF6tigt|braucht|ist[ \\t]+angewiesen[ \\t]+auf|sitzt[ \\t]+im)[ \\t]+(?:a|an|the|einen|eine|einem|einer|den|der|das|dem)?[ \\t]*(?:wheelchair|walking[ \\t]frame|walker|rollator|rollstuhl|gehhilfe|gehwagen|hearing[ \\t]aid|h\xF6rger\xE4t|hoergeraet|prosthesis|prothese|guide[ \\t]dog|blindenhund|oxygen|sauerstoff|catheter|katheter|feeding[ \\t]tube|magensonde|insulin[ \\t]pump|insulinpumpe|dialysis|dialyse)`,
  "i"
);
var ALCOHOL_LEVEL_RE = rx(
  // "%" is deliberately NOT a unit here. Breath and blood alcohol are written in mg/l or ‰; a
  // percentage is an interest rate, a tax rate or a lab value, and including it turned every
  // "3,45 % p.a." in a mortgage offer into somebody's criminal record.
  `${BL}\\d{1,2}[,.]\\d{1,3}[ \\t]*(?:mg\\/l|g\\/l|\u2030|promille)[ \\t]*(?:(?:Atem|Blut)?alkohol\\w*)?`,
  "i"
);
var BP_COUNTRIES = "Deutschland|Germany|T\xFCrkei|Turkey|Polen|Poland|Syrien|Syria|Vietnam|Ukraine|Russland|Russia|Rum\xE4nien|Romania|Bulgarien|Bulgaria|Kroatien|Croatia|Serbien|Serbia|Bosnien|Kosovo|Albanien|Italien|Italy|Spanien|Spain|Frankreich|France|Griechenland|Greece|\xD6sterreich|Austria|Schweiz|Niederlande|Netherlands|Belgien|Marokko|Morocco|Tunesien|Algerien|\xC4gypten|Egypt|Libanon|Lebanon|Irak|Iraq|Iran|Afghanistan|Pakistan|Indien|India|Nigeria|Ghana|Kenia|Kenya|Kasachstan|Ungarn|Hungary|Tschechien|Slowakei|Slovakia|Portugal|England|UK|USA|Kolumbien|Colombia|Brasilien|Brazil|China|Japan|Eritrea|Somalia|\xC4thiopien|Ethiopia|Senegal|Kamerun|Lettland|Litauen|Estland|Moldau|Georgien|Armenien|Aserbaidschan|Jordanien|Pal\xE4stina|Israel|Mexiko|Mexico|Peru|Chile|Argentinien|Schweden|D\xE4nemark|Norwegen|Finnland|Irland|Ireland|Kuba|Ecuador|Bangladesch|Sri Lanka|Nepal|Thailand|Philippinen";
var BP_LOW = `${LOW}\\u1E00-\\u1EFF`;
var BP_NAME = `[${CAP}][${BP_LOW}]+(?:(?:[ -]|[ ](?:am|an der|im|bei|ob der|in der|an|auf)[ ])(?!(?:Staatsangeh|Staatsb\xFCrger|Familienst|Anschrift|Telefon|Nationalit|Geschlecht|Konfession|Religion|Wohnort|Beruf|Steuer|Personal|Ausweis|Mobil|E-Mail|Email|Wohnanschrift|Adresse))[${CAP}][${BP_LOW}]+){0,2}(?:\\s*\\([${CAP}][${BP_LOW}]+\\))?`;
var BP_PLACE = `(${BP_NAME}(?:,[ \\t]?(?:${BP_COUNTRIES})${BR})?)`;
var BP_DATE = `(?:[ \\t]+(?:bin|wurde|ist|war)(?:[ \\t]+ich)?)?(?:(?:[ \\t]+|[ \\t]*\\r?\\n[ \\t]*)(?:am|arn|on|den|the|in))?(?:\\s{0,2}(?:\\d[ ]?\\d?[./-]\\d{1,2}[./-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}(?:st|nd|rd|th)?\\.?[ \\t]*\\r?\\n?[ \\t]*[A-Za-z\xE4\xF6\xFC\xC4\xD6\xDC]{3,9}\\.?,?[ \\t\\r\\n]*\\d{4}|[A-Za-z]{3,9}[ \\t]+\\d{1,2}(?:st|nd|rd|th)?,?[ \\t]+\\d{4}|\\d{4}))?`;
var BIRTH_PLACE_RE = rx(
  // case-flexible cues, but the captured place must stay capitalised (no /i flag, which would
  // let [CAP] match lowercase and grab common words).
  // `geb.` is the same cue as `geboren` and by far the commoner spelling in forms and registers.
  // A birth place is written with its country as often as without ("Adana, Türkei", "Hue,
  // Vietnam", "Lagos, Nigeria"). Capturing only the town leaves the country in the document,
  // which for a place of birth is most of what makes it identifying in the first place. After a
  // field LABEL any capitalised word is the country; after a free-text cue only a listed one is,
  // or "geb. 17.09.2012 in Aschersleben, Klasse 8b" would take "Klasse".
  `(?:[Gg]eburtsort(?:[ \\t]*/[ \\t]*(?:-?[Ll]and|Staat))?\\s*[:|]?\\s*|[Pp]lace of [Bb]irth\\s*[:|]?\\s*)(${BP_NAME}(?:,[ \\t]?[${CAP}][${BP_LOW}]+(?:[ -][${CAP}][${BP_LOW}]+){0,2})?|[${CAP}]{4,}(?:[ -][${CAP}]{3,}){0,2})|(?:[Gg]eb(?:oren)?\\.?:?${BR}${BP_DATE}[ \\t]*,?[ \\t]*(?:\\r?\\n[ \\t]*)?in\\s+|[Bb]orn${BR}${BP_DATE}[ \\t]*,?[ \\t]*(?:\\r?\\n[ \\t]*)?in\\s+|[Bb]orn[ \\t]*:[ \\t]*${BP_DATE}[ \\t]*,[ \\t]*)` + BP_PLACE
);
var BIRTH_DATE_PLACE_FIELD_RE = rx(
  `[Gg]eburtsdatum[ \\t]*(?:und|/|,|&)[ \\t]*(?:[Gg]eburtsort|-ort)[^\\n:]{0,20}(?::[ \\t]*|[ \\t]*\\r?\\n[ \\t]*)(?:\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})[ \\t]*(?:,|/|in|-)[ \\t]*(${BP_NAME})`
);
var BIRTH_DATE_COMMA_PLACE_RE = rx(
  `[Gg]eburtsdatum[ \\t]*:[ \\t]*(?:\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})[ \\t]*,[ \\t]*(${BP_NAME})(?=[ \\t]*(?:\\r?\\n|$))`
);
var BIRTH_DATE_IN_PLACE_RE = rx(
  `(?<![\\d.])\\d{1,2}\\.\\d{1,2}\\.\\d{4}[ \\t]+in[ \\t]+(${BP_NAME})(?=[ \\t]*,[ \\t]*(?:wohnhaft|whnh\\.|wh\\.))`
);
var BIRTH_PLACE_BEFORE_RE = rx(
  `(?<=${BL}in[ \\t]+)(${BP_NAME})(?=[ \\t]+(?:geboren|geb\\.|born)${BR})`
);
var ORIGIN_PLACE_RE = rx(
  `(?:${BL}(?:Herr|Frau|Familie|Mutter|Vater|Eltern|Gro\xDFvater|Gro\xDFmutter|Patient|Patientin|Mandant|Mandantin|Kl\xE4ger|Kl\xE4gerin|Er|Sie|er|sie|ich|Ich)${BR})[^.\\n]{0,40}?${BL}stamm(?:t|te|en)[ \\t]+(?:urspr\xFCnglich[ \\t]+|v\xE4terlicherseits[ \\t]+|m\xFCtterlicherseits[ \\t]+)?aus[ \\t]+(?:einem[ \\t]+Dorf[ \\t]+bei[ \\t]+)?(${BP_NAME})`
);
var ORIGIN_NAME_RE = rx(
  `${BL}([${CAP}][${LOW}]+)[ \\t]+(?:ist|war)[^.\\n]{0,60}?${BL}und[ \\t]+stamm(?:t|te)[ \\t]+(?:urspr\xFCnglich[ \\t]+)?aus[ \\t]+(${BP_NAME})`
);
var QUOTED_ALIAS_RE = new RegExp(`(?<![\\p{L}\\p{N}])[\u201E\u201C"'\xBB\u201A\u2018]((?:\\p{Lu}[\\p{L}'\u2019-]{2,19}))[\u201C\u201D"'\xAB\u2019\u2018](?![\\p{L}\\p{N}])`, "gu");
var ALIAS_CUE_RE = new RegExp(
  "(?<![\\p{L}])(?:genannt|nennt|nennen|nannte|genannt zu|Spitzname[n]?|Rufname[n]?|Kosename[n]?|K\xFCnstlername|Alias|nickname|known as|called|also known|goes by|angesprochen|ansprechen|anreden|angeredet|Anrede|Schreibweise[n]?|Schreibfehler|Tippfehler|Namens|Nachnamens|Vorname[n]?|Nachname[n]?|im Alltag|bei Freunden|bei den Kollegen|Kollegen sagen|unter dem Namen|meldet sich)(?![\\p{L}])",
  "iu"
);
var GEB_NAME_RE = rx(`${BL}(?:geb\\.|geborene[rn]?|n\xE9e|geboren als)\\s+([${CAP}][${LOW}]+(?:-[${CAP}][${LOW}]+)?)${BR}`);
var AFFILIATION_LABEL_RE = rx(
  `(?:Gewerkschaft(?:szugeh\xF6rigkeit)?|Partei(?:zugeh\xF6rigkeit|mitgliedschaft)?|Politische[rs]? (?:Ausrichtung|Meinung|Zugeh\xF6rigkeit))[^\\n:]*:\\s*(?:Mitglied\\s+(?:der|des|bei|im|in der)?\\s*)?([A-Za-z\xC4\xD6\xDC\xE4\xF6\xFC\xDF\\u0300-\\u036F][^\\n;(]*?)\\s*(?:[\\n;(]|$)`,
  "i"
);
var AFFILIATION_MEMBER_RE = rx(
  `Mitglied\\s+(?:der|des|bei|im|in der)?\\s*((?:Gewerkschaft|Partei)\\s+[A-Za-z\xC4\xD6\xDC\xE4\xF6\xFC\xDF\\u0300-\\u036F][${Wd}\\u0300-\\u036F.\\-/ ]*?[${Wd}\\u0300-\\u036F])\\s*(?:[\\n,;(]|\\.(?=[\\s]|$)|$)`,
  "i"
);
var MASKED_CARD_RE = rx(
  `${BL}(?:VISA|Master ?Card|Amex|American Express|Maestro)${BR}[ :*xX\u2022\\d]*\\d{4}${BR}`,
  "i"
);
var OBFUSCATED_EMAIL_RE = rx(
  `(?<![\\p{L}\\p{N}_.+\\-])[\\p{L}\\p{N}_.+\\-]+(?:\\s*[\\(\\[]\\s*(?:at|dot|punkt)\\s*[\\)\\]]\\s*[\\p{L}\\p{N}_.+\\-]+)+`,
  "iu"
);
var OBFUSCATED_EMAIL_LOOSE_RE = rx(
  `(?<![\\p{L}\\p{N}_.+\\-])[\\p{L}\\p{N}_.+\\-]+(?:[ \\t]+(?:at|dot|punkt)[ \\t]+[\\p{L}\\p{N}_.+\\-]+)*[ \\t]+(?:dot|punkt)[ \\t]+(?:de|com|net|org|eu|info|biz|io)${BR}`,
  "iu"
);
var SPLIT_EMAIL_RE = rx(
  `(?<![\\p{L}\\p{M}\\p{N}_.+\\-])([\\p{L}\\p{M}\\p{N}_+\\-]+(?: ?\\. ?[\\p{L}\\p{M}\\p{N}_+\\-]+)*) ?@ ?([\\p{L}\\p{M}\\p{N}\\-]+(?: ?\\.[ ]?[\\p{L}\\p{M}\\p{N}\\-]+)+)(?![\\p{L}\\p{M}\\p{N}_])`,
  "u"
);
var SHAPED_LOCAL_PART_RE = new RegExp("[._+-]|\\p{N}", "u");
var WORDY_LOCAL_PART_RE = new RegExp("\\p{L}{2,}", "u");
var EMAIL_LABELS = ["e-mail", "email", "e mail", "mail", "mailadresse", "e-mailadresse", "mailto"];
var GAZETTEER_NAME_RE = rx(
  `${BL}([${CAP}][${LOW}]+)(?:${NAME_GAP}+(?:von|van|de|der|zu|den|zum|del|di|la)){0,2}(?:${NAME_GAP}+[${CAP}][${LOW}]+(?:-[${CAP}][${LOW}]+)?){1,2}`
);
var GAZ_PARTICLE_RE = /^(?:von|van|de|der|zu|den|zum|del|di|la)$/i;
var PRODUCT_HEAD_RE = new RegExp(
  "^(?:\\p{L}*(?:kleber|set|sets|platte|platten|paste|spray|system|systeme|matratze|lizenz|paket|werkzeug|ger\xE4te?|maschine|leuchte|schnittstelle|regal|poster)|pro|plus|lite|mini|comfort|classic|premium|connect|suite|hub|cloud|storage|kettle|keyboard|sofa|bed|lamp|vase|licen[cs]e|dashboard|portal|store|shop|backwaren|baumarkt|brauhaus|backstube|werkstatt|burgergrill|ofenbau|bandage|inkontinenzvlies|\\p{L}{3,}(?:staubsauger|sp\xFClmittel|blumenerde|k\xFChlbox|schreibtisch|pflegebett|tischlampe|leuchte|pumpe|pumpen|pflegeroboter|w\xE4rmepumpe|dachziegel|heizkostenrechner|d\xE4mmplatten)|staubsauger|sp\xFClmittel|blumenerde|k\xFChlbox|schreibtisch|pflegebett|pumpe|pumpen|pflegeroboter|w\xE4rmepumpe|dachziegel|platform|protect|clean|vision|blender|sprinter|actros|vito|citan|atego|canvas|\\p{L}-klasse)$",
  "iu"
);
var BUSINESS_HEAD_RE = new RegExp(
  "^(?:ristorante|trattoria|osteria|pizzeria|b\xE4ckerei|metzgerei|konditorei|restaurant|bistro|caf\xE9|cafe|gasthaus|gasthof|imbiss|apotheke|boutique|analytics|\\p{L}{3,}(?:t\xFCcher|kissen|st\xE4nder|station))$",
  "iu"
);
var PRODUCT_SIZE_RE = /(?:^|[ ])(?:XS|XL|XXL)(?:[ ]|$)|\d[ ]?(?:l|L|ml|kg|cm|mm|W|kW|V)(?:[ ]|$)|\d+-teilig|(?:^|[ ])PN\d+|(?:^|[ ])\d[A-Z](?:[ ]|$)/;
var ARTICLE_NOUN_BEFORE_RE = /(?:^|[^\p{L}])(?:Leuchte|Lampe|Kommode|Vase|Teppich|Bett|Spiegel|Regal|Sessel|Sofa|Stuhl|Tisch|Schrank|Kissen|Decke|Hocker|Schale|Sitzschale|Kühlbox|Matratze|Kerze)[ ]+$/u;
function articleNameAt(text, start, end) {
  if (!ARTICLE_NOUN_BEFORE_RE.test(text.slice(Math.max(0, start - 24), start))) return false;
  const m = /^[ ]*(\S*)/u.exec(text.slice(end, end + 40));
  const tok = m[1];
  if (!tok) return true;
  if (/^\d/.test(tok) || new RegExp("^\\p{Ll}", "u").test(tok)) return true;
  return new RegExp("^\\p{Lu}\\p{L}+$", "u").test(tok) && /^[ ]*(?:\r?\n|$)/.test(text.slice(end + m[0].length, end + m[0].length + 3));
}
var TRADE_HEAD_RE = /^(?:store|shop|backwaren|baumarkt|brauhaus|backstube|werkstatt|burgergrill|ofenbau)$/i;
function givenNameLeadsProduct(text, givenEnd, anyCase = false) {
  const m = (anyCase ? new RegExp("^[ ]+(\\p{L}[\\p{L}\\d-]*)", "u") : /^[ ]+([\p{Lu}][\p{L}\d-]*)/u).exec(text.slice(givenEnd, givenEnd + 40));
  return !!m && (PRODUCT_HEAD_RE.test(m[1]) && !TRADE_HEAD_RE.test(m[1]) || /^analytics$/i.test(m[1]));
}
function nameLedProductAt(text, givenEnd, anyCase = false) {
  const rest = text.slice(givenEnd, givenEnd + 70);
  const re = anyCase ? new RegExp("^[ ]+(\\p{L}[\\p{L}\\d-]*)", "u") : /^[ ]+([\p{Lu}][\p{L}\d-]*)/u;
  let off = 0;
  for (let n = 0; n < 3; n++) {
    const m = re.exec(rest.slice(off));
    if (!m) break;
    if (PRODUCT_HEAD_RE.test(m[1]) || n === 0 && BUSINESS_HEAD_RE.test(m[1])) return true;
    off += m[0].length;
  }
  const w = new RegExp("^[ ]+(\\p{Lu}[\\p{L}-]{3,})((?:[ ]+[\\p{L}\\d.,-]+){1,2})", "u").exec(rest);
  if (w && /^(?:Serie|Modell|Typ|Set|Pack)$/i.test(w[1])) return /\d/.test(w[2]);
  if (w && isCommonWord(w[1]) && PRODUCT_SIZE_RE.test(w[2].trim())) return true;
  return false;
}
function trimGazetteerRun(text, start, end) {
  for (; ; ) {
    const run = text.slice(start, end);
    const toks = run.split(/ +/);
    if (toks.length < 2) return null;
    const last = toks[toks.length - 1];
    const fragment = end < text.length && new RegExp("\\p{L}", "u").test(text[end]);
    const extraThird = toks.length === 3 && !toks.some((t) => GAZ_PARTICLE_RE.test(t)) && !looksLikeGivenName(toks[1]);
    if (!fragment && !extraThird) return end;
    end = start + run.slice(0, run.length - last.length).replace(/ +$/, "").length;
  }
}
var LONE_GIVEN_NAME_RE = rx(`${BL}([${CAP}][${LOW}]+)${BR}`);
var CALENDAR_TOKENS = /* @__PURE__ */ new Set([
  "januar",
  "februar",
  "m\xE4rz",
  "maerz",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "dezember",
  "january",
  "february",
  "march",
  "june",
  "july",
  "october",
  "december",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "okt",
  "oct",
  "nov",
  "dez",
  "dec",
  "montag",
  "dienstag",
  "mittwoch",
  "donnerstag",
  "freitag",
  "samstag",
  "sonntag",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "mon",
  "tue",
  "tues",
  "wed",
  "thu",
  "thur",
  "thurs",
  "fri",
  "sat",
  "sun"
]);
function termAlternation(set) {
  return [...set].sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}
var RELIGION_TERM_RE = rx(`${BL}(?:${termAlternation(RELIGION_TERMS)})${BR}`, "i");
var RELIGION_MEMBER_BEFORE_RE = /(?:mitglied(?:schaft)?|member(?:ship)?)(?:[ \t]+(?:der|in der|im|bei der|of|of the|in the))?(?:[ \t]+(?:local|örtlichen))?[ \t:]*$/iu;
var RELIGION_CODE_FIELD_RE = /(?<![\p{L}])(?:Konfession|Kirchensteuer|KiSt|Religion)[ \t]+\(?(?:(röm\.?[- ]?kath\.?|evang\.|ev\.|gr(?:ch|iech)\.?[- ]?orth\.?)(?=[\s).,;|·]|$)|(rk|ev|lt|rf|ak|ib|is|iw|jd|jh)(?=[ \t]*(?:$|[\n\r).,;|·\t])))/giu;
var RELIGION_BRACKET_RE = /(?<![\p{L}])(?:Religion|Religionszugehörigkeit|Konfession|Glauben)[ \t]*\(([\p{Lu}][\p{L}.-]{2,24})\)/gu;
var COPULA_SUBJECT_WORD_RE = /(?:^|[^\p{L}])(?:ich|er|sie|wir|he|she|i|we|they|frau|herr|herrn|mr|mrs|ms|dr|familie|family|patient(?:in)?|mandant(?:in)?|mutter|vater|mama|papa|mother|father|braut|bräutigam|bewerber(?:in)?|kläger(?:in)?)(?![\p{L}])/iu;
function copulaHasPersonSubject(text, at) {
  const lo = Math.max(0, at - 80);
  const seg = text.slice(lo, at);
  const cut = Math.max(seg.lastIndexOf("."), seg.lastIndexOf("!"), seg.lastIndexOf("?"), seg.lastIndexOf(";"), seg.lastIndexOf("\n"));
  const clause = seg.slice(cut + 1);
  if (COPULA_SUBJECT_WORD_RE.test(clause)) return true;
  const toks = clause.match(/[A-ZÄÖÜ][\p{L}\p{N}_'’-]+/gu) || [];
  return toks.length >= 2 && toks.slice(-2).every((w) => !isCommonWord(w));
}
var RELIGION_COPULA_RE = new RegExp(`(?<![\\p{L}])(?:ist|bin|sind|war|waren|is|am|are|was)[ \\t]+(?:(?:gl\xE4ubige[rn]?|praktizierende[rn]?|practising|practicing|devout|a|an)[ \\t]+)?(${termAlternation(["orthodox", "shia", "shiite", "sunni", "christian", "christlich", "j\xFCdisch", "buddhistisch", "hinduistisch", "atheist", "atheistisch", "agnostic", "agnostisch"])})(?![\\p{L}])(?=[ \\t]*(?:[,.;:!?)]|und(?![\\p{L}])|and(?![\\p{L}])|aber(?![\\p{L}])|$))`, "gimu");
var RELIGION_STEM_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${RELIGION_STEMS.join("|")})[\\p{L}]{0,6}`,
  "giu"
);
var RELIGION_INSTITUTION_AFTER_RE = new RegExp(
  `^[ \\t]+(?:Krankenhaus|Klinik|Klinikum|Kirche|Kirchengemeinde|Kirchgemeinde|Kirchenkreis|Schule|Grundschule|Gymnasium|Kindergarten|Kindertagesst\xE4tte|Kita|Hochschule|Universit\xE4t|Fachhochschule|Stiftung|Akademie|Verlag|Bank|Pflegedienst|Altenheim|Seniorenheim|Stift|Jugendwerk|Presse|Zentrum|Gemeindehaus|Diakonie|Landeskirche|Bildungswerk|Familienbildung|Beratung)`,
  "u"
);
var AFFILIATION_STEM_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${AFFILIATION_STEMS.join("|")})(?:-?[Mm]itglied(?:schaft)?)?(?![\\p{L}\\p{N}])`,
  "giu"
);
var PARTY_ALT = "GEW|EVG|GDL|DGB|NGG|GdP|SPD|CDU|CSU|FDP|AfD|BSW|Die Linke|Die Gr\xFCnen|B\xFCndnis 90(?:\\/Die Gr\xFCnen)?|Gr\xFCnen|Freie W\xE4hler|NPD|Piratenpartei|\xD6DP|Volt";
var PARTY_MEMBER_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:(?:Mitglied|Parteimitglied|Vorsitzende[rn]?|Mitglieder|member|Ortsverband|Ortsverein|Kreisverband)\\s+(?:der|des|bei|von|im|of|the)?\\s*(?:Partei\\s+)?(?:${PARTY_ALT})|(?:${PARTY_ALT})[- ](?:Ortsverein|Ortsverband|Kreisverband|Mitglied|Mitgliedsbeitrag|Fraktion|nah|Abgeordnete|Stadtrat)\\p{L}*(?:[ \\t]+\\p{Lu}[\\p{L}-]+)?)(?![\\p{L}\\p{N}])`,
  "gu"
);
var ASSOCIATION_MEMBER_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:Mitglied|Vorsitzende[rn]?|member)\\s+(?:im|in|des|der|beim|von|of the|of)\\s+((?:\\p{Lu}[\\p{L}-]*\\s+){0,2}\\p{L}*(?:verein|club|ortsverein|ortsverband)(?:[ \\t]+\\p{Lu}[\\p{L}-]+)?)`,
  "giu"
);
var NAT_ADJ_EN = "Syrian|Vietnamese|Turkish|Polish|Ukrainian|Russian|Romanian|Bulgarian|Croatian|Serbian|Bosnian|Albanian|Italian|Spanish|Greek|Portuguese|French|Dutch|British|American|Iraqi|Iranian|Afghan|Pakistani|Indian|Chinese|Thai|Lebanese|Moroccan|Tunisian|Algerian|Egyptian|Eritrean|Somali|Nigerian|Ghanaian|Kenyan|Kazakh|Georgian|Armenian|Hungarian|Czech|Slovak|Lithuanian|Latvian|Estonian|Kosovar|Macedonian|Palestinian|Israeli|Brazilian|Colombian|Mexican|Japanese|Korean|Filipino|Austrian|Swiss|Danish|Swedish|Norwegian|Finnish|Irish|Belgian|German";
var NATIONALITY_CUE_RE = new RegExp(
  `(?:geboren|geb\\.|born)(?![\\p{L}])(?:[^.\\n]|(?<=\\d)\\.(?=\\d)){0,80}?,[ \\t]*(\\p{L}{3,}isch(?:e[rnsm]?)?|(?:${NAT_ADJ_EN}))(?=[ \\t]*[,;.])|(?<![\\p{L}])(\\p{L}{3,}isch(?:er|en|e)?)[ \\t]+(?:Eltern|Herkunft|Abstammung|Wurzeln)(?![\\p{L}])|(?:I['\u2019]m|I am|he is|she is|they are|is|was)[ \\t]+(?:a[ \\t]+)?(${NAT_ADJ_EN})(?![\\p{L}])(?=[ \\t]*[.,;])|(?:my|his|her|their|our|a|an)[ \\t]+(${NAT_ADJ_EN})[ \\t]+(?:certificate|passport|degree|qualification|citizenship|nationality|background|origin|parents|family|heritage)(?![\\p{L}])`,
  "gu"
);
var NAT_DEMONYMS_DE = "deutsch|t\xFCrkisch|polnisch|syrisch|vietnamesisch|ukrainisch|russisch|rum\xE4nisch|bulgarisch|kroatisch|serbisch|bosnisch|albanisch|italienisch|spanisch|griechisch|portugiesisch|franz\xF6sisch|niederl\xE4ndisch|britisch|amerikanisch|irakisch|iranisch|afghanisch|pakistanisch|indisch|chinesisch|thail\xE4ndisch|libanesisch|marokkanisch|tunesisch|algerisch|\xE4gyptisch|eritreisch|somalisch|nigerianisch|ghanaisch|kenianisch|kasachisch|georgisch|armenisch|ungarisch|tschechisch|slowakisch|litauisch|lettisch|estnisch|kosovarisch|mazedonisch|pal\xE4stinensisch|israelisch|brasilianisch|kolumbianisch|mexikanisch|japanisch|koreanisch|philippinisch|\xF6sterreichisch|schweizerisch|d\xE4nisch|schwedisch|norwegisch|finnisch|irisch|belgisch|jordanisch|afrikanisch|staatenlos|(?:dt|t\xFCrk|vietn|poln|syr|ukr|russ|rum|bulg|kroat|serb|ital|span|griech|franz|brit|amerik)\\.";
var NAT_FIRST_DEMONYM_RE = new RegExp(`^(?:${NAT_DEMONYMS_DE}|${NAT_ADJ_EN})(?:e[rnsm]?)?$`, "iu");
var NAT_ROW_DATE = "(?:\\d{1,2}[./]\\d{1,2}[./](?:\\d{4}|\\d{2})|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\.[ \\t]*\\p{Lu}\\p{Ll}{2,8}\\.?[ \\t]*\\d{4})";
var NATIONALITY_ROW_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])${NAT_ROW_DATE}[ \\t]+(?:(\\p{Lu}[\\p{L}'\u2019-]{2,24}(?:[ \\t]\\p{Lu}[\\p{L}'\u2019-]{2,24})?(?:[ \\t]\\([A-Z]{2,3}\\))?)[ \\t]+)?(${NAT_DEMONYMS_DE}|${NAT_ADJ_EN})(?![\\p{L}\\p{N}])(?![ \\t]+\\p{Ll})`,
  "gu"
);
var NATIONALITY_R7_RE = new RegExp(`(?:geboren|geb\\.|born)(?![\\p{L}])(?:[^.\\n]|(?<=\\d)\\.(?=\\d)){0,80}?,[ \\t]*(\\p{L}{3,}isch)(?=[ \\t]*(?:\\r?\\n|$))|(?<![\\p{L}])\\p{Lu}[\\p{L}'\u2019-]+[ \\t]*\\((${NAT_DEMONYMS_DE}|${NAT_ADJ_EN})(?=[ \\t]*[,)])|(?<![\\p{L}])(?:[Ii]ch bin|ist|sind|bin)[ \\t]+(?:eine?[ \\t]+)?(Vietnamese|Vietnamesin|T\xFCrke|T\xFCrkin|Pole|Polin|Syrer|Syrerin|Ukrainer|Ukrainerin|Russe|Russin|Italiener|Italienerin|Grieche|Griechin|Kroate|Kroatin|Serbe|Serbin|Rum\xE4ne|Rum\xE4nin|Bulgare|Bulgarin|Afghane|Afghanin|Iraker|Irakerin|Iraner|Iranerin|Marokkaner|Marokkanerin|Libanese|Libanesin|Kurde|Kurdin|Spanier|Spanierin|Portugiese|Portugiesin|Franzose|Franz\xF6sin|Brite|Britin|Amerikaner|Amerikanerin|\xD6sterreicher|\xD6sterreicherin|Niederl\xE4nder|Niederl\xE4nderin|Albaner|Albanerin|Bosnier|Bosnierin|Kosovare|Kosovarin|Eritreer|Eritreerin|Somalier|Somalierin|Nigerianer|Nigerianerin|Inder|Inderin|Chinese|Chinesin|Japaner|Japanerin|Koreaner|Koreanerin|Ungar|Ungarin|Tscheche|Tschechin)(?![\\p{L}])(?=[ \\t]*(?:[,.;]|aber|und))|(?:^|[.!?)][ \\t]+)(${NAT_ADJ_EN}),[ \\t]+(?:joined|born|lives|living|aged|married|single|works|working|employed|speaks|moved)(?![\\p{L}])|(?:Staatsang\\.|Nationality[ \\t]*/|Staatsangeh\xF6rigkeit[ \\t]*/)[ \\t]*:?[ \\t]*(${NAT_DEMONYMS_DE}|${NAT_ADJ_EN})(?![\\p{L}])|(?<![\\p{L}])((?:dt|t\xFCrk|poln|syr|ukr|russ|rum|bulg|kroat|serb|ital|span|griech|franz|brit|amerik|vietn)\\.)[ \\t]+Staatsangeh\xF6rigkeit|(?<![\\p{L}])(\\p{L}{3,}sche)[ \\t]+(?:und|oder|sowie)[ \\t]+(?:die[ \\t]+)?(\\p{L}{3,}sche)[ \\t]+[Ss]taats(?:angeh\xF6rig|b\xFCrger)`, "gmu");
var NAT_CONTINUATION_RE = new RegExp(`^[ \\t]*(?:[\\r\\n]+|[,/][ \\t]*)[ \\t]*(${NAT_DEMONYMS_DE}|${NAT_ADJ_EN})(?![\\p{L}\\p{N}])`, "u");
var NATIONALITY_PHRASE_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:\\p{L}{3,}sch(?:e[rnsm]?)?(?:[ \\t]*(?:,|und|oder|sowie)[ \\t]*)){0,1}\\p{L}{3,}sch(?:e[rnsm]?)?[ \\t\\r\\n]+(?:Staatsangeh\xF6rig\\p{L}*|Staatsb\xFCrger\\p{L}*|Staatsangeh\xF6rige[rn]?)(?![\\p{L}\\p{N}])|(?<![\\p{L}\\p{N}])\\p{Lu}\\p{Ll}{3,}(?:ian|ish|ese|ch|ani|an|ic)[ \\t]+(?:national|citizen|citizenship|nationality)(?![\\p{L}\\p{N}])`,
  "gu"
);
var HEALTH_QUALIFIER_RE = new RegExp(
  // eslint-disable-next-line no-misleading-character-class -- deliberate: Unicode combining-diacritic range for accented names, not a bug
  `((?:[${CAP}${LOW}]{4,}(?:e|es|er|en|em|he|hes|her|ische[snmr]?)[ \\t]+){1,2})$`
);
var QUALIFIER_STOPWORDS = /* @__PURE__ */ new Set([
  "eine",
  "einer",
  "eines",
  "einem",
  "einen",
  "diese",
  "dieser",
  "dieses",
  "diesem",
  "diesen",
  "seine",
  "seiner",
  "seines",
  "seinem",
  "seinen",
  "ihre",
  "ihrer",
  "ihres",
  "ihrem",
  "ihren",
  "keine",
  "keiner",
  "keines",
  "keinem",
  "keinen",
  "jeder",
  "jedes",
  "jedem",
  "jeden",
  "unsere",
  "unserer",
  "unseres",
  "meine",
  "meiner",
  "meines",
  "welche",
  "welcher",
  "welches",
  "andere",
  "anderer",
  "anderes",
  "anderen",
  "anderem",
  "beide",
  "beiden",
  "alle",
  "allen",
  "solche",
  "solcher",
  "solches",
  "wegen",
  "gegen",
  "neben",
  "wurde",
  "wurden",
  "haben",
  "worden",
  "sowie",
  "unter",
  "sowohl",
  "sonstige",
  "sonstiger",
  "weitere",
  "weiterer",
  "hatte",
  "hatten",
  "habe",
  "haben",
  "leide",
  "leiden",
  "litt",
  "h\xE4tte",
  "gehabt"
]);
function extendOverHealthQualifier(text, at) {
  let from = text.lastIndexOf("\n", Math.max(0, at - 1)) + 1;
  if (/^[^\S\r\n]*[a-zäöüß̀-ͯ]+(?:e|es|er|en|em|ische[snmr]?)[^\S\r\n]+$/.test(text.slice(from, at))) {
    from = text.lastIndexOf("\n", Math.max(0, from - 2)) + 1;
  }
  const before = text.slice(from, at).replace(/\r?\n/g, " ");
  const m = HEALTH_QUALIFIER_RE.exec(before);
  if (!m) return at;
  const words = m[1].trim().split(/\s+/).filter(Boolean);
  while (words.length && QUALIFIER_STOPWORDS.has(words[0].toLowerCase())) words.shift();
  if (!words.length) return at;
  const kept = words.join(" ");
  const idx = before.lastIndexOf(kept);
  return idx < 0 ? at : from + idx;
}
var HEALTH_LABEL_LIKE_RE = /^(?:allergi|erkrank|krankheit|behinder|medikat|medikament|diagnos|vorerkr|sucht|abhängigkeit|schwanger|impf|therapie|behandlung|befund|beschwerde|symptom|anamnese|unverträglich|syndrom|condition|disability|pregnan|treatment|medication|diagnosis|allergy|addiction)/i;
var HEALTH_TERM_RE = rx(`${BL}(?:${termAlternation(HEALTH_TERMS)})[${Wd}]*(?:-[${CAP}${LOW}][${Wd}]*)*(?:[ \\t]?\\([^)\\n]{1,14}\\))?(?:[ \\t]+(?:mellitus|vulgaris|simplex|zoster|chronica|acuta|coli|aureus|pylori|pneumoniae)|[ \\t]+(?:Typ|Grad|Stadium|Stufe)[ \\t]*[IVX\\d]+[a-z]?|[ \\t]+(?:links|rechts|beidseits|beidseitig)${BR})*`, "i");
var DRUG_STEM_RE = /(?<![A-Za-zÄÖÜäöüß-])[A-Za-zÄÖÜäöüß]*(?:azepam|azolam|olol|pril|sartan|statin|umab|ximab|zumab|tinib|mycin|cillin|oxacin|prazol|prazole|triptan|tidin|tidine|afil|lukast|dronat|dronate|gliptin|glitazon|lutamid|lutamide|oxetin|oxetine|pramin|pramine|tramadol|codon|morphon|barbital|dipin|dipine|nisolon|nisolone|metason|metasone|conazol|conazole|semid|thiazid|thiazide|setron|navir|previr|parin|tralin|traline|apin|apine|idon|idone|peridol|xaban|gatran|grel|fibrat|fibrate|clovir|ciclovir|profen|coxib|lamotrigin|valproat|carbamazepin|levetiracetam|insulin|ozempic|marcumar|fentanil|curonium|ofol|taxel|platin|imod|trexon|trexone|citabin|terodin|ampridin|cain|caine)e?(?![A-Za-zÄÖÜäöüß])/gi;
var DOSE_SCHEDULE = `(?:[ \\t]+(?:\\d+(?:-\\d+){2,3}|\\d+[ \\t]?x[ \\t]*(?:t\xE4glich|tgl\\.?|\\/Tag)|(?:morgens|mittags|abends|nachts)(?:[ \\t]+und[ \\t]+(?:morgens|mittags|abends|nachts))?|(?:ein|zwei|drei)mal[ \\t]+(?:t\xE4glich|am Tag)|t\xE4glich|bei Bedarf|retard|forte))*`;
var DOSE_TAIL = DOSE_SCHEDULE + `(?:[ \\t]*\\+[ \\t]*[${CAP}][${LOW}${CAP}\\-]{3,}[ \\t]{1,2}\\d+(?:[.,]\\d+)?[ \\t]*(?:mg|\xB5g|mcg|g|IE)${BR}${DOSE_SCHEDULE})*`;
var ICD_PAREN_BEFORE_RE = /\(/;
var ALLERGEN_WORD = `[${CAP}${LOW}][${CAP}${LOW}\\-]+`;
var ALLERGEN_RE = rx(
  `${BL}(?:(?:[Aa]llergie|[Aa]llergien|[Uu]nvertr\xE4glichkeit|[Ii]ntoleranz|[\xDC\xFC]berempfindlichkeit)[ \\t]+(?:gegen|auf)|[Aa]llergisch(?:e|er|en)?[ \\t]+(?:gegen|auf)|[Aa]llergic[ \\t]+to|[Aa]llergy[ \\t]+to|[Ii]ntolerant[ \\t]+to)[ \\t]+(?:(?:den|die|das|dem|der|ein|eine|einen|the|a|an)[ \\t]+)?(${ALLERGEN_WORD}(?:[ \\t]+(?:(?:und|oder)[ \\t]+[${CAP}][${CAP}${LOW}\\-]+|(?:and|or)[ \\t]+${ALLERGEN_WORD}))?)`
);
var DOSE_HEAD_GENERIC_RE = /^(?:Tablette|Kapsel|Tropfen|Dosis|Dosierung|Dosen|Ampulle|Salbe|Spritze|Infusion|Zäpfchen|Pille|Medikament|Wirkstoff|Präparat|Menge|Gabe|Einheit|Portion|Maximal|Tages|Einzel|Gesamt|Wochen|Start|Erhaltung|Anfangs|Höchst|Mindest|Hub)/i;
var MEDICATION_DOSE_RE = rx(
  // One or two spaces, not any run: a lab table aligns its columns with many
  // ("Kreatinin            1,4 mg/dl"), and that is a measurement, not a prescribed dose — which
  // the trailing "/dl" says outright, so a unit followed by "/" is refused as well.
  `${BL}(?:[${CAP}][${LOW}${CAP}\\-]{3,}|[${CAP}][${LOW}]{2,}1[${LOW}]*|ASS)[ \\t]{1,2}\\d+(?:[.,]\\d+)?[ \\t]*(?:mg|\xB5g|mcg|I\\.?E\\.?|IE|Einheiten|Tropfen|Hub)(?![${Wd}/])` + DOSE_TAIL
);
var LAB_UNIT = `(?:mg\\/dl|mmol\\/l|\xB5mol\\/l|g\\/dl|ng\\/ml|pg\\/ml|\xB5g\\/l|ng\\/l|U\\/ml|U\\/l|IU\\/l|IE\\/l|mg\\/g|ml\\/min(?:\\/1[,.]73[ \\t]?m\xB2)?|mmHg)`;
var LAB_VALUE_RE = rx(
  `${BL}(?:BMI[ \\t:]+\\d+(?:[.,]\\d+)?|\\d{2,3}\\/\\d{2,3}[ \\t\\r\\n]{0,2}mmHg)(?![${Wd}])`,
  "i"
);
var MEASURE_UNIT_RE = rx(
  `${BL}\\d{1,4}(?:[.,]\\d{1,3})?[ \\t]?(?:mg\\/dl|mmol\\/l|\xB5mol\\/l|g\\/dl|mU\\/l|ng\\/ml|pg\\/ml|\xB5g\\/l|U\\/ml|U\\/l|IU\\/l|IE\\/l)(?![${Wd}\\/])`,
  "i"
);
var MEASURE_RANGE_BEFORE_RE = /(?:^|[\s(])(?:bis|unter|über|ab|to|below|above|under|over|max\.?|min\.?)\s?$|[-–<>≤≥]\s?$/i;
var MEASURE_RANGE_AFTER_RE = /^[ \t]{0,40}[<>≤≥(]?[ \t]?\d[\d.,]*[ \t]?(?:mg\/dl|mmol\/l|g\/dl|mU\/l|ng\/ml|pg\/ml|U\/l|U\/ml)?[ \t]?(?:-|–|bis)[ \t]?\d/i;
var MEASURE_BP_RE = rx(
  `${BL}(?:Blutdruck|blood pressure)(?![${Wd}])[^\\n.;]{0,40}?(?<![${Wd}\\/])(\\d{2,3}(?:[ \\t]zu[ \\t]|\\/)\\d{2,3})(?![${Wd}\\/])`,
  "i"
);
var MEASURE_WEIGHT_RE = rx(`${BL}\\d{2,3}(?:[.,]\\d{1,2})?[ \\t]?(?:kg|Kilogramm)(?![${Wd}\\/])`, "i");
var MEASURE_WEIGHT_WORD_RE = /(?:gewicht|wieg|gewogen|wiegen|weight|weigh|heben|abgenommen|zugenommen)/i;
var MEASURE_HEIGHT_RE = rx(`${BL}[12][.,]\\d{2}[ \\t]?m(?![${Wd}\xB2\xB3\\/])`);
var MEASURE_HEIGHT_WORD_RE = /(?:größe|groesse|height|körperlänge|groß|tall)/i;
var CLINICAL_INDEX_NAMES = "BMI|Mini-Mental(?:-Status)?(?:-Test)?(?:-Ergebnis)?|MMST|HbA1c|HbA1C|CEA|NT-proBNP|Ki-67|MMSE|PHQ-9|GAD-7|eGFR|TSH|LDL|HDL|Kreatinin|Ejektionsfraktion|Auswurffraktion|ejection fraction|PSA|Gleason(?:[- ]Score)?|ECOG|NYHA|AHI|BI-RADS|Karnofsky|Barthel(?:-Index)?|Mikroalbumin\\/Kreatinin-Quotient|CA[ -]?19-9|[Pp]ercentile|Perzentile|Gewichtsperzentile|Gestationsalter|Schwangerschaftswoche|SSW|Apgar(?:-Score)?|Glasgow[- ]Coma[- ]Scale|T-Score|Z-Score";
var CLINICAL_JUDGED_RE = rx(
  `${BL}(?:Blutdruck|Blutzucker(?:wert)?|Puls|Ruhepuls|Cholesterin(?:wert)?|Kreatinin(?:wert)?|HbA1c|Blood pressure|Blood sugar)[ \\t]+(?:(?:war|ist|lag|liegt|was|is)[ \\t]+)?(?:(?:wieder|immer[ \\t]+noch|weiterhin|again)[ \\t]+)?(?:zu[ \\t]+)?(?:hoch|niedrig|erh\xF6ht|erniedrigt|high|low|elevated)[ \\t]+\\d{1,4}(?:[.,]\\d{1,3})?(?:[ \\t]*(?:zu|\\/)[ \\t]*\\d{1,3})?(?![${Wd}])`,
  "i"
);
var CLINICAL_INDEX_RE = rx(
  `${BL}(?:(?:weight|height|BMI|head)[ \\t]+)?(?:${CLINICAL_INDEX_NAMES})${BR}(?:[ \\t:=,(]+(?:[${CAP}${LOW}]{1,14}[ \\t,:]+){0,5}|[ \\t:=(]+)\\d{1,4}(?:[.,]\\d{1,3})?(?![.\\-]\\d)(?:[ \\t]*(?:zu|\\/)[ \\t]*\\d{1,3})?(?:[ \\t]?(?:%|percent|prozent|Prozent|points|Punkte[n]?|mU\\/l|${LAB_UNIT}|bpm|kg\\/m\xB2|cm|kg))?(?![${Wd}])`,
  "i"
);
var CLINICAL_STAGE_RE = rx(
  `${BL}(?:(?:CIN|VIN|FIGO)(?:[ \\t]+(?:Stadium|Grad|Stufe|Klasse))?[ \\t]+(?:[IVX]{1,4}[A-Ca-c]?|[A-D]|[0-9]{1,2}[a-c]?)|(?:NYHA|GOLD)(?:(?:[ \\t]+|[ \\t]*\\r?\\n[ \\t]*)(?:class|Klasse|Stadium|Stufe|Grad|grade|stage))?(?:[ \\t]+|[ \\t]*\\r?\\n[ \\t]*)[IVX]{1,3}|ECOG[ \\t]+[0-4]|Merkzeichen[ \\t]*:?[ \\t]*(?:aG|TBl|RF|Bl|Gl|[GHBS]))${BR}`
);
var OPS_CODE_RE = rx(`${BL}[1-9]-\\d{3}(?:\\.[0-9a-z]{1,2})${BR}`);
var CARE_LEVEL_RE = rx(`${BL}PG[ \\t]?[1-5]${BR}(?![ \\t]?[.,]?\\d)`);
var BODY_PARTS = "Knie|H\xFCfte|H\xFCft|Schulter|Herz|Ohr|Ohren|Auge|Augen|Gallenblase|Gallenblasen|Blinddarm|Bandscheibe|Bandscheiben|R\xFCcken|Wirbels\xE4ule|Lendenwirbels\xE4ule|Halswirbels\xE4ule|Brust|Brustkorb|Bauch|Magen|Darm|Niere|Nieren|Leber|Lunge|Schilddr\xFCse|Prostata|Geb\xE4rmutter|Blase|Fu\xDF|Fuss|Sprunggelenk|Handgelenk|Hand|Daumen|Zehe|Zehen|Finger|Unterschenkel|Oberschenkel|Unterarm|Oberarm|Arm|Bein|Kopf|Sch\xE4del|Gehirn|Nase|Zahn|Z\xE4hne|Mandeln|Hals|Kiefer|Ellenbogen|Meniskus|Kreuzband|Achillessehne|Leiste|Becken|Kehlkopf|Galle|Wade|Ferse|Stei\xDFbein|Brustwirbels\xE4ule|Mittelfu\xDF|Vorfu\xDF|Kniegelenk|H\xFCftgelenk|Schultergelenk";
var BODY_PROCEDURE_LC_RE = rx(
  `${BL}(?:knie|h\xFCft|schulter|herz|ohr|auge|gallenblase|r\xFCcken|wirbels\xE4ule|bandscheibe|magen|darm|niere|leber|lunge|schilddr\xFCse|prostata|fu\xDF|hand|bein|kopf|zahn)-?(?:op|operation|prothese|endoprothese|arthroskopie)${BR}(?:[ \\t]+(?:links|rechts|beidseits))?`,
  "i"
);
var COMPOUND_OPERATION_RE = rx(
  `(?<![${Wd}-])(?:Bandscheiben|Schulter|H\xFCft|Knie|Gallen|Schilddr\xFCsen|Augen|Herz|Magen|Darm|Varizen|Tumor|Stabilisierungs|Bypass|Wirbels\xE4ulen|Nieren|Leber|Lungen|Brust|Prostata|Blinddarm|Folge|Zweit|Not|Notfall|R\xFCcken|Fu\xDF|Hand|Zahn|Kiefer|Geb\xE4rmutter|Mandel|Nasen|Ohren)operation(?:en)?${BR}`
);
var EN_PROCEDURE_RE = rx(
  `${BL}(?:(?:left|right|bilateral)[ \\t]+)?(?:knee|hip|back|spine|spinal|shoulder|heart|cardiac|ankle|wrist|elbow|neck|ACL|gallbladder|kidney|liver|lung|brain|thyroid|bowel|breast|hernia|cataract)[ \\t]+(?:surgery|operation|reconstruction|replacement|arthroplasty|repair|fusion|bypass|transplant|procedure)${BR}|${BL}(?:surgery|operation)[ \\t]+(?:in|on|last)[ \\t]+(?:January|February|March|April|May|June|July|August|September|October|November|December)${BR}|${BL}(?:micro)?discectomy${BR}`,
  "i"
);
var PSYCHOTHERAPY_PHRASE_RE = rx(
  `${BL}(?:(?:ambulant|station\xE4r|laufend|begonnen|tiefenpsychologisch|verhaltenstherapeutisch)[${LOW}]*[ \\t]+Psychotherapie[${LOW}]*|in[ \\t]+Psychotherapie|Psychotherapie[ \\t]+(?:bei|seit|begonnen|laufend|l\xE4uft|findet))${BR}`,
  "i"
);
var SIDE = `(?:[ \\t]+(?:links|rechts|beidseits|beidseitig|re\\.|li\\.))?`;
var BODY_PROCEDURE_RE = rx(
  // "Knieoperation", "Gallenblasen-OP 1994", "Hüft-Prothese links", "Knieverletzung"
  `${BL}(?:${BODY_PARTS})-?(?:OP|Operation|operation|Prothese|prothese|Endoprothese|endoprothese|Arthroskopie|arthroskopie|Resektion|resektion|Verletzung|verletzung|Bruch|bruch|Fraktur|fraktur|l\xE4hmung)${BR}(?:[ \\t]+\\(?(?:19|20)\\d{2}\\)?|${SIDE}(?:[ \\t]+(?:seit|von)[ \\t]+(?:19|20)\\d{2})?)|${BL}(?:Operation(?:en)?|Eingriff(?:e)?)[ \\t]+(?:am|an|im|in|der|des|am[ \\t]+linken|am[ \\t]+rechten|an[ \\t]+der)[ \\t]+(?:${BODY_PARTS})(?:en|n|e|s)?${BR}${SIDE}(?:[ \\t]+im[ \\t]+Jahr[ \\t]+(?:19|20)\\d{2}|[ \\t]+(?:19|20)\\d{2})?|${BL}(?:Amputation|Wundverband|Verband|Gips|Schiene|Fraktur|Bruch|Entz\xFCndung|Schmerzen|Kr\xE4mpfe|Beschwerden|Implantat|Verletzung|Verletzungen|Wundversorgung|Verbandswechsel|H\xE4matom|H\xE4matome|Infiltration)[ \\t]+(?:(?:des|der|am|an[ \\t]+der|von|im|in|in[ \\t]+den|in[ \\t]+der)[ \\t]+)?(?:(?:linken|rechten|linke|rechte)(?:[ \\t]+|[ \\t]*\\r?\\n[ \\t]*))?(?:${BODY_PARTS})(?:en|n|e|s)?${BR}${SIDE}`
);
var CLINICAL_NOTATION_RE = rx(
  `${BL}[cpyr]?T[0-4][a-d]?[ \\t]+[cp]?N[0-3][a-c]?(?:mi)?(?:[ \\t]+[cp]?M[0-1x])?${BR}|${BL}[CLTS][1-9]\\d?\\/[CLTS][1-9]\\d?${BR}|${BL}[BHL]WK[ \\t]?\\d{1,2}${BR}|${BL}(?:ER|PR|HER2)[ \\t-]?(?:Positivit\xE4t|Negativit\xE4t|positiv|negativ)${BR}|${BL}[${CAP}][${LOW}]{3,}-Operation${BR}`
);
var CLINICAL_ACRONYM_RE = rx(`${BL}(?:TIA|HFpEF|HFrEF|NSTEMI|STEMI|PAVK|TVT)${BR}`);
var DATED_OPERATION_RE = rx(`${BL}(?:Operation|OP|Operationen)[ \\t]+(?:19|20)\\d{2}${BR}`);
var DISEASE_COMPOUND_RE = rx(
  `${BL}(?:[${CAP}][${LOW}]{2,}(?:krankheit|krankheiten)|(?:R\xFCcken|Nieren|Herz|Lungen|Augen|Leber|Magen|Darm|Nerven|Gelenk|Haut|Blasen|Schilddr\xFCsen|Venen|Kreislauf|Bandscheiben|Atemwegs|Wirbels\xE4ulen|Ohren|Geh\xF6r|H\xFCft|Knie)leiden|(?:Alkohol|Opiat|Opioid|Drogen|Medikamenten|Tabletten|Nikotin|Spiel|Cannabis|Kokain|Heroin|Substanz|Mehrfach)abh\xE4ngigkeit|(?:[${CAP}][${LOW}]*)?(?:[Mm]elanom|[Bb]lastom|[Mm]esotheliom)(?:e|en|s)?|(?:[${CAP}][${LOW}]*)?[Ll]\xE4hmung(?:en)?)${BR}(?:[ \\t]+(?:Typ|Grad|Stadium|Stufe)[ \\t]*[IVX\\d]+[a-z]?)?`
);
var FOREIGN_QUOTE_RE = /„([^„“]{12,260})“/gu;
var FOREIGN_QUOTE_DE_WORDS = new Set("der die das und ist nicht ich ein eine mit von zu den dem des im in auf f\xFCr wir sie er es sich auch bei wird sind hat haben dass wie aber oder wenn nach als nur noch bitte kann k\xF6nnen mir mich ihr ihre uns war wurde werden zum zur am an aus \xFCber unter vor bis durch wegen mein meine meinen meinem mehr sehr schon dann da hier ja nein ob um so was wer wo".split(" "));
var FOREIGN_HEALTH_RE = new RegExp("(?<![\\p{L}])(?:a\u011Fr\u0131\\p{L}*|hastal\u0131k\\p{L}*|rahats\u0131zl\u0131k\\p{L}*|tedavi\\p{L}*|ameliyat\\p{L}*|ila\xE7\\p{L}*|\u015Feker\\p{L}*|nefes\\p{L}*|ast\u0131m\\p{L}*|b\xF3l\\p{L}*|boli|chorob\\p{L}*|lekarz\\p{L}*|szpital\\p{L}*|operac\\p{L}*|nieoperacyj\\p{L}*|leczeni\\p{L}*|nastr\xF3j|nastroj\\p{L}*|po\u0142og\\p{L}*|cukrzyc\\p{L}*|\u0111au|b\u1EC7nh|m\u1ED5|thu\u1ED1c|\u0431\u043E\u043B\u044C\\p{L}*|\u0431\u043E\u043B\u0435\u0437\u043D\\p{L}*|\u0432\u0440\u0430\u0447\\p{L}*|\u043B\u0435\u0447\u0435\u043D\u0438\\p{L}*)(?![\\p{L}])", "iu");
var HEALTH_DRUG_RE = rx(
  `${BL}(?:${termAlternation(HEALTH_DRUG_NAMES)})${BR}(?:[ \\t]+\\d+(?:[.,]\\d+)?[ \\t]*(?:mg|\xB5g|mcg|g|ml|IE|I\\.?E\\.?)${BR}${DOSE_TAIL})?`,
  "i"
);
var ALIGNED_CELL_BEFORE_RE = /(?:^|\n|\t|[ ]{2})$/;
var ALIGNED_CELL_AFTER_RE = /^(?:\t|[ ]{2})/;
var HEALTH_NON_CONDITION_RE = /^(?:psychosozial|schwerbehindertenvertretung|suchtberatung|suchtbeauftragte|suchtpräventi|behindertenbeauftragte|behindertenwerkstatt|behindertengerecht|barrierefrei)/i;
var NON_MEDICAL_HEAD_RE = /^(?:vor|begleit|neu|grund|neben|folge|zweit|erst|mehrfach)(?:erkrankung|krankheit)|(?:dosen?|hosen?|prämien?|diagnosen?|(?:kinder|arbeits|obdach|wohnungs|heimat|staaten|mittel|hilf|rat|zahn)lose[nr]?|laktose|glukose|fruktose|glucose|saccharose|dextrose|cellulose|zellulose|zellulose)$/i;
var DIAGNOSIS_MORPH_RE = rx(
  `${BL}[${CAP}][${LOW}${CAP}\\-]+(?:itis|itiden|ose|osen|opathie|pathie|insuffizienz|fraktur|frakturen|syndrom|syndroms|karzinom|karzinome|karzinoms|\xE4mie|aemie|algie|sklerose|stenose|embolie|infarkt|infarkte|plegie|dystrophie|allergie|allergien|erkrankung|erkrankungen|entz\xFCndung|entz\xFCndungen|blutung|blutungen|wunde|wunden|tumor|tumore|tumors|demenz|asthma|diabetes|ektomie|ektomien|otomie|ostomie|penie|zytose|hydrops|parese|lithiasis|mykose|kolik|koliken|malazie)(?:[ \\t]+(?:Grad[ \\t]+[IVX\\d]+|links|rechts|beidseits|beidseitig|frontal|dorsal|akut|chronisch|[IVX]{1,4}))*${BR}`
  // NOT case-insensitive: the leading [CAP] class is the only thing separating a German medical
  // NOUN from an adjective that merely ends the same way ("reizlose Wundverhältnisse"), and the
  // "i" flag made that class match lowercase too.
);
var CLINICAL_PROCESS_WORDS = /* @__PURE__ */ new Set([
  "diagnose",
  "diagnosen",
  "verdachtsdiagnose",
  "prognose",
  "anamnese",
  "dose",
  "dosen",
  "symptose",
  "virtuose"
]);
var AFFILIATION_TERM_RE = rx(`${BL}(?:${termAlternation(AFFILIATION_TERMS)})${BR}`, "i");
var GENITIVE_TAIL = "(?:e?s|en|e|n)?";
var DECLINING_NOUN_RE = /(?:verfahren|strafe|strafen|verurteilung|anklage|straftat|befehl|anzeige|vorstrafe|haftbefehl|festnahme|tatvorwurf|haft|betrug|diebstahl|raub|mord|totschlag|untreue|unterschlagung|erpressung|hehlerei|nötigung|fälschung|hinterziehung|schlägerei|überfall|korruption|bestechung|geldwäsche|brandstiftung|körperverletzung|beleidigung|vergewaltigung|verleumdung|nachstellung|vorteilsannahme|vorteilsgewährung|handeltreiben|handeltreibens|fahrerflucht|unfallflucht|trunkenheitsfahrt|alkoholfahrt)$/;
var withTail = (set) => termAlternation(set).split("|").map((t) => t.length >= 6 && !/[ .]/.test(t) && DECLINING_NOUN_RE.test(t) ? t + GENITIVE_TAIL : t).join("|");
var CRIMINAL_TRIGGER_RE = rx(`${BL}(?:${withTail(new Set(CRIMINAL_TRIGGERS))})${BR}`, "i");
var CRIMINAL_OFFENCE_RE = rx(`${BL}(?:${withTail(CRIMINAL_OFFENCES)}|[${CAP}][${LOW}]{2,}(?:betrug|hinterziehung|unterschlagung|erpressung)${GENITIVE_TAIL})${BR}`, "i");
var CRIMINAL_PROCEEDING_EN_RE = new RegExp(
  `(?<![\\p{L}])(?:theft|burglary|fraud|assault|robbery|embezzlement|forgery|bribery|arson|manslaughter|murder|drug)[ \\t]+(?:investigation|allegation|charge|case|conviction|offence|offense)(?![\\p{L}])`,
  "giu"
);
var CRIMINAL_GENERIC_AFTER_RE = /^[ \t-]*(?:Act\b|policy\b|Policy\b|law\b|legislation\b|training\b|clause\b|compliance\b|period\b|meeting\b|review\b|objectives\b|zu\s+fühlen|fühl|team\b|department\b|desk\b|hotline\b|abteilung\b|weiterleit)/u;
var CRIMINAL_GENERIC_BEFORE_RE = new RegExp("(?:anti|Anti)-?[ \\t]*$|(?:kampagne|[Pp]r\xE4vention|[Pp]r\xE4ventions\\p{L}*|[Aa]ufkl\xE4rung\\p{L}*|[Bb]ek\xE4mpfung|[Vv]orbeugung|[Ss]chutz|[Ww]arnung(?:en)?|[Hh]inweise?|[Ss]chulung|campaign|prevention|awareness)[ \\t]+(?:gegen|vor|von|against|of|about)[ \\t]+(?:\\p{L}+[ \\t]+){0,2}$", "u");
var CRIMINAL_QUOTED_BEFORE_RE = /[„“"'‚‘»«]$/u;
var CRIMINAL_QUOTED_AFTER_RE = /^[“”"'’‘«»]/u;
var CRIMINAL_NEGATED_BEFORE_RE = new RegExp("(?:^|[\\s(])(?:kein(?:e|en|er|em|es)?|ohne|nicht|nie|niemals|no|not|never|without|none)[ \\t]+(?:records?[ \\t]+of[ \\t]+)?(?:\\p{L}+[ \\t]+){0,2}$", "iu");
var CRIMINAL_NEGATED_AFTER_RE = /^[ \t]*(?:ist[ \t]+|sind[ \t]+|war[ \t]+|wird[ \t]+)?(?:nicht|kein|keine|nie|not|never)\b/iu;
var CRIMINAL_OFFENCE_PLAIN_RE = new RegExp(CRIMINAL_OFFENCE_RE.source, "iu");
var CRIMINAL_WRAP_WORD_RE = /(?:^|[^\p{L}])(?:einer|eine|einen|einem|eines|der|die|das|dem|den|des|wegen|und|oder|mit|von|vom|im|in|auf|zur|zum|für|an|aus|bei|nach|über|durch|gegen|als|sowie|a|an|the|of|for|and|to|with)\s*$/u;
function criminalSentenceContinues(text, segStart, seg) {
  if (/[.!?:;]\s*$/.test(seg)) return false;
  if (!CRIMINAL_WRAP_WORD_RE.test(seg)) return false;
  const ext = text.slice(segStart, segStart + seg.length + 120);
  return CRIMINAL_LAW_WORD_RE.test(ext) || CRIMINAL_OFFENCE_PLAIN_RE.test(ext);
}
var CRIMINAL_STATUTE_RE = rx(
  `(?:(?:Tatvorwurf|Vorwurf|Verdacht)[ \\t]*:[ \\t]*\xA7\xA7?[ \\t]*\\d{1,3}[a-z]?(?:[ \\t]*(?:Abs\\.[ \\t]*\\d+[ \\t]*)?(?:,|und|u\\.|bis|/|-)[ \\t]*\\d{1,3}[a-z]?)*[ \\t]*(?:StGB|StPO|OWiG|BtMG|StVG|JGG)${BR}|\\d+[ \\t]+Eintragung(?:en)?[ \\t]+im[ \\t]+Fahreignungsregister|Bet\xE4ubungsmittel[^.\\n]{0,40}\\bgehandelt)`
);
var PROCEDURAL_NOUN_RE = /^(?:strafverfahren|ermittlungsverfahren|strafbefehl|anklage|haftbefehl|strafanzeige|bußgeldbescheid|ordnungswidrigkeitenverfahren|bu(?:ß|ss)geldverfahren)/i;
var HOMONYM_TRIGGER_RE = /^(?:verurteilt|verurteilung|anklage|schuldig|beschuldigt|bewährung|probation|parole|conviction|convicted|guilty)/i;
var CRIMINAL_LAW_WORD_RE = /\b(?:fraud|theft|assault|robbery|burglary|embezzlement|forgery|bribery|arson|manslaughter|murder|perjury)\b|straf|staatsanwalt|polizei|vorbestraft|haftbefehl|gefängnis|justizvollzug|bewährungs|tatvorwurf|angeklagt|täter|ermittlung|criminal|prosecut|police|offen[cs]e|sentenc/i;
var INSURANCE_WORDS_RE = /versicher|haftpflicht|kasko|police|tarif|bedingungen|selbstbeteiligung|schadens?(?:fall|meldung|summe)|leasing|insur|policy|premium|coverage|deductible/giu;
var SENTENCE_RE = rx(`(?:[^.\\n;]|(?<=\\d)\\.(?=\\d)|(?<=(?:^|\\D)\\d{1,2})\\.(?=[ \\t]))+`);
function clauseHasCriminalContext(seg, offenceMatch) {
  if (offenceMatch) return true;
  const low = seg.toLowerCase();
  return CRIMINAL_CONTEXT.some((kw) => low.includes(kw));
}
var CTX = {
  // A vehicle identification number printed next to its own label ("FIN", "Fahrgestellnummer",
  // "Fahrzeug-Identifizierungsnummer"): the number identifies one car, and its keeper.
  VIN: [
    "fin",
    "vin",
    "fahrgestellnummer",
    "fahrgestell-nr",
    "fahrgestell nr",
    "fahrzeug-ident",
    "fahrzeugident",
    "fahrzeug-identifizierungsnummer",
    "fahrzeug-identifikationsnummer",
    "fahrzeugidentifikationsnummer",
    "fahrzeug-id-nr",
    "chassis number",
    "chassis no",
    "vehicle identification",
    "identnummer"
  ],
  TAX_ID: [
    "steuer-id",
    "steueridentifikationsnummer",
    "steuerliche identifikation",
    "idnr",
    "id-nr",
    "identifikationsnummer",
    "steuer-identifikationsnummer",
    "tax id",
    "tax-id",
    "steuerid",
    "steuer id",
    "tax identification",
    "taxpayer",
    "tin",
    "tax number",
    "tax no"
  ],
  UTR: ["unique taxpayer reference", "utr"],
  // Labels that name a DIFFERENT 11-digit number; an unlabelled 2-3-3-3 run near one is theirs.
  NOT_TAX_ID: [
    "tel",
    "telefon",
    "fax",
    "mobil",
    "handy",
    "phone",
    "iban",
    "konto",
    "kto",
    "blz",
    "bestell",
    "auftrag",
    "rechnung",
    "artikel",
    "sendung",
    "tracking",
    "order",
    "invoice",
    "serial",
    "seriennummer",
    "kundennummer",
    "kundennr",
    "kd-nr",
    "ean",
    "isbn"
  ],
  STEUERNUMMER: [
    "steuernummer",
    "st.-nr",
    "st-nr",
    "steuer-nr",
    "steuernr",
    "stnr",
    "st.nr",
    "steuer nr",
    "tax no",
    "tax number",
    "tax-no"
  ],
  CREDIT_CARD: [
    "kartennummer",
    "karten-nr",
    "kreditkarte",
    "kreditkartennummer",
    "kartendaten",
    "card number",
    "card no",
    "credit card",
    "debit card",
    "cardholder",
    "karteninhaber",
    "visa",
    "mastercard",
    "american express",
    "amex",
    "girocard",
    "maestro"
  ],
  // A label that explicitly names the number as something OTHER than a card. A Luhn-valid
  // sixteen-digit run is common in exactly the documents that carry these labels (parts lists,
  // purchase orders, meter readings, lot numbers) — about one in ten arbitrary 16-digit numbers
  // passes Luhn by chance, so without this gate every tenth such number in ordinary technical/
  // commercial prose was silently accepted and replaced with a fake card number. See P1-E1.
  NOT_CARD: [
    "teilenummer",
    "ersatzteilnummer",
    "auftragsnummer",
    "bestellnummer",
    "artikelnummer",
    "artikel-nr",
    "z\xE4hlerstand",
    "zaehlerstand",
    "losnummer",
    "los-nr",
    "referenznummer",
    "referenz-nr",
    "seriennummer",
    "serien-nr",
    "sendungsnummer",
    "sendungs-nr",
    "vorgangsnummer",
    "vorgangs-nr",
    "part number",
    "part no",
    "order number",
    "order no",
    "serial number",
    "serial no",
    "reference number",
    "reference no",
    "tracking number",
    "tracking no"
  ],
  // An invoice names it in its own language, and the label is the EU rule's only gate.
  VAT: [
    "ust",
    "idnr",
    "umsatzsteuer",
    "identifikationsnummer",
    "ust-idnr",
    "umsatzsteuer-id",
    "vat",
    "vat number",
    "vat id",
    "vat no",
    "partita iva",
    "p.iva",
    "tva",
    "n\xB0 tva",
    "btw",
    "btw-nr",
    "nif",
    "cif",
    "moms",
    "alv",
    "mwst-nr",
    "uid-nr"
  ],
  ACCOUNT: [
    "konto",
    "kontonummer",
    "konto-nr",
    "kto",
    "kto.-nr",
    "account",
    "account number",
    "account no",
    "acct",
    "iban",
    "sort code"
  ],
  BLZ: ["blz", "bankleitzahl", "sort code", "routing"],
  SV: [
    "sozialvers",
    "versicherungsnummer",
    "sv-nr",
    "sv-nummer",
    "rentenvers",
    "pension insurance",
    "rentenversicherungsnummer",
    "versicherungsnr",
    "vers.-nr",
    "vers.nr",
    "rv-nr",
    "social security",
    "social insurance",
    "ssn",
    "national insurance",
    "nino",
    "ni number",
    // The Nordic national number goes by its own name in every document that carries one, and
    // none of the labels above appears next to it.
    "personnummer",
    "personnr",
    "person number",
    "national id",
    "national id number",
    "national identity number",
    "sv id",
    "sv-id",
    "se-id",
    "personal identity number",
    "personal identification number",
    "cpr",
    "cpr-nummer",
    "f\xF8dselsnummer",
    "foedselsnummer",
    "henkil\xF6tunnus",
    "hetu"
  ],
  // Labels that name a PERSON's record. The number behind them is a pseudonymous identifier of a
  // natural person, so it is marked outright.
  CUSTOMER_ID: [
    "kundennummer",
    "kunden-nr",
    "kundennr",
    "kunden-id",
    "kundenid",
    "mandantennummer",
    "depotnummer",
    "depot-nr",
    // Person-record labels found missing on realistic documents. Each names a record that
    // belongs to ONE person (their loan, their policy, their membership), which is the
    // distinction that separates these from the generic record references below.
    "darlehensnummer",
    "darlehens-nr",
    "kreditnummer",
    "versicherungsnummer",
    "versicherungs-nr",
    "versicherungsschein",
    "mitgliedsnummer",
    "mitglieds-nr",
    "schadennummer",
    "schaden-nr",
    "schadensnummer",
    "vertragskontonummer",
    "contact id",
    "contact_id",
    "member id",
    "member_id",
    "badge",
    "badge id",
    "student id",
    "employee id",
    "user id",
    "policennummer",
    "police-nr",
    "personalnummer",
    "personal-nr",
    "personalnr",
    "mitarbeiternummer",
    "mitgl.-nr",
    "mitgl-nr",
    "mitgliedsnr",
    "personalkennung",
    "pers.-nr",
    "pers.nr",
    "pers-nr",
    "pers. nr",
    "pat.-nr",
    "pat.nr",
    "pat-nr",
    "pat. nr",
    "patientennr",
    "kd.-nr",
    "kd.nr",
    "kd-nr",
    "kd nr",
    "kdnr",
    "kunden nr",
    "mandanten-nr",
    "mandantennr",
    "mandanten nr",
    "sch\xFClernummer",
    "schuelernummer",
    "sch\xFCler-nr",
    "bewerbungsnummer",
    "bewerbungs-nr",
    "fahrer-id",
    "kindergeld-nr",
    "kindergeldnummer",
    "mietnummer",
    "mieternummer",
    "mieterkonto nr",
    "tenant no",
    "teilnehmernummer",
    "kundenk\xFCrzel",
    "kundenkuerzel",
    "benutzerkennung",
    "matrikelnummer",
    "matrikel-nr",
    "matrikelnr",
    "mandat",
    "mandatsreferenz",
    "sepa-mandat",
    "patientennummer",
    "patienten-nr",
    "patient id",
    "patient number",
    "arzt-nr",
    "arztnummer",
    "lanr",
    "bsnr",
    "betriebsst\xE4tten",
    "customer number",
    "customer no",
    "customer id",
    "customer ref",
    "client number",
    "client id",
    "policy number",
    "policy no",
    "member number",
    "membership number",
    "employee number",
    "employee id",
    "student number",
    "student id",
    // Labels that name a record belonging to ONE person, found missing on a corpus of order,
    // shipping, claim, membership and portal letters. Each is the same kind of thing as
    // "Versicherungsnummer" above — the person's own file with a company — as opposed to the
    // generic references below, which may just as easily be an article or a document number.
    "sendungsnummer",
    "sendungs-nr",
    "trackingnummer",
    "tracking-nr",
    "buchungsnummer",
    "buchungs-nr",
    "antragsnummer",
    "antrags-nr",
    "registriernummer",
    "registrierungsnummer",
    "z\xE4hlernummer",
    "zaehlernummer",
    "kartennummer",
    "karten-nr",
    "kundenkennzeichen",
    "benutzerkennung",
    "kundenkonto",
    "abonnentennummer",
    "abo-nummer",
    "leserummer",
    "beitragskontonummer",
    "rentenversicherungsnummer",
    "steuernummer des",
    "tracking number",
    "shipment number",
    "booking reference",
    "booking number",
    "claim number",
    "claim id",
    "membership id",
    "subscriber number",
    "subscriber id",
    "account number",
    "account no",
    "loyalty number",
    "loyalty id",
    "warranty number",
    "registration number",
    "application number",
    "meter number",
    "card number",
    // The NOUN that names the person's product, not just its "-nummer" compound. A contract wraps
    // as "…zur Police / Nr. VK-2019-887431" and "…aus Ratenkredit Nr. 771-4402", where the label
    // word stands alone and the joint "Nr." carries the rest.
    // Deliberately German-specific compounds only. The plain English equivalents — "policy",
    // "contract", "loan", "insurance", "membership" — are ordinary nouns that stand next to
    // ordinary codes ("policy version HR-POL-6.3"), and adding them cost precision immediately.
    "police",
    "versicherungsschein",
    "ratenkredit",
    "bausparvertrag",
    "sparbuch"
  ],
  // Labels that name a RECORD, which may or may not be a person's: an order, a contract, a
  // support case, a file, a ticket, an internal reference. Whether "Referenz ERS-100234" is an
  // article number in a parts list or a customer's order id is not decidable from the label — and
  // in technical, commercial and legal documents it is overwhelmingly the former. These therefore
  // produce a span that is SHOWN in review but not pre-selected (see forceReview in detect.js):
  // nothing disappears, but a changelog full of ticket ids no longer arrives pre-redacted.
  // Split out of RECORD_REF: the subset that names the ORGANISATION's file on a matter rather
  // than a transaction the person made. Both stay review-only by default; only these stay
  // review-only even in a letter addressed to the person concerned. See the CASE_FILE_REF branch
  // in regexSpans and promoteRecordRefs in detect.js.
  CASE_FILE_REF: [
    "aktenzeichen",
    "az.",
    "az ",
    "gesch\xE4ftszeichen",
    "geschaeftszeichen",
    "gesch.-z",
    "unser zeichen",
    "unsere zeichen",
    "ihr zeichen",
    "ihre zeichen",
    "personalakte",
    "mandatsakte",
    "patientenakte",
    "fallnummer",
    "fall-nr",
    "fallnr",
    " fall nr",
    "objekt-nr",
    "vertragsnr",
    "forderungsnr",
    "forderungsnummer",
    "ticket",
    "ticket number",
    "ticket id",
    "case number",
    "case id",
    "file number",
    " akte",
    "(akte",
    "vorgangsnummer",
    "vorgangs-nr",
    "referenz",
    "referenznummer",
    "ref.-nr",
    "ref-nr",
    "reference",
    "reference number",
    "ref no",
    "ref."
  ],
  RECORD_REF: [
    "vertragsnummer",
    "vertrags-nr",
    "auftragsnummer",
    "bestellnummer",
    "bestell-nr",
    "belegnummer",
    "rechnungsnummer",
    "contract number",
    "contract no",
    "order number",
    "order no",
    "order #",
    "order#",
    "invoice number",
    // Transactions and documents that belong to one person: their lease, purchase, loan, prescription,
    // lab order, parcel or application. Review-only by default like the rest of this list, promoted
    // to a pre-mark once the document has a data subject (promoteRecordRefs).
    "rezept-nr",
    "rezeptnummer",
    "rezept nr",
    "leistungsfall",
    "bedarfsgemeinschaft",
    "bg-nr",
    "pflegevertrag",
    "vertragskonto",
    "claim no",
    "claim ref",
    "verordnung nr",
    "verordnungs-nr",
    "\xFCberweisungsschein",
    "befundnummer",
    "gutachten-nr",
    "zeugnis-nr",
    "dienstnummer",
    "beitragsnummer",
    "einladung nr",
    "bestellung",
    "mietvertrag",
    "mietvertag",
    "bausparvertrag",
    "lebensversicherung",
    "riester-vertrag",
    "darlehensvertrag",
    "leasingvertrag",
    "versorgungs-nr",
    "versorgungsnummer",
    "approbationsnummer",
    "zulassungsnummer",
    "gewebe-nr",
    "labornr",
    "labor-nr",
    "aufnahme-nr",
    "aufnahmenummer",
    "\xFCberleitungsbogen",
    "probandennummer",
    "bedarfsgemeinschaftsnummer",
    "leistungsnummer",
    "hausanschlussnummer",
    "verwahrnummer",
    "retourennummer",
    "geb\xFChrenbescheid-nummer",
    "bearbeitungsnummer",
    "beitragsnummer",
    "mandatsnummer",
    "kindergeld no",
    "payroll ref",
    "employee no",
    "matriculation no",
    "gmc no",
    "cert. no",
    "cert no",
    "mrn",
    "patient-id",
    "patient file"
  ],
  // Label gate for COURT_FILE_RE: the token must sit within CTX_WINDOW (or on the previous
  // labelled line, via hasContext) of one of these — the court-filing equivalent of the "does the
  // label say what this number is" question every other review-only reference already asks.
  COURT_FILE: [
    "az.",
    "az ",
    "aktenzeichen",
    "gesch\xE4ftszeichen",
    "geschaeftszeichen",
    "gesch.-z",
    "gesch.-z.",
    "gesch-z",
    "verfahren"
  ],
  ID_CARD: [
    "personalausweis",
    "ausweisnummer",
    "ausweis-nr",
    "ausweis nr",
    "reisepass",
    "reisepass-nr",
    "passnummer",
    "pass-nr",
    "perso",
    "ausweis",
    "dokumentennummer",
    "f\xFChrerschein",
    "f\xFChrerscheinnummer",
    "fahrerlaubnis",
    "passport",
    "passport number",
    "passport no",
    "id number",
    "id card",
    "identity card",
    "national id",
    "driver's license",
    "drivers license",
    "driving licence",
    "driving license",
    "licence number",
    "license number",
    "document number",
    "personalausweise",
    "ausweise",
    "personalausweises",
    "ausweises",
    "ausweiskopie",
    "ausweisdokument",
    "reisepasses",
    "f\xFChrerscheins",
    "fahrerkarte",
    "fahrerkartennummer",
    "driver license",
    "driver's licence",
    "driver licence",
    "residence permit",
    "aufenthaltstitel",
    "aufenthaltserlaubnis",
    "permit no",
    "reisep\xE4sse",
    "lichtbildausweis"
  ],
  // Labels that name an identity DOCUMENT outright, so that an all-digit value beside one is that
  // document's number (see the ID_CARD loop).
  ID_DOC_DIGITS: [
    "passport",
    "reisepass",
    "ausweis",
    "ausweises",
    "personalausweises",
    "passnummer",
    "pass-nr",
    "personalausweis",
    "ausweisnummer",
    "ausweis-nr",
    "f\xFChrerschein",
    "fuehrerschein",
    "driving licence",
    "driving license",
    "driver license",
    "driver's licen",
    "licence no",
    "license no",
    "residence permit",
    "aufenthaltstitel",
    "aufenthaltserlaubnis",
    "id card",
    "identity card",
    "fahrerkarte"
  ],
  HEALTH_INS: [
    "krankenversicherten",
    "krankenversichertennr",
    "versichertennummer",
    "versicherten-nr",
    "versichertennr",
    "krankenkasse",
    "pflegekasse",
    "versicherung",
    "vers.-nr",
    "vers.nr",
    "vers-nr",
    "vers. nr",
    "versnr",
    "versichertenkarte",
    "member no",
    "member id",
    "insurance number",
    "insurance no",
    "insurance id",
    "mbi",
    "medicare id",
    "egk",
    "kvnr",
    "kv-nr",
    "health insurance",
    "insurance number",
    "insurance no",
    "medicare",
    "medicaid",
    "nhs number",
    "health plan"
  ],
  BIC: [
    "bic",
    "swift",
    "swift-bic",
    "swiftcode",
    "swift code",
    "bank identifier",
    "bankleitzahl",
    "iban"
  ]
};
var CTX_WINDOW = 40;
var LABEL_LINE_WINDOW = 200;
var CTX_HEALTH_EXTRA = ["gesundheit", "diagnose", "krank", "leidet", "erkrankt"];
var CTX_WKN = ["wkn", "wertpapierkennnummer", "wertpapier-kennnr"];
var _ctxRe = /* @__PURE__ */ new WeakMap();
function ctxRegex(keywords) {
  let re = _ctxRe.get(keywords);
  if (!re) {
    re = new RegExp(
      "(?:" + keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + (/nummer$/.test(k) ? "n?" : "")).join("|") + ")(?:(?![a-z\xE4\xF6\xFC\xDF\\u0300-\\u036F])|(?=nummer|nummern|nr\\b|kennung|kennzeichen|zeichen|code|id\\b|number|no\\b))"
    );
    _ctxRe.set(keywords, re);
  }
  return re;
}
var WIDE_CTX_REACH = 120;
var SENTENCE_END_RE = /[a-zäöüß]{4,}[.!?](?=[ \t]+[A-ZÄÖÜ"„(])|[!?;](?=[ \t])/g;
function hasWideContext(text, start, keywords) {
  const lo = Math.max(0, start - WIDE_CTX_REACH);
  let seg = text.slice(lo, start);
  const nl = seg.lastIndexOf("\n");
  if (nl !== -1) seg = seg.slice(nl + 1);
  SENTENCE_END_RE.lastIndex = 0;
  let cut = -1, m;
  while ((m = SENTENCE_END_RE.exec(seg)) !== null) cut = m.index + m[0].length;
  if (cut !== -1) seg = seg.slice(cut);
  return ctxRegex(keywords).test(seg.toLowerCase());
}
function hasAnyContext(text, start, keywords) {
  return hasContext(text, start, keywords) || hasWideContext(text, start, keywords);
}
function hasLineContext(text, start, keywords) {
  const from = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  return ctxRegex(keywords).test(text.slice(from, start).toLowerCase());
}
var WRAPPED_NAME_LABEL_RE = /^[\p{Lu}][\p{L}'’.\-]{1,24}:$/u;
function hasContext(text, start, keywords) {
  const lo = Math.max(0, start - CTX_WINDOW);
  const behind = text.slice(lo, start);
  const nl = behind.lastIndexOf("\n");
  const window = (nl === -1 ? behind : behind.slice(nl + 1)).toLowerCase();
  if (ctxRegex(keywords).test(window)) return true;
  const joint = window.trim().replace(/^[-–—:,;.#]+[ \t]*/, "");
  const jointIsConnector = /^(?:nr\.?|no\.?|nummer|number|az\.?|ref\.?|id|#|lautet|lauten)?[ \t]*:?[ \t]*$/i.test(joint);
  if (nl !== -1 && !jointIsConnector && WRAPPED_NAME_LABEL_RE.test(behind.slice(nl + 1).trim())) {
    const back0 = text.slice(Math.max(0, start - LABEL_LINE_WINDOW), start);
    const n0 = back0.lastIndexOf("\n");
    if (n0 !== -1) {
      const above = back0.slice(0, n0);
      const aboveRaw = above.slice(above.lastIndexOf("\n") + 1).trimEnd();
      const aboveLine = aboveRaw.toLowerCase();
      if (!/[.!?:]$/.test(aboveLine) && new RegExp("(?:^|[^\\p{L}])\\p{Lu}\\p{Ll}[\\p{L}'\u2019-]*$", "u").test(aboveRaw) && ctxRegex(keywords).test(aboveLine.slice(-48))) return true;
    }
    return false;
  }
  const interleaved = nl !== -1 && !jointIsConnector && /^\d{1,5}$/.test(window.trim());
  if (nl === -1 || !jointIsConnector && !interleaved) return false;
  const lo2 = Math.max(0, start - LABEL_LINE_WINDOW);
  const back = text.slice(lo2, start);
  const nl2 = back.lastIndexOf("\n");
  if (nl2 === -1) return false;
  const prev = back.slice(0, nl2);
  const prevLine = prev.slice(prev.lastIndexOf("\n") + 1).trimEnd().toLowerCase();
  const endsSentence = /[.!?]$/.test(prevLine) && !new RegExp("(?:^|[^\\p{L}])\\p{L}{1,4}\\.$", "u").test(prevLine) && !/(?:nr|no|nummer)\.$/u.test(prevLine);
  if (!prevLine.endsWith(":") && endsSentence) return false;
  if (interleaved && !/(?:nr|nummer|no)\.?$/.test(prevLine)) return false;
  if (ctxRegex(keywords).test(prevLine)) return true;
  if (/^(?:nr|no|nummer|number)\.?$/.test(prevLine) && window.trim() === "") {
    const prev2 = prev.slice(0, prev.lastIndexOf("\n"));
    const l2 = prev2.slice(prev2.lastIndexOf("\n") + 1).trimEnd().toLowerCase();
    if (/[\p{L}]-$/u.test(l2) && ctxRegex(keywords).test(l2 + prevLine)) return true;
  }
  return false;
}
function* finditer2(reA, reB, text) {
  yield* finditer(reA, text);
  yield* finditer(reB, text);
}
function add(spans, start, end, text, category, score, source = "regex") {
  if (text.trim()) spans.push(new PiiSpan(start, end, category, text, score, source));
}
function lineAround(text, idx) {
  const from = text.lastIndexOf("\n", Math.max(0, idx - 1)) + 1;
  const to = text.indexOf("\n", idx);
  return text.slice(from, to === -1 ? text.length : to);
}
function hasAddressCorroboration(text, start, after) {
  STREET_TAIL_RE.lastIndex = 0;
  if (STREET_TAIL_RE.test(after)) return true;
  if (new RegExp("^[ \\t]*\\r?\\n[ \\t]*\\d{5}[ \\t]+\\p{Lu}", "u").test(after)) return true;
  if (hasContext(text, start, ADDRESS_LABEL_CONTEXT)) return true;
  const ls = text.lastIndexOf("\n", start - 1) + 1;
  if (!/^[ \t]*$/.test(text.slice(ls, start)) || ls < 2) return false;
  const ps = text.lastIndexOf("\n", ls - 2) + 1;
  return PREV_LINE_ADDRESS_LABEL_RE.test(text.slice(ps, ls - 1));
}
var PREV_LINE_ADDRESS_LABEL_RE = /^[ \t]*(?:stra(?:ß|ss)e|anschrift|adresse|wohnanschrift|stra(?:ß|ss)e[ ]*\/[ ]*hausnummer|street(?: address)?|address)\b[^\n]{0,24}:?[ \t]*$/i;
function isHyphenGlued(text, start, end) {
  if (text[start - 1] === "-" && /[\p{Lu}\p{Ll}]/u.test(text[start - 2] || "")) return true;
  return text[end] === "-" && new RegExp("\\p{Lu}", "u").test(text[end + 1] || "");
}
function nameOk(name) {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  if (NON_NAME_WORDS.has(tokens[0].toLowerCase())) return false;
  return !tokens.every((t) => KEEP_TERMS.has(t.toLowerCase()));
}
var STREET_LEAD_NOISE_RE = new RegExp(
  `^(?:[${CAP}${LOW}]*(?:gemeinschaft|verwaltung|praxis|kanzlei|klinik|klinikum|haus|hauses|geb\xE4ude|anlage|grundst\xFCck|anschrift|adresse|objekt|standort|wohnort|gesch\xE4ftsstelle|filiale|zentrale|schule|hotel|pension)|Address|Property|Venue|Location|Sitz|Ort)$`,
  "iu"
);
function* streetMatches(re, text) {
  for (const m of finditer(re, text)) {
    const words = m[0].split(/([ ]+)/);
    let cut = 0;
    while (words.length - cut >= 4 && STREET_LEAD_NOISE_RE.test(words[cut]) && /^[ ]+$/.test(words[cut + 1])) cut += 2;
    if (!cut) {
      yield m;
      continue;
    }
    const lead = words.slice(0, cut).join("");
    yield { index: m.index + lead.length, 0: m[0].slice(lead.length) };
  }
}
function* finditer(re, text) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    yield m;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
}
var _nonGlobal = /* @__PURE__ */ new WeakMap();
function nonGlobal(re) {
  let r = _nonGlobal.get(re);
  if (!r) {
    r = new RegExp(re.source, re.flags.replace("g", ""));
    _nonGlobal.set(re, r);
  }
  return r;
}
function matchAt0(re, s) {
  const m = nonGlobal(re).exec(s);
  return m && m.index === 0 ? m : null;
}
function personalSubjectAt(text, start, end) {
  const before = text.slice(Math.max(0, start - 240), start).split(/[.!?;\n]/).at(-1);
  const after = text.slice(end, end + 120).split(/[.!?;\n]/)[0];
  const context = before + text.slice(start, end) + after;
  if (/\b(?:if|wenn|falls|example|beispiel)\b/iu.test(before)) return false;
  return /\b(?:ich\s+(?:habe|bin|leide|nehme|wurde|werde|erhielt)|bei\s+mir\s+(?:wurde|ist)|i\s+(?:have|am|was|suffer|take|received)|i['’]m|my\s+(?:diagnosis|condition|religion|medication)|mein(?:e|en|em)?\s+(?:diagnose|erkrankung|religion|medikation))\b/iu.test(context);
}
var IBAN_LENGTH = {
  DE: 22,
  AT: 20,
  CH: 21,
  LI: 21,
  GB: 22,
  NL: 18,
  BE: 16,
  FR: 27,
  ES: 24,
  IT: 27,
  LU: 20,
  IE: 22,
  PL: 28,
  DK: 18,
  SE: 24,
  NO: 15,
  FI: 18,
  PT: 25,
  CZ: 24,
  SK: 24,
  HU: 28,
  GR: 27,
  HR: 21,
  SI: 19,
  RO: 24,
  BG: 22,
  EE: 20,
  LV: 21,
  LT: 20,
  CY: 28,
  MT: 31,
  TR: 26
};
var MASKED_IBAN_RE = rx(
  `${BL}([A-Z]{2})\\d{2}(?=[ ]?(?:\\d{2,4}|\\*{2,}|[xX]{4,}|[\u2022\xB7\u25CF]{2,}))(?:[ ]?(?:\\d{2,4}|\\*{2,}|[xX]{4,}|[\u2022\xB7\u25CF]{2,}))+${BR}`
);
function wrappedIbanGroups(text, at) {
  const head = /^[A-Z]{2}\d{2}/.exec(text.slice(at, at + 4));
  if (!head || !IBAN_LENGTH[head[0].slice(0, 2)]) return null;
  let i = at + 4, chars = 4, crossedNl = false;
  for (let g = 0; g < 9 && chars < 34; g++) {
    let j = i;
    if (text[j] === " ") j++;
    else if (text[j] === "\r" || text[j] === "\n") {
      if (text[j] === "\r") j++;
      if (text[j] !== "\n") break;
      j++;
      while (text[j] === " " || text[j] === "	") j++;
      crossedNl = true;
    } else break;
    const grp = /^[0-9A-Z]{1,4}(?![A-Za-z0-9])/.exec(text.slice(j, j + 5));
    if (!grp) break;
    const full = grp[0].length === 4;
    if (!full && !/^\d+$/.test(grp[0])) break;
    i = j + grp[0].length;
    chars += grp[0].length;
    if (!full) break;
  }
  if (!crossedNl || chars < IBAN_LENGTH[head[0].slice(0, 2)]) return null;
  return { end: i, value: text.slice(at, i), compact: text.slice(at, i).replace(/\s+/g, "") };
}
var IBAN_GROUP_START_RE = /(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?=[ \r\n])/g;
var IBAN_WALK_START_RE = /(?<![A-Za-z0-9])([A-Z])[ ]?([A-Z])[ ]?(\d)[ ]?(\d)(?=[ \r\n]?[A-Z0-9])/g;
function walkIban(text, at) {
  const first = text.slice(at, at + 4).replace(/ /g, "");
  const country = first.slice(0, 2);
  const len = IBAN_LENGTH[country];
  if (!len) return null;
  let i = at, got = "", crossedNl = false, spaced = false;
  while (i < text.length && got.length < len) {
    const c = text[i];
    if (/[A-Z0-9]/.test(c)) {
      got += c;
      i++;
      continue;
    }
    if (c === " ") {
      i++;
      if (got.length % 4 !== 0) spaced = true;
      continue;
    }
    if (c === "\r" || c === "\n") {
      crossedNl = true;
      i++;
      while (i < text.length && /[ \t\r\n]/.test(text[i])) i++;
      continue;
    }
    break;
  }
  if (got.length !== len) return null;
  if (/[A-Za-z0-9]/.test(text[i] || "")) return null;
  return { end: i, value: text.slice(at, i), crossedNl, spaced, compact: got };
}
var MASKED_CARD_GENERIC_RE = rx(
  `(?<![\\dA-Za-z*])(?:(?:\\d{4}|[*xX\u2022]{4})[ -]){3}\\d{4}${BR}`
);
var CARD_CTX_EXTRA = [
  "karte",
  "card",
  "visa",
  "mastercard",
  "amex",
  "kreditkarte",
  "girocard",
  "maestro",
  "debitkarte",
  "ec-karte",
  "bankkarte",
  "kartennummer"
];
var ENDING_DIGITS_RE = rx(
  `${BL}(?:ending(?:[ ]in|[ ]with)?|endet(?:[ ]auf|[ ]mit)?|endend(?:[ ]auf|[ ]mit)?|endung|ends(?:[ ]in|[ ]with)?|letzte(?:n)?[ ](?:4|vier)[ ]ziffern)[ ]*:?[ ]*(\\d{4})${BR}`,
  "i"
);
var ACCOUNT_CTX_EXTRA = [
  "konto",
  "iban",
  "bank",
  "sort code",
  "sparkasse",
  "barclays",
  "lloyds",
  "hsbc",
  "natwest",
  "volksbank",
  "commerzbank",
  "joint",
  "savings",
  "girokonto",
  "tagesgeld"
];
var SORT_CODE_RE = rx(`${BL}\\d{2}[ -]\\d{2}[ -]\\d{2}${BR}`);
var ACCOUNT_LABEL_GROUPED_RE = rx(
  `${BL}(?:konto[ -]?(?:nummer|nr\\.?)|kontonr\\.?|konto|mieterkonto|depot[ -]?(?:nummer|nr\\.?)|depotnr\\.?|depot|bausparvertrag|bsv|wertpapierdepot|sparbuch|sparkonto|deposit[ ]number|account[ ](?:number|no\\.?))(?:[ ]*(?:nr\\.?|no\\.?|nummer|number|#))?[ ]*[:]?[ ]*(\\d{2,4}(?:[ -]\\d{2,4}){1,3})${BR}`,
  "i"
);
var CTX_PASSWORD_WORDS = [
  "passwort",
  "password",
  "kennwort",
  "passwd",
  "pwd",
  "pw ",
  "pw:",
  "pw.",
  "initialpasswort",
  "erstpasswort",
  "startpasswort",
  "zugangsdaten",
  "temp",
  "klartext"
];
var CTX_SECRET_WORDS = [
  "token",
  "api-key",
  "api key",
  "apikey",
  "secret",
  "session",
  "sessid",
  "sid",
  "schl\xFCssel",
  "key",
  "credential",
  "zugangsdaten",
  "bearer",
  "cookie",
  "hash"
];
var PASSWORDISH_RE = rx(
  `(?<![A-Za-z0-9_@.\\-])(?:[A-Z\xC4\xD6\xDC][a-z\xE4\xF6\xFC\xDF]{2,}(?:[-&#][A-Za-z\xE4\xF6\xFC\xDF]{2,})?[0-9]{2,4}[!#$%&?*]?|[A-Z\xC4\xD6\xDC][a-z\xE4\xF6\xFC\xDF]{2,}[!#$%&*?][A-Za-z0-9]{2,}|[A-Z\xC4\xD6\xDC][a-z\xE4\xF6\xFC\xDF]{2,}[-&#][A-Za-z\xE4\xF6\xFC\xDF]{2,}[0-9]{1,4})(?![A-Za-z0-9_@])`
);
var BCRYPT_RE = rx(`(?<![A-Za-z0-9$])\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}(?![A-Za-z0-9])`);
var PREFIXED_TOKEN_RE = rx(`(?<![A-Za-z0-9_])[a-z]{2,6}_[A-Za-z0-9]{10,}(?![A-Za-z0-9_])`);
var HEX_SECRET_RE = rx(`(?<![0-9A-Za-z])[0-9a-f]{32,64}(?![0-9A-Za-z])`);
var LICENSE_KEY_RE = rx(
  `(?:Schl\xFCssel|Lizenzschl\xFCssel|Lizenz-?Key|licen[cs]e key|product key|activation key|Aktivierungsschl\xFCssel)[ \\t]*[:=]?[ \\t]*([A-Z0-9]{2,6}(?:-[A-Z0-9]{2,8}){2,5})(?![A-Za-z0-9-])`,
  "i"
);
var SSH_FINGERPRINT_RE = rx(`(?<![A-Za-z0-9])SHA256:([A-Za-z0-9+/]{43})(?![A-Za-z0-9+/])`);
var URL_SECRET_RE = rx(`https?://[^\\s"'<>]{12,300}`);
var ciWord = (w) => w.replace(/[a-z]/gi, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);
var HANDLE_LABELS = [
  "Benutzername",
  "Benutzernamen",
  "Nutzername",
  "Nutzernamen",
  "Anmeldename",
  "Anmeldenamen",
  "Login-Name",
  "Loginname",
  "User-Name",
  "Username",
  "User Name",
  "Benutzerkennung",
  "Benutzer",
  "Zugangsdaten",
  "Testkonto",
  "Konto",
  "Account",
  "Bearbeiter",
  "Login",
  "Zugang",
  "Kennung",
  "Benutzers",
  "Nutzers"
].map(ciWord).join("|");
var HANDLE_LABEL_RE = rx(
  `${BL}(?:${HANDLE_LABELS})(?:[ \\t]+im[ \\t]+[A-Za-z\xC4\xD6\xDC\xE4\xF6\xFC\xDF-]{3,25})?(?:[ \\t]+(?:lautet|lauten|ist|sind|is|are|f\xFCr|von|war|waren|lautete))?[ \\t]*[:]?[ \\t]*(?:[\u201E"'\`]?(@?[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+|[a-z]{2,}\\d[a-z0-9]*)[\u201C"'\`]?|[\u201E"'\`](@?[A-Za-z][A-Za-z0-9._-]{3,30})[\u201C"'\`])(?![A-Za-z0-9_@-]|\\.[A-Za-z0-9])`
);
var HANDLE_AFTER_RE = rx(
  `${BL}([a-z][a-z0-9]*(?:[._-][a-z0-9]+)+)(?=[ \\t]*\\((?:Benutzername|username|Login|Nutzername|Account)\\))`
);
var BIC_SPACED_RE = rx(`${BL}(?:[A-Z][ ]){3,}[A-Z0-9](?:[ ][A-Z0-9]){2,6}${BR}`);
var INLINE_PAIR_RE = /(?<![A-Za-z0-9_.-])["']?([A-Za-z][A-Za-z0-9_.-]{1,24})["']?[ \t]*[:=][ \t]*(?:"([^"\n]{2,120})"|'([^'\n]{2,120})'|([^\s"',;)\]}|]{3,120}))/g;
var USER_KEYS = /* @__PURE__ */ new Set([
  "user",
  "username",
  "user_name",
  "usr",
  "login",
  "loginname",
  "login_name",
  "uname",
  "benutzer",
  "benutzername",
  "nutzer",
  "nutzername",
  "admin",
  "actor",
  "user_id",
  "userid",
  "uid",
  "agent",
  "owner",
  "assignee",
  "assigned_to",
  "created_by",
  "requester",
  "reporter",
  "operator",
  "by",
  "modified_by",
  "approved_by",
  "handle"
]);
var STRONG_USER_KEYS = /* @__PURE__ */ new Set([
  "user",
  "username",
  "user_name",
  "usr",
  "login",
  "loginname",
  "login_name",
  "uname",
  "benutzername",
  "nutzername",
  "admin",
  "actor"
]);
var IP_KEYS = /* @__PURE__ */ new Set([
  "ip",
  "src",
  "src_ip",
  "source",
  "source_ip",
  "client",
  "client_ip",
  "clientip",
  "remote",
  "remote_addr",
  "remote_ip",
  "last_login_ip",
  "ip_address",
  "ipaddress",
  "addr",
  "from",
  "peer",
  "host_ip",
  "x-forwarded-for",
  "forwarded_for",
  "ip_addr"
]);
var SECRET_KEYS = /* @__PURE__ */ new Set([
  "sess",
  "sessid",
  "session_key",
  "csrf",
  "csrf_token",
  "reset_token",
  "refresh",
  "db_pass",
  "db_password",
  "pw",
  "pw_hash",
  "password_hash",
  "passwd_hash",
  "mfa_code",
  "otp_code",
  "totp",
  "verification_code",
  "sms_code",
  "temp",
  "webhook",
  "webhook_url",
  "code",
  "auth",
  "key",
  "x-api-key",
  "xsrf",
  "password",
  "passwort",
  "passwd",
  "pwd",
  "pass",
  "temp_password",
  "temppassword",
  "initial_password",
  "secret",
  "client_secret",
  "clientsecret",
  "api_key",
  "apikey",
  "api-key",
  "token",
  "access_token",
  "accesstoken",
  "auth_token",
  "refresh_token",
  "session",
  "session_id",
  "sessionid",
  "session_token",
  "sid",
  "cookie",
  "authorization",
  "kennwort",
  "bearer",
  "private_key",
  "webhook_secret",
  "signing_secret",
  "otp",
  "pin",
  "tan"
]);
var GENERIC_ACCOUNTS = /* @__PURE__ */ new Set([
  "await",
  "async",
  "new",
  "this",
  "self",
  "return",
  "function",
  "const",
  "let",
  "var",
  "def",
  "class",
  "print",
  "yield",
  "lambda",
  "req",
  "request",
  "ctx",
  "args",
  "params",
  "name",
  "value",
  "root",
  "admin",
  "administrator",
  "system",
  "guest",
  "anonymous",
  "null",
  "none",
  "unknown",
  "test",
  "demo",
  "default",
  "nobody",
  "service",
  "user",
  "true",
  "false",
  "n/a",
  "daemon",
  "web",
  "app",
  "api",
  "cron",
  "backup",
  "postgres",
  "mysql",
  "ubuntu",
  "ec2-user"
]);
var WEBHOOK_SECRET_RE = /\/services\/T[A-Z0-9]{6,}\/B[A-Z0-9]{6,}\/[A-Za-z0-9]{16,}|\/webhooks?\/\d*\/?[A-Za-z0-9_-]{20,}|[?&](?:token|key|secret)=[A-Za-z0-9_.%-]{10,}/i;
var SERVICE_ACCOUNT_RE = /^(?:svc|sys|service|bot|ci|cron|batch|srv|app|api|jenkins|deploy|backup)[-_.]/i;
var ROW_KEY_ID_RE = /^[A-Za-z]{1,2}[_-]\d+$/;
var HANDLE_VALUE_RE = /^[\p{L}][\p{L}\p{N}._-]{2,40}$/u;
var SESSION_LINE_RE = /\b(?:sshd?|accepted|publickey|failed password|login|logon|log-in|anmeld\w*|session|sitzung|user|benutzer|nutzer|username|auth\w*|logged|signin|sign-in|zugriff|ip[- ]?adress\w*|ip address|client|abruf\w*|access\w*|connection|verbindung|vpn|ssh)\b/i;
var INFRA_LINE_RE = /\b(?:gateway|netmask|subnet|subnetz|dns|router|firewall|server|host(?:name)?|vlan|dhcp|range|bereich|cidr|proxy|nameserver|ntp|smtp|relay|database|datenbank|db[-_ ]?host|backend|endpoint|deploy\w*|cluster|node|switch|drucker|printer|nas)\b/i;
var PASSWORD_FLAG_BEFORE_RE = /(?:--?(?:temp|tmp|password|passwd|pass|pw|p)|(?:passwort|password|kennwort|pw)[ \t]*[:=])[ \t=]*["']?$/i;
var PASSWORD_LABEL_RE = rx(
  `${BL}(?:passwort|kennwort|password|passwd|pwd|erstpasswort|startpasswort|initialpasswort|temp(?:orary)?[ _]?password|initial password|zugangspasswort)${BR}(?:[ \\t]+(?:des|der|von|f\xFCr|for|of|fuer)[ \\t]+[\\p{L}\\-]{2,24}(?:[ \\t]+[\\p{L}\\-]{2,24})?)?(?:[ \\t]*[:=][ \\t]*|(?:[ \\t]+(?:sent|set|given|issued|vergeben|\xFCbermittelt|verschickt))?[ \\t]+(?:ist|lautet|is|war|was|wurde[ \\t]+gesetzt[ \\t]+auf)[ \\t]+|[ \\t]+)['"\u201E\u201C\u201A\u2018]?([^\\s"'\u201E\u201C\u201D\u201A\u2018\u2019,;()<>]{6,40})`,
  "iu"
);
function looksLikeSecretValue(v, key) {
  if (v.length < 6 && !/^(?:pin|otp|tan|mfa_code|otp_code|totp|verification_code|sms_code)$/.test(key.toLowerCase())) return false;
  if (v.length < 4) return false;
  if (/^[*•x#.\-_]+$/i.test(v)) return false;
  if (/^\d{1,4}[.\-/]\d{1,2}[.\-/]\d{1,4}$/.test(v)) return false;
  if (/^\d+$/.test(v) && !/^(?:pin|otp|tan|mfa_code|otp_code|totp|verification_code|sms_code)$/.test(key.toLowerCase())) return false;
  if (/^(?:null|none|undefined|redacted|\[redacted\]|<redacted>|changeme|example|your[-_ ]?\w*|xxx+)$/i.test(v)) return false;
  if (/replace|change[-_ ]?me|placeholder|your[-_]|dummy|sample|example|todo|redact|insert|<.*>|\.\.\./i.test(v)) return false;
  if (/^\$\{|^\{\{|^<.*>$|^%.*%$/.test(v)) return false;
  if (/[@]/.test(v) && /\.[a-z]{2,}$/i.test(v)) return false;
  if (/^\\?\$2[aby]\\?\$\d{2}\\?\$[./A-Za-z0-9\\]{20,}$/.test(v)) return true;
  const k = key.toLowerCase();
  if (/^https?:\/\//i.test(v)) return (k === "webhook" || k === "webhook_url") && WEBHOOK_SECRET_RE.test(v);
  const tokenish = /^(?:sess|sessid|session_key|csrf|csrf_token|reset_token|refresh|auth|key|x-api-key|xsrf|code|token|access_token|accesstoken|auth_token|refresh_token|session|session_id|sessionid|session_token|sid|cookie|authorization|api_key|apikey|api-key|secret|client_secret|clientsecret|webhook_secret|signing_secret|private_key|bearer)$/.test(k);
  if (tokenish) {
    if (/^[0-9a-f]{16,}$/i.test(v)) return true;
    if (v.length >= 16 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /^[A-Za-z0-9_\-.=+/]+$/.test(v)) return true;
    if (!/\d/.test(v) || !/[A-Za-z]/.test(v)) return false;
    if (k === "code" || k === "key" || k === "auth") return v.length >= 12 && /^[A-Za-z0-9_\-.=+/]+$/.test(v);
    return v.length >= 8 && /^[A-Za-z0-9_\-.=+/]+$/.test(v);
  }
  return /\d|[!#$%&@*+?]/.test(v);
}
function inlineIdentifierSpans(text, spans) {
  for (const m of finditer(INLINE_PAIR_RE, text)) {
    const key = m[1];
    const lower = key.toLowerCase();
    const value = m[2] ?? m[3] ?? m[4];
    if (!value) continue;
    const vStart = m.index + m[0].lastIndexOf(value);
    if (USER_KEYS.has(lower)) {
      if (/^\d+$/.test(value) || ROW_KEY_ID_RE.test(value) || SERVICE_ACCOUNT_RE.test(value)) continue;
      if (!HANDLE_VALUE_RE.test(value) || GENERIC_ACCOUNTS.has(value.toLowerCase())) continue;
      if (/[ \t]=[ \t]/.test(m[0]) && !/[._\-\d]/.test(value)) continue;
      if (/^[ \t]*[(.]/.test(text.slice(vStart + value.length))) continue;
      if (!/[._\-\d]/.test(value) && !(STRONG_USER_KEYS.has(lower) && /^[a-z]{3,}$/.test(value))) continue;
      if (!STRONG_USER_KEYS.has(lower) && !/[._\-\d]/.test(value)) continue;
      add(spans, vStart, vStart + value.length, value, "ONLINE_ID", 0.8);
    } else if (IP_KEYS.has(lower)) {
      if (!nonGlobal(IPV4_RE).test(value) && !(nonGlobal(IPV6_RE).test(value) && looksLikeIpv6(value))) continue;
      if (isReservedNonSubscriberIp(value)) continue;
      if (isDocumentationOrLoopbackIp(value) && !isInternalIpOfSession(text, vStart)) continue;
      add(spans, vStart, vStart + value.length, value, "ONLINE_ID", 0.85);
    } else if (SECRET_KEYS.has(lower)) {
      if (!looksLikeSecretValue(value, lower)) continue;
      add(spans, vStart, vStart + value.length, value, "CREDENTIAL", 0.85);
    }
  }
}
function isReservedNonSubscriberIp(candidate) {
  const v4 = candidate.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]), b = Number(v4[2]);
    return a === 0 || a === 127 || a === 169 && b === 254 || a >= 224 || candidate === "255.255.255.0";
  }
  const low = candidate.toLowerCase();
  return low === "::" || low === "::1" || /^fe80:/.test(low);
}
function isDocumentationOrLoopbackIp(candidate) {
  const v4 = candidate.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]), b = Number(v4[2]), c = Number(v4[3]);
    return a === 0 || a === 127 || a === 169 && b === 254 || a === 192 && b === 0 && c === 2 || a === 198 && b === 51 && c === 100 || a === 203 && b === 0 && c === 113 || a === 198 && (b === 18 || b === 19) || a >= 224;
  }
  const low = candidate.toLowerCase();
  return low === "::" || low === "::1" || /^fe80:/.test(low) || /^2001:db8:/.test(low);
}
function isPrivateRfc1918(ip) {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return /^f[cd][0-9a-f]{2}:/i.test(ip);
  const a = Number(v4[1]), b = Number(v4[2]);
  return a === 10 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168;
}
var LOG_LINE_RE = /^[ \t]*(?:\[?\d{4}-\d{2}-\d{2}[T ]\d|\d{1,2}\/[A-Z][a-z]{2}\/\d{4}:|\d{1,2}\.\d{1,2}\.\d{4}[ ,]+\d{1,2}:\d{2}|\d{1,2}:\d{2}(?::\d{2})?\b)|\b(?:INFO|WARN|WARNING|ERROR|DEBUG|TRACE)\b/;
function isInternalIpOfSession(text, start) {
  const line = lineAround(text, start);
  if (INFRA_LINE_RE.test(line) && !/\b(?:login|logon|anmeld\w*|user|benutzer|username)\b/i.test(line)) return false;
  return SESSION_LINE_RE.test(line) || LOG_LINE_RE.test(line);
}
function extraIdentifierSpans(text, spans) {
  for (const m of finditer(MASKED_IBAN_RE, text)) {
    if (!IBAN_LENGTH[m[1]]) continue;
    if (!/\*{2,}|[xX]{4,}|[•·●]{2,}/.test(m[0])) continue;
    if (!/\d{2,4}$/.test(m[0])) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "IBAN", 0.85);
  }
  for (const m of finditer(IBAN_WALK_START_RE, text)) {
    const w = walkIban(text, m.index);
    if (!w || !(w.crossedNl || w.spaced)) continue;
    if (spans.some((s) => s.category === "IBAN" && s.start <= m.index && s.end >= w.end)) continue;
    const valid = ibanIsValid(w.compact);
    if (!valid && !hasContext(text, m.index, ["iban", "konto", "bank", "account"])) continue;
    add(spans, m.index, w.end, w.value, "IBAN", valid ? 0.95 : 0.75);
  }
  for (const m of finditer(IBAN_GROUP_START_RE, text)) {
    const w = wrappedIbanGroups(text, m.index);
    if (!w) continue;
    if (spans.some((s) => s.category === "IBAN" && s.start <= m.index && s.end >= w.end)) continue;
    if (!ibanIsValid(w.compact) && !hasContext(text, m.index, ["iban", "konto", "bank", "account"])) continue;
    add(spans, m.index, w.end, w.value, "IBAN", ibanIsValid(w.compact) ? 0.95 : 0.75);
  }
  for (const m of finditer(MASKED_CARD_GENERIC_RE, text)) {
    if (!/[*xX•]{4}/.test(m[0])) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "CREDIT_CARD", 0.85);
  }
  for (const m of finditer(ENDING_DIGITS_RE, text)) {
    const digits = m[1];
    const dStart = m.index + m[0].length - digits.length;
    const isCard = hasWideContext(text, m.index + 1, CARD_CTX_EXTRA) || hasWideContext(text, dStart, CARD_CTX_EXTRA);
    const isAcct = !isCard && (hasWideContext(text, dStart, ACCOUNT_CTX_EXTRA) || /(?:^|[^\p{L}])(?:account|konto)(?![\p{L}])/iu.test(text.slice(Math.max(0, m.index - 60), m.index).split(/[.!?\n]/).at(-1)) && ctxRegex(ACCOUNT_CTX_EXTRA).test(text.slice(dStart + 4, dStart + 80).split(/[.!?\n]/)[0].toLowerCase()));
    if (!isCard && !isAcct) continue;
    add(spans, dStart, dStart + 4, digits, isCard ? "CREDIT_CARD" : "ACCOUNT", 0.7);
  }
  for (const m of finditer(SORT_CODE_RE, text)) {
    if (hasWideContext(text, m.index, ["sort code", "sortcode", "sort-code", "sc:"])) {
      add(spans, m.index, m.index + m[0].length, m[0], "ACCOUNT", 0.85);
    } else if (/^[ \t]*[/·|][ \t]*\d{8}\b/.test(text.slice(m.index + m[0].length)) && hasLineContext(text, m.index, ["sort", "account", "konto"])) {
      add(spans, m.index, m.index + m[0].length, m[0], "ACCOUNT", 0.8);
    }
  }
  for (const m of finditer(ACCOUNT_LABEL_GROUPED_RE, text)) {
    const g = m[1];
    const gStart = m.index + m[0].length - g.length;
    if (/^\d{1,2}[ -]\d{1,2}[ -]\d{2,4}$/.test(g)) continue;
    const digits = g.replace(/\D/g, "").length;
    if (digits < 6 || digits > 12) continue;
    if (spans.some((s) => s.start <= gStart && s.end >= gStart + g.length && s.category !== "PHONE")) continue;
    add(spans, gStart, gStart + g.length, g, "ACCOUNT", 0.8);
  }
  for (const m of finditer(BIC_SPACED_RE, text)) {
    const compact = m[0].replace(/ /g, "");
    if (compact.length !== 8 && compact.length !== 11) continue;
    if (!bicIsValid(compact)) continue;
    if (!hasContext(text, m.index, CTX.BIC)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "BIC", 0.85);
  }
  inlineIdentifierSpans(text, spans);
  for (const m of finditer(PASSWORD_LABEL_RE, text)) {
    const v = m[1].replace(/[.!?]+$/, (t) => /[!]/.test(t) && m[1].length - t.length >= 5 ? "!" : "");
    if (!looksLikeSecretValue(v, "password")) continue;
    const start = m.index + m[0].lastIndexOf(m[1]);
    if (spans.some((s) => s.category === "CREDENTIAL" && s.start <= start && s.end >= start + v.length)) continue;
    add(spans, start, start + v.length, v, "CREDENTIAL", 0.85);
  }
  for (const m of finditer(PASSWORDISH_RE, text)) {
    if (spans.some((x) => x.start <= m.index && x.end >= m.index + m[0].length)) continue;
    if (!hasWideContext(text, m.index, CTX_PASSWORD_WORDS)) continue;
    const flagged = PASSWORD_FLAG_BEFORE_RE.test(text.slice(Math.max(0, m.index - 16), m.index));
    if (!/\d|[!#$%&*+?@]/.test(m[0]) || !flagged && isCommonWord(m[0].replace(/[^A-Za-zäöüÄÖÜß]/g, ""))) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "CREDENTIAL", 0.8);
  }
  for (const m of finditer(BCRYPT_RE, text)) {
    if (spans.some((x) => x.start <= m.index && x.end >= m.index + m[0].length)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "CREDENTIAL", 0.9);
  }
  for (const m of finditer(PREFIXED_TOKEN_RE, text)) {
    if (spans.some((x) => x.start <= m.index && x.end >= m.index + m[0].length)) continue;
    if (!/\d/.test(m[0]) || !/[A-Za-z]/.test(m[0].slice(m[0].indexOf("_") + 1))) continue;
    if (!hasWideContext(text, m.index, CTX_SECRET_WORDS)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "CREDENTIAL", 0.8);
  }
  for (const m of finditer(HEX_SECRET_RE, text)) {
    if (spans.some((x) => x.start <= m.index && x.end >= m.index + m[0].length)) continue;
    if (!hasWideContext(text, m.index, CTX_SECRET_WORDS)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "CREDENTIAL", 0.85);
  }
  for (const m of finditer(LICENSE_KEY_RE, text)) {
    add(spans, m.index + m[0].length - m[1].length, m.index + m[0].length, m[1], "CREDENTIAL", 0.8);
  }
  for (const m of finditer(SSH_FINGERPRINT_RE, text)) {
    const v = m[1];
    add(spans, m.index + m[0].length - v.length, m.index + m[0].length, v, "CREDENTIAL", 0.8);
  }
  for (const m of finditer(URL_SECRET_RE, text)) {
    const url = m[0].replace(/[.,;:)\]]+$/, "");
    if (/\/services\/T[A-Z0-9]{6,}\/B[A-Z0-9]{6,}\/[A-Za-z0-9]{16,}|\/webhooks?\/\d*\/?[A-Za-z0-9_-]{20,}/i.test(url)) {
      add(spans, m.index, m.index + url.length, url, "CREDENTIAL", 0.85);
      continue;
    }
    const q = /[?&](?:token|key|secret|code|access_token|api_key|apikey|sig|signature)=([A-Za-z0-9_.%-]{10,})/i.exec(url);
    if (q && /\d/.test(q[1]) && /[A-Za-z]/.test(q[1])) {
      const at = m.index + url.indexOf(q[1], q.index);
      add(spans, at, at + q[1].length, q[1], "CREDENTIAL", 0.85);
    }
  }
  for (const m of finditer(HANDLE_LABEL_RE, text)) {
    const h = m[1] || m[2];
    if (!/[._\d]/.test(h) || /[._-]$/.test(h) || GENERIC_ACCOUNTS.has(h.toLowerCase())) continue;
    if (/^\d/.test(h) || SERVICE_ACCOUNT_RE.test(h) || ROW_KEY_ID_RE.test(h) || text[m.index + m[0].length] === "@") continue;
    const close = /[“"'`]$/.test(m[0]) ? 1 : 0;
    const at = m.index + m[0].length - close - h.length;
    add(spans, at, at + h.length, h, "ONLINE_ID", 0.8);
  }
  for (const m of finditer(HANDLE_AFTER_RE, text)) {
    const h = m[1];
    if (!/[._\d]/.test(h) || /[._-]$/.test(h) || SERVICE_ACCOUNT_RE.test(h)) continue;
    add(spans, m.index, m.index + h.length, h, "ONLINE_ID", 0.8);
  }
  for (const m of finditer(IPV4_RE, text)) {
    if (!isPrivateRfc1918(m[0]) && !(isDocumentationOrLoopbackIp(m[0]) && !isReservedNonSubscriberIp(m[0]))) continue;
    if (/^\/(3[0-2]|[12]?\d)\b/.test(text.slice(m.index + m[0].length))) continue;
    if (!isInternalIpOfSession(text, m.index)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "ONLINE_ID", 0.8);
  }
}
var MONTH_NUM = {
  januar: 1,
  jan: 1,
  january: 1,
  februar: 2,
  feb: 2,
  february: 2,
  m\u00E4rz: 3,
  maerz: 3,
  mar: 3,
  march: 3,
  april: 4,
  apr: 4,
  mai: 5,
  may: 5,
  juni: 6,
  jun: 6,
  june: 6,
  juli: 7,
  jul: 7,
  july: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  oct: 10,
  october: 10,
  november: 11,
  nov: 11,
  dezember: 12,
  dez: 12,
  dec: 12,
  december: 12
};
function dobKey(str) {
  if (!/[A-Za-zäÄ]/.test(str)) str = str.replace(/(?<=\d) (?=[\d.|\/-])|(?<=[.|\/-]) (?=\d)/g, "").replace(/\|/g, ".");
  let m = /^(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{2,4})$/.exec(str);
  if (m) return `${+m[1]}-${+m[2]}-${+m[3] % 100}`;
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str);
  if (m) return `${+m[3]}-${+m[2]}-${+m[1] % 100}`;
  m = /^(\d{1,2})(?:st|nd|rd|th)?\.?\s+([A-Za-zäÄ]+)\.?\s+(\d{4})$/.exec(str);
  if (m && MONTH_NUM[m[2].toLowerCase()]) return `${+m[1]}-${MONTH_NUM[m[2].toLowerCase()]}-${+m[3] % 100}`;
  m = /^([A-Za-zäÄ]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s+(\d{4})$/.exec(str);
  if (m && MONTH_NUM[m[1].toLowerCase()]) return `${+m[2]}-${MONTH_NUM[m[1].toLowerCase()]}-${+m[3] % 100}`;
  return null;
}
var DOB_ANY_RE = rx(`${BL}${DOB_DATE}${BR}`, "i");
var BIRTHDAY_CUE_RE = /(?<![\p{L}])Geburtstag(?:s)?(?![\p{L}])(?:[^.\n\d]|\.(?=\d)){0,40}?(\d{1,2}\.[ \t]?\d{1,2}\.(?!\d)|\d{1,2}\.[ \t]+(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)(?![\p{L}]))/gu;
var DOB_SPLIT_RE = /(?<![\p{L}])(?:geb\.|geboren(?:[ \t]+am)?)[ \t]*(\d[ ]\d\.\d{1,2}\.\d{2,4})(?!\d)/gu;
function birthdayCueSpans(text, spans) {
  for (const re of [BIRTHDAY_CUE_RE, DOB_SPLIT_RE]) {
    for (const m of finditer(re, text)) {
      const at = m.index + m[0].length - m[1].length;
      if (spans.some((x) => x.start < at + m[1].length && x.end > at)) continue;
      add(spans, at, at + m[1].length, m[1], "DOB", 0.8);
    }
  }
}
function dobVariantSpans(text, spans) {
  const keys = /* @__PURE__ */ new Set();
  for (const sp of spans) {
    if (sp.category !== "DOB") continue;
    const k = dobKey(sp.text.trim());
    if (k) keys.add(k);
  }
  if (!keys.size) return;
  for (const m of finditer(DOB_ANY_RE, text)) {
    const k = dobKey(m[0]);
    if (!k || !keys.has(k)) continue;
    if (spans.some((x) => x.start < m.index + m[0].length && x.end > m.index)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "DOB", 0.85);
  }
}
function icdTitleAfter(text, at) {
  const m = new RegExp("^[ \\t]+(\\p{L}[\\p{L}\\-\\/]{3,}(?:[ \\t]+[\\p{L}\\-\\/]+){0,6})", "u").exec(text.slice(at, at + 90));
  if (!m) return "";
  let t = m[1];
  const cut = t.search(/[ \t]{2,}|\d{1,2}\.\d{1,2}\./);
  if (cut > 0) t = t.slice(0, cut);
  const rest = text.slice(at + m[0].length, at + m[0].length + 40);
  const q = new RegExp("^,[ \\t]+(?:nicht[ \\t]+n\xE4her[ \\t]+bezeichnet|mit[ \\t]+\\p{L}+|ohne[ \\t]+\\p{L}+|sonstige[ \\t]+\\p{L}+|akut|chronisch)", "u").exec(rest);
  const full = " " + t.replace(/\s+$/, "") + (q && t === m[1] ? q[0] : "");
  return text.slice(at, at + full.length) === full ? full : "";
}
function sentenceBefore(text, at) {
  const from = Math.max(0, at - 80);
  const head = text.slice(from, at);
  const nl = head.lastIndexOf("\n");
  let seg = nl >= 0 ? head.slice(nl + 1) : head;
  const dot = Math.max(seg.lastIndexOf(". "), seg.lastIndexOf("; "));
  return dot >= 0 ? seg.slice(dot + 2) : seg;
}
var _hvText = null;
var _hvValue = false;
function documentHasHealthVocabulary(text) {
  if (text === _hvText) return _hvValue;
  const low = text.toLowerCase();
  _hvValue = HEALTH_CONTEXT.some((k) => low.includes(k)) || search(HEALTH_TERM_RE, text) !== null;
  _hvText = text;
  return _hvValue;
}
var _meText = null;
var _meValue = false;
function documentHasMedicalEvidence(text) {
  if (text === _meText) return _meValue;
  _meValue = search(HEALTH_TERM_RE, text) !== null || search(HEALTH_DRUG_RE, text) !== null || search(MEDICATION_DOSE_RE, text) !== null || /\b[A-TV-Z]\d{2}\.\d{1,2}\b|\b(?:patient(?:in)?|arzt|ärztin|ärztlich|klinik|krankenhaus|medizin\w*|medical|doctor|physician|hospital)\b/i.test(text);
  _meText = text;
  return _meValue;
}
var HEALTH_NEG_BEFORE_RE = new RegExp("(?:^|[\\s(,;:])(?:kein(?:e|en|er|em|es)?|ohne|no|without|nie|niemals|never)[ \\t]+(?:\\p{L}+[ \\t]+){0,1}$", "iu");
var HEALTH_NEG_AFTER_RE = /^[ ]+(?:kein(?:e|er|en)?|nicht[ \t]+(?:bekannt|vorhanden|vorliegend|nachweisbar))\b/iu;
function healthNegatedAt(text, start, end) {
  return HEALTH_NEG_BEFORE_RE.test(text.slice(Math.max(0, start - 40), start)) || HEALTH_NEG_AFTER_RE.test(text.slice(end, end + 30));
}
var HEALTH_SUBJECT_STEMS = [...HEALTH_SUBJECT_TERMS].filter((t) => !t.endsWith("$"));
var HEALTH_SUBJECT_WORDS = [...HEALTH_SUBJECT_TERMS].filter((t) => t.endsWith("$")).map((t) => t.slice(0, -1));
var HEALTH_SUBJECT_TERM_RE = rx(`${BL}(?:(?:${termAlternation(HEALTH_SUBJECT_STEMS)})[${Wd}]*|(?:${termAlternation(HEALTH_SUBJECT_WORDS)})(?![${Wd}]))(?:-[${CAP}${LOW}][${Wd}]*)*(?:[ \\t]?\\([^)\\n]{1,14}\\))?(?:[ \\t]+(?:Typ|Grad|Stadium|Stufe)[ \\t]*[IVX\\d]+[a-z]?|[ \\t]+(?:links|rechts|beidseits|beidseitig)${BR})*`, "i");
var SUBJECT_LAB_RE = /^(?:hba1c|blutzucker|zucker|cholesterin|hämoglobin|quick|inr|blutbild|laborwert|leberwert|thrombozyt|elektrolyt|kreatinin)/i;
var VALUE_REQUIRED_STEMS = /^(?:hba1c|blutzucker|zucker|cholesterin|hämoglobin|quick|inr)/i;
var SUBJECT_CUE_RE = new RegExp(
  "(?<![\\p{L}])(?:patient(?:in|en|innen)?|pat\\.|klient(?:in|en)?|mandant(?:in|en)?|versicherte[nrms]?|antragsteller(?:in)?|antragst\\.|mitarbeiter(?:in|innen)?|besch\xE4ftigte[nrs]?|arbeitnehmer(?:in)?|bewerber(?:in)?|kunde[n]?|kundin|sch\xFCler(?:in)?|bewohner(?:in)?|kl\xE4ger(?:in)?|beklagte[nr]?|betroffene[nr]?|proband(?:in)?|sohn|tochter|kind(?:es|er)?|mutter|vater|eltern|ehefrau|ehemann|ehegatt(?:e|in)|partner(?:in)?|papa|mama|oma|opa|bruder|schwester|gro\xDFmutter|gro\xDFvater|enkel(?:in)?|lebensgef\xE4hrt(?:e|in)|angeh\xF6rige[nr]?|ich|mir|mich|mein(?:e|en|em|er|es)?|seine[mnrs]?|ihre[mnrs]?|(?:er|sie)[ \\t]+(?:hat|ist|wird|wurde|war|hatte|leidet|nimmt|bekommt|berichtet|klagt|erh\xE4lt|musste|kann|muss|soll|will|geht|braucht|ben\xF6tigt|tr\xE4gt|macht)|client|employee|applicant|claimant|my|me|he|she|his|mother|father|son|daughter|wife|husband|child|resident|pacjent\\p{L}*|hasta(?:n\u0131n|nin|s\u0131)?)(?![\\p{L}])",
  "iu"
);
var SUBJECT_PRONOUN_RE = /(?<![\p{L}])(?:er|sie|Er)(?![\p{L}])/u;
var SUBJECT_HONORIFIC_RE = new RegExp("(?<![\\p{L}])(?:Herr|Frau|Hr\\.|Fr\\.)[ \\t]+(?:(?:Dr|Prof)\\.[ \\t]+)*\\p{Lu}", "u");
var SUBJECT_EN_I_RE = /(?<![\p{L}\d])I(?:['’](?:m|ve|d|ll))?(?=[ \t,])/u;
var SUBJECT_ABBREV = new Set("dr prof pat nr hr fr ca bzw ggf vgl geb st abs tel std evtl inkl usw etc resp mio mrd str az kl jan feb m\xE4r apr jun jul aug sep okt nov dez z b u a d h o \xE4 dipl med phil rer nat antragst fa hrn frl".split(" "));
var SUBJECT_STOP_RE = /[.!?]["')\]]?(?=[ \t]+[\p{Lu}„"(\d–-]|[ \t]*\n)|\n[ \t]*\n/gu;
function subjectStops(text, from, to) {
  const out = [];
  for (const m of text.slice(from, Math.min(text.length, to + 4)).matchAll(SUBJECT_STOP_RE)) {
    const at = from + m.index;
    if (at >= to) break;
    if (m[0][0] === ".") {
      const head = text.slice(Math.max(0, at - 8), at);
      const w = new RegExp("(?:^|[^\\p{L}])(\\p{L}{1,7})$", "u").exec(head);
      if (w && SUBJECT_ABBREV.has(w[1].toLowerCase())) continue;
      if (new RegExp("\\p{L}\\.\\p{L}$", "u").test(head) || /\d{1,2}\.\d{1,2}$/.test(head) || /(?:^|[^\p{L}\d])\d{1,2}$/.test(head)) continue;
    }
    out.push({ at, end: at + m[0].length, nl: m[0][0] === "\n" });
  }
  return out;
}
function subjectWindow(text, start, end) {
  const lineFrom = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  let lineTo = text.indexOf("\n", end);
  if (lineTo === -1) lineTo = text.length;
  const line = text.slice(lineFrom, lineTo).trim();
  const cell = line.length <= 60 && !/[.!?:]$/.test(line);
  const lo = Math.max(0, start - 480);
  let from = lo;
  const back = subjectStops(text, lo, start);
  from = back.length ? cell ? back[back.length - 1].end : back.length > 1 ? back[back.length - 2].end : lo : lo;
  let to = cell ? lineTo : Math.min(text.length, end + 360);
  let ownTo = to;
  if (!cell) {
    const fwd = subjectStops(text, end, to);
    ownTo = fwd.length ? fwd[0].nl ? fwd[0].at : fwd[0].at + 1 : to;
    const st = fwd.length > 1 ? fwd[1] : fwd[0];
    if (st) to = st.nl ? st.at : st.at + 1;
  }
  return { from, to, cell, own: back.length ? back[back.length - 1].end : lo, ownTo };
}
var SCREENING_RESULT_AFTER_RE = /^[ \t]+(?:positiv|negativ|auffällig|unauffällig|pathologisch|erhöht|grenzwertig)(?![\p{L}])/iu;
function subjectTermCandidates(text) {
  const out = [];
  for (const m of finditer(HEALTH_SUBJECT_TERM_RE, text)) {
    let a = m.index, b = a + m[0].length;
    if (/(?:ologie|ologe|ologin|iatrie|iater|iaterin|kunde)$/i.test(m[0])) continue;
    if (HEALTH_NON_CONDITION_RE.test(m[0]) || /^(?:psychologische[rn]?[ \t]+)?psychotherapeut/i.test(m[0])) continue;
    if (VALUE_REQUIRED_STEMS.test(m[0]) && !/^[^\n\d]{0,14}\d/.test(text.slice(b, b + 20))) continue;
    if (/(?:zentrum|praxis|station|klinik|ambulanz|abteilung|beratung|beratungsstelle|schulung|berater|beraterin|gruppe|verband|stiftung|selbsthilfe|kasse|sprechstunde|ernährung|diät|screening|konferenz|dokumentation|register|board|protokoll|leitlinie|studie|statistik|vorsorge|besprechung|kolloquium|kampagne|unit|clinic|consult|richtlinie|verordnung|gesetz|gebührenordnung|vertrag|anbieter|angebot|team|praxen)$/i.test(m[0]) && !(/screening$/i.test(m[0]) && SCREENING_RESULT_AFTER_RE.test(text.slice(b, b + 24)))) continue;
    if (m[0].length > 5 && m[0] === m[0].toUpperCase() && !new RegExp("\\p{Ll}", "u").test(lineAround(text, a))) continue;
    if (/^[ \t]*[:|\t]/.test(text.slice(b, b + 4)) && !new RegExp("^[ \\t]*:[ \\t]*\\p{L}{3}", "u").test(text.slice(b, b + 60))) continue;
    if (/^\s*\((?:§|Art\.)/.test(text.slice(b, b + 10)) || /\((?:§|Art\.)/.test(m[0])) continue;
    if (SUBJECT_LAB_RE.test(m[0]) && (/\d[\d.,]*[ \t]*(?:%|[\p{L}/µ]+)?[ \t]*[-–<>][ \t]*[\d.,]*\d/u.test(text.slice(b, b + 40)) || /referenz/i.test(text.slice(Math.max(0, a - 160), b + 60)))) continue;
    const { from, to, cell, own, ownTo } = subjectWindow(text, a, b);
    if (new RegExp("(?:^|[\\s(,;:])(?:bei|wenn|falls|sollte|im Fall|im Falle)[ \\t]+(?:\\p{L}+[ \\t]+){0,2}$", "iu").test(text.slice(Math.max(own, a - 40), a)) && /^[^.!?]{0,90}(?:umgehend|sofort|unverzüglich|Notruf|Notaufnahme|melden|vorstellen|kontaktieren|anrufen|aufsuchen|112)/iu.test(text.slice(b, b + 120))) continue;
    const provider = healthProviderMention(text, a, b);
    a = extendOverHealthQualifier(text, a);
    if (/^pflegegrad/i.test(m[0])) {
      const n = /^[ \t]+\d(?![\d.,/:])/.exec(text.slice(b, b + 6));
      if (n) b += n[0].length;
    }
    out.push({ start: a, end: b, text: text.slice(a, b), from, to, own, ownTo, cell, provider });
  }
  return out;
}
var SUBJECT_HYPOTHETICAL_RE = /(?<![\p{L}])(?:im Krankheitsfall|im Fall|im Falle|if|in case|in the event|shall|must|verpflichtet)(?![\p{L}])/iu;
function subjectCueIn(text, from, to, persons, a, b, own = from, ownTo = to) {
  if (SUBJECT_HYPOTHETICAL_RE.test(text.slice(own, a))) return false;
  const win = text.slice(from, to);
  if (SUBJECT_CUE_RE.test(win) || SUBJECT_HONORIFIC_RE.test(win) || SUBJECT_EN_I_RE.test(win) || SUBJECT_PRONOUN_RE.test(win)) return true;
  const [pf, pt] = [own, ownTo];
  return persons.some((p) => p.start >= pf && p.end <= pt && !(p.start >= a && p.end <= b));
}
function subjectBoundHealthSpans(text, persons) {
  const out = [];
  for (const c of subjectTermCandidates(text)) {
    if (c.provider) continue;
    if (!subjectCueIn(text, c.from, c.to, persons, c.start, c.end, c.own, c.ownTo)) continue;
    out.push({ start: c.start, end: c.end, text: c.text });
  }
  return out;
}
function regexSpans(text, extraCustomerPatterns = []) {
  const spans = [];
  for (const m of finditer(IBAN_RE, text)) {
    if (/^(\d)\1+$/.test(m[0].replace(/[^0-9]/g, ""))) continue;
    const score = ibanIsValid(m[0]) ? 0.99 : 0.7;
    add(spans, m.index, m.index + m[0].length, m[0], "IBAN", score);
  }
  for (const m of finditer(IBAN_HYPHEN_RE, text)) {
    const compact = m[0].replace(/-/g, "");
    if (!IBAN_LENGTH[compact.slice(0, 2)]) continue;
    if (ibanIsValid(compact) || hasContext(text, m.index, ["iban", "konto"])) add(spans, m.index, m.index + m[0].length, m[0], "IBAN", ibanIsValid(compact) ? 0.95 : 0.75);
  }
  const ibanStarts = spans.map((s) => s.start);
  const ibanAtOrBefore = (at) => {
    let lo = 0, hi = ibanStarts.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (ibanStarts[mid] <= at) lo = mid + 1;
      else hi = mid;
    }
    return lo - 1;
  };
  for (const m of finditer(BIC_RE, text)) {
    const cand = m[0];
    if (!bicIsValid(cand)) continue;
    const iAt = ibanAtOrBefore(m.index);
    if (iAt >= 0 && m.index < spans[iAt].end) continue;
    if (isCommonWord(cand)) continue;
    const ctx = hasContext(text, m.index, CTX.BIC);
    const nearIban = iAt >= 0 && m.index - spans[iAt].end <= CTX_WINDOW;
    if (!(ctx || nearIban)) continue;
    if (!ctx && cand.slice(4, 6).toUpperCase() !== spans[iAt].text.replace(/\s+/g, "").slice(0, 2).toUpperCase()) continue;
    add(spans, m.index, m.index + cand.length, cand, "BIC", 0.9);
  }
  for (const m of finditer(TAX_ID_WRAPPED_RE, text)) {
    if (!m[0].includes("\n")) continue;
    if (!hasAnyContext(text, m.index, CTX.TAX_ID)) {
      if (/^\d\d \d{3} \d{3}[ \t]*\r?\n[ \t]*\d{3}$/.test(m[0]) && !hasAnyContext(text, m.index, CTX.NOT_TAX_ID)) add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", 0.6);
      continue;
    }
    add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", 0.9);
  }
  for (const m of finditer(NINO_SPACED_RE, text)) {
    if (/^(?:BG|GB|NK|KN|TN|NT|ZZ)/.test(m[0])) continue;
    if (spans.some((sp) => sp.start < m.index + m[0].length && sp.end > m.index)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", 0.85);
  }
  for (const m of finditer(TAX_ID_RE, text)) {
    const valid = taxIdIsValid(m[0]);
    const ctx = hasAnyContext(text, m.index, CTX.TAX_ID);
    if (valid) add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", ctx ? 0.97 : 0.85);
    else if (ctx) add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", 0.6);
    else if (/^[1-9]\d [\d]{3} \d{3} \d{3}$/.test(m[0]) && !hasAnyContext(text, m.index, CTX.NOT_TAX_ID)) {
      add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", 0.6);
    }
  }
  for (const m of finditer(TAX_ID_SHORT_RE, text)) {
    if (spans.some((x) => x.start < m.index + m[0].length && x.end > m.index)) continue;
    if (hasAnyContext(text, m.index, CTX.TAX_ID)) add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", 0.6);
  }
  for (const m of finditer(UTR_RE, text)) {
    if (spans.some((x) => x.start < m.index + m[0].length && x.end > m.index)) continue;
    if (hasAnyContext(text, m.index, CTX.UTR)) add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", 0.9);
  }
  for (const m of finditer(STEUERNUMMER_RE, text)) {
    const valid = steuernummerIsValid(m[0]);
    const ctx = hasAnyContext(text, m.index, CTX.STEUERNUMMER);
    if (valid || ctx) add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", valid ? 0.9 : 0.6);
    else if (/^\d{2,3}\/\d{3}\/\d{4,5}$/.test(m[0]) && !hasAnyContext(text, m.index, CTX.NOT_TAX_ID) && !/[\/\d]$/.test(text.slice(Math.max(0, m.index - 1), m.index)) && !/^\//.test(text.slice(m.index + m[0].length, m.index + m[0].length + 1))) {
      add(spans, m.index, m.index + m[0].length, m[0], "TAX_ID", 0.6);
    }
  }
  for (const m of finditer(VAT_RE, text)) {
    if (hasAnyContext(text, m.index, CTX.VAT)) {
      add(spans, m.index, m.index + m[0].length, m[0], "VAT_ID", vatIsValid(m[0]) ? 0.95 : 0.6);
    }
  }
  for (const m of finditer(EU_VAT_SPACED_RE, text)) {
    if (!EU_VAT_COUNTRIES.has(m[1])) continue;
    const nd = m[2].replace(/ /g, "").length;
    if (nd < 8 || nd > 12 || !hasContext(text, m.index, CTX.VAT)) continue;
    if (spans.some((sp) => sp.start < m.index + m[0].length && sp.end > m.index)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "VAT_ID", 0.85);
  }
  for (const m of finditer(VAT_WRAPPED_RE, text)) {
    if (m[0].includes("\n") && hasContext(text, m.index, CTX.VAT)) add(spans, m.index, m.index + m[0].length, m[0], "VAT_ID", 0.85);
  }
  for (const m of finditer(EU_VAT_WRAPPED_RE, text)) {
    if (!m[0].includes("\n") || !EU_VAT_COUNTRIES.has(m[1])) continue;
    const nd = m[2].replace(/\D/g, "").length;
    if (nd < 8 || nd > 12 || !hasContext(text, m.index, CTX.VAT)) continue;
    if (spans.some((sp) => sp.start < m.index + m[0].length && sp.end > m.index)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "VAT_ID", 0.85);
  }
  for (const m of finditer(EU_VAT_RE, text)) {
    if (!EU_VAT_COUNTRIES.has(m[1])) continue;
    if (hasContext(text, m.index, CTX.VAT)) {
      add(spans, m.index, m.index + m[0].length, m[0], "VAT_ID", 0.85);
    }
  }
  for (const m of finditer(CREDIT_CARD_RE, text)) {
    if (/^(\d)\1+$/.test(m[0].replace(/[^0-9]/g, ""))) continue;
    if (luhnIsValid(m[0])) {
      const cardLabelled = hasContext(text, m.index, CTX.CREDIT_CARD);
      const notCardLabelled = !cardLabelled && hasContext(text, m.index, CTX.NOT_CARD);
      add(spans, m.index, m.index + m[0].length, m[0], "CREDIT_CARD", 0.9);
      if (notCardLabelled) spans[spans.length - 1].forceReview = true;
      continue;
    }
    if (hasContext(text, m.index, CTX.CREDIT_CARD)) {
      add(spans, m.index, m.index + m[0].length, m[0], "CREDIT_CARD", 0.7);
    }
  }
  for (const m of finditer(MASKED_CARD_RE, text)) {
    add(spans, m.index, m.index + m[0].length, m[0], "CREDIT_CARD", 0.85);
  }
  for (const m of finditer(REG_RE, text)) {
    if (/^HRB/i.test(m[0])) continue;
    if (/^HRA/i.test(m[0])) {
      const ls = text.lastIndexOf("\n", Math.max(0, m.index - 1)) + 1, le0 = text.indexOf("\n", m.index);
      const line = text.slice(ls, le0 === -1 ? text.length : le0).replace(REGISTER_COURT_RE, (c) => " ".repeat(c.length));
      if (LEGAL_FORM_RE.test(line) && !SOLE_TRADER_MARK_RE.test(line)) continue;
    }
    add(spans, m.index, m.index + m[0].length, m[0], "REG_ID", 0.9);
  }
  for (const m of finditer(VIN_RE, text)) {
    if (!/[A-Z]/.test(m[0]) || (m[0].match(/\d/g) || []).length < 3) continue;
    if (hasAnyContext(text, m.index, CTX.VIN)) add(spans, m.index, m.index + m[0].length, m[0], "REG_ID", 0.85);
  }
  for (const m of finditer(SV_RE, text)) {
    if (hasAnyContext(text, m.index, CTX.SV)) add(spans, m.index, m.index + m[0].length, m[0], "SV_ID", 0.9);
    else if (hasAnyContext(text, m.index, CTX.HEALTH_INS)) add(spans, m.index, m.index + m[0].length, m[0], "HEALTH_INSURANCE", 0.85);
  }
  for (const m of finditer(SSN_US_RE, text)) {
    if (hasContext(text, m.index, CTX.SV)) add(spans, m.index, m.index + m[0].length, m[0], "SV_ID", 0.9);
  }
  for (const m of finditer(NINO_RE, text)) {
    if (hasAnyContext(text, m.index, CTX.SV)) add(spans, m.index, m.index + m[0].length, m[0], "SV_ID", 0.9);
  }
  for (const m of finditer(PERSONNUMMER_RE, text)) {
    if (hasContext(text, m.index, CTX.SV)) add(spans, m.index, m.index + m[0].length, m[0], "SV_ID", 0.9);
  }
  for (const m of finditer(AHV_CH_RE, text)) {
    add(spans, m.index, m.index + m[0].length, m[0], "SV_ID", 0.95);
  }
  for (const m of finditer(SV_AT_RE, text)) {
    if (hasContext(text, m.index, CTX.SV)) add(spans, m.index, m.index + m[0].length, m[0], "SV_ID", 0.85);
  }
  for (const m of finditer(BLZ_RE, text)) {
    if (hasContext(text, m.index, CTX.BLZ)) add(spans, m.index, m.index + m[0].length, m[0], "ACCOUNT", 0.85);
  }
  for (const m of finditer(ACCOUNT_RE, text)) {
    if (/[0-9A-Za-z]-$/.test(text.slice(Math.max(0, m.index - 2), m.index))) continue;
    if (/^-[0-9A-Za-z]/.test(text.slice(m.index + m[0].length))) continue;
    if (hasContext(text, m.index, CTX.ACCOUNT)) add(spans, m.index, m.index + m[0].length, m[0], "ACCOUNT", 0.8);
  }
  for (const m of finditer(CREDENTIAL_RE, text)) {
    const value = m[1];
    if (!/\d/.test(value)) continue;
    codeBlockFrom(text, m.index + m[0].length, spans);
    const start = m.index + m[0].lastIndexOf(value);
    add(spans, start, start + value.length, value, "CREDENTIAL", 0.9);
  }
  for (const m of finditer(ACCESS_CODE_RE, text)) {
    const value = m[1];
    const start = m.index + m[0].length - value.length;
    if (spans.some((sp) => sp.start < start + value.length && sp.end > start)) continue;
    add(spans, start, start + value.length, value, "CREDENTIAL", 0.85);
  }
  for (const m of finditer(SECRET_PREFIXED_RE, text)) {
    const segs = m[1].toLowerCase().split("_").filter(Boolean);
    const tail = m[2];
    if (!segs.some((x) => SECRET_PREFIXES.has(x))) continue;
    if (!/\d/.test(tail) || !/[A-Za-z]/.test(tail)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "CREDENTIAL", 0.9);
  }
  for (const re of [JWT_RE, AWS_KEY_RE, SLACK_TOKEN_RE]) {
    for (const m of finditer(re, text)) add(spans, m.index, m.index + m[0].length, m[0], "CREDENTIAL", 0.9);
  }
  for (const m of finditer(BEARER_RE, text)) {
    if (!/\d/.test(m[1])) continue;
    const start = m.index + m[0].length - m[1].length;
    add(spans, start, start + m[1].length, m[1], "CREDENTIAL", 0.9);
  }
  const custStart = spans.length;
  for (const m of finditer(CUSTOMER_RE, text)) {
    if (!/\d/.test(m[0])) continue;
    {
      const d = /^(\d{1,2})[.\-/](\d{1,2})[.\-/]\d{4}$/.exec(m[0]);
      if (d && +d[1] <= 31 && +d[2] <= 12) continue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(m[0])) continue;
    if (/^\d{1,3}(?:[.,]\d{3})*[.,]\d{2}$/.test(m[0])) continue;
    if (/^\d{1,3}(?:[.,]\d{3})+$/.test(m[0])) continue;
    if (!/\d.*\d/.test(m[0]) && !/[A-ZÄÖǛ-ͯ]/.test(m[0]) && !/[-_/.]/.test(m[0])) continue;
    if (hasContext(text, m.index, CTX.CUSTOMER_ID)) {
      add(spans, m.index, m.index + m[0].length, m[0], "CUSTOMER_ID", 0.8);
    } else if (hasContext(text, m.index, CTX.CASE_FILE_REF)) {
      const before = spans.length;
      add(spans, m.index, m.index + m[0].length, m[0], "CUSTOMER_ID", 0.55);
      if (spans.length > before) {
        spans[spans.length - 1].forceReview = true;
        spans[spans.length - 1].recordRef = true;
        spans[spans.length - 1].caseFileRef = true;
      }
    } else if (hasContext(text, m.index, CTX.RECORD_REF)) {
      const before = spans.length;
      add(spans, m.index, m.index + m[0].length, m[0], "CUSTOMER_ID", 0.55);
      if (spans.length > before) {
        spans[spans.length - 1].forceReview = true;
        spans[spans.length - 1].recordRef = true;
      }
    }
  }
  extendLabelledList(text, spans, custStart);
  for (const m of finditer(RECORD_NR_RE, text)) {
    const tok = m.groups.tok;
    const start = m.index + m[0].length - tok.length;
    if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(tok) || /^(?:19|20)\d{2}[-/](?:19|20)\d{2}$/.test(tok)) continue;
    if (UNIT_AFTER_NUMBER_RE.test(text.slice(start + tok.length, start + tok.length + 24))) continue;
    if (!/\d/.test(tok) || (tok.match(/\d/g) || []).length < (/[A-Za-z]/.test(tok) ? 2 : 5)) continue;
    if (spans.some((sp) => sp.start < start + tok.length && sp.end > start)) continue;
    add(spans, start, start + tok.length, tok, "CUSTOMER_ID", 0.8);
  }
  const RN_UC = (n) => n.replace(/^./u, (c) => `[${c.toUpperCase()}${c}]`);
  const RECORD_NOUN_WORDS = [
    "rechnung",
    "darlehen",
    "vorgang",
    "vertrag",
    "auftrag",
    "fall",
    "angebot",
    "akte",
    "gutachten",
    "bescheid",
    "police",
    "schaden",
    "beleg",
    "buchung",
    "antrag",
    "bestellung",
    "sendung",
    "mandat",
    "mietvertrag",
    "kosten\xFCbernahme",
    "invoice",
    "order",
    "ticket",
    "case",
    "claim",
    "contract",
    "booking",
    "reference",
    "ref",
    "file",
    "incident",
    "request",
    "loan",
    "konto",
    "kundenkonto",
    "mieterkonto",
    "urkundenrolle",
    "gesch\xE4fts",
    "eingangs",
    "verfahren",
    "zeugnis",
    "register",
    "zeichen"
  ];
  const RECORD_NOUN_TOKEN = "[A-Z]{1,6}(?:[-/][A-Z0-9]{1,6}){0,2}[-/]\\d{2,10}(?:[-/][A-Z0-9]{1,8}){0,3}|\\d{2,6}[-/]\\d{2,8}(?:[-/][A-Z0-9]{1,8}){0,2}|[A-Z]{1,4}[ ]?\\d{4,10}[A-Z]?|\\d{2,4}[-/][A-Z]{1,6}[-/]\\d{2,8}|\\d{3,6}-[A-Z]{2,4}";
  const RECORD_NOUN_CODE_RE = rx(
    `${BL}(?:(?:PN|Rg|${RECORD_NOUN_WORDS.map(RN_UC).join("|")})(?:s|n|en)?\\.?[-]?(?:[ \\t]+\\d{1,3}(?=[ \\t]*:))?[ \\t]*(?:(?:[Nn]r|[Nn]ummer|[Nn]o|[Nn]umber|[Ii][Dd]|[Rr]ef)\\.?)?|[\\p{L}][\\p{L}-]+[ \\t]*(?:[Nn]r\\.|[Nn]o\\.|[Nn]ummer)|(?:ref|vertrag|order|invoice|case|ticket|mandate)=)[ \\t]*[:#]?[ \\t]*(?<tok>${RECORD_NOUN_TOKEN})${BR}`,
    "u"
  );
  const RECORD_LABEL_BOOKING = "buchungs-?(?:code|nr|nummer|referenz)|booking[ \\t]+(?:ref(?:erence)?|code|number|no)|pnr|reservierungs-?(?:code|nr|nummer)|reservierung|nummer[ \\t]+der[ \\t]+buchung|confirmation[ \\t]+(?:code|number)";
  const RECORD_LABEL_NUMERIC = "sendungs-?(?:nr|nummer)|paket-?(?:nr|nummer)|tracking[ \\t]*(?:-?nr|number|no)|matr(?:ikel)?\\.?[ \\t]*-?[ \\t]*(?:nr|nummer)|personnel[ \\t]+(?:number|no)|kassenzeichen|betreuungs-?(?:nr|nummer)|beitrags-?(?:nr|nummer)";
  const RECORD_LABEL_HEAD_RE = rx(
    `${BL}(?:(?<bk>${RECORD_LABEL_BOOKING})|(?<nu>${RECORD_LABEL_NUMERIC}))\\.?[ \\t]*(?:\\([A-Za-z ]{2,12}\\))?(?:(?:is|ist|lautet|war|was)[ \\t]+)?(?:(?:nr|no|number|code)\\.?)?[ \\t]*[:#]?[ \\t]*(?:\\r?\\n[ \\t]*)?`,
    "iu"
  );
  const RECORD_LABEL_TOKEN_RE = new RegExp(
    `(?<tok>(?=[A-Z0-9]{5,8}${BR})(?=[A-Z0-9]*\\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{5,8}|[A-Z]{1,4}[ ]?\\d{3,5}(?:[ ]\\d{2,5}){1,4}|${RECORD_NOUN_TOKEN}|\\d{1,5}(?:[ .]\\d{2,5}){1,5}|\\d{5,20})${BR}`,
    "uy"
  );
  const NOTARY_ROLL_CUE = "(?:UVZ|UR|[Uu]rkundenrolle|[Uu]rkundsrolle)(?:[ \\t-]*[Nn]r\\.?)?";
  const NOTARY_ROLL_TOKEN = "(?:\\d{1,5}/(?:19|20)\\d{2}|(?:19|20)\\d{2}/\\d{2,5}|(?:19|20)\\d{2}-\\d{2,5}|(?:19|20)\\d{2}[ \\t]+[Nn]r\\.?[ \\t]*\\d{1,5})(?:[ \\t][A-Z])?";
  const NOTARY_ROLL_RE = rx(`${BL}(?<full>(?:${NOTARY_ROLL_CUE}[ \\t:#-]*){1,2}${NOTARY_ROLL_TOKEN})${BR}`, "u");
  const RECORD_NOUN_ORG_LINE_RE = /(?<![\p{L}])(?:GmbH|mbH|AG|KG|UG|SE|e\.\s?K\.|Ltd\.?|Inc\.?|LLC|GbR|OHG|Firma|Co\.)(?![\p{L}])|\b(?:Volkshochschule|Stadtwerke|Versicherung|Sparkasse|Bank)\b/u;
  const RECORD_NOUN_NEGATIVE_RE = /(?<![\p{L}])(?:modell|model|artikel|article|produkt|product|typ|type|version|norm|iso|din|en|sku|zähler|zaehler|serien|seriennummer|chargen?|lot|bauteil|teile?|tarif|kennzeichen|haus|wohnung|zimmer|raum|flur|flurstück|blatt|seite|page|schul|steuer|iban|konto-?nr|tel|fax|mobil|handy|telefon|rufnummer|durchwahl|ihk|plz|ur|uvz|urkundenrolle|urkundsrolle|urkunden|energieausweis|protokoll|messprotokoll|beleg|tagebuch)[ \t.:#-]*$/iu;
  for (const m of finditer(rx(`${BL}PN[ \\t]+(?<num>\\d{4,8})${BR}`), text)) {
    const start = m.index + m[0].length - m.groups.num.length;
    if (spans.some((sp) => sp.start < start + m.groups.num.length && sp.end > start)) continue;
    add(spans, start, start + m.groups.num.length, m.groups.num, "CUSTOMER_ID", 0.8);
  }
  for (const m of finditer(NOTARY_ROLL_RE, text)) {
    const full = m.groups.full;
    const start = m.index + m[0].length - full.length;
    if (spans.some((sp) => sp.category === "REG_ID" && sp.start <= start && sp.end >= start + full.length)) continue;
    add(spans, start, start + full.length, full, "REG_ID", 0.85);
  }
  for (const m of finditer(RECORD_NOUN_CODE_RE, text)) {
    const tok = m.groups.tok;
    const start = m.index + m[0].length - tok.length;
    const head = text.slice(Math.max(0, m.index - 24), start);
    const lead = text.slice(m.index, start).replace(/(?:nr|nummer|no)\.?[ \t:#]*$/i, "");
    if (RECORD_NOUN_NEGATIVE_RE.test(lead) || RECORD_NOUN_NEGATIVE_RE.test(head.replace(/(?:nr|nummer|no)\.?[ \t:#]*$/i, ""))) continue;
    if (/^(?:0?[1-9]|1[0-2])[/.-](?:19|20)\d{2}$/.test(tok) || /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(tok) || /^(?:19|20)\d{2}[-/](?:19|20)\d{2}$/.test(tok)) continue;
    if (UNIT_AFTER_NUMBER_RE.test(text.slice(start + tok.length, start + tok.length + 24))) continue;
    if ((tok.match(/\d/g) || []).length < 3) continue;
    if (RECORD_NOUN_ORG_LINE_RE.test(lineAround(text, m.index))) continue;
    if (spans.some((sp) => sp.start < start + tok.length && sp.end > start)) continue;
    const before = spans.length;
    add(spans, start, start + tok.length, tok, "REG_ID", 0.6);
    if (spans.length > before) {
      spans[spans.length - 1].forceReview = true;
      spans[spans.length - 1].recordRef = true;
    }
  }
  for (const h of finditer(RECORD_LABEL_HEAD_RE, text)) {
    RECORD_LABEL_TOKEN_RE.lastIndex = h.index + h[0].length;
    const m = RECORD_LABEL_TOKEN_RE.exec(text);
    if (!m) continue;
    m.groups.bk = h.groups.bk;
    m.groups.nu = h.groups.nu;
    m.index = h.index;
    m[0] = text.slice(h.index, h.index + h[0].length + m[0].length);
    const tok = m.groups.tok;
    const start = m.index + m[0].length - tok.length;
    const bookingShape = /^[A-Z0-9]{5,8}$/.test(tok) && /\d/.test(tok) && /[A-Z]/.test(tok);
    if (m.groups.bk && !bookingShape && !/\d.*\d/.test(tok)) continue;
    if (m.groups.nu && /[a-z]/.test(tok)) continue;
    if (!bookingShape && (tok.match(/\d/g) || []).length < 4) continue;
    if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(tok) || /^(?:19|20)\d{2}[-/](?:19|20)\d{2}$/.test(tok)) continue;
    if (UNIT_AFTER_NUMBER_RE.test(text.slice(start + tok.length, start + tok.length + 24))) continue;
    if (RECORD_NOUN_ORG_LINE_RE.test(lineAround(text, m.index))) continue;
    if (spans.some((sp) => sp.start < start + tok.length && sp.end > start)) continue;
    const before = spans.length;
    add(spans, start, start + tok.length, tok, "REG_ID", 0.6);
    if (spans.length > before) {
      spans[spans.length - 1].forceReview = true;
      spans[spans.length - 1].recordRef = true;
    }
  }
  for (const m of finditer(GROUPED_ID_RE, text)) {
    const digits = (m[0].match(/\d/g) || []).length;
    if (digits < 8 || digits > 14) continue;
    if (!hasContext(text, m.index, CTX.CUSTOMER_ID) || /betriebs/i.test(text.slice(Math.max(0, m.index - 25), m.index))) continue;
    if (spans.some((sp) => sp.start < m.index + m[0].length && sp.end > m.index)) continue;
    if (/^\d{1,2} \d{1,2} \d{2,4}$/.test(m[0])) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "CUSTOMER_ID", 0.75);
  }
  for (const m of finditer(PERSON_RECORD_SHORT_RE, text)) {
    const num = m.groups.num;
    const start = m.index + m[0].length - num.length;
    if (UNIT_AFTER_NUMBER_RE.test(text.slice(start + num.length, start + num.length + 24))) continue;
    if (spans.some((sp) => sp.category === "CUSTOMER_ID" && sp.start <= start && sp.end >= start + num.length)) continue;
    add(spans, start, start + num.length, num, "CUSTOMER_ID", 0.8);
  }
  for (const m of finditer(COURT_FILE_RE, text)) {
    const line = lineAround(text, m.index);
    const labelled = hasContext(text, m.index, CTX.COURT_FILE) || INSTITUTION_HEAD_RE.test(line);
    if (!labelled) continue;
    if (spans.some((s) => s.start === m.index && s.end === m.index + m[0].length)) continue;
    const before = spans.length;
    add(spans, m.index, m.index + m[0].length, m[0], "REG_ID", 0.85);
    if (spans.length > before) {
      spans[spans.length - 1].recordRef = true;
      spans[spans.length - 1].caseFileRef = true;
      spans[spans.length - 1].forceReview = true;
    }
  }
  for (const m of finditer(CASE_BARE_RE, text)) {
    const token = m[1];
    if (!isSignificantCaseToken(token)) continue;
    const start = m.index + m[0].length - token.length;
    if (spans.some((s) => s.start === start && s.end === start + token.length)) continue;
    const before = spans.length;
    add(spans, start, start + token.length, token, "REG_ID", 0.8);
    if (spans.length > before) {
      spans[spans.length - 1].recordRef = true;
      spans[spans.length - 1].caseFileRef = true;
      spans[spans.length - 1].forceReview = true;
    }
  }
  for (const m of finditer(USER_HANDLE_RE, text)) {
    const handle = m[1];
    const start = m.index + m[0].length - handle.length;
    add(spans, start, start + handle.length, handle, "CUSTOMER_ID", 0.9);
  }
  for (const m of finditer(HANDLE_CUE_RE, text)) {
    const h = m[1];
    if (/[._-]$/.test(h) || SYSTEM_HANDLE_RE.test(h) || SERVICE_ACCOUNT_RE.test(h) || GENERIC_ACCOUNTS.has(h) || isCommonWord(h)) continue;
    if (new RegExp("^\\p{Lu}", "u").test(h) && !/[._]/.test(h)) continue;
    if (!handleReadsAsName(h, text)) continue;
    const start = m.index + m[0].length - h.length;
    add(spans, start, start + h.length, h, "ONLINE_ID", 0.8);
  }
  for (const m of finditer(LOG_HANDLE_RE, text)) {
    const h = m.groups.h;
    if (SYSTEM_HANDLE_RE.test(h) || /^\d/.test(h)) continue;
    const start = m.index + m[0].length - h.length;
    add(spans, start, start + h.length, h, "ONLINE_ID", 0.8);
  }
  for (const m of finditer(CUSTOMER_PREFIX_RE, text)) {
    add(spans, m.index, m.index + m[0].length, m[0], "CUSTOMER_ID", 0.9);
  }
  for (const pat of extraCustomerPatterns) {
    try {
      const re = new RegExp(pat, "g");
      for (const m of finditer(re, text)) add(spans, m.index, m.index + m[0].length, m[0], "CUSTOMER_ID", 0.9);
    } catch (e) {
      continue;
    }
  }
  for (const m of finditer(PLAIN_PHONE_RE, text)) {
    const num = m.groups.num;
    if (!(/^0\d{9,10}$/.test(num) || /^[2-9]\d{2}[2-9]\d{6}$/.test(num))) continue;
    const start = m.index + m[0].length - num.length;
    if (spans.some((sp) => sp.start < start + num.length && sp.end > start)) continue;
    add(spans, start, start + num.length, num, "PHONE", 0.8);
  }
  for (let m of finditer(PHONE_RE, text)) {
    if (hasStandardsPrefixBefore(text, m.index)) continue;
    if (/\d[.,]$/.test(text.slice(Math.max(0, m.index - 2), m.index))) continue;
    if (isReferenceNotPhone(text, m.index, m[0])) continue;
    const amountTail = /[^\S\r\n]+\d+$/.exec(m[0]);
    if (amountTail && /^,\d{2}(?!\d)/.test(text.slice(m.index + m[0].length, m.index + m[0].length + 4))) {
      m = Object.assign([m[0].slice(0, m[0].length - amountTail[0].length)], { index: m.index });
    }
    const digits = (m[0].match(/\d/g) || []).length;
    if (digits >= 7 && digits <= 15) add(spans, m.index, m.index + m[0].length, m[0], "PHONE", 0.75);
    else if (digits > 15) {
      let offset = 0;
      for (const piece of m[0].split(/([^\S\r\n]+[/,;·|][^\S\r\n]+|[^\S\r\n]{3,}|[^\S\r\n]+(?=0\d{2,4}[^\S\r\n]\d))/)) {
        const pieceDigits = (piece.match(/\d/g) || []).length;
        if (pieceDigits >= 7 && pieceDigits <= 15 && /^(?:\+|0)/.test(piece.trim())) {
          const lead = piece.length - piece.trimStart().length;
          add(spans, m.index + offset + lead, m.index + offset + piece.trimEnd().length, piece.trim(), "PHONE", 0.75);
        }
        offset += piece.length;
      }
    }
  }
  for (const m of finditer(PHONE_WRAP_RE, text)) {
    const lineStart = text.lastIndexOf("\n", m.index - 1) + 1;
    if (!PHONE_WRAP_LABEL_RE.test(text.slice(lineStart, m.index))) continue;
    if (hasStandardsPrefixBefore(text, m.index)) continue;
    const digits = (m[0].match(/\d/g) || []).length;
    const firstLine = m[0].split(/\r?\n/)[0];
    if (digits >= 8 && digits <= 15 && (firstLine.match(/\d/g) || []).length >= 4) {
      add(spans, m.index, m.index + m[0].length, m[0], "PHONE", 0.75);
    }
  }
  for (const m of finditer(NANP_PHONE_RE, text)) {
    add(spans, m.index, m.index + m[0].length, m[0], "PHONE", 0.75);
  }
  for (const m of finditer(OBFUSCATED_PHONE_RE, text)) {
    const phone = m[1];
    const start = m.index + m[0].length - phone.length;
    add(spans, start, start + phone.length, phone, "PHONE", 0.85);
  }
  for (const m of finditer(DOB_LIST_CUE_RE, text)) {
    for (const d of finditer(DOB_ANY_RE, m[0])) {
      const at = m.index + d.index;
      add(spans, at, at + d[0].length, d[0], "DOB", 0.85);
    }
  }
  for (const m of finditer(DOB_YEAR_ONLY_RE, text)) {
    add(spans, m.index + m[0].length - m[1].length, m.index + m[0].length, m[1], "DOB", 0.75);
  }
  for (const re of [DOB_RE, DOB_STAR_RE, DOB_BEFORE_CUE_RE, DOB_NOUN_RE]) {
    for (const m of finditer(re, text)) {
      const g1 = m[1];
      const start = m.index + m[0].indexOf(g1);
      add(spans, start, start + g1.length, g1, "DOB", 0.9);
    }
  }
  for (const m of finditer(DOB_YEAR_AFTER_CUE_RE, text)) {
    const before = spans.length;
    add(spans, m.index + m[0].length - m[1].length, m.index + m[0].length, m[1], "DOB", 0.75);
    if (spans.length > before) spans[spans.length - 1].birthCue = true;
  }
  for (const m of finditer(DOB_JSON_FIELD_RE, text)) {
    add(spans, m.index + m[0].length - 1 - m[1].length, m.index + m[0].length - 1, m[1], "DOB", 0.85);
  }
  for (const m of finditer(DOB_BIRTHDAY_LINE_RE, text)) {
    for (const d of finditer(DOB_ANY_RE, m[0])) add(spans, m.index + d.index, m.index + d.index + d[0].length, d[0], "DOB", 0.8);
  }
  bareDateOfBirthLines(text, spans);
  dobLabelAboveLines(text, spans);
  inlineNameDateOfBirth(text, spans);
  for (const sp of spans.filter((x) => x.category === "DOB" && /\d{2}\D\d{2}\D\d{4}|\d{4}-\d{2}-\d{2}/.test(x.text))) {
    let end = sp.end;
    for (let n = 0; n < 3; n++) {
      const m = DOB_NEXT_DATE_RE.exec(text.slice(end, end + 40));
      if (!m) break;
      const at = end + m[0].length - m[1].length;
      add(spans, at, at + m[1].length, m[1], "DOB", 0.8);
      end = at + m[1].length;
    }
  }
  for (const m of finditer(ACCOUNT_METADATA_DATE_RE, text)) {
    const g1 = m[1];
    const start = m.index + m[0].length - g1.length;
    add(spans, start, start + g1.length, g1, "ACCOUNT_METADATA", 0.9);
  }
  for (const re of [SALUTATION_RE, LABEL_NAME_CAPS_RE]) {
    for (const m of finditer(re, text)) {
      const name = m[1];
      const nameStart = m.index + m[0].lastIndexOf(name);
      const nameEnd = nameStart + name.length;
      if (nameOk(name) && !isCompanyName(name, text, nameEnd)) {
        add(spans, nameStart, nameEnd, name, "PERSON", 0.8);
      }
    }
  }
  for (const m of finditer(LABEL_NAME_RE, text)) {
    const name = m[2];
    const sawColon = m[1].includes(":");
    if (!sawColon && !name.split(/\s+/).some((t) => looksLikeGivenName(t))) continue;
    const nameStart = m.index + m[0].lastIndexOf(name);
    const nameEnd = nameStart + name.length;
    if (nameOk(name) && !isCompanyName(name, text, nameEnd)) {
      add(spans, nameStart, nameEnd, name, "PERSON", 0.8);
    }
  }
  for (const m of finditer(GAZETTEER_NAME_RE, text)) {
    if (!looksLikeGivenName(m[1])) continue;
    if (/(?:^|[^\p{L}])(?:St\.|Sankt|Saint|San|Santa|Ste\.)[ \t]?$/u.test(text.slice(Math.max(0, m.index - 8), m.index))) continue;
    const end = trimGazetteerRun(text, m.index, m.index + m[0].length);
    if (end === null) continue;
    const name = text.slice(m.index, end);
    if (nameLedProductAt(text, m.index + m[1].length)) continue;
    if (nameOk(name) && !isCompanyName(name, text, end) && !companyFollows(text, end)) add(spans, m.index, end, name, "PERSON", 0.7);
  }
  for (const m of finditer(LONE_GIVEN_NAME_RE, text)) {
    const token = m[1];
    if (!looksLikeGivenName(token)) continue;
    if (CALENDAR_TOKENS.has(token.toLowerCase())) continue;
    if (isHyphenGlued(text, m.index, m.index + token.length)) continue;
    if (!nameOk(token) || isCompanyName(token, text, m.index + token.length) || companyFollows(text, m.index + token.length)) continue;
    if (nameLedProductAt(text, m.index + token.length)) continue;
    if (/(?:^|[^\p{L}])(?:St\.|Sankt|Saint|San|Santa|Ste\.)[ \t]?$/u.test(text.slice(Math.max(0, m.index - 8), m.index))) continue;
    add(spans, m.index, m.index + token.length, token, "PERSON", 0.65);
  }
  for (const m of finditer(GEB_NAME_RE, text)) {
    if (!NON_NAME_WORDS.has(m[1].toLowerCase())) {
      const start = m.index + m[0].lastIndexOf(m[1]);
      add(spans, start, start + m[1].length, m[1], "PERSON", 0.8);
    }
  }
  for (const m of finditer(QUOTED_ALIAS_RE, text)) {
    const token = m[1];
    const start = m.index + m[0].indexOf(token);
    const end = start + token.length;
    if (NON_NAME_WORDS.has(token.toLowerCase()) || KEEP_TERMS.has(token.toLowerCase())) continue;
    if (isCommonWord(token) || CALENDAR_TOKENS.has(token.toLowerCase())) continue;
    if (vocabularyVerdict(token, "PERSON", looksLikeGivenName) === "drop") continue;
    const before = text.slice(Math.max(0, start - 140), start);
    const after = text.slice(end, end + 90);
    const sentenceBefore2 = before.slice(Math.max(before.lastIndexOf("."), before.lastIndexOf("\n"), before.lastIndexOf("!"), before.lastIndexOf("?")) + 1);
    const stop = after.search(/[.!?\n]/);
    const sentenceAfter = stop === -1 ? after : after.slice(0, stop);
    if (!ALIAS_CUE_RE.test(sentenceBefore2 + " " + token + " " + sentenceAfter)) continue;
    add(spans, start, end, token, "PERSON", 0.8);
  }
  for (const re of [STREET_RE, STREET2_RE, STREET_EN_RE, FOREIGN_STREET_RE, STREET_UPPER_RE]) {
    for (const m of streetMatches(re, text)) {
      if (re === STREET_UPPER_RE && !hasAddressCorroboration(text, m.index, text.slice(m.index + m[0].length, m.index + m[0].length + 24))) continue;
      const isOrg = isOrgAddressLine(text, m.index, spans) || isInstitutionLetterhead(text, m.index);
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 24);
      if (UNIT_AFTER_NUMBER_RE.test(after)) continue;
      const streetName = m[0].replace(/[\s\d]*[a-zA-Z]?$/, "");
      if (WEAK_STREET_SUFFIX_RE.test(streetName) && !hasAddressCorroboration(text, m.index, after)) {
        continue;
      }
      let before = spans.length;
      add(spans, m.index, m.index + m[0].length, m[0], "ADDRESS", 0.85);
      if (isOrg && spans.length > before) {
        spans[spans.length - 1].orgContact = true;
        spans[spans.length - 1].forceReview = true;
      }
      STREET_TAIL_RE.lastIndex = 0;
      const tail = STREET_TAIL_RE.exec(text.slice(m.index + m[0].length));
      const tailTown = tail && tail[0].replace(/^[\s,·]+/, "").replace(/^\d{5}[ \t]+/, "");
      if (tail && !/\d{5}/.test(tail[0]) && (isCommonWord(tailTown.split(/[ \t]/, 1)[0]) || /[ \t](?:des|den|dem|der|in|vor|auf)[ \t]/.test(tailTown.replace(/[ \t](?:an|ob|auf) der[ \t]/g, " ")))) {
      } else if (tail) {
        const end = m.index + m[0].length + tail[0].length;
        before = spans.length;
        add(spans, m.index, end, text.slice(m.index, end), "ADDRESS", 0.88);
        if (isOrg && spans.length > before) {
          spans[spans.length - 1].orgContact = true;
          spans[spans.length - 1].forceReview = true;
        }
      }
    }
  }
  for (const m of finditer(STREET_PREP_RE, text)) {
    const name = m[1];
    if (name.split(/[ -]/).some((w) => isCommonWord(w) || STREET_PREP_NOT_STREET.has(w.toLowerCase()))) continue;
    if (UNIT_AFTER_NUMBER_RE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 24))) continue;
    if (STREET_PREP_BUSINESS_RE.test(text.slice(Math.max(0, m.index - 30), m.index))) continue;
    if (!STREET_PREP_TOPONYM_RE.test(name) && !STREET_PREP_CUE_RE.test(text.slice(Math.max(0, m.index - 70), m.index))) continue;
    if (spans.some((sp) => sp.category === "ADDRESS" && sp.start <= m.index && sp.end >= m.index + m[0].length)) continue;
    const isOrg = isOrgAddressLine(text, m.index, spans) || isInstitutionLetterhead(text, m.index);
    const before = spans.length;
    add(spans, m.index, m.index + m[0].length, m[0], "ADDRESS", 0.75);
    if (isOrg && spans.length > before) {
      spans[spans.length - 1].orgContact = true;
      spans[spans.length - 1].forceReview = true;
    }
  }
  for (const m of streetMatches(STREET_BY_POSTCODE_RE, text)) {
    const isOrg = isOrgAddressLine(text, m.index, spans) || isInstitutionLetterhead(text, m.index);
    if (UNIT_AFTER_NUMBER_RE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 24))) continue;
    const before = spans.length;
    add(spans, m.index, m.index + m[0].length, m[0], "ADDRESS", 0.8);
    if (isOrg && spans.length > before) {
      spans[spans.length - 1].orgContact = true;
      spans[spans.length - 1].forceReview = true;
    }
  }
  for (const re of [PLZ_CITY_COUNTRY_RE, UK_LOCALITY_RE, US_LOCALITY_RE, FOREIGN_LOCALITY_RE]) {
    for (const m of finditer(re, text)) {
      const isOrg = isOrgAddressLine(text, m.index, spans) || isInstitutionLetterhead(text, m.index);
      let start = m.index;
      let value = m[0];
      if (re === UK_LOCALITY_RE || re === US_LOCALITY_RE) {
        const lineStart = text.lastIndexOf("\n", m.index - 1) + 1;
        const prefix = text.slice(lineStart, m.index);
        const houseMatch = HOUSE_STREET_BEFORE_LOCALITY_RE.exec(prefix);
        if (houseMatch) {
          start = lineStart + houseMatch.index;
          value = text.slice(start, m.index + m[0].length);
        }
      }
      const before = spans.length;
      add(spans, start, m.index + m[0].length, value, "ADDRESS", 0.8);
      if (isOrg && spans.length > before) {
        spans[spans.length - 1].orgContact = true;
        spans[spans.length - 1].forceReview = true;
      }
    }
  }
  for (const m of finditer(PLZ_CITY_CAPS_RE, text)) {
    const word = m[0].replace(/^\d+[ \t]*/, "").split(/[ \t-]/, 1)[0];
    if (isCommonWord(word[0] + word.slice(1).toLowerCase())) continue;
    if (spans.some((sp) => sp.category === "ADDRESS" && sp.start <= m.index && sp.end >= m.index + m[0].length)) continue;
    const streetBefore = spans.some((sp) => sp.category === "ADDRESS" && sp.end <= m.index && m.index - sp.end <= 4 && /^[ \t,·]*$/.test(text.slice(sp.end, m.index)));
    if (!streetBefore && !hasContext(text, m.index, [...ADDRESS_LABEL_CONTEXT, "plz", "ort:", "ort/", "/ ort"])) continue;
    const isOrg = isOrgAddressLine(text, m.index, spans) || isInstitutionLetterhead(text, m.index);
    const before = spans.length;
    add(spans, m.index, m.index + m[0].length, m[0], "ADDRESS", 0.75);
    if (isOrg && spans.length > before) {
      spans[spans.length - 1].orgContact = true;
      spans[spans.length - 1].forceReview = true;
    }
  }
  for (const m of finditer(PLZ_CITY_RE, text)) {
    const isOrg = isOrgAddressLine(text, m.index, spans) || isInstitutionLetterhead(text, m.index);
    if (isCommonWord(m[0].replace(/^\d+[ \t]*/, "").split(/[ \t]/, 1)[0])) continue;
    if (looksLikeGivenName(m[0].replace(/^\d+[ \t]*/, "").split(/[ \t]/, 1)[0])) continue;
    const before = spans.length;
    add(spans, m.index, m.index + m[0].length, m[0], "ADDRESS", 0.8);
    if (isOrg && spans.length > before) {
      spans[spans.length - 1].orgContact = true;
      spans[spans.length - 1].forceReview = true;
    }
  }
  for (const m of finditer(ID_CARD_RE, text)) {
    const tok = m[0];
    const hasLetter = /[A-Za-z]/.test(tok);
    const hasDigit = /\d/.test(tok);
    if (tok.replace(/[^0-9A-Za-z]/g, "").length < 8) continue;
    if (/(?:Energie|Verbrauchs|Bedarfs)ausweis/i.test(text.slice(Math.max(0, m.index - 60), m.index))) continue;
    if (hasLetter && hasDigit && hasAnyContext(text, m.index, CTX.ID_CARD)) {
      add(spans, m.index, m.index + tok.length, tok, "ID_CARD", 0.9);
    } else if (!hasLetter && /^\d{8,10}$/.test(tok.replace(/ /g, "")) && hasAnyContext(text, m.index, CTX.ID_DOC_DIGITS)) {
      add(spans, m.index, m.index + tok.length, tok, "ID_CARD", 0.85);
    } else if (hasDigit && (hasLetter || (tok.match(/\d/g) || []).length >= 9) && ID_DOC_BEFORE_NUMBER_RE.test(text.slice(Math.max(text.lastIndexOf("\n", m.index - 1) + 1, m.index - 200), m.index))) {
      add(spans, m.index, m.index + tok.length, tok, "ID_CARD", 0.8);
    }
  }
  for (const m of finditer(PLATE_RE, text)) {
    if (STANDARDS_PREFIXES.has(m[0].split("-", 1)[0].toLowerCase()) && !plateCueBefore(text, m.index)) continue;
    if (/^\s*,\s*\d/.test(text.slice(m.index + m[0].length))) continue;
    if (/^\.\d/.test(text.slice(m.index + m[0].length))) continue;
    if (/^[-/][0-9A-Za-z]/.test(text.slice(m.index + m[0].length))) continue;
    if (/[0-9A-Za-z][-/]$/.test(text.slice(Math.max(0, m.index - 2), m.index))) continue;
    const trimmed = m[0].trim();
    const off = m[0].indexOf(trimmed);
    add(spans, m.index + off, m.index + off + trimmed.length, trimmed, "PLATE", 0.85);
  }
  for (const m of finditer(PLATE_SPACED_RE, text)) {
    if (STANDARDS_PREFIXES.has(m[0].split(/[ \t]/, 1)[0].toLowerCase())) continue;
    if (/^\s*,\s*\d/.test(text.slice(m.index + m[0].length))) continue;
    if (!hasAnyContext(text, m.index, CTX_PLATE)) continue;
    const trimmed = m[0].trim();
    add(spans, m.index, m.index + trimmed.length, trimmed, "PLATE", 0.8);
  }
  for (const m of finditer(PLATE_UK_RE, text)) {
    if (!hasAnyContext(text, m.index, CTX_PLATE_UK)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "PLATE", 0.8);
  }
  for (const re of [IPV4_RE, IPV6_RE, MAC_RE]) {
    for (const m of finditer(re, text)) {
      if (re === IPV6_RE && !looksLikeIpv6(m[0])) continue;
      if (re !== MAC_RE && isNonIdentifyingIp(m[0])) continue;
      if (re === IPV4_RE && /^\/(3[0-2]|[12]?\d)\b/.test(text.slice(m.index + m[0].length))) continue;
      if (re === IPV4_RE && /(?:^|[^\p{L}])(?:Ref|Referat|Version|Vers|Kap|Kapitel|Abschnitt|Ziff|Ziffer|Nr|No|Punkt|Section|§)\.?[ \t]*$/iu.test(text.slice(Math.max(0, m.index - 14), m.index))) continue;
      add(spans, m.index, m.index + m[0].length, m[0], "ONLINE_ID", 0.9);
    }
  }
  for (const m of finditer(PROFILE_URL_RE, text)) {
    add(spans, m.index, m.index + m[0].length, m[0], "ONLINE_ID", 0.9);
  }
  for (const m of finditer(SOCIAL_HANDLE_RE, text)) {
    if (!hasContext(text, m.index, CTX_SOCIAL)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "ONLINE_ID", 0.8);
  }
  for (const m of finditer(MBI_RE, text)) {
    if (hasAnyContext(text, m.index, CTX.HEALTH_INS) || INSURER_ABOVE_RE.test(text.slice(Math.max(0, m.index - 160), m.index))) add(spans, m.index, m.index + m[0].length, m[0], "HEALTH_INSURANCE", 0.9);
  }
  for (const m of finditer(PKV_NUMBER_RE, text)) add(spans, m.index, m.index + m[0].length, m[0], "HEALTH_INSURANCE", 0.85);
  for (const m of finditer(US_POLICY_NUMBER_RE, text)) {
    if (!INSURER_ABOVE_RE.test(text.slice(Math.max(0, m.index - 160), m.index))) continue;
    const a = m.index + m[0].length - m.groups.num.length;
    if (spans.some((sp) => sp.start < a + m.groups.num.length && sp.end > a)) continue;
    add(spans, a, a + m.groups.num.length, m.groups.num, "HEALTH_INSURANCE", 0.85);
  }
  for (const h of finditer(HEALTH_INS_LABEL_HEAD_RE, text)) {
    HEALTH_INS_LABEL_TOKEN_RE.lastIndex = h.index + h[0].length;
    const m = HEALTH_INS_LABEL_TOKEN_RE.exec(text);
    if (!m) continue;
    let tok = m.groups.tok;
    for (; ; ) {
      const k = /^(.*\d.*?)[ \-]([A-Z0-9]{2,})$/.exec(tok);
      if (k && !/\d/.test(k[2])) tok = k[1];
      else break;
    }
    if ((tok.match(/\d/g) || []).length < 5 || /^\d{1,2}[ .-]\d{1,2}[ .-]\d{2,4}$/.test(tok) || /^(?:DE|AT|CH)\d{2}[ \d]+$/.test(tok)) continue;
    const start = m.index;
    if (spans.some((sp) => sp.start < start + tok.length && sp.end > start)) continue;
    add(spans, start, start + tok.length, tok, "HEALTH_INSURANCE", 0.85);
  }
  for (const m of finditer(HEALTH_INS_RE, text)) {
    if (hasAnyContext(text, m.index, CTX.HEALTH_INS)) add(spans, m.index, m.index + m[0].length, m[0], "HEALTH_INSURANCE", 0.9);
  }
  for (const m of finditer(ORIGIN_NAME_RE, text)) {
    if (isCommonWord(m[1])) continue;
    const at = m.index + m[0].lastIndexOf(m[2]);
    if (!isCommonWord(m[2].split(/[ ,-]/, 1)[0])) add(spans, at, at + m[2].length, m[2], "BIRTH_PLACE", 0.8);
  }
  for (const re of [BIRTH_PLACE_RE, BIRTH_PLACE_BEFORE_RE, ORIGIN_PLACE_RE, BIRTH_DATE_PLACE_FIELD_RE, BIRTH_DATE_IN_PLACE_RE, BIRTH_DATE_COMMA_PLACE_RE]) {
    for (const m of finditer(re, text)) {
      const g1 = m[1] ?? m[2];
      const dated = m[1] == null && m[2] != null && /\d/.test(m[0].slice(0, m[0].lastIndexOf(g1))) && !/\n[ \t]*in\s/.test(m[0]);
      if (/\n[ \t]*in\s/.test(m[0]) && !/\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(m[0])) continue;
      const first = g1.split(/[ ,-]/, 1)[0];
      if (!dated && !(first === first.toUpperCase() && first.length > 3) && isCommonWord(first)) continue;
      if (headerHeuristic(g1.trim().toLowerCase())) continue;
      const start = m.index + m[0].lastIndexOf(g1);
      add(spans, start, start + g1.length, g1, "BIRTH_PLACE", 0.85);
    }
  }
  for (const m of finditer(RELIGION_LABEL_RE, text)) {
    const g1 = m[1];
    if (isAbsenceValue(g1)) continue;
    const start = m.index + m[0].indexOf(g1);
    add(spans, start, start + g1.length, g1.trim(), "RELIGION", 0.9);
  }
  for (const m of finditer(RELIGION_CODE_FIELD_RE, text)) {
    const g = m[1] || m[2];
    const start = m.index + m[0].length - g.length;
    add(spans, start, start + g.length, g, "RELIGION", 0.85);
  }
  for (const m of finditer(RELIGION_BRACKET_RE, text)) {
    const start = m.index + m[0].indexOf(m[1], m[0].indexOf("("));
    add(spans, start, start + m[1].length, m[1], "RELIGION", 0.85);
  }
  for (const m of finditer(RELIGION_COPULA_RE, text)) {
    if (!copulaHasPersonSubject(text, m.index)) continue;
    const start = m.index + m[0].length - m[1].length;
    add(spans, start, start + m[1].length, m[1], "RELIGION", 0.8);
  }
  for (const m of finditer(RELIGION_TERM_RE, text)) {
    if (m[0].length <= 2 && m[0] !== m[0].toUpperCase()) continue;
    if (new RegExp("^\\p{Lu}", "u").test(m[0]) && RELIGION_INSTITUTION_AFTER_RE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 40)) && !RELIGION_MEMBER_BEFORE_RE.test(text.slice(Math.max(0, m.index - 40), m.index))) continue;
    if (religionInstitutionMention(text, m.index, m.index + m[0].length)) continue;
    if (hasContext(text, m.index, RELIGION_CONTEXT) || personalSubjectAt(text, m.index, m.index + m[0].length)) add(spans, m.index, m.index + m[0].length, m[0], "RELIGION", 0.8);
  }
  for (const m of finditer(RELIGION_STEM_RE, text)) {
    const end = m.index + m[0].length;
    const member = RELIGION_MEMBER_BEFORE_RE.test(text.slice(Math.max(0, m.index - 40), m.index));
    if (new RegExp("^\\p{Lu}", "u").test(m[0]) && RELIGION_INSTITUTION_AFTER_RE.test(text.slice(end, end + 40)) && !member) continue;
    if (religionInstitutionMention(text, m.index, end)) continue;
    if (/\b(?:if|wenn|falls|example|beispiel|angenommen)\b/i.test(text.slice(Math.max(0, m.index - 80), m.index).split(/[.!?;\n]/).at(-1))) continue;
    if (/^s?[ \t]+(?:churches|church|congregations?|parish(?:es)?|schools?|hospitals?|universit(?:y|ies)|charit(?:y|ies)|traditions?|holidays?|festivals?)\b/i.test(text.slice(end, end + 24)) && !member) continue;
    add(spans, m.index, end, m[0], "RELIGION", 0.8);
  }
  for (const m of finditer(NATIONALITY_LABEL_RE, text)) {
    const g1 = m[1];
    const value = g1.trim();
    if (isPlaceholderValue(value)) continue;
    if (FUNCTION_WORDS.has(value.split(/\s+/)[0].toLowerCase())) continue;
    if (!m[0].slice(0, m[0].indexOf(g1)).includes(":")) {
      const first = value.split(/\s+/)[0];
      if (/[\r\n]/.test(m[0].slice(0, m[0].indexOf(g1))) && !NAT_FIRST_DEMONYM_RE.test(first.replace(/İ/g, "I"))) continue;
      if (NAT_STATUTE_HEAD_RE.test(first)) continue;
      const after = text[m.index + m[0].length] || "";
      const demonym = /sch(?:e[rnsm]?)?$/iu.test(first) || /^staatenlos/i.test(first) || new RegExp("^\\p{Ll}{2,6}$", "u").test(first) && value === first && after === ".";
      if (!new RegExp("^\\p{Lu}", "u").test(first) && !demonym) continue;
    }
    const start = m.index + m[0].indexOf(g1);
    add(spans, start, start + g1.length, value, "NATIONALITY", 0.85);
    let end = start + g1.length;
    for (let n = 0; n < 3; n++) {
      const c = NAT_CONTINUATION_RE.exec(text.slice(end, end + 40));
      if (!c) break;
      const at = end + c[0].length - c[1].length;
      add(spans, at, at + c[1].length, c[1], "NATIONALITY", 0.8);
      end = at + c[1].length;
    }
  }
  for (const m of finditer(NATIONALITY_PHRASE_RE, text)) {
    add(spans, m.index, m.index + m[0].length, m[0], "NATIONALITY", 0.8);
  }
  for (const m of finditer(NATIONALITY_CUE_RE, text)) {
    const g = m[1] ?? m[2] ?? m[3] ?? m[4];
    const at = m.index + m[0].lastIndexOf(g);
    add(spans, at, at + g.length, g, "NATIONALITY", 0.8);
  }
  for (const m of finditer(NATIONALITY_R7_RE, text)) {
    const lead = new RegExp("^(\\p{Lu}[\\p{L}'\u2019-]+)[ \\t]*\\(", "u").exec(m[0]);
    if (lead && isCommonWord(lead[1])) continue;
    let from = m.index;
    for (let gi = 1; gi < m.length; gi++) {
      if (!m[gi]) continue;
      const at = m.index + m[0].indexOf(m[gi], from - m.index);
      add(spans, at, at + m[gi].length, m[gi], "NATIONALITY", 0.8);
      from = at + m[gi].length;
    }
  }
  for (const m of finditer(NATIONALITY_ROW_RE, text)) {
    const adj = m[2];
    const at = m.index + m[0].length - adj.length;
    add(spans, at, at + adj.length, adj, "NATIONALITY", 0.8);
    if (m[1] && !isCommonWord(m[1].split(/[ \t]/, 1)[0])) {
      const pAt = m.index + m[0].indexOf(m[1]);
      add(spans, pAt, pAt + m[1].length, m[1], "BIRTH_PLACE", 0.8);
    }
  }
  for (const re of [AFFILIATION_STEM_RE, PARTY_MEMBER_RE]) {
    for (const m of finditer(re, text)) {
      if (affiliationInstitutionMention(text, m.index, m.index + m[0].length)) continue;
      add(spans, m.index, m.index + m[0].length, m[0], "AFFILIATION", 0.8);
    }
  }
  for (const m of finditer(ASSOCIATION_MEMBER_RE, text)) {
    const at = m.index + m[0].lastIndexOf(m[1]);
    add(spans, at, at + m[1].length, m[1], "AFFILIATION", 0.8);
  }
  for (const re of [AFFILIATION_LABEL_RE, AFFILIATION_MEMBER_RE]) {
    for (const m of finditer(re, text)) {
      const val = m[1].replace(/^[ .,-]+|[ .,-]+$/g, "");
      if (val && !/^\d+$/.test(val)) {
        const g1start = m.index + m[0].indexOf(m[1]);
        add(spans, g1start, g1start + val.length, val, "AFFILIATION", 0.85);
      }
    }
  }
  for (const m of finditer(AFFILIATION_TERM_RE, text)) {
    if (hasContext(text, m.index, AFFILIATION_CONTEXT)) add(spans, m.index, m.index + m[0].length, m[0], "AFFILIATION", 0.8);
  }
  for (const m of finditer(HEALTH_LABEL_RE, text)) {
    const g1 = m[1];
    if (isAbsenceValue(g1) || /^(?:ja|nein|yes|no)\b/i.test(g1.trim())) continue;
    const start = m.index + m[0].indexOf(g1);
    add(spans, start, start + g1.length, g1.trim(), "HEALTH", 0.9);
  }
  for (const m of finditer(HEALTH_LABEL_NOCOLON_RE, text)) {
    const g1 = m[1];
    if (isAbsenceValue(g1)) continue;
    const start = m.index + m[0].indexOf(g1);
    add(spans, start, start + g1.length, g1.trim(), "HEALTH", 0.85);
  }
  for (const m of finditer(ALLERGY_PAREN_RE, text)) {
    add(spans, m.index, m.index + m[1].length, m[1], "HEALTH", 0.8);
  }
  for (const m of finditer(ALCOHOL_LEVEL_RE, text)) {
    if (!CRIMINAL_CONTEXT.some((k) => text.toLowerCase().includes(k))) continue;
    add(spans, m.index, m.index + m[0].trimEnd().length, m[0].trimEnd(), "CRIMINAL", 0.8);
  }
  for (const re of [HEALTH_DEGREE_RE, HEALTH_ASSISTIVE_RE]) {
    for (const m of finditer(re, text)) {
      add(spans, m.index, m.index + m[0].trimEnd().length, m[0].trimEnd(), "HEALTH", 0.85);
    }
  }
  for (const [s, e] of healthBlockRanges(text)) {
    add(spans, s, e, text.slice(s, e), "HEALTH", 0.9);
  }
  for (const m of finditer(ICD10_RE, text)) {
    const dotted = m[0].includes(".");
    const title = dotted ? icdTitleAfter(text, m.index + m[0].length) : "";
    if (hasContext(text, m.index, HEALTH_CONTEXT)) {
      add(spans, m.index, m.index + m[0].length + title.length, m[0] + title, "HEALTH", dotted ? 0.85 : 0.7);
    } else if (dotted && /^[A-TZ]/.test(m[0]) && documentHasHealthVocabulary(text)) {
      add(spans, m.index, m.index + m[0].length + title.length, m[0] + title, "HEALTH", 0.8);
    } else if (!dotted && ICD_PAREN_BEFORE_RE.test(text.slice(Math.max(0, m.index - 1), m.index)) && text[m.index + m[0].length] === ")" && search(HEALTH_TERM_RE, text.slice(Math.max(text.lastIndexOf("\n", m.index) + 1, m.index - 70), m.index)) !== null) {
      add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.75);
    }
  }
  for (const m of finditer(ALLERGEN_RE, text)) {
    if (new RegExp("(?:nicht|not|kein\\p{L}*|no|never|nie)[ \\t]+$", "iu").test(text.slice(Math.max(0, m.index - 14), m.index))) continue;
    const at = m.index + m[0].length - m[1].length;
    add(spans, at, at + m[1].length, m[1], "HEALTH", 0.75);
  }
  for (const m of finditer(LAB_VALUE_RE, text)) {
    if (documentHasHealthVocabulary(text)) add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.75);
  }
  if (documentHasHealthVocabulary(text)) {
    for (const m of finditer(MEASURE_UNIT_RE, text)) {
      if (MEASURE_RANGE_BEFORE_RE.test(text.slice(Math.max(0, m.index - 10), m.index))) continue;
      if (MEASURE_RANGE_AFTER_RE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 60))) continue;
      add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.7);
    }
    for (const m of finditer(MEASURE_BP_RE, text)) {
      const at = m.index + m[0].length - m[1].length;
      add(spans, at, at + m[1].length, m[1], "HEALTH", 0.7);
    }
    for (const m of finditer(MEASURE_WEIGHT_RE, text)) {
      if (MEASURE_WEIGHT_WORD_RE.test(sentenceBefore(text, m.index))) add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.7);
    }
    for (const m of finditer(MEASURE_HEIGHT_RE, text)) {
      if (MEASURE_HEIGHT_WORD_RE.test(sentenceBefore(text, m.index) + text.slice(m.index, m.index + m[0].length + 30))) add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.7);
    }
  }
  for (const m of finditer(HEALTH_DRUG_RE, text)) {
    if (healthNegatedAt(text, m.index, m.index + m[0].length)) continue;
    if (ALIGNED_CELL_BEFORE_RE.test(text.slice(Math.max(0, m.index - 3), m.index)) && ALIGNED_CELL_AFTER_RE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 3))) continue;
    if (lineAround(text, m.index).trim().length <= m[0].length + 2 && !/^(?:[ \t]*\r?\n)+[ \t]*\d+(?:[.,]\d+)?[ \t]?(?:mg|µg|mcg|g|ml|IE|I\.U\.|units?)\b/i.test(text.slice(m.index + m[0].length, m.index + m[0].length + 28))) continue;
    if ((lineAround(text, m.index).trim().match(/\S {2,}(?=\S)/g) || []).length >= 2) continue;
    if (/^[ \t]+(?:ist|sind|gehört|gehören|wirkt|wirken|is|are)[ \t]+(?:ein|eine|der|die|das|zur|zum|bei|a|an|the)\b/i.test(text.slice(m.index + m[0].length, m.index + m[0].length + 24)) || /(?:Wirkstoff|Substanz|drug|substance|medication)[ \t]+(?:namens[ \t]+)?$/i.test(text.slice(Math.max(0, m.index - 24), m.index))) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.75);
  }
  for (const m of finditer(HEALTH_TERM_RE, text)) {
    if (/(?:ologie|ologe|ologin|iatrie|iater|iaterin|kunde)$/i.test(m[0])) continue;
    if (HEALTH_NON_CONDITION_RE.test(m[0])) continue;
    if (/(?:zentrum|praxis|station|klinik|ambulanz|abteilung|beratung|beratungsstelle|schulung|berater|beraterin|gruppe|verband|stiftung|selbsthilfe|kasse|sprechstunde|ernährung|diät|screening|konferenz|dokumentation|dokumentationssystem|register|board|boards|boardsitzung|protokoll|leitlinie|studie|statistik|vorsorge|besprechung|kolloquium|geschäftsordnung|dokumentationssystems?|kampagne|impfaktion|unit|clinic|consult|medizinischer dienst|medizinischen dienst)$/i.test(m[0])) continue;
    if (/^[ \t]+(?:Unit|Clinic|Consult|Team|Board|Cent(?:er|re)|Program(?:me)?|Service|Ward)(?![\p{L}])/u.test(text.slice(m.index + m[0].length, m.index + m[0].length + 16))) continue;
    if (m[0].length > 5 && m[0] === m[0].toUpperCase() && !new RegExp("\\p{Ll}", "u").test(lineAround(text, m.index))) continue;
    if (/^such(?:t|te|ten|test|tet|en|end)$/.test(m[0])) continue;
    {
      const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 60);
      if (/^[ \t]*[:|\t]/.test(tail)) {
        const rest = /^[ \t]*:[ \t]*([^\n]*)/.exec(tail);
        if (!rest && !HEALTH_LABEL_LIKE_RE.test(m[0]) && /\S/.test(text.slice(text.lastIndexOf("\n", m.index - 1) + 1, m.index))) {
        } else if (HEALTH_LABEL_LIKE_RE.test(m[0]) || !rest || !new RegExp("\\p{L}{3}", "u").test(rest[1]) || /^(?:ja|nein|yes|no|ohne|keine?|none)\b|^[☐☒✓✗\[_.]/i.test(rest[1])) continue;
      }
    }
    const ctx = hasLineContext(text, m.index, HEALTH_CONTEXT) || hasLineContext(text, m.index, CTX_HEALTH_EXTRA);
    if (healthNegatedAt(text, m.index, m.index + m[0].length)) continue;
    const start = extendOverHealthQualifier(text, m.index);
    add(
      spans,
      start,
      m.index + m[0].length,
      text.slice(start, m.index + m[0].length),
      "HEALTH",
      ctx ? 0.75 : 0.7
    );
  }
  for (const m of finditer(FOREIGN_QUOTE_RE, text)) {
    const q = m[1];
    const words = q.toLowerCase().match(/[\p{L}]+/gu) || [];
    if (words.length < 4 || words.filter((w) => FOREIGN_QUOTE_DE_WORDS.has(w)).length / words.length > 0.15) continue;
    if (!FOREIGN_HEALTH_RE.test(q)) continue;
    add(spans, m.index + 1, m.index + 1 + q.length, q, "HEALTH", 0.75);
  }
  const doseHeads = /* @__PURE__ */ new Set();
  for (const m of finditer(MEDICATION_DOSE_RE, text)) {
    add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.8);
    const head = /^[^\s\d]+/u.exec(m[0]);
    if (head && head[0].length >= 6 && !isCommonWord(head[0]) && !DOSE_HEAD_GENERIC_RE.test(head[0])) doseHeads.add(head[0]);
  }
  for (const head of doseHeads) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}-])${head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "gu");
    for (const m of finditer(re, text)) {
      if (spans.some((sp) => sp.start < m.index + m[0].length && sp.end > m.index)) continue;
      if (healthNegatedAt(text, m.index, m.index + m[0].length)) continue;
      add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.7);
    }
  }
  for (const m of finditer(DRUG_STEM_RE, text)) {
    if (m[0].length < 7 || isCommonWord(m[0])) continue;
    if (ALIGNED_CELL_BEFORE_RE.test(text.slice(Math.max(0, m.index - 3), m.index)) && ALIGNED_CELL_AFTER_RE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 3))) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.75);
  }
  for (const m of finditer(DIAGNOSIS_MORPH_RE, text)) {
    const headWord = m[0].split(/[ \t]/, 1)[0];
    if (CLINICAL_PROCESS_WORDS.has(headWord.toLowerCase())) continue;
    if (NON_MEDICAL_HEAD_RE.test(headWord)) continue;
    if (/(?:ose|osen|wunde|wunden|blutung|blutungen|ämie|aemie|plegie|embolie|infarkt|infarkte)$/i.test(headWord) && isCommonWord(headWord)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.75);
  }
  const indexCount = /* @__PURE__ */ new Map();
  const indexKey = (m) => (/^[^\s:=,(]+/.exec(m[0]) || [m[0]])[0].toLowerCase();
  const indexMatches = [...finditer(CLINICAL_INDEX_RE, text)];
  for (const m of indexMatches) indexCount.set(indexKey(m), (indexCount.get(indexKey(m)) || 0) + 1);
  for (const re of [CLINICAL_INDEX_RE, CLINICAL_JUDGED_RE, CLINICAL_STAGE_RE, BODY_PROCEDURE_RE, BODY_PROCEDURE_LC_RE, EN_PROCEDURE_RE, COMPOUND_OPERATION_RE, PSYCHOTHERAPY_PHRASE_RE, DISEASE_COMPOUND_RE]) {
    for (const m of re === CLINICAL_INDEX_RE ? indexMatches : finditer(re, text)) {
      if (re === CLINICAL_INDEX_RE && indexCount.get(indexKey(m)) > 3) continue;
      if (re === CLINICAL_INDEX_RE && /^[ \t]*(?:[<>≤≥]?[ \t]*)?\d+(?:[.,]\d+)?[ \t]*[-–][ \t]*\d/.test(text.slice(m.index + m[0].length, m.index + m[0].length + 24))) continue;
      if (healthNegatedAt(text, m.index, m.index + m[0].length)) continue;
      if (/(?:nicht|not)[ \t]+(?:um[ \t]+|a[ \t]+)?(?:eine?n?[ \t]+)?$/i.test(text.slice(Math.max(0, m.index - 24), m.index))) continue;
      if (re === DISEASE_COMPOUND_RE && /^(?:Kinderkrank|Anfangskrank|Startkrank|Softwarekrank)/.test(m[0])) continue;
      add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.75);
    }
  }
  for (const re of [OPS_CODE_RE, CARE_LEVEL_RE, DATED_OPERATION_RE, CLINICAL_NOTATION_RE, CLINICAL_ACRONYM_RE]) {
    for (const m of finditer(re, text)) {
      if (documentHasHealthVocabulary(text)) add(spans, m.index, m.index + m[0].length, m[0], "HEALTH", 0.8);
    }
  }
  for (const sm of finditer(SENTENCE_RE, text)) {
    const seg = sm[0];
    const hits = [];
    for (const re of [CRIMINAL_TRIGGER_RE, CRIMINAL_OFFENCE_RE, CRIMINAL_PROCEEDING_EN_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(seg)) !== null) {
        hits.push({ i: m.index, e: m.index + m[0].length, w: m[0], trigger: re === CRIMINAL_TRIGGER_RE, proc: re === CRIMINAL_PROCEEDING_EN_RE });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
    if (!hits.length) continue;
    const firstOffence = hits.find((h) => !h.trigger && !h.proc);
    const hasOffenceNoun = hits.some((h) => !h.trigger && !h.proc && /[\p{Lu}]/u.test(h.w[0])) || hits.some((h) => h.proc);
    const kept = [];
    for (const h of hits) {
      const before = seg.slice(Math.max(0, h.i - 40), h.i);
      const after = seg.slice(h.e, h.e + 40);
      if (CRIMINAL_GENERIC_AFTER_RE.test(after) || CRIMINAL_GENERIC_BEFORE_RE.test(before)) continue;
      if (CRIMINAL_NEGATED_BEFORE_RE.test(before) || CRIMINAL_NEGATED_AFTER_RE.test(after)) continue;
      if (CRIMINAL_QUOTED_BEFORE_RE.test(before) && CRIMINAL_QUOTED_AFTER_RE.test(after)) continue;
      if (/^[ \t]*:/.test(after)) continue;
      if (h.trigger && PROCEDURAL_NOUN_RE.test(h.w) && /(?:\b(?:diesen|diesem|dieses|den|dem|this)|-\/)[ \t]*$/i.test(before)) continue;
      if (h.trigger) {
        if (!hasOffenceNoun && isCommonWord(h.w) && !clauseHasCriminalContext(seg, firstOffence)) continue;
        if (!hasOffenceNoun && HOMONYM_TRIGGER_RE.test(h.w) && !CRIMINAL_LAW_WORD_RE.test(seg) && !criminalSentenceContinues(text, sm.index, seg)) continue;
        if (!/\s/.test(h.w) && !hasOffenceNoun && !seg.slice(0, h.i).trim() && !after.trim()) continue;
      } else if (!h.proc) {
        if (!new RegExp("\\p{Lu}", "u").test(h.w[0])) continue;
        const hasTriggerHere = hits.some((t) => t.trigger && Math.abs(t.i - h.i) < 60);
        if (!hasTriggerHere) {
          const win = text.slice(Math.max(0, sm.index - 300), sm.index + seg.length + 300);
          INSURANCE_WORDS_RE.lastIndex = 0;
          let n = 0;
          while (INSURANCE_WORDS_RE.exec(win) && ++n < 2) ;
          if (n >= 2) continue;
        }
      }
      kept.push(h);
    }
    if (!kept.length) continue;
    kept.sort((x, y) => x.i - y.i);
    let c = 0;
    while (c < kept.length) {
      let d = c;
      while (d + 1 < kept.length && kept[d + 1].i - kept[d].e <= 60) d++;
      const first = kept[c], last = kept[d];
      let from = first.i;
      const lead = new RegExp("(?:(?:wegen|des|der|von|gegen|bei|zu|f\xFCr)[ \\t]+|(?:\\p{Ll}{5,}(?:en|er|es|e|em)[ \\t]+)){1,2}$", "u").exec(seg.slice(0, from));
      if (lead) from -= lead[0].length;
      let to = last.e;
      const tail = /^(?:[ \t]*\([^)\n]{1,40}\))?(?:[ \t]+(?:(?:mit|über|auf|ohne|aus|von|vom|bei|am|im|in|an|nach|zu|wegen|des|der|dem|den|die|\d+)[ \t]+)?[\p{L}\d§.\/-]+(?:,\d+)?){0,6}/u.exec(seg.slice(to));
      if (tail && tail[0]) {
        let t = tail[0];
        const cut = t.search(/[ \t](?:und|sowie|oder|and|but|wobei|weil|da|dass|which|where)[ \t]/i);
        if (cut >= 0) t = t.slice(0, cut);
        to += t.length;
      }
      const clause = seg.slice(from, to).replace(/\s+$/, "");
      if (clause.trim()) add(spans, sm.index + from, sm.index + from + clause.length, clause, "CRIMINAL", 0.8);
      c = d + 1;
    }
  }
  for (const m of finditer(CRIMINAL_STATUTE_RE, text)) {
    add(spans, m.index, m.index + m[0].length, m[0], "CRIMINAL", 0.75);
  }
  for (const m of finditer(SPLIT_EMAIL_RE, text)) {
    const gaps = m[0].length - m[0].replace(/ /g, "").length;
    const linePrefix = text.slice(text.lastIndexOf("\n", m.index - 1) + 1, m.index);
    const directlyLabelled = /^(?:e-mail|email|e mail|mail|mailadresse|e-mailadresse|mailto)[ ]*:?[ ]*$/iu.test(linePrefix.trimStart());
    const localGap = m[1].includes(" ");
    if (gaps < 1 || (gaps > 1 || localGap) && !directlyLabelled) continue;
    if (new RegExp("\\. \\p{Lu}", "u").test(m[2])) continue;
    const addr = m[0].replace(/ /g, "");
    const lastLabel = addr.slice(addr.lastIndexOf(".") + 1);
    if (!new RegExp("^\\p{L}{2,}$", "u").test(lastLabel)) continue;
    if (mailboxIsNonPersonal(addr)) continue;
    const local = m[1].replace(/ /g, "");
    if (!WORDY_LOCAL_PART_RE.test(local)) continue;
    if (!SHAPED_LOCAL_PART_RE.test(local) && !(hasContext(text, m.index, EMAIL_LABELS) && !isCommonWord(local))) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "EMAIL", 0.8);
  }
  for (const m of finditer(OBFUSCATED_EMAIL_RE, text)) {
    if (!m[0].includes("@")) add(spans, m.index, m.index + m[0].length, m[0], "EMAIL", 0.8);
  }
  for (const m of finditer(OBFUSCATED_EMAIL_LOOSE_RE, text)) {
    if (m[0].includes("@")) continue;
    if (!/\bat\b/i.test(m[0])) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "EMAIL", 0.75);
  }
  embeddedAccountNumbers(text, spans);
  rowKeyBeforeName(text, spans);
  extraIdentifierSpans(text, spans);
  birthdayCueSpans(text, spans);
  dobVariantSpans(text, spans);
  round8Spans(text, spans);
  round8bSpans(text, spans);
  return spans;
}
var PLATE_CUE_BEFORE_RE = /(?<![\p{L}])(?:Kennzeichen|Kennz\.|Nummernschild|(?:licen[cs]e|registration|number)[ ]plate|registration number)[^\n]{0,40}$/iu;
var PLATE_VEHICLE_CUE_RE = new RegExp("(?<![\\p{L}])(?:Kennzeichen|Kennz\\.|Nummernschild|Fahrzeug\\p{L}*|Kfz|Pkw|Lkw|Halter(?:in)?|vehicle|(?:licen[cs]e|registration|number)[ ]plate)[^\\n]{0,40}$", "iu");
function plateVehicleCueBefore(text, at) {
  const back = text.slice(Math.max(0, at - 90), at).replace(/[^\S\n]*\r?\n[^\S\n]*/g, " ");
  return PLATE_VEHICLE_CUE_RE.test(back);
}
function plateCueBefore(text, at) {
  const back = text.slice(Math.max(0, at - 70), at).replace(/[^\S\n]*\r?\n[^\S\n]*/g, " ");
  return PLATE_CUE_BEFORE_RE.test(back);
}
var PLATE_WRAP_RE = rx(`${BL}[${CAP}]{1,3}[ \\t]?-[ \\t]?[A-Z]{1,2}[ \\t]*\\r?\\n[ \\t]*\\d{1,4}[ \\t]?[EH]?${BR}`);
var PLATE_NUMERIC_RE = rx(`${BL}[${CAP}]{1,3}[ \\t]\\d{4,6}[A-Z]{0,2}${BR}`);
var PLATE_NUMERIC_CUE_RE = /(?<![\p{L}])(?:Kennzeichen|Kennz\.|Nummernschild|(?:licen[cs]e|registration|number)[ ]plate)(?:[ \t:]+(?:lautet|ist|des Fahrzeugs|des Pkw|des Wagens))?[ \t:]*$/iu;
var ACCOUNT_PRODUCT_NR_RE = new RegExp(
  `(?<![\\p{L}])(?:Depot|Sparbuch|Sparkonto|Tagesgeld(?:konto)?|Girokonto|Festgeld(?:konto)?|Verrechnungskonto|Bausparvertrag|Bausparkonto|Darlehenskonto)(?:[^\\n]{0,50}\\r?\\n){0,2}[^\\n]{0,50}?(?<![\\p{L}])Nr\\.?[ \\t:]*(\\d(?:[ ]?\\d){5,11})(?![\\p{N}])`,
  "gu"
);
var SORT_CODE_LABEL_ABOVE_RE = /sort[ -]?code[ \t:]*\r?\n[ \t]*$/i;
var R8_PLACE = `\\p{Lu}[\\p{L}'\u2019-]+(?:[ \\t]+(?:am|an der|im|bei)[ \\t]+\\p{Lu}[\\p{L}'\u2019-]+)?(?:[ \\t]*\\(\\p{Lu}\\p{L}+\\))?`;
var GEBUERTIG_RE = new RegExp(`(?<![\\p{L}])geb\xFCrtig(?:e[rn]?)?[ \\t]+(?:aus|von|in)[ \\t]+(${R8_PLACE})`, "gu");
var YEAR_IN_PLACE_RE = new RegExp(`(?<![\\d.])(?:1[89]|20)\\d{2}[ \\t]+in[ \\t]+(${R8_PLACE})(?=[ \\t]*,[ \\t]*(?:wohnhaft|whnh\\.|wh\\.))`, "gu");
var BIRTHPLACE_PAIR_RE = new RegExp("(?<![\\p{L}\\p{N}_])(?:geburtsort|birth[_ ]?place|place[_ ]of[_ ]birth)[\"'`]?[ \\t]*[:=][ \\t]*[\"'`\u201E\u201C](\\p{Lu}[^\"'`\u201E\u201C\u201D\\n]{1,40})[\"'`\u201C\u201D]", "giu");
var BIRTH_DATE_ORT_NOCOLON_RE = rx(
  `[Gg]eburtsdatum[ \\t]*(?:und|/|,|&)[ \\t]*-ort[ \\t]+(?:\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})[ \\t]*(?:,|/|in|-)[ \\t]*(${BP_NAME})`
);
var NAT_LIST_ADJ = `(?:${NAT_DEMONYMS_DE}|\\p{L}{4,}isch)`;
var NATIONALITIES_FIELD_RE = new RegExp(
  `(?<![\\p{L}])Staatsangeh\xF6rigkeiten[ \\t]*:?[ \\t]*(${NAT_LIST_ADJ}(?:[ \\t]*(?:,|und|oder|/|sowie)[ \\t]*${NAT_LIST_ADJ})*)(?![\\p{L}])`,
  "gu"
);
var NAT_COPULA_FAMILY_RE = new RegExp(
  `(?<![\\p{L}])Staatsangeh\xF6rigkeit[^.\\n]{0,30}?[ \\t]ist[ \\t]+(${NAT_LIST_ADJ})(?![\\p{L}])(?:[ \\t]+(?:bzw\\.|und|oder|sowie)[ \\t]+(${NAT_LIST_ADJ})(?![\\p{L}]))?`,
  "gu"
);
var NATIONALITY_PAREN_RE = /(?<![\p{L}])(?:Staatsangehörigkeit|Staatsbürgerschaft|Nationalität)[ \t]*\(([^)\n]{3,60})\)/gu;
var NAT_LABEL_FAR_RE = new RegExp(
  `(?<![\\p{L}])(?:Staatsangeh\xF6rigkeit|Staatsb\xFCrgerschaft|Nationalit\xE4t|Nationality|Citizenship)[ \\t]*:?[ \\t]*\\r?\\n(?:[^\\n]{0,80}\\r?\\n){1,2}[ \\t]*(${NAT_DEMONYMS_DE}|${NAT_ADJ_EN})(?=[ \\t]*(?:,|\\r?\\n|$))`,
  "gu"
);
var STATELESS_RE = /(?<![\p{L}-])([Ss]taatenlos)(?![\p{L}])/gu;
var ORIGIN_STAEMMIG_RE = new RegExp("(?<![\\p{L}])(\\p{L}{3,}isch)st\xE4mmig(?:e[rnms]?)?(?:[ \\t]+Familie)?(?![\\p{L}])", "gu");
var RELIGION_PAREN_RE = /(?<![\p{L}])Religion[ \t]*\(([^)\n]{3,60})\)/gu;
var UNION_WORD = `\\p{Lu}[\\p{L}-]*(?:\\.(?=\\p{L})[\\p{L}-]*)*`;
var UNION_NAME = `(?:Gewerkschaft|Industriegewerkschaft|IG|Partei)[ \\t]+${UNION_WORD}(?:[ \\t]+(?:(?:und|f\xFCr|&)[ \\t]+)?${UNION_WORD}){0,5}`;
var UNION_JOIN_RE = new RegExp(
  `(?<![\\p{L}])(?:Mitgliedschaft|Aufnahme|Beitritt|Eintritt)[ \\t]+(?:in|bei|zur|zum)[ \\t]+(?:der|die|den|dem)?[ \\t]*(${UNION_NAME})|(?<![\\p{L}])(?:war|bin|waren|sind|ist)[^.\\n]{0,25}?[ \\t](?:bei|in)[ \\t]+der[ \\t]+(${UNION_NAME})(?:[ \\t]+|[ \\t]*\\r?\\n[ \\t]*)(?:organisiert|aktiv|engagiert)(?![\\p{L}])`,
  "gu"
);
var UNION_BARE_RE = /(?<![\p{L}])(Mitglied[ \t]+(?:der|einer)[ \t]+Gewerkschaft)(?![ \t]*[\p{L}\p{N}])/gu;
var KIST_PHRASE_RE = /(?<![\p{L}])((?:ev|evang|rk|kath)\.?[ \t]+(?:KiSt|Kirchensteuer))(?![\p{L}])/gu;
var KEYSAFE_CODE_RE = /(?<![\p{L}])(?:Schlüssel(?:safe|tresor|kasten|box)|[Kk]ey[ -]?[Ss]afe)[^\n]{0,60}?(?:Code|Nr\.?|PIN)[ \t:]*(\d[\d-]{2,10}\d)(?![\p{L}\p{N}-])/gu;
var LOGIN_KENNUNG_RE = /(?<![\p{L}])(?:Zugangs?kennung|Kennung)[ \t:]+([A-Z]{2,5}-\d{3,8})(?![\p{L}\p{N}-])/gu;
var ACCESS_ID_RE = /(?<![\p{L}])Zugangs-?(?:ID|kennung|nummer)[ \t:]+([A-Z0-9][A-Z0-9-]{4,20})(?![\p{L}\p{N}-])/gu;
var OIDC_SUB_RE = /(?<![\p{L}\p{N}_])sub[ \t]*=[ \t]*([0-9a-f]{4,}(?:-[0-9a-f]{4,}){1,4})(?![\p{L}\p{N}-])/gu;
var FAR_LABEL_GAP = "(?:[^\\n]{0,90}\\r?\\n){0,3}?";
var FAR_NAT_RE = new RegExp(
  `(?<![\\p{L}])(?:Staatsangeh\xF6rigkeit|Staatsb\xFCrgerschaft|Nationalit\xE4t|Nationality|Citizenship)[ \\t]*:?[ \\t]*\\r?\\n${FAR_LABEL_GAP}[ \\t]*((?:${NAT_DEMONYMS_DE}|${NAT_ADJ_EN})(?:[ \\t]*(?:,|und|and|/|oder)[ \\t]*(?:${NAT_DEMONYMS_DE}|${NAT_ADJ_EN}))*)(?=[ \\t]*(?:,|;|\\r?\\n|$))`,
  "gu"
);
var FAR_REL_RE = new RegExp(
  `(?<![\\p{L}])(?:Konfession|Religionszugeh\xF6rigkeit|Religion|Kirchensteuer|KiSt)[ \\t]*:?[ \\t]*\\r?\\n${FAR_LABEL_GAP}[ \\t]*((?:r\xF6m\\.?[- ]?kath\\.?|evang\\.|ev\\.|rk|ev|lt|rf|ak|r\xF6misch-katholisch|evangelisch-lutherisch|evangelisch|katholisch|muslimisch|islamisch|j\xFCdisch|orthodox|alevitisch|buddhistisch|hinduistisch))(?=[ \\t]*(?:,|;|\\r?\\n|$))`,
  "gu"
);
var WORKS_COUNCIL_LIST_RE = new RegExp(
  `(?<![\\p{L}])(?:Betriebsrat|Personalrat|Gewerkschaft|Betriebsrats\\p{L}*|Personalrats\\p{L}*)[ \\t]*[,;:(-]?[ \\t]*(?:(?:auf|der|von)[ \\t]+)?(Liste[ \\t]+\\p{Lu}[\\p{L}-]*(?:[ \\t]+(?:und[ \\t]+)?\\p{Lu}[\\p{L}-]*){0,2})(?![\\p{L}])`,
  "gu"
);
var REMARK_HEADER_RE = /^(?:kommentare?|bemerkung(?:en)?|notiz(?:en)?|hinweise?|anmerkung(?:en)?|besonderheiten|sonderwünsche|wünsche|remarks?|notes?|comments?|special requests?)$/i;
var REMARK_RELIGION_ITEM_RE = /^(?:Christ|Christin|Christen)$/;
function remarkColumnReligion(text, spans, covered) {
  const lines = [];
  let pos = 0;
  for (const raw of text.split("\n")) {
    lines.push([pos, raw.replace(/\r$/, "")]);
    pos += raw.length + 1;
  }
  for (let li = 0; li < lines.length; li++) {
    const head = lines[li][1];
    const delim = [";", "	", "|"].find((d) => head.split(d).length >= 4);
    if (!delim) continue;
    const hcells = head.split(delim);
    const cols = hcells.map((c, i) => REMARK_HEADER_RE.test(c.trim().replace(/^["']|["']$/g, "")) ? i : -1).filter((i) => i >= 0);
    if (!cols.length) continue;
    for (let lj = li + 1; lj < lines.length; lj++) {
      const [lstart, line] = lines[lj];
      const cells = line.split(delim);
      if (cells.length !== hcells.length) {
        if (!line.trim()) break;
        continue;
      }
      for (const k of cols) {
        let off = lstart;
        for (let c = 0; c < k; c++) off += cells[c].length + 1;
        const cell = cells[k];
        let ioff = 0;
        for (const item of cell.split(",")) {
          const t = item.trim();
          if (REMARK_RELIGION_ITEM_RE.test(t)) {
            const at = off + ioff + item.indexOf(t);
            if (!covered(at, at + t.length)) add(spans, at, at + t.length, t, "RELIGION", 0.8);
          }
          ioff += item.length + 1;
        }
      }
    }
  }
}
function farGapOk(m, g) {
  const nl = m[0].search(/\r?\n/);
  if (nl < 0) return true;
  const body = m[0].slice(nl).replace(/^\r?\n/, "");
  const gap = body.slice(0, body.lastIndexOf(g)).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return gap.length <= 2 || gap.every((l) => !new RegExp("^\\p{Ll}", "u").test(l) && !/^(?:Seite|Page)\b/i.test(l));
}
function round8bSpans(text, spans) {
  const covered = (a, b) => spans.some((x) => x.start <= a && x.end >= b);
  const addG = (m, cat, score) => {
    const g = m[1];
    const at = m.index + m[0].lastIndexOf(g);
    if (!covered(at, at + g.length)) add(spans, at, at + g.length, g, cat, score);
  };
  for (const m of finditer(FAR_NAT_RE, text)) {
    const g = m[1], at = m.index + m[0].lastIndexOf(g);
    if (!farGapOk(m, g)) continue;
    for (const a of finditer(new RegExp(`(?:${NAT_DEMONYMS_DE}|${NAT_ADJ_EN})`, "gu"), g)) {
      if (!covered(at + a.index, at + a.index + a[0].length)) add(spans, at + a.index, at + a.index + a[0].length, a[0], "NATIONALITY", 0.85);
    }
  }
  for (const m of finditer(FAR_REL_RE, text)) if (farGapOk(m, m[1])) addG(m, "RELIGION", 0.85);
  for (const m of finditer(WORKS_COUNCIL_LIST_RE, text)) addG(m, "AFFILIATION", 0.8);
  remarkColumnReligion(text, spans, covered);
}
function round8Spans(text, spans) {
  const covered = (a, b) => spans.some((x) => x.start <= a && x.end >= b);
  const addAt = (g, m, cat, score = 0.8) => {
    const at = m.index + m[0].lastIndexOf(g);
    if (!covered(at, at + g.length)) add(spans, at, at + g.length, g, cat, score);
  };
  for (const m of finditer(PLATE_WRAP_RE, text)) {
    if (STANDARDS_PREFIXES.has(m[0].split("-", 1)[0].toLowerCase()) && !plateCueBefore(text, m.index)) continue;
    if (!plateVehicleCueBefore(text, m.index)) continue;
    if (/^\s*,\s*\d/.test(text.slice(m.index + m[0].length))) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "PLATE", 0.8);
  }
  for (const m of finditer(PLATE_SPACED_RE, text)) {
    if (STANDARDS_PREFIXES.has(m[0].split(/[ \t]/, 1)[0].toLowerCase()) || /^\s*,\s*\d/.test(text.slice(m.index + m[0].length))) continue;
    if (!plateVehicleCueBefore(text, m.index) || spans.some((x) => x.category === "PLATE" && x.start <= m.index && x.end >= m.index + m[0].trim().length)) continue;
    add(spans, m.index, m.index + m[0].trim().length, m[0].trim(), "PLATE", 0.8);
  }
  for (const m of finditer(PLATE_NUMERIC_RE, text)) {
    if (!PLATE_NUMERIC_CUE_RE.test(text.slice(Math.max(0, m.index - 60), m.index).replace(/[^\S\n]*\r?\n[^\S\n]*/g, " "))) continue;
    if (covered(m.index, m.index + m[0].length) && spans.some((x) => x.category === "PLATE" && x.start <= m.index && x.end >= m.index + m[0].length)) continue;
    add(spans, m.index, m.index + m[0].length, m[0], "PLATE", 0.8);
  }
  for (const m of finditer(ACCOUNT_PRODUCT_NR_RE, text)) {
    const g = m[1];
    const at = m.index + m[0].length - g.length;
    if (spans.some((x) => x.start < at + g.length && x.end > at && x.category !== "PHONE")) continue;
    add(spans, at, at + g.length, g, "ACCOUNT", 0.8);
  }
  for (const m of finditer(SORT_CODE_RE, text)) {
    if (SORT_CODE_LABEL_ABOVE_RE.test(text.slice(Math.max(0, m.index - 24), m.index)) && !covered(m.index, m.index + m[0].length)) add(spans, m.index, m.index + m[0].length, m[0], "ACCOUNT", 0.85);
  }
  for (const re of [GEBUERTIG_RE, YEAR_IN_PLACE_RE, BIRTHPLACE_PAIR_RE, BIRTH_DATE_ORT_NOCOLON_RE]) {
    for (const m of finditer(re, text)) addAt(m[1], m, "BIRTH_PLACE", 0.8);
  }
  for (const m of finditer(NATIONALITIES_FIELD_RE, text)) {
    const list = m[1], base = m.index + m[0].indexOf(list);
    for (const a of finditer(new RegExp(NAT_LIST_ADJ, "gu"), list)) {
      if (!covered(base + a.index, base + a.index + a[0].length)) add(spans, base + a.index, base + a.index + a[0].length, a[0], "NATIONALITY", 0.85);
    }
  }
  for (const m of finditer(NAT_COPULA_FAMILY_RE, text)) {
    for (const g of [m[1], m[2]]) if (g) addAt(g, m, "NATIONALITY", 0.8);
  }
  for (const m of finditer(NATIONALITY_PAREN_RE, text)) {
    const base = m.index + m[0].indexOf(m[1]);
    for (const a of finditer(new RegExp(NAT_LIST_ADJ, "gu"), m[1])) {
      if (!covered(base + a.index, base + a.index + a[0].length)) add(spans, base + a.index, base + a.index + a[0].length, a[0], "NATIONALITY", 0.8);
    }
  }
  for (const m of finditer(NAT_LABEL_FAR_RE, text)) addAt(m[1], m, "NATIONALITY", 0.8);
  for (const m of finditer(STATELESS_RE, text)) addAt(m[1], m, "NATIONALITY", 0.8);
  for (const m of finditer(ORIGIN_STAEMMIG_RE, text)) {
    if (!covered(m.index, m.index + m[0].length)) add(spans, m.index, m.index + m[0].length, m[0], "NATIONALITY", 0.8);
  }
  for (const m of finditer(RELIGION_PAREN_RE, text)) {
    const v = m[1].trim();
    if (/^(?:siehe|s\.|vgl|z\.[ ]?b|ggf|optional|freiwillig|k\.?a\.?|keine|nein|ja)(?![\p{L}])/iu.test(v) || /^\d/.test(v) || isAbsenceValue(v)) continue;
    addAt(v, m, "RELIGION", 0.8);
  }
  for (const m of finditer(UNION_JOIN_RE, text)) addAt(m[1] || m[2], m, "AFFILIATION", 0.8);
  for (const m of finditer(UNION_BARE_RE, text)) addAt(m[1], m, "AFFILIATION", 0.8);
  for (const m of finditer(KIST_PHRASE_RE, text)) addAt(m[1], m, "RELIGION", 0.8);
  for (const m of finditer(KEYSAFE_CODE_RE, text)) addAt(m[1], m, "CREDENTIAL", 0.85);
  for (const m of finditer(LOGIN_KENNUNG_RE, text)) addAt(m[1], m, "CREDENTIAL", 0.8);
  for (const m of finditer(ACCESS_ID_RE, text)) {
    if (/\d/.test(m[1])) addAt(m[1], m, "ONLINE_ID", 0.8);
  }
  for (const m of finditer(OIDC_SUB_RE, text)) addAt(m[1], m, "ONLINE_ID", 0.8);
}
var HEALTH_NEXT_FIELD_RE = new RegExp(`[ \\t]+[${CAP}][${LOW}\\-]{3,}(?:[ \\t][${CAP}]?[${LOW}]+)?:(?:[ \\t]|$)`);
var HEALTH_HEADER_RE = new RegExp(
  `(?:^|[.\\s])(?<head>${HEALTH_BLOCK_HEADERS.join("|")})${BR}[^:\\n]{0,25}:\\s*(?<inline>[^\\n]*)\\r?\\n?$`,
  "i"
);
var FIELD_LABEL_RE = new RegExp(`^\\s*[${CAP}][A-Za-z\xE4\xF6\xFC\xDF\\u0300-\\u036F .\\-/]{1,30}:\\s`);
var HEALTH_LINE_MARKERS = [
  "schwerbehind",
  "behinderung",
  "grad der behinderung",
  "gdb",
  "pflegegrad",
  "merkzeichen",
  "berufsunf\xE4hig",
  "arbeitsunf\xE4hig",
  "diagnos",
  "befund",
  "icd"
];
var LIST_MARKER_RE = new RegExp(`^\\s*(?:[-\u2013\u2022*\xB7\u25AA]|\\d{1,2}[.)]|[a-z][.)])\\s`);
function search(re, s) {
  return nonGlobal(re).exec(s);
}
var PROSE_LINE_RE = /\b(?:ist|sind|wird|werden|wurde|wurden|hat|haben|war|waren|liegt|liegen|bitte|bitten|wir|ich|sie|ihr|kann|können|soll|sollen|muss|müssen|zeigt|zeigte|ergab|besteht|bestehen|steht|stehen|erfolgt|erfolgte|folgt|is|are|was|were|has|have|please|we|the|and|with|that|this)\b/i;
function lineIsProse(line) {
  return line.trim().split(/\s+/).length >= 8 && PROSE_LINE_RE.test(line);
}
function lineHasHealthSignal(line) {
  const strong = search(ICD10_RE, line) || search(HEALTH_TERM_RE, line);
  if (lineIsProse(line)) return false;
  const m = matchAt0(LIST_MARKER_RE, line);
  if (m && !/^\s*(?:\d{1,2}[.)]|[a-z][.)])\s/.test(line)) return true;
  if (strong) return true;
  const low = line.toLowerCase();
  return HEALTH_LINE_MARKERS.some((mk) => low.includes(mk));
}
function splitLinesKeepEnds(text) {
  const lines = [];
  let i = 0;
  while (i < text.length) {
    const j = text.indexOf("\n", i);
    if (j === -1) {
      lines.push(text.slice(i));
      break;
    }
    lines.push(text.slice(i, j + 1));
    i = j + 1;
  }
  return lines;
}
var leadingWS = (s) => s.length - s.replace(/^\s+/, "").length;
var rstripLen = (s) => s.replace(/\s+$/, "").length;
var BARE_DATE_VALUE_RE = /^[\s:\-–—]*(?:vom|am|dated|of)?[\s:]*\d{1,4}[./-]\d{1,2}[./-]\d{1,4}(?:[,\s]+\d{1,2}[:.]\d{2}(?::\d{2})?)?[\s.;]*$/i;
function isBareDateValue(v) {
  return BARE_DATE_VALUE_RE.test(v);
}
function listMarkerEnd(line) {
  const m = matchAt0(LIST_MARKER_RE, line);
  if (m) return m[0].length;
  return leadingWS(line);
}
var AMBIGUOUS_HEADERS = /* @__PURE__ */ new Set([
  "befund",
  "befunde",
  "findings",
  "assessment",
  "history",
  "conditions",
  "treatment",
  "behandlung",
  "therapie",
  "beschwerden",
  "symptome",
  "symptoms",
  "anamnese",
  "auffrischung"
]);
function healthBlockRanges(text) {
  let docEvidence = null;
  const ranges = [];
  let pos = 0;
  let inBlock = false;
  for (const line of splitLinesKeepEnds(text)) {
    const start = pos;
    pos += line.length;
    const stripped = line.trim();
    let header = search(HEALTH_HEADER_RE, line);
    if (header && AMBIGUOUS_HEADERS.has(header.groups.head.toLowerCase())) {
      docEvidence ??= documentHasMedicalEvidence(text);
      if (!docEvidence) header = null;
    }
    if (header) {
      inBlock = true;
      const inline = header.groups.inline;
      if (inline.trim() && !isBareDateValue(inline) && !lineIsProse(inline)) {
        const vstart = start + line.indexOf(inline, header.index);
        const nf = HEALTH_NEXT_FIELD_RE.exec(inline);
        const vend = vstart + (nf && nf.index > 0 ? inline.slice(0, nf.index) : inline).replace(/\s+$/, "").length;
        ranges.push([vstart + leadingWS(inline), vend]);
      }
      continue;
    }
    if (inBlock) {
      if (!stripped) {
        inBlock = false;
        continue;
      }
      if (matchAt0(FIELD_LABEL_RE, line) && !search(HEALTH_HEADER_RE, line)) {
        inBlock = false;
        continue;
      }
      if (!lineHasHealthSignal(line)) continue;
      const cs = start + listMarkerEnd(line);
      const ce = start + rstripLen(line);
      if (ce > cs) ranges.push([cs, ce]);
    }
  }
  const TRAILING_QUALIFIER_RE = /(?:^|[\s,;])([\p{L}][\p{L}]{3,}(?:e|es|er|en|em|ische[snmr]?))[ \t]*$/u;
  for (let i = 0; i + 1 < ranges.length; i++) {
    const [s1, e1] = ranges[i];
    const [s2] = ranges[i + 1];
    if (s2 < e1) continue;
    const between = text.slice(e1, s2);
    if (!/^[ \t]*\r?\n[ \t]*$/.test(between)) continue;
    const seg = text.slice(s1, e1);
    const m = TRAILING_QUALIFIER_RE.exec(seg);
    if (!m) continue;
    const word = m[1];
    if (QUALIFIER_STOPWORDS.has(word.toLowerCase())) continue;
    const wordStart = s1 + seg.lastIndexOf(word);
    ranges[i] = [s1, wordStart];
    ranges[i + 1] = [wordStart, ranges[i + 1][1]];
  }
  return ranges.filter(([s, e]) => e > s);
}
var TABLE_HEADERS = {
  "name": "PERSON",
  "vorname": "PERSON",
  "nachname": "PERSON",
  "vor- und nachname": "PERSON",
  "anleger": "PERSON",
  "beg\xFCnstigte": "PERSON",
  "beg\xFCnstigter": "PERSON",
  "kunde": "PERSON",
  // Columns that hold a person but were not listed, so a two-header table containing one of them
  // never activated and every name in it stayed in the text. The column-header rule still needs
  // TWO recognised headers in a row, and a cell that spells out a company is skipped below, so
  // widening the vocabulary does not widen what a single stray word can trigger.
  "kundin": "PERSON",
  "bearbeiter": "PERSON",
  "bearbeiterin": "PERSON",
  "sachbearbeiter": "PERSON",
  "sachbearbeiterin": "PERSON",
  "mitarbeiter": "PERSON",
  "mitarbeiterin": "PERSON",
  "ansprechpartner": "PERSON",
  "ansprechpartnerin": "PERSON",
  "betreuer": "PERSON",
  "betreuerin": "PERSON",
  "berater": "PERSON",
  "beraterin": "PERSON",
  "unterzeichner": "PERSON",
  "empf\xE4nger": "PERSON",
  "absender": "PERSON",
  "auftraggeber": "PERSON",
  "auftragnehmer": "PERSON",
  "eigent\xFCmer": "PERSON",
  "inhaber": "PERSON",
  "mieter": "PERSON",
  "vermieter": "PERSON",
  "patient": "PERSON",
  "patientin": "PERSON",
  "versicherter": "PERSON",
  "versicherte": "PERSON",
  "antragsteller": "PERSON",
  "antragstellerin": "PERSON",
  "teilnehmer": "PERSON",
  "gesellschafter": "PERSON",
  "gesch\xE4ftsf\xFChrer": "PERSON",
  "verfasser": "PERSON",
  "autor": "PERSON",
  "zust\xE4ndig": "PERSON",
  "erstellt von": "PERSON",
  "ge\xE4ndert von": "PERSON",
  "mandant": "PERSON",
  "zeichner": "PERSON",
  "full name": "PERSON",
  "first name": "PERSON",
  "last name": "PERSON",
  "surname": "PERSON",
  "customer": "PERSON",
  "customer name": "PERSON",
  "client": "PERSON",
  "owner": "PERSON",
  "assignee": "PERSON",
  "contact": "PERSON",
  "responsible": "PERSON",
  "author": "PERSON",
  "recipient": "PERSON",
  "sender": "PERSON",
  "applicant": "PERSON",
  "tenant": "PERSON",
  "landlord": "PERSON",
  "participant": "PERSON",
  "signatory": "PERSON",
  "employee": "PERSON",
  // A date of DEATH is as identifying as a date of birth, and a death certificate, an Erbschein
  // and a Nachlass file are exactly the documents that carry both.
  "sterbedatum": "DOB",
  "todesdatum": "DOB",
  "todestag": "DOB",
  "verstorben am": "DOB",
  "date of death": "DOB",
  "deceased on": "DOB",
  "sterbeort": "BIRTH_PLACE",
  "geburtsdatum": "DOB",
  "geb.-datum": "DOB",
  "geb. datum": "DOB",
  "geburtstag": "DOB",
  "geburtsdat.": "DOB",
  "geb.datum": "DOB",
  "mandatsreferenz": "REG_ID",
  "wohnort": "ADDRESS",
  "ort": "ADDRESS",
  "anschrift": "ADDRESS",
  "adresse": "ADDRESS",
  "plz/ort": "ADDRESS",
  "plz, ort": "ADDRESS",
  "stra\xDFe": "ADDRESS",
  "plz": "ADDRESS",
  "postleitzahl": "ADDRESS",
  "personalnummer": "CUSTOMER_ID",
  "personal-nr": "CUSTOMER_ID",
  "personalnr": "CUSTOMER_ID",
  "mitarbeiternummer": "CUSTOMER_ID",
  "matrikelnummer": "CUSTOMER_ID",
  "versichertennummer": "HEALTH_INSURANCE",
  "versicherten-nr": "HEALTH_INSURANCE",
  "mandantennummer": "CUSTOMER_ID",
  "policennummer": "CUSTOMER_ID",
  // Person-record columns a membership, warranty or shipping export writes. Same vocabulary the
  // context rule above already trusts in prose; a column header is that label stood on end, and
  // leaving it out meant a member list exported to CSV carried every membership number in clear.
  "mitgliedsnummer": "CUSTOMER_ID",
  "mitglieds-nr": "CUSTOMER_ID",
  "mitgliedsnr": "CUSTOMER_ID",
  "sendungsnummer": "CUSTOMER_ID",
  "sendungs-nr": "CUSTOMER_ID",
  "trackingnummer": "CUSTOMER_ID",
  "buchungsnummer": "CUSTOMER_ID",
  "antragsnummer": "CUSTOMER_ID",
  "registriernummer": "CUSTOMER_ID",
  "registrierungsnummer": "CUSTOMER_ID",
  "schadennummer": "CUSTOMER_ID",
  "schadensnummer": "CUSTOMER_ID",
  "vertragsnummer": "CUSTOMER_ID",
  "versicherungsnummer": "CUSTOMER_ID",
  "z\xE4hlernummer": "CUSTOMER_ID",
  "zaehlernummer": "CUSTOMER_ID",
  "benutzerkennung": "CUSTOMER_ID",
  "kundenkennzeichen": "CUSTOMER_ID",
  "tracking number": "CUSTOMER_ID",
  "shipment number": "CUSTOMER_ID",
  "booking reference": "CUSTOMER_ID",
  "claim number": "CUSTOMER_ID",
  "subscriber number": "CUSTOMER_ID",
  "loyalty number": "CUSTOMER_ID",
  "warranty number": "CUSTOMER_ID",
  "application number": "CUSTOMER_ID",
  "verification code": "CREDENTIAL",
  "verifizierungscode": "CREDENTIAL",
  "best\xE4tigungscode": "CREDENTIAL",
  "sicherheitscode": "CREDENTIAL",
  "access code": "CREDENTIAL",
  "zugangscode": "CREDENTIAL",
  "tan": "CREDENTIAL",
  "otp": "CREDENTIAL",
  "one-time password": "CREDENTIAL",
  "passcode": "CREDENTIAL",
  "pin": "CREDENTIAL",
  "pin code": "CREDENTIAL",
  "pincode": "CREDENTIAL",
  "pin-code": "CREDENTIAL",
  "geheimzahl": "CREDENTIAL",
  "zugangs-pin": "CREDENTIAL",
  "t\xFCr-pin": "CREDENTIAL",
  "schl\xFCssel": "CREDENTIAL",
  "schluessel": "CREDENTIAL",
  "schl\xFCsselcode": "CREDENTIAL",
  "schl\xFCsseltresor": "CREDENTIAL",
  "tresorcode": "CREDENTIAL",
  "keysafe": "CREDENTIAL",
  "key code": "CREDENTIAL",
  "safe code": "CREDENTIAL",
  "iban": "IBAN",
  "bic": "BIC",
  "swift": "BIC",
  "swift-bic": "BIC",
  "konto": "ACCOUNT",
  "kontonummer": "ACCOUNT",
  "konto-nr": "ACCOUNT",
  "bankdaten": "ACCOUNT",
  "kundennr.": "CUSTOMER_ID",
  "kundennr": "CUSTOMER_ID",
  "kundennummer": "CUSTOMER_ID",
  "kunden-nr": "CUSTOMER_ID",
  "referenz": "CUSTOMER_ID",
  "e-mail": "EMAIL",
  "email": "EMAIL",
  "mail": "EMAIL",
  "telefon": "PHONE",
  "tel.": "PHONE",
  "tel": "PHONE",
  "mobil": "PHONE",
  "steuer-id": "TAX_ID",
  "steuernummer": "TAX_ID",
  "sv-nr": "SV_ID",
  "sv-nummer": "SV_ID",
  "geburtsort": "BIRTH_PLACE",
  "staatsangeh\xF6rigkeit": "NATIONALITY",
  "nationalit\xE4t": "NATIONALITY",
  "konfession": "RELIGION",
  "religion": "RELIGION",
  "glaube": "RELIGION",
  "gewerkschaft": "AFFILIATION",
  "partei": "AFFILIATION",
  "diagnose": "HEALTH",
  "diagnosen": "HEALTH",
  // Health FIELD labels, as a two-column form or a spreadsheet writes them. The value beside them
  // is a health statement whatever words it uses ("Leichte Rückenprobleme, Trainer bitte
  // informieren"), which no term list can anticipate — the label is what says so.
  "gesundheitshinweis": "HEALTH",
  "gesundheitshinweise": "HEALTH",
  "gesundheitsangabe": "HEALTH",
  "gesundheitsangaben": "HEALTH",
  "gesundheitszustand": "HEALTH",
  "vorerkrankung": "HEALTH",
  "vorerkrankungen": "HEALTH",
  "allergien": "HEALTH",
  "allergie": "HEALTH",
  "unvertr\xE4glichkeiten": "HEALTH",
  "medikamente": "HEALTH",
  "medikation": "HEALTH",
  "beschwerden": "HEALTH",
  "befund": "HEALTH",
  "behandlung": "HEALTH",
  "health information": "HEALTH",
  "medical condition": "HEALTH",
  "medical conditions": "HEALTH",
  "allergies": "HEALTH",
  "medications": "HEALTH",
  "diagnosis": "HEALTH",
  "pre-existing conditions": "HEALTH",
  // English and export-key spellings. The map was almost entirely German, so a JSON or CSV export
  // written by an English-language system named its columns in words nothing here recognised.
  "date of birth": "DOB",
  "dob": "DOB",
  "birth date": "DOB",
  "birthdate": "DOB",
  "birthday": "DOB",
  "born": "DOB",
  "address": "ADDRESS",
  "street": "ADDRESS",
  "city": "ADDRESS",
  "postal code": "ADDRESS",
  "zip": "ADDRESS",
  "zip code": "ADDRESS",
  "postcode": "ADDRESS",
  "phone": "PHONE",
  "phone number": "PHONE",
  "telephone": "PHONE",
  "mobile": "PHONE",
  "cell": "PHONE",
  "fax": "PHONE",
  "e mail": "EMAIL",
  "email address": "EMAIL",
  "mail address": "EMAIL",
  "mietvertrag": "CUSTOMER_ID",
  "kaufvertrag": "CUSTOMER_ID",
  "vertrag": "CUSTOMER_ID",
  "police": "CUSTOMER_ID",
  "leid": "ONLINE_ID",
  "euid": "ONLINE_ID",
  "matrikel": "CUSTOMER_ID",
  "matriculation": "CUSTOMER_ID",
  "samaccountname": "ONLINE_ID",
  "userprincipalname": "ONLINE_ID",
  "upn": "ONLINE_ID",
  "pkv-vers-nr": "HEALTH_INSURANCE",
  "pkv-nr": "HEALTH_INSURANCE",
  "gkv-nr": "HEALTH_INSURANCE",
  "pkv-versichertennr": "HEALTH_INSURANCE",
  "customer id": "CUSTOMER_ID",
  "customer number": "CUSTOMER_ID",
  "client id": "CUSTOMER_ID",
  "account id": "CUSTOMER_ID",
  "member id": "CUSTOMER_ID",
  "membership number": "CUSTOMER_ID",
  // Present in the CONTEXT vocabulary but missing here, so a JSON or CSV export naming the field
  // outright ("account_number": "AC-994102837") read as nothing at all — and the bare digit run
  // inside it was picked up as an ACCOUNT instead, i.e. the prefix stayed in the document.
  "account number": "ACCOUNT",
  "account no": "ACCOUNT",
  "ticket number": "REG_ID",
  "ticket_number": "REG_ID",
  "reference": "CUSTOMER_ID",
  "reference number": "CUSTOMER_ID",
  "record id": "CUSTOMER_ID",
  "case id": "REG_ID",
  "case number": "REG_ID",
  "ticket id": "REG_ID",
  "request id": "REG_ID",
  "aktenzeichen": "REG_ID",
  "az": "REG_ID",
  "vorgangsnummer": "REG_ID",
  "tax id": "TAX_ID",
  "tax number": "TAX_ID",
  "vat id": "VAT_ID",
  "ssn": "TAX_ID",
  "social security number": "TAX_ID",
  "national insurance number": "SV_ID",
  "personnummer": "SV_ID",
  "personal id": "ID_CARD",
  "id number": "ID_CARD",
  "passport": "ID_CARD",
  "passport number": "ID_CARD",
  "ausweisnummer": "ID_CARD",
  "personalausweis": "ID_CARD",
  "card number": "CREDIT_CARD",
  "credit card": "CREDIT_CARD",
  "kartennummer": "CREDIT_CARD",
  "nationality": "NATIONALITY",
  "citizenship": "NATIONALITY",
  "place of birth": "BIRTH_PLACE",
  "birthplace": "BIRTH_PLACE",
  "kennzeichen": "PLATE",
  "license plate": "PLATE",
  "plate": "PLATE",
  // Account handles and secrets standing as a field label.
  "username": "ONLINE_ID",
  "user name": "ONLINE_ID",
  "benutzername": "ONLINE_ID",
  "login name": "ONLINE_ID",
  "user id": "ONLINE_ID",
  "userid": "ONLINE_ID",
  "nutzername": "ONLINE_ID",
  "anmeldename": "ONLINE_ID",
  "passwort": "CREDENTIAL",
  "password": "CREDENTIAL",
  "kennwort": "CREDENTIAL",
  "api key": "CREDENTIAL",
  "api token": "CREDENTIAL",
  "access token": "CREDENTIAL",
  "session id": "CREDENTIAL",
  "session token": "CREDENTIAL"
};
var KEY_VALUE_RE = /^[ \t]*["'`]?([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F0-9 _.\-/]{1,30}?)["'`]?[ \t]*[:=][ \t]*["'`]?([^"'`,;\n\v\f\r}\]]{1,60}?)["'`]?[ \t]*[,;]?[ \t]*$/gm;
var KEY_VALUE_PIPE_RE = (
  // eslint-disable-next-line no-misleading-character-class -- deliberate: Unicode combining-diacritic range for accented names, not a bug
  /^[ \t]*([A-Za-zÀ-ɏ\u0300-\u036F][A-Za-zÀ-ɏ\u0300-\u036F0-9 _.\-/]{1,30}?)[ \t]*\|[ \t]*([^|\n\v\f\r]{1,60}?)[ \t]*$/gm
);
function normaliseKey(key) {
  return key.normalize("NFC").replace(/[\u2010-\u2015\u2212\u00AD]/g, "-").replace(/\u00A0/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase().replace(/[.:]+$/, "");
}
var RECORD_REF_KEYS = /* @__PURE__ */ new Set([
  "az",
  "aktenzeichen",
  "vorgangsnummer",
  "case id",
  "case number",
  "ticket id",
  "request id",
  "reference",
  "reference number",
  "record id"
]);
var CASE_FILE_KEYS = RECORD_REF_KEYS;
var TYPE_TOKEN_RE = /^(?:string|str|integer|int|number|numeric|float|double|decimal|bool(?:ean)?|date|datetime|timestamp|time|text|char|varchar|nvarchar|uuid|guid|enum|array|object|json|blob|binary|serial|identity)(?:\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\))?$/i;
var FORMAT_MASK_RE = /^(?=.*[A-Za-z#9xX])[YMDHhSsXx#9NAZ_?*\s./:+()-]{4,}$/;
var FILLER_RE = /^(?:tbd|tba|todo|xxx+|n\/?a|none|null|nil|undefined|placeholder|example|sample|value|beispiel|muster|k\.?a\.?|keine? angabe)$/i;
var SECRET_PLACEHOLDER_RE = /^(?:replace[-_ ]?me|change[-_ ]?me|your[-_ ]|insert[-_ ]|enter[-_ ]|dummy|redacted|sample[-_]|example[-_]|fake[-_]|test[-_]?(?:key|token|secret|password))/i;
var TEMPLATE_TOKEN_RE = /^(?:«[^»]*»|\{\{[^}]*\}\}|<[^>]*>|\[[^\]]*\]|\$\{[^}]*\}|%[^%\s]+%)$/;
function isPlaceholderValue(value) {
  const v = String(value || "").trim();
  if (!v) return true;
  if (TEMPLATE_TOKEN_RE.test(v)) return true;
  if (TYPE_TOKEN_RE.test(v)) return true;
  if (FILLER_RE.test(v)) return true;
  if (SECRET_PLACEHOLDER_RE.test(v)) return true;
  if (/([YMDXNZ#9])\1/i.test(v) && FORMAT_MASK_RE.test(v)) return true;
  return false;
}
var KEY_VALUE_TITLE_RE = new RegExp(`^(?:${TITLE}${HS}+)+`);
function keyValueSpans(text) {
  const spans = [];
  for (const m of finditer2(KEY_VALUE_RE, KEY_VALUE_PIPE_RE, text)) {
    const cat = TABLE_HEADERS[normaliseKey(m[1])];
    if (!cat) continue;
    let value = m[2].split("|", 1)[0].trim();
    if (cat === "HEALTH") {
      const nf = HEALTH_NEXT_FIELD_RE.exec(value);
      if (nf && nf.index > 0) value = value.slice(0, nf.index).trim();
    } else {
      for (const nf of value.matchAll(new RegExp(HEALTH_NEXT_FIELD_RE.source, "g"))) {
        if (nf.index > 0 && TABLE_HEADERS[normaliseKey(nf[0].trim().replace(/:\s*$/, ""))]) {
          value = value.slice(0, nf.index).trim();
          break;
        }
      }
    }
    if (!value || value.length < 2 || /^[{[\]]/.test(value)) continue;
    if (/^(?:null|none|n\/a|-+|true|false)$/i.test(value)) continue;
    if (isPlaceholderValue(value)) continue;
    {
      const g = headerGuard(m[1]);
      if (g && guardRejects(g, value)) continue;
    }
    if ((cat === "CREDENTIAL" || cat === "ONLINE_ID") && /\s/.test(value)) continue;
    if (cat === "PERSON") {
      const bare = value.replace(KEY_VALUE_TITLE_RE, "") || value;
      if (!nameOk(bare) || vocabularyVerdict(bare, "PERSON", looksLikeGivenName) === "drop") continue;
    }
    const at = m.index + m[0].indexOf(m[2]) + (m[2].length - m[2].trimStart().length);
    const span = new PiiSpan(at, at + value.length, cat, value, 0.8, "table");
    if (RECORD_REF_KEYS.has(normaliseKey(m[1]))) {
      span.forceReview = true;
      span.recordRef = true;
      if (CASE_FILE_KEYS.has(normaliseKey(m[1]))) span.caseFileRef = true;
    }
    spans.push(span);
  }
  return spans;
}
var DELIMITERS = ["	", "|", ";", ","];
function splitOn(line, delim) {
  const parts = [];
  let off = 0;
  for (const cell of line.split(delim)) {
    parts.push([off, cell]);
    off += cell.length + delim.length;
  }
  return parts;
}
function splitCells(line) {
  for (const delim of DELIMITERS) {
    if (!line.includes(delim)) continue;
    const parts = splitOn(line, delim);
    if (parts.length >= 2) return parts;
  }
  const cells = [];
  for (const m of finditer(/[^ ]+(?: [^ ]+)*/g, line)) cells.push([m.index, m[0]]);
  return cells.length >= 2 ? cells : null;
}
function isDelimited(line) {
  return DELIMITERS.some((d) => line.includes(d));
}
var ID_HEADER_NOUNS = /* @__PURE__ */ new Set([
  "matrikel",
  "patient",
  "patienten",
  "vertrag",
  "vertrags",
  "confirmation",
  "reservation",
  "reservierungs",
  "booking",
  "buchung",
  "buchungs",
  "tenant",
  "guest",
  "schaden",
  "schadens",
  "vormerk",
  "fahrer",
  "kd",
  "kunden",
  "kunde",
  "personal",
  "mitarbeiter",
  "mitglied",
  "mitglieds",
  "member",
  "student",
  "studenten",
  "sch\xFCler",
  "versicherungs",
  "police",
  "policen",
  "mandanten",
  "mandats",
  "employee",
  "staff",
  "customer",
  "client",
  "fall",
  "akten",
  "bewerber",
  "teilnehmer",
  "versicherten",
  "kassen",
  "leser",
  "abo",
  "abonnenten",
  "auftrags",
  "ausweis",
  "pass",
  "passport",
  "fs",
  "f\xFChrerschein",
  "fuehrerschein",
  "pat",
  "proband",
  "probanden",
  "probandin",
  "studienteilnehmer",
  "bewohner",
  "klient",
  "klienten",
  // Abbreviated and further person-record nouns ("Mitgl.-Nr.", "Matr.-Nr.", "Pers.-Nr.", "Bew.-Nr.").
  "personnel",
  "vers",
  "antrags",
  "wbs",
  "mitgl",
  "matr",
  "pers",
  "bew",
  "pat",
  "mieter",
  "kind",
  "nutzer",
  "benutzer",
  "bewerbungs",
  "anmelde",
  "lieferanten",
  "debitoren",
  "kreditoren",
  "kandidaten",
  "besch\xE4ftigten",
  "lizenz",
  "akt",
  "arbeitnehmer",
  "mandat",
  "betreuungs",
  "fahrer",
  // Further record nouns a CRM, a case or an applicant list puts in front of "ID"/"Nr."/"No.":
  // the contact, the application, the depot, the pupil.
  "kontakt",
  "contact",
  "application",
  "applicant",
  "depot",
  "pupil",
  "resident",
  "claimant",
  "emp",
  "payroll",
  "badge",
  "worker",
  "ma",
  "policy",
  "subscriber",
  "insured",
  "dienst",
  "leistungs",
  "gast",
  "antrag",
  "vorgangs",
  "vorgang",
  "eigent\xFCmer",
  "eigentuemer",
  "aufnahme",
  "probanden",
  "proband",
  "labor",
  "rezept",
  "befund",
  "gewebe",
  "versorgungs",
  "hausanschluss"
]);
var ID_HEADER_RE = /^([\p{L}]+)[ .-]*(?:nr|nummer|no|number|id|kennung|ref|reference|referenz)$/u;
var NAME_HEADER_OWNERS = /* @__PURE__ */ new Set([
  "guest",
  "patient",
  "customer",
  "client",
  "employee",
  "member",
  "contact",
  "tenant",
  "student",
  "child",
  "parent",
  "full",
  "first",
  "last",
  "given",
  "family",
  "kind",
  "eltern",
  "mutter",
  "vater",
  "kunde",
  "kundin",
  "mitarbeiter",
  "mitarbeiterin",
  "patient",
  "patientin",
  "partner",
  "ehepartner",
  "antragsteller",
  "versicherungsnehmer",
  "sch\xFCler",
  "sch\xFClerin",
  "teilnehmer",
  "teilnehmerin"
]);
var PERSON_HEADER_WORDS = /* @__PURE__ */ new Set(["versicherungsnehmer", "versicherungsnehmerin", "vertragspartner", "vertragspartnerin", "sch\xFCler", "sch\xFClerin", "bewohner", "bewohnerin", "proband", "probandin", "klient", "klientin", "student", "studentin", "fahrer", "fahrerin", "gast", "guest", "besch\xE4ftigte", "besch\xE4ftigter", "bewerber", "bewerberin", "schuldner", "schuldnerin", "debtor"]);
var NAME_PARTS = /* @__PURE__ */ new Set(["name", "namen", "vorname", "vornamen", "nachname", "familienname", "rufname", "vor-", "nach-", "familien-"]);
function COMPOUND_NAME_PARTS_OK(k) {
  const parts = k.split(/[ ,/&+]+/).filter((x) => x && x !== "und");
  return parts.length >= 2 && parts.every((x) => NAME_PARTS.has(x));
}
var HEALTH_HEADER_COLUMN_RE = new RegExp(
  "^(?:pflegegrad|pflegestufe|gdb|grad der behinderung|behinderungsgrad|care level|(?:vor|grund|chronische)?erkrankung(?:en)?|krankheit(?:en)?|allergie(?:n)?|unvertr\xE4glichkeit(?:en)?|(?:gesundheitliche|medizinische|\xE4rztliche) (?:hinweise?|angaben|einschr\xE4nkung(?:en)?|besonderheiten|informationen)|gesundheits(?:angaben|zustand|hinweise?|daten)|befunde?|anamnese|medical (?:notes|conditions?|history)|health (?:notes|conditions?|information)|diagnosis|allergies|disability|(?:letzte[rn]? |n\xE4chste[rn]? )?impfung(?:en)?|impfdatum|impfstatus|impf-?historie|last vaccination|vaccination (?:date|status|history)|immuni[sz]ation (?:date|status|history))$",
  "u"
);
function headerHeuristic(key) {
  const k = key;
  if (/^icd(?:[ -]?(?:10|11|9))?(?:[ -]?(?:code|gm|kode))?$/.test(k)) return "HEALTH";
  if (!k || k.length > 40 || /[\d@]/.test(k) || k.split(" ").length > 4) return null;
  if (new RegExp("^(?:haupt|neben|entlass\\p{L}*|aufnahme)?diagnos(?:e|en)(?![\\p{L}])", "u").test(k) || /^(?:dauer)?medikation(?![\p{L}])/u.test(k)) return "HEALTH";
  if (HEALTH_HEADER_COLUMN_RE.test(k)) return "HEALTH";
  if (/\biban\b/.test(k)) return "IBAN";
  if (/\be-?mail\b/.test(k)) return "EMAIL";
  if (/^(?:tel|telefon|telefonnummer|phone|mobil|mobile|handy)\b/.test(k)) return "PHONE";
  if (/^(?:geburtsdatum|geb\.?-?\s?datum|date of birth)\b/.test(k)) return "DOB";
  if (/^staatsang/.test(k) || /^(?:nationalit|citizenship\b|nationality\b)/.test(k)) return "NATIONALITY";
  if (/^(?:geb(?:urts?)?[ .-]*(?:dat(?:um)?|tag|am)?|geburt|geboren(?: am)?|d\.?o\.?b|birth ?date|birthday)(?![\p{L}])/u.test(k) && !/ort(?![\p{L}])/u.test(k)) return "DOB";
  if (/^(?:geburtsort|geb[ .-]*ort|place of birth|birth ?place|geburtsstadt)(?![\p{L}])/u.test(k)) return "BIRTH_PLACE";
  if (/^(?:kvnr|kv[ .-]*nr|kranken(?:versicherten|kassen)?[ .-]*(?:nr|nummer|id)|versicherten[ .-]*(?:id|nr|nummer)|health insurance (?:no|number|id))$/u.test(k)) return "HEALTH_INSURANCE";
  if (/^(?:social security|sozialversicherungs|sv)[ .-]*(?:no|number|nr|nummer)$/u.test(k)) return "SV_ID";
  if (/^(?:personalausweis|reisepass|identity card|id card)[ .-]*(?:nr|no|nummer|number)?$/u.test(k)) return "ID_CARD";
  if (/^(?:s ?a ?m ?account ?name|user ?principal ?name)$/.test(k)) return "ONLINE_ID";
  const nw = k.split(" ");
  if (/^(?:benutzer|nutzer|user|login|anmeldename|loginname|benutzerkonto|nutzerkonto|user account|samaccountname|upn)$/.test(k)) return "ONLINE_ID";
  if (/^(?:(?:quelle|quell|ziel|ziel|client|source|remote|user|nutzer|benutzer|absender|sender)[ -]?)?ip(?:[ -]?(?:adresse|address|addr))?$/.test(k) || /^ip[ -]?(?:adresse|address)$/.test(k)) return "ONLINE_ID";
  if (nw.length <= 4 && !/(?:^|[ -])(?:ip|mac|url|web|e-?mail|mail|www|internet|bank|iban|wallet)(?:[ -]|$)/u.test(k) && (/^(?:(?:ship(?:ping)?|bill(?:ing)?|deliver(?:y)?|home|work|mailing|postal|customer|contact|primary|secondary|company|private|business|invoice|residential|permanent|current|street)(?: to)?[ -])?(?:street|stra(?:ß|ss)e|adresse|address|anschrift)(?: (?:und|&|\/) ?(?:hausnr|hausnummer|nr|no|number)\.?)?$/u.test(k) || /^(?:[\p{L}]{4,}(?:adresse|anschrift)|stra(?:ß|ss)e(?: (?:und|&|\/) ?(?:hausnr|hausnummer|nr|no|number)\.?)?)$/u.test(k)) && !/^(?:ip|mail|url|web|bank|iban|e-?mail|ipv)[\p{L}]*(?:adresse|address)$/u.test(k)) return "ADDRESS";
  if (/^(?:nachname|vorname|name)$/.test(nw[0]) && (nw.length === 1 || nw.length === 2 && NAME_HEADER_OWNERS.has(nw[1]))) return "PERSON";
  if (/^erziehungsberechtigte/.test(k)) return "PERSON";
  if (nw.length <= 4 && COMPOUND_NAME_PARTS_OK(k)) return "PERSON";
  if (PERSON_HEADER_WORDS.has(k)) return "PERSON";
  const nm = /^([\p{L}]+) name$/u.exec(k);
  if (nm && NAME_HEADER_OWNERS.has(nm[1])) return "PERSON";
  if (/^(?:führerschein|fuehrerschein|fs)[ .-]*(?:nr|nummer)$/u.test(k)) return "ID_CARD";
  if (/^(?:passport|pass|ausweis)[ .-]*(?:nr|no|nummer|number)$/u.test(k)) return "ID_CARD";
  if (/^versicherten[ .-]*(?:nr|nummer)$/u.test(k)) return "HEALTH_INSURANCE";
  if (/^steuer(?:liche)?[ .-]*(?:id(?:nr|nummer|[ .-]*nr|[ .-]*nummer)?|identifikationsnummer|ident[ .-]*nr)$/u.test(k) || /^(?:tin|tax id|steuer[ .-]*nr|steuernummer)$/u.test(k)) return "TAX_ID";
  if (/^steuer[ .-]*id(?:nr)?(?: (?:und|&|bzw\.?))? ?st(?:euer)?[ .-]*(?:nr|nummer)$/u.test(k) || /^(?:st[ .-]?id|st[ .-]?nr|stnr)$/u.test(k)) return "TAX_ID";
  if (/^(?:ust|umsatzsteuer)[ .-]*(?:id|idnr|identifikationsnummer|ident[ .-]*nr|id[ .-]*nr|id[ .-]*nummer)$/u.test(k)) return "VAT_ID";
  if (/^konto(?:nummer|[ .-]*nr)?(?: (?:und|&|bzw\.?))? ?(?:vertrag|vertragsnummer|vertrags[ .-]*nr)$/u.test(k)) return "ACCOUNT";
  const im = ID_HEADER_RE.exec(k);
  if (im && ID_HEADER_NOUNS.has(im[1])) return "CUSTOMER_ID";
  return null;
}
var PEOPLE_EVIDENCE_CATS = /* @__PURE__ */ new Set(["PERSON", "EMAIL", "PHONE", "DOB", "ADDRESS", "IBAN", "TAX_ID", "HEALTH_INSURANCE", "SV_ID", "ID_CARD"]);
var NOT_ID_HEADER_RE = /(?:^(?:lfd\.?[ ]*)?nr\.?$|prüfung|pruefung|exam|bett|zimmer|raum|beleg|termin|platz|spind|fach\b|tisch|station|gleis|lead|ticket|order|bestell|sku|artikel|article|item|product|case\b|datum|date|zeit|uhr|time|betrag|eur\b|€|preis|summe|brutto|netto|saldo|menge|anzahl|stück|kwh|status|typ\b|art\b|bemerk|notiz|hinweis|kommentar|grund|beschreib|produkt|tarif|abteil|bereich|sparte|leistung|plz|ort\b|stadt|land\b|prozent|%|rate\b|miete|gehalt|lohn|alter|jahr|monat|tag\b|gruppe|klasse|team|ziel|quelle|kanal|bezeichnung|titel|name|firma|position|beruf|nationalit|geschlecht|anrede|schicht|stufe|note|score|wert|value|amount|price|total|count|comment|remark|description|department|title|status)/i;
var ID_WORD_HEADER_RE = /(?:nr\b|nr\.|nummer|\bno\b|\bid\b|-id\b|kennung|konto|mandat|zeichen|\baz\b|\bref|code|key|schlüssel|number|account|referenz)/i;
var ID_COLUMN_CELL_RE = /^(?=[^\s]*\d|.*\d{4})[A-Za-z0-9][A-Za-z0-9\-_/. ]{3,28}[A-Za-z0-9]$/;
function idColumnCell(t) {
  if (!t || t.length > 32 || t.split(/\s+/).length > 3) return false;
  if (!ID_COLUMN_CELL_RE.test(t) || /@/.test(t)) return false;
  if (FLAT_DATE_RE.test(t) || /^\d{1,2}[-. ]?[A-Za-zÄÖÜäöü]{3,9}\.?[-. ]?\d{2,4}$/.test(t) || /^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?$/.test(t)) return false;
  if (/^[+(]?0\d[\d\s()/.-]{6,}$/.test(t) || /^\+\d/.test(t)) return false;
  const digits = (t.match(/\d/g) || []).length;
  if (/^\d+$/.test(t.replace(/[ .-]/g, ""))) return digits >= 6;
  return digits >= 3 && /[A-Za-z]/.test(t);
}
var STAFF_HEADER_RE = /(?:bearbeiter|sachbearb|berater|betreuer|mitarbeiter|verantwortlich|zuständig|owner|assignee|handler|agent\b|prüfer|gutachter|arzt\b|behandler|ansprechpartner|auftragnehmer|auftraggeber|lieferant|firma|unternehmen|gegenseite|gegner|supplier|vendor|company|contractor|organisation|organization)/i;
var RECORD_REF_NOUNS = /* @__PURE__ */ new Set([
  "bestell",
  "order",
  "sendungs",
  "sendung",
  "tracking",
  "paket",
  "rechnungs",
  "rechnung",
  "invoice",
  "auftrags",
  "auftrag",
  "beleg",
  "ticket",
  "lead",
  "case",
  "mandate",
  "mandats",
  "mandat",
  "akten",
  "akte",
  "vorgangs",
  "vorgang",
  "fall",
  "schadens",
  "schaden",
  "vertrags",
  "vertrag",
  "contract",
  "darlehens",
  "darlehen",
  "kredit",
  "antrags",
  "antrag",
  "application",
  "buchungs",
  "booking",
  "bescheid",
  "urkunden",
  "gutachten",
  "claim",
  "incident",
  "request",
  "retouren",
  "rma",
  "lieferschein",
  "zahlungs",
  "transaktions",
  "transaction",
  "bestellung",
  "angebots",
  "angebot",
  "policen",
  "police",
  "reklamations",
  "reference",
  "ref",
  // R11 (partner): a subsidy / grant application reference ("KfW reference", "Förderantrag")
  "bafa",
  "f\xF6rder",
  "foerder",
  "f\xF6rderantrags",
  "zuschuss",
  "subsidy",
  "grant"
]);
var RECORD_REF_HEADER_RE = /^([\p{L}]+?)(?:[ .-]*(?:nr|nummer|no|number|id|ref|referenz|reference|zeichen|code|konto))?(?: (?:intern|extern|alt|neu))?$/u;
function isRecordRefHeader(header) {
  const k = normaliseKey(String(header || "")).replace(/\./g, "");
  if (!k || k.length > 30) return false;
  const m = RECORD_REF_HEADER_RE.exec(k);
  if (m && RECORD_REF_NOUNS.has(m[1])) return true;
  if (/^(?:kf ?w|bafa)(?: ?(?:antrag|ref|reference|referenz|nr|nummer|number|id|code))?$/.test(k)) return true;
  return /^(?:az|aktenz|aktenzeichen|gesch ?z|geschäftszeichen)(?: (?:intern|extern))?$/.test(k);
}
var STRONG_SUBJECT_HEADER_RE = /^(?:name|nachname|vorname|client|klient(?:in)?|mandant(?:in)?|kunde|kundin|patient(?:in)?|antragsteller(?:in)?|mieter(?:in)?|versicherungsnehmer(?:in)?|teilnehmer(?:in)?|schüler(?:in)?|student(?:in)?|bewerber(?:in)?|schuldner(?:in)?|debtor|customer|applicant|tenant|participant|member|mitglied|person|proband(?:in)?|bewohner(?:in)?|gast|guest|beschäftigte[rn]?)(?: .*)?$/u;
var hasStrongSubjectColumn = (cats, headers) => cats.some((c, i) => c === "PERSON" && STRONG_SUBJECT_HEADER_RE.test(normaliseKey(String(headers[i] || ""))));
var hasSubjectColumn = (cats, headers) => cats.some((c, i) => c === "PERSON" && !STAFF_HEADER_RE.test(String(headers[i] || "")));
function inferIdColumns(headers, cats, columns) {
  const evidence = new Set(cats.filter((c) => c && PEOPLE_EVIDENCE_CATS.has(c)));
  const subject = hasSubjectColumn(cats, headers);
  if (evidence.size < 2 && !subject) return cats;
  return cats.map((c, j) => {
    if (c || !headers[j]) return c;
    const h = String(headers[j]).trim();
    if (subject && h && isRecordRefHeader(h)) {
      const rc = (columns[j] || []).map((x) => String(x || "").trim()).filter(Boolean);
      if (rc.length >= 2 && rc.filter(idColumnCell).length / rc.length >= 0.7) return "REG_ID";
    }
    if (subject && /^(?:lfd\.?[ ]*)?nr\.?$/i.test(h)) {
      const nc = (columns[j] || []).map((x) => String(x || "").trim()).filter(Boolean);
      if (nc.length >= 3 && nc.filter((x) => /^[A-Za-z]{1,6}[-/ ]?[A-Za-z0-9/-]*\d{2,}$/.test(x) && /[A-Za-z]/.test(x) && idColumnCell(x)).length / nc.length >= 0.9 && new Set(nc).size / nc.length >= 0.9) return "REG_ID";
    }
    if (evidence.size < 2) return c;
    if (!h || NOT_ID_HEADER_RE.test(h)) return c;
    const cells = (columns[j] || []).map((x) => String(x || "").trim()).filter(Boolean);
    if (cells.length < 3) return c;
    const idWord = ID_WORD_HEADER_RE.test(h);
    const shaped = cells.filter(idColumnCell).length / cells.length;
    const distinct = new Set(cells).size / cells.length;
    if (shaped >= (idWord ? 0.7 : 0.9) && distinct >= (idWord ? 0.5 : 0.85)) return "CUSTOMER_ID";
    return c;
  });
}
var headerLookup = (cell) => {
  const raw = cell.normalize("NFC").trim().toLowerCase().replace(/[.:]+$/, "");
  const norm2 = normaliseKey(cell);
  const direct = TABLE_HEADERS[raw] || TABLE_HEADERS[norm2] || TABLE_HEADERS[norm2.replace(/\./g, "")] || headerHeuristic(norm2) || headerHeuristic(norm2.replace(/\./g, ""));
  if (direct) return direct;
  {
    const bare = norm2.replace(/\s*[([][^)\]]*[)\]]\s*$/, "");
    if (bare && bare !== norm2 && bare.length >= 3) {
      const c = headerLookup(bare);
      if (c && (ID_LIKE_HEADER_CATS.has(c) || c === "DOB" || c === "IBAN" || c === "EMAIL" || c === "PHONE")) return c;
    }
  }
  {
    const m = /^(alter|age)\s*(?:\/|und|&|,)\s*(.+)$|^(.+?)\s*(?:\/|und|&|,)\s*(alter|age)$/iu.exec(raw);
    if (m) {
      const other = m[2] || m[3];
      if (other && TABLE_HEADERS[other.trim()] === "DOB") return "DOB";
    }
  }
  const base = /^(.+?)(?: |\()(?:in|innen|r)\)?$/u.exec(norm2) || /^(.+?)\*in$/u.exec(norm2);
  if (base && base[1].length >= 4) return TABLE_HEADERS[base[1]] || headerHeuristic(base[1]) || null;
  const qual = /^(.+?)[ -](?:intern|extern|alt|neu|aktuell|old|new|internal|external|current)$/u.exec(norm2);
  if (qual) {
    const q = qual[1].replace(/\.$/, "");
    const c = TABLE_HEADERS[q] || headerHeuristic(q);
    if (c && ID_LIKE_HEADER_CATS.has(c)) return c;
  }
  return null;
};
var ID_LIKE_HEADER_CATS = /* @__PURE__ */ new Set(["CUSTOMER_ID", "REG_ID", "ID_CARD", "HEALTH_INSURANCE", "TAX_ID", "SV_ID"]);
var LONE_LOCALITY_RE = /^(?:ort|plz|wohnort|stadt|city|zip(?: code)?|postal code|postcode)$/;
var STREET_HEADER_RE = /stra(?:ß|ss)e|street|adress|anschrift/;
function dropLoneLocality(texts, cats) {
  const hasStreet = cats.some((c, i) => c === "ADDRESS" && texts[i] && STREET_HEADER_RE.test(normaliseKey(texts[i])) && (TABLE_HEADERS[texts[i].trim().toLowerCase().replace(/[.:]+$/, "")] || TABLE_HEADERS[normaliseKey(texts[i])]));
  if (hasStreet) return cats;
  return cats.map((c, i) => c === "ADDRESS" && texts[i] && LONE_LOCALITY_RE.test(normaliseKey(texts[i])) ? null : c);
}
var WEAK_REF_HEADERS = /* @__PURE__ */ new Set(["referenz", "reference", "reference number", "mietvertrag", "kaufvertrag", "vertrag", "police", "versicherung"]);
var ROW_KEY_NOUNS = /* @__PURE__ */ new Set(["schaden", "schadens", "fall"]);
var ID_SHAPE_RE = /^(?=\S*\d)[\p{L}\p{N}][\p{L}\p{N}\-_./:#]{3,39}$/u;
var DATE_OR_AMOUNT_RE = /^(?:\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d+[.,]\d{1,2})$/;
var ROW_KEY_RE = /^[A-Za-z]{1,6}[-_ ]?(?:\d{2}[-_])?\d{1,4}$/;
var SECRET_COLUMN_HEADERS = /* @__PURE__ */ new Set(["schl\xFCssel", "schluessel", "schl\xFCsselcode", "schl\xFCsseltresor", "tresorcode", "keysafe", "key code", "safe code"]);
var USER_COLUMN_SERVICE_RE = /^(?:svc|srv|sys|service|admin|administrator|root|system|backup|noreply|no-reply|test|guest|anonymous|scan|batch|job|bot)(?:[-_.0-9]|$)/i;
var USER_HANDLE_HEADER_RE = /^(?:samaccountname|sam account name|userprincipalname|user principal name|upn|username|user name|benutzername|login name|user id|userid|nutzername|anmeldename)$/;
function headerGuard(cell) {
  const raw = cell.trim().toLowerCase().replace(/[.:]+$/, "");
  const norm2 = normaliseKey(cell);
  if (WEAK_REF_HEADERS.has(raw) || WEAK_REF_HEADERS.has(norm2)) return "ref";
  if (headerLookup(cell) === "VAT_ID") return "vat";
  if (SECRET_COLUMN_HEADERS.has(raw) || SECRET_COLUMN_HEADERS.has(norm2)) return "secret";
  if (!TABLE_HEADERS[raw] && !TABLE_HEADERS[norm2] && headerHeuristic(norm2) === "ONLINE_ID" && /^(?:benutzer|nutzer|user|login|anmeldename|loginname|benutzerkonto|nutzerkonto|user account|samaccountname|upn)$/.test(norm2)) return "account";
  if ((TABLE_HEADERS[raw] === "ONLINE_ID" || TABLE_HEADERS[norm2] === "ONLINE_ID") && (USER_HANDLE_HEADER_RE.test(norm2) || USER_HANDLE_HEADER_RE.test(raw))) return "account";
  if (!TABLE_HEADERS[raw] && !TABLE_HEADERS[norm2] && headerHeuristic(norm2) === "CUSTOMER_ID") {
    const im = ID_HEADER_RE.exec(norm2);
    if (im && ROW_KEY_NOUNS.has(im[1])) return "rowkey";
  }
  return null;
}
function guardRejects(guard, content) {
  if (guard === "vat") return !/^[A-Za-z]{2}[ .-]?\d/.test(content) || (content.match(/\d/g) || []).length < 6;
  if (guard === "ref") return !ID_SHAPE_RE.test(content) || DATE_OR_AMOUNT_RE.test(content);
  if (guard === "rowkey") return ROW_KEY_RE.test(content);
  if (guard === "inferred") return !idColumnCell(content);
  if (guard === "secret") return /\s/.test(content) || !/\d/.test(content);
  if (guard === "account") return /\s/.test(content) || USER_COLUMN_SERVICE_RE.test(content);
  return false;
}
var _tableCacheText = null;
var _tableCache = null;
var TABLE_LINE_END_RE = /\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/g;
function tableLines(text) {
  const out = [];
  let i = 0;
  TABLE_LINE_END_RE.lastIndex = 0;
  let m;
  while ((m = TABLE_LINE_END_RE.exec(text)) !== null) {
    out.push([i, text.slice(i, m.index), m.index + m[0].length]);
    i = m.index + m[0].length;
  }
  if (i < text.length) out.push([i, text.slice(i), text.length]);
  return out;
}
function readCsvRecord(text, start, delim) {
  const cells = [];
  let i = start;
  const n = text.length;
  for (; ; ) {
    let cellStart = i;
    let content;
    let j = i;
    while (j < n && (text[j] === " " || text[j] === "	") && text[j] !== delim) j++;
    if (j < n && text[j] === '"') {
      let k = j + 1;
      let buf = "";
      for (; ; ) {
        if (k >= n) return null;
        if (text[k] === '"') {
          if (text[k + 1] === '"') {
            buf += '"';
            k += 2;
            continue;
          }
          break;
        }
        buf += text[k];
        k++;
      }
      cellStart = j + 1;
      content = buf;
      i = k + 1;
      while (i < n && text[i] !== delim && text[i] !== "\n" && text[i] !== "\r") i++;
    } else {
      while (i < n && text[i] !== delim && text[i] !== "\n" && text[i] !== "\r") i++;
      content = text.slice(cellStart, i);
    }
    cells.push([cellStart, content]);
    if (i < n && text[i] === delim) {
      i += delim.length;
      continue;
    }
    if (i < n && text[i] === "\r" && text[i + 1] === "\n") i += 2;
    else if (i < n) i += 1;
    return { cells, end: i };
  }
}
function rowFits(cells, width) {
  if (cells.length === width) return true;
  if (cells.length > width) return cells.slice(width).every(([, c]) => !c.trim());
  return cells.length >= 2 && cells.length >= Math.ceil(width * 0.6);
}
function tableHeaderCategory(cell) {
  const c = String(cell || "").trim();
  if (!c || isPlaceholderValue(c)) return null;
  return headerLookup(c) || null;
}
var tableHeaderGuard = (cell) => headerGuard(String(cell || ""));
function tableCellSpans(cat, abs, cell, role = null, guard = null) {
  const out = [];
  pushCell(out, cat, abs, cell, role, guard);
  return out.map(([s, e, c, content, r]) => {
    const span = new PiiSpan(s, e, c, content, 0.8, "table");
    if (r) span.nameRole = r;
    return span;
  });
}
function headerNameRole(cell) {
  const k = normaliseKey(String(cell || ""));
  if (/^(?:vorname|vornamen|rufname|first name|firstname|given name|forename)\b/.test(k)) return "given";
  if (/^(?:nachname|familienname|last name|lastname|surname|family name)\b/.test(k)) return "surname";
  return null;
}
function pushCell(spans, cat, abs, cell, role = null, guard = null) {
  const content = cell.trim();
  if (!cat || !content) return;
  if (guard && guardRejects(guard, content)) return;
  if (cat === "HEALTH" && (isAbsenceValue(content) || /^(?:ja|nein|yes|no|true|false|x|✓|✗|☐|☒)$/i.test(content))) return;
  if (!/[\p{L}\p{N}]/u.test(content)) return;
  if (cat === "PERSON" && COMPANY_TAIL_RE.test(content)) return;
  if (cat === "PERSON" && /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(content)) return;
  if (isPlaceholderValue(content)) return;
  let off = 0;
  for (const part of cell.split(/\r\n|[\n\r]/)) {
    const c = part.trim();
    if (c) {
      const s = abs + off + leadingWS(part);
      spans.push(role && cat === "PERSON" ? [s, s + c.length, cat, c, role] : [s, s + c.length, cat, c]);
    }
    off += part.length + 1;
    if (cell[off - 1] === "\r" && cell[off] === "\n") off += 1;
  }
}
var SCHEMA_COLUMN_RE = /^(?:typ|type|datentyp|data type|datatype|zugriff|access|pflichtfeld|required|standardwert|default|feldname|field name|nullable)$/;
var VALUE_CELL_RE = /@|\d{5,}|^\d{1,2}[./]\d{1,2}[./]\d{2,4}$|^\d{4}-\d{2}-\d{2}$/;
function rowHoldsValues(texts) {
  return texts.some((t) => t && VALUE_CELL_RE.test(String(t).trim()));
}
function pairsFieldNames(mapped) {
  const m = mapped.filter(Boolean);
  return m.length === 2 && mapped.length <= 3 && m[0] === m[1] && m[0] !== "PERSON" && m[0] !== "PHONE";
}
var FLAT_HOOKS = { headerCategory: tableHeaderCategory, recordRefHeader: isRecordRefHeader, hasSubjectColumn, hasStrongSubject: hasStrongSubjectColumn, headerRole: headerNameRole, headerGuard, pushCell, dropLocality: dropLoneLocality };
var HEADER_CELL_DATE_RE = /(?<![\d.])\d{1,2}[./]\d{1,2}[./]\d{2,4}(?![\d])/;
function scanTable(text) {
  if (_tableCacheText === text && _tableCache) return _tableCache;
  const spans = [];
  const ranges = [];
  let colCats = null;
  let colRoles = [];
  let colGuards = [];
  let colDelim = null;
  const lines = tableLines(text);
  let skipUntil = -1;
  for (let li = 0; li < lines.length; li++) {
    const [start, bare] = lines[li];
    if (start < skipUntil) continue;
    const cells = colCats && colDelim && bare.includes(colDelim) && rowFits(splitOn(bare, colDelim), colCats.length) && splitOn(bare, colDelim).length >= 3 ? splitOn(bare, colDelim) : splitCells(bare);
    if (cells === null) {
      colCats = null;
      continue;
    }
    let hcells = cells;
    let hrec = null;
    let hdelim = null;
    if ((bare.split('"').length - 1) % 2 === 1) {
      hdelim = DELIMITERS.find((d) => bare.includes(d)) || null;
      const r = hdelim && readCsvRecord(text, start, hdelim);
      if (r && r.end > start + bare.length) {
        hrec = r;
        hcells = r.cells.map(([a, c]) => [a - start, c]);
      }
    }
    const joinHeader = (c) => c.replace(/\s*[\r\n]+\s*/g, "");
    const mapped = hcells.map(([, c]) => headerLookup(joinHeader(c).replace(/^"+|"+$/g, "")));
    const describesFields = hcells.some(([, c]) => c.trim() && isPlaceholderValue(c.trim())) || pairsFieldNames(mapped) || hcells.some(([, c]) => SCHEMA_COLUMN_RE.test(c.trim().toLowerCase())) || // Round 8: a form line written in column gaps ("Geburtsdatum: 02.11.1985   Geburtsort: Gdańsk   Staatsangehörigkeit:
    // polnisch") is key/value pairs, not a header row: read as one, the line above it became its "data" and put
    // "Geburtsname: …" under the nationality column while the real value went unmarked.
    hcells.filter(([, c]) => /^[^:\n]{2,40}:[ \t]*[^\s:]/.test(c.trim())).length >= 2 || // R12: a comma-split SENTENCE is no header row ("…laut Antrag: 17.08.1948, Staatsangehörigkeit deutsch, Geburtsort X."): a cell
    // that carries a calendar date is a value, and the header-row range would drop every finding on the line (birth place, nationality, DOB).
    hcells.some(([, c]) => HEADER_CELL_DATE_RE.test(c));
    if (!describesFields && mapped.filter(Boolean).length >= 2 && !rowHoldsValues(hcells.map(([, c]) => c))) {
      colCats = dropLoneLocality(hcells.map(([, c]) => joinHeader(c)), mapped);
      colRoles = hcells.map(([, c]) => headerNameRole(joinHeader(c)));
      colGuards = hcells.map(([, c]) => headerGuard(joinHeader(c)));
      colDelim = hrec ? hdelim : [";", ",", "	"].find((d) => bare.includes(d) && bare.split(d).length === cells.length) || null;
      if (colDelim) {
        const sample = [];
        for (let k = li + 1; k < lines.length && sample.length < 80; k++) {
          if (!lines[k][1].includes(colDelim)) break;
          sample.push(splitOn(lines[k][1], colDelim));
        }
        const before = colCats;
        colCats = inferIdColumns(hcells.map(([, c]) => joinHeader(c)), colCats, hcells.map((_, j) => sample.map((r) => r[j] ? r[j][1] : "")));
        colCats.forEach((c, j) => {
          if (c && !before[j]) colGuards[j] = "inferred";
        });
      }
      ranges.push([start, hrec ? hrec.end - 1 : start + bare.length]);
      if (hrec) skipUntil = hrec.end;
      continue;
    }
    if (!colCats) continue;
    if (colDelim && bare.includes('"')) {
      const rec = readCsvRecord(text, start, colDelim);
      if (rec && rec.end > start + bare.length) {
        skipUntil = rec.end;
        if (rowFits(rec.cells, colCats.length)) {
          rec.cells.forEach(([abs, cell], i) => {
            if (i < colCats.length) pushCell(spans, colCats[i], abs, cell, colRoles[i], colGuards[i]);
          });
        }
        continue;
      }
      if (rec) {
        if (rowFits(rec.cells, colCats.length)) {
          rec.cells.forEach(([abs, cell], i) => {
            if (i < colCats.length) pushCell(spans, colCats[i], abs, cell, colRoles[i], colGuards[i]);
          });
        }
        continue;
      }
    }
    if (isDelimited(bare) && !rowFits(cells, colCats.length)) continue;
    cells.forEach(([coff, cell], i) => {
      if (i < colCats.length) pushCell(spans, colCats[i], start + coff, cell, colRoles[i], colGuards[i]);
    });
  }
  flatTableScan(lines, FLAT_HOOKS, spans, ranges);
  _tableCacheText = text;
  _tableCache = { spans, ranges };
  return _tableCache;
}
function tableSpans(text) {
  return scanTable(text).spans.map(([s, e, cat, content, role]) => {
    const span = new PiiSpan(s, e, cat, content, 0.8, "table");
    if (role) span.nameRole = role;
    return span;
  });
}
function tableHeaderRanges(text) {
  return scanTable(text).ranges.slice();
}
function whitelistRanges(text) {
  const ranges = [];
  for (const m of finditer(ISIN_RE, text)) {
    if (hasContext(text, m.index, CTX.VAT)) continue;
    if (isinIsValid(m[0])) ranges.push([m.index, m.index + m[0].length]);
  }
  for (const m of finditer(WKN_RE, text)) {
    if (hasContext(text, m.index, CTX_WKN)) {
      ranges.push([m.index, m.index + m[0].length]);
    }
  }
  return ranges;
}

// ../extension/core/literal-matches.js
var WORD = /[\p{L}\p{Nd}_]/u;
var TERMINAL = Symbol("terminal");
function* literalNameMatches(text, values) {
  const root = /* @__PURE__ */ new Map();
  for (const value of values) {
    if (!value) continue;
    let node = root;
    for (let j = 0; j < value.length; j++) {
      if (!node.has(value[j])) node.set(value[j], /* @__PURE__ */ new Map());
      node = node.get(value[j]);
    }
    node.set(TERMINAL, true);
  }
  const wordAt3 = (i) => i < text.length && WORD.test(String.fromCodePoint(text.codePointAt(i)));
  const wordBefore = (i) => i > 0 && WORD.test(text.slice(i - (/[\uDC00-\uDFFF]/.test(text[i - 1]) && i > 1 ? 2 : 1), i));
  for (let i = 0; i < text.length; ) {
    if (wordBefore(i) || !root.has(text[i])) {
      i++;
      continue;
    }
    let node = root, best = -1;
    for (let j = i; j < text.length && node.has(text[j]); ) {
      node = node.get(text[j++]);
      if (!node.has(TERMINAL)) continue;
      let end = j;
      if (text.slice(j, j + 2) === "'s" && !wordAt3(j + 2)) end += 2;
      else if (text[j] === "s" && !wordAt3(j + 1)) end++;
      if (!wordAt3(end)) best = end;
    }
    if (best > i) {
      yield { index: i, 0: text.slice(i, best) };
      i = best;
    } else i++;
  }
}

// ../extension/core/letter-spaced.js
var GLYPH = "[^\\s](?:-[^\\s])?";
var RUN_RE = new RegExp(`(?<![^\\s])${GLYPH}(?: ${GLYPH}){3,}(?![^\\s])`, "gu");
var LINE_RUN_RE = new RegExp("(?<![^\\n])\\p{Lu}(?:\\n\\p{Lu}){4,}(?![^\\n])", "gu");
var TAXBOX_RE = /(?<=(?:^|\n)[^\n]*(?:steuer[ -]?id|steuerliche[ ]identifikationsnummer|tax[ -]?id)[^\n]*\n)\d(?:\n\d){10}(?![^\n])/giu;
var GAP_RE = /^[ ]{2,4}$/;
function boundaryBetween(a, b, joinedByHyphen) {
  if (joinedByHyphen) return false;
  if (/\d/.test(a) && new RegExp("\\p{L}", "u").test(b)) return true;
  if (new RegExp("\\p{L}", "u").test(a) && /\d/.test(b)) return true;
  if (a === "." && /[\p{L}\d]/u.test(b)) return true;
  if (new RegExp("\\p{Ll}", "u").test(a) && new RegExp("\\p{Lu}", "u").test(b)) return true;
  return false;
}
var TAIL_DIGITS_RE = /^ {2,4}\d(?: \d)?(?=[ \t]*(?:\r?\n|$))/;
function collapseLetterSpaced(text) {
  if (!text || text.length < 8) return null;
  const found = [];
  RUN_RE.lastIndex = 0;
  let m;
  while ((m = RUN_RE.exec(text)) !== null) {
    found.push([m.index, m.index + m[0].length]);
  }
  LINE_RUN_RE.lastIndex = 0;
  while ((m = LINE_RUN_RE.exec(text)) !== null) found.push([m.index, m.index + m[0].length]);
  TAXBOX_RE.lastIndex = 0;
  while ((m = TAXBOX_RE.exec(text)) !== null) found.push([m.index, m.index + m[0].length]);
  found.sort((a, b) => a[0] - b[0]);
  if (!found.length) return null;
  const runs = [];
  for (const r of found) {
    const last = runs[runs.length - 1];
    if (last && GAP_RE.test(text.slice(last[1], r[0]))) last[1] = r[1];
    else runs.push([r[0], r[1]]);
  }
  for (const r of runs) {
    const t = TAIL_DIGITS_RE.exec(text.slice(r[1], r[1] + 12));
    if (t && new RegExp("\\p{L}", "u").test(text[r[1] - 1])) r[1] += t[0].length;
  }
  let out = "";
  const map = [];
  const collapsedRuns = [];
  let pos = 0;
  for (const [s, e] of runs) {
    for (let i2 = pos; i2 < s; i2++) {
      out += text[i2];
      map.push(i2);
    }
    const start = out.length;
    let i = s;
    let prev = "";
    while (i < e) {
      const ch = text[i];
      if (ch === " " || ch === "\n" || ch === "\r") {
        let j = i;
        while (j < e && (text[j] === " " || text[j] === "\n" || text[j] === "\r")) j++;
        const gap = text.slice(i, j);
        if (/^ {2,}$/.test(gap)) {
          out += " ";
          map.push(i);
          prev = " ";
        }
        i = j;
        continue;
      }
      if (prev && prev !== " " && boundaryBetween(prev, ch, text[i - 1] === "-")) {
        out += " ";
        map.push(i);
      }
      out += ch;
      map.push(i);
      prev = ch;
      i++;
    }
    collapsedRuns.push([start, out.length]);
    pos = e;
  }
  for (let i = pos; i < text.length; i++) {
    out += text[i];
    map.push(i);
  }
  map.push(text.length);
  return { text: out, map, runs: collapsedRuns };
}
function mapBack(c, start, end) {
  return [c.map[start], c.map[end - 1] + 1];
}

// ../extension/core/composed-reading.js
var NEEDS_RE = /[̀-ͯ­]/;
var MARK_RE = /[̀-ͯ]/;
var LETTER_RE = new RegExp("\\p{L}", "u");
function composeReading(text) {
  if (!text || !NEEDS_RE.test(text)) return null;
  let out = "";
  const map = [];
  const ends = [];
  let changed = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === "\xAD" && i > 0 && i + 1 < n && LETTER_RE.test(text[i - 1]) && LETTER_RE.test(text[i + 1])) {
      changed = true;
      i++;
      continue;
    }
    if (i + 1 < n && MARK_RE.test(text[i + 1]) && LETTER_RE.test(ch)) {
      let j = i + 1;
      while (j < n && MARK_RE.test(text[j])) j++;
      const composed = text.slice(i, j).normalize("NFC");
      if (composed.length === 1) {
        out += composed;
        map.push(i);
        ends.push(j);
        changed = true;
        i = j;
        continue;
      }
    }
    out += ch;
    map.push(i);
    ends.push(i + 1);
    i++;
  }
  return changed ? { text: out, map, ends } : null;
}
function mapBackComposed(c, start, end) {
  return [c.map[start], c.ends[end - 1]];
}

// ../extension/core/repeated_values.js
var MIN_LENGTH = {
  ADDRESS: 8,
  PHONE: 6,
  FAX: 6,
  EMAIL: 5,
  IBAN: 12,
  BIC: 8,
  VAT_ID: 8,
  PERSON: 3,
  CUSTOMER_ID: 5,
  TAX_ID: 8,
  REG_ID: 6,
  ID_CARD: 6,
  SV_ID: 8,
  ACCOUNT: 6,
  PLATE: 5,
  DOB: 8,
  HEALTH_INSURANCE: 6,
  CREDENTIAL: 8,
  BIRTH_PLACE: 4
};
var CATEGORIES = new Set(Object.keys(MIN_LENGTH));
var WHOLE_ONLY = /* @__PURE__ */ new Set(["PERSON", "BIRTH_PLACE", "CUSTOMER_ID", "TAX_ID", "REG_ID", "ID_CARD", "SV_ID", "ACCOUNT", "PLATE", "DOB", "HEALTH_INSURANCE", "CREDENTIAL"]);
var DETERMINER_BEFORE_RE = /(?:^|[^\p{L}\p{N}])(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein|keine|keinen|keinem|keiner|keines|dieser|diese|dieses|diesen|diesem|jeder|jede|jedes|jeden|jedem|unser|unsere|unseren|unserem|unseres|unserer|mein|meine|meinen|meinem|meines|meiner|dein|deine|deinen|deinem|deines|deiner|ihr|ihre|ihren|ihrem|ihres|ihrer|sein|seine|seinen|seinem|seines|seiner|euer|eure|euren|eurem|eures|eurer|the|a|an)[^\S\r\n]+$/iu;
var NOBILIARY_ARTICLE_BEFORE_RE = /(?:^|[^\p{L}\p{N}])(?:von|van|vom|zu|zur|de|di)[^\S\r\n]+(?:der|den|dem|la|le)[^\S\r\n]+$/iu;
function determinerBlocksName(text, start) {
  const window = text.slice(Math.max(0, start - 24), start);
  if (!DETERMINER_BEFORE_RE.test(window)) return false;
  if (NOBILIARY_ARTICLE_BEFORE_RE.test(window)) return false;
  if (/(?:^|[^\p{L}\p{N}])an[^\S\r\n]+$/iu.test(window)) {
    const next = text[start] || "";
    if (new RegExp("\\p{L}", "u").test(next) && !/[AEIOUÄÖÜaeiouäöü]/.test(next)) return false;
  }
  return true;
}
var ORG_BEFORE_RE = new RegExp("(?:gericht|kasse|bank|zentrum|center|centre|amt|universit\xE4t|university|klinikum|krankenhaus|verband|verein|stiftung|institut|schule|gymnasium|kirche|gemeinde|polizei|staatsanwaltschaft|versicherung|agentur|kammer|beh\xF6rde|ministerium|hochschule|akademie|kanzlei|jobcenter|landkreis|bistum|di\xF6zese|werke|stadtwerke|hospital|clinic|court|bank|council|notariat|melderegister|kirchenkreis|kirchengemeinde|pfarramt|rathaus|kreisverwaltung)[ \\t]+(?:\\p{Lu}[\\p{L}.-]*[ \\t]+){0,2}$", "iu");
var ORG_AFTER_RE = /^[ \t]+(?:GmbH|AG|e\.V\.|KG|OHG|UG|mbH|Co\.|eG|gGmbH|SE)(?![\p{L}])/u;
var FORM_TAIL = "[ \\t]*[,\xB7|\u2013\u2014-]?[ \\t]*(?:\\p{L}[^\\n.;:()]{0,70}?[,\xB7|\u2013\u2014-][ \\t]*|\\p{L}[\\p{L}-]*(?:[ \\t]+\\p{L}[\\p{L}-]*)?[ \\t]+)?(?:\\d{4,5}[ \\t]+)?$";
var LEGAL_FORM_LONG_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:GmbH(?:[ \\t]*&[ \\t]*Co\\.?[ \\t]*KG)?|gGmbH|mbH|OHG|UG[ \\t]*\\(haftungsbeschr\xE4nkt\\)|Ltd\\.?|Limited|LLC|Inc\\.?|PartG(?:[ \\t]*mbB)?|mbB)${FORM_TAIL}`, "iu");
var LEGAL_FORM_SHORT_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:AG|SE|KG|UG|eG|e\\.[ \\t]?V\\.)${FORM_TAIL}`, "u");
var LEGAL_FORM_SHORT_LOWER_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:AG|SE|KG|UG|eG|e\\.[ \\t]?V\\.)${FORM_TAIL}`, "iu");
function addressInLegalPersonLine(text, start) {
  let lineStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  if (new RegExp("^(?:\\p{L}[\\p{L}-]*[ \\t]*[,\xB7|\u2013\u2014-]?)?$", "u").test(text.slice(lineStart, start).trim()) && lineStart > 0) lineStart = text.lastIndexOf("\n", Math.max(0, lineStart - 2)) + 1;
  const before = text.slice(Math.max(lineStart, start - 130), start).replace(/\u00a0/g, " ").replace(/[ \t]*\n[ \t]*/g, " ");
  const m = LEGAL_FORM_LONG_RE.exec(before) || (before === before.toLowerCase() ? LEGAL_FORM_SHORT_LOWER_RE : LEGAL_FORM_SHORT_RE).exec(before);
  if (!m) return false;
  if (new RegExp("(?:^|[^\\p{L}])(?:Dr|Prof|Herrn?|Frau|Mr|Mrs|Ms)\\.?[ \\t]+\\p{Lu}", "u").test(before.slice(0, m.index))) return false;
  const tail = before.slice(m.index + m[0].search(/[,·|–—\-\s]/));
  return !new RegExp("(?:^|[^\\p{L}])(?:vertreten|vertretung|wohnhaft|represented|gesch\xE4ftsf\xFChrer\\p{L}*|managing|director|inhaber\\p{L}*|owner|herrn?|frau|mr|mrs|ms|dr|prof|z\\.[ \\t]?hd|attn|c\\/o|und|and|bei|von)(?![\\p{L}])", "iu").test(tail);
}
function hasLongCommonHead(token) {
  const low = String(token || "").toLowerCase().replace(/[^\p{L}]/gu, "");
  for (let len = 6; len <= Math.min(12, low.length - 3); len++) {
    const tail = low.slice(-len);
    if (GERMAN_COMMON_WORDS.has(tail) || COMMON_WORDS.has(tail)) return true;
  }
  return false;
}
function isAbstractVocabulary(word) {
  return new RegExp("^\\p{Lu}", "u").test(word) && !/-/.test(word) && !looksLikeGivenName(word) && hasLongCommonHead(word) && !/(?:recht|länder)$/i.test(word);
}
var WORD2 = /[\p{L}\p{Nd}_]/u;
var wordAt = (text, index) => {
  if (index < 0 || index >= text.length) return false;
  if (/[\uDC00-\uDFFF]/.test(text[index]) && index > 0) index--;
  return WORD2.test(String.fromCodePoint(text.codePointAt(index)));
};
function* occurrences(text, value) {
  for (let start = text.indexOf(value); start >= 0; start = text.indexOf(value, start + 1)) {
    const end = start + value.length;
    if (!wordAt(text, start - 1) && !wordAt(text, end)) yield [start, end];
  }
}
var LOOSE_SEED_CATS = /* @__PURE__ */ new Set(["TAX_ID", "VAT_ID"]);
var LOOSE_SEED_CAP = 60;
function* looseOccurrences(text, value) {
  const alnum = value.replace(/[^\p{L}\p{N}]/gu, "");
  if ((alnum.match(/\d/g) || []).length < 9 || alnum.length > 24) return;
  const re = new RegExp([...alnum].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[ \\t\\r\\n.\\-/]{0,3}"), "giu");
  for (const m of text.matchAll(re)) {
    const start = m.index, end = start + m[0].length;
    if (!wordAt(text, start - 1) && !wordAt(text, end)) yield [start, end];
  }
}
var upperBound = (values, value) => {
  let lo = 0, hi = values.length;
  while (lo < hi) {
    const mid = lo + hi >>> 1;
    if (values[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};
var Intervals = class {
  constructor(spans) {
    const ordered = spans.filter((s) => s.start < s.end).map((s) => [s.start, s.end]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    this.ranges = [];
    for (const [start, end] of ordered) {
      const last = this.ranges.at(-1);
      if (last && start <= last[1]) last[1] = Math.max(last[1], end);
      else this.ranges.push([start, end]);
    }
    this.starts = this.ranges.map(([start]) => start);
  }
  overlaps(start, end) {
    const i = upperBound(this.starts, start);
    return i > 0 && this.ranges[i - 1][1] > start || i < this.ranges.length && this.ranges[i][0] < end;
  }
  gaps(start, end) {
    let i = Math.max(0, upperBound(this.starts, start) - 1), cursor = start;
    const out = [];
    while (i < this.ranges.length && this.ranges[i][0] < end) {
      const [left, right] = this.ranges[i];
      if (left > cursor) out.push([cursor, Math.min(left, end)]);
      cursor = Math.max(cursor, right);
      if (cursor >= end) return out;
      i++;
    }
    if (cursor < end) out.push([cursor, end]);
    return out;
  }
};
function repeatedValueSpans(text, resolved, notThePerson = null) {
  const seeds = /* @__PURE__ */ new Map();
  for (const span of resolved) {
    if (span.accepted && span.source !== "coref" && !span.nameByContext && CATEGORIES.has(span.category) && span.text.length >= MIN_LENGTH[span.category] && // "Ehefrau", "Mandantin", "Betriebsrat" are roles, not people: a model that spanned one is
    // wrong, and repeating the mistake into every other occurrence only multiplies it.
    !(span.category === "PERSON" && isEnglishRoleWord(span.text.trim())) && !(span.category === "PERSON" && !/\s/.test(span.text.trim()) && isAbstractVocabulary(span.text.trim())) && // A birth place named once is the same place wherever else the document names it ("lebt
    // in Gdańsk", "Stadt Gießen") — but only a PLACE NAME travels: "Split" or "Essen" that was
    // accepted on a birth cue must not turn the verb/noun elsewhere into a mark.
    span.text.length >= MIN_LENGTH[span.category]) {
      let seed = span;
      if (span.category === "BIRTH_PLACE") {
        const head = span.text.split(",")[0].trim();
        if (head.length < MIN_LENGTH.BIRTH_PLACE) continue;
        seed = {
          category: span.category,
          text: head,
          score: span.score,
          // R8b: only a ONE-word place can be the ordinary word ("Essen"); "Halle (Saale)", "Bad Hersfeld" are names whose first word is common
          common: !/[\s-]/.test(head) && isCommonWord(head)
        };
      }
      seeds.set(`${seed.category}\0${seed.text}`, seed);
    }
  }
  const accepted = new Intervals(resolved.filter((s) => s.accepted));
  const declined = new Intervals(resolved.filter(explicitDecline));
  const doubted = /* @__PURE__ */ new Map();
  for (const span of resolved) {
    if (span.accepted || explicitDecline(span) || span.category !== "PERSON") continue;
    const key = `${span.start}:${span.end}:${span.text}`;
    doubted.set(key, true);
  }
  const extra = [];
  const looseBudget = { n: 0 };
  for (const seed of seeds.values()) {
    const nounRisk = seed.category === "PERSON" && !/\s/.test(seed.text.trim());
    const occ = LOOSE_SEED_CATS.has(seed.category) && ++looseBudget.n <= LOOSE_SEED_CAP ? [...occurrences(text, seed.text), ...looseOccurrences(text, seed.text)] : occurrences(text, seed.text);
    for (const [start, end] of occ) {
      if (notThePerson && seed.category === "PERSON" && notThePerson(text, start, end)) continue;
      if (seed.category === "ADDRESS" && addressInLegalPersonLine(text, start)) continue;
      if (declined.overlaps(start, end) || accepted.overlaps(start, end) && !accepted.gaps(start, end).length) continue;
      if (WHOLE_ONLY.has(seed.category) && accepted.overlaps(start, end)) continue;
      if (seed.category === "RELIGION" && religionInstitutionMention(text, start, end)) continue;
      if (seed.category === "AFFILIATION" && affiliationInstitutionMention(text, start, end)) continue;
      if (seed.category === "ADDRESS" && !/\d/.test(seed.text) && seed.text.split(/\s+/).length <= 4 && (ORG_BEFORE_RE.test(text.slice(Math.max(0, start - 40), start)) || ORG_AFTER_RE.test(text.slice(end, end + 12)))) continue;
      if (seed.category === "BIRTH_PLACE" && (ORG_BEFORE_RE.test(text.slice(Math.max(0, start - 40), start)) || ORG_AFTER_RE.test(text.slice(end, end + 12)) || // one half of a hyphenated place name ("Ebersbach-Lichtenau") is not the whole place
      new RegExp("\\p{L}-$", "u").test(text.slice(Math.max(0, start - 2), start)) || new RegExp("^-\\p{Lu}", "u").test(text.slice(end, end + 2)))) continue;
      if (seed.category === "BIRTH_PLACE" && seed.common && !/[a-zäöüß,;]\s+$/.test(text.slice(Math.max(0, start - 6), start))) continue;
      if (nounRisk && determinerBlocksName(text, start) && !doubted.has(`${start}:${end}:${seed.text}`)) continue;
      for (const [left, right] of accepted.gaps(start, end)) {
        if (!text.slice(left, right).trim()) continue;
        extra.push(new PiiSpan(
          left,
          right,
          seed.category,
          text.slice(left, right),
          seed.score,
          "known-value"
        ));
      }
    }
  }
  let cursor = -1;
  const selected = [];
  for (const piece of extra.sort((a, b) => a.start - b.start || b.end - a.end)) {
    if (piece.end <= cursor) continue;
    if (piece.start < cursor) {
      piece.start = cursor;
      piece.text = text.slice(cursor, piece.end);
    }
    selected.push(piece);
    cursor = piece.end;
  }
  return selected;
}
var explicitDecline = (span) => !span.accepted && Boolean(
  span.userUnchecked || span.user_unchecked || span.userDecided || span.user_decided
);
function copyFragment(span, left, right, text) {
  const fragment = Object.assign(Object.create(Object.getPrototypeOf(span)), span);
  fragment.start = left;
  fragment.end = right;
  fragment.text = text.slice(left, right);
  return fragment;
}
function ensureRepeatedValueCoverage(text, resolved, notThePerson = null) {
  const extra = repeatedValueSpans(text, resolved, notThePerson);
  if (!extra.length) return resolved;
  const extraRanges = new Intervals(extra);
  const merged = [];
  for (const span of resolved) {
    if (span.accepted || explicitDecline(span) || !extraRanges.overlaps(span.start, span.end)) {
      merged.push(span);
      continue;
    }
    for (const [left, right] of extraRanges.gaps(span.start, span.end)) {
      merged.push(copyFragment(span, left, right, text));
    }
  }
  return merged.concat(extra).sort((a, b) => a.start - b.start || a.end - b.end);
}

// ../extension/core/practice-names.js
var HEADS = [
  "Steuerberatungskanzlei",
  "Rechtsanwaltskanzlei",
  "Anwaltskanzlei",
  "Steuerkanzlei",
  "Kanzlei",
  "Hausarztpraxis",
  "Zahnarztpraxis",
  "Physiotherapiepraxis",
  "Psychotherapiepraxis",
  "Praxis f\xFCr Psychotherapie",
  "Praxis f\xFCr Verhaltenstherapie",
  "Praxis f\xFCr Physiotherapie",
  "Praxis f\xFCr Logop\xE4die",
  "Praxis f\xFCr Ergotherapie",
  "Psychotherapeutische Praxis",
  "Praxis",
  "Notariats",
  "Notariat",
  "Hausverwaltung",
  "Ger\xFCstbau",
  "B\xE4ckerei",
  "Fleischerei",
  "Schreinerei",
  "Tischlerei",
  "Malerbetrieb",
  "Dachdeckerei",
  "Dachbau",
  "Ingenieurb\xFCro",
  "Gutachterb\xFCro",
  "Planungsb\xFCro",
  "Architekturb\xFCro",
  "Fahrschule",
  "Autohaus",
  "Elektrobetrieb",
  "Kfz-Werkstatt",
  "Werkstatt",
  "Metallbau",
  "Sanit\xE4tshaus",
  "Sanit\xE4rbetrieb",
  "Steuerberatung",
  "Spedition",
  "Maler"
];
var decomposed = (h) => h.replace(/[äöüÄÖÜ]/g, (c) => `(?:${c}|${c.normalize("NFD")})`);
var HEAD_RE = new RegExp(
  `(?<![\\p{L}\\p{N}-])(?:${HEADS.slice().sort((a, b) => b.length - a.length).map((h) => decomposed(h).replace(/ /g, "[ \\t]+")).join("|")})(?=[ \\t])`,
  "gu"
);
var TITLE_RE = /^(?:Prof\.[ \t]+)?Dr\.(?:[ \t]+(?:med\.(?:[ \t]+dent\.)?|jur\.|rer\.[ \t]+nat\.|h\.[ \t]*c\.))?[ \t]+/u;
var GROUP_RE = /^(?:Partner|Partnerin|Partnern|Kollegen|Kolleginnen|Söhne|Sohn)(?![\p{L}])/u;
var COMPANY_TAIL_RE2 = new RegExp("^(?:[ \\t]+(?:&[ \\t]+)?\\p{Lu}[\\p{L}.'\u2019-]*){0,3}(?:[ \\t]+|[ \\t]*\\r?\\n[ \\t]*)(?:GmbH|gGmbH|mbH|AG|KG|KGaA|UG|OHG|SE|Ltd|Inc|LLC|LLP|PLC|eG|e\\.[ \\t]?V\\.|Stiftung)(?![\\p{L}])", "u");
var COMPANY_TAIL_FOLDED_RE = /^(?:[ \t]+(?:&[ \t]+)?[\p{L}.'’\uFFFB\uFFFC-]+){0,3}(?:[ \t]+|[ \t]*\r?\n[ \t]*)(?:gmbh|ggmbh|mbh|ag|kg|kgaa|ug|ohg|se|ltd|inc|llc|llp|plc|eg|e\.[ \t]?v\.|stiftung)(?![\p{L}])/iu;
var CO_RE = /^[ \t]*&[ \t]*Co(?![\p{L}])/u;
var HYPHEN_BRAND = /* @__PURE__ */ new Set(["physio", "praxis", "apotheke", "bau", "technik", "service", "center", "centre", "markt", "haus", "shop", "store", "park", "hof", "werk", "mobil"]);
var GENERIC = /* @__PURE__ */ new Set([
  "gmbh",
  "gbr",
  "partner",
  "kollegen",
  "s\xF6hne",
  "sohn",
  "team",
  "service",
  "filiale",
  "zentrale",
  "nummer",
  "nachf",
  "frau",
  "herr",
  "kunden",
  "kolleginnen",
  "partnerinnen",
  "vorgesetzte",
  "vorgesetzten",
  "eltern",
  "freunde",
  "mitarbeiter",
  "mitarbeitende",
  "\xE4rzte",
  "lieferanten",
  "nachbarn",
  "gesch\xE4ftspartner",
  "dienstag",
  "montag",
  "mittwoch",
  "donnerstag",
  "freitag",
  "samstag"
]);
var DIRECTIONS = /* @__PURE__ */ new Set([
  "nord",
  "s\xFCd",
  "ost",
  "west",
  "mitte",
  "nordost",
  "nordwest",
  "s\xFCdost",
  "s\xFCdwest",
  "nordstadt",
  "s\xFCdstadt",
  "oststadt",
  "weststadt",
  "altstadt",
  "innenstadt",
  "zentrum",
  "neustadt",
  "nordend",
  "ostend",
  "westend",
  "s\xFCdend",
  "nordstern"
]);
var PLACES = /* @__PURE__ */ new Set([
  "berlin",
  "hamburg",
  "m\xFCnchen",
  "k\xF6ln",
  "frankfurt",
  "stuttgart",
  "d\xFCsseldorf",
  "leipzig",
  "dortmund",
  "essen",
  "bremen",
  "dresden",
  "hannover",
  "n\xFCrnberg",
  "duisburg",
  "bochum",
  "wuppertal",
  "bielefeld",
  "bonn",
  "m\xFCnster",
  "mannheim",
  "karlsruhe",
  "augsburg",
  "wiesbaden",
  "gelsenkirchen",
  "m\xF6nchengladbach",
  "braunschweig",
  "chemnitz",
  "kiel",
  "aachen",
  "halle",
  "magdeburg",
  "freiburg",
  "krefeld",
  "l\xFCbeck",
  "oberhausen",
  "erfurt",
  "mainz",
  "rostock",
  "kassel",
  "hagen",
  "hamm",
  "saarbr\xFCcken",
  "m\xFClheim",
  "potsdam",
  "ludwigshafen",
  "oldenburg",
  "leverkusen",
  "osnabr\xFCck",
  "solingen",
  "heidelberg",
  "herne",
  "neuss",
  "darmstadt",
  "paderborn",
  "regensburg",
  "ingolstadt",
  "w\xFCrzburg",
  "f\xFCrth",
  "wolfsburg",
  "offenbach",
  "ulm",
  "heilbronn",
  "pforzheim",
  "g\xF6ttingen",
  "bottrop",
  "trier",
  "recklinghausen",
  "reutlingen",
  "bremerhaven",
  "koblenz",
  "bergisch",
  "jena",
  "remscheid",
  "erlangen",
  "moers",
  "siegen",
  "hildesheim",
  "salzgitter",
  "cottbus",
  "gera",
  "zwickau",
  "schwerin",
  "flensburg",
  "l\xFCneburg",
  "celle",
  "bayreuth",
  "bamberg",
  "fulda",
  "gie\xDFen",
  "marburg",
  "witten",
  "g\xFCtersloh",
  "norderstedt",
  "wilhelmshaven",
  "ratingen",
  "l\xFCnen",
  "villingen",
  "konstanz",
  "worms",
  "dessau",
  "plauen",
  "neubrandenburg",
  "stralsund",
  "greifswald",
  "brandenburg",
  "emden",
  "detmold",
  "lemgo",
  "minden",
  "wien",
  "graz",
  "linz",
  "salzburg",
  "innsbruck",
  "z\xFCrich",
  "basel",
  "bern",
  "genf",
  "luzern",
  "rhein",
  "ruhr",
  "elbe",
  "weser",
  "main",
  "oder",
  "spree",
  "isar",
  "donau",
  "neckar",
  "alster",
  "lahn",
  "saale",
  "mosel",
  "havel",
  "nordhausen",
  "nordheim",
  "nordhorn",
  "taunus",
  "harz",
  "eifel",
  "sauerland",
  "westfalen",
  "rheinland",
  "holstein",
  "sachsen",
  "bayern",
  "hessen",
  "th\xFCringen",
  "pankow",
  "kreuzberg",
  "wedding",
  "altona",
  "eppendorf",
  "eimsb\xFCttel",
  "sch\xF6neberg",
  "neuk\xF6lln",
  "charlottenburg",
  "spandau",
  "r\xFCttenscheid",
  "ehrenfeld",
  "gohlis",
  "plagwitz",
  "connewitz",
  "harvestehude",
  "bergedorf",
  "mariendorf",
  "pillnitz",
  "taucha"
]);
var PLACE_SUFFIX_RE = /(?:stadt|hof|blick|tal|deich|kiez|platz|markt|höhe|ufer|bogen|damm|brücke|wiese|heide|dorf|hafen|licht|wind|viertel|insel|bahnhof|straße|strasse|allee|gasse|zentrum|center|weg|pfad|steig|chaussee|promenade|weide|ring|str)$/i;
var SOFT_PLACE_SUFFIX_RE = /(?:bach|berg|burg|hausen|feld|dorf|heim|stedt|brück|brücken|lübbe|blume|brot|tal|wald|horst|kamp|haus)$/i;
var BUSINESS_NEXT_RE = /^(?:Großhandel|Grosshandel|Handel|Vertriebs?|Logistik|Service|Services|Systems|Group|Gruppe|Holding|Verwaltungs?|Hausverwaltung|Management|Consulting|Immobilien|Automobile|Reisen|Technik|Bau|Leasing|Filialen?)(?![\p{L}])/u;
var STREET_NEXT_RE = /^(?:Straße|Strasse|Str\.?|Platz|Allee|Weg|Ring|Gasse|Damm|Ufer|Markt|Chaussee)(?![\p{L}])/u;
var isLetter = (c) => /[\p{L}\p{M}]/u.test(c);
var isUpper = (c) => new RegExp("\\p{Lu}", "u").test(c);
function wordAt2(text, i) {
  if (i >= text.length || !isUpper(text[i])) return -1;
  let j = i + 1;
  for (; ; ) {
    while (j < text.length && (isLetter(text[j]) || (text[j] === "'" || text[j] === "\u2019") && j + 1 < text.length && isLetter(text[j + 1]))) j++;
    if (text[j] === "-" && j + 1 < text.length && isUpper(text[j + 1])) {
      j += 2;
      continue;
    }
    break;
  }
  const w = text.slice(i, j);
  return w.length >= 3 && new RegExp("\\p{Ll}", "u").test(w) ? j : -1;
}
var skipWs = (text, i) => {
  while (text[i] === " " || text[i] === "	") i++;
  return i;
};
function placeOrDirection(w) {
  const parts = w.toLowerCase().split("-");
  return parts.some((p) => PLACES.has(p) || DIRECTIONS.has(p));
}
function placeLike(w) {
  const parts = w.toLowerCase().split("-");
  if (parts.some((p) => PLACES.has(p) || DIRECTIONS.has(p) || GENERIC.has(p))) return true;
  const last = parts[parts.length - 1];
  const dir = /^(?:nord|süd|ost|west)(.{3,})$/.exec(last);
  if (dir && (isCommonWord(dir[1]) || PLACES.has(dir[1]))) return true;
  return PLACE_SUFFIX_RE.test(last) && last.length > 6;
}
function surnameOk(w, strong) {
  if (placeLike(w)) return false;
  if (strong) return true;
  if (w.length > 6 && SOFT_PLACE_SUFFIX_RE.test(w.split("-").pop())) return false;
  if (w.split("-").length > 1 && w.split("-").some((p) => p.length > 2 && (HYPHEN_BRAND.has(p.toLowerCase()) || isCommonWord(p) || hasCommonCompoundHead(p)))) return false;
  if (w.length < 4) return false;
  const first = w.split("-")[0];
  return !isCommonWord(w) && !hasCommonCompoundHead(w) && !looksLikeGivenName(first);
}
function practiceNameRanges(text) {
  const out = [];
  const companyKeys = /* @__PURE__ */ new Set();
  const nameParts = /* @__PURE__ */ new Set();
  const take = (start, end, key) => {
    if (end <= start) return;
    if (COMPANY_TAIL_RE2.test(text.slice(end, end + 70))) {
      companyKeys.add(key);
      companyKeys.add(`|${key.split("|")[1].split(/[ &]/)[0]}`);
      return;
    }
    out.push({ start, end, key });
  };
  HEAD_RE.lastIndex = 0;
  let m;
  while (m = HEAD_RE.exec(text)) {
    const start = m.index;
    let i = skipWs(text, start + m[0].length);
    const t = TITLE_RE.exec(text.slice(i, i + 40));
    if (t) i += t[0].length;
    const givens = [];
    const nameStart = i;
    let w = wordAt2(text, i), sEnd = -1, sStart = -1;
    while (w > 0) {
      const tok = text.slice(i, w);
      const nextI = skipWs(text, w);
      const nextW = nextI > w ? wordAt2(text, nextI) : -1;
      if (nextW > 0 && givens.length < 2 && looksLikeGivenName(tok.split("-")[0])) {
        givens.push(tok);
        i = nextI;
        w = nextW;
        continue;
      }
      sStart = i;
      sEnd = w;
      break;
    }
    if (sEnd < 0) continue;
    const surname = text.slice(sStart, sEnd);
    {
      const ni = skipWs(text, sEnd), nw = ni > sEnd ? wordAt2(text, ni) : -1;
      if (nw > 0) {
        const nx = text.slice(ni, nw);
        if (placeOrDirection(nx)) continue;
        if (BUSINESS_NEXT_RE.test(nx) || STREET_NEXT_RE.test(nx)) continue;
        if (/e$/.test(surname) && !t && givens.length === 0) continue;
      }
    }
    let end = sEnd;
    let amp = false;
    if (CO_RE.test(text.slice(sEnd, sEnd + 8))) continue;
    const c = /^[ \t]*(?:&|und)[ \t]+/u.exec(text.slice(sEnd, sEnd + 12));
    if (c) {
      const after = sEnd + c[0].length;
      const g = GROUP_RE.exec(text.slice(after, after + 12));
      if (g) {
        end = after + g[0].length;
        amp = c[0].includes("&");
      } else {
        const w2 = wordAt2(text, after);
        const s2 = w2 > 0 ? text.slice(after, w2) : "";
        if (w2 > 0 && !placeLike(s2) && !COMPANY_TAIL_RE2.test(" " + s2 + text.slice(w2, w2 + 30)) && !isCommonWord(s2) && !looksLikeGivenName(s2) && /^[ \t]*(?:&|und)/.test(c[0])) {
          end = w2;
          amp = true;
        }
      }
    }
    if (!surnameOk(surname, !!t || givens.length > 0 || amp)) continue;
    take(nameStart, end, `${m[0].replace(/\s+/g, " ")}|${surname}`);
    if (end > sEnd && !COMPANY_TAIL_RE2.test(text.slice(end, end + 70))) nameParts.add(text.slice(nameStart, end));
  }
  const BARE_RE = new RegExp("(?<![\\p{L}\\p{N}-])(?:Dr\\.[ \\t]+)?(\\p{Lu}[\\p{L}'\u2019]*(?:-\\p{Lu}[\\p{L}'\u2019]+)?)([ \\t]*(&|und)[ \\t]+(?:Partner|Kollegen)(?![\\p{L}]))", "gu");
  let b;
  while (b = BARE_RE.exec(text)) {
    const name = b[1];
    if (name.length < 3 || !new RegExp("\\p{Ll}", "u").test(name) || placeLike(name)) continue;
    if (b[3] === "und" && (isCommonWord(name) || looksLikeGivenName(name.split("-")[0]))) continue;
    const end = b.index + b[0].length;
    const startAt = b.index;
    if (out.some((r) => r.start <= startAt && r.end >= end)) continue;
    take(startAt, end, `|${name.split(/[ &]/)[0]}`);
  }
  for (const n of nameParts) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}-])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[ \\t]+")}(?![\\p{L}\\p{N}-])`, "gu");
    let q;
    while (q = re.exec(text)) {
      const a = q.index, b2 = a + q[0].length;
      if (out.some((r) => r.start < b2 && r.end > a)) continue;
      take(a, b2, `|${n.replace(/^Dr\.[ \t]+/, "").split(/[ &]/)[0]}`);
    }
  }
  const kept = [];
  for (const r of out.filter((q) => !companyKeys.has(q.key)).sort((x, y) => x.start - y.start || y.end - x.end)) {
    const last = kept[kept.length - 1];
    if (last && r.start < last.end) continue;
    kept.push({ start: r.start, end: r.end });
  }
  return kept;
}
function insideCapitalCompanyName(text, end) {
  const tail = text.slice(end, end + 70);
  return new RegExp("\\p{Lu}", "u").test(tail) && !/\uFFFC/.test(tail) ? COMPANY_TAIL_RE2.test(tail) : COMPANY_TAIL_FOLDED_RE.test(tail);
}

// ../extension/core/land-register.js
var NAME_REACH = 1500;
var FLURSTUECK_RE = /(?<![\p{L}\p{N}])(?:Flurst(?:ü|u\u0308)ck(?:e|s)?|Flst\.)[ \t]*(?:Nr\.[ \t]*)?(\d{1,5}(?:\/\d{1,4})?)(?![\p{L}\p{N}\/])/gu;
var BLATT_RE = /(?<![\p{L}\p{N}])(?:Grundbuchblatt[ \t]+|Grundbuch(?:auszug)?[^\n]{0,70}?[ \t,(]Blatt[ \t]+|Grundbuch(?:auszug)?[ \t]+Bl\.[ \t]*)(\d{1,6})(?![\p{L}\p{N}\/])(?!(?:[ \t]*(?:bis|-|–)[ \t]*\d))/gu;
var OFFICE_BEFORE_BLATT_RE = new RegExp("Ausk\xFCnft\\p{L}*[^\\n.;]{0,20}Grundbuchamt[^\\n.;]{0,40}$", "u");
var NO_OWNER_RE = new RegExp("(?:Wohnungs(?:eigent\xFCmer|grundbuch)|(?:Wohnungs)?[Ee]igent\xFCmergemeinschaft|\\bWEG\\b|Ausgleichsfl\\p{L}*|Teilungserkl\xE4rung)", "u");
function landRegisterRanges(text0, persons) {
  if (!persons.length) return [];
  const text = text0.replace(/[\r\n]/g, " ");
  const out = [];
  const marked = /* @__PURE__ */ new Set();
  const kinds = [[FLURSTUECK_RE, "F"], [BLATT_RE, "B"]];
  const near = (a, b) => persons.some((p) => p.start < b + NAME_REACH && p.end > a - NAME_REACH);
  for (const pass of [0, 1]) {
    for (const [re, kind] of kinds) {
      re.lastIndex = 0;
      let m;
      while (m = re.exec(text)) {
        const end = m.index + m[0].length, start = end - m[1].length;
        const key = kind + m[1];
        if (out.some((r) => r.start === start)) continue;
        if (NO_OWNER_RE.test(text.slice(Math.max(0, start - 160), end + 80))) continue;
        if (kind === "B" && OFFICE_BEFORE_BLATT_RE.test(text.slice(Math.max(0, start - 70), start))) continue;
        if (pass === 0 ? !near(start, end) : !marked.has(key)) continue;
        out.push({ start, end });
        marked.add(key);
      }
    }
  }
  return out.sort((x, y) => x.start - y.start);
}

// ../extension/core/personal-refs.js
var REACH = Infinity;
var WS = "[ \\t]";
var CODE = "(?=[A-Z0-9\\-/.]*\\d)[A-Z0-9][A-Z0-9\\-/.]{2,}[A-Z0-9]";
var NR = `${WS}*(?:Nr\\.?|Nummer|No\\.?|ID)?${WS}*[:#]?${WS}*(?:\\r?\\n${WS}*)?`;
var isCode = (v) => /\d/.test(v) && !/^(?:19|20)\d\d$/.test(v) && !/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(v) && !/^\d{1,3}(?:[.,]\d{3})*[.,]\d{2}$/.test(v);
var COURT_RE = /(?<![\p{L}\p{N}\/])((?:\d{1,3}[ \t])?(?:(?:Ds|Cs|Ls|Ns|Gs|Ca)[ \t])?(?:\d{1,3}[ \t])?(?:Js|Ds|Cs|Gs|Ls|Ns|Ca|Ga|Kls|OWi|VRs)[ \t]\d{1,6}\/\d{2}|(?:\d{1,3}[ \t])XVII[ \t]\d{1,6}(?:\/\d{2})?)(?![\p{L}\p{N}\/])/gu;
var AFTER_PERSON_CODE_RE = /^[ \t]*\(([A-Z]{1,3}-\d{3,6})\)/;
var REG_ROW_RE = new RegExp("(?:^|\\n)[ \\t]*(\\d{4}\\/\\d{2,5})(?=[ \\t]+\\p{Lu}\\p{Ll}+[^\\n]{0,70}\\d{2}\\.\\d{2}\\.\\d{4})", "gu");
var ASSET_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:[Aa]sset[ -]?[Tt]ag|Inventarnummer|[Ss]erial(?:${WS}+(?:[Nn]o\\.?|[Nn]umber))?|Seriennummer(?:n)?|Seriennr\\.?|(?:[Kk]ey|[Ss]ecurity)${WS}+fob|Kennung)(?![\\p{L}\\p{N}])${WS}*(?:\\(${WS}*)?[:#]?${WS}*(${CODE})(?![\\p{L}\\p{N}])`,
  "gu"
);
var ASSET_NOT_RE = /(?:Heizung|Kessel|Therme|Vaillant|Viessmann|Wärmepumpe|Zähler|geeicht|eichg|Eichung|Lager|Charge|Modell|Boiler|boiler|meter|calibrat|Anlage|Maschine|machine)/iu;
var ASSET_LAPTOP_RE = /(?:Laptop|Notebook|Handy|Smartphone|Tablet|laptop|phone|device|Gerät|fob|scanner|Scanner|Drucker|printer|Fahrzeug)/u;
var IDENT_RES = [
  // professional chamber / licence-to-practise numbers of a named professional
  new RegExp(`(?<![\\p{L}\\p{N}])(?:Approbation(?:s(?:nummer|nr\\.?))?|(?:Architekten|Ingenieur|Rechtsanwalts|\xC4rzte|Handwerks)kammer|Kammer-?(?:Nr\\.?|nummer)|Kammernummer)(?![\\p{L}])${NR}(${CODE})(?![\\p{L}\\p{N}])`, "gu"),
  new RegExp(`(?<![\\p{L}\\p{N}])(?:Schwerbehinderten-?ausweis|Behindertenausweis)(?![\\p{L}])${NR}(${CODE})(?![\\p{L}\\p{N}])`, "gu"),
  // parish register entries
  new RegExp(`(?<![\\p{L}\\p{N}])(?:Taufbuch|Kirchenbuch|Taufregister|Verwahrbuch|Lfd\\.)${WS}*(?:-?Nr\\.?)?${WS}*[:#]?${WS}*(\\d{1,5}\\/\\d{2,4})(?![\\p{L}\\p{N}\\/])`, "gu"),
  new RegExp(`(?<![\\p{L}\\p{N}])(?:Hundemarke|Chip-?(?:Nr\\.?|nummer)|Staplerschein|Personalnummer|Personalnr\\.?|Lohnnummer|Lohnkonto|\xDCberweisungsschein|Bestell-?(?:nr\\.?|nummer)|bestellnr\\.?|SNr\\.?|Sch\xFCler-?(?:ID|nummer|Nr\\.?))(?![\\p{L}])${NR}(${CODE}|\\d{4,8})(?![\\p{L}\\p{N}])`, "gu")
];
var PERSONNEL_LIST_RE = new RegExp("Personalnummern?[ \\t]*:[ \\t]*((?:\\p{Lu}[\\p{L}\\-]+[ \\t]+\\d{4,6}(?:[ \\t]*[,;][ \\t]*)?)+)", "gu");
var BOOKING_RE = /(?:Buchung(?:scode)?|Buchungs-?(?:code|nr\.?|nummer)|booking(?:[ \t](?:code|ref(?:erence)?))?|Code|Reservierung(?:scode)?|PNR|confirmation(?:[ \t]code)?)[^\n\d]{0,32}?[\[(]?(?<![\p{L}\p{N}])((?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{6})(?![\p{L}\p{N}])/gu;
var VEHICLE_RE = /(?:Fahrzeugschein|Fahrzeugbrief|Zulassungsbescheinigung(?:[ \t]Teil[ \t](?:I|II))?(?:[ \t]\([^)\n]{1,20}\))?|eVB)[ \t-]*(?:Nr\.?|nummer)[ \t]*[:#]?[ \t]*((?=[A-Z0-9 \-]*\d)[A-Z0-9][A-Z0-9\-]+(?:[ \t][A-Z0-9]{2,6}){0,3})(?![\p{L}\p{N}])/gu;
var MEMBER_HEAD_RE = /Mitglieds-?(?:Nr\.?|nummer)/;
var MEMBER_OF_ROLE_RE = new RegExp("Mitglieds-?(?:Nr\\.?|nummer)[ \\t]+(?:der|des|von)[ \\t]+\\p{L}+[ \\t]*:[ \\t]*(\\d{3,6})(?![\\p{L}\\p{N}])", "gu");
var MEMBER_ROW_RE = new RegExp("^\\p{Lu}[\\p{L}.,'\u2019\\- ]{2,50}?[ \\t](\\d{3,5})[ \\t]*$", "u");
var LIST_NEXT_RE2 = /^(?:[ \t]*\([^()]{1,70}\))?(?:[ \t]*,[ \t]*(?:und[ \t]+|oder[ \t]+|sowie[ \t]+)?|[ \t]+(?:und|oder|sowie)[ \t]+|[ \t]*;[ \t]*)([A-Za-z0-9][A-Za-z0-9\-/.]{2,}[A-Za-z0-9])/;
var idShape2 = (v) => v.replace(/[A-Za-z]/g, "A").replace(/\d/g, "9");
function personalRefRanges(text, persons, seeds) {
  if (!persons.length) return [];
  const out = [];
  const add2 = (start, end, kind) => {
    if (!out.some((r) => r.start === start && r.end === end)) out.push({ start, end, kind });
  };
  const near = (a, b, reach = REACH) => persons.some((p) => p.start < b + reach && p.end > a - reach);
  for (const m of text.matchAll(COURT_RE)) {
    const start = m.index, end = start + m[0].length;
    if (near(start, end)) add2(start, end, "court");
  }
  for (const p of persons) {
    const after = AFTER_PERSON_CODE_RE.exec(text.slice(p.end, p.end + 40));
    if (after) {
      const s = p.end + after[0].lastIndexOf(after[1]);
      add2(s, s + after[1].length, "code");
    }
  }
  for (const m of text.matchAll(REG_ROW_RE)) {
    const start = m.index + m[0].length - m[1].length, end = start + m[1].length;
    if (near(start, end, 120)) add2(start, end, "row");
  }
  for (const m of text.matchAll(ASSET_RE)) {
    const start = m.index + m[0].length - m[1].length, end = start + m[1].length;
    const head = text.slice(Math.max(0, start - 90), start);
    if (!isCode(m[1]) || ASSET_NOT_RE.test(head)) continue;
    if (/^Kennung/i.test(m[0]) && !ASSET_LAPTOP_RE.test(head)) continue;
    if (!/[A-Z]/.test(m[1]) && (m[1].match(/\d/g) || []).length < 6) continue;
    if (near(start, end)) add2(start, end, "asset");
  }
  for (const re of IDENT_RES) {
    for (const m of text.matchAll(re)) {
      const start = m.index + m[0].length - m[1].length, end = start + m[1].length;
      if (isCode(m[1]) && near(start, end)) add2(start, end, "ident");
    }
  }
  for (const re of [BOOKING_RE, VEHICLE_RE]) {
    for (const m of text.matchAll(re)) {
      const start = m.index + m[0].length - m[1].length, end = start + m[1].length;
      if (near(start, end)) add2(start, end, "ident");
    }
  }
  for (const m of text.matchAll(MEMBER_OF_ROLE_RE)) {
    const start = m.index + m[0].length - m[1].length, end = start + m[1].length;
    if (near(start, end)) add2(start, end, "member");
  }
  for (const m of text.matchAll(PERSONNEL_LIST_RE)) {
    const base = m.index + m[0].indexOf(m[1]);
    for (const it of m[1].matchAll(/[ \t](\d{4,6})(?!\d)/g)) {
      const start = base + it.index + 1;
      if (near(start, start + it[1].length)) add2(start, start + it[1].length, "member");
    }
  }
  {
    const lines = [];
    let pos = 0;
    for (const l of text.split("\n")) {
      lines.push({ l, pos });
      pos += l.length + 1;
    }
    for (let i = 0; i < lines.length; i++) {
      if (!MEMBER_HEAD_RE.test(lines[i].l) || lines[i].l.length > 80) continue;
      for (let j = i + 1; j < Math.min(lines.length, i + 41); j++) {
        const m = MEMBER_ROW_RE.exec(lines[j].l);
        if (!m) break;
        const ls = lines[j].pos;
        const start = ls + lines[j].l.lastIndexOf(m[1]);
        add2(start, start + m[1].length, "member");
      }
    }
  }
  const own = out.filter((r) => r.kind === "asset" || r.kind === "ident" || r.kind === "code").map((r) => ({ start: r.start, end: r.end, text: text.slice(r.start, r.end) }));
  for (const seed of (seeds || []).concat(own)) {
    const shape = idShape2(seed.text);
    if (!/[A-Za-z]/.test(shape) || !/9/.test(shape) || seed.text.length < 6) continue;
    let end = seed.end;
    for (let n = 0; n < 12; n++) {
      const m = LIST_NEXT_RE2.exec(text.slice(end, end + 110));
      if (!m || idShape2(m[1]) !== shape) break;
      const start = end + m[0].length - m[1].length;
      add2(start, start + m[1].length, "list");
      end = start + m[1].length;
    }
  }
  return out.sort((x, y) => x.start - y.start);
}

// ../extension/core/detect.js
var EMAIL_RE = /(?<![\p{L}\p{M}\p{N}_.+-])[\p{L}\p{M}\p{N}._+*-]+@(?:[\p{L}\p{M}\p{N}]|-(?:[^\S\r\n]*\r?\n[^\S\r\n]*)?)+\.(?:[\p{L}\p{M}\p{N}.]|-(?:[^\S\r\n]*\r?\n[^\S\r\n]*)?)+(?![\p{L}\p{M}\p{N}_])/gu;
var PRIORITY = {
  IBAN: 100,
  CREDIT_CARD: 98,
  TAX_ID: 95,
  VAT_ID: 94,
  EMAIL: 92,
  BIC: 88,
  SV_ID: 86,
  ONLINE_ID: 85,
  ID_CARD: 84,
  PHONE: 82,
  REG_ID: 80,
  PLATE: 79,
  ACCOUNT: 78,
  HEALTH_INSURANCE: 77,
  CUSTOMER_ID: 74,
  CREDENTIAL: 76,
  DOB: 72,
  CRIMINAL: 70,
  HEALTH: 68,
  RELIGION: 66,
  AFFILIATION: 64,
  PERSON: 60,
  NATIONALITY: 50,
  BIRTH_PLACE: 48,
  ADDRESS: 45,
  ORG: 30
};
var ORG_NONPII_CONTEXT = [
  "emittent",
  "emittentin",
  "verwahrstelle",
  "fonds",
  "anleihe",
  "begibt",
  "tranche",
  "verwalter",
  "verwaltungsgesellschaft",
  "depotbank",
  "zahlstelle",
  "wertpapier",
  "prospekt",
  "aufsicht",
  "bafin",
  "clearing"
];
var ORG_CTX_WINDOW = 60;
var STREET_TYPE_RE = /(straße|strasse|str\.|gasse|weg|allee|platz|ring|damm|ufer|chaussee|steig|hof)/i;
var ROLE_STEMS_LIST = [...ROLE_STEMS];
function structuredSpans(text) {
  const spans = regexSpans(text, SETTINGS.extra_customer_id_patterns);
  for (const s of tableSpans(text)) spans.push(s);
  for (const s of keyValueSpans(text)) spans.push(s);
  EMAIL_RE.lastIndex = 0;
  let m;
  while ((m = EMAIL_RE.exec(text)) !== null) {
    let addr = m[0].replace(/[.-]+$/, "");
    let addrStart = m.index;
    const lead = /^\*+/.exec(addr);
    if (lead) {
      addr = addr.slice(lead[0].length);
      addrStart += lead[0].length;
    }
    if (addr.includes("*") && !/^[\p{L}\p{N}._+-]+\*+[\p{L}\p{N}._*+-]*@/u.test(addr)) {
      if (m.index === EMAIL_RE.lastIndex) EMAIL_RE.lastIndex++;
      continue;
    }
    const lastLabel = addr.slice(addr.lastIndexOf(".") + 1);
    if (!new RegExp("^\\p{L}{2,}$", "u").test(lastLabel)) {
      if (m.index === EMAIL_RE.lastIndex) EMAIL_RE.lastIndex++;
      continue;
    }
    if (addr.includes("@") && !mailboxIsNonPersonal(addr)) {
      spans.push(new PiiSpan(addrStart, addrStart + addr.length, "EMAIL", addr, 0.95, "regex"));
    } else if (addr.includes("@") && isRoleMailboxOnRoutableDomain(addr)) {
      const span = new PiiSpan(addrStart, addrStart + addr.length, "EMAIL", addr, 0.9, "regex");
      span.roleMailbox = true;
      spans.push(span);
    }
    if (m.index === EMAIL_RE.lastIndex) EMAIL_RE.lastIndex++;
  }
  return spans;
}
function splitWords(surface) {
  return surface.split(/\W+/u).filter(Boolean);
}
function isKept(span) {
  const surface = span.text.trim().toLowerCase();
  if (KEEP_TERMS.has(surface)) return true;
  const words = splitWords(surface);
  return words.length > 0 && words.every((w) => KEEP_TERMS.has(w));
}
function isProductOrg(span, text) {
  if (span.category !== "ORG") return false;
  const lo = Math.max(0, span.start - ORG_CTX_WINDOW);
  const window = text.slice(lo, span.end + ORG_CTX_WINDOW).toLowerCase();
  return ORG_NONPII_CONTEXT.some((kw) => window.includes(kw));
}
function isOrgAddress(span, text, spans) {
  if (span.category !== "ADDRESS") return false;
  if (soleTraderContext(text, span.start)) return false;
  return isOrgAddressLine(text, span.start, spans) || isInstitutionLetterhead(text, span.start);
}
var POSTCODE_RE = /(?:^|[^\d])\d{4,6}(?![\d])/;
function isBarePlace(span) {
  if (span.category !== "ADDRESS" || span.source !== "ner") return false;
  const surface = span.text.trim();
  if (!/\d/.test(surface)) return true;
  if (/^\d{4,5}$/.test(surface) || /^[A-Za-z]{1,5}[-/]\d[\d\-/.]*$/.test(surface)) return true;
  if (/^\d{4,6}\s*[-–—]\s*\d{4,6}$/.test(surface)) return true;
  return !STREET_TYPE_RE.test(surface) && !POSTCODE_RE.test(surface);
}
var FORM_BLANK_RE = /_{3,}|\.{6,}/;
function isFormBlank(span) {
  if (span.source === "coref") return false;
  return FORM_BLANK_RE.test(span.text);
}
var SHORT_NUMBER_OK = /* @__PURE__ */ new Set(["CREDENTIAL", "CUSTOMER_ID", "ACCOUNT", "REG_ID", "ID_CARD", "HEALTH_INSURANCE", "SV_ID", "TAX_ID", "CREDIT_CARD"]);
function isBareShortNumberFromModel(span) {
  if (span.source === "table" || span.source === "manual" || span.birthCue || SHORT_NUMBER_OK.has(span.category)) return false;
  return /^[0-9]{1,4}$/.test(span.text.trim());
}
var BLANK_VALUE = "(?:_{2,}|\\.{4,}|-{3,}|\u2026{1,}|\\[[^\\]]{0,24}\\]|\xAB[^\xBB]{0,48}\xBB|\\{\\{[^}]{0,48}\\}\\}|<(?!/?[a-z][a-z0-9]{0,9}(?:\\s[^>]*)?>)[^>]{0,48}>)";
var LABEL_VALUE_EMPTY_RE = new RegExp(
  `^[^\\S\\r\\n]*(?:[:=][^\\S\\r\\n]*(?:$|${BLANK_VALUE})|${BLANK_VALUE})`
);
var LINE_OPENING_RE = /(?:^|[\n\r|;])[^\S\r\n]*(?:[-*•]|\d+[.)]|\[[ xX]?\])?[^\S\r\n]*$/;
var BLANK_RULE_TAIL_RE = /(?:_{3,}|\.{6,})[\s_.]*$/;
var SPECIAL_LABEL_CATEGORIES = /* @__PURE__ */ new Set([
  "HEALTH",
  "CRIMINAL",
  "RELIGION",
  "NATIONALITY",
  "AFFILIATION",
  "BIRTH_PLACE",
  "DOB"
]);
function lineBounds(text, at) {
  const start = text.lastIndexOf("\n", Math.max(0, at - 1)) + 1;
  let end = text.indexOf("\n", at);
  if (end < 0) end = text.length;
  return [start, end];
}
function isOnBlankFormLine(span, text) {
  if (span.source === "coref") return false;
  if (!SPECIAL_LABEL_CATEGORIES.has(span.category)) return false;
  const [ls, le] = lineBounds(text, span.start);
  const line = text.slice(ls, le);
  if (BLANK_RULE_TAIL_RE.test(line)) {
    const ruleAt = line.search(/_{3,}|\.{6,}/);
    return ruleAt >= 0 && span.end - ls <= ruleAt;
  }
  const next = text.slice(le + 1, text.indexOf("\n", le + 1) < 0 ? text.length : text.indexOf("\n", le + 1));
  return /^[\s_.]*(?:_{3,}|\.{6,})[\s_.]*$/.test(next);
}
function isBlankFieldLabel(span, text) {
  if (span.source === "coref") return false;
  if (span.category !== "PERSON" && span.category !== "ADDRESS" && span.category !== "ORG") {
    return false;
  }
  const first = (span.text.trim().split(/\s+/)[0] || "").replace(/[^\p{L}]/gu, "");
  if (first && looksLikeGivenName(first)) return false;
  if (!LINE_OPENING_RE.test(text.slice(Math.max(0, span.start - 80), span.start))) return false;
  const after = text.slice(span.end, span.end + 96).split(/\r?\n/)[0];
  return LABEL_VALUE_EMPTY_RE.test(after);
}
var LEADING_DETERMINER_RE = /^(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|the|a|an)[^\S\r\n]+/iu;
function isDeterminedCommonNoun(span, text) {
  if (span.category !== "PERSON" || span.source === "coref") return false;
  const surface = span.text.trim().replace(LEADING_DETERMINER_RE, "");
  if (!surface || /\s/.test(surface) || looksLikeGivenName(surface)) return false;
  const determined = LEADING_DETERMINER_RE.test(span.text.trim()) || determinerBlocksName(text, span.start);
  if (!determined) return false;
  span.linguisticConflict = "article_name_ambiguity";
  span.forceReview = true;
  return false;
}
var NAME_WORD_TAIL_RE = /(?:^|[\s/-])(?:names?|namen?|nom|nombre)$/i;
var PARTICLE_TOKENS = /* @__PURE__ */ new Set([
  "von",
  "van",
  "de",
  "der",
  "den",
  "des",
  "di",
  "del",
  "della",
  "da",
  "dos",
  "du",
  "la",
  "le",
  "ter",
  "ten",
  "af",
  "av",
  "zu",
  "zum",
  "zur",
  "y",
  "bin",
  "ibn",
  "al"
]);
function isFieldLabelPhrase(span) {
  if (hasNameWordConflict(span)) return false;
  if (span.category !== "PERSON" || span.source === "coref") return false;
  const surface = span.text.trim();
  const tokens = surface.split(/[\s/]+/).filter(Boolean);
  if (tokens.some((t) => looksLikeGivenName(t.replace(/[^\p{L}]/gu, "")))) return false;
  if (NAME_WORD_TAIL_RE.test(surface)) return true;
  if (tokens.length < 2) return false;
  return tokens.some((t) => {
    const w = t.replace(/[^\p{L}]/gu, "").toLowerCase();
    return w && FUNCTION_WORDS.has(w) && !PARTICLE_TOKENS.has(w);
  });
}
var POSSESSIVE_TOKENS = /* @__PURE__ */ new Set([
  "unser",
  "unsere",
  "unseren",
  "unserem",
  "unseres",
  "unserer",
  "mein",
  "meine",
  "meinen",
  "meinem",
  "meines",
  "meiner",
  "dein",
  "deine",
  "deinen",
  "deinem",
  "deines",
  "deiner",
  "sein",
  "seine",
  "seinen",
  "seinem",
  "seines",
  "seiner",
  "ihr",
  "ihre",
  "ihren",
  "ihrem",
  "ihres",
  "ihrer",
  "euer",
  "eure",
  "euren",
  "eurem",
  "eures",
  "eurer",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their"
]);
function hasNameWordConflict(span) {
  if (span.category !== "PERSON" || span.source !== "ner" || span.score < 0.9) return false;
  const tokens = span.text.trim().split(/\s+/);
  return tokens.length >= 2 && tokens.every((t) => new RegExp("^\\p{Lu}[\\p{L}\\p{M}'\u2019-]*$", "u").test(t)) && !tokens.some((t) => ROLE_STEMS_LIST.some((r) => t.toLowerCase().startsWith(r))) && tokens.some((t) => POSSESSIVE_TOKENS.has(t.toLowerCase()));
}
function containsPossessive(span) {
  if (hasNameWordConflict(span)) {
    span.linguisticConflict = "name_function_word";
    return false;
  }
  if (span.category !== "PERSON" || span.source === "coref") return false;
  const tokens = span.text.trim().split(/[\s/]+/).filter(Boolean);
  if (tokens.length < 2) return false;
  return tokens.some((t) => POSSESSIVE_TOKENS.has(t.replace(/[^\p{L}]/gu, "").toLowerCase()));
}
var EPONYM_HEAD_BEFORE_RE = /(?:^|[^\p{L}])(?:Kita|Kindertagesstätte|Kindergarten|Schule|Grundschule|Gesamtschule|Realschule|Oberschule|Gymnasium|Pfarrkirche|Kirche|Kapelle)[^\S\r\n]+(?:(?:St\.|Sankt)[^\S\r\n]*)?$/u;
function isEponymousInstitution(span, text) {
  if (span.category !== "PERSON") return false;
  if (span.source !== "manual" && EPONYM_HEAD_BEFORE_RE.test(text.slice(Math.max(0, span.start - 40), span.start))) return true;
  if (INSTITUTION_HEAD_RE.test(span.text)) return true;
  const after = text.slice(span.end, span.end + 48);
  const run = new RegExp("^[- \\t]?(?:\\p{L}[\\p{L}]*[- \\t]?){0,3}", "u").exec(after);
  if (run && /^[ \t]+(?:vom|von|im|in|am|an|bei|beim|aus|zum|zur|zu|für|als|vor|nach|mit|der|die|das|des|dem|den)(?![\p{L}])/iu.test(run[0])) return false;
  return !!run && INSTITUTION_HEAD_RE.test(run[0]);
}
var TRADE_HEAD_COMPOUND_TAILS = [
  "markt",
  "kaffeehaus",
  "brauhaus",
  "autohaus",
  "modehaus",
  "m\xF6belhaus",
  "waren",
  "werkstatt",
  "verlag",
  "reisen",
  "grill",
  "brauerei",
  "naturkost",
  "shake",
  "notenbox",
  "koffer",
  // 2026-10-14 (P4, hold-out)
  "apotheke",
  "residenz",
  "kolleg",
  "buchhandlung",
  "handel",
  "technik",
  "vorsorge",
  "modell",
  "rucksack",
  "gl\xFChlampe",
  "hilfsmittel"
];
var TRADE_HEAD_WORDS = /* @__PURE__ */ new Set([
  "studio",
  "design",
  "bistro",
  "restaurant",
  "kaffee",
  "logistik",
  "consulting",
  "immobilien",
  "versand",
  "outlet",
  "ensemble",
  "orchester",
  "chor",
  "shop",
  "store",
  "storage",
  "supply",
  "supplies",
  "service",
  "services",
  "cloud",
  "backup",
  "sync",
  "pay",
  "app",
  "agent",
  "assay",
  "choir",
  "coffee",
  "bakery",
  "brewery",
  "foods",
  "motors",
  "media",
  "systems",
  "solutions",
  "software",
  "set",
  "kit",
  "vase",
  "tote",
  "candle",
  "umbrella",
  "adapter",
  "lautsprecher",
  // 2026-10-14 (P4, hold-out)
  // Not "group"/"gruppe" ("Florence Group B" is a school group) and not "hotel" (a guest-house
  // named after its owner is the sole-trader shape): both measured as leaking a labelled name.
  "kitchen",
  "bar",
  "logistics",
  "tooling",
  "packaging",
  "suite",
  "linen",
  "pub",
  "bakery",
  "pharmacy",
  "gallery",
  "studios"
]);
var TRADE_HEAD_COMPOUND_RE = new RegExp(`(?:${TRADE_HEAD_COMPOUND_TAILS.join("|")})$`, "u");
function isTradeHeadToken(tok) {
  const low = tok.replace(/[^\p{L}-]/gu, "").toLowerCase().split("-").pop();
  if (low.length < 3) return false;
  if (TRADE_HEAD_WORDS.has(low)) return true;
  const m = TRADE_HEAD_COMPOUND_RE.exec(low);
  return !!m && (m.index === 0 || m.index >= 3);
}
function isNameLedTradeName(span, text) {
  if (span.category !== "PERSON" || span.source !== "regex" && span.source !== "ner") return false;
  if (/^[^\n]{0,40}?(?:e\.[ ]?K\.|e\.[ ]?Kfm\.|e\.[ ]?Kfr\.|Inh\.)/u.test(text.slice(span.end, span.end + 50))) return false;
  const toks = span.text.trim().split(/\s+/);
  if (toks.length >= 2 && isTradeHeadToken(toks[toks.length - 1])) return toks.every((t) => new RegExp("^\\p{Lu}", "u").test(t));
  const after = new RegExp("^(?:[ ]\\p{Lu}[\\p{L}'\u2019-]*){1,2}", "u").exec(text.slice(span.end, span.end + 60));
  if (!after) return false;
  const next = after[0].trim().split(" ");
  if (isTradeHeadToken(next[0])) return true;
  return next.length > 1 && !isCommonWord(next[0]) && isTradeHeadToken(next[1]);
}
var TEAM_HEADER_RE = /^(?:heimmannschaft|gastmannschaft|heimteam|gastteam|mannschaft|verein|team|club|klub|gegner|home team|away team|opponent)$/i;
var TEAM_SIDE_HEADER_RE = /^(?:heim|gast|home|away)$/i;
var RESULT_HEADER_RE = /^(?:ergebnis|endstand|tore|spielstand|score|result|punkte|points)$/i;
function isTeamColumnCell(span, text) {
  if (span.source !== "ner" || span.category !== "PERSON") return false;
  const ls = text.lastIndexOf("\n", span.start - 1) + 1;
  let le = text.indexOf("\n", span.start);
  if (le < 0) le = text.length;
  const line = text.slice(ls, le);
  const delim = [";", ",", "	"].find((d) => line.includes(d));
  if (!delim) return false;
  const off = span.start - ls;
  const before = line.slice(0, off);
  const after = line.slice(off + span.text.length);
  if (!(before === "" || before.endsWith(delim)) || !(after === "" || after.startsWith(delim) || after === "\r")) return false;
  const col = before.split(delim).length - 1;
  let hs = ls;
  for (let guard = 0; guard < 500 && hs > 0; guard++) {
    const ps = text.lastIndexOf("\n", hs - 2) + 1;
    const prev = text.slice(ps, hs - 1);
    if (!prev.includes(delim)) break;
    hs = ps;
  }
  if (hs === ls) return false;
  const header = text.slice(hs, text.indexOf("\n", hs)).split(delim);
  if (col >= header.length) return false;
  const h = header[col].trim();
  return TEAM_HEADER_RE.test(h) || TEAM_SIDE_HEADER_RE.test(h) && header.some((c) => RESULT_HEADER_RE.test(c.trim()));
}
var TITLE_ONLY_RE = /^(?:dr|prof|dipl|ing|med|mag|habil|rer|nat|phil|jur|oec|h\.?c|ba|ma|msc|bsc|phd|mba|dr\.-ing)\.?$/i;
function isTitleOnly(span) {
  return span.category === "PERSON" && TITLE_ONLY_RE.test(span.text.trim());
}
var APOSTROPHE_PARTICLE_RE = /^[^\W\d_]['\u2019][^\W\d_]/u;
var NOBILIARY_NAME_RE = new RegExp("^(?:(?:von|zu)(?:\\s+der)?|van(?:\\s+(?:der|den))?|de(?:\\s+(?:la|le))?|di|del|la|le)\\s+\\p{Lu}", "u");
function isGenericRoleWord(span) {
  if (span.source === "coref" || span.category !== "PERSON" && span.category !== "ORG") return false;
  const surface = span.text.trim();
  if (!surface) return false;
  const c0 = surface[0];
  if (c0.toLowerCase() === c0 && c0.toUpperCase() !== c0 && !APOSTROPHE_PARTICLE_RE.test(surface) && !NOBILIARY_NAME_RE.test(surface)) {
    return true;
  }
  const nameParts = surface.split(/\s+/);
  const namedPerson = span.category === "PERSON" && nameParts.length >= 2 && (looksLikeGivenName(nameParts[0]) || span.score >= 0.9 && !isCommonWord(nameParts[0]) && !KEEP_TERMS.has(nameParts[0].toLowerCase()) && !NON_NAME_WORDS.has(nameParts[0].toLowerCase())) && nameParts.every((part) => new RegExp("^\\p{Lu}", "u").test(part));
  if (hasEnglishRoleHead(surface) && !namedPerson) return true;
  let words = surface.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && NON_NAME_WORDS.has(words[0].toLowerCase())) {
    words = words.slice(1);
  }
  if (words.length === 1) {
    const w = words[0];
    const low = w.toLowerCase();
    if (w.replace(/[^\p{L}]/gu, "").length <= 1) return true;
    if (PRONOUNS.has(low)) return true;
    if (NON_NAME_WORDS.has(low)) return true;
    if (KEEP_TERMS.has(low)) return true;
    if (isEnglishRoleWord(low)) return true;
    if (ROLE_STEMS_LIST.some((stem) => low.startsWith(stem))) return true;
  }
  return false;
}
var CONFUSABLE_CHARS = (() => {
  const m = {
    "\xA0": " ",
    "\u1680": " ",
    "\u2000": " ",
    "\u2001": " ",
    "\u2002": " ",
    "\u2003": " ",
    "\u2004": " ",
    "\u2005": " ",
    "\u2006": " ",
    "\u2007": " ",
    "\u2008": " ",
    "\u2009": " ",
    "\u200A": " ",
    "\u202F": " ",
    "\u205F": " ",
    "\u3000": " ",
    // Zero-width and format characters map to a space rather than being deleted — that is what
    // keeps the substitution 1:1, and a space is the reading each of them has for every rule
    // here, since they only ever sit BETWEEN groups.
    "\xAD": " ",
    "\u200B": " ",
    "\u200C": " ",
    "\u200D": " ",
    "\u200E": " ",
    "\u200F": " ",
    "\u2060": " ",
    "\uFEFF": " ",
    // Hyphen look-alikes. En/em dash are deliberately absent: they are punctuation with their
    // own meaning, the phone rules already accept them, and folding them would rewrite a range.
    "\u2010": "-",
    "\u2011": "-",
    "\u2212": "-",
    "\u2019": "'",
    "\u02BC": "'",
    "\u2032": "'",
    "\uFF20": "@",
    "\uFF0B": "+",
    "\uFF0D": "-",
    "\uFF0E": ".",
    "\uFF0F": "/",
    "\uFF1A": ":"
  };
  for (let i = 0; i < 10; i++) m[String.fromCharCode(65296 + i)] = String.fromCharCode(48 + i);
  for (let i = 0; i < 26; i++) {
    m[String.fromCharCode(65313 + i)] = String.fromCharCode(65 + i);
    m[String.fromCharCode(65345 + i)] = String.fromCharCode(97 + i);
  }
  return m;
})();
var CONFUSABLE_RE = new RegExp(
  `[${Object.keys(CONFUSABLE_CHARS).map((c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).join("")}]`,
  "g"
);
var VENUE_HEAD_BEFORE_RE = /(?:^|[^\p{L}])(?:Hotel|Villa|Pizzeria|Osteria|Trattoria|Ristorante|Restaurant|Café|Cafe|Gasthof|Gasthaus|Pension|Zeche|Bistro|Hostel|Taverne|Eiscafé|Kita|Kindergarten|Isola)[ \t]+$/u;
function normaliseConfusables(text) {
  CONFUSABLE_RE.lastIndex = 0;
  if (!CONFUSABLE_RE.test(text)) return text;
  CONFUSABLE_RE.lastIndex = 0;
  return text.replace(CONFUSABLE_RE, (ch) => CONFUSABLE_CHARS[ch]);
}
var LINE_BREAK_RE = /\r\n|\r|\n/g;
var PARAGRAPH_BREAK_RE = /^(?:\r\n|\r|\n)[^\S\r\n]*(?:\r\n|\r|\n)/;
var FIELD_TAB_RE = /\t+|[;|]/g;
function splitNerSpansAtFieldBreaks(spans, text, regexSpans2) {
  const out = [];
  for (const s of spans) {
    if (s.source !== "ner" || !s.text) {
      out.push(s);
      continue;
    }
    LINE_BREAK_RE.lastIndex = 0;
    FIELD_TAB_RE.lastIndex = 0;
    const cuts = [];
    for (const m of s.text.matchAll(FIELD_TAB_RE)) {
      cuts.push([s.start + m.index, s.start + m.index + m[0].length]);
    }
    for (const m of s.text.matchAll(LINE_BREAK_RE)) {
      const bStart = s.start + m.index;
      const bEnd = bStart + m[0].length;
      const para = PARAGRAPH_BREAK_RE.exec(text.slice(bStart));
      if (para) {
        cuts.push([bStart, bStart + para[0].length]);
        continue;
      }
      if (regexSpans2.some((r) => r.start >= bEnd && r.start < s.end && r.category !== s.category)) {
        cuts.push([bStart, bEnd]);
      }
    }
    if (!cuts.length && s.text === s.text.trim()) {
      out.push(s);
      continue;
    }
    cuts.sort((a, b) => a[0] - b[0]);
    const bounds = [s.start];
    for (const c of cuts) {
      bounds.push(c[0], c[1]);
    }
    bounds.push(s.end);
    const multi = bounds.length > 2;
    let keptHere = 0;
    for (let i = 0; i + 1 < bounds.length; i += 2) {
      const piece = text.slice(bounds[i], bounds[i + 1]);
      const stripped = piece.trim();
      if (!stripped) continue;
      if (multi && CONTACT_FIELD_LABEL_RE.test(`${stripped}:`)) continue;
      const start = bounds[i] + (piece.length - piece.replace(/^\s+/, "").length);
      const next = new PiiSpan(start, start + stripped.length, s.category, stripped, s.score, s.source);
      if (s.forceReview) next.forceReview = true;
      if (s.reviewRequired) next.reviewRequired = true;
      if (multi && keptHere) next.splitPiece = true;
      keptHere += 1;
      out.push(next);
    }
  }
  return out;
}
var COLUMN_GAP_RE = /[ \t]{3,}/g;
function splitColumnarArtifacts(spans) {
  const out = [];
  for (const s of spans) {
    COLUMN_GAP_RE.lastIndex = 0;
    const cuts = [...s.text.matchAll(COLUMN_GAP_RE)];
    if (!cuts.length) {
      out.push(s);
      continue;
    }
    const bounds = [0];
    for (const m of cuts) {
      bounds.push(m.index, m.index + m[0].length);
    }
    bounds.push(s.text.length);
    for (let i = 0; i + 1 < bounds.length; i += 2) {
      const piece = s.text.slice(bounds[i], bounds[i + 1]);
      const stripped = piece.trim();
      if (stripped.length < 2) continue;
      const pad = piece.length - piece.replace(/^\s+/, "").length;
      const start = s.start + bounds[i] + pad;
      const next = new PiiSpan(start, start + stripped.length, s.category, stripped, s.score, s.source);
      if (s.forceReview) next.forceReview = true;
      out.push(next);
    }
  }
  return out;
}
function dropInRanges(spans, ranges) {
  if (!ranges.length) return spans;
  ranges = [...ranges].sort((a, b) => a[0] - b[0]);
  const maxHi = new Array(ranges.length);
  let running = -Infinity;
  for (let i = 0; i < ranges.length; i++) {
    running = Math.max(running, ranges[i][1]);
    maxHi[i] = running;
  }
  return spans.filter((s) => {
    let lo = 0, hi = ranges.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (ranges[mid][0] < s.end) lo = mid + 1;
      else hi = mid;
    }
    if (lo === 0) return true;
    return !(maxHi[lo - 1] > s.start);
  });
}
function dropWhitelisted(spans, text) {
  spans = dropInRanges(spans, whitelistRanges(text));
  spans = dropInRanges(spans, tableHeaderRanges(text));
  return spans;
}
var ADDRESS_CHAIN_GAP_LIMIT = 3;
var ADDRESS_CHAIN_GAP_RE = /^[,\s·]*$/;
function mergeAddressChains(spans, text) {
  const addr = spans.filter((s) => s.category === "ADDRESS").sort((a, b) => a.start - b.start);
  if (addr.length < 2) return spans;
  const merged = /* @__PURE__ */ new Set();
  const out = [];
  for (let i = 0; i < addr.length; i++) {
    if (merged.has(addr[i])) continue;
    let cur = addr[i];
    for (let j = i + 1; j < addr.length && addr[j].start <= cur.end + ADDRESS_CHAIN_GAP_LIMIT; j++) {
      if (merged.has(addr[j]) || addr[j].end <= cur.end) continue;
      if (addr[j].start > cur.end && !ADDRESS_CHAIN_GAP_RE.test(text.slice(cur.end, addr[j].start))) continue;
      LOCALITY_TAIL_RE.lastIndex = 0;
      if (addr[j].start > cur.end && LOCALITY_TAIL_RE.test(cur.text)) continue;
      if (text.slice(cur.start, addr[j].end).includes("\n")) continue;
      merged.add(addr[j]);
      merged.add(cur);
      const next = addr[j];
      const newCur = new PiiSpan(
        cur.start,
        next.end,
        "ADDRESS",
        text.slice(cur.start, next.end),
        Math.max(cur.score, next.score),
        cur.source
      );
      if (cur.forceReview || next.forceReview) newCur.forceReview = true;
      if (cur.reviewRequired || next.reviewRequired) newCur.reviewRequired = true;
      if (cur.orgContact || next.orgContact) newCur.orgContact = true;
      cur = newCur;
    }
    if (cur !== addr[i]) out.push(cur);
  }
  if (!out.length) return spans;
  return spans.filter((s) => !merged.has(s)).concat(out);
}
function fragmentIsNoise(piece, text) {
  if (!piece.text.trim()) return true;
  if (isKept(piece) || isGenericRoleWord(piece) || isTitleOnly(piece) || isBarePlace(piece)) return true;
  if (piece.category === "PERSON" || piece.category === "ORG") {
    const verdict = vocabVerdict(piece);
    if (verdict === "drop") return true;
    if (verdict === "downgrade") piece.forceReview = true;
  }
  if (piece.category === "ADDRESS" && !/\d/.test(piece.text)) return true;
  return false;
}
function resolveOverlaps(spans, text) {
  const threshold = SETTINGS.autoselect_threshold;
  if (spans.some((s) => s.source === "table" && (s.category === "CUSTOMER_ID" || s.category === "REG_ID"))) {
    const ids = spans.filter((s) => s.source === "table" && (s.category === "CUSTOMER_ID" || s.category === "REG_ID"));
    spans = spans.filter((s) => !(s.category === "ADDRESS" && s.source !== "table" && /^\d{4,5}[ \t]*\r?\n/.test(s.text) && ids.some((i) => i.start === s.start && i.end <= s.end)));
  }
  const keyed = spans.map((s) => ({
    s,
    k0: REVIEW_REQUIRED_CATEGORIES.has(s.category) ? 1 : 0,
    // A fragment left by splitNerSpansAtFieldBreaks claims a location only if nothing else
    // does: its category was inferred for the joint surface the cut declared wrong, so it
    // carries no evidence at this narrower location — and a fragment allowed to win on length
    // re-creates, one field over, exactly the partial capture the cut removed.
    kp: s.splitPiece ? 1 : 0,
    k1: -(s.score >= threshold ? 1 : 0),
    k2: -(s.end - s.start),
    // Same extent, same category: the header-declared name cell ("Nachname" column) outranks the
    // neural guess. A downgraded common-word surname ("Rose", "Winter") otherwise wins on score and
    // takes the column's own evidence with it into review-only.
    kt: s.source === "table" && s.category === "PERSON" && s.nameRole ? 0 : 1,
    k3: -s.score,
    k4: -(PRIORITY[s.category] || 0)
  }));
  keyed.sort((a, b) => a.k0 - b.k0 || a.kp - b.kp || a.k1 - b.k1 || a.k2 - b.k2 || a.kt - b.kt || a.k3 - b.k3 || a.k4 - b.k4);
  const ordered = keyed.map((e) => e.s);
  const occ = new Uint8Array(spans.reduce((mx, s) => s.end > mx ? s.end : mx, 0));
  const kept = [];
  for (let rank = 0; rank < ordered.length; rank++) {
    const span = ordered[rank];
    let clash = false;
    for (let i = span.start; i < span.end; i++) {
      if (occ[i]) {
        clash = true;
        break;
      }
    }
    if (clash) {
      if (span.score >= threshold && !span.splitPiece && !REVIEW_REQUIRED_CATEGORIES.has(span.category)) {
        for (let lo = span.start; lo < span.end; ) {
          while (lo < span.end && occ[lo]) lo++;
          let hi = lo;
          while (hi < span.end && !occ[hi]) hi++;
          const surface = text.slice(lo, hi);
          const left = surface.length - surface.trimStart().length;
          const right = surface.trimEnd().length;
          if (right > left) {
            const piece = new PiiSpan(lo + left, lo + right, span.category, surface.slice(left, right), span.score, span.source);
            if (fragmentIsNoise(piece, text)) {
              lo = hi;
              continue;
            }
            piece.identityAmbiguous = true;
            piece.protectionConflict = { reason: "overlapping_candidates", candidateRange: [span.start, span.end] };
            for (let i = piece.start; i < piece.end; i++) occ[i] = 1;
            kept.push({ span: piece, rank });
          }
          lo = hi;
        }
      }
      continue;
    }
    for (let i = span.start; i < span.end; i++) occ[i] = 1;
    kept.push({ span, rank });
  }
  kept.sort((a, b) => a.span.start - b.span.start || b.rank - a.rank);
  return kept.map((e) => e.span);
}
function isCorroboratedSingleName(span, text) {
  if (!text) return false;
  return hasNameContext(text, span.start, span.end, NO_GIVEN_TOKENS);
}
var NO_GIVEN_TOKENS = /* @__PURE__ */ new Set();
function isNameByContext(span, text) {
  if (span.category !== "PERSON" || span.source === "manual") return false;
  const surface = span.text.trim();
  if (/\s/.test(surface)) {
    const minScore = /^(?:Familie|Frau|Herrn?|Dr\.|Prof\.)\s/.test(surface) ? SETTINGS.autoselect_threshold : 0.9;
    return span.source === "ner" && span.score >= minScore && isNameShapedSpan(surface) && surface.split(/\s+/).length === 2 && !/\n/.test(surface);
  }
  return isCorroboratedSingleName(span, text) && !determinerBlocksName(text, span.start);
}
function isUncorroboratedSingleNer(span, text) {
  if (span.source !== "ner" || span.category !== "PERSON") return false;
  const surface = span.text.trim();
  if (/\s/.test(surface)) return false;
  if (span.roleCorroborated) return false;
  if (span.score >= SETTINGS.autoselect_threshold && isCorroboratedSingleName(span, text)) return false;
  if (looksLikeGivenName(surface) && !isCommonWord(surface)) return false;
  return span.score < SETTINGS.single_token_person_threshold;
}
function isBareLowConfidenceNerPerson(span, text, structured) {
  if (span.source !== "ner" || span.category !== "PERSON") return false;
  const surface = span.text.trim();
  if (/\s/.test(surface)) return false;
  if (span.score >= SETTINGS.autoselect_threshold) return false;
  if (looksLikeGivenName(surface)) return false;
  const overlapsDeterministic = structured.some((d) => d.category === "PERSON" && d.source !== "ner" && d.start < span.end && d.end > span.start);
  if (overlapsDeterministic) return false;
  const before = text.slice(Math.max(0, span.start - 24), span.start);
  const after = text.slice(span.end, span.end + 24);
  if (/[\p{Lu}][\p{L}'’-]*[ \t]$/u.test(before)) return false;
  if (/^[ \t][\p{Lu}][\p{L}'’-]*/u.test(after)) return false;
  return true;
}
function isLowConfidenceVocabularyPhrase(span, text, structured) {
  if (span.source !== "ner" || span.category !== "PERSON") return false;
  const toks = span.text.trim().split(/\s+/).filter(Boolean);
  if (toks.length < 2 || span.score >= SETTINGS.autoselect_threshold) return false;
  if (toks.some((t) => new RegExp("^\\p{Lu}\\.$", "u").test(t))) return false;
  if (toks.some((t) => looksLikeGivenName(t.replace(/[^\p{L}'-]/gu, "")))) return false;
  if (structured.some((d) => d.category === "PERSON" && d.source !== "ner" && d.start < span.end && d.end > span.start)) return false;
  if (SALUTATION_BEFORE_RE.test(text.slice(Math.max(0, span.start - 14), span.start))) return false;
  if (toks.some((t) => isEnglishRoleWord(t.replace(/[^\p{L}]/gu, ""))) || toks.every((t) => isCommonWord(t) || isRoleNoun(t) || hasCommonCompoundHead(t))) return true;
  if (LOWER_PHRASE_EXEMPT_RE.test(span.text)) return false;
  return hasLowercaseNonParticle(toks);
}
var LOWER_PHRASE_EXEMPT_RE = /^(?:Herrn?|Frau|Fr\.|Hr\.?|Fam(?:ilien?|\.)|Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Prof\.?|Kd\.|Gez\.)(?![\p{L}])|(?:^|[\s&])(?:Partner|Kollegen|Söhne|Sohn|Co\.?)(?![\p{L}])|&/u;
var CORE_NAME_PARTICLES = /* @__PURE__ */ new Set(["von", "van", "vom", "zu", "de", "di", "del", "della", "da", "dos", "das", "du", "la", "le", "ter", "ten", "af", "av", "bin", "ibn", "al", "el", "y", "e"]);
var LOWER_CONJUNCTIONS = /* @__PURE__ */ new Set(["und", "oder", "bzw", "bzw.", "sowie", "and", "or"]);
function isGenderedPair(toks) {
  if (toks.length !== 3 || !LOWER_CONJUNCTIONS.has(toks[1])) return false;
  const stem = toks[0].replace(/(?:innen|in)$/u, "");
  return stem.length >= 4 && stem !== toks[0] && toks[2].startsWith(stem);
}
function hasLowercaseNonParticle(toks) {
  if (isGenderedPair(toks)) return true;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (LOWER_CONJUNCTIONS.has(t)) continue;
    if (!new RegExp("^\\p{Ll}[\\p{L}'\u2019-]*[.,;:]?$", "u").test(t) || CORE_NAME_PARTICLES.has(t)) continue;
    if ((t === "der" || t === "den" || t === "dem") && i > 0 && CORE_NAME_PARTICLES.has(toks[i - 1])) continue;
    return true;
  }
  return false;
}
var NAME_PARTICLES2 = /* @__PURE__ */ new Set(["von", "van", "de", "zu", "der", "den", "la", "le", "di", "del"]);
function isNameShapedSpan(text) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 4) return false;
  return tokens.every((tok) => {
    if (NAME_PARTICLES2.has(tok.toLowerCase())) return true;
    if (!/^[\p{Lu}][\p{L}.\-'’]*$/u.test(tok)) return false;
    return true;
  });
}
var NOBILIARY_TAIL_RE = new RegExp(
  // eslint-disable-next-line no-misleading-character-class -- deliberate: Unicode combining-diacritic range for accented names, not a bug
  "^[^\\S\\r\\n]+(?:(?:von|zu)(?:[^\\S\\r\\n]+der)?|van(?:[^\\S\\r\\n]+(?:der|den))?|de(?:[^\\S\\r\\n]+(?:la|le))?|di|del|la)[^\\S\\r\\n]+[A-Z\xC4\xD6\xDC\\u0300-\\u036F][a-z\xE4\xF6\xFC\xDF\\u0300-\\u036F]+(?:-[A-Z\xC4\xD6\xDC\\u0300-\\u036F][a-z\xE4\xF6\xFC\xDF\\u0300-\\u036F]+)?"
);
var NOBILIARY_DANGLING_RE = /(?:^|[^\S\r\n])(?:(?:von|zu)(?:[^\S\r\n]+der)?|van(?:[^\S\r\n]+(?:der|den))?|de(?:[^\S\r\n]+(?:la|le))?|di|del|la)$/;
var NOBILIARY_SURNAME_RE = /^[^\S\r\n]+[A-ZÄÖÜ\u0300-\u036F][a-zäöüß\u0300-\u036F]+(?:-[A-ZÄÖÜ\u0300-\u036F][a-zäöüß\u0300-\u036F]+)?/;
var NOBILIARY_LEAD_RE = /(?:^|[\r\n"'“„,;\t(|])[^\S\r\n]*((?:(?:von|zu)(?:[^\S\r\n]+der)?|van(?:[^\S\r\n]+(?:der|den))?|de(?:[^\S\r\n]+(?:la|le))?|di|del|la)[^\S\r\n]+)$/;
var LEADING_ROLE_RE = new RegExp(
  "^(?:(?:mein|dein|sein|ihr|unser|euer)(?:e|er|en|em|es)?|der|die|das|den|dem|unsere?r?)[^\\S\\r\\n]+|^(?:sachbearbeiter(?:in)?|mitarbeiter(?:in)?|kollege|kollegin|ansprechpartner(?:in)?|projektleiter(?:in)?|teamleiter(?:in)?|abteilungsleiter(?:in)?|gesch\xE4ftsf\xFChrer(?:in)?|arzt|\xE4rztin|patient(?:in)?|kunde|kundin|mandant(?:in)?|antragsteller(?:in)?|t\xE4ter(?:in)?|zeuge|zeugin|angeklagte[rn]?|beschuldigte[rn]?|kl\xE4ger(?:in)?|beklagte[rn]?|berater(?:in)?|betreuer(?:in)?|vermieter(?:in)?|mieter(?:in)?|manager|director|officer|employee|customer|client|patient|applicant|schatzmeister(?:in)?|vorsitzende[rn]?|stellvertreter(?:in)?|stellvertretung|schriftf\xFChrer(?:in)?|kassenwart(?:in)?|beisitzer(?:in)?|vorstand|obmann|obfrau|chair(?:man|woman|person)?|treasurer|secretary)\\.?(?:[^\\S\\r\\n]+|$)",
  "i"
);
function trimLeadingRoleWords(span, text) {
  if (hasNameWordConflict(span)) return span;
  if (span.source !== "ner" || span.category !== "PERSON") return span;
  let start = span.start;
  for (let guard = 0; guard < 4; guard++) {
    const m = LEADING_ROLE_RE.exec(text.slice(start, span.end));
    if (!m || !m[0].length) break;
    start += m[0].length;
    if (start >= span.end) return new PiiSpan(span.start, span.end, span.category, "", span.score, span.source);
  }
  for (let guard = 0; guard < 2; guard++) {
    const m = new RegExp("^(\\p{Lu}[\\p{L}-]+)[^\\S\\r\\n]+(\\S+)", "u").exec(text.slice(start, span.end));
    if (!m || !isCommonWord(m[1]) || looksLikeGivenName(m[1])) break;
    if (!new RegExp("^(?:herrn?|frau|dr\\.|prof\\.|dipl\\.(?:-\\p{L}+\\.?)?)$", "iu").test(m[2]) && !(isRoleNoun(m[1]) && looksLikeGivenName(m[2].replace(/[^\p{L}-]/gu, "")))) break;
    start += m[0].length - m[2].length;
  }
  {
    const toks = [...text.slice(start, span.end).matchAll(new RegExp("\\p{Lu}[\\p{L}'\u2019-]*", "gu"))];
    const gaps = /^[^\S\r\n]+$/;
    for (let n = 1; n <= 3 && n < toks.length; n++) {
      const words = toks.slice(0, n).map((t) => t[0]);
      const nxt = toks[n];
      const joined = toks.slice(0, n + 1).every((t, i) => i === 0 || gaps.test(text.slice(start + toks[i - 1].index + toks[i - 1][0].length, start + t.index)));
      if (joined && toks[0].index === 0 && isRoleNoun(words[n - 1]) && !words.some((w) => looksLikeGivenName(w)) && (looksLikeGivenName(nxt[0]) || nxt[0].length === 1 && text[start + nxt.index + 1] === ".")) {
        start += nxt.index;
        break;
      }
    }
  }
  let end = span.end;
  const startAfterRoles = start;
  for (let guard = 0; guard < 2; guard++) {
    const m = new RegExp("^(B\xFCro|Buero|Abteilung|Team|Referat|Dienst|Amt|Stelle|Service|Firma|Agentur|Labor)[^\\S\\r\\n]+(?=\\p{Lu})", "u").exec(text.slice(start, end));
    if (!m) break;
    start += m[0].length;
  }
  {
    const m = new RegExp("[^\\S\\r\\n]+(\\p{Lu}[\\p{L}-]*)$", "u").exec(text.slice(start, end));
    if (m && isRoleNoun(m[1]) && !isEnglishRoleWord(m[1]) && !looksLikeGivenName(m[1]) && new RegExp("\\p{Lu}[\\p{L}'\u2019.-]*[^\\S\\r\\n]*$", "u").test(text.slice(start, end - m[0].length)) && end - m[0].length > start) end -= m[0].length;
  }
  if (start === span.start && end === span.end) return span;
  const trimmedHere = start !== startAfterRoles || end !== span.end;
  const out = new PiiSpan(
    start,
    end,
    span.category,
    text.slice(start, end),
    trimmedHere ? Math.max(span.score, SETTINGS.autoselect_threshold) : span.score,
    span.source
  );
  if (trimmedHere) out.roleCorroborated = true;
  return out;
}
var DIGIT_TAIL_CONNECTOR_RE = /^(?:zu|nr\.?|no\.?|nummer|number|#|-|–|\(|\)|,|:|und|and)$/i;
var FROM_ORG_RE = new RegExp("[^\\S\\r\\n]+(?:von[^\\S\\r\\n]+der|von[^\\S\\r\\n]+dem|vom|from[^\\S\\r\\n]+the)[^\\S\\r\\n]+(\\p{Lu}[\\p{L}-]*)", "u");
var longCommonNouns = null;
function endsInCommonNoun(token) {
  const low = token.toLowerCase().split("-").pop();
  if (isCommonWord(low)) return true;
  longCommonNouns ??= [...GERMAN_COMMON_WORDS, ...COMMON_WORDS].filter((w) => w.length >= 5);
  return longCommonNouns.some((w) => low.length - w.length >= 3 && low.endsWith(w));
}
function trimTrailingRolePhrase(span, text) {
  if (span.source !== "ner" || span.category !== "PERSON") return span;
  const re = /[^\s,()|/]+/g;
  const toks = [];
  for (let m; m = re.exec(span.text); ) toks.push([m.index, m.index + m[0].length, m[0]]);
  if (toks.length < 2) return span;
  const word = (t) => t.replace(/[^\p{L}'-]/gu, "");
  let r = toks.findIndex(([, , t], i) => i > 0 && isRoleNoun(word(t)));
  if (r < 0) return span;
  let p = r;
  while (p > 0) {
    const w = word(toks[p - 1][2]);
    if (!w || looksLikeGivenName(w) || !(isCommonWord(w) || isRoleNoun(w) || FUNCTION_WORDS.has(w.toLowerCase()))) break;
    p--;
  }
  let g = -1;
  for (let i = 0; i < r; i++) if (looksLikeGivenName(word(toks[i][2]))) g = i;
  if (g >= 0 && g + 2 < p && g + 2 <= r) {
    let clear = true;
    for (let i = g + 2; i < p; i++) if (looksLikeGivenName(word(toks[i][2]))) clear = false;
    if (clear) p = g + 2;
  }
  if (g >= 0 && p < g + 2 && g + 2 <= r) p = g + 2;
  if (p === 0) return span;
  if (g < 0 && !/[,(|/]/.test(span.text.slice(toks[p - 1][1], toks[p][0]))) return span;
  const end = span.start + span.text.slice(0, toks[p][0]).replace(/[\s,(|/–-]+$/u, "").length;
  if (end <= span.start) return span;
  return new PiiSpan(span.start, end, span.category, text.slice(span.start, end), span.score, span.source);
}
function trimFromOrganisation(span, text) {
  if (span.category !== "PERSON" || span.source !== "ner" && span.source !== "regex") return span;
  const m = FROM_ORG_RE.exec(span.text);
  if (!m || m.index === 0) return span;
  if (!endsInCommonNoun(m[1]) && !fullNameBefore(span.text.slice(0, m.index))) return span;
  const end = span.start + m.index;
  return cloneSpanTo(span, end, text);
}
function cloneSpanTo(span, end, text) {
  if (span.source === "ner") return new PiiSpan(span.start, end, span.category, text.slice(span.start, end), span.score, span.source);
  const out = Object.assign(Object.create(Object.getPrototypeOf(span)), span);
  out.end = end;
  out.text = text.slice(span.start, end);
  return out;
}
function fullNameBefore(head) {
  const toks = head.trim().split(/[^\S\r\n]+/).map((t) => t.replace(/[^\p{L}'-]/gu, "")).filter((t) => new RegExp("^\\p{Lu}", "u").test(t) && !TITLE_WORD_RE.test(t));
  if (toks.length < 2 || !toks.some((t) => looksLikeGivenName(t))) return false;
  return !looksLikeGivenName(toks[toks.length - 1]);
}
var TITLE_WORD_RE = /^(?:Dr|Prof|Dipl|Ing|Med|Mag|Herr|Herrn|Frau)$/i;
var STRONG_TAIL_RE = /(?:sekretariat|leitung|abteilung|verwaltung|beauftragte[rn]?|zentrale)$/i;
var WEAK_TAIL_RE = /(?:amt|büro|dienst|stelle|zentrum|ring|straße|strasse|platz|weg|allee|damm|gasse|ufer|datum|führer|führerin|nummer)$/i;
function trimTrailingNounFromName(span, text) {
  if (span.source !== "regex" || span.category !== "PERSON") return span;
  const re = /[^\s]+/g;
  const toks = [];
  for (let m; m = re.exec(span.text); ) toks.push([m.index, m.index + m[0].length, m[0]]);
  if (toks.length < 2 || toks.length > 4 || /[,;:()]/.test(span.text)) return span;
  const word = (t) => t.replace(/[^\p{L}-]/gu, "");
  const last = word(toks[toks.length - 1][2]);
  const prev = word(toks[toks.length - 2][2]);
  if (last.length < 5 || !new RegExp("^\\p{Lu}", "u").test(last) || looksLikeGivenName(last) || CORE_NAME_PARTICLES.has(prev.toLowerCase())) return span;
  let drop;
  if (toks.length === 2) drop = looksLikeGivenName(prev) && STRONG_TAIL_RE.test(last);
  else drop = STRONG_TAIL_RE.test(last) || last.length >= 8 && (isRoleNoun(last) || KEEP_TERMS.has(last.toLowerCase())) || !looksLikeGivenName(prev) && (WEAK_TAIL_RE.test(last) || text[span.end] === ":");
  if (!drop) return span;
  const end = span.start + span.text.slice(0, toks[toks.length - 1][0]).replace(/\s+$/, "").length;
  return end > span.start ? cloneSpanTo(span, end, text) : span;
}
function trimDigitTail(span, text) {
  if (span.source !== "ner" || span.category !== "PERSON" || !/\d/.test(span.text)) return span;
  const re = /\S+/g;
  const toks = [];
  for (let m; m = re.exec(span.text); ) toks.push([m.index, m.index + m[0].length, m[0]]);
  let n = toks.length;
  let cut = false;
  while (n > 0 && (/\d/.test(toks[n - 1][2]) || cut && DIGIT_TAIL_CONNECTOR_RE.test(toks[n - 1][2]))) {
    const tok = toks[n - 1][2];
    if (/\d/.test(tok) && ((tok.match(/\d/g) || []).length >= 4 || /[\p{L}_]{3,}.*\d|\d.*[\p{L}]{3,}/u.test(tok))) return span;
    if (/\d/.test(tok)) cut = true;
    n--;
  }
  if (!cut) return span;
  if (n === 0) return new PiiSpan(span.start, span.end, span.category, "", span.score, span.source);
  const end = span.start + toks[n - 1][1];
  return new PiiSpan(span.start, end, span.category, text.slice(span.start, end), span.score, span.source);
}
var LEADING_HONORIFIC_RE = /^(?:herrn?|frau|hrn?\.|fr\.)[^\S\r\n]+/i;
function trimLeadingHonorific(span, text) {
  if (span.source !== "ner" || span.category !== "PERSON") return span;
  let start = span.start;
  for (let guard = 0; guard < 4; guard++) {
    const remaining = text.slice(start, span.end);
    const m = LEADING_HONORIFIC_RE.exec(remaining);
    if (!m || !m[0].length) break;
    start += m[0].length;
  }
  if (start === span.start) return span;
  if (start >= span.end) return span;
  const rest = text.slice(start, span.end);
  if (!new RegExp("^\\p{Lu}", "u").test(rest)) return span;
  return new PiiSpan(start, span.end, span.category, rest, span.score, span.source);
}
function trimTrailingVocabulary(span, text) {
  if (span.category !== "PERSON" || span.source === "coref") return span;
  const tokens = span.text.trim().split(/\s+/);
  if (tokens.length < 2) return span;
  if (!/[\p{L}]s$/u.test(tokens[tokens.length - 2]) || tokens.length > 2) return span;
  const last = tokens[tokens.length - 1].replace(/[^\p{L}\-']/gu, "");
  if (!last || !isCommonWord(last) || looksLikeGivenName(last)) return span;
  if (tokens.length === 2 && looksLikeGivenName(tokens[0].replace(/[^\p{L}\-']/gu, ""))) return span;
  const cut = span.text.lastIndexOf(tokens[tokens.length - 1]);
  const end = span.start + cut;
  const kept = text.slice(span.start, end).replace(/\s+$/, "");
  if (!kept) return span;
  return new PiiSpan(span.start, span.start + kept.length, span.category, kept, span.score, span.source);
}
var ALLCAPS_TOKEN = new RegExp("^\\p{Lu}[\\p{Lu}'-]{1,}$", "u");
var ALLCAPS_TAIL_RE = new RegExp("^,[^\\S\\r\\n]{0,2}(\\p{Lu}[\\p{Lu}'-]{1,})(?![\\p{L}])", "u");
var ALLCAPS_HEAD_RE = new RegExp("(\\p{Lu}[\\p{Lu}'-]{1,}),[^\\S\\r\\n]{0,2}$", "u");
function extendOverAllCapsFormName(span, text) {
  if (span.category !== "PERSON") return span;
  if (!ALLCAPS_TOKEN.test(span.text.trim())) return span;
  const tail = ALLCAPS_TAIL_RE.exec(text.slice(span.end, span.end + 40));
  if (tail) {
    const end = span.end + tail[0].length;
    return new PiiSpan(span.start, end, span.category, text.slice(span.start, end), span.score, span.source);
  }
  const head = ALLCAPS_HEAD_RE.exec(text.slice(Math.max(0, span.start - 40), span.start));
  if (head) {
    const start = span.start - head[0].length;
    return new PiiSpan(start, span.end, span.category, text.slice(start, span.end), span.score, span.source);
  }
  return span;
}
var INITIAL_BEFORE_RE = new RegExp("(?:^|[^\\p{L}\\p{N}])(\\p{Lu}\\.[ \\t]?)$", "u");
var INITIAL_AFTER_RE = new RegExp("^(,[ \\t]?\\p{Lu}\\.)", "u");
function extendOverInitial(span, text) {
  if (span.category !== "PERSON") return span;
  const surface = span.text.trim();
  if (!surface || new RegExp("^\\p{Lu}\\.$", "u").test(surface)) return span;
  let { start, end } = span;
  const before = INITIAL_BEFORE_RE.exec(text.slice(Math.max(0, start - 4), start));
  if (before) start -= before[1].length;
  else {
    const after = INITIAL_AFTER_RE.exec(text.slice(end, end + 4));
    if (after) end += after[1].length;
  }
  if (start === span.start && end === span.end) return span;
  return new PiiSpan(start, end, span.category, text.slice(start, end), span.score, span.source);
}
function extendOverNobiliaryParticle(span, text) {
  if (span.source !== "ner" || span.category !== "PERSON") return span;
  let { start, end } = span;
  if (NOBILIARY_DANGLING_RE.test(text.slice(span.start, span.end))) {
    const m = NOBILIARY_SURNAME_RE.exec(text.slice(end, end + 40));
    if (m) end += m[0].length;
  } else if (span.score >= SETTINGS.single_token_person_threshold) {
    const m = NOBILIARY_TAIL_RE.exec(text.slice(end, end + 48));
    if (m && !endsInCommonNoun(m[0].trim().split(/\s+/).pop())) end += m[0].length;
  }
  if (end === span.end && !/\s/.test(text.slice(span.start, span.end))) {
    const m = NOBILIARY_LEAD_RE.exec(text.slice(Math.max(0, start - 24), start));
    if (m) start -= m[1].length;
  }
  if (start === span.start && end === span.end) return span;
  return new PiiSpan(start, end, span.category, text.slice(start, end), span.score, span.source);
}
var SALUTATION_BEFORE_RE = /(?:^|[^\p{L}])(?:Herrn?|Frau|Fräulein|Hr\.|Fr\.|Dr\.|Prof\.)[ \t]+$/u;
function vocabVerdict(span) {
  if (span.source === "coref") return "keep";
  if (span.category !== "PERSON" && span.category !== "ORG") return "keep";
  return vocabularyVerdict(span.text, span.category, looksLikeGivenName);
}
var SUBJECT_ANCHOR_CATEGORIES = /* @__PURE__ */ new Set([
  "PERSON",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "DOB",
  "IBAN",
  "CREDIT_CARD",
  "ACCOUNT",
  "ID_CARD",
  "SV_ID",
  "HEALTH_INSURANCE",
  "TAX_ID",
  "CUSTOMER_ID",
  "PLATE",
  "BIRTH_PLACE"
]);
var SUBJECT_REQUIRED_CATEGORIES = /* @__PURE__ */ new Set(["HEALTH", "CRIMINAL"]);
var PERSON_FIELD_LABEL_RE = new RegExp(
  "^[^\\S\\r\\n]*(?:patient(?:in)?|name|vorname|nachname|versicherte[rn]?|mandant(?:in)?|antragsteller(?:in)?|mitarbeiter(?:in)?|besch\xE4ftigte[rn]?|kunde|kundin|angeklagte[rn]?|beschuldigte[rn]?|geburtsdatum|geboren am|geb\\.|betroffene[rn]?|patient name|full name|date of birth|defendant|claimant|employee name)[^\\S\\r\\n]*:",
  "im"
);
var SWITCHBOARD_RE = /\d[^\S\r\n]?[-\u2013][^\S\r\n]?0$/;
var MOBILE_NUMBER_RE = /^(?:\+49|0049)?[ \t(]*0?1(?:5\d|6[0-9]|7\d)(?![\d])/;
var SERVICE_NUMBER_RE = /^(?:(?:\+49|0049|00)?[ /.-]?0?(?:800|180\d?|900|137)[ /.-]|(?:\+?1[ .-]?)?\(?(?:800|833|844|855|866|877|888)\)?[ .-]|(?:\+44[ .-]?\(?0?\)?[ .-]?|0)(?:800|808|300)[ .-]?)/;
var ORG_CONTACT_LABEL_RE = new RegExp(
  "(?:^|[^\\p{L}])(?:hotline|kontakt|impressum|herausgeber|hersteller|zulassungsinhaber|pharmazeutischer unternehmer|redaktion|ansprechpartner(?:in)?|vertrieb|servicetelefon|bestellhotline|pressestelle|zentrale|sekretariat|gesch\xE4ftsf\xFChrung|geschaeftsfuehrung|chefarzt|chef\xE4rztin|chefaerztin|klinikleitung|pflegedienstleitung|qualit\xE4tsmanagement|qualitaetsmanagement|support|service)\\b[^\\p{L}]{0,4}$",
  "iu"
);
var ORG_CONTACT_LINE_RE = new RegExp(
  "^[\\s\\-*\u2022]*(?:hotline|kontakt|impressum|herausgeber|hersteller|zulassungsinhaber|pharmazeutischer unternehmer|redaktion|ansprechpartner(?:in)?|vertrieb|servicetelefon|bestellhotline|pressestelle|zentrale|sekretariat|gesch\xE4ftsf\xFChrung|geschaeftsfuehrung|chefarzt|chef\xE4rztin|chefaerztin|klinikleitung|pflegedienstleitung|qualit\xE4tsmanagement|qualitaetsmanagement|support|service)\\b[^\\p{L}]{0,4}",
  "iu"
);
var ORG_CONTACT_WORD_RE = new RegExp(
  "(?:^|[^\\p{L}])(?:hotline|kontakt|impressum|herausgeber|hersteller|zulassungsinhaber|redaktion|ansprechpartner(?:in)?|vertrieb|servicetelefon|bestellhotline|pressestelle|zentrale|sekretariat|gesch\xE4ftsf\xFChrung|geschaeftsfuehrung|kundenservice|kundendienst|support|service|helpdesk|customer service|technical support)(?![\\p{L}])",
  "iu"
);
var ORG_CONTACT_CATEGORIES = /* @__PURE__ */ new Set([
  "ADDRESS",
  "PHONE",
  "FAX",
  "EMAIL",
  "IBAN",
  "BIC",
  "VAT_ID"
]);
var ORG_BLOCK_REACH = 4;
var ORG_SOFT_LINE_MAX2 = 60;
var CONTACT_FIELD_LABEL_RE = /^[^\S\r\n]*(?:tel|telefon|telephone|phone|fon|fax|telefax|e-?mail|mail|web|internet|url|homepage|anschrift|adresse|address|sitz|hrb|handelsregister|registergericht|ust-?id\w*|umsatzsteuer|steuernummer|öffnungszeiten|oeffnungszeiten|opening hours)\b[^\p{L}\n]{0,4}:/iu;
var FIELD_LABEL_LINE_RE = /^[^\S\r\n]*["']?[\p{L}][\p{L}\p{M}\d äöüß_.\-/]{0,30}["']?[^\S\r\n]*:/u;
var RECIPIENT_PUBLIC_BODY_RE = new RegExp(
  "^[\\s\\-*\u2022]*(?:An|Per|Via|Zu\\s+H\xE4nden)\\s+(?:das|die|den|dem|der)\\s+(?:Amtsgericht|Landgericht|Oberlandesgericht|Verwaltungsgericht|Sozialgericht|Arbeitsgericht|Finanzgericht|Staatsanwaltschaft|Finanzamt|Jobcenter|Bundesamt|Landesamt|Ordnungsamt|Standesamt|Jugendamt|Sozialamt|Gesundheitsamt|Einwohnermeldeamt|Stadtverwaltung|Gemeindeverwaltung|Kreisverwaltung|Polizei|Polizeipr\xE4sidium|Ministerium|Senatsverwaltung|B\xFCrgeramt|Pflegekasse|Krankenkasse|Familienkasse|Rentenversicherung|Stadt|Gemeinde|Bezirksregierung)(?![\\p{L}])",
  "iu"
);
function isPureOrgNameLine(line) {
  const t = line.trim();
  return t.length >= 6 && t.length <= 60 && !/[\d@:]/.test(t) && hasCompanyLegalSuffix(t) && !lineHasPersonTitleName(t);
}
function contactOwnerByLine(text, spans) {
  const personLine = /* @__PURE__ */ new Set();
  const orgLine = /* @__PURE__ */ new Set();
  const lineOf = lineIndexer(text);
  for (const s of spans) {
    if (s.category === "PERSON") personLine.add(lineOf(s.start));
    else if (s.category === "ORG" && !s.splitPiece) orgLine.add(lineOf(s.start));
  }
  const lines = text.split("\n");
  const owner = new Array(lines.length).fill("");
  let cur = "";
  let reach = 0;
  let lineStart = 0;
  let addrOrg = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const thisLineStart = lineStart;
    lineStart += line.length + 1;
    if (!line.trim()) {
      cur = "";
      owner[i] = "";
      addrOrg = 0;
      continue;
    }
    if (addrOrg > 0 && !/\s/.test(line.trim()) && !/\d/.test(line)) addrOrg = 0;
    if (addrOrg > 0 && (/@|\+\d{2}/.test(line) || /(?:^|[^\p{L}])(?:Mobil|Handy|Mobile|Tel|Telefon|Fax|E-?Mail)(?![\p{L}])/iu.test(line))) addrOrg = 0;
    if (addrOrg > 0 && personLine.has(i) && !/z\.?[^\S\n]?Hd\.?|zu[^\S\n]+Händen|Attn\.?|c\/o|Ansprechpartner/i.test(line)) addrOrg = 0;
    const addrOrgBefore = addrOrg;
    if (addrOrg > 0) addrOrg--;
    const letterhead = letterheadLineIsOrg(line, text, thisLineStart, spans);
    if (letterhead && cur === "person") {
      owner[i] = "org-address";
      continue;
    }
    if (RECIPIENT_PUBLIC_BODY_RE.test(line)) {
      cur = "org";
      reach = 1;
      owner[i] = "org";
      continue;
    }
    if (lineLedByOrgHead(line)) {
      const soleTraderEvidence = !lineHasLegalForm(line) && (personSpanNearby(text, thisLineStart, spans) || !INSTITUTION_HEAD_RE.test(line) && (lineHasPersonTitleName(line) || i > 0 && lines[i - 1].trim() && lineHasPersonTitleName(lines[i - 1])));
      if (soleTraderEvidence) {
        cur = "person";
      } else {
        cur = "org";
        reach = ORG_BLOCK_REACH;
      }
    } else if (personLine.has(i) || PERSON_FIELD_LABEL_RE.test(line)) {
      cur = "person";
    } else if (cur === "person") {
      if (isPureOrgNameLine(line)) addrOrg = 3;
    } else if (lineNamesOrganisation(line) || ORG_CONTACT_STRONG_LINE_RE.test(line) || orgLine.has(i) && line.trim().length <= ORG_SOFT_LINE_MAX2) {
      cur = "org";
      reach = ORG_BLOCK_REACH;
    } else if (cur === "org" && CONTACT_FIELD_LABEL_RE.test(line)) {
      reach = ORG_BLOCK_REACH;
    } else if (cur === "org" && FIELD_LABEL_LINE_RE.test(line)) {
      cur = "";
    } else if (cur === "org" && --reach < 0) {
      cur = "";
    }
    owner[i] = letterhead ? "org" : cur === "person" && addrOrgBefore > 0 && !personLine.has(i) ? "org-block" : cur;
  }
  return { owner, personLine, lineOf };
}
function lineIndexer(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (at) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = lo + hi + 1 >> 1;
      if (starts[mid] <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
}
var LEGAL_FORM_AFTER_RE = /^[^\p{L}\n]*(?:[\p{L}&.-]+[^\S\n]+){0,2}(?:GmbH|AG|KG|UG|mbH|OHG|SE|Ltd|Inc|LLC|eG|e\.G\.|gGmbH)(?![\p{L}])/u;
function soleTraderMailbox(mail, persons, text, lineOf) {
  const mailLine = lineOf(mail.start);
  const ls = text.lastIndexOf("\n", Math.max(0, mail.start - 1)) + 1, le = text.indexOf("\n", mail.end);
  if (lineHasLegalForm(text.slice(ls, le === -1 ? text.length : le))) return false;
  for (const p of persons) {
    if (Math.abs(lineOf(p.start) - mailLine) > 3) continue;
    if (!mailboxDomainNamesPerson(mail.text, personNameTokens([p]))) continue;
    if (LEGAL_FORM_AFTER_RE.test(text.slice(p.end, p.end + 40))) continue;
    return true;
  }
  return false;
}
function personNameTokens(spans) {
  const names = /* @__PURE__ */ new Set();
  for (const s of spans) {
    if (s.category !== "PERSON") continue;
    const folded = s.text.normalize("NFC").toLowerCase();
    for (const t of folded.match(/[\p{L}]{2,}/gu) || []) {
      names.add(t);
      names.add(foldForMatch(t));
      const translit = t.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
      if (translit !== t) names.add(translit);
    }
  }
  return names;
}
var ORG_CONTACT_STRONG = "hotline|impressum|herausgeber|hersteller|zulassungsinhaber|pharmazeutischer unternehmer|redaktion|servicetelefon|bestellhotline|pressestelle|zentrale|sekretariat|gesch\xE4ftsf\xFChrung|geschaeftsfuehrung|klinikleitung|pflegedienstleitung|qualit\xE4tsmanagement|qualitaetsmanagement|kundenservice|kundendienst|helpdesk|customer service|technical support";
var ORG_CONTACT_STRONG_LABEL_RE = new RegExp(`(?:^|[^\\p{L}])\\p{L}*(?:${ORG_CONTACT_STRONG})\\b(?:[^\\p{L}]{0,4}|[^\\S\\r\\n]+(?:unter|\xFCber|ueber|per|via|at|on)[^\\p{L}]{0,4})$`, "iu");
var ORG_CONTACT_STRONG_LABEL_VIA_RE = new RegExp(`(?:^|[^\\p{L}])(?:unter|\xFCber|ueber|per|via|at|on)[^\\S\\r\\n]+(?:(?:der|dem|die|den|unserer|unserem|unsere|unseren|our|the)[^\\S\\r\\n]+)?\\p{L}*(?:${ORG_CONTACT_STRONG})\\b[^\\p{L}]{0,4}$`, "iu");
var EXTENSION_AFTER_RE = /^[^\S\r\n]*[,;]?[^\S\r\n]*(?:Durchwahl|Durchw\.|Apparat|App\.|Nebenstelle|ext\.|extension)[^\S\r\n]*:?[^\S\r\n]*\d/iu;
var BRANCH_BEFORE_RE = new RegExp("(?:^|[^\\p{L}])(?:Filiale|Niederlassung|Gesch\xE4ftsstelle|Zweigstelle|Servicestelle)(?:[^\\S\\r\\n]+\\p{Lu}[\\p{L}-]*){0,2}[^\\S\\r\\n]+(?:unter|\xFCber|per)[^\\p{L}]{0,4}$", "u");
var ORG_CONTACT_STRONG_WORD_RE = new RegExp(`(?:^|[^\\p{L}])(?:${ORG_CONTACT_STRONG})(?![\\p{L}])`, "iu");
var ORG_CONTACT_STRONG_LINE_RE = new RegExp(`^[\\s\\-*\u2022]*(?:(?:R\xFCckfragen|Rueckfragen|Kontakt|Contact)[^\\S\\r\\n]*:[^\\S\\r\\n]*)?\\p{L}*(?:${ORG_CONTACT_STRONG}|abteilung)\\b[^\\p{L}]{0,4}`, "iu");
function lineHasPersonalContact(line, ctx) {
  for (const m of line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []) {
    if (mailboxNamesPerson(m, ctx.names)) return true;
  }
  return false;
}
var SEPA_CREDITOR_ID_RE = /^[A-Z]{2}\d{2}ZZZ/i;
var IBAN_LEGAL_HOLDER_RE = /([\p{L}\p{N}_&.'\-]+(?:[^\S\n]+[\p{L}\p{N}_&.'\-]+){0,3})[^\S\n]+(?:GmbH|gGmbH|AG|UG(?:[^\S\n]*\(haftungsbeschränkt\))?|e\.[^\S\n]?V\.|eG|SE|Ltd\.?|Inc\.?|LLC|mbH)(?![\p{L}])/gu;
var BANK_LEGAL_FORM_RE = /(?:^|[^\p{L}])(?:AG|eG|SE|KG|KGaA|GmbH|mbH|AöR|e\.[^\S\n]?V\.)(?![\p{L}])/u;
var IBAN_BANK_WORD_RE = /bank|sparkasse|kasse|raiffeisen|postbank|giro|kredit|landesbank|deka|ing\b|n26|revolut|comdirect|consors/iu;
function ibanLineNamesLegalPerson(text, span) {
  const from = text.lastIndexOf("\n", Math.max(0, span.start - 1)) + 1;
  const to = text.indexOf("\n", span.end);
  let scope = text.slice(from, to === -1 ? text.length : to);
  const prevFrom = text.lastIndexOf("\n", Math.max(0, from - 2)) + 1;
  const prev = from > 0 ? text.slice(prevFrom, from - 1) : "";
  if (/kontoinhaber|account holder|zahlungsempfänger|empfänger/iu.test(prev)) scope = prev + "\n" + scope;
  for (const m of scope.matchAll(IBAN_LEGAL_HOLDER_RE)) if (!IBAN_BANK_WORD_RE.test(m[1])) return true;
  const lead = text.slice(Math.max(from, span.start - 120), span.start);
  const org = IBAN_ORG_ACCOUNT_RE.exec(lead);
  if (org && lead.length - (org.index + org[0].length) <= 45 && !/[.;!?]/.test(lead.slice(org.index + org[0].length))) return true;
  return false;
}
var IBAN_ORG_ACCOUNT_RE = /(?:Konto|Bankverbindung|Kontoverbindung)[^\S\n]*(?:der|des|vom|von)?[^\S\n]*(?:Stadtkasse|Gemeindekasse|Gerichtskasse|Landeskasse|Kreiskasse|Gesellschaft|(?:Wohnungs)?[Ee]igentümergemeinschaft|WEG|Förderverein|Kirchengemeinde|Pfarrgemeinde|Stiftung|Pflegekasse|Krankenkasse)(?![\p{L}])/iu;
var NAMED_HONORIFIC_BEFORE_RE = new RegExp("(?:^|[^\\p{L}])(?:frau|herrn?|dr|mr|mrs|ms)\\.?[^\\S\\n]+\\p{L}+[^\\p{L}]*$", "iu");
function personNamedNear(text, from, before, names) {
  if (!names || !names.size) return false;
  let ps = from;
  for (let k = 0; k < 2 && ps > 0; k++) ps = text.lastIndexOf("\n", ps - 2) + 1;
  const bareContactLine = /^[^\S\n]*(?:tel(?:efon)?|fon|durchwahl|direkt(?:wahl)?|mobil|fax|phone|direct(?: line)?|ext(?:ension)?)?\.?[^\S\n]*:?[^\S\n]*$/i.test(before);
  const above = text.slice(ps, from);
  if (lineHasLegalForm(before) && new RegExp("(?:Gesch[\xE4a]e?ftsf(?:\xFC|ue)hr|Vorstand|Prokur|Inhaber)\\p{L}*[^\\S\\n]*:?[^\\S\\n]+\\p{Lu}[^\xB7|]*[\xB7|][^\\S\\n]*[^\xB7|]*$", "u").test(before)) return false;
  const segs = [before];
  if (bareContactLine && !/vorstand|geschäftsführ|aufsichtsrat|hrb|ust|sehr geehrte|liebe|dear/i.test(above)) segs.push(above);
  return segs.some((seg) => {
    const toks = (seg.toLowerCase().match(new RegExp("\\p{L}{3,}", "gu")) || []).filter((t) => names.has(t) && !isCommonWord(t));
    return toks.length >= 2 || toks.length === 1 && new RegExp("(?:^|[^\\p{L}])(?:frau|herrn?|dr|mr|mrs|ms)\\.?[^\\S\\n]+\\p{L}", "iu").test(seg);
  });
}
function personNamedBefore(before, line, names) {
  if (!names || !names.size || CAPITAL_OR_INSTITUTION_RE.test(line)) return false;
  const toks = (before.toLowerCase().match(new RegExp("\\p{L}{3,}", "gu")) || []).filter((t) => names.has(t) && !isCommonWord(t));
  return toks.length >= 2 || toks.length === 1 && NAMED_HONORIFIC_BEFORE_RE.test(before.replace(/[^\p{L}\s.]+[^\p{L}]*$/u, ""));
}
var OFFICIAL_ROLE_BEFORE_RE = /(?:richter|sachbearbeit|bearbeiter|ansprechpartner|leiter|referent|rechtspfleger|mitarbeiter|vorsitzend|i\.[^\S\n]?a\.|im auftrag|contact|clerk|officer)/iu;
function personOwnedAddresses(raw, text) {
  for (const s of raw) {
    if (s.category !== "ADDRESS" || !s.orgContact) continue;
    const from = text.lastIndexOf("\n", Math.max(0, s.start - 1)) + 1;
    const to = text.indexOf("\n", s.end);
    const clauseEnd = (() => {
      const r = /[;(\n]/.exec(text.slice(s.end, to === -1 ? text.length : to));
      return r ? s.end + r.index : to === -1 ? text.length : to;
    })();
    const named = raw.some((p) => p.category === "PERSON" && /\s/.test(p.text.trim()) && (p.source !== "ner" || p.score >= 0.5) && p.start >= from && p.end <= s.start && /^[^\S\n]*[,·|]?[^\S\n]*$/.test(text.slice(p.end, s.start)) && !OFFICIAL_ROLE_BEFORE_RE.test(text.slice(from, p.start)) && !CAPITAL_OR_INSTITUTION_RE.test(text.slice(p.start, clauseEnd)) && // R8: the person is the legal person's REPRESENTATIVE ("Stolle GmbH, vertreten durch die Geschäftsführer …,
    // Industriestraße 19") — the address that follows is the company's.
    !(REPRESENTATIVE_CUE_RE.test(text.slice(from, p.start)) && addressFollowsOrganisation(text, s.start)));
    if (named) {
      s.orgContact = false;
      s.forceReview = false;
    }
  }
}
function isOrganisationContact(span, text, ctx) {
  if (!ORG_CONTACT_CATEGORIES.has(span.category)) return false;
  if (soleTraderContext(text, span.start)) return false;
  if (span.category === "EMAIL") {
    const addr = span.text.trim();
    if (span.roleMailbox) return false;
    if (mailboxNamesPerson(addr, ctx.names)) return false;
    if (mailboxIsOrganisational(addr, ctx.names)) return true;
  }
  if (span.category === "PHONE" && SERVICE_NUMBER_RE.test(span.text.trim())) return true;
  if (span.category === "PHONE" && SWITCHBOARD_RE.test(span.text.trim())) return true;
  if (span.category === "IBAN" && SEPA_CREDITOR_ID_RE.test(span.text.replace(/\s+/g, ""))) return true;
  if (span.category === "IBAN") return ibanLineNamesLegalPerson(text, span);
  if (span.category === "BIC") {
    const ls = text.lastIndexOf("\n", Math.max(0, span.start - 1)) + 1;
    const ps = ls > 0 ? text.lastIndexOf("\n", ls - 2) + 1 : ls;
    const le = text.indexOf("\n", span.end);
    const scope = text.slice(ps, le === -1 ? text.length : le);
    const ib = /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,3})?\b/.exec(scope);
    if (ib) return ibanLineNamesLegalPerson(text, { start: ps + ib.index, end: ps + ib.index + ib[0].length });
    const bicLine = text.slice(ls, le === -1 ? text.length : le);
    if (IBAN_BANK_WORD_RE.test(bicLine) && !BANK_LEGAL_FORM_RE.test(bicLine)) return ibanLineNamesLegalPerson(text, span);
  }
  const from = text.lastIndexOf("\n", Math.max(0, span.start - 1)) + 1;
  const to = text.indexOf("\n", span.end);
  const line = text.slice(from, to === -1 ? text.length : to);
  const before = text.slice(from, span.start).replace(new RegExp("(?:\\p{L}{1,5}\\.[^\\S\\r\\n]*)+$", "u"), "");
  if (ORG_CONTACT_STRONG_LABEL_VIA_RE.test(before)) return true;
  if ((span.category === "PHONE" || span.category === "FAX") && personNamedNear(text, from, before, ctx.names)) return false;
  if (ORG_CONTACT_STRONG_LABEL_RE.test(before)) return true;
  if (personNamedBefore(before, line, ctx.names)) return false;
  if (span.category === "PHONE" && MOBILE_NUMBER_RE.test(span.text.trim())) return false;
  if (span.category === "PHONE" && (BRANCH_BEFORE_RE.test(before) || EXTENSION_AFTER_RE.test(text.slice(span.end, span.end + 40)))) return true;
  if (personalOwnerBefore(text, span.start, span.end)) return false;
  if (lineHasPersonalContact(line, ctx)) return false;
  if (ORG_CONTACT_STRONG_LINE_RE.test(before)) return true;
  if (!/[.!?]["')\]]?[^\S\r\n]*$/.test(text.slice(Math.max(0, from - 200), from).trimEnd())) {
    const prevFrom = text.lastIndexOf("\n", Math.max(0, from - 2)) + 1;
    if (ORG_CONTACT_STRONG_WORD_RE.test(text.slice(prevFrom, Math.max(prevFrom, from - 1)))) return true;
  }
  const own = ctx.owner[ctx.lineOf(span.start)];
  if (own === "org-block") return span.category === "ADDRESS" && /^[^\S\n]*$/.test(text.slice(from, span.start));
  return own === "org" || own === "org-address" && span.category === "ADDRESS";
}
function anchorsDataSubject(span, text) {
  if (!span.accepted || !SUBJECT_ANCHOR_CATEGORIES.has(span.category)) return false;
  if (span.category === "PHONE" && SERVICE_NUMBER_RE.test(span.text.trim())) return false;
  if (span.category === "PERSON" && !/\s/.test(span.text.trim())) return false;
  const from = text.lastIndexOf("\n", Math.max(0, span.start - 1)) + 1;
  const before = text.slice(from, span.start).replace(new RegExp("(?:\\p{L}{1,5}\\.[^\\S\\r\\n]*)+$", "u"), "");
  if (ORG_CONTACT_LABEL_RE.test(before)) return false;
  if (ORG_CONTACT_LINE_RE.test(before)) return false;
  if (!/[.!?]["')\]]?[^\S\r\n]*$/.test(text.slice(Math.max(0, from - 200), from).trimEnd())) {
    const prevFrom = text.lastIndexOf("\n", Math.max(0, from - 2)) + 1;
    const prevLine = text.slice(prevFrom, Math.max(prevFrom, from - 1));
    if (ORG_CONTACT_WORD_RE.test(prevLine)) return false;
  }
  return true;
}
function documentHasDataSubject(spans, text) {
  return spans.some((s) => anchorsDataSubject(s, text)) || PERSON_FIELD_LABEL_RE.test(text);
}
var SUBJECT_BOUND_TERM_CATEGORIES = /* @__PURE__ */ new Set(["RELIGION", "AFFILIATION", "NATIONALITY"]);
var isSubjectBound = (s) => SUBJECT_REQUIRED_CATEGORIES.has(s.category) || SUBJECT_BOUND_TERM_CATEGORIES.has(s.category) && s.source === "regex" && s.score <= 0.8;
function dropSubjectlessSpecialCategories(spans, text) {
  if (!spans.some(isSubjectBound)) return spans;
  return documentHasDataSubject(spans, text) ? spans : spans.filter((s) => !isSubjectBound(s) || personalSubjectAt(text, s.start, s.end));
}
var ADDRESSES_PERSON_RE = new RegExp(
  "(?:^|[\\n\\r>])[^\\S\\r\\n]*(?:sehr\\s+geehrte[rn]?|guten\\s+tag|hallo|liebe[rs]?|dear|hi|hello|thank\\s+you,)[^\\S\\r\\n]+(?:(?:herrn?|frau|mr|mrs|ms|dr|prof)\\.?[^\\S\\r\\n]+){0,3}\\p{Lu}\\p{L}+",
  "iu"
);
var DOC_TITLE_BEFORE_RE = new RegExp(
  "(?:Lieferschein(?:[- ]?(?:Nr|nummer)\\.?)?|Incident[- ]?(?:Report|Bericht)?|Invoice(?:[ -]?(?:No|Nr|number|nummer|ref)\\.?)?|Projekt(?:[- ]?(?:Nr|nummer|AZ)\\.?)?|Kennziffer|Fallstudie|Qualit\xE4tsvereinbarung|Case[ -]study)[ \\t:.#-]*$",
  "iu"
);
var TICKET_BEFORE_RE = /(?:ticket|issue|jira)(?:[- ]?(?:nr|nummer|id|number|ref(?:erenz)?)\.?)?[ \t:.#(-]*$/iu;
var STAFF_BEFORE_RE = new RegExp("(?:\\b(?:von|durch|by|erstellt|created|opened|verfasser(?:in)?|autor(?:in)?|bearbeiter(?:in)?|sachbearbeit\\p{L}*|reviewer|entwickler(?:in)?|developer|ansprechpartner(?:in)?|ansprechperson|agent|support|lead|protokoll|from)\\b[^\\p{L}\\n]*(?:(?:herrn?|frau|mr|mrs|ms|dr|prof)\\.?[ \\t]+|\\p{L}+\\.[ \\t]*)*)$", "iu");
var LINK_CATEGORIES = /* @__PURE__ */ new Set(["EMAIL", "PHONE", "IBAN", "DOB", "ADDRESS", "ID_CARD", "TAX_ID", "SV_ID", "HEALTH_INSURANCE"]);
function recordRefIsNotPersonal(span, spans, text) {
  const from = text.lastIndexOf("\n", Math.max(0, span.start - 1)) + 1;
  const before = text.slice(Math.max(from, span.start - 40), span.start);
  if (DOC_TITLE_BEFORE_RE.test(before)) return true;
  if (!/^[A-Za-z]/.test(span.text) || !TICKET_BEFORE_RE.test(before)) return false;
  const prev = from > 0 ? text.lastIndexOf("\n", from - 2) + 1 : 0;
  const to0 = text.indexOf("\n", span.end);
  const to = to0 === -1 ? text.length : to0;
  const next0 = to0 === -1 ? -1 : text.indexOf("\n", to0 + 1);
  const hi = to0 === -1 ? text.length : next0 === -1 ? text.length : next0;
  for (const o of spans) {
    if (o === span || !o.accepted || o.start < prev || o.end > hi) continue;
    if (LINK_CATEGORIES.has(o.category)) return false;
    if (o.category === "PERSON") {
      const ls = text.lastIndexOf("\n", Math.max(0, o.start - 1)) + 1;
      if (!STAFF_BEFORE_RE.test(text.slice(Math.max(ls, o.start - 40), o.start))) return false;
    }
  }
  return true;
}
function promoteRecordRefs(spans, text) {
  if (!spans.some((s) => s.recordRef)) return spans;
  if (!documentHasDataSubject(spans, text)) return spans;
  for (const span of spans) {
    if (!span.recordRef) continue;
    if (recordRefIsNotPersonal(span, spans, text)) continue;
    span.forceReview = false;
    assignTier(span);
  }
  return spans;
}
var PROPAGATION_MIN_TOKEN = 3;
function propagationSurfaces(accepted) {
  const surfaces = /* @__PURE__ */ new Set();
  const ambiguous = /* @__PURE__ */ new Set();
  for (const s of accepted) {
    if (!s.accepted || s.category !== "PERSON" || s.identityAmbiguous) continue;
    const surface = s.text.trim();
    const single = !/\s/.test(surface);
    const surfaceBlocked = single && (isCommonWord(surface) || KEEP_TERMS.has(surface.toLowerCase()) || isEnglishRoleWord(surface.toLowerCase()) || isAbstractVocabulary(surface));
    if (surface.length >= PROPAGATION_MIN_TOKEN && !surfaceBlocked) {
      surfaces.add(surface);
    } else if (single && isAmbiguousSurnameCandidate(surface)) {
      ambiguous.add(surface);
    }
    const tokens = surface.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) continue;
    for (const token of tokens) {
      const clean = token.replace(/[^\p{L}\p{N}\-']/gu, "");
      if (clean.length < PROPAGATION_MIN_TOKEN) continue;
      if (!new RegExp("^\\p{Lu}", "u").test(clean)) continue;
      if (NON_NAME_WORDS.has(clean.toLowerCase())) continue;
      if (KEEP_TERMS.has(clean.toLowerCase()) || isEnglishRoleWord(clean.toLowerCase())) continue;
      if (isAbstractVocabulary(clean)) continue;
      if (isCommonWord(clean)) {
        if (isAmbiguousSurnameCandidate(clean)) ambiguous.add(clean);
        continue;
      }
      surfaces.add(clean);
    }
  }
  return { surfaces, ambiguous };
}
var AMBIGUOUS_MIN_TOKEN = 4;
function isAmbiguousSurnameCandidate(word) {
  return word.length >= AMBIGUOUS_MIN_TOKEN && new RegExp("^\\p{Lu}", "u").test(word) && !KEEP_TERMS.has(word.toLowerCase()) && !isEnglishRoleWord(word.toLowerCase()) && !NON_NAME_WORDS.has(word.toLowerCase()) && vocabularyVerdict(word, "PERSON", looksLikeGivenName) !== "drop";
}
var NAME_CONTEXT_BEFORE_RE = new RegExp(
  "(?:^|[^\\p{L}])(?:(?:Herrn?|Frau|Hr\\.|Fr\\.|Fam\\.|Familie|Mr\\.?|Mrs\\.?|Ms\\.?|Miss|Mx\\.?|Dr\\.|Prof\\.|Kollege|Kollegin|Mandant|Mandantin|Patient|Patientin|Kunde|Kundin)[ \\t]+(?:(?:Dr|Prof|med|jur|rer|nat|habil)\\.?[ \\t]+)*)$",
  "iu"
);
var INITIAL_BEFORE_NAME_RE = new RegExp("(?:^|[^\\p{L}\\p{N}])\\p{Lu}\\.(?:-\\p{Lu}\\.)?[ \\t]?$", "u");
var GIVEN_BEFORE_RE = new RegExp("(?:^|[^\\p{L}\\p{N}])(\\p{Lu}[\\p{L}'-]*)[ \\t]$", "u");
var GIVEN_AFTER_RE = new RegExp("^,[ \\t]?(\\p{Lu}[\\p{L}'-]*)(?![\\p{L}])", "u");
var INITIAL_AFTER_NAME_RE = new RegExp("^,[ \\t]?\\p{Lu}\\.", "u");
function hasNameContext(text, start, end, givenTokens) {
  const before = text.slice(Math.max(0, start - 40), start);
  if (NAME_CONTEXT_BEFORE_RE.test(before) || INITIAL_BEFORE_NAME_RE.test(before)) return true;
  const g = GIVEN_BEFORE_RE.exec(before);
  if (g && (looksLikeGivenName(g[1]) || givenTokens.has(g[1]))) return true;
  const commaInside = text[end - 1] === ",";
  const after = (commaInside ? "," : "") + text.slice(end, end + 40);
  const a = GIVEN_AFTER_RE.exec(after);
  if (a) {
    const given = a[1][0] + a[1].slice(1).toLowerCase();
    if (looksLikeGivenName(a[1]) || looksLikeGivenName(given) || givenTokens.has(a[1])) return true;
  }
  return INITIAL_AFTER_NAME_RE.test(after);
}
var letterSpaced = (token) => [...token.replace(/[^\p{L}]/gu, "")].join(" ");
var NICKNAME_SUFFIXES = ["i", "y", "ie"];
function nicknameCandidates(given) {
  const g = given.toLowerCase();
  const out = /* @__PURE__ */ new Set();
  for (const start of [0, 2]) {
    for (const len of [3, 4, 5]) {
      if (start + len > g.length - 1) continue;
      const base = g.slice(start, start + len);
      if (!/^[^aeiouäöü]/.test(base) && start > 0) continue;
      for (const suf of NICKNAME_SUFFIXES) {
        if (/[aeiouyäöü]$/.test(base)) continue;
        out.add(base[0].toUpperCase() + base.slice(1) + suf);
      }
      if (start === 0 && len >= 4 && len <= g.length - 2) out.add(base[0].toUpperCase() + base.slice(1));
    }
  }
  out.delete(given);
  return [...out].filter((c) => c.length >= 4 && c.length <= 8 && !/[^\p{L}]/u.test(c));
}
var NAME_TITLE_TOKENS = /* @__PURE__ */ new Set(["dr", "prof", "med", "jur", "dipl", "ing", "herr", "herrn", "frau", "mr", "mrs", "ms", "miss"]);
function initialsVariants(resolved) {
  const out = /* @__PURE__ */ new Set();
  for (const sp of resolved) {
    if (!sp.accepted || sp.category !== "PERSON" || sp.identityAmbiguous) continue;
    const tokens = sp.text.trim().split(/\s+/).map((t) => t.replace(/^[^\p{L}]+|[^\p{L}-]+$/gu, "")).filter((t) => new RegExp("^\\p{Lu}[\\p{L}'\u2019-]+$", "u").test(t) && !NAME_TITLE_TOKENS.has(t.toLowerCase().replace(/\.$/, "")));
    if (tokens.length < 2 || tokens.length > 4) continue;
    const letters = tokens.map((t) => t.split("-").filter(Boolean).map((part) => part[0].toUpperCase() + ".").join("-"));
    if (letters.some((x) => !new RegExp("^\\p{Lu}\\.(?:-\\p{Lu}\\.)*$", "u").test(x))) continue;
    out.add(letters.join(""));
    out.add(letters.join(" "));
    if (tokens.length > 2) {
      const both = [letters[0], letters[letters.length - 1]];
      out.add(both.join(""));
      out.add(both.join(" "));
    }
  }
  return out;
}
var TRANSLIT = { "\xE4": "ae", "\xF6": "oe", "\xFC": "ue", "\xDF": "ss", "\xF8": "oe", "\xE6": "ae", "\u0153": "oe", "\u0131": "i", "\u0111": "d", "\u0142": "l", "\xF0": "d", "\xFE": "th" };
function foldName(w) {
  return w.toLowerCase().replace(/[äöüßøæœıđłðþ]/g, (c) => TRANSLIT[c]).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
}
function withinOneEdit(a, b) {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}
function endsDiffer(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i >= n - 1;
}
function acceptSpellingVariants(resolved) {
  const known = /* @__PURE__ */ new Set();
  const knownSurface = /* @__PURE__ */ new Map();
  for (const sp of resolved) {
    if (!sp.accepted || sp.category !== "PERSON" || sp.identityAmbiguous) continue;
    for (const raw of sp.text.split(/[\s,]+/)) {
      for (const part of [raw, ...raw.split("-")]) {
        const t = part.replace(/[^\p{L}'’-]/gu, "");
        if (t.length >= 5 && new RegExp("^\\p{Lu}", "u").test(t)) {
          known.add(foldName(t));
          if (!knownSurface.has(foldName(t))) knownSurface.set(foldName(t), t);
        }
      }
    }
  }
  if (!known.size) return;
  for (const sp of resolved) {
    if (sp.accepted || sp.category !== "PERSON" || sp.source !== "ner" || sp.identityAmbiguous) continue;
    const word = sp.text.trim();
    if (!new RegExp("^\\p{Lu}[\\p{L}'\u2019-]{4,}$", "u").test(word)) continue;
    const f = foldName(word);
    if (f.length < 5) continue;
    for (const k of known) {
      if (f === k && word !== knownSurface.get(k) || f.length >= 7 && withinOneEdit(f, k) && !endsDiffer(f, k) && !isGenericRoleWord(sp) && !isCommonWord(word) && !isCommonWord(word.toLowerCase())) {
        sp.accepted = true;
        sp.tier = "auto";
        sp.reviewReason = "";
        break;
      }
    }
  }
}
function nicknameVariants(resolved) {
  const out = /* @__PURE__ */ new Set();
  const seenGiven = /* @__PURE__ */ new Set();
  for (const sp of resolved) {
    if (!sp.accepted || sp.category !== "PERSON") continue;
    for (const raw of sp.text.trim().split(/[\s-]+/)) {
      const t = raw.replace(/[^\p{L}]/gu, "");
      if (t.length < 5 || seenGiven.has(t) || !new RegExp("^\\p{Lu}", "u").test(t) || !looksLikeGivenName(t)) continue;
      seenGiven.add(t);
      for (const c of nicknameCandidates(t)) {
        if (looksLikeGivenName(c) || isCommonWord(c) || isCommonWord(c.toLowerCase()) || KEEP_TERMS.has(c.toLowerCase()) || NON_NAME_WORDS.has(c.toLowerCase()) || vocabularyVerdict(c, "PERSON", looksLikeGivenName) === "drop") continue;
        out.add(c);
      }
    }
  }
  return out;
}
var PROP_DAY_BEFORE_RE = /(?:^|[^\p{L}\p{N}])\d{1,2}\.?[^\S\r\n]*$/u;
var PROP_YEAR_AFTER_RE = /^[^\S\r\n]*(?:\d{4}|'\d{2})(?![\p{L}\p{N}])/u;
var PROP_PLACE_HEAD_BEFORE_RE = new RegExp("(?:^|[^\\p{L}])\\p{L}*(?:[Ss]tadt|[Kk]asse|[Gg]ericht|[Ww]erk|[Kk]reis|[Rr]egion|[Bb]ezirk|[Uu]niversit\xE4t|[Hh]ochschule|[Kk]linikum|[Aa]bteilung|[Ff]iliale|[Ss]tandort|[Gg]emeinde|[Bb]istum|[Ll]andkreis|[Ss]parkasse|[Vv]olksbank|[Rr]aiffeisenbank|[Ww]erke|[Aa]nwaltschaft|[Aa]mt|[Dd]irektion|[Pp]r\xE4sidium|[Vv]erwaltung|[Kk]ammer|[Ss]chule|[Pp]olizei|[Gg]ymnasium|[Pp]farrei|[Kk]irche|[Kk]rankenhaus|[Kk]linik)[^\\S\\r\\n]+$", "u");
var ADDRESS_CITY_RE = new RegExp("(?<!\\d)\\d{5}[ \\t]*[-,]?[ \\t]+(\\p{Lu}[\\p{L}'-]+)", "gu");
function addressCityWords(resolved) {
  const out = /* @__PURE__ */ new Set();
  for (const s of resolved) {
    if (!s.accepted || s.category !== "ADDRESS") continue;
    ADDRESS_CITY_RE.lastIndex = 0;
    let m;
    while (m = ADDRESS_CITY_RE.exec(s.text)) out.add(m[1]);
  }
  return out;
}
function propagationContextBlocks(text, start, end, variants, cityWords) {
  if (looksLikeGivenName(text.slice(start, end)) && givenNameLeadsProduct(text, end)) return true;
  if (cityWords && cityWords.size && cityWords.has(text.slice(start, end)) && !hasNameContext(text, start, end, /* @__PURE__ */ new Set())) return true;
  const nextIsCompound = text[end] === "-" && new RegExp("\\p{L}", "u").test(text[end + 1] || "");
  const prevIsCompound = text[start - 1] === "-" && new RegExp("\\p{L}", "u").test(text[start - 2] || "");
  if (nextIsCompound || prevIsCompound) {
    const a = prevIsCompound ? text.slice(0, start - 1).search(/[\p{L}]+$/u) : start;
    const from = a < 0 ? start : a;
    const m = /^[\p{L}]+(?:-[\p{L}]+)*/u.exec(text.slice(from));
    if (!(m && (variants.has(m[0]) || hasNameContext(text, from, from + m[0].length, /* @__PURE__ */ new Set())))) return true;
  }
  if (PROP_PLACE_HEAD_BEFORE_RE.test(text.slice(Math.max(0, start - 40), start))) return true;
  const word = text.slice(start, end).toLowerCase();
  if (CALENDAR_TOKENS.has(word)) {
    const after = text.slice(end, end + 8);
    if (PROP_YEAR_AFTER_RE.test(after) || PROP_DAY_BEFORE_RE.test(text.slice(Math.max(0, start - 6), start))) return true;
  }
  return false;
}
function personOccurrenceIsNotThePerson(text, start, end) {
  const value = text.slice(start, end);
  if (!new RegExp("^\\p{L}+$", "u").test(value)) return false;
  if (PROP_PLACE_HEAD_BEFORE_RE.test(text.slice(Math.max(0, start - 40), start))) return true;
  const lower = value[0] !== value[0].toUpperCase();
  return looksLikeGivenName(lower ? value[0].toUpperCase() + value.slice(1) : value) && givenNameLeadsProduct(text, end, lower);
}
var BRAND_COMPOUND_PARTNERS = /* @__PURE__ */ new Set(["benz", "amg", "royce", "davidson", "cola", "packard", "romeo", "rover", "martin", "k\xE4ssbohrer"]);
function nameInHyphenCompound(t, a, b) {
  const prev = t[a - 1] === "-" && new RegExp("\\p{L}", "u").test(t[a - 2] || "") ? new RegExp("\\p{L}+$", "u").exec(t.slice(Math.max(0, a - 41), a - 1))?.[0] : null;
  const next = t[b] === "-" && new RegExp("\\p{L}", "u").test(t[b + 1] || "") ? new RegExp("^\\p{L}+", "u").exec(t.slice(b + 1, b + 41))?.[0] : null;
  if (!prev && !next) return false;
  return [prev, next].filter(Boolean).every((w) => new RegExp("^\\p{Ll}", "u").test(w) || isCommonWord(w) || BRAND_COMPOUND_PARTNERS.has(w.toLowerCase()));
}
function knownValueNotThePerson(text, start, end) {
  if (personOccurrenceIsNotThePerson(text, start, end)) return true;
  return new RegExp("^\\p{L}+$", "u").test(text.slice(start, end)) && nameInHyphenCompound(text, start, end);
}
function propagateEntities(text, resolved) {
  const { surfaces, ambiguous } = propagationSurfaces(resolved);
  if (!surfaces.size && !ambiguous.size) return [];
  const variants = /* @__PURE__ */ new Set();
  for (const s of surfaces) {
    variants.add(s);
    const upper = s.toUpperCase();
    if (upper !== s) variants.add(upper);
    const lower = s.toLowerCase();
    if (lower !== s && lower.length >= PROPAGATION_MIN_TOKEN && !/\s/.test(lower) && looksLikeGivenName(s) && !isCommonWord(lower) && !isEnglishRoleWord(lower) && !KEEP_TERMS.has(lower)) variants.add(lower);
    if (!/\s/.test(s) && s.length >= 4 && s.length <= 20 && new RegExp("^\\p{L}+$", "u").test(s)) {
      variants.add(letterSpaced(upper));
    }
    if (/^[^\s-]+-[^\s-]+$/.test(s)) {
      const i = s.indexOf("-");
      variants.add(`${s.slice(0, i + 1)}
${s.slice(i + 1)}`);
      variants.add(`${s.slice(0, i + 1)} ${s.slice(i + 1)}`);
    }
  }
  const nicks = nicknameVariants(resolved);
  for (const nick of nicks) variants.add(nick);
  for (const v of initialsVariants(resolved)) variants.add(v);
  const occ = new Uint8Array(text.length);
  const acceptedPersons = [];
  for (const s of resolved) {
    if (!s.accepted) continue;
    for (let i = s.start; i < s.end && i < occ.length; i++) occ[i] = 1;
    if (s.category === "PERSON") acceptedPersons.push(s);
  }
  const extra = [];
  const isTaken = (start, end) => {
    for (let i = start; i < end; i++) {
      if (!occ[i]) continue;
      const inner = acceptedPersons.filter((p) => p.start < end && p.end > start);
      const covered = inner.length > 0 && inner.every((p) => p.start >= start && p.end <= end && p.end - p.start < end - start);
      let allInner = covered;
      if (allInner) {
        for (let j = start; j < end; j++) if (occ[j] && !inner.some((p) => j >= p.start && j < p.end)) {
          allInner = false;
          break;
        }
      }
      return !allInner;
    }
    return false;
  };
  const cityWords = addressCityWords(resolved);
  for (const m of literalNameMatches(text, variants)) {
    const start = m.index;
    const end = start + m[0].length;
    const singleToken = !/\s/.test(m[0]);
    if (!variants.has(m[0]) && nicks.has(m[0].replace(/['’]?s$/, ""))) continue;
    if (!isTaken(start, end) && !(singleToken && determinerBlocksName(text, start)) && !(singleToken && propagationContextBlocks(text, start, end, variants, cityWords))) {
      extra.push(new PiiSpan(start, end, "PERSON", m[0], 0.9, "coref"));
    }
  }
  if (ambiguous.size) {
    const givenTokens = /* @__PURE__ */ new Set();
    const taken = new Set(extra.map((s) => s.start));
    const ambiguousVariants = /* @__PURE__ */ new Set();
    for (const w of ambiguous) {
      ambiguousVariants.add(w);
      ambiguousVariants.add(w.toUpperCase());
    }
    for (const m of literalNameMatches(text, ambiguousVariants)) {
      const start = m.index;
      const end = start + m[0].length;
      if (taken.has(start) || isTaken(start, end)) continue;
      if (determinerBlocksName(text, start)) continue;
      if (!hasNameContext(text, start, end, givenTokens)) continue;
      extra.push(new PiiSpan(start, end, "PERSON", m[0], 0.9, "coref"));
    }
  }
  return extra;
}
var LOCATION_PROPAGATION_MIN = 3;
var LOCALITY_CONNECTOR = "(?:am|an|auf|im|in|ob|vor|bei|der|den|dem|des|a\\.|i\\.|u\\.)";
var LOCALITY_CITY_WORD = `[\\p{Lu}][\\p{L}'-]+(?:[ \\t]+${LOCALITY_CONNECTOR}){0,2}(?:[ \\t]+[\\p{Lu}][\\p{L}'-]+){0,3}`;
var LOCALITY_TOKEN_RE = new RegExp(
  `(?:(\\d{4,5})[ \\t]*[-,]?[ \\t]+(${LOCALITY_CITY_WORD})|(${LOCALITY_CITY_WORD})[ \\t]*,?[ \\t]+(\\d{4,5}))`,
  "gu"
);
var DATELINE_AFTER_RE = /^[ \t]*,?[ \t]*(?:den[ \t]+)?(?:\d{1,2}\.[ \t]*(?:\d{1,2}\.|[\p{L}]+)[ \t]*\d{0,4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}(?:st|nd|rd|th)?[ \t]+(?:of[ \t]+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?![a-z]))/iu;
var JURISDICTION_BEFORE_RE = /(?:Gerichtsstand|Erfüllungsort|jurisdiction)[^\n.;:]{0,40}?(?:ist|sind|is|:)[ \t]*$/iu;
var PLACE_INSTITUTION_AFTER_RE = /^[ \t]+(?:Hbf|Hauptbahnhof|Bahnhof|Flughafen|Airport|hospital)(?![\p{L}])/u;
var PLACE_COMPOUND_SUFFIX_RE = /^[-‐-―][\p{L}]/u;
var PLACE_LISTING_PREFIX_RE = /\b(?:Standort|Niederlassung|Filiale|Zweigstelle|Sitz)[: \t]*$/iu;
var LOCATION_HOMONYM_WORDS = /* @__PURE__ */ new Set(["essen", "hof", "halle", "weil", "kiel"]);
var LOCATION_SAFE_PRECEDING_WORDS = /* @__PURE__ */ new Set([
  "in",
  "im",
  "am",
  "an",
  "zu",
  "zur",
  "zum",
  "bei",
  "nach",
  "von",
  "vom",
  "aus",
  "f\xFCr",
  "durch",
  "um",
  "\xFCber",
  "unter",
  "vor",
  "hinter",
  "neben",
  "zwischen",
  "gegen",
  "und",
  "oder",
  "sowie",
  "als",
  "wie",
  "die",
  "der",
  "das",
  "des",
  "dem",
  "den",
  "ein",
  "eine",
  "einer",
  "einem",
  "einen",
  "auch",
  "noch",
  "nur",
  "sehr",
  "the",
  "to",
  "from",
  "at",
  "near",
  "via"
]);
var PRECEDING_WORD_RE = /([\p{L}][\p{L}'-]*)[ \t]*$/u;
var CLAUSE_BOUNDARY_BEFORE_RE = /[.,;:()[\]\n"'„“]\s*$/;
function isProperNounCompoundMention(text, start) {
  let before = text.slice(Math.max(0, start - 40), start);
  if (!before || CLAUSE_BOUNDARY_BEFORE_RE.test(before)) return false;
  if (before.endsWith("/")) before = before.slice(0, -1);
  const m = PRECEDING_WORD_RE.exec(before);
  if (!m) return false;
  const word = m[1];
  if (LOCATION_SAFE_PRECEDING_WORDS.has(word.toLowerCase())) return false;
  return new RegExp("^\\p{Lu}", "u").test(word);
}
function isDatelineMention(text, start, end) {
  return DATELINE_AFTER_RE.test(text.slice(end, end + 24));
}
function isPlaceListingMention(text, start, end) {
  if (PLACE_COMPOUND_SUFFIX_RE.test(text.slice(end, end + 2))) return true;
  return PLACE_LISTING_PREFIX_RE.test(text.slice(Math.max(0, start - 24), start));
}
var STREET_PART_RE = /^[^\S\r\n]*((?:[\p{L}][\p{L}.'’-]*[^\S\r\n]+){0,3}[\p{L}][\p{L}.'’-]{3,}[^\S\r\n]+\d{1,4}[a-zA-Z]?(?:[-/]\d{1,4}[a-zA-Z]?)?)(?=[^\S\r\n]*[,·\n]|[^\S\r\n]+\d{4,5}[^\d]|$)/u;
var STREET_OPENER_RE = /^(?:Am|An der|An den|Auf dem|Auf der|Im|In der|Zum|Zur|Unter|Hinter|Vor|Bei|Über)[^\S\r\n]/u;
function propagateLocationTokens(text, resolved) {
  const tokens = /* @__PURE__ */ new Set();
  const singleWordCityTokens = /* @__PURE__ */ new Set();
  for (const s of resolved) {
    if (!s.accepted || s.category !== "ADDRESS") continue;
    const street = STREET_PART_RE.exec(s.text);
    if (street && street[1].length >= 8 && street[1].length < s.text.trim().length && (STREET_TYPE_RE.test(street[1]) || STREET_OPENER_RE.test(street[1]))) {
      tokens.add(street[1]);
    }
    LOCALITY_TOKEN_RE.lastIndex = 0;
    let m;
    while (m = LOCALITY_TOKEN_RE.exec(s.text)) {
      const postcode = m[1] || m[4];
      const city = m[2] || m[3];
      if (postcode && postcode.length === 5) tokens.add(postcode);
      if (city) {
        const firstWord = city.split(/\s+/)[0];
        if (city.length < LOCATION_PROPAGATION_MIN || isCommonWord(firstWord)) continue;
        if (/\s/.test(city)) tokens.add(city);
        else if (!LOCATION_HOMONYM_WORDS.has(firstWord.toLowerCase())) {
          tokens.add(city);
          singleWordCityTokens.add(city);
        }
      }
    }
  }
  if (!tokens.size) return [];
  const occ = new Uint8Array(text.length);
  for (const s of resolved) {
    if (s.accepted || s.category === "ADDRESS" || s.category === "ORG") {
      for (let i = s.start; i < s.end && i < occ.length; i++) occ[i] = 1;
    }
  }
  const extra = [];
  for (const m of literalNameMatches(text, tokens)) {
    const start = m.index;
    const end = start + m[0].length;
    let taken = false;
    for (let i = start; i < end; i++) {
      if (occ[i]) {
        taken = true;
        break;
      }
    }
    if (taken) continue;
    if (isOrgAddressLine(text, start, resolved)) continue;
    if (isInstitutionLetterhead(text, start)) continue;
    if (singleWordCityTokens.has(m[0]) && (isDatelineMention(text, start, end) || isPlaceListingMention(text, start, end) || isProperNounCompoundMention(text, start))) continue;
    if (!singleWordCityTokens.has(m[0]) && isDatelineMention(text, start, end) && !/\d/.test(m[0])) continue;
    if (JURISDICTION_BEFORE_RE.test(text.slice(Math.max(0, start - 60), start)) || PLACE_INSTITUTION_AFTER_RE.test(text.slice(end, end + 12))) continue;
    extra.push(new PiiSpan(start, end, "ADDRESS", m[0], 0.9, "coref"));
  }
  return extra;
}
var SOLE_TRADER_IN_RE = /(?:^|[\s(])(?:e\.[ \t]?K\.|e\.[ \t]?Kfm\.|e\.[ \t]?Kfr\.|e\.[ \t]?Kffr\.)(?![\p{L}])/u;
var SOLE_TRADER_AFTER_RE = /^[ \t]*(?:e\.[ \t]?K\.|e\.[ \t]?Kfm\.|e\.[ \t]?Kfr\.)(?![\p{L}])/u;
var SOLE_TRADER_BEFORE_RE = /(?:Einzelfirma|Einzelunternehmen|Einzelunternehmer(?:in)?)[ \t:]+$/u;
function isSoleTraderName(span, text) {
  return SOLE_TRADER_IN_RE.test(span.text) || SOLE_TRADER_AFTER_RE.test(text.slice(span.end, span.end + 12)) || SOLE_TRADER_BEFORE_RE.test(text.slice(Math.max(0, span.start - 20), span.start));
}
function assignTier(span, text, ctx) {
  const threshold = SETTINGS.autoselect_threshold;
  let ambiguous = REVIEW_REQUIRED_CATEGORIES.has(span.category);
  let reason = ambiguous ? "category" : "";
  if (span.category === "ORG" && SETTINGS.autoAcceptOrg) {
    ambiguous = false;
    reason = "";
  }
  if (span.category === "ORG" && isSoleTraderName(span, text)) {
    ambiguous = false;
    reason = "";
  }
  if (isUncorroboratedSingleNer(span, text)) {
    ambiguous = true;
    reason = reason || "single";
  }
  if (span.orgContact) {
    ambiguous = true;
    reason = "orgContact";
  }
  if (span.forceReview) {
    ambiguous = true;
    reason = reason || "ambiguous";
  }
  if (ctx && !SETTINGS.autoAcceptOrg && isOrganisationContact(span, text, ctx)) {
    ambiguous = true;
    span.orgContact = true;
    reason = "orgContact";
  }
  span.accepted = !ambiguous;
  span.tier = ambiguous || span.score < threshold ? "review" : "auto";
  if (!span.accepted) span.reviewReason = reason || (span.score < threshold ? "lowScore" : "");
}
function detect(text, nerSpans = [], options = {}) {
  const spaced = collapseLetterSpaced(text);
  if (spaced) {
    const extra = [];
    for (const s of detectNormalised(normaliseConfusables(spaced.text), [], {})) {
      if (!s.accepted) continue;
      if (!spaced.runs.some(([a, b]) => s.start < b && s.end > a)) continue;
      const [os, oe] = mapBack(spaced, s.start, s.end);
      if (oe > os) extra.push({ start: os, end: oe, category: s.category, score: s.score, source: "spaced" });
    }
    for (const [a, b] of spaced.runs) {
      const word = spaced.text.slice(a, b);
      if (!new RegExp("^\\p{L}{3,20}$", "u").test(word)) continue;
      const cap = word[0].toUpperCase() + word.slice(1).toLowerCase();
      if (word !== word.toUpperCase() || !looksLikeGivenName(cap)) continue;
      const [os, oe] = mapBack(spaced, a, b);
      if (oe > os && !extra.some((x) => x.start < oe && x.end > os)) extra.push({ start: os, end: oe, category: "PERSON", score: 0.8, source: "spaced" });
    }
    if (extra.length) options = { ...options, extraSpans: [...options.extraSpans || [], ...extra] };
  }
  const composed = composeReading(text);
  const original = text;
  const normalised = normaliseConfusables(text);
  let spans = detectNormalised(normalised, nerSpans, options);
  if (composed) {
    const extra = [];
    for (const s of detectNormalised(normaliseConfusables(composed.text), [], {})) {
      if (!s.accepted) continue;
      const [os, oe] = mapBackComposed(composed, s.start, s.end);
      if (oe > os && !spans.some((x) => x.start < oe && x.end > os && (x.category !== s.category && x.accepted || x.category === s.category && x.start <= os && x.end >= oe))) extra.push({ start: os, end: oe, category: s.category, score: s.score, source: s.source });
    }
    if (extra.length) spans = detectNormalised(normalised, nerSpans, { ...options, extraSpans: [...options.extraSpans || [], ...extra] });
  }
  if (normalised !== original) for (const s of spans) s.text = original.slice(s.start, s.end);
  return spans;
}
var NAME_PREFIX_GAP_RE = /^(?:[\s,]|Herrn?|Frau|Fr\.|Hr\.|Dr\.|Prof\.|med\.)*$/u;
function trimNameBeforeStreet(raw, text) {
  const persons = raw.filter((s) => s.category === "PERSON" && s.source === "ner" && s.score >= 0.5 && s.end > s.start).sort((x, y) => y.end - x.end);
  if (!persons.length) return raw;
  for (const a of raw) {
    if (a.category !== "ADDRESS" || a.source === "ner" || a.source === "table") continue;
    const origStart = a.start;
    for (let moved = true; moved; ) {
      moved = false;
      for (const p of persons) {
        if (p.end <= a.start || p.end >= a.end || p.start - origStart > 40) continue;
        if (p.start > a.start && !NAME_PREFIX_GAP_RE.test(text.slice(a.start, p.start))) continue;
        const gap = text.slice(p.end).match(/^[ \t]+/);
        if (!gap) continue;
        const newStart = p.end + gap[0].length;
        const rest = text.slice(newStart, a.end);
        if (!new RegExp("^\\p{Lu}", "u").test(rest) || !/(?<!\d)\d{5}(?!\d)/.test(rest)) continue;
        a.start = newStart;
        a.text = rest;
        moved = true;
        break;
      }
    }
  }
  return raw;
}
var DATE_COMMA_BEFORE_RE = /(?:Geburtsdatum|geb\.?|geboren|born|\bDOB)[^\n]{0,40}\d{4}[ \t]*,[ \t]*$/i;
function trimBirthplaceLineFromAddress(raw, text) {
  for (const a of raw) {
    if (a.category !== "ADDRESS" || a.source !== "ner") continue;
    const nl = text.indexOf("\n", a.start);
    if (nl < 0 || nl >= a.end) continue;
    const first = text.slice(a.start, nl);
    if (/\d/.test(first) || first.trim().split(/\s+/).length > 3) continue;
    if (!DATE_COMMA_BEFORE_RE.test(text.slice(text.lastIndexOf("\n", a.start - 1) + 1, a.start))) continue;
    let ns = nl + 1;
    while (ns < a.end && (text[ns] === " " || text[ns] === "	")) ns++;
    if (!/\d/.test(text.slice(ns, a.end))) continue;
    a.start = ns;
    a.text = text.slice(ns, a.end);
  }
  return raw;
}
function detectNormalised(text, nerSpans = [], options = {}) {
  const structured = structuredSpans(text);
  for (let i = 0; i < structured.length; i++) {
    if (structured[i].category === "PERSON" && structured[i].source === "regex") structured[i] = trimTrailingNounFromName(trimFromOrganisation(structured[i], text), text);
  }
  for (const s of options.extraSpans || []) {
    if (s.start >= 0 && s.end <= text.length && s.end > s.start) {
      const span = new PiiSpan(s.start, s.end, s.category, text.slice(s.start, s.end), s.score ?? 0.8, s.source || "table");
      if (s.nameRole) span.nameRole = s.nameRole;
      structured.push(span);
    }
  }
  let raw = structured.slice();
  raw = raw.concat(nerSpans.map((s) => extendOverNobiliaryParticle(trimLeadingRoleWords(trimLeadingHonorific(trimTrailingRolePhrase(trimFromOrganisation(trimDigitTail(s, text), text), text), text), text), text)));
  const confirmedCompanies = nerSpans.filter((s) => s.category === "ORG" && s.score >= 0.5 && hasCompanyLegalSuffix(s.text)).sort((a, b) => a.start - b.start);
  const companyEnds = [];
  for (const s of confirmedCompanies) companyEnds.push(Math.max(s.end, companyEnds.at(-1) || 0));
  const withinCompany = (s) => {
    let lo = 0, hi = confirmedCompanies.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (confirmedCompanies[mid].start <= s.start) lo = mid + 1;
      else hi = mid;
    }
    return lo > 0 && companyEnds[lo - 1] >= s.end;
  };
  raw = raw.map((s) => s.category === "PERSON" && s.source !== "manual" && (withinCompany(s) || s.source === "ner" && /\s/.test(s.text.trim()) && hasCompanyLegalSuffix(s.text)) ? Object.assign(
    new PiiSpan(s.start, s.end, "ORG", s.text, s.score, s.source),
    s,
    { category: "ORG", categoryReason: "legal_entity_evidence" }
  ) : s);
  const gazetteerGivenNameSpans = structured.filter((s) => s.category === "PERSON" && s.source === "regex" && !/\s/.test(s.text.trim()) && looksLikeGivenName(s.text.trim()));
  for (const s of raw) {
    if (s.source !== "ner" || s.category !== "PERSON" || s.score >= SETTINGS.autoselect_threshold) continue;
    if (/\n/.test(s.text)) continue;
    if (!isNameShapedSpan(s.text)) continue;
    if (gazetteerGivenNameSpans.some((g) => g.start >= s.start && g.end <= s.end && g.end < s.end)) {
      s.score = Math.max(s.score, SETTINGS.autoselect_threshold);
    }
  }
  raw = splitNerSpansAtFieldBreaks(raw, text, structured);
  raw = splitColumnarArtifacts(raw);
  raw = raw.map((s) => extendOverInitial(extendOverAllCapsFormName(trimTrailingVocabulary(s, text), text), text));
  raw = raw.filter(
    (s) => s.text.trim() && (!isKept(s) || s.source === "table" && s.category === "PERSON" && s.nameRole) && !isProductOrg(s, text) && !isBarePlace(s) && !isFormBlank(s) && !isBareShortNumberFromModel(s) && !isBlankFieldLabel(s, text) && !isOnBlankFormLine(s, text) && !isDeterminedCommonNoun(s, text) && !isFieldLabelPhrase(s) && !containsPossessive(s) && !isTitleOnly(s) && !isEponymousInstitution(s, text) && !(isGenericRoleWord(s) && !(s.source === "table" && s.category === "PERSON" && s.nameRole)) && !isBareLowConfidenceNerPerson(s, text, structured) && !isLowConfidenceVocabularyPhrase(s, text, structured) && !(s.category === "PERSON" && (s.source === "ner" || s.source === "regex") && !/\s/.test(s.text.trim()) && articleNameAt(text, s.start, s.end))
  );
  for (const s of raw) {
    if (isOrgAddress(s, text, raw)) {
      s.orgContact = true;
      s.forceReview = true;
    }
  }
  raw = raw.filter((s) => {
    if (s.category === "PERSON" && (s.source === "ner" || s.source === "regex")) {
      const first = new RegExp("^\\p{Lu}[\\p{L}-]*", "u").exec(s.text.trim());
      if (first && looksLikeGivenName(first[0]) && VENUE_HEAD_BEFORE_RE.test(text.slice(Math.max(0, s.start - 16), s.start))) return false;
      if (first && looksLikeGivenName(first[0]) && nameLedProductAt(text, s.start + s.text.indexOf(first[0]) + first[0].length)) return false;
    }
    let verdict = hasNameWordConflict(s) || s.source === "table" && s.category === "PERSON" && s.nameRole || s.source === "spaced" && s.category === "PERSON" ? "keep" : vocabVerdict(s);
    if (verdict === "drop" && s.category === "PERSON" && s.source === "regex" && !/\s/.test(s.text.trim()) && SALUTATION_BEFORE_RE.test(text.slice(Math.max(0, s.start - 14), s.start))) verdict = "keep";
    if (verdict === "drop") return false;
    if (verdict === "downgrade") {
      if (isNameByContext(s, text)) s.nameByContext = true;
      else s.forceReview = true;
    }
    return true;
  });
  for (const s of raw) if (isNameLedTradeName(s, text) || isTeamColumnCell(s, text)) s.forceReview = true;
  raw = dropWhitelisted(raw, text);
  raw = mergeAddressChains(raw, text);
  if (raw.some((s) => s.roleMailbox)) {
    const persons = raw.filter((s) => s.category === "PERSON" && (s.source !== "ner" || s.score >= 0.5));
    const lineOf = lineIndexer(text);
    raw = raw.filter((s) => !s.roleMailbox || soleTraderMailbox(s, persons, text, lineOf) || soleTraderContext(text, s.start));
  }
  raw = trimNameBeforeStreet(raw, text);
  raw = trimBirthplaceLineFromAddress(raw, text);
  personOwnedAddresses(raw, text);
  let resolved = resolveOverlaps(raw, text);
  const ctx = { ...contactOwnerByLine(text, resolved), names: personNameTokens(resolved) };
  for (const span of resolved) assignTier(span, text, ctx);
  const propagated = propagateEntities(text, resolved).map((s) => extendOverInitial(extendOverAllCapsFormName(s, text), text));
  if (propagated.length) {
    resolved = resolveOverlaps(dropWhitelisted(raw.concat(propagated), text), text);
    for (const span of resolved) assignTier(span, text, ctx);
  }
  const propagatedLocations = propagateLocationTokens(text, resolved);
  if (propagatedLocations.length) {
    resolved = resolveOverlaps(dropWhitelisted(raw.concat(propagated, propagatedLocations), text), text);
    for (const span of resolved) assignTier(span, text, ctx);
  }
  resolved = resolved.filter((s) => !isBareShortNumberFromModel(s));
  acceptSpellingVariants(resolved);
  resolved = recordRefsOnPersonLines(resolved, text);
  resolved = kvnrOnIdentityRows(resolved, text);
  resolved = subjectBoundHealth(resolved, text);
  resolved = handlesFromKnownNames(resolved, text);
  orgsOfNamedPersons(resolved, text);
  resolved = practiceNames(resolved, text);
  resolved = landRegisterNumbers(resolved, text);
  resolved = personalRefs(resolved, text);
  return finalizeSpans(text, ensureRepeatedValueCoverage(
    text,
    dropSubjectlessSpecialCategories(promoteRecordRefs(resolved, text), text),
    knownValueNotThePerson
  ));
}
function subjectBoundHealth(spans, text) {
  const persons = spans.filter((s) => s.accepted && s.category === "PERSON");
  const found = subjectBoundHealthSpans(text, persons);
  if (!found.length) return spans;
  const added = [];
  for (const f of found) {
    if (spans.some((s) => s.start < f.end && s.end > f.start)) continue;
    const span = new PiiSpan(f.start, f.end, "HEALTH", f.text, 0.72, "regex");
    span.accepted = true;
    span.tier = "auto";
    span.reviewReason = "";
    added.push(span);
  }
  return added.length ? spans.concat(added) : spans;
}
var KVNR_ROW_RE = /(?<![\p{L}\p{N}_./-])[A-Z](?:[ \t]|\r?\n)?(?:\d{9}|\d{3}[ ]\d{3}[ ]\d{3})(?![\p{L}\p{N}_/-]|[.,]\d)/gu;
var KVNR_ROW_DATE_RE = /(?<![\d.])\d{1,2}[./]\d{1,2}[./](?:19\d{2}|20[01]\d)(?!\d)/;
function kvnrOnIdentityRows(spans, text) {
  const persons = spans.filter((s) => s.accepted && s.category === "PERSON");
  const dobs = spans.filter((s) => s.accepted && s.category === "DOB");
  if (!persons.length) return spans;
  const added = [];
  for (const m of text.matchAll(KVNR_ROW_RE)) {
    const a = m.index, b = a + m[0].length;
    if (/(?:ausweis|pass|führerschein|fuehrerschein|licen[cs]e|iban|konto|tel|fax|vin|fin)[^\n]{0,24}$/i.test(text.slice(Math.max(0, a - 40), a))) continue;
    if (spans.some((s) => s.start < b && s.end > a) || added.some((s) => s.start < b && s.end > a)) continue;
    const near = (s) => s.end > a - 120 && s.start < b + 120;
    if (!persons.some(near)) continue;
    if (!dobs.some(near) && !KVNR_ROW_DATE_RE.test(text.slice(Math.max(0, a - 120), b + 120))) continue;
    const span = new PiiSpan(a, b, "HEALTH_INSURANCE", m[0], 0.75, "regex");
    span.accepted = true;
    span.tier = "auto";
    span.reviewReason = "";
    added.push(span);
  }
  return added.length ? spans.concat(added) : spans;
}
var RECORD_CODE_RE = /(?<![\p{L}\p{N}_./-])(?:[A-Z]{1,6}(?:[-/][A-Z0-9]{1,6}){0,2}[-/]\d{2,10}(?:[-/][A-Z0-9]{1,8}){0,3}|\d{4}-[A-Z]{1,4}-\d{3,8}|\d{4}-\d{2}-\d{4,6})(?![\p{L}\p{N}_/-])/gu;
var KVNR_BARE_RE = /(?<![\p{L}\p{N}_./-])[A-Z]\d{9}(?![\p{L}\p{N}_/-])/gu;
var RECORD_CODE_NOT_BEFORE_RE = new RegExp("(?:ISO|DIN|EN|IEC|VDE|GO\xC4|ICD|BGB|SGB|StGB|ZPO|Art\\.|Artikel|Modell|Model|Typ|Type|Charge|Chargen\\p{L}*|SKU|Produkt|Product|Version|v|Beleg|Beleg-Nr\\.?|Belegnr\\.?|Fehler(?:code)?|Error(?: code)?|Statuscode)[ \\t.:#-]*$", "u");
var RECORD_ALNUM_RE = /(?<![\p{L}\p{N}_./-])\d[A-Z]{2,4}\d{6,10}(?![\p{L}\p{N}_/-])/gu;
function recordRefsOnPersonLines(spans, text) {
  const persons = spans.filter((s) => s.accepted && s.category === "PERSON" && /\s/.test(s.text.trim()));
  const NAME_SHAPE_RE = new RegExp("\\p{Lu}\\p{Ll}[\\p{L}'\u2019.-]*(?:,[ \\t]+|[ \\t]+)\\p{Lu}\\p{Ll}[\\p{L}'\u2019.-]*", "u");
  const dobs = spans.filter((s) => {
    if (!s.accepted || s.category !== "DOB") return false;
    const ls = text.lastIndexOf("\n", Math.max(0, s.start - 1)) + 1;
    return NAME_SHAPE_RE.test(text.slice(ls, s.start));
  });
  if (!persons.length && !dobs.length && !spans.some((s) => s.accepted && s.category === "PERSON")) return spans;
  const lines = /* @__PURE__ */ new Set();
  for (const p of persons) lines.add(text.lastIndexOf("\n", Math.max(0, p.start - 1)) + 1);
  for (const d of dobs) lines.add(text.lastIndexOf("\n", Math.max(0, d.start - 1)) + 1);
  const added = [];
  for (const from of lines) {
    const to0 = text.indexOf("\n", from);
    const to = to0 === -1 ? text.length : to0;
    const line = text.slice(from, to);
    for (const m of line.matchAll(KVNR_BARE_RE)) {
      const a = from + m.index, b = a + m[0].length;
      if (/(?:ausweis|pass|führerschein|fuehrerschein|licen[cs]e|iban|konto|tel|fax|vin|fin)[^\n]{0,24}$/i.test(line.slice(0, m.index))) continue;
      if (spans.some((s) => s.start < b && s.end > a) || added.some((s) => s.start < b && s.end > a)) continue;
      const span = new PiiSpan(a, b, "HEALTH_INSURANCE", m[0], 0.75, "regex");
      span.accepted = true;
      span.tier = "auto";
      span.reviewReason = "";
      added.push(span);
      const pn = /^[ \t]{1,2}(\d{4,6})(?![\d.,/:\-@]|[ \t]?[\p{L}€%])/u.exec(line.slice(m.index + m[0].length));
      if (pn) {
        const pa = a + m[0].length + pn[0].length - pn[1].length, pb = pa + pn[1].length;
        if (!spans.some((x) => x.start < pb && x.end > pa) && !added.some((x) => x.start < pb && x.end > pa)) {
          const ps = new PiiSpan(pa, pb, "REG_ID", pn[1], 0.7, "regex");
          ps.accepted = true;
          ps.tier = "auto";
          ps.reviewReason = "";
          added.push(ps);
        }
      }
    }
    for (const m of [...line.matchAll(RECORD_CODE_RE), ...line.matchAll(RECORD_ALNUM_RE)]) {
      const a = from + m.index, b = a + m[0].length;
      if (/^\d{1,2}[./-]\d{1,2}/.test(m[0]) || (m[0].match(/\d/g) || []).length < 4) continue;
      if (RECORD_CODE_NOT_BEFORE_RE.test(line.slice(Math.max(0, m.index - 16), m.index))) continue;
      if (/[-/]0{2,}\d{1,2}$/.test(m[0])) continue;
      if (DOC_TITLE_BEFORE_RE.test(line.slice(Math.max(0, m.index - 40), m.index)) || /^CVE-/.test(m[0]) || /^[A-Z]{1,8}-(?:19|20)\d{2}$/.test(m[0])) continue;
      if (spans.some((s) => s.start < b && s.end > a && (s.accepted || !(s.source === "ner" && s.start === a && s.end === b))) || added.some((s) => s.start < b && s.end > a)) continue;
      const span = new PiiSpan(a, b, "REG_ID", m[0], 0.75, "regex");
      span.accepted = true;
      span.tier = "auto";
      span.reviewReason = "";
      added.push(span);
    }
  }
  for (const m of text.matchAll(/^[ \t]*([A-Z]\d{9})[ \t]*$/gmu)) {
    const a = m.index + m[0].indexOf(m[1]), b = a + m[1].length;
    if (spans.some((s) => s.start < b && s.end > a) || added.some((s) => s.start < b && s.end > a)) continue;
    let lo = a, hi = b;
    for (let k = 0; k < 4; k++) {
      lo = Math.max(0, text.lastIndexOf("\n", lo - 2));
      hi = text.indexOf("\n", hi + 1);
      if (hi === -1) {
        hi = text.length;
        break;
      }
    }
    if (!persons.some((p) => p.start >= lo && p.end <= hi)) continue;
    const span = new PiiSpan(a, b, "HEALTH_INSURANCE", m[1], 0.7, "regex");
    span.accepted = true;
    span.tier = "auto";
    span.reviewReason = "";
    added.push(span);
  }
  for (const p of persons) {
    const lineFrom = text.lastIndexOf("\n", Math.max(0, p.start - 1)) + 1;
    const lineTo0 = text.indexOf("\n", p.end);
    const lineTo = lineTo0 === -1 ? text.length : lineTo0;
    if (BARE_NUMBER_BLOCK_LABEL_RE.test(text.slice(lineFrom, lineTo))) continue;
    const cands = [];
    const after = new RegExp("^[ \\t]{1,2}([1-9]\\d{5,8})(?![\\d@]|[.,/:\\-]\\d|\\p{L})", "u").exec(text.slice(p.end, p.end + 14));
    if (after) cands.push([p.end + after[0].length - after[1].length, after[1]]);
    const before = /(?<![\d@.,/:+-])([1-9]\d{5,8})[ \t]{1,2}$/u.exec(text.slice(Math.max(lineFrom, p.start - 14), p.start));
    if (before) cands.push([p.start - before[0].length, before[1]]);
    for (const [a, v] of cands) {
      const b = a + v.length;
      if (UNIT_AFTER_BARE_NUMBER_RE.test(text.slice(b, b + 12))) continue;
      if (spans.some((s) => s.start < b && s.end > a) || added.some((s) => s.start < b && s.end > a)) continue;
      const span = new PiiSpan(a, b, "REG_ID", v, 0.7, "regex");
      span.accepted = true;
      span.tier = "auto";
      span.reviewReason = "";
      added.push(span);
    }
  }
  for (const d of dobs) {
    const lineFrom = text.lastIndexOf("\n", Math.max(0, d.start - 1)) + 1;
    const lineTo0 = text.indexOf("\n", d.end);
    const lineTo = lineTo0 === -1 ? text.length : lineTo0;
    if (persons.some((p) => p.start >= lineFrom && p.end <= lineTo)) continue;
    const line = text.slice(lineFrom, lineTo);
    if (BARE_NUMBER_BLOCK_LABEL_RE.test(line)) continue;
    const hm = new RegExp("^[ \\t]*([1-9]\\d{5,8})(?=[ \\t]+\\p{L})", "u").exec(line);
    if (!hm) continue;
    const a = lineFrom + hm[0].indexOf(hm[1]), b = a + hm[1].length;
    if (spans.some((s) => s.start < b && s.end > a) || added.some((s) => s.start < b && s.end > a)) continue;
    const span = new PiiSpan(a, b, "REG_ID", hm[1], 0.7, "regex");
    span.accepted = true;
    span.tier = "auto";
    span.reviewReason = "";
    added.push(span);
  }
  {
    const personOnlyLines = /* @__PURE__ */ new Map();
    for (const p of persons) {
      const ls = text.lastIndexOf("\n", Math.max(0, p.start - 1)) + 1;
      const le0 = text.indexOf("\n", p.end), le = le0 === -1 ? text.length : le0;
      if (text.slice(ls, le).replace(/[\s,.:;·|–—-]+/g, "").length <= p.text.replace(/[\s,.:;·|–—-]+/g, "").length) personOnlyLines.set(le + 1, true);
    }
    for (const p of spans) {
      if (!p.accepted || p.category !== "PERSON" || /\s/.test(p.text.trim())) continue;
      const ls = text.lastIndexOf("\n", Math.max(0, p.start - 1)) + 1;
      const le0 = text.indexOf("\n", p.end), le = le0 === -1 ? text.length : le0;
      if (new RegExp("^[ \\t]*\\p{Lu}[\\p{L}'\u2019.-]+,[ \\t]+\\p{Lu}[\\p{L}'\u2019.-]+[ \\t]*$", "u").test(text.slice(ls, le))) personOnlyLines.set(le + 1, true);
    }
    for (const lineStart of personOnlyLines.keys()) {
      if (lineStart > text.length) continue;
      const to0 = text.indexOf("\n", lineStart), to = to0 === -1 ? text.length : to0;
      const line = text.slice(lineStart, to);
      const m = /^[ \t]*(\S+)[ \t]*$/.exec(line);
      if (!m) continue;
      RECORD_CODE_RE.lastIndex = 0;
      const cm = RECORD_CODE_RE.exec(m[1]);
      const nl0 = to0 === -1 ? -1 : text.indexOf("\n", to0 + 1);
      const nextLine = to0 === -1 ? "" : text.slice(to0 + 1, nl0 === -1 ? text.length : nl0).trim();
      const bareOk = /^[1-9]\d{4,8}$/.test(m[1]) && /^\d{1,2}\.\d{1,2}\.(?:19|20)\d{2}$/.test(nextLine);
      if (!bareOk) {
        if (!cm || cm[0] !== m[1] || /^\d{1,2}[./-]\d{1,2}/.test(cm[0]) || (cm[0].match(/\d/g) || []).length < 4) continue;
        if (/[-/]0{2,}\d{1,2}$/.test(cm[0])) continue;
      }
      const a = lineStart + line.indexOf(m[1]), b = a + m[1].length;
      if (spans.some((sp) => sp.start < b && sp.end > a) || added.some((sp) => sp.start < b && sp.end > a)) continue;
      const span = new PiiSpan(a, b, "REG_ID", m[1], 0.7, "regex");
      span.accepted = true;
      span.tier = "auto";
      span.reviewReason = "";
      added.push(span);
    }
  }
  if (!added.length) return spans;
  return spans.concat(added).sort((x, y) => x.start - y.start || x.end - y.end);
}
var BARE_NUMBER_BLOCK_LABEL_RE = /(?:iban|konto|blz|bic|tel\b|telefon|fax|mobil|handy|plz|betrag|eur\b|€|rechnung|summe|netto|brutto)/i;
var UNIT_AFTER_BARE_NUMBER_RE = /^[ \t]*(?:€|EUR|Euro|%|Uhr|kg|km|m²|qm|Stk|Stück|[.,]\d)/i;
var ORG_TRADING_AS_BEFORE_RE = /(?:trading[ \t]+as|t\/a|handelnd[ \t]+(?:unter|als))[ \t:]+$/iu;
var ORG_SOLE_AFTER_RE = new RegExp("^[ \\t]*\\((?:sole[ \\t]+trader|Einzelunternehm\\p{L}*|freiberuflich|selbstst\xE4ndig|selbst\xE4ndig)\\)", "iu");
var ORG_EMPLOYER_BEFORE_RE = new RegExp(
  "(?:(?:ihr(?:em|es)|sein(?:em|es)|deren|dessen)[ \\t]+(?:derzeitigen[ \\t]+|jetzigen[ \\t]+|bisherigen[ \\t]+|fr\xFCheren[ \\t]+)?Arbeitgeber(?:in)?[,:]?[ \\t]+(?:der[ \\t]+|die[ \\t]+|das[ \\t]+)?|(?:Angestelltenverh\xE4ltnis|Arbeitsverh\xE4ltnis|Besch\xE4ftigungsverh\xE4ltnis)[ \\t]+(?:derzeit[ \\t]+|aktuell[ \\t]+)?(?:bei|mit)[ \\t]+(?:der|dem)[ \\t]+)$",
  "u"
);
function landRegisterNumbers(spans, text) {
  const persons = spans.filter((s) => s.accepted && s.category === "PERSON" && /\s/.test(s.text.trim()));
  const added = [];
  for (const r of landRegisterRanges(text, persons)) {
    if (spans.some((s) => s.accepted && s.start < r.end && s.end > r.start)) continue;
    const span = new PiiSpan(r.start, r.end, "REG_ID", text.slice(r.start, r.end), 0.85, "regex");
    span.accepted = true;
    span.tier = "auto";
    span.reviewReason = "";
    span.nameByContext = true;
    added.push(span);
  }
  return added.length ? spans.concat(added).sort((x, y) => x.start - y.start || x.end - y.end) : spans;
}
function personalRefs(spans, text) {
  const persons = spans.filter((s) => s.accepted && s.category === "PERSON" && s.text.trim().length >= 3);
  const seeds = spans.filter((s) => s.accepted && (s.category === "REG_ID" || s.category === "CUSTOMER_ID"));
  const added = [];
  const drop = /* @__PURE__ */ new Set();
  for (const r of personalRefRanges(text, persons, seeds)) {
    if (spans.some((s) => s.accepted && s.start < r.end && s.end > r.start)) continue;
    const same = spans.find((s) => s.start === r.start && s.end === r.end && s.recordRef && !drop.has(s));
    if (same) {
      same.forceReview = false;
      assignTier(same);
      same.accepted = true;
      same.tier = "auto";
      same.reviewReason = "";
      continue;
    }
    for (const s of spans) if (!s.accepted && s.start < r.end && s.end > r.start) drop.add(s);
    const seed = r.kind === "list" ? seeds.find((s) => s.end <= r.start && r.start - s.end < 400) : null;
    const span = new PiiSpan(r.start, r.end, seed ? seed.category : "REG_ID", text.slice(r.start, r.end), 0.8, "regex");
    span.accepted = true;
    span.tier = "auto";
    span.reviewReason = "";
    if (r.kind === "member" || /^\d+$/.test(span.text)) span.nameByContext = true;
    added.push(span);
  }
  if (!added.length) return spans;
  return spans.filter((s) => !drop.has(s)).concat(added).sort((x, y) => x.start - y.start || x.end - y.end);
}
function practiceNames(spans, text) {
  const added = [];
  const drop = /* @__PURE__ */ new Set();
  for (const r of practiceNameRanges(text)) {
    const over = spans.filter((s) => s.start < r.end && s.end > r.start && !drop.has(s));
    if (over.some((s) => s.accepted)) continue;
    const weak = over.filter((s) => s.category === "ORG" || s.category === "PERSON");
    if (weak.length !== over.length) continue;
    for (const s of weak) drop.add(s);
    const span = new PiiSpan(r.start, r.end, "ORG", text.slice(r.start, r.end), 0.85, "regex");
    span.accepted = true;
    span.tier = "auto";
    span.reviewReason = "";
    span.nameByContext = true;
    added.push(span);
  }
  if (!added.length) return spans;
  return spans.filter((s) => !drop.has(s)).concat(added).sort((x, y) => x.start - y.start || x.end - y.end);
}
function orgsOfNamedPersons(spans, text) {
  const orgs = spans.filter((s) => s.category === "ORG" && !s.accepted);
  for (const o of orgs) {
    const before = text.slice(Math.max(0, o.start - 70), o.start);
    if (ORG_TRADING_AS_BEFORE_RE.test(before) || ORG_SOLE_AFTER_RE.test(text.slice(o.end, o.end + 30)) || ORG_EMPLOYER_BEFORE_RE.test(before)) {
      o.accepted = true;
      o.tier = "auto";
      o.reviewReason = "";
    }
  }
}
var HANDLE_FOLD = { "\xDF": "ss", "\xF8": "o", "\u0142": "l", "\u0131": "i", "\u0111": "d", "\xE6": "ae", "\u0153": "oe" };
var foldAscii = (v) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[ßøłıđæœ]/g, (c) => HANDLE_FOLD[c]);
var TEMPLATE_LOCAL_WORDS = /* @__PURE__ */ new Set(["vorname", "nachname", "name", "firstname", "lastname", "surname", "mustermann", "musterfrau", "vname", "nname", "initial", "user", "username"]);
function handlesFromKnownNames(spans, text) {
  const persons = /* @__PURE__ */ new Map();
  const addPair = (given, surname) => {
    const sur = foldAscii(surname).replace(/[^a-z]/g, "");
    if (sur.length < 4 || sur.length === 4 && !given || !/^[a-z]+$/.test(sur)) return;
    if (!persons.has(sur)) persons.set(sur, /* @__PURE__ */ new Set());
    persons.get(sur).add(foldAscii(given || "").replace(/[^a-z]/g, ""));
  };
  const mailLocals = /* @__PURE__ */ new Set();
  for (const sp of spans) {
    if (!sp.accepted) continue;
    if (sp.category === "PERSON") {
      const toks = sp.text.replace(/,/g, " ").split(/\s+/).filter((t) => new RegExp("^\\p{Lu}[\\p{L}'\u2019-]+$", "u").test(t));
      if (toks.length === 1) addPair("", toks[0]);
      else if (toks.length <= 4) {
        for (const sur of toks) for (const g of toks) if (g !== sur) addPair(g, sur);
      }
    } else if (sp.category === "EMAIL") {
      const local = sp.text.split("@")[0];
      if (/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/.test(local) && local.length >= 5 && !local.split(/[._-]/).some((w) => TEMPLATE_LOCAL_WORDS.has(w))) mailLocals.add(local);
    }
  }
  const byInitial = /* @__PURE__ */ new Map();
  for (const sp of spans) {
    if (!sp.accepted || sp.category !== "PERSON") continue;
    const parts = sp.text.split(",").map((x) => x.trim());
    let given, rest;
    if (parts.length === 2 && new RegExp("^\\p{Lu}", "u").test(parts[1])) {
      given = parts[1].split(/\s+/)[0];
      rest = parts[0].split(/\s+/);
    } else {
      const t = sp.text.trim().split(/\s+/);
      if (t.length < 2 || t.length > 5) continue;
      given = t[0];
      rest = t.slice(1);
    }
    if (!new RegExp("^\\p{Lu}[\\p{L}'\u2019-]+$", "u").test(given)) continue;
    const initial = foldAscii(given)[0];
    if (!initial || !/[a-z]/.test(initial)) continue;
    const variants = /* @__PURE__ */ new Set();
    const joined = foldAscii(rest.join("")).replace(/[^a-z]/g, "");
    if (joined.length >= 6) variants.add(joined);
    for (const part of rest[rest.length - 1].split("-")) {
      const f = foldAscii(part).replace(/[^a-z]/g, "");
      if (f.length >= 6) variants.add(f);
    }
    if (!variants.size) continue;
    if (!byInitial.has(initial)) byInitial.set(initial, /* @__PURE__ */ new Set());
    for (const v of variants) byInitial.get(initial).add(v);
  }
  if (!persons.size && !mailLocals.size && !byInitial.size) return spans;
  const alts = [...persons.keys()].slice(0, 400).sort((a, b) => b.length - a.length);
  const covered = (a, b) => spans.some((x) => x.start < b && x.end > a);
  const added = [];
  const take = (a, b) => {
    if (covered(a, b) || added.some((x) => x.start < b && x.end > a)) return;
    const span = new PiiSpan(a, b, "ONLINE_ID", text.slice(a, b), 0.8, "regex");
    span.accepted = true;
    span.tier = "auto";
    span.reviewReason = "";
    added.push(span);
  };
  const BOUND_BEFORE = "(?<![\\p{L}\\p{N}_.@/-])", BOUND_AFTER = "(?![\\p{L}\\p{N}_@]|\\.[\\p{L}\\p{N}])";
  if (alts.length) {
    const re = new RegExp(`${BOUND_BEFORE}((?:[a-z]{1,15}[._])?[a-z]?)(${alts.join("|")})((?:[._]?\\d{1,4})?)${BOUND_AFTER}`, "gu");
    for (const m of text.matchAll(re)) {
      const prefix = m[1].replace(/[._]$/, "");
      const givens = persons.get(m[2]);
      const ok = prefix.length === 0 ? false : prefix.length === 1 ? [...givens].some((g) => g === "" || g[0] === prefix) : [...givens].some((g) => g === prefix || prefix.length >= 3 && g.startsWith(prefix));
      if (ok && m[0].length >= 5) take(m.index, m.index + m[0].length);
    }
  }
  if (byInitial.size) {
    for (const m of text.matchAll(new RegExp(`${BOUND_BEFORE}([a-z]{7,16})${BOUND_AFTER}`, "gu"))) {
      const vs = byInitial.get(m[1][0]);
      const rest = m[1].slice(1);
      if (vs && rest.length >= 6 && [...vs].some((v) => v.startsWith(rest) && v.length - rest.length <= 3)) take(m.index, m.index + m[0].length);
    }
  }
  for (const local of mailLocals) {
    const re = new RegExp(`${BOUND_BEFORE}${local.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${BOUND_AFTER}`, "gu");
    for (const m of text.matchAll(re)) take(m.index, m.index + local.length);
  }
  return added.length ? spans.concat(added).sort((x, y) => x.start - y.start || x.end - y.end) : spans;
}
var BLOCK_BREAK_RE = /\r?\n[^\S\r\n]*\r?\n|\f/;
var BLOCK_BREAK_G = /(?:\r?\n[^\S\r\n]*\r?\n)+|\f+/g;
function finalizeSpans(text, spans) {
  const out = [];
  for (const span of spans) {
    if ((span.category === "ADDRESS" || span.category === "PERSON") && BLOCK_BREAK_RE.test(span.text)) {
      let cursor = 0;
      const pieces = [];
      for (const m of span.text.matchAll(BLOCK_BREAK_G)) {
        pieces.push([cursor, m.index]);
        cursor = m.index + m[0].length;
      }
      pieces.push([cursor, span.text.length]);
      for (const [a, b] of pieces) {
        const piece = span.text.slice(a, b);
        if (!/[\p{L}\p{N}]/u.test(piece)) continue;
        if (span.category === "ADDRESS" && !(/\d/.test(piece) && new RegExp("\\p{L}{3}", "u").test(piece))) continue;
        const copy = Object.assign(Object.create(Object.getPrototypeOf(span)), span);
        copy.start = span.start + a;
        copy.end = span.start + b;
        copy.text = text.slice(copy.start, copy.end);
        out.push(copy);
      }
      continue;
    }
    if (typeof span.text === "string" && !/[\p{L}\p{N}]/u.test(span.text)) continue;
    out.push(span);
  }
  return out;
}

// ../extension/core/entities.js
var TITLE_RE2 = /^(?:dr|prof|dipl|ing|med|mag|habil|rer|nat|phil|jur|oec|h\.?c|ba|ma|msc|bsc|phd|dipl-ing)\.?$/i;
var HONORIFIC_RE = /^(?:herr|herrn|frau|hr|fr)\.?$/i;
var PARTICLE_RE = /^(?:von|van|zu|zum|zur|de|di|del|della|da|dos|la|le|ter|ten|af|av)$/i;
var INITIAL_RE = new RegExp("^(\\p{Lu})\\.?$", "u");
var HONORIFIC_BEHIND_RE = /(?:^|[^\p{L}])(herrn?|frau)\.?[ \t]+(?:(?:dr|prof|med|ing|dipl|mag|habil|rer|nat|h\.?c)\.?[ \t]+)*$/iu;
var LOOKBEHIND_CHARS = 40;
var PARSE_CACHE = /* @__PURE__ */ new Map();
function parsePersonName(value) {
  const key = String(value || "");
  let hit = PARSE_CACHE.get(key);
  if (!hit) {
    hit = parsePersonNameUncached(key);
    if (PARSE_CACHE.size > 5e4) PARSE_CACHE.clear();
    PARSE_CACHE.set(key, hit);
  }
  return { ...hit, given: hit.given.slice() };
}
function parsePersonNameUncached(value) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const kept = [];
  for (const w of words) {
    const bare = w.replace(/[.,;:]+$/, "");
    if (HONORIFIC_RE.test(bare) || TITLE_RE2.test(bare)) continue;
    kept.push(w);
  }
  if (!kept.length) return { given: [], surname: "", surnameCore: "", role: "none", hyphenated: false };
  let surnameWords = [kept[kept.length - 1]];
  let i = kept.length - 2;
  while (i >= 0 && PARTICLE_RE.test(kept[i].replace(/[.,;:]+$/, ""))) {
    surnameWords.unshift(kept[i]);
    i--;
  }
  const given = kept.slice(0, i + 1);
  const surname = surnameWords.join(" ");
  const surnameCore = surnameWords[surnameWords.length - 1].replace(/[.,;:]+$/, "");
  if (kept.length === 1) {
    const only = kept[0].replace(/[.,;:]+$/, "");
    if (looksLikeGivenName(only)) {
      return { given: [only], surname: "", surnameCore: "", role: "given", hyphenated: false };
    }
    return { given: [], surname: only, surnameCore: only, role: "surname", hyphenated: only.includes("-") };
  }
  const realGiven = given.filter((g) => !INITIAL_RE.test(g));
  return {
    given,
    surname,
    surnameCore,
    role: realGiven.length ? "full" : "initial",
    hyphenated: surnameCore.includes("-")
  };
}
var norm = (s) => String(s || "").toLowerCase();
var SURNAME_S_BLOCKLIST = /* @__PURE__ */ new Set(
  [
    "voss",
    "vosz",
    "klaus",
    "straus",
    "strauss",
    "thomas",
    "andreas",
    "lukas",
    "nikolas",
    "hannes",
    "matthias",
    "mathias",
    "kostas",
    "fuchs",
    "gus",
    "cass",
    "moss"
  ]
);
function sameSurname(a, b) {
  const x = norm(a), y = norm(b);
  if (x === y) return true;
  if (SURNAME_S_BLOCKLIST.has(x) || SURNAME_S_BLOCKLIST.has(y)) return false;
  const strip = (s) => s.endsWith("ens") ? s.slice(0, -3) : s.endsWith("s") ? s.slice(0, -1) : s;
  const xs = strip(x), ys = strip(y);
  return xs !== x && xs === y || ys !== y && ys === x;
}
var sameGiven = (a, b) => {
  if (!a.length || !b.length || a.length !== b.length) return false;
  return a.every((part, i) => {
    const x = part.replace(/\.$/, ""), y = b[i].replace(/\.$/, "");
    if (norm(x) === norm(y)) return true;
    const xi = INITIAL_RE.exec(x), yi = INITIAL_RE.exec(y);
    return xi && !yi && norm(xi[1]) === norm(y[0]) || yi && !xi && norm(yi[1]) === norm(x[0]);
  });
};
var mentionKey = (s) => s.mentionId || `${s.category}:${s.start}:${s.end}`;
function personClusters(spans, text = "") {
  const mentions = [];
  for (const s of spans || []) {
    if (!s || s.category !== "PERSON" || !s.accepted) continue;
    const value = String(s.text || "").trim();
    if (!value) continue;
    let parts = parsePersonName(value);
    if (s.nameRole && (parts.role === "given" || parts.role === "surname") && !/\s/.test(value)) {
      const only = value.replace(/[.,;:]+$/, "");
      parts = s.nameRole === "given" ? { given: [only], surname: "", surnameCore: "", role: "given", hyphenated: false } : { given: [], surname: only, surnameCore: only, role: "surname", hyphenated: only.includes("-") };
    }
    mentions.push({ mentionId: mentionKey(s), identityAmbiguous: !!s.identityAmbiguous, value, start: Number(s.start) || 0, parts });
  }
  mentions.sort((a, b) => a.start - b.start);
  const clusters = /* @__PURE__ */ new Map();
  const byMention = /* @__PURE__ */ new Map();
  const ambiguousValues = /* @__PURE__ */ new Set();
  const byValue = /* @__PURE__ */ new Map();
  let nextId = 0;
  const genderFromText = (start) => {
    if (!text) return "";
    const behind = text.slice(Math.max(0, start - LOOKBEHIND_CHARS), start);
    const m = HONORIFIC_BEHIND_RE.exec(behind);
    if (!m) return "";
    return /^frau/i.test(m[1]) ? "f" : "m";
  };
  const noteGender = (cluster, mention) => {
    if (cluster.gender) return;
    for (const g of mention.parts.given) {
      const guess = genderOfGivenName(g.replace(/\.$/, ""));
      if (guess) {
        cluster.gender = guess;
        return;
      }
    }
    cluster.gender = genderFromText(mention.start) || "";
  };
  const attach = (cluster, mention) => {
    cluster.values.add(mention.value);
    noteGender(cluster, mention);
    const member = { id: cluster.id, role: mention.parts.role, ambiguous: !!mention.ambiguous };
    byMention.set(mention.mentionId, member);
    if (member.ambiguous || byValue.has(mention.value) && byValue.get(mention.value).id !== cluster.id) {
      ambiguousValues.add(mention.value);
      byValue.delete(mention.value);
    } else if (!ambiguousValues.has(mention.value)) byValue.set(mention.value, member);
  };
  const create = (mention) => {
    const cluster = {
      id: nextId++,
      identityAmbiguous: !!mention.identityAmbiguous,
      key: mention.value,
      surnameCore: mention.parts.surnameCore,
      hyphenated: mention.parts.hyphenated,
      gender: "",
      first: mention.start,
      values: /* @__PURE__ */ new Set()
    };
    clusters.set(cluster.id, cluster);
    attach(cluster, mention);
    return cluster;
  };
  for (const m of mentions) {
    if (m.identityAmbiguous) {
      m.ambiguous = true;
      create(m);
      continue;
    }
    if (m.parts.role !== "full") continue;
    if (byValue.has(m.value)) {
      attach(clusters.get(byValue.get(m.value).id), m);
      continue;
    }
    const targets = [];
    for (const c of clusters.values()) {
      if (c.identityAmbiguous) continue;
      if (norm(parsePersonName(c.key).surname) !== norm(m.parts.surname)) continue;
      const sample = parsePersonName(c.key);
      if (!sameGiven(sample.given, m.parts.given)) continue;
      targets.push(c);
    }
    if (targets.length === 1) attach(targets[0], m);
    else create(m);
  }
  const anchors = [...clusters.values()].filter((c) => !c.identityAmbiguous);
  for (const m of mentions) {
    if (byMention.has(m.mentionId)) continue;
    const candidates = anchors.filter((c) => {
      const sample = parsePersonName(c.key);
      if (m.parts.role === "given") return sample.given.some((g) => norm(g) === norm(m.parts.given[0]));
      if (norm(sample.surname) !== norm(m.parts.surname)) {
        if (m.parts.role !== "surname" || !sameSurname(sample.surname, m.parts.surname)) return false;
      }
      return m.parts.role !== "initial" || sameGiven(sample.given, m.parts.given);
    });
    if (candidates.length === 1) attach(candidates[0], m);
    else {
      m.ambiguous = candidates.length > 1;
      if (!m.ambiguous && byValue.has(m.value)) attach(clusters.get(byValue.get(m.value).id), m);
      else create(m);
    }
  }
  return { byMention, byValue, clusters, ambiguousValues };
}

// ../extension/core/anonymize.js
function placeholderToken(category, index) {
  return `${PLACEHOLDER_OPEN}${category}_${index}${PLACEHOLDER_CLOSE}`;
}
var mapKey = (cat, val) => `${cat}\0${val}`;
var spanMapKey = (span) => span.mappingKey || mapKey(span.category, span.text);
var entryMapKey = (entry) => entry.mappingKey || mapKey(entry.category, entry.value);
function buildMapping(spans, sourceText = "", { documentId = "document" } = {}) {
  const reserved = new Set([...String(sourceText).matchAll(/([A-Z][A-Z_]*)[\s_-]*(?:\\_[\s_-]*)*(\d+)/gi)].map((m) => `${m[1].replace(/_+$/, "").toUpperCase()}_${Number(m[2])}`));
  const counters = /* @__PURE__ */ new Map();
  const lookup = /* @__PURE__ */ new Map();
  const entries = [];
  const entriesByKey = /* @__PURE__ */ new Map();
  const accepted = spans.filter((s) => s.accepted).sort((a, b) => a.start - b.start);
  for (const span of accepted) span.mentionId = `${documentId}:${span.category}:${span.start}:${span.end}`;
  const persons = personClusters(accepted, sourceText);
  for (const span of accepted) {
    const member = persons.byMention.get(span.mentionId);
    const ambiguous = !!span.identityAmbiguous || !!member?.ambiguous;
    const k = ambiguous ? JSON.stringify(["mention-v2", span.category, span.text, span.mentionId]) : mapKey(span.category, span.text);
    span.mappingKey = k;
    const mention = { mentionId: span.mentionId, start: span.start, end: span.end };
    if (lookup.has(k)) {
      entriesByKey.get(k).mentions.push(mention);
      continue;
    }
    let n = (counters.get(span.category) || 0) + 1;
    while (reserved.has(`${String(span.category).toUpperCase()}_${n}`)) n++;
    counters.set(span.category, n);
    const ph = placeholderToken(span.category, n);
    lookup.set(k, ph);
    const entry = new MappingEntry(ph, span.text, span.category);
    Object.assign(entry, { mappingVersion: 2, mappingKey: k, mentionId: span.mentionId, mentions: [mention] });
    if (member) entry.entityId = `${documentId}:person:${member.id}`;
    if (ambiguous) entry.identityAmbiguous = true;
    entries.push(entry);
    entriesByKey.set(k, entry);
  }
  return { entries, lookup };
}
function dropContentlessSpans(spans) {
  const kept = spans.filter((s) => typeof s.text !== "string" || /[\p{L}\p{N}]/u.test(s.text));
  return kept.length === spans.length ? spans : kept;
}
var WORD_TAIL_START = /[\p{M}\u1e00-\u1eff\ufb00-\ufb06]/u;
var WORD_TAIL_CHAR = /[\p{L}\p{M}\p{N}]/u;
function snapSpansToWordEnd(spans, text) {
  if (typeof text !== "string") return spans;
  let changed = false;
  const out = spans.map((s) => {
    if (!Number.isInteger(s.end) || s.end >= text.length || !WORD_TAIL_START.test(text[s.end])) return s;
    let end = s.end;
    while (end < text.length && WORD_TAIL_CHAR.test(text[end])) end++;
    if (spans.some((o) => o !== s && o.start >= s.end && o.start < end)) return s;
    const next = Object.assign(Object.create(Object.getPrototypeOf(s)), s, { end, text: text.slice(s.start, end) });
    delete next.mappingKey;
    delete next.mentionId;
    changed = true;
    return next;
  });
  return changed ? out : spans;
}
var BREAK_CHARS = /[\r\n\u2028\u2029\u000b\u000c\u0085]/;
var BREAK_SPLIT = /\r\n|[\r\n\u2028\u2029\u000b\u000c\u0085]/g;
function splitSpansAtLineBreaks(spans, text = null) {
  const out = [];
  let changed = false;
  for (const span of spans) {
    const value = typeof span.text === "string" ? span.text : "";
    if (!BREAK_CHARS.test(value) || !Number.isInteger(span.start)) {
      out.push(span);
      continue;
    }
    const pieces = [];
    let from = 0;
    const cut = (a, b) => {
      let lo = a, hi = b;
      while (lo < hi && /\s/.test(value[lo])) lo++;
      while (hi > lo && (/\s/.test(value[hi - 1]) || /[,;]/.test(value[hi - 1]))) hi--;
      if (hi <= lo || !/[\p{L}\p{N}]/u.test(value.slice(lo, hi))) return;
      const start = span.start + lo, end = span.start + hi;
      if (text != null && text.slice(start, end) !== value.slice(lo, hi)) return;
      const piece = Object.assign(Object.create(Object.getPrototypeOf(span)), span, { start, end, text: value.slice(lo, hi) });
      delete piece.mappingKey;
      delete piece.mentionId;
      piece.lineFragment = true;
      pieces.push(piece);
    };
    for (const m of value.matchAll(BREAK_SPLIT)) {
      cut(from, m.index);
      from = m.index + m[0].length;
    }
    cut(from, value.length);
    if (!pieces.length) {
      out.push(span);
      continue;
    }
    changed = true;
    out.push(...pieces);
  }
  return changed ? out.sort((a, b) => a.start - b.start || a.end - b.end) : spans;
}
function applyMappingDetailed(text, spans, lookup) {
  let out = "", position = 0;
  const generatedRanges = [];
  for (const span of spans.filter((s) => s.accepted).sort((a, b) => a.start - b.start)) {
    const replacement = lookup.get(spanMapKey(span));
    if (typeof replacement !== "string" || !Number.isInteger(span.start) || !Number.isInteger(span.end) || typeof span.text !== "string" || span.start < position || span.end > text.length || span.end <= span.start || text.slice(span.start, span.end) !== span.text) {
      throw new Error("INVALID_REPLACEMENT_SPAN");
    }
    out += text.slice(position, span.start);
    generatedRanges.push({ start: out.length, end: out.length + replacement.length, replacement, original: span.text });
    out += replacement;
    position = span.end;
  }
  return { sanitized: out + text.slice(position), generatedRanges };
}
var LEAK_HYPHEN_WRAP_RE = /-[^\S\r\n]*(?:\r\n|\r|\n)[^\S\r\n]*/g;
var LEAK_WHITESPACE_RE = /\s+/g;
function leakNormalise(value) {
  let folded = normaliseConfusables(value);
  folded = folded.normalize("NFC");
  folded = folded.replace(LEAK_HYPHEN_WRAP_RE, "");
  return folded.replace(LEAK_WHITESPACE_RE, " ").trim().toLowerCase();
}
var NAME_LIKE = /* @__PURE__ */ new Set(["PERSON", "ORG"]);
var WORD_VALUE = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
var INFLECTED_END = /^(?:s|es|ns|n|en)$/i;
function isWordValue(value) {
  return WORD_VALUE.test(value);
}
var SHORT_NUMBER = /^\d{1,3}$/;
var NUMBER_JOIN = /[.,:\/\-\u2013]/;
var NUMERIC_CHAR = /[\p{N}\uFFFB]/u;
function isStandaloneNumberAt(haystack, index, len) {
  const before = index > 0 ? haystack[index - 1] : "";
  const after = index + len < haystack.length ? haystack[index + len] : "";
  if (before && (new RegExp("\\p{L}", "u").test(before) || NUMERIC_CHAR.test(before))) return false;
  if (after && (new RegExp("\\p{L}", "u").test(after) || NUMERIC_CHAR.test(after))) return false;
  if (before && NUMBER_JOIN.test(before) && index > 1 && NUMERIC_CHAR.test(haystack[index - 2])) return false;
  if (after && NUMBER_JOIN.test(after) && index + len + 1 < haystack.length && NUMERIC_CHAR.test(haystack[index + len + 1])) return false;
  return true;
}
function inHyphenCompound(t, a, b, category) {
  const prev = t[a - 1] === "-" && new RegExp("\\p{L}", "u").test(t[a - 2] || "") ? new RegExp("\\p{L}+$", "u").exec(t.slice(Math.max(0, a - 41), a - 1))?.[0] : null;
  const next = t[b] === "-" && new RegExp("\\p{L}", "u").test(t[b + 1] || "") ? new RegExp("^\\p{L}+", "u").exec(t.slice(b + 1, b + 41))?.[0] : null;
  if (!prev && !next) return false;
  if (!NAME_LIKE.has(category)) return true;
  return nameInHyphenCompound(t, a, b);
}
function isCompoundOccurrence(haystack, index, needle, category) {
  return isWordValue(needle) && (inHyphenCompound(haystack, index, index + needle.length, category) || isInstitutionOccurrence(haystack, index, needle, category));
}
function isInstitutionOccurrence(haystack, index, needle, category) {
  const end = index + needle.length;
  return category === "RELIGION" && religionInstitutionMention(haystack, index, end, true) || category === "AFFILIATION" && affiliationInstitutionMention(haystack, index, end) || category === "HEALTH" && healthProviderMention(haystack, index, end);
}
var LEAK_SHORT_MAX = 3;
function isLeakOccurrence(haystack, index, needle, category) {
  if (SHORT_NUMBER.test(needle)) return isStandaloneNumberAt(haystack, index, needle.length);
  if ([...needle].length <= LEAK_SHORT_MAX) {
    const b = index > 0 ? haystack[index - 1] : "", a = haystack[index + needle.length] ?? "";
    const w = /[\p{L}\p{N}\p{M}_]/u;
    if (b && w.test(b) || a && w.test(a)) return false;
  }
  if (!isWordValue(needle)) return true;
  const before = index > 0 ? haystack[index - 1] : "";
  if (before && /[\p{L}\p{N}]/u.test(before)) return false;
  if ([...needle].length > LEAK_SHORT_MAX && inHyphenCompound(haystack, index, index + needle.length, category)) return false;
  if (isInstitutionOccurrence(haystack, index, needle, category)) return false;
  const run = new RegExp("^\\p{L}+", "u").exec(haystack.slice(index + needle.length, index + needle.length + 16));
  if (!run) return true;
  return NAME_LIKE.has(category) && INFLECTED_END.test(run[0]);
}
function isBarePlace2(value, category) {
  if (category === "BIRTH_PLACE") return isWordValue(value.trim()) && !/\s/.test(value.trim());
  if (category !== "ADDRESS") return false;
  const v = value.trim();
  return /^\d{4,5}$/.test(v) || isWordValue(v) && !/\s/.test(v);
}
function isBarePlaceValue(value, category) {
  return isBarePlace2(value, category);
}
function isBareInitial(value, category) {
  return NAME_LIKE.has(category) && new RegExp("^\\p{L}\\.?$", "u").test(String(value).trim());
}
function isBareInitialValue(value, category) {
  return isBareInitial(value, category);
}
function notThePersonAt(haystack, i, needle, category) {
  if (category === "ADDRESS") return addressInLegalPersonLine(haystack, i);
  if (category === "ORG") return insideCapitalCompanyName(haystack, i + needle.length);
  return category === "PERSON" && personOccurrenceIsNotThePerson(haystack, i, i + needle.length);
}
function occursIn(haystack, needle, category, context = haystack) {
  if (isBarePlace2(needle, category) || isBareInitial(needle, category)) return false;
  for (let i = haystack.indexOf(needle); i >= 0; i = haystack.indexOf(needle, i + 1)) {
    if (isLeakOccurrence(haystack, i, needle, category) && !notThePersonAt(context, i, needle, category)) {
      if ((category === "RELIGION" || category === "AFFILIATION") && context !== haystack && isInstitutionOccurrence(context.replace(/\uFFFC/g, " "), i, needle, category)) continue;
      return true;
    }
  }
  return false;
}
function exemptLeftoverCount(flat, spans, value, category) {
  if (!value || !(category === "PERSON" && isWordValue(value) || category === "ADDRESS" || category === "ORG" && isWordValue(value))) return 0;
  let n = 0;
  const starts = [];
  if (category === "ADDRESS" && /\s/.test(value)) {
    const re = new RegExp(value.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"), "gu");
    for (const m of flat.matchAll(re)) starts.push([m.index, m[0]]);
  } else {
    for (let i = flat.indexOf(value); i >= 0; i = flat.indexOf(value, i + 1)) starts.push([i, value]);
  }
  for (const [i, found] of starts) {
    if (!isLeakOccurrence(flat, i, found, category) || !notThePersonAt(flat, i, found, category)) continue;
    if (spans.some((sp) => sp.accepted && sp.start < i + found.length && i < sp.end)) continue;
    n++;
  }
  return n;
}
function exemptLeftoverMap(flat, spans) {
  const out = /* @__PURE__ */ new Map();
  const seen = /* @__PURE__ */ new Set();
  for (const s of spans) {
    if (!s.accepted || !s.text || seen.has(s.text)) continue;
    seen.add(s.text);
    const n = exemptLeftoverCount(flat, spans, s.text, s.category);
    if (n) out.set(s.text, n);
  }
  return out;
}
function survivesInWrittenText(reExtracted, flat, spans, value, category) {
  const out = leakOccurrences(reExtracted, value, category).length;
  return out > 0 && out > exemptLeftoverCount(flat, spans, value, category);
}
var escapeLeakRe = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function leakOccurrencesLoose(text, value, category) {
  const out = leakOccurrences(text, value, category);
  const v = String(value || "").trim();
  if (!v || isBarePlace2(v, category) || isShortCapitalisedWord(v, category)) return out;
  const seen = new Set(out.map(([a]) => a));
  const chars = [...normaliseConfusables(v).normalize("NFC")];
  let src = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      if (!/\\s\+$/.test(src)) src += "\\s+";
      continue;
    }
    const nfd = c.normalize("NFD");
    src += nfd !== c ? `(?:${escapeLeakRe(c)}|${escapeLeakRe(nfd)})` : escapeLeakRe(c);
    if (i + 1 < chars.length && new RegExp("\\p{L}", "u").test(c) && new RegExp("\\p{L}", "u").test(chars[i + 1])) src += "(?:-[^\\S\\r\\n]*(?:\\r\\n|\\r|\\n)[^\\S\\r\\n]*)?";
  }
  let re;
  try {
    re = new RegExp(src, "giu");
  } catch (e) {
    return out;
  }
  const folded = normaliseConfusables(text);
  for (const m of folded.matchAll(re)) {
    if (seen.has(m.index)) continue;
    if (SHORT_NUMBER.test(v)) {
      if (!isStandaloneNumberAt(folded, m.index, m[0].length)) continue;
    } else if (isWordValue(v)) {
      const before = m.index > 0 ? folded[m.index - 1] : "";
      if (before && /[\p{L}\p{N}]/u.test(before)) continue;
      if (inHyphenCompound(folded, m.index, m.index + m[0].length, category)) continue;
      if (isInstitutionOccurrence(folded, m.index, m[0], category)) continue;
      const run = new RegExp("^\\p{L}+", "u").exec(folded.slice(m.index + m[0].length, m.index + m[0].length + 16));
      if (run && !(NAME_LIKE.has(category) && INFLECTED_END.test(run[0]))) continue;
    }
    out.push([m.index, m.index + m[0].length]);
    seen.add(m.index);
  }
  return out.sort((a, b) => a[0] - b[0]);
}
function closeLeftoverOccurrences(text, spans, values, entries) {
  let current = spans.slice();
  const added = [];
  for (const value of values) {
    const category = entries.find((en) => en.value.trim() === value)?.category || "PERSON";
    for (const [start, end] of leakOccurrencesLoose(text, value, category)) {
      if (notThePersonAt(text, start, value, category)) continue;
      if (category === "RELIGION" && religionInstitutionMention(text, start, end)) continue;
      if (category === "AFFILIATION" && affiliationInstitutionMention(text, start, end)) continue;
      if (current.concat(added).some((sp) => sp.accepted && sp.start < end && start < sp.end)) continue;
      const overlapping = current.filter((sp) => !sp.accepted && sp.start < end && start < sp.end);
      if (overlapping.some((sp) => sp.userDecided || sp.userUnchecked)) continue;
      current = current.filter((sp) => !overlapping.includes(sp));
      const span = new PiiSpan(start, end, category, text.slice(start, end), 0.9, "known-value");
      span.accepted = true;
      span.tier = "auto";
      span.reviewReason = "repeated";
      added.push(span);
    }
  }
  if (!added.length) return { spans, closed: 0 };
  return { spans: current.concat(added).sort((a, b) => a.start - b.start || a.end - b.end), closed: added.length };
}
function leakOccurrences(text, value, category) {
  const out = [];
  if (!value || isBarePlace2(value, category) || isBareInitial(value, category)) return out;
  for (let i = text.indexOf(value); i >= 0; i = text.indexOf(value, i + 1)) {
    if (isLeakOccurrence(text, i, value, category)) out.push([i, i + value.length]);
  }
  return out;
}
function isShortCapitalisedWord(value, category) {
  return NAME_LIKE.has(category) && new RegExp("^\\p{Lu}\\p{Ll}{1,3}$", "u").test(value);
}
function verifyNoLeak(sanitized, entries, generatedRanges = []) {
  let stripped = sanitized;
  let context = sanitized;
  const valid = [...generatedRanges].filter((r) => r && typeof r === "object" && Number.isInteger(r.start) && Number.isInteger(r.end) && r.start >= 0 && r.end <= sanitized.length && r.end > r.start && typeof r.replacement === "string" && sanitized.slice(r.start, r.end) === r.replacement);
  const fillerOf = (r) => {
    const n = r.end - r.start;
    const f = "\uFFFC".repeat(n).split("");
    if (/^\d/.test(r.replacement)) f[0] = "\uFFFB";
    if (/\d$/.test(r.replacement)) f[n - 1] = "\uFFFB";
    return f.join("");
  };
  const contextOf = (r) => {
    const len = r.end - r.start;
    const orig = typeof r.original === "string" ? r.original.slice(-len).replace(/\s/g, "\uFFFC") : "";
    return orig.padStart(len, "\uFFFC");
  };
  valid.sort((a, b) => a.start - b.start);
  let disjoint = true;
  for (let i = 1; i < valid.length; i++) if (valid[i].start < valid[i - 1].end) {
    disjoint = false;
    break;
  }
  if (disjoint) {
    const sp = [], cp = [];
    let at = 0;
    for (const r of valid) {
      sp.push(sanitized.slice(at, r.start), fillerOf(r));
      cp.push(sanitized.slice(at, r.start), contextOf(r));
      at = r.end;
    }
    sp.push(sanitized.slice(at));
    cp.push(sanitized.slice(at));
    stripped = sp.join("");
    context = cp.join("");
  } else {
    for (const r of valid.sort((a, b) => b.start - a.start)) {
      stripped = stripped.slice(0, r.start) + fillerOf(r) + stripped.slice(r.end);
      context = context.slice(0, r.start) + contextOf(r) + context.slice(r.end);
    }
  }
  const leaks = [];
  const seen = /* @__PURE__ */ new Set();
  const gramsOf = (text) => {
    if (text.length < 2e5) return null;
    const grams = /* @__PURE__ */ new Set();
    for (let i = 0; i + 4 <= text.length; i++) grams.add(text.slice(i, i + 4));
    return grams;
  };
  const maybeIn = (grams, value) => !grams || value.length < 4 || grams.has(value.slice(0, 4));
  const strippedGrams = gramsOf(stripped);
  for (const e of entries) {
    const value = e.value.trim();
    if (value && !seen.has(value) && maybeIn(strippedGrams, value) && occursIn(stripped, value, e.category, context)) {
      leaks.push(value);
      seen.add(value);
    }
  }
  const normalisedText = leakNormalise(stripped);
  const normalisedGrams = gramsOf(normalisedText);
  const normalisedContext = (() => {
    const c = leakNormalise(context);
    return c.length === normalisedText.length ? c : normalisedText;
  })();
  for (const e of entries) {
    const value = e.value.trim();
    if (!value || seen.has(value)) continue;
    if (isShortCapitalisedWord(value, e.category)) continue;
    const normalisedValue = leakNormalise(value);
    if (normalisedValue && maybeIn(normalisedGrams, normalisedValue) && occursIn(normalisedText, normalisedValue, e.category, normalisedContext)) {
      leaks.push(value);
      seen.add(value);
    }
  }
  return leaks;
}

export {
  isRecordRefHeader,
  hasStrongSubjectColumn,
  inferIdColumns,
  dropLoneLocality,
  tableHeaderCategory,
  tableHeaderGuard,
  tableCellSpans,
  headerNameRole,
  rowHoldsValues,
  detect,
  personClusters,
  spanMapKey,
  entryMapKey,
  buildMapping,
  dropContentlessSpans,
  snapSpansToWordEnd,
  splitSpansAtLineBreaks,
  applyMappingDetailed,
  isWordValue,
  isStandaloneNumberAt,
  isCompoundOccurrence,
  isBarePlaceValue,
  isBareInitialValue,
  exemptLeftoverCount,
  exemptLeftoverMap,
  survivesInWrittenText,
  closeLeftoverOccurrences,
  leakOccurrences,
  verifyNoLeak
};
