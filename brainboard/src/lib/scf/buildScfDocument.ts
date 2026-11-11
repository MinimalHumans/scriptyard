/**
 * buildScfDocument.ts
 * -------------------
 * Converts a Scriptyard board into the rows and script lines of an SCF file.
 *
 * A board is an outline for writing a screenplay; an SCF file is the
 * structured record of one. Where the two line up, a card or backdrop becomes
 * a row, and the outline's hierarchy is kept as a head start for the writer.
 * Where they do not, the rule is always the same:
 *
 *   Anything that does not map is written into the screenplay as a prose
 *   action line and listed in the export report. Nothing is omitted, and
 *   nothing is invented.
 *
 * So a Beat backdrop that is not inside a scene — which SCF has no row for —
 * becomes the line `BEAT: Meeting the Mentor`, in its place in the script.
 *
 * What maps, by where a card sits:
 *
 *              in a scene              in an act/sequence    loose
 *   Character  scene_character         prose                 character row
 *   Prop       scene_prop              prose                 prop row
 *   Location   scene.location_id       prose                 location row
 *   Theme      thematic_connection     thematic_connection   theme row
 *   Arc        character_arc_state     prose                 character_arc row
 *   Thought    collaboration_note      collaboration_note    collaboration_note
 *   Shot       shot                    prose                 prose
 *   Beat       story_beat              prose                 prose
 *
 * Every card's entity gets its own row wherever the card sits; the table is
 * about the placement. Cards inside a structural Beat count as sitting in the
 * act or sequence around it.
 *
 * Acts and sequences are not containers in SCF. Each is a span that starts at
 * a scene and runs until the next span of its kind starts (SCF spec §5), so
 * the board's nesting is flattened: a span starts at the first scene the walk
 * meets inside it.
 *
 * Cut material is left out, exactly as the Fountain and FDX exports leave it
 * out, and counted in the report.
 */

import type { Backdrop, Board, Card, Entity } from '@/types/board'
import { walkBoard, type SceneBackdropVisit, type SceneCardVisit, type Visit } from '@/utils/boardWalk'
import { isCutBackdrop, isCutEntity, rowSort } from '@/utils/screenplayCommon'
import {
  SCF_EXTERNAL_NAMESPACE,
  SCF_SCHEMA_VERSION,
  type ReportItem,
  type ReportKind,
  type ScfDocument,
  type ScfLine,
  type ScfLineType,
  type ScfRow,
  type ScfValue,
} from './scfDocument'
import {
  directionOf,
  intExtFromAttr,
  intExtFromHeading,
  intExtFromLocationType,
  isFountainHeading,
  locationTypeOf,
  parseFraming,
  roleOf,
  storyFunctionOf,
  timeOfDayFromHeading,
  timeOfDayOf,
} from './scfVocab'

export interface BuildScfOptions {
  /** Clock for the file's `updated_at` stamp. Defaults to now. */
  now?:       Date
  /** Uuid source. Defaults to random v4; tests pass a counter. */
  newUuid?:   () => string
  /** Written to `_scf_meta.editor_version`, e.g. "Scriptyard v1.4.0". */
  generator?: string
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // crypto.randomUUID only exists in secure contexts; getRandomValues is
  // available everywhere the app runs.
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Trimmed string attribute, or '' when unset. */
function attr(attributes: Record<string, string | string[]> | undefined, key: string): string {
  const v = attributes?.[key]
  return typeof v === 'string' ? v.trim() : ''
}

/** Scriptyard's Draft maps to SCF's `draft`; Active is SCF's default. Cut never gets here. */
function lifecycleOf(status: string): string | undefined {
  return status === 'Draft' ? 'draft' : undefined
}

function joinNotes(parts: (string | undefined)[]): string {
  return [...new Set(parts.map(p => p?.trim()).filter(Boolean))].join('\n\n')
}

const quote = (s: string) => `"${s}"`

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildScfDocument(board: Board, options: BuildScfOptions = {}): ScfDocument {
  const newUuid = options.newUuid ?? randomUuid
  const now     = options.now ?? new Date()
  const walk    = walkBoard(board)
  const { eMap, cardParent } = walk

  // ── Tables ────────────────────────────────────────────────────────────────

  const tables: Record<string, ScfRow[]> = {}

  /** Add a row. Empty strings, null and undefined are left out so column defaults apply. */
  function add(table: string, values: Record<string, ScfValue | undefined>): ScfRow {
    const clean: Record<string, ScfValue> = {}
    for (const [k, v] of Object.entries(values)) {
      if (v === undefined || v === null || v === '') continue
      clean[k] = v
    }
    const rows = (tables[table] ??= [])
    const row: ScfRow = { id: rows.length + 1, uuid: newUuid(), values: clean }
    rows.push(row)
    return row
  }

  /*
   * external_id is the hook a later re-sync matches on (SCF forbids matching
   * rows across files by uuid), so it has to be unique within a table. One
   * Scriptyard entity usually becomes one row; where a Shot, Beat or Scene
   * entity is placed more than once and so becomes several, the later rows
   * are told apart by the card that placed them.
   */
  const usedExternalIds = new Map<string, Set<string>>()
  function externalId(table: string, id: string, cardId?: string): Record<string, string> {
    const used = usedExternalIds.get(table) ?? new Set<string>()
    usedExternalIds.set(table, used)
    const value = used.has(id) && cardId ? `${id}:${cardId}` : id
    used.add(value)
    return { external_id: value, external_id_namespace: SCF_EXTERNAL_NAMESPACE }
  }

  // ── Report ────────────────────────────────────────────────────────────────

  const items: ReportItem[] = []
  function report(kind: ReportKind, subject: string, where: string | null, detail: string) {
    items.push({ kind, subject, where, detail })
  }

  // ── Script lines ──────────────────────────────────────────────────────────

  /** Lines that belong to no scene and no span: written before the first section. */
  const preamble: ScfLine[] = []
  const body:     ScfLine[] = []

  function line(
    list: ScfLine[], lineType: ScfLineType, content: string,
    extra: Partial<Pick<ScfLine, 'sceneId' | 'locationId' | 'metadata'>> = {},
  ) {
    list.push({
      uuid: newUuid(), lineType, content,
      sceneId: extra.sceneId ?? null,
      locationId: extra.locationId ?? null,
      metadata: extra.metadata ?? null,
    })
  }

  /**
   * One paragraph of action, then a blank line. Text may span lines; a blank
   * line inside it stays a blank line.
   *
   * Every paragraph ends in a blank on purpose: an upper-case line directly
   * followed by text reads as a character cue to anything that re-parses the
   * script as Fountain, and these lines are labels, not dialogue.
   */
  function prose(list: ScfLine[], text: string) {
    const rows = text.replace(/\r\n/g, '\n').split('\n').map(r => r.trimEnd())
    while (rows.length && !rows[0].trim()) rows.shift()
    while (rows.length && !rows[rows.length - 1].trim()) rows.pop()
    if (!rows.length) return
    for (const r of rows) line(list, r.trim() ? 'action' : 'blank', r)
    line(list, 'blank', '')
  }

  /** `LABEL: Title`, with a detail after an em dash when there is one. */
  function label(tag: string, title: string, detail?: string): string {
    const d = detail?.trim()
    // A multi-line detail goes below the label as its own paragraph.
    if (d && d.includes('\n')) return `${tag}: ${title}\n\n${d}`
    return d ? `${tag}: ${title} — ${d}` : `${tag}: ${title}`
  }

  // ── Project and title page ────────────────────────────────────────────────

  const projectName = board.name.trim() || 'Untitled'
  add('project', { name: projectName, ...externalId('project', board.boardId) })

  const info = board.projectInfo ?? {}
  const titlePage = [
    { key: 'Title',      value: projectName },
    { key: 'Credit',     value: info.credit?.trim() ?? '' },
    { key: 'Author',     value: info.author?.trim() ?? '' },
    { key: 'Source',     value: info.source?.trim() ?? '' },
    { key: 'Draft date', value: info.draftDate?.trim() ?? '' },
    { key: 'Contact',    value: info.contact?.trim() ?? '' },
    { key: 'Copyright',  value: info.copyright?.trim() ?? '' },
  ].filter(e => e.value)

  // ── Entities ──────────────────────────────────────────────────────────────
  // One row per entity that has at least one live card, in library order. An
  // entity whose every card was cut is not in the film and gets no row.

  const liveEntityIds = new Set(walk.cards.map(c => c.entityId))
  const liveEntities  = board.entities.filter(e => liveEntityIds.has(e.id))

  const characterRow = new Map<string, ScfRow>()
  const locationRow  = new Map<string, ScfRow>()
  const propRow      = new Map<string, ScfRow>()
  const themeRow     = new Map<string, ScfRow>()
  const thoughtRow   = new Map<string, ScfRow>()
  const arcRow       = new Map<string, ScfRow>()

  for (const e of liveEntities.filter(e => e.type === 'Character')) {
    characterRow.set(e.id, add('character', {
      name:             e.title.trim() || 'Untitled character',
      role:             roleOf(attr(e.attributes, 'role')),
      age:              attr(e.attributes, 'age'),
      pronouns:         attr(e.attributes, 'pronouns'),
      occupation:       attr(e.attributes, 'occupation'),
      summary:          attr(e.attributes, 'summary'),
      notes:            e.noteRaw?.trim(),
      lifecycle_status: lifecycleOf(attr(e.attributes, 'status')),
      ...externalId('character', e.id),
    }))
  }

  for (const e of liveEntities.filter(e => e.type === 'Location')) {
    const row = add('location', {
      name:             e.title.trim() || 'Untitled location',
      location_type:    locationTypeOf(attr(e.attributes, 'type')),
      setting:          attr(e.attributes, 'description'),
      time_period:      attr(e.attributes, 'period'),
      notes:            e.noteRaw?.trim(),
      lifecycle_status: lifecycleOf(attr(e.attributes, 'status')),
      ...externalId('location', e.id),
    })
    locationRow.set(e.id, row)
    // A location's mood is a design decision in SCF, not part of its identity.
    const mood = attr(e.attributes, 'mood')
    if (mood) add('location_design', { location_id: row.id, emotional_target: mood })
  }

  for (const e of liveEntities.filter(e => e.type === 'Prop')) {
    propRow.set(e.id, add('prop', {
      name:             e.title.trim() || 'Untitled prop',
      description:      attr(e.attributes, 'description'),
      story_function:   storyFunctionOf(attr(e.attributes, 'story_function')),
      notes:            e.noteRaw?.trim(),
      lifecycle_status: lifecycleOf(attr(e.attributes, 'status')),
      ...externalId('prop', e.id),
    }))
  }

  for (const e of liveEntities.filter(e => e.type === 'Theme')) {
    themeRow.set(e.id, add('theme', {
      name:             e.title.trim() || 'Untitled theme',
      description:      attr(e.attributes, 'expression'),
      statement:        attr(e.attributes, 'statement'),
      opposition:       attr(e.attributes, 'opposition'),
      notes:            e.noteRaw?.trim(),
      lifecycle_status: lifecycleOf(attr(e.attributes, 'status')),
      ...externalId('theme', e.id),
    }))
  }

  /*
   * An SCF arc belongs to a character. A Scriptyard arc names its subject in
   * free text, so it becomes a character_arc only when that text is the name
   * of a character on the board. Any other arc — a town's, a relationship's —
   * has no row to live in and is written at the top of the script in full.
   */
  const characterByName = new Map<string, ScfRow>()
  for (const e of liveEntities.filter(e => e.type === 'Character')) {
    const key = e.title.trim().toLowerCase()
    if (key && !characterByName.has(key)) characterByName.set(key, characterRow.get(e.id)!)
  }

  for (const e of liveEntities.filter(e => e.type === 'Arc')) {
    const title     = e.title.trim() || 'Untitled arc'
    const subject   = attr(e.attributes, 'subject')
    const axis      = attr(e.attributes, 'axis')
    const direction = attr(e.attributes, 'direction')
    const owner     = characterByName.get(subject.toLowerCase())

    if (owner) {
      arcRow.set(e.id, add('character_arc', {
        name:             title,
        character_id:     owner.id,
        axis,
        direction:        directionOf(direction),
        notes:            e.noteRaw?.trim(),
        lifecycle_status: lifecycleOf(attr(e.attributes, 'status')),
        ...externalId('character_arc', e.id),
      }))
      continue
    }

    const facts = [
      subject && axis ? `${subject}: ${axis}` : subject || axis,
      direction && `(${direction})`,
    ].filter(Boolean).join(' ')
    prose(preamble, label('ARC', title, facts))
    if (e.noteRaw?.trim()) prose(preamble, e.noteRaw)
    report('prose', `Arc ${quote(title)}`, null, subject
      ? `Its subject, ${quote(subject)}, is not the name of a character on the board, so it is written at the top of the script.`
      : 'It names no subject, so it is written at the top of the script.')
  }

  /** Rows a Thought is attached to, as SCF's `entity:uuid` strings. */
  const thoughtAttached = new Map<string, Set<string>>()
  /** Placement notes on a Thought's cards, kept with the note itself. */
  const thoughtPlacementNotes = new Map<string, string[]>()

  for (const e of liveEntities.filter(e => e.type === 'Thought')) {
    thoughtRow.set(e.id, add('collaboration_note', {
      name:             e.title.trim(),
      note_type:        'general',
      // `content` is the one required field; a thought with no note is its title.
      content:          e.noteRaw?.trim() || e.title.trim() || 'Untitled thought',
      lifecycle_status: lifecycleOf(attr(e.attributes, 'status')),
    }))
  }

  // ── Placement helpers ─────────────────────────────────────────────────────

  const entityOf = (c: Card): Entity | undefined => eMap.get(c.entityId)
  const titleOf  = (c: Card): string => (entityOf(c)?.title ?? c.title).trim() || `Untitled ${c.type.toLowerCase()}`
  const noteOf   = (c: Card): string => (entityOf(c)?.noteRaw ?? c.noteRaw ?? '').trim()

  function attachThought(c: Card, target: string | null) {
    if (target) {
      const set = thoughtAttached.get(c.entityId) ?? new Set<string>()
      thoughtAttached.set(c.entityId, set)
      set.add(target)
    }
    if (c.instanceNote?.trim()) {
      const list = thoughtPlacementNotes.get(c.entityId) ?? []
      thoughtPlacementNotes.set(c.entityId, list)
      list.push(c.instanceNote.trim())
    }
  }

  /** The line a Shot becomes when it has no scene to belong to. */
  function shotLine(c: Card): string {
    const e       = entityOf(c)
    const framing = attr(e?.attributes, 'framing')
    const purpose = attr(e?.attributes, 'purpose')
    const prefix  = framing ? framing.toUpperCase() : 'ANGLE ON'
    const title   = titleOf(c).toUpperCase()
    return purpose ? `${prefix}: ${title}. ${purpose}` : `${prefix}: ${title}.`
  }

  /** The line an Arc card becomes when its placement has no row. */
  function arcLine(c: Card): string {
    return label('ARC', titleOf(c), c.instanceNote)
  }

  /**
   * Write one card as prose and report it. Used wherever a card's placement
   * has no row — its entity, where it has one, is a row regardless.
   */
  function cardAsProse(list: ScfLine[], c: Card, where: string, why: string) {
    switch (c.type) {
      case 'Character': prose(list, label('CHARACTER', titleOf(c), c.instanceNote)); break
      case 'Prop':      prose(list, label('PROP', titleOf(c), c.instanceNote));      break
      case 'Location':  prose(list, label('LOCATION', titleOf(c), c.instanceNote));  break
      case 'Theme':     prose(list, label('THEME', titleOf(c), c.instanceNote));     break
      case 'Arc':       prose(list, arcLine(c));                                      break
      case 'Shot':      prose(list, shotLine(c));                                     break
      case 'Beat':
        prose(list, label('BEAT', titleOf(c), joinNotes([noteOf(c), c.instanceNote])))
        break
      default: return
    }
    report('prose', `${c.type} ${quote(titleOf(c))}`, where, why)
  }

  // ── Structure ─────────────────────────────────────────────────────────────

  const actRow      = new Map<string, ScfRow>()   // backdrop id → act row
  const sequenceRow = new Map<string, ScfRow>()   // backdrop id → sequence row
  const spanTitle   = new Map<ScfRow, string>()

  interface SceneRecord {
    row:      ScfRow
    title:    string
    /** The act and sequence the board puts the scene in, if any. */
    act?:      ScfRow
    sequence?: ScfRow
  }
  const scenes: SceneRecord[] = []

  /** Location cards a Scene card borrowed for its heading: already accounted for. */
  const borrowedLocations = new Set<string>()
  for (const v of walk.visits) {
    if (v.kind === 'sceneCard' && v.location) borrowedLocations.add(v.location.id)
  }

  /** Innermost Act and Sequence around a visit. */
  function spansAround(ancestors: Backdrop[]): { act?: ScfRow; sequence?: ScfRow } {
    let act: ScfRow | undefined
    let sequence: ScfRow | undefined
    for (const a of ancestors) {
      if (a.type === 'Act')      act      = actRow.get(a.id)
      if (a.type === 'Sequence') sequence = sequenceRow.get(a.id)
    }
    return { act, sequence }
  }

  /** The innermost act or sequence around a visit, as a thing to attach to. */
  function innermostSpan(ancestors: Backdrop[]): { kind: 'act' | 'sequence'; row: ScfRow } | undefined {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const a = ancestors[i]
      if (a.type === 'Act'      && actRow.has(a.id))      return { kind: 'act',      row: actRow.get(a.id)! }
      if (a.type === 'Sequence' && sequenceRow.has(a.id)) return { kind: 'sequence', row: sequenceRow.get(a.id)! }
    }
    return undefined
  }

  /** Thematic connections already written, so a theme placed twice links once. */
  const connected = new Set<string>()
  function connectTheme(c: Card, kind: 'scene' | 'act' | 'sequence', target: ScfRow) {
    const theme = themeRow.get(c.entityId)
    if (!theme) return
    const key = `${theme.id}:${kind}:${target.id}`
    if (connected.has(key)) return
    connected.add(key)
    add('thematic_connection', {
      theme_id:    theme.id,
      entity_type: kind,
      entity_id:   target.id,
      notes:       c.instanceNote?.trim(),
    })
  }

  /**
   * Cards sitting in an act, a sequence or a structural beat. Themes and
   * thoughts attach to the span around them; everything else is prose.
   */
  function emitSpanCards(
    cards: Card[], where: string,
    span: { kind: 'act' | 'sequence'; row: ScfRow } | undefined,
    inBeat = false,
  ) {
    for (const c of cards) {
      if (c.type === 'Thought') {
        attachThought(c, span ? `${span.kind}:${span.row.uuid}` : null)
        continue
      }
      if (c.type === 'Theme' && span) {
        connectTheme(c, span.kind, span.row)
        continue
      }
      if (c.type === 'Location' && borrowedLocations.has(c.id)) continue
      cardAsProse(body, c, where,
        c.type === 'Shot' ? 'A shot belongs to a scene in SCF, and this one is not in a scene.'
        : c.type === 'Beat' ? 'A beat belongs to a scene in SCF, and this one is not in a scene.'
        : c.type === 'Arc' ? 'An arc\'s stages are recorded at scenes in SCF, and this placement is not in a scene.'
        : c.type === 'Theme' ? 'It is not inside a scene, act or sequence, so there is nothing to connect the theme to.'
        : inBeat ? `It sits in a beat that is not in a scene, so there is no scene to link the ${c.type.toLowerCase()} to.`
        : `SCF derives who and what is in an act or sequence from its scenes, so a ${c.type.toLowerCase()} placed above scene level has no row.`)
    }
  }

  function emitSpan(v: Extract<Visit, { kind: 'act' | 'sequence' }>) {
    const { bd } = v
    const title = bd.title.trim() || (v.kind === 'act' ? 'Untitled act' : 'Untitled sequence')
    const table = v.kind
    const number = (tables[table]?.length ?? 0) + 1

    const row = v.kind === 'act'
      ? add('act', {
          name:              title,
          act_number:        number,
          function:          attr(bd.attributes, 'function'),
          dramatic_question: attr(bd.attributes, 'dramatic_question'),
          shift:             attr(bd.attributes, 'shift'),
          summary:           bd.note?.trim(),
          lifecycle_status:  lifecycleOf(attr(bd.attributes, 'status')),
          ...externalId('act', bd.id),
        })
      : add('sequence', {
          name:             title,
          sequence_number:  number,
          summary:          bd.note?.trim(),
          goal:             attr(bd.attributes, 'goal'),
          conflict:         attr(bd.attributes, 'conflict'),
          outcome:          attr(bd.attributes, 'outcome'),
          lifecycle_status: lifecycleOf(attr(bd.attributes, 'status')),
          ...externalId('sequence', bd.id),
        })

    ;(v.kind === 'act' ? actRow : sequenceRow).set(bd.id, row)
    spanTitle.set(row, title)

    /*
     * The section line names the span it declares, by uuid (SCF spec §1.3.1).
     * Without that binding an editor reading the file would take the line for
     * a new act and create a second one beside this row.
     */
    const depth = v.kind === 'act' ? 1 : 2
    line(body, 'section', `${'#'.repeat(depth)} ${title}`, {
      metadata: {
        section:      { depth, text: title },
        structureRef: { kind: v.kind, uuid: row.uuid },
      },
    })
    line(body, 'blank', '')

    emitSpanCards(v.cards, `${v.kind === 'act' ? 'Act' : 'Sequence'} ${quote(title)}`, { kind: v.kind, row })
  }

  function emitStructuralBeat(v: Extract<Visit, { kind: 'beat' }>) {
    const { bd } = v
    const title = bd.title.trim() || 'Untitled beat'
    const where = `Beat ${quote(title)}`

    prose(body, label('BEAT', title, attr(bd.attributes, 'description')))
    if (bd.note?.trim()) prose(body, bd.note)
    report('prose', where, null,
      'A beat belongs to a scene in SCF, and this one is not in a scene.')

    emitSpanCards(v.cards, where, innermostSpan(v.ancestors), true)
  }

  // ── Scenes ────────────────────────────────────────────────────────────────

  function addScene(
    v: SceneBackdropVisit | SceneCardVisit,
    fields: {
      title: string; attributes: Record<string, string | string[]> | undefined
      note: string; notes: string; idSource: string; cardId?: string
    },
  ): { row: ScfRow; where: string; locationId: number | null } {
    const { title, attributes } = fields
    const where     = `Scene ${quote(title)}`
    const locEntity = v.location ? eMap.get(v.location.entityId) : undefined
    const location  = v.location ? locationRow.get(v.location.entityId) : undefined
    const verbatim  = v.heading.source === 'verbatim'

    /*
     * Fields are set only where the board actually says so. The heading text
     * falls back to INT. and DAY when nothing is specified; those defaults are
     * a convenience for the page and are not recorded as facts about the scene.
     */
    const intExt = intExtFromAttr(attr(attributes, 'int_ext'))
      ?? intExtFromLocationType(attr(locEntity?.attributes, 'type'))
      ?? (verbatim ? intExtFromHeading(v.heading.raw) : undefined)

    const timeAttr = attr(attributes, 'time_of_day')
    const time = timeAttr
      ? timeOfDayOf(timeAttr)
      : (verbatim ? timeOfDayFromHeading(v.heading.raw) : undefined)
    if (timeAttr && !time) {
      report('changed', where, null,
        `Time of day ${quote(timeAttr)} says when the scene follows the last one, not what the light is, so it stays in the heading text only.`)
    }

    const row = add('scene', {
      name:             title,
      scene_number:     String(scenes.length + 1),
      int_ext:          intExt,
      location_id:      location?.id,
      time_of_day:      time,
      summary:          fields.note,
      goal:             attr(attributes, 'goal'),
      conflict:         attr(attributes, 'conflict'),
      outcome:          attr(attributes, 'outcome'),
      notes:            fields.notes,
      lifecycle_status: lifecycleOf(attr(attributes, 'status')),
      ...externalId('scene', fields.idSource, fields.cardId),
    })

    // A span starts at the first scene the walk meets inside it.
    for (const a of v.ancestors) {
      const span = a.type === 'Act' ? actRow.get(a.id) : a.type === 'Sequence' ? sequenceRow.get(a.id) : undefined
      if (span && span.values['start_scene_id'] === undefined) span.values['start_scene_id'] = row.id
    }
    scenes.push({ row, title, ...spansAround(v.ancestors) })

    // A heading with no INT./EXT. is forced with a leading dot, as Fountain
    // writes it, so it is still a heading to anything that re-reads the text.
    const heading = isFountainHeading(v.heading.raw) ? v.heading.raw : `.${v.heading.raw}`
    line(body, 'heading', heading, { sceneId: row.id, locationId: location?.id ?? null })
    line(body, 'blank', '')

    return { row, where, locationId: location?.id ?? null }
  }

  function emitSceneBackdrop(v: SceneBackdropVisit) {
    const { bd } = v
    const title = bd.title.trim() || 'Untitled scene'
    const { row: scene, where } = addScene(v, {
      title, attributes: bd.attributes, note: bd.note?.trim() ?? '', notes: '', idSource: bd.id,
    })
    const sceneRef = `scene:${scene.uuid}`

    /*
     * Beats. A Beat backdrop or card sitting directly in the scene is a
     * story_beat. One nested inside another beat is a sub-beat, which SCF's
     * flat list of beats cannot hold, so it is prose.
     */
    const topBeats = v.beats.filter(b => walk.bdParent.get(b.id) === bd.id)
    const beatRow  = new Map<string, ScfRow>()   // beat backdrop id → story_beat row
    const directBeatCards = v.cards.filter(c => c.type === 'Beat' && cardParent.get(c.id) === bd.id)
    const seenBeatEntities = new Set<string>()

    type BeatSource = { position: { x: number; y: number }; bd?: Backdrop; card?: Card }
    const ordered = rowSort<BeatSource>([
      ...topBeats.map(b => ({ position: b.position, bd: b })),
      ...directBeatCards.map(c => ({ position: c.position, card: c })),
    ])
    let beatOrder = 0
    for (const src of ordered) {
      if (src.bd) {
        beatRow.set(src.bd.id, add('story_beat', {
          name:             src.bd.title.trim() || 'Untitled beat',
          scene_id:         scene.id,
          beat_order:       ++beatOrder,
          description:      attr(src.bd.attributes, 'description'),
          notes:            src.bd.note?.trim(),
          lifecycle_status: lifecycleOf(attr(src.bd.attributes, 'status')),
          ...externalId('story_beat', src.bd.id),
        }))
      } else if (src.card) {
        if (seenBeatEntities.has(src.card.entityId)) continue
        seenBeatEntities.add(src.card.entityId)
        add('story_beat', {
          name:             titleOf(src.card),
          scene_id:         scene.id,
          beat_order:       ++beatOrder,
          // A Beat card is a name and a note; the note is what happens.
          description:      noteOf(src.card),
          notes:            src.card.instanceNote?.trim(),
          lifecycle_status: lifecycleOf(attr(entityOf(src.card)?.attributes, 'status')),
          ...externalId('story_beat', src.card.entityId, src.card.id),
        })
      }
    }

    /** The story_beat a card sits in: the top-level beat around it, if any. */
    function beatAround(c: Card): ScfRow | undefined {
      let id = cardParent.get(c.id) ?? null
      let found: ScfRow | undefined
      while (id && id !== bd.id) {
        found = beatRow.get(id) ?? found
        id = walk.bdParent.get(id) ?? null
      }
      return found
    }

    for (const b of v.beats) {
      if (beatRow.has(b.id)) continue
      const subTitle = b.title.trim() || 'Untitled beat'
      prose(body, label('BEAT', subTitle, attr(b.attributes, 'description')))
      if (b.note?.trim()) prose(body, b.note)
      report('prose', `Beat ${quote(subTitle)}`, where,
        'It is nested inside another beat. SCF keeps a scene\'s beats as a flat list, so the sub-beat is written as a script line.')
    }

    // Links. One row per character, prop and theme however many times it is placed.
    const characterLink = new Map<string, { row: ScfRow; notes: string[] }>()
    const propLink      = new Map<string, { row: ScfRow; notes: string[] }>()
    const arcState      = new Map<string, { row: ScfRow; labels: string[] }>()
    const seenShots     = new Set<string>()
    let shotOrder = 0

    for (const c of v.cards) {
      switch (c.type) {
        case 'Character': {
          const character = characterRow.get(c.entityId)
          if (!character) break
          let link = characterLink.get(c.entityId)
          if (!link) {
            link = { row: add('scene_character', { scene_id: scene.id, character_id: character.id }), notes: [] }
            characterLink.set(c.entityId, link)
          }
          if (c.instanceNote?.trim()) link.notes.push(c.instanceNote)
          break
        }

        case 'Prop': {
          const prop = propRow.get(c.entityId)
          if (!prop) break
          let link = propLink.get(c.entityId)
          if (!link) {
            link = { row: add('scene_prop', { scene_id: scene.id, prop_id: prop.id }), notes: [] }
            propLink.set(c.entityId, link)
          }
          if (c.instanceNote?.trim()) link.notes.push(c.instanceNote)
          break
        }

        case 'Location': {
          // The scene's own Location is already on the scene row and in the
          // heading; a second card for the same place adds nothing.
          const isSceneLocation = v.location && c.entityId === v.location.entityId
          if (isSceneLocation && !c.instanceNote?.trim()) break
          cardAsProse(body, c, where, isSceneLocation
            ? 'A scene\'s link to its location has nowhere to keep a note, so the placement note is written as a script line.'
            : 'A scene has one location in SCF. The first Location card in the scene is used; this one is written as a script line.')
          break
        }

        case 'Theme':
          connectTheme(c, 'scene', scene)
          break

        case 'Arc': {
          const arc = arcRow.get(c.entityId)
          const stage = c.instanceNote?.trim()
          if (!arc) {
            cardAsProse(body, c, where,
              'The arc has no character to belong to, so its placement is written as a script line.')
            break
          }
          /*
           * A stage is in force from its scene until the next one, so an arc
           * card with no placement note cannot become a stage: an empty stage
           * would replace the one before it for the rest of the story.
           */
          if (!stage) {
            cardAsProse(body, c, where,
              'The card has no placement note to name the stage the arc has reached, so it is written as a script line.')
            break
          }
          let state = arcState.get(c.entityId)
          if (!state) {
            state = { row: add('character_arc_state', { character_arc_id: arc.id, scene_id: scene.id }), labels: [] }
            arcState.set(c.entityId, state)
          }
          state.labels.push(stage)
          break
        }

        case 'Thought':
          attachThought(c, sceneRef)
          break

        case 'Shot': {
          if (seenShots.has(c.entityId)) break
          seenShots.add(c.entityId)
          const e       = entityOf(c)
          const framing = attr(e?.attributes, 'framing')
          const subject = attr(e?.attributes, 'subject')
          const parsed  = parseFraming(framing)
          const shotTitle = titleOf(c)
          if (framing && !parsed) {
            report('changed', `Shot ${quote(shotTitle)}`, where,
              `Framing ${quote(framing)} is not a shot size SCF lists, so it is kept in the shot's description.`)
          }
          add('shot', {
            name:             shotTitle,
            scene_id:         scene.id,
            shot_order:       ++shotOrder,
            story_beat_id:    beatAround(c)?.id,
            shot_size:        parsed?.shotSize,
            camera_angle:     parsed?.cameraAngle,
            description:      [
              attr(e?.attributes, 'purpose'),
              subject && `Subject: ${subject}`,
              framing && !parsed && `Framing: ${framing}`,
            ].filter(Boolean).join('\n'),
            notes:            joinNotes([noteOf(c), c.instanceNote]),
            lifecycle_status: lifecycleOf(attr(e?.attributes, 'status')),
            ...externalId('shot', c.entityId, c.id),
          })
          break
        }

        case 'Beat': {
          if (cardParent.get(c.id) === bd.id) break   // already a story_beat
          cardAsProse(body, c, where,
            'It sits inside another beat. SCF keeps a scene\'s beats as a flat list, so the sub-beat is written as a script line.')
          break
        }
      }
    }

    for (const link of characterLink.values()) {
      const notes = joinNotes(link.notes)
      if (notes) link.row.values['notes'] = notes
    }
    for (const link of propLink.values()) {
      const notes = joinNotes(link.notes)
      if (notes) link.row.values['usage_note'] = notes
    }
    for (const state of arcState.values()) {
      state.row.values['stage_label'] = [...new Set(state.labels)].join('; ')
    }
  }

  function emitSceneCard(v: SceneCardVisit) {
    const title = (v.entity?.title ?? v.card.title).trim() || 'Untitled scene'
    addScene(v, {
      title,
      attributes: v.entity?.attributes,
      note:       (v.entity?.noteRaw ?? v.card.noteRaw ?? '').trim(),
      notes:      v.card.instanceNote?.trim() ?? '',
      idSource:   v.card.entityId,
      cardId:     v.card.id,
    })
  }

  // ── Walk ──────────────────────────────────────────────────────────────────

  for (const v of walk.visits) {
    switch (v.kind) {
      case 'act':
      case 'sequence':      emitSpan(v);           break
      case 'beat':          emitStructuralBeat(v); break
      case 'sceneBackdrop': emitSceneBackdrop(v);  break
      case 'sceneCard':     emitSceneCard(v);      break
    }
  }

  // ── Loose cards ───────────────────────────────────────────────────────────
  // Characters, locations, props, themes and matched arcs in no backdrop are
  // the entity library: their rows are written above and that is all of them.

  for (const c of rowSort(walk.rootCards)) {
    if (c.type === 'Thought') { attachThought(c, null); continue }
    if (c.type === 'Shot') {
      cardAsProse(preamble, c, 'no backdrop',
        'A shot belongs to a scene in SCF, and this one is not in a scene. It is written at the top of the script.')
    }
    if (c.type === 'Beat') {
      cardAsProse(preamble, c, 'no backdrop',
        'A beat belongs to a scene in SCF, and this one is not in a scene. It is written at the top of the script.')
    }
  }

  // ── Thoughts: attachments and placement notes ─────────────────────────────

  for (const [entityId, row] of thoughtRow) {
    const attached = thoughtAttached.get(entityId)
    // By uuid, never by row id (SCF spec §12.14).
    if (attached?.size) row.values['affected_entities'] = JSON.stringify([...attached])
    const extra = joinNotes(thoughtPlacementNotes.get(entityId) ?? [])
    if (extra) row.values['content'] = `${row.values['content']}\n\n${extra}`
  }

  // ── Spans: what flattening changed ────────────────────────────────────────

  for (const [kind, rows] of [['Act', tables['act'] ?? []], ['Sequence', tables['sequence'] ?? []]] as const) {
    for (const row of rows) {
      if (row.values['start_scene_id'] !== undefined) continue
      report('changed', `${kind} ${quote(spanTitle.get(row) ?? '')}`, null,
        'It holds no scenes, so it is exported without a starting scene.')
    }
  }

  /*
   * SCF spans are contiguous: an act runs from its first scene to the next
   * act's first scene. A scene the board leaves outside every act, but which
   * comes after one in script order, therefore falls inside that act in SCF.
   * That is the format, not a choice made here — but it is a difference from
   * the board, so it is reported.
   */
  function reportMembership(kind: 'act' | 'sequence') {
    const rows    = tables[kind] ?? []
    const startAt = new Map<number, ScfRow>()
    // Two spans starting at one scene: the later row takes the scenes (§5.5).
    for (const row of rows) {
      const start = row.values['start_scene_id']
      if (typeof start === 'number') startAt.set(start, row)
    }
    const aSpan = kind === 'act' ? 'an act' : 'a sequence'
    let current: ScfRow | undefined
    for (const s of scenes) {
      current = startAt.get(s.row.id) ?? current
      const onBoard = kind === 'act' ? s.act : s.sequence
      if (current === onBoard) continue
      const scfSide   = current ? `${kind} ${quote(spanTitle.get(current) ?? '')}` : `no ${kind}`
      const boardSide = onBoard ? `${kind} ${quote(spanTitle.get(onBoard) ?? '')}` : `no ${kind}`
      report('changed', `Scene ${quote(s.title)}`, null,
        `On the board it is in ${boardSide}. In SCF ${aSpan} runs until the next one starts, so the scene falls in ${scfSide}.`)
    }
  }
  reportMembership('act')
  reportMembership('sequence')

  // ── Cut material ──────────────────────────────────────────────────────────

  for (const b of walk.cut.backdrops.filter(isCutBackdrop)) {
    report('omitted', `${b.type} ${quote(b.title.trim() || 'Untitled')}`, null,
      'Marked Cut, so it and everything inside it is left out.')
  }
  const cutEntityIds = new Set(walk.cut.cards.map(c => c.entityId))
  for (const e of board.entities.filter(e => cutEntityIds.has(e.id) && isCutEntity(e))) {
    report('omitted', `${e.type} ${quote(e.title.trim() || 'Untitled')}`, null,
      'Marked Cut, so it is left out everywhere it is placed.')
  }
  const containedCut = walk.cut.cards.filter(c => !isCutEntity(eMap.get(c.entityId))).length
  if (containedCut > 0) {
    report('omitted', `${containedCut} card${containedCut === 1 ? '' : 's'} inside cut backdrops`, null,
      'Left out with the backdrop around them. Their entities are still exported if they are placed anywhere else.')
  }

  // ── Assemble ──────────────────────────────────────────────────────────────

  const lines = [...preamble, ...body]
  // A script does not end on a blank line.
  while (lines.length && lines[lines.length - 1].lineType === 'blank') lines.pop()

  return {
    schemaVersion: SCF_SCHEMA_VERSION,
    meta: {
      schema_version: SCF_SCHEMA_VERSION,
      editor_version: options.generator?.trim() || 'Scriptyard',
      updated_at:     now.toISOString(),
    },
    tables,
    titlePage,
    lines,
    report: {
      rows:  Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
      lines: lines.length,
      items,
    },
  }
}
