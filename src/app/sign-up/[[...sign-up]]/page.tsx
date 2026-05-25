import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute top-[20%] right-[30%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[30%] w-[300px] h-[300px] rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-1">
          <div className="inline-flex h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 items-center justify-center text-purple-400 mb-3">
            <span className="text-lg font-bold">Ω</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Join AuraAcademy
          </h1>
          <p className="text-sm text-gray-400">
            Create your account and get +100 Welcome XP
          </p>
        </div>

        {/* Clerk SignUp with dark glassmorphism appearance */}
        <SignUp
          appearance={{
            layout: {
              logoPlacement: "none",
              socialButtonsPlacement: "top",
              socialButtonsVariant: "blockButton",
            },
            variables: {
              colorBackground: "rgba(13, 13, 18, 0.95)",
              colorText: "#f4f4f5",
              colorTextSecondary: "#a1a1aa",
              colorPrimary: "#6366f1",
              colorDanger: "#f87171",
              colorInputBackground: "rgba(255, 255, 255, 0.04)",
              colorInputText: "#f4f4f5",
              borderRadius: "0.75rem",
              fontFamily: "var(--font-geist-sans), Inter, sans-serif",
              fontSize: "0.875rem",
            },
            elements: {
              card: "bg-transparent shadow-none p-0",
              rootBox: "w-full max-w-md",
              formButtonPrimary:
                "bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]",
              formFieldInput:
                "bg-white/[0.04] border border-white/[0.08] text-white rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all",
              formFieldLabel: "text-xs font-semibold text-gray-400 uppercase tracking-wider",
              socialButtonsBlockButton:
                "bg-white/[0.05] border border-white/10 text-gray-200 hover:bg-white/[0.09] hover:border-white/20 rounded-xl transition-all",
              dividerLine: "bg-white/[0.06]",
              dividerText: "text-gray-500 text-xs uppercase tracking-widest",
              footerActionLink: "text-indigo-400 hover:text-indigo-300 font-semibold",
              identityPreviewEditButton: "text-indigo-400 hover:text-indigo-300",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              alertText: "text-red-400 text-sm",
            },
          }}
        />
      </div>
    </div>
  );
}
