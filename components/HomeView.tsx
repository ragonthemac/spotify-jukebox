'use client'

import { useEffect, useState } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { getNewReleases, type SpotifyAlbum } from '@/lib/spotify'
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

  return (
    <div className="h-full flex flex-col overflow-y-auto">
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
