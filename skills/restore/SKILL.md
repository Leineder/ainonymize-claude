---
name: restore
description: Put the real names and values back into a document or text that contains Ainonymize pseudonyms, locally, so the user gets the final version with real personal data without it ever entering the conversation. Use when the user wants the "real", "final", "original names" or "de-anonymized" version of something drafted from anonymized documents.
argument-hint: "[path to file with pseudonyms]"
---

# Restore real values (Ainonymize)

- **A file** (`$ARGUMENTS` or the document you just wrote): save your latest version first, then
  call `restore_file` with its absolute path. Pass `open: true` if the user wants to look at it.
- **Text from this conversation** (an e-mail, letter, summary): call `restore_text` with the exact
  pseudonymized text and a descriptive `file_name` such as `letter-to-client.md`.

The tool answers with the saved path and how many values were restored. The restored content is
never shown to you — do not try to read, open or print the `*.restored.*` file. Tell the user where
it is and, if pseudonyms are still standing, that those were ambiguous or edited and stayed as
written on purpose (restoring the wrong person's name would be worse).

If the tool reports that no mapping matches, the text was probably anonymized in another project
(scope). Ask the user which project/case it belongs to and pass that as `scope`, or check
`ainonymize_status` for the stored scopes.
