---
name: pull-request
description: Open a GitHub pull request with a release-please compatible title and a description that follows the repo PR template. Use when the user asks to open or create a PR. Always previews short message and asks for confirmation before creating.
---

# Open a PR

1. Make sure the branch is not `main` and is pushed (`git push -u origin <branch>` needs the commit-push skill's confirmation). Stop if there are uncommitted changes and say so.
2. Read `git log main..HEAD` and `git diff main...HEAD`. Check `gh pr list --head <branch>` for an existing PR.
3. Title: Conventional Commit style, under 70 chars, e.g. `feat(grocery): add private spending`. With squash merges, this becomes the release-please entry. Use the dominant change type.
4. Body: fill `.github/PULL_REQUEST_TEMPLATE.md` section by section.
   - Summary: what and why, in a few lines.
   - Related issue: `Closes #N` or `None`.
   - Type of change: tick one box.
   - How was this tested: the commands actually run and their results. Do not claim checks that were not run.
   - Checklist: tick only items you verified.
   - Screenshots: only for UI changes, otherwise remove the section.
     Remove HTML comments from the final body.
5. Preview, then ask for confirmation before creating. Show the title, base and head branches, and the full body.
6. After a yes, write the body to a temp file and run `gh pr create --base main --title "<title>" --body-file <file>`. Delete the temp file. Add `--draft` if the user asked.
7. Return the PR URL.
