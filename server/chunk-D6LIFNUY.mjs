import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  isCommonWord,
  looksLikeGivenName
} from "./chunk-ENPGGBFS.mjs";
import {
  PLACEHOLDER_REGEX
} from "./chunk-QFNUQB57.mjs";

// ../extension/core/deanonymize.js
var PH_RE = () => new RegExp(PLACEHOLDER_REGEX.source, "g");
var PH_FULL = new RegExp("^" + PLACEHOLDER_REGEX.source + "$");
var OPEN_DELIMS = "\xAB\u2039<\\[\\{";
var CLOSE_DELIMS = "\xBB\u203A>\\]\\}";
var T_TOKEN_EXACT = 0;
var T_SUR_EXACT = 1;
var T_SUR_FLEX = 2;
var T_TOKEN_TOLERANT = 3;
var T_STRUCT = 4;
var T_DATE = 5;
var T_CI = 6;
var T_ORG_CORE = 7;
var T_NAME_PART = 8;
var FUZZY_FROM = T_SUR_FLEX;
var PARTIAL_TIERS = /* @__PURE__ */ new Set([T_ORG_CORE, T_NAME_PART]);
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function guards(surrogate) {
  const wordChar = /[\p{L}\p{N}_]/u;
  return {
    lead: surrogate && wordChar.test(surrogate[0]) ? "(?<![\\p{L}\\p{N}_])" : "",
    trail: surrogate && wordChar.test(surrogate[surrogate.length - 1]) ? "(?![\\p{L}\\p{N}_])" : ""
  };
}
function surrogateBoundaryPattern(surrogate, flags) {
  const g = guards(surrogate);
  return new RegExp(g.lead + escapeRegExp(surrogate) + g.trail, flags);
}
var TRANSLITERATION = {
  "\xE4": "(?:\xE4|ae)",
  "\xF6": "(?:\xF6|oe)",
  "\xFC": "(?:\xFC|ue)",
  "\xDF": "(?:\xDF|ss)",
  "\xC4": "(?:\xC4|Ae|AE)",
  "\xD6": "(?:\xD6|Oe|OE)",
  "\xDC": "(?:\xDC|Ue|UE)"
};
function translitOnly(s) {
  return s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue");
}
function foldTranslit(s) {
  return translitOnly(s).toLowerCase();
}
function flexibleLiteralSource(value) {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (/\s/.test(ch)) {
      while (i + 1 < value.length && /\s/.test(value[i + 1])) i++;
      out += "(?:[\\s\\u00a0]+|-[\\s\\u00a0]*)";
      continue;
    }
    if (TRANSLITERATION[ch]) {
      out += TRANSLITERATION[ch];
      continue;
    }
    if (ch === "," && i + 1 < value.length && /\s/.test(value[i + 1])) {
      out += ",?";
      continue;
    }
    if (/[.*+?^${}()|[\]\\\-#!_~]/.test(ch)) out += "\\\\?" + escapeRegExp(ch);
    else out += escapeRegExp(ch);
  }
  return out;
}
var INFLECTION = "(s|ns|\u2019s|'s)?";
function tolerantPatternFor(placeholder) {
  const m = PH_FULL.exec(placeholder);
  if (!m) return null;
  return tolerantPatternForCategories([m[1]], m[2]);
}
function tolerantPatternForCategories(categories, index) {
  const alt = [...new Set(categories)].sort((a, b) => b.length - a.length).map((c) => c.split("_").map(escapeRegExp).join("\\\\?[_ ]")).join("|");
  if (!alt) return null;
  const idx = index === void 0 ? "\\d{1,6}" : `0*${escapeRegExp(String(index))}`;
  const md = "[*`~]{1,3}";
  const delimited = `[${OPEN_DELIMS}]\\s*(?:${md}\\s*)?(?:${alt})\\s*\\\\?[_ \\-]\\s*${idx}(?!\\d)(?:\\s*${md})?\\s*[${CLOSE_DELIMS}]`;
  const bare = `(?:${md})?(?:${alt})\\\\?_${idx}(?!\\d)(?:${md})?`;
  const src = `(?<![\\p{L}\\p{N}])(?:${delimited}|${bare})(?![\\p{L}\\p{N}])`;
  return new RegExp(src, "giu");
}
var STRUCTURED = /* @__PURE__ */ new Set([
  "IBAN",
  "BIC",
  "CREDIT_CARD",
  "ACCOUNT",
  "TAX_ID",
  "VAT_ID",
  "SV_ID",
  "ID_CARD",
  "HEALTH_INSURANCE",
  "PLATE",
  "REG_ID",
  "CUSTOMER_ID",
  "PHONE"
]);
var MIN_STRUCT_LEN = 8;
var distinctiveEnough = (norm) => norm.length >= MIN_STRUCT_LEN || norm.length >= 6 && /[A-Z]/.test(norm) && /\d/.test(norm);
var normalizeId = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
function phoneKeys(norm) {
  const keys = /* @__PURE__ */ new Set([norm]);
  if (norm.startsWith("0049")) {
    keys.add("49" + norm.slice(4));
    keys.add("0" + norm.slice(4));
  } else if (norm.startsWith("49")) {
    keys.add("0" + norm.slice(2));
    keys.add("0049" + norm.slice(2));
  } else if (norm.startsWith("0")) {
    keys.add("49" + norm.slice(1));
    keys.add("0049" + norm.slice(1));
  }
  return [...keys];
}
var SEP = "[\\s\\u00a0.\\-/()]*";
var bodyOf = (key) => [...key].map(escapeRegExp).join(SEP);
function separatorTolerantPattern(key, lead = "") {
  return new RegExp(`(?<![A-Za-z0-9])${lead}\\(?${bodyOf(key)}(?![A-Za-z0-9])`, "gi");
}
function structPatterns(category, key) {
  const lead = category === "PHONE" ? "\\+?" : "";
  const pats = [separatorTolerantPattern(key, lead)];
  if (category === "PHONE" && key.startsWith("49") && key.length > 4) {
    pats.push(new RegExp(
      `(?<![A-Za-z0-9])${lead}${bodyOf("49")}${SEP}\\(0\\)${SEP}${bodyOf(key.slice(2))}(?![A-Za-z0-9])`,
      "gi"
    ));
  }
  return pats;
}
function trimUnbalanced(text, start, end) {
  for (; ; ) {
    const slice = text.slice(start, end);
    const opens = (slice.match(/\(/g) || []).length;
    const closes = (slice.match(/\)/g) || []).length;
    if (opens === closes) return [start, end];
    if (opens > closes && text[start] === "(") {
      start++;
      continue;
    }
    if (closes > opens && text[end - 1] === ")") {
      end--;
      continue;
    }
    return [start, end];
  }
}
var MONTHS = {
  januar: 1,
  j\u00E4nner: 1,
  februar: 2,
  m\u00E4rz: 3,
  maerz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12,
  january: 1,
  february: 2,
  march: 3,
  may: 5,
  june: 6,
  july: 7,
  october: 10,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  mrz: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  okt: 10,
  oct: 10,
  nov: 11,
  dez: 12,
  dec: 12
};
var MONTH_ALT = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
var DATE_RE = new RegExp(
  `(?<![\\d/.\\-])(?:(\\d{1,2})[.\\/-](\\d{1,2})[.\\/-](\\d{4})|(\\d{4})-(\\d{1,2})-(\\d{1,2})|(\\d{1,2})\\.?\\s+(${MONTH_ALT})\\.?\\s+(\\d{4})|(${MONTH_ALT})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4}))\\.?(?![\\d/\\-])`,
  "gi"
);
function dateKeyOf(match) {
  const m = match;
  if (m[1]) return `${+m[3]}-${+m[2]}-${+m[1]}`;
  if (m[4]) return `${+m[4]}-${+m[5]}-${+m[6]}`;
  if (m[7]) return `${+m[9]}-${MONTHS[m[8].toLowerCase()]}-${+m[7]}`;
  if (m[10]) return `${+m[12]}-${MONTHS[m[10].toLowerCase()]}-${+m[11]}`;
  return null;
}
function dateKeys(m, locale) {
  const valid = (y, mo, d) => {
    const date = new Date(Date.UTC(y, mo - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  };
  let keys;
  if (m[1]) {
    const a = +m[1], b = +m[2], y = +m[3];
    const order = /^en-US$/i.test(locale || "") ? "mdy" : /^(de(?:-|$)|en-GB$)/i.test(locale || "") || /^\d{1,2}\.\d{1,2}\./.test(m[0]) ? "dmy" : null;
    keys = order === "mdy" ? [[y, a, b]] : order === "dmy" ? [[y, b, a]] : [[y, b, a], [y, a, b]];
  } else {
    const key = dateKeyOf(m);
    keys = key ? [key.split("-").map(Number)] : [];
  }
  return [...new Set(keys.filter((k) => valid(...k)).map((k) => k.join("-")))];
}
var LEGAL_SUFFIX_RE = /[\s,]+(GmbH\s*&\s*Co\.?\s*KG|UG\s*\(haftungsbeschränkt\)|gGmbH|GmbH|mbH|AG|KG|OHG|GbR|e\.\s?V\.|e\.\s?K\.|SE|Ltd\.?|Inc\.?|LLC|LLP|S\.?A\.?R\.?L\.?|B\.?V\.?|N\.?V\.?|PLC)\s*$/i;
var stripLegalSuffix = (s) => s.replace(LEGAL_SUFFIX_RE, "").trim();
var AMBIGUOUS_NAME_WORDS = /* @__PURE__ */ new Set([
  // ordinary German words that are also common surnames
  "braun",
  "schwarz",
  "weiss",
  "wei\xDF",
  "gr\xFCn",
  "gruen",
  "lange",
  "langen",
  "kurz",
  "klein",
  "gross",
  "gro\xDF",
  "jung",
  "alt",
  "neu",
  "reich",
  "arm",
  "wolf",
  "fuchs",
  "vogel",
  "hase",
  "b\xE4r",
  "baer",
  "stein",
  "berg",
  "wald",
  "feld",
  "bach",
  "sommer",
  "winter",
  "fr\xFChling",
  "herbst",
  "richter",
  "becker",
  "bauer",
  "koch",
  "schuster",
  "schreiber",
  "schneider",
  "m\xFCller",
  "mueller",
  "meister",
  "f\xF6rster",
  "foerster",
  "j\xE4ger",
  "jaeger",
  "hirte",
  "kaiser",
  "k\xF6nig",
  "koenig",
  "f\xFCrst",
  "graf",
  "ritter",
  "engel",
  "papst",
  "probst",
  "kern",
  "linde",
  "eiche",
  "rose",
  "blume",
  "strau\xDF",
  "strauss",
  "fink",
  "specht",
  "star",
  "adler",
  "falke",
  "zimmermann",
  "k\xF6hler",
  "koehler",
  "krause",
  "frank",
  "ernst",
  "kluge",
  "friedlich"
]);
function ambiguousVocabulary(surrogate) {
  const w = String(surrogate || "").trim();
  if (!w || /[\s-]/.test(w)) return false;
  return isCommonWord(w) || AMBIGUOUS_NAME_WORDS.has(w.toLowerCase());
}
function nameParts(s) {
  const tokens = String(s).trim().split(/\s+/).filter(Boolean);
  const words = tokens.filter((t) => !/^[A-ZÄÖÜ]\.$/.test(t));
  if (words.length < 2) return null;
  return { given: words[0], surname: words[words.length - 1] };
}
function usableNamePart(part) {
  if (!reportableNamePart(part)) return false;
  if (AMBIGUOUS_NAME_WORDS.has(part.toLowerCase())) return false;
  return true;
}
function reportableNamePart(part) {
  if (!part || part.length < 4) return false;
  if (!/^[\p{Lu}]/u.test(part)) return false;
  return true;
}
function tolerantCategoriesPresent(categories, cfText) {
  return categories.filter((c) => cfText.includes(c.split("_")[0].toLowerCase()));
}
var precedingWordRe = /([\p{L}][\p{L}\p{N}'’-]*)[ \t]*$/u;
function anchorPresent(literal, foldedText) {
  const runs = literal.match(/[\p{L}\p{N}]+/gu) || [];
  if (!runs.length) return true;
  const anchor = runs.sort((a, b) => b.length - a.length)[0];
  return foldedText.includes(foldTranslit(anchor));
}
function partClaims(entry) {
  const out = [];
  if (entry.category === "ORG") {
    const core = stripLegalSuffix(entry.surrogate);
    const valueCore = stripLegalSuffix(entry.value);
    if (core && core !== entry.surrogate && usableNamePart(core.split(/\s+/)[0])) {
      out.push([core, valueCore || entry.value, T_ORG_CORE, null]);
    }
    return out;
  }
  if (entry.category !== "PERSON") return out;
  const sp = nameParts(entry.surrogate);
  if (!sp) return out;
  const vp = nameParts(entry.value);
  const surnameRepl = vp ? vp.surname : String(entry.value).trim();
  const givenRepl = vp ? vp.given : null;
  if (usableNamePart(sp.surname)) out.push([sp.surname, surnameRepl, T_NAME_PART, sp.given]);
  if (givenRepl && usableNamePart(sp.given)) out.push([sp.given, givenRepl, T_NAME_PART, null]);
  return out;
}
var MAX_PART_OWNERS = 2;
var isWordChar = (ch) => /[\p{L}\p{N}_]/u.test(ch);
function foreignPartOwners(entries) {
  const withSur = (entries || []).filter((e) => e && e.surrogate);
  const parts = /* @__PURE__ */ new Set();
  for (const e of withSur) for (const [part] of partClaims(e)) parts.add(part);
  const owners = /* @__PURE__ */ new Map();
  if (!parts.size) return owners;
  let longest = 0;
  for (const p of parts) if (p.length > longest) longest = p.length;
  for (const e of withSur) {
    const s = String(e.surrogate);
    const ident = idOf(e);
    for (let i = 0; i < s.length; i++) {
      if (i && isWordChar(s[i - 1])) continue;
      for (let j = i + 1; j <= Math.min(s.length, i + longest); j++) {
        if (j < s.length && isWordChar(s[j])) continue;
        const sub = s.slice(i, j);
        if (!parts.has(sub)) continue;
        let seen = owners.get(sub);
        if (!seen) owners.set(sub, seen = /* @__PURE__ */ new Set());
        if (seen.size < MAX_PART_OWNERS) seen.add(ident);
      }
    }
  }
  return owners;
}
function pushAll(out, re, text, build) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    const cand = build(m);
    if (cand) out.push({ start: m.index, end: m.index + m[0].length, ...cand });
  }
}
var idOf = (e) => e.id || e.placeholder;
var tokenUsable = (e) => !!e.placeholder && !e.noToken;
var surrogateUsable = (e) => !!e.surrogate && !e.noSurrogate;
function collectEntryCandidates(text, entries, prepared, foreign = null) {
  const out = [];
  const withSur = entries.filter(surrogateUsable);
  for (const e of entries) {
    if (!tokenUsable(e) || !text.includes(e.placeholder)) continue;
    pushAll(
      out,
      new RegExp(escapeRegExp(e.placeholder), "g"),
      text,
      () => ({ repl: e.value, ph: idOf(e), tier: T_TOKEN_EXACT })
    );
  }
  const foldedText = prepared.folded;
  for (const e of withSur) {
    if (!anchorPresent(e.surrogate, foldedText)) continue;
    const needsCheck = ambiguousVocabulary(e.surrogate);
    pushAll(
      out,
      surrogateBoundaryPattern(e.surrogate, "gu"),
      text,
      () => ({ repl: e.value, ph: idOf(e), tier: T_SUR_EXACT, check: needsCheck })
    );
    const g = guards(e.surrogate);
    const inflect = e.category === "PERSON" || e.category === "ORG";
    const src = g.lead + flexibleLiteralSource(e.surrogate) + (inflect ? INFLECTION : "") + g.trail;
    pushAll(
      out,
      new RegExp(src, "gu"),
      text,
      (m) => ({ repl: e.value + (inflect && m[1] ? m[1] : ""), ph: idOf(e), tier: T_SUR_FLEX })
    );
    const caseFree = e.category === "EMAIL" || STRUCTURED.has(e.category);
    pushAll(
      out,
      new RegExp(g.lead + flexibleLiteralSource(e.surrogate) + g.trail, "giu"),
      text,
      (m) => {
        if (!caseFree && new RegExp("\\p{Ll}", "u").test(m[0])) return null;
        return { repl: e.value, ph: idOf(e), tier: T_CI, check: ambiguousVocabulary(e.surrogate) };
      }
    );
  }
  const byToken = /* @__PURE__ */ new Map();
  for (const e of entries) {
    const m = tokenUsable(e) && PH_FULL.exec(e.placeholder);
    if (m) byToken.set(`${m[1]}\0${Number(m[2])}`, e);
  }
  if (byToken.size) {
    const cats = tolerantCategoriesPresent(
      [...byToken.keys()].map((k) => k.split("\0")[0]),
      prepared.casefolded
    );
    const re = cats.length ? tolerantPatternForCategories(cats) : null;
    if (re) {
      pushAll(out, re, text, (m) => {
        const raw = m[0];
        const before = raw[0] === "`" ? "`" : text[m.index - 1] || "";
        const after = raw[raw.length - 1] === "`" ? "`" : text[m.index + raw.length] || "";
        if (/["'`]/.test(before) && /["'`]/.test(after) && raw !== raw.toUpperCase()) return null;
        const cm = /([\p{L}_\\ ]+?)\s*\\?[_ -]\s*(\d{1,6})/u.exec(raw.replace(/[*`~]/g, ""));
        if (!cm) return null;
        const cat = cm[1].replace(/[\\\s]/g, "").replace(/[^\p{L}_]/gu, "").toUpperCase();
        const e = byToken.get(`${cat}\0${Number(cm[2])}`);
        if (!e) return null;
        return { repl: e.value, ph: idOf(e), tier: T_TOKEN_TOLERANT };
      });
    }
  }
  const flatText = prepared.flat;
  for (const e of withSur) {
    if (!STRUCTURED.has(e.category)) continue;
    const norm = normalizeId(e.surrogate);
    if (!distinctiveEnough(norm)) continue;
    const keys = e.category === "PHONE" ? phoneKeys(norm) : [norm];
    for (const key of keys) {
      if (!distinctiveEnough(key)) continue;
      const trunkZero = e.category === "PHONE" && key.startsWith("49") && key.length > 4 ? "490" + key.slice(2) : null;
      if (!flatText.includes(key) && !(trunkZero && flatText.includes(trunkZero))) continue;
      for (const pat of structPatterns(e.category, key)) {
        pushAll(out, pat, text, (m) => {
          const [start, end] = trimUnbalanced(text, m.index, m.index + m[0].length);
          return { start, end, repl: e.value, ph: idOf(e), tier: T_STRUCT };
        });
      }
    }
  }
  for (const e of withSur) {
    DATE_RE.lastIndex = 0;
    const sm = DATE_RE.exec(String(e.surrogate).trim());
    if (!sm || sm.index !== 0 || sm[0].length !== String(e.surrogate).trim().length) continue;
    const keys = dateKeys(sm, e.dateLocale || e.date_locale);
    pushAll(out, DATE_RE, text, (m) => {
      const observed = dateKeys(m, e.restoreLocale || e.restore_locale);
      if (!keys.some((k) => observed.includes(k))) return null;
      return {
        repl: e.value,
        ph: idOf(e),
        tier: T_DATE,
        ambiguousDate: keys.length > 1 || observed.length > 1
      };
    });
  }
  const partMap = /* @__PURE__ */ new Map();
  const partOwnGiven = /* @__PURE__ */ new Map();
  const claim = (part, cand, ownGiven) => {
    if (!part) return;
    const key = translitOnly(part);
    if (partMap.has(key) && partMap.get(key)?.ph !== cand.ph) partMap.set(key, null);
    else if (!partMap.has(key)) {
      partMap.set(key, { ...cand, part });
      if (ownGiven) partOwnGiven.set(key, ownGiven);
    }
  };
  for (const e of withSur) {
    for (const [part, repl, tier, ownGiven] of partClaims(e)) {
      claim(part, { repl, ph: idOf(e), tier }, ownGiven);
    }
  }
  const owners = foreign || foreignPartOwners(entries);
  for (const [key, cand] of partMap) {
    if (!cand) continue;
    const other = owners.get(cand.part);
    if (other && [...other].some((id) => id !== cand.ph)) partMap.set(key, null);
  }
  const parts = [...partMap.entries()].filter(([, v]) => v).map(([, v]) => v.part).filter((p) => anchorPresent(p, foldedText));
  if (parts.length) {
    const alt = parts.sort((a, b) => b.length - a.length).map(flexibleLiteralSource).join("|");
    const re = new RegExp(`(?<![\\p{L}\\p{N}_])(${alt})${INFLECTION}(?![\\p{L}\\p{N}_])`, "gu");
    pushAll(out, re, text, (m) => {
      const key = translitOnly(m[1]);
      const c = partMap.get(key);
      if (!c) return null;
      const ownGiven = partOwnGiven.get(key);
      if (ownGiven) {
        const windowStart = Math.max(0, m.index - 64);
        const pm = precedingWordRe.exec(text.slice(windowStart, m.index));
        if (pm && translitOnly(pm[1]) !== translitOnly(ownGiven) && looksLikeGivenName(pm[1])) {
          return null;
        }
      }
      return { repl: c.repl + (m[2] || ""), ph: c.ph, tier: c.tier };
    });
  }
  return out;
}
var prepareText = (text) => ({
  folded: foldTranslit(text),
  flat: normalizeId(text),
  translit: translitOnly(text),
  casefolded: text.toLowerCase().replace(/\u017f/g, "s").replace(/\u212a/g, "k")
});
function collectCandidates(text, entries, prepared = prepareText(text)) {
  const foreign = foreignPartOwners(entries);
  return entries.flatMap((e) => collectEntryCandidates(text, [{ ...e, noToken: false, noSurrogate: false }], prepared, foreign).map((c) => ({
    ...c,
    target: e.entityId || e.entity_id || e.value,
    blocked: c.tier === T_TOKEN_EXACT || c.tier === T_TOKEN_TOLERANT ? !!e.noToken : !!e.noSurrogate
  })));
}
function candidateResolution(text, candidates) {
  const groups = /* @__PURE__ */ new Map();
  for (const c of candidates) {
    const key = `${c.start}:${c.end}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const conflicts = [];
  for (const group of groups.values()) {
    const verbatim = group.filter((c) => c.tier <= T_SUR_EXACT && !c.blocked);
    const basis = verbatim.length ? verbatim : group;
    const targets = new Set(basis.map((c) => c.target));
    const unresolved = targets.size > 1 || basis.every((c) => c.blocked || c.ambiguousDate);
    if (unresolved) conflicts.push({
      start: group[0].start,
      end: group[0].end,
      candidateEntityIds: [...targets],
      status: "ambiguous",
      partial: group.every((c) => c.tier >= T_ORG_CORE)
    });
  }
  const full = candidates.filter((c) => c.tier < T_ORG_CORE && !c.blocked && !c.ambiguousDate).sort((a, b) => a.start - b.start || a.end - b.end);
  const crossingConflictKeys = /* @__PURE__ */ new Set();
  for (let i = 0; i < full.length; i++) for (let j = i + 1; j < full.length; j++) {
    const a = full[i], b = full[j];
    if (b.start >= a.end) break;
    const crossing = a.start < b.start && b.start < a.end && a.end < b.end;
    if (crossing && a.target !== b.target) {
      const start = Math.min(a.start, b.start), end = Math.max(a.end, b.end);
      const candidateEntityIds = [.../* @__PURE__ */ new Set([a.target, b.target])].sort();
      const key = `${start}:${end}:${candidateEntityIds.join("\\0")}`;
      if (!crossingConflictKeys.has(key)) {
        crossingConflictKeys.add(key);
        conflicts.push({ start, end, candidateEntityIds, status: "ambiguous", partial: false });
      }
    }
  }
  const activeConflicts = conflicts.filter((c) => !(c.partial && full.some((f) => f.start <= c.start && f.end >= c.end && (f.start < c.start || f.end > c.end))));
  candidates.sort((a, b) => a.tier - b.tier || b.end - b.start - (a.end - a.start) || a.start - b.start);
  const claimed = new Uint8Array(text.length), accepted = [];
  outer: for (const c of candidates) {
    if (c.blocked || c.ambiguousDate || activeConflicts.some((x) => x.start < c.end && c.start < x.end)) continue;
    for (let i = c.start; i < c.end; i++) if (claimed[i]) continue outer;
    for (let i = c.start; i < c.end; i++) claimed[i] = 1;
    accepted.push({ ...c, status: c.tier >= FUZZY_FROM || c.check ? "inferred" : "exact" });
  }
  accepted.sort((a, b) => a.start - b.start);
  return { accepted, conflicts: activeConflicts };
}
function restoreEdits(text, entries) {
  const list = Array.isArray(entries) ? entries : [];
  const { accepted, conflicts } = candidateResolution(text, collectCandidates(text, list));
  const seen = /* @__PURE__ */ new Set();
  const altered = /* @__PURE__ */ new Set();
  const partial = /* @__PURE__ */ new Set();
  const flagged = /* @__PURE__ */ new Set();
  for (const c of accepted) {
    seen.add(c.ph);
    if (c.tier >= FUZZY_FROM) altered.add(c.ph);
    if (PARTIAL_TIERS.has(c.tier)) partial.add(c.ph);
    if (c.check) flagged.add(c.ph);
  }
  for (const id of flagged) altered.add(id);
  return { edits: accepted, seen, altered, partial, conflicts, ambiguous: conflicts.length > 0 };
}
function placeholderById(entries) {
  return new Map((Array.isArray(entries) ? entries : []).map((e) => [idOf(e), e.placeholder]));
}
function surrogateStillStanding(entry, text, prepared = prepareText(text)) {
  if (!entry) return false;
  if (collectCandidates(text, [entry], prepared).length) return true;
  if (!entry.surrogate) return false;
  const probe = prepared.translit;
  const sur = translitOnly(entry.surrogate);
  if (probe.includes(sur) && surrogateBoundaryPattern(sur, "u").test(probe)) return true;
  if (entry.category !== "PERSON") return false;
  const sp = nameParts(entry.surrogate);
  return !!sp && [sp.given, sp.surname].map(translitOnly).some((p) => reportableNamePart(p) && probe.includes(p) && new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(p)}`, "u").test(probe));
}
function applyCandidates(text, candidates) {
  const { accepted, conflicts } = candidateResolution(text, candidates);
  accepted.sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  const filled = [];
  for (const c of accepted) {
    out += text.slice(cursor, c.start);
    filled.push([out.length, out.length + c.repl.length]);
    out += c.repl;
    cursor = c.end;
  }
  out += text.slice(cursor);
  return { text: out, accepted, filled, conflicts };
}
function maskFilled(text, filled) {
  if (!filled || !filled.length) return text;
  let out = "";
  let cursor = 0;
  for (const [s, e] of filled) {
    out += text.slice(cursor, s) + "\0".repeat(e - s);
    cursor = e;
  }
  return out + text.slice(cursor);
}
function deanonymizeDetailed(text, entries) {
  const list = Array.isArray(entries) ? entries : [];
  const byId = new Map(list.map((e) => [idOf(e), e.placeholder]));
  const { text: restored, accepted, filled, conflicts } = applyCandidates(text, collectCandidates(text, list));
  const seen = /* @__PURE__ */ new Set();
  const altered = /* @__PURE__ */ new Set();
  const partial = /* @__PURE__ */ new Set();
  const flagged = /* @__PURE__ */ new Set();
  for (const c of accepted) {
    seen.add(c.ph);
    if (c.tier >= FUZZY_FROM) altered.add(c.ph);
    if (PARTIAL_TIERS.has(c.tier)) partial.add(c.ph);
    if (c.check) flagged.add(c.ph);
  }
  for (const id of flagged) altered.add(id);
  const unresolved = [...new Set([...restored.matchAll(PH_RE())].map((mm) => mm[0]))].sort();
  const missing = list.filter((e) => !seen.has(idOf(e))).map((e) => e.placeholder).sort();
  const named = (ids) => [...ids].map((i) => byId.get(i) || i).sort();
  const probe = maskFilled(restored, filled);
  const preparedProbe = prepareText(probe);
  const residual = list.filter((e) => surrogateStillStanding(e, probe, preparedProbe)).map((e) => e.placeholder);
  return {
    text: restored,
    edits: accepted,
    conflicts,
    ambiguous: conflicts.length > 0,
    unresolved,
    altered: named(altered),
    partial: named(partial),
    missing,
    residual: [...new Set(residual)].sort()
  };
}
function deanonymize(text, entries) {
  const r = deanonymizeDetailed(text, entries);
  return { text: r.text, unresolved: r.unresolved };
}
var DOC_SCOPED_ENTITY = /^[^:]+:person:\d+$/;
function unionMappings(candidates) {
  const valuesFor = (pick) => {
    const m = /* @__PURE__ */ new Map();
    for (const c of candidates || []) {
      for (const e of c && c.entries || []) {
        const key = pick(e);
        if (!key) continue;
        if (!m.has(key)) m.set(key, /* @__PURE__ */ new Set());
        m.get(key).add(e.value);
      }
    }
    return m;
  };
  const tokenValues = valuesFor((e) => e.placeholder);
  const surValues = valuesFor((e) => e.surrogate);
  const entries = [];
  const seen = /* @__PURE__ */ new Set();
  const disowned = /* @__PURE__ */ new Set();
  let n = 0;
  for (const c of candidates || []) {
    for (const e of c && c.entries || []) {
      const entityId = DOC_SCOPED_ENTITY.test(e.entityId || e.entity_id || "") ? "" : e.entityId || e.entity_id || "";
      const dedupe = JSON.stringify([e.placeholder, e.surrogate || "", e.value]);
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      const noToken = !e.placeholder || (tokenValues.get(e.placeholder) || /* @__PURE__ */ new Set()).size > 1;
      const noSurrogate = !e.surrogate || (surValues.get(e.surrogate) || /* @__PURE__ */ new Set()).size > 1;
      if (noToken && e.placeholder) disowned.add(e.placeholder);
      if (noSurrogate && e.surrogate) disowned.add(e.surrogate);
      const merged = { ...e, id: `${n++}:${e.placeholder}`, noToken, noSurrogate };
      if (!entityId) {
        delete merged.entityId;
        delete merged.entity_id;
      }
      entries.push(merged);
    }
  }
  return { entries, disowned };
}
function selectRestoreMapping(text, candidates, convId) {
  const same = (candidates || []).filter((c) => (c.convId || "") === (convId || ""));
  if (!same.length) return { ok: false, ambiguous: false, reason: "no-context-mapping" };
  const { entries } = unionMappings(same);
  const r = deanonymizeDetailed(text, entries);
  return {
    ok: r.edits.length > 0 || r.ambiguous || r.residual.length > 0,
    r,
    entries,
    ambiguous: r.ambiguous
  };
}
var SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;
function placeholderContexts(text, entries) {
  const known = new Set(entries.map((e) => e.placeholder));
  const sentences = text.split(SENTENCE_SPLIT);
  const out = /* @__PURE__ */ new Map();
  for (const sentence of sentences) {
    const stripped = sentence.trim();
    if (!stripped) continue;
    for (const mm of stripped.matchAll(PH_RE())) {
      const token = mm[0];
      if (!known.has(token)) continue;
      if (!out.has(token)) out.set(token, []);
      out.get(token).push(stripped);
    }
  }
  return out;
}
var __restoreGuardProbes = {
  partClaims,
  foreignPartOwners,
  collectEntryCandidates,
  candidateResolution,
  prepareText
};
var __prefilterInvariantProbes = {
  anchorPresent,
  tolerantCategoriesPresent,
  tolerantPatternForCategories,
  flexibleLiteralSource,
  foldTranslit,
  prepareText
};

export {
  tolerantPatternFor,
  restoreEdits,
  placeholderById,
  surrogateStillStanding,
  deanonymizeDetailed,
  deanonymize,
  unionMappings,
  selectRestoreMapping,
  placeholderContexts,
  __restoreGuardProbes,
  __prefilterInvariantProbes
};
