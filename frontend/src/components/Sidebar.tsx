'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { T } from './design-system'

const NAV = [
  { href: '/explore', label: 'EXP', full: 'EXPLORE' },
  { href: '/submit',  label: 'SUB', full: 'SUBMIT'  },
  { href: '/market',  label: 'MKT', full: 'MARKET'  },
  { href: '/profile', label: 'PRF', full: 'PROFILE' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav style={{
      width: 56,
      flexShrink: 0,
      background: T.surface,
      borderRight: `1px solid ${T.border}`,
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 16,
      gap: 4,
    }}>
      {NAV.map(({ href, label, full }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            title={full}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 44,
              fontFamily: T.codeFont,
              fontSize: 9,
              letterSpacing: '0.1em',
              fontWeight: 700,
              color: active ? T.accent : T.muted,
              background: active ? T.accentLight : 'transparent',
              borderLeft: active ? `2px solid ${T.accent}` : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.1s, background 0.1s',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = T.text }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = T.muted }}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
