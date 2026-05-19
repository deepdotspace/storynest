/**
 * Lazy R2-backed image with a fade-in on load and a paper placeholder for
 * not-yet-generated illustrations. Uses `useAssetBlobUrl` because our
 * files are owner-scoped — `getUrl()` would 401 (see assetUrl.ts).
 */

import { useEffect, useState } from 'react'
import { useAssetBlobUrl } from '../../lib/assetUrl'
import { cn } from '../ui/utils'

interface PageImageProps {
  imageKey: string | null | undefined
  alt: string
  className?: string
  /** When set, image uses object-contain instead of object-cover. */
  contain?: boolean
}

export function PageImage({ imageKey, alt, className, contain }: PageImageProps) {
  const { url, isLoading, error } = useAssetBlobUrl(imageKey)
  const [loaded, setLoaded] = useState(false)

  // Reset loaded state when the underlying url changes (so the fade re-plays).
  useEffect(() => {
    setLoaded(false)
  }, [url])

  if (!url) {
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
          {isLoading
            ? 'Loading illustration…'
            : error
              ? 'Illustration unavailable'
              : 'Illustration coming soon'}
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
      className={cn(
        'w-full h-full transition-opacity duration-500',
        contain ? 'object-contain' : 'object-cover',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  )
}
