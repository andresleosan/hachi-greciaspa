import { firebaseAuth, firebaseDb } from './firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(firebaseAuth, email, password)
}

export async function register(
  email: string,
  password: string,
  displayName?: string,
  role = 'client'
) {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password)
  if (displayName) {
    try {
      await updateProfile(cred.user, { displayName })
    } catch (e) {
      // ignore profile update failures
    }
  }

  // create minimal user profile in Firestore for role checks
  await setDoc(doc(firebaseDb, 'users', cred.user.uid), {
    email,
    displayName: displayName || null,
    role,
    createdAt: serverTimestamp(),
  })

  return cred.user
}

export async function signOut() {
  return fbSignOut(firebaseAuth)
}

export async function getUserProfile(uid: string) {
  const ref = doc(firebaseDb, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}
