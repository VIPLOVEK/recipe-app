'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, type Recipe } from '@/lib/supabase'
import URLImporter from './URLImporter'

type FormData = {
  title: string
  category: string
  ingredients: string
  steps: string
  source_url: string
  notes: string
  image_url: string
  servings: string
  cook_time: string
}

const DEFAULT: FormData = {
  title: '', category: 'Other', ingredients: '', steps: '',
  source_url: '', notes: '', image_url: '', servings: '', cook_time: '',
}

export default function RecipeForm({ initial }: { initial?: Recipe }) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(
    initial
      ? {
          title: initial.title,
          category: initial.category,
          ingredients: initial.ingredients?.join('\n') || '',
          steps: initial.steps?.join('\n\n') || '',
          source_url: initial.source_url || '',
          notes: initial.notes || '',
          image_url: initial.image_url || '',
          servings: initial.servings || '',
          cook_time: initial.cook_time || '',
        }
      : DEFAULT
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleImport(data: {
    title: string; ingredients: string[]; steps: string[]
    image_url: string | null; source_url: string; notes: string | null
  }) {
    setForm((f) => ({
      ...f,
      // Only replace each field if the fetched value is non-empty
      title: data.title?.trim() ? data.title : f.title,
      ingredients: data.ingredients?.length > 0 ? data.ingredients.join('\n') : f.ingredients,
      steps: data.steps?.length > 0 ? data.steps.join('\n\n') : f.steps,
      image_url: data.image_url || f.image_url,
      source_url: data.source_url || f.source_url,
      notes: data.notes?.trim() ? data.notes : f.notes,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required')
    setSaving(true)
    setError('')

    const payload = {
      title: form.title.trim(),
      category: form.category,
      ingredients: form.ingredients.split('\n').map((l) => l.trim()).filter(Boolean),
      steps: form.steps.split('\n').map((l) => l.trim()).filter(Boolean),
      source_url: form.source_url || null,
      notes: form.notes || null,
      image_url: form.image_url || null,
      servings: form.servings || null,
      cook_time: form.cook_time || null,
    }

    try {
      const url = initial ? `/api/recipes/${initial.id}` : '/api/recipes'
      const method = initial ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/recipes/${data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: 'var(--card)',
    border: '1.5px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <URLImporter onImport={handleImport} initialUrl={initial?.source_url || ''} />

      <div>
        <label style={labelStyle}>Title *</label>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          style={inputStyle}
          placeholder="e.g. Kerala Fish Curry"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Category</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Servings</label>
          <input
            value={form.servings}
            onChange={(e) => set('servings', e.target.value)}
            style={inputStyle}
            placeholder="e.g. 4"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Cook Time</label>
          <input
            value={form.cook_time}
            onChange={(e) => set('cook_time', e.target.value)}
            style={inputStyle}
            placeholder="e.g. 30 mins"
          />
        </div>
        <div>
          <label style={labelStyle}>Image URL</label>
          <input
            value={form.image_url}
            onChange={(e) => set('image_url', e.target.value)}
            style={inputStyle}
            placeholder="https://..."
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>
          Ingredients <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(one per line)</span>
        </label>
        <textarea
          value={form.ingredients}
          onChange={(e) => set('ingredients', e.target.value)}
          rows={6}
          style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
          placeholder={'1 cup rice\n2 tbsp oil\n1 tsp salt'}
        />
      </div>

      <div>
        <label style={labelStyle}>
          Instructions <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(one step per line)</span>
        </label>
        <textarea
          value={form.steps}
          onChange={(e) => set('steps', e.target.value)}
          rows={8}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder={'Wash and soak rice for 30 minutes.\nHeat oil in a pan...'}
        />
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Tips, variations, family notes..."
        />
      </div>

      <div>
        <label style={labelStyle}>Source URL</label>
        <input
          value={form.source_url}
          onChange={(e) => set('source_url', e.target.value)}
          style={inputStyle}
          placeholder="https://..."
        />
      </div>

      {error && (
        <p className="text-sm font-medium" style={{ color: '#DC2626' }}>⚠ {error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #C8490A, #F97316)' }}
        >
          {saving ? 'Saving...' : initial ? 'Update Recipe' : 'Save Recipe'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
