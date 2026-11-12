# Xiaoxiao Harness

English | [中文](README.zh.md)

Xiaoxiao Harness (`xxh`) is an open-source **agent harness** — a shared runtime for AI agents that ships with model access, tool execution, session management, permission gating, and multi-surface interfaces out of the box.

It is built on an **everything-is-a-plugin** architecture, powered by [Cordis](https://github.com/cordiverse/cordis). The core is deliberately thin: nearly every capability — from the chat surface to shell execution, from subagents to workflows — is a plugin you can replace, disable, or write yourself.

> Xiaoxiao Harness is built on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) and is distributed under the MIT License. See [License & Acknowledgments](#license--acknowledgments).

## Why a harness

Most people think of an agent as "a loop wrapped around a model." In production, the loop is the shortest part. The rest is:

- how tools register, how they authenticate, what happens when they fail
- where session state lives, how context gets trimmed when it overflows
- how the UI intercepts a dangerous operation and asks the user first
- how multiple agents divide work and call each other

Xiaoxiao Harness turns all of that into composable plugins. You mount only what you need.

## Highlights

**Everything is a plugin**  
CLI, Web UI, and desktop share one plugin set; a plugin behaves identically on all three. Mount nothing you don't want — no dead buttons left in the UI.

**Three surfaces, one core**  
- **CLI** — `xxh` for scripting and remote SSH sessions
- **Web UI** — a browser interface in one command: `xxh web`
- **Desktop** — Electron build with a built-in terminal, file tree, document preview, and sandboxed browser

**A real execution environment**  
Shell execution ships with sandbox isolation and an approval gate. File I/O, code search, web fetch, and Office document handling are separate plugins, each individually swappable.

**Orchestration**  
Subagents, durable workflows, skills, task planning, and Ralph loops — multi-step work is composed at the framework layer instead of stuffed into one enormous prompt.

**Observable and interruptible**  
Every tool call and every reasoning step lands in a replayable event record. Dangerous operations stop at the approval gate instead of surprising you afterwards.

**Open protocols**  
MCP client support, ACP, and a Python SDK, so external tools and third-party UIs can plug in.

## Quick start

Requires Node.js (20+ recommended) and pnpm.

### From source

```sh
git clone https://github.com/Shamnick/Xiaoxiao-Harness.git
cd Xiaoxiao-Harness
pnpm install
pnpm run build
pnpm xxh web
```

`pnpm run build` prepares repository artifacts; `pnpm xxh web` consumes them without rebuilding.

The Web UI starts at `http://127.0.0.1:3080` and opens your browser. Over SSH it only prints the host URL, since the local forwarding address belongs to the SSH client. Pass `--no-open` to run the server without launching a browser.

### Desktop

```sh
pnpm run dev:desktop        # development
pnpm run build:desktop      # production build
```

Packaging and signing details live in [apps/desktop](apps/desktop).

## Plugin ecosystem

A plugin is an independently published npm package mounted through `cordis.yml`. Writing one takes a single `apply` function:

```ts
export const inject = ['slots']
export function apply(ctx) {
  ctx.slots.register({ name: 'sidebar.brand.mark' }, MyBrandMark)
}
```

Rebranding the UI, adding a tool, or wiring a new model provider never requires touching framework code.

Tag plugin repositories with [`dsh-plugin`](https://github.com/topics/dsh-plugin) for discoverability.

## Documentation

- [User guide](docs/user/guide/index.md)
- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Safety](SAFETY.md)

Coding conventions for agents: [AGENTS.md](AGENTS.md).

## Rebranding toolkit

[`tools/rebrand/`](tools/rebrand/) holds what you need to turn this framework into a branded product of your own: a rename checklist that separates brand names from service endpoints and path identifiers, an MIT notice template, rename and verification scripts, and a brand plugin scaffold.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License & Acknowledgments

Released under the [MIT](LICENSE) license.

This project contains source code from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness),
copyright DeepSeek (`Copyright (c) 2026 DeepSeek`), also distributed under the MIT License.
The complete third-party dependency list with licenses is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

"DeepSeek Harness" is a registered trademark of DeepSeek. This project is not affiliated with
DeepSeek and does not represent any official endorsement or partnership; it uses that source code
solely under the permission granted by the MIT License.
