import { Canvas, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useState } from 'react'
import { heatColor, Muscle, Scores } from '../lib/muscles'
import Body2D from './Body2D'

type Vec = [number, number, number]
interface Part {
  muscle: Muscle | null // null = base body (not a trainable muscle)
  pos: Vec
  size: Vec // ellipsoid radii
  rot?: Vec
  mirror?: boolean // also render at -x
}

// Body is ~1.8 units tall, y up, front faces +z. Muscles are ellipsoids that sit slightly
// proud of the base figure so they read as an overlay you can colour.
const PARTS: Part[] = [
  // base figure (joints overlap neighbouring segments so the silhouette reads as one body)
  { muscle: null, pos: [0, 0.8, 0], size: [0.085, 0.105, 0.095] }, // head
  { muscle: null, pos: [0, 0.68, -0.005], size: [0.05, 0.07, 0.05] }, // neck
  { muscle: null, pos: [0, 0.38, 0], size: [0.155, 0.3, 0.07] }, // torso
  { muscle: null, pos: [0, 0.5, 0], size: [0.19, 0.12, 0.07] }, // shoulder girdle
  { muscle: null, pos: [0, 0.06, 0], size: [0.15, 0.13, 0.075] }, // pelvis
  { muscle: null, pos: [0.215, 0.54, 0], size: [0.062, 0.065, 0.062], mirror: true }, // shoulder joint
  { muscle: null, pos: [0.255, 0.41, 0], size: [0.04, 0.14, 0.04], mirror: true }, // upper arm
  { muscle: null, pos: [0.265, 0.28, 0], size: [0.035, 0.04, 0.035], mirror: true }, // elbow
  { muscle: null, pos: [0.275, 0.16, 0], size: [0.033, 0.13, 0.033], mirror: true }, // forearm
  { muscle: null, pos: [0.285, 0.015, 0], size: [0.027, 0.05, 0.02], mirror: true }, // hand
  { muscle: null, pos: [0.088, -0.25, 0], size: [0.066, 0.22, 0.062], mirror: true }, // thigh
  { muscle: null, pos: [0.088, -0.46, 0], size: [0.045, 0.045, 0.045], mirror: true }, // knee
  { muscle: null, pos: [0.088, -0.66, 0], size: [0.043, 0.21, 0.043], mirror: true }, // shin
  { muscle: null, pos: [0.088, -0.88, 0.04], size: [0.04, 0.025, 0.07], mirror: true }, // foot

  // front
  { muscle: 'Chest', pos: [0.075, 0.45, 0.06], size: [0.085, 0.065, 0.04], mirror: true },
  { muscle: 'Shoulders', pos: [0.215, 0.54, 0], size: [0.07, 0.075, 0.075], mirror: true },
  { muscle: 'Biceps', pos: [0.255, 0.41, 0.03], size: [0.04, 0.1, 0.03], mirror: true },
  { muscle: 'Forearms', pos: [0.275, 0.17, 0], size: [0.037, 0.115, 0.037], mirror: true },
  { muscle: 'Abdominals', pos: [0.032, 0.31, 0.065], size: [0.03, 0.032, 0.022], mirror: true },
  { muscle: 'Abdominals', pos: [0.032, 0.24, 0.067], size: [0.03, 0.032, 0.022], mirror: true },
  { muscle: 'Abdominals', pos: [0.032, 0.17, 0.066], size: [0.03, 0.032, 0.022], mirror: true },
  { muscle: 'Abdominals', pos: [0.03, 0.1, 0.066], size: [0.028, 0.03, 0.02], mirror: true },
  { muscle: 'Quadriceps', pos: [0.088, -0.25, 0.022], size: [0.068, 0.185, 0.05], mirror: true },
  { muscle: 'Adductors', pos: [0.034, -0.2, 0.0], size: [0.03, 0.15, 0.045], mirror: true },
  { muscle: 'Abductors', pos: [0.15, -0.12, -0.005], size: [0.028, 0.11, 0.05], mirror: true },

  // back
  { muscle: 'Traps', pos: [0.075, 0.58, -0.035], size: [0.1, 0.065, 0.035], rot: [0, 0, -0.35], mirror: true },
  { muscle: 'Upper Back', pos: [0.055, 0.45, -0.065], size: [0.07, 0.065, 0.03], mirror: true },
  { muscle: 'Lats', pos: [0.115, 0.34, -0.055], size: [0.06, 0.12, 0.035], rot: [0, 0, 0.18], mirror: true },
  { muscle: 'Lower Back', pos: [0.04, 0.2, -0.062], size: [0.045, 0.07, 0.03], mirror: true },
  { muscle: 'Triceps', pos: [0.255, 0.41, -0.03], size: [0.04, 0.1, 0.03], mirror: true },
  { muscle: 'Glutes', pos: [0.06, -0.02, -0.065], size: [0.08, 0.08, 0.06], mirror: true },
  { muscle: 'Hamstrings', pos: [0.088, -0.25, -0.03], size: [0.062, 0.175, 0.045], mirror: true },
  { muscle: 'Calves', pos: [0.085, -0.62, -0.025], size: [0.045, 0.14, 0.04], mirror: true },
]

const BASE_COLOR = '#4a5366'

export type BodyMode = '3d' | '2d'

interface Props {
  scores: Scores
  mode: BodyMode
  autoRotate?: boolean
  onHover?: (m: Muscle | null) => void
  onSelect?: (m: Muscle) => void
  selected?: Muscle | null
}

function Figure({ scores, onHover, onSelect, selected }: Omit<Props, 'mode' | 'autoRotate'>) {
  const max = useMemo(() => Math.max(0.0001, ...Object.values(scores)), [scores])
  const [hovered, setHovered] = useState<Muscle | null>(null)

  const handlers = (m: Muscle | null) =>
    m
      ? {
          onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(m); onHover?.(m); document.body.style.cursor = 'pointer' },
          onPointerOut: () => { setHovered(null); onHover?.(null); document.body.style.cursor = '' },
          onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect?.(m) },
        }
      : {}

  return (
    <group>
      {PARTS.flatMap((p, i) =>
        (p.mirror ? [1, -1] : [1]).map((sx) => {
          const active = p.muscle && (hovered === p.muscle || selected === p.muscle)
          const color = p.muscle ? heatColor(scores[p.muscle] / max) : BASE_COLOR
          return (
            <mesh
              key={`${i}-${sx}`}
              position={[p.pos[0] * sx, p.pos[1], p.pos[2]]}
              rotation={p.rot ? [p.rot[0], p.rot[1], p.rot[2] * sx] : undefined}
              scale={p.size}
              {...handlers(p.muscle)}
            >
              <sphereGeometry args={[1, 28, 20]} />
              <meshStandardMaterial
                color={color}
                roughness={0.55}
                metalness={0.05}
                emissive={active ? '#ffffff' : '#000000'}
                emissiveIntensity={active ? 0.25 : 0}
              />
            </mesh>
          )
        }),
      )}
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 3, 4]} intensity={1.4} />
      <directionalLight position={[-2, 2, -4]} intensity={1.0} />
    </>
  )
}

export default function Body({ mode, autoRotate, ...rest }: Props) {
  if (mode === '2d') return <Body2D scores={rest.scores} onHover={rest.onHover} onSelect={rest.onSelect} selected={rest.selected} />
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [1.3, 0.3, 2.6], fov: 32 }}>
      <Lights />
      <Figure {...rest} />
      <OrbitControls
        target={[0, -0.02, 0]}
        enablePan={false}
        minDistance={1.4}
        maxDistance={5}
        autoRotate={autoRotate}
        autoRotateSpeed={2.2}
      />
    </Canvas>
  )
}
