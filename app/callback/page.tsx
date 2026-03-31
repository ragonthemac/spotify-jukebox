'use client'

import { useEffect } from 'react'
import { exchangeCodeForToken, storeToken } from '@/lib/spotify'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default function CallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error || !code) {
      window.location.replace(`${BASE}/?error=${error || 'no_code'}`)
      return
    }

    exchangeCodeForToken(code)
      .then((token) => {
        storeToken(token)
        window.location.replace(`${BASE}/`)
      })
      .catch(() => {
        window.location.replace(`${BASE}/?error=token_failed`)
      })
  }, [])

  return (
    <div className="h-full flex items-center justify-center bg-jukebox">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/50 text-sm">Connecting to Spotify…</p>
      </div>
    </div>
  )
}
