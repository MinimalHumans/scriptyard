/**
 * The board → SCF mapping, tested on the document before any SQLite exists.
 *
 * Three layers:
 *   - a golden file per board, so any change to what is exported is a diff;
 *   - invariants every export must hold, checked on every board;
 *   - the edge-case board's specific decisions, stated one by one.
 */

import { describe, expect, it } from 'vitest'
import path from 'node:path'
import type { ScfDocument, ScfRow } from '@/lib/scf/scfDocument'
import { BOARDS } from './boards'
import { build } from './buildDoc'
import { edgeBoard } from './fixtures/edgeBoard'

const golden = (file: string) => path.resolve(__dirname, 'golden', file)

/** Every reference column the exporter writes, and the table it points into. */
const REFERENCES: Record<string, Record<string, string>> = {
  act:                 { start_scene_id: 'scene' },
  sequence:            { start_scene_id: 'scene' },
  scene:               { location_id: 'location' },
  story_beat:          { scene_id: 'scene' },
  location_design:     { location_id: 'location' },
  scene_character:     { scene_id: 'scene', character_id: 'character' },
  scene_prop:          { scene_id: 'scene', prop_id: 'prop' },
  shot:                { scene_id: 'scene', story_beat_id: 'story_beat' },
  character_arc:       { character_id: 'character' },
  character_arc_state: { character_arc_id: 'character_arc', scene_id: 'scene' },
  thematic_connection: { theme_id: 'theme' },
}

/** Natural keys of the link tables, from SCF's junction-keys.json. */
const NATURAL_KEYS: Record<string, string[]> = {
  scene_character:     ['scene_id', 'character_id'],
  scene_prop:          ['scene_id', 'prop_id'],
  thematic_connection: ['theme_id', 'entity_type', 'entity_id'],
}

const rows = (doc: ScfDocument, table: string): ScfRow[] => doc.tables[table] ?? []
const byName = (doc: ScfDocument, table: string, name: string): ScfRow => {
  const row = rows(doc, table).find(r => r.values['name'] === name)
  if (!row) throw new Error(`no ${table} named ${name}`)
  return row
}

describe.each(BOARDS)('$name', ({ name, board }) => {
  const doc = build(board)

  it('matches its golden document', async () => {
    await expect(JSON.stringify(doc, null, 2) + '\n').toMatchFileSnapshot(golden(`${name}.scf.json`))
  })

  it('gives every row a unique uuid and a sequential id', () => {
    const seen = new Set<string>()
    for (const [table, list] of Object.entries(doc.tables)) {
      list.forEach((row, i) => {
        expect(row.id, `${table} id`).toBe(i + 1)
        expect(seen.has(row.uuid), `duplicate uuid in ${table}`).toBe(false)
        seen.add(row.uuid)
      })
    }
    for (const l of doc.lines) {
      expect(seen.has(l.uuid)).toBe(false)
      seen.add(l.uuid)
    }
  })

  it('points every reference at a row that exists', () => {
    for (const [table, columns] of Object.entries(REFERENCES)) {
      for (const row of rows(doc, table)) {
        for (const [column, target] of Object.entries(columns)) {
          const value = row.values[column]
          if (value === undefined) continue
          expect(typeof value, `${table}.${column}`).toBe('number')
          expect(rows(doc, target).some(r => r.id === value), `${table}.${column} = ${value}`).toBe(true)
        }
      }
    }
    for (const row of rows(doc, 'thematic_connection')) {
      const target = String(row.values['entity_type'])
      expect(['scene', 'act', 'sequence']).toContain(target)
      expect(rows(doc, target).some(r => r.id === row.values['entity_id'])).toBe(true)
    }
  })

  it('never writes the same link twice', () => {
    for (const [table, key] of Object.entries(NATURAL_KEYS)) {
      const seen = new Set<string>()
      for (const row of rows(doc, table)) {
        const k = key.map(c => row.values[c]).join('|')
        expect(seen.has(k), `${table} ${k}`).toBe(false)
        seen.add(k)
      }
    }
  })

  it('keeps external ids unique within a table', () => {
    for (const [table, list] of Object.entries(doc.tables)) {
      const ids = list.map(r => r.values['external_id']).filter(Boolean)
      expect(new Set(ids).size, table).toBe(ids.length)
      for (const r of list) {
        if (r.values['external_id']) expect(r.values['external_id_namespace']).toBe('scriptyard')
      }
    }
  })

  it('gives every scene exactly one heading line, in scene order', () => {
    const headings = doc.lines.filter(l => l.lineType === 'heading')
    expect(headings.map(l => l.sceneId)).toEqual(rows(doc, 'scene').map(r => r.id))
    for (const h of headings) {
      const scene = rows(doc, 'scene').find(r => r.id === h.sceneId)!
      expect(h.locationId ?? undefined).toBe(scene.values['location_id'])
    }
  })

  it('binds every section line to the span it names', () => {
    const sections = doc.lines.filter(l => l.lineType === 'section')
    expect(sections.length).toBe(rows(doc, 'act').length + rows(doc, 'sequence').length)
    for (const s of sections) {
      const ref = (s.metadata as { structureRef: { kind: string; uuid: string } }).structureRef
      const span = rows(doc, ref.kind).find(r => r.uuid === ref.uuid)
      expect(span, s.content).toBeDefined()
      // The label must equal the span's name exactly, or SCF reports a mismatch.
      expect(s.content.replace(/^#+\s*/, '')).toBe(span!.values['name'])
    }
  })

  it('writes only line types SCF publishes, and no line outside a scene refers to one', () => {
    for (const l of doc.lines) {
      expect(['section', 'heading', 'action', 'blank']).toContain(l.lineType)
      if (l.lineType !== 'heading') expect(l.sceneId).toBeNull()
      if (l.lineType === 'blank') expect(l.content.trim()).toBe('')
      expect(l.content).not.toContain('\n')
    }
  })

  it('counts what it wrote', () => {
    expect(doc.report.lines).toBe(doc.lines.length)
    for (const [table, list] of Object.entries(doc.tables)) {
      expect(doc.report.rows[table]).toBe(list.length)
    }
  })
})

describe('edge board decisions', () => {
  const doc = build(edgeBoard)
  const content = doc.lines.map(l => l.content)
  const reported = (kind: string, needle: string) =>
    doc.report.items.some(i => i.kind === kind && (i.subject + ' ' + i.detail).includes(needle))

  it('exports the project and title page', () => {
    expect(rows(doc, 'project')[0].values).toMatchObject({
      name: 'Low Water', external_id: 'edge-board', external_id_namespace: 'scriptyard',
    })
    expect(doc.titlePage.map(e => e.key)).toEqual(
      ['Title', 'Credit', 'Author', 'Source', 'Draft date', 'Contact', 'Copyright'])
    expect(doc.meta['schema_version']).toBe('2.25')
  })

  it('maps entity fields and vocabularies', () => {
    expect(byName(doc, 'character', 'Ada').values).toMatchObject({
      role: 'protagonist', pronouns: 'she/her', occupation: 'Ferry pilot', age: '34',
      summary: 'Came home to sell the boat and stayed.',
      notes: 'Never says what she means the first time.',
    })
    expect(byName(doc, 'location', 'Kitchen').values).toMatchObject({
      location_type: 'interior', time_period: '1970s',
      setting: 'Low ceiling, one window over the sink.',
    })
    // Practical is SCF's `functional`; on set a practical is a working prop.
    expect(byName(doc, 'prop', 'Lantern').values['story_function']).toBe('functional')
    expect(byName(doc, 'prop', 'Knife').values['story_function']).toBe('macguffin')
    expect(byName(doc, 'theme', 'Grief').values).toMatchObject({
      statement: 'Grief unspoken hardens into blame.',
      opposition: 'Silence is also a kind of mercy.',
      description: 'Doors left open, meals left uneaten.',
    })
  })

  it('puts a location\'s mood in a location_design row', () => {
    const kitchen = byName(doc, 'location', 'Kitchen')
    expect(rows(doc, 'location_design')).toHaveLength(1)
    expect(rows(doc, 'location_design')[0].values).toMatchObject({
      location_id: kitchen.id, emotional_target: 'close, airless',
    })
  })

  it('leaves cut material out and says so', () => {
    expect(rows(doc, 'character').map(r => r.values['name'])).not.toContain('Zed')
    expect(rows(doc, 'prop').map(r => r.values['name'])).not.toContain('Old map')
    expect(rows(doc, 'scene').map(r => r.values['name'])).not.toContain('Deleted dream')
    expect(reported('omitted', 'Deleted dream')).toBe(true)
    expect(reported('omitted', 'Zed')).toBe(true)
  })

  it('exports an entity that is only in the library', () => {
    expect(byName(doc, 'character', 'Cy').values['notes']).toBe('Library only, never placed.')
  })

  it('flattens acts and sequences to spans that start at their first scene', () => {
    const kitchen = byName(doc, 'scene', 'Kitchen confrontation')
    expect(byName(doc, 'act', 'Act One').values).toMatchObject({
      act_number: 1, start_scene_id: kitchen.id,
      function: 'Bring her home and take away the easy exit.',
      dramatic_question: 'Will she sell?',
      summary: 'Everything here is arrival.',
    })
    expect(byName(doc, 'sequence', 'The Return').values).toMatchObject({
      sequence_number: 1, start_scene_id: kitchen.id, goal: 'Get the keys to the boat.',
    })
    expect(byName(doc, 'sequence', 'Coda').values['start_scene_id'])
      .toBe(byName(doc, 'scene', 'Epilogue').id)
  })

  it('exports an act with no scenes without a boundary, and reports it', () => {
    expect(byName(doc, 'act', 'Act Two').values['start_scene_id']).toBeUndefined()
    expect(reported('changed', 'Act "Act Two"')).toBe(true)
  })

  it('reports scenes that SCF\'s contiguous spans move', () => {
    // Aftermath is in Act One but in no sequence; it follows The Return's scenes.
    expect(doc.report.items.some(i =>
      i.kind === 'changed' && i.subject === 'Scene "Aftermath"' && i.detail.includes('sequence "The Return"'),
    )).toBe(true)
  })

  it('numbers scenes in script order', () => {
    expect(rows(doc, 'scene').map(r => [r.values['scene_number'], r.values['name']])).toEqual([
      ['1', 'Kitchen confrontation'],
      ['2', 'EXT. RIDGE - DAY'],
      ['3', 'Flash of the accident'],
      ['4', 'Aftermath'],
      ['5', 'Montage of crossings'],
      ['6', 'Epilogue'],
      ['7', 'Teaser'],
    ])
  })

  it('sets scene fields only where the board says so', () => {
    expect(byName(doc, 'scene', 'Kitchen confrontation').values).toMatchObject({
      int_ext: 'interior', time_of_day: 'night',
      location_id: byName(doc, 'location', 'Kitchen').id,
      summary: 'They talk about everything but the boat.',
      goal: 'Ask for the keys without asking.',
    })
    // A typed slugline is read for what it says.
    const ridge = byName(doc, 'scene', 'EXT. RIDGE - DAY').values
    expect(ridge['int_ext']).toBe('exterior')
    // Later is a continuity relation, not a light: unset, and reported.
    expect(ridge['time_of_day']).toBeUndefined()
    expect(reported('changed', 'Later')).toBe(true)
    // INT/EXT inherited from the Location; Continuous has no value.
    const aftermath = byName(doc, 'scene', 'Aftermath').values
    expect(aftermath['int_ext']).toBe('exterior')
    expect(aftermath['time_of_day']).toBeUndefined()
    // No INT/EXT anywhere: the heading's default is not recorded as a fact.
    expect(byName(doc, 'scene', 'Flash of the accident').values['int_ext']).toBeUndefined()
  })

  it('forces a heading that has no INT./EXT.', () => {
    expect(content).toContain('INT. KITCHEN - NIGHT')
    expect(content).toContain('.FLASH OF THE ACCIDENT')
  })

  it('links a character once per scene, however often it is placed', () => {
    const ada = byName(doc, 'character', 'Ada')
    const links = (scene: string) => rows(doc, 'scene_character')
      .filter(r => r.values['scene_id'] === byName(doc, 'scene', scene).id)
    expect(links('EXT. RIDGE - DAY')).toHaveLength(1)
    expect(links('EXT. RIDGE - DAY')[0].values).toMatchObject({
      character_id: ada.id, notes: 'second placement',
    })
    // Ada is in the scene and again in a beat inside it; Bo is only in the beat.
    expect(links('Kitchen confrontation').map(r => r.values['character_id']).sort())
      .toEqual([ada.id, byName(doc, 'character', 'Bo & Co').id].sort())
    // A character inside a Custom group still belongs to the scene around it.
    expect(links('Epilogue')).toHaveLength(1)
  })

  it('keeps placement notes on links', () => {
    const kitchen = byName(doc, 'scene', 'Kitchen confrontation')
    expect(rows(doc, 'scene_prop').find(r => r.values['scene_id'] === kitchen.id)!.values['usage_note'])
      .toBe('lit, on the table')
    expect(rows(doc, 'thematic_connection')
      .find(r => r.values['entity_type'] === 'scene' && r.values['entity_id'] === kitchen.id)!.values['notes'])
      .toBe('the empty chair')
  })

  it('connects themes to acts and sequences as well as scenes', () => {
    const grief = byName(doc, 'theme', 'Grief')
    const targets = rows(doc, 'thematic_connection')
      .filter(r => r.values['theme_id'] === grief.id)
      .map(r => r.values['entity_type'])
    expect(targets.sort()).toEqual(['act', 'scene', 'sequence'])
  })

  it('uses the first Location in a scene and writes the rest as prose', () => {
    expect(content).toContain('LOCATION: Barn')
    expect(reported('prose', 'Location "Barn"')).toBe(true)
  })

  it('turns beats in a scene into story beats, in row order', () => {
    const kitchen = byName(doc, 'scene', 'Kitchen confrontation')
    const beats = rows(doc, 'story_beat').filter(r => r.values['scene_id'] === kitchen.id)
    expect(beats.map(r => [r.values['beat_order'], r.values['name']])).toEqual([
      [1, 'Ada hesitates'],
      [2, 'The turn'],
    ])
    expect(beats[0].values['description']).toBe('She almost tells him.')
    expect(beats[1].values).toMatchObject({
      description: 'Bo stops joking.', notes: 'The scene pivots here.',
    })
  })

  it('writes a sub-beat as prose', () => {
    expect(content).toContain('BEAT: The lantern gutters')
    expect(rows(doc, 'story_beat').map(r => r.values['name'])).not.toContain('The lantern gutters')
  })

  it('writes a structural beat and what is in it as prose', () => {
    expect(content).toContain('BEAT: Meeting the Mentor — An older pilot offers her a way out.')
    expect(content).toContain('Structural beat, not inside a scene.')
    expect(content).toContain('BEAT: The offer — He names his price.')
    expect(content).toContain('BEAT: Refusal')
    expect(reported('prose', 'Beat "Meeting the Mentor"')).toBe(true)
  })

  it('writes characters and props placed above scene level as prose', () => {
    expect(content).toContain('CHARACTER: Ada')
    expect(content).toContain('PROP: Lantern')
    expect(reported('prose', 'Character "Ada"')).toBe(true)
  })

  it('makes shots in a scene rows and shots elsewhere prose', () => {
    const kitchen = byName(doc, 'scene', 'Kitchen confrontation')
    const shots = rows(doc, 'shot').filter(r => r.values['scene_id'] === kitchen.id)
    expect(shots.map(r => [r.values['shot_order'], r.values['name'], r.values['shot_size']])).toEqual([
      [1, 'Ada\'s hands', 'close-up'],
      [2, 'Over Bo', undefined],
    ])
    // A shot inside a beat inside the scene knows its beat.
    expect(shots[1].values['story_beat_id']).toBe(byName(doc, 'story_beat', 'The turn').id)
    expect(shots[1].values['description']).toBe('Keep Ada small.\nFraming: OTS')
    expect(byName(doc, 'shot', 'The ridge').values['shot_size']).toBe('extreme wide')
    expect(reported('changed', 'dreamy')).toBe(true)
    // Outside a scene.
    expect(content).toContain('WIDE: THE FERRY LANDING. Place us before anyone speaks.')
    expect(content).toContain('ECU: UNPLACED INSERT.')
    // Shot numbers are issued by a production, not by an outline.
    expect(rows(doc, 'shot').every(r => r.values['shot_number'] === undefined)).toBe(true)
  })

  it('makes an arc a character arc only when its subject is a character', () => {
    expect(rows(doc, 'character_arc')).toHaveLength(1)
    expect(rows(doc, 'character_arc')[0].values).toMatchObject({
      name: 'Ada thaws', character_id: byName(doc, 'character', 'Ada').id,
      axis: 'guarded → open', direction: 'positive',
    })
    expect(content).toContain('ARC: The town forgets — The town itself: memory → rumour')
    expect(reported('prose', 'Arc "The town forgets"')).toBe(true)
  })

  it('records an arc stage where an arc card carries a placement note', () => {
    expect(rows(doc, 'character_arc_state')).toHaveLength(1)
    expect(rows(doc, 'character_arc_state')[0].values).toMatchObject({
      character_arc_id: 1,
      scene_id: byName(doc, 'scene', 'Kitchen confrontation').id,
      stage_label: 'walls up',
    })
    // The same arc placed in an act has no scene to be a stage at.
    expect(content).toContain('ARC: Ada thaws')
  })

  it('attaches thoughts to where they sit, by uuid', () => {
    const attached = (name: string) =>
      JSON.parse(String(byName(doc, 'collaboration_note', name).values['affected_entities'] ?? '[]'))
    expect(attached('Blocking')).toEqual([`scene:${byName(doc, 'scene', 'Kitchen confrontation').uuid}`])
    expect(attached('Pacing')).toEqual([`act:${byName(doc, 'act', 'Act One').uuid}`])
    // Inside a structural beat inside Act One: it is still inside Act One.
    expect(attached('Refusal note')).toEqual([`act:${byName(doc, 'act', 'Act One').uuid}`])
    expect(attached('Title idea')).toEqual([])
    expect(byName(doc, 'collaboration_note', 'Title idea').values).toMatchObject({
      note_type: 'general', content: 'Call it "Low Water".',
    })
  })

  it('starts the script with what belongs to no scene, and does not end on a blank', () => {
    expect(doc.lines[0].lineType).toBe('action')
    expect(doc.lines.findIndex(l => l.lineType === 'section')).toBeGreaterThan(0)
    expect(doc.lines[doc.lines.length - 1].lineType).not.toBe('blank')
  })
})
