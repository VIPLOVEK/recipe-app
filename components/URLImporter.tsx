'use client'
import { useState } from 'react'

type ScrapedData = {
  title: string
  ingredients: string[]
  steps: string[]
  image_url: string | null
  source_url: string
  notes: string | null
}

export default function URLImporter({
  onImport,
  initialUrl = '',
}: {
  onImport: (data: ScrapedData) => void
  initialUrl?: string
}) {
  const [url, setUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleFetch() {
    const target = url.trim()
    if (!target) return
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      onImport(data)
      setSuccess(true)
      if (!initialUrl) setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch recipe')
    } finally {
      setLoading(false)
    }
  }

  const isYouTube = /youtube\.com|youtu\.be/.test(url)
  const isEditing = !!initialUrl

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{ background: 'var(--accent-muted)', border: '1.5px solid #FDBA74' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isYouTube ? '▶️' : '🔗'}</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            {isEditing ? 'Re-fetch from URL' : 'Import from URL'}
          </p>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#FDBA74', color: '#7C2D12' }}>
            YouTube · Recipe sites
          </span>
        </div>
        {success && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#DCFCE7', color: '#166534' }}>
            ✓ Fields updated
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setSuccess(false) }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleFetch())}
          placeholder="Paste a YouTube or recipe website URL..."
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#fff', border: '1.5px solid #FDBA74', color: 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #C8490A, #F97316)' }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Fetching
            </span>
          ) : isEditing ? 'Re-fetch' : 'Fetch'}
        </button>
      </div>

      {error && <p className="text-xs mt-2 font-medium" style={{ color: '#DC2626' }}>⚠ {error}</p>}
      {success && <p className="text-xs mt-2 font-medium" style={{ color: '#166534' }}>✓ Fields updated — review and save when ready.</p>}
    </div>
  )
}
