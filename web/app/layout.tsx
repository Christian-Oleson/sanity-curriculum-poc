import type {Metadata} from 'next'
import {draftMode} from 'next/headers'
import {PreviewEditing} from './PreviewEditing'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lesson Viewer',
  description: 'Sanity CMS test: curriculum content by state edition and language',
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const {isEnabled} = await draftMode()
  return (
    <html lang="en">
      <body>
        {children}
        {/* Only inside Presentation: click-to-edit overlays, and a refresh when content changes in the Studio */}
        {isEnabled && <PreviewEditing />}
      </body>
    </html>
  )
}
