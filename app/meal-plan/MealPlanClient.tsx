'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import type { Recipe, MealSlot, WeekPlan } from '@/lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'mid_snack', label: 'Mid Snack' },
  { key: 'lunch',     label: 'Lunch'     },
  { key: 'eve_snack', label: 'Eve Snack' },
  { key: 'dinner',    label: 'Dinner'    },
]

const DEBOUNCE_MS = 800

// ── Utilities ─────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // rewind to Sunday
  return d
}

function toDateStr(date: Date): string {
  // Local date string YYYY-MM-DD (avoids UTC offset shifting the day)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(weekStart)} – ${fmt(end)}, ${end.getFullYear()}`
}

function cellKey(dayIndex: number, mealKey: string) {
  return `${dayIndex}_${mealKey}`
}

// ── MealCell sub-component ────────────────────────────────────────────────────

function MealCell({ slot, onClick, loading }: { slot: MealSlot; onClick: () => void; loading: boolean }) {
  const [hovered, setHovered] = useState(false)

  if (loading) {
    return (
      <div
        className="skeleton"
        style={{ minHeight: 52, borderRadius: 10 }}
      />
    )
  }

  const isEmpty = slot === null
  const isLinked = slot?.recipe_id != null

  if (isEmpty) {
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          minHeight: 52,
          borderRadius: 10,
          padding: '8px 10px',
          cursor: 'pointer',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1.5px dashed ${hovered ? 'var(--accent-light)' : 'var(--border)'}`,
          background: hovered ? 'rgba(249,115,22,0.05)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v12M1 7h12" stroke={hovered ? 'var(--accent-light)' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minHeight: 52,
        borderRadius: 10,
        padding: '8px 10px',
        cursor: 'pointer',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        border: `1.5px solid ${hovered ? (isLinked ? '#FDBA74' : '#D1D5DB') : 'transparent'}`,
        background: isLinked ? 'var(--accent-muted)' : '#F3F4F6',
        transition: 'all 0.15s',
        textAlign: 'left',
      }}
    >
      {/* Icon */}
      {isLinked ? (
        <svg style={{ flexShrink: 0, marginTop: 2 }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      ) : (
        <svg style={{ flexShrink: 0, marginTop: 2 }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      )}
      <span
        style={{
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 1.35,
          color: isLinked ? 'var(--accent)' : '#374151',
        }}
      >
        {slot.title}
      </span>
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MealPlanClient() {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [plan, setPlan] = useState<WeekPlan>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [activeCell, setActiveCell] = useState<{ dayIndex: number; mealKey: string } | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [customText, setCustomText] = useState('')
  const [showShoppingList, setShowShoppingList] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(false)

  const weekStartStr = useMemo(() => toDateStr(weekStart), [weekStart])

  // Is today in the currently-displayed week? If so, which day index?
  const todayIndex = useMemo(() => {
    const today = getWeekStart(new Date())
    return toDateStr(today) === weekStartStr ? new Date().getDay() : -1
  }, [weekStartStr])

  // Load plan for current week
  useEffect(() => {
    isMounted.current = false // reset so auto-save doesn't fire on load
    setLoading(true)
    async function load() {
      try {
        const res = await fetch(`/api/meal-plan?week=${weekStartStr}`)
        const data = await res.json()
        setPlan(data.plan ?? {})
        const { saveMealPlanLocally } = await import('@/lib/db')
        await saveMealPlanLocally(weekStartStr, data.plan ?? {})
      } catch {
        const { getMealPlanLocally } = await import('@/lib/db')
        const local = await getMealPlanLocally(weekStartStr)
        setPlan(local?.plan ?? {})
      } finally {
        setLoading(false)
        isMounted.current = true // allow auto-save from now on
      }
    }
    load()
  }, [weekStartStr])

  // Load all recipes once (for picker search)
  useEffect(() => {
    async function loadRecipes() {
      try {
        const res = await fetch('/api/recipes')
        const data = await res.json()
        setAllRecipes(data)
      } catch {
        const { getLocalRecipes } = await import('@/lib/db')
        setAllRecipes(await getLocalRecipes())
      }
    }
    loadRecipes()
  }, [])

  // Auto-save with debounce whenever plan changes
  useEffect(() => {
    if (!isMounted.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const currentWeek = weekStartStr // capture for closure
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await fetch('/api/meal-plan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week_start: currentWeek, plan }),
        })
        const { saveMealPlanLocally } = await import('@/lib/db')
        await saveMealPlanLocally(currentWeek, plan)
      } finally {
        setSaving(false)
      }
    }, DEBOUNCE_MS)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [plan]) // eslint-disable-line react-hooks/exhaustive-deps

  // ESC closes modals
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveCell(null)
        setShowShoppingList(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Week navigation ─────────────────────────────────────────────────────────

  function goToPrev() {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })
  }
  function goToNext() {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })
  }
  function goToToday() { setWeekStart(getWeekStart(new Date())) }

  // ── Plan mutations ──────────────────────────────────────────────────────────

  function setCell(dayIndex: number, mealKey: string, slot: MealSlot) {
    setPlan(prev => {
      const next = { ...prev }
      const key = cellKey(dayIndex, mealKey)
      if (slot === null) { delete next[key] } else { next[key] = slot }
      return next
    })
  }

  // ── Picker handlers ─────────────────────────────────────────────────────────

  function openPicker(dayIndex: number, mealKey: string) {
    setActiveCell({ dayIndex, mealKey })
    setPickerSearch('')
    setCustomText('')
  }

  function pickRecipe(recipe: Recipe) {
    if (!activeCell) return
    setCell(activeCell.dayIndex, activeCell.mealKey, { recipe_id: recipe.id, title: recipe.title })
    setActiveCell(null)
  }

  function pickCustomText() {
    if (!activeCell || !customText.trim()) return
    setCell(activeCell.dayIndex, activeCell.mealKey, { recipe_id: null, title: customText.trim() })
    setActiveCell(null)
  }

  function removeMeal() {
    if (!activeCell) return
    setCell(activeCell.dayIndex, activeCell.mealKey, null)
    setActiveCell(null)
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredRecipes = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim()
    if (!q) return allRecipes
    return allRecipes.filter(r =>
      r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    )
  }, [allRecipes, pickerSearch])

  const shoppingData = useMemo(() => {
    const seen = new Set<string>()
    return Object.values(plan)
      .filter((slot): slot is NonNullable<MealSlot> => slot?.recipe_id != null)
      .filter(slot => { if (seen.has(slot.recipe_id!)) return false; seen.add(slot.recipe_id!); return true })
      .map(slot => allRecipes.find(r => r.id === slot.recipe_id))
      .filter((r): r is Recipe => r !== undefined)
      .map(recipe => ({ recipe, ingredients: recipe.ingredients ?? [] }))
  }, [plan, allRecipes])

  const activeCellSlot = activeCell ? (plan[cellKey(activeCell.dayIndex, activeCell.mealKey)] ?? null) : null

  // ── Styles ──────────────────────────────────────────────────────────────────

  const navBtnStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8,
    border: '1.5px solid var(--border)',
    background: 'var(--card)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  }

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(480px, calc(100vw - 32px))',
    maxHeight: '82vh',
    background: 'var(--card)',
    borderRadius: 20,
    boxShadow: '0 24px 60px rgba(28,16,7,0.25)',
    border: '1.5px solid var(--border)',
    zIndex: 51,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  const backdropStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(28,16,7,0.4)',
    backdropFilter: 'blur(4px)',
    zIndex: 50,
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page title + week navigation */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 28, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 4 }}>
              Meal Planner
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Plan your week, linked to your recipe collection</p>
          </div>
          <button
            type="button"
            onClick={() => setShowShoppingList(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', borderRadius: 12,
              background: 'var(--card)', border: '1.5px solid var(--border)',
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Shopping List
          </button>
        </div>

        {/* Week nav row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={goToPrev} style={navBtnStyle} aria-label="Previous week">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', minWidth: 220, textAlign: 'center' }}>
            {formatWeekRange(weekStart)}
          </span>

          <button type="button" onClick={goToNext} style={navBtnStyle} aria-label="Next week">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          {todayIndex === -1 && (
            <button
              type="button"
              onClick={goToToday}
              style={{
                padding: '5px 12px', borderRadius: 8,
                background: 'var(--accent-muted)', border: '1.5px solid #FDBA74',
                color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Today
            </button>
          )}

          {saving && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Saving…</span>
          )}
        </div>
      </div>

      {/* Grid — scrolls horizontally on mobile */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -20px', padding: '0 20px 20px' }}>
        <div style={{ minWidth: 620 }}>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '96px repeat(5, 1fr)', gap: 4, marginBottom: 4 }}>
            <div />
            {MEALS.map(m => (
              <div key={m.key} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {m.label}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map((day, dayIndex) => {
            const isToday = dayIndex === todayIndex
            const dayDate = new Date(weekStart)
            dayDate.setDate(dayDate.getDate() + dayIndex)

            return (
              <div
                key={day}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '96px repeat(5, 1fr)',
                  gap: 4,
                  marginBottom: 4,
                  borderRadius: 14,
                  padding: '4px 0',
                  background: isToday ? 'rgba(200,73,10,0.04)' : 'transparent',
                  outline: isToday ? '1.5px solid rgba(200,73,10,0.15)' : 'none',
                }}
              >
                {/* Day label */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 10px 6px 4px' }}>
                  <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 600, color: isToday ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1 }}>
                    {DAY_SHORT[dayIndex]}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {/* Meal cells */}
                {MEALS.map(meal => (
                  <MealCell
                    key={meal.key}
                    slot={plan[cellKey(dayIndex, meal.key)] ?? null}
                    onClick={() => openPicker(dayIndex, meal.key)}
                    loading={loading}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Hint text */}
      {!loading && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
          Click any cell to add a meal · Changes save automatically
        </p>
      )}

      {/* ── Recipe Picker Modal ─────────────────────────────────────────────── */}
      {activeCell && (
        <>
          <div onClick={() => setActiveCell(null)} style={backdropStyle} />
          <div style={modalStyle}>
            {/* Header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    {DAYS[activeCell.dayIndex]} · {MEALS.find(m => m.key === activeCell.mealKey)?.label}
                  </p>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>
                    Choose a meal
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCell(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)', borderRadius: 8 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search recipes by name or category…"
                  style={{
                    width: '100%', padding: '9px 12px 9px 34px',
                    borderRadius: 10, border: '1.5px solid var(--border)',
                    background: 'var(--bg)', fontSize: 13,
                    color: 'var(--text-primary)', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Recipe list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '6px 10px' }}>
              {filteredRecipes.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '24px 0' }}>
                  {pickerSearch ? `No recipes match "${pickerSearch}"` : 'No recipes in your collection yet.'}
                </p>
              ) : (
                filteredRecipes.map(recipe => (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => pickRecipe(recipe)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 10px',
                      borderRadius: 10, border: 'none',
                      background: 'none', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: 'var(--bg)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border)', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {recipe.category}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {recipe.title}
                    </span>
                    <svg style={{ flexShrink: 0, color: 'var(--text-muted)' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                ))
              )}
            </div>

            {/* Footer: custom text + remove */}
            <div style={{ padding: '12px 20px 18px', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Or type a custom meal
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') pickCustomText() }}
                  placeholder="e.g. Puttu Kadala"
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 10,
                    border: '1.5px solid var(--border)', fontSize: 13,
                    background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={pickCustomText}
                  disabled={!customText.trim()}
                  style={{
                    padding: '9px 16px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #C8490A, #F97316)',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: customText.trim() ? 'pointer' : 'not-allowed',
                    opacity: customText.trim() ? 1 : 0.45,
                    flexShrink: 0,
                  }}
                >
                  Add
                </button>
              </div>

              {activeCellSlot && (
                <button
                  type="button"
                  onClick={removeMeal}
                  style={{
                    marginTop: 10, width: '100%', padding: '9px', borderRadius: 10,
                    background: 'none', border: '1.5px solid #FCA5A5',
                    color: '#DC2626', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Remove meal
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Shopping List Modal ─────────────────────────────────────────────── */}
      {showShoppingList && (
        <>
          <div onClick={() => setShowShoppingList(false)} style={backdropStyle} />
          <div style={modalStyle}>
            {/* Header */}
            <div style={{ padding: '18px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 2 }}>
                  Shopping List
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatWeekRange(weekStart)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShoppingList(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)', borderRadius: 8, marginTop: 2 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 24px' }}>
              {shoppingData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No linked recipes this week</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Add recipes to your meal plan cells to build a shopping list.</p>
                </div>
              ) : (
                shoppingData.map(({ recipe, ingredients }) => (
                  <div key={recipe.id} style={{ marginBottom: 22 }}>
                    {/* Recipe header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: 'var(--accent-muted)', color: 'var(--accent)',
                        border: '1px solid #FDBA74', whiteSpace: 'nowrap',
                      }}>
                        {recipe.category}
                      </span>
                      <Link
                        href={`/recipes/${recipe.id}`}
                        style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}
                      >
                        {recipe.title}
                      </Link>
                      <svg style={{ color: 'var(--accent)', marginLeft: 'auto', flexShrink: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </div>
                    {/* Ingredients */}
                    {ingredients.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 14 }}>No ingredients listed.</p>
                    ) : (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {ingredients.map((ing, i) => (
                          <li key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '5px 0', fontSize: 13, color: 'var(--text-secondary)',
                            borderBottom: i < ingredients.length - 1 ? '1px solid var(--border)' : 'none',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-light)', marginTop: 5, flexShrink: 0 }} />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
