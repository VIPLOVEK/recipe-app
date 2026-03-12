import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from './DeleteButton'
import RefetchButton from './RefetchButton'
import { supabase, proxyImage } from '@/lib/supabase'
import RecipeStepsPlayer from '@/components/RecipeStepsPlayer'

async function getRecipe(id: string) {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single()
  if (error || !data) return null
  return data
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipe = await getRecipe(id)
  if (!recipe) notFound()

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to recipes
      </Link>

      {/* Image */}
      {recipe.image_url && (
        <div className="rounded-2xl overflow-hidden mb-6 h-64" style={{ boxShadow: '0 8px 24px rgba(28,16,7,0.12)' }}>
          <img src={proxyImage(recipe.image_url)!} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header card */}
      <div
        className="rounded-2xl p-6 mb-5"
        style={{ background: 'var(--card)', border: '1.5px solid var(--border)', boxShadow: '0 2px 8px rgba(28,16,7,0.06)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <span
              className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
            >
              {recipe.category}
            </span>
            <h1 className="font-display font-bold text-2xl leading-tight mb-3" style={{ color: 'var(--text-primary)' }}>
              {recipe.title}
            </h1>
            <div className="flex items-center gap-4">
              {recipe.servings && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>{recipe.servings} servings</span>
                </div>
              )}
              {recipe.cook_time && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{recipe.cook_time}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-2">
              <Link
                href={`/recipes/${id}/edit`}
                className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl transition-all hover:opacity-80"
                style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </Link>
              <DeleteButton id={id} />
            </div>
            {recipe.source_url && (
              <RefetchButton id={id} sourceUrl={recipe.source_url} />
            )}
          </div>
        </div>
      </div>

      {/* Ingredients */}
      {recipe.ingredients?.length > 0 && (
        <section className="mb-5">
          <h2 className="font-display font-semibold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>
            Ingredients
            <span className="text-sm font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
              ({recipe.ingredients.length})
            </span>
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1.5px solid var(--border)', background: 'var(--card)', boxShadow: '0 2px 8px rgba(28,16,7,0.04)' }}
          >
            {recipe.ingredients.map((ing: string, i: number) => (
              <div
                key={i}
                className="flex items-start gap-3 px-5 py-3 text-sm"
                style={{
                  borderBottom: i < recipe.ingredients.length - 1 ? '1px solid var(--border)' : 'none',
                  color: 'var(--text-primary)',
                }}
              >
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                >
                  ✓
                </span>
                {ing}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Steps — with audio player */}
      {recipe.steps?.length > 0 && (
        <RecipeStepsPlayer steps={recipe.steps} title={recipe.title} />
      )}

      {/* Notes */}
      {recipe.notes && (
        <section className="mb-5">
          <h2 className="font-display font-semibold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>
            Notes
          </h2>
          <div
            className="rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap"
            style={{
              background: 'linear-gradient(135deg, #FEF3C7, #FEF9EE)',
              border: '1.5px solid #FDE68A',
              color: 'var(--text-primary)',
            }}
          >
            <span className="text-lg mr-2">💡</span>
            {recipe.notes}
          </div>
        </section>
      )}

      {/* Source */}
      {recipe.source_url && (
        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>
            Source
          </h2>
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--accent)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span className="truncate">{recipe.source_url}</span>
          </a>
        </section>
      )}
    </div>
  )
}
