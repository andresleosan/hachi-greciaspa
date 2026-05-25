import { useEffect, useState } from 'react'
import { firebaseAuth } from '../services/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { getUserProfile } from '../services/auth'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
      if (!u) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setUser(u)
      try {
        const p = await getUserProfile(u.uid)
        setProfile(p)
      } catch (e) {
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  return { user, profile, loading }
}
