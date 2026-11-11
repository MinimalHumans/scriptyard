/**
 * scfReport.ts
 * ------------
 * Turns an export report into words: a one-line summary of what was written,
 * the groups the export modal lists, and a plain-text copy to save.
 */

import type { ExportReport, ReportItem, ReportKind } from './scfDocument'

export interface ReportGroup {
  kind:  ReportKind
  title: string
  /** One sentence on what being in this group means. */
  blurb: string
  items: ReportItem[]
}

const GROUPS: Omit<ReportGroup, 'items'>[] = [
  {
    kind:  'prose',
    title: 'Written into the script',
    blurb: 'SCF has no structured place for these, so each is a line in the screenplay where it sat on the board. Nothing is lost.',
  },
  {
    kind:  'changed',
    title: 'Exported with a difference',
    blurb: 'These are in the file, but not exactly as they stand on the board.',
  },
  {
    kind:  'omitted',
    title: 'Left out',
    blurb: 'Cut material is not exported, the same as in the Fountain and Final Draft exports.',
  },
]

/** The report's items by kind, in reading order, without the empty groups. */
export function reportGroups(report: ExportReport): ReportGroup[] {
  return GROUPS
    .map(g => ({ ...g, items: report.items.filter(i => i.kind === g.kind) }))
    .filter(g => g.items.length > 0)
}

/** What a writer calls each table's rows. Tables not listed are not counted aloud. */
const NOUNS: [table: string, one: string, many: string][] = [
  ['act',                'act',       'acts'],
  ['sequence',           'sequence',  'sequences'],
  ['scene',              'scene',     'scenes'],
  ['story_beat',         'beat',      'beats'],
  ['shot',               'shot',      'shots'],
  ['character',          'character', 'characters'],
  ['location',           'location',  'locations'],
  ['prop',               'prop',      'props'],
  ['theme',              'theme',     'themes'],
  ['character_arc',      'arc',       'arcs'],
  ['collaboration_note', 'note',      'notes'],
]

const LINK_TABLES = ['scene_character', 'scene_prop', 'thematic_connection', 'character_arc_state']

/** "3 acts, 12 scenes, 5 characters and 14 links between them." */
export function summariseRows(report: ExportReport): string {
  const parts = NOUNS
    .map(([table, one, many]) => {
      const n = report.rows[table] ?? 0
      return n ? `${n} ${n === 1 ? one : many}` : ''
    })
    .filter(Boolean)

  const links = LINK_TABLES.reduce((sum, t) => sum + (report.rows[t] ?? 0), 0)
  if (links) parts.push(`${links} ${links === 1 ? 'link' : 'links'} between them`)

  if (!parts.length) return 'Nothing on the board became a row.'
  if (parts.length === 1) return `${parts[0]}.`
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`
}

/** The report as plain text, for saving beside the exported file. */
export function formatScfReport(report: ExportReport, filename: string): string {
  const out: string[] = [
    `SCF export report — ${filename}`,
    '',
    `Written: ${summariseRows(report)}`,
    `Script lines: ${report.lines}`,
  ]

  const groups = reportGroups(report)
  if (!groups.length) {
    out.push('', 'Everything on the board translated.')
  }
  for (const g of groups) {
    out.push('', `${g.title} (${g.items.length})`, g.blurb, '')
    for (const i of g.items) {
      out.push(`- ${i.subject}${i.where ? `, in ${i.where}` : ''}`)
      out.push(`  ${i.detail}`)
    }
  }
  return out.join('\n') + '\n'
}
