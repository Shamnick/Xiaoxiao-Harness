# extensions/

Vendored upstream extensions that are **not yet wired into the build**.

## superagent/

Source copy of [`deepseek-ai/dsh-superagent-prototype`](https://github.com/deepseek-ai/dsh-superagent-prototype)
(MIT), a proactive coding agent bundle.

### Status: API-port done, packaging blocked

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

**Still blocked: desktop packaging.** `prepare-package-set.ts` selects its
payload from packages that were already packed, and the pack step only covers
`@deepseek-ai/*`. A workspace package outside that scope that a bundle depends
on fails with `requires unpacked package dsh-superagent`. Mounting therefore
also breaks `package:desktop:*`. Fixing it means teaching the pack step about
`extensions/*`.

### Why it is outside packages/

Any `.ts` file under `packages/` joins the root `tsconfig.host.json` program.
Superagent imports built `lib/` outputs of sibling packages, which the repo's
source-first typecheck rejects (`TS6307`, and a `TypertAnalysisError` in the
Typert generator). Keeping it outside `packages/` keeps the root build clean.

### Path forward

1. Teach `apps/desktop/scripts/prepare-package-set.ts` (and its pack step) to
   include `extensions/*` workspace packages.
2. Then: add `extensions/*` to `pnpm-workspace.yaml`, register a tsconfig
   reference, and mount `cordis.patch.yml` from the web-app bundle with a
   `stateDir` (example in its `examples/profile.cordis.patch.yml`).
3. Verify `package:desktop:mac:arm64:unsigned` still produces a launchable app.
