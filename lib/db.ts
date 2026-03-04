import { openDB, IDBPDatabase } from 'idb'
import type { Recipe, WeekPlan } from './supabase'

const DB_NAME = 'recipe-app'
const DB_VERSION = 2          // bumped from 1 to add meal_plans store
const STORE_NAME = 'recipes'
const MEAL_PLAN_STORE = 'meal_plans'

let db: IDBPDatabase | null = null

async function getDB() {
  if (db) return db
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('category', 'category')
      }
      if (!database.objectStoreNames.contains(MEAL_PLAN_STORE)) {
        database.createObjectStore(MEAL_PLAN_STORE, { keyPath: 'week_start' })
      }
    },
  })
  return db
}

export async function saveRecipesLocally(recipes: Recipe[]) {
  const database = await getDB()
  const tx = database.transaction(STORE_NAME, 'readwrite')
  await Promise.all(recipes.map((r) => tx.store.put(r)))
  await tx.done
}

export async function getLocalRecipes(): Promise<Recipe[]> {
  const database = await getDB()
  return database.getAll(STORE_NAME)
}

export async function saveRecipeLocally(recipe: Recipe) {
  const database = await getDB()
  await database.put(STORE_NAME, recipe)
}

export async function deleteRecipeLocally(id: string) {
  const database = await getDB()
  await database.delete(STORE_NAME, id)
}

export async function saveMealPlanLocally(weekStart: string, plan: WeekPlan): Promise<void> {
  const database = await getDB()
  await database.put(MEAL_PLAN_STORE, { week_start: weekStart, plan })
}

export async function getMealPlanLocally(
  weekStart: string
): Promise<{ week_start: string; plan: WeekPlan } | null> {
  const database = await getDB()
  return (await database.get(MEAL_PLAN_STORE, weekStart)) ?? null
}
