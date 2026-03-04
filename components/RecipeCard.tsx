import Link from 'next/link'
import { proxyImage, type Recipe } from '@/lib/supabase'

const CATEGORY_GRADIENTS: Record<string, string> = {
  Breakfast:   'linear-gradient(135deg, #FEF3C7, #FDE68A)',
  Chutneys:    'linear-gradient(135deg, #DCFCE7, #BBF7D0)',
  Appetizers:  'linear-gradient(135deg, #FFEDD5, #FED7AA)',
  Soups:       'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
  Rice:        'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
  Curries:     'linear-gradient(135deg, #FEE2E2, #FECACA)',
  Poriyals:    'linear-gradient(135deg, #CCFBF1, #99F6E4)',
  Chaat:       'linear-gradient(135deg, #FCE7F3, #FBCFE8)',
  'Air Fryer': 'linear-gradient(135deg, #E0E7FF, #C7D2FE)',
  Baking:      'linear-gradient(135deg, #FFF1F2, #FFE4E6)',
  Prep:        'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
  Other:       'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Breakfast: '🌅', Chutneys: '🫙', Appetizers: '🍢', Soups: '🍲',
  Rice: '🍚', Curries: '🍛', Poriyals: '🥦', Chaat: '🌮',
  'Air Fryer': '⚡', Baking: '🧁', Prep: '🔪', Other: '🍽️',
}

const CATEGORY_BADGE: Record<string, { bg: string; text: string }> = {
  Breakfast:   { bg: '#FEF3C7', text: '#92400E' },
  Chutneys:    { bg: '#DCFCE7', text: '#166534' },
  Appetizers:  { bg: '#FFEDD5', text: '#9A3412' },
  Soups:       { bg: '#DBEAFE', text: '#1E40AF' },
  Rice:        { bg: '#EDE9FE', text: '#5B21B6' },
  Curries:     { bg: '#FEE2E2', text: '#991B1B' },
  Poriyals:    { bg: '#CCFBF1', text: '#065F46' },
  Chaat:       { bg: '#FCE7F3', text: '#9D174D' },
  'Air Fryer': { bg: '#E0E7FF', text: '#3730A3' },
  Baking:      { bg: '#FFF1F2', text: '#9F1239' },
  Prep:        { bg: '#F1F5F9', text: '#475569' },
  Other:       { bg: '#F8FAFC', text: '#334155' },
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const gradient = CATEGORY_GRADIENTS[recipe.category] || CATEGORY_GRADIENTS['Other']
  const emoji = CATEGORY_EMOJIS[recipe.category] || '🍽️'
  const badge = CATEGORY_BADGE[recipe.category] || CATEGORY_BADGE['Other']

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <div
        className="recipe-card rounded-2xl overflow-hidden cursor-pointer"
        style={{
          background: 'var(--card)',
          border: '1.5px solid var(--border)',
          boxShadow: '0 2px 8px rgba(28,16,7,0.06)',
        }}
      >
        {recipe.image_url ? (
          <div className="h-44 overflow-hidden">
            <img
              src={proxyImage(recipe.image_url)!}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="h-36 flex items-center justify-center"
            style={{ background: gradient }}
          >
            <span className="text-5xl">{emoji}</span>
          </div>
        )}

        <div className="p-4">
          <span
            className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2.5"
            style={{ background: badge.bg, color: badge.text }}
          >
            {recipe.category}
          </span>

          <h3
            className="font-semibold text-sm leading-snug line-clamp-2 mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            {recipe.title}
          </h3>

          <div className="flex items-center gap-3 flex-wrap">
            {recipe.servings && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {recipe.servings}
              </span>
            )}
            {recipe.cook_time && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {recipe.cook_time}
              </span>
            )}
            {recipe.ingredients?.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {recipe.ingredients.length} ingredients
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
