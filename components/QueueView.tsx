'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { playTrack } from '@/lib/spotify'
import { globalPlayer } from './SpotifyPlayer'
import TrackRow from './TrackRow'

export default function QueueView() {
  const { queue, currentTrack, accessToken, deviceId, skipNext, clearQueue, reorderQueue, setActiveView, setActiveArtist } = useJukeboxStore()

  const dragFromIndex = useRef<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  const getIndexFromY = useCallback((clientY: number) => {
    let best = 0
    let bestDist = Infinity
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      const dist = Math.abs(clientY - mid)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    return best
  }, [])

  // Non-passive touchmove so we can preventDefault and block scroll while dragging
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onMove = (e: TouchEvent) => {
      if (dragFromIndex.current === null) return
      e.preventDefault()
      setOverIndex(getIndexFromY(e.touches[0].clientY))
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [getIndexFromY])

  const handleDragStart = (idx: number) => {
    dragFromIndex.current = idx
    setDraggingIndex(idx)
    setOverIndex(idx)
  }

  const handleDragEnd = () => {
    if (dragFromIndex.current !== null && overIndex !== null && overIndex !== dragFromIndex.current) {
      reorderQueue(dragFromIndex.current, overIndex)
    }
    dragFromIndex.current = null
    setDraggingIndex(null)
    setOverIndex(null)
  }

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

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-4">
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
                  <img src={currentTrack.album.images[0].url} alt={currentTrack.album.name} className="w-full h-full object-cover" />
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
                ref={(el) => { itemRefs.current[idx] = el }}
                className={`flex items-center gap-2 rounded-xl transition-all duration-150
                  ${draggingIndex === idx ? 'opacity-40' : ''}
                  ${overIndex === idx && draggingIndex !== idx ? 'bg-white/8 border border-white/10' : ''}`}
              >
                {/* Drag handle — touch triggers drag */}
                <div
                  className="flex flex-col items-center justify-center w-7 h-12 flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
                  onTouchStart={(e) => { e.stopPropagation(); handleDragStart(idx) }}
                  onTouchEnd={handleDragEnd}
                  onMouseDown={() => handleDragStart(idx)}
                  onMouseUp={handleDragEnd}
                >
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="text-white/25">
                    <circle cx="4" cy="2.5" r="1" fill="currentColor" />
                    <circle cx="8" cy="2.5" r="1" fill="currentColor" />
                    <circle cx="4" cy="6" r="1" fill="currentColor" />
                    <circle cx="8" cy="6" r="1" fill="currentColor" />
                    <circle cx="4" cy="9.5" r="1" fill="currentColor" />
                    <circle cx="8" cy="9.5" r="1" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-white/20 text-xs w-4 text-right flex-shrink-0">{idx + 1}</span>
                <div className="flex-1">
                  <TrackRow track={track} inQueue={true} queueId={track.queueId} />
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
