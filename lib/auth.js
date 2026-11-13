'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

// -----------------------------------------------------------------------
// Client-side auth context.
//
// The source of truth is the server session (httpOnly signed cookie). The
// object held here is only a UI summary: it never grants access to anything.
// -----------------------------------------------------------------------
export const ROLES = {
  super_admin: { id: 'super_admin', label: 'Super Admin', icon: '🛡️', home: '/super-admin', desc: 'Platform control — gyms, owners, subscriptions.' },
  owner: { id: 'owner', label: 'Gym Owner', icon: '🏢', home: '/dashboard', desc: 'Members, trainers, payments, attendance and branding.' },
  trainer: { id: 'trainer', label: 'Trainer', icon: '💪', home: '/trainer', desc: 'Assigned members, workout plans and progress.' },
  member: { id: 'member', label: 'Member', icon: '👤', home: '/portal', desc: 'Check-in, workouts, membership and payments.' },
}

const SESSION_KEY = 'gymos_session' // legacy storage key (UI cache only)

const AuthCtx = createContext({
  user: null,
  loading: true,
  signIn: async () => { },
  signOut: async () => { },
  refresh: async () => { },
  updateUser: () => { },
})

function readCache() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (s?.expiresAt && new Date(s.expiresAt).getTime() > Date.now()) return s
  } catch { }
  return null
}

function writeCache(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem('gymos_impersonate')
    }
  } catch { }
}

async function firebaseSignOut() {
  try {
    const { auth } = await import('@/lib/firebase/client')
    if (!auth) return
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
  } catch { }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const signingIn = useRef(false)

  const apply = useCallback((session) => {
    writeCache(session)
    setUser(session)
    if (session?.appearance?.theme) {
      try { localStorage.setItem('theme', session.appearance.theme) } catch { }
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const { getSessionAction } = await import('@/actions/auth')
      const session = await getSessionAction()
      if (signingIn.current) return session
      apply(session)
      // Server session gone (expired / revoked): make sure Firebase is signed out too.
      if (!session) await firebaseSignOut()
      return session
    } catch {
      return null
    }
  }, [apply])

  useEffect(() => {
    // Paint instantly from the cache, then confirm with the server.
    const cached = readCache()
    if (cached) setUser(cached)
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const signIn = useCallback(async ({ email, password, role, remember }) => {
    const { auth } = await import('@/lib/firebase/client')
    if (!auth) throw new Error('Sign-in is unavailable: Firebase is not configured for this deployment.')
    const { signInWithEmailAndPassword, signOut } = await import('firebase/auth')

    signingIn.current = true
    try {
      let credential
      try {
        credential = await signInWithEmailAndPassword(auth, String(email || '').trim().toLowerCase(), password)
      } catch (err) {
        if (err?.code === 'auth/too-many-requests') throw new Error('Too many attempts. Please wait a few minutes and try again.')
        if (err?.code === 'auth/network-request-failed') throw new Error('Network error. Check your connection and try again.')
        if (err?.code === 'auth/user-disabled') throw new Error('This account has been disabled.')
        throw new Error('Invalid e-mail or password.')
      }

      const idToken = await credential.user.getIdToken(true)
      const { createSessionAction } = await import('@/actions/auth')
      const session = await createSessionAction({ idToken, role, remember })
      if (!session || session.error) {
        await signOut(auth).catch(() => { })
        throw new Error(session?.error || 'Sign-in failed.')
      }
      apply(session)
      return session
    } finally {
      signingIn.current = false
    }
  }, [apply])

  const signOut = useCallback(async () => {
    // 1. End the Firebase client session. 2. Clear the server cookie. 3. Clear UI state.
    await firebaseSignOut()
    try {
      const { logoutAction } = await import('@/actions/auth')
      await logoutAction()
    } catch { }
    apply(null)
  }, [apply])

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      if (patch && 'photoURL' in patch) next.photo = patch.photoURL
      writeCache(next)
      return next
    })
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut, refresh, updateUser }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
