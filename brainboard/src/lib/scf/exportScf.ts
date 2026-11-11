/**
 * exportScf.ts
 * ------------
 * The SCF export, end to end: a board in, a `.scf` file and a report out.
 *
 * Import this module with a dynamic `import()` — it pulls in SQLite.
 */

import type { Board } from '@/types/board'
import { buildScfDocument, type BuildScfOptions } from './buildScfDocument'
import type { ExportReport } from './scfDocument'
import { writeScf } from './writeScf'

export interface ScfExport {
  /** The `.scf` file. */
  bytes:  Uint8Array
  /** What was written, and what did not translate. */
  report: ExportReport
}

export async function exportScf(board: Board, options: BuildScfOptions = {}): Promise<ScfExport> {
  const doc = buildScfDocument(board, options)
  return { bytes: await writeScf(doc), report: doc.report }
}
