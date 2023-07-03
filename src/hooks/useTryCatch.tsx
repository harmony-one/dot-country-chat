import type React from 'react'
import { useCallback, useState } from 'react'
import { toast } from 'react-toastify'

interface TryCatchState {
  pending: boolean
  initializing: boolean
  setPending: React.Dispatch<React.SetStateAction<boolean>>
  setInitializing: React.Dispatch<React.SetStateAction<boolean>>
  tryCatch: (f: () => Promise<any>, isInit?: boolean, errorMessage?: string) => Promise<void>
}
export const useTryCatch = (initialized = false): TryCatchState => {
  const [pending, setPending] = useState(false)
  const [initializing, setInitializing] = useState(!initialized)

  const tryCatch = useCallback(async (f: () => Promise<any>, isInit?: boolean, errorMessage?: string): Promise<void> => {
    try {
      if (isInit) {
        setInitializing(true)
      } else {
        setPending(true)
      }
      await f()
    } catch (ex) {
      console.error(ex)
      // @ts-expect-error catch error in response
      toast.error(`${errorMessage ?? 'Request failed'}. Error: ${ex?.response?.error ?? ex.toString()}`)
    } finally {
      if (isInit) {
        setInitializing(false)
      } else {
        setPending(false)
      }
    }
  }, [])
  return { pending, setPending, initializing, setInitializing, tryCatch }
}
