/**
 * generateOutline — single Anthropic call that returns the storybook
 * outline (title, characterSheet, pages). Throws on transport/parse
 * failure so the caller can choose retry vs. abort.
 */

import type { ActionTools } from 'deepspace/worker'
import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
  extractOutlineJson,
  type OutlineInput,
  type OutlineResult,
} from '../../lib/storyPrompts'
import { OUTLINE_MODEL, OUTLINE_MAX_TOKENS } from '../../plans'

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>
  stop_reason?: string
}

export async function generateOutline(
  tools: ActionTools,
  input: OutlineInput,
): Promise<OutlineResult> {
  const result = await tools.integration<AnthropicResponse>('anthropic/chat-completion', {
    model: OUTLINE_MODEL,
    max_tokens: OUTLINE_MAX_TOKENS,
    system: buildOutlineSystemPrompt(),
    messages: [{ role: 'user', content: buildOutlineUserPrompt(input) }],
  })
  if (!result.success) {
    throw new Error(`outline_call_failed: ${result.error ?? 'unknown'}`)
  }
  const wrapper = result.data as unknown as Record<string, unknown>
  const response =
    wrapper && typeof wrapper === 'object' && 'response' in wrapper
      ? (wrapper.response as AnthropicResponse)
      : (wrapper as unknown as AnthropicResponse)
  const text = response?.content?.[0]?.text ?? ''
  if (!text) throw new Error('outline_call_failed: empty_text')
  return extractOutlineJson(text)
}
