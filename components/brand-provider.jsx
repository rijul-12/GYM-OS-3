'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

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

    // Transcode HEX to HSL space for Tailwind compatibility
    const hexToHslString = (hex) => {
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) { r = `0x${hex[1]}${hex[1]}`; g = `0x${hex[2]}${hex[2]}`; b = `0x${hex[3]}${hex[3]}`; }
      else if (hex.length === 7) { r = `0x${hex[1]}${hex[2]}`; g = `0x${hex[3]}${hex[4]}`; b = `0x${hex[5]}${hex[6]}`; }
      r /= 255; g /= 255; b /= 255;
      let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), d = cmax - cmin, h = 0, s = 0, l = 0;
      if (d === 0) h = 0; else if (cmax === r) h = ((g - b) / d) % 6; else if (cmax === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
      l = (cmax + cmin) / 2;
      s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      return `${h} ${+(s * 100).toFixed(1)}% ${+(l * 100).toFixed(1)}%`;
    }
    document.documentElement.style.setProperty('--primary', hexToHslString(brand.primaryColor));

    if (typeof document !== 'undefined') {
      document.title = `${brand.gymName} — Premium Gym Management`
    }
  }, [brand, ready])

  const setBrand = useCallback((patch) => {
    setBrandState((prev) => {
      // Prevent infinite loops if patch is identical or empty
      if (!patch || Object.keys(patch).length === 0) return prev;
      let hasChanges = false;
      for (const key of Object.keys(patch)) {
        if (prev[key] !== patch[key]) hasChanges = true;
      }
      if (!hasChanges) return prev; // Bail out of React render if no values actually changed

      const next = { ...prev, ...patch }
      try { localStorage.setItem('gymos_brand', JSON.stringify(next)) } catch { }
      return next
    })
  }, [])

  const reset = useCallback(() => {
    try { localStorage.removeItem('gymos_brand') } catch { }
    setBrandState(DEFAULT_BRAND)
  }, [])

  return <BrandCtx.Provider value={{ brand, setBrand, reset }}>{children}</BrandCtx.Provider>
}

export const useBrand = () => useContext(BrandCtx)
