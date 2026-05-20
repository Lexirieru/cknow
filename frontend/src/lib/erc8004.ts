import { createPublicClient, http, type Address } from 'viem'
import { celo } from 'viem/chains'
import { ERC8004, CELO_RPC } from '@/constants/contracts'

const client = createPublicClient({ chain: celo, transport: http(CELO_RPC) })

const IDENTITY_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'isAuthorizedOrOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

const REPUTATION_ABI = [
  {
    name: 'getSummary',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
    ],
    outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'summaryValue', type: 'int128' },
      { name: 'summaryValueDecimals', type: 'uint8' },
    ],
  },
  {
    name: 'getClients',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
] as const

export type AgentSummary = {
  agentId: bigint
  owner: Address
  tokenURI: string
  reputationCount: bigint
  reputationScore: number
}

/** Cek apakah address sudah terdaftar sebagai agent ERC-8004 (agentId = tokenId) */
export async function getAgentId(address: Address): Promise<bigint | null> {
  // Token IDs dimulai dari 1; cek apakah address memiliki token dengan mencoba ownerOf
  // Cara praktis: loop 1..N tidak scalable. Pakai event scan atau gunakan isAuthorizedOrOwner(addr, guessId).
  // Untuk MVP: return null (profile page akan menampilkan "Register" jika null)
  try {
    // Coba agentId = hash-based guess — tidak bisa dilakukan tanpa indexer.
    // Sebagai gantinya profile page akan memanggil register() jika belum terdaftar.
    return null
  } catch {
    return null
  }
}

/** Ambil data reputasi agent */
export async function getAgentReputation(agentId: bigint): Promise<{ count: bigint; score: number } | null> {
  try {
    const [count, summaryValue, decimals] = await client.readContract({
      address: ERC8004.REPUTATION_REGISTRY,
      abi: REPUTATION_ABI,
      functionName: 'getSummary',
      args: [agentId, [], '', ''],
    })
    const score = Number(summaryValue) / Math.pow(10, Number(decimals))
    return { count, score }
  } catch {
    return null
  }
}

/** Ambil tokenURI agent */
export async function getAgentTokenURI(agentId: bigint): Promise<string | null> {
  try {
    const uri = await client.readContract({
      address: ERC8004.IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: 'tokenURI',
      args: [agentId],
    })
    return uri
  } catch {
    return null
  }
}

export { IDENTITY_ABI, REPUTATION_ABI }
