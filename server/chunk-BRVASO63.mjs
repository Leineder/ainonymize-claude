import{createRequire as __ainCR}from'node:module';import{fileURLToPath as __ainFU}from'node:url';const require=__ainCR(import.meta.url);const __ainFilename=__ainFU(import.meta.url);const __ainDirname=__ainFilename.replace(/[\\/][^\\/]*$/,'');
import {
  selfCheck
} from "./chunk-O7VPOIYQ.mjs";
import {
  MODELS_DIR,
  ensureDir,
  loadConfig
} from "./chunk-OFYKI6FR.mjs";
import {
  MODEL_ID,
  MODEL_MANIFEST,
  MODEL_REVISION
} from "./chunk-QFNUQB57.mjs";

// src/model.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
var MODEL_ROOT = path.join(MODELS_DIR, ...MODEL_ID.split("/"));
var localPath = (artifact) => path.join(MODEL_ROOT, ...artifact.path.split("/"));
var HF_SNAPSHOT = path.join(
  process.env.HF_HOME || path.join(os.homedir(), ".cache", "huggingface"),
  "hub",
  `models--${MODEL_ID.replace("/", "--")}`,
  "snapshots",
  MODEL_REVISION
);
var state = { status: "idle", received: 0, total: 0, error: null, predict: null, loading: null, downloading: null };
var totalBytes = () => MODEL_MANIFEST.artifacts.reduce((n, a) => n + a.bytes, 0);
function sizeMatches(file, bytes) {
  try {
    return fs.statSync(file).size === bytes;
  } catch {
    return false;
  }
}
function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    fs.createReadStream(file).on("data", (d) => h.update(d)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
  });
}
var markerOf = (file) => `${file}.verified`;
function isVerified(file, artifact) {
  try {
    return sizeMatches(file, artifact.bytes) && fs.readFileSync(markerOf(file), "utf8").trim() === artifact.sha256;
  } catch {
    return false;
  }
}
async function adoptOrDownload(artifact, onProgress) {
  const dest = localPath(artifact);
  if (isVerified(dest, artifact)) {
    onProgress(artifact.bytes);
    return;
  }
  ensureDir(path.dirname(dest));
  const hf = path.join(HF_SNAPSHOT, ...artifact.path.split("/"));
  if (sizeMatches(hf, artifact.bytes)) {
    const real = fs.realpathSync(hf);
    if (await sha256File(real) === artifact.sha256) {
      try {
        fs.rmSync(dest, { force: true });
        fs.symlinkSync(real, dest);
      } catch {
        fs.copyFileSync(real, dest);
      }
      fs.writeFileSync(markerOf(dest), artifact.sha256);
      onProgress(artifact.bytes);
      return;
    }
  }
  const part = `${dest}.part`;
  const res = await fetch(artifact.url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`model download failed (${res.status}) for ${artifact.path}`);
  const h = crypto.createHash("sha256");
  const out = fs.createWriteStream(part);
  let got = 0;
  for await (const chunk of res.body) {
    h.update(chunk);
    got += chunk.length;
    onProgress(chunk.length);
    if (!out.write(chunk)) await new Promise((r) => out.once("drain", r));
  }
  await new Promise((r, j) => out.end((e) => e ? j(e) : r()));
  const digest = h.digest("hex");
  if (got !== artifact.bytes || digest !== artifact.sha256) {
    fs.rmSync(part, { force: true });
    throw new Error(`model integrity check failed for ${artifact.path} (got ${got} bytes, sha256 ${digest.slice(0, 12)}\u2026)`);
  }
  fs.renameSync(part, dest);
  fs.writeFileSync(markerOf(dest), artifact.sha256);
}
function modelPresent() {
  return MODEL_MANIFEST.artifacts.every((a) => isVerified(localPath(a), a));
}
function ensureModelFiles(onProgress = () => {
}) {
  if (modelPresent()) return Promise.resolve(true);
  if (state.downloading) return state.downloading;
  state.status = "downloading";
  state.total = totalBytes();
  state.received = 0;
  state.downloading = (async () => {
    for (const artifact of MODEL_MANIFEST.artifacts) {
      await adoptOrDownload(artifact, (n) => {
        state.received += n;
        onProgress(state.received, state.total);
      });
    }
    state.status = "downloaded";
    return true;
  })().catch((e) => {
    state.status = "error";
    state.error = String(e.message || e);
    throw e;
  }).finally(() => {
    state.downloading = null;
  });
  return state.downloading;
}
function ortDistUrl() {
  let main;
  try {
    main = createRequire(import.meta.url).resolve("onnxruntime-web");
  } catch {
    throw new Error("the neural runtime (npm package onnxruntime-web) is not installed \u2014 reinstall or update the plugin");
  }
  let dir = path.dirname(main);
  while (dir !== path.dirname(dir) && path.basename(dir) !== "dist") dir = path.dirname(dir);
  return pathToFileURL(dir + path.sep).href;
}
async function buildPredict() {
  const wasmPaths = ortDistUrl();
  const { Gliner } = await import("./chunk-7KULFSC7.mjs");
  const { env } = await import("./chunk-YTUZR2TQ.mjs");
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = MODELS_DIR + path.sep;
  env.useBrowserCache = false;
  env.useFS = true;
  const weights = MODEL_MANIFEST.artifacts.find((a) => a.role === "weights");
  const buf = fs.readFileSync(localPath(weights));
  const gliner = new Gliner({
    tokenizerPath: MODEL_ID,
    onnxSettings: {
      modelPath: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      executionProvider: "cpu",
      multiThread: false,
      // A file: URL, not a path: ort imports ort-wasm-simd-threaded.mjs from here, and Node's
      // import() rejects bare Windows paths ("C:\\…" is read as a URL scheme).
      wasmPaths
    },
    // gliner's constructor overwrites env.allowLocalModels/useBrowserCache from these settings.
    transformersSettings: { allowLocalModels: true, useBrowserCache: false },
    maxWidth: 12,
    modelType: "span-level"
  });
  await gliner.initialize();
  const predict = async (text, labels, threshold) => {
    const res = await gliner.inference({ texts: [text], entities: labels, threshold, flatNer: false, multiLabel: true });
    return res[0].map((e) => ({ label: e.label, start: e.start, end: e.end, score: e.score }));
  };
  Object.defineProperty(predict, "modelVersion", { value: `gliner-web-node:fp16:${MODEL_REVISION}` });
  const check = await selfCheck(predict);
  if (!check.ok) throw new Error(`model self-check failed: ${check.detail}`);
  return predict;
}
async function getPredict({ download = true, onProgress } = {}) {
  if (!loadConfig().neural) {
    state.status = "disabled";
    return null;
  }
  if (state.predict) return state.predict;
  if (!modelPresent()) {
    if (!download) return null;
    await ensureModelFiles(onProgress);
  }
  if (!state.loading) {
    state.status = "loading";
    const restore = muteStdout();
    state.loading = buildPredict().then((p) => {
      state.predict = p;
      state.status = "ready";
      return p;
    }).catch((e) => {
      state.status = "error";
      state.error = String(e.message || e);
      state.loading = null;
      throw e;
    }).finally(restore);
  }
  return state.loading;
}
function muteStdout() {
  const orig = process.stdout.write;
  process.stdout.write = function(chunk, enc, cb) {
    const s = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    if (s.startsWith("{") && s.includes('"jsonrpc"')) return orig.call(process.stdout, chunk, enc, cb);
    return process.stderr.write(chunk, enc, cb);
  };
  return () => {
    process.stdout.write = orig;
  };
}
function modelStatus() {
  const present = modelPresent();
  return {
    neural: loadConfig().neural,
    status: state.predict ? "ready" : present ? state.status === "loading" ? "loading" : "downloaded" : state.status,
    downloadedMB: Math.round(state.received / 1e6),
    totalMB: Math.round((state.total || totalBytes()) / 1e6),
    error: state.error,
    model: `${MODEL_ID}@${MODEL_REVISION.slice(0, 10)} (fp16)`
  };
}

export {
  modelPresent,
  ensureModelFiles,
  getPredict,
  modelStatus
};
