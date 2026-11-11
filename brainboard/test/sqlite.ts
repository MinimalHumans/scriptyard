/**
 * Opens the bytes of a `.scf` file for reading in tests, so a file is checked
 * the way a consumer meets it: as a database, not as the document it was
 * built from.
 */

import sqlite3InitModule from '@sqlite.org/sqlite-wasm'

export type SqlRow = Record<string, string | number | null>

export interface OpenedScf {
  query(sql: string, params?: (string | number | null)[]): SqlRow[]
  close(): void
}

export async function openScf(bytes: Uint8Array): Promise<OpenedScf> {
  const sqlite3 = await sqlite3InitModule()
  const db = new sqlite3.oo1.DB()
  // Hand SQLite its own copy of the bytes; it frees them when the database closes.
  const pointer = sqlite3.wasm.allocFromTypedArray(new Uint8Array(bytes))
  db.checkRc(sqlite3.capi.sqlite3_deserialize(
    db, 'main', pointer, bytes.length, bytes.length,
    sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE,
  ))
  return {
    query: (sql, params = []) =>
      db.exec({ sql, bind: params, rowMode: 'object', returnValue: 'resultRows' }) as SqlRow[],
    close: () => db.close(),
  }
}
