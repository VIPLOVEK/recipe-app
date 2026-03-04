'use client'
import { useEffect, useState } from 'react'

export default function OfflineBadge() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed bottom-4 right-4 bg-amber-500 text-white text-sm px-3 py-2 rounded-full shadow-lg flex items-center gap-2 z-50">
      <span className="w-2 h-2 bg-white rounded-full" />
      Offline — showing cached recipes
    </div>
  )
}
