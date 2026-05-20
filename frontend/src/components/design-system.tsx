'use client'

import React from 'react'

export const T = {
  // Backgrounds
  bg:          '#0a0a0f',
  surface:     '#111118',
  card:        '#1a1a28',
  // Borders
  border:      '#2c2c3a',
  borderLight: '#3a3a50',
  // Accent (yellow)
  accent:      '#FCFF52',
  accentHover: '#e8eb3a',
  accentLight: 'rgba(252,255,82,0.12)',
  accentMid:   'rgba(252,255,82,0.25)',
  // Text
  text:        '#e8e8f0',
  muted:       '#6a6a88',
  faint:       '#1a1a28',
  // Tags
  tag:         'rgba(252,255,82,0.1)',
  tagBorder:   'rgba(252,255,82,0.4)',
  tagText:     '#FCFF52',
  // States
  success:     '#39ff14',
  successBg:   'rgba(57,255,20,0.1)',
  danger:      '#ff2442',
  dangerBg:    'rgba(255,36,66,0.1)',
  warning:     '#ff9f1c',
  warningBg:   'rgba(255,159,28,0.1)',
  // Header
  headerBg:    '#111118',
  // Fonts
  pixelFont:   "'Press Start 2P', 'Courier New', Courier, monospace",
  codeFont:    "'Space Mono', 'Courier New', Courier, monospace",
  // Pixel effects
  pixelShadow: '4px 4px 0 rgba(0,0,0,0.5)',
  pixelShadowAccent: '4px 4px 0 rgba(252,255,82,0.3)',
} as const

type TagVariant = 'default' | 'success' | 'danger' | 'warning' | 'ghost'

export function Tag({ children, variant = 'default' }: { children: React.ReactNode; variant?: TagVariant }) {
  const styles: Record<TagVariant, { bg: string; color: string; border: string }> = {
    default: { bg: T.tag,        color: T.tagText, border: T.tagBorder },
    success: { bg: T.successBg,  color: T.success, border: 'rgba(57,255,20,0.4)' },
    danger:  { bg: T.dangerBg,   color: T.danger,  border: 'rgba(255,36,66,0.4)' },
    warning: { bg: T.warningBg,  color: T.warning, border: 'rgba(255,159,28,0.4)' },
    ghost:   { bg: 'transparent', color: T.muted,  border: T.border },
  }
  const s = styles[variant]
  return (
    <span style={{
      display: 'inline-block', fontSize: 7, fontFamily: T.pixelFont,
      letterSpacing: '0.05em', padding: '4px 8px',
      background: s.bg, color: s.color, border: `2px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

export function Modal({ title, onClose, children, width = 540 }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: number
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: T.surface, border: `2px solid ${T.border}`, boxShadow: T.pixelShadow, width, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `2px solid ${T.border}`, background: T.faint }}>
          <span style={{ fontFamily: T.pixelFont, fontSize: 9, color: T.text }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: T.muted, fontFamily: T.codeFont }}>×</button>
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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={e => { if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'translate(4px,4px)'; if (!disabled) (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = disabled ? 'none' : '4px 4px 0 rgba(0,0,0,0.5)' }}
      style={{
        background: disabled ? T.muted : T.accent,
        color: '#000',
        border: 'none',
        padding: '10px 20px',
        fontFamily: T.pixelFont,
        fontSize: 8,
        letterSpacing: '0.05em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : T.pixelShadow,
        transition: 'transform 0.05s',
        ...style,
      }}
    >{children}</button>
  )
}

export function BtnGhost({ children, onClick, style = {}, disabled = false }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={e => { if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'translate(3px,3px)'; if (!disabled) (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = disabled ? 'none' : `3px 3px 0 ${T.accentMid}` }}
      style={{
        background: 'transparent',
        color: disabled ? T.muted : T.accent,
        border: `2px solid ${disabled ? T.muted : T.accent}`,
        padding: '8px 18px',
        fontFamily: T.pixelFont,
        fontSize: 8,
        letterSpacing: '0.05em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : `3px 3px 0 ${T.accentMid}`,
        transition: 'transform 0.05s',
        ...style,
      }}
    >{children}</button>
  )
}

export function LoadingDots() {
  return (
    <span style={{ fontFamily: T.pixelFont, fontSize: 8, color: T.accent, letterSpacing: '0.05em' }}>
      LOADING <span className="pixel-blink">█</span>
    </span>
  )
}
