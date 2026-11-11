/**
 * The boards every export test runs over: the shipped templates, read from
 * disk so a new template is covered without touching the tests, plus the
 * hand-built edge-case board.
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Board } from '@/types/board'
import { edgeBoard } from './fixtures/edgeBoard'

const TEMPLATE_DIR = path.resolve(__dirname, '../src/templates')

export interface NamedBoard { name: string; board: Board }

export const BOARDS: NamedBoard[] = [
  ...readdirSync(TEMPLATE_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => ({
      name:  f.replace(/\.json$/, ''),
      board: JSON.parse(readFileSync(path.join(TEMPLATE_DIR, f), 'utf8')) as Board,
    })),
  { name: 'edge_board', board: edgeBoard },
]

/** The Fountain export stamps today's date, so tests pin the clock here. */
export const FIXED_NOW = new Date('2026-01-02T12:00:00.000Z')
