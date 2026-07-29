'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

// -----------------------------------------------------------------------
// Role definitions — used throughout the app for role-based UI.
// -----------------------------------------------------------------------
export const ROLES = {
  super_admin: { id: 'super_admin', label: 'Super Admin', icon: '🛡️', home: '/super-admin', desc: 'Platform control — all gyms, owners, revenue, system health.' },
  owner: { id: 'owner', label: 'Gym Owner', icon: '🏢', home: '/dashboard', desc: 'Full access — members, trainers, revenue, integrations, branding.' },
  trainer: { id: 'trainer', label: 'Trainer', icon: '💪', home: '/trainer', desc: 'Coach view — assigned members, workout plans, progress.' },
  member: { id: 'member', label: 'Member', icon: '👤', home: '/portal', desc: 'Personal view — workouts, occupancy, membership.' },
}

const SESSION_KEY = 'gymos_session'
const IMPERSONATE_KEY = 'gymos_impersonate'

const AuthCtx = createContext({
  user: null,
  loading: true,
  signIn: async () => { },
  signOut: () => { },
  impersonating: null,
  impersonateGym: () => { },
  stopImpersonation: () => { },
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [impersonating, setImpersonating] = useState(null)

  useEffect(() => {
    // Restore session from localStorage (works in both Demo and Supabase modes)
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s.expiresAt && new Date(s.expiresAt).getTime() > Date.now()) {
          setUser(s)
        } else {
          localStorage.removeItem(SESSION_KEY)
        }
      }
      const imp = localStorage.getItem(IMPERSONATE_KEY)
      if (imp) setImpersonating(JSON.parse(imp))
    } catch { }

    setLoading(false)

    // Subscribe to Firebase auth state changes when configured.
    let unsubscribe = null
    const setupFirebaseListener = async () => {
      try {
        const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
        if (!key) return

        const { auth } = await import('@/lib/firebase/client')
        const { onAuthStateChanged } = await import('firebase/auth')

        if (!auth) return;

        unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (!fbUser) {
            localStorage.removeItem(SESSION_KEY)
            localStorage.removeItem(IMPERSONATE_KEY)
            setUser(null)
            setImpersonating(null)
          } else {
            const tokenResult = await fbUser.getIdTokenResult()
            const role = tokenResult.claims.role
            if (role) {
              const rawPrev = localStorage.getItem(SESSION_KEY)
              let prevGymCode = tokenResult.claims.gymCode || 'DEMO';
              let prevOnboarded = true;
              let prevReadOnly = false;
              let prevPhase = 'Active';
              let prevDays = 999;
              let prevLimit = 75;

              if (rawPrev) {
                const prev = JSON.parse(rawPrev);
                if (prev.onboarded !== undefined) prevOnboarded = prev.onboarded;
              }

              // Fetch fresh realtime limits from DB to protect the UI
              try {
                if (prevGymCode && prevGymCode !== 'DEMO') {
                  const { getSubscriptionStatus } = await import('@/actions/db/subscriptions');
                  const subStatus = await getSubscriptionStatus(prevGymCode);
                  prevReadOnly = subStatus.isReadOnly;
                  prevPhase = subStatus.currentPhase;
                  prevDays = subStatus.daysRemaining;
                  prevLimit = subStatus.memberLimit || 75;
                }
              } catch (e) { }

              const { getUserAppearance } = await import('@/actions/db/settings')
              const appData = await getUserAppearance(fbUser.uid)

              const sessionData = {
                uid: fbUser.uid,
                role,
                gymCode: prevGymCode,
                email: fbUser.email,
                name: fbUser.displayName ?? fbUser.email,
                photo: fbUser.photoURL ?? `https://i.pravatar.cc/150?u=${fbUser.email}`,
                loginAt: new Date().toISOString(),
                expiresAt: new Date(new Date(tokenResult.expirationTime).getTime()).toISOString(),
                firebase: true,
                onboarded: prevOnboarded,
                readOnly: prevReadOnly,
                subscriptionPhase: prevPhase,
                daysRemaining: prevDays,
                memberLimit: prevLimit,
                appearance: appData || { theme: 'system', accent: 'default', density: 'comfortable', sidebar: 'expanded', animations: 'enabled', language: 'en' }
              }

              if (appData?.theme) {
                localStorage.setItem('theme', appData.theme)
              }

              localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
              setUser(sessionData)
            }
          }
        })
      } catch { /* Firebase not available — no-op */ }
    }

    setupFirebaseListener()
    return () => { if (unsubscribe) unsubscribe() }
  }, [])

  const signIn = useCallback(async (creds) => {
    const { loginAction } = await import('@/actions/auth')
    const session = await loginAction(creds)

    if (session && session.error) {
      throw new Error(session.error)
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    return session
  }, [])

  const signOut = useCallback(async () => {
    const { logoutAction } = await import('@/actions/auth')
    await logoutAction()
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(IMPERSONATE_KEY)
    setUser(null)
    setImpersonating(null)
  }, [])

  const impersonateGym = useCallback((gym) => {
    const data = {
      gymId: gym.id,
      gymName: gym.name,
      ownerName: gym.owner,
      startedAt: new Date().toISOString(),
    }
    localStorage.setItem(IMPERSONATE_KEY, JSON.stringify(data))
    setImpersonating(data)
  }, [])

  const stopImpersonation = useCallback(() => {
    localStorage.removeItem(IMPERSONATE_KEY)
    setImpersonating(null)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut, impersonating, impersonateGym, stopImpersonation }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
