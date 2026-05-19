/** Top nav — brand, primary links, role badge, account menu. */

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth, AuthOverlay, useUser, signOut } from 'deepspace'
import { ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { ROLE_CONFIG, type Role } from '../constants'
import { nav } from '../nav'
import { cn } from './ui/utils'
import { CreditBadge } from './billing/CreditBadge'
import { useIsPro } from '../lib/useIsPro'

export default function Navigation() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const userRole = (user?.role ?? 'anonymous') as Role | 'anonymous'
  // Read but currently unused — keeps the role lookup live for future chrome bits.
  void (ROLE_CONFIG[userRole as Role] ?? { title: 'Anonymous', badgeVariant: 'secondary' })

  useEffect(() => {
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  const visibleNav = nav.filter((item) => {
    if (!item.roles) return true
    if (userRole === 'admin') return true
    return item.roles.includes(userRole as Role)
  })

  return (
    <>
      <nav
        data-testid="app-navigation"
        className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl"
        style={{ borderColor: 'var(--storynest-rule)' }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          {/* Brand — lavender owl-head dot + Fredoka wordmark */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background: 'var(--storynest-lavender)',
                border: '1.5px solid var(--storynest-ink)',
              }}
              aria-hidden
            />
            <span
              className="font-display text-[22px] font-semibold tracking-tight"
              style={{ color: 'var(--storynest-ink)' }}
            >
              storynest
            </span>
          </Link>

          {/* Primary nav (desktop) — sky underline on active */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            {visibleNav.map((item) => {
              const active = location.pathname.startsWith(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative px-3 py-2 text-[14px] font-semibold transition-colors',
                  )}
                  style={{
                    color: active
                      ? 'var(--storynest-ink)'
                      : 'var(--storynest-ink-soft)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--storynest-ink)'
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--storynest-ink-soft)'
                  }}
                >
                  {item.label}
                  {active && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-3 right-3 -bottom-0.5 rounded-full"
                      style={{
                        height: 3,
                        background: 'var(--storynest-sky)',
                      }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex-1" />

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {isSignedIn && <ProBadge />}
            {isSignedIn && <CreditBadge />}

            {isSignedIn && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="group flex items-center gap-2 rounded-full bg-white pl-1 pr-2.5 py-1 text-sm transition-all hover:-translate-y-0.5"
                  style={{
                    border: '1.5px solid var(--storynest-rule)',
                    color: 'var(--storynest-ink)',
                  }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold"
                    style={{
                      background: 'var(--storynest-lavender-soft)',
                      color: 'var(--storynest-lavender-deep)',
                    }}
                  >
                    {user.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      (user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()
                    )}
                  </span>
                  <span
                    data-testid="nav-user-name"
                    className="hidden max-w-[120px] truncate sm:inline"
                    style={{ color: 'var(--storynest-ink)' }}
                  >
                    {user.name || user.email}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-150',
                      userMenuOpen && 'rotate-180',
                    )}
                    style={{ color: 'var(--storynest-ink-mute)' }}
                    aria-hidden
                  />
                </button>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                      aria-hidden
                    />
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl bg-white"
                      style={{
                        border: '1.5px solid var(--storynest-rule)',
                        boxShadow: 'var(--shadow-sticker)',
                      }}
                    >
                      <div
                        className="border-b px-3 py-2.5"
                        style={{ borderColor: 'var(--storynest-rule)' }}
                      >
                        <div
                          className="truncate text-sm font-semibold"
                          style={{ color: 'var(--storynest-ink)' }}
                        >
                          {user.name || 'Signed in'}
                        </div>
                        <div
                          className="truncate text-xs"
                          style={{ color: 'var(--storynest-ink-mute)' }}
                        >
                          {user.email}
                        </div>
                      </div>
                      <button
                        role="menuitem"
                        onClick={() => { setUserMenuOpen(false); signOut() }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors"
                        style={{ color: 'var(--storynest-ink-soft)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--storynest-card-soft)'
                          e.currentTarget.style.color = 'var(--storynest-ink)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--storynest-ink-soft)'
                        }}
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                data-testid="nav-sign-in-button"
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-transform active:translate-x-[3px] active:translate-y-[3px]"
                style={{
                  background: 'var(--storynest-sky)',
                  boxShadow: '3px 3px 0 0 var(--storynest-sky-deep)',
                }}
              >
                Sign in
              </button>
            )}

            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors md:hidden"
              style={{
                color: 'var(--storynest-ink-soft)',
                border: '1.5px solid var(--storynest-rule)',
                background: 'white',
              }}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" aria-hidden />
              ) : (
                <Menu className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div
          className={cn(
            'overflow-hidden border-t bg-background/95 backdrop-blur-xl transition-[max-height,opacity] duration-200 ease-out md:hidden',
            mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
          )}
          style={{ borderColor: 'var(--storynest-rule)' }}
        >
          <div className="space-y-0.5 px-3 py-2">
            {visibleNav.map((item) => {
              const active = location.pathname.startsWith(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  )}
                  style={{
                    background: active ? 'var(--storynest-sky-soft)' : 'transparent',
                    color: active ? 'var(--storynest-sky-deep)' : 'var(--storynest-ink-soft)',
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </>
  )
}

function ProBadge() {
  const isPro = useIsPro()
  if (!isPro) return null
  return (
    <span
      data-testid="nav-pro-badge"
      className="hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]"
      style={{
        background: 'var(--storynest-lavender)',
        color: 'white',
      }}
    >
      Pro
    </span>
  )
}
