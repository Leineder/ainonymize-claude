# Ainonymize for Claude

**Use Claude on contracts, HR files, patient letters, bank exports and client e-mails — without the
personal data in them ever leaving your computer.**

Ainonymize replaces names, addresses, e-mail addresses, phone numbers, IBANs, tax and ID numbers,
dates of birth, health data and more with **consistent, realistic pseudonyms on your machine**
before Claude sees a document. Claude works with "Jürgen Kellermann" instead of your client; when
you need the final letter, contract or spreadsheet with the real names, Ainonymize puts them back
**locally**. The restored file is never sent to Claude.

```
 your document ──► Ainonymize (local) ──► pseudonymized copy ──► Claude
                         │                                           │
                   mapping stays in                         draft with pseudonyms
                   ~/.ainonymize                                     │
 final document ◄── Ainonymize restore (local) ◄─────────────────────┘
```

| | |
|---|---|
| **Formats** | Word `.docx`, Excel `.xlsx`, PowerPoint `.pptx`, PDF, CSV/TSV, Markdown, text, JSON/XML/HTML, e-mail `.eml` |
| **Same format out** | `.docx`/`.xlsx`/`.pptx`/`.pdf` keep their layout 1:1 — or you get a `.txt` instead. Never a broken file. |
| **What it finds** | 23 GDPR categories incl. Art. 9 special categories (health, religion, union membership, criminal records), German + English |
| **How** | A local neural model (GLiNER multi-PII, fp16, downloaded once from Hugging Face and SHA-256-verified) plus rule-based detectors with checksums (IBAN mod-97, Luhn, tax IDs, …) |
| **Where** | 100% on your computer. No account, no telemetry, no server. Works offline after the one-time model download. |

## Install

### Claude Code (CLI, IDE, desktop "Code")

```
/plugin marketplace add Leineder/ainonymize-claude
/plugin install ainonymize@ainonymize
```

Restart Claude Code. Requires Node.js 18+ (already present if you installed Claude Code via npm).
Optional: run `/ainonymize:setup` once to download the local model (~600 MB) right away.

### Claude Cowork

In the plugin settings, add the GitHub marketplace `Leineder/ainonymize-claude` and install
**ainonymize**. (The tools and skills work everywhere plugins run; the prompt/read guards need a
client that runs plugin hooks.)

### Claude Desktop (chat)

1. Download **[`ainonymize.mcpb`](https://github.com/Leineder/ainonymize-claude/releases/latest/download/ainonymize.mcpb)**.
2. Double-click it (or **Settings → Extensions → Install extension…**) and confirm.

### claude.ai and ChatGPT in the browser

Use the Ainonymize Chrome extension: it intercepts uploads and typed text on claude.ai and
chatgpt.com. See [ainonymize.vercel.app](https://ainonymize.vercel.app).

### Any other MCP client

```bash
git clone https://github.com/Leineder/ainonymize-claude
node ainonymize-claude/plugins/ainonymize/server/cli.mjs mcp
```

## Use it

Just ask, naming the file:

> Summarize `~/Clients/Meyer/Arbeitsvertrag.docx` and list the risky clauses.

> Compare the two offers in `./offers/` and draft a reply to the cheaper vendor — give me the final letter with the real names.

> Go through `export_customers.csv` and find duplicates.

Claude calls `anonymize_file`, works with the pseudonyms, and for the final version calls
`restore_file` / `restore_text`, which saves `….restored.docx` (or `.md`, …) next to your files.

### What the plugin adds in Claude Code (and Cowork)

The plugin doesn't just add tools. It also adds guard rails, which a browser extension can't do on a desktop agent:

- **Prompt guard.** If you type or paste personal data into a prompt, it is stopped *before* it
  is sent. A pseudonymized version is put on your clipboard: paste it and send. Add `#raw` to a
  message to send it unchanged on purpose.
- **Read guard.** Claude cannot open Word/Excel/PowerPoint/PDF/e-mail files directly, nor CSV/text
  files that contain personal data; it is redirected to `anonymize_file`. Restored files
  (`*.restored.*`) are never readable by Claude.
- **One pseudonym per person per project.** All documents of a project folder share a mapping
  scope, so the same client is the same pseudonym in every file.

### Tools

| Tool | What it does |
|---|---|
| `anonymize_file` | Pseudonymize a local document; writes `name.anonymized.ext`, returns the pseudonymized text |
| `restore_file` | Restore real values into a document; writes `name.restored.ext`, returns only the path |
| `restore_text` | Restore real values into text Claude wrote and save it as a file |
| `ainonymize_status` | Model state, guards, scopes (counts only) |
| `setup_model` | Download + verify the local model now |
| `forget_scope` | Delete the stored mappings of a project/case |

### Settings

`~/.ainonymize/config.json` (all optional):

```json
{
  "promptGuard": "block",
  "readGuard": "block",
  "neural": true,
  "allowPaths": []
}
```

`promptGuard`: `block` | `warn` | `off`. `readGuard`: `block` | `off`. `neural: false` runs the
rule-based layer only (no model download). `allowPaths`: files or folders Claude may read
directly.

## Honest limits

- **Detection is very good, not perfect.** On our synthetic test corpora, about 97–99% of personal
  values are removed. A missed value does reach Claude. For documents where a single miss matters,
  check the `.anonymized` copy before you continue.
- **Restore is cautious.** If Claude edits a pseudonym (e.g. turns "Jürgen Kellermann" into "Mr K."),
  or a pseudonym is ambiguous, it is left as written, and the tool tells you how many. Restoring the
  wrong person's name would be worse.
- **Guard rails, not a sandbox.** The hooks intercept prompts and Claude's `Read` tool. Claude could
  still reach a file through other tools (e.g. a shell command) if it ignored the instructions.
- **Speed.** Everything runs on your CPU: roughly 2–4 seconds per 1,000 characters with the neural
  model. Long documents take a few minutes, and Claude is told to wait and re-check.
- **Not yet supported:** scanned PDFs/images (OCR), legacy `.doc/.xls/.ppt`, archives. The Chrome
  extension handles more formats.

## Privacy

Ainonymize collects nothing. The only network request it ever makes is the one-time model download
from huggingface.co (pinned revision, SHA-256 verified). See [PRIVACY.md](PRIVACY.md).

## License

Free to use, privately and commercially. See [LICENSE](LICENSE). Bundled open-source components:
[THIRD_PARTY_NOTICES.md](plugins/ainonymize/THIRD_PARTY_NOTICES.md).

---

### Deutsch, kurz

Ainonymize ersetzt personenbezogene Daten (Namen, Adressen, IBAN, Steuer-ID, Geburtsdatum,
Gesundheitsdaten …) **lokal auf Ihrem Rechner** durch stimmige Pseudonyme, bevor Claude ein
Dokument sieht, und setzt die echten Werte am Ende lokal wieder ein. DSGVO-freundlich, ohne Konto
und ohne Server.

Installation in Claude Code: `/plugin marketplace add Leineder/ainonymize-claude`, dann
`/plugin install ainonymize@ainonymize`. Claude Desktop: `ainonymize.mcpb` aus den Releases
doppelklicken.
