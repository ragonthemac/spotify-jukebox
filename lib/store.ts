import { create } from 'zustand'
import type { SpotifyTrack, SpotifyAlbum, SpotifyPlaylist } from './spotify'

export interface QueueTrack extends SpotifyTrack {
  queueId: string
  addedAt: number
}

interface JukeboxState {
  // Auth
  accessToken: string | null
  setAccessToken: (token: string | null) => void

  // Playback
  deviceId: string | null
  setDeviceId: (id: string) => void
  isPlaying: boolean
  setIsPlaying: (v: boolean) => void
  currentTrack: SpotifyTrack | null
  setCurrentTrack: (track: SpotifyTrack | null) => void
  progressMs: number
  setProgressMs: (ms: number) => void
  durationMs: number
  setDurationMs: (ms: number) => void

  // Queue
  queue: QueueTrack[]
  addToQueue: (track: SpotifyTrack) => void
  removeFromQueue: (queueId: string) => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  importQueue: (tracks: SpotifyTrack[]) => void
  setQueue: (tracks: SpotifyTrack[]) => void
  skipNext: () => QueueTrack | null
  clearQueue: () => void

  // Search
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: SpotifyTrack[]
  setSearchResults: (r: SpotifyTrack[]) => void
  isSearching: boolean
  setIsSearching: (v: boolean) => void

  // View
  activeView: 'home' | 'search' | 'queue' | 'artist' | 'album' | 'playlist'
  setActiveView: (v: 'home' | 'search' | 'queue' | 'artist' | 'album' | 'playlist') => void

  // Artist page
  activeArtist: { id: string; name: string; imageUrl?: string } | null
  setActiveArtist: (artist: { id: string; name: string; imageUrl?: string } | null) => void

  // Album page
  activeAlbum: SpotifyAlbum | null
  setActiveAlbum: (album: SpotifyAlbum | null) => void

  // Playlist page
  activePlaylist: SpotifyPlaylist | null
  setActivePlaylist: (playlist: SpotifyPlaylist | null) => void

  // Play history (local, replaces restricted Spotify API)
  playHistory: SpotifyTrack[]
  addToHistory: (track: SpotifyTrack) => void

  // Recently added (for animation)
  recentlyAdded: string | null
  setRecentlyAdded: (id: string | null) => void

  // On-screen keyboard
  keyboardVisible: boolean
  setKeyboardVisible: (v: boolean) => void
  onKeyPress: ((key: string) => void) | null
  setOnKeyPress: (cb: ((key: string) => void) | null) => void
}

export const useJukeboxStore = create<JukeboxState>((set, get) => ({
  // Auth
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),

  // Playback
  deviceId: null,
  setDeviceId: (id) => set({ deviceId: id }),
  isPlaying: false,
  setIsPlaying: (v) => set({ isPlaying: v }),
  currentTrack: null,
  setCurrentTrack: (track) => set({ currentTrack: track }),
  progressMs: 0,
  setProgressMs: (ms) => set({ progressMs: ms }),
  durationMs: 0,
  setDurationMs: (ms) => set({ durationMs: ms }),

  // Queue
  queue: [],
  addToQueue: (track) => {
    const queueTrack: QueueTrack = {
      ...track,
      queueId: `${track.id}-${Date.now()}-${Math.random()}`,
      addedAt: Date.now(),
    }
    set((s) => ({ queue: [queueTrack, ...s.queue] }))
    // Flash recently added
    set({ recentlyAdded: track.id })
    setTimeout(() => set({ recentlyAdded: null }), 1500)
  },
  removeFromQueue: (queueId) =>
    set((s) => ({ queue: s.queue.filter((t) => t.queueId !== queueId) })),
  reorderQueue: (fromIndex, toIndex) => {
    const { queue } = get()
    const newQueue = [...queue]
    const [item] = newQueue.splice(fromIndex, 1)
    newQueue.splice(toIndex, 0, item)
    set({ queue: newQueue })
  },
  importQueue: (tracks) => {
    const { queue } = get()
    if (queue.length > 0) return
    const queueTracks: QueueTrack[] = tracks.map((t, i) => ({
      ...t,
      queueId: `${t.id}-import-${i}-${Date.now()}`,
      addedAt: Date.now() + i,
    }))
    set({ queue: queueTracks })
  },
  setQueue: (tracks) => {
    const queueTracks: QueueTrack[] = tracks.map((t, i) => ({
      ...t,
      queueId: `${t.id}-set-${i}-${Date.now()}`,
      addedAt: Date.now() + i,
    }))
    set({ queue: queueTracks })
  },
  skipNext: () => {
    const { queue } = get()
    if (!queue.length) return null
    const [next, ...rest] = queue
    set({ queue: rest })
    return next
  },
  clearQueue: () => set({ queue: [] }),

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  searchResults: [],
  setSearchResults: (r) => set({ searchResults: r }),
  isSearching: false,
  setIsSearching: (v) => set({ isSearching: v }),

  // View
  activeView: 'home',
  setActiveView: (v) => set({ activeView: v }),

  // Artist
  activeArtist: null,
  setActiveArtist: (artist) => set({ activeArtist: artist }),

  // Album
  activeAlbum: null,
  setActiveAlbum: (album) => set({ activeAlbum: album }),

  // Playlist
  activePlaylist: null,
  setActivePlaylist: (playlist) => set({ activePlaylist: playlist }),

  // Play history
  playHistory: [],
  addToHistory: (track) => set((state) => {
    const filtered = state.playHistory.filter(t => t.id !== track.id)
    return { playHistory: [track, ...filtered].slice(0, 20) }
  }),

  // Animation
  recentlyAdded: null,
  setRecentlyAdded: (id) => set({ recentlyAdded: id }),

  // On-screen keyboard
  keyboardVisible: false,
  setKeyboardVisible: (v) => set({ keyboardVisible: v }),
  onKeyPress: null,
  setOnKeyPress: (cb) => set({ onKeyPress: cb }),
}))
