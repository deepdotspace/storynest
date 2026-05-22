/**
 * /admin — owner-only console.
 *
 * Outside the (protected) group on purpose: we gate this ourselves so we
 * can avoid the AuthGate's sign-in prompt for non-admins. Non-admins are
 * silently redirected to /, with zero flash of admin chrome:
 *   - render nothing until useIsAdmin's `ready` is true
 *   - then either render the page (admin) or <Navigate to="/"/> (everyone else)
 *
 * Two panels:
 *   1. Featured story — pick one public story to demo on the landing page
 *   2. Help messages — read messages users have sent and mark resolved
 */

import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useIsAdmin } from '../lib/useIsAdmin'
import { callAction } from '../lib/callAction'
import { Button, useToast } from '../components/ui'
import { cn } from '../components/ui/utils'

interface PublicStory {
  recordId: string
  title: string
  status: string
  coverImageKey: string | null
  characters: string
  ageBand: string
  artStyle: string
}

interface HelpMessage {
  recordId: string
  userId: string
  userEmail: string
  userName: string
  message: string
  status: string
  createdAt: number
}

export default function AdminPage() {
  const { isAdmin, ready } = useIsAdmin()

  if (!ready) {
    // Nothing — admin chrome must NEVER flash to non-admins. The blank
    // resolves in one render once auth + config land.
    return null
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  return <AdminConsole />
}

function AdminConsole() {
  return (
    <div
      data-testid="admin-console"
      className="mx-auto max-w-5xl px-6 py-12"
    >
      <header className="mb-10">
        <h1
          className="font-display text-[40px] font-semibold leading-tight"
          style={{ color: 'var(--storynest-ink)' }}
        >
          Admin
        </h1>
        <p
          className="font-hand mt-1 text-[22px]"
          style={{ color: 'var(--storynest-coral-deep)' }}
        >
          owner only
        </p>
      </header>

      <FeaturedStoryPanel />
      <div className="mt-12">
        <HelpMessagesPanel />
      </div>
    </div>
  )
}

/* ── Featured story picker ──────────────────────────────────────────── */

function FeaturedStoryPanel() {
  const { success, error: errorToast } = useToast()
  const [stories, setStories] = useState<PublicStory[] | null>(null)
  const [featuredId, setFeaturedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const [listResult, currentResult] = await Promise.all([
      callAction<{ stories: PublicStory[] }>('listPublicStories', {}),
      callAction<{ bookId: string | null }>('getFeaturedStoryId', {}),
    ])
    if (!listResult.success) {
      setError(listResult.error)
      setStories([])
      return
    }
    setStories(listResult.data.stories)
    setFeaturedId(currentResult.success ? currentResult.data.bookId : null)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleFeature = async (bookId: string) => {
    setSaving(bookId)
    const result = await callAction<{ bookId: string }>('setFeaturedStory', { bookId })
    setSaving(null)
    if (!result.success) {
      errorToast('Could not set featured', result.error)
      return
    }
    setFeaturedId(bookId)
    success('Featured story updated')
  }

  const handleClear = async () => {
    setSaving('__clear__')
    const result = await callAction<{ cleared: boolean }>('clearFeaturedStory', {})
    setSaving(null)
    if (!result.success) {
      errorToast('Could not clear', result.error)
      return
    }
    setFeaturedId(null)
    success('Featured story cleared')
  }

  return (
    <section data-testid="admin-featured-panel">
      <div className="mb-5 flex items-baseline justify-between">
        <h2
          className="font-display text-[24px] font-semibold"
          style={{ color: 'var(--storynest-ink)' }}
        >
          Featured story
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--storynest-ink-mute)' }}>
          One story shows on the landing page demo.
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4"
          style={{
            background: 'var(--storynest-coral-soft)',
            color: 'var(--storynest-coral-deep)',
          }}
        >
          {error}
        </div>
      )}

      {featuredId && (
        <div
          className="mb-4 flex items-center justify-between rounded-xl px-4 py-3"
          style={{
            background: 'var(--storynest-sky-soft)',
            border: '1.5px solid var(--storynest-sky)',
          }}
        >
          <div className="text-[13px]" style={{ color: 'var(--storynest-sky-deep)' }}>
            Currently featured:{' '}
            <span className="font-semibold">
              {stories?.find((s) => s.recordId === featuredId)?.title ?? featuredId}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={saving === '__clear__'}
          >
            {saving === '__clear__' ? 'Clearing…' : 'Clear'}
          </Button>
        </div>
      )}

      {stories === null ? (
        <p className="text-sm" style={{ color: 'var(--storynest-ink-mute)' }}>
          Loading public stories…
        </p>
      ) : stories.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--storynest-ink-mute)' }}>
          No public stories yet. Publish a story from the library to feature it here.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stories.map((s) => {
            const isFeatured = s.recordId === featuredId
            return (
              <li
                key={s.recordId}
                className={cn(
                  'flex items-center justify-between rounded-2xl bg-white p-4 transition-colors',
                )}
                style={{
                  border: isFeatured
                    ? '1.5px solid var(--storynest-sky)'
                    : '1.5px solid var(--storynest-rule)',
                  boxShadow: 'var(--shadow-sticker)',
                }}
              >
                <div className="min-w-0 pr-3">
                  <div
                    className="truncate font-display text-[16px] font-semibold"
                    style={{ color: 'var(--storynest-ink)' }}
                  >
                    {s.title}
                  </div>
                  <div
                    className="mt-0.5 truncate text-[12px]"
                    style={{ color: 'var(--storynest-ink-mute)' }}
                  >
                    {s.characters || 'No character notes'} · {s.ageBand || 'any age'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isFeatured ? 'secondary' : 'default'}
                  onClick={() => handleFeature(s.recordId)}
                  disabled={saving === s.recordId || isFeatured}
                  data-testid={`admin-feature-${s.recordId}`}
                >
                  {isFeatured
                    ? 'Featured'
                    : saving === s.recordId
                      ? 'Setting…'
                      : 'Feature this'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ── Help messages panel ────────────────────────────────────────────── */

function HelpMessagesPanel() {
  const { success, error: errorToast } = useToast()
  const [messages, setMessages] = useState<HelpMessage[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const result = await callAction<{ messages: HelpMessage[] }>('listHelpMessages', {})
    if (!result.success) {
      errorToast('Could not load messages', result.error)
      setMessages([])
      return
    }
    setMessages(result.data.messages)
  }, [errorToast])

  useEffect(() => {
    void load()
  }, [load])

  const toggleStatus = async (m: HelpMessage) => {
    const next = m.status === 'resolved' ? 'open' : 'resolved'
    setBusy(m.recordId)
    const result = await callAction<{ status: string }>('setHelpMessageStatus', {
      recordId: m.recordId,
      status: next,
    })
    setBusy(null)
    if (!result.success) {
      errorToast('Update failed', result.error)
      return
    }
    setMessages((prev) =>
      prev ? prev.map((x) => (x.recordId === m.recordId ? { ...x, status: next } : x)) : prev,
    )
  }

  const open = messages?.filter((m) => m.status !== 'resolved') ?? []
  const resolved = messages?.filter((m) => m.status === 'resolved') ?? []

  return (
    <section data-testid="admin-help-panel">
      <div className="mb-5 flex items-baseline justify-between">
        <h2
          className="font-display text-[24px] font-semibold"
          style={{ color: 'var(--storynest-ink)' }}
        >
          Help messages
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--storynest-ink-mute)' }}>
          {messages === null ? 'Loading…' : `${open.length} open · ${resolved.length} resolved`}
        </p>
      </div>

      {messages !== null && messages.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--storynest-ink-mute)' }}>
          No messages yet.
        </p>
      )}

      {open.length > 0 && (
        <ul className="space-y-3">
          {open.map((m) => (
            <HelpRow key={m.recordId} m={m} busy={busy === m.recordId} onToggle={() => toggleStatus(m)} />
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <details className="mt-8">
          <summary
            className="cursor-pointer text-[13px] font-semibold"
            style={{ color: 'var(--storynest-ink-soft)' }}
          >
            Resolved ({resolved.length})
          </summary>
          <ul className="mt-3 space-y-3">
            {resolved.map((m) => (
              <HelpRow key={m.recordId} m={m} busy={busy === m.recordId} onToggle={() => toggleStatus(m)} />
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function HelpRow({
  m,
  busy,
  onToggle,
}: {
  m: HelpMessage
  busy: boolean
  onToggle: () => void
}) {
  const isResolved = m.status === 'resolved'
  return (
    <li
      className="rounded-2xl bg-white p-4"
      style={{
        border: '1.5px solid var(--storynest-rule)',
        boxShadow: 'var(--shadow-sticker)',
        opacity: isResolved ? 0.7 : 1,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div
            className="truncate font-display text-[14px] font-semibold"
            style={{ color: 'var(--storynest-ink)' }}
          >
            {m.userName || m.userEmail || 'Anonymous user'}
          </div>
          {m.userEmail && m.userName && (
            <div className="truncate text-[12px]" style={{ color: 'var(--storynest-ink-mute)' }}>
              {m.userEmail}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px]" style={{ color: 'var(--storynest-ink-mute)' }}>
            {formatTime(m.createdAt)}
          </span>
          <Button size="sm" variant="ghost" onClick={onToggle} disabled={busy}>
            {busy ? '…' : isResolved ? 'Reopen' : 'Mark resolved'}
          </Button>
        </div>
      </div>
      <p
        className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed"
        style={{ color: 'var(--storynest-ink-soft)' }}
      >
        {m.message}
      </p>
    </li>
  )
}

function formatTime(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
