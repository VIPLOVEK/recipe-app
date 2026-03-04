'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ScrapedData = {
  title: string
  ingredients: string[]
  steps: string[]
  image_url: string | null
  source_url: string
  notes: string | null
}

export default function RefetchButton({ id, sourceUrl }: { id: string; sourceUrl: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'fetching' | 'preview' | 'saving' | 'done'>('idle')
  const [data, setData] = useState<ScrapedData | null>(null)
  const [error, setError] = useState('')

  async function handleFetch() {
    setState('fetching')
    setError('')
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch')
      setData(json)
      setState('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setState('idle')
    }
  }

  async function handleApply() {
    if (!data || state === 'saving') return
    setState('saving')
    try {
      // Always send ingredients and steps (even if empty arrays) so Supabase
      // fully replaces existing data rather than leaving old values in place.
      const payload: Record<string, unknown> = {
        ingredients: data.ingredients ?? [],
        steps: data.steps ?? [],
      }
      if (data.image_url) payload.image_url = data.image_url
      if (data.notes) payload.notes = data.notes

      const res = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      setState('done')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setState('preview')
    }
  }

  if (state === 'done') {
    return (
      <span className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ background: '#DCFCE7', color: '#166534' }}>
        ✓ Updated
      </span>
    )
  }

  if ((state === 'preview' || state === 'saving') && data) {
    return (
      <div
        className="mt-5 rounded-2xl p-5"
        style={{ background: 'var(--accent-muted)', border: '1.5px solid #FDBA74' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--accent)' }}>
          🔍 Found from source — review before applying
        </p>
        <div className="space-y-2 mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Ingredients: </span>
            {data.ingredients?.length
              ? `${data.ingredients.length} found`
              : <span style={{ color: 'var(--text-muted)' }}>None found</span>}
          </p>
          <p>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Steps: </span>
            {data.steps?.length
              ? `${data.steps.length} found`
              : <span style={{ color: 'var(--text-muted)' }}>None found</span>}
          </p>
          {data.image_url && (
            <p>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Image: </span>
              ✓ found
            </p>
          )}
        </div>
        {/* Ingredient preview */}
        {data.ingredients?.length > 0 && (
          <div className="mb-3 rounded-xl overflow-hidden text-xs" style={{ border: '1px solid var(--border)' }}>
            {data.ingredients.slice(0, 5).map((ing, i) => (
              <div key={i} className="px-3 py-1.5" style={{ background: i % 2 === 0 ? '#fff' : 'var(--bg)', color: 'var(--text-primary)', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                {ing}
              </div>
            ))}
            {data.ingredients.length > 5 && (
              <div className="px-3 py-1.5 text-center" style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}>
                + {data.ingredients.length - 5} more ingredients
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={state === 'saving'}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C8490A, #F97316)' }}
          >
            {state === 'saving' ? 'Applying...' : 'Apply changes'}
          </button>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs mt-2 font-medium" style={{ color: '#DC2626' }}>⚠ {error}</p>}
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleFetch}
        disabled={state === 'fetching'}
        className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: 'var(--accent-muted)', border: '1.5px solid #FDBA74', color: 'var(--accent)' }}
      >
        {state === 'fetching' ? (
          <>
            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Fetching...
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Re-fetch details
          </>
        )}
      </button>
      {error && <p className="text-xs mt-1 font-medium" style={{ color: '#DC2626' }}>⚠ {error}</p>}
    </div>
  )
}
