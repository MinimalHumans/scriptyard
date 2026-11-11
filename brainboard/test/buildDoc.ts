import { buildScfDocument } from '@/lib/scf/buildScfDocument'
import type { ScfDocument } from '@/lib/scf/scfDocument'
import type { Board } from '@/types/board'
import { FIXED_NOW } from './boards'

/** Build an SCF document with a fixed clock and counting uuids, so output is stable. */
export function build(board: Board): ScfDocument {
  let n = 0
  return buildScfDocument(board, {
    now: FIXED_NOW,
    generator: 'Scriptyard test',
    newUuid: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  })
}
