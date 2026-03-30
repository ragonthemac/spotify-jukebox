'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useJukeboxStore } from '@/lib/store'
import {
  getNewReleases, getUserPlaylists, searchTracks, searchArtists, clearToken, formatDuration,
  type SpotifyAlbum, type SpotifyPlaylist, type SpotifyTrack, type SpotifyArtist,
} from '@/lib/spotify'
import { globalPlayer } from './SpotifyPlayer'
import { playTrack } from '@/lib/spotify'
import SpinningVinyl from './SpinningVinyl'
import AlbumCard from './AlbumCard'
import TrackRow from './TrackRow'

// Jukebox row labels: A1–A9, B1–B9 ...
function rowLabel(i: number) {
  return `${String.fromCharCode(65 + Math.floor(i / 9))}${(i % 9) + 1}`
}

export default function HomeView() {
  const {
    accessToken, deviceId, setActiveView, setActivePlaylist, setActiveArtist,
    currentTrack, isPlaying, setIsPlaying, progressMs, durationMs, queue, skipNext,
  } = useJukeboxStore()

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

  const togglePlay = () => {
    if (isPlaying) { globalPlayer?.pause() } else { globalPlayer?.resume() }
    setIsPlaying(!isPlaying)
  }

  const handleSkip = () => {
    const next = skipNext()
    if (next && accessToken && deviceId) playTrack(accessToken, next.uri, deviceId)
    else if (next) globalPlayer?.nextTrack()
  }

  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0
  const albumArt = currentTrack?.album.images[0]?.url

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ color: 'var(--retro-cream)' }}>

      {/* Header strip */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-2">
        <span className="font-retro text-xs tracking-widest uppercase" style={{ color: 'var(--retro-gold)', letterSpacing: '0.2em' }}>
          ♪ Jukebox
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setQuery(''); setActiveView('search') }}
            className="text-xs transition-colors"
            style={{ color: 'var(--retro-muted)' }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => { clearToken(); window.location.reload() }}
            className="text-xs transition-colors"
            style={{ color: 'var(--retro-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="flex items-center gap-2 px-3 h-10 rounded-lg border" style={{ background: 'rgba(201,162,39,0.05)', borderColor: 'rgba(201,162,39,0.2)' }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--retro-muted)', flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the catalog…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--retro-cream)', caretColor: 'var(--retro-gold)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--retro-muted)' }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {query ? (
        /* ── Search results ── */
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isSearching ? (
            <div className="flex flex-col gap-3 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded skeleton flex-shrink-0" />
                  <div className="flex-1"><div className="h-3 w-32 rounded skeleton mb-2" /><div className="h-2.5 w-20 rounded skeleton" /></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {artistResults.map((artist) => (
                <button key={artist.id}
                  onClick={() => { setActiveArtist({ id: artist.id, name: artist.name, imageUrl: artist.images[0]?.url }); setActiveView('artist') }}
                  className="flex items-center gap-3 p-3 rounded-lg w-full text-left mb-1 transition-colors hover:bg-white/5"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                    {artist.images[0]?.url && <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--retro-cream)' }}>{artist.name}</p>
                    <p className="text-xs" style={{ color: 'var(--retro-muted)' }}>Artist</p>
                  </div>
                </button>
              ))}
              {trackResults.map((track, i) => <TrackRow key={track.id + i} track={track} />)}
            </>
          )}
        </div>
      ) : (
        /* ── Main jukebox layout ── */
        <div className="flex-1 overflow-y-auto">

          {/* Vinyl + now playing */}
          <div className="flex flex-col items-center px-4 pt-2 pb-4">
            {/* Vinyl record */}
            <div className="relative mb-5">
              {/* Arm shadow */}
              <div className="absolute -right-4 top-4 w-16 h-1 rounded-full opacity-30"
                style={{ background: 'var(--retro-chrome)', transform: 'rotate(25deg)', transformOrigin: 'right center' }} />
              <div className="retro-gold-glow rounded-full">
                <SpinningVinyl albumArt={albumArt} isPlaying={isPlaying} size={200} />
              </div>
            </div>

            {/* Song info */}
            <div className="text-center mb-3 px-2">
              {currentTrack ? (
                <>
                  <h2 className="font-retro text-xl font-bold leading-tight mb-1" style={{ color: 'var(--retro-cream)' }}>
                    {currentTrack.name}
                  </h2>
                  <p className="font-typewriter text-sm" style={{ color: 'var(--retro-gold)' }}>
                    {currentTrack.artists.map((a, i) => (
                      <span key={a.id}>
                        {i > 0 && ' & '}
                        <button onClick={() => { setActiveArtist({ id: a.id, name: a.name }); setActiveView('artist') }}
                          className="hover:underline transition-colors">
                          {a.name}
                        </button>
                      </span>
                    ))}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-retro text-xl font-bold" style={{ color: 'var(--retro-muted)' }}>No track playing</h2>
                  <p className="font-typewriter text-sm mt-1" style={{ color: 'var(--retro-muted)' }}>Select a song below</p>
                </>
              )}
            </div>

            {/* Progress bar */}
            {currentTrack && (
              <div className="w-full mb-3">
                <div className="w-full h-1 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(201,162,39,0.15)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--retro-gold)' }} />
                </div>
                <div className="flex justify-between">
                  <span className="font-typewriter text-xs" style={{ color: 'var(--retro-muted)' }}>{formatDuration(progressMs)}</span>
                  <span className="font-typewriter text-xs" style={{ color: 'var(--retro-muted)' }}>{formatDuration(durationMs)}</span>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 retro-gold-glow"
                style={{ background: 'var(--retro-gold)', color: '#0e0800' }}
              >
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <rect x="3" y="2" width="4" height="14" rx="1.5" />
                    <rect x="11" y="2" width="4" height="14" rx="1.5" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <path d="M4 3L16 9L4 15V3Z" />
                  </svg>
                )}
              </button>
              {queue.length > 0 && (
                <button onClick={handleSkip}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 border"
                  style={{ borderColor: 'rgba(201,162,39,0.3)', color: 'var(--retro-gold)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2.5L8 7L2 11.5V2.5Z" fill="currentColor" opacity="0.7" />
                    <rect x="9" y="2.5" width="3" height="9" rx="1" fill="currentColor" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-4 mb-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(201,162,39,0.2)' }} />
            <span className="font-retro text-xs tracking-widest uppercase" style={{ color: 'var(--retro-gold)', opacity: 0.6 }}>Select a Track</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(201,162,39,0.2)' }} />
          </div>

          {/* ── Retro jukebox track list — queue ── */}
          {queue.length > 0 && (
            <div className="px-3 mb-4">
              <p className="font-typewriter text-xs uppercase mb-2 px-1" style={{ color: 'var(--retro-muted)' }}>Up Next</p>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(201,162,39,0.2)' }}>
                {queue.slice(0, 8).map((track, i) => (
                  <div key={track.queueId}
                    className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 transition-colors hover:bg-white/5"
                    style={{ borderColor: 'rgba(201,162,39,0.1)', background: i % 2 === 0 ? 'rgba(201,162,39,0.03)' : 'transparent' }}
                  >
                    {/* Jukebox code */}
                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold font-typewriter"
                      style={{ background: 'rgba(201,162,39,0.15)', color: 'var(--retro-gold)', border: '1px solid rgba(201,162,39,0.3)' }}>
                      {rowLabel(i)}
                    </div>
                    {/* Art */}
                    <img src={track.album.images[track.album.images.length - 1]?.url} alt=""
                      className="w-8 h-8 rounded flex-shrink-0 object-cover" style={{ opacity: 0.85 }} />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--retro-cream)' }}>{track.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--retro-muted)' }}>{track.artists.map(a => a.name).join(', ')}</p>
                    </div>
                    <span className="font-typewriter text-xs flex-shrink-0" style={{ color: 'var(--retro-muted)' }}>
                      {formatDuration(track.duration_ms)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Releases */}
          <div className="px-4 pb-3">
            <p className="font-typewriter text-xs uppercase mb-3" style={{ color: 'var(--retro-muted)' }}>New Releases</p>
            {loading ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex-shrink-0 w-28 h-28 rounded-xl skeleton" />)}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
              </div>
            )}
          </div>

          {/* Playlists */}
          {playlists.length > 0 && (
            <div className="px-4 pb-6">
              <p className="font-typewriter text-xs uppercase mb-3" style={{ color: 'var(--retro-muted)' }}>Your Playlists</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                {playlists.map((pl) => (
                  <button key={pl.id}
                    onClick={() => { setActivePlaylist(pl); setActiveView('playlist') }}
                    className="flex-shrink-0 w-28 text-left active:scale-95 transition-transform"
                  >
                    <div className="w-28 h-28 rounded-xl overflow-hidden mb-2" style={{ background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.2)' }}>
                      {pl.images[0]?.url ? (
                        <img src={pl.images[0].url} alt={pl.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.3, color: 'var(--retro-gold)' }}>
                            <path d="M7 8H21M7 12H21M7 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--retro-cream)' }}>{pl.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--retro-muted)' }}>{pl.tracks?.total} songs</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
