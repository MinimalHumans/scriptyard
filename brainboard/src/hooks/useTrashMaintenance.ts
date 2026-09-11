import { useEffect, useRef } from 'react'
import { useLibraryStore } from '@/store/libraryStore'
import { useTrashStore } from '@/store/trashStore'
import type { useBoardLibrary } from '@/hooks/useBoardLibrary'
import type { useDriveSync } from '@/hooks/useDriveSync'

/*
 * useTrashMaintenance — the retention sweep: permanently deletes any trashed
 * board whose trashedAt has aged past the single global retention setting.
 * Runs once per session after the library loads, and again if the user
 * shortens the retention window (so "7 days" takes effect immediately, not
 * on next launch). Also owns hydrating the trash store from OPFS.
 *
 * Deletion removes the local copy first (instant) and fires the Drive
 * delete after, unawaited by the loop — deleteRemoteForBoard queues the
 * remote delete in the offline log if Drive is unreachable, so a sweep
 * while offline still cleans up locally without orphaning the remote copy.
 */
export function useTrashMaintenance(
  boardLoaded: boolean,
  library: ReturnType<typeof useBoardLibrary>,
  drive:   ReturnType<typeof useDriveSync>,
) {
  const hydrated      = useTrashStore(s => s.hydrated)
  const retentionDays = useTrashStore(s => s.retentionDays)

  // Latest callbacks without re-firing the sweep every render (both hooks
  // mint new callbacks whenever their own deps shift).
  const deleteBoardRef          = useRef(library.deleteBoard)
  const deleteRemoteForBoardRef = useRef(drive.deleteRemoteForBoard)
  useEffect(() => {
    deleteBoardRef.current          = library.deleteBoard
    deleteRemoteForBoardRef.current = drive.deleteRemoteForBoard
  })

  useEffect(() => {
    useTrashStore.getState().hydrate()
  }, [])

  const sweepInFlightRef = useRef(false)
  useEffect(() => {
    if (!boardLoaded || !hydrated || sweepInFlightRef.current) return
    sweepInFlightRef.current = true
    ;(async () => {
      try {
        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
        const expired = useLibraryStore.getState().boards.filter(b =>
          b.trashed && b.trashedAt && Date.parse(b.trashedAt) < cutoff)
        await Promise.all(expired.map(async b => {
          await deleteBoardRef.current(b.boardId)
          deleteRemoteForBoardRef.current(b.boardId)
        }))
      } catch (err) {
        console.error('Trash retention sweep failed', err)
      } finally {
        sweepInFlightRef.current = false
      }
    })()
  }, [boardLoaded, hydrated, retentionDays])
}
