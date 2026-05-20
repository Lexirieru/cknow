const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${path} failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GET ${path} failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

export type PrepareResponse = { storageRef: string; embeddingRef: string; encryptionKeyId: string }
export type ConfirmResponse = { entryId: string; txHash: string }
export type Entry = {
  entryId: string; storageRef: string; embeddingRef?: string
  tags: string[]; domain: number; submitter: string
  inftTokenId?: string; content?: string; createdAt?: string
}
export type QueryResult = {
  entryId: string; storageRef: string; tags: string[]
  domain: number; submitter: string; similarity: number; content?: string
}
export type MarketListing = {
  tokenId: string; seller: string; price: string; paymentToken: string; active: boolean
}
export type HealthResponse = { status: string; version?: string; entries?: number; uptime?: number }
export type Discussion = { id: string; entryId: string; author: string; content: string; createdAt: string }

export const prepare = (content: string, domain: number, tags: string[], submittedBy?: string) =>
  post<PrepareResponse>('/store/prepare', { content, domain, tags, submittedBy })

export const confirm = (
  txHash: string, storageRef: string, embeddingRef: string,
  encryptionKeyId: string, content: string, domain: number, tags: string[], submittedBy?: string,
) => post<ConfirmResponse>('/store/confirm', { txHash, storageRef, embeddingRef, encryptionKeyId, content, domain, tags, submittedBy })

export const query = (text: string, topK?: number, domains?: number[]) =>
  post<QueryResult[]>('/query', { text, topK, domains })

export const getEntries = () => get<Entry[]>('/entries')
export const getContent = (entryId: string) => get<Entry>(`/content/${entryId}`)
export const getMarketListings = () => get<MarketListing[]>('/market/listings')
export const getHealth = () => get<HealthResponse>('/health')
export const getDiscussions = (entryId: string) => get<Discussion[]>(`/discussions/${entryId}`)
export const postDiscussion = (entryId: string, author: string, content: string) =>
  post<Discussion>(`/discussions/${entryId}`, { author, content })
