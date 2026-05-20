const C = {
  bg: '#09090b', surface: '#18181b', border: '#3f3f46',
  accent: '#FCFF52', accentLight: 'rgba(252,255,82,0.08)',
  text: '#fafafa', muted: '#a1a1aa', tag: 'rgba(252,255,82,0.08)',
  tagBorder: 'rgba(252,255,82,0.3)', font: "'Space Mono', monospace",
}

const APP_URL = 'https://app.cknow.xyz'

const STEPS = [
  { n: '01', title: 'Submit', desc: 'Write your knowledge entry — facts, labeled data, or observations. Choose a domain and add tags.' },
  { n: '02', title: 'Stake & Mint', desc: 'Stake a small amount of CELO as quality collateral. Receive an iNFT representing your contribution.' },
  { n: '03', title: 'Earn', desc: 'Every time an AI agent queries your data, royalties flow automatically to your wallet via RoyaltyVault.' },
]

const FEATURES = [
  { title: 'Verifiable Knowledge', desc: 'Every entry is anchored on Celo Mainnet. Tamper-proof, permanently attributed to you.' },
  { title: 'AI-Ready Embeddings', desc: 'Your submissions are vectorized and indexed, making them instantly discoverable by semantic search.' },
  { title: 'Passive Royalties', desc: 'Smart contracts distribute royalties automatically — no claiming, no manual payouts.' },
  { title: 'MiniPay Native', desc: 'Built for MiniPay. Connect in seconds, transact for fractions of a cent on Celo.' },
]

export default function LandingPage() {
  return (
    <div style={{ fontFamily: C.font, color: C.text }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 52, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.bg, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.04em' }}>
          ck<span style={{ color: C.accent }}>now</span>
        </span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#how" style={{ fontSize: 10, color: C.muted, textDecoration: 'none', letterSpacing: '0.08em' }}>HOW IT WORKS</a>
          <a href="#features" style={{ fontSize: 10, color: C.muted, textDecoration: 'none', letterSpacing: '0.08em' }}>FEATURES</a>
          <a href={APP_URL} style={{ background: C.accent, color: '#000', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', padding: '7px 16px', borderRadius: 3 }}>LAUNCH APP</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '100px 32px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 999, border: `1px solid ${C.tagBorder}`, background: C.tag, fontSize: 10, color: C.accent, letterSpacing: '0.08em', marginBottom: 36 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
          LIVE ON CELO MAINNET
        </div>

        <h1 style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
          Knowledge<br /><span style={{ color: C.accent }}>that pays.</span>
        </h1>

        <p style={{ fontSize: 15, color: C.muted, maxWidth: 500, margin: '0 auto 48px', lineHeight: 1.8 }}>
          Submit verifiable knowledge on Celo. Earn iNFTs and royalties every time your data is queried by AI agents.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={APP_URL + '/submit'} style={{ background: C.accent, color: '#000', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', padding: '12px 28px', borderRadius: 3 }}>
            SUBMIT KNOWLEDGE
          </a>
          <a href={APP_URL + '/explore'} style={{ background: 'transparent', color: C.text, border: `1px solid ${C.border}`, fontSize: 10, letterSpacing: '0.08em', textDecoration: 'none', padding: '12px 28px', borderRadius: 3 }}>
            EXPLORE ENTRIES
          </a>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.surface, padding: '28px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 80, flexWrap: 'wrap' }}>
          {[
            { v: 'CELO', l: 'CHAIN' },
            { v: '7', l: 'CONTRACTS' },
            { v: '$0.001', l: 'AVG TX COST' },
            { v: 'OPEN', l: 'PROTOCOL' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.12em' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section id="how" style={{ maxWidth: 800, margin: '0 auto', padding: '80px 32px' }}>
        <h2 style={{ fontSize: 11, color: C.accent, letterSpacing: '0.12em', marginBottom: 12 }}>HOW IT WORKS</h2>
        <p style={{ fontSize: 22, fontWeight: 700, margin: '0 0 48px' }}>Three steps to earn from your knowledge.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', gap: 24, paddingBottom: i < STEPS.length - 1 ? 32 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{s.n}</div>
                {i < STEPS.length - 1 && <div style={{ width: 1, flex: 1, background: C.border, margin: '8px 0' }} />}
              </div>
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 32px' }}>
          <h2 style={{ fontSize: 11, color: C.accent, letterSpacing: '0.12em', marginBottom: 12 }}>FEATURES</h2>
          <p style={{ fontSize: 22, fontWeight: 700, margin: '0 0 48px' }}>Built for the AI-native economy.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '20px 24px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: C.accent }}>// {f.title}</div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px' }}>Ready to contribute?</h2>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 36 }}>Start earning from your knowledge today.</p>
        <a href={APP_URL + '/submit'} style={{ background: C.accent, color: '#000', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', padding: '13px 32px', borderRadius: 3 }}>
          LAUNCH APP →
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>ck<span style={{ color: C.accent }}>now</span></span>
        <span style={{ fontSize: 9, color: C.muted, letterSpacing: '0.08em' }}>DECENTRALIZED KNOWLEDGE PROTOCOL · CELO MAINNET</span>
      </footer>

    </div>
  )
}
