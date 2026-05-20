import { Database } from 'bun:sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '..', 'cknow.db')

const db = new Database(DB_PATH)
db.run('PRAGMA journal_mode = WAL')

db.run(`
  CREATE TABLE IF NOT EXISTS entries (
    entry_id              TEXT PRIMARY KEY,
    storage_ref           TEXT NOT NULL DEFAULT '',
    embedding_ref         TEXT NOT NULL DEFAULT '',
    tags                  TEXT NOT NULL DEFAULT '[]',
    domain                TEXT,
    submitter             TEXT,
    status                INTEGER NOT NULL DEFAULT 0,
    content               TEXT NOT NULL DEFAULT '',
    submitted_at          INTEGER NOT NULL DEFAULT 0,
    challenge_window_end  INTEGER NOT NULL DEFAULT 0,
    inft_token_id         TEXT,
    submit_tx_hash        TEXT,
    embedding_vector      TEXT NOT NULL DEFAULT '[]'
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS discussions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id   TEXT NOT NULL,
    author     TEXT NOT NULL DEFAULT '',
    content    TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`)

// Safe column migrations
const migrations: Array<{ col: string; def: string }> = [
  { col: 'inft_token_id',    def: 'TEXT' },
  { col: 'submit_tx_hash',   def: 'TEXT' },
  { col: 'embedding_vector', def: "TEXT NOT NULL DEFAULT '[]'" },
  { col: 'embedding_ref',    def: "TEXT NOT NULL DEFAULT ''" },
  { col: 'challenge_window_end', def: 'INTEGER NOT NULL DEFAULT 0' },
]
for (const { col, def } of migrations) {
  try { db.run(`ALTER TABLE entries ADD COLUMN ${col} ${def}`) } catch { /* exists */ }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DbEntry {
  entry_id: string
  storage_ref: string
  embedding_ref: string
  tags: string              // JSON string
  domain: string | null
  submitter: string | null
  status: number
  content: string
  submitted_at: number
  challenge_window_end: number
  inft_token_id: string | null
  submit_tx_hash: string | null
  embedding_vector: string  // JSON string
}

export interface DbDiscussion {
  id: number
  entry_id: string
  author: string
  content: string
  created_at: number
}

// ── Prepared statements ───────────────────────────────────────────────────────

const stmtGet = db.prepare<DbEntry, [string]>(
  'SELECT * FROM entries WHERE entry_id = ?'
)

const stmtGetAll = db.prepare<DbEntry, []>(
  'SELECT * FROM entries ORDER BY submitted_at DESC'
)

const stmtDelete = db.prepare<void, [string]>(
  'DELETE FROM entries WHERE entry_id = ?'
)

const stmtUpsert = db.prepare(`
  INSERT INTO entries (
    entry_id, storage_ref, embedding_ref, tags, domain, submitter,
    status, content, submitted_at, challenge_window_end,
    inft_token_id, submit_tx_hash, embedding_vector
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(entry_id) DO UPDATE SET
    storage_ref          = excluded.storage_ref,
    embedding_ref        = excluded.embedding_ref,
    tags                 = excluded.tags,
    domain               = excluded.domain,
    submitter            = excluded.submitter,
    status               = excluded.status,
    content              = excluded.content,
    submitted_at         = excluded.submitted_at,
    challenge_window_end = excluded.challenge_window_end,
    inft_token_id        = excluded.inft_token_id,
    submit_tx_hash       = excluded.submit_tx_hash,
    embedding_vector     = excluded.embedding_vector
`)

const stmtInsertDiscussion = db.prepare(
  'INSERT INTO discussions (entry_id, author, content) VALUES (?, ?, ?)'
)

const stmtGetDiscussions = db.prepare<DbDiscussion, [string]>(
  'SELECT * FROM discussions WHERE entry_id = ? ORDER BY created_at ASC'
)

// ── Public API ────────────────────────────────────────────────────────────────

export function upsertEntry(
  entryId: string,
  data: {
    storageRef?: string
    embeddingRef?: string
    tags?: string[]
    domain?: string | null
    submitter?: string | null
    status?: number
    content?: string
    submittedAt?: number
    challengeWindowEnd?: number
    inftTokenId?: string | null
    submitTxHash?: string | null
    embeddingVector?: number[]
  },
): void {
  const ex = stmtGet.get(entryId)
  stmtUpsert.run(
    entryId,
    data.storageRef          ?? ex?.storage_ref          ?? '',
    data.embeddingRef        ?? ex?.embedding_ref         ?? '',
    JSON.stringify(data.tags ?? JSON.parse(ex?.tags ?? '[]')),
    data.domain !== undefined ? data.domain       : (ex?.domain   ?? null),
    data.submitter !== undefined ? data.submitter : (ex?.submitter ?? null),
    data.status              ?? ex?.status               ?? 0,
    data.content             ?? ex?.content              ?? '',
    data.submittedAt         ?? ex?.submitted_at          ?? Math.floor(Date.now() / 1000),
    data.challengeWindowEnd  ?? ex?.challenge_window_end  ?? 0,
    data.inftTokenId !== undefined  ? data.inftTokenId  : (ex?.inft_token_id  ?? null),
    data.submitTxHash !== undefined ? data.submitTxHash : (ex?.submit_tx_hash ?? null),
    JSON.stringify(data.embeddingVector ?? JSON.parse(ex?.embedding_vector ?? '[]')),
  )
}

export function getDbEntry(entryId: string): DbEntry | undefined {
  return stmtGet.get(entryId) ?? undefined
}

export function getAllDbEntries(): DbEntry[] {
  return stmtGetAll.all()
}

export function deleteEntry(entryId: string): void {
  stmtDelete.run(entryId)
}

export function addDiscussion(entryId: string, author: string, content: string): void {
  stmtInsertDiscussion.run(entryId, author, content)
}

export function getDiscussions(entryId: string): DbDiscussion[] {
  return stmtGetDiscussions.all(entryId)
}

export default db
