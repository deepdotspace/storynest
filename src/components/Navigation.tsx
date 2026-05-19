/**
 * Top nav — floating pill bar (v3).
 *
 * Visual: a single full-rounded white pill that floats at the top of the
 * viewport with a hairline border and a soft sticker shadow. Inside it,
 * brand on the left, primary links in the middle (each link is its own
 * micro-pill that fills with sky-soft when active), and the right
 * cluster (Pro badge, credits, account menu) on the right.
 *
 * The outer <nav> is sticky and transparent so the pill floats over
 * scrolled content. Mobile collapses links into a floating dropdown.
 */

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth, AuthOverlay, useUser, signOut } from 'deepspace'
import { ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { ROLE_CONFIG, type Role } from '../constants'
import { nav } from '../nav'
import { cn } from './ui/utils'
import { CreditBadge } from './billing/CreditBadge'
import { useIsPro } from '../lib/useIsPro'

const PILL_SHADOW = '0 6px 18px -6px oklch(0.22 0.04 265 / 0.18), 2px 2px 0 0 oklch(0.22 0.04 265 / 0.06)'

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
        className="sticky top-0 z-40 bg-transparent pt-3 pb-2"
      >
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div
            className="flex items-center gap-3 rounded-full bg-white/90 px-2 py-1.5 backdrop-blur-xl"
            style={{
              border: '1.5px solid var(--storynest-rule)',
              boxShadow: PILL_SHADOW,
            }}
          >
            {/* Brand */}
            <Link
              to="/"
              className="ml-2 flex shrink-0 items-center gap-2 pr-1"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  background: 'var(--storynest-lavender)',
                  border: '1.5px solid var(--storynest-ink)',
                }}
                aria-hidden
              />
              <span
                className="font-display text-[20px] font-semibold tracking-tight"
                style={{ color: 'var(--storynest-ink)' }}
              >
                storynest
              </span>
            </Link>

            {/* Primary nav (desktop) — each link is its own micro-pill */}
            <div className="hidden md:flex items-center gap-0.5">
              {visibleNav.map((item) => {
                const active = location.pathname.startsWith(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold transition-all',
                    )}
                    style={{
                      background: active ? 'var(--storynest-sky-soft)' : 'transparent',
                      color: active
                        ? 'var(--storynest-sky-deep)'
                        : 'var(--storynest-ink-soft)',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--storynest-card-soft)'
                        e.currentTarget.style.color = 'var(--storynest-ink)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--storynest-ink-soft)'
                      }
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>

            <div className="flex-1" />

            {/* Right cluster */}
            <div className="flex items-center gap-1.5">
              {isSignedIn && <ProBadge />}
              {isSignedIn && <CreditBadge />}

              {isSignedIn && user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    className="group flex items-center gap-1.5 rounded-full pl-0.5 pr-2 py-0.5 text-sm transition-all hover:bg-[var(--storynest-card-soft)]"
                    style={{ color: 'var(--storynest-ink)' }}
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
                        className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden rounded-2xl bg-white"
                        style={{
                          border: '1.5px solid var(--storynest-rule)',
                          boxShadow: PILL_SHADOW,
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
                          onClick={() => {
                            setUserMenuOpen(false)
                            signOut()
                          }}
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
                  className="inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-semibold text-white transition-transform active:translate-x-[3px] active:translate-y-[3px]"
                  style={{
                    background: 'var(--storynest-sky)',
                    boxShadow: '3px 3px 0 0 var(--storynest-sky-deep)',
                  }}
                >
                  Sign in
                </button>
              )}

              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors md:hidden"
                style={{
                  color: 'var(--storynest-ink-soft)',
                  background: 'var(--storynest-card-soft)',
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

          {/* Mobile dropdown — floating pill panel under the nav pill */}
          <div
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-200 ease-out md:hidden',
              mobileMenuOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0',
            )}
          >
            <div
              className="rounded-2xl bg-white p-2"
              style={{
                border: '1.5px solid var(--storynest-rule)',
                boxShadow: PILL_SHADOW,
              }}
            >
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
                      color: active
                        ? 'var(--storynest-sky-deep)'
                        : 'var(--storynest-ink-soft)',
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
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
      className="hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
      style={{
        background: 'var(--storynest-lavender)',
        color: 'white',
      }}
    >
      Pro
    </span>
  )
}
