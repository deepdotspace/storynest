/**
 * Lazy R2-backed image with a fade-in on load and a paper placeholder for
 * not-yet-generated (or unreadable) illustrations. Loads directly from the
 * app-scope public URL (see assetUrl.ts) — no auth, no proxy.
 */

import { useEffect, useState } from 'react'
import { useAssetUrl } from '../../lib/assetUrl'
import { cn } from '../ui/utils'

interface PageImageProps {
  imageKey: string | null | undefined
  alt: string
  className?: string
  /** When set, image uses object-contain instead of object-cover. */
  contain?: boolean
}

export function PageImage({ imageKey, alt, className, contain }: PageImageProps) {
  const url = useAssetUrl(imageKey)
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  // Reset state when the underlying url changes (so the fade re-plays and a
  // previous error doesn't stick to a new image).
  useEffect(() => {
    setLoaded(false)
    setErrored(false)
  }, [url])

  if (!url || errored) {
    return (
      <div
        className={cn(
          'flex items-center justify-center w-full h-full',
          className,
        )}
        style={{ background: 'var(--storynest-paper-deep)' }}
      >
        <span
          className="font-hand text-2xl"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          {errored ? 'Illustration unavailable' : 'Illustration coming soon'}
        </span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      onError={() => setErrored(true)}
      className={cn(
        'w-full h-full transition-opacity duration-500',
        contain ? 'object-contain' : 'object-cover',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
      // When cropping (`object-cover`), anchor to the top so the
      // safe-area-prompted faces (composed in the upper two-thirds of
      // the frame) stay visible on viewports narrower than the
      // generated 16:9. `object-contain` is unaffected — there's no
      // crop to anchor.
      style={contain ? undefined : { objectPosition: 'center top' }}
    />
  )
}
