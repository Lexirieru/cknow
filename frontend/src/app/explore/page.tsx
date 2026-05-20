'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getEntries, query, type Entry, type QueryResult } from '@/lib/api'
import { T, Tag, LoadingDots } from '@/components/design-system'

const DOMAINS: Record<number, string> = { 0: 'Factual', 1: 'Labeled', 3: 'Observation' }

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function ExplorePage() {
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [domain, setDomain] = useState<number | null>(
    searchParams.get('domain') ? Number(searchParams.get('domain')) : null
  )
  const [entries, setEntries] = useState<Entry[]>([])
  const [results, setResults] = useState<QueryResult[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    getEntries().then(setEntries).finally(() => setLoading(false))
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!search.trim()) { setResults(null); return }
    setSearching(true)
    try {
      const r = await query(search, 20, domain !== null ? [domain] : undefined)
      setResults(r)
    } finally {
      setSearching(false)
    }
  }

  const displayed = results
    ? results.map(r => ({ ...r, _similarity: r.similarity }))
    : entries.filter(e => domain === null || e.domain === domain)

  return (
    <div style={{ padding: '32px 28px', fontFamily: T.codeFont, color: T.text, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }}>EXPLORE</h1>
        <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>Search and browse the knowledge graph.</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Semantic search…"
          style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 3, padding: '9px 14px', fontSize: 12, color: T.text, fontFamily: T.codeFont, outline: 'none' }}
          onFocus={e => (e.target.style.borderColor = T.accent)}
          onBlur={e => (e.target.style.borderColor = T.border)}
        />
        <button type="submit" style={{ background: T.accent, color: '#000', border: 'none', borderRadius: 3, padding: '0 16px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: T.codeFont }}>
          {searching ? '…' : 'SEARCH'}
        </button>
        {results && (
          <button type="button" onClick={() => { setResults(null); setSearch('') }} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, borderRadius: 3, padding: '0 12px', fontSize: 9, cursor: 'pointer', fontFamily: T.codeFont }}>
            CLEAR
          </button>
        )}
      </form>

      {/* Domain filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {[null, 0, 1, 3].map(d => (
          <button key={String(d)} onClick={() => setDomain(d)} style={{
            background: domain === d ? T.accentLight : 'transparent',
            color: domain === d ? T.accent : T.muted,
            border: `1px solid ${domain === d ? T.accent : T.border}`,
            borderRadius: 2, padding: '4px 10px', fontSize: 9, letterSpacing: '0.08em',
            cursor: 'pointer', fontFamily: T.codeFont,
          }}>
            {d === null ? 'ALL' : DOMAINS[d]}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <LoadingDots />
      ) : displayed.length === 0 ? (
        <p style={{ fontSize: 12, color: T.muted }}>No entries found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results && (
            <p style={{ fontSize: 10, color: T.muted, margin: '0 0 4px' }}>
              {results.length} semantic results for &ldquo;{search}&rdquo;
            </p>
          )}
          {(displayed as (Entry & { _similarity?: number })[]).map(entry => (
            <div key={entry.entryId} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <Tag>{DOMAINS[entry.domain] ?? `domain:${entry.domain}`}</Tag>
                  {entry.tags?.map(t => <Tag key={t} variant="ghost">{t}</Tag>)}
                </div>
                {entry.content && (
                  <p style={{ fontSize: 11, color: T.text, margin: '0 0 8px', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {entry.content}
                  </p>
                )}
                <span style={{ fontSize: 9, color: T.muted }}>{truncate(entry.submitter)}</span>
              </div>
              {entry._similarity !== undefined && (
                <span style={{ fontSize: 9, color: T.accent, flexShrink: 0 }}>
                  {Math.round(entry._similarity * 100)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
