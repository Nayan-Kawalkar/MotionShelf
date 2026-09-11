# Lab content

Every `.md` file in this folder becomes a page at `/lab/<file-name>`.

- `my-post.md` → `/lab/my-post`
- Files starting with `_` are starters to copy — the site ignores them.
- This README is ignored too.

## Adding an entry

1. Copy the starter for its type (`_case-study.md`, `_pipeline.md`,
   `_agent.md`, `_automation.md`) and rename it. The file name is the URL, so
   use lowercase words joined by hyphens.
2. Fill in the frontmatter between the `---` lines, then write the body in
   markdown underneath.
3. Commit and push. Vercel rebuilds and the entry appears, newest first.

Images go in `public/lab/<file-name>/` and are referenced from `/lab/<file-name>/…`.

If a file has a mistake in its frontmatter, the site skips it instead of
breaking, and the dev server prints why in the browser console.

## Fields

Every type:

| Field     | Required | Notes                                          |
|-----------|----------|------------------------------------------------|
| `type`    | yes      | `case-study`, `pipeline`, `agent`, `automation` |
| `title`   | yes      |                                                |
| `summary` |          | One line, shown on the card                    |
| `date`    |          | `2026-09-12` — sets the order                  |
| `tags`    |          | `[react, three]`                               |
| `cover`   |          | Image path, shown on the card and page         |
| `repo`    |          | GitHub URL                                     |
| `live`    |          | Hosted URL                                     |
| `stack`   |          | `[Node, Postgres]`                             |

Extras by type:

| Type                    | Fields                                        |
|-------------------------|-----------------------------------------------|
| `case-study`            | `client`, `role`, `duration`, `outcomes` (list) |
| `agent`                 | `model`, `tools` (list)                       |
| `pipeline`, `automation`| `trigger`, `steps` (list, drawn as a flow)    |
