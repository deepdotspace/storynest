import { Link } from 'react-router-dom'
import { InteractiveMascot } from '../components/mascots/InteractiveMascot'
import { Cloud, Star } from '../components/decor'

export default function NotFound() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <Cloud
        size={120}
        color="var(--storynest-sky-soft)"
        style={{ position: 'absolute', top: 40, left: '15%', opacity: 0.8 }}
      />
      <Star
        size={36}
        color="var(--storynest-sun)"
        style={{ position: 'absolute', top: 80, right: '20%', opacity: 0.8 }}
      />

      <InteractiveMascot
        variant="sleeping"
        size={160}
        ambientAnim="mascot-float"
        ariaLabel="Tap to wake Hootie"
        phrases={[
          'Shhh, I am dreaming.',
          'Wrong page, friend.',
          'Try the library?',
          'Nothing here but zzz’s.',
        ]}
      />

      <h1
        className="font-display mt-6 font-semibold leading-tight"
        style={{ color: 'var(--storynest-ink)', fontSize: 40 }}
      >
        This page is fast asleep
      </h1>
      <p
        className="font-hand mt-2 text-[20px]"
        style={{ color: 'var(--storynest-ink-mute)' }}
      >
        nothing to read here
      </p>

      <Link
        to="/"
        className="mt-7 inline-flex items-center rounded-full px-6 py-3 font-display text-[15px] font-semibold text-white transition-transform active:translate-x-[4px] active:translate-y-[4px]"
        style={{
          background: 'var(--storynest-sky)',
          boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
        }}
      >
        Back to the nest
      </Link>
    </div>
  )
}
