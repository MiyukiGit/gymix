import { useState } from 'react'
import type { MuscleId } from '../../types'
import { muscleMap } from '../../data/exercises'
import { cn } from '../../lib/utils'
import anteriorPaths from '../../assets/anatomy/anterior.json'
import posteriorPaths from '../../assets/anatomy/posterior.json'

export type AnatomyView = 'front' | 'back'

const colors = ['#343a33', '#5f8f52', '#8edb78', '#c6f36a']

/** split the single abs path into upper/lower muscles */
const ABS_SPLIT_Y = 760

export const AnatomyFigure = ({
  view,
  levels,
  selected,
  onSelect,
  onHover,
  className,
}: {
  view: AnatomyView
  levels: Partial<Record<MuscleId, number>>
  selected: MuscleId | null
  onSelect: (id: MuscleId) => void
  onHover?: (id: MuscleId | null) => void
  className?: string
}) => {
  const [hovered, setHovered] = useState<MuscleId | null>(null)
  const source = view === 'front' ? anteriorPaths : posteriorPaths

  const render = (id: MuscleId, d: string, extra?: { clipPath?: string }) => {
    const level = levels[id] ?? 0
    const active = selected === id || hovered === id
    return (
      <path
        key={`${view}-${id}`}
        d={d}
        fill={colors[level]}
        opacity={level ? 1 : 0.6}
        stroke={active ? '#f3f4ef' : '#101410'}
        strokeWidth={active ? 5 : 2}
        clipPath={extra?.clipPath}
        className="anatomy-region cursor-pointer transition-all duration-200"
        onClick={() => onSelect(id)}
        onMouseEnter={() => {
          setHovered(id)
          onHover?.(id)
        }}
        onMouseLeave={() => {
          setHovered(null)
          onHover?.(null)
        }}
      >
        <title>{muscleMap[id].name}</title>
      </path>
    )
  }

  return (
    <svg
      viewBox={view === 'front' ? '0 0 724 1448' : '724 0 724 1448'}
      className={cn('h-full w-full drop-shadow-[0_18px_32px_rgba(0,0,0,0.4)]', className)}
      role="img"
      aria-label={`${view} body muscle map`}
    >
      <defs>
        <radialGradient id={`glow-${view}`}>
          <stop stopColor="#c6f36a" stopOpacity=".12" />
          <stop offset="1" stopColor="#c6f36a" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`upper_abs-${view}`}>
          <rect x="0" y="0" width="1448" height={ABS_SPLIT_Y} />
        </clipPath>
        <clipPath id={`lower_abs-${view}`}>
          <rect x="0" y={ABS_SPLIT_Y} width="1448" height="1448" />
        </clipPath>
      </defs>
      <rect width="1448" height="1448" fill={`url(#glow-${view})`} />
      <g>
        {source.map(({ slug, id, d }) => {
          if (slug === 'abs') {
            return (
              <g key={`${view}-abs`}>
                {render('upper_abs', d, { clipPath: `url(#upper_abs-${view})` })}
                {render('lower_abs', d, { clipPath: `url(#lower_abs-${view})` })}
              </g>
            )
          }
          return render(id as MuscleId, d)
        })}
      </g>
    </svg>
  )
}
