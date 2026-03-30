'use client'

import { useEffect, useState } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { getNewReleases, clearToken, type SpotifyAlbum } from '@/lib/spotify'
import NowPlayingHero from './NowPlayingHero'
import AlbumCard from './AlbumCard'

export default function HomeView() {
  const accessToken = useJukeboxStore((s) => s.accessToken)
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    getNewReleases(accessToken)
      .then(setAlbums)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken])

  const handleLogout = () => {
    clearToken()
    window.location.reload()
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header with logout */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-1">
        <span className="text-xs font-semibold tracking-widest text-white/20 uppercase">Jukebox</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Log out
        </button>
      </div>

      {/* Now Playing hero */}
      <NowPlayingHero />

      {/* New releases */}
      <div className="px-4 pb-6 pt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/70 tracking-wide uppercase">
            New Releases
          </h2>
          <span className="text-xs text-white/30">Tap to preview</span>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32">
                <div className="w-32 h-32 rounded-xl skeleton mb-2" />
                <div className="h-3 w-20 rounded skeleton mb-1" />
                <div className="h-2 w-14 rounded skeleton" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
