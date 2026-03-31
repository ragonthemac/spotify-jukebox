'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useJukeboxStore } from '@/lib/store'
import { searchTracks, searchArtists, getRecentlyPlayed, type SpotifyArtist, type SpotifyTrack } from '@/lib/spotify'
import TrackRow from './TrackRow'

const RECENT_SEARCHES_KEY = 'jukebox_recent_searches'
const MAX_RECENT = 8

function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]') } catch { return [] }
}
function saveRecentSearch(q: string) {
  const prev = getRecentSearches().filter((s) => s !== q)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)))
}
function clearRecentSearches() {
  localStorage.setItem(RECENT_SEARCHES_KEY, '[]')
}

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
    setActiveArtist,
  } = useJukeboxStore()

  const [searchError, setSearchError] = useState<string | null>(null)
  const [artistResults, setArtistResults] = useState<SpotifyArtist[]>([])
  const [tab, setTab] = useState<'recent' | 'played'>('recent')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<SpotifyTrack[]>([])
  const [loadingPlayed, setLoadingPlayed] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    setRecentSearches(getRecentSearches())
  }, [])

  // Load recently played when that tab is selected
  useEffect(() => {
    if (tab !== 'played' || !accessToken || recentlyPlayed.length > 0) return
    setLoadingPlayed(true)
    getRecentlyPlayed(accessToken)
      .then(setRecentlyPlayed)
      .catch(console.error)
      .finally(() => setLoadingPlayed(false))
  }, [tab, accessToken, recentlyPlayed.length])

  const doSearch = useCallback(
    (q: string) => {
      if (!q.trim() || !accessToken) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      setSearchError(null)
      Promise.all([
        searchTracks(q, accessToken),
        searchArtists(q, accessToken),
      ])
        .then(([tracks, artists]) => {
          setSearchResults(tracks)
          setArtistResults(artists)
          saveRecentSearch(q.trim())
          setRecentSearches(getRecentSearches())
        })
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, doSearch])

  useEffect(() => {
    if (searchQuery) doSearch(searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 glass rounded-2xl px-4 h-14 border border-white/10">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-white/40">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, albums…"
            className="flex-1 bg-transparent text-white placeholder-white/30 text-base outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white/70 transition-colors p-1">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <button onClick={() => setActiveView('home')} className="text-white/50 text-base hover:text-white transition-colors px-2 py-3">
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Loading skeletons */}
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

        {/* Search results */}
        {!isSearching && (artistResults.length > 0 || searchResults.length > 0) && (
          <div className="flex flex-col gap-1 mt-1">
            {artistResults.length > 0 && (
              <div className="mb-4">
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Artists</p>
                <div className="flex flex-col gap-1">
                  {artistResults.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() => { setActiveArtist({ id: artist.id, name: artist.name, imageUrl: artist.images?.[0]?.url }); setActiveView('artist') }}
                      className="flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-all text-left w-full"
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                        {artist.images?.[0]?.url && <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-base font-medium truncate">{artist.name}</p>
                        <p className="text-white/40 text-sm mt-0.5">Artist</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="text-white/20 flex-shrink-0">
                        <path d="M4 3L9 7L4 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {searchResults.length > 0 && (
              <div>
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Songs</p>
                {searchResults.map((track, idx) => <TrackRow key={track.id + idx} track={track} />)}
              </div>
            )}
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

        {/* Empty state — tabs */}
        {!searchQuery && !isSearching && (
          <div className="mt-1">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 glass rounded-xl p-1 border border-white/5">
              <button
                onClick={() => setTab('recent')}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${tab === 'recent' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                Recent Searches
              </button>
              <button
                onClick={() => setTab('played')}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${tab === 'played' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                Recently Played
              </button>
            </div>

            {/* Recent Searches */}
            {tab === 'recent' && (
              recentSearches.length === 0 ? (
                <p className="text-white/20 text-xs text-center py-8">No recent searches</p>
              ) : (
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recentSearches.map((q) => (
                      <button
                        key={q}
                        onClick={() => setSearchQuery(q)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full glass border border-white/8 text-white/60 text-xs hover:text-white hover:border-white/20 transition-all"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50">
                          <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M7 7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        {q}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { clearRecentSearches(); setRecentSearches([]) }}
                    className="text-white/25 text-xs hover:text-white/50 transition-colors"
                  >
                    Clear recent searches
                  </button>
                </div>
              )
            )}

            {/* Recently Played */}
            {tab === 'played' && (
              loadingPlayed ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <div className="w-12 h-12 rounded-lg skeleton flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-3.5 w-36 rounded skeleton mb-2" />
                        <div className="h-3 w-24 rounded skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentlyPlayed.length === 0 ? (
                <p className="text-white/20 text-xs text-center py-8">No recently played tracks</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {recentlyPlayed.map((track, i) => <TrackRow key={track.id + i} track={track} />)}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
