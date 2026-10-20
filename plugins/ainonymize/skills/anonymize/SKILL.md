---
name: anonymize
description: Work with documents that contain personal or client data (contracts, HR files, patient letters, invoices, bank exports, CRM/CSV exports, e-mails) without that data leaving the computer. Use whenever the user asks to read, summarize, review, translate, compare, analyze or edit a local Word, Excel, PowerPoint, PDF, CSV or e-mail file that may contain names, addresses, contact details, IDs, bank or health data — or when they mention GDPR/DSGVO, confidentiality, client data or anonymization.
argument-hint: "[path to document]"
---

# Working privately with personal data (Ainonymize)

Ainonymize replaces personal data with **consistent, realistic pseudonyms on the user's computer**
before anything reaches you, and puts the real values back locally at the end. You work with the
pseudonyms as if they were the real people and values.

## Workflow

1. **Anonymize instead of reading.** For each document, call the `anonymize_file` tool with the
   absolute path (if the user gave a relative path or just a file name, resolve it first, e.g. with
   Glob). Do not use Read/Bash/cat/python on the original document — the plugin's guard will
   refuse Read anyway. If `$ARGUMENTS` is a path, start with that file.
2. **Work on the result.** The tool returns the pseudonymized text and writes
   `<name>.anonymized.<ext>` next to the original in the same format. That copy is safe to read
   and to edit (e.g. with docx/xlsx/pptx tooling) when the user wants a modified document.
   - Keep the pseudonyms exactly as written (same spelling, same format). They are what lets the
     real values come back.
   - Do not tell the user the names are fake unless they ask; refer to people by the names you see.
   - Several documents in one project share a mapping scope, so the same person keeps the same
     pseudonym across files.
3. **Deliver with real values — locally.**
   - A document: create/edit the file (based on the `.anonymized` copy or new), save it, then call
     `restore_file` with its path. The user gets `<name>.restored.<ext>` with the real names.
   - A text answer the user wants to send or keep (e-mail, letter, memo): call `restore_text` with
     your pseudonymized text and a sensible `file_name`; pass `open: true` if the user wants to
     see it right away.
   - Never read, open, quote or summarize a `*.restored.*` file — it contains real personal data.
     Just tell the user where it was saved.
4. **Be honest about limits.** If the tool reports that only the rule-based layer was used (the
   local model is still downloading), tell the user that some names may have been missed and offer
   to re-run later. If a format could not be kept 1:1, say that a `.txt` version was produced.

## When the prompt guard stops a message

If the user says their prompt was blocked: the guard put a pseudonymized version on their
clipboard. They can paste and send it, or add `#raw` to send the original deliberately.

## Status and settings

- `ainonymize_status` shows whether the local model is ready, the current scope and stored
  mappings (counts only).
- Settings live in `~/.ainonymize/config.json`:
  `{"promptGuard": "block"|"warn"|"off", "readGuard": "block"|"off", "neural": true|false, "allowPaths": []}`.
