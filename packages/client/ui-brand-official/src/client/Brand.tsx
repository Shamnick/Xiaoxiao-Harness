import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { BrandWordmark } from '@deepseek-ai/dsh-client-ui-primitives'

/** 品牌展示名。 */
const BRAND_NAME = 'Xiaoxiao'

/**
 * 渲染品牌图标（侧栏 mark 插槽）：三层同心环 + 实心核心。
 * viewBox 固定 0 0 24 24 以适配宿主给出的任意 size。
 * @param props - 宿主提供的 mark 展示参数。
 */
export function OfficialBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={BRAND_NAME}
      style={{ flex: '0 0 auto' }}
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="5.2" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />
    </svg>
  )
}

/**
 * 渲染品牌名字标识（侧栏 name 插槽）。
 *
 * 复用 BrandWordmark 以带上 HARNESS 品类徽章；mark 由独立插槽承担，
 * 所以这里关掉它自己的前置图标。
 */
export function OfficialBrandName() {
  return <BrandWordmark includeMark={false} size={22} />
}
