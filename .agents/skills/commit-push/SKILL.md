---
name: commit-push
description: Commit and push the current changes with a release-please compatible Conventional Commit message. Use when the user asks to commit, push, or ship changes. Always previews short message and asks for confirmation before pushing.
---

# Commit and push

1. Run `npm run format && npm run typecheck && npm test && npm run lint`. If anything fails, stop and report. Format rewrites the whole repo: revert files outside this change with `git checkout -- <file>` so the diff stays limited to what you touched.
2. Run `git status` and `git diff`. Stage specific files only (never `git add .`). Flag `.env`, credentials, or key files and leave them out.
3. If on `main`, create a branch first: `<type>/<short-kebab-summary>`.
4. Write the message in Conventional Commits form, which release-please reads:
   - `type(scope): subject`, imperative, lowercase, no trailing period, under 72 chars.
   - Types: `feat` (minor bump), `fix` (patch bump), `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`.
   - Scope is the feature or package, e.g. `grocery`, `expenses`, `core`, `web`, `mobile` (see `git log` for existing scopes).
   - Breaking change: `!` after the type/scope and a `BREAKING CHANGE:` footer.
   - One logical change per commit. Split unrelated changes.
5. Commit with `git commit`.
6. Preview, then ask for confirmation before pushing. Show:
   - branch and remote
   - `git log --stat origin/<branch>..HEAD` (or `main..HEAD` for a new branch)
   - the exact command: `git push -u origin <branch>`
7. Push only after the user says yes. Never force push. Never use `--no-verify`.
8. Report the branch name and commit SHA.
