'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { exchangeCodeForToken, storeToken } from '@/lib/spotify'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error || !code) {
      router.replace('/?error=' + (error || 'no_code'))
      return
    }

    exchangeCodeForToken(code)
      .then((token) => {
        storeToken(token)
        router.replace('/')
      })
      .catch(() => {
        router.replace('/?error=token_failed')
      })
  }, [router])

  return (
    <div className="h-full flex items-center justify-center bg-jukebox">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/50 text-sm">Connecting to Spotify…</p>
      </div>
    </div>
  )
}
