'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const DEFAULT_BRAND = {
  gymName: 'GymOS',
  logoText: 'G',
  primaryColor: '#ef4444',
  accentColor: '#f87171',
  phone: '+1 (415) 555-0100',
  email: 'hello@gymos.io',
  address: '250 Market Street, San Francisco, CA',
  banner: 'Elevate your gym. Elevate your brand.',
  footer: '© 2025 GymOS. Built for the world\'s best gyms.',
  footer: '© 2025 GymOS. Built for the world\'s best gyms.',
  favicon: '',
  currency: '$ USD'
}

const BrandCtx = createContext({ brand: DEFAULT_BRAND, setBrand: () => { } })

export function BrandProvider({ children }) {
  const [brand, setBrandState] = useState(DEFAULT_BRAND)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gymos_brand')
      if (saved) setBrandState({ ...DEFAULT_BRAND, ...JSON.parse(saved) })
    } catch { }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.style.setProperty('--brand-primary', brand.primaryColor)
    document.documentElement.style.setProperty('--brand-accent', brand.accentColor)
    // Update the CSS var used for primary in HSL space isn't trivial; we rely on inline usage.
    if (typeof document !== 'undefined') {
      document.title = `${brand.gymName} — Premium Gym Management`
    }
  }, [brand, ready])

  const setBrand = (patch) => {
    setBrandState((prev) => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem('gymos_brand', JSON.stringify(next)) } catch { }
      return next
    })
  }

  const reset = () => {
    try { localStorage.removeItem('gymos_brand') } catch { }
    setBrandState(DEFAULT_BRAND)
  }

  return <BrandCtx.Provider value={{ brand, setBrand, reset }}>{children}</BrandCtx.Provider>
}

export const useBrand = () => useContext(BrandCtx)
