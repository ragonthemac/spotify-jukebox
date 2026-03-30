'use client'

import { useJukeboxStore } from '@/lib/store'
import HomeView from './HomeView'
import SearchView from './SearchView'
import QueueView from './QueueView'
import BottomPlayer from './BottomPlayer'
import BottomNav from './BottomNav'
import SpotifyPlayer from './SpotifyPlayer'

export default function JukeboxMain() {
  const activeView = useJukeboxStore((s) => s.activeView)

  return (
    <div className="h-full flex flex-col bg-jukebox overflow-hidden">
      {/* Spotify Web Playback SDK (hidden) */}
      <SpotifyPlayer />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        {activeView === 'home' && <HomeView />}
        {activeView === 'search' && <SearchView />}
        {activeView === 'queue' && <QueueView />}
      </div>

      {/* Persistent bottom player */}
      <BottomPlayer />

      {/* Bottom nav */}
      <BottomNav />
    </div>
  )
}
