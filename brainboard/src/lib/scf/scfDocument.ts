/**
 * scfDocument.ts
 * --------------
 * The in-memory shape of an SCF export, before any SQLite is involved.
 *
 * buildScfDocument() turns a board into one of these and writeScf() turns it
 * into the bytes of a `.scf` file. Keeping the two apart means everything that
 * is a decision — what maps to which row, what becomes a script line, what gets
 * reported — is plain data that can be read and tested without a database.
 */

/** The SCF schema version this exporter writes. Pinned with the vendored DDL. */
export const SCF_SCHEMA_VERSION = '2.25'

/** `external_id_namespace` on every row that came from a Scriptyard id. */
export const SCF_EXTERNAL_NAMESPACE = 'scriptyard'

export type ScfValue = string | number | null

export interface ScfRow {
  /**
   * The row's id within its table. Assigned here rather than by SQLite so that
   * references between rows are already resolved in the document.
   */
  id:     number
  uuid:   string
  /** Column → value. References hold the target row's `id`. Unset columns are absent. */
  values: Record<string, ScfValue>
}

export type ScfLineType = 'section' | 'heading' | 'action' | 'blank'

export interface ScfLine {
  uuid:       string
  lineType:   ScfLineType
  /** Raw line text, as Fountain would write it: `# Act One`, `INT. KITCHEN - NIGHT`. */
  content:    string
  sceneId:    number | null
  locationId: number | null
  metadata:   Record<string, unknown> | null
}

export interface ScfTitlePageEntry {
  key:   string
  value: string
}

/**
 * What did not translate.
 *
 *   prose    Written into the script as an action line, because SCF has no row
 *            for it. Nothing is lost; it is just not structured.
 *   changed  Exported, but not exactly as it stood on the board.
 *   omitted  Not exported at all.
 */
export type ReportKind = 'prose' | 'changed' | 'omitted'

export interface ReportItem {
  kind:    ReportKind
  /** What it is: `Character "Ada"`, `Beat "Meeting the Mentor"`. */
  subject: string
  /** Where on the board it sat, or null when that is not the point. */
  where:   string | null
  /** One sentence saying what happened to it. */
  detail:  string
}

export interface ExportReport {
  /** Rows written per SCF table, in the order the tables were first used. */
  rows:  Record<string, number>
  /** Script lines written, blank ones included. */
  lines: number
  items: ReportItem[]
}

export interface ScfDocument {
  schemaVersion: string
  /** `_scf_meta` key/value rows. */
  meta:          Record<string, string>
  /** Entity table name → its rows, in id order. */
  tables:        Record<string, ScfRow[]>
  titlePage:     ScfTitlePageEntry[]
  /** The screenplay, in order. `line_order` is the index plus one. */
  lines:         ScfLine[]
  report:        ExportReport
}
