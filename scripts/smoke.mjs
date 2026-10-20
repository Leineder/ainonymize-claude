// Smoke test of the published plugin on the current OS (rule-based layer, no model download):
// MCP handshake, anonymize -> restore round trip of a synthetic CSV, prompt and read guards.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const cli = path.resolve("plugins/ainonymize/server/cli.mjs");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "ain-smoke-"));
const env = { ...process.env, AINONYMIZE_HOME: path.join(work, "home"), AINONYMIZE_NEURAL: "0" };
const csv = path.join(work, "customers.csv");
const original = "Name,Geburtsdatum,IBAN,E-Mail\nKlaus Wagenknecht,14.03.1982,DE89 3704 0044 0532 0130 00,klaus.wagenknecht@heartmail-gmbh.de\n";
fs.writeFileSync(csv, original);

const child = spawn(process.execPath, [cli, "mcp"], { env, cwd: work });
let buf = ""; const waiting = new Map(); let id = 0;
child.stdout.setEncoding("utf8");
child.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); waiting.get(m.id)?.(m); } });
const req = (method, params) => new Promise((r) => { const n = ++id; waiting.set(n, r); child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: n, method, params }) + "\n"); });
const text = (r) => r.result.content[0].text;

const init = await req("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1" } });
assert.equal(init.result.serverInfo.name, "ainonymize");
assert.equal((await req("tools/list", {})).result.tools.length, 6);
const a = await req("tools/call", { name: "anonymize_file", arguments: { path: csv } });
const at = text(a);
assert.ok(!a.result.isError, at);
for (const v of ["14.03.1982", "DE89 3704 0044 0532 0130 00", "klaus.wagenknecht@heartmail-gmbh.de"]) assert.ok(!at.includes(v), `leaked ${v}`);
const anon = /written to: (.+?)(?: \(original format kept\))?$/m.exec(at)[1];
const r = await req("tools/call", { name: "restore_file", arguments: { path: anon } });
const restored = /saved for the user: (.+?)$/m.exec(text(r))[1];
assert.equal(fs.readFileSync(restored, "utf8"), original);
child.kill();

const hook = (k, input) => execFileSync(process.execPath, [cli, "hook", k], { env, input: JSON.stringify(input) }).toString();
assert.equal(JSON.parse(hook("prompt", { prompt: "Mahnung an Herrn Klaus Wagenknecht, IBAN DE89 3704 0044 0532 0130 00" })).decision, "block");
assert.equal(hook("prompt", { prompt: "Refactor the parser and answer in German." }), "");
assert.equal(JSON.parse(hook("read", { tool_input: { file_path: csv }, cwd: work })).hookSpecificOutput.permissionDecision, "deny");
console.log(`smoke ok on ${process.platform} / node ${process.version}`);
