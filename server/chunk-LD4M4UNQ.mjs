import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  anonymizeText,
  decodeText,
  kindOfPath,
  labelOf
} from "./chunk-ZFTLRIAV.mjs";
import "./chunk-O7VPOIYQ.mjs";
import "./chunk-MKH7TYF6.mjs";
import "./chunk-6QGQWR7O.mjs";
import {
  HOME,
  defaultScope,
  loadConfig
} from "./chunk-OFYKI6FR.mjs";
import "./chunk-D6LIFNUY.mjs";
import {
  detect
} from "./chunk-ZBWYCETV.mjs";
import "./chunk-XGOKF7XS.mjs";
import "./chunk-ENPGGBFS.mjs";
import "./chunk-QFNUQB57.mjs";
import "./chunk-OGQYD6DW.mjs";

// src/hooks.mjs
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// src/guard-policy.mjs
var COUNTED = /* @__PURE__ */ new Set([
  "PERSON",
  "EMAIL",
  "PHONE",
  "IBAN",
  "CREDIT_CARD",
  "TAX_ID",
  "SV_ID",
  "ID_CARD",
  "HEALTH_INSURANCE",
  "DOB",
  "ADDRESS",
  "ACCOUNT",
  "HEALTH",
  "RELIGION",
  "CRIMINAL",
  "AFFILIATION"
]);
var STRONG = /* @__PURE__ */ new Set([
  "IBAN",
  "CREDIT_CARD",
  "TAX_ID",
  "SV_ID",
  "ID_CARD",
  "HEALTH_INSURANCE",
  "DOB",
  "HEALTH",
  "RELIGION",
  "CRIMINAL",
  "AFFILIATION",
  "ACCOUNT"
]);
var PLACEHOLDER_MAIL = /@(?:[a-z0-9-]+\.)*(?:example\.(?:com|org|net|de)|test|invalid|localhost|local|domain\.(?:com|tld)|email\.com|mail\.com|foo\.bar|acme\.(?:com|corp))$/i;
var NAME_WORD = new RegExp("\\p{Lu}[\\p{Ll}'\u2019-]+", "gu");
var HONORIFIC_BEFORE = /(?:\b(?:Herrn?|Frau|Fr\.|Hr\.|Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+)$/u;
function guardCounts(span, text = "") {
  if (!span.accepted || !COUNTED.has(span.category)) return false;
  if (span.category === "PERSON") {
    if ((String(span.text).match(NAME_WORD) || []).length >= 2) return true;
    return !!text && HONORIFIC_BEFORE.test(text.slice(Math.max(0, span.start - 12), span.start));
  }
  if (span.category === "EMAIL") return !PLACEHOLDER_MAIL.test(String(span.text).trim());
  return true;
}
var guardStrong = (span) => STRONG.has(span.category);

// src/hooks.mjs
var DOCUMENT_EXT = /\.(docx|docm|xlsx|xlsm|pptx|pptm|pdf|doc|xls|ppt|odt|ods|odp|rtf|msg|eml|pages|numbers|key|epub)$/i;
var DATA_EXT = /\.(csv|tsv|psv|txt|text|md|markdown|json|jsonl|ndjson|xml|html?|log|vcf|vcard|ics|ya?ml|mbox)$/i;
var SKIP_DIRS = /[\\/](node_modules|\.git|\.venv|venv|dist|build|\.next|\.cache|vendor)[\\/]/;
var CHECK_BYTES = 4e5;
var BYPASS = /(^|\s)#raw(\s|$)/i;
var readStdin = () => {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
};
var out = (obj) => {
  process.stdout.write(JSON.stringify(obj));
};
var label = labelOf;
function summarize(spans) {
  const counts = /* @__PURE__ */ new Map();
  for (const s of spans) counts.set(label(s.category), (counts.get(label(s.category)) || 0) + 1);
  return [...counts].map(([k, v]) => `${k}: ${v}`).join(", ");
}
var relevant = (spans, text) => spans.filter((s) => guardCounts(s, text));
function copyToClipboard(text) {
  const tries = process.platform === "darwin" ? [["pbcopy", []]] : process.platform === "win32" ? [["powershell", ["-NoProfile", "-Command", "$input | Set-Clipboard"]]] : [["wl-copy", []], ["xclip", ["-selection", "clipboard"]], ["xsel", ["--clipboard", "--input"]]];
  for (const [cmd, args] of tries) {
    try {
      const r = spawnSync(cmd, args, { input: text, timeout: 3e3 });
      if (r.status === 0) return true;
    } catch {
    }
  }
  return false;
}
function promptHook() {
  const input = readStdin();
  const cfg = loadConfig();
  const prompt = String(input.prompt || "");
  if (cfg.promptGuard === "off" || !prompt.trim() || BYPASS.test(prompt)) return;
  const scope = defaultScope(input.cwd || process.cwd());
  let r;
  try {
    r = anonymizeText(prompt, { scope, keep: guardCounts });
  } catch {
    return;
  }
  const hits = relevant(r.spans, prompt);
  if (!hits.length) return;
  const what = summarize(hits);
  if (cfg.promptGuard === "warn" || r.leaked) {
    out({ systemMessage: `Ainonymize: this prompt contains personal data (${what}) and was sent unchanged (promptGuard=${cfg.promptGuard}).` });
    return;
  }
  const copied = copyToClipboard(r.sanitized);
  const reason = [
    `\u{1F512} Ainonymize stopped this prompt before it reached Claude: it contains personal data (${what}).`,
    copied ? "A pseudonymized version is on your clipboard \u2014 paste it and send. Real values are restored locally whenever you use restore_file / restore_text." : "Send this pseudonymized version instead (real values stay on your computer):",
    "",
    r.sanitized,
    "",
    "To send the original anyway, add #raw to your message."
  ].join("\n");
  out({ decision: "block", reason });
}
function deny(reason) {
  out({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });
}
function allowListed(file, cfg) {
  const list = Array.isArray(cfg.allowPaths) ? cfg.allowPaths : [];
  return list.some((p) => {
    const abs = path.resolve(String(p));
    return file === abs || file.startsWith(abs.endsWith(path.sep) ? abs : abs + path.sep);
  });
}
function readHook() {
  const input = readStdin();
  const cfg = loadConfig();
  if (cfg.readGuard === "off") return;
  const ti = input.tool_input || {};
  const raw = ti.file_path || ti.path || "";
  if (!raw) return;
  const file = path.resolve(input.cwd || process.cwd(), String(raw));
  const base = path.basename(file);
  if (/\.restored(-\d+)?\.[^.]+$/i.test(base)) {
    deny("This file was restored by Ainonymize and contains real personal data for the user. Do not read it; tell the user where it is instead.");
    return;
  }
  if (/\.anonymized(-\d+)?\.[^.]+$/i.test(base)) return;
  if (file.startsWith(HOME + path.sep) || SKIP_DIRS.test(file) || allowListed(file, cfg)) return;
  if (!fs.existsSync(file)) return;
  if (DOCUMENT_EXT.test(base)) {
    const supported = !!kindOfPath(file);
    deny(supported ? `Ainonymize: '${base}' is a document that may contain personal data. Do not read it directly \u2014 call the Ainonymize tool anonymize_file with path "${file}". It returns the content with realistic pseudonyms, keeps the original format, and lets you restore real names into your final output with restore_file.` : `Ainonymize: '${base}' may contain personal data and its format cannot be anonymized locally yet. Ask the user to save it as .docx, .xlsx, .pptx or .pdf and then use anonymize_file. (If the user explicitly wants you to read the original, they can add the path to "allowPaths" in ${path.join(HOME, "config.json")}.)`);
    return;
  }
  if (!DATA_EXT.test(base)) return;
  let text;
  try {
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(Math.min(CHECK_BYTES, fs.fstatSync(fd).size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    text = decodeText(new Uint8Array(buf)).text;
  } catch {
    return;
  }
  let spans;
  try {
    spans = relevant(detect(text, [], {}), text);
  } catch {
    return;
  }
  const strong = spans.filter(guardStrong);
  const distinct = new Set(spans.map((s) => `${s.category}\0${s.text}`));
  if (strong.length || distinct.size >= 3) {
    deny(`Ainonymize: '${base}' contains personal data (${summarize(spans)}). Do not read it directly \u2014 call the Ainonymize tool anonymize_file with path "${file}" and work with the pseudonymized copy. (If the user explicitly wants you to read the original, they can add the path to "allowPaths" in ${path.join(HOME, "config.json")}.)`);
  }
}
function sessionHook() {
  const cfg = loadConfig();
  const ctx = [
    "Ainonymize (local privacy layer) is active.",
    "- For documents that may contain personal or client data (Word, Excel, PowerPoint, PDF, CSV, e-mails), call the Ainonymize anonymize_file tool instead of reading them; work only with the pseudonyms it returns.",
    "- Final deliverables: write them with the pseudonyms to a file, then call restore_file (or restore_text) so the user gets the real names locally. Never read *.restored.* files.",
    `- Guards: prompt=${cfg.promptGuard}, file-read=${cfg.readGuard}.`
  ].join("\n");
  out({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: ctx } });
}
export {
  promptHook,
  readHook,
  sessionHook
};
