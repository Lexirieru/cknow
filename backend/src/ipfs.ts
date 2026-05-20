import axios from 'axios'

const PINATA_BASE = 'https://api.pinata.cloud'

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
]

function getPinataJwt(): string {
  const jwt = process.env.PINATA_JWT
  if (!jwt) {
    throw new Error(
      'PINATA_JWT environment variable is not set. ' +
        'Get your JWT from https://app.pinata.cloud and add it to .env',
    )
  }
  return jwt
}

/**
 * Upload a JSON-serialisable object to IPFS via Pinata.
 * Returns the IPFS CID (v0, starts with "Qm...").
 */
export async function uploadToIPFS(data: object): Promise<string> {
  const jwt = getPinataJwt()

  const res = await axios.post(
    `${PINATA_BASE}/pinning/pinJSONToIPFS`,
    data,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    },
  )

  const cid: string = res.data.IpfsHash
  if (!cid) {
    throw new Error(`Pinata returned no IpfsHash. Response: ${JSON.stringify(res.data)}`)
  }
  return cid
}

/**
 * Fetch JSON content from IPFS, trying each public gateway in order.
 * Throws if all gateways fail.
 */
export async function fetchFromIPFS(cid: string): Promise<unknown> {
  const errors: string[] = []

  for (const gateway of IPFS_GATEWAYS) {
    const url = `${gateway}${cid}`
    try {
      const res = await axios.get(url, { timeout: 15_000 })
      return res.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${gateway}: ${msg}`)
    }
  }

  throw new Error(
    `Failed to fetch CID ${cid} from all gateways:\n${errors.join('\n')}`,
  )
}
