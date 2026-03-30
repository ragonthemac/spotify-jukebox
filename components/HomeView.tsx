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

/* ─────────────────────────────────────────────
   Design-space helpers (1080 × 1920 canvas)
───────────────────────────────────────────── */
const dw = (px: number) => `${(px / 1080 * 100).toFixed(3)}vw`
const dh = (px: number) => `${(px / 1920 * 100).toFixed(3)}vh`
// shorthand for pixel size at 1080px
const ds = (px: number) => ({
  width: dw(px), height: dw(px),   // square using vw
})

function rowLabel(i: number) {
  return `${String.fromCharCode(65 + Math.floor(i / 3))}${(i % 3) + 1}`
}

/* Arrow decoration component used for section headers */
function SectionArrow({ flip }: { flip?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', transform: flip ? 'scaleX(-1)' : undefined }}>
      {/* Triangle tip */}
      <div style={{
        width: 0, height: 0,
        borderTop: `${dh(12)} solid transparent`,
        borderBottom: `${dh(12)} solid transparent`,
        borderRight: `${dw(16)} solid #D9D9D9`,
        flexShrink: 0,
      }} />
      {/* Gray bar */}
      <div style={{ width: dw(43), height: dh(12), background: '#D9D9D9', flexShrink: 0 }} />
      {/* Gradient shaft */}
      <div style={{
        width: dw(99), height: dh(23),
        background: 'linear-gradient(270deg, #5F0000 24.36%, #FF6F00 102.02%)',
        borderRadius: 2, flexShrink: 0,
      }} />
    </div>
  )
}

function ProgressDots({ total = 5, active = 0 }: { total?: number; active?: number }) {
  return (
    <div style={{ display: 'flex', gap: dw(12) }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: dw(7), height: dw(7), borderRadius: '50%',
          background: i === active ? '#FFA500' : 'rgba(255,165,0,0.4)',
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
  const [volume, setVolume] = useState(0.8)
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

  // 6 items for track grid — prefer queue, then recently played
  const gridTracks: SpotifyTrack[] = queue.length > 0
    ? queue.slice(0, 6).map(qt => qt as unknown as SpotifyTrack)
    : recentTracks.slice(0, 6)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* ── Jukebox photo overlay (mix-blend-mode: lighten removes black bg) ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/spotify-jukebox/jukebox.png"
        alt=""
        style={{
          position: 'absolute',
          width: dw(1079), height: dh(1914),
          left: dw(1), top: dh(163),
          mixBlendMode: 'lighten',
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {/* ── White glowing panel (jukebox body interior/screen) ── */}
      <div style={{
        position: 'absolute',
        left: dw(-166), top: dh(71),
        width: dw(1429), height: dh(1034),
        background: '#FFFFFF',
        border: `${dw(0.7)} solid #000`,
        boxShadow: `0 0 ${dw(12)} #FFF200`,
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* ── Black arch background rectangle ── */}
      <div style={{
        position: 'absolute',
        left: dw(227), top: dh(390),
        width: dw(615), height: dh(305),
        background: '#000',
        zIndex: 2,
      }} />

      {/* ── Arch vinyl viewport (arched top, vinyl spinning inside) ── */}
      <div style={{
        position: 'absolute',
        left: dw(270), top: dh(422),
        width: dw(539), height: dh(272),
        borderRadius: `${dw(500)} ${dw(500)} 0 0`,
        overflow: 'hidden',
        background: '#000',
        zIndex: 3,
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: '50%',
          transform: 'translateX(-50%)',
        }}>
          <SpinningVinyl albumArt={albumArt} isPlaying={isPlaying} size={510} />
        </div>
      </div>

      {/* ── Utility icons (top-right, above white panel) ── */}
      <div style={{
        position: 'absolute',
        right: dw(20), top: dh(80),
        display: 'flex', gap: dw(16),
        zIndex: 10,
      }}>
        <button
          onClick={() => { setQuery(''); setActiveView('search') }}
          style={{ color: 'rgba(0,0,0,0.5)', padding: `${dh(4)} ${dw(4)}` }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={() => { clearToken(); window.location.reload() }}
          style={{ color: 'rgba(0,0,0,0.5)', padding: `${dh(4)} ${dw(4)}` }}
        >
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ─────────────────────────────────────
          SONG INFO — centered at y≈38.9vh
      ───────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        left: '50%', transform: 'translateX(-50%)',
        top: dh(747),
        width: dw(540),
        zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dh(8),
      }}>
        {/* Track title + artist */}
        <div style={{ textAlign: 'center' }}>
          {currentTrack ? (
            <>
              <p style={{ fontSize: dw(22), fontWeight: 700, color: '#1a0a00', lineHeight: 1.25, marginBottom: dh(4) }}>
                {currentTrack.name}
              </p>
              <p style={{ fontSize: dw(14), color: '#5a3000' }}>
                {currentTrack.artists.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && ', '}
                    <button
                      onClick={() => { setActiveArtist({ id: a.id, name: a.name }); setActiveView('artist') }}
                      style={{ color: '#FF6F00' }}
                      className="hover:underline"
                    >
                      {a.name}
                    </button>
                  </span>
                ))}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: dw(20), fontWeight: 600, color: 'rgba(50,20,0,0.6)' }}>No track playing</p>
              <p style={{ fontSize: dw(13), color: 'rgba(50,20,0,0.4)', marginTop: dh(4) }}>Search the catalog below</p>
            </>
          )}
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: dw(20) }}>
          <button
            onClick={togglePlay}
            style={{
              width: dw(52), height: dw(52), borderRadius: '50%',
              background: '#FFA500',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              boxShadow: `0 ${dh(3)} ${dw(12)} rgba(255,165,0,0.6)`,
              border: `${dw(2)} solid #cc7700`,
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
            <button
              onClick={handleSkip}
              style={{
                width: dw(38), height: dw(38), borderRadius: '50%',
                background: 'rgba(255,165,0,0.2)',
                border: `${dw(1.5)} solid #FFA500`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#cc7700',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2.5L8 7L2 11.5V2.5Z" fill="currentColor" opacity="0.8" />
                <rect x="9" y="2.5" width="3" height="9" rx="1" fill="currentColor" />
              </svg>
            </button>
          )}

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: dw(8), width: dw(160) }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#cc7700', flexShrink: 0 }}>
              <path d="M2 5H4.5L8 2V12L4.5 9H2V5Z" fill="currentColor" />
              {volume > 0.35 && <path d="M10 4.5C11 5.5 11 8.5 10 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
              {volume > 0.65 && <path d="M11.5 3C13 4.5 13 9.5 11.5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
            </svg>
            <input
              type="range" min={0} max={1} step={0.02} value={volume}
              onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); globalPlayer?.setVolume(v) }}
              style={{ flex: 1, accentColor: '#FFA500' }}
            />
          </div>
        </div>

        {/* Progress bar */}
        {currentTrack && (
          <div style={{ width: '100%' }}>
            <div style={{ height: dh(4), background: 'rgba(0,0,0,0.1)', borderRadius: 99, overflow: 'hidden', marginBottom: dh(4) }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: '#FFA500',
                borderRadius: 99, transition: 'width 0.5s linear',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: dw(11), color: 'rgba(0,0,0,0.4)' }}>{formatDuration(progressMs)}</span>
              <span style={{ fontSize: dw(11), color: 'rgba(0,0,0,0.4)' }}>{formatDuration(durationMs)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────
          DARK BODY SECTION — y≈48.85vh
      ───────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        left: dw(202), top: dh(938),
        width: dw(681), height: dh(519),
        background: '#260C01',
        zIndex: 4,
        overflow: 'hidden',
      }} />

      {/* ── Search bar — y≈49.74vh ── */}
      <div style={{
        position: 'absolute',
        left: dw(236), top: dh(955),
        width: dw(607), height: dh(43),
        border: `${dh(1)} solid #FFA500`,
        borderRadius: dw(10),
        background: 'rgba(255,255,255,0.95)',
        display: 'flex', alignItems: 'center', gap: dw(8),
        padding: `0 ${dw(12)}`,
        zIndex: 6,
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#cc7700', flexShrink: 0 }}>
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the catalog…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: dw(13), color: '#2a1000',
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ color: '#cc7700' }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────
          SEARCH RESULTS OVERLAY
          (replaces My Playlists + Recently Played when searching)
      ───────────────────────────────────── */}
      {query && (
        <div style={{
          position: 'absolute',
          left: dw(202), top: dh(1010),
          width: dw(681), height: dh(440),
          background: '#260C01',
          overflowY: 'auto',
          padding: `${dh(12)} ${dw(20)}`,
          zIndex: 7,
        }}>
          {isSearching ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: dw(12), padding: `${dh(8)} 0`, alignItems: 'center' }}>
                <div style={{ width: dw(40), height: dw(40), borderRadius: dw(6), flexShrink: 0 }} className="skeleton" />
                <div>
                  <div style={{ width: dw(160), height: dh(10), borderRadius: 4, marginBottom: dh(6) }} className="skeleton" />
                  <div style={{ width: dw(100), height: dh(8), borderRadius: 4 }} className="skeleton" />
                </div>
              </div>
            ))
          ) : (
            <>
              {artistResults.map((artist) => (
                <button key={artist.id}
                  onClick={() => { setActiveArtist({ id: artist.id, name: artist.name, imageUrl: artist.images[0]?.url }); setActiveView('artist') }}
                  style={{ display: 'flex', alignItems: 'center', gap: dw(12), width: '100%', textAlign: 'left', padding: `${dh(8)} 0` }}
                >
                  <div style={{ width: dw(40), height: dw(40), borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}>
                    {artist.images[0]?.url && <img src={artist.images[0].url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: dw(14), color: '#fff', fontWeight: 500 }}>{artist.name}</p>
                    <p style={{ fontSize: dw(11), color: 'rgba(255,255,255,0.4)' }}>Artist</p>
                  </div>
                </button>
              ))}
              {trackResults.map((track, i) => <TrackRow key={track.id + i} track={track} />)}
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────
          MY PLAYLISTS SECTION — y≈54.22vh
      ───────────────────────────────────── */}
      {!query && (
        <div style={{
          position: 'absolute',
          left: dw(229), top: dh(1041),
          width: dw(614), height: dh(170),
          zIndex: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dh(21),
        }}>
          {/* Section header */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <SectionArrow />
            <span style={{ fontSize: dw(14), color: '#FFA500', letterSpacing: '-0.04em', fontFamily: 'Inter, system-ui, sans-serif', whiteSpace: 'nowrap' }}>
              My Playlists
            </span>
            <SectionArrow flip />
          </div>

          {/* Playlist cards row */}
          <div style={{ width: '100%', overflowX: 'auto', display: 'flex', gap: dw(8), paddingBottom: dh(4) }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ width: dw(90), height: dh(90), borderRadius: dw(6), flexShrink: 0 }} className="skeleton" />
                ))
              : playlists.length > 0
                ? playlists.map((pl) => (
                    <button key={pl.id}
                      onClick={() => { setActivePlaylist(pl); setActiveView('playlist') }}
                      style={{ flexShrink: 0, width: dw(90), textAlign: 'left' }}
                    >
                      <div style={{ width: dw(90), height: dh(90), borderRadius: dw(6), overflow: 'hidden', background: 'rgba(255,255,255,0.15)', marginBottom: dh(4) }}>
                        {pl.images[0]?.url
                          ? <img src={pl.images[0].url} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.4, color: '#FFA500' }}>
                                <path d="M7 8H21M7 12H21M7 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </div>
                        }
                      </div>
                      <p style={{ fontSize: dw(10), color: '#FFA500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</p>
                    </button>
                  ))
                : recentTracks.slice(0, 6).map((track, i) => {
                    const art = track.album.images[0]?.url
                    return (
                      <button key={track.id + i}
                        onClick={() => {
                          if (!currentTrack && accessToken && deviceId) playTrack(accessToken, track.uri, deviceId)
                          else useJukeboxStore.getState().addToQueue(track)
                        }}
                        style={{ flexShrink: 0, width: dw(90), textAlign: 'left' }}
                      >
                        <div style={{ width: dw(90), height: dh(90), borderRadius: dw(6), overflow: 'hidden', background: 'rgba(255,255,255,0.15)', marginBottom: dh(4) }}>
                          {art && <img src={art} alt={track.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <p style={{ fontSize: dw(10), color: '#FFA500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</p>
                      </button>
                    )
                  })
            }
          </div>

          {/* Progress dots */}
          <ProgressDots total={5} active={0} />
        </div>
      )}

      {/* ─────────────────────────────────────
          RECENTLY PLAYED — y≈65.36vh
          3-column × 2-row track selector grid
      ───────────────────────────────────── */}
      {!query && (
        <div style={{
          position: 'absolute',
          left: dw(229), top: dh(1255),
          width: dw(614), height: dh(171),
          zIndex: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dh(21),
        }}>
          {/* Section header */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <SectionArrow />
            <span style={{ fontSize: dw(14), color: '#FFA500', letterSpacing: '-0.04em', fontFamily: 'Inter, system-ui, sans-serif', whiteSpace: 'nowrap' }}>
              Recently Played
            </span>
            <SectionArrow flip />
          </div>

          {/* 3×2 track selector grid */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: dw(30) }}>
            {[0, 1, 2].map((col) => (
              <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: dh(20), flex: 1 }}>
                {[0, 1].map((row) => {
                  const idx = col * 2 + row
                  const track = gridTracks[idx]
                  if (!track) return (
                    <div key={row} style={{ display: 'flex', gap: dw(4), alignItems: 'flex-start', opacity: 0.3 }}>
                      <div style={{ background: '#FFA500', borderRadius: dw(6), padding: `${dh(4)} ${dw(8)}`, fontSize: dw(14), color: '#000', fontFamily: 'Inter, system-ui', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {rowLabel(idx)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ background: '#FFF', border: `${dw(2)} solid #FF0000`, padding: `${dh(4)} ${dw(8)}`, fontSize: dw(14), color: '#888' }}>—</div>
                        <div style={{ background: '#FFF', border: `${dw(2)} solid #FF0000`, padding: `${dh(2)} ${dw(8)}`, fontSize: dw(7), color: '#aaa' }}>—</div>
                      </div>
                    </div>
                  )
                  return (
                    <button key={row}
                      onClick={() => {
                        if (!currentTrack && accessToken && deviceId) playTrack(accessToken, (track as any).uri, deviceId)
                        else useJukeboxStore.getState().addToQueue(track as any)
                      }}
                      style={{ display: 'flex', gap: dw(4), alignItems: 'flex-start', textAlign: 'left', width: '100%' }}
                    >
                      {/* Orange label badge */}
                      <div style={{
                        background: '#FFA500', borderRadius: dw(6),
                        padding: `${dh(4)} ${dw(8)}`,
                        fontSize: dw(14), color: '#000',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        whiteSpace: 'nowrap', flexShrink: 0,
                        lineHeight: 1.2,
                      }}>
                        {rowLabel(idx)}
                      </div>
                      {/* Track info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          background: '#FFFFFF', border: `${dw(2)} solid #FF0000`,
                          padding: `${dh(4)} ${dw(8)}`,
                          fontSize: dw(12), color: '#000',
                          fontFamily: 'Inter, system-ui, sans-serif',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {(track as any).name || 'Track'}
                        </div>
                        <div style={{
                          background: '#FFFFFF', border: `${dw(2)} solid #FF0000`,
                          padding: `${dh(2)} ${dw(8)}`,
                          fontSize: dw(7), color: '#000',
                          fontFamily: 'Inter, system-ui, sans-serif',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {(track as any).artists?.map((a: {name: string}) => a.name).join(', ') || 'Artist'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <ProgressDots total={5} active={0} />
        </div>
      )}

    </div>
  )
}
