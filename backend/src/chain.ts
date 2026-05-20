import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Log,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'

// ── Clients ───────────────────────────────────────────────────────────────────

const CELO_RPC = process.env.CELO_RPC ?? 'https://forno.celo.org'

export const publicClient = createPublicClient({
  chain: celo,
  transport: http(CELO_RPC),
})

function buildWalletClient() {
  const rawKey = process.env.OPERATOR_PRIVATE_KEY
  if (!rawKey || rawKey === '0x...') {
    console.warn(
      '[chain] OPERATOR_PRIVATE_KEY not set — write operations will fail.',
    )
    return null
  }
  const key = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`
  const account = privateKeyToAccount(key as `0x${string}`)
  return {
    client: createWalletClient({ account, chain: celo, transport: http(CELO_RPC) }),
    account,
  }
}

const walletContext = buildWalletClient()

export function getOperatorAddress(): string {
  return walletContext?.account.address ?? '0x0000000000000000000000000000000000000000'
}

// ── Contract addresses ────────────────────────────────────────────────────────

const REGISTRY_ADDRESS = (
  process.env.CKNOW_REGISTRY_ADDRESS ?? '0xd27A3431c6F9c78D46663296EEe40ed86b968f47'
) as Address

const MARKET_ADDRESS = (
  process.env.CKNOW_MARKET_ADDRESS ?? '0x0111988b7c11500a17028C64dD795Aed0205d7dD'
) as Address

// ── ABIs ──────────────────────────────────────────────────────────────────────

const REGISTRY_ABI = parseAbi([
  'function getEntry(bytes32 entryId) external view returns ((bytes32 id, string storageRef, string embeddingRef, string[] tags, uint8 domain, address submitter, address paymentToken, uint256 stakeAmount, uint8 status, uint256 submittedAt, uint256 challengeWindowEnd, uint256 queryCount, uint256 royaltiesEarned, uint256 lastQueriedAt, uint256 inftTokenId))',
  'function activateEntry(bytes32 entryId) external',
  'function recordQuery(bytes32 entryId, uint256 royaltyAmount) external',
  'event EntrySubmitted(bytes32 indexed entryId, address indexed submitter, address paymentToken, uint256 stake)',
  'event EntryActivated(bytes32 indexed entryId, uint256 inftTokenId)',
])

const MARKET_ABI = parseAbi([
  'function getActiveListings() external view returns (uint256[] tokenIds, (address seller, address paymentToken, uint256 price, bool active)[] lst)',
])

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read a single entry from the Registry contract. */
export async function getEntryFromChain(entryId: string) {
  const id = entryId.startsWith('0x') ? entryId : `0x${entryId}`
  const entry = await publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'getEntry',
    args: [id as `0x${string}`],
  })
  return entry
}

/**
 * Parse the EntrySubmitted event from a transaction receipt.
 * Returns the entryId (topic[1] of the event) as a hex string.
 */
export async function getEntryIdFromTxHash(txHash: string): Promise<string> {
  const hash = txHash.startsWith('0x') ? txHash : `0x${txHash}`
  const receipt = await publicClient.getTransactionReceipt({
    hash: hash as `0x${string}`,
  })

  // Compute the event topic for EntrySubmitted
  const { keccak256, toHex } = await import('viem')
  const eventTopic = keccak256(
    toHex('EntrySubmitted(bytes32,address,address,uint256)'),
  )

  const log = receipt.logs.find(
    (l: Log) => l.topics[0]?.toLowerCase() === eventTopic.toLowerCase(),
  )
  if (!log || !log.topics[1]) {
    throw new Error(
      `EntrySubmitted event not found in tx ${txHash}. Topics: ${JSON.stringify(receipt.logs.map((l: Log) => l.topics))}`,
    )
  }

  return log.topics[1] as string
}

/**
 * Call activateEntry on the Registry and return the minted inftTokenId.
 * Reads the EntryActivated event from the receipt.
 */
export async function activateEntryOnChain(entryId: string): Promise<bigint> {
  if (!walletContext) {
    throw new Error('OPERATOR_PRIVATE_KEY not configured — cannot activate entry')
  }

  const id = entryId.startsWith('0x') ? entryId : `0x${entryId}`

  const hash = await walletContext.client.writeContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'activateEntry',
    args: [id as `0x${string}`],
    account: walletContext.account,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Try to extract inftTokenId from EntryActivated event
  const { keccak256, toHex, decodeEventLog } = await import('viem')
  const eventTopic = keccak256(toHex('EntryActivated(bytes32,uint256)'))

  const log = receipt.logs.find(
    (l: Log) => l.topics[0]?.toLowerCase() === eventTopic.toLowerCase(),
  )

  if (log) {
    try {
      const decoded = decodeEventLog({
        abi: REGISTRY_ABI,
        eventName: 'EntryActivated',
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        data: log.data,
      })
      return (decoded.args as { entryId: `0x${string}`; inftTokenId: bigint }).inftTokenId
    } catch {
      // fall through to on-chain read
    }
  }

  // Fallback: read from chain
  try {
    const onchain = await getEntryFromChain(entryId)
    return (onchain as { inftTokenId: bigint }).inftTokenId
  } catch {
    return 0n
  }
}

/**
 * Fire-and-forget: record a query on-chain.
 * Errors are logged but do not propagate.
 */
export async function recordQueryOnChain(
  entryId: string,
  royaltyWei: bigint,
): Promise<void> {
  if (!walletContext) {
    console.warn('[chain] recordQueryOnChain skipped — no wallet configured')
    return
  }

  const id = entryId.startsWith('0x') ? entryId : `0x${entryId}`

  walletContext.client
    .writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'recordQuery',
      args: [id as `0x${string}`, royaltyWei],
      account: walletContext.account,
    })
    .catch((err: unknown) => {
      console.warn(
        `[chain] recordQuery failed for ${entryId}: ${err instanceof Error ? err.message : String(err)}`,
      )
    })
}

/** Return all active marketplace listings. */
export async function getActiveListingsFromChain() {
  const result = await publicClient.readContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'getActiveListings',
  })
  return result
}
