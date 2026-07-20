'use client'
import { useBrand } from './brand-provider'

export function Logo({ size = 'md', showName = true }) {
  const { brand } = useBrand()
  const sizes = {
    sm: { box: 'h-7 w-7 text-xs', text: 'text-sm' },
    md: { box: 'h-9 w-9 text-sm', text: 'text-lg' },
    lg: { box: 'h-12 w-12 text-lg', text: 'text-2xl' },
  }
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${s.box} rounded-lg flex items-center justify-center font-bold font-display text-white relative overflow-hidden`}
        style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}
      >
        <span className="relative z-10">{brand.logoText || brand.gymName?.[0] || 'G'}</span>
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
      </div>
      {showName && (
        <span className={`font-display font-bold tracking-tight ${s.text}`}>{brand.gymName}</span>
      )}
    </div>
  )
}
