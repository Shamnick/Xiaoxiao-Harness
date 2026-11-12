# Xiaoxiao Harness

[English](README.md) | 中文

Xiaoxiao Harness（`xxh`）是一个开源的 **agent harness**（智能体框架）——为 AI 智能体提供统一的运行底座：模型接入、工具调用、会话管理、权限审批、多端界面，全部开箱可用。

它构建在**一切皆插件**的架构之上，由 [Cordis](https://github.com/cordiverse/cordis) 驱动。核心本身极薄，几乎所有能力——从对话界面到终端执行、从子智能体到工作流——都是一个可以被替换、关闭或自研的插件。

> Xiaoxiao Harness 基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 构建，依 MIT 许可证授权。详见[许可与致谢](#许可与致谢)。

## 为什么是 harness

大多数人把 agent 当成"套在模型外面的一层循环"。真到生产环境，循环只是最短的那一截，剩下全是：

- 工具怎么注册、怎么鉴权、失败了怎么重试
- 会话状态存在哪、上下文超了怎么裁
- 用户要审批某个危险操作时，界面怎么接
- 多个智能体怎么分工、怎么互相调用

Xiaoxiao Harness 把这些做成了一组可组合的插件，你只装你需要的那几个。

## 核心特性

**一切皆插件**  
CLI、Web UI、桌面端共用同一套插件；同一个插件在三端行为一致。不想要的功能直接不挂载，不会在界面里留下死按钮。

**多端一致**  
- **CLI**：`xxh` 命令行，适合脚本化与远程 SSH
- **Web UI**：浏览器界面，`xxh web` 一条命令启动
- **桌面端**：Electron 打包，自带终端、文件树、文档预览与沙箱浏览器

**完整的工具执行环境**  
内置的命令执行带沙箱隔离与审批闸门；文件读写、代码搜索、网页抓取、Office 文档处理均为独立插件，可单独替换。

**智能体编排**  
子智能体（subagent）、工作流（workflow）、技能（skills）、任务计划与 Ralph 循环——复杂的多步任务可以在框架层编排，而不是塞进一段超长的提示词。

**可观测与可干预**  
每一次工具调用、每一步推理都落成可回放的事件记录；危险操作在审批闸门前停下等你确认，而不是事后才发现。

**开放协议**  
支持 MCP 客户端接入、ACP 协议、Python SDK，外部工具与第三方界面都能接进来。

## 快速开始

需要 Node.js（建议 20 以上）与 pnpm。

### 从源码运行

```sh
git clone https://github.com/Shamnick/Xiaoxiao-Harness.git
cd Xiaoxiao-Harness
pnpm install
pnpm run build
pnpm xxh web
```

`pnpm run build` 会准备仓库产物，`pnpm xxh web` 直接使用已构建产物，不会重新构建。

默认在 `http://127.0.0.1:3080` 启动 Web UI 并自动打开浏览器。通过 SSH 启动时只打印宿主机 URL（本地转发地址由 SSH 客户端持有）。传 `--no-open` 可只启服务不开浏览器。

### 桌面端

```sh
pnpm run dev:desktop        # 开发模式
pnpm run build:desktop      # 构建
```

桌面端打包与签名见 [apps/desktop](apps/desktop)。

## 插件生态

插件是独立发布的 npm 包，通过 `cordis.yml` 挂载。写一个插件只需导出一个 `apply` 函数：

```ts
export const inject = ['slots']
export function apply(ctx) {
  ctx.slots.register({ name: 'sidebar.brand.mark' }, MyBrandMark)
}
```

想换界面品牌、加一个工具、接一个新模型提供商，都不需要动框架代码。

给插件仓库加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题便于被发现。

## 文档

- [使用指南](docs/user/guide/index.zh.md)
- [架构说明](docs/architecture.zh.md)
- [开发指南](docs/development.zh.md)
- [安全说明](SAFETY.zh.md)

面向 agent 的编码约定见 [AGENTS.md](AGENTS.md)。

## 二开工具包

本仓库的 [`tools/rebrand/`](tools/rebrand/) 收录了把这套框架改造成自有品牌产品所需的工具：改名清单（区分品牌名 / 服务端点 / 路径标识符三类）、MIT 许可声明模板、改名与复核脚本、品牌插件脚手架。

## 参与贡献

参见 [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md)。

## 许可与致谢

本项目依 [MIT](LICENSE) 许可证发布。

本项目包含来自 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的源代码，
版权归 DeepSeek 所有（`Copyright (c) 2026 DeepSeek`），同样依 MIT 许可证授权。
完整的第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

"DeepSeek Harness" 是深度求索公司的注册商标。本项目与深度求索公司无隶属关系，
亦不代表任何官方背书或合作；本项目仅在其源代码依 MIT 许可证授权的前提下使用该代码。
