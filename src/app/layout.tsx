import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import TimeTheme from '@/components/TimeTheme'
import ScrollPerf from '@/components/ScrollPerf'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Zoro',
  description: 'DP Second Brain',
}

const nightBootScript = `(function(){var d=new Date(),h=d.getHours()+d.getMinutes()/60,n=1;if(h>=9&&h<16)n=0;else if(h>=20||h<5)n=1;else if(h>=16&&h<20)n=(h-16)/4;else n=1-(h-5)/4;var r=document.documentElement;r.style.setProperty('--night',n.toFixed(4));r.dataset.phase=n<0.2?'day':n<0.55?'dusk':n<0.85?'evening':'night';})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable}`}
      data-phase="night"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: nightBootScript }} />
      </head>
      <body className="antialiased">
        <TimeTheme />
        <ScrollPerf />
        <div className="flex min-h-screen bg-[var(--paper)]">
          <Sidebar />
          <main className="min-w-0 flex-1 bg-[var(--paper)] p-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
