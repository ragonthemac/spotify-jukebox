'use client'

import { useJukeboxStore } from '@/lib/store'

const chromeH = 'linear-gradient(90deg, #e8d5b0 0%, #c9a460 20%, #f5e8c0 50%, #b8902a 80%, #e0c878 100%)'

const tabs = [
  {
    id: 'home' as const,
    label: 'Now Playing',
    icon: (active: boolean) => (
      <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
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
      <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
        <circle cx="10" cy="10" r="6.5" stroke={active ? '#00d4ff' : 'currentColor'} strokeWidth="1.5" />
        <path d="M15 15L19 19" stroke={active ? '#00d4ff' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'queue' as const,
    label: 'Queue',
    icon: (active: boolean) => (
      <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
        <path d="M4 7H18M4 11H18M4 15H13" stroke={active ? '#a855f7' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const { activeView, setActiveView, queue } = useJukeboxStore()

  return (
    <div className="flex-shrink-0" style={{ background: 'rgba(14,8,0,0.97)' }}>

      {/* Tri-colour glow diffusion — flipped to glow downward */}
      <div style={{ display: 'flex', height: 14 }}>
        <div style={{ flex: 1, background: 'linear-gradient(180deg, #ff2d7844, transparent)' }} />
        <div style={{ flex: 1, background: 'linear-gradient(180deg, #c9a22766, transparent)' }} />
        <div style={{ flex: 1, background: 'linear-gradient(180deg, #00d4ff44, transparent)' }} />
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-around px-4 pt-1 pb-5">
        {tabs.map((tab) => {
          const active = activeView === tab.id
            || (tab.id === 'search' && activeView === 'artist')
            || (tab.id === 'home' && (activeView === 'album' || activeView === 'playlist'))
          const accent = '#c9a227'

          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex flex-col items-center gap-1.5 py-3 px-8 rounded-2xl transition-all duration-200
                ${active ? 'opacity-100' : 'opacity-30 hover:opacity-50'}`}
              style={active ? { background: 'rgba(201,162,39,0.07)', boxShadow: `0 0 12px 2px rgba(201,162,39,0.1)` } : {}}
            >
              <div className="relative">
                {tab.icon(active)}
                {tab.id === 'queue' && queue.length > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: accent }}
                  >
                    {queue.length > 9 ? '9+' : queue.length}
                  </span>
                )}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: active ? accent : 'inherit' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
