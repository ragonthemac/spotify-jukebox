const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI!

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ')

// ─── PKCE helpers ────────────────────────────────────────────────────────────

function generateCodeVerifier(length = 128): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join('')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function initiateLogin() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('pkce_verifier', verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  window.location.href = `${SPOTIFY_AUTH_URL}?${params}`
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const verifier = sessionStorage.getItem('pkce_verifier')!
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  })

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) throw new Error('Token exchange failed')
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) throw new Error('Token refresh failed')
  return res.json()
}

// ─── Token storage ────────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

interface StoredToken {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export function storeToken(token: TokenResponse) {
  const stored: StoredToken = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token || getStoredToken()?.refreshToken || '',
    expiresAt: Date.now() + token.expires_in * 1000 - 60_000,
  }
  localStorage.setItem('spotify_token', JSON.stringify(stored))
}

export function getStoredToken(): StoredToken | null {
  const raw = localStorage.getItem('spotify_token')
  if (!raw) return null
  return JSON.parse(raw)
}

export function clearToken() {
  localStorage.removeItem('spotify_token')
}

export async function getValidAccessToken(): Promise<string | null> {
  const stored = getStoredToken()
  if (!stored) return null

  if (Date.now() < stored.expiresAt) return stored.accessToken

  try {
    const refreshed = await refreshAccessToken(stored.refreshToken)
    storeToken(refreshed)
    return refreshed.access_token
  } catch {
    clearToken()
    return null
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function spotifyFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Spotify API error: ${res.status} — ${body}`)
  }
  return res.json()
}

export interface SpotifyArtist {
  id: string
  name: string
  images: { url: string; width: number; height: number }[]
  followers: { total: number }
  genres: string[]
  popularity: number
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: { id: string; name: string }[]
  album: {
    name: string
    images: { url: string; width: number; height: number }[]
  }
  duration_ms: number
  preview_url: string | null
  uri: string
  explicit: boolean
}

export interface SpotifyAlbum {
  id: string
  name: string
  artists: { name: string }[]
  images: { url: string; width: number; height: number }[]
  release_date: string
  total_tracks: number
  uri: string
}

export async function searchTracks(
  query: string,
  token: string
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ tracks: { items: SpotifyTrack[] } }>(
    `/search?q=${encodeURIComponent(query)}&type=track`,
    token
  )
  return data.tracks.items
}

export async function searchAlbums(
  query: string,
  token: string,
  limit = 6
): Promise<SpotifyAlbum[]> {
  const data = await spotifyFetch<{ albums: { items: SpotifyAlbum[] } }>(
    `/search?q=${encodeURIComponent(query)}&type=album&limit=6`,
    token
  )
  return data.albums.items
}

export async function getFeaturedPlaylists(token: string) {
  const data = await spotifyFetch<{ playlists: { items: SpotifyAlbum[] } }>(
    '/browse/featured-playlists?limit=8',
    token
  )
  return data.playlists.items
}

export async function getNewReleases(token: string): Promise<SpotifyAlbum[]> {
  const data = await spotifyFetch<{ albums: { items: SpotifyAlbum[] } }>(
    `/search?q=tag%3Anew&type=album&limit=10`,
    token
  )
  return data.albums.items
}

export async function searchArtists(query: string, token: string): Promise<SpotifyArtist[]> {
  const data = await spotifyFetch<{ artists: { items: SpotifyArtist[] } }>(
    `/search?q=${encodeURIComponent(query)}&type=artist&limit=5`,
    token
  )
  return data.artists.items
}

export async function getArtistTopTracks(artistName: string, token: string): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ tracks: { items: SpotifyTrack[] } }>(
    `/search?q=artist:${encodeURIComponent(artistName)}&type=track`,
    token
  )
  return data.tracks.items
}

export async function getArtistAlbums(artistName: string, token: string): Promise<SpotifyAlbum[]> {
  const data = await spotifyFetch<{ albums: { items: SpotifyAlbum[] } }>(
    `/search?q=artist:${encodeURIComponent(artistName)}&type=album`,
    token
  )
  return data.albums.items
}

export async function getAlbumTracks(albumId: string, token: string): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items: SpotifyTrack[] }>(
    `/albums/${albumId}/tracks?limit=50`,
    token
  )
  return data.items
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  images: { url: string }[]
  tracks: { total: number }
  owner: { display_name: string }
}

export async function getRecentlyPlayed(token: string): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items: { track: SpotifyTrack }[] }>(
    '/me/player/recently-played?limit=20',
    token
  )
  return data.items.map((i) => i.track).filter(Boolean)
}

export async function getUserPlaylists(token: string): Promise<SpotifyPlaylist[]> {
  const data = await spotifyFetch<{ items: SpotifyPlaylist[] }>(
    '/me/playlists?limit=20',
    token
  )
  return data.items
}

export async function getPlaylistTracks(playlistId: string, token: string): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items: { track: SpotifyTrack }[] }>(
    `/playlists/${playlistId}/tracks?limit=50`,
    token
  )
  return data.items.map((i) => i.track).filter(Boolean)
}

export async function getUserProfile(token: string) {
  return spotifyFetch<{ display_name: string; images: { url: string }[] }>(
    '/me',
    token
  )
}

// ─── Playback ─────────────────────────────────────────────────────────────────

export async function playTrack(token: string, uri: string, deviceId: string) {
  await fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [uri] }),
  })
}

export async function previousTrack(token: string, deviceId?: string) {
  const qs = deviceId ? `?device_id=${deviceId}` : ''
  await fetch(`${SPOTIFY_API_BASE}/me/player/previous${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function pausePlayback(token: string) {
  await fetch(`${SPOTIFY_API_BASE}/me/player/pause`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function resumePlayback(token: string) {
  await fetch(`${SPOTIFY_API_BASE}/me/player/play`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function seekTo(token: string, positionMs: number) {
  await fetch(`${SPOTIFY_API_BASE}/me/player/seek?position_ms=${positionMs}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function getAlbumArt(track: SpotifyTrack, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const images = track.album.images
  if (!images.length) return '/placeholder.svg'
  if (size === 'lg') return images[0]?.url || images[images.length - 1].url
  if (size === 'sm') return images[images.length - 1]?.url || images[0].url
  return images[1]?.url || images[0].url
}
