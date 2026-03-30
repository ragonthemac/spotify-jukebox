'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useJukeboxStore } from '@/lib/store'
import {
  getRecentlyPlayed, getUserPlaylists, searchTracks, searchArtists, clearToken, formatDuration,
  type SpotifyPlaylist, type SpotifyTrack, type SpotifyArtist,
} from '@/lib/spotify'
import { globalPlayer } from './SpotifyPlayer'
import { playTrack } from '@/lib/spotify'
import SpinningVinyl from './SpinningVinyl'
import TrackRow from './TrackRow'

// Jukebox row labels: A1–A9, B1–B9 ...
function rowLabel(i: number) {
  return `${String.fromCharCode(65 + Math.floor(i / 9))}${(i % 9) + 1}`
}

/* ── Decorative neon tube light ── */
function NeonTube({ color, height, delay = '0s', flicker = false }: { color: string; height: string; delay?: string; flicker?: boolean }) {
  return (
    <div style={{
      width: 4,
      height,
      borderRadius: 99,
      background: color,
      boxShadow: `0 0 6px 2px ${color}, 0 0 20px 4px ${color}`,
      animation: flicker
        ? `neon-flicker 6s ease-in-out ${delay} infinite`
        : `neon-pulse 2s ease-in-out ${delay} infinite`,
    }} />
  )
}

/* ── Decorative jukebox side panel ── */
function JukeboxSidePanel({ side }: { side: 'left' | 'right' }) {
  const flip = side === 'right'
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      [side]: 0,
      width: 28,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      zIndex: 50,
      pointerEvents: 'none',
      background: flip
        ? 'linear-gradient(to left, rgba(30,12,0,0.95), transparent)'
        : 'linear-gradient(to right, rgba(30,12,0,0.95), transparent)',
      paddingTop: 40,
      paddingBottom: 40,
    }}>
      {/* Neon tubes */}
      <NeonTube color="#ff2d78" height="60px" delay="0s" flicker />
      <NeonTube color="#c9a227" height="40px" delay="0.3s" />
      <NeonTube color="#00d4ff" height="80px" delay="0.6s" />
      <NeonTube color="#ff2d78" height="30px" delay="0.9s" flicker />
      <NeonTube color="#c9a227" height="70px" delay="1.2s" />
      <NeonTube color="#a855f7" height="50px" delay="1.5s" flicker />
      <NeonTube color="#00d4ff" height="35px" delay="1.8s" />
      <NeonTube color="#ff2d78" height="90px" delay="0.4s" />
      <NeonTube color="#c9a227" height="45px" delay="0.7s" flicker />
      <NeonTube color="#a855f7" height="65px" delay="1.1s" />

      {/* Chrome bolt decorations */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #d4b896, #6b4c2a)',
          border: '1px solid rgba(201,162,39,0.4)',
          marginTop: i === 0 ? 8 : 0,
        }} />
      ))}
    </div>
  )
}

/* ── Decorative jukebox header chrome bar ── */
function ChromeHeader() {
  return (
    <div style={{
      position: 'relative',
      height: 32,
      background: 'linear-gradient(180deg, #2a1a08 0%, #1a0e04 100%)',
      borderBottom: '1px solid rgba(201,162,39,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 36px',
      flexShrink: 0,
    }}>
      {/* Left decorative dots */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {['#ff2d78', '#c9a227', '#00d4ff'].map((c, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: c,
            boxShadow: `0 0 6px 2px ${c}`,
            animation: `neon-pulse 2s ease-in-out ${i * 0.4}s infinite`,
          }} />
        ))}
      </div>

      {/* Title */}
      <span className="font-retro" style={{
        fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase',
        color: 'var(--retro-gold)', opacity: 0.8,
      }}>
        ♪ Jukebox
      </span>

      {/* Right decorative dots */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {['#00d4ff', '#c9a227', '#ff2d78'].map((c, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: c,
            boxShadow: `0 0 6px 2px ${c}`,
            animation: `neon-pulse 2s ease-in-out ${i * 0.4 + 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

/* ── Decorative equalizer bars (purely visual) ── */
function DecoEqualizer() {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 20, opacity: 0.5 }}>
      {[14, 8, 18, 10, 16, 6, 12].map((h, i) => (
        <div key={i} className="eq-bar" style={{
          width: 3, height: h, borderRadius: 2,
          background: i % 2 === 0 ? 'var(--retro-gold)' : '#ff2d78',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  )
}

export default function HomeView() {
  const {
    accessToken, deviceId, setActiveView, setActivePlaylist, setActiveArtist,
    currentTrack, isPlaying, setIsPlaying, progressMs, durationMs, queue, skipNext,
  } = useJukeboxStore()

  const [recentTracks, setRecentTracks] = useState<SpotifyTrack[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([])
  const [artistResults, setArtistResults] = useState<SpotifyArtist[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!accessToken) return
    Promise.allSettled([getRecentlyPlayed(accessToken), getUserPlaylists(accessToken)])
      .then(([r, p]) => {
        if (r.status === 'fulfilled') setRecentTracks(r.value)
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

      {/* Side neon panels */}
      <JukeboxSidePanel side="left" />
      <JukeboxSidePanel side="right" />

      {/* Chrome header bar */}
      <ChromeHeader />

      {/* Utility icons */}
      <div style={{
        position: 'absolute', top: 6, right: 36, zIndex: 60,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <button
          onClick={() => { clearToken(); window.location.reload() }}
          className="transition-colors"
          style={{ color: 'var(--retro-muted)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {query ? (
        /* ── Search results ── */
        <div className="flex-1 overflow-y-auto px-8 pb-4 pt-2">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setQuery('')} style={{ color: 'var(--retro-gold)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="font-typewriter text-xs" style={{ color: 'var(--retro-muted)' }}>Results for "{query}"</span>
          </div>
          {isSearching ? (
            <div className="flex flex-col gap-3">
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

          {/* Half-vinyl crown — clipped to show top half only */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden',
            height: 300,         /* clips bottom half of the 600px vinyl */
            flexShrink: 0,
            position: 'relative',
            marginBottom: -8,
          }}>
            {/* Glow behind vinyl */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: 320, height: 80,
              background: 'radial-gradient(ellipse, rgba(201,162,39,0.35) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div className="retro-gold-glow" style={{ borderRadius: '50%', alignSelf: 'flex-start', flexShrink: 0 }}>
              <SpinningVinyl albumArt={albumArt} isPlaying={isPlaying} size={600} />
            </div>
          </div>

          {/* Song info + controls + search */}
          <div className="flex flex-col items-center px-8 pt-4 pb-3" style={{
            background: 'linear-gradient(180deg, rgba(26,14,4,0.98) 0%, var(--retro-bg) 100%)',
          }}>

            {/* Song title + artist */}
            <div className="text-center mb-3 px-2 w-full">
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

            {/* Controls row */}
            <div className="flex items-center gap-5 mb-4">
              <DecoEqualizer />

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

              <DecoEqualizer />
            </div>

            {/* Search bar */}
            <div className="w-full" style={{ maxWidth: 380 }}>
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
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-8 mb-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(201,162,39,0.2)' }} />
            <span className="font-retro text-xs tracking-widest uppercase" style={{ color: 'var(--retro-gold)', opacity: 0.6 }}>Select a Track</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(201,162,39,0.2)' }} />
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="px-6 mb-4">
              <p className="font-typewriter text-xs uppercase mb-2 px-1" style={{ color: 'var(--retro-muted)' }}>Up Next</p>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(201,162,39,0.2)' }}>
                {queue.slice(0, 8).map((track, i) => (
                  <div key={track.queueId}
                    className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 transition-colors hover:bg-white/5"
                    style={{ borderColor: 'rgba(201,162,39,0.1)', background: i % 2 === 0 ? 'rgba(201,162,39,0.03)' : 'transparent' }}
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold font-typewriter"
                      style={{ background: 'rgba(201,162,39,0.15)', color: 'var(--retro-gold)', border: '1px solid rgba(201,162,39,0.3)' }}>
                      {rowLabel(i)}
                    </div>
                    <img src={track.album.images[track.album.images.length - 1]?.url} alt=""
                      className="w-8 h-8 rounded flex-shrink-0 object-cover" style={{ opacity: 0.85 }} />
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

          {/* Recently Played */}
          <div className="px-6 pb-3">
            <p className="font-typewriter text-xs uppercase mb-3" style={{ color: 'var(--retro-muted)' }}>Recently Played</p>
            {loading ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex-shrink-0 w-28 h-28 rounded-xl skeleton" />)}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ margin: '0 -24px', padding: '0 24px' }}>
                {recentTracks.map((track) => (
                  <button key={track.id}
                    onClick={() => {
                      if (!currentTrack && accessToken && deviceId) playTrack(accessToken, track.uri, deviceId)
                      else useJukeboxStore.getState().addToQueue(track)
                    }}
                    className="flex-shrink-0 w-28 text-left active:scale-95 transition-transform"
                  >
                    <div className="w-28 h-28 rounded-xl overflow-hidden mb-2" style={{ background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.2)' }}>
                      {track.album.images[0]?.url
                        ? <img src={track.album.images[0].url} alt={track.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.3, color: 'var(--retro-gold)' }}>
                              <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" />
                              <circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          </div>
                      }
                    </div>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--retro-cream)' }}>{track.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--retro-muted)' }}>{track.artists.map(a => a.name).join(', ')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Playlists */}
          {playlists.length > 0 && (
            <div className="px-6 pb-6">
              <p className="font-typewriter text-xs uppercase mb-3" style={{ color: 'var(--retro-muted)' }}>Your Playlists</p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ margin: '0 -24px', padding: '0 24px' }}>
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
