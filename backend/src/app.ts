import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import { randomBytes } from 'crypto'

import { generateEmbedding } from './embed.js'
import { uploadToIPFS, fetchFromIPFS } from './ipfs.js'
import {
  getEntryIdFromTxHash,
  activateEntryOnChain,
  getEntryFromChain,
  recordQueryOnChain,
  getActiveListingsFromChain,
  getOperatorAddress,
} from './chain.js'
import {
  upsertEntry,
  getDbEntry,
  getAllDbEntries,
  deleteEntry,
  addDiscussion,
  getDiscussions,
} from './db.js'
import {
  DOMAIN_INDEX,
  type CachedEntry,
  type EntryDomain,
  type PrepareRequest,
  type ConfirmRequest,
  type QueryRequest,
} from './types.js'

// ── In-memory vector cache ────────────────────────────────────────────────────

// Key: onchain entryId (hex) or temporary encryptionKeyId
const cache = new Map<string, CachedEntry>()

// ── Constants ─────────────────────────────────────────────────────────────────

const REGISTRY_ADDRESS =
  process.env.CKNOW_REGISTRY_ADDRESS ??
  '0xd27A3431c6F9c78D46663296EEe40ed86b968f47'

// Challenge window = 5 min on Celo Mainnet; add 30s buffer before activating
const CHALLENGE_WINDOW_MS = 5 * 60 * 1_000
const ACTIVATION_BUFFER_MS = 30_000
const ACTIVATION_DELAY_MS = CHALLENGE_WINDOW_MS + ACTIVATION_BUFFER_MS

// ── Helpers ───────────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const len = Math.min(a.length, b.length)
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < len; i++) {
    dot   += a[i] * b[i]
    normA += a[i] ** 2
    normB += b[i] ** 2
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

function requireAdminToken(req: Request, res: Response): boolean {
  const adminToken = process.env.ADMIN_TOKEN ?? 'cknow-admin'
  const provided = req.headers['x-admin-token']
  if (provided !== adminToken) {
    res.status(401).json({ error: 'Unauthorized: invalid or missing x-admin-token' })
    return false
  }
  return true
}

/**
 * Schedule on-chain activation of an entry after the challenge window.
 * Updates both the in-memory cache and SQLite when done.
 */
function scheduleActivation(entryId: string, delayMs = ACTIVATION_DELAY_MS): void {
  console.log(
    `[keeper] Scheduled activation of ${entryId} in ${Math.round(delayMs / 1000)}s`,
  )
  setTimeout(async () => {
    console.log(`[keeper] Activating ${entryId}...`)
    try {
      const inftTokenId = await activateEntryOnChain(entryId)
      console.log(`[keeper] Activated ${entryId} → inftTokenId=${inftTokenId}`)

      // Update cache
      const cached = cache.get(entryId)
      if (cached) {
        cached.inftTokenId = inftTokenId
        cache.set(entryId, cached)
      }

      // Update DB
      upsertEntry(entryId, {
        inftTokenId: inftTokenId.toString(),
        status: 1, // active
      })
    } catch (err: unknown) {
      console.error(
        `[keeper] activateEntryOnChain failed for ${entryId}:`,
        err instanceof Error ? err.message : String(err),
      )
    }
  }, delayMs)
}

// ── Startup hydration ─────────────────────────────────────────────────────────

function hydrateCache(): void {
  const rows = getAllDbEntries()
  let count = 0
  for (const row of rows) {
    const vector: number[] = (() => {
      try { return JSON.parse(row.embedding_vector) } catch { return [] }
    })()
    const tags: string[] = (() => {
      try { return JSON.parse(row.tags) } catch { return [] }
    })()

    cache.set(row.entry_id, {
      content: row.content,
      vector,
      storageRef: row.storage_ref,
      embeddingRef: row.embedding_ref,
      tags,
      domain: row.domain ?? undefined,
      submitter: row.submitter ?? undefined,
      onchainEntryId: row.entry_id,
      submitTxHash: row.submit_tx_hash ?? undefined,
      challengeWindowEnd: row.challenge_window_end,
      inftTokenId: row.inft_token_id ? BigInt(row.inft_token_id) : undefined,
    })
    count++
  }
  console.log(`[cache] Hydrated ${count} entries from DB`)
}

// ── App factory ───────────────────────────────────────────────────────────────

export function createApp(): express.Application {
  // Hydrate on startup
  hydrateCache()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '4mb' }))

  // ── GET /health ─────────────────────────────────────────────────────────────

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', entries: cache.size, operator: getOperatorAddress() })
  })

  // ── POST /store/prepare ─────────────────────────────────────────────────────

  app.post(
    '/store/prepare',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as PrepareRequest
        if (!body.content || typeof body.content !== 'string') {
          res.status(400).json({ error: '`content` is required and must be a string' })
          return
        }

        const domain: EntryDomain = body.domain ?? 'factual'
        const tags: string[] = body.tags ?? []
        const submittedBy: string | undefined = body.submittedBy
        const domainIndex = DOMAIN_INDEX[domain] ?? 0

        // Unique temp key
        const encryptionKeyId = randomBytes(16).toString('hex')

        // 1. Upload content blob to IPFS
        const contentBlob = { content: body.content, domain, tags, submittedBy }
        const storageRef = await uploadToIPFS(contentBlob)

        // 2. Generate embedding (non-blocking — errors return empty)
        const vector = await generateEmbedding(body.content)

        // 3. Upload embedding to IPFS (best-effort)
        let embeddingRef = ''
        if (vector.length > 0) {
          try {
            embeddingRef = await uploadToIPFS({ vector })
          } catch (err: unknown) {
            console.warn(
              '[prepare] embedding upload failed:',
              err instanceof Error ? err.message : String(err),
            )
          }
        }

        // 4. Cache in memory under temp key
        const now = Math.floor(Date.now() / 1000)
        const cachedEntry: CachedEntry = {
          content: body.content,
          vector,
          storageRef,
          embeddingRef,
          tags,
          domain,
          submitter: submittedBy,
          challengeWindowEnd: now + CHALLENGE_WINDOW_MS / 1000,
        }
        cache.set(encryptionKeyId, cachedEntry)

        // 5. Persist to DB under temp key so it survives restarts
        upsertEntry(encryptionKeyId, {
          storageRef,
          embeddingRef,
          tags,
          domain,
          submitter: submittedBy,
          content: body.content,
          submittedAt: now,
          challengeWindowEnd: now + CHALLENGE_WINDOW_MS / 1000,
          embeddingVector: vector,
        })

        res.status(202).json({
          storageRef,
          embeddingRef,
          encryptionKeyId,
          domainIndex,
          registryAddress: REGISTRY_ADDRESS,
        })
      } catch (err) {
        next(err)
      }
    },
  )

  // ── POST /store/confirm ─────────────────────────────────────────────────────

  app.post(
    '/store/confirm',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as ConfirmRequest
        if (!body.txHash) {
          res.status(400).json({ error: '`txHash` is required' })
          return
        }

        // Resolve on-chain entryId from the tx receipt
        const entryId = await getEntryIdFromTxHash(body.txHash)

        // Retrieve temp-keyed data from cache if available
        const tempEntry = cache.get(body.encryptionKeyId)

        const now = Math.floor(Date.now() / 1000)
        const challengeWindowEnd = now + CHALLENGE_WINDOW_MS / 1000

        // Merge: temp cache wins over body
        const finalEntry: CachedEntry = {
          content: tempEntry?.content ?? body.content ?? '',
          vector: tempEntry?.vector ?? [],
          storageRef: tempEntry?.storageRef ?? body.storageRef ?? '',
          embeddingRef: tempEntry?.embeddingRef ?? body.embeddingRef ?? '',
          tags: tempEntry?.tags ?? body.tags ?? [],
          domain: tempEntry?.domain ?? body.domain,
          submitter: tempEntry?.submitter ?? body.submittedBy,
          onchainEntryId: entryId,
          submitTxHash: body.txHash,
          challengeWindowEnd,
        }

        // Move from temp key to permanent onchain entryId
        cache.set(entryId, finalEntry)
        if (body.encryptionKeyId && body.encryptionKeyId !== entryId) {
          cache.delete(body.encryptionKeyId)
        }

        // Upsert in DB under the real entryId
        upsertEntry(entryId, {
          storageRef: finalEntry.storageRef,
          embeddingRef: finalEntry.embeddingRef,
          tags: finalEntry.tags,
          domain: finalEntry.domain,
          submitter: finalEntry.submitter,
          content: finalEntry.content,
          submittedAt: now,
          challengeWindowEnd,
          submitTxHash: body.txHash,
          embeddingVector: finalEntry.vector,
          status: 0, // pending
        })

        // Remove temp DB row if it existed under a different key
        if (body.encryptionKeyId && body.encryptionKeyId !== entryId) {
          deleteEntry(body.encryptionKeyId)
        }

        // Schedule auto-activation after challenge window + buffer
        scheduleActivation(entryId, ACTIVATION_DELAY_MS)

        res.json({ entryId, txHash: body.txHash })
      } catch (err) {
        next(err)
      }
    },
  )

  // ── POST /query ─────────────────────────────────────────────────────────────

  app.post(
    '/query',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as QueryRequest
        if (!body.text || typeof body.text !== 'string') {
          res.status(400).json({ error: '`text` is required and must be a string' })
          return
        }

        const topK = Math.min(Math.max(body.topK ?? 10, 1), 100)
        const domainFilter = body.domains && body.domains.length > 0
          ? new Set<string>(body.domains)
          : null

        const queryVector = await generateEmbedding(body.text)

        interface Candidate {
          entryId: string
          similarity: number
          entry: CachedEntry
        }

        const candidates: Candidate[] = []

        for (const [id, entry] of cache.entries()) {
          // Skip temp entries that have no onchain entryId
          if (!entry.onchainEntryId) continue
          // Domain filter
          if (domainFilter && entry.domain && !domainFilter.has(entry.domain)) continue

          const sim = cosineSimilarity(queryVector, entry.vector)
          candidates.push({ entryId: id, similarity: sim, entry })
        }

        candidates.sort((a, b) => b.similarity - a.similarity)
        const top = candidates.slice(0, topK)

        const matches = top.map(({ entryId, similarity, entry }) => ({
          entryId,
          similarity,
          storageRef: entry.storageRef,
          tags: entry.tags,
          domain: entry.domain as EntryDomain | undefined,
          submitter: entry.submitter,
          inftTokenId: entry.inftTokenId !== undefined
            ? entry.inftTokenId.toString()
            : undefined,
        }))

        res.json({ matches })
      } catch (err) {
        next(err)
      }
    },
  )

  // ── GET /content/:entryId ───────────────────────────────────────────────────

  app.get(
    '/content/:entryId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { entryId } = req.params

        // 1. In-memory cache
        const cached = cache.get(entryId)
        if (cached) {
          return res.json({
            entryId,
            content: cached.content,
            tags: cached.tags,
            domain: cached.domain,
            submitter: cached.submitter,
            submitTxHash: cached.submitTxHash,
          })
        }

        // 2. DB
        const dbRow = getDbEntry(entryId)
        if (dbRow) {
          return res.json({
            entryId,
            content: dbRow.content,
            tags: JSON.parse(dbRow.tags),
            domain: dbRow.domain,
            submitter: dbRow.submitter,
            submitTxHash: dbRow.submit_tx_hash,
          })
        }

        // 3. IPFS fallback — need storageRef from chain
        try {
          const onchain = await getEntryFromChain(entryId) as {
            storageRef: string
            embeddingRef: string
            tags: string[]
            domain: number
            submitter: string
          }
          const ipfsData = await fetchFromIPFS(onchain.storageRef)
          return res.json({
            entryId,
            content: (ipfsData as { content?: string }).content ?? '',
            tags: onchain.tags,
            domain: onchain.domain,
            submitter: onchain.submitter,
            submitTxHash: null,
            source: 'ipfs',
          })
        } catch {
          return res.status(404).json({ error: `Entry ${entryId} not found` })
        }
      } catch (err) {
        next(err)
      }
    },
  )

  // ── GET /entries ────────────────────────────────────────────────────────────

  app.get('/entries', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = getAllDbEntries()
      res.json(
        rows.map((r) => ({
          ...r,
          tags: JSON.parse(r.tags),
          embedding_vector: undefined, // don't leak big arrays
        })),
      )
    } catch (err) {
      next(err)
    }
  })

  // ── GET /entries/:entryId ───────────────────────────────────────────────────

  app.get(
    '/entries/:entryId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { entryId } = req.params

        const dbRow = getDbEntry(entryId)
        if (dbRow) {
          return res.json({ ...dbRow, tags: JSON.parse(dbRow.tags), embedding_vector: undefined })
        }

        // Fallback: read from chain
        try {
          const onchain = await getEntryFromChain(entryId)
          return res.json({ entryId, source: 'chain', ...onchain })
        } catch {
          return res.status(404).json({ error: `Entry ${entryId} not found` })
        }
      } catch (err) {
        next(err)
      }
    },
  )

  // ── POST /activate/:entryId ─────────────────────────────────────────────────

  app.post(
    '/activate/:entryId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { entryId } = req.params
        const inftTokenId = await activateEntryOnChain(entryId)

        // Update cache + DB
        const cached = cache.get(entryId)
        if (cached) {
          cached.inftTokenId = inftTokenId
          cache.set(entryId, cached)
        }
        upsertEntry(entryId, { inftTokenId: inftTokenId.toString(), status: 1 })

        res.json({ entryId, inftTokenId: inftTokenId.toString() })
      } catch (err) {
        next(err)
      }
    },
  )

  // ── GET /keeper/status ──────────────────────────────────────────────────────

  app.get('/keeper/status', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const now = Math.floor(Date.now() / 1000)
      const rows = getAllDbEntries()

      const pending = rows.filter((r) => {
        const noInft = !r.inft_token_id || r.inft_token_id === '0'
        const windowElapsed = r.challenge_window_end > 0 && r.challenge_window_end < now
        return noInft && windowElapsed
      })

      res.json({ count: pending.length, entries: pending.map((r) => r.entry_id) })
    } catch (err) {
      next(err)
    }
  })

  // ── POST /keeper/activate-pending ───────────────────────────────────────────

  app.post(
    '/keeper/activate-pending',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const now = Math.floor(Date.now() / 1000)
        const rows = getAllDbEntries()

        const pending = rows.filter((r) => {
          const noInft = !r.inft_token_id || r.inft_token_id === '0'
          const windowElapsed = r.challenge_window_end > 0 && r.challenge_window_end < now
          return noInft && windowElapsed
        })

        const results: Array<{ entryId: string; status: string; inftTokenId?: string }> = []

        for (const row of pending) {
          try {
            const inftTokenId = await activateEntryOnChain(row.entry_id)
            const cached = cache.get(row.entry_id)
            if (cached) {
              cached.inftTokenId = inftTokenId
              cache.set(row.entry_id, cached)
            }
            upsertEntry(row.entry_id, { inftTokenId: inftTokenId.toString(), status: 1 })
            results.push({ entryId: row.entry_id, status: 'activated', inftTokenId: inftTokenId.toString() })
          } catch (err: unknown) {
            results.push({
              entryId: row.entry_id,
              status: `error: ${err instanceof Error ? err.message : String(err)}`,
            })
          }
        }

        res.json({ processed: results.length, results })
      } catch (err) {
        next(err)
      }
    },
  )

  // ── GET /market/listings ────────────────────────────────────────────────────

  app.get(
    '/market/listings',
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const listings = await getActiveListingsFromChain()
        res.json(listings)
      } catch (err) {
        next(err)
      }
    },
  )

  // ── GET /discussions/:entryId ───────────────────────────────────────────────

  app.get(
    '/discussions/:entryId',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { entryId } = req.params
        const discussions = getDiscussions(entryId)
        res.json({ entryId, discussions })
      } catch (err) {
        next(err)
      }
    },
  )

  // ── POST /discussions/:entryId ──────────────────────────────────────────────

  app.post(
    '/discussions/:entryId',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { entryId } = req.params
        const { author, content } = req.body as { author?: string; content?: string }

        if (!content || typeof content !== 'string') {
          res.status(400).json({ error: '`content` is required' })
          return
        }

        addDiscussion(entryId, author ?? 'anonymous', content)
        res.status(201).json({ entryId, status: 'created' })
      } catch (err) {
        next(err)
      }
    },
  )

  // ── DELETE /entries/:entryId ────────────────────────────────────────────────

  app.delete(
    '/entries/:entryId',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!requireAdminToken(req, res)) return

        const { entryId } = req.params
        cache.delete(entryId)
        deleteEntry(entryId)
        res.json({ entryId, deleted: true })
      } catch (err) {
        next(err)
      }
    },
  )

  // ── Global error handler ────────────────────────────────────────────────────

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[error]', message)
    const status = (err as { status?: number }).status ?? 500
    res.status(status).json({ error: message })
  })

  return app
}
