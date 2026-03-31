'use client'

import { useRef, useState } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { playTrack } from '@/lib/spotify'
import { globalPlayer } from './SpotifyPlayer'
import TrackRow from './TrackRow'

export default function QueueView() {
  const { queue, currentTrack, accessToken, deviceId, skipNext, clearQueue, reorderQueue, setActiveView, setActiveArtist } = useJukeboxStore()
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleSkip = () => {
    const next = skipNext()
    if (next && accessToken && deviceId) {
      playTrack(accessToken, next.uri, deviceId)
    } else if (next) {
      globalPlayer?.nextTrack()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">Up Next</h2>
          <p className="text-white/30 text-sm">
            {queue.length === 0 ? 'Queue is empty' : `${queue.length} track${queue.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            className="text-white/30 text-sm hover:text-white/60 transition-colors px-4 py-2.5 rounded-full glass"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Currently playing */}
        {currentTrack && (
          <div className="mb-4">
            <p className="text-white/30 text-xs mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 inline-block animate-pulse" />
              Now Playing
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden ring-2 ring-pink-500">
                {currentTrack.album.images?.[0]?.url && (
                  <img
                    src={currentTrack.album.images[0].url}
                    alt={currentTrack.album.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-end justify-center pb-1.5">
                  <div className="flex gap-0.5 items-end h-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-0.5 bg-pink-400 rounded-full eq-bar" style={{ height: 12 }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-pink-300 text-sm font-semibold truncate">{currentTrack.name}</p>
                <p className="text-pink-300/50 text-xs truncate">
                  {currentTrack.artists.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && ', '}
                      <button
                        onClick={() => { setActiveArtist({ id: a.id, name: a.name }); setActiveView('artist') }}
                        className="hover:text-white hover:underline transition-colors"
                      >
                        {a.name}
                      </button>
                    </span>
                  ))}
                </p>
              </div>
              {queue.length > 0 && (
                <button
                  onClick={handleSkip}
                  className="w-11 h-11 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3L9 7L2 11V3Z" fill="currentColor" />
                    <rect x="10" y="3" width="2" height="8" rx="1" fill="currentColor" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Queue */}
        {queue.length > 0 ? (
          <div className="flex flex-col gap-1">
            {queue.map((track, idx) => (
              <div
                key={track.queueId}
                className={`flex items-center gap-2 rounded-xl transition-all duration-150 ${dragOverIndex === idx ? 'bg-white/8 scale-[1.01]' : ''}`}
                draggable
                onDragStart={() => { dragIndexRef.current = idx }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx) }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={() => {
                  if (dragIndexRef.current !== null && dragIndexRef.current !== idx) {
                    reorderQueue(dragIndexRef.current, idx)
                  }
                  dragIndexRef.current = null
                  setDragOverIndex(null)
                }}
                onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null) }}
              >
                <div className="flex flex-col items-center gap-0.5 w-5 flex-shrink-0 cursor-grab active:cursor-grabbing">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-white/20">
                    <circle cx="4" cy="3" r="1" fill="currentColor" />
                    <circle cx="8" cy="3" r="1" fill="currentColor" />
                    <circle cx="4" cy="6" r="1" fill="currentColor" />
                    <circle cx="8" cy="6" r="1" fill="currentColor" />
                    <circle cx="4" cy="9" r="1" fill="currentColor" />
                    <circle cx="8" cy="9" r="1" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-white/20 text-xs w-4 text-right flex-shrink-0">{idx + 1}</span>
                <div className="flex-1">
                  <TrackRow
                    track={track}
                    inQueue={true}
                    queueId={track.queueId}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : !currentTrack ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center animate-float">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" opacity="0.3">
                <path d="M7 8H21M7 12H21M7 16H16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-sm font-medium">Your jukebox is waiting…</p>
              <p className="text-white/20 text-xs mt-1">Search for songs to add to your queue</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-white/25 text-sm">Queue is empty</p>
            <p className="text-white/15 text-xs">Search for more songs to add</p>
          </div>
        )}
      </div>
    </div>
  )
}
