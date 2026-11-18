# @deepseek-ai/dsh-client-ui-studio

Workspace studio surface: four working areas — Work, Code, Image and Video —
each registered as its own main panel with a sidebar launcher.

## Model Experience

Rendering this surface adds no model-visible input and no tokens; it is a pure
client view over the existing main-panel seats.

## Surfaces

| Rail entry | Content |
|---|---|
| `work` | Recent sessions, newest first, with a running marker |
| `code` | File explorer, editor with line numbers, grouped symbol outline |
| `image` | Prompt form, workspace image gallery, request history |
| `video` | Prompt form, workspace video gallery, request history |

Both galleries share one media browser (directory navigation, extension
filter, preview slot); the code explorer and the galleries share the path
breadcrumb.

The code surface reads the most recently updated Session's workspace through
`remote.workspaceFiles`, which resolves a Session id into its workspace root on
the Host. Generated prompts are recorded locally and handed to the conversation
— this package never fabricates a generation result.

## Verification

What is verified, and how — so a reviewer can check each claim rather than take
it on trust.

| Claim | Evidence |
|---|---|
| Wiring registers four panels and four launchers | `tests/wiring.client.spec.ts` asserts the exact ids, orders, shared store, and per-panel surface |
| Panes render, controls work | `tests/studio.client.spec.tsx`, 110 cases |
| Store actions behave | `tests/store.client.spec.ts`, 13 cases |
| Statement, function, and line coverage | 100% per file; branches 98% |
| Sidebar launchers exist and open their panel | `apps/web/tests/studio-panels.e2e.ts` in Chromium against the real composition |
| Code surface draws both side panes, the filter, and both handles | same e2e, second case |

## Known Limitations and Deferred Work

- **No generation backend.** The image and video surfaces record prompts and
  hand them to the conversation; nothing in this repository produces pixels or
  video. Wiring a provider is the missing piece.
- **File listing is unverified end to end.** The explorer lists whatever
  `workspaceFiles.list` returns, and the unit suite covers that path with a
  driven face, but no browser scenario yet proves real workspace files appear.
  The attempt needed a seeded Session whose recorded `cwd` matches the
  connected workspace, and was dropped rather than left flaky.
- **The work surface shows a snapshot.** Its session list is read once at
  mount; live subscription belongs to the conversation, which owns that
  projection.
- **Visual quality is unverified.** Tokens, radii, scrollbars, focus rings, and
  hover gating all pass the design-system gates, but whether the result looks
  right needs a human looking at it.
