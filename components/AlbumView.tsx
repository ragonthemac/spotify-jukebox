'use client'

import { useEffect, useState } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { getAlbumTracks, type SpotifyTrack } from '@/lib/spotify'
import TrackRow from './TrackRow'

export default function AlbumView() {
  const { activeAlbum, accessToken, setActiveView, addToQueue } = useJukeboxStore()
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAlbum || !accessToken) return
    setLoading(true)
    setError(null)
    getAlbumTracks(activeAlbum.id, accessToken)
      .then((fetched) =>
        setTracks(fetched.map((t) => ({ ...t, album: { name: activeAlbum.name, images: activeAlbum.images } })))
      )
      .catch((err) => setError(String(err?.message ?? err)))
      .finally(() => setLoading(false))
  }, [activeAlbum, accessToken])

  if (!activeAlbum) return null

  const art = activeAlbum.images[0]?.url
  const artist = activeAlbum.artists[0]?.name

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 relative">
        <div
          className="h-52 relative flex items-end"
          style={{
            background: art
              ? `linear-gradient(to bottom, rgba(10,10,15,0.1), rgba(10,10,15,0.95)), url(${art}) center/cover`
              : 'linear-gradient(135deg, #1a0a2e, #0a0a0f)',
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
          <div className="px-4 pb-4 flex items-end gap-4 w-full">
            {art && <img src={art} alt={activeAlbum.name} className="w-20 h-20 rounded-xl object-cover shadow-lg flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Album</p>
              <h1 className="text-white font-bold text-xl leading-tight truncate">{activeAlbum.name}</h1>
              <p className="text-white/50 text-sm mt-0.5">{artist} · {activeAlbum.release_date?.slice(0, 4)}</p>
            </div>
            {tracks.length > 0 && (
              <button
                onClick={() => tracks.forEach((t) => addToQueue(t))}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl glass border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all active:scale-95"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M4 7H10M7 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add all
              </button>
            )}
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
            {tracks.map((track, i) => (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-white/20 text-xs w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1"><TrackRow track={track} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
