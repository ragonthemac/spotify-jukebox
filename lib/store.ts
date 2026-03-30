import { create } from 'zustand'
import type { SpotifyTrack } from './spotify'

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
  activeView: 'home' | 'search' | 'queue'
  setActiveView: (v: 'home' | 'search' | 'queue') => void

  // Recently added (for animation)
  recentlyAdded: string | null
  setRecentlyAdded: (id: string | null) => void
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
    set((s) => ({ queue: [...s.queue, queueTrack] }))
    // Flash recently added
    set({ recentlyAdded: track.id })
    setTimeout(() => set({ recentlyAdded: null }), 1500)
  },
  removeFromQueue: (queueId) =>
    set((s) => ({ queue: s.queue.filter((t) => t.queueId !== queueId) })),
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

  // Animation
  recentlyAdded: null,
  setRecentlyAdded: (id) => set({ recentlyAdded: id }),
}))
