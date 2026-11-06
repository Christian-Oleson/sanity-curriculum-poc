import path from 'node:path'
import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Pin the app root to web/. Without this, Next detects the Studio's package-lock.json one level up,
  // treats the whole sanity/ folder as the project, and rebuilds on unrelated file writes there
  // (browser-automation screenshots and logs), which put the page into a reload loop.
  turbopack: {root: path.join(__dirname)},
  // Hide the dev-mode route badge (compile/runtime errors still surface) so demos and screenshots stay clean.
  devIndicators: false,
}

export default nextConfig
