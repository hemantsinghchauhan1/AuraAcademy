"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/services/authActions";
import { Eye, EyeOff, Lock, Mail, Sparkles, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    startTransition(async () => {
      const res = await loginUser({ email, password });
      
      if (!res.success) {
        setError(res.error || "Invalid email or password.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  return (
    <div className="max-w-md w-full relative z-10">
      
      {/* Brand/Welcome Header */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center text-indigo-400 mb-2">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Welcome Back
        </h2>
        <p className="text-sm text-gray-400">
          Sign in to continue your student learning streak.
        </p>
      </div>

      {/* Card Panel */}
      <div className="glass-panel p-8 rounded-2xl relative border border-white/10 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl"></div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center space-x-2 text-sm text-red-400">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          
          {/* Email Field */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={isPending}
                className="glass-input pl-10 pr-3 py-2.5 w-full rounded-xl text-sm focus:outline-none transition-all"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                Forgot Password?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                disabled={isPending}
                className="glass-input pl-10 pr-10 py-2.5 w-full rounded-xl text-sm focus:outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember Session checkbox */}
          <div className="flex items-center">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-gray-700 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
            />
            <label htmlFor="remember" className="ml-2 block text-xs text-gray-400 font-medium cursor-pointer">
              Keep me signed in for 7 days
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl border border-transparent text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            {isPending ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Authenticating...</span>
              </div>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Direct Sandbox Quick login mock */}
        <div className="mt-5 border-t border-white/5 pt-4">
          <button
            onClick={() => {
              setEmail("math.student@aura.edu");
              setPassword("password123");
            }}
            disabled={isPending}
            className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold py-1.5 rounded bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10"
          >
            ⚡ Click to Auto-fill Demo credentials
          </button>
        </div>

      </div>

      {/* Footer Link */}
      <p className="absolute bottom-[-40px] left-0 right-0 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <a href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
          Create an Account
        </a>
      </p>
    </div>
  );
}

export default function Login() {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[20%] left-[30%] w-[300px] h-[300px] rounded-full bg-indigo-600/10 blur-[80px]"></div>
      <div className="absolute bottom-[20%] right-[30%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px]"></div>

      <Suspense fallback={
        <div className="max-w-md w-full py-16 text-center space-y-4">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-400 text-sm font-semibold">Loading authentication portal...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}