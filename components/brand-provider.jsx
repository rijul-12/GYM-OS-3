'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'

export const BRAND_NAME = 'BGM'
export const BRAND_FULL_NAME = 'Best Gym Manager'
export const BRAND_TAGLINE = 'Your gym runs. BGM handles the rest.'
export const APP_URL = 'https://gymos.app'

// Platform defaults. Inside a portal these are replaced by the gym's own
// settings loaded from the server (white-labelling).
const DEFAULT_BRAND = {
  gymName: BRAND_NAME,
  logoText: 'BGM',
  primaryColor: '#ef4444',
  accentColor: '#f87171',
  phone: '',
  email: 'support@gymos.app',
  address: '',
  banner: BRAND_TAGLINE,
  footer: `© ${new Date().getFullYear()} ${BRAND_FULL_NAME}`,
  favicon: '',
  currency: '₹ INR',
}

const CACHE_KEY = 'gymos_brand' // legacy storage key, UI cache only
const BrandCtx = createContext({ brand: DEFAULT_BRAND, setBrand: () => { }, reset: () => { }, ready: false })

function hexToHslString(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex || '')) return null
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255
  const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), d = cmax - cmin
  let h = 0
  if (d !== 0) { if (cmax === r) h = ((g - b) / d) % 6; else if (cmax === g) h = (b - r) / d + 2; else h = (r - g) / d + 4 }
  h = Math.round(h * 60); if (h < 0) h += 360
  const l = (cmax + cmin) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return `${h} ${+(s * 100).toFixed(1)}% ${+(l * 100).toFixed(1)}%`
}

export function BrandProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [brand, setBrandState] = useState(DEFAULT_BRAND)
  const [ready, setReady] = useState(false)
  const pending = useRef({})
  const timer = useRef(null)
  const role = user?.role || null
  const gymKey = user?.gymCode || null

  // Load the gym's settings from the server whenever the signed-in gym changes.
  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    if (!role || role === 'super_admin' || !gymKey) {
      setBrandState(DEFAULT_BRAND)
      try { localStorage.removeItem(CACHE_KEY) } catch { }
      setReady(true)
      return
    }
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (cached && cached.gymId === gymKey) setBrandState({ ...DEFAULT_BRAND, ...cached })
    } catch { }
    import('@/actions/db/gyms').then(m => m.getMyGymSettings()).then((settings) => {
      if (cancelled || !settings) return
      const next = { ...DEFAULT_BRAND, ...settings, logoText: settings.logoText || String(settings.gymName || 'G').slice(0, 2).toUpperCase() }
      setBrandState(next)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)) } catch { }
    }).catch(() => { }).finally(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [role, gymKey, authLoading])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--brand-primary', brand.primaryColor)
    root.style.setProperty('--brand-accent', brand.accentColor)
    const hsl = hexToHslString(brand.primaryColor)
    if (hsl) root.style.setProperty('--primary', hsl)
  }, [brand.primaryColor, brand.accentColor])

  const flush = useCallback(async () => {
    const patch = pending.current
    pending.current = {}
    timer.current = null
    if (Object.keys(patch).length === 0) return
    try {
      const { saveGymBrand } = await import('@/actions/db/gyms')
      const res = await saveGymBrand(null, patch)
      if (!res?.success || res.errors?.length) {
        const { toast } = await import('sonner')
        toast.error(res?.errors?.[0] || res?.error || 'Settings could not be saved.')
      }
    } catch { }
  }, [])

  /**
   * Updates settings locally right away and, for owners, saves them to the
   * server once typing pauses (one write per burst instead of one per keystroke).
   */
  const setBrand = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) return
    setBrandState((prev) => {
      if (Object.keys(patch).every(k => prev[k] === patch[k])) return prev
      const next = { ...prev, ...patch }
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)) } catch { }
      return next
    })
    if (role === 'owner') {
      const { gymCode, qrLastResetDate, qrCreatedDate, gymId, zones, widgets, onboarded, ...persistable } = patch
      if (Object.keys(persistable).length) {
        Object.assign(pending.current, persistable)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(flush, 700)
      }
    }
  }, [role, flush])

  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); flush() } }, [flush])

  const reset = useCallback(() => {
    try { localStorage.removeItem(CACHE_KEY) } catch { }
    setBrandState(DEFAULT_BRAND)
  }, [])

  return <BrandCtx.Provider value={{ brand, setBrand, reset, ready }}>{children}</BrandCtx.Provider>
}

export const useBrand = () => useContext(BrandCtx)
