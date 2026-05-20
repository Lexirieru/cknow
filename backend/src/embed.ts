import type { Pipeline } from '@xenova/transformers'

// Lazy singleton — initialised on first call
let pipelinePromise: Promise<Pipeline> | null = null

function getPipeline(): Promise<Pipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      // Dynamic import keeps the heavy load out of module initialisation
      const { pipeline } = await import('@xenova/transformers')
      console.log('[embed] Loading Xenova/all-MiniLM-L6-v2 (384-dim)...')
      const p = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      console.log('[embed] Model ready.')
      return p
    })()
  }
  return pipelinePromise
}

/**
 * Generate a 384-dimension embedding for the given text.
 * Returns an empty array if the model is unavailable or an error occurs.
 * Never throws.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const pipe = await getPipeline()

    // mean_pooling + normalisation gives sentence-level vectors
    const output = await pipe(text, { pooling: 'mean', normalize: true })

    // output.data is a Float32Array; convert to plain number[]
    return Array.from(output.data as Float32Array)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[embed] generateEmbedding failed (returning []): ${msg}`)
    return []
  }
}
