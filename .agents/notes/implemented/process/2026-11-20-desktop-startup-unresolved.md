# Desktop startup: what was ruled out

The packaged app quits within a few seconds of launch and produces no window,
no log, and no crash report. The web build of the same client code runs
correctly. This note records what has been eliminated so the next attempt does
not repeat it.

## Symptom

```
launch           → 2–5 processes appear
3–60 seconds     → 0 processes
macOS window list → no entry for the app
~/Library/Logs/Xiaoxiao Harness/ → only an unrelated renderer crash from 2026-11-13
~/Library/Logs/DiagnosticReports/ → no report
```

The exit is clean, not a crash: nothing is written to `DiagnosticReports`.

## Ruled out

| Hypothesis | Evidence against |
|---|---|
| Client UI code throws during render | A probe placed before `app.setAppLogsPath()` never ran, so `lib/main.js` was never executed |
| `thread()`/`pictures()` throw on a released binding | Same — the code never ran. `try/catch` was added anyway; it did not change the outcome |
| Profile lock contention with another install | Launching with `DSH_PROFILE_DIR=/tmp/…` behaved identically |
| Bundle corruption | `file` reports a valid Mach-O arm64 executable; `Electron Framework.framework` and the other frameworks are present |
| Hidden background agent | `LSUIElement` and `LSBackgroundOnly` are both absent from `Info.plist` |
| An early `app.quit()` | The only call sites are the recovery dialog's `exit`/`restart` and the development-mode menu item; startup cannot reach them |
| Corrupted copy into `/Applications` | `cp -R` silently dropped `Contents/MacOS/Xiaoxiao Harness`; installing with `ditto` restored it, and the symptom was unchanged |
| Electron download failure during packaging | `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` makes packaging complete; the artifact builds and the DMG is produced |

## Instrumentation that does not work here

- `--enable-logging=stderr` → rejected as a bad option (fuses).
- `ELECTRON_ENABLE_LOGGING=1 ELECTRON_ENABLE_STACK_DUMPING=1` → zero lines of output.
- Redirecting the launcher's stdout/stderr to a file → the file stays empty.
- `--remote-debugging-port` → rejected as a bad option (fuses).
- `osascript` window queries → the process is not in the window list, and
  accessibility control is denied in this environment.
- `playwright._electron.launch` → `Process failed to launch!`; `electronFuses`
  lacks `enableNodeCliInspectArguments`. Enabling it would weaken the shipped
  artifact's security boundary, so it was deliberately not changed.

## Not yet tried

- Launching the unpacked `.app` produced by `package:mac:arm64:dir` rather than
  the installed copy.
- Comparing `Info.plist` key-by-key against a known-good Electron app.
- Running the same artifact on a machine without the other Electron apps
  (`DeepSeek Harness`, `Xiaoxiao Agent`, `Qoder`, `Trae`) installed.
- Reading `Console.app` filtered by the bundle id while double-clicking —
  requires a GUI session.

## What works today

`pnpm run dev:web` serves the identical client build at
`http://127.0.0.1:3080/?token=…`. Every studio surface, panel, composer, and
transcript path exercised in this work was verified through that build, both by
unit tests and by Chromium screenshots.
