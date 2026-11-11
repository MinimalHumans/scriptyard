/**
 * edgeBoard.ts
 * ------------
 * One board holding every awkward case the exporters have to survive, built in
 * code so the geometry that decides containment is readable. Cards are
 * 320 x 160; an item belongs to the smallest backdrop that fully contains it.
 *
 * What is in here, and why:
 *
 *   Act One
 *     cards directly in the act          characters/props/themes above scene level
 *     Sequence A
 *       Scene "Kitchen confrontation"    composed heading, two Location cards,
 *                                        every card type, placement notes
 *         Beat backdrop "The turn"       cards inside a beat inside a scene
 *       Scene "EXT. RIDGE - DAY"         verbatim slugline, a character placed
 *                                        twice, a cut character, shot framings
 *     Beat backdrop "Meeting the Mentor" structural beat, nested beat, sub-beats
 *     Scene "Aftermath"                  in an act but in no sequence
 *   Act Two                              an act with no scenes
 *   Sequence "Coda" (no act)             scene holding a Custom group
 *   Scene "Deleted dream" (Cut)          cut by status, contents cut by containment
 *   loose cards                          the entity library, plus root-level
 *                                        scene, shot, beat and thought cards
 */

import type {
  Backdrop, BackdropType, Board, Card, Entity, EntityType,
} from '@/types/board'

const entities: Entity[] = []
const cards: Card[] = []
const backdrops: Backdrop[] = []

function entity(
  id: string, type: EntityType, title: string,
  attributes: Record<string, string> = {}, noteRaw = '',
): string {
  entities.push({ id, type, title, noteRaw, attributes })
  return id
}

function card(
  id: string, entityId: string, x: number, y: number, instanceNote = '',
): void {
  const e = entities.find(en => en.id === entityId)
  if (!e) throw new Error(`edgeBoard: no entity ${entityId}`)
  cards.push({
    id, entityId, type: e.type, position: { x, y }, rotation: 0,
    color: 'fog', zIndex: 1000 + cards.length, noteRaw: e.noteRaw,
    instanceNote, isFlipped: false, title: e.title,
  })
}

function backdrop(
  id: string, type: BackdropType, title: string,
  x: number, y: number, width: number, height: number,
  attributes: Record<string, string> = {}, note = '',
): void {
  backdrops.push({
    id, type, title, note, position: { x, y }, size: { width, height },
    color: 'fog', zIndex: 100, attributes,
  })
}

// ─── Entities ────────────────────────────────────────────────────────────────

entity('e-ada', 'Character', 'Ada', {
  pronouns: 'she/her', role: 'Protagonist', occupation: 'Ferry pilot',
  age: '34', summary: 'Came home to sell the boat and stayed.',
}, 'Never says what she means the first time.')
entity('e-bo', 'Character', 'Bo & Co', { role: 'Supporting' })
entity('e-cy', 'Character', 'Cy', { role: 'Minor' }, 'Library only, never placed.')
entity('e-zed', 'Character', 'Zed', { role: 'Antagonist', status: 'Cut' })

entity('e-kitchen', 'Location', 'Kitchen', {
  type: 'Interior', period: '1970s', mood: 'close, airless',
  description: 'Low ceiling, one window over the sink.',
}, 'Shoot it smaller than it is.')
entity('e-barn', 'Location', 'Barn', { type: 'Exterior' })

entity('e-lantern', 'Prop', 'Lantern', {
  story_function: 'Practical', description: 'Brass, dented, still works.',
}, 'Ada\'s father\'s.')
entity('e-knife', 'Prop', 'Knife', { story_function: 'MacGuffin' })
entity('e-map', 'Prop', 'Old map', { story_function: 'Symbolic', status: 'Cut' })

entity('e-grief', 'Theme', 'Grief', {
  statement: 'Grief unspoken hardens into blame.',
  expression: 'Doors left open, meals left uneaten.',
  opposition: 'Silence is also a kind of mercy.',
}, 'Keep it out of the dialogue.')
entity('e-hope', 'Theme', 'Hope', { expression: 'Light through water.' })

entity('e-arc-ada', 'Arc', 'Ada thaws', {
  subject: 'Ada', axis: 'guarded → open', direction: 'Positive',
}, 'Three stages at most.')
entity('e-arc-town', 'Arc', 'The town forgets', {
  subject: 'The town itself', axis: 'memory → rumour',
})

entity('e-shot-estab', 'Shot', 'The ferry landing', {
  subject: 'The landing', framing: 'wide', purpose: 'Place us before anyone speaks.',
})
entity('e-shot-cu', 'Shot', 'Ada\'s hands', { subject: 'Ada', framing: 'CU' })
entity('e-shot-ots', 'Shot', 'Over Bo', { framing: 'OTS', purpose: 'Keep Ada small.' })
entity('e-shot-wide', 'Shot', 'The ridge', { framing: 'Extreme Wide' })
entity('e-shot-odd', 'Shot', 'Something dreamy', { framing: 'dreamy' })
entity('e-shot-beat', 'Shot', 'Mentor at the door', {})
entity('e-shot-root', 'Shot', 'Unplaced insert', { framing: 'ECU' })

entity('e-beat-hesitates', 'Beat', 'Ada hesitates', {}, 'She almost tells him.')
entity('e-beat-inbeat', 'Beat', 'The lantern gutters', {})
entity('e-beat-act', 'Beat', 'A promise is made', {}, 'Paid off in the coda.')
entity('e-beat-sub', 'Beat', 'The offer', {}, 'He names his price.')
entity('e-beat-root', 'Beat', 'Unplaced beat', {})

entity('e-thought-act', 'Thought', 'Pacing', {}, 'Act one runs long <trim> it.')
entity('e-thought-s1', 'Thought', 'Blocking', {}, 'Keep the table between them.')
entity('e-thought-nested', 'Thought', 'Refusal note', {}, 'He should say no twice.')
entity('e-thought-root', 'Thought', 'Title idea', {}, 'Call it "Low Water".')

entity('e-scene-montage', 'Scene', 'Montage of crossings', {
  int_ext: 'EXT.', time_of_day: 'Dusk', goal: 'Show the routine she is stuck in.',
}, 'Six crossings, no dialogue.')
entity('e-scene-flash', 'Scene', 'Flash of the accident', { time_of_day: 'Night' })
entity('e-scene-teaser', 'Scene', 'Teaser', {
  int_ext: 'INT.', time_of_day: 'Morning', conflict: 'Nobody will meet her eye.',
}, 'Cold open.')

// ─── Act One ─────────────────────────────────────────────────────────────────

backdrop('bd-act1', 'Act', 'Act One', 0, 0, 4000, 2400, {
  function: 'Bring her home and take away the easy exit.',
  dramatic_question: 'Will she sell?',
  shift: 'She misses the last ferry out.',
}, 'Everything here is arrival.')

card('c-ada-act', 'e-ada', 40, 40)
card('c-grief-act', 'e-grief', 400, 40)
card('c-shot-act', 'e-shot-estab', 760, 40)
card('c-scene-montage', 'e-scene-montage', 1120, 40)
card('c-thought-act', 'e-thought-act', 1480, 40)
card('c-arc-act', 'e-arc-ada', 1840, 40)
card('c-beat-act', 'e-beat-act', 2200, 40)
card('c-knife-act', 'e-knife', 2560, 40)

backdrop('bd-seqA', 'Sequence', 'The Return', 40, 280, 3900, 1200, {
  goal: 'Get the keys to the boat.',
  conflict: 'Her brother has them.',
  outcome: 'She gets the keys and a debt.',
}, 'One long evening.')

card('c-lantern-seq', 'e-lantern', 80, 320)
card('c-grief-seq', 'e-grief', 440, 320)
card('c-bo-seq', 'e-bo', 800, 320)

backdrop('bd-scene1', 'Scene', 'Kitchen confrontation', 80, 560, 1800, 880, {
  int_ext: 'INT.', time_of_day: 'Night',
  goal: 'Ask for the keys without asking.',
  conflict: 'Bo wants an apology first.',
  outcome: 'Neither gets what they came for.',
}, 'They talk about everything but the boat.')

card('c-kitchen-s1', 'e-kitchen', 120, 600)
card('c-ada-s1', 'e-ada', 480, 600, 'enters angry')
card('c-lantern-s1', 'e-lantern', 840, 600, 'lit, on the table')
card('c-grief-s1', 'e-grief', 1200, 600, 'the empty chair')
card('c-arc-s1', 'e-arc-ada', 120, 800, 'walls up')
card('c-thought-s1', 'e-thought-s1', 480, 800)
card('c-shot-s1', 'e-shot-cu', 840, 800)
card('c-beat-s1', 'e-beat-hesitates', 1200, 800)
card('c-barn-s1', 'e-barn', 1520, 800)

backdrop('bd-beat-in-scene', 'Beat', 'The turn', 120, 1000, 1700, 400, {
  description: 'Bo stops joking.',
}, 'The scene pivots here.')

card('c-bo-beat', 'e-bo', 160, 1040, 'by the stove')
card('c-shot-beat-ots', 'e-shot-ots', 520, 1040)
card('c-beat-inbeat', 'e-beat-inbeat', 880, 1040)
card('c-ada-beat', 'e-ada', 1240, 1040)

backdrop('bd-scene2', 'Scene', 'EXT. RIDGE - DAY', 1960, 560, 1900, 880, {
  time_of_day: 'Later',
})

card('c-ada-s2', 'e-ada', 2000, 600)
card('c-ada-s2b', 'e-ada', 2360, 600, 'second placement')
card('c-zed-s2', 'e-zed', 2720, 600)
card('c-knife-s2', 'e-knife', 3080, 600)
card('c-shot-s2-wide', 'e-shot-wide', 2000, 800)
card('c-shot-s2-odd', 'e-shot-odd', 2360, 800)

backdrop('bd-beat-struct', 'Beat', 'Meeting the Mentor', 40, 1520, 1900, 840, {
  description: 'An older pilot offers her a way out.',
}, 'Structural beat, not inside a scene.')

card('c-beat-sub', 'e-beat-sub', 80, 1560)
card('c-bo-struct', 'e-bo', 440, 1560)
card('c-shot-struct', 'e-shot-beat', 800, 1560)
card('c-scene-flash', 'e-scene-flash', 1160, 1560)

backdrop('bd-beat-nested', 'Beat', 'Refusal', 80, 1800, 1000, 500, {})

card('c-thought-nested', 'e-thought-nested', 120, 1840)
card('c-lantern-nested', 'e-lantern', 480, 1840)

backdrop('bd-scene3', 'Scene', 'Aftermath', 2000, 1520, 1900, 840, {
  time_of_day: 'Continuous',
})

card('c-barn-s3', 'e-barn', 2040, 1560)
card('c-bo-s3', 'e-bo', 2400, 1560)

// ─── Act Two: no scenes ──────────────────────────────────────────────────────

backdrop('bd-act2', 'Act', 'Act Two', 0, 2480, 4000, 600, {})

card('c-hope-act2', 'e-hope', 40, 2520)

// ─── A sequence in no act ────────────────────────────────────────────────────

backdrop('bd-seq-coda', 'Sequence', 'Coda', 0, 3160, 2000, 700, {})

backdrop('bd-scene-epilogue', 'Scene', 'Epilogue', 40, 3200, 1000, 600, {
  int_ext: 'EXT.', time_of_day: 'Dawn',
})

backdrop('bd-custom', 'Custom', 'Maybe', 60, 3240, 500, 300, {
  description: 'Undecided.',
})

card('c-ada-epilogue', 'e-ada', 80, 3280)

// ─── Cut material ────────────────────────────────────────────────────────────

backdrop('bd-scene-cut', 'Scene', 'Deleted dream', 2100, 3160, 1000, 700, {
  status: 'Cut', int_ext: 'INT.',
})

card('c-bo-cut', 'e-bo', 2140, 3200)
card('c-kitchen-cut', 'e-kitchen', 2500, 3200)

// ─── Loose cards ─────────────────────────────────────────────────────────────

card('c-scene-teaser', 'e-scene-teaser', 0, 4000)
card('c-ada-lib', 'e-ada', 360, 4000)
card('c-cy-lib', 'e-cy', 720, 4000)
card('c-kitchen-lib', 'e-kitchen', 1080, 4000)
card('c-barn-lib', 'e-barn', 1440, 4000)
card('c-lantern-lib', 'e-lantern', 1800, 4000)
card('c-knife-lib', 'e-knife', 2160, 4000)
card('c-grief-lib', 'e-grief', 2520, 4000)
card('c-hope-lib', 'e-hope', 2880, 4000)
card('c-arc-ada-lib', 'e-arc-ada', 3240, 4000)
card('c-arc-town-lib', 'e-arc-town', 3600, 4000)
card('c-thought-root', 'e-thought-root', 0, 4240)
card('c-shot-root', 'e-shot-root', 360, 4240)
card('c-beat-root', 'e-beat-root', 720, 4240)
card('c-map-lib', 'e-map', 1080, 4240)

export const edgeBoard: Board = {
  schemaVersion: 1,
  boardId: 'edge-board',
  name: 'Low Water',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  viewport: { x: 0, y: 0, zoom: 1 },
  cards,
  entities,
  backdrops,
  projectInfo: {
    credit: 'Written by',
    author: 'A. Writer & B. Writer',
    source: 'Based on a true story',
    draftDate: 'First draft',
    contact: 'A. Writer\n1 Harbour Road\nwriter@example.com',
    copyright: '(c) 2026 A. Writer',
  },
}
