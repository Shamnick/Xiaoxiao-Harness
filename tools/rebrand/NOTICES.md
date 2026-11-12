<!--
  用法：把本文件复制为你的发行物根目录 NOTICES.md（或 THIRD-PARTY-NOTICES.md）。
  本文件已按 Xiaoxiao 预设；若换品牌，把 Xiaoxiao 替换成你的品牌名，{VERSION} 换成你的版本号。
  然后在你的产品「关于 → 开源许可」里放一个入口指向它。
  这是 MIT 许可证的**唯一实质义务**，不要省略。
-->

# 开源许可声明

本产品（Xiaoxiao {VERSION}）包含基于 **DeepSeek Harness** 的源代码。

---

## 1. 上游许可：MIT License

本产品所包含的 DeepSeek Harness 代码依 MIT 许可证授权：

```
MIT License

Copyright (c) 2026 DeepSeek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

上游项目：https://github.com/deepseek-ai/deepseek-harness

### 关于商标

"DeepSeek Harness" 是深度求索公司的注册商标。本产品仅在其源代码依 MIT
许可证授权的前提下使用该代码；**本产品名称、标识与深度求索公司无关，亦不代表
任何官方背书、合作或授权关系**。

---

## 2. 第三方组件

DeepSeek Harness 依赖大量第三方开源组件，各自保留其原有许可证。以下为
需要**特别注意**的类别（完整清单见随附的 `THIRD_PARTY_NOTICES.md`）：

### 2.1 需要保留 NOTICE 文件的组件（Apache-2.0）

Apache-2.0 第 4(d) 条要求：若原组件提供 NOTICE 文件，再分发时必须一并保留。

涉及组件包括（部分）：

| 组件 | 用途 |
|---|---|
| `@opentelemetry/*`（api / core / sdk-logs / resources / otlp-*） | 可观测性 |
| `@playwright/mcp` | 浏览器自动化 MCP |
| `@openai/codex` | Codex 集成 |
| `@agentclientprotocol/sdk` | ACP 协议 |
| `@botiverse/oar` | — |
| `chrome-devtools-mcp` | DevTools 集成 |
| `@puppeteer/browsers` | 浏览器下载 |
| `eslint-visitor-keys` | — |

### 2.2 文件级 copyleft（MPL-2.0）

| 组件 | 说明 |
|---|---|
| `@deepseek-ai/libreoffice-kit` | **如果你修改了其中任何源文件**，该文件的修改版必须以 MPL-2.0 公开。仅调用、不修改则无此义务。 |
| `dompurify` | 双许可 `MPL-2.0 OR Apache-2.0`，选 Apache-2.0 分支可规避 MPL 义务。 |

### 2.3 特殊条款 —— 商用前必须单独确认

| 组件 | 许可证声明 | 说明 |
|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | `SEE LICENSE IN README.md` | **不是标准开源许可证**，适用 Anthropic 自有条款。它是可选挂载的插件，**不启用即可规避**；若你的产品要包含 Claude 相关能力，须单独阅读并遵守其条款。 |

### 2.4 BSD / ISC 类（需保留版权声明）

`diff`、`chrome-devtools-frontend`、`node-addon-system`（BSD-3-Clause）、
`@yarnpkg/parsers`、`eslint-scope`（BSD-2-Clause）、`@js-temporal/polyfill`、
`hosted-git-info`（ISC）等。

---

## 3. 如何重新生成完整清单

上游提供了生成脚本，直接复用即可：

```bash
pnpm run gen-third-party-notices      # 重新生成 THIRD_PARTY_NOTICES.md
pnpm run verify-third-party-notices   # 校验已提交内容与生成结果一致
```

完整依赖闭包锁定在 `pnpm-lock.yaml`，可用 `pnpm licenses list` 逐条导出：

```bash
pnpm licenses list --json > licenses.json
```

**注意**：`THIRD_PARTY_NOTICES.md` 是生成产物，不要手改——改依赖后重新跑生成脚本。

---

## 4. 我的修改

本产品对上游代码所做的修改：

- 品牌名称、图标与界面文案（Xiaoxiao）
- 侧栏品牌视觉插件（替换 `dsh-client-ui-brand-official`）
- 打包标识符（`com.xiaoxiao.dsh`）
- {在此补充你其余的实质性修改}

上述修改依 MIT 许可证授权，可自由使用、修改、再分发。

---

*本文件由 Xiaoxiao 维护。如发现许可声明有遗漏，请联系 {你的联系邮箱}。*
