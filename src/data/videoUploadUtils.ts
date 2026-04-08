function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, '0')
}

export function formatVideoDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  if (m < 60) return `${m}:${pad2(s)}`
  const h = Math.floor(m / 60)
  return `${h}:${pad2(m % 60)}:${pad2(s)}`
}

const FALLBACK_COVER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><rect width="400" height="250" fill="url(#g)"/><text x="200" y="130" text-anchor="middle" fill="white" font-size="18" font-family="system-ui">视频</text></svg>`,
  )

/** 从本地文件截取封面 + 读取时长（失败则占位图） */
export function extractVideoMeta(file: File): Promise<{ cover: string; duration: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const vid = document.createElement('video')
    vid.muted = true
    vid.playsInline = true
    vid.preload = 'metadata'
    vid.src = url

    const done = (cover: string, durationSec: number) => {
      URL.revokeObjectURL(url)
      resolve({ cover, duration: formatVideoDuration(durationSec) })
    }

    const snap = () => {
      const d = vid.duration
      try {
        vid.currentTime = Math.min(0.15, Number.isFinite(d) && d > 0 ? d * 0.05 : 0.1)
      } catch {
        done(FALLBACK_COVER, Number.isFinite(d) ? d : 0)
      }
    }

    vid.onloadedmetadata = () => {
      if (!Number.isFinite(vid.duration) || vid.duration === 0) {
        done(FALLBACK_COVER, 0)
        return
      }
      snap()
    }

    vid.onseeked = () => {
      try {
        const c = document.createElement('canvas')
        c.width = 400
        c.height = 250
        const ctx = c.getContext('2d')
        if (ctx) ctx.drawImage(vid, 0, 0, c.width, c.height)
        done(c.toDataURL('image/jpeg', 0.82), vid.duration)
      } catch {
        done(FALLBACK_COVER, vid.duration)
      }
    }

    vid.onerror = () => done(FALLBACK_COVER, 0)
  })
}
