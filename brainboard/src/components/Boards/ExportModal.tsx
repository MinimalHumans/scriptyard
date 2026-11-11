import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildFountain } from '@/utils/buildFountain'
import { buildFDX } from '@/utils/buildFDX'
import { formatScfReport, reportGroups, summariseRows } from '@/lib/scf/scfReport'
import type { ExportReport } from '@/lib/scf/scfDocument'
import { toast } from '@/store/toastStore'
import type { Board } from '@/types/board'
import styles from './ExportModal.module.css'

interface ExportResult {
  content: BlobPart
  /** Present when the format cannot hold everything on the board and says what it did instead. */
  report?: ExportReport
}

interface ExportOption {
  label: string
  desc:  string
  ext:   string
  mime:  string
  build: (board: Board) => ExportResult | Promise<ExportResult>
}

const APP_VERSION = import.meta.env.VITE_APP_VERSION

const OPTIONS: ExportOption[] = [
  {
    label: 'Scriptyard Raw JSON',
    desc:  'Full Scriptyard format — reimport or archive',
    ext:   '.scriptyard.json',
    mime:  'application/json',
    build: board => ({ content: JSON.stringify(board, null, 2) }),
  },
  {
    label: 'Fountain',
    desc:  'Script skeleton for Highland, Slugline, and Final Draft',
    ext:   '.fountain',
    mime:  'text/plain;charset=utf-8',
    build: board => ({ content: buildFountain(board) }),
  },
  {
    label: 'Final Draft',
    desc:  'Script skeleton for Final Draft 10+',
    ext:   '.fdx',
    mime:  'application/xml;charset=utf-8',
    build: board => ({ content: buildFDX(board) }),
  },
  {
    label: 'SCF',
    desc:  'Story Context Framework — structure, cast and links as data',
    ext:   '.scf',
    mime:  'application/vnd.minimalhumans.scf',
    // Loaded on demand: the exporter brings SQLite with it, which nobody
    // exporting anything else should have to download.
    build: async board => {
      const { exportScf } = await import('@/lib/scf/exportScf')
      const { bytes, report } = await exportScf(board, {
        generator: APP_VERSION ? `Scriptyard ${APP_VERSION}` : 'Scriptyard',
      })
      return { content: bytes as BlobPart, report }
    },
  },
]

// Strips only characters that are actually invalid in a filename — the user
// is meant to be able to tweak this freely, not have their casing/spacing
// silently mangled the way the old auto-generated export name was.
function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').trim() || 'board'
}

function download(content: BlobPart, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface ExportModalProps {
  onClose: () => void
  // Full board content for whichever board the user picked — the active
  // board, or another one loaded on demand from OPFS. Never fetched inside
  // this component, so it never has to show its own loading state.
  board: Board
}

/*
 * ExportModal — the single place every export format lives now (JSON,
 * Fountain, FDX, SCF), reachable both from the Boards list's own "Export…"
 * button (current board) and from a row's ⋮ menu (that row's board). The
 * output name is editable and independent of the board's own name — it's
 * only ever used for the downloaded file.
 *
 * A format that comes back with a report keeps the modal open to show it:
 * the file is already saved, and the report says what in it differs from
 * the board.
 */
export function ExportModal({ onClose, board }: ExportModalProps) {
  const [outputName, setOutputName] = useState(board.name.trim() || 'Untitled')
  // The option being built, while an asynchronous export is running.
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<{ filename: string; report: ExportReport } | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const cardCount     = board.cards?.length ?? 0
  const backdropCount = board.backdrops?.length ?? 0

  const handleExport = async (opt: ExportOption) => {
    if (busy) return
    const filename = `${sanitizeFilename(outputName)}${opt.ext}`
    setBusy(opt.ext)
    try {
      const result = await opt.build(board)
      download(result.content, filename, opt.mime)
      toast.success(`Exported "${filename}"`)
      if (result.report) setDone({ filename, report: result.report })
      else onClose()
    } catch (err) {
      console.error(`${opt.label} export failed`, err)
      toast.error(`${opt.label} export failed — check the console for details.`)
    } finally {
      setBusy(null)
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-label="Export">
        <div className={styles.header}>
          <h2 className={styles.title}>{done ? 'Export report' : 'Export'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>

        {done ? (
          <ReportView filename={done.filename} report={done.report} onClose={onClose} />
        ) : (
          <div className={styles.body}>
            <div className={styles.boardInfo}>
              <span className={styles.boardName}>{board.name}</span>
              <span className={styles.boardMeta}>
                <span>{cardCount} card{cardCount !== 1 ? 's' : ''}</span>
                {backdropCount > 0 && <span>{backdropCount} backdrop{backdropCount !== 1 ? 's' : ''}</span>}
              </span>
            </div>

            <label className={styles.nameLabel} htmlFor="export-output-name">Output name</label>
            <input
              id="export-output-name"
              className={styles.nameInput}
              value={outputName}
              onChange={e => setOutputName(e.target.value)}
              autoFocus
            />

            <div className={styles.optionList}>
              {OPTIONS.map(opt => (
                <button
                  key={opt.ext}
                  className={styles.option}
                  onClick={() => handleExport(opt)}
                  disabled={busy !== null}
                >
                  <div className={styles.optionText}>
                    <span className={styles.optionLabel}>{opt.label}</span>
                    <span className={styles.optionDesc}>
                      {busy === opt.ext ? 'Exporting…' : opt.desc}
                    </span>
                  </div>
                  <span className={styles.optionExt}>{opt.ext}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

interface ReportViewProps {
  filename: string
  report:   ExportReport
  onClose:  () => void
}

/*
 * ReportView — what an export wrote, and what it could not carry over as
 * data. Groups are collapsed by default: the counts are the summary, and the
 * lists are there for whoever wants to check a particular card.
 */
function ReportView({ filename, report, onClose }: ReportViewProps) {
  const groups = reportGroups(report)

  const saveReport = () => {
    const name = `${filename}.report.txt`
    download(formatScfReport(report, filename), name, 'text/plain;charset=utf-8')
    toast.success(`Saved "${name}"`)
  }

  return (
    <div className={styles.body}>
      <div className={styles.boardInfo}>
        <span className={styles.boardName}>{filename}</span>
        <span className={styles.reportSummary}>{summariseRows(report)}</span>
      </div>

      {groups.length === 0 ? (
        <p className={styles.reportNote}>Everything on the board translated.</p>
      ) : (
        <div className={styles.reportGroups}>
          {groups.map(g => (
            <details key={g.kind} className={styles.reportGroup}>
              <summary className={styles.reportGroupTitle}>
                <span>{g.title}</span>
                <span className={styles.reportCount}>{g.items.length}</span>
              </summary>
              <p className={styles.reportNote}>{g.blurb}</p>
              <ul className={styles.reportList}>
                {g.items.map((item, i) => (
                  <li key={i} className={styles.reportItem}>
                    <span className={styles.reportSubject}>
                      {item.subject}
                      {item.where && <span className={styles.reportWhere}> in {item.where}</span>}
                    </span>
                    <span className={styles.reportDetail}>{item.detail}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}

      <div className={styles.reportActions}>
        <button className={styles.secondaryBtn} onClick={saveReport}>Save report</button>
        <button className={styles.primaryBtn} onClick={onClose} autoFocus>Done</button>
      </div>
    </div>
  )
}
