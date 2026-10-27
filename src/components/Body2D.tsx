import { useMemo, useState } from 'react'
import { heatColor, Muscle, Scores } from '../lib/muscles'

// Anatomical front/back figure drawn as SVG. Every shape is authored for the
// right half of the body (x >= 100) and mirrored across x = 100 for the left,
// so both sides always share one fill. viewBox is 200 x 400.

type Shapes = Partial<Record<Muscle, string[]>>

const BASE_FRONT = [
  'M100 60 C112 60 122 64 131 72 C136 90 129 112 123 132 C121 152 125 172 129 192 L100 194 Z', // torso
  'M134 72 C148 64 161 74 161 96 C163 122 163 142 161 156 C167 174 169 198 167 222 L158 224 C152 206 146 180 142 160 C138 140 135 108 134 72 Z', // arm
  'M100 188 L131 186 C136 220 134 272 128 302 C131 332 130 352 125 374 L111 374 C108 352 108 332 110 304 C104 280 100 230 100 188 Z', // leg
]
const BASE_BACK = BASE_FRONT

const HAND = 'M158 224 C166 224 171 232 170 242 C169 252 163 256 159 250 C156 242 156 232 158 224 Z'
const FOOT = 'M111 374 L125 374 C131 378 134 384 132 389 L108 389 C108 383 109 378 111 374 Z'

const FRONT: Shapes = {
  Neck: ['M100 45 L108 45 C109 52 110 58 111 64 L100 64 Z'],
  Traps: ['M100 52 L109 50 C119 56 129 63 137 70 L131 76 C121 70 110 66 100 64 Z'],
  Shoulders: ['M131 72 C143 66 156 72 158 86 C159 97 156 106 152 112 L141 106 C139 94 136 82 131 72 Z'],
  Chest: ['M100 68 C112 65 124 71 131 78 C133 92 128 106 118 111 C110 113 104 111 100 108 Z'],
  Abdominals: [
    'M101.5 114 H111 Q113 114 113 116 V127 Q113 129 111 129 H101.5 Z',
    'M101.5 131.5 H111 Q113 131.5 113 133.5 V144.5 Q113 146.5 111 146.5 H101.5 Z',
    'M101.5 149 H110.5 Q112.5 149 112.5 151 V162 Q112.5 164 110.5 164 H101.5 Z',
    'M101.5 166.5 H109.5 Q111.5 166.5 111.5 168.5 V177 Q111.5 179 109.5 179 H101.5 Z',
  ],
  Biceps: ['M143 110 C151 109 157 116 157 127 C157 138 155 147 151 153 C145 149 142 139 141 128 C140 120 141 114 143 110 Z'],
  Forearms: ['M148 158 C155 158 161 164 163 178 C165 194 165 208 163 220 L155 218 C150 202 146 186 144 170 C144 164 146 160 148 158 Z'],
  Quadriceps: ['M109 198 C119 194 128 200 129 216 C130 244 128 272 124 296 C118 302 112 300 109 294 C108 270 108 232 109 198 Z'],
  Adductors: ['M100 196 L108 198 C107 230 107 262 108 290 C104 286 101 262 100 240 Z'],
  Abductors: ['M125 191 C131 193 135 201 135 214 C133 225 130 226 129 216 C129 204 127 196 125 191 Z'],
  Calves: ['M112 308 C120 306 127 312 127 326 C127 342 125 356 122 368 C116 370 112 362 111 348 C110 332 110 318 112 308 Z'],
}
// Oblique strip is part of the abdominal group.
FRONT.Abdominals!.push('M115 114 C122 116 127 122 127 132 L125 168 C121 173 117 173 114 169 C116 150 115 130 115 114 Z')

const BACK: Shapes = {
  Neck: ['M100 45 L108 45 L109 56 L100 56 Z'],
  Traps: ['M100 52 L109 50 C121 58 133 66 142 74 C132 88 114 96 100 104 Z'],
  Shoulders: ['M137 72 C148 68 158 76 158 88 C159 98 156 106 152 112 L141 106 C140 94 139 82 137 72 Z'],
  'Upper Back': ['M100 108 C112 102 126 94 136 88 C138 100 132 110 124 116 C114 116 104 113 100 112 Z'],
  Lats: ['M124 118 C134 112 140 120 138 134 C136 148 128 158 118 162 C112 150 116 130 124 118 Z'],
  'Lower Back': ['M100 140 C108 138 114 143 114 152 C114 162 110 170 100 176 Z'],
  Triceps: ['M143 110 C151 109 158 116 158 127 C158 138 155 147 151 153 C145 149 142 139 141 128 C140 120 141 114 143 110 Z'],
  Forearms: ['M148 158 C155 158 161 164 163 178 C165 194 165 208 163 220 L155 218 C150 202 146 186 144 170 C144 164 146 160 148 158 Z'],
  Glutes: ['M100 180 C112 174 128 178 131 194 C131 208 121 216 108 214 C102 212 100 206 100 200 Z'],
  Abductors: ['M128 176 C135 178 137 186 135 197 C132 197 129 188 128 176 Z'],
  Hamstrings: ['M102 218 C112 217 124 217 129 228 C129 252 127 278 123 298 C117 302 111 300 107 296 C103 274 101 244 102 218 Z'],
  Calves: ['M110 308 C118 304 128 310 128 326 C128 342 124 358 120 370 C114 372 111 362 110 348 C108 332 108 318 110 308 Z'],
}

const MIRROR = 'translate(200 0) scale(-1 1)'

function Half({ shapes, scores, max, hovered, selected, onHover, onSelect }: {
  shapes: Shapes; scores: Scores; max: number; hovered: Muscle | null; selected?: Muscle | null
  onHover: (m: Muscle | null) => void; onSelect?: (m: Muscle) => void
}) {
  return (
    <>
      {(Object.keys(shapes) as Muscle[]).flatMap((m) =>
        shapes[m]!.map((d, i) => {
          const active = hovered === m || selected === m
          return (
            <path
              key={`${m}-${i}`}
              d={d}
              fill={heatColor(scores[m] / max)}
              stroke={active ? '#fff' : '#0d1016'}
              strokeWidth={active ? 1.4 : 0.8}
              strokeLinejoin="round"
              style={{ cursor: 'pointer', transition: 'fill .25s' }}
              onPointerEnter={() => onHover(m)}
              onPointerLeave={() => onHover(null)}
              onClick={() => onSelect?.(m)}
            />
          )
        }),
      )}
    </>
  )
}

function Figure({ side, ...rest }: { side: 'front' | 'back' } & Omit<Parameters<typeof Half>[0], 'shapes'>) {
  const base = side === 'front' ? BASE_FRONT : BASE_BACK
  const half = (
    <>
      {base.map((d, i) => <path key={i} d={d} fill="#2c3340" />)}
      <path d={HAND} fill="#2c3340" />
      <path d={FOOT} fill="#2c3340" />
      <Half shapes={side === 'front' ? FRONT : BACK} {...rest} />
    </>
  )
  return (
    <svg viewBox="0 0 200 400" style={{ flex: 1, minWidth: 0, height: '100%' }} role="img" aria-label={`${side} view`}>
      <ellipse cx={100} cy={28} rx={15} ry={20} fill="#2c3340" />
      <g>{half}</g>
      <g transform={MIRROR}>{half}</g>
    </svg>
  )
}

interface Props {
  scores: Scores
  onHover?: (m: Muscle | null) => void
  onSelect?: (m: Muscle) => void
  selected?: Muscle | null
}

export default function Body2D({ scores, onHover, onSelect, selected }: Props) {
  const max = useMemo(() => Math.max(0.0001, ...Object.values(scores)), [scores])
  const [hovered, setHovered] = useState<Muscle | null>(null)
  const hover = (m: Muscle | null) => { setHovered(m); onHover?.(m) }
  const common = { scores, max, hovered, selected, onHover: hover, onSelect }
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', padding: '12px 8px', gap: 8 }}>
      <Figure side="front" {...common} />
      <Figure side="back" {...common} />
    </div>
  )
}
