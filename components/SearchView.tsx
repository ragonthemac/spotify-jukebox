'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { searchTracks } from '@/lib/spotify'
import TrackRow from './TrackRow'

export default function SearchView() {
  const {
    accessToken,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    setActiveView,
  } = useJukeboxStore()

  const [searchError, setSearchError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const doSearch = useCallback(
    (q: string) => {
      if (!q.trim() || !accessToken) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      setSearchError(null)
      searchTracks(q, accessToken, 25)
        .then(setSearchResults)
        .catch((err) => {
          console.error(err)
          setSearchError(String(err?.message ?? err))
        })
        .finally(() => setIsSearching(false))
    },
    [accessToken, setSearchResults, setIsSearching]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, doSearch])

  // Run initial search if query was pre-filled (from album tap)
  useEffect(() => {
    if (searchQuery) doSearch(searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Search header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 glass rounded-2xl px-4 h-12 border border-white/10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-white/40">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, albums…"
            className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white/70 transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setActiveView('home')}
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isSearching && (
          <div className="flex flex-col gap-3 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-12 h-12 rounded-lg skeleton flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 w-36 rounded skeleton mb-2" />
                  <div className="h-3 w-24 rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <p className="text-white/30 text-xs mb-2">{searchResults.length} results</p>
            {searchResults.map((track, idx) => (
              <TrackRow key={track.id + idx} track={track} />
            ))}
          </div>
        )}

        {!isSearching && searchError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-xs font-mono break-all">{searchError}</p>
          </div>
        )}

        {!isSearching && !searchError && searchQuery && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-4xl opacity-20">🎵</div>
            <p className="text-white/40 text-sm">No results for &ldquo;{searchQuery}&rdquo;</p>
          </div>
        )}

        {!searchQuery && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.15">
              <circle cx="22" cy="22" r="15" stroke="white" strokeWidth="2" />
              <path d="M32 32L42 42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="text-white/30 text-sm">Search Spotify&apos;s full catalog</p>
          </div>
        )}
      </div>
    </div>
  )
}
