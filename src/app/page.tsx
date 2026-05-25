import { 
  ArrowRight, 
  BookOpen, 
  Activity, 
  MessageSquare, 
  Award, 
  TrendingUp, 
  Users, 
  ChevronRight, 
  ShieldCheck,
  Flame,
  Target,
  Sparkles
} from "lucide-react";
import { getDbUser } from "@/lib/auth";

export default async function Home() {
  const user = await getDbUser();

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Dynamic Animated Glows */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[20%] right-[15%] w-[450px] h-[450px] rounded-full bg-purple-500/10 blur-[120px] animate-pulse"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10">
        
        {/* HERO SECTION */}
        <div className="text-center space-y-6 max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-400 tracking-wide mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Introducing Phase 1 Next.js 16 Student Ecosystem</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
            The Ultimate Learning <br />
            <span className="text-gradient">Ecosystem for Students</span>
          </h1>

          <p className="mt-4 text-base sm:text-xl text-gray-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Practice previous year exam papers under interactive exam conditions, track microscopic topic weaknesses, and collaborate inside Reddit-style forums.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            {user ? (
              <a
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2"
              >
                <span>Enter Student Workspace</span>
                <ArrowRight className="h-5 w-5" />
              </a>
            ) : (
              <>
                <a
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2"
                >
                  <span>Get Started for Free</span>
                  <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 font-medium rounded-xl transition-all flex items-center justify-center"
                >
                  <span>Explore Sandbox Layout</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-28">
          {[
            { value: "40,000+", label: "Quizzes Answered", icon: Award, color: "text-amber-400" },
            { value: "100%", label: "Syllabus Covered", icon: ShieldCheck, color: "text-emerald-400" },
            { value: "24/7", label: "Peer Forum Help", icon: Users, color: "text-indigo-400" },
            { value: "98.4%", label: "Success Rating", icon: TrendingUp, color: "text-purple-400" },
          ].map((stat, idx) => (
            <div key={idx} className="glass-panel p-4 sm:p-6 rounded-2xl text-center space-y-1">
              <div className="flex justify-center mb-1">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <p className="text-xl sm:text-3xl font-extrabold text-white">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* PLATFORM SHOWCASE: LANDING PAGE MVP DEMOS */}
        <div className="space-y-24 mb-28">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-white mb-12">
            Engineered for <span className="text-gradient">Academic Mastery</span>
          </h2>

          {/* Feature 1: The Interactive Quiz Taker */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Exam-Conditioned Quiz Engine
              </h3>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                Take previous year question papers inside a premium, timed testing layout. Flag hard questions for review, monitor a highly responsive active timer, and instantly submit to receive a fully broken-down analytical response card.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center space-x-2">
                  <span className="text-indigo-400">✔</span>
                  <span>Active timers with dynamic alerts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-indigo-400">✔</span>
                  <span>Side grid navigation for fast tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-indigo-400">✔</span>
                  <span>Question-wise review & step explanations</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7 glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
              {/* Header simulation */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <div className="space-y-0.5">
                  <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Practice Paper 1</span>
                  <h4 className="text-base font-bold text-white">Quantum Physics Midterm Exam</h4>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg text-xs font-bold text-red-400">
                  ⏱ 12:45
                </div>
              </div>
              {/* Question Simulation */}
              <div className="space-y-4">
                <p className="text-sm sm:text-base text-gray-200 font-semibold leading-relaxed">
                  Q3. Which of the following equations accurately summarizes Heisenberg's Uncertainty Principle for position and momentum?
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: "A. Δx · Δp ≥ h / (4π)", active: true, correct: true },
                    { label: "B. Δx · Δp ≤ h / (2π)", active: false },
                    { label: "C. E = h · ν", active: false },
                    { label: "D. λ = h / p", active: false },
                  ].map((opt, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        opt.active 
                          ? "bg-indigo-600/20 border-indigo-500/40 text-white font-medium" 
                          : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Weak Topic Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 order-last lg:order-first glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <div>
                  <h4 className="text-base font-bold text-white">Accuracy & Weak Topics Tracker</h4>
                  <p className="text-xs text-gray-500">Dynamic system diagnostic updates</p>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg text-xs font-bold text-indigo-400 flex items-center space-x-1">
                  <Flame className="h-3 w-3 text-orange-400" />
                  <span>Streaks: 5 Days</span>
                </div>
              </div>

              {/* Progress Charts / SVG bars */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-300">
                    <span>Mathematics (Matrices & Eigenvalues)</span>
                    <span className="text-red-400">42% (Need Review)</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full w-[42%]"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-300">
                    <span>Computer Science (Distributed System Design)</span>
                    <span className="text-yellow-400">68% (Improving)</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full w-[68%]"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-300">
                    <span>Physics (Thermodynamics)</span>
                    <span className="text-emerald-400">92% (Excellence)</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full w-[92%]"></div>
                  </div>
                </div>
              </div>

              {/* Dynamic recommendation alert */}
              <div className="mt-5 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-start space-x-2 text-xs text-orange-400">
                <span className="text-sm">💡</span>
                <p>
                  <strong>Weak Topic Alert:</strong> Your accuracy in Linear Algebra determinants is currently at 42%. Try taking the <strong>Linear Algebra & Vectors</strong> Quiz on your dashboard to level up!
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Micro-Analytics Diagnostics
              </h3>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                No more guessing. Our dynamic diagnostic system tracks every response option you choose and groups them by exact subject categories. It automatically isolates your weak fields and lists them right on your home dashboard screen.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-400">✔</span>
                  <span>Interactive SVG performance analytics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-400">✔</span>
                  <span>Automated Weak Topics classification</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-400">✔</span>
                  <span>XP gains and streak boost modifiers</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Feature 3: Reddit-Style Forums */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Collaborative Peer Forums
              </h3>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                Connect and pair up with classmates. Upvote answers to complicated previous-year paper equations, post assignments, receive tips from instructors, and unlock combined learning milestones inside high-speed, modern student channels.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center space-x-2">
                  <span className="text-purple-400">✔</span>
                  <span>Threaded post layouts with voting score</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-purple-400">✔</span>
                  <span>Markdown & code syntax support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-purple-400">✔</span>
                  <span>Direct instructor answers indicator</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7 glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              {/* Forum card */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-semibold">r/QuantumMath</span>
                  <span className="text-gray-500">Posted by u/QuantumLearner</span>
                  <span className="text-gray-600">• 2h ago</span>
                </div>
                
                <h4 className="text-base font-bold text-white leading-snug">
                  Stuck on eigenvalues decomposition for Hamiltonian matrix representations?
                </h4>
                
                <p className="text-xs text-gray-400 line-clamp-2">
                  Can someone explain why the spectral theorem guarantees all hermitian operators must be diagonalizable with orthogonal eigenvectors?
                </p>

                <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3 mt-4 text-gray-400">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1 hover:text-indigo-400 cursor-pointer">
                      <span>🔺</span>
                      <strong className="text-white text-xs">48 upvotes</strong>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>💬</span>
                      <span>14 comments</span>
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">✓ Solved by Instructor</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* CALL TO ACTION */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl text-center space-y-6 max-w-5xl mx-auto relative overflow-hidden border border-white/5">
          <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-indigo-500/10 blur-2xl"></div>
          <div className="absolute -left-16 -bottom-16 w-44 h-44 rounded-full bg-purple-500/10 blur-2xl"></div>

          <h3 className="text-3xl sm:text-5xl font-extrabold text-white">
            Ready to Level Up Your <span className="text-gradient">Student Streak?</span>
          </h3>
          <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Gain immediate access to premium practice quizzes, live accuracy analysis, weak subject identification tools, and student community discussions today.
          </p>

          <div className="pt-2">
            {user ? (
              <a
                href="/dashboard"
                className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg transition-all hover:scale-[1.02]"
              >
                <span>Open Dashboard</span>
                <ChevronRight className="h-4.5 w-4.5" />
              </a>
            ) : (
              <a
                href="/register"
                className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg transition-all hover:scale-[1.02]"
              >
                <span>Register Your Account</span>
                <ChevronRight className="h-4.5 w-4.5" />
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}