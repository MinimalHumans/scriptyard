import type { Board } from '@/types/board'
import type { BoardSummary } from '@/lib/opfs/opfsStorage'

export function summaryOf(board: Board): BoardSummary {
  return {
    boardId:       board.boardId,
    name:          board.name,
    createdAt:     board.createdAt,
    updatedAt:     board.updatedAt,
    cardCount:     board.cards?.length ?? 0,
    backdropCount: board.backdrops?.length ?? 0,
    kind:          board.kind,
    trashed:       board.trashed,
    trashedAt:     board.trashedAt,
  }
}

// Everything in the trash — boards and templates together, newest-trashed
// first — shared by the Trash view and the footer-link count in the Boards
// modal.
export function trashedItemsOf(boards: BoardSummary[]): BoardSummary[] {
  return boards
    .filter(b => b.trashed)
    .sort((a, b) => (b.trashedAt ?? '').localeCompare(a.trashedAt ?? ''))
}
