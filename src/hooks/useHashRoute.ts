import { useEffect, useState } from 'react'

function normalizeHashToPath(hash: string) {
  const h = hash.replace(/^#/, '')
  if (!h || h === '/' || h === '') return '/'
  return h.startsWith('/') ? h : `/${h}`
}

export function useHashRoute() {
  const [path, setPath] = useState<string>(() => {
    if (typeof window === 'undefined') return '/'
    return normalizeHashToPath(window.location.hash || '#/')
  })

  useEffect(() => {
    const onHashChange = () => {
      setPath(normalizeHashToPath(window.location.hash || '#/'))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return path
}

export function navigateHash(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`
  const next = `#${p}`
  if (window.location.hash === next) return
  window.location.hash = p
}

