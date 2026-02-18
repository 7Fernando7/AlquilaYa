# Repository Guidelines

## Project Structure & Module Organization
- Root artifacts are lightweight: `README.md` and `index.html` hold the current product brainstorm and the static landing page.
- `.claude/`, `.codex/`, and `.specify/` house agent tooling, prompts, and scripted workflows—we rarely change those unless updating the automation infrastructure (update the matching docs when you do).
- The repository has no dedicated `src/`, `app/`, or `tests/` directories yet; treat new subdirectories as you introduce modules (nesting them under `src/` or `app/` and keeping assets under a top-level `assets/` folder is recommended for future structure).

## Build, Test, and Development Commands
- There is no build or test pipeline at the moment; the repo is Markdown/html-first. Preview `index.html` in your browser (e.g., `start index.html` from PowerShell) before sharing drafts.
- For bookkeeping, run `git status` frequently to see unstaged changes, and use `git diff --stat` (or `git diff <file>`) when reviewing edits.
- When you add automation or scripts later, document the command(s) (e.g., `npm test` or `dotnet build`) here and explain what they verify.

## Coding Style & Naming Conventions
- Favor concise Markdown and HTML: headings use `#` through `###`, bullet lists are hyphen-prefixed, and paragraphs stay within ~85 characters for readability in raw view.
- Keep new files in English or Spanish consistent with their contents; match existing casing (kebab-case for filenames, PascalCase for classes if/when code is added).
- Use two spaces for nested list indentation inside Markdown blocks and avoid trailing whitespace. When code lands, enforce its language’s canonical formatter (e.g., `prettier`, `clang-format`, etc.) and mention it here when adopted.

## Testing Guidelines
- No automated tests are present. If you add a test suite, include a short description (framework, scope) in this section plus how to run it (e.g., `pytest`, `npm run test`).
- Name test files to match the module they cover (e.g., `search.test.ts` next to `search.ts`), and keep test data under a dedicated `tests/data/` folder when it becomes necessary.

## Commit & Pull Request Guidelines
- Stick to clear, imperative commit messages like “Add housing search brainstorm” or “Document agent automation setup.” Mention related issues as “Fixes #123” when applicable.
- Each PR should explain what changed, why it matters, and how to verify it; include screenshots or sample output only if they clarify UI/content changes.
- Reference `.specify/templates/` for checklist/plan artifacts when the work track is formalized, and keep PR descriptions aligned with the template you use.

## Additional Notes
- Security & configuration hints: Sensitive data should never be added to the repo. If you need credentials or API keys, keep them out of version control and document their use in `.specify/templates/constitution-template.md`.
- For future contributors, a short glossary of roles/tools lives in `.specify/`; update it when you onboard automation changes so new agents remain aligned.
