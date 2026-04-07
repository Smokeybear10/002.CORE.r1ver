import type { Metadata } from "next"
import { Instrument_Serif, JetBrains_Mono } from "next/font/google"
import { ScrollManager } from "./components/scroll-manager"
import "./globals.css"

const serif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
})

const mono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "R1VER | Poker Intelligence",
  description: "A solver you can watch think.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body suppressHydrationWarning>
        <ScrollManager />
        {children}
      </body>
    </html>
  )
}
