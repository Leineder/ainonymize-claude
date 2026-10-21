import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  SUPPORTED_HINT,
  UserFacingError,
  anonymizeFile,
  restoreFile,
  restoreTextToFile
} from "./chunk-ZFTLRIAV.mjs";
import {
  ensureModelFiles,
  getPredict,
  modelPresent,
  modelStatus
} from "./chunk-BRVASO63.mjs";
import "./chunk-O7VPOIYQ.mjs";
import {
  VERSION
} from "./chunk-JFKKRG3R.mjs";
import "./chunk-MKH7TYF6.mjs";
import {
  forgetScope,
  vaultSummary
} from "./chunk-6QGQWR7O.mjs";
import {
  HOME,
  defaultScope,
  loadConfig
} from "./chunk-OFYKI6FR.mjs";
import "./chunk-D6LIFNUY.mjs";
import "./chunk-ZBWYCETV.mjs";
import "./chunk-XGOKF7XS.mjs";
import "./chunk-ENPGGBFS.mjs";
import "./chunk-QFNUQB57.mjs";
import "./chunk-OGQYD6DW.mjs";

// src/mcp.mjs
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
var PROTOCOL = "2025-06-18";
var INLINE_CHARS = 6e4;
var scopeProp = {
  type: "string",
  description: "Optional mapping scope (a case or project name). Documents in one scope share pseudonyms and can be restored together. Defaults to the current project folder."
};
var TOOLS = [
  {
    name: "anonymize_file",
    title: "Anonymize a local document",
    description: `Read a local document WITHOUT exposing personal data: names, addresses, e-mails, phone numbers, IBANs, IDs, dates of birth, health data etc. are replaced by consistent realistic pseudonyms on this computer before anything reaches Claude. Use this instead of reading Word/Excel/PowerPoint/PDF/CSV/mail files directly whenever they may contain personal or client data. Supported: ${SUPPORTED_HINT}. Writes '<name>.anonymized.<ext>' next to the original (same format, 1:1 layout) and returns the pseudonymized text. Work only with the pseudonyms; when the user needs a final document with the real names, write it to a file and call restore_file.`,
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute path of the local file to anonymize." },
        scope: scopeProp,
        out_dir: { type: "string", description: "Optional directory for the anonymized copy (default: next to the original)." }
      },
      required: ["path"]
    },
    annotations: { title: "Anonymize a local document", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  },
  {
    name: "restore_file",
    title: "Restore real names into a document",
    description: "Put the real values back into a document that contains Ainonymize pseudonyms (for example a contract, letter or spreadsheet Claude drafted from an anonymized source). Runs locally and writes '<name>.restored.<ext>' for the user. The restored content is NOT returned to you \u2014 only the file path and counts \u2014 so personal data never enters the conversation. Never read the restored file.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute path of the file with pseudonyms." },
        scope: scopeProp,
        out_path: { type: "string", description: "Optional output path (default: '<name>.restored.<ext>' next to the input)." },
        open: { type: "boolean", description: "Open the restored file in the user's default app afterwards (default false)." }
      },
      required: ["path"]
    },
    annotations: { title: "Restore real names into a document", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  },
  {
    name: "restore_text",
    title: "Save a de-pseudonymized copy of text",
    description: "Take text you wrote with Ainonymize pseudonyms (an e-mail, letter, summary, \u2026), put the real values back locally and save it as a file for the user. Only the path is returned; the restored text never comes back to you. Use this when the user wants the final answer with the real names.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text containing pseudonyms." },
        file_name: { type: "string", description: "File name to save as, e.g. 'reply-to-client.md' (default 'ainonymize-restored.md')." },
        out_path: { type: "string", description: "Optional absolute output path (overrides file_name)." },
        scope: scopeProp,
        open: { type: "boolean", description: "Open the file in the user's default app afterwards (default false)." }
      },
      required: ["text"]
    },
    annotations: { title: "Save a de-pseudonymized copy of text", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  },
  {
    name: "ainonymize_status",
    title: "Ainonymize status",
    description: "Show whether the local neural detection model is ready, the current mapping scope, and how many documents/values each scope holds (counts only, never values).",
    inputSchema: { type: "object", properties: {} },
    annotations: { title: "Ainonymize status", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "setup_model",
    title: "Download the local detection model",
    description: "Download (one time, ~600 MB from Hugging Face, SHA-256 verified) and load the local neural model that finds names, addresses and organisations. Afterwards everything runs offline. Call when the user asks to set up Ainonymize or when anonymize_file reported the model is still downloading.",
    inputSchema: { type: "object", properties: {} },
    annotations: { title: "Download the local detection model", readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  },
  {
    name: "forget_scope",
    title: "Delete stored mappings",
    description: "Permanently delete the stored original<->pseudonym mappings of one scope on this computer. Afterwards files of that scope can no longer be restored. Only call this when the user explicitly asks.",
    inputSchema: { type: "object", properties: { scope: { type: "string", description: "Scope to delete." } }, required: ["scope"] },
    annotations: { title: "Delete stored mappings", readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }
];
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}
var text = (s) => ({ content: [{ type: "text", text: s }] });
var fail = (s) => ({ content: [{ type: "text", text: s }], isError: true });
function openFile(file) {
  try {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", file] : [file];
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
    return true;
  } catch {
    return false;
  }
}
function progressSender(token) {
  if (token === void 0 || token === null) return () => {
  };
  let last = 0;
  return (progress, total, message) => {
    const now = Date.now();
    if (now - last < 1e3 && progress !== total) return;
    last = now;
    send({ jsonrpc: "2.0", method: "notifications/progress", params: { progressToken: token, progress, total, message } });
  };
}
var CALL_BUDGET_MS = Number(process.env.AINONYMIZE_CALL_BUDGET_MS || 5e4);
var jobs = /* @__PURE__ */ new Map();
function jobKey(args) {
  const p = path.resolve(String(args.path || ""));
  let mtime = 0;
  try {
    mtime = fs.statSync(p).mtimeMs;
  } catch {
  }
  return JSON.stringify([p, mtime, args.scope || "", args.out_dir || ""]);
}
function startJob(args) {
  const job = { phase: "starting", done: 0, total: 0, listeners: /* @__PURE__ */ new Set(), result: null, error: null, why: "" };
  const report = (phase, done, total) => {
    job.phase = phase;
    job.done = done;
    job.total = total;
    for (const l of job.listeners) l(done, total, phase);
  };
  job.promise = (async () => {
    let predict = null;
    if (!loadConfig().neural) job.why = "the neural layer is disabled in ~/.ainonymize/config.json";
    else {
      try {
        predict = await getPredict({ download: true, onProgress: (got, total) => report(`Downloading the local detection model (one time, ${Math.round(total / 1e6)} MB): ${Math.round(got / 1e6)} MB`, got, total) });
      } catch (e) {
        job.why = `the neural model is unavailable (${e.message || e})`;
      }
    }
    report("Detecting personal data locally", 0, 1);
    return anonymizeFile(args.path, {
      scope: args.scope,
      outDir: args.out_dir,
      predict,
      onProgress: (done, total) => report(`Detecting personal data locally (${done}/${total} sections)`, done, total)
    }).then((r) => ({ ...r, why: job.why }));
  })().then((r) => {
    job.result = r;
    return r;
  }, (e) => {
    job.error = e;
    throw e;
  });
  job.promise.catch(() => {
  });
  return job;
}
async function anonymizeWithBudget(args, progress) {
  const key = jobKey(args);
  let job = jobs.get(key);
  if (!job) {
    job = startJob(args);
    jobs.set(key, job);
  }
  job.listeners.add(progress);
  try {
    const timer = new Promise((r) => setTimeout(() => r("pending"), CALL_BUDGET_MS));
    const outcome = await Promise.race([job.promise.then(() => "done", () => "done"), timer]);
    if (outcome === "pending") return { pending: true, phase: job.phase };
    jobs.delete(key);
    if (job.error) throw job.error;
    return job.result;
  } finally {
    job.listeners.delete(progress);
  }
}
function summaryLines(r) {
  const cats = Object.entries(r.categories).map(([k, v]) => `${k}: ${v}`).join(", ") || "none";
  return [`Replaced ${r.replaced} personal value(s) \u2014 ${cats}.`, `Mapping scope: ${r.scope}.`];
}
async function callTool(name, args, meta) {
  const progress = progressSender(meta && meta.progressToken);
  if (name === "anonymize_file") {
    const r = await anonymizeWithBudget(args, progress);
    if (r.pending) {
      return text(`Still working locally on this document \u2014 ${r.phase}. Nothing has been sent anywhere. Call anonymize_file again with the same arguments in about 30 seconds to get the result (tell the user briefly that the local anonymization is in progress).`);
    }
    const lines = [
      `Anonymized copy written to: ${r.anonymizedFile}${r.formatKept ? " (original format kept)" : ""}`,
      ...summaryLines(r)
    ];
    if (r.note) lines.push(r.note);
    if (!r.neural) lines.push(`WARNING: names and addresses were detected with the rule-based layer only, because ${r.why}. Some names may have been missed; tell the user and suggest running the tool again later (ainonymize_status shows the download).`);
    lines.push("The text below contains pseudonyms (realistic substitute names, addresses, numbers). Treat them as the real people/values while working; do not mention that they are pseudonyms unless asked. For a final deliverable with real names, write it to a file and call restore_file (or restore_text).");
    let body = r.text;
    if (body.length > INLINE_CHARS) {
      body = body.slice(0, INLINE_CHARS);
      lines.push(`The text is long; only the first ${INLINE_CHARS} characters are shown. Read the rest from the anonymized file (it is safe to read).`);
    }
    return text(`${lines.join("\n")}

----- pseudonymized content -----
${body}`);
  }
  if (name === "restore_file") {
    const r = await restoreFile(args.path, { scope: args.scope, outPath: args.out_path });
    const opened = args.open ? openFile(r.restoredFile) : false;
    const c = r.completeness;
    return text([
      `Restored file saved for the user: ${r.restoredFile}${opened ? " (opened)" : ""}`,
      c ? `Real values put back: ${c.restoredValues}. Pseudonyms still standing: ${c.pseudonymsLeftStanding}${c.ambiguous ? " (some were ambiguous and were left as written on purpose)" : ""}.` : "",
      r.note,
      "The restored file contains real personal data. Do not read or open it yourself; tell the user where it is."
    ].filter(Boolean).join("\n"));
  }
  if (name === "restore_text") {
    const r = await restoreTextToFile(args.text, { scope: args.scope, outPath: args.out_path, fileName: args.file_name });
    const opened = args.open ? openFile(r.restoredFile) : false;
    return text([
      `Restored text saved for the user: ${r.restoredFile}${opened ? " (opened)" : ""}`,
      `Pseudonyms replaced by real values: ${r.completeness.replacements}; still standing: ${r.completeness.pseudonymsLeftStanding}.`,
      "Do not read that file; it contains real personal data."
    ].join("\n"));
  }
  if (name === "ainonymize_status") {
    const m = modelStatus();
    const scopes = vaultSummary();
    const cfg = loadConfig();
    return text([
      `Ainonymize ${VERSION} \u2014 everything runs locally; data folder: ${HOME}`,
      `Neural model: ${m.neural ? m.status : "disabled"}${m.status === "downloading" ? ` (${m.downloadedMB}/${m.totalMB} MB)` : ""}${m.error ? ` \u2014 last error: ${m.error}` : ""} [${m.model}]`,
      `Guards: prompt=${cfg.promptGuard}, file-read=${cfg.readGuard} (Claude Code / Cowork hooks)`,
      `Current scope: ${defaultScope()}`,
      scopes.length ? "Stored scopes:\n" + scopes.map((s) => `  - ${s.scope}: ${s.documents} document(s)/prompt(s), ${s.values} mapped value(s), last ${s.last || "-"}`).join("\n") : "No mappings stored yet."
    ].join("\n"));
  }
  if (name === "setup_model") {
    if (!loadConfig().neural) return text('The neural layer is disabled in ~/.ainonymize/config.json ("neural": false). Enable it to download the model.');
    await getPredict({ download: true, onProgress: (got, total) => progress(got, total, `Downloading: ${Math.round(got / 1e6)} / ${Math.round(total / 1e6)} MB`) });
    const m = modelStatus();
    return text(`Local detection model ready (${m.model}, SHA-256 verified). Ainonymize now runs fully offline.`);
  }
  if (name === "forget_scope") {
    const n = forgetScope(args.scope);
    return text(n ? `Deleted ${n} mapping record(s) of scope "${args.scope}".` : `Nothing stored for scope "${args.scope}".`);
  }
  return fail(`Unknown tool: ${name}`);
}
function runServer() {
  if (loadConfig().neural && !modelPresent()) ensureModelFiles().catch(() => {
  });
  else if (loadConfig().neural) getPredict({ download: false }).catch(() => {
  });
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) handle(line);
    }
  });
  process.stdin.on("end", () => process.exit(0));
}
async function handle(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  const { id, method, params } = msg;
  if (id === void 0 || id === null) return;
  try {
    if (method === "initialize") {
      send({ jsonrpc: "2.0", id, result: {
        protocolVersion: params && params.protocolVersion ? params.protocolVersion : PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "ainonymize", title: "Ainonymize", version: VERSION },
        instructions: "Ainonymize keeps personal data on the user's computer. For any local document that may contain personal or client data, call anonymize_file and work with the pseudonymized result. Produce final deliverables with pseudonyms in a file, then call restore_file/restore_text so the user gets the real names locally. Never ask for, read or repeat restored files."
      } });
    } else if (method === "ping") send({ jsonrpc: "2.0", id, result: {} });
    else if (method === "tools/list") send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    else if (method === "tools/call") {
      let result;
      try {
        result = await callTool(params.name, params.arguments || {}, params._meta);
      } catch (e) {
        result = fail(e instanceof UserFacingError ? e.message : `Ainonymize error: ${e && e.message ? e.message : e}`);
        if (!(e instanceof UserFacingError)) process.stderr.write(`[ainonymize] ${e && e.stack ? e.stack : e}${os.EOL}`);
      }
      send({ jsonrpc: "2.0", id, result });
    } else if (method === "resources/list") send({ jsonrpc: "2.0", id, result: { resources: [] } });
    else if (method === "prompts/list") send({ jsonrpc: "2.0", id, result: { prompts: [] } });
    else send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (e) {
    send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(e && e.message ? e.message : e) } });
  }
}
export {
  runServer
};
