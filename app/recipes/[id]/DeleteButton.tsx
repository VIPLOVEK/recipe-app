'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)

  async function handleDelete() {
    const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/')
      router.refresh()
    }
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          className="text-sm px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  )
}
