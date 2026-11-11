/**
 * writeScf.ts
 * -----------
 * Turns an ScfDocument into the bytes of a `.scf` file.
 *
 * An SCF file is a SQLite database (SCF spec §1.1). This creates one in
 * memory from SCF's own published DDL, fills it, stamps it, and serialises
 * it. Nothing here decides what is exported — that is buildScfDocument's job;
 * this only writes down what it is given.
 *
 * The DDL is a vendored copy of `spec/scf-schema.sql` from the SCF repository
 * at tag `schema-2.25`, unmodified. A test checks its digest against the one
 * SCF publishes, so the file cannot drift from the schema it claims to be.
 *
 * SQLite is loaded on demand: it is close to a megabyte of WebAssembly that
 * only someone exporting an SCF file needs.
 */

import schemaSql from './scf-schema-2.25.sql?raw'
import type { ScfDocument, ScfValue } from './scfDocument'

/** `SCF1` as big-endian ASCII: SQLite's application_id for an SCF file (spec §1.2). */
export const SCF_APPLICATION_ID = 0x53434631

/** SQLite's user_version for a schema version: major * 1000 + minor (spec §1.2). */
export function encodeUserVersion(schemaVersion: string): number {
  const [major, minor] = schemaVersion.split('.').map(Number)
  if (!Number.isInteger(major) || !Number.isInteger(minor)) {
    throw new Error(`Not a schema version: ${schemaVersion}`)
  }
  return major * 1000 + minor
}

/** Table and column names come from this codebase, but they are spliced into SQL, so check them. */
function ident(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`Not a valid SCF identifier: ${name}`)
  return `"${name}"`
}

export async function writeScf(doc: ScfDocument): Promise<Uint8Array> {
  const { default: sqlite3InitModule } = await import('@sqlite.org/sqlite-wasm')
  const sqlite3 = await sqlite3InitModule()
  const db = new sqlite3.oo1.DB(':memory:')

  const insert = (table: string, values: Record<string, ScfValue>) => {
    const columns = Object.keys(values)
    db.exec({
      sql: `INSERT INTO ${ident(table)} (${columns.map(ident).join(', ')}) `
         + `VALUES (${columns.map(() => '?').join(', ')})`,
      bind: columns.map(c => values[c]),
    })
  }

  try {
    // An SCF file is mostly its hundred-odd tables and their indexes, nearly
    // all empty, and each takes a page of its own. SQLite's usual 4 KiB page
    // keeps a small export near a megabyte; this build's default is larger.
    db.exec('PRAGMA page_size = 4096')
    db.exec(schemaSql)
    db.exec('BEGIN')

    for (const [table, rows] of Object.entries(doc.tables)) {
      // Ids are written as given: references elsewhere in the document
      // already point at them.
      for (const row of rows) insert(table, { id: row.id, uuid: row.uuid, ...row.values })
    }

    doc.titlePage.forEach((entry, i) => {
      insert('screenplay_title_page', { key: entry.key, value: entry.value, sort_order: i + 1 })
    })

    doc.lines.forEach((l, i) => {
      insert('screenplay_lines', {
        line_order:  i + 1,
        line_type:   l.lineType,
        content:     l.content,
        scene_id:    l.sceneId,
        location_id: l.locationId,
        metadata:    l.metadata ? JSON.stringify(l.metadata) : null,
        uuid:        l.uuid,
      })
    })

    for (const [key, value] of Object.entries(doc.meta)) insert('_scf_meta', { key, value })

    db.exec('COMMIT')

    // Header stamps (spec §1.2) go last: everything above has to have
    // succeeded for "this is an SCF document" to be true.
    db.exec(`PRAGMA application_id = ${SCF_APPLICATION_ID}`)
    db.exec(`PRAGMA user_version = ${encodeUserVersion(doc.schemaVersion)}`)

    return sqlite3.capi.sqlite3_js_db_export(db)
  } finally {
    db.close()
  }
}
