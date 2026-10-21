import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');

// src/paths.mjs
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
var HOME = process.env.AINONYMIZE_HOME || path.join(os.homedir(), ".ainonymize");
var MODELS_DIR = path.join(HOME, "models");
var VAULT_DIR = path.join(HOME, "vault");
var CONFIG_FILE = path.join(HOME, "config.json");
var SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 448 });
  return dir;
}
var DEFAULT_CONFIG = Object.freeze({
  // "block": a prompt carrying personal data is stopped and a pseudonymized copy offered.
  // "warn": it goes through, with a visible warning. "off": no prompt check.
  promptGuard: "block",
  // "block": Claude cannot Read documents (Word/Excel/PowerPoint/PDF/mail) or data files that carry
  // personal data directly, and is told to use anonymize_file instead. "off": no file check.
  readGuard: "block",
  // false = never download or use the neural name/address model (deterministic layer only).
  neural: true
});
function loadConfig() {
  let user = {};
  try {
    user = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    user = {};
  }
  const env = {};
  if (process.env.AINONYMIZE_PROMPT_GUARD) env.promptGuard = process.env.AINONYMIZE_PROMPT_GUARD;
  if (process.env.AINONYMIZE_READ_GUARD) env.readGuard = process.env.AINONYMIZE_READ_GUARD;
  if (process.env.AINONYMIZE_NEURAL) env.neural = !/^(0|false|off|no)$/i.test(process.env.AINONYMIZE_NEURAL);
  return { ...DEFAULT_CONFIG, ...user, ...env };
}
function defaultScope(cwd = process.cwd()) {
  const resolved = path.resolve(cwd || "/");
  if (resolved === path.parse(resolved).root || resolved === path.resolve(os.homedir())) return "default";
  const slug = path.basename(resolved).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 40) || "project";
  const hash = crypto.createHash("sha256").update(resolved).digest("hex").slice(0, 8);
  return `${slug}-${hash}`;
}
function cleanScope(scope) {
  const s = String(scope || "").trim();
  if (!s) return defaultScope();
  return s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[.-]+/, "").slice(0, 64) || "default";
}

export {
  HOME,
  MODELS_DIR,
  VAULT_DIR,
  CONFIG_FILE,
  SERVER_DIR,
  ensureDir,
  loadConfig,
  defaultScope,
  cleanScope
};
