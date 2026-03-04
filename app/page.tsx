'use client'
import { useEffect, useState, useMemo } from 'react'
import RecipeCard from '@/components/RecipeCard'
import { CATEGORIES, type Recipe } from '@/lib/supabase'
import { getLocalRecipes } from '@/lib/db'

const CATEGORY_EMOJIS: Record<string, string> = {
  All: '✨', Breakfast: '🌅', Chutneys: '🫙', Appetizers: '🍢',
  Soups: '🍲', Rice: '🍚', Curries: '🍛', Poriyals: '🥦',
  Chaat: '🌮', 'Air Fryer': '⚡', Baking: '🧁', Prep: '🔪', Other: '📌',
}

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/recipes')
        const data = await res.json()
        setRecipes(data)
        const { saveRecipesLocally } = await import('@/lib/db')
        await saveRecipesLocally(data)
      } catch {
        const local = await getLocalRecipes()
        setRecipes(local)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchesCategory = category === 'All' || r.category === category
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.ingredients?.some((i) => i.toLowerCase().includes(q)) ||
        r.category.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [recipes, search, category])

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: recipes.length }
    for (const r of recipes) map[r.category] = (map[r.category] || 0) + 1
    return map
  }, [recipes])

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-4xl mb-1" style={{ color: 'var(--text-primary)' }}>
          What are we<br />cooking today?
        </h1>
        <p className="text-base" style={{ color: 'var(--text-muted)' }}>
          {recipes.length} recipes in your collection
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes or ingredients..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium transition-all outline-none"
          style={{
            background: 'var(--card)',
            border: '1.5px solid var(--border)',
            color: 'var(--text-primary)',
            boxShadow: '0 2px 8px rgba(28,16,7,0.06)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(28,16,7,0.06)' }}
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {['All', ...CATEGORIES].map((c) => {
          const active = category === c
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95"
              style={active ? {
                background: 'linear-gradient(135deg, #C8490A, #F97316)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(200,73,10,0.3)',
              } : {
                background: 'var(--card)',
                color: 'var(--text-secondary)',
                border: '1.5px solid var(--border)',
              }}
            >
              <span>{CATEGORY_EMOJIS[c] || '📌'}</span>
              <span>{c}</span>
              {counts[c] ? (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={active
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: 'var(--accent-muted)', color: 'var(--accent)' }}
                >
                  {counts[c]}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', boxShadow: '0 2px 8px rgba(28,16,7,0.06)' }}>
              <div className="h-40 skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-4 skeleton rounded-lg w-3/4" />
                <div className="h-3 skeleton rounded-lg w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="font-display font-semibold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
            No recipes found
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {recipes.length === 0 ? (
              <a href="/recipes/new" style={{ color: 'var(--accent)' }} className="hover:underline">
                Add your first recipe →
              </a>
            ) : 'Try a different search or category'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'}
            {category !== 'All' ? ` in ${category}` : ''}
            {search ? ` matching "${search}"` : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {filtered.map((r) => <RecipeCard key={r.id} recipe={r} />)}
          </div>
        </>
      )}
    </div>
  )
}
