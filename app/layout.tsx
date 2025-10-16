import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Header } from "@/components/header"
import { Suspense } from "react"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "AI Data Engineer",
  description: "Intelligent data engineering platform",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${geistSans.variable} ${geistMono.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress unhandled promise rejections from browser extensions (e.g., MetaMask)
              window.addEventListener('unhandledrejection', function(event) {
                // Check if error is from MetaMask or other external sources
                if (event.reason && (
                  event.reason.message?.includes('MetaMask') ||
                  event.reason.message?.includes('ethereum') ||
                  event.reason.message?.includes('web3')
                )) {
                  console.log('[App] Suppressed external error:', event.reason.message);
                  event.preventDefault();
                }
              });
            `,
          }}
        />
        <Suspense fallback={<div>Loading...</div>}>
          <Header />
        </Suspense>
        <main className="min-h-screen">{children}</main>
        <Analytics />
      </body>
    </html>
  )
}
