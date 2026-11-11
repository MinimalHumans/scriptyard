/**
 * Byte-for-byte golden files for the three text exports.
 *
 * These exist so the traversal behind the exporters can be reworked safely:
 * any change to what a board exports as shows up as a diff in test/golden/.
 * A deliberate change is accepted with `npx vitest run -u` and reviewed there.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'node:path'
import { buildFountain } from '@/utils/buildFountain'
import { buildFDX } from '@/utils/buildFDX'
import { buildOutline } from '@/utils/buildOutline'
import { BOARDS, FIXED_NOW } from './boards'

const golden = (file: string) => path.resolve(__dirname, 'golden', file)

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterAll(() => {
  vi.useRealTimers()
})

describe.each(BOARDS)('$name', ({ name, board }) => {
  it('Fountain export is unchanged', async () => {
    await expect(buildFountain(board)).toMatchFileSnapshot(golden(`${name}.fountain`))
  })

  it('FDX export is unchanged', async () => {
    await expect(buildFDX(board)).toMatchFileSnapshot(golden(`${name}.fdx`))
  })

  it('Outline export is unchanged', async () => {
    await expect(buildOutline(board)).toMatchFileSnapshot(golden(`${name}.outline.md`))
  })
})
