import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/** 品牌展示名。改这里即可全局替换侧栏文字。 */
const BRAND_NAME = 'Xiaoxiao'

/** 品牌主色。 */
const BRAND_COLOR = '#2F6FEB'

/**
 * 渲染品牌图标（侧栏 mark 插槽）。
 *
 * 不继承上游的鲸鱼标识，改用自有 SVG，避免携带上游商标视觉。
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
      <circle cx="12" cy="12" r="9" stroke={BRAND_COLOR} strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" fill={BRAND_COLOR} />
    </svg>
  )
}

/**
 * 渲染品牌文字标识（不含 mark，mark 由独立插槽承担）。
 */
export function OfficialBrandName() {
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
