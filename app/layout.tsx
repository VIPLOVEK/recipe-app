import type { Metadata } from 'next'
import './globals.css'
import OfflineBadge from '@/components/OfflineBadge'

export const metadata: Metadata = {
  title: 'My Recipes',
  description: 'Personal recipe collection',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'My Recipes' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#C8490A" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        {/* Header */}
        <header
          className="sticky top-0 z-40"
          style={{ background: 'rgba(255,255,255,0.92)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
        >
          <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm"
                style={{ background: 'linear-gradient(135deg, #C8490A 0%, #F97316 100%)' }}
              >
                🍽️
              </div>
              <div className="leading-tight">
                <div className="font-display font-bold text-lg leading-none" style={{ color: 'var(--text-primary)' }}>
                  My Recipes
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  family cookbook
                </div>
              </div>
            </a>
            <div className="flex items-center gap-2">
              <a
                href="/meal-plan"
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150 hover:opacity-80"
                style={{ background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="hidden sm:inline">Meal Plan</span>
              </a>
              <a
                href="/recipes/new"
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white shadow-sm transition-all duration-150 hover:shadow-md hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #C8490A 0%, #F97316 100%)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="hidden sm:inline">Add Recipe</span>
                <span className="sm:hidden">+</span>
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-5 py-8">
          {children}
        </main>

        <OfflineBadge />
      </body>
    </html>
  )
}
