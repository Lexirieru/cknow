'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletButton } from './WalletButton'
import { T } from './design-system'

const NAV_LINKS = [
  { href: '/', label: 'HOME' },
  { href: '/explore', label: 'EXPLORE' },
  { href: '/submit', label: 'SUBMIT' },
  { href: '/market', label: 'MARKET' },
  { href: '/profile', label: 'PROFILE' },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header style={{
      background: T.headerBg, borderBottom: `1px solid ${T.border}`,
      padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', gap: 24,
      position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
    }}>
      <Link href="/" style={{ textDecoration: 'none', fontFamily: T.codeFont, fontSize: 16, fontWeight: 700, color: T.accent, letterSpacing: '0.05em' }}>
        ck<span style={{ color: T.text }}>now</span>
      </Link>

      <nav style={{ display: 'flex', gap: 20, flex: 1 }}>
        {NAV_LINKS.map(l => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href} style={{
              textDecoration: 'none', fontFamily: T.codeFont, fontSize: 10, letterSpacing: '0.1em',
              color: active ? T.accent : T.muted,
              borderBottom: active ? `1px solid ${T.accent}` : '1px solid transparent',
              padding: '4px 0',
            }}>
              {l.label}
            </Link>
          )
        })}
      </nav>

      <WalletButton />
    </header>
  )
}
