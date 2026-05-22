/**
 * generateImageBytes — single Gemini call → base64 PNG.
 * Wraps the per-page prompt with the chosen art-style suffix and the
 * canonical characterSheet (so all pages stay visually consistent).
 */

import type { ActionTools } from 'deepspace/worker'
import {
  buildImagePrompt,
  buildCoverImagePrompt,
} from '../../lib/storyPrompts'
import { IMAGE_MODEL, type ArtStyle } from '../../plans'

interface GeminiImageResponse {
  base64Images?: string[]
  images?: Array<{ base64?: string; data?: string }>
}

/**
 * Aspect ratio per usage. The Gemini integration accepts the
 * `aspectRatio` string and forwards it to the model's imageConfig.
 *
 *   - cover: 3:4 portrait, matches the cover display container
 *     (`aspect-[3/4]` in StoryReader's CoverView)
 *   - page:  16:9 landscape, matches typical laptop viewport so the
 *     reader's full-bleed image area never crops vertically
 */
const ASPECT_RATIO: Record<'cover' | 'page', string> = {
  cover: '3:4',
  page: '16:9',
}

export interface PageImageRequest {
  kind: 'page'
  imagePrompt: string
  artStyle: ArtStyle
  characterSheet?: string
}

export interface CoverImageRequest {
  kind: 'cover'
  title: string
  characters: string
  artStyle: ArtStyle
  characterSheet?: string
}

export type ImageRequest = PageImageRequest | CoverImageRequest

export async function generateImageBytes(
  tools: ActionTools,
  req: ImageRequest,
): Promise<{ base64Png: string }> {
  const prompt =
    req.kind === 'cover'
      ? buildCoverImagePrompt(req.title, req.characters, req.artStyle, req.characterSheet)
      : buildImagePrompt(req.imagePrompt, req.artStyle, req.characterSheet)

  const result = await tools.integration<GeminiImageResponse>('gemini/generate-image', {
    model: IMAGE_MODEL,
    prompt,
    aspectRatio: ASPECT_RATIO[req.kind],
  })
  if (!result.success) {
    throw new Error(`image_call_failed: ${result.error ?? 'unknown'}`)
  }
  const wrapper = result.data as unknown as Record<string, unknown>
  const r =
    wrapper && typeof wrapper === 'object' && 'response' in wrapper
      ? (wrapper.response as GeminiImageResponse)
      : (wrapper as unknown as GeminiImageResponse)
  const first =
    r?.base64Images?.[0] ??
    r?.images?.[0]?.base64 ??
    r?.images?.[0]?.data ??
    null
  if (!first) throw new Error('image_call_failed: no_base64')
  const stripped = first.startsWith('data:') ? first.split(',', 2)[1] ?? '' : first
  if (!stripped) throw new Error('image_call_failed: empty_base64')
  return { base64Png: stripped }
}
