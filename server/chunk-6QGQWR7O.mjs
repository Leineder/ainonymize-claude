import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  VAULT_DIR,
  cleanScope,
  ensureDir
} from "./chunk-OFYKI6FR.mjs";

// src/vault.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
var scopeDir = (scope) => path.join(VAULT_DIR, cleanScope(scope));
function newRecordId() {
  return `ain-${crypto.randomUUID()}`;
}
function saveRecord(scope, record) {
  const dir = ensureDir(scopeDir(scope));
  const file = path.join(dir, `${record.id}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ ...record, scope: cleanScope(scope) }), { mode: 384 });
  fs.renameSync(tmp, file);
  return file;
}
function loadRecords(scope) {
  const dir = scopeDir(scope);
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    try {
      const r = JSON.parse(fs.readFileSync(path.join(dir, n), "utf8"));
      if (r && Array.isArray(r.entries)) out.push(r);
    } catch {
    }
  }
  out.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  return out;
}
function restoreMaps(scope, fileName = "") {
  const records = loadRecords(scope);
  const own = fileName ? records.filter((r) => r.output && r.output === fileName).slice(-1) : [];
  const maps = {};
  for (const r of own.length ? own : records) maps[r.id] = { entries: r.entries, convId: cleanScope(scope) };
  return maps;
}
function priorSurrogates(scope) {
  const prior = /* @__PURE__ */ new Map();
  for (const r of loadRecords(scope)) {
    for (const e of r.entries) {
      if (e && e.surrogate && !e.identityAmbiguous) prior.set(`${e.category}\0${e.value}`, e.surrogate);
    }
  }
  return prior.size ? prior : null;
}
function vaultSummary() {
  let scopes = [];
  try {
    scopes = fs.readdirSync(VAULT_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    scopes = [];
  }
  return scopes.map((s) => {
    const records = loadRecords(s);
    return {
      scope: s,
      documents: records.length,
      values: records.reduce((n, r) => n + r.entries.length, 0),
      last: records.length ? records[records.length - 1].createdAt : null
    };
  });
}
function forgetScope(scope) {
  const dir = scopeDir(scope);
  let n = 0;
  try {
    for (const f of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, f), { force: true });
      n++;
    }
    fs.rmdirSync(dir);
  } catch {
  }
  return n;
}

export {
  newRecordId,
  saveRecord,
  loadRecords,
  restoreMaps,
  priorSurrogates,
  vaultSummary,
  forgetScope
};
