# dsh 二开改品牌工具包

给 DeepSeek Harness（`dsh`）换自己品牌、商用发布的可执行工具包。

> **许可前提**：上游是 MIT，`Copyright (c) 2026 DeepSeek`。商用、闭源、改名、卖钱全部允许，唯一义务是保留版权与许可声明。
> **商标边界**：`DeepSeek Harness` 是注册商标，不能用作你的产品名 —— 换自己品牌正好是官方指南鼓励的做法。

## 一句话结论

代码可以随便用、随便改、随便卖；**产品名必须换掉**，而换名有个坑：`DeepSeek` 这四个字在代码里同时是"品牌名""API 服务端点""磁盘路径"三种角色，全局替换会把产品改废。

## 内容

| 文件 | 用途 |
|---|---|
| [`REBRAND-CHECKLIST.md`](REBRAND-CHECKLIST.md) | **核心**。A/B/C 三类改名清单，精确到文件与字符串锚点 |
| [`NOTICES.md`](NOTICES.md) | 开源许可声明模板，MIT 义务的落地形态 |
| [`scripts/rebrand.sh`](scripts/rebrand.sh) | 桌面端改名脚本，默认 dry-run，自动备份，支持回滚 |
| [`scripts/verify.sh`](scripts/verify.sh) | 改名后复核：A 类清零 / B 类完好 / 签名有效 / 声明在位 |
| [`packages/client-ui-brand-xiaoxiao/`](packages/client-ui-brand-xiaoxiao/) | 侧栏品牌插件脚手架，替代官方 brand occupant |

## 快速开始

```bash
# 1. 先看清单，理解 A/B/C 三类的区别（这一步别跳）
open REBRAND-CHECKLIST.md

# 2. 预览改名影响（不改任何文件）
./scripts/rebrand.sh --app "/Applications/DeepSeek Harness.app" --brand Xiaoxiao

# 3. 确认后执行
./scripts/rebrand.sh --app "/Applications/DeepSeek Harness.app" --brand Xiaoxiao --apply

# 4. 换侧栏品牌插件（见 packages/client-ui-brand-xiaoxiao/README.md）

# 5. 复核
./scripts/verify.sh --app "/Applications/DeepSeek Harness.app" --brand Xiaoxiao

# 出问题随时回滚
./scripts/rebrand.sh --app "/Applications/DeepSeek Harness.app" --rollback
```

## 三个必须知道的事实

**1. `dsh-brand` 不是品牌包**

它叫 brand，但作用是 TypeScript 标称类型（让 `SessionId` 不能当 `ToolCallId` 传）。改它没有任何视觉效果。真正的视觉品牌在 `dsh-client-ui-brand-official`。

**2. 侧栏品牌不需要改源码**

`dsh-client-ui-brand-official` 是个纯插槽占用者，只注册 `sidebar.brand.mark` 和 `sidebar.brand.name` 两个 slot。写个自己的插件注册同样两个 slot，停用官方的即可 —— 上游一行不改，`git pull` 零冲突。

**3. 大部分 "DeepSeek" 是不能改的**

实测 347 个文件命中，但 `dsh-llm-deepseek`（95 处）、`dsh-client-ui-settings-account`（168 处）这些高命中的全是 API 端点和账号体系。改了模型就调不通。

## 商用还需自查

- [ ] `@anthropic-ai/claude-agent-sdk` 是 `SEE LICENSE IN README.md`（非标准开源），商用前单独读其条款；不启用该插件即规避
- [ ] `@deepseek-ai/libreoffice-kit` 是 MPL-2.0，**改过的文件**要公开
- [ ] Apache-2.0 组件要保留 NOTICE
- [ ] `NOTICES.md` 能在产品里被用户访问到（「关于 → 开源许可」）
- [ ] 产品名、图标、宣传物料里不出现 "DeepSeek Harness" 商标

## 版本

基于 `@deepseek-ai/*@0.2.2-rc.1` 实测（`/Applications/DeepSeek Harness.app/Contents/Resources/app`，332 个包）。
上游处于 Developer Preview 阶段，声明会有破坏性变更 —— fork 后锁版本，别指望无缝跟上游。
