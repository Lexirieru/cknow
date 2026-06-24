'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { getMarketListings, type MarketListing } from '@/lib/api'
import { CONTRACTS } from '@/constants/contracts'
import { NATIVE_CELO, getToken, formatTokenAmount } from '@/constants/tokens'
import { MARKET_ABI, ERC20_ABI } from '@/constants/abis'
import { T, Tag, LoadingDots } from '@/components/design-system'

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatPrice(price: string, paymentToken: string): string {
  const token = getToken(paymentToken)
  if (!token) return `${price} wei`
  try {
    return formatTokenAmount(BigInt(price), token)
  } catch {
    return price
  }
}

export default function MarketPage() {
  const { address, isConnected } = useAccount()

  const [listings, setListings] = useState<MarketListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buyingTokenId, setBuyingTokenId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const erc20FlowRef = useRef<MarketListing | null>(null)
  const buyingTokenIdRef = useRef<string | null>(null)

  const { writeContract: writeApprove, data: approveTxHash, isPending: approving } = useWriteContract()
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })
  const { writeContract: writeBuy, data: buyTxHash, isPending: buyPending, error: buyError } = useWriteContract()
  const { isSuccess: buyReceiptSuccess, isPending: buyReceiptPending } = useWaitForTransactionReceipt({ hash: buyTxHash })

  useEffect(() => {
    fetchListings()
  }, [])

  function fetchListings() {
    setLoading(true)
    getMarketListings()
      .then(data => setListings(data.filter(l => l.active)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  // ERC20 flow: after approve confirmed, call buy
  useEffect(() => {
    if (!approveConfirmed || !erc20FlowRef.current) return
    const l = erc20FlowRef.current
    erc20FlowRef.current = null
    writeBuy({
      address: CONTRACTS.CKNOW_MARKET,
      abi: MARKET_ABI,
      functionName: 'buy',
      args: [BigInt(l.tokenId)],
      value: 0n,
    })
  }, [approveConfirmed, writeBuy])

  // After buy receipt success: refresh + show success
  useEffect(() => {
    if (!buyReceiptSuccess) return
    const tokenId = buyingTokenIdRef.current
    setBuyingTokenId(null)
    buyingTokenIdRef.current = null
    setSuccessMsg(`✓ PURCHASED iNFT #${tokenId}`)
    fetchListings()
  }, [buyReceiptSuccess])

  function handleBuy(l: MarketListing) {
    if (!address) return
    setBuyingTokenId(l.tokenId)
    buyingTokenIdRef.current = l.tokenId
    setError(null)
    setSuccessMsg(null)

    const isNative = l.paymentToken.toLowerCase() === NATIVE_CELO.toLowerCase()
    if (isNative) {
      writeBuy({
        address: CONTRACTS.CKNOW_MARKET,
        abi: MARKET_ABI,
        functionName: 'buy',
        args: [BigInt(l.tokenId)],
        value: BigInt(l.price),
      })
    } else {
      erc20FlowRef.current = l
      writeApprove({
        address: l.paymentToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.CKNOW_MARKET, BigInt(l.price)],
      })
    }
  }

  const isApprovePending = !!approveTxHash && !approveConfirmed
  const isBuyPending = !!buyTxHash && !buyReceiptSuccess
  const isProcessing = approving || isApprovePending || buyPending || isBuyPending || buyReceiptPending
  const displayError = buyError?.message ?? error

  return (
    <div style={{ padding: '48px 48px', fontFamily: T.codeFont, color: T.text, maxWidth: 1000, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: T.pixelFont, fontSize: 14, fontWeight: 400, margin: '0 0 14px', color: T.accent, letterSpacing: '0.03em' }}>
          MARKET
        </h1>
        <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>Buy and sell knowledge iNFTs.</p>
      </div>

      {successMsg && (
        <div style={{ background: T.successBg, border: `2px solid rgba(57,255,20,0.4)`, padding: '12px 16px', fontSize: 10, color: T.success, marginBottom: 20, boxShadow: '4px 4px 0 rgba(57,255,20,0.15)', fontFamily: T.pixelFont }}>
          {successMsg}
        </div>
      )}

      {/* Pending status */}
      {buyingTokenId && (
        <>
          {(approving || isApprovePending) && (
            <div style={{ background: T.warningBg, border: `2px solid rgba(255,159,28,0.4)`, padding: '10px 16px', fontFamily: T.pixelFont, fontSize: 7, color: T.warning, marginBottom: 16 }}>
              {approving ? '⏳ WAITING FOR APPROVAL SIGNATURE' : '⏳ CONFIRMING APPROVAL ON CELO'}
            </div>
          )}
          {(buyPending || isBuyPending) && (
            <div style={{ background: T.warningBg, border: `2px solid rgba(255,159,28,0.4)`, padding: '10px 16px', fontFamily: T.pixelFont, fontSize: 7, color: T.warning, marginBottom: 16 }}>
              {buyPending ? '⏳ WAITING FOR BUY SIGNATURE' : '⏳ CONFIRMING PURCHASE ON CELO'}
            </div>
          )}
        </>
      )}

      {loading && <LoadingDots />}

      {displayError && (
        <div style={{ background: T.dangerBg, border: `2px solid rgba(255,36,66,0.4)`, padding: '12px 16px', fontSize: 10, color: T.danger, marginBottom: 20, boxShadow: '4px 4px 0 rgba(255,36,66,0.15)' }}>
          ✕ {displayError}
        </div>
      )}

      {!loading && !displayError && listings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ fontFamily: T.pixelFont, fontSize: 8, color: T.muted }}>NO ACTIVE LISTINGS.</p>
        </div>
      )}

      {listings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {listings.map(l => {
            const isBuying = buyingTokenId === l.tokenId && isProcessing
            return (
              <div
                key={l.tokenId}
                style={{
                  background: T.surface,
                  border: `2px solid ${T.border}`,
                  boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
                  padding: 20,
                }}
              >
                {/* iNFT id + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 6 }}>iNFT</div>
                    <div style={{ fontFamily: T.pixelFont, fontSize: 16, color: T.accent }}>#{l.tokenId}</div>
                  </div>
                  <Tag variant="success">ACTIVE</Tag>
                </div>

                {/* Seller */}
                <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 4 }}>SELLER</div>
                <div style={{ fontSize: 10, color: T.text, marginBottom: 14, fontFamily: T.codeFont }}>{truncate(l.seller)}</div>

                {/* Price */}
                <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 4 }}>PRICE</div>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontFamily: T.pixelFont, fontSize: 12, color: T.text }}>{formatPrice(l.price, l.paymentToken)}</span>
                </div>

                {/* Buy action */}
                {!isConnected ? (
                  <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted }}>CONNECT TO BUY</div>
                ) : (
                  <button
                    disabled={isProcessing}
                    onClick={() => handleBuy(l)}
                    style={{
                      width: '100%',
                      background: isBuying ? T.surface : T.accent,
                      color: isBuying ? T.muted : '#000',
                      border: isBuying ? `2px solid ${T.border}` : 'none',
                      padding: '10px 0',
                      fontFamily: T.pixelFont,
                      fontSize: 8,
                      letterSpacing: '0.05em',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      boxShadow: isBuying ? 'none' : T.pixelShadow,
                    }}
                    onMouseDown={e => {
                      if (!isProcessing) {
                        (e.currentTarget as HTMLElement).style.transform = 'translate(4px,4px)'
                        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                      }
                    }}
                    onMouseUp={e => {
                      if (!isProcessing) {
                        (e.currentTarget as HTMLElement).style.transform = ''
                        ;(e.currentTarget as HTMLElement).style.boxShadow = T.pixelShadow
                      }
                    }}
                  >
                    {isBuying ? 'PROCESSING █' : '▶ BUY'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
