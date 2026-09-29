import { useCallback, useEffect, useRef, useState } from 'react'

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: T }

/**
 * Runs `load` on mount and whenever it changes (wrap it in useCallback).
 * Results from superseded calls are dropped, so a slow old response never
 * overwrites a newer one.
 */
export function useApi<T>(load: () => Promise<T>): {
  state: LoadState<T>
  reload: () => void
  setData: (update: (prev: T) => T) => void
} {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const generation = useRef(0)

  const run = useCallback(() => {
    const current = ++generation.current
    setState({ status: 'loading' })
    load().then(
      data => {
        if (current === generation.current) setState({ status: 'ready', data })
      },
      (error: unknown) => {
        if (current === generation.current) setState({ status: 'error', error })
      },
    )
  }, [load])

  useEffect(() => {
    run()
    return () => {
      // Invalidate in-flight calls on unmount / reload.
      generation.current++
    }
  }, [run])

  const setData = useCallback((update: (prev: T) => T) => {
    setState(s => (s.status === 'ready' ? { status: 'ready', data: update(s.data) } : s))
  }, [])

  return { state, reload: run, setData }
}
