import { useEffect, useState } from 'react'
import { firebaseAuth } from '../services/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u)
    })
    return () => unsub()
  }, [])

  return { user }
}
