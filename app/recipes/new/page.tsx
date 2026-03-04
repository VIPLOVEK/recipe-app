import RecipeForm from '@/components/RecipeForm'

export default function NewRecipePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display font-bold text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>
        Add New Recipe
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        Import from a URL or fill in the details manually
      </p>
      <RecipeForm />
    </div>
  )
}
