import type { IconProps } from './icons/props.ts'

/** Display options for the brand wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading mark before the name; defaults to true. */
  includeMark?: boolean | undefined
}

/** Product name rendered by the wordmark. */
const BRAND_NAME = 'Xiaoxiao'

/** Product category badge rendered after the name. */
const BRAND_BADGE = 'HARNESS'

/**
 * Render the brand wordmark: mark, name, and the product-category badge.
 *
 * The name is set in a fixed stack rather than a webfont: the mark ships in the
 * client bundle, so a fallback face would change the wordmark's width and
 * rhythm on any machine missing the first family.
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
  const startX = includeMark ? 34 : 26
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
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.78" />
        </linearGradient>
      </defs>
      {includeMark && (
        /* Open frame holding a solid core: the harness and the work inside it. */
        <g transform="translate(2 4) scale(0.68)">
          <rect x="3.1" y="3.1" width="17.8" height="17.8" rx="5.2" stroke="currentColor" strokeWidth="2.1" />
          <rect x="8.4" y="8.4" width="7.2" height="7.2" rx="2.2" fill="currentColor" />
        </g>
      )}
      <text
        x={startX}
        y="17.6"
        fill="url(#xx-wordmark-fill)"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
        fontSize="18"
        fontWeight="800"
        letterSpacing="-0.75"
        textLength="80"
        lengthAdjust="spacing"
      >
        {BRAND_NAME}
      </text>
      {/* Category badge: hairline outline, so it reads as a label rather than a button. */}
      <g transform={`translate(${String(startX + 86)} 6.4)`}>
        <rect width="56" height="12" rx="3" stroke="currentColor" strokeWidth="0.9" opacity="0.62" />
        <text
          x="28"
          y="9.1"
          textAnchor="middle"
          fill="currentColor"
          opacity="0.82"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
          fontSize="7.4"
          fontWeight="700"
          letterSpacing="1.05"
        >
          {BRAND_BADGE}
        </text>
      </g>
    </svg>
  )
}
