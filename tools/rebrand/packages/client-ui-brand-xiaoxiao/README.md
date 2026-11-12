# @xiaoxiao/dsh-client-ui-brand-xiaoxiao

替换 dsh Web 客户端侧栏品牌视觉的 Cordis 插件脚手架。

## 为什么用插件，而不是改上游源码

`@deepseek-ai/dsh-client-ui-brand-official` 是一个**纯插槽占用者**，实测其编译产物只做这一件事：

```js
inject = ["slots"]
function apply(ctx) {
  ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.inject("sidebar.brand.name", function* () {
    yield ctx.slots.register({ name: "sidebar.brand.mark" }, OfficialBrandMark);  // FishLogo
    yield ctx.slots.register({ name: "sidebar.brand.name" }, OfficialBrandName);  // BrandWordmark
  }));
}
```

这是 dsh "Everything is a Plugin" 设计里最干净的一个缝：**换品牌 = 换占用者**。

| | 改上游源码 | 换插件（本方案） |
|---|---|---|
| 上游 `git pull` | 每次冲突，要手动解 | 零冲突 |
| 升级到新版 | 要重新打补丁 | 直接跟上游 |
| 品牌资源散落 | 需全局搜索替换，容易漏 | 集中在一个包 |
| 回滚 | 手动还原 | 停用插件即可 |

## 文件结构

```
client-ui-brand-xiaoxiao/
├── package.json              # name / exports / peerDependencies
├── src/
│   ├── index.ts              # Host 半：空声明（品牌只在浏览器侧生效）
│   └── client/
│       ├── index.ts          # 注册 sidebar.brand.mark / sidebar.brand.name
│       └── Brand.tsx         # BrandMark（SVG） + BrandName（文字）
└── locale/
    ├── zh.json              # 插件元信息（设置页展示用）
    └── en.json
```

## 改造三步

### 1. 换名字

`src/client/Brand.tsx`：

```ts
export const BRAND_NAME = 'Xiaoxiao'      // ← 你的品牌名
export const BRAND_COLOR = '#2F6FEB'  // ← 你的主色
```

### 2. 换图形

`src/client/Brand.tsx` 里 `BrandMark` 的 SVG。保持 `viewBox="0 0 24 24"` 即可自适应宿主给的 `size`：

```tsx
<svg width={size} height={size} viewBox="0 0 24 24" ...>
  {/* 把你自己的 path 放这里 */}
</svg>
```

> 别从上游 `dsh-client-ui-primitives` 里 import `FishLogo` / `BrandWordmark` —— 那是 DeepSeek 的商标视觉，你自己的产品不该带。

### 3. 换 scope

`package.json` 的 `name`：`@xiaoxiao/dsh-client-ui-brand-xiaoxiao` → 你的 scope。

## 构建

从源码跑 dsh 的 monorepo 时，把本目录放进 `packages/` 下，然后：

```bash
pnpm install
pnpm run build
```

dsh 的构建会把双半插件（node 半 + browser 半）分别产出到 `lib/index.js` 与 `lib/client.js`，与上游 official 包的产物形态一致。

## 挂载：停用官方、启用自己

在 dsh 的 Cordis 配置里做两件事：

```yaml
# 停用官方品牌 occupant
- disabled:
    - '@deepseek-ai/dsh-client-ui-brand-official'

# 挂载你的
- add:
    - '@xiaoxiao/dsh-client-ui-brand-xiaoxiao'
```

> 具体写在哪个配置文件取决于你的部署形态：
> - **从源码构建**：改 `apps/` 下对应 profile 的 cordis 配置 / 默认插件清单
> - **用已安装的桌面版**：配置在用户数据目录下（`~/.deepseek-harness/` 一类位置），
>   用 `ls ~/.deepseek-harness/` 找 `cordis.yml` 或 profile 相关文件
>
> 不确定时，先在 `dsh` 的 Web UI「设置 → 插件」里找到 `brand-official` 条目，
> 界面上停用它，再安装本插件 —— 插件管理页会显示实际生效的插件清单，
> 照着那个清单去改配置文件最稳。

## 验证

启动后确认三处：

- 侧栏左上角的图标是自己的
- 图标右侧文字是 Xiaoxiao
- 设置 → 插件里 `brand-official` 显示为已停用

再跑一次 `scripts/verify.sh` 复核无品牌残留。

## 注意

- **不要动 `sidebar.brand.*` 这两个插槽名**，那是上游契约。
- `dsh-brand` 包跟视觉品牌无关（它是 TypeScript 标称类型工具），别去改它。
- 如果你的产品还要换 Web 端的「关于/欢迎页」文案，那部分文案在上游是编译进 `lib/main.js` 的 locale 表，不在插件体系内 —— 见 `REBRAND-CHECKLIST.md` §1.1。
