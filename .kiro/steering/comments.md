---
inclusion: always
---

# Comments

Default to no comments. Code should explain itself through clear names and structure.

## Do not write

- Comments that restate what the code does.
- Docblocks that repeat a function, prop or type name, or its signature.
- Section dividers, banners and decorative comments.
- Task, ticket or history references (for example "added for Task 11") and changelog-style notes.
- Commented-out code.
- Section labels in JSX, CSS, YAML or config that only name what follows.

## Keep

Only comments that carry information the code cannot, and that would cause a bug or confusion if lost:

- Why something is done a non-obvious way: workarounds, platform quirks, ordering constraints, security or correctness reasons.
- Invariants and gotchas a future editor could break by accident.
- "Do not edit" headers on generated files.
- Tool directives, which are not prose: `eslint-disable`, `@ts-expect-error`, `@jsxImportSource`, `prettier-ignore`, `"use client"`.

## Style

- Keep a kept comment to one or two lines, in plain prose.
- Use `//` for explanations. Reserve `/** */` for public APIs where editor hover docs are useful and add something the signature does not.
- When touching code with a stale or redundant comment, remove it.
- When in doubt, leave the comment out.
