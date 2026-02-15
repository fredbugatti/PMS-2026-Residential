import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import AppLayout from '@/components/AppLayout'
import { ToastProvider } from '@/components/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sanprinon - Warehouse Management',
  description: 'Professional warehouse management ledger system',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-slate-900`}>
        <ToastProvider>
          <AppLayout>{children}</AppLayout>
        </ToastProvider>
      </body>
    </html>
  )
}
