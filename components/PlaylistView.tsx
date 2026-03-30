'use client'

import { useEffect, useState } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { getPlaylistTracks, type SpotifyTrack } from '@/lib/spotify'
import TrackRow from './TrackRow'

export default function PlaylistView() {
  const { activePlaylist, accessToken, setActiveView } = useJukeboxStore()
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activePlaylist || !accessToken) return
    setLoading(true)
    setError(null)
    getPlaylistTracks(activePlaylist.id, accessToken)
      .then(setTracks)
      .catch((err) => setError(String(err?.message ?? err)))
      .finally(() => setLoading(false))
  }, [activePlaylist, accessToken])

  if (!activePlaylist) return null

  const art = activePlaylist.images[0]?.url

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 relative">
        <div
          className="h-52 relative flex items-end"
          style={{
            background: art
              ? `linear-gradient(to bottom, rgba(10,10,15,0.1), rgba(10,10,15,0.95)), url(${art}) center/cover`
              : 'linear-gradient(135deg, #0a1a2e, #0a0a0f)',
          }}
        >
          <button
            onClick={() => setActiveView('home')}
            className="absolute top-4 left-4 w-8 h-8 rounded-full glass flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="px-4 pb-4 flex items-end gap-4">
            {art && <img src={art} alt={activePlaylist.name} className="w-20 h-20 rounded-xl object-cover shadow-lg flex-shrink-0" />}
            <div className="min-w-0">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Playlist</p>
              <h1 className="text-white font-bold text-xl leading-tight truncate">{activePlaylist.name}</h1>
              <p className="text-white/50 text-sm mt-0.5">{activePlaylist.owner?.display_name} · {activePlaylist.tracks?.total} songs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-3">
            <p className="text-red-400 text-xs font-mono break-all">{error}</p>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-12 h-12 rounded-lg skeleton flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 w-36 rounded skeleton mb-2" />
                  <div className="h-3 w-24 rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {tracks.map((track) => (
              <TrackRow key={track.id} track={track} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
