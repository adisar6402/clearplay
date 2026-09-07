import type { VideoSegment } from '@clearplay/core'
import type { UserPreferences } from '../../storage/db'

export function getSkippableSegments(segments: VideoSegment[], preferences: UserPreferences) {
  return segments.filter((segment) => {
    if (segment.category === 'sponsor') return preferences.autoSkipSponsor
    if (segment.category === 'intro') return preferences.autoSkipIntro
    if (segment.category === 'outro') return preferences.autoSkipOutro
    return preferences.skipMode === 'auto'
  })
}

// The engine only consumes provider-supplied segments. It intentionally does
// not infer, scrape, or manufacture timestamps from video content.
