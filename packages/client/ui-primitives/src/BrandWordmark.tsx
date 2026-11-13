import type { IconProps } from './icons/props.ts'

/** Display options for the brand wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading mark before the name; defaults to true. */
  includeMark?: boolean | undefined
}

/** Product name rendered by the wordmark. */
const BRAND_NAME = 'Xiaoxiao'

/** Product category badge rendered in a filled pill after the name. */
const BRAND_BADGE = 'HARNESS'

/**
 * Render the brand wordmark: mark, name, and the product-category badge.
 *
 * Widths follow the historical 182 / 156 units so existing layout math and
 * tests keep working; only the internal proportions were reworked.
 * @param props.size - height in px (default 24; width follows the selected artwork).
 * @param props.className - extra class for layout placement.
 * @param props.includeMark - whether to include the leading mark.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  const width = includeMark ? 182 : 156
  const startX = includeMark ? 36 : 26
  return (
    <svg
      width={(size * width) / 24}
      height={size}
      className={className}
      viewBox={includeMark ? '0 0 182 24' : '26 0 156 24'}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="xx-wordmark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.72" />
        </linearGradient>
      </defs>
      {includeMark && (
        <g transform="translate(4 3)">
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="9" cy="9" r="4.4" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
          <circle cx="9" cy="9" r="1.9" fill="currentColor" />
        </g>
      )}
      <text
        x={startX}
        y="17.4"
        fill="url(#xx-wordmark-fill)"
        fontFamily="Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
        fontSize="17.5"
        fontWeight="700"
        letterSpacing="-0.2"
      >
        {BRAND_NAME}
      </text>
      {/* Category badge: filled pill in the current colour, inverted label. */}
      <g transform={`translate(${startX + 76} 5.5)`}>
        <rect width="50" height="13" rx="3.2" fill="currentColor" />
        <text
          x="25"
          y="9.9"
          textAnchor="middle"
          fill="var(--dsw-alias-label-primary-inverted, #111)"
          fontFamily="Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
          fontSize="8.2"
          fontWeight="700"
          letterSpacing="0.8"
        >
          {BRAND_BADGE}
        </text>
      </g>
    </svg>
  )
}
