import type { LayoutProps, Metadata } from 'rari'
import Providers from '@/lib/components/common/providers'

export default function RootLayout({ children }: LayoutProps) {
  return <Providers>{children}</Providers>
}

export const metadata: Metadata = {
  title: 'LiveKit Meet',
  description: 'Private video meetings on your own server.',
  themeColor: '#111111',
  icons: {
    icon: '/favicon.ico',
    apple: '/images/livekit-apple-touch.png',
  },
}
