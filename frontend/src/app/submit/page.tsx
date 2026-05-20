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
  { value: 0, label: 'Factual', desc: 'Facts, definitions, encyclopedic knowledge' },
  { value: 1, label: 'Labeled Example', desc: 'Training data with labels for AI/ML' },
  { value: 3, label: 'Observation', desc: 'Real-world observations, sensor data' },
]

type Step = 'form' | 'confirm' | 'done'

export default function SubmitPage() {
  const { address, isConnected } = useAccount()

  // Form state
  const [step, setStep] = useState<Step>('form')
  const [content, setContent] = useState('')
  const [domain, setDomain] = useState(0)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [stakeToken, setStakeToken] = useState<Token>(STAKE_TOKENS[0])

  // Prepare state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prepared, setPrepared] = useState<{ storageRef: string; embeddingRef: string; encryptionKeyId: string } | null>(null)

  // Result
  const [result, setResult] = useState<{ entryId: string; txHash: string } | null>(null)

  // Track whether ERC20 approve flow was triggered (avoids setState in effect)
  const erc20FlowRef = useRef(false)

  // On-chain write: approve (ERC20 only)
  const { writeContract: writeApprove, data: approveTxHash, isPending: approving } = useWriteContract()
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })

  // On-chain write: submit
  const { writeContract: writeSubmit, data: submitTxHash, isPending: submitting, error: writeError } = useWriteContract()
  const { isPending: waitingReceipt, isSuccess: receiptSuccess } = useWaitForTransactionReceipt({ hash: submitTxHash })

  // After approve confirmed, trigger submit (no setState in effect body)
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

  // After submit tx confirmed, call backend confirm (setState only in async callbacks)
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
      setPrepared(r)
      setStep('confirm')
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
  const isSubmitPending = !!submitTxHash && !receiptSuccess
  const isProcessing = approving || isApprovePending || submitting || isSubmitPending || waitingReceipt
  const displayError = writeError?.message ?? error

  if (!isConnected) {
    return (
      <div style={{ padding: '80px 28px', fontFamily: T.codeFont, color: T.text, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: T.muted }}>Connect wallet to submit knowledge.</p>
      </div>
    )
  }

  if (step === 'done' && result) {
    return (
      <div style={{ padding: '32px 28px', fontFamily: T.codeFont, color: T.text, maxWidth: 640 }}>
        <div style={{ background: T.successBg, border: `1px solid rgba(74,222,128,0.3)`, borderRadius: 4, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.success, marginBottom: 8 }}>ENTRY SUBMITTED</div>
          <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>Entry ID</div>
          <div style={{ fontSize: 11, color: T.text, wordBreak: 'break-all', marginBottom: 12 }}>{result.entryId}</div>
          <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>Tx Hash</div>
          <div style={{ fontSize: 11, color: T.text, wordBreak: 'break-all' }}>{result.txHash}</div>
        </div>
        <BtnGhost onClick={() => { setStep('form'); setContent(''); setTags([]); setPrepared(null); setResult(null); setError(null) }}>
          SUBMIT ANOTHER
        </BtnGhost>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 28px', fontFamily: T.codeFont, color: T.text, maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>SUBMIT</h1>
        <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>Contribute knowledge. Earn iNFTs and royalties.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {['Form', 'Confirm'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.1em', color: (step === 'form' ? i === 0 : i === 1) ? T.accent : T.muted }}>{s.toUpperCase()}</span>
            {i === 0 && <span style={{ fontSize: 9, color: T.border }}>→</span>}
          </div>
        ))}
      </div>

      {displayError && (
        <div style={{ background: T.dangerBg, border: `1px solid rgba(248,113,113,0.3)`, borderRadius: 3, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: T.danger }}>
          {displayError}
        </div>
      )}

      {step === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Domain */}
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', color: T.muted, display: 'block', marginBottom: 8 }}>DOMAIN</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DOMAINS.map(d => (
                <label key={d.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: domain === d.value ? T.accentLight : T.surface, border: `1px solid ${domain === d.value ? T.accent : T.border}`, borderRadius: 3, cursor: 'pointer' }}>
                  <input type="radio" name="domain" value={d.value} checked={domain === d.value} onChange={() => setDomain(d.value)} style={{ accentColor: T.accent }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: domain === d.value ? T.accent : T.text }}>{d.label}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{d.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', color: T.muted, display: 'block', marginBottom: 8 }}>CONTENT</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Enter your knowledge entry…"
              rows={6}
              style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 3, padding: '10px 14px', fontSize: 12, color: T.text, fontFamily: T.codeFont, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = T.accent)}
              onBlur={e => (e.target.style.borderColor = T.border)}
            />
            <div style={{ fontSize: 9, color: T.muted, marginTop: 4 }}>{content.length} chars</div>
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', color: T.muted, display: 'block', marginBottom: 8 }}>TAGS</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {tags.map(t => (
                <button key={t} onClick={() => setTags(prev => prev.filter(x => x !== t))} style={{ background: T.tag, border: `1px solid ${T.tagBorder}`, borderRadius: 2, padding: '3px 8px', fontSize: 9, color: T.tagText, cursor: 'pointer', fontFamily: T.codeFont }}>
                  {t} ×
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="add-tag"
                style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 3, padding: '7px 12px', fontSize: 11, color: T.text, fontFamily: T.codeFont, outline: 'none' }}
              />
              <BtnGhost onClick={addTag} style={{ padding: '7px 14px', fontSize: 9 }}>ADD</BtnGhost>
            </div>
          </div>

          {/* Stake token */}
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', color: T.muted, display: 'block', marginBottom: 8 }}>STAKE TOKEN</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {STAKE_TOKENS.map(tk => (
                <button
                  key={tk.symbol}
                  onClick={() => setStakeToken(tk)}
                  style={{ padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', background: stakeToken.symbol === tk.symbol ? T.accentLight : T.surface, border: `1px solid ${stakeToken.symbol === tk.symbol ? T.accent : T.border}`, borderRadius: 3, color: stakeToken.symbol === tk.symbol ? T.accent : T.muted, cursor: 'pointer', fontFamily: T.codeFont }}
                >
                  {tk.symbol}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 9, color: T.muted, marginTop: 6 }}>Min stake: 0.001 {stakeToken.symbol}</div>
          </div>

          <BtnPrimary onClick={handlePrepare} disabled={loading || !content.trim()} style={{ alignSelf: 'flex-start' }}>
            {loading ? 'PREPARING…' : 'NEXT →'}
          </BtnPrimary>
        </div>
      )}

      {step === 'confirm' && prepared && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: 16 }}>
            <div style={{ fontSize: 9, color: T.muted, marginBottom: 4 }}>STORAGE REF</div>
            <div style={{ fontSize: 10, color: T.text, wordBreak: 'break-all', marginBottom: 12 }}>{prepared.storageRef}</div>
            <div style={{ fontSize: 9, color: T.muted, marginBottom: 4 }}>EMBEDDING REF</div>
            <div style={{ fontSize: 10, color: T.text, wordBreak: 'break-all', marginBottom: 12 }}>{prepared.embeddingRef}</div>
            <div style={{ fontSize: 9, color: T.muted, marginBottom: 4 }}>STAKE</div>
            <div style={{ fontSize: 10, color: T.text }}>0.001 {stakeToken.symbol}</div>
          </div>

          {approving && (
            <div style={{ background: T.warningBg, border: `1px solid rgba(251,191,36,0.3)`, borderRadius: 3, padding: '10px 14px', fontSize: 11, color: T.warning }}>
              Waiting for wallet approval…
            </div>
          )}
          {isApprovePending && !approving && (
            <div style={{ background: T.warningBg, border: `1px solid rgba(251,191,36,0.3)`, borderRadius: 3, padding: '10px 14px', fontSize: 11, color: T.warning }}>
              Confirming token approval on Celo…
            </div>
          )}
          {submitting && (
            <div style={{ background: T.warningBg, border: `1px solid rgba(251,191,36,0.3)`, borderRadius: 3, padding: '10px 14px', fontSize: 11, color: T.warning }}>
              Waiting for wallet signature…
            </div>
          )}
          {isSubmitPending && !submitting && (
            <div style={{ background: T.warningBg, border: `1px solid rgba(251,191,36,0.3)`, borderRadius: 3, padding: '10px 14px', fontSize: 11, color: T.warning }}>
              Transaction confirming on Celo…
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <BtnGhost onClick={() => { setStep('form'); setError(null) }} style={{ fontSize: 9 }} disabled={isProcessing}>
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
