/**
 * Every exported file, read by SCF's own reference implementation.
 *
 * The other tests check the file against what this exporter meant to write.
 * This one checks it where it gets read: scf-core's validator runs over each
 * export, and the findings it raises are pinned. Zero errors is the bar; the
 * warnings and notes that remain are known, and listed in the golden files so
 * a new one is a visible diff.
 *
 * scf-core is not a dependency — it is unpublished — so this needs a checkout
 * of the SCF repository. It is looked for beside this repository, or at
 * SCF_REPO, and the suite is skipped when there is none. The checkout is only
 * read: its TypeScript source is imported as it stands.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sqlite3InitModule from '@sqlite.org/sqlite-wasm'
import { SCF_SCHEMA_VERSION } from '@/lib/scf/scfDocument'
import { writeScf } from '@/lib/scf/writeScf'
import { BOARDS } from './boards'
import { build } from './buildDoc'

const SCF_REPO = process.env['SCF_REPO'] ?? path.resolve(__dirname, '../../../scf')
const CORE     = path.join(SCF_REPO, 'scf-core', 'src', 'index.ts')
const REGISTRY = path.join(SCF_REPO, 'scf-core', 'registry', 'registry.json')
const available = existsSync(CORE) && existsSync(REGISTRY)

const golden = (file: string) => path.resolve(__dirname, 'golden', file)

type SqlValue = string | number | boolean | null | Uint8Array
type Exec = (sql: string, params?: SqlValue[]) => Promise<Record<string, SqlValue>[]>

interface Finding {
  code: string; severity: string; table: string | null
  rowIds: number[]; count: number; message: string
}
interface Report {
  fileSchemaVersion: string | null
  counts: { error: number; warning: number; info: number }
  clean: boolean
  findings: Finding[]
}
interface ScfCore {
  loadRegistry(json: unknown): { schemaVersion: string }
  validationReport(exec: Exec, registry: unknown, opts: { source: string }): Promise<Report>
}

describe.skipIf(!available)('SCF reference validator', () => {
  let core: ScfCore
  let registry: { schemaVersion: string }
  let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>

  beforeAll(async () => {
    core = await import(/* @vite-ignore */ pathToFileURL(CORE).href) as ScfCore
    registry = core.loadRegistry(JSON.parse(readFileSync(REGISTRY, 'utf8')))
    sqlite3 = await sqlite3InitModule()
  })

  it('is the schema version this exporter writes', () => {
    // If this fails, SCF has moved on. Re-vendor the schema and re-check the
    // mapping against its changelog before trusting the tests below.
    expect(registry.schemaVersion).toBe(SCF_SCHEMA_VERSION)
  })

  describe.each(BOARDS)('$name', ({ name, board }) => {
    let report: Report
    let close: () => void

    beforeAll(async () => {
      const bytes = await writeScf(build(board))
      const db = new sqlite3.oo1.DB()
      db.checkRc(sqlite3.capi.sqlite3_deserialize(
        db, 'main', sqlite3.wasm.allocFromTypedArray(new Uint8Array(bytes)),
        bytes.length, bytes.length, sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE,
      ))
      close = () => db.close()
      const exec: Exec = async (sql, params = []) =>
        db.exec({ sql, bind: params as never, rowMode: 'object', returnValue: 'resultRows' }) as never
      report = await core.validationReport(exec, registry, { source: `${name}.scf` })
    })

    afterAll(() => close?.())

    it('reads the file as the schema version it was written at', () => {
      expect(report.fileSchemaVersion).toBe(SCF_SCHEMA_VERSION)
    })

    it('raises no errors', () => {
      expect(report.findings.filter(f => f.severity === 'error')).toEqual([])
      expect(report.clean).toBe(true)
    })

    it('raises only the findings already known', async () => {
      const findings = report.findings.map(f => ({
        code: f.code, severity: f.severity, table: f.table, count: f.count,
        rowIds: f.rowIds, message: f.message,
      }))
      await expect(JSON.stringify(findings, null, 2) + '\n')
        .toMatchFileSnapshot(golden(`${name}.scf-findings.json`))
    })
  })
})
