import type { VideoItem } from './bilibiliMock'

const cache = new Map<string, VideoItem>()

export function rememberVideos(videos: VideoItem[]) {
  for (const v of videos) cache.set(v.id, v)
}

export function getRememberedVideo(id: string) {
  return cache.get(id)
}

