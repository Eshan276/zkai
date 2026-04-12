---
mode: agent
tools:
  - codebase
  - editFiles
description: >
  Generate all ZKai documentation in one pass.
  Writes README.md (root), architecture.md (root), frontend/README.md, and sdk/README.md.
  No emojis. No code in architecture doc. Visually clean markdown throughout.
---

You are generating the complete documentation suite for the ZKai project.
Do not summarise what you are going to do — generate the files immediately.
Work through each file in order. After writing each one, output a single line:
`[DONE] <filepath>`

---

## Files to generate

### 1. `README.md` — repository root

Follow the instructions in `.github/prompts/root-readme.prompt.md`.

---

### 2. `architecture.md` — repository root

Follow the instructions in `.github/prompts/architecture-doc.prompt.md`.

Note: the architecture diagram already exists at `architecture.drawio.png` in the repo root.
Embed it in the document using: `![ZKai System Architecture](architecture.drawio.png)`

---

### 3. `frontend/README.md`

Follow the instructions in `.github/prompts/frontend-readme.prompt.md`.

Inspect the `frontend/` directory first with the codebase tool.
Check `package.json` for: Next.js version, package manager, scripts, and dependencies.
Check source files for `process.env.NEXT_PUBLIC_` references to discover env variables.

---

### 4. `sdk/README.md`

Follow the instructions in `.github/prompts/sdk-readme.prompt.md`.

Inspect these directories with the codebase tool before writing:
- `sdk/` — Python package structure, entry points, existing docstrings
- `cli/` — CLI entry point, available commands and flags
- `bridge/` — to understand what the bridge exposes (payment and attestation routes)

---

## Quality gate

After all four files are written, verify automatically:

- `README.md` links to `architecture.md`, `sdk/README.md`, and `frontend/README.md`
- `architecture.md` contains the image embed `![ZKai System Architecture](architecture.drawio.png)` and zero fenced code blocks
- `frontend/README.md` has a numbered prerequisites section and a numbered installation section
- `sdk/README.md` covers the Python client, the CLI (`cli/`), and the bridge payment/attestation routes
- No file contains any emoji character

Fix any failing check before finishing.
