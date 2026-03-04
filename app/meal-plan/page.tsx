import type { Metadata } from 'next'
import MealPlanClient from './MealPlanClient'

export const metadata: Metadata = { title: 'Meal Plan — My Recipes' }

export default function MealPlanPage() {
  return <MealPlanClient />
}
