'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useJukeboxStore } from '@/lib/store'
import {
  getNewReleases, getUserPlaylists, searchTracks, searchArtists, clearToken,
  type SpotifyAlbum, type SpotifyPlaylist, type SpotifyTrack, type SpotifyArtist,
} from '@/lib/spotify'
import NowPlayingHero from './NowPlayingHero'
import AlbumCard from './AlbumCard'
import TrackRow from './TrackRow'

export default function HomeView() {
  const { accessToken, setActiveView, setActivePlaylist, setActiveArtist } = useJukeboxStore()

  const [albums, setAlbums] = useState<SpotifyAlbum[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([])
  const [artistResults, setArtistResults] = useState<SpotifyArtist[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!accessToken) return
    Promise.allSettled([getNewReleases(accessToken), getUserPlaylists(accessToken)])
      .then(([a, p]) => {
        if (a.status === 'fulfilled') setAlbums(a.value)
        if (p.status === 'fulfilled') setPlaylists(p.value)
      })
      .finally(() => setLoading(false))
  }, [accessToken])

  const doSearch = useCallback((q: string) => {
    if (!q.trim() || !accessToken) { setTrackResults([]); setArtistResults([]); return }
    setIsSearching(true)
    Promise.all([searchTracks(q, accessToken), searchArtists(q, accessToken)])
      .then(([tracks, artists]) => { setTrackResults(tracks); setArtistResults(artists) })
      .catch(console.error)
      .finally(() => setIsSearching(false))
  }, [accessToken])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  const handleLogout = () => { clearToken(); window.location.reload() }

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

      {/* Search bar */}
      <div className="flex-shrink-0 px-4 pt-2 pb-1">
        <div className="flex items-center gap-3 glass rounded-2xl px-4 h-11 border border-white/8">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-white/30">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums…"
            className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-white/40 hover:text-white/70 transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {query ? (
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
          {isSearching ? (
            <div className="flex flex-col gap-3 mt-1">
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
          ) : (
            <div className="flex flex-col gap-1">
              {artistResults.length > 0 && (
                <div className="mb-4">
                  <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Artists</p>
                  {artistResults.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() => { setActiveArtist({ id: artist.id, name: artist.name, imageUrl: artist.images[0]?.url }); setActiveView('artist') }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left w-full"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                        {artist.images[0]?.url && <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{artist.name}</p>
                        <p className="text-white/40 text-xs mt-0.5">Artist</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/20 flex-shrink-0">
                        <path d="M4 3L9 7L4 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
              {trackResults.length > 0 && (
                <div>
                  <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Songs</p>
                  {trackResults.map((track, i) => <TrackRow key={track.id + i} track={track} />)}
                </div>
              )}
              {!isSearching && trackResults.length === 0 && artistResults.length === 0 && (
                <p className="text-white/30 text-sm text-center py-12">No results for &ldquo;{query}&rdquo;</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <NowPlayingHero />

          {/* Your Playlists */}
          {(loading || playlists.length > 0) && (
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
          )}

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
        </>
      )}
    </div>
  )
}
