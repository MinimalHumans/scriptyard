/**
 * scfVocab.ts
 * -----------
 * Scriptyard's option lists, translated to SCF's vocabularies (schema 2.25).
 *
 * SCF has two kinds of vocabulary. A closed one accepts only its listed
 * values, so a Scriptyard value with no counterpart is left unset rather than
 * forced into the nearest fit. An open one lists the known values and takes
 * any other string as it stands, so an unlisted value is written literally.
 */

// ─── Closed vocabularies ─────────────────────────────────────────────────────

const ROLES = new Set(['protagonist', 'antagonist', 'supporting', 'minor', 'background', 'narrator'])

/** character.role */
export function roleOf(role: string): string | undefined {
  const v = role.trim().toLowerCase()
  return ROLES.has(v) ? v : undefined
}

const LOCATION_TYPES: Record<string, string> = {
  'interior': 'interior', 'exterior': 'exterior', 'int/ext': 'int/ext',
  'virtual':  'virtual',  'abstract': 'abstract',
}

/** location.location_type */
export function locationTypeOf(type: string): string | undefined {
  return LOCATION_TYPES[type.trim().toLowerCase()]
}

type IntExt = 'interior' | 'exterior' | 'int/ext'

/** scene.int_ext, from the Scene's own INT/EXT field. */
export function intExtFromAttr(value: string): IntExt | undefined {
  switch (value.trim().toUpperCase()) {
    case 'INT.':     return 'interior'
    case 'EXT.':     return 'exterior'
    case 'INT/EXT.': return 'int/ext'
    default:         return undefined
  }
}

/** scene.int_ext, inherited from the scene's Location. Virtual and Abstract say nothing. */
export function intExtFromLocationType(type: string): IntExt | undefined {
  switch (type.trim().toLowerCase()) {
    case 'interior': return 'interior'
    case 'exterior': return 'exterior'
    case 'int/ext':  return 'int/ext'
    default:         return undefined
  }
}

/** scene.int_ext, read from a slugline the writer typed in full. */
export function intExtFromHeading(heading: string): IntExt | undefined {
  const h = heading.trim().toUpperCase()
  if (/^(INT\.?\/EXT|I\/E)[.\s]/.test(h)) return 'int/ext'
  if (/^INT[.\s]/.test(h)) return 'interior'
  if (/^EXT[.\s]/.test(h)) return 'exterior'
  return undefined
}

/** Whether Fountain would read this line as a scene heading without being told to. */
export function isFountainHeading(heading: string): boolean {
  return /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i.test(heading.trim())
}

/*
 * scene.time_of_day is what the light is doing. Scriptyard's list also holds
 * Continuous, Later and Moments Later, which say how a scene follows the one
 * before it. Those have no value here and stay in the heading text.
 */
const TIMES_OF_DAY = new Set(['day', 'dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'])

/** scene.time_of_day */
export function timeOfDayOf(value: string): string | undefined {
  const v = value.trim().toLowerCase()
  return TIMES_OF_DAY.has(v) ? v : undefined
}

/** scene.time_of_day, read from the end of a slugline the writer typed in full. */
export function timeOfDayFromHeading(heading: string): string | undefined {
  const at = heading.lastIndexOf(' - ')
  return at < 0 ? undefined : timeOfDayOf(heading.slice(at + 3))
}

// ─── Open vocabularies ───────────────────────────────────────────────────────

/*
 * Practical is `functional` and not `practical`: on a set, a practical is a
 * prop that actually works, which is not what the card means.
 */
const STORY_FUNCTIONS: Record<string, string> = {
  'practical':   'functional',
  'symbolic':    'symbol',
  'macguffin':   'macguffin',
  'atmospheric': 'atmosphere',
}

/** prop.story_function */
export function storyFunctionOf(value: string): string | undefined {
  const v = value.trim()
  if (!v) return undefined
  return STORY_FUNCTIONS[v.toLowerCase()] ?? v
}

const DIRECTIONS = new Set(['positive', 'negative', 'flat', 'cyclical'])

/** character_arc.direction */
export function directionOf(value: string): string | undefined {
  const v = value.trim()
  if (!v) return undefined
  return DIRECTIONS.has(v.toLowerCase()) ? v.toLowerCase() : v
}

// ─── Shot framing ────────────────────────────────────────────────────────────

/*
 * A Shot's Framing is free text — "CU", "wide", "Extreme Closeup (ECU)". SCF
 * keeps shot size and camera angle as separate closed fields, so the text is
 * recognised where it plainly names one of their values and otherwise left
 * for the caller to keep as prose.
 */
const SHOT_SIZES: Record<string, string> = {
  'ecu': 'extreme close-up', 'xcu': 'extreme close-up', 'bcu': 'extreme close-up',
  'extreme close-up': 'extreme close-up', 'extreme close up': 'extreme close-up',
  'extreme closeup': 'extreme close-up',

  'cu': 'close-up', 'close-up': 'close-up', 'close up': 'close-up', 'closeup': 'close-up',
  'close': 'close-up',

  'mcu': 'medium close-up', 'medium close-up': 'medium close-up',
  'medium close up': 'medium close-up', 'medium closeup': 'medium close-up',

  'ms': 'medium', 'medium': 'medium', 'mid': 'medium', 'medium shot': 'medium', 'mid shot': 'medium',

  'mws': 'medium wide', 'mls': 'medium wide', 'medium wide': 'medium wide',
  'medium long': 'medium wide', 'medium wide shot': 'medium wide',
  'medium long shot': 'medium wide', 'cowboy': 'medium wide',

  'ws': 'wide', 'ls': 'wide', 'fs': 'wide', 'wide': 'wide', 'long': 'wide', 'full': 'wide',
  'wide shot': 'wide', 'long shot': 'wide', 'full shot': 'wide',

  'ews': 'extreme wide', 'els': 'extreme wide', 'xws': 'extreme wide', 'xls': 'extreme wide',
  'extreme wide': 'extreme wide', 'extreme long': 'extreme wide',
  'extreme wide shot': 'extreme wide', 'extreme long shot': 'extreme wide',
  'establishing': 'extreme wide', 'establishing shot': 'extreme wide',
}

const CAMERA_ANGLES: Record<string, string> = {
  'pov': 'POV', 'point of view': 'POV',
  'overhead': 'overhead', 'top down': 'overhead', 'top-down': 'overhead',
  'high angle': 'high angle', 'low angle': 'low angle',
  'eye level': 'eye level', 'dutch': 'dutch', 'dutch angle': 'dutch',
}

export interface ParsedFraming {
  shotSize?:    string
  cameraAngle?: string
}

/**
 * Recognise a Framing value. Returns undefined when nothing in it is a value
 * SCF lists — the caller then keeps the text as it was typed.
 */
export function parseFraming(framing: string): ParsedFraming | undefined {
  const text = framing.trim().toLowerCase()
  if (!text) return undefined

  // "Extreme Closeup (ECU)" offers the same answer twice; try each spelling.
  const inParens = /\(([^)]+)\)/.exec(text)?.[1]?.trim()
  const outside  = text.replace(/\([^)]*\)/g, '').trim()
  const candidates = [text, outside, inParens].filter((c): c is string => !!c)

  for (const c of candidates) {
    if (SHOT_SIZES[c])    return { shotSize: SHOT_SIZES[c] }
    if (CAMERA_ANGLES[c]) return { cameraAngle: CAMERA_ANGLES[c] }
  }
  return undefined
}
