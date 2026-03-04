import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Recipe = {
  id: string
  title: string
  category: string
  ingredients: string[]
  steps: string[]
  source_url: string | null
  notes: string | null
  image_url: string | null
  servings: string | null
  cook_time: string | null
  created_at: string
  updated_at: string
}

export const CATEGORIES = [
  'Breakfast',
  'Chutneys',
  'Appetizers',
  'Soups',
  'Rice',
  'Curries',
  'Poriyals',
  'Chaat',
  'Air Fryer',
  'Baking',
  'Prep',
  'Other',
]

// ── Image proxy helper ───────────────────────────────────────────────────────
// Routes external image URLs through our server-side proxy to bypass
// hotlink protection on source sites (Hebbar's Kitchen, etc.)
export function proxyImage(url: string | null | undefined): string | null {
  if (!url) return null
  // Already a relative/proxied URL — no wrapping needed
  if (url.startsWith('/') || !url.startsWith('http')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

// ── Meal Plan types ──────────────────────────────────────────────────────────
export type MealSlot = {
  recipe_id: string | null  // null = custom text, non-null = linked recipe
  title: string
} | null                    // null = empty cell

export type WeekPlan = Record<string, MealSlot>
// Key format: "{dayIndex}_{mealKey}" e.g. "0_breakfast", "3_lunch", "6_dinner"
