## Summary
- What changed:
- Why this change is needed:
- Related plan phase / commit slice (e.g., Commit 1/2/3/4/5):

## Public-Release Scope Check
- [ ] Change is within public-release scope (no unrelated refactors)
- [ ] No generated Wails files were manually edited (`frontend/wailsjs/**`)
- [ ] No secrets or credentials added to code, docs, logs, or screenshots

## Type of Change
- [ ] Backend contract/reliability
- [ ] Frontend error-handling/UX safety
- [ ] Formatting/tooling
- [ ] Critical-path comments
- [ ] Docs/CI hygiene

## High-Impact Gate (must be true when applicable)
- [ ] No string-prefix success parsing for migrated paths (no `startsWith("Success")` dependency)
- [ ] World settings local persistence failures are explicitly surfaced (no silent partial success)
- [ ] Mutation DB calls use timeout-backed context (no `context.TODO()` in write paths)
- [ ] Server deletion flow uses consistent in-app confirmation behavior

## Formatting & Lint
- [ ] Frontend formatting passes (`npm run format:check`)
- [ ] Frontend lint passes (`npm run lint`)
- [ ] Go formatting passes (`gofmt` clean for changed Go files)
- [ ] Go lightweight static checks pass (`go vet ./...`)

## Verification
### Build
- [ ] `go build ./...`
- [ ] `cd frontend && npm run build`

### Manual Smoke Checks (tick only what applies)
- [ ] Settings save shows deterministic success/failure message
- [ ] World setting save surfaces local persist error code path
- [ ] Start/Join/Version-change flows show actionable errors
- [ ] Server deletion action behaves safely and predictably

### Regeneration Safety (when API surface touched)
- [ ] Wails bindings regenerated successfully
- [ ] App still compiles after regeneration without manual generated-file edits

## Critical-Path Comments (for comment-focused PRs)
- [ ] Comments explain intent/invariants/error semantics (not obvious syntax)
- [ ] Comments are concise and production-grade
- [ ] No stale or misleading comments introduced

## Risk & Rollback
- Risk level:
  - [ ] Low
  - [ ] Medium
  - [ ] High
- Rollback plan (single paragraph):

## Checklist Before Merge
- [ ] PR title is clear and scoped
- [ ] Commit history is clean and focused
- [ ] Screenshots/log snippets included if behavior changed
- [ ] README/CI docs updated if workflow changed
