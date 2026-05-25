import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { getDbUser } from "@/lib/auth";
import HeaderAuth from "./HeaderAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuraAcademy — Student Ecosystem",
  description:
    "A premium student workspace for interactive quizzes, performance analytics, and community learning.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch Prisma user for streak/XP pills (null-safe — unauthenticated shows nothing)
  const dbUser = await getDbUser();
  const streak = (dbUser as any)?.profile?.streak ?? 0;
  const xp = (dbUser as any)?.profile?.xp ?? 0;

  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#09090b",
          fontFamily: "var(--font-geist-sans), Inter, sans-serif",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
        style={{ colorScheme: "dark" }}
      >
        <body className="min-h-full flex flex-col bg-[#09090b] text-[#fafafa]">

          {/* Sleek Dynamic Glass Header */}
          <header className="sticky top-0 z-50 bg-[#09090b]/60 backdrop-blur-md border-b border-white/5 transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">

                {/* Brand Logo */}
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="font-bold text-white text-base">Ω</span>
                  </div>
                  <a
                    href="/"
                    className="text-xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity"
                  >
                    Aura<span className="text-indigo-400">Academy</span>
                  </a>
                </div>

                {/* Navigation Links */}
                <nav className="hidden md:flex space-x-8">
                  <a href="/" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Home</a>
                  <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Dashboard</a>
                  <a href="/quiz" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Quizzes</a>
                  <a href="/leaderboard" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Leaderboard</a>
                </nav>

                {/* Auth Controls — Client Component (uses SignedIn/SignedOut/UserButton) */}
                <HeaderAuth streak={streak} xp={xp} />

              </div>
            </div>
          </header>

          {/* Core Main Layout */}
          <main className="flex-1 flex flex-col">{children}</main>

          {/* Glass Footer */}
          <footer className="bg-[#09090b]/80 border-t border-white/5 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">Ω AuraAcademy</span>
                  <span className="text-gray-600 text-xs">|</span>
                  <p className="text-gray-500 text-xs">
                    © 2026 AuraAcademy. All rights reserved.
                  </p>
                </div>
                <div className="flex space-x-6 text-xs text-gray-500">
                  <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
                  <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
                  <a href="#" className="hover:text-gray-300 transition-colors">Syllabus Guide</a>
                  <a href="#" className="hover:text-gray-300 transition-colors">Support</a>
                </div>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
