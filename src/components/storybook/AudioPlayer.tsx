/**
 * Hidden controlled <audio> element. The StoryReader mounts one of these,
 * and changes its `src` + `pageKey` on every page change. Autoplay is
 * best-effort — first-page autoplay may be blocked by the browser until
 * the user interacts with the document; that's fine, the next prev/next
 * tap will satisfy the gesture requirement.
 *
 * Exposes an imperative `replay()` via a forwarded ref so the parent can
 * implement tap-to-replay on the image area without driving audio state
 * through React props.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface AudioPlayerHandle {
  replay: () => void
}

interface AudioPlayerProps {
  src: string | null
  muted: boolean
  /** Anything that changes per page (typically the page index). Forces a reload. */
  pageKey: string | number
  onEnded?: () => void
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ src, muted, pageKey, onEnded }, ref) {
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useImperativeHandle(ref, () => ({
      replay() {
        const el = audioRef.current
        if (!el || !src) return
        el.currentTime = 0
        el.play().catch(() => {})
      },
    }), [src])

    // On page change, reset and try to autoplay.
    useEffect(() => {
      const el = audioRef.current
      if (!el) return
      if (!src) {
        el.pause()
        el.removeAttribute('src')
        return
      }
      el.src = src
      el.currentTime = 0
      el.play().catch(() => {
        /* autoplay blocked — silent, parent doesn't need to know */
      })
    }, [src, pageKey])

    // Apply mute changes without restarting playback.
    useEffect(() => {
      const el = audioRef.current
      if (!el) return
      el.muted = muted
    }, [muted])

    return (
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={onEnded}
        style={{ display: 'none' }}
      />
    )
  },
)
