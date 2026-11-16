# extensions/

Vendored upstream extensions that are **not yet wired into the build**.

## superagent/

Source copy of [`deepseek-ai/dsh-superagent-prototype`](https://github.com/deepseek-ai/dsh-superagent-prototype)
(MIT), a proactive coding agent bundle.

### Status: API-port done, pack unblocked, boot blocked

The code builds on its own:

```sh
cd extensions/superagent && pnpm install && pnpm run build
```

It cannot join the repository build yet. The blocker is an **API generation gap**:

| | superagent expects | this repo provides |
|---|---|---|
| dsh packages | `0.2.1-alpha.2` | `0.2.2-rc.2` |

**Resolved.** `pnpm exec tsc --noEmit` now passes clean:

- `inspect(id).events` → `events({ address }, signal).records.map(r => r.event)`
- `SessionEvent` → `SessionWireEvent`, with the message shape narrowed at the one
  place that reads it (`transcriptEntry`)
- `ConfigFormSnapshot.mode` removed upstream; `status === 'unavailable'` is the
  only remote-read-only signal now
- `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and the unused-local
  rules relaxed for this package only

**Pack stage: resolved.** Three blockers, in the order they surfaced:

1. `scripts/release/families.ts` — the `dsh` family globs did not include
   `extensions/*`, so `prepare-package-set` rejected the dependency.
2. `DshFamily.members` requires every member name to start with
   `@deepseek-ai/`, so the package became `@deepseek-ai/dsh-superagent` and the
   three `name:` rows in its `cordis.patch.yml` followed.
3. `verifyVersions` requires one version per family: `0.1.0` → `0.2.2-rc.2`.

**Still blocked: boot.** With the plugin mounted, `prepare:dsh` fails with
`Cannot read properties of undefined (reading 'authenticatedUrl')`, thrown from
`packages/client/connection/lib/types/rpc-host.js` where it calls
`this.browserAuth.authenticatedUrl(...)`. `browserAuth` is unset at that point.
Unmounting restores a clean package run, so the plugin's `webServer` route
registration is implicated in the initialization order. Next step is to look at
how `browserAuth` is wired relative to `webServer.register`.

### Why it is outside packages/

Any `.ts` file under `packages/` joins the root `tsconfig.host.json` program.
Superagent imports built `lib/` outputs of sibling packages, which the repo's
source-first typecheck rejects (`TS6307`, and a `TypertAnalysisError` in the
Typert generator). Keeping it outside `packages/` keeps the root build clean.

### Path forward

1. Trace `browserAuth` initialization versus the plugin's `webServer.register`
   call, and find the ordering or config the plugin needs.
2. Once boot succeeds, mount `cordis.patch.yml` from the web-app bundle with a
   `stateDir` (example in its `examples/profile.cordis.patch.yml`).
3. Verify `package:desktop:mac:arm64:unsigned` still produces a launchable app.
