# extensions/

Vendored upstream extensions that are **not yet wired into the build**.

## superagent/

Source copy of [`deepseek-ai/dsh-superagent-prototype`](https://github.com/deepseek-ai/dsh-superagent-prototype)
(MIT), a proactive coding agent bundle.

### Status: vendored, not mounted

The code builds on its own:

```sh
cd extensions/superagent && pnpm install && pnpm run build
```

It cannot join the repository build yet. The blocker is an **API generation gap**:

| | superagent expects | this repo provides |
|---|---|---|
| dsh packages | `0.2.1-alpha.2` | `0.2.2-rc.2` |

Concrete breakage: `SessionController.inspect` no longer exists in `0.2.2-rc.2`,
so `src/app/resources.ts:115` fails to typecheck. There are also a handful of
`exactOptionalPropertyTypes` / `noUncheckedIndexedAccess` violations, which its
own tsconfig does not enable.

### Why it is outside packages/

Any `.ts` file under `packages/` joins the root `tsconfig.host.json` program.
Superagent imports built `lib/` outputs of sibling packages, which the repo's
source-first typecheck rejects (`TS6307`, and a `TypertAnalysisError` in the
Typert generator). Keeping it outside `packages/` keeps the root build clean.

### Path forward

1. Port `resources.ts` and friends onto the current Session API.
2. Align the remaining optional-property / index-access issues.
3. Then: add `extensions/*` to `pnpm-workspace.yaml`, register a tsconfig
   reference, and mount `cordis.patch.yml` from the web-app bundle with a
   `stateDir` (example in its `examples/profile.cordis.patch.yml`).
