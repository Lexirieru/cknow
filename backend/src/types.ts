export type EntryDomain =
  | 'factual'
  | 'labeled_example'
  | 'structured_data'
  | 'observation'
  | 'correction'

export const DOMAIN_INDEX: Record<EntryDomain, number> = {
  factual: 0,
  labeled_example: 1,
  structured_data: 2,
  observation: 3,
  correction: 4,
}

export interface PrepareRequest {
  content: string
  domain?: EntryDomain
  tags?: string[]
  submittedBy?: string // address or handle
}

export interface PrepareResult {
  storageRef: string      // IPFS CID of content blob
  embeddingRef: string    // IPFS CID of embedding blob (may be '' if embed fails)
  encryptionKeyId: string // random hex ID used as blob identifier
  domainIndex: number
  registryAddress: string
}

export interface ConfirmRequest {
  txHash: `0x${string}`
  storageRef: string
  embeddingRef?: string
  encryptionKeyId: string
  content: string
  domain: EntryDomain
  tags: string[]
  submittedBy?: string
}

export interface QueryRequest {
  text: string
  topK?: number
  domains?: EntryDomain[]
  queriedBy?: string
}

export interface QueryMatch {
  entryId: string
  similarity: number
  storageRef: string
  tags: string[]
  domain?: EntryDomain
  submitter?: string
  inftTokenId?: string
}

export interface CachedEntry {
  content: string
  vector: number[]
  storageRef: string
  embeddingRef: string
  tags: string[]
  domain?: string
  submitter?: string
  onchainEntryId?: string
  submitTxHash?: string
  challengeWindowEnd?: number
  inftTokenId?: bigint
}
