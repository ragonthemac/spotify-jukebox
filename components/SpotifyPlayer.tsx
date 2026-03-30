'use client'

import { useEffect, useRef } from 'react'
import { useJukeboxStore } from '@/lib/store'

declare global {
  interface Window {
    Spotify: {
      Player: new (opts: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume: number
      }) => SpotifyPlayerInstance
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

interface SpotifyPlayerInstance {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener: (event: string, cb: (state: unknown) => void) => void
  removeListener: (event: string) => void
  getCurrentState: () => Promise<SpotifyPlaybackState | null>
  setVolume: (vol: number) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  togglePlay: () => Promise<void>
  seek: (positionMs: number) => Promise<void>
  previousTrack: () => Promise<void>
  nextTrack: () => Promise<void>
}

export interface SpotifyPlaybackState {
  paused: boolean
  position: number
  duration: number
  track_window: {
    current_track: {
      id: string
      name: string
      artists: { name: string }[]
      album: { name: string; images: { url: string }[] }
      duration_ms: number
      uri: string
      preview_url: string | null
      explicit: boolean
    }
  }
}

export let globalPlayer: SpotifyPlayerInstance | null = null

export default function SpotifyPlayer() {
  const { accessToken, setDeviceId, setIsPlaying, setCurrentTrack, setProgressMs, setDurationMs, skipNext } =
    useJukeboxStore()
  const playerRef = useRef<SpotifyPlayerInstance | null>(null)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Jukebox',
        getOAuthToken: (cb) => cb(accessToken),
        volume: 0.7,
      })

      playerRef.current = player
      globalPlayer = player

      player.addListener('ready', (state) => {
        const { device_id } = state as { device_id: string }
        setDeviceId(device_id)
      })

      player.addListener('not_ready', () => {
        console.warn('Spotify player offline')
      })

      player.addListener('player_state_changed', (state) => {
        if (!state) return
        const s = state as SpotifyPlaybackState
        const track = s.track_window.current_track

        setIsPlaying(!s.paused)
        setProgressMs(s.position)
        setDurationMs(s.duration)
        setCurrentTrack({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album as { name: string; images: { url: string; width: number; height: number }[] },
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          uri: track.uri,
          explicit: track.explicit,
        })
      })

      player.addListener('autoplay_failed', () => {
        const next = skipNext()
        if (next) {
          import('@/lib/spotify').then(({ playTrack }) => {
            const { accessToken: tok, deviceId: did } = useJukeboxStore.getState()
            if (tok && did) playTrack(tok, next.uri, did)
          })
        }
      })

      player.connect()
    }

    return () => {
      playerRef.current?.disconnect()
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [accessToken, setDeviceId, setIsPlaying, setCurrentTrack, setProgressMs, setDurationMs, skipNext])

  // Tick progress
  useEffect(() => {
    const { isPlaying } = useJukeboxStore.getState()
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        useJukeboxStore.setState((s) => ({
          progressMs: Math.min(s.progressMs + 500, s.durationMs),
        }))
      }, 500)
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [])

  return null
}
