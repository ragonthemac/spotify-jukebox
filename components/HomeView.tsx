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

function rowLabel(i: number) {
  return `${String.fromCharCode(65 + Math.floor(i / 9))}${(i % 9) + 1}`
}

const CHROME = 'linear-gradient(90deg, #5a3800, #c9a227, #f5e070, #f0c84a, #f5e070, #c9a227, #5a3800)'

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
  const [volume, setVolume] = useState(0.8)
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
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: '#080400', color: 'var(--retro-cream)', position: 'relative' }}
    >
      {/* ── Pillar glows (decorative, absolute) ── */}
      <div style={{
        position: 'absolute', left: 0, top: '12%', bottom: '12%', width: '5px', zIndex: 20, pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent, #f5785a 20%, #f5785a 80%, transparent)',
        boxShadow: '3px 0 18px 4px rgba(245,120,90,0.55)',
        borderRadius: '0 3px 3px 0',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: '12%', bottom: '12%', width: '5px', zIndex: 20, pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent, #5bc8e8 20%, #5bc8e8 80%, transparent)',
        boxShadow: '-3px 0 18px 4px rgba(91,200,232,0.55)',
        borderRadius: '3px 0 0 3px',
      }} />

      {/* ── Top chrome strip ── */}
      <div style={{ height: '5px', background: CHROME, flexShrink: 0, boxShadow: '0 2px 8px rgba(201,162,39,0.4)' }} />

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-2 pb-1.5">
        <span className="font-retro text-xs tracking-widest uppercase" style={{ color: 'var(--retro-gold)', letterSpacing: '0.22em' }}>
          ♪ Jukebox
        </span>
        <div className="flex items-center gap-4">
          <button onClick={() => { setQuery(''); setActiveView('search') }} style={{ color: 'var(--retro-muted)' }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={() => { clearToken(); window.location.reload() }} style={{ color: 'var(--retro-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg" style={{ background: 'rgba(201,162,39,0.07)', border: '1px solid rgba(201,162,39,0.22)' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--retro-muted)', flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the catalog…"
            className="flex-1 bg-transparent outline-none"
            style={{ color: 'var(--retro-cream)', caretColor: 'var(--retro-gold)', fontSize: '13px' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--retro-muted)' }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
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
                  <div className="flex-1">
                    <div className="h-3 w-32 rounded skeleton mb-2" />
                    <div className="h-2.5 w-20 rounded skeleton" />
                  </div>
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

          {/* ══════════════════════════════════════
              ARCH CROWN — spinning vinyl inside
          ══════════════════════════════════════ */}
          <div className="flex-shrink-0" style={{ position: 'relative', paddingBottom: '0' }}>
            {/* Outer chrome arch frame */}
            <div style={{
              margin: '0 18px',
              padding: '3px 3px 0 3px',
              borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              background: CHROME,
              boxShadow: '0 0 30px rgba(201,162,39,0.35)',
            }}>
              {/* Arch interior */}
              <div style={{
                position: 'relative',
                height: '175px',
                borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
                overflow: 'hidden',
                background: 'radial-gradient(ellipse at 50% 115%, #f5c030 0%, #d45030 28%, #2a8888 58%, #0d0520 85%)',
                boxShadow: 'inset 0 -10px 30px rgba(0,0,0,0.6)',
              }}>
                {/* Arch glow halo at top */}
                <div style={{
                  position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
                  width: '100px', height: '24px', borderRadius: '50%',
                  background: 'rgba(255,220,90,0.35)', filter: 'blur(10px)',
                }} />

                {/* ♪ JUKEBOX ♪ marquee text */}
                <div style={{
                  position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '10px', fontWeight: 900,
                  letterSpacing: '0.35em', textTransform: 'uppercase',
                  color: 'rgba(255,240,170,0.95)',
                  textShadow: '0 0 14px rgba(255,210,80,1), 0 0 30px rgba(255,180,40,0.7)',
                  whiteSpace: 'nowrap',
                }}>
                  ♪ &nbsp; JUKEBOX &nbsp; ♪
                </div>

                {/* Colour band strips (Wurlitzer bubble tubes) */}
                {[
                  { top: 38, color: 'rgba(245,160,40,0.22)', h: 8 },
                  { top: 50, color: 'rgba(220,80,60,0.18)', h: 6 },
                  { top: 60, color: 'rgba(40,180,180,0.18)', h: 6 },
                ].map((band, i) => (
                  <div key={i} style={{
                    position: 'absolute', left: '12%', right: '12%',
                    top: `${band.top}px`, height: `${band.h}px`,
                    background: band.color, borderRadius: '4px',
                    filter: 'blur(3px)',
                  }} />
                ))}

                {/* Vinyl — centered, bottom half clipped */}
                <div style={{
                  position: 'absolute',
                  bottom: '-100px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}>
                  <SpinningVinyl albumArt={albumArt} isPlaying={isPlaying} size={200} />
                </div>
              </div>
            </div>

            {/* Chrome trim below arch */}
            <div style={{
              margin: '0 12px',
              height: '9px',
              background: CHROME,
              boxShadow: '0 3px 12px rgba(201,162,39,0.45)',
            }} />
            <div style={{
              margin: '4px 20px 0',
              height: '2px',
              background: 'rgba(201,162,39,0.3)',
            }} />
          </div>

          {/* ══════════════════════════════════════
              SONG INFO
          ══════════════════════════════════════ */}
          <div className="px-5 pt-4 pb-1 text-center">
            {currentTrack ? (
              <>
                <h2 className="font-retro font-bold leading-tight mb-1" style={{ fontSize: '19px', color: 'var(--retro-cream)' }}>
                  {currentTrack.name}
                </h2>
                <p className="font-typewriter" style={{ fontSize: '12px', color: 'var(--retro-gold)' }}>
                  {currentTrack.artists.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && <span style={{ color: 'var(--retro-muted)' }}> &amp; </span>}
                      <button
                        onClick={() => { setActiveArtist({ id: a.id, name: a.name }); setActiveView('artist') }}
                        className="hover:underline transition-colors"
                      >
                        {a.name}
                      </button>
                    </span>
                  ))}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-retro font-bold" style={{ fontSize: '19px', color: 'var(--retro-muted)' }}>No track playing</h2>
                <p className="font-typewriter mt-1" style={{ fontSize: '12px', color: 'var(--retro-muted)' }}>Search the catalog above</p>
              </>
            )}
          </div>

          {/* ══════════════════════════════════════
              PROGRESS BAR
          ══════════════════════════════════════ */}
          {currentTrack && (
            <div className="px-5 mt-2 mb-1">
              <div style={{ height: '3px', background: 'rgba(201,162,39,0.15)', borderRadius: '99px', overflow: 'hidden', marginBottom: '4px' }}>
                <div style={{
                  width: `${progress}%`, height: '100%',
                  background: 'linear-gradient(90deg, #c9a227, #f5e070)',
                  borderRadius: '99px',
                  transition: 'width 0.5s linear',
                  boxShadow: '0 0 6px rgba(201,162,39,0.7)',
                }} />
              </div>
              <div className="flex justify-between">
                <span className="font-typewriter" style={{ fontSize: '10px', color: 'var(--retro-muted)' }}>{formatDuration(progressMs)}</span>
                <span className="font-typewriter" style={{ fontSize: '10px', color: 'var(--retro-muted)' }}>{formatDuration(durationMs)}</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              CONTROLS + VOLUME
          ══════════════════════════════════════ */}
          <div className="flex flex-col items-center gap-3 px-5 py-3">
            <div className="flex items-center gap-5">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(145deg, #e8c040, #c9a227, #a07820)',
                  color: '#0e0800',
                  boxShadow: '0 0 22px rgba(201,162,39,0.55), 0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,240,120,0.4)',
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

              {/* Skip */}
              {queue.length > 0 && (
                <button
                  onClick={handleSkip}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={{
                    border: '1.5px solid rgba(201,162,39,0.4)',
                    color: 'var(--retro-gold)',
                    background: 'rgba(201,162,39,0.08)',
                    boxShadow: '0 0 8px rgba(201,162,39,0.2)',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2.5L8 7L2 11.5V2.5Z" fill="currentColor" opacity="0.7" />
                    <rect x="9" y="2.5" width="3" height="9" rx="1" fill="currentColor" />
                  </svg>
                </button>
              )}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 w-full" style={{ maxWidth: '220px' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--retro-muted)', flexShrink: 0 }}>
                <path d="M2 5H4.5L8 2V12L4.5 9H2V5Z" fill="currentColor" />
                {volume > 0.3 && <path d="M10 4.5C11 5.5 11 8.5 10 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
                {volume > 0.65 && <path d="M11.5 3C13 4.5 13 9.5 11.5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
              </svg>
              <input
                type="range" min={0} max={1} step={0.02} value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setVolume(v)
                  globalPlayer?.setVolume(v)
                }}
                className="flex-1"
                style={{ accentColor: 'var(--retro-gold)' }}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════
              CHROME SEPARATOR — "SELECT A TRACK"
          ══════════════════════════════════════ */}
          <div style={{ height: '5px', background: CHROME, boxShadow: '0 2px 10px rgba(201,162,39,0.4)' }} />

          {/* ══════════════════════════════════════
              LOWER BODY — speaker grille texture
          ══════════════════════════════════════ */}
          <div style={{
            backgroundImage: [
              'repeating-linear-gradient(45deg,  rgba(201,162,39,0.045) 0, rgba(201,162,39,0.045) 1px, transparent 0, transparent 50%)',
              'repeating-linear-gradient(-45deg, rgba(201,162,39,0.045) 0, rgba(201,162,39,0.045) 1px, transparent 0, transparent 50%)',
            ].join(', '),
            backgroundSize: '13px 13px',
          }}>
            {/* Section label */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.35))' }} />
              <span className="font-retro text-xs uppercase" style={{ color: 'rgba(201,162,39,0.55)', letterSpacing: '0.22em' }}>Select a Track</span>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,162,39,0.35), transparent)' }} />
            </div>

            {/* Queue */}
            {queue.length > 0 && (
              <div className="px-3 mb-4">
                <p className="font-typewriter text-xs uppercase mb-2 px-1" style={{ color: 'var(--retro-muted)' }}>Up Next</p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,162,39,0.22)' }}>
                  {queue.slice(0, 8).map((track, i) => (
                    <div key={track.queueId}
                      className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0"
                      style={{ borderColor: 'rgba(201,162,39,0.1)', background: i % 2 === 0 ? 'rgba(201,162,39,0.04)' : 'transparent' }}
                    >
                      <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 font-typewriter text-xs font-bold"
                        style={{ background: 'rgba(201,162,39,0.14)', color: 'var(--retro-gold)', border: '1px solid rgba(201,162,39,0.28)' }}>
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
        </div>
      )}
    </div>
  )
}
