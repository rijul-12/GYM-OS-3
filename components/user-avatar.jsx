'use client'
import { useState } from 'react'
import { getInitials, getAvatarColor } from '@/lib/avatar'

/**
 * Real profile photo when one exists, otherwise the person's initials.
 * Never falls back to a stock/placeholder face.
 */
export function UserAvatar({ src, name, size = 40, className = '', rounded = 'rounded-full' }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name ? `${name}'s photo` : 'Profile photo'} onError={() => setFailed(true)} loading="lazy"
        className={`${rounded} object-cover shrink-0 ${className}`} style={style} />
    )
  }
  return (
    <div aria-label={name || 'User'} className={`${rounded} shrink-0 flex items-center justify-center font-semibold text-white select-none ${className}`}
      style={{ ...style, background: getAvatarColor(name || 'User') }}>
      {getInitials(name || 'User')}
    </div>
  )
}
