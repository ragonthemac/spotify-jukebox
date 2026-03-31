'use client'

import { useEffect, useState, useRef } from 'react'
import { useJukeboxStore } from '@/lib/store'
import {
  getRecentlyPlayed, getUserPlaylists, searchAll, clearToken, formatDuration,
  previousTrack as prevTrackApi, findOrCreateJukeboxPlaylist, addTrackToJukeboxPlaylist,
  type SpotifyPlaylist, type SpotifyTrack, type SpotifyArtist, type SpotifyAlbum,
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

/* ─── Arch crown ─── */
function ArchCrown({ albumArt, isPlaying, vinylSize = 880, topPad = 0 }: {
  albumArt?: string; isPlaying: boolean; vinylSize?: number; topPad?: number
}) {
  const vR = vinylSize / 2
  const vCenterY = topPad + vR
  const archH = topPad + vR

  // Circular ring: each layer is a full circle centered on the vinyl center,
  // with radius = vinyl radius + gap. Painted large-to-small to create rings.
  const ring = (gap: number, bg: string, extra?: React.CSSProperties) => {
    const d = (vR + gap) * 2
    return {
      position: 'absolute' as const,
      width: d, height: d,
      borderRadius: '50%',
      top: vCenterY - (vR + gap),
      left: '50%',
      transform: 'translateX(-50%)',
      background: bg,
      ...extra,
    }
  }

  return (
    <div style={{ position: 'relative', height: archH, flexShrink: 0, overflow: 'hidden' }}>
      {/* Chrome outer ring */}
      <div style={ring(60, chromeH)} />
      <div style={ring(50, '#050200')} />
      {/* Pink neon */}
      <div style={ring(44, '#ff2d78', { boxShadow: '0 0 16px 5px #ff2d7866', animation: 'neon-pulse 2.5s ease-in-out 0s infinite' })} />
      <div style={ring(38, '#050200')} />
      {/* Cyan neon */}
      <div style={ring(32, '#00d4ff', { boxShadow: '0 0 14px 4px #00d4ff55', animation: 'neon-pulse 2.8s ease-in-out 1.2s infinite' })} />
      <div style={ring(26, '#050200')} />
      {/* Inner chrome ring */}
      <div style={ring(20, chromeH, { opacity: 0.85 })} />
      <div style={ring(14, '#050200')} />
      {/* Gold accent */}
      <div style={ring(8, '#c9a227', { opacity: 0.55 })} />
      {/* Dark interior */}
      <div style={ring(2, '#030100')} />

      {/* Vinyl */}
      <div style={{ position: 'absolute', top: topPad, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}>
        <SpinningVinyl albumArt={albumArt} isPlaying={isPlaying} size={vinylSize} />
      </div>

    </div>
  )
}

/* ─── Chrome strip ─── */
function ChromeStrip({ height = 8, opacity = 1 }: { height?: number; opacity?: number }) {
  return <div style={{ height, width: '100%', flexShrink: 0, background: chromeH, opacity }} />
}

/* ─── Speaker grille ─── */
function SpeakerGrille({ rows = 4, cols = 12 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, padding: '10px 16px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: 4 }}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(201,162,39,0.28)', boxShadow: '0 0 2px rgba(201,162,39,0.15)' }} />
      ))}
    </div>
  )
}

/* ─── Volume dots ─── */
function VolumeControl({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  const steps = [0.2, 0.4, 0.6, 0.8, 1.0]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(201,162,39,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}>vol</span>
        {steps.map((step) => {
          const active = volume >= step - 0.01
          return (
            <button
              key={step}
              onClick={() => onChange(step)}
              style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: active ? '#c9a227' : 'rgba(201,162,39,0.12)',
                border: `1px solid ${active ? 'rgba(201,162,39,0.8)' : 'rgba(201,162,39,0.25)'}`,
                boxShadow: active ? '0 0 8px 3px rgba(201,162,39,0.55)' : 'none',
                transition: 'all 0.15s',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ─── Knob ─── */
function Knob({ label, color = '#c9a227' }: { label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #d4c090, #3a2808)', border: `2px solid ${color}55`, boxShadow: `0 3px 6px rgba(0,0,0,0.7), 0 0 8px ${color}20`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 3, height: 12, background: color, borderRadius: 2, opacity: 0.85 }} />
      </div>
      <span style={{ fontSize: 10, color: 'rgba(201,162,39,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>{label}</span>
    </div>
  )
}

/* ─── Equalizer bars ─── */
function DecoEqualizer() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 24, opacity: 0.55 }}>
      {[14, 8, 20, 10, 18, 6, 14].map((h, i) => (
        <div key={i} className="eq-bar" style={{ width: 5, height: h, borderRadius: 3, background: i % 3 === 0 ? '#ff2d78' : i % 3 === 1 ? '#c9a227' : '#00d4ff', animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  )
}

/* ─── Logo ─── */
function JukeboxLogo() {
  return (
    <div style={{ textAlign: 'center', lineHeight: 1 }}>
      <div style={{ fontSize: 14, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(201,162,39,0.55)', fontFamily: 'monospace', marginBottom: 6 }}>♪ welcome to ♪</div>
      <div className="font-retro" style={{ fontSize: 56, fontWeight: 900, background: chromeH, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.01em', lineHeight: 1.05 }}>The Outside Inn</div>
      <div style={{ fontSize: 12, letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(201,162,39,0.4)', fontFamily: 'monospace', marginTop: 7 }}>── jukebox ──</div>
    </div>
  )
}

export default function HomeView() {
  const {
    accessToken, deviceId, setActiveView, setActivePlaylist, setActiveArtist, setActiveAlbum,
    currentTrack, isPlaying, setIsPlaying, progressMs, durationMs, queue, skipNext, addToQueue,
  } = useJukeboxStore()

  const [recentTracks, setRecentTracks] = useState<SpotifyTrack[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [loading, setLoading] = useState(true)

  // Inline search dropdown
  const [inlineQuery, setInlineQuery] = useState('')
  const [inlineDropdown, setInlineDropdown] = useState<{ type: 'track' | 'artist' | 'album'; item: SpotifyTrack | SpotifyArtist | SpotifyAlbum }[]>([])
  const [searchError, setSearchError] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const inlineDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLoad = useRef(false)
  const jukeboxPlaylistId = useRef<string | null>(null)

  useEffect(() => {
    if (!accessToken || didLoad.current) return
    didLoad.current = true
    // Playlists fetched independently so a recently-played 403 can't block them
    getUserPlaylists(accessToken).then(setPlaylists).catch(() => {}).finally(() => setLoading(false))
    getRecentlyPlayed(accessToken).then(setRecentTracks).catch(() => {})
  }, [accessToken])

  // Auto-add every played track to the yearly jukebox playlist
  useEffect(() => {
    if (!currentTrack || !accessToken) return
    const uri = currentTrack.uri
    const addToYearlyPlaylist = async () => {
      if (!jukeboxPlaylistId.current) {
        jukeboxPlaylistId.current = await findOrCreateJukeboxPlaylist(accessToken).catch(() => null)
      }
      if (jukeboxPlaylistId.current) {
        addTrackToJukeboxPlaylist(accessToken, jukeboxPlaylistId.current, uri).catch(() => {})
      }
    }
    addToYearlyPlaylist()
  }, [currentTrack?.id, accessToken])

  useEffect(() => {
    if (inlineDebounce.current) clearTimeout(inlineDebounce.current)
    if (!inlineQuery.trim() || inlineQuery.length < 2 || !accessToken) {
      setInlineDropdown([])
      setSearchError('')
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    setSearchError('')
    inlineDebounce.current = setTimeout(async () => {
      try {
        const { tracks, artists, albums } = await searchAll(inlineQuery, accessToken)
        // Interleave all types and take the top 3 most relevant
        const pool: typeof inlineDropdown = []
        for (let i = 0; i < 3; i++) {
          if (tracks[i])  pool.push({ type: 'track',  item: tracks[i] })
          if (artists[i]) pool.push({ type: 'artist', item: artists[i] })
          if (albums[i])  pool.push({ type: 'album',  item: albums[i] })
        }
        setInlineDropdown(pool.slice(0, 3))
        setSearchError(pool.length === 0 ? 'No results found' : '')
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Search failed'
        setSearchError(msg.includes('429') ? 'Too many requests — wait a moment' : 'Search failed')
        setInlineDropdown([])
      } finally {
        setSearchLoading(false)
      }
    }, 800)
    return () => { if (inlineDebounce.current) clearTimeout(inlineDebounce.current) }
  }, [inlineQuery, accessToken])

  const handleInlineSelect = (entry: typeof inlineDropdown[0]) => {
    setInlineQuery('')
    setInlineDropdown([])
    if (entry.type === 'artist') {
      const a = entry.item as SpotifyArtist
      setActiveArtist({ id: a.id, name: a.name, imageUrl: a.images?.[0]?.url })
      setActiveView('artist')
    } else if (entry.type === 'album') {
      const al = entry.item as SpotifyAlbum
      setActiveAlbum(al)
      setActiveView('album')
    } else {
      const t = entry.item as SpotifyTrack
      if (!currentTrack && accessToken && deviceId) {
        playTrack(accessToken, t.uri, deviceId)
      } else {
        addToQueue(t)
      }
    }
  }

  const [volume, setVolume] = useState(0.8)
  const handleVolume = (v: number) => {
    setVolume(v)
    globalPlayer?.setVolume(v)
  }

  const togglePlay = () => {
    if (isPlaying) globalPlayer?.pause(); else globalPlayer?.resume()
    setIsPlaying(!isPlaying)
  }
  const handleSkip = () => {
    const next = skipNext()
    if (next && accessToken && deviceId) playTrack(accessToken, next.uri, deviceId)
    else if (next) globalPlayer?.nextTrack()
  }
  const handlePrev = () => {
    if (accessToken) {
      prevTrackApi(accessToken, deviceId ?? undefined)
        .catch(() => globalPlayer?.previousTrack())
    } else {
      globalPlayer?.previousTrack()
    }
  }

  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0
  const albumArt = currentTrack?.album.images[0]?.url

  // Content padding aligns with inner edge of arch rings (vR=440, gap=2 → 442px from center)
  // max() ensures at least 16px on narrow screens where rings are off-screen
  const pad = 'max(16px, calc(50% - 432px))'
  // Negative pad for edge-to-edge horizontal scrollers
  const negPad = 'min(-16px, calc(432px - 50%))'

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ color: 'var(--retro-cream)' }}>


      {/* ── Top header ── */}
      <div style={{ flexShrink: 0 }}>
        <ChromeStrip height={10} opacity={0.8} />
        <div style={{ display: 'flex', height: 12 }}>
          <div style={{ flex: 1, background: 'linear-gradient(90deg, transparent, #ff2d7855, transparent)' }} />
          <div style={{ flex: 1, background: 'linear-gradient(90deg, transparent, #c9a22777, transparent)' }} />
          <div style={{ flex: 1, background: 'linear-gradient(90deg, transparent, #00d4ff55, transparent)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `44px ${pad}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 70, height: 26, borderRadius: 5, background: 'linear-gradient(180deg, #1a0e04, #0a0500)', border: '1px solid rgba(201,162,39,0.45)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.9)' }} />
            <span style={{ fontSize: 12, color: 'rgba(201,162,39,0.4)', letterSpacing: '0.12em', fontFamily: 'monospace', textTransform: 'uppercase' }}>insert coin</span>
          </div>
          <JukeboxLogo />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { clearToken(); window.location.reload() }} style={{ color: 'rgba(201,162,39,0.45)', padding: 8 }}>
              <svg width="26" height="26" viewBox="0 0 14 14" fill="none">
                <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <>
          {/* Arch — sits above the scrollable body, doesn't scroll */}
          <div style={{ flexShrink: 0, marginTop: -20 }}>
            <ArchCrown albumArt={albumArt} isPlaying={isPlaying} vinylSize={880} topPad={100} />
          </div>
          {/* Neon separator under arch — clipped to jukebox body width (500px from center each side) */}
          <div style={{ flexShrink: 0, margin: '0 max(0px, calc(50% - 500px))' }}>
            <div style={{ height: 3, background: chromeH, opacity: 0.75 }} />
            <div style={{ height: 2, background: '#050200' }} />
            <div style={{ height: 3, background: '#ff2d78', opacity: 0.6, boxShadow: '0 0 8px 2px #ff2d7866', animation: 'neon-pulse 2.5s ease-in-out infinite' }} />
            <div style={{ height: 2, background: '#050200' }} />
            <div style={{ height: 3, background: '#00d4ff', opacity: 0.6, boxShadow: '0 0 8px 2px #00d4ff66', animation: 'neon-pulse 2.8s ease-in-out 1.2s infinite' }} />
            <div style={{ height: 2, background: '#050200' }} />
            <div style={{ height: 3, background: chromeH, opacity: 0.65 }} />
            <div style={{ height: 2, background: '#050200' }} />
            <div style={{ height: 3, background: '#c9a227', opacity: 0.45 }} />
          </div>

          {/* Jukebox body — bordered section aligned with arch curve sides */}
          {/* Strip positions use calc(50% - Xpx) matching arch ring radii at equator (vR=440) */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Left border strips — gap values: 60,50,44,38,32,26,20,14,8,2 → radii 500,490,484,478,472,466,460,454,448,442 */}
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 500px)', bottom: 0, width: 10, background: chrome,    opacity: 0.75, zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 490px)', bottom: 0, width: 6,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 484px)', bottom: 0, width: 6,  background: '#ff2d78', opacity: 0.6, boxShadow: '2px 0 10px 2px #ff2d7855', zIndex: 10, pointerEvents: 'none', animation: 'neon-pulse 2.5s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 478px)', bottom: 0, width: 6,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 472px)', bottom: 0, width: 6,  background: '#00d4ff', opacity: 0.6, boxShadow: '2px 0 10px 2px #00d4ff55', zIndex: 10, pointerEvents: 'none', animation: 'neon-pulse 2.8s ease-in-out 1.2s infinite' }} />
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 466px)', bottom: 0, width: 6,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 460px)', bottom: 0, width: 6,  background: chrome,    opacity: 0.65, zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 454px)', bottom: 0, width: 6,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 448px)', bottom: 0, width: 6,  background: '#c9a227', opacity: 0.45, zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 'calc(50% - 442px)', bottom: 0, width: 2,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />
            {/* Right border strips (mirrored) */}
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 500px)', bottom: 0, width: 10, background: chrome,    opacity: 0.75, zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 490px)', bottom: 0, width: 6,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 484px)', bottom: 0, width: 6,  background: '#ff2d78', opacity: 0.6, boxShadow: '-2px 0 10px 2px #ff2d7855', zIndex: 10, pointerEvents: 'none', animation: 'neon-pulse 2.5s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 478px)', bottom: 0, width: 6,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 472px)', bottom: 0, width: 6,  background: '#00d4ff', opacity: 0.6, boxShadow: '-2px 0 10px 2px #00d4ff55', zIndex: 10, pointerEvents: 'none', animation: 'neon-pulse 2.8s ease-in-out 1.2s infinite' }} />
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 466px)', bottom: 0, width: 6,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 460px)', bottom: 0, width: 6,  background: chrome,    opacity: 0.65, zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 454px)', bottom: 0, width: 6,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 448px)', bottom: 0, width: 6,  background: '#c9a227', opacity: 0.45, zIndex: 10, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, right: 'calc(50% - 442px)', bottom: 0, width: 2,  background: '#050200', zIndex: 10, pointerEvents: 'none' }} />

            {/* ── Now playing — fixed, does not scroll ── */}
            <div style={{ flexShrink: 0, position: 'relative', padding: `18px ${pad} 14px`, background: 'linear-gradient(180deg, rgba(20,10,2,0.98), rgba(14,8,0,1))' }}>

              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                {currentTrack ? (
                  <>
                    <h2 className="font-retro" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 6, color: 'var(--retro-cream)' }}>{currentTrack.name}</h2>
                    <p className="font-typewriter" style={{ fontSize: 17, color: 'var(--retro-gold)' }}>
                      {currentTrack.artists.map((a, i) => (
                        <span key={a.id}>{i > 0 && ' & '}<button onClick={() => { setActiveArtist({ id: a.id, name: a.name }); setActiveView('artist') }} className="hover:underline transition-colors">{a.name}</button></span>
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}><Knob label="vol" /><Knob label="tone" color="#00d4ff" /></div>
                <DecoEqualizer />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={handlePrev} className="active:scale-95 transition-transform" style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(201,162,39,0.35)', color: 'var(--retro-gold)', background: 'rgba(201,162,39,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 14 14" fill="none"><rect x="2" y="2.5" width="3" height="9" rx="1" fill="currentColor" /><path d="M12 2.5L6 7L12 11.5V2.5Z" fill="currentColor" opacity="0.7" /></svg>
                  </button>
                  <button onClick={togglePlay} className="active:scale-95" style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--retro-gold)', color: '#0e0800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px rgba(201,162,39,0.45), 0 3px 10px rgba(0,0,0,0.7)', border: '3px solid rgba(255,240,180,0.3)', transition: 'transform 0.1s' }}>
                    {isPlaying
                      ? <svg width="26" height="26" viewBox="0 0 18 18" fill="currentColor"><rect x="3" y="2" width="4" height="14" rx="1.5" /><rect x="11" y="2" width="4" height="14" rx="1.5" /></svg>
                      : <svg width="26" height="26" viewBox="0 0 18 18" fill="currentColor"><path d="M4 3L16 9L4 15V3Z" /></svg>}
                  </button>
                  <button onClick={handleSkip} className="active:scale-95 transition-transform" style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(201,162,39,0.35)', color: 'var(--retro-gold)', background: 'rgba(201,162,39,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 14 14" fill="none"><path d="M2 2.5L8 7L2 11.5V2.5Z" fill="currentColor" opacity="0.7" /><rect x="9" y="2.5" width="3" height="9" rx="1" fill="currentColor" /></svg>
                  </button>
                </div>
                <DecoEqualizer />
                <div style={{ display: 'flex', gap: 12 }}><Knob label="bass" color="#ff2d78" /><Knob label="treb" color="#a855f7" /></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <VolumeControl volume={volume} onChange={handleVolume} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 52, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(201,162,39,0.28)', borderRadius: (inlineDropdown.length > 0 || searchError || searchLoading) ? '6px 6px 0 0' : 6 }}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ color: searchLoading ? 'var(--retro-gold)' : 'var(--retro-muted)', flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input type="text" value={inlineQuery} onChange={e => setInlineQuery(e.target.value)} placeholder="Search the catalog…"
                      className="flex-1 bg-transparent outline-none font-typewriter"
                      style={{ fontSize: 16, color: 'var(--retro-cream)', caretColor: 'var(--retro-gold)' }} />
                    {inlineQuery && <button onClick={() => { setInlineQuery(''); setInlineDropdown([]); setSearchError('') }} style={{ color: 'var(--retro-muted)', padding: 4 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>}
                  </div>
                  {(searchLoading || searchError) && inlineDropdown.length === 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(14,8,0,0.98)', border: '1px solid rgba(201,162,39,0.28)', borderTop: 'none', borderRadius: '0 0 6px 6px', zIndex: 50, padding: '12px 16px' }}>
                      <p className="font-typewriter" style={{ fontSize: 13, color: searchError ? '#ff6b6b' : 'var(--retro-muted)' }}>
                        {searchLoading ? 'Searching…' : searchError}
                      </p>
                    </div>
                  )}
                  {inlineDropdown.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(14,8,0,0.98)', border: '1px solid rgba(201,162,39,0.28)', borderTop: 'none', borderRadius: '0 0 6px 6px', zIndex: 50, overflow: 'hidden' }}>
                      {inlineDropdown.map((entry, i) => {
                        const isTrack = entry.type === 'track'
                        const isArtist = entry.type === 'artist'
                        const item = entry.item as SpotifyTrack & SpotifyArtist & SpotifyAlbum
                        const thumb = isArtist ? item.images?.[0]?.url : isTrack ? item.album?.images?.[item.album.images.length - 1]?.url : item.images?.[0]?.url
                        const title = item.name
                        const sub = isTrack ? item.artists?.map((a: { name: string }) => a.name).join(', ') : isArtist ? 'Artist' : 'Album'
                        return (
                          <button key={i} onClick={() => handleInlineSelect(entry)}
                            className="hover:bg-white/5 transition-colors"
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', width: '100%', textAlign: 'left', borderBottom: i < inlineDropdown.length - 1 ? '1px solid rgba(201,162,39,0.1)' : 'none' }}>
                            <div style={{ width: 40, height: 40, borderRadius: isArtist ? '50%' : 6, overflow: 'hidden', flexShrink: 0, background: 'rgba(201,162,39,0.1)' }}>
                              {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--retro-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
                              <p style={{ fontSize: 12, color: 'var(--retro-muted)', marginTop: 1 }}>{sub}{isTrack ? ' · tap to queue' : ' · tap to browse'}</p>
                            </div>
                            <span style={{ fontSize: 11, color: 'rgba(201,162,39,0.4)', fontFamily: 'monospace', textTransform: 'uppercase', flexShrink: 0 }}>{entry.type}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Speaker grille — fixed, does not scroll */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ margin: `0 ${pad}` }}><ChromeStrip height={8} opacity={0.5} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: `10px ${pad}`, background: 'rgba(8,4,0,0.95)' }}>
                <SpeakerGrille rows={3} cols={12} />
                <div style={{ padding: '6px 16px', border: '1px solid rgba(201,162,39,0.28)', borderRadius: 3, background: 'rgba(201,162,39,0.04)', whiteSpace: 'nowrap' }}>
                  <span className="font-typewriter" style={{ fontSize: 11, color: 'rgba(201,162,39,0.45)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>stereo hi-fi</span>
                </div>
                <SpeakerGrille rows={3} cols={12} />
              </div>
              <div style={{ margin: `0 ${pad}` }}><ChromeStrip height={8} opacity={0.5} /></div>
            </div>

            {/* Scrollable content inside the bordered body */}
            <div className="overflow-y-auto" style={{ flex: 1 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `14px ${pad} 0` }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,162,39,0.15)' }} />
            <span className="font-retro" style={{ fontSize: 15, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--retro-gold)', opacity: 0.5 }}>Select a Track</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,162,39,0.15)' }} />
          </div>

          {queue.length > 0 && (
            <div style={{ padding: `12px ${pad} 16px` }}>
              <p className="font-typewriter" style={{ fontSize: 13, textTransform: 'uppercase', marginBottom: 10, color: 'var(--retro-muted)', letterSpacing: '0.08em' }}>Up Next</p>
              <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(201,162,39,0.2)' }}>
                {queue.slice(0, 1).map((track, i) => (
                  <div key={track.queueId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: i < queue.length - 1 ? '1px solid rgba(201,162,39,0.1)' : 'none', background: i % 2 === 0 ? 'rgba(201,162,39,0.03)' : 'transparent' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.25)', fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--retro-gold)' }}>{rowLabel(i)}</div>
                    <img src={track.album.images[track.album.images.length - 1]?.url} alt="" style={{ width: 48, height: 48, borderRadius: 6, flexShrink: 0, objectFit: 'cover', opacity: 0.85 }} />
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

          {playlists.length > 0 && (
            <div style={{ padding: `12px ${pad} 14px` }}>
              <p className="font-typewriter" style={{ fontSize: 13, textTransform: 'uppercase', marginBottom: 14, color: 'var(--retro-muted)', letterSpacing: '0.08em' }}>Your Playlists</p>
              <div className="scrollbar-none" style={{ display: 'flex', gap: 14, overflowX: 'auto', margin: `0 ${negPad}`, padding: `0 ${pad} 8px` }}>
                {playlists.map(pl => (
                  <button key={pl.id} onClick={() => { setActivePlaylist(pl); setActiveView('playlist') }}
                    style={{ flexShrink: 0, width: 150, textAlign: 'left' }} className="active:scale-95 transition-transform">
                    <div style={{ width: 150, height: 150, borderRadius: 10, overflow: 'hidden', marginBottom: 8, background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.18)' }}>
                      {pl.images[0]?.url ? <img src={pl.images[0].url} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="36" height="36" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.2, color: 'var(--retro-gold)' }}><path d="M7 8H21M7 12H21M7 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></div>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--retro-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--retro-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.tracks?.total} songs</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: `12px ${pad} 14px` }}>
            <p className="font-typewriter" style={{ fontSize: 13, textTransform: 'uppercase', marginBottom: 14, color: 'var(--retro-muted)', letterSpacing: '0.08em' }}>Recently Played</p>
            {loading ? (
              <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 150, height: 150, borderRadius: 10, flexShrink: 0 }} />)}
              </div>
            ) : (
              <div className="scrollbar-none" style={{ display: 'flex', gap: 14, overflowX: 'auto', margin: `0 ${negPad}`, padding: `0 ${pad} 8px` }}>
                {recentTracks.map(track => (
                  <button key={track.id} onClick={() => { if (!currentTrack && accessToken && deviceId) playTrack(accessToken, track.uri, deviceId); else useJukeboxStore.getState().addToQueue(track) }}
                    style={{ flexShrink: 0, width: 150, textAlign: 'left' }} className="active:scale-95 transition-transform">
                    <div style={{ width: 150, height: 150, borderRadius: 10, overflow: 'hidden', marginBottom: 8, background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.18)' }}>
                      {track.album.images[0]?.url ? <img src={track.album.images[0].url} alt={track.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="36" height="36" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.2, color: 'var(--retro-gold)' }}><circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" /><circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" /></svg></div>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--retro-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--retro-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artists.map(a => a.name).join(', ')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

            </div>{/* end scrollable */}
          </div>{/* end body */}
      </>
    </div>
  )
}
