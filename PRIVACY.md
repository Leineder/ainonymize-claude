# Privacy policy — Ainonymize for Claude

_Last updated: 2026-10-20_

**Short version: Ainonymize does not collect, transmit or store any data on any server. Everything
happens on your computer.**

## What runs where

- Detection, pseudonymization and restoration run locally in a Node.js process started by your
  Claude client (Claude Code, Cowork, Claude Desktop or another MCP client).
- The mapping between original values and pseudonyms is stored only on your computer, in
  `~/.ainonymize/vault/`, in files readable only by your user account. You can delete a project's
  mappings with the `forget_scope` tool, or all of them by deleting `~/.ainonymize`.
- Anonymized copies (`*.anonymized.*`) and restored files (`*.restored.*`) are written next to your
  documents (or where you choose).

## What reaches Claude / Anthropic

Only what the tools return to Claude: the **pseudonymized** text of a document, file paths, and
counts (for example "12 values replaced"). Original values and restored content are never part of
a tool result. What Claude then does with the pseudonymized text is governed by your agreement with
Anthropic.

Automatic detection can miss a value. A missed value is part of the pseudonymized text and therefore
reaches Claude. Check important documents (see "Honest limits" in the README).

## Network access

Ainonymize makes exactly one kind of network request: the one-time download of the detection model
from `huggingface.co` (model `onnx-community/gliner_multi_pii-v1`, a fixed revision, verified by
SHA-256). Your documents are never part of that request. With `"neural": false` in
`~/.ainonymize/config.json` there is no network access at all.

There is no telemetry, no analytics, no crash reporting and no account.

## Contact

Luis Eineder — please open an issue at https://github.com/Leineder/ainonymize-claude/issues.
