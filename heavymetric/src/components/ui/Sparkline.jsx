/**
 * Sparkline — micro line chart, pure SVG.
 * Props:
 *   data    number[]  — array of values
 *   color   string    — stroke color (default "#10B981")
 *   width   number    — viewBox width (default 56)
 *   height  number    — viewBox height (default 18)
 */
export default function Sparkline({ data = [], color = '#10B981', width = 56, height = 18 }) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
