#!/usr/bin/env bash
# scan-brand-residue.sh — 扫描用户可见层残留的上游品牌。
#
# 只查产品名 "DeepSeek Harness"（不是所有 DeepSeek）。
# DeepSeek API / DeepSeek Search 等服务名是有意保留的：用户需要知道在配哪个服务。
#
# 只查"用户能看见的东西"：客户端 locale 文案、桌面端 renderer（欢迎页/更新页）、
# 品牌 SVG 资源。不查 packages/*/package.json 的 description 和 README——
# 那些是内部元数据，改不改都不影响界面，而且改动面极大。
#
# 用法: ./tools/rebrand/scripts/scan-brand-residue.sh [仓库根]
# 退出码: 0 干净 / 1 有残留
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/../../.." && pwd)}"
cd "$ROOT" || exit 2

PATTERN='DeepSeek Harness'
found=0

section() { printf "\n\033[1m%s\033[0m\n" "$1"; }

hit() {
  local file="$1" count="$2"
  printf "  \033[31m%-58s %s 处\033[0m\n" "$file" "$count"
  found=$((found + count))
}

section "客户端 locale 文案（用户直接看到的字）"
while IFS= read -r f; do
  n=$(grep -cE "$PATTERN" "$f" 2>/dev/null | head -1); n=${n:-0}
  [ "$n" -gt 0 ] && hit "${f#$ROOT/}" "$n"
done < <(find packages/client -path '*/src/client/locales.ts' -not -path '*/node_modules/*' 2>/dev/null)

section "桌面端 shell 文案"
for f in apps/desktop/src/locale.ts apps/desktop/src/client/WelcomePage.tsx; do
  [ -f "$f" ] || continue
  n=$(grep -cE "$PATTERN" "$f" 2>/dev/null | head -1); n=${n:-0}
  [ "$n" -gt 0 ] && hit "$f" "$n"
done

section "桌面端 renderer（欢迎页 / 更新对话框）"
while IFS= read -r f; do
  n=$(grep -cE "$PATTERN" "$f" 2>/dev/null | head -1); n=${n:-0}
  [ "$n" -gt 0 ] && hit "${f#$ROOT/}" "$n"
done < <(find apps/desktop/renderer -type f \( -name '*.html' -o -name '*.css' -o -name '*.svg' -o -name '*.js' \) 2>/dev/null)

section "品牌图形资源"
for f in apps/desktop/resources/icon-macos.png apps/desktop/renderer/assets/welcome-brand.svg; do
  [ -f "$f" ] || continue
  # 二进制图标只查文件名与同目录说明；SVG 查文本内容
  case "$f" in
    *.svg)
      n=$(grep -c 'M213.743\|M22.9168\|M22.403\|dsh-wordmark-whale' "$f" 2>/dev/null | head -1)
      [ "$n" -gt 0 ] && hit "$f" "$n"
      ;;
  esac
done

printf "\n"
if [ "$found" -eq 0 ]; then
  printf "\033[32m✓ 用户可见层无上游品牌残留\033[0m\n"
  exit 0
else
  printf "\033[31m✗ 共 %s 处残留，见上\033[0m\n" "$found"
  printf "  提醒：packages/*/package.json 的 description 与 README 属内部元数据，不在本检查范围内。\n"
  exit 1
fi
