import { supabase, Recipe } from './supabase'
import { saveRecipesLocally, getLocalRecipes, saveRecipeLocally, deleteRecipeLocally } from './db'

export async function fetchRecipes(): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Sync to local cache
    if (data) await saveRecipesLocally(data)
    return data || []
  } catch {
    // Offline fallback
    return getLocalRecipes()
  }
}

export async function fetchRecipe(id: string): Promise<Recipe | null> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (data) await saveRecipeLocally(data)
    return data
  } catch {
    const local = await getLocalRecipes()
    return local.find((r) => r.id === id) || null
  }
}

export async function createRecipe(recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<Recipe> {
  const { data, error } = await supabase.from('recipes').insert(recipe).select().single()
  if (error) throw error
  await saveRecipeLocally(data)
  return data
}

export async function updateRecipe(id: string, recipe: Partial<Recipe>): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update({ ...recipe, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await saveRecipeLocally(data)
  return data
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
  await deleteRecipeLocally(id)
}
