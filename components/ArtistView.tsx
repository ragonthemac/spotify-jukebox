'use client'

import { useEffect, useState } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { getArtistTopTracks, type SpotifyTrack } from '@/lib/spotify'
import TrackRow from './TrackRow'

export default function ArtistView() {
  const { activeArtist, accessToken, setActiveView } = useJukeboxStore()
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeArtist || !accessToken) return
    setLoading(true)
    getArtistTopTracks(activeArtist.id, accessToken)
      .then(setTracks)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeArtist, accessToken])

  if (!activeArtist) return null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 relative">
        {/* Artist art / gradient header */}
        <div
          className="h-40 relative flex items-end"
          style={{
            background: activeArtist.imageUrl
              ? `linear-gradient(to bottom, rgba(10,10,15,0.2), rgba(10,10,15,0.95)), url(${activeArtist.imageUrl}) center/cover`
              : 'linear-gradient(135deg, #1a0a2e, #0a0a0f)',
          }}
        >
          <div className="px-4 pb-4 flex items-end gap-4 w-full">
            <button
              onClick={() => setActiveView('search')}
              className="absolute top-4 left-4 w-8 h-8 rounded-full glass flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Artist</p>
              <h1 className="text-white font-bold text-2xl leading-tight">{activeArtist.name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Popular</p>

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
