import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { WeekPlan } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/meal-plan?week=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const week = request.nextUrl.searchParams.get('week')
  if (!week) return NextResponse.json({ error: 'week param required' }, { status: 400 })

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('week_start', week)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Return synthetic empty plan if no row exists yet
  return NextResponse.json(data ?? { week_start: week, plan: {} })
}

// PUT /api/meal-plan — upsert a week's plan
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { week_start, plan } = body as { week_start: string; plan: WeekPlan }
  if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('meal_plans')
    .upsert(
      { week_start, plan, updated_at: new Date().toISOString() },
      { onConflict: 'week_start' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
