/**
 * The `.scf` file itself: that it is the SQLite database SCF specifies, built
 * from SCF's own DDL, and that what went into it is what comes back out.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SCF_SCHEMA_VERSION } from '@/lib/scf/scfDocument'
import { encodeUserVersion, SCF_APPLICATION_ID, writeScf } from '@/lib/scf/writeScf'
import { BOARDS } from './boards'
import { build } from './buildDoc'
import { openScf, type OpenedScf } from './sqlite'

const SCHEMA_FILE = path.resolve(__dirname, '../src/lib/scf/scf-schema-2.25.sql')

/**
 * SHA-256 of `spec/scf-schema.sql` as published in the SCF repository's
 * `spec/SHA256SUMS` at tag `schema-2.25`. If this fails, the vendored DDL is
 * not the schema it says it is: re-vendor it, never edit it.
 */
const PUBLISHED_SCHEMA_SHA256 = '8f8e50f2f0164232e8e8c28b5bff06749fbc6c81bf70a2f0ed9bc08982e70040'

describe('the vendored schema', () => {
  it('is byte-identical to the DDL SCF publishes', () => {
    const digest = createHash('sha256').update(readFileSync(SCHEMA_FILE)).digest('hex')
    expect(digest).toBe(PUBLISHED_SCHEMA_SHA256)
  })

  it('is the version the exporter stamps', () => {
    expect(readFileSync(SCHEMA_FILE, 'utf8')).toContain(`schema version ${SCF_SCHEMA_VERSION}.`)
    expect(path.basename(SCHEMA_FILE)).toBe(`scf-schema-${SCF_SCHEMA_VERSION}.sql`)
  })
})

describe('header stamps', () => {
  it('encodes the schema version as major * 1000 + minor', () => {
    expect(encodeUserVersion('2.25')).toBe(2025)
    expect(encodeUserVersion('2.9')).toBe(2009)
    expect(() => encodeUserVersion('two')).toThrow()
  })
})

describe.each(BOARDS)('$name as a file', ({ board }) => {
  const doc = build(board)
  let bytes: Uint8Array
  let scf: OpenedScf

  beforeAll(async () => {
    bytes = await writeScf(doc)
    scf = await openScf(bytes)
  })

  afterAll(() => scf?.close())

  it('is a SQLite file stamped as SCF', () => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    expect(new TextDecoder().decode(bytes.slice(0, 15))).toBe('SQLite format 3')
    // application_id at byte 68 and user_version at byte 60, both big-endian.
    expect(view.getUint32(68)).toBe(SCF_APPLICATION_ID)
    expect(new TextDecoder().decode(bytes.slice(68, 72))).toBe('SCF1')
    expect(view.getUint32(60)).toBe(2025)
  })

  it('stays small', () => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    expect(view.getUint16(16)).toBe(4096)   // page size
    // Empty tables and indexes dominate; a board this size should not add much.
    expect(bytes.length).toBeLessThan(1_300_000)
  })

  it('passes SQLite\'s own integrity check', () => {
    expect(scf.query('PRAGMA integrity_check')).toEqual([{ integrity_check: 'ok' }])
  })

  it('states its schema version in _scf_meta', () => {
    const meta = Object.fromEntries(
      scf.query('SELECT key, value FROM _scf_meta').map(r => [r['key'], r['value']]))
    expect(meta).toEqual(doc.meta)
    expect(meta['schema_version']).toBe('2.25')
  })

  it('holds every table the schema declares, and no others', () => {
    const declared = [...readFileSync(SCHEMA_FILE, 'utf8').matchAll(/^CREATE TABLE "?([a-z_]+)"? \(/gm)]
      .map(m => m[1]).sort()
    const present = scf.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    ).map(r => r['name'])
    expect(present).toEqual(declared)
  })

  it('holds exactly the rows of the document', () => {
    for (const [table, rows] of Object.entries(doc.tables)) {
      const stored = scf.query(`SELECT * FROM "${table}" ORDER BY id`)
      expect(stored.length, table).toBe(rows.length)
      rows.forEach((row, i) => {
        expect(stored[i]['id']).toBe(row.id)
        expect(stored[i]['uuid']).toBe(row.uuid)
        for (const [column, value] of Object.entries(row.values)) {
          expect(stored[i][column], `${table}.${column}`).toBe(value)
        }
      })
    }
    // Nothing was written to a table the document does not name.
    const filled = scf.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    ).map(r => String(r['name']))
      .filter(name => Number(scf.query(`SELECT COUNT(*) AS n FROM "${name}"`)[0]['n']) > 0)
    const expected = [
      ...Object.keys(doc.tables), '_scf_meta',
      ...(doc.lines.length ? ['screenplay_lines'] : []),
      ...(doc.titlePage.length ? ['screenplay_title_page'] : []),
    ]
    expect(filled.sort()).toEqual(expected.sort())
  })

  it('holds the screenplay in order', () => {
    const stored = scf.query(
      'SELECT line_order, line_type, content, scene_id, location_id, metadata, uuid '
      + 'FROM screenplay_lines ORDER BY line_order')
    expect(stored.length).toBe(doc.lines.length)
    doc.lines.forEach((l, i) => {
      expect(stored[i]).toEqual({
        line_order: i + 1, line_type: l.lineType, content: l.content,
        scene_id: l.sceneId, location_id: l.locationId,
        metadata: l.metadata ? JSON.stringify(l.metadata) : null, uuid: l.uuid,
      })
    })
  })

  it('holds the title page in order', () => {
    expect(scf.query('SELECT key, value FROM screenplay_title_page ORDER BY sort_order'))
      .toEqual(doc.titlePage)
  })

  it('lets column defaults fill what the board does not say', () => {
    expect(scf.query('SELECT numbering_policy, lifecycle_status FROM project')).toEqual([
      { numbering_policy: 'derived', lifecycle_status: 'active' },
    ])
    for (const r of scf.query('SELECT status, created_at FROM scene')) {
      expect(r['status']).toBe('outline')
      expect(r['created_at']).toBeTruthy()
    }
  })
})
