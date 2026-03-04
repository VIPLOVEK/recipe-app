import RecipeForm from '@/components/RecipeForm'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

async function getRecipe(id: string) {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single()
  if (error || !data) return null
  return data
}

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipe = await getRecipe(id)
  if (!recipe) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Edit Recipe</h1>
      <RecipeForm initial={recipe} />
    </div>
  )
}
