#!/usr/bin/env bash
# verify.sh — 改名后复核：A 类清零、B 类完好、签名有效、许可声明在位
#
# 用法: ./verify.sh --app "/Applications/Xiaoxiao.app" --brand Xiaoxiao
#
set -uo pipefail

APP=""
BRAND=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app)   APP="$2"; shift 2 ;;
    --brand) BRAND="$2"; shift 2 ;;
    -h|--help) sed -n '2,5p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$APP" && -d "$APP" ]] || { echo "用法: $0 --app /path/to/App.app --brand Xiaoxiao" >&2; exit 2; }

RES="$APP/Contents/Resources"
MAIN="$RES/app/lib/main.js"
PLIST="$APP/Contents/Info.plist"
PKGS="$RES/app/dsh/node_modules/@deepseek-ai"

PASS=0; FAIL=0
ok()   { echo "  ✓ $*"; PASS=$((PASS+1)); }
bad()  { echo "  ✗ $*"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠ $*"; }

echo "═══════════════════════════════════════════════════"
echo " 复核: $APP"
echo "═══════════════════════════════════════════════════"

# ---------- 1. A 类残留 ----------
echo
echo "[1] A 类品牌残留"
if [[ -f "$MAIN" ]]; then
  N=$(grep -o "DeepSeek Harness" "$MAIN" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$N" -eq 0 ]]; then ok "lib/main.js 中 'DeepSeek Harness' 已清零"
  else bad "lib/main.js 仍有 $N 处 'DeepSeek Harness'"; fi
else
  bad "找不到 lib/main.js"
fi

if [[ -n "$BRAND" && -f "$MAIN" ]]; then
  M=$(grep -o "$BRAND" "$MAIN" 2>/dev/null | wc -l | tr -d ' ')
  [[ "$M" -gt 0 ]] && ok "新品牌 '$BRAND' 已出现 $M 处" || bad "新品牌 '$BRAND' 未出现"
fi

# 其它语言/位置的残留（排除文档与许可文件）
STRAY=$(grep -rl "DeepSeek Harness" "$RES/app/renderer" 2>/dev/null | head -3 || true)
[[ -z "$STRAY" ]] && ok "renderer 无品牌残留" || warn "renderer 仍有命中: $(echo "$STRAY" | tr '\n' ' ')"

# ---------- 2. B 类完好 ----------
echo
echo "[2] B 类服务组件完好（这些必须还在）"
if [[ -d "$PKGS" ]]; then
  for pkg in dsh-llm-deepseek dsh-web-search-deepseek dsh-session-log-deepseek dsh-web-deepseek-api dsh-llm-deepseek-account; do
    [[ -d "$PKGS/$pkg" ]] && ok "$pkg 在位" || warn "$pkg 不在（若你已换 provider 则正常）"
  done
else
  warn "未找到包目录，跳过"
fi

# ---------- 3. Info.plist ----------
echo
echo "[3] Info.plist"
if [[ -f "$PLIST" ]]; then
  NAME=$(/usr/libexec/PlistBuddy -c "Print :CFBundleName" "$PLIST" 2>/dev/null || echo "")
  COPY=$(/usr/libexec/PlistBuddy -c "Print :NSHumanReadableCopyright" "$PLIST" 2>/dev/null || echo "")
  BID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$PLIST" 2>/dev/null || echo "")
  echo "      CFBundleName             : $NAME"
  echo "      CFBundleIdentifier       : $BID"
  echo "      NSHumanReadableCopyright : $COPY"
  [[ -n "$BRAND" && "$NAME" == "$BRAND" ]] && ok "CFBundleName 已更新" || bad "CFBundleName 不是 '$BRAND'"
  [[ "$COPY" == *DeepSeek* ]] && bad "版权声明仍含 DeepSeek" || ok "版权声明已换"
  [[ "$BID" == com.deepseek.* ]] && warn "bundle id 仍是 ${BID}（属 C 类，改了要迁移数据）" || ok "bundle id 已换"
else
  bad "找不到 Info.plist"
fi

# ---------- 4. 签名 ----------
echo
echo "[4] 代码签名"
# 先看是否有签名，再看完整性——两者失败含义完全不同，不能混为一谈
SIG_INFO=$(codesign -dv "$APP" 2>&1 || true)
if echo "$SIG_INFO" | grep -q "Signature size"; then
  echo "$SIG_INFO" | grep -E "Identifier|TeamIdentifier|Timestamp" | sed 's/^/      /'
  if codesign --verify --deep "$APP" 2>/dev/null; then
    ok "签名完整有效"
  else
    bad "签名存在但 sealed resource 失效（bundle 内容被改动）→ codesign --force --deep --sign - \"$APP\" 重新签名"
  fi
else
  bad "应用未签名 → codesign --force --deep --sign - \"$APP\""
fi

# 诊断：bundle 内是否被第三方工具 patch 过（这会导致 sealed resource 失效）
PATCHED=$(find "$APP" -name "*.dshpurge.bak" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$PATCHED" -gt 0 ]]; then
  warn "检测到 $PATCHED 个 *.dshpurge.bak —— 该安装已被本地工具 patch 过，签名必然失效"
  warn "  这不是你的改名操作造成的。二开基线应从 GitHub 干净源码 fork，别复用被 patch 的安装。"
fi

# ---------- 5. 图标 ----------
echo
echo "[5] 图标"
if [[ -f "$RES/icon.icns" ]]; then
  SZ=$(stat -f%z "$RES/icon.icns" 2>/dev/null || echo 0)
  if [[ "$SZ" -gt 100000 ]]; then ok "icon.icns 存在 (${SZ} bytes)"
  else warn "icon.icns 偏小 (${SZ} bytes)，可能不是完整多尺寸图标集"; fi
else
  bad "缺少 icon.icns"
fi

# ---------- 6. 许可声明 ----------
echo
echo "[6] MIT 许可声明（不可省略）"
FOUND=0
for cand in "$RES/NOTICES.md" "$RES/THIRD-PARTY-NOTICES.md" "$RES/app/NOTICES.md" "$RES/app/THIRD_PARTY_NOTICES.md"; do
  [[ -f "$cand" ]] && { ok "找到 $(basename "$cand")"; FOUND=1; }
done
if [[ $FOUND -eq 0 ]]; then
  bad "未找到 NOTICES.md —— MIT 要求版权声明与许可声明随发行物分发"
fi

if [[ -f "$RES/app/THIRD_PARTY_NOTICES.md" ]]; then
  ok "上游 THIRD_PARTY_NOTICES.md 在位"
else
  warn "未见上游 THIRD_PARTY_NOTICES.md，确认第三方声明已合并进你的 NOTICES"
fi

# ---------- 汇总 ----------
echo
echo "═══════════════════════════════════════════════════"
echo " 通过 $PASS 项，失败 $FAIL 项"
[[ $FAIL -eq 0 ]] && echo " 状态: 可以打包发布" || echo " 状态: 有 $FAIL 项待处理"
echo "═══════════════════════════════════════════════════"
exit $(( FAIL > 0 ? 1 : 0 ))
