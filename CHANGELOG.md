# Changelog

## 1.1.0 — 2026-10-21

- Ready for Anthropic's plugin directory: the plugin now sits at the repository root, the engine ships as readable (unminified) code, and the 11 MB WebAssembly runtime comes from the pinned npm package `onnxruntime-web@1.19.2` that Claude Code installs from `package-lock.json`. No install scripts run.
- If that runtime is missing, the plugin still works with its rule-based layer and says so in every result.
- Pseudonyms never reuse a word of the document, so a missed name can never be restored as someone else.
- README: full list of what the plugin runs, reads, writes and fetches.

## 1.0.0 — 2026-10-20

First public release.

- `anonymize_file`: local pseudonymization of Word, Excel, PowerPoint, PDF, CSV/text and e-mail files, layout kept 1:1 (or a `.txt` fallback, never a distorted file); resumable for long documents.
- `restore_file` / `restore_text`: real values restored locally; restored content never returned to Claude.
- Claude Code / Cowork hooks: prompt guard (stop + pseudonymized copy on the clipboard), read guard (documents and personal data files go through `anonymize_file`; `*.restored.*` never readable), session context.
- One pseudonym per person across a project (mapping scope per project folder).
- Local neural model (GLiNER multi-PII fp16, pinned + SHA-256-verified) on onnxruntime-web: no native modules, the same files on macOS, Windows and Linux.
- Claude Desktop extension (`ainonymize.mcpb`).
