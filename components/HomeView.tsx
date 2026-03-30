'use client'

import { useEffect, useState } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { getNewReleases, getUserPlaylists, clearToken, type SpotifyAlbum, type SpotifyPlaylist } from '@/lib/spotify'
import NowPlayingHero from './NowPlayingHero'
import AlbumCard from './AlbumCard'

export default function HomeView() {
  const { accessToken, setActiveView, setActivePlaylist } = useJukeboxStore()
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    Promise.all([
      getNewReleases(accessToken),
      getUserPlaylists(accessToken),
    ])
      .then(([a, p]) => { setAlbums(a); setPlaylists(p) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken])

  const handleLogout = () => {
    clearToken()
    window.location.reload()
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
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

      <NowPlayingHero />

      {/* Your Playlists */}
      <div className="px-4 pb-4 pt-2">
        <h2 className="text-xs font-semibold text-white/40 tracking-widest uppercase mb-3">Your Playlists</h2>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32">
                <div className="w-32 h-32 rounded-xl skeleton mb-2" />
                <div className="h-3 w-20 rounded skeleton mb-1" />
                <div className="h-2 w-14 rounded skeleton" />
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <p className="text-white/20 text-xs">No playlists found</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => { setActivePlaylist(pl); setActiveView('playlist') }}
                className="flex-shrink-0 w-32 text-left active:scale-95 transition-transform duration-150"
              >
                <div className="w-32 h-32 rounded-xl overflow-hidden mb-2 bg-white/5">
                  {pl.images[0]?.url ? (
                    <img src={pl.images[0].url} alt={pl.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" opacity="0.3">
                        <path d="M7 8H21M7 12H21M7 16H16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-white text-xs font-medium truncate leading-tight">{pl.name}</p>
                <p className="text-white/40 text-xs truncate mt-0.5">{pl.tracks?.total} songs</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Releases */}
      <div className="px-4 pb-6 pt-2">
        <h2 className="text-xs font-semibold text-white/40 tracking-widest uppercase mb-3">New Releases</h2>
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
            {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
          </div>
        )}
      </div>
    </div>
  )
}
