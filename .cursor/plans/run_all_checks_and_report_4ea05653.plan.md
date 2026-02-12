---
name: Run all checks and report
overview: Run the project's major automated checks (svelte-check, lint, knip, unit tests), then run svelte-autofixer on every .svelte and .svelte.ts file; capture all output and report back so the user can catch every error and warning before deploying the dev site.
todos: []
isProject: false
---

# Run All Checks and Report

## Scope

Run these in order and report every outcome:

1. **svelte-check** — `npm run check` ([package.json](package.json) line 10)
2. **Lint** — `npm run lint` (Prettier + ESLint)
3. **Knip** — `npm run knip` (uses `DATABASE_URL=postgresql://localhost/db` per existing script)
4. **Unit tests** — `npm run test` (Vitest run-once)
5. **svelte-autofixer** — MCP pass over every Svelte file (see below)

E2E (`npm run test:e2e`) is out of scope unless you ask to add it (slower, needs env/DB).

## Execution steps (steps 1–4)

- Run each command from the repo root.
- Do not use `--no-error-on-match` or similar; preserve real exit codes.
- If a step fails, still run the remaining steps so you get a full picture (then report which failed).
- Capture for each step: command, exit code, full stdout, full stderr.

## Step 5: svelte-autofixer pass

- **Input set**: All `src/**/*.svelte` and `src/**/*.svelte.ts` files (~87 .svelte + 6 .svelte.ts = 93 files).
- **Per file**: Read file contents, call the `svelte-autofixer` MCP tool with that code, `desired_svelte_version: 5`, and `filename` set to the filename (e.g. `Button.svelte`). For `.svelte.ts` modules, pass `async: true` only if the file uses top-level await or await in markup; otherwise omit or set `async: false`.
- **Collect**: For each file, record whether the tool returned any issues or suggestions. If it did, record file path and the full list of issues/suggestions.
- **Batching**: Call the MCP tool per file (no batch API). To avoid rate/context issues, process in a stable order; if the run is very long, the report can summarize "X files with issues" and list them with details, and "Y files OK" as a count.

## Report format

Deliver a single summary that includes:

- **Per check (1–4)**: name, command, exit code (0 vs non-zero), and either "OK" or the relevant error/warning output (truncate only if extremely long).
- **svelte-autofixer**: Either "OK — no issues in any of the N files" or a list of every file that had issues/suggestions, with file path and the issues/suggestions for that file (full text; truncate only if extremely long).
- **Overall**: all passed / list which failed (including "svelte-autofixer" if any file had issues).
- **Optional**: one-line suggestion for next steps if anything failed (e.g. "fix lint then re-run" or "address svelte-autofixer issues in the listed files").

## Notes

- **Knip**: Your [package.json](package.json) script uses `DATABASE_URL=postgresql://localhost/db`. If the DB is not running, knip might error; that will be reported as a knip failure with the actual message.
- **svelte-autofixer**: MCP-only; step 5 is the agent reading each file and calling the tool. Goal is to catch all Svelte errors and warnings before deploying the dev site.

No new scripts, no CI changes, no skill — just run, capture, and report.
