export const MUSCLES = [
  'Chest',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abdominals',
  'Traps',
  'Lats',
  'Upper Back',
  'Lower Back',
  'Glutes',
  'Quadriceps',
  'Hamstrings',
  'Adductors',
  'Abductors',
  'Calves',
] as const

export type Muscle = (typeof MUSCLES)[number]
export type Scores = Record<Muscle, number>

export const emptyScores = (): Scores =>
  Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Scores

export interface Mapping {
  primary: Muscle[]
  secondary: Muscle[]
  cardio?: boolean
}

// Order matters: first matching rule wins, so specific patterns go first.
const RULES: [RegExp, Mapping][] = [
  [/running|treadmill|cycling|bike|rowing machine|elliptical|stair|jump rope|swim|walk|hike|cardio|sprint/, { primary: [], secondary: [], cardio: true }],
  [/wrist curl|forearm|farmer|grip/, { primary: ['Forearms'], secondary: [] }],
  [/leg curl|nordic|hamstring curl/, { primary: ['Hamstrings'], secondary: ['Calves'] }],
  [/leg extension/, { primary: ['Quadriceps'], secondary: [] }],
  [/leg press/, { primary: ['Quadriceps'], secondary: ['Glutes', 'Adductors'] }],
  [/hip thrust|glute bridge|glute kickback|donkey|cable kickback/, { primary: ['Glutes'], secondary: ['Hamstrings'] }],
  [/hip abduction|abductor/, { primary: ['Abductors'], secondary: ['Glutes'] }],
  [/hip adduction|adductor|sumo squat/, { primary: ['Adductors'], secondary: ['Quadriceps', 'Glutes'] }],
  [/calf|tibialis/, { primary: ['Calves'], secondary: [] }],
  [/romanian|stiff.?leg|rdl|good morning/, { primary: ['Hamstrings', 'Glutes'], secondary: ['Lower Back'] }],
  [/deadlift|rack pull/, { primary: ['Glutes', 'Hamstrings', 'Lower Back'], secondary: ['Traps', 'Quadriceps', 'Forearms', 'Upper Back'] }],
  [/squat|lunge|split squat|step.?up|hack/, { primary: ['Quadriceps', 'Glutes'], secondary: ['Hamstrings', 'Adductors', 'Calves'] }],
  [/back extension|hyperextension|reverse hyper/, { primary: ['Lower Back'], secondary: ['Glutes', 'Hamstrings'] }],
  [/shrug/, { primary: ['Traps'], secondary: ['Forearms'] }],
  [/face pull|rear delt|reverse fly|reverse pec|upright row/, { primary: ['Shoulders', 'Upper Back'], secondary: ['Traps'] }],
  [/skull|tricep|pushdown|push down|kickback|overhead extension|jm press|close.?grip bench/, { primary: ['Triceps'], secondary: [] }],
  [/dip/, { primary: ['Triceps', 'Chest'], secondary: ['Shoulders'] }],
  [/lateral raise|front raise|overhead press|shoulder press|military|arnold|push press|landmine press|handstand/, { primary: ['Shoulders'], secondary: ['Triceps', 'Traps'] }],
  [/incline.*(bench|press)|(bench|press).*incline/, { primary: ['Chest', 'Shoulders'], secondary: ['Triceps'] }],
  [/push.?up|bench press|chest press|chest fly|pec|cable fly|crossover|floor press/, { primary: ['Chest'], secondary: ['Triceps', 'Shoulders'] }],
  [/pull.?up|chin.?up|pulldown|pull down|muscle up/, { primary: ['Lats'], secondary: ['Biceps', 'Upper Back', 'Forearms'] }],
  [/pullover|straight arm/, { primary: ['Lats'], secondary: ['Chest', 'Triceps'] }],
  [/row|t-bar/, { primary: ['Upper Back', 'Lats'], secondary: ['Biceps', 'Traps', 'Forearms'] }],
  [/curl/, { primary: ['Biceps'], secondary: ['Forearms'] }],
  [/crunch|sit.?up|plank|leg raise|knee raise|ab wheel|russian twist|woodchop|hollow|v.?up|mountain climber|abs|core|toes to bar/, { primary: ['Abdominals'], secondary: [] }],
  [/clean|snatch|burpee|thruster|kettlebell swing|swing/, { primary: ['Glutes', 'Hamstrings', 'Shoulders'], secondary: ['Quadriceps', 'Lower Back', 'Traps'] }],
]

export function lookupMapping(title: string): Mapping | null {
  const t = title.toLowerCase()
  for (const [re, m] of RULES) if (re.test(t)) return m
  return null
}

// Heat gradient stops: none -> low -> high
const STOPS: [number, [number, number, number]][] = [
  [0, [86, 95, 114]],
  [0.01, [37, 99, 235]],
  [0.35, [34, 211, 238]],
  [0.65, [250, 204, 21]],
  [1, [239, 68, 68]],
]

export function heatColor(t: number): string {
  const v = Math.max(0, Math.min(1, t))
  for (let i = 1; i < STOPS.length; i++) {
    const [b, cb] = STOPS[i]
    if (v <= b) {
      const [a, ca] = STOPS[i - 1]
      const k = (v - a) / (b - a || 1)
      const c = ca.map((x, j) => Math.round(x + (cb[j] - x) * k))
      return `rgb(${c[0]},${c[1]},${c[2]})`
    }
  }
  return 'rgb(239,68,68)'
}
