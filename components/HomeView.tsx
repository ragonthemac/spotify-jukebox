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

function rowLabel(i: number) {
  return `${String.fromCharCode(65 + Math.floor(i / 9))}${(i % 9) + 1}`
}

/* ─── Chrome gradient helper ─── */
const chrome = 'linear-gradient(180deg, #e8d5b0 0%, #c9a460 20%, #f5e8c0 50%, #b8902a 80%, #e0c878 100%)'
const chromeH = 'linear-gradient(90deg, #e8d5b0 0%, #c9a460 20%, #f5e8c0 50%, #b8902a 80%, #e0c878 100%)'

/* ─── Subtle neon tube (toned-down glow) ─── */
function NeonTube({ color, height, delay = '0s', flicker = false }: {
  color: string; height: number; delay?: string; flicker?: boolean
}) {
  return (
    <div style={{
      width: 5, height,
      borderRadius: 99,
      background: `linear-gradient(180deg, ${color}cc 0%, ${color} 40%, ${color}cc 100%)`,
      boxShadow: `0 0 4px 1px ${color}88, 0 0 10px 2px ${color}44`,
      animation: flicker
        ? `neon-flicker 7s ease-in-out ${delay} infinite`
        : `neon-pulse 3s ease-in-out ${delay} infinite`,
      flexShrink: 0,
    }} />
  )
}

/* ─── Jukebox pilaster column (chrome + neon tubes inside) ─── */
function Pilaster({ side }: { side: 'left' | 'right' }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, [side]: 0,
      width: 24,
      height: '100%',
      zIndex: 50,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Chrome edge strip */}
      <div style={{
        position: 'absolute',
        top: 0, bottom: 0,
        [side === 'left' ? 'right' : 'left']: 0,
        width: 4,
        background: chrome,
        opacity: 0.7,
      }} />

      {/* Neon tube stack inside pilaster */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '60px 0',
        background: 'rgba(10,5,0,0.85)',
      }}>
        <NeonTube color="#ff2d78" height={50} delay="0s" flicker />
        <NeonTube color="#c9a227" height={35} delay="0.5s" />
        <NeonTube color="#00d4ff" height={65} delay="1s" />
        <NeonTube color="#c9a227" height={25} delay="1.5s" flicker />
        <NeonTube color="#ff2d78" height={70} delay="0.3s" />
        <NeonTube color="#a855f7" height={40} delay="2s" flicker />
        <NeonTube color="#00d4ff" height={30} delay="0.8s" />
        <NeonTube color="#c9a227" height={55} delay="1.3s" />
        <NeonTube color="#ff2d78" height={45} delay="0.6s" flicker />
      </div>

      {/* Chrome cap bolts top & bottom */}
      {[true, false].map((top) => (
        <div key={String(top)} style={{
          position: 'absolute',
          [top ? 'top' : 'bottom']: 8,
          left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #fff8e0, #8a6820)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.6)',
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ─── Chrome horizontal trim strip ─── */
function ChromeStrip({ opacity = 1 }: { opacity?: number }) {
  return (
    <div style={{
      height: 6, width: '100%', flexShrink: 0,
      background: chromeH,
      opacity,
    }} />
  )
}

/* ─── Speaker grille dot pattern ─── */
function SpeakerGrille({ rows = 4, cols = 14 }: { rows?: number; cols?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 4,
      padding: '6px 12px',
      background: 'rgba(0,0,0,0.4)',
      border: `1px solid rgba(201,162,39,0.2)`,
      borderRadius: 4,
    }}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <div key={i} style={{
          width: 4, height: 4, borderRadius: '50%',
          background: 'rgba(201,162,39,0.3)',
          boxShadow: '0 0 2px rgba(201,162,39,0.2)',
        }} />
      ))}
    </div>
  )
}

/* ─── Decorative knob ─── */
function Knob({ label, color = '#c9a227' }: { label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #d4c090, #4a3510)',
        border: `2px solid ${color}66`,
        boxShadow: `0 2px 4px rgba(0,0,0,0.6), 0 0 6px ${color}22`,
        position: 'relative',
      }}>
        {/* Indicator line */}
        <div style={{
          position: 'absolute', top: 2, left: '50%',
          transform: 'translateX(-50%)',
          width: 2, height: 7,
          background: color,
          borderRadius: 1,
          opacity: 0.8,
        }} />
      </div>
      <span style={{ fontSize: 7, color: 'rgba(201,162,39,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Equalizer bars (decorative) ─── */
function DecoEqualizer({ color = 'var(--retro-gold)' }: { color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16, opacity: 0.6 }}>
      {[10, 6, 14, 8, 12, 5, 9].map((h, i) => (
        <div key={i} className="eq-bar" style={{
          width: 3, height: h, borderRadius: 2,
          background: i % 3 === 0 ? '#ff2d78' : i % 3 === 1 ? color : '#00d4ff',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  )
}

/* ─── "The Outside Inn" logo ─── */
function JukeboxLogo() {
  return (
    <div style={{ textAlign: 'center', lineHeight: 1 }}>
      <div style={{
        fontSize: 9,
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        color: 'rgba(201,162,39,0.6)',
        fontFamily: 'monospace',
        marginBottom: 2,
      }}>
        ♪ welcome to ♪
      </div>
      <div className="font-retro" style={{
        fontSize: 20,
        fontWeight: 900,
        background: chromeH,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '-0.01em',
        textShadow: 'none',
        lineHeight: 1.1,
      }}>
        The Outside Inn
      </div>
      <div style={{
        fontSize: 7,
        letterSpacing: '0.5em',
        textTransform: 'uppercase',
        color: 'rgba(201,162,39,0.45)',
        fontFamily: 'monospace',
        marginTop: 3,
      }}>
        ── jukebox ──
      </div>
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
    if (isPlaying) globalPlayer?.pause(); else globalPlayer?.resume()
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

      {/* Side pilasters */}
      <Pilaster side="left" />
      <Pilaster side="right" />

      {/* ── Top chrome cap + logo ── */}
      <div style={{ flexShrink: 0 }}>
        <ChromeStrip opacity={0.8} />
        {/* Arch top molding — two thin colored light bars */}
        <div style={{ display: 'flex', height: 8 }}>
          <div style={{ flex: 1, background: 'linear-gradient(90deg, transparent, #ff2d7844, transparent)', opacity: 0.6 }} />
          <div style={{ flex: 1, background: 'linear-gradient(90deg, transparent, #c9a22766, transparent)', opacity: 0.8 }} />
          <div style={{ flex: 1, background: 'linear-gradient(90deg, transparent, #00d4ff44, transparent)', opacity: 0.6 }} />
        </div>

        {/* Logo area — no background, transparent */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 32px',
        }}>
          {/* Left decorative coin slot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{
              width: 28, height: 10, borderRadius: 3,
              background: 'linear-gradient(180deg, #1a0e04, #0a0500)',
              border: '1px solid rgba(201,162,39,0.4)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
            }} />
            <span style={{ fontSize: 6, color: 'rgba(201,162,39,0.35)', letterSpacing: '0.1em', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              insert coin
            </span>
          </div>

          <JukeboxLogo />

          {/* Right — logout + small grille accent */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(201,162,39,0.25)' }} />
              ))}
            </div>
            <button
              onClick={() => { clearToken(); window.location.reload() }}
              style={{ color: 'rgba(201,162,39,0.35)', padding: 2 }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <ChromeStrip opacity={0.6} />
      </div>

      {query ? (
        /* ── Search results ── */
        <div className="flex-1 overflow-y-auto pb-4" style={{ padding: '8px 32px 16px' }}>
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
        <div className="flex-1 overflow-y-auto">

          {/* ── Half vinyl crown ── */}
          <div style={{
            display: 'flex', justifyContent: 'center',
            overflow: 'hidden', height: 300,
            flexShrink: 0, position: 'relative',
          }}>
            {/* Soft glow beneath vinyl */}
            <div style={{
              position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: 280, height: 60,
              background: 'radial-gradient(ellipse, rgba(201,162,39,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div className="retro-gold-glow" style={{ borderRadius: '50%', alignSelf: 'flex-start', flexShrink: 0 }}>
              <SpinningVinyl albumArt={albumArt} isPlaying={isPlaying} size={600} />
            </div>
          </div>

          {/* ── Chrome trim below vinyl ── */}
          <ChromeStrip opacity={0.5} />

          {/* ── Now playing panel ── */}
          <div style={{
            padding: '12px 32px 10px',
            background: 'linear-gradient(180deg, rgba(20,10,2,0.98) 0%, rgba(14,8,0,1) 100%)',
          }}>

            {/* Song title + artist */}
            <div className="text-center mb-3">
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
                          className="hover:underline transition-colors">{a.name}</button>
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
              <div className="mb-3">
                <div className="w-full h-1 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(201,162,39,0.12)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--retro-gold)' }} />
                </div>
                <div className="flex justify-between">
                  <span className="font-typewriter text-xs" style={{ color: 'var(--retro-muted)' }}>{formatDuration(progressMs)}</span>
                  <span className="font-typewriter text-xs" style={{ color: 'var(--retro-muted)' }}>{formatDuration(durationMs)}</span>
                </div>
              </div>
            )}

            {/* Controls + knobs row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>

              {/* Left decorative knobs */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Knob label="vol" />
                <Knob label="tone" color="#00d4ff" />
              </div>

              <DecoEqualizer />

              {/* Play button */}
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{
                  background: 'var(--retro-gold)',
                  color: '#0e0800',
                  boxShadow: '0 0 12px rgba(201,162,39,0.4), 0 2px 8px rgba(0,0,0,0.6)',
                  border: '2px solid rgba(255,240,180,0.3)',
                }}
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
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={{
                    border: '1px solid rgba(201,162,39,0.3)',
                    color: 'var(--retro-gold)',
                    background: 'rgba(201,162,39,0.06)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2.5L8 7L2 11.5V2.5Z" fill="currentColor" opacity="0.7" />
                    <rect x="9" y="2.5" width="3" height="9" rx="1" fill="currentColor" />
                  </svg>
                </button>
              )}

              <DecoEqualizer />

              {/* Right decorative knobs */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Knob label="bass" color="#ff2d78" />
                <Knob label="treb" color="#a855f7" />
              </div>
            </div>

            {/* Search bar */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 12px', height: 36,
                width: '100%', maxWidth: 340,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(201,162,39,0.25)',
                borderRadius: 4,
              }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--retro-muted)', flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the catalog…"
                  className="flex-1 bg-transparent text-xs outline-none font-typewriter"
                  style={{ color: 'var(--retro-cream)', caretColor: 'var(--retro-gold)' }}
                />
                {query && (
                  <button onClick={() => setQuery('')} style={{ color: 'var(--retro-muted)' }}>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Chrome trim + speaker grille strip ── */}
          <ChromeStrip opacity={0.5} />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '6px 32px',
            background: 'rgba(8,4,0,0.95)',
          }}>
            <SpeakerGrille rows={3} cols={10} />
            {/* Center badge */}
            <div style={{
              padding: '4px 10px',
              border: '1px solid rgba(201,162,39,0.3)',
              borderRadius: 2,
              background: 'rgba(201,162,39,0.05)',
              whiteSpace: 'nowrap',
            }}>
              <span className="font-typewriter" style={{ fontSize: 8, color: 'rgba(201,162,39,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                stereo hi-fi
              </span>
            </div>
            <SpeakerGrille rows={3} cols={10} />
          </div>
          <ChromeStrip opacity={0.5} />

          {/* ── Section divider ── */}
          <div className="flex items-center gap-3 mb-3" style={{ padding: '8px 32px 0' }}>
            <div className="flex-1 h-px" style={{ background: 'rgba(201,162,39,0.15)' }} />
            <span className="font-retro text-xs tracking-widest uppercase" style={{ color: 'var(--retro-gold)', opacity: 0.5 }}>Select a Track</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(201,162,39,0.15)' }} />
          </div>

          {/* ── Queue ── */}
          {queue.length > 0 && (
            <div style={{ padding: '0 28px 12px' }}>
              <p className="font-typewriter text-xs uppercase mb-2" style={{ color: 'var(--retro-muted)' }}>Up Next</p>
              <div className="rounded overflow-hidden" style={{ border: '1px solid rgba(201,162,39,0.2)' }}>
                {queue.slice(0, 8).map((track, i) => (
                  <div key={track.queueId}
                    className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0"
                    style={{ borderColor: 'rgba(201,162,39,0.1)', background: i % 2 === 0 ? 'rgba(201,162,39,0.03)' : 'transparent' }}
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold font-typewriter"
                      style={{ background: 'rgba(201,162,39,0.12)', color: 'var(--retro-gold)', border: '1px solid rgba(201,162,39,0.25)' }}>
                      {rowLabel(i)}
                    </div>
                    <img src={track.album.images[track.album.images.length - 1]?.url} alt=""
                      className="w-8 h-8 rounded flex-shrink-0 object-cover" style={{ opacity: 0.8 }} />
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

          {/* ── Recently Played ── */}
          <div style={{ padding: '0 28px 10px' }}>
            <p className="font-typewriter text-xs uppercase mb-3" style={{ color: 'var(--retro-muted)' }}>Recently Played</p>
            {loading ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex-shrink-0 w-24 h-24 rounded skeleton" />)}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ margin: '0 -28px', padding: '0 28px' }}>
                {recentTracks.map((track) => (
                  <button key={track.id}
                    onClick={() => {
                      if (!currentTrack && accessToken && deviceId) playTrack(accessToken, track.uri, deviceId)
                      else useJukeboxStore.getState().addToQueue(track)
                    }}
                    className="flex-shrink-0 w-24 text-left active:scale-95 transition-transform"
                  >
                    <div className="w-24 h-24 rounded overflow-hidden mb-1.5" style={{ background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.18)' }}>
                      {track.album.images[0]?.url
                        ? <img src={track.album.images[0].url} alt={track.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.25, color: 'var(--retro-gold)' }}>
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

          {/* ── Playlists ── */}
          {playlists.length > 0 && (
            <div style={{ padding: '0 28px 24px' }}>
              <p className="font-typewriter text-xs uppercase mb-3" style={{ color: 'var(--retro-muted)' }}>Your Playlists</p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ margin: '0 -28px', padding: '0 28px' }}>
                {playlists.map((pl) => (
                  <button key={pl.id}
                    onClick={() => { setActivePlaylist(pl); setActiveView('playlist') }}
                    className="flex-shrink-0 w-24 text-left active:scale-95 transition-transform"
                  >
                    <div className="w-24 h-24 rounded overflow-hidden mb-1.5" style={{ background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.18)' }}>
                      {pl.images[0]?.url ? (
                        <img src={pl.images[0].url} alt={pl.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.25, color: 'var(--retro-gold)' }}>
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
