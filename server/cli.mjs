#!/usr/bin/env node
import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  VERSION
} from "./chunk-JFKKRG3R.mjs";
import "./chunk-OGQYD6DW.mjs";

// src/cli.mjs
import fs from "node:fs";
import path from "node:path";
var [cmd, ...rest] = process.argv.slice(2);
var flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : void 0;
};
var positional = rest.filter((a, i) => !a.startsWith("--") && !(i > 0 && rest[i - 1].startsWith("--")));
async function main() {
  if (cmd === "mcp") {
    (await import("./chunk-M7B32DVC.mjs")).runServer();
    return;
  }
  if (cmd === "hook") {
    const h = await import("./chunk-LD4M4UNQ.mjs");
    try {
      if (positional[0] === "prompt") h.promptHook();
      else if (positional[0] === "read") h.readHook();
      else if (positional[0] === "session") h.sessionHook();
    } catch (e) {
      process.stderr.write(`[ainonymize hook] ${e && e.message ? e.message : e}
`);
    }
    return;
  }
  if (cmd === "setup") {
    const { ensureModelFiles, getPredict } = await import("./chunk-JCRSWUV6.mjs");
    let lastPct = -1;
    await ensureModelFiles((got, total) => {
      const pct = Math.floor(got / total * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        process.stderr.write(`\rDownloading model: ${pct}% (${Math.round(got / 1e6)}/${Math.round(total / 1e6)} MB)`);
      }
    });
    process.stderr.write("\nVerifying and loading the model\u2026\n");
    await getPredict({ download: false });
    console.log("Ainonymize model ready (verified SHA-256, runs fully offline from now on).");
    return;
  }
  if (cmd === "anonymize") {
    const { anonymizeFile } = await import("./chunk-GFTYIYCA.mjs");
    const { getPredict } = await import("./chunk-JCRSWUV6.mjs");
    let predict = null;
    if (!rest.includes("--no-neural")) {
      try {
        predict = await getPredict({ download: true });
      } catch (e) {
        process.stderr.write(`ainonymize: rule-based layer only (${e.message || e})
`);
      }
    }
    const r = await anonymizeFile(positional[0], { scope: flag("scope"), predict });
    console.log(JSON.stringify({ ...r, text: void 0 }, null, 2));
    return;
  }
  if (cmd === "restore") {
    const { restoreFile } = await import("./chunk-GFTYIYCA.mjs");
    const r = await restoreFile(positional[0], { scope: flag("scope"), outPath: flag("out") });
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  if (cmd === "status") {
    const { modelStatus } = await import("./chunk-JCRSWUV6.mjs");
    const { vaultSummary } = await import("./chunk-YBWTTUVD.mjs");
    const { loadConfig, defaultScope } = await import("./chunk-KM45TPTO.mjs");
    console.log(JSON.stringify({ version: VERSION, model: modelStatus(), config: loadConfig(), currentScope: defaultScope(), scopes: vaultSummary() }, null, 2));
    return;
  }
  if (cmd === "allow") {
    const { CONFIG_FILE, ensureDir, HOME } = await import("./chunk-KM45TPTO.mjs");
    ensureDir(HOME);
    let cfg = {};
    try {
      cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    } catch {
      cfg = {};
    }
    const p = path.resolve(positional[0] || ".");
    cfg.allowPaths = [.../* @__PURE__ */ new Set([...cfg.allowPaths || [], p])];
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
    console.log(`Claude may now read ${p} directly (without anonymization).`);
    return;
  }
  if (cmd === "extract") {
    const { extract, kindOfPath } = await import("./chunk-GFTYIYCA.mjs");
    const f = path.resolve(positional[0]);
    process.stdout.write((await extract(new Uint8Array(fs.readFileSync(f)), kindOfPath(f), f)).flat);
    return;
  }
  if (cmd === "--version" || cmd === "version") {
    console.log(VERSION);
    return;
  }
  console.log(`Ainonymize ${VERSION}
Usage: ainonymize <mcp|hook prompt|hook read|hook session|setup|anonymize FILE|restore FILE|status|allow PATH>`);
}
main().catch((e) => {
  process.stderr.write(`ainonymize: ${e && e.message ? e.message : e}
`);
  process.exit(1);
});
