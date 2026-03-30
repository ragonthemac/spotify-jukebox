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

const chrome = 'linear-gradient(180deg, #e8d5b0 0%, #c9a460 20%, #f5e8c0 50%, #b8902a 80%, #e0c878 100%)'
const chromeH = 'linear-gradient(90deg, #e8d5b0 0%, #c9a460 20%, #f5e8c0 50%, #b8902a 80%, #e0c878 100%)'

/* ─── Arch crown: the jukebox top with concentric neon + chrome rings ─── */
function ArchCrown({ albumArt, isPlaying, vinylSize = 880, topPad = 220 }: {
  albumArt?: string; isPlaying: boolean; vinylSize?: number; topPad?: number
}) {
  // archH = top padding space + half the vinyl (the clipped half)
  const archH = topPad + Math.round(vinylSize / 2)

  // Each arch layer: position absolute, bottom:0 so sides are straight,
  // border-radius on top makes the arch shape.
  // Layers stack inside each other like an onion.
  const archShape = '50% 50% 0 0'

  return (
    <div style={{ position: 'relative', height: archH, flexShrink: 0, overflow: 'hidden' }}>

      {/* ① outermost chrome frame (reveals as outer ring) */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: archShape, background: chromeH }} />

      {/* ② dark gap behind chrome → 10px chrome ring visible */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 0, borderRadius: archShape, background: '#050200' }} />

      {/* ③ pink neon ring → 4px dark gap, then pink fills */}
      <div style={{
        position: 'absolute', top: 14, left: 14, right: 14, bottom: 0,
        borderRadius: archShape,
        background: '#ff2d78',
        boxShadow: '0 0 14px 4px #ff2d7866',
        animation: 'neon-pulse 2.5s ease-in-out 0s infinite',
      }} />

      {/* ④ dark → 6px pink ring visible */}
      <div style={{ position: 'absolute', top: 20, left: 20, right: 20, bottom: 0, borderRadius: archShape, background: '#050200' }} />

      {/* ⑤ gold neon ring */}
      <div style={{
        position: 'absolute', top: 24, left: 24, right: 24, bottom: 0,
        borderRadius: archShape,
        background: '#c9a227',
        boxShadow: '0 0 12px 3px #c9a22755',
        animation: 'neon-pulse 3s ease-in-out 0.6s infinite',
      }} />

      {/* ⑥ dark → 4px gold ring visible */}
      <div style={{ position: 'absolute', top: 28, left: 28, right: 28, bottom: 0, borderRadius: archShape, background: '#050200' }} />

      {/* ⑦ cyan neon ring */}
      <div style={{
        position: 'absolute', top: 32, left: 32, right: 32, bottom: 0,
        borderRadius: archShape,
        background: '#00d4ff',
        boxShadow: '0 0 12px 3px #00d4ff55',
        animation: 'neon-pulse 2.8s ease-in-out 1.2s infinite',
      }} />

      {/* ⑧ dark → 4px cyan ring visible */}
      <div style={{ position: 'absolute', top: 36, left: 36, right: 36, bottom: 0, borderRadius: archShape, background: '#050200' }} />

      {/* ⑨ chrome inner ring */}
      <div style={{ position: 'absolute', top: 40, left: 40, right: 40, bottom: 0, borderRadius: archShape, background: chromeH, opacity: 0.85 }} />

      {/* ⑩ dark gap → 6px inner chrome ring visible */}
      <div style={{ position: 'absolute', top: 48, left: 48, right: 48, bottom: 0, borderRadius: archShape, background: '#050200' }} />

      {/* ⑪ thin gold accent ring */}
      <div style={{
        position: 'absolute', top: 52, left: 52, right: 52, bottom: 0,
        borderRadius: archShape,
        background: '#c9a227',
        opacity: 0.6,
      }} />

      {/* ⑫ dark interior — the "window" — clips vinyl bottom */}
      <div style={{ position: 'absolute', top: 56, left: 56, right: 56, bottom: 0, borderRadius: archShape, background: '#030100' }} />

      {/* ── Vinyl record centered, pushed down by topPad ── */}
      <div style={{
        position: 'absolute',
        top: topPad,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
      }}>
        <SpinningVinyl albumArt={albumArt} isPlaying={isPlaying} size={vinylSize} />
      </div>

      {/* ── Vertical chrome side strips inside the arch ── */}
      {['left', 'right'].map(side => (
        <div key={side} style={{
          position: 'absolute',
          top: 0, bottom: 0,
          [side]: 56,
          width: 8,
          background: chrome,
          opacity: 0.4,
          zIndex: 2,
        }} />
      ))}

      {/* ── Corner bolts at base of arch ── */}
      {[{ left: 30, bottom: 16 }, { right: 30, bottom: 16 }].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos,
          display: 'flex', flexDirection: 'column', gap: 6, zIndex: 3,
        }}>
          {[0, 1, 2].map(j => (
            <div key={j} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #fff8e0, #7a5810)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }} />
          ))}
        </div>
      ))}

      {/* ── Decorative neon accent dots at top center of arch ── */}
      <div style={{
        position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 14, zIndex: 3,
      }}>
        {['#ff2d78', '#c9a227', '#00d4ff', '#a855f7', '#c9a227', '#00d4ff', '#ff2d78'].map((c, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: c,
            boxShadow: `0 0 8px 2px ${c}88`,
            animation: `neon-pulse 2s ease-in-out ${i * 0.25}s infinite`,
          }} />
        ))}
      </div>

      {/* ── Small chrome top ornament ── */}
      <div style={{
        position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
        width: 60, height: 14,
        background: chromeH,
        borderRadius: '0 0 30px 30px',
        zIndex: 3, opacity: 0.7,
      }} />

    </div>
  )
}

/* ─── Chrome horizontal trim strip ─── */
function ChromeStrip({ height = 8, opacity = 1 }: { height?: number; opacity?: number }) {
  return <div style={{ height, width: '100%', flexShrink: 0, background: chromeH, opacity }} />
}

/* ─── Speaker grille dot pattern ─── */
function SpeakerGrille({ rows = 4, cols = 12 }: { rows?: number; cols?: number }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 6, padding: '10px 16px',
      background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: 4,
    }}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'rgba(201,162,39,0.28)', boxShadow: '0 0 2px rgba(201,162,39,0.15)',
        }} />
      ))}
    </div>
  )
}

/* ─── Knob ─── */
function Knob({ label, color = '#c9a227' }: { label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #d4c090, #3a2808)',
        border: `2px solid ${color}55`,
        boxShadow: `0 3px 6px rgba(0,0,0,0.7), 0 0 8px ${color}20`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
          width: 3, height: 12, background: color, borderRadius: 2, opacity: 0.85,
        }} />
      </div>
      <span style={{ fontSize: 10, color: 'rgba(201,162,39,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Equalizer bars (decorative) ─── */
function DecoEqualizer() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 24, opacity: 0.55 }}>
      {[14, 8, 20, 10, 18, 6, 14].map((h, i) => (
        <div key={i} className="eq-bar" style={{
          width: 5, height: h, borderRadius: 3,
          background: i % 3 === 0 ? '#ff2d78' : i % 3 === 1 ? '#c9a227' : '#00d4ff',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  )
}

/* ─── Pilaster side column ─── */
function Pilaster({ side }: { side: 'left' | 'right' }) {
  const tubes = [
    { color: '#ff2d78', h: 70, delay: '0s', flicker: true },
    { color: '#c9a227', h: 50, delay: '0.5s', flicker: false },
    { color: '#00d4ff', h: 90, delay: '1s', flicker: false },
    { color: '#c9a227', h: 35, delay: '1.5s', flicker: true },
    { color: '#ff2d78', h: 100, delay: '0.3s', flicker: false },
    { color: '#a855f7', h: 60, delay: '2s', flicker: true },
    { color: '#00d4ff', h: 45, delay: '0.8s', flicker: false },
    { color: '#c9a227', h: 80, delay: '1.3s', flicker: false },
    { color: '#ff2d78', h: 55, delay: '0.6s', flicker: true },
    { color: '#a855f7', h: 40, delay: '1.8s', flicker: false },
  ]
  return (
    <div style={{
      position: 'fixed', top: 0, [side]: 0,
      width: 44, height: '100%',
      zIndex: 50, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        [side === 'left' ? 'right' : 'left']: 0,
        width: 6, background: chrome, opacity: 0.75,
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        [side === 'left' ? 'left' : 'right']: 0,
        width: 3, background: chrome, opacity: 0.3,
      }} />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 10, padding: '80px 0',
        background: 'rgba(8,4,0,0.88)',
      }}>
        {tubes.map((t, i) => (
          <div key={i} style={{
            width: 8, height: t.h, borderRadius: 99, flexShrink: 0,
            background: `linear-gradient(180deg, ${t.color}cc 0%, ${t.color} 40%, ${t.color}cc 100%)`,
            boxShadow: `0 0 5px 1px ${t.color}88, 0 0 14px 3px ${t.color}44`,
            animation: t.flicker
              ? `neon-flicker 7s ease-in-out ${t.delay} infinite`
              : `neon-pulse 3s ease-in-out ${t.delay} infinite`,
          }} />
        ))}
      </div>
      {[true, false].map((top) => (
        <div key={String(top)} style={{
          position: 'absolute',
          [top ? 'top' : 'bottom']: 12,
          left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {[0, 1, 2, 3].map(j => (
            <div key={j} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #fff8e0, #8a6820)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.7)',
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ─── Logo ─── */
function JukeboxLogo() {
  return (
    <div style={{ textAlign: 'center', lineHeight: 1 }}>
      <div style={{ fontSize: 13, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(201,162,39,0.55)', fontFamily: 'monospace', marginBottom: 4 }}>
        ♪ welcome to ♪
      </div>
      <div className="font-retro" style={{
        fontSize: 34, fontWeight: 900,
        background: chromeH, WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        letterSpacing: '-0.01em', lineHeight: 1.05,
      }}>
        The Outside Inn
      </div>
      <div style={{ fontSize: 11, letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(201,162,39,0.4)', fontFamily: 'monospace', marginTop: 5 }}>
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

      <Pilaster side="left" />
      <Pilaster side="right" />

      {/* ── Top header ── */}
      <div style={{ flexShrink: 0 }}>
        <ChromeStrip height={10} opacity={0.8} />
        <div style={{ display: 'flex', height: 12 }}>
          <div style={{ flex: 1, background: 'linear-gradient(90deg, transparent, #ff2d7855, transparent)' }} />
          <div style={{ flex: 1, background: 'linear-gradient(90deg, transparent, #c9a22777, transparent)' }} />
          <div style={{ flex: 1, background: 'linear-gradient(90deg, transparent, #00d4ff55, transparent)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 52px' }}>
          {/* Coin slot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 44, height: 16, borderRadius: 4, background: 'linear-gradient(180deg, #1a0e04, #0a0500)', border: '1px solid rgba(201,162,39,0.45)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)' }} />
            <span style={{ fontSize: 9, color: 'rgba(201,162,39,0.3)', letterSpacing: '0.1em', fontFamily: 'monospace', textTransform: 'uppercase' }}>insert coin</span>
          </div>
          <JukeboxLogo />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(201,162,39,0.22)' }} />
              ))}
            </div>
            <button onClick={() => { clearToken(); window.location.reload() }} style={{ color: 'rgba(201,162,39,0.35)', padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <ChromeStrip height={10} opacity={0.6} />
      </div>

      {query ? (
        /* ── Search results ── */
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 52px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button onClick={() => setQuery('')} style={{ color: 'var(--retro-gold)', padding: 8 }}>
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="font-typewriter" style={{ fontSize: 15, color: 'var(--retro-muted)' }}>Results for "{query}"</span>
          </div>
          {isSearching ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: 12, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 16, width: 160, borderRadius: 4, marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 12, width: 100, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {artistResults.map((artist) => (
                <button key={artist.id}
                  onClick={() => { setActiveArtist({ id: artist.id, name: artist.name, imageUrl: artist.images[0]?.url }); setActiveView('artist') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, width: '100%', textAlign: 'left', marginBottom: 4 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
                    {artist.images[0]?.url && <img src={artist.images[0].url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 17, fontWeight: 500, color: 'var(--retro-cream)' }}>{artist.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--retro-muted)' }}>Artist</p>
                  </div>
                </button>
              ))}
              {trackResults.map((track, i) => <TrackRow key={track.id + i} track={track} />)}
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* ── Arch crown with vinyl ── */}
          <ArchCrown albumArt={albumArt} isPlaying={isPlaying} vinylSize={880} topPad={220} />

          <ChromeStrip height={8} opacity={0.5} />

          {/* ── Now playing panel ── */}
          <div style={{ padding: '18px 52px 14px', background: 'linear-gradient(180deg, rgba(20,10,2,0.98), rgba(14,8,0,1))' }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              {currentTrack ? (
                <>
                  <h2 className="font-retro" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 6, color: 'var(--retro-cream)' }}>
                    {currentTrack.name}
                  </h2>
                  <p className="font-typewriter" style={{ fontSize: 17, color: 'var(--retro-gold)' }}>
                    {currentTrack.artists.map((a, i) => (
                      <span key={a.id}>
                        {i > 0 && ' & '}
                        <button onClick={() => { setActiveArtist({ id: a.id, name: a.name }); setActiveView('artist') }} className="hover:underline transition-colors">{a.name}</button>
                      </span>
                    ))}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-retro" style={{ fontSize: 26, fontWeight: 700, color: 'var(--retro-muted)' }}>No track playing</h2>
                  <p className="font-typewriter" style={{ fontSize: 16, marginTop: 6, color: 'var(--retro-muted)' }}>Select a song below</p>
                </>
              )}
            </div>

            {currentTrack && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 6, background: 'rgba(201,162,39,0.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--retro-gold)', borderRadius: 99, transition: 'width 0.5s linear' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="font-typewriter" style={{ fontSize: 14, color: 'var(--retro-muted)' }}>{formatDuration(progressMs)}</span>
                  <span className="font-typewriter" style={{ fontSize: 14, color: 'var(--retro-muted)' }}>{formatDuration(durationMs)}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}><Knob label="vol" /><Knob label="tone" color="#00d4ff" /></div>
              <DecoEqualizer />
              <button onClick={togglePlay} className="active:scale-95" style={{
                width: 80, height: 80, borderRadius: '50%', background: 'var(--retro-gold)', color: '#0e0800',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 0 16px rgba(201,162,39,0.45), 0 3px 10px rgba(0,0,0,0.7)',
                border: '3px solid rgba(255,240,180,0.3)', transition: 'transform 0.1s',
              }}>
                {isPlaying ? (
                  <svg width="26" height="26" viewBox="0 0 18 18" fill="currentColor"><rect x="3" y="2" width="4" height="14" rx="1.5" /><rect x="11" y="2" width="4" height="14" rx="1.5" /></svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 18 18" fill="currentColor"><path d="M4 3L16 9L4 15V3Z" /></svg>
                )}
              </button>
              {queue.length > 0 && (
                <button onClick={handleSkip} className="active:scale-95 transition-transform" style={{
                  width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(201,162,39,0.35)',
                  color: 'var(--retro-gold)', background: 'rgba(201,162,39,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2.5L8 7L2 11.5V2.5Z" fill="currentColor" opacity="0.7" />
                    <rect x="9" y="2.5" width="3" height="9" rx="1" fill="currentColor" />
                  </svg>
                </button>
              )}
              <DecoEqualizer />
              <div style={{ display: 'flex', gap: 12 }}><Knob label="bass" color="#ff2d78" /><Knob label="treb" color="#a855f7" /></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 52,
                width: '100%', maxWidth: 460, background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(201,162,39,0.28)', borderRadius: 6,
              }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--retro-muted)', flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the catalog…"
                  className="flex-1 bg-transparent outline-none font-typewriter"
                  style={{ fontSize: 16, color: 'var(--retro-cream)', caretColor: 'var(--retro-gold)' }} />
                {query && (
                  <button onClick={() => setQuery('')} style={{ color: 'var(--retro-muted)', padding: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Speaker grille band ── */}
          <ChromeStrip height={8} opacity={0.5} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '10px 52px', background: 'rgba(8,4,0,0.95)' }}>
            <SpeakerGrille rows={3} cols={12} />
            <div style={{ padding: '6px 16px', border: '1px solid rgba(201,162,39,0.28)', borderRadius: 3, background: 'rgba(201,162,39,0.04)', whiteSpace: 'nowrap' }}>
              <span className="font-typewriter" style={{ fontSize: 11, color: 'rgba(201,162,39,0.45)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>stereo hi-fi</span>
            </div>
            <SpeakerGrille rows={3} cols={12} />
          </div>
          <ChromeStrip height={8} opacity={0.5} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 52px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,162,39,0.15)' }} />
            <span className="font-retro" style={{ fontSize: 15, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--retro-gold)', opacity: 0.5 }}>Select a Track</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,162,39,0.15)' }} />
          </div>

          {/* ── Queue ── */}
          {queue.length > 0 && (
            <div style={{ padding: '12px 44px 16px' }}>
              <p className="font-typewriter" style={{ fontSize: 13, textTransform: 'uppercase', marginBottom: 10, color: 'var(--retro-muted)', letterSpacing: '0.08em' }}>Up Next</p>
              <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(201,162,39,0.2)' }}>
                {queue.slice(0, 8).map((track, i) => (
                  <div key={track.queueId} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                    borderBottom: i < queue.length - 1 ? '1px solid rgba(201,162,39,0.1)' : 'none',
                    background: i % 2 === 0 ? 'rgba(201,162,39,0.03)' : 'transparent',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 6, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.25)',
                      fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--retro-gold)',
                    }}>{rowLabel(i)}</div>
                    <img src={track.album.images[track.album.images.length - 1]?.url} alt=""
                      style={{ width: 48, height: 48, borderRadius: 6, flexShrink: 0, objectFit: 'cover', opacity: 0.85 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--retro-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</p>
                      <p style={{ fontSize: 13, color: 'var(--retro-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artists.map(a => a.name).join(', ')}</p>
                    </div>
                    <span className="font-typewriter" style={{ fontSize: 13, color: 'var(--retro-muted)', flexShrink: 0 }}>{formatDuration(track.duration_ms)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recently Played ── */}
          <div style={{ padding: '12px 44px 14px' }}>
            <p className="font-typewriter" style={{ fontSize: 13, textTransform: 'uppercase', marginBottom: 14, color: 'var(--retro-muted)', letterSpacing: '0.08em' }}>Recently Played</p>
            {loading ? (
              <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 150, height: 150, borderRadius: 10, flexShrink: 0 }} />)}
              </div>
            ) : (
              <div className="scrollbar-none" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, margin: '0 -44px', padding: '0 44px 8px' }}>
                {recentTracks.map((track) => (
                  <button key={track.id}
                    onClick={() => {
                      if (!currentTrack && accessToken && deviceId) playTrack(accessToken, track.uri, deviceId)
                      else useJukeboxStore.getState().addToQueue(track)
                    }}
                    style={{ flexShrink: 0, width: 150, textAlign: 'left' }}
                    className="active:scale-95 transition-transform"
                  >
                    <div style={{ width: 150, height: 150, borderRadius: 10, overflow: 'hidden', marginBottom: 8, background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.18)' }}>
                      {track.album.images[0]?.url
                        ? <img src={track.album.images[0].url} alt={track.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="36" height="36" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.2, color: 'var(--retro-gold)' }}>
                              <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" /><circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          </div>
                      }
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--retro-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--retro-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artists.map(a => a.name).join(', ')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Playlists ── */}
          {playlists.length > 0 && (
            <div style={{ padding: '0 44px 32px' }}>
              <p className="font-typewriter" style={{ fontSize: 13, textTransform: 'uppercase', marginBottom: 14, color: 'var(--retro-muted)', letterSpacing: '0.08em' }}>Your Playlists</p>
              <div className="scrollbar-none" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, margin: '0 -44px', padding: '0 44px 8px' }}>
                {playlists.map((pl) => (
                  <button key={pl.id}
                    onClick={() => { setActivePlaylist(pl); setActiveView('playlist') }}
                    style={{ flexShrink: 0, width: 150, textAlign: 'left' }}
                    className="active:scale-95 transition-transform"
                  >
                    <div style={{ width: 150, height: 150, borderRadius: 10, overflow: 'hidden', marginBottom: 8, background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.18)' }}>
                      {pl.images[0]?.url
                        ? <img src={pl.images[0].url} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="36" height="36" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.2, color: 'var(--retro-gold)' }}>
                              <path d="M7 8H21M7 12H21M7 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </div>
                      }
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--retro-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--retro-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.tracks?.total} songs</p>
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
