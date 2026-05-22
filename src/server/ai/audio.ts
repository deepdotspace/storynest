/**
 * generateAudioBytes — single ElevenLabs call → base64 MP3.
 */

import type { ActionTools } from 'deepspace/worker'
import { TTS_MODEL, TTS_VOICE_ID, TTS_OUTPUT_FORMAT } from '../../plans'

interface ElevenLabsResponse {
  audioUrl?: string
  audio_base64?: string
  audio?: string
  base64?: string
  data?: string
}

export async function generateAudioBytes(
  tools: ActionTools,
  text: string,
): Promise<{ base64Mp3: string }> {
  const t = text.trim()
  if (!t) throw new Error('audio_call_failed: empty_text')

  const result = await tools.integration<ElevenLabsResponse>('elevenlabs/generate-speech', {
    text: t,
    voice_id: TTS_VOICE_ID,
    model_id: TTS_MODEL,
    output_format: TTS_OUTPUT_FORMAT,
  })
  if (!result.success) {
    throw new Error(`audio_call_failed: ${result.error ?? 'unknown'}`)
  }
  const wrapper = result.data as unknown as Record<string, unknown>
  const r =
    wrapper && typeof wrapper === 'object' && 'response' in wrapper
      ? (wrapper.response as ElevenLabsResponse)
      : (wrapper as unknown as ElevenLabsResponse)
  const raw =
    r?.audioUrl ?? r?.audio_base64 ?? r?.audio ?? r?.base64 ?? r?.data ?? null
  if (!raw) throw new Error('audio_call_failed: no_audio')
  const stripped = raw.startsWith('data:') ? raw.split(',', 2)[1] ?? '' : raw
  if (!stripped) throw new Error('audio_call_failed: empty_base64')
  return { base64Mp3: stripped }
}
