import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import { logoutUser } from "@/services/authActions";
import { Calculator, Cpu, Atom } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Campus Student Ecosystem",
  description: "A premium student workspace for interactive quizzes, performance analytics, and community learning.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
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
                <a href="/" className="text-xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity">
                  Aura<span className="text-indigo-400">Academy</span>
                </a>
              </div>

              {/* Navigation Links */}
              <nav className="hidden md:flex space-x-8">
                <a href="/" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Home</a>
                <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Dashboard</a>
                <a href="/leaderboard" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Leaderboard</a>
              </nav>

              {/* Auth / Profile Actions */}
              <div className="flex items-center space-x-4">
                {user ? (
                  <div className="flex items-center space-x-4">
                    {/* User Performance Pills */}
                    <div className="hidden sm:flex items-center space-x-2">
                      {/* Streak Pill */}
                      <div className="flex items-center space-x-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-xs font-semibold text-orange-400">
                        <span>🔥</span>
                        <span>{user.profile?.streak || 0} Days</span>
                      </div>
                      {/* XP Pill */}
                      <div className="flex items-center space-x-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold text-indigo-400">
                        <span>⭐</span>
                        <span>{user.profile?.xp || 0} XP</span>
                      </div>
                    </div>

                    {/* Profile Dropdown Simulation */}
                    <div className="relative group">
                      <button className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                          {user.profile?.name?.[0] || user.email?.[0]}
                        </div>
                        <span className="hidden sm:inline text-sm font-medium text-gray-200">
                          {user.profile?.name || "Student"}
                        </span>
                      </button>

                      {/* Dropdown Menu (Hover Triggered for Premium UX) */}
                      <div className="absolute right-0 mt-2 w-56 glass-panel rounded-xl shadow-2xl p-2 hidden group-hover:block hover:block transition-all border border-white/10">
                        <div className="px-3 py-2 border-b border-white/5 mb-1.5">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Signed In As</p>
                          <p className="text-sm font-bold truncate text-white">{user.profile?.name || "Student"}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        
                        <div className="sm:hidden px-3 py-1.5 space-y-1 bg-white/5 rounded-lg mb-2">
                          <div className="flex justify-between text-xs text-orange-400 font-semibold">
                            <span>Streak:</span>
                            <span>🔥 {user.profile?.streak} Days</span>
                          </div>
                          <div className="flex justify-between text-xs text-indigo-400 font-semibold">
                            <span>XP:</span>
                            <span>⭐ {user.profile?.xp} XP</span>
                          </div>
                        </div>

                        <a href="/dashboard" className="block w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-200 transition-colors">
                          My Dashboard
                        </a>
                        <a href="/dashboard?tab=attempts" className="block w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-200 transition-colors">
                          My Attempts
                        </a>
                        
                        <form action={logoutUser} className="mt-1 border-t border-white/5 pt-1">
                          <button
                            type="submit"
                            className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            Sign Out
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <a
                      href="/login"
                      className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                    >
                      Sign In
                    </a>
                    <a
                      href="/register"
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5"
                    >
                      Get Started
                    </a>
                  </div>
                )}
              </div>

            </div>
          </div>
        </header>

        {/* Core Main Layout */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Futuristic Glass Footer */}
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
  );
}
