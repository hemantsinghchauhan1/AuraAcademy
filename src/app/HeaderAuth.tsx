"use client";

import { useUser, SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

interface HeaderAuthProps {
  streak?: number;
  xp?: number;
}

export default function HeaderAuth({ streak = 0, xp = 0 }: HeaderAuthProps) {
  const { isSignedIn, isLoaded } = useUser();

  // Show nothing until Clerk has loaded (avoids hydration flicker)
  if (!isLoaded) {
    return (
      <div className="flex items-center space-x-3">
        <div className="h-8 w-20 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center space-x-3">
        {/* Performance Pills */}
        <div className="hidden sm:flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-xs font-semibold text-orange-400">
            <span>🔥</span>
            <span>{streak} Days</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold text-indigo-400">
            <span>⭐</span>
            <span>{xp} XP</span>
          </div>
        </div>

        {/* Clerk UserButton — avatar, profile management, sign-out */}
        <UserButton
          appearance={{
            baseTheme: dark,
            elements: {
              avatarBox:
                "h-8 w-8 ring-2 ring-indigo-500/30 ring-offset-2 ring-offset-[#09090b]",
              userButtonPopoverCard:
                "bg-[#0d0d12] border border-white/10 shadow-2xl",
              userButtonPopoverActionButton: "hover:bg-white/5 text-gray-200",
              userButtonPopoverActionButtonText: "text-gray-200",
              userButtonPopoverFooter: "hidden",
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <SignInButton mode="redirect">
        <button className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
          Sign In
        </button>
      </SignInButton>
      <SignInButton mode="redirect">
        <a
          href="/sign-up"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5"
        >
          Get Started
        </a>
      </SignInButton>
    </div>
  );
}
