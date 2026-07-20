'use client'
// LocalStorage-backed connection state. Ready to swap for Supabase later:
// simply replace get()/set() with a fetch/mutation — the UI won’t change.

const KEY = 'gymos_attendance_connections'

export function getConnections() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

export function saveConnection(providerId, data) {
  const all = getConnections()
  all[providerId] = {
    ...data,
    connectedAt: data.connectedAt || new Date().toISOString(),
    lastSync: new Date().toISOString(),
  }
  localStorage.setItem(KEY, JSON.stringify(all))
  window.dispatchEvent(new Event('gymos:connections-changed'))
  return all[providerId]
}

export function removeConnection(providerId) {
  const all = getConnections()
  delete all[providerId]
  localStorage.setItem(KEY, JSON.stringify(all))
  window.dispatchEvent(new Event('gymos:connections-changed'))
}

export function touchSync(providerId) {
  const all = getConnections()
  if (!all[providerId]) return
  all[providerId].lastSync = new Date().toISOString()
  localStorage.setItem(KEY, JSON.stringify(all))
  window.dispatchEvent(new Event('gymos:connections-changed'))
}
