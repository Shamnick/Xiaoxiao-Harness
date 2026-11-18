# @deepseek-ai/dsh-client-ui-studio

Workspace studio surface: a vertical activity rail that switches the main panel
between four work areas — Work, Code, Image and Video.

## Model Experience

Rendering this surface adds no model-visible input and no tokens; it is a pure
client view over the existing main-panel seat.

## Surfaces

| Rail entry | Content |
|---|---|
| `work` | Conversation and task orchestration |
| `code` | File explorer, editor area and the structure map |
| `image` | Image generation |
| `video` | Video generation |

`code` renders its three-pane layout today; the explorer and map are wired to
the workspace in a later step.

## Known Limitations and Deferred Work

- Image and video surfaces are placeholders: no generation backend is mounted.
- The code explorer and structure map render their panes without data.
