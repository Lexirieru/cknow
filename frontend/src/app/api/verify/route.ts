import { SelfBackendVerifier, AllIds, DefaultConfigStore } from '@selfxyz/core'
import { NextResponse } from 'next/server'

const SCOPE = 'cknow-identity'
const ENDPOINT = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/verify`
  : 'https://app.cknow.xyz/api/verify'

const verifier = new SelfBackendVerifier(
  SCOPE,
  ENDPOINT,
  false,
  AllIds,
  new DefaultConfigStore({ minimumAge: 18, ofac: true }),
  'hex'
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { attestationId, proof, publicSignals, userContextData } = body

    if (!attestationId || !proof || !publicSignals) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await verifier.verify(attestationId, proof, publicSignals, userContextData ?? '')

    if (!result.isValidDetails?.isValid) {
      return NextResponse.json({ verified: false, reason: 'Proof invalid' }, { status: 400 })
    }

    return NextResponse.json({
      verified: true,
      userId: result.userData?.userIdentifier,
    })
  } catch (err) {
    console.error('[/api/verify]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
