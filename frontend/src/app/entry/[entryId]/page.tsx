'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { getContent, getDiscussions, postDiscussion, type Entry, type Discussion } from '@/lib/api'
import { T, Tag, BtnPrimary, BtnGhost, LoadingDots } from '@/components/design-system'

const DOMAINS: Record<number, string> = { 0: 'FACTUAL', 1: 'LABELED', 3: 'OBS' }

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const inputStyle: React.CSSProperties = {
  background: T.surface,
  border: `2px solid ${T.border}`,
  padding: '10px 14px',
  fontSize: 11,
  color: T.text,
  fontFamily: T.codeFont,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
}

export default function EntryDetailPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const { address, isConnected } = useAccount()

  const [entry, setEntry] = useState<Entry | null>(null)
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  useEffect(() => {
    if (!entryId) return
    Promise.all([getContent(entryId), getDiscussions(entryId)])
      .then(([e, d]) => { setEntry(e); setDiscussions(d) })
      .catch(err => {
        if (/404|not found/i.test(err.message)) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [entryId])

  async function handlePostComment() {
    if (!comment.trim() || !address) return
    setPosting(true)
    setPostError(null)
    try {
      const d = await postDiscussion(entryId, address, comment.trim())
      setDiscussions(prev => [...prev, d])
      setComment('')
    } catch (e) {
      setPostError(e instanceof Error ? e.message : 'Post failed')
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 48px', maxWidth: 800, margin: '0 auto' }}>
        <LoadingDots />
      </div>
    )
  }

  if (notFound || !entry) {
    return (
      <div style={{ padding: '80px 48px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontFamily: T.pixelFont, fontSize: 8, color: T.muted, marginBottom: 24 }}>ENTRY NOT FOUND.</p>
        <Link href="/explore" style={{ textDecoration: 'none' }}>
          <BtnGhost>← BACK TO EXPLORE</BtnGhost>
        </Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '48px 48px', fontFamily: T.codeFont, color: T.text, maxWidth: 800, margin: '0 auto' }}>

      {/* Back link */}
      <Link href="/explore" style={{ textDecoration: 'none' }}>
        <span style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, letterSpacing: '0.04em', cursor: 'pointer' }}>
          ← EXPLORE
        </span>
      </Link>

      {/* Header */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Tag>{DOMAINS[entry.domain] ?? `D:${entry.domain}`}</Tag>
          {entry.inftTokenId && <Tag variant="success">iNFT #{entry.inftTokenId}</Tag>}
          {entry.tags?.map(t => <Tag key={t} variant="ghost">{t}</Tag>)}
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 9, color: T.muted, fontFamily: T.codeFont }}>
          <span>BY {truncate(entry.submitter)}</span>
          {entry.createdAt && <span>{timeAgo(entry.createdAt)}</span>}
        </div>
      </div>

      {/* Content */}
      <div style={{ background: T.surface, border: `2px solid ${T.border}`, boxShadow: '4px 4px 0 rgba(0,0,0,0.4)', padding: 24, marginBottom: 24 }}>
        {entry.content ? (
          <p style={{ fontSize: 12, color: T.text, lineHeight: 1.9, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {entry.content}
          </p>
        ) : (
          <p style={{ fontSize: 10, color: T.muted, margin: 0, fontFamily: T.pixelFont }}>CONTENT ON IPFS — LOADING...</p>
        )}
      </div>

      {/* Metadata */}
      <div style={{ background: T.surface, border: `2px solid ${T.border}`, boxShadow: '4px 4px 0 rgba(0,0,0,0.4)', padding: '14px 18px', marginBottom: 32 }}>
        <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 10 }}>ENTRY ID</div>
        <div style={{ fontSize: 9, color: T.text, wordBreak: 'break-all', fontFamily: T.codeFont, marginBottom: 14 }}>{entry.entryId}</div>
        {entry.storageRef && (
          <>
            <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 6 }}>IPFS REF</div>
            <div style={{ fontSize: 9, color: T.muted, wordBreak: 'break-all', fontFamily: T.codeFont }}>{entry.storageRef}</div>
          </>
        )}
        {entry.inftTokenId && (
          <div style={{ marginTop: 14 }}>
            <Link
              href="/market"
              style={{ textDecoration: 'none', fontFamily: T.pixelFont, fontSize: 7, color: T.accent, letterSpacing: '0.04em' }}
            >
              VIEW ON MARKET →
            </Link>
          </div>
        )}
      </div>

      {/* Discussion */}
      <div style={{ fontFamily: T.pixelFont, fontSize: 10, color: T.accent, marginBottom: 20, letterSpacing: '0.03em' }}>
        DISCUSSIONS ({discussions.length})
      </div>

      {discussions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {discussions.map(d => (
            <div
              key={d.id}
              style={{
                background: T.surface,
                border: `2px solid ${T.border}`,
                boxShadow: '3px 3px 0 rgba(0,0,0,0.3)',
                padding: '14px 18px',
              }}
            >
              <div style={{ display: 'flex', gap: 16, marginBottom: 10, alignItems: 'center' }}>
                <span style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.accent }}>{truncate(d.author)}</span>
                <span style={{ fontFamily: T.codeFont, fontSize: 9, color: T.muted }}>{d.createdAt ? timeAgo(d.createdAt) : ''}</span>
              </div>
              <p style={{ fontSize: 10, color: T.text, margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{d.content}</p>
            </div>
          ))}
        </div>
      )}

      {discussions.length === 0 && (
        <p style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 24 }}>NO COMMENTS YET. BE THE FIRST.</p>
      )}

      {/* Comment form */}
      <div style={{ background: T.surface, border: `2px solid ${T.border}`, boxShadow: '4px 4px 0 rgba(0,0,0,0.4)', padding: 20 }}>
        <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 14 }}>POST COMMENT</div>

        {!isConnected ? (
          <p style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted }}>CONNECT WALLET TO COMMENT.</p>
        ) : (
          <>
            {postError && (
              <div style={{ background: T.dangerBg, border: `2px solid rgba(255,36,66,0.4)`, padding: '8px 14px', fontSize: 9, color: T.danger, marginBottom: 14 }}>
                ✕ {postError}
              </div>
            )}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share your thoughts on this knowledge entry…"
              rows={4}
              style={inputStyle}
              disabled={posting}
              onFocus={e => (e.target.style.borderColor = T.accent)}
              onBlur={e => (e.target.style.borderColor = T.border)}
            />
            <div style={{ marginTop: 12 }}>
              <BtnPrimary onClick={handlePostComment} disabled={posting || !comment.trim()}>
                {posting ? 'POSTING █' : 'POST →'}
              </BtnPrimary>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
