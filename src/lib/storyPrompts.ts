/**
 * Prompt builders for the storynest generation pipeline.
 *
 * Three concerns:
 *   1. The outline call (anthropic chat-completion) — turns user input
 *      into a JSON storybook outline.
 *   2. Image prompts (gemini) — wrap the per-page imagePrompt with the
 *      chosen art-style suffix and the no-text guard.
 *   3. Audio prompts — trivial (just the page text), kept here so all
 *      prompt strings live in one place.
 */

import type { AgeBand, ArtStyle } from '../plans'
import { ART_STYLE_PROMPT_SUFFIX, AGE_BAND_GUIDANCE } from '../plans'

export interface OutlineInput {
  prompt: string
  characters: string
  lesson: string
  ageBand: AgeBand
  pageCount: number
  artStyle: ArtStyle
}

export interface OutlinePage {
  pageNumber: number
  text: string
  imagePrompt: string
}

export interface OutlineResult {
  title: string
  /**
   * Canonical character descriptions baked into every image prompt.
   * Format: one line per character. E.g.
   *   "Mila — small purple dragon, age 4, golden eyes, red scarf"
   *   "Bo — brown rabbit with a white belly, blue overalls, glasses"
   * The illustrator MUST match these exactly across every page.
   */
  characterSheet: string
  pages: OutlinePage[]
}

export function buildOutlineSystemPrompt(): string {
  return [
    'You are a children\'s storybook writer and illustrator director.',
    'You write warm, simple, age-appropriate stories that work as bedtime reading.',
    'You also write companion illustration descriptions optimized for an AI image model.',
    '',
    'You return strict JSON ONLY, no commentary, no markdown fences. The JSON shape is:',
    '{',
    '  "title": "<short evocative title, max 60 chars>",',
    '  "characterSheet": "<one short line per character — species/age/key visual features. e.g.\\n  Mila — small purple dragon, age 4, golden eyes, red scarf, friendly smile\\n  Bo — brown rabbit, white belly, blue overalls, round glasses>",',
    '  "pages": [',
    '    {',
    '      "pageNumber": 1,',
    '      "text": "<the narration the parent reads aloud>",',
    '      "imagePrompt": "<the SCENE only: setting, action, mood, lighting. Do NOT redescribe the characters — the system appends the characterSheet to every image prompt for you.>"',
    '    },',
    '    ...',
    '  ]',
    '}',
    '',
    'Hard rules:',
    '- Output VALID JSON only. No backticks, no prose before or after.',
    '- Every page in `pages` must have all three fields.',
    '- Numbered 1..N — no cover page (that\'s generated separately).',
    '- Image prompts NEVER mention text, letters, words, captions, or signs.',
    '- The `characterSheet` is the canonical visual definition for every character. Lock the specific features (color, age, clothes, accessories) once and the system will reuse them on every page — so make each line concrete and visual, not abstract.',
    '- Story text should flow page-to-page like a real picture book — a gentle arc with a beginning, a small problem, a kind resolution.',
    '- The story must make sense as a whole. Every page must follow logically from the last; no non-sequiturs, dangling threads, or contradictions. If the page count is small, tighten the arc — do not skip beats.',
  ].join('\n')
}

export function buildOutlineUserPrompt(input: OutlineInput): string {
  const lessonLine = input.lesson.trim()
    ? `Lesson / takeaway: ${input.lesson.trim()}`
    : 'Lesson / takeaway: (none — the story is for fun)'

  return [
    `Story idea: ${input.prompt.trim()}`,
    `Main characters: ${input.characters.trim() || '(invent gentle characters that fit)'}`,
    lessonLine,
    `Age band: ${input.ageBand}. ${AGE_BAND_GUIDANCE[input.ageBand]}`,
    `Number of pages: ${input.pageCount} (numbered 1..${input.pageCount}).`,
    '',
    'Return the JSON outline now.',
  ].join('\n')
}

export function buildImagePrompt(
  rawImagePrompt: string,
  artStyle: ArtStyle,
  characterSheet?: string,
): string {
  const styleSuffix = ART_STYLE_PROMPT_SUFFIX[artStyle]
  const sheet = (characterSheet ?? '').trim()
  const charBlock = sheet
    ? `Characters (match these exactly across every page — same colors, clothing, age, features):\n${sheet}\n\n`
    : ''
  return `${charBlock}Scene: ${rawImagePrompt}.\n\nStyle: ${styleSuffix}. Children's storybook illustration. No text, no letters, no captions in the image.\n\nComposition (very important): place all characters, faces, and key action in the upper two-thirds of the frame. Reserve the lower third as visually quiet space — open sky, plain ground, water, soft pattern, or simple texture — so a caption can rest there without covering any character or important detail.`
}

export function buildCoverImagePrompt(
  title: string,
  characters: string,
  artStyle: ArtStyle,
  characterSheet?: string,
): string {
  return buildImagePrompt(
    `A storybook cover illustration for "${title}", a centered hero pose of the main character(s), warm sense of wonder, the title scene`,
    artStyle,
    characterSheet || characters,
  )
}

/**
 * Defensive JSON extractor. Some models wrap in code fences or add a
 * stray sentence, even with strict instructions. Find the outermost
 * `{...}` and try to parse.
 */
export function extractOutlineJson(text: string): OutlineResult {
  const trimmed = text.trim()
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Model did not return JSON')
  }
  const slice = trimmed.slice(firstBrace, lastBrace + 1)
  const parsed = JSON.parse(slice) as Partial<OutlineResult>
  if (!parsed.title || typeof parsed.title !== 'string') {
    throw new Error('Outline missing title')
  }
  if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
    throw new Error('Outline missing pages')
  }
  for (const p of parsed.pages) {
    if (typeof p.pageNumber !== 'number') throw new Error('Page missing pageNumber')
    if (typeof p.text !== 'string') throw new Error('Page missing text')
    if (typeof p.imagePrompt !== 'string') throw new Error('Page missing imagePrompt')
  }
  // characterSheet is optional for back-compat with older outlines; default
  // to the raw characters string if the model omitted it.
  if (typeof parsed.characterSheet !== 'string') {
    parsed.characterSheet = ''
  }
  return parsed as OutlineResult
}
