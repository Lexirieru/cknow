'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { prepare, confirm } from '@/lib/api'
import { CONTRACTS } from '@/constants/contracts'
import { NATIVE_CELO, CELO, USDM, USDC, type Token } from '@/constants/tokens'
import { T, BtnPrimary, BtnGhost } from '@/components/design-system'

const REGISTRY_ABI = [
  {
    name: 'submit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'storageRef', type: 'string' },
      { name: 'embeddingRef', type: 'string' },
      { name: 'tags', type: 'string[]' },
      { name: 'domain', type: 'uint8' },
      { name: 'paymentToken', type: 'address' },
      { name: 'stakeAmt', type: 'uint256' },
    ],
    outputs: [{ name: 'entryId', type: 'bytes32' }],
  },
] as const

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const STAKE_TOKENS: Token[] = [CELO, USDM, USDC]

const DOMAINS = [
  { value: 0, label: 'FACTUAL',    desc: 'Facts, definitions, encyclopedic knowledge' },
  { value: 1, label: 'LABELED',    desc: 'Training data with labels for AI/ML' },
  { value: 3, label: 'OBSERVATION', desc: 'Real-world observations, sensor data' },
]

type Step = 'form' | 'confirm' | 'done'

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
}

const labelStyle: React.CSSProperties = {
  fontFamily: T.pixelFont,
  fontSize: 7,
  letterSpacing: '0.05em',
  color: T.muted,
  display: 'block',
  marginBottom: 10,
}

export default function SubmitPage() {
  const { address, isConnected } = useAccount()

  const [step, setStep] = useState<Step>('form')
  const [content, setContent] = useState('')
  const [domain, setDomain] = useState(0)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [stakeToken, setStakeToken] = useState<Token>(STAKE_TOKENS[0])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prepared, setPrepared] = useState<{ storageRef: string; embeddingRef: string; encryptionKeyId: string } | null>(null)
  const [result, setResult] = useState<{ entryId: string; txHash: string } | null>(null)

  const erc20FlowRef = useRef(false)

  const { writeContract: writeApprove, data: approveTxHash, isPending: approving } = useWriteContract()
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })
  const { writeContract: writeSubmit, data: submitTxHash, isPending: submitting, error: writeError } = useWriteContract()
  const { isPending: waitingReceipt, isSuccess: receiptSuccess } = useWaitForTransactionReceipt({ hash: submitTxHash })

  useEffect(() => {
    if (!approveConfirmed || !erc20FlowRef.current || !prepared) return
    erc20FlowRef.current = false
    writeSubmit({
      address: CONTRACTS.CKNOW_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'submit',
      args: [prepared.storageRef, prepared.embeddingRef, tags, domain, stakeToken.address, stakeToken.minStake],
      value: 0n,
    })
  }, [approveConfirmed, prepared, tags, domain, stakeToken.address, stakeToken.minStake, writeSubmit])

  useEffect(() => {
    if (!receiptSuccess || !submitTxHash || !prepared || step !== 'confirm') return
    confirm(submitTxHash, prepared.storageRef, prepared.embeddingRef, prepared.encryptionKeyId, content, domain, tags, address)
      .then(r => { setResult(r); setStep('done') })
      .catch(e => setError(e instanceof Error ? e.message : 'Confirm failed'))
  }, [receiptSuccess, submitTxHash, prepared, step, content, domain, tags, address])

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  async function handlePrepare() {
    if (!content.trim()) return
    setLoading(true); setError(null)
    try {
      const r = await prepare(content, domain, tags, address)
      setPrepared(r); setStep('confirm')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prepare failed')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmitOnChain() {
    if (!prepared) return
    setError(null)
    const isNative = stakeToken.address === NATIVE_CELO
    if (isNative) {
      writeSubmit({
        address: CONTRACTS.CKNOW_REGISTRY,
        abi: REGISTRY_ABI,
        functionName: 'submit',
        args: [prepared.storageRef, prepared.embeddingRef, tags, domain, NATIVE_CELO, 0n],
        value: stakeToken.minStake,
      })
    } else {
      erc20FlowRef.current = true
      writeApprove({
        address: stakeToken.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.STAKE_VAULT, stakeToken.minStake],
      })
    }
  }

  const isApprovePending = !!approveTxHash && !approveConfirmed
  const isSubmitPending  = !!submitTxHash && !receiptSuccess
  const isProcessing     = approving || isApprovePending || submitting || isSubmitPending || waitingReceipt
  const displayError     = writeError?.message ?? error

  if (!isConnected) {
    return (
      <div style={{ padding: '120px 40px', textAlign: 'center' }}>
        <p style={{ fontFamily: T.pixelFont, fontSize: 10, color: T.muted }}>CONNECT WALLET TO SUBMIT.</p>
      </div>
    )
  }

  if (step === 'done' && result) {
    return (
      <div style={{ padding: '40px 40px', fontFamily: T.codeFont, color: T.text, maxWidth: 680 }}>
        <div style={{ background: T.successBg, border: `2px solid rgba(57,255,20,0.4)`, boxShadow: '4px 4px 0 rgba(57,255,20,0.15)', padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: T.pixelFont, fontSize: 9, color: T.success, marginBottom: 16 }}>✓ ENTRY SUBMITTED</div>
          <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 6 }}>ENTRY ID</div>
          <div style={{ fontSize: 10, color: T.text, wordBreak: 'break-all', marginBottom: 14 }}>{result.entryId}</div>
          <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 6 }}>TX HASH</div>
          <div style={{ fontSize: 10, color: T.text, wordBreak: 'break-all' }}>{result.txHash}</div>
        </div>
        <BtnGhost onClick={() => { setStep('form'); setContent(''); setTags([]); setPrepared(null); setResult(null); setError(null) }}>
          ← SUBMIT ANOTHER
        </BtnGhost>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 40px', fontFamily: T.codeFont, color: T.text, maxWidth: 680 }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: T.pixelFont, fontSize: 12, fontWeight: 400, margin: '0 0 12px', color: T.accent }}>
          ▸ SUBMIT
        </h1>
        <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>Contribute knowledge. Earn iNFTs and royalties.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, border: `2px solid ${T.border}`, width: 'fit-content' }}>
        {['01 FORM', '02 CONFIRM'].map((s, i) => (
          <div
            key={s}
            style={{
              padding: '8px 16px',
              fontFamily: T.pixelFont,
              fontSize: 7,
              color: (step === 'form' ? i === 0 : i === 1) ? '#000' : T.muted,
              background: (step === 'form' ? i === 0 : i === 1) ? T.accent : 'transparent',
              borderRight: i === 0 ? `2px solid ${T.border}` : 'none',
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {displayError && (
        <div style={{ background: T.dangerBg, border: `2px solid rgba(255,36,66,0.4)`, padding: '10px 16px', marginBottom: 20, fontSize: 10, color: T.danger, boxShadow: '3px 3px 0 rgba(255,36,66,0.15)' }}>
          ✕ {displayError}
        </div>
      )}

      {/* ─── FORM ─── */}
      {step === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Domain */}
          <div>
            <label style={labelStyle}>DOMAIN</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DOMAINS.map(d => (
                <label
                  key={d.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: domain === d.value ? T.accentLight : T.surface,
                    border: `2px solid ${domain === d.value ? T.accent : T.border}`,
                    boxShadow: domain === d.value ? `3px 3px 0 ${T.accentMid}` : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <input type="radio" name="domain" value={d.value} checked={domain === d.value} onChange={() => setDomain(d.value)} style={{ accentColor: T.accent }} />
                  <div>
                    <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: domain === d.value ? T.accent : T.text, marginBottom: 4 }}>{d.label}</div>
                    <div style={{ fontSize: 9, color: T.muted }}>{d.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label style={labelStyle}>CONTENT</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Enter your knowledge entry…"
              rows={6}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => (e.target.style.borderColor = T.accent)}
              onBlur={e => (e.target.style.borderColor = T.border)}
            />
            <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginTop: 6 }}>{content.length} CHARS</div>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>TAGS</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {tags.map(t => (
                <button
                  key={t}
                  onClick={() => setTags(prev => prev.filter(x => x !== t))}
                  style={{ background: T.tag, border: `2px solid ${T.tagBorder}`, padding: '4px 10px', fontFamily: T.pixelFont, fontSize: 7, color: T.tagText, cursor: 'pointer' }}
                >
                  {t} ✕
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="add-tag"
                style={{ ...inputStyle, width: 'auto', flex: 1 }}
              />
              <BtnGhost onClick={addTag} style={{ padding: '8px 14px', fontSize: 7 }}>+ ADD</BtnGhost>
            </div>
          </div>

          {/* Stake token */}
          <div>
            <label style={labelStyle}>STAKE TOKEN</label>
            <div style={{ display: 'flex', gap: 0, border: `2px solid ${T.border}`, width: 'fit-content' }}>
              {STAKE_TOKENS.map((tk, i) => (
                <button
                  key={tk.symbol}
                  onClick={() => setStakeToken(tk)}
                  style={{
                    padding: '8px 16px',
                    fontFamily: T.pixelFont,
                    fontSize: 7,
                    background: stakeToken.symbol === tk.symbol ? T.accent : 'transparent',
                    color: stakeToken.symbol === tk.symbol ? '#000' : T.muted,
                    border: 'none',
                    borderRight: i < STAKE_TOKENS.length - 1 ? `2px solid ${T.border}` : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {tk.symbol}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginTop: 8 }}>
              MIN STAKE: 0.001 {stakeToken.symbol}
            </div>
          </div>

          <div>
            <BtnPrimary onClick={handlePrepare} disabled={loading || !content.trim()}>
              {loading ? 'PREPARING █' : 'NEXT →'}
            </BtnPrimary>
          </div>
        </div>
      )}

      {/* ─── CONFIRM ─── */}
      {step === 'confirm' && prepared && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Refs summary */}
          <div style={{ background: T.surface, border: `2px solid ${T.border}`, boxShadow: '4px 4px 0 rgba(0,0,0,0.4)', padding: 18 }}>
            <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 6 }}>STORAGE REF</div>
            <div style={{ fontSize: 10, color: T.text, wordBreak: 'break-all', marginBottom: 14 }}>{prepared.storageRef}</div>
            <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 6 }}>EMBEDDING REF</div>
            <div style={{ fontSize: 10, color: T.text, wordBreak: 'break-all', marginBottom: 14 }}>{prepared.embeddingRef}</div>
            <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 6 }}>STAKE</div>
            <div style={{ fontFamily: T.pixelFont, fontSize: 10, color: T.accent }}>0.001 {stakeToken.symbol}</div>
          </div>

          {/* Status messages */}
          {approving && (
            <div style={{ background: T.warningBg, border: `2px solid rgba(255,159,28,0.4)`, padding: '10px 16px', fontFamily: T.pixelFont, fontSize: 7, color: T.warning }}>
              ⏳ WAITING FOR WALLET APPROVAL<span className="pixel-blink">█</span>
            </div>
          )}
          {isApprovePending && !approving && (
            <div style={{ background: T.warningBg, border: `2px solid rgba(255,159,28,0.4)`, padding: '10px 16px', fontFamily: T.pixelFont, fontSize: 7, color: T.warning }}>
              ⏳ CONFIRMING APPROVAL ON CELO<span className="pixel-blink">█</span>
            </div>
          )}
          {submitting && (
            <div style={{ background: T.warningBg, border: `2px solid rgba(255,159,28,0.4)`, padding: '10px 16px', fontFamily: T.pixelFont, fontSize: 7, color: T.warning }}>
              ⏳ WAITING FOR SIGNATURE<span className="pixel-blink">█</span>
            </div>
          )}
          {isSubmitPending && !submitting && (
            <div style={{ background: T.warningBg, border: `2px solid rgba(255,159,28,0.4)`, padding: '10px 16px', fontFamily: T.pixelFont, fontSize: 7, color: T.warning }}>
              ⏳ CONFIRMING ON CELO<span className="pixel-blink">█</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <BtnGhost onClick={() => { setStep('form'); setError(null) }} disabled={isProcessing} style={{ fontSize: 7 }}>
              ← BACK
            </BtnGhost>
            {!isProcessing && (
              <BtnPrimary onClick={handleSubmitOnChain}>
                SUBMIT ON CELO →
              </BtnPrimary>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
