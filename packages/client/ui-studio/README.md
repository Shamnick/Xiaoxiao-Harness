---
description: "Workspace studio surface for the Web GUI: four working areas (Work, Code, Image, Video) registered as main panels with sidebar launchers; for users and maintainers of the studio experience."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-studio

## Summary

The studio registers four main-panel seats and four sidebar launchers: Work lists recent sessions, Code pairs a file explorer with an editor and a grouped symbol outline, and Image and Video each pair a prompt form with a workspace media gallery and a request history. Prompts are recorded locally and handed to the conversation; no generation backend is mounted.

## Table of Contents

- [Surfaces](#surfaces)
- [Verification](#verification)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

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
| Optional services stay optional | same suite: `apply` succeeds and all four panels register when no `workspaces` registry is mounted |
| Panes render, controls work | `tests/studio.client.spec.tsx` |
| Store actions behave | `tests/store.client.spec.ts` |
| Statement, function, and line coverage | 100% per file |
| Sidebar launchers exist and open their panel | `apps/web/tests/studio-panels.e2e.ts` in Chromium against the real composition |
| The four launchers share one container | same e2e: their parents collapse to a single panel-list node |
| Code surface draws both side panes, the filter, and both handles | same e2e, second case |
| The surface is reachable without a mouse | same e2e: focus, Enter, and Tab land on operable elements |
| Empty panes explain themselves | each pane renders `EmptyState` with a glyph, the reason, and the next action |
| No type escapes | `verify-no-unknown-casts` reports zero findings for this package |

Screenshots taken through the same Chromium harness are how the visual
defects below were found: a near-white selected chip, a duplicate
"No sessions yet" on one screen, and history rows with no age.

## Known Limitations and Deferred Work

- **No generation backend.** The image and video surfaces record prompts and
  hand them to the conversation; nothing in this repository produces pixels or
  video. Wiring a provider is the missing piece.
- **File listing is unverified end to end.** The explorer lists whatever
  `workspaceFiles.list` returns, and the unit suite covers that path with a
  driven face, but no browser scenario yet proves real workspace files appear.
  The attempt needed a seeded Session whose recorded `cwd` matches the
  connected workspace, and was dropped rather than left flaky.
- **A half-typed prompt is lost when switching surfaces.** Each surface owns its
  draft in component state, and selecting another surface unmounts the pane.
  Moving the draft into the entry store was attempted twice: the first pass
  broke 103 tests through the shared store shape, and after guarding for a
  missing field 8 remained, all in the generation-submit path. The change was
  reverted rather than shipped half-verified; a correct fix needs the store
  change and its test fixtures landed together.
- **The work surface shows a snapshot.** Its session list is read once at
  mount; live subscription belongs to the conversation, which owns that
  projection.
- **Visual quality is unverified.** Tokens, radii, scrollbars, focus rings, and
  hover gating all pass the design-system gates, but whether the result looks
  right needs a human looking at it.

## Dev Note

The four panels are keyed by `studio.*` ids registered into the `main` slot; the launchers are `sidebar.panellist` entries, because `shell.leading` is a single-occupant slot already held by the sidebar. The conversation cannot be embedded: `conversation.session` is a single session-scoped slot its own package occupies. File contents stay in component state — only paths enter the persisted store, so a large file never reaches the layout snapshot.
