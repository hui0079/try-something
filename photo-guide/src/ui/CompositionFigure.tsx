import type { FocalClass, SceneId } from '../data/types.ts'
import { figureCaption, figureKind, type FigureKind } from './compositionFigures.ts'

const ink = '#f4f0e6'
const gold = '#e6a04a'

export function CompositionFigure({ scene, focal }: { scene: SceneId; focal: FocalClass }) {
  const kind = figureKind(scene, focal)
  return (
    <figure className="composition-figure">
      <svg viewBox="0 0 300 188" role="img" aria-label={figureCaption(kind)}>
        <rect width="300" height="188" rx="16" fill="#161512" />
        <rect x="10" y="10" width="280" height="168" rx="8" fill="#221f1b" stroke="#3a342c" />
        <Backdrop kind={kind} />
        <Subjects kind={kind} />
        <Thirds />
        <Guides kind={kind} />
      </svg>
      <figcaption>{figureCaption(kind)}</figcaption>
    </figure>
  )
}

function Thirds() {
  return (
    <g stroke="#6d655b" strokeWidth="1" opacity="0.55">
      <line x1="103" y1="18" x2="103" y2="170" />
      <line x1="197" y1="18" x2="197" y2="170" />
      <line x1="18" y1="66" x2="282" y2="66" />
      <line x1="18" y1="122" x2="282" y2="122" />
    </g>
  )
}

function Backdrop({ kind }: { kind: FigureKind }) {
  if (kind === 'night-building') {
    return (
      <>
        <rect x="10" y="10" width="280" height="112" fill="#141820" />
        <rect x="10" y="122" width="280" height="56" fill="#1a1814" />
      </>
    )
  }
  if (kind === 'night-light') {
    return <rect x="10" y="10" width="280" height="168" fill="#12141a" />
  }
  if (kind === 'land-wide') {
    return (
      <>
        <rect x="10" y="10" width="280" height="112" fill="#243044" />
        <rect x="10" y="122" width="280" height="56" fill="#2a3324" />
      </>
    )
  }
  if (kind === 'land-subject') {
    return (
      <>
        <rect x="10" y="10" width="280" height="56" fill="#243044" />
        <rect x="10" y="66" width="280" height="112" fill="#2a3324" />
      </>
    )
  }
  if (kind === 'land-layers') {
    return (
      <>
        <rect x="10" y="10" width="280" height="168" fill="#243044" />
        <polygon points="10,150 70,108 130,136 190,96 290,128 290,178 10,178" fill="#31402f" />
        <polygon points="10,164 110,124 180,150 290,118 290,178 10,178" fill="#3e4d38" />
      </>
    )
  }
  return null
}

function Subjects({ kind }: { kind: FigureKind }) {
  switch (kind) {
    case 'portrait-center':
      return <Person x={150} eyeY={66} look="front" />
    case 'portrait-offset':
      return <Person x={103} eyeY={66} look="right" />
    case 'night-building':
      return (
        <>
          <Building points="36,158 108,158 96,46 52,46" />
          <Light cx={210} cy={78} />
        </>
      )
    case 'night-light':
      return (
        <>
          <Light cx={197} cy={66} />
          <Person x={132} eyeY={96} look="right" scale={0.7} />
        </>
      )
    case 'land-wide':
      return (
        <>
          <Building points="168,156 246,156 232,58 184,58" />
          <ellipse cx="78" cy="156" rx="28" ry="12" fill="#4a4034" />
        </>
      )
    case 'land-subject':
      return <Tree x={103} />
    case 'street-wide':
      return (
        <>
          <Building points="176,158 258,158 242,36 192,36" />
          <Person x={96} eyeY={78} look="right" />
        </>
      )
    case 'street':
      return (
        <>
          <rect x="188" y="28" width="72" height="20" rx="3" fill="#3a342c" stroke="#8a8172" />
          <Person x={103} eyeY={78} look="right" />
        </>
      )
    case 'sports':
      return <Runner />
    default:
      return null
  }
}

function Guides({ kind }: { kind: FigureKind }) {
  if (kind === 'night-building' || kind === 'land-wide' || kind === 'sports') {
    const y = kind === 'sports' ? 150 : 122
    return <line x1="18" y1={y} x2="282" y2={y} stroke={gold} strokeWidth="1.6" />
  }
  if (kind === 'land-subject' || kind === 'land-layers') {
    return <line x1="18" y1="66" x2="282" y2="66" stroke={gold} strokeWidth="1.6" />
  }
  return null
}

function Person({
  x,
  eyeY,
  look,
  scale = 1,
}: {
  x: number
  eyeY: number
  look: 'front' | 'right'
  scale?: number
}) {
  const head = 15 * scale
  const headY = eyeY - 10 * scale
  return (
    <g>
      <path
        d={`M ${x - 26 * scale} ${eyeY + 46 * scale}
            C ${x - 26 * scale} ${eyeY + 6 * scale}, ${x - 12 * scale} ${eyeY - 2 * scale}, ${x} ${eyeY - 2 * scale}
            C ${x + 12 * scale} ${eyeY - 2 * scale}, ${x + 26 * scale} ${eyeY + 6 * scale}, ${x + 26 * scale} ${eyeY + 46 * scale} Z`}
        fill="#d7cec0"
      />
      <circle cx={x} cy={headY} r={head} fill={ink} />
      {look === 'front' ? (
        <>
          <circle cx={x - 5 * scale} cy={eyeY - 8 * scale} r="1.8" fill="#1a140c" />
          <circle cx={x + 5 * scale} cy={eyeY - 8 * scale} r="1.8" fill="#1a140c" />
        </>
      ) : (
        <>
          <circle cx={x + 4 * scale} cy={eyeY - 8 * scale} r="1.8" fill="#1a140c" />
          <path
            d={`M ${x + head + 10 * scale} ${eyeY - 8 * scale} h ${22 * scale} l ${-6 * scale} -4 m ${6 * scale} 4 l ${-6 * scale} 4`}
            fill="none"
            stroke={gold}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </g>
  )
}

function Building({ points }: { points: string }) {
  return <polygon points={points} fill="#3a342c" stroke={ink} strokeWidth="1.5" />
}

function Light({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="16" fill={gold} opacity="0.28" />
      <circle cx={cx} cy={cy} r="6" fill={gold} />
    </g>
  )
}

function Tree({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 3} y="78" width="6" height="28" fill="#6a5340" />
      <circle cx={x} cy="70" r="16" fill="#4d6a45" />
    </g>
  )
}

function Runner() {
  return (
    <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none">
      <circle cx="96" cy="78" r="11" fill={ink} stroke="none" />
      <path d="M96 90 L104 118 L86 148" />
      <path d="M104 118 L124 140" />
      <path d="M100 100 L124 92" />
      <path d="M100 100 L78 112" />
    </g>
  )
}
