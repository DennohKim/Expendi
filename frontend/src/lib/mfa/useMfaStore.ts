import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MFAStatus } from './mfa.types'

interface MfaState {
  status: MFAStatus
  setStatus: (status: MFAStatus) => void
  resetMfaStatus: () => void
}

export const useMfaStore = create<MfaState>()(
  persist(
    (set) => ({
      status: null,
      setStatus: (status) => set({ status }),
      resetMfaStatus: () => set({ status: null }),
    }),
    {
      name: 'mfa-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)