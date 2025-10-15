import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Header } from "@/components/header"
import { Suspense } from "react"
import "./globals.css"

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
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
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
