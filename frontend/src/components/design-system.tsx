'use client'

import React from 'react'

export const T = {
  bg: '#09090b',
  surface: '#18181b',
  card: '#27272a',
  border: '#3f3f46',
  borderLight: '#52525b',
  accent: '#FCFF52',
  accentHover: '#e8eb3a',
  accentLight: 'rgba(252,255,82,0.1)',
  accentMid: 'rgba(252,255,82,0.2)',
  text: '#fafafa',
  muted: '#a1a1aa',
  faint: '#27272a',
  tag: 'rgba(252,255,82,0.08)',
  tagBorder: 'rgba(252,255,82,0.3)',
  tagText: '#FCFF52',
  success: '#4ade80',
  successBg: 'rgba(74,222,128,0.1)',
  danger: '#f87171',
  dangerBg: 'rgba(248,113,113,0.1)',
  warning: '#fbbf24',
  warningBg: 'rgba(251,191,36,0.1)',
  headerBg: '#09090b',
  codeFont: "'Space Mono', 'Courier New', Courier, monospace",
} as const

type TagVariant = 'default' | 'success' | 'danger' | 'warning' | 'ghost'

export function Tag({ children, variant = 'default' }: { children: React.ReactNode; variant?: TagVariant }) {
  const styles: Record<TagVariant, { bg: string; color: string; border: string }> = {
    default: { bg: T.tag,        color: T.tagText, border: T.tagBorder },
    success: { bg: T.successBg,  color: T.success, border: 'rgba(74,222,128,0.3)' },
    danger:  { bg: T.dangerBg,   color: T.danger,  border: 'rgba(248,113,113,0.3)' },
    warning: { bg: T.warningBg,  color: T.warning, border: 'rgba(251,191,36,0.3)' },
    ghost:   { bg: 'transparent', color: T.muted,  border: T.border },
  }
  const s = styles[variant]
  return (
    <span style={{
      display: 'inline-block', fontSize: 9, fontFamily: T.codeFont,
      letterSpacing: '0.1em', padding: '3px 7px', borderRadius: 2,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

export function Modal({ title, onClose, children, width = 540 }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: number
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, width, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${T.border}`, background: T.faint }}>
          <span style={{ fontFamily: T.codeFont, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: T.text }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: T.muted }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

export function BtnPrimary({ children, onClick, style = {}, disabled = false, type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; disabled?: boolean; type?: 'button' | 'submit'
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: disabled ? T.muted : T.accent, color: '#000', border: 'none', borderRadius: 3,
      padding: '9px 20px', fontFamily: T.codeFont, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.1em', cursor: disabled ? 'not-allowed' : 'pointer', ...style,
    }}>{children}</button>
  )
}

export function BtnGhost({ children, onClick, style = {}, disabled = false }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: 'transparent', color: disabled ? T.muted : T.accent,
      border: `1px solid ${disabled ? T.muted : T.accent}`,
      borderRadius: 3, padding: '9px 20px', fontFamily: T.codeFont, fontSize: 10,
      letterSpacing: '0.1em', cursor: disabled ? 'not-allowed' : 'pointer', ...style,
    }}>{children}</button>
  )
}

export function LoadingDots() {
  return (
    <span style={{ fontFamily: T.codeFont, fontSize: 11, color: T.muted }}>
      loading<span className="animate-pulse">...</span>
    </span>
  )
}
