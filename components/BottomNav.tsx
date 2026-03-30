'use client'

import { useJukeboxStore } from '@/lib/store'

const tabs = [
  {
    id: 'home' as const,
    label: 'Now Playing',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke={active ? '#ff2d78' : 'currentColor'} strokeWidth="1.5" />
        <circle cx="11" cy="11" r="4" stroke={active ? '#ff2d78' : 'currentColor'} strokeWidth="1.5" />
        <circle cx="11" cy="11" r="1.5" fill={active ? '#ff2d78' : 'currentColor'} />
      </svg>
    ),
  },
  {
    id: 'search' as const,
    label: 'Search',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="10" cy="10" r="6.5" stroke={active ? '#00d4ff' : 'currentColor'} strokeWidth="1.5" />
        <path d="M15 15L19 19" stroke={active ? '#00d4ff' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'queue' as const,
    label: 'Queue',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 7H18M4 11H18M4 15H13" stroke={active ? '#a855f7' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const { activeView, setActiveView, queue } = useJukeboxStore()

  return (
    <div className="flex-shrink-0 flex items-center justify-around px-4 pb-safe pt-2 pb-3 border-t" style={{ borderColor: 'rgba(201,162,39,0.15)', background: 'rgba(14,8,0,0.95)' }}>
      {tabs.map((tab) => {
        const active = activeView === tab.id
          || (tab.id === 'search' && activeView === 'artist')
          || (tab.id === 'home' && (activeView === 'album' || activeView === 'playlist'))
        const accent = '#c9a227'

        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex flex-col items-center gap-1 py-1 px-5 rounded-xl transition-all duration-200
              ${active ? 'opacity-100' : 'opacity-30 hover:opacity-50'}`}
          >
            <div className="relative">
              {tab.icon(active)}
              {tab.id === 'queue' && queue.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: accent }}
                >
                  {queue.length > 9 ? '9+' : queue.length}
                </span>
              )}
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? accent : 'inherit' }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
