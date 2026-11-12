#!/usr/bin/env bash
# rebrand.sh — DeepSeek Harness 桌面端安全改名脚本
#
# 设计原则：只改 A 类（品牌/产品名），绝不触碰 B 类（服务端点）与 C 类（标识符）。
# 默认 dry-run，必须显式 --apply 才落盘，且自动备份。
#
# 用法：
#   ./rebrand.sh --app "/Applications/DeepSeek Harness.app" --brand Xiaoxiao            # 预览
#   ./rebrand.sh --app "/Applications/DeepSeek Harness.app" --brand Xiaoxiao --apply     # 执行
#   ./rebrand.sh --app "/Applications/DeepSeek Harness.app" --rollback               # 回滚
#
set -euo pipefail

APP=""
BRAND=""
APPLY=0
ROLLBACK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app)      APP="$2"; shift 2 ;;
    --brand)    BRAND="$2"; shift 2 ;;
    --apply)    APPLY=1; shift ;;
    --rollback) ROLLBACK=1; shift ;;
    -h|--help)  sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$APP" ]] || { echo "缺少 --app" >&2; exit 2; }
[[ -d "$APP" ]] || { echo "路径不存在: $APP" >&2; exit 2; }

RES="$APP/Contents/Resources"
MAIN="$RES/app/lib/main.js"
PLIST="$APP/Contents/Info.plist"
BACKUP_DIR="$HOME/.xiaoxiao-rebrand-backup/$(date +%Y%m%d-%H%M%S)"

# ---------- 回滚 ----------
if [[ $ROLLBACK -eq 1 ]]; then
  LATEST="$(ls -1dt "$HOME"/.xiaoxiao-rebrand-backup/* 2>/dev/null | head -1 || true)"
  [[ -n "$LATEST" ]] || { echo "没有找到备份目录" >&2; exit 1; }
  echo "从 $LATEST 回滚…"
  [[ -f "$LATEST/main.js" ]] && cp "$LATEST/main.js" "$MAIN" && echo "  已恢复 main.js"
  [[ -f "$LATEST/Info.plist" ]] && cp "$LATEST/Info.plist" "$PLIST" && echo "  已恢复 Info.plist"
  [[ -f "$LATEST/icon.icns" ]] && cp "$LATEST/icon.icns" "$RES/icon.icns" && echo "  已恢复 icon.icns"
  echo "回滚完成。记得重新签名："
  echo "  codesign --force --deep --sign - \"$APP\""
  exit 0
fi

[[ -n "$BRAND" ]] || { echo "缺少 --brand" >&2; exit 2; }

echo "═══════════════════════════════════════════════════"
echo " 目标应用 : $APP"
echo " 新品牌名 : $BRAND"
echo " 模式     : $([[ $APPLY -eq 1 ]] && echo '执行（会落盘）' || echo '预览（dry-run）')"
echo "═══════════════════════════════════════════════════"
echo

# ---------- 预检：这是 dsh 应用吗 ----------
if [[ ! -f "$MAIN" ]]; then
  echo "✗ 找不到 $MAIN —— 这个路径不像 dsh 桌面端" >&2
  exit 1
fi
if ! grep -q "DeepSeek Harness" "$MAIN"; then
  echo "⚠ main.js 里没有 'DeepSeek Harness'，可能已经改过或版本不同" >&2
fi

# ---------- 统计 A 类命中 ----------
COUNT_BRAND=$(grep -o "DeepSeek Harness" "$MAIN" 2>/dev/null | wc -l | tr -d ' ')
echo "[1] lib/main.js"
echo "    'DeepSeek Harness' 命中 : $COUNT_BRAND 处  → 将替换为 '$BRAND'"

# ---------- 保护检查：B 类不能被误改 ----------
echo
echo "[2] B 类保护检查（这些字符串必须原样保留）"
PROBE_DIR="$RES/app/dsh/node_modules/@deepseek-ai"
if [[ -d "$PROBE_DIR" ]]; then
  BCLASS=(dsh-llm-deepseek dsh-web-search-deepseek dsh-session-log-deepseek dsh-web-deepseek-api)
  for pkg in "${BCLASS[@]}"; do
    if [[ -d "$PROBE_DIR/$pkg" ]]; then
      echo "    ✓ 保留 ${pkg}（服务端点，禁止改名）"
    fi
  done
else
  echo "    (未找到包目录，跳过)"
fi

# ---------- Info.plist ----------
echo
echo "[3] Info.plist"
if [[ -f "$PLIST" ]]; then
  CUR_NAME=$(/usr/libexec/PlistBuddy -c "Print :CFBundleName" "$PLIST" 2>/dev/null || echo "-")
  CUR_COPY=$(/usr/libexec/PlistBuddy -c "Print :NSHumanReadableCopyright" "$PLIST" 2>/dev/null || echo "-")
  echo "    CFBundleName              : $CUR_NAME  → $BRAND"
  echo "    NSHumanReadableCopyright  : $CUR_COPY  → Copyright © $(date +%Y) $BRAND"
else
  echo "    ✗ 找不到 Info.plist"
fi

# ---------- 图标 ----------
echo
echo "[4] 图标"
if [[ -f "$RES/icon.icns" ]]; then
  echo "    $RES/icon.icns 存在（$(du -h "$RES/icon.icns" | cut -f1)）"
  echo "    → 需要你手动替换成自己的 icns（用 sips + iconutil 生成，见 CHECKLIST §1.2）"
else
  echo "    (未找到 icon.icns)"
fi

# ---------- 落盘 ----------
if [[ $APPLY -eq 0 ]]; then
  echo
  echo "═══════════════════════════════════════════════════"
  echo " 预览结束，未修改任何文件。"
  echo " 确认无误后加 --apply 执行。"
  echo "═══════════════════════════════════════════════════"
  exit 0
fi

echo
echo "[5] 执行修改"
mkdir -p "$BACKUP_DIR"
cp "$MAIN" "$BACKUP_DIR/main.js"
[[ -f "$PLIST" ]] && cp "$PLIST" "$BACKUP_DIR/Info.plist"
[[ -f "$RES/icon.icns" ]] && cp "$RES/icon.icns" "$BACKUP_DIR/icon.icns"
echo "    备份已存: $BACKUP_DIR"

python3 - "$MAIN" "$BRAND" <<'PY'
import re, sys, pathlib
path, brand = sys.argv[1], sys.argv[2]
p = pathlib.Path(path)
s = p.read_text(encoding='utf-8')
s2, n = re.subn(r'DeepSeek Harness', brand, s)
p.write_text(s2, encoding='utf-8')
print(f"    main.js: 替换 {n} 处")
PY

if [[ -f "$PLIST" ]]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleName $BRAND" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :CFBundleName string $BRAND" "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $BRAND" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string $BRAND" "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :NSHumanReadableCopyright Copyright © $(date +%Y) $BRAND" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :NSHumanReadableCopyright string Copyright © $(date +%Y) $BRAND" "$PLIST"
  echo "    Info.plist: 已更新 3 项"
fi

echo
echo "[6] 重新签名（必须，否则 macOS 拒绝启动）"
codesign --force --deep --sign - "$APP" && echo "    ✓ 签名完成" || echo "    ✗ 签名失败，请手动处理"

echo
echo "═══════════════════════════════════════════════════"
echo " 完成。剩余手动步骤："
echo "   · 替换 Contents/Resources/icon.icns（自己的图标）"
echo "   · 更换侧栏品牌插件（见 packages/client-ui-brand-xiaoxiao/）"
echo "   · 放置 NOTICES.md 并在「关于」里加入口"
echo "   · 跑 verify.sh 复核"
echo " 回滚: $0 --app \"$APP\" --rollback"
echo "═══════════════════════════════════════════════════"
