/**
 * Xiaoxiao 侧栏品牌组件。
 *
 * 对应上游 @deepseek-ai/dsh-client-ui-brand-official 的：
 *   OfficialBrandMark({ size })  → FishLogo
 *   OfficialBrandName()          → BrandWordmark({ includeMark: false })
 *
 * 这里不依赖 dsh-client-ui-primitives 的 FishLogo / BrandWordmark，
 * 而是用自有 SVG + 文字实现，避免继承任何上游商标视觉。
 */
import type { JSX } from 'react'

/** 品牌展示名。改这里就能换掉所有侧栏文案。 */
export const BRAND_NAME = 'Xiaoxiao'

/** 品牌主色。 */
export const BRAND_COLOR = '#2F6FEB'

/** 插槽 props：由宿主界面传入期望尺寸。 */
export interface BrandMarkProps {
  /** 边长（px）。宿主会按侧栏布局给出建议值。 */
  size?: number
}

/**
 * 渲染品牌图标。
 *
 * 替换成你自己的 logo：把下面的 path 换成你的 SVG 路径数据即可。
 * 保持 viewBox="0 0 24 24" 可以自适应任意 size。
 */
export function BrandMark({ size = 20 }: BrandMarkProps): JSX.Element {
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
      {/* 示例几何标识：一个圆环 + 中心点。换成你自己的图形。 */}
      <circle cx="12" cy="12" r="9" stroke={BRAND_COLOR} strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" fill={BRAND_COLOR} />
    </svg>
  )
}

/**
 * 渲染品牌文字标识（不含 mark，mark 由独立插槽承担）。
 */
export function BrandName(): JSX.Element {
  return (
    <span
      style={{
        fontWeight: 600,
        fontSize: '0.9375rem',
        letterSpacing: '0.01em',
        color: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {BRAND_NAME}
    </span>
  )
}
