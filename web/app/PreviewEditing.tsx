'use client'

import {useRouter} from 'next/navigation'
import {VisualEditing} from 'next-sanity/visual-editing'

// next-sanity only auto-refreshes on edits when using its SanityLive streaming setup.
// We render on the server per request, so a router.refresh() after each edit re-runs the
// query with the current draft/perspective and the preview updates while you type.
export function PreviewEditing() {
  const router = useRouter()
  return (
    <VisualEditing
      refresh={(payload) => {
        if (payload.source === 'manual' || payload.source === 'mutation') {
          router.refresh()
          return new Promise((resolve) => setTimeout(resolve, 500))
        }
        return false
      }}
    />
  )
}
