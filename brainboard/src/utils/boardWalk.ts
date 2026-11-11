/**
 * boardWalk.ts
 * ------------
 * The one traversal of a board that every screenplay-shaped export shares.
 *
 * A board is geometry: what belongs to what is decided by which backdrop fully
 * contains which card. Turning that into a script means deciding an order and a
 * set of rules — cut material is left out, Custom groups are transparent, an
 * Act's own Scene cards follow its child backdrops, and so on. Those rules used
 * to be written out separately in each exporter, so a fix to one never reached
 * the others.
 *
 * walkBoard() applies them once and returns a flat list of visits in script
 * order. Each exporter is then a projection of that list into its own format:
 * Fountain text, Final Draft XML, or SCF rows. An exporter decides how a visit
 * reads; it never decides what is visited or in what order.
 */

import type { Backdrop, Board, Card, Entity } from '@/types/board'
import {
  buildBackdropParentMap,
  buildCardParentMap,
  cardsInBackdrop,
  backdropsInBackdrop,
  rootBackdrops,
  rootCards,
  rowSort,
  liveContent,
  assembleSceneHeadingFromBackdrop,
  assembleSceneHeadingFromCard,
  type SceneHeadingParts,
} from './screenplayCommon'

interface VisitBase {
  /** Enclosing non-Custom backdrops, outermost first. Empty at root level. */
  ancestors: Backdrop[]
}

/** An Act or Sequence backdrop. Its child backdrops and Scene cards follow as their own visits. */
export interface StructureVisit extends VisitBase {
  kind:  'act' | 'sequence'
  bd:    Backdrop
  /** Cards sitting directly in this backdrop, in row order. Scene cards excluded. */
  cards: Card[]
}

/** A Beat backdrop that is not inside a scene. */
export interface BeatVisit extends VisitBase {
  kind:  'beat'
  bd:    Backdrop
  /** How many Beat backdrops enclose this one. */
  depth: number
  /** Cards sitting directly in this backdrop, in row order. Scene cards excluded. */
  cards: Card[]
}

/** A Scene backdrop. */
export interface SceneBackdropVisit extends VisitBase {
  kind:     'sceneBackdrop'
  bd:       Backdrop
  heading:  SceneHeadingParts
  /** The Location card the heading was built from, if the scene holds one. */
  location: Card | undefined
  /**
   * Every card in the scene, in row order: those sitting directly in it and
   * those inside its Beat backdrops, at any depth. cardParent says which.
   * Scene cards are excluded — they follow as their own visits.
   */
  cards:    Card[]
  /** Beat backdrops inside the scene, at any depth, outermost first. */
  beats:    Backdrop[]
}

/** A Scene card: a scene with no backdrop, and so nothing placed inside it. */
export interface SceneCardVisit extends VisitBase {
  kind:     'sceneCard'
  card:     Card
  entity:   Entity | undefined
  heading:  SceneHeadingParts
  /** The Location card the heading was built from: one sharing the card's parent backdrop. */
  location: Card | undefined
}

export type Visit = StructureVisit | BeatVisit | SceneBackdropVisit | SceneCardVisit

export interface BoardWalk {
  /** Every entity on the board by id, cut ones included. */
  eMap:       Map<string, Entity>
  /** Live cards and backdrops — cut material already removed. */
  cards:      Card[]
  backdrops:  Backdrop[]
  /** Card id → innermost non-Custom backdrop id, or null at root level. */
  cardParent: Map<string, string | null>
  /** Backdrop id → innermost non-Custom parent id, or null at root level. */
  bdParent:   Map<string, string | null>
  /** Cards in no backdrop, in board order. Callers sort as they need. */
  rootCards:  Card[]
  /** The script, in order. */
  visits:     Visit[]
  /** What the cut rules removed, for exports that report on it. */
  cut:        { cards: Card[]; backdrops: Backdrop[] }
}

export function walkBoard(board: Board): BoardWalk {
  const eMap = new Map<string, Entity>(board.entities.map(e => [e.id, e]))
  // Cut material never reaches a script — dropped before the parent maps are
  // built, so ordering only ever sees what is actually in the film. See
  // liveContent() in screenplayCommon.ts.
  const { cards, backdrops } = liveContent(board.cards, board.backdrops, eMap)
  const bdParent   = buildBackdropParentMap(backdrops)
  const cardParent = buildCardParentMap(cards, backdrops)
  const visits: Visit[] = []

  function sceneCard(card: Card, ancestors: Backdrop[]): SceneCardVisit {
    const entity   = eMap.get(card.entityId)
    const parentId = cardParent.get(card.id) ?? null
    // A Scene card borrows a Location sitting beside it in the same backdrop.
    // At root level there is no "beside": every loose card would qualify.
    const location = parentId
      ? cardsInBackdrop(parentId, cards, cardParent).find(c => c.type === 'Location')
      : undefined
    return {
      kind: 'sceneCard', card, entity, ancestors, location,
      heading: assembleSceneHeadingFromCard(
        card, entity, location ? eMap.get(location.entityId) : undefined,
      ),
    }
  }

  /** @param beatDepth How many Beat backdrops enclose `bd`. */
  function visit(bd: Backdrop, beatDepth: number, ancestors: Backdrop[]) {
    const inside = [...ancestors, bd]

    switch (bd.type) {
      case 'Act':
      case 'Sequence': {
        const direct = cardsInBackdrop(bd.id, cards, cardParent)
        visits.push({
          kind: bd.type === 'Act' ? 'act' : 'sequence',
          bd, ancestors,
          cards: direct.filter(c => c.type !== 'Scene'),
        })
        for (const child of backdropsInBackdrop(bd.id, backdrops, bdParent)) {
          visit(child, beatDepth, inside)
        }
        // Scene cards directly inside an Act or Sequence (unusual but possible)
        // follow its child backdrops.
        for (const c of direct.filter(c => c.type === 'Scene')) {
          visits.push(sceneCard(c, inside))
        }
        break
      }

      case 'Beat': {
        const direct = cardsInBackdrop(bd.id, cards, cardParent)
        visits.push({
          kind: 'beat', bd, ancestors, depth: beatDepth,
          cards: direct.filter(c => c.type !== 'Scene'),
        })
        for (const child of backdropsInBackdrop(bd.id, backdrops, bdParent)) {
          visit(child, beatDepth + 1, inside)
        }
        for (const c of direct.filter(c => c.type === 'Scene')) {
          visits.push(sceneCard(c, inside))
        }
        break
      }

      case 'Scene': {
        /*
         * A scene owns what sits directly in it and what sits in its Beat
         * backdrops, however deeply those nest: a Beat inside a scene is a
         * division of the scene, not a place of its own. So the scene's cards
         * are gathered through its Beats rather than read one level down.
         *
         * Anything else nested in a scene — another Scene, or an Act or
         * Sequence dropped inside one — is not part of it. Those are visited
         * afterwards as themselves, so nothing on the board goes unvisited.
         */
        const beats: Backdrop[] = []
        const after: { bd: Backdrop; ancestors: Backdrop[] }[] = []
        const gather = (parent: Backdrop, chain: Backdrop[]) => {
          for (const child of backdropsInBackdrop(parent.id, backdrops, bdParent)) {
            if (child.type === 'Beat') {
              beats.push(child)
              gather(child, [...chain, child])
            } else {
              after.push({ bd: child, ancestors: chain })
            }
          }
        }
        gather(bd, inside)

        const owners = new Set([bd.id, ...beats.map(b => b.id)])
        const owned  = rowSort(cards.filter(c => owners.has(cardParent.get(c.id) ?? '')))
        // The scene's Location is the first Location card in row order.
        const location = owned.find(c => c.type === 'Location')

        visits.push({
          kind: 'sceneBackdrop', bd, ancestors, location, beats,
          heading: assembleSceneHeadingFromBackdrop(
            bd, location ? eMap.get(location.entityId) : undefined,
          ),
          cards: owned.filter(c => c.type !== 'Scene'),
        })
        for (const c of owned.filter(c => c.type === 'Scene')) {
          visits.push(sceneCard(c, inside))
        }
        for (const child of after) visit(child.bd, beatDepth, child.ancestors)
        break
      }

      // 'Custom' is transparent — its children are promoted by the parent map
    }
  }

  for (const bd of rootBackdrops(backdrops, bdParent)) visit(bd, 0, [])

  // Standalone Scene cards at root level (not inside any backdrop) come last.
  const roots = rootCards(cards, cardParent)
  for (const c of rowSort(roots.filter(c => c.type === 'Scene'))) {
    visits.push(sceneCard(c, []))
  }

  const liveCardIds = new Set(cards.map(c => c.id))
  const liveBdIds   = new Set(backdrops.map(b => b.id))

  return {
    eMap, cards, backdrops, cardParent, bdParent,
    rootCards: roots,
    visits,
    cut: {
      cards:     board.cards.filter(c => !liveCardIds.has(c.id)),
      backdrops: board.backdrops.filter(b => !liveBdIds.has(b.id)),
    },
  }
}
