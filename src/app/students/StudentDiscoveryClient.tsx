"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createConversation, sendMessage } from "@/services/chatService";
import { 
  Search, 
  Filter, 
  Award, 
  Flame, 
  MessageSquare, 
  UserCheck, 
  ArrowUpRight, 
  Sliders,
  ChevronRight,
  Send,
  X,
  User
} from "lucide-react";

// --- TYPES & INTERFACES ---

interface StudentCard {
  id: string;
  username: string;
  role: string;
  rollNumber: string;
  degreeTrack: string;
  isOfficialIITM: boolean;
  name: string;
  avatarUrl: string | null;
  xp: string | number;
  streak: number;
  selectedSubjectIds: string[];
  selectedSubjectCodes: string[];
}

interface SubjectFilter {
  id: string;
  code: string | null;
  name: string;
}

interface StudentDiscoveryClientProps {
  initialStudents: StudentCard[];
  subjects: SubjectFilter[];
  currentUserId: string | null;
}

export default function StudentDiscoveryClient({
  initialStudents,
  subjects,
  currentUserId,
}: StudentDiscoveryClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const router = useRouter();
  
  // Filter states
  const [trackFilter, setTrackFilter] = useState<string>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [minXp, setMinXp] = useState<number>(0);
  const [hasStreakFilter, setHasStreakFilter] = useState<boolean>(false);

  // Message Overlay States
  const [messageOpen, setMessageOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<StudentCard | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Debouncing effect for instant search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Compute calculated values
  const getStudentLevel = (xp: string | number) => {
    const numericXp = Number(xp);
    if (numericXp < 1000) return 1;
    if (numericXp < 3000) return 2;
    if (numericXp < 6000) return 3;
    if (numericXp < 10000) return 4;
    return 5;
  };

  const getStudentLevelTitle = (level: number) => {
    switch (level) {
      case 1: return "Aura Initiate";
      case 2: return "DSA Apprentice";
      case 3: return "Circuits Adept";
      case 4: return "Systems Sentinel";
      default: return "Algorithm Overlord";
    }
  };

  // Filter students matrix
  const filteredStudents = initialStudents.filter((student) => {
    const searchString = `${student.username} ${student.name} ${student.rollNumber}`.toLowerCase();
    const matchesSearch = searchString.includes(debouncedSearch.toLowerCase());

    const matchesTrack = trackFilter === "ALL" || student.degreeTrack === trackFilter;
    const matchesSubject = subjectFilter === "ALL" || student.selectedSubjectIds.includes(subjectFilter);
    const matchesXp = Number(student.xp) >= minXp;
    const matchesStreak = !hasStreakFilter || student.streak > 0;

    return matchesSearch && matchesTrack && matchesSubject && matchesXp && matchesStreak;
  });

  // Mock message dispatcher
  const handleOpenMessage = (student: StudentCard) => {
    setTargetStudent(student);
    setMessageOpen(true);
  };

  // Send message action connecting with DB and redirect
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !targetStudent) return;
    if (!currentUserId) {
      alert("You must be logged in to send a note.");
      return;
    }

    setSending(true);
    try {
      // 1. Create or retrieve active DM conversation
      const convRes = await createConversation(currentUserId, {
        userIds: [currentUserId, targetStudent.id],
        isGroup: false,
      });

      if (!convRes.success || !convRes.conversation) {
        alert(convRes.error || "Failed to create conversation.");
        return;
      }

      // 2. Dispatch message content note
      const msgRes = await sendMessage(convRes.conversation.id, currentUserId, messageText);
      if (!msgRes.success) {
        alert(msgRes.error || "Failed to send message note.");
        return;
      }

      // 3. Clear states, close modal, and redirect to inbox
      setMessageText("");
      setMessageOpen(false);
      setToastMessage("✉️ Message dispatched! Redirecting to inbox...");
      setTargetStudent(null);
      
      setTimeout(() => {
        setToastMessage(null);
        router.push(`/messages?conversationId=${convRes.conversation!.id}`);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to send message note: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#09090b] border-2 border-indigo-500/30 text-indigo-400 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce font-medium text-xs">
          <span>✉️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SECURE DISPATCH MESSAGE MODAL */}
      {messageOpen && targetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full glass-panel border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Secure Peer Connection</span>
                <h3 className="text-lg font-bold text-white">Send Message to {targetStudent.name}</h3>
              </div>
              <button 
                onClick={() => {
                  setMessageOpen(false);
                  setTargetStudent(null);
                }}
                className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Your Message Note</label>
                <textarea
                  rows={4}
                  required
                  placeholder={`Hi ${targetStudent.name}, let's form a study group for ${targetStudent.selectedSubjectCodes[0] || "our shared classes"}!`}
                  className="glass-input p-3.5 rounded-xl text-sm w-full focus:outline-none focus:border-indigo-500/50 min-h-[100px] resize-none"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMessageOpen(false);
                    setTargetStudent(null);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow"
                >
                  {sending ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <span>Transmit Note</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILTER SEARCH BAR BOARD */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
        
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search scholars by username, real name, or official roll code..."
            className="w-full glass-input pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-white/20 transition-all font-sans"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-gray-500" />
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1.5">
          {/* Degree Track dropdown */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">IITM Degree Track</label>
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="glass-input px-3 py-2.5 rounded-xl text-xs w-full focus:outline-none"
            >
              <option value="ALL">All tracks</option>
              <option value="BS_DATA_SCIENCE">BS in Data Science</option>
              <option value="BS_ELECTRONIC_SYSTEMS">BS in Electronic Systems</option>
            </select>
          </div>

          {/* Subjects dropdown */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Syllabus Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="glass-input px-3 py-2.5 rounded-xl text-xs w-full focus:outline-none"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} — {sub.name.slice(0, 25)}...
                </option>
              ))}
            </select>
          </div>

          {/* Minimum XP slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">
              <span>Min XP score</span>
              <span className="text-indigo-400 font-mono font-extrabold">{minXp} XP</span>
            </div>
            <input
              type="range"
              min="0"
              max="20000"
              step="500"
              value={minXp}
              onChange={(e) => setMinXp(Number(e.target.value))}
              className="w-full accent-indigo-500 bg-white/5 h-1 rounded-lg cursor-pointer"
            />
          </div>

          {/* Streaks filter check */}
          <div className="flex items-end pb-1.5">
            <button
              onClick={() => setHasStreakFilter(prev => !prev)}
              className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                hasStreakFilter 
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-400" 
                  : "bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/5"
              }`}
            >
              <Flame className="h-4 w-4" />
              <span>Active study streak only</span>
            </button>
          </div>

        </div>
      </div>

      {/* DISCOVERY GRID TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-gray-500 italic bg-white/[0.01] border border-white/5 border-dashed rounded-3xl p-6">
            No scholars match your search criteria. Try modifying your filter indexes.
          </div>
        ) : (
          filteredStudents.map((student) => {
            const level = getStudentLevel(student.xp);
            const levelTitle = getStudentLevelTitle(level);
            const isSelf = student.id === currentUserId;

            return (
              <div 
                key={student.id} 
                className={`glass-panel p-5 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between h-[210px] relative overflow-hidden group ${
                  isSelf ? "border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]" : "border-white/5 hover:border-white/10"
                }`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/[0.02] to-indigo-500/[0.02] rounded-full blur-xl pointer-events-none"></div>
                
                {/* Top Section Info */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start gap-4">
                    
                    {/* Avatar credentials */}
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow flex-shrink-0 flex items-center justify-center">
                        {student.avatarUrl ? (
                          <img 
                            src={student.avatarUrl} 
                            alt={student.name} 
                            className="h-full w-full rounded-[9px] object-cover bg-neutral-900"
                          />
                        ) : (
                          <div className="h-full w-full rounded-[9px] bg-[#0c0c14] flex items-center justify-center text-base text-white font-extrabold">
                            {student.name[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-sm text-white leading-tight group-hover:text-indigo-400 transition-colors truncate max-w-[120px]">
                          {student.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 font-mono truncate max-w-[110px]">/u/{student.username}</p>
                      </div>
                    </div>

                    {/* Official IITM Verified Badge */}
                    {student.isOfficialIITM && (
                      <span className="text-[8px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                        <UserCheck className="h-2.5 w-2.5" />
                        <span>IITM</span>
                      </span>
                    )}

                  </div>

                  {/* Syllabus Selected Subject badges */}
                  <div className="flex gap-1.5 flex-wrap">
                    {student.selectedSubjectCodes.slice(0, 3).map((code, idx) => (
                      <span key={idx} className="text-[8px] font-bold font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400">
                        {code}
                      </span>
                    ))}
                    {student.selectedSubjectCodes.length > 3 && (
                      <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-gray-500">
                        +{student.selectedSubjectCodes.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Level / Streak metrics cards */}
                <div className="flex justify-between items-center py-2 border-t border-b border-white/[0.03] my-3 text-[10px] font-mono text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="text-orange-400 animate-pulse">🔥</span>
                    <span>{student.streak} Streak</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-indigo-400">⭐</span>
                    <span>{student.xp} XP</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Award className="h-3 w-3 text-purple-400" />
                    <span>Lvl {level}</span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex gap-2">
                  <a 
                    href={`/u/${student.username}`}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white rounded-lg text-[10px] font-bold text-center flex items-center justify-center gap-0.5 transition-all"
                  >
                    <span>View Profile</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                  {!isSelf && (
                    <button 
                      onClick={() => handleOpenMessage(student)}
                      className="px-2.5 py-1.5 bg-[#09090b]/40 hover:bg-[#0c0a1c] border border-white/5 hover:border-indigo-500/20 text-gray-400 hover:text-white rounded-lg text-[10px] transition-all flex items-center justify-center"
                      title="Send Peer Note"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
