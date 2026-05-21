'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getEntries, query, type Entry, type QueryResult } from '@/lib/api'
import { T, Tag, LoadingDots } from '@/components/design-system'

const DOMAINS: Record<number, string> = { 0: 'FACTUAL', 1: 'LABELED', 3: 'OBS' }

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
    <div style={{ padding: '48px 48px', fontFamily: T.codeFont, color: T.text, maxWidth: 1000, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: T.pixelFont, fontSize: 14, fontWeight: 400, margin: '0 0 14px', color: T.accent, letterSpacing: '0.03em' }}>
          EXPLORE
        </h1>
        <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>Search and browse the knowledge graph.</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Semantic search…"
          style={{ flex: 1, background: T.surface, border: `2px solid ${T.border}`, padding: '10px 14px', fontSize: 11, color: T.text, fontFamily: T.codeFont, outline: 'none' }}
          onFocus={e => (e.target.style.borderColor = T.accent)}
          onBlur={e => (e.target.style.borderColor = T.border)}
        />
        <button
          type="submit"
          style={{ background: T.accent, color: '#000', border: 'none', padding: '0 18px', fontFamily: T.pixelFont, fontSize: 7, letterSpacing: '0.05em', cursor: 'pointer', boxShadow: T.pixelShadow }}
        >
          {searching ? '…' : 'SEARCH'}
        </button>
        {results && (
          <button
            type="button"
            onClick={() => { setResults(null); setSearch('') }}
            style={{ background: 'transparent', color: T.muted, border: `2px solid ${T.border}`, padding: '0 12px', fontFamily: T.pixelFont, fontSize: 7, cursor: 'pointer' }}
          >
            CLR
          </button>
        )}
      </form>

      {/* Domain filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {[null, 0, 1, 3].map(d => (
          <button
            key={String(d)}
            onClick={() => setDomain(d)}
            style={{
              background: domain === d ? T.accent : 'transparent',
              color: domain === d ? '#000' : T.muted,
              border: `2px solid ${domain === d ? T.accent : T.border}`,
              padding: '6px 12px',
              fontFamily: T.pixelFont,
              fontSize: 7,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              boxShadow: domain === d ? T.pixelShadow : 'none',
            }}
          >
            {d === null ? 'ALL' : DOMAINS[d]}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <LoadingDots />
      ) : displayed.length === 0 ? (
        <p style={{ fontFamily: T.pixelFont, fontSize: 8, color: T.muted }}>NO ENTRIES FOUND.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results && (
            <p style={{ fontSize: 9, color: T.muted, margin: '0 0 6px', fontFamily: T.codeFont }}>
              {results.length} results for &ldquo;{search}&rdquo;
            </p>
          )}
          {(displayed as (Entry & { _similarity?: number })[]).map(entry => (
            <div
              key={entry.entryId}
              style={{
                background: T.surface,
                border: `2px solid ${T.border}`,
                boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <Tag>{DOMAINS[entry.domain] ?? `D:${entry.domain}`}</Tag>
                  {entry.tags?.map(t => <Tag key={t} variant="ghost">{t}</Tag>)}
                </div>
                {entry.content && (
                  <p style={{ fontSize: 10, color: T.text, margin: '0 0 10px', lineHeight: 1.7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {entry.content}
                  </p>
                )}
                <span style={{ fontSize: 9, color: T.muted, fontFamily: T.codeFont }}>{truncate(entry.submitter)}</span>
              </div>
              {entry._similarity !== undefined && (
                <span style={{ fontFamily: T.pixelFont, fontSize: 8, color: T.accent, flexShrink: 0 }}>
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
