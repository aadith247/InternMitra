import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { api } from './api'

export default function ClerkBridge() {
  const { isSignedIn, getToken } = useAuth()

  useEffect(() => {
    let cancelled = false
    async function sync() {
      try {
        if (!isSignedIn) return
        // Request a JWT suitable for backend verification
        const token = await getToken()
        if (cancelled) return
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          // Also store token for early requests (e.g., first render before defaults applied)
          try { localStorage.setItem('token', token) } catch {}
        }
      } catch (e) {
        // no-op
      }
    }
    sync()
    return () => { cancelled = true }
  }, [isSignedIn, getToken])

  return null
}
