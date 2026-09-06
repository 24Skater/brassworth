## What this changes

<!-- What a reviewer should understand before reading the diff. If it changes
     something a user would notice, say what to click to see it. -->

## Why

<!-- The problem, not the patch. If you rejected an obvious alternative, say which
     and why -- that reasoning is worth more in review than the code is. -->

## Test covering it

<!-- Required. Name the test and say what fails without your change.
     "No test because ..." is an acceptable answer only for documentation-only
     changes, and you should say so explicitly here. -->

## Checks

All six must pass before review. See docs/TESTING.md.

- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run type-check`
- [ ] `npm run test:coverage` (coverage is a ratchet -- raise it, never lower it)
- [ ] `npm run build`
- [ ] `npm run test:e2e`

## If this touches documentation

- [ ] `node scripts/screenshots/checkDocs.mjs` passes (links, Mermaid, no emoji)
- [ ] The fact is stated in its owning document only -- see docs/INDEX.md

## If this changes the interface

- [ ] Screenshots regenerated with `npm run screenshots`
