"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/services/authActions";
import { Eye, EyeOff, Lock, Mail, User, Sparkles, AlertCircle } from "lucide-react";

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError("Please fill in all standard fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    startTransition(async () => {
      const res = await registerUser({ name, email, password });
      
      if (!res.success) {
        setError(res.error || "Failed to create account.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[20%] right-[30%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px]"></div>
      <div className="absolute bottom-[20%] left-[30%] w-[300px] h-[300px] rounded-full bg-indigo-600/10 blur-[80px]"></div>

      <div className="max-w-md w-full relative z-10">
        
        {/* Registration Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 items-center justify-center text-purple-400 mb-2">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Create Your Account
          </h2>
          <p className="text-sm text-gray-400">
            Join the collaborative student ecosystem today!
          </p>
        </div>

        {/* Card Body */}
        <div className="glass-panel p-8 rounded-2xl relative border border-white/10 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-2xl"></div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center space-x-2 text-sm text-red-400">
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Continue with Google button */}
          <div className="mb-5 space-y-4">
            <a
              href="/api/auth/callback/google?code=sandbox"
              className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl border border-white/10 hover:border-white/20 text-sm font-semibold text-gray-200 bg-white/5 hover:bg-white/8 transition-all hover:scale-[1.01] space-x-2.5"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </a>
            
            {/* Divider */}
            <div className="relative flex py-1.5 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">Or create email account</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Student Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  disabled={isPending}
                  className="glass-input pl-10 pr-3 py-2.5 w-full rounded-xl text-sm focus:outline-none transition-all"
                  placeholder="Alex Mercer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                University Email
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
                  placeholder="alex.mercer@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Password
              </label>
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

            {/* Signup bonus indicator */}
            <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex items-center justify-between text-xs text-indigo-300">
              <span className="font-medium flex items-center">⭐ Onboarding Gift:</span>
              <strong className="font-extrabold text-indigo-400">+100 Welcome XP Bonus!</strong>
            </div>

            {/* Register Submit */}
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
                  <span>Creating Account...</span>
                </div>
              ) : (
                <span>Register Account</span>
              )}
            </button>
          </form>

          {/* Quick autofill demo registration credentials */}
          <div className="mt-5 border-t border-white/5 pt-4">
            <button
              onClick={() => {
                const randomId = Math.floor(Math.random() * 900) + 100;
                setName(`Student #${randomId}`);
                setEmail(`student${randomId}@aura.edu`);
                setPassword("password123");
              }}
              disabled={isPending}
              className="w-full text-center text-xs text-purple-400 hover:text-purple-300 font-semibold py-1.5 rounded bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10"
            >
              ⚡ Click to Auto-generate Sandbox credentials
            </button>
          </div>

        </div>

        {/* Footer Link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign In Instead
          </a>
        </p>

      </div>
    </div>
  );
}