import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  PiiSpan
} from "./chunk-XGOKF7XS.mjs";

// ../extension/core/ner.js
var LABEL_TO_CATEGORY = {
  person: "PERSON",
  "person name": "PERSON",
  "name of a person": "PERSON",
  "name einer person": "PERSON",
  "vollst\xE4ndiger name": "PERSON",
  address: "ADDRESS",
  "home address": "ADDRESS",
  "postal address": "ADDRESS",
  wohnanschrift: "ADDRESS",
  anschrift: "ADDRESS",
  organization: "ORG",
  company: "ORG",
  firmenname: "ORG"
};
var LABELS = Object.keys(LABEL_TO_CATEGORY);
var DETECT_THRESHOLD = 0.2;
var CHUNK_CHARS = 1200;
var CHUNK_OVERLAP = 200;
function* chunks(text) {
  const n = text.length;
  if (n <= CHUNK_CHARS) {
    yield [0, text];
    return;
  }
  let start = 0;
  while (start < n) {
    let end = Math.min(start + CHUNK_CHARS, n);
    if (end < n) {
      const window = text.slice(end - CHUNK_OVERLAP, end);
      let cut = window.lastIndexOf("\n");
      if (cut === -1) cut = window.lastIndexOf(" ");
      if (cut !== -1) end = end - CHUNK_OVERLAP + cut + 1;
    }
    yield [start, text.slice(start, end)];
    if (end >= n) return;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
}
var FOLD = new Map(Object.entries({
  "\xE4": "a",
  "\xF6": "o",
  "\xFC": "u",
  "\xC4": "A",
  "\xD6": "O",
  "\xDC": "U",
  "\xDF": "s",
  "\xE1": "a",
  "\xE0": "a",
  "\xE2": "a",
  "\xE3": "a",
  "\xE5": "a",
  "\xC1": "A",
  "\xC0": "A",
  "\xC2": "A",
  "\xC5": "A",
  "\xE9": "e",
  "\xE8": "e",
  "\xEA": "e",
  "\xEB": "e",
  "\xC9": "E",
  "\xC8": "E",
  "\xCA": "E",
  "\xED": "i",
  "\xEC": "i",
  "\xEE": "i",
  "\xEF": "i",
  "\xCD": "I",
  "\xCE": "I",
  "\xF3": "o",
  "\xF2": "o",
  "\xF4": "o",
  "\xF5": "o",
  "\xF8": "o",
  "\xD3": "O",
  "\xD4": "O",
  "\xD8": "O",
  "\xFA": "u",
  "\xF9": "u",
  "\xFB": "u",
  "\xDA": "U",
  "\xDB": "U",
  "\xE7": "c",
  "\xC7": "C",
  "\xF1": "n",
  "\xD1": "N",
  "\xFD": "y",
  "\xFF": "y"
}));
var FOLD_RE = /[äöüÄÖÜßáàâãåÁÀÂÅéèêëÉÈÊíìîïÍÎóòôõøÓÔØúùûÚÛçÇñÑýÿ]/g;
function foldDiacritics(s) {
  if (!FOLD_RE.test(s)) return s;
  FOLD_RE.lastIndex = 0;
  return s.replace(FOLD_RE, (ch) => FOLD.get(ch) || ch);
}
var NerAborted = class extends Error {
  constructor() {
    super("NER pass abandoned");
    this.aborted = true;
  }
};
var ANALYSIS_POLICY_VERSION = "ner-contract-2";
var NerIncompleteError = class extends Error {
  constructor(reason, analysis) {
    super("model_incomplete");
    this.code = "model_incomplete";
    this.reason = reason;
    this.analysis = Object.freeze({ ...analysis, complete: false, errors: [reason] });
  }
};
async function analysisTextHash(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function validateEntities(entities, chunk, analysis) {
  if (!Array.isArray(entities)) throw new NerIncompleteError("invalid_response", analysis);
  for (const ent of entities) {
    if (!ent || typeof ent.label !== "string" || !Number.isSafeInteger(ent.start) || !Number.isSafeInteger(ent.end) || ent.start < 0 || ent.end <= ent.start || ent.end > chunk.length || ent.score !== void 0 && (typeof ent.score !== "number" || !Number.isFinite(ent.score) || ent.score < 0 || ent.score > 1)) {
      throw new NerIncompleteError("invalid_span", analysis);
    }
    for (const at of [ent.start, ent.end]) {
      if (at > 0 && at < chunk.length && /[\uD800-\uDBFF]/.test(chunk[at - 1]) && /[\uDC00-\uDFFF]/.test(chunk[at])) throw new NerIncompleteError("invalid_span_boundary", analysis);
    }
  }
}
var cacheBindings = /* @__PURE__ */ new WeakMap();
function splitAtCellDelimiters(text, start, end, category) {
  if (category !== "PERSON" && category !== "ORG" && category !== "ADDRESS") return [[start, end]];
  const trimEdge = (s2, e2) => {
    while (s2 < e2 && /[,;|\t\s]/.test(text[s2])) s2++;
    while (e2 > s2 && /[,;|\t\s]/.test(text[e2 - 1])) e2--;
    return [s2, e2];
  };
  if (category === "ADDRESS") {
    const [s2, e2] = trimEdge(start, end);
    return e2 > s2 ? [[s2, e2]] : [];
  }
  const out = [];
  let from = start;
  for (let i = start; i < end; i++) {
    const ch = text[i];
    const cut = ch === ";" || ch === "|" || ch === "	" || ch === "," && i + 1 < end && !/\s/.test(text[i + 1]);
    if (!cut) continue;
    const [s2, e2] = trimEdge(from, i);
    if (e2 > s2) out.push([s2, e2]);
    from = i + 1;
  }
  const [s, e] = trimEdge(from, end);
  if (e > s) out.push([s, e]);
  return out;
}
async function nerSpans(text, predict, onProgress = null, isLive = null, cache = null) {
  const seen = /* @__PURE__ */ new Map();
  const spans = [];
  let total = 0;
  for (const _ of chunks(text)) total++;
  let done = 0;
  const analysis = {
    inputHash: await analysisTextHash(text),
    inputLength: text.length,
    modelVersion: predict.modelVersion || "injected-predictor",
    policyVersion: ANALYSIS_POLICY_VERSION,
    expectedChunks: total,
    completedChunks: 0,
    errors: [],
    complete: false
  };
  const chunkCache = cache || /* @__PURE__ */ new Map();
  const binding = predict.modelVersion || predict;
  if (cacheBindings.has(chunkCache) && cacheBindings.get(chunkCache) !== binding) chunkCache.clear();
  cacheBindings.set(chunkCache, binding);
  for (const [offset, rawChunk] of chunks(text)) {
    if (isLive && !isLive()) throw new NerAborted();
    if (onProgress) {
      try {
        onProgress(done, total);
      } catch (e) {
      }
    }
    if (!rawChunk.trim()) {
      done++;
      analysis.completedChunks = done;
      continue;
    }
    const chunk = foldDiacritics(rawChunk);
    let entities;
    try {
      if (chunkCache.has(chunk)) {
        entities = chunkCache.get(chunk);
      } else {
        entities = await predict(chunk, LABELS, DETECT_THRESHOLD);
      }
      if (isLive && !isLive()) throw new NerAborted();
      validateEntities(entities, chunk, analysis);
      entities = entities.map((e) => Object.freeze({ label: e.label, start: e.start, end: e.end, score: e.score }));
      chunkCache.set(chunk, Object.freeze(entities));
    } catch (e) {
      chunkCache.clear();
      if (e instanceof NerAborted || e instanceof NerIncompleteError) throw e;
      throw new NerIncompleteError("inference_failed", analysis);
    }
    for (const ent of entities) {
      const category = LABEL_TO_CATEGORY[String(ent.label).toLowerCase()];
      if (!category) continue;
      let start = offset + ent.start;
      let end = offset + ent.end;
      while (start < end && /\s/.test(text[start])) start++;
      while (end > start && /\s/.test(text[end - 1])) end--;
      const para = text.slice(start, end).search(/\r?\n[^\S\r\n]*\r?\n/);
      if (para > 0) {
        end = start + para;
        while (end > start && /\s/.test(text[end - 1])) end--;
      }
      if (end <= start) continue;
      const score = ent.score ?? DETECT_THRESHOLD;
      for (const [ps, pe] of splitAtCellDelimiters(text, start, end, category)) {
        const key = `${ps}:${pe}:${category}`;
        if (seen.has(key)) {
          seen.get(key).score = Math.max(seen.get(key).score, score);
          continue;
        }
        const span = new PiiSpan(ps, pe, category, text.slice(ps, pe), score, "ner");
        seen.set(key, span);
        spans.push(span);
      }
    }
    done++;
    analysis.completedChunks = done;
  }
  if (isLive && !isLive()) throw new NerAborted();
  if (nerOptions.health) {
    try {
      for (const hs of await healthSpans(text, predict, { isLive })) {
        const key = `${hs.start}:${hs.end}:HEALTH`;
        if (!seen.has(key)) {
          seen.set(key, hs);
          spans.push(hs);
        }
      }
    } catch (e) {
      if (e instanceof NerAborted || e instanceof NerIncompleteError) throw e;
      throw new NerIncompleteError("inference_failed", analysis);
    }
    if (isLive && !isLive()) throw new NerAborted();
  }
  Object.defineProperty(spans, "analysis", { value: Object.freeze({ ...analysis, complete: true, errors: Object.freeze([]) }) });
  if (onProgress) {
    try {
      onProgress(total, total);
    } catch (e) {
    }
  }
  return spans;
}
var HEALTH_LABELS = ["medical condition", "diagnosis", "disease", "krankheit", "diagnose"];
var HEALTH_THRESHOLD = 0.5;
var HEALTH_FRAME_RE = /(?:diagnos|befund|erkrank|krankheit|leide[tn]|litt|symptom|therap|behandl|arzt|ärzt|klinik|reha|medikament|anamnes|beschwerden|schmerz|krank|chronisch|psych|patient|condition|diagnosed|treatment|suffers?|illness|disorder|surgery|operation|phobi|störung|stoerung|syndrom|itis\b|krebs|karzinom|tumor|depress|angst|diabet|asthma|sucht|allergi|demenz|infekt|fraktur|schwanger|behinder)/iu;
var GENERIC_HEALTH_WORD_RE = /^(?:vor|grund|haupt|neben)?(?:krankheit|erkrankung|diagnose|medikation|gesundheit|medizin|befund|therapie|behandlung|ursache|prognose|anamnese|pflegegrad|pflegestufe|behinderung|schwerbehinderung|allergie|allergien|impfung|impfungen|sickness|illness|disease|diagnosis|condition)(?:n|en|s)?$/iu;
var HEALTH_STATUS_WORD_RE = new RegExp("(?:berufs|arbeits|erwerbs|dienst|gesch\xE4fts|handlungs|leistungs)unf\xE4higkeit(?:s\\p{L}*)?$|^nichtraucher|^schimmel|^fall\\s+\\d+$", "iu");
var HEALTH_INSTITUTION_RE = /(?:ologie|ologe|ologin|iatrie|zentrum|praxis|station|klinik|ambulanz|abteilung|beratung|schulung|gruppe|verband|stiftung|selbsthilfe|kasse|sprechstunde|ernährung|diät|screening|konferenz|boardsitzung|register|board|protokoll|leitlinie|studie|statistik|vorsorge|besprechung|kolloquium|vergütung|kampagne|aktion|residenz|heim|diagnosen?|diagnostik|gerät|team|rauch|dämmstoffe?)$/iu;
function isHealthFinding(surface) {
  const t = surface.trim();
  if (GENERIC_HEALTH_WORD_RE.test(t) || HEALTH_STATUS_WORD_RE.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length <= 3 && HEALTH_INSTITUTION_RE.test(words[words.length - 1]) || HEALTH_INSTITUTION_RE.test(words[0]) && words.length <= 2) return false;
  return true;
}
var nerOptions = { health: true };
async function healthSpans(text, predict, { threshold = HEALTH_THRESHOLD, isLive = null } = {}) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [offset, rawChunk] of chunks(text)) {
    if (!rawChunk.trim() || !HEALTH_FRAME_RE.test(rawChunk)) continue;
    if (isLive && !isLive()) throw new NerAborted();
    const chunk = foldDiacritics(rawChunk);
    const entities = await predict(chunk, HEALTH_LABELS, threshold);
    for (const ent of entities || []) {
      if (!HEALTH_LABELS.includes(String(ent.label).toLowerCase())) continue;
      let start = offset + ent.start, end = offset + ent.end;
      while (start < end && /\s/.test(text[start])) start++;
      while (end > start && /[\s.,;:]/.test(text[end - 1])) end--;
      const snap = end - start >= 4;
      const L = (c) => c !== void 0 && new RegExp("\\p{L}", "u").test(c);
      for (let k = 0; snap && k < 60; k++) {
        if (start > 0 && L(text[start - 1]) && L(text[start])) start--;
        else if (start > 1 && text[start - 1] === "-" && L(text[start - 2]) && L(text[start])) start -= 2;
        else break;
      }
      for (let k = 0; snap && k < 60; k++) {
        if (end < text.length && L(text[end]) && L(text[end - 1])) end++;
        else if (end < text.length - 1 && text[end] === "-" && L(text[end + 1]) && L(text[end - 1])) end += 2;
        else break;
      }
      const surface = text.slice(start, end);
      if (surface.length < 4 || /\n/.test(surface) || !new RegExp("\\p{L}{3}", "u").test(surface)) continue;
      if (!isHealthFinding(surface)) continue;
      const key = `${start}:${end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(new PiiSpan(start, end, "HEALTH", surface, ent.score, "ner"));
    }
  }
  return out;
}
var _selfCheck = /* @__PURE__ */ new WeakMap();
async function selfCheck(predict) {
  let cached = _selfCheck.get(predict);
  if (!cached) {
    cached = runSelfCheck(predict).then(
      (r) => {
        if (!r.ok) _selfCheck.delete(predict);
        return r;
      },
      (e) => {
        _selfCheck.delete(predict);
        throw e;
      }
    );
    _selfCheck.set(predict, cached);
  }
  return cached;
}
async function runSelfCheck(predict) {
  const sentence = "Am Sitz in Berlin erschien Anna Bauer und legte den Bericht vor. Die Muster Capital AG begibt eine Anleihe.";
  let ents;
  try {
    ents = await predict(sentence, LABELS, DETECT_THRESHOLD);
  } catch (e) {
    return { ok: false, detail: `predict threw: ${e}` };
  }
  const byCat = {};
  for (const e of ents) {
    const cat = LABEL_TO_CATEGORY[String(e.label).toLowerCase()];
    if (!cat) continue;
    const sc = Number(e.score ?? 0);
    if (!(cat in byCat) || sc > byCat[cat]) byCat[cat] = sc;
  }
  const personOk = (byCat.PERSON || 0) >= 0.5;
  return {
    ok: personOk,
    detail: `PERSON=${(byCat.PERSON || 0).toFixed(3)} ORG=${(byCat.ORG || 0).toFixed(3)} ADDRESS=${(byCat.ADDRESS || 0).toFixed(3)}`
  };
}

export {
  nerSpans,
  selfCheck
};
