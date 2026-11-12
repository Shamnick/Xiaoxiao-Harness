# DeepSeek Harness (dsh) 二开改名清单

> 依据：上游 `deepseek-ai/deepseek-harness` @ MIT License，`Copyright (c) 2026 DeepSeek`。
> 本清单基于 **v0.2.2-rc.1 实际安装产物** 逐文件扫描得出（`/Applications/DeepSeek Harness.app/Contents/Resources/app`，332 个 `@deepseek-ai/*` 包、347 个文件命中 "DeepSeek"），不是凭经验列的。
> 本工具包已预设为 **Xiaoxiao Harness**，标识符：`Xiaoxiao`（产品名）/ `@xiaoxiao`（npm scope）/ `com.xiaoxiao.harness`（bundle id）/ `xxh`（CLI）。
> 若要换用其它名字，把 `Xiaoxiao` 与 `xiaoxiao` 一次性替换成新名即可（注意 `harness` 后缀保留，`DeepSeek` 前缀禁用）。

---

## 0. 先看这一条，否则产品会被改坏

全局执行 `sed -i 's/DeepSeek/Xiaoxiao/g'` **会炸掉产品**。原因是 "DeepSeek" 这四个字在代码里承担了三种互不相干的角色：

| 类 | 角色 | 处理 | 后果（如果误改） |
|---|---|---|---|
| **A** | 品牌 / 产品名 | **必须改** | — |
| **B** | 服务提供方（API 端点、模型客户端） | **禁止改** | 模型调用、联网搜索、登录全部失效 |
| **C** | 标识符 / 磁盘路径 / npm scope | **改但要迁移** | 旧数据丢失、配置失效、依赖解析失败 |

实测数据佐证：命中文件 347 个，但其中真正属于 A 类的集中在 **`lib/main.js`（197 处）+ 图标 + Info.plist + 打包配置**；`dsh-llm-deepseek`（95 处）、`dsh-client-ui-settings-account`（168 处）这些高命中的恰恰是 **B 类，一个字都不能动**。

---

## 1. A 类：品牌与产品名（要改）

### 1.1 桌面端文案 —— `Contents/Resources/app/lib/main.js`

这是品牌名最集中的地方：一个内嵌的 **8 语言 locale 表**（zh / en / ja / fr / es / de / pt / ru），每个语言约 10 个 key。实测锚点：

```js
aboutMenu: "DeepSeek Harness"          // "关于 DeepSeek Harness"
aboutProduct: "DeepSeek Harness"       // 关于面板产品名
hideApplication: "隐藏 DeepSeek Harness"
quitApplication: "退出 DeepSeek Harness"
quitTitle: "退出 DeepSeek Harness？"
openApplication: "打开 DeepSeek Harness"
updateTitle: "DeepSeek Harness 更新"
welcomeTitle: "DeepSeek Harness"       // 首次启动引导
welcomeBrand: "DeepSeek Harness"
welcomeTaglineBrand: "DeepSeek Harness" // 注意与 welcomeTaglineBefore 拼接，别拆断句子
```

**改法**（保留 8 语言结构，只换品牌名）：

```bash
# 先 dry-run 数命中了多少处
grep -c 'DeepSeek Harness' "Contents/Resources/app/lib/main.js"

# 备份后替换（仅替换完整品牌串 "DeepSeek Harness"）
cp lib/main.js lib/main.js.bak
python3 - <<'PY'
import re,pathlib
p = pathlib.Path("lib/main.js")
s = p.read_text()
s2, n = re.subn(r'DeepSeek Harness', 'Xiaoxiao', s)
p.write_text(s2)
print("replaced:", n)
PY
```

> 注意：这里**只**替换 `DeepSeek Harness` 全称，不碰单独的 `DeepSeek`——单独出现的多数属于 B 类。

### 1.2 应用图标

| 文件 | 说明 |
|---|---|
| `Contents/Resources/icon.icns` | macOS 图标集（多尺寸） |
| `Contents/Resources/icon.png` | 通用 PNG（打包/关于面板用） |

替换要求：icns 必须包含标准尺寸槽位，否则 macOS 会回退到低分辨率或显示空白。

```bash
# 从你的 1024x1024 源图生成完整 icns
mkdir -p Xiaoxiao.iconset
for s in 16 32 64 128 256 512; do
  sips -z $s $s xiaoxiao-1024.png --out Xiaoxiao.iconset/icon_${s}x${s}.png
  sips -z $((s*2)) $((s*2)) xiaoxiao-1024.png --out Xiaoxiao.iconset/icon_${s}x${s}@2x.png
done
iconutil -c icns Xiaoxiao.iconset -o icon.icns
cp icon.icns "Contents/Resources/icon.icns"
```

### 1.3 `Contents/Info.plist`

实测当前值：

| Key | 现值 | 改成 |
|---|---|---|
| `CFBundleIdentifier` | `com.deepseek.dsh` | `com.xiaoxiao.dsh`（属 C 类，见 §3） |
| `NSHumanReadableCopyright` | `Copyright © 2026 DeepSeek Harness` | `Copyright © 2026 Xiaoxiao` |
| `CFBundleName` / `CFBundleDisplayName` | DeepSeek Harness | Xiaoxiao |

```bash
/usr/libexec/PlistBuddy -c "Set :CFBundleName Xiaoxiao"             "Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Xiaoxiao"      "Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :NSHumanReadableCopyright"      "Copyright © 2026 Xiaoxiao" "Contents/Info.plist"
```

> ⚠️ 改完 `Info.plist` 必须重新签名，否则 macOS 拒绝启动（Gatekeeper / TCC 权限绑定签名）：
> ```bash
> codesign --force --deep --sign - "DeepSeek Harness.app"
> ```

### 1.4 源码侧的打包配置（从 GitHub 构建时才涉及）

从源码 `pnpm run build` 时，产品名来自 electron-builder 配置，通常在 `apps/desktop/` 或根 `package.json`：

```bash
# 在你的 fork 里定位
grep -rn "productName\|appId\|DeepSeek Harness" apps/desktop/package.json apps/desktop/electron-builder.* 2>/dev/null
```

把 `productName` 改成 `Xiaoxiao`、`appId` 改成 `com.xiaoxiao.dsh`。

### 1.5 侧栏品牌视觉（推荐用插件替换，别改源码）

见 §2，这是最干净的做法。

---

## 2. 品牌视觉的正确替换方式（零源码侵入）

### 2.1 机制（实测确认）

`@deepseek-ai/dsh-client-ui-brand-official` **不是**资源包，它是一个 **Cordis 插件**，只做一件事——占用两个 UI 插槽：

```js
// 实测 lib/client.js 内容（节选）
inject = ["slots"]
function apply(ctx) {
  ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.inject("sidebar.brand.name", function* () {
    yield ctx.slots.register({ name: "sidebar.brand.mark" }, OfficialBrandMark); // → FishLogo
    yield ctx.slots.register({ name: "sidebar.brand.name" }, OfficialBrandName); // → BrandWordmark
  }));
}
```

这完美契合 "Everything is a Plugin" 的架构：**换品牌 = 写一个自己的占用者插件，注册到同样两个 slot**，然后在配置里停用 official、启用你的。上游代码一行不改，`git pull` 零冲突。

### 2.2 别被包名骗了

| 包 | 实际用途 | 是视觉品牌吗 |
|---|---|---|
| `dsh-brand` | **TypeScript 标称类型**（`brandString` / `brandNumber`，编译期让 `SessionId` 不能传给 `ToolCallId`） | ❌ 完全无关 |
| `dsh-client-ui-brand-official` | 侧栏 logo + wordmark 插槽占用者 | ✅ 就是它 |

### 2.3 脚手架

已生成在 `packages/client-ui-brand-xiaoxiao/`，见该目录 README。核心三点：

1. `package.json` 里 `name` 用你的 scope，`peerDependencies` 保留 `@deepseek-ai/dsh-client-ui-primitives`
2. `client/Brand.tsx` 用你自己的 logo 组件替换 `FishLogo` / `BrandWordmark`
3. `cordis.yml` 里把 `brand-official` 停用、挂上你的

---

## 3. B 类：服务提供方（禁止改）

以下包名/字符串里的 `deepseek` 指向 **api.deepseek.com 等真实服务端点**，改动即功能失效：

| 包 | 作用 | 改名的后果 |
|---|---|---|
| `dsh-llm-deepseek` | DeepSeek 模型 API 客户端（95 处命中） | 模型全部调不通 |
| `dsh-web-deepseek-api` | DeepSeek Web API 桥 | 联网能力失效 |
| `dsh-web-search-deepseek` | DeepSeek 联网搜索 provider | 搜索失效 |
| `dsh-session-log-deepseek` | 会话日志上报 | 上报失败 |
| `dsh-llm-deepseek-account` | 账号鉴权 | 登录失效 |
| `dsh-client-ui-settings-account` | "Manage DeepSeek login and open Platform billing pages"（168 处命中） | 账号/计费页异常 |

**决策建议**：

- 如果你**继续用 DeepSeek 的模型 API**：这些包保持原名原样，只在 UI 层换品牌。用户看到的是你的名字，底层调 DeepSeek API——这是绝大多数二开产品的做法。
- 如果你要**换成别家模型**（OpenAI / 自建 vLLM / 通义等）：不要改这些包，而是**新增**你自己的 `dsh-llm-<provider>` 插件并在配置里替换掉 `dsh-llm-deepseek`。`dsh-llm-*` 是 provider 插槽体系，本来就设计成可换的。
- `dsh-client-ui-settings-account` 如果你没有 DeepSeek 账号体系，直接**不挂载**这个插件（它会凭空出现"登录 DeepSeek"入口，很怪）。

---

## 4. C 类：标识符与路径（改要迁移）

| 标识符 | 现值 | 风险 |
|---|---|---|
| `appId` / `CFBundleIdentifier` | `com.deepseek.dsh` | macOS 视为全新应用：旧偏好、钥匙串条目、TCC 授权、单实例锁全部失效 |
| 数据目录 | `~/.deepseek-harness`（`dsh-home-paths` 生成） | 改名后旧配置/会话/凭据读不到 |
| npm scope | `@deepseek-ai/*`（332 个包） | 改 scope 必须**整仓全改 + 重新 install**，漏一个就 `MODULE_NOT_FOUND` |
| 内部引导标识 | `__DSH_BOOT__` 等 | 属实现细节，**别碰** |

**建议**：`appId` 和数据目录在**第一版发布前**就定死，之后别再动。已有用户就写迁移脚本（拷贝旧目录到新目录 + 版本号检测）。

关于 npm scope：**如果你只是 fork 自己维护，保留 `@deepseek-ai/` scope 完全合法**（MIT 不限制），社区插件也能继续兼容。只有当你打算发布自己的 npm 包时才需要改 scope——那时建议用 `pnpm` 的 workspace 引用而不是 npm 发布。

---

## 5. 执行顺序

> ⚠️ **先选对基线**：不要拿本机这个已安装的 `.app` 当二开源码。实测它的 `Contents/Resources/app` 下有
> **64 个 `*.dshpurge.bak`**（本地工具 patch 过提示词层与代码），bundle 内 22171 个文件在签名之后被改写，
> 因此 `codesign --verify --deep` 报 `a sealed resource is missing or invalid`。
> 二开基线必须从 `https://github.com/deepseek-ai/deepseek-harness` 的**干净源码** fork。

```
0. 干净基线                git clone https://github.com/deepseek-ai/deepseek-harness.git
1. fork + 锁版本           git tag v0.2.2-xiaoxiao.1 && git checkout -b xiaoxiao
2. 改图标 + Info.plist      §1.2 §1.3
3. 改 lib/main.js locale    §1.1
4. 做品牌插件，停用 official §2
5. 决定 provider 策略        §3（继续用 DeepSeek API 则跳过）
6. 放 NOTICES.md            §6
7. codesign --force --deep --sign -
8. 跑 verify.sh 验证         §7
```

## 6. 不可跳过的一步：MIT 许可声明

MIT 的唯一实质义务是把版权声明和许可声明**带进你的发行物**。见同目录 `NOTICES.md` 模板，务必让用户在"关于 → 开源许可"里能看到。

## 7. 验证清单

改完后逐项确认（`scripts/verify.sh` 可自动跑前 6 项）：

- [ ] 启动无签名报错（`codesign -v`）
- [ ] 关于面板显示 Xiaoxiao，无 "DeepSeek Harness" 残留
- [ ] 8 个语言的菜单文案都改了（切语言看 File / 关于菜单）
- [ ] 退出确认对话框品牌正确
- [ ] 侧栏 logo 是自己的
- [ ] B 类功能正常：模型对话、联网搜索、账号页
- [ ] `NOTICES.md` 可访问
- [ ] `grep -c "DeepSeek Harness"` 结果为 0（排除 NOTICES/LICENSE）

## 8. 商标边界（重复一次，因为是真实风险）

上游 `BRAND_GUIDELINES.zh.md` 明确：

> "DeepSeek Harness" 是深度求索公司的注册商标，未经授权用于项目名，容易引发用户的误解和混淆……同时，也可能涉及商标侵权行为。

允许：项目描述里写"基于 DeepSeek Harness 构建"、用缩写 "DSH"。禁止：产品名叫 "DeepSeek Harness"、用其 logo、暗示官方背书。
**你要换成 Xiaoxiao，正好是官方指南鼓励的方向。**
