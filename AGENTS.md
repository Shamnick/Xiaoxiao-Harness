# AGENTS.md — 本项目工作约定

## 项目定位

**Xiaoxiao Harness** —— 基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（MIT，`Copyright (c) 2026 DeepSeek`）的二开产品。

本仓库存放二开所需的工具包：改名清单、许可声明模板、改名/复核脚本、品牌插件脚手架。

## 推送规则（硬约束）

**每次完成更新后必须提交并推送到远程仓库**，不要留在本地：

```bash
git add -A
git commit -m "<说明这次改了什么>"
git push
```

- 远程：`https://github.com/Shamnick/Xiaoxiao-Harness.git`
- 分支：`main`（已设置 upstream，直接 `git push` 即可）
- 提交前先 `git status` 确认没有误加无关文件（本仓库根是 `rebrand-kit/`，
  工作区同级目录 `claude-risk` / `clone-ytkj` / `doubao-gateway` 等属于其它项目，**不要**纳入本仓库）

## 网络配置（已固化，勿删）

本机直连 `github.com` 会出现 `Error in the HTTP2 framing layer`（git 的 HTTP/2 与链路不兼容），必须走本地代理：

```bash
git config --local http.proxy   http://127.0.0.1:7890
git config --local https.proxy  http://127.0.0.1:7890
git config --local http.version HTTP/1.1
```

这些是 `--local` 配置，只作用于本仓库，已提交在 `.git/config`（不随仓库分发，新克隆需重配）。

判断依据：`curl -x http://127.0.0.1:7890 https://github.com` 返回 200 且耗时 <1s，
而直连 `git ls-remote` 会卡住 60s+ 后报 HTTP2 framing 错误。

> 注意：macOS 没有 `timeout` 命令（那是 GNU coreutils），用 `timeout` 测连通性会误报失败。

## git 身份

```bash
git config --local user.name  "Shamnick"
git config --local user.email "131834928+Shamnick@users.noreply.github.com"
```

用 GitHub noreply 邮箱，避免公开真实邮箱。

## 品牌标识符（改名前先核对）

| 项 | 值 |
|---|---|
| 产品名 | Xiaoxiao Harness |
| 缩写 | XH |
| CLI | `xxh` |
| bundle id | `com.xiaoxiao.harness` |
| npm scope | `@xiaoxiao` |

**禁用**：`DeepSeek Harness`（注册商标）、`DSH`（官方生态缩写）、`dsh`（上游 CLI 名）、
任何含 `Deep` / `Seek` 的前后缀组合。

## 改动前必读

改任何文件名或替换品牌字符串前，先读 `REBRAND-CHECKLIST.md` §0——
`DeepSeek` 在代码里有三种角色（品牌名 / API 服务端点 / 路径标识符），
全局替换会把产品改废。改完跑 `scripts/verify.sh` 复核。
