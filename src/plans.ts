/**
 * storynest — central config. All tunable constants live here.
 * No magic numbers in component, schema, or pipeline files.
 */

export const PAGE_COUNT_OPTIONS = [4, 6, 8, 12] as const
export type PageCount = (typeof PAGE_COUNT_OPTIONS)[number]

export const AGE_BANDS = ['3-5', '6-8', '9-12'] as const
export type AgeBand = (typeof AGE_BANDS)[number]

export const ART_STYLES = [
  'watercolor',
  'paper-cutout',
  'soft-pastel',
  'classic-ink',
] as const
export type ArtStyle = (typeof ART_STYLES)[number]

export const ART_STYLE_LABELS: Record<ArtStyle, string> = {
  watercolor: 'Watercolor',
  'paper-cutout': 'Paper cutout',
  'soft-pastel': 'Soft pastel',
  'classic-ink': 'Classic ink',
}

export const ART_STYLE_PROMPT_SUFFIX: Record<ArtStyle, string> = {
  watercolor:
    'soft watercolor illustration, warm paper texture, hand-painted, gentle washes',
  'paper-cutout':
    'paper cutout collage, layered construction paper, soft cast shadows, simple shapes',
  'soft-pastel':
    'soft pastel illustration, dreamy, gentle gradients, plush textures',
  'classic-ink':
    'classic ink and watercolor wash, storybook style, gentle linework, vintage',
}

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  '3-5': 'Ages 3 – 5',
  '6-8': 'Ages 6 – 8',
  '9-12': 'Ages 9 – 12',
}

export const AGE_BAND_GUIDANCE: Record<AgeBand, string> = {
  '3-5':
    'Very simple words. Short sentences. Concrete actions. Repetition is great. Each page 1–2 short sentences.',
  '6-8':
    'Simple words but more variety. 2–4 sentences per page. Light emotion-naming.',
  '9-12':
    'Richer vocabulary. 3–5 sentences per page. Subtle humor and small twists welcome.',
}

export const STORYBOOK_STATUSES = [
  'outlining',
  'illustrating',
  'narrating',
  'ready',
  'failed',
] as const
export type StorybookStatus = (typeof STORYBOOK_STATUSES)[number]

export const PAGE_STATUSES = [
  'pending',
  'text-ready',
  'image-ready',
  'ready',
  'failed',
] as const
export type PageStatus = (typeof PAGE_STATUSES)[number]

/* ── Model + voice config ──────────────────────────────────────────── */

export const OUTLINE_MODEL = 'claude-haiku-4-5'
export const OUTLINE_MAX_TOKENS = 4000

export const IMAGE_MODEL = 'gemini-2.5-flash-image'

export const TTS_MODEL = 'eleven_flash_v2_5'
export const TTS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
export const TTS_OUTPUT_FORMAT = 'mp3_44100_128'

/* ── Limits ──────────────────────────────────────────────────────────── */

export const PAGE_TEXT_MAX_CHARS = 600
export const TITLE_MAX_CHARS = 100
export const PROMPT_MAX_CHARS = 2000

/* ── R2 key helpers ──────────────────────────────────────────────────── */

export function coverImageKey(bookId: string): string {
  return `storynest/cover-${bookId}.png`
}

export function pageImageKey(bookId: string, pageNumber: number): string {
  return `storynest/page-${bookId}-${pageNumber}.png`
}

export function pageAudioKey(bookId: string, pageNumber: number): string {
  return `storynest/audio-${bookId}-${pageNumber}.mp3`
}
