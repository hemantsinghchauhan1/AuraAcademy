"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Award, 
  ArrowRight, 
  Check, 
  Info, 
  Brain, 
  Cpu, 
  Sparkles,
  BookOpen
} from "lucide-react";
import { completeOnboardingAction, checkUsernameUniqueness } from "@/services/onboardingService";
import { DegreeTrack } from "@prisma/client";

interface Subject {
  id: string;
  code: string | null;
  name: string;
  level: string | null;
  icon: string;
}

interface OnboardingClientProps {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
  autoDetected: {
    isOfficial: boolean;
    degreeTrack: "BS_DATA_SCIENCE" | "BS_ELECTRONIC_SYSTEMS" | null;
    rollNumber: string;
  };
  subjectsList: {
    BS_DATA_SCIENCE: Record<string, Subject[]>;
    BS_ELECTRONIC_SYSTEMS: Record<string, Subject[]>;
  };
}

export default function OnboardingClient({
  user,
  autoDetected,
  subjectsList,
}: OnboardingClientProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [track, setTrack] = useState<DegreeTrack>(
    autoDetected.degreeTrack || "BS_DATA_SCIENCE"
  );
  const [rollNumber, setRollNumber] = useState(autoDetected.rollNumber || "");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeLevelTab, setActiveLevelTab] = useState<string>("FOUNDATION");

  // Username states
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);

  // Debounced username validator hook
  useEffect(() => {
    if (!username) {
      setUsernameError(null);
      setUsernameChecked(false);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const res = await checkUsernameUniqueness(username, user.id);
        if (res.available) {
          setUsernameError(null);
          setUsernameChecked(true);
        } else {
          setUsernameError(res.error || "Username is already taken.");
          setUsernameChecked(false);
        }
      } catch (err) {
        setUsernameError("Connection error validating username.");
      } finally {
        setUsernameChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [username, user.id]);

  // Auto-detect levels categories based on selected track
  const subjectsGroup = subjectsList[track] || {};
  const levelTabs = Object.keys(subjectsGroup).filter(
    (lvl) => subjectsGroup[lvl] && subjectsGroup[lvl].length > 0
  );

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(id)) {
        return prev.filter((subId) => subId !== id);
      }
      if (prev.length >= 4) return prev; // Limit to 4 active subjects
      return [...prev, id];
    });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!username || usernameError || !usernameChecked) {
        alert(usernameError || "Please choose a valid unique username before continuing.");
        return;
      }
      // Set active tab to the first level tab for the selected track
      if (levelTabs.length > 0) {
        setActiveLevelTab(levelTabs[0]);
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const res = await completeOnboardingAction(user.id, {
        username: username,
        degreeTrack: track,
        rollNumber: autoDetected.isOfficial ? autoDetected.rollNumber : rollNumber,
        isOfficialIITM: autoDetected.isOfficial,
        selectedSubjectIds: selectedSubjects,
      });

      if (res.success) {
        // Dynamic celebration and redirect
        window.location.href = "/dashboard";
      } else {
        alert(res.error || "Onboarding completion failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl space-y-8">
      {/* Background ambient glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>

      {/* HEADER WIZARD INDICATOR */}
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <div>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">AuraAcademy Workspace Setup</span>
          <h2 className="text-xl font-bold text-white mt-1">Student Onboarding</h2>
        </div>
        
        {/* Step indicators */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
          <span className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
            step >= 1 ? "bg-indigo-600 border-indigo-600 text-white" : "border-white/10"
          }`}>1</span>
          <span className="w-4 h-px bg-white/5"></span>
          <span className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
            step >= 2 ? "bg-indigo-600 border-indigo-600 text-white" : "border-white/10"
          }`}>2</span>
          <span className="w-4 h-px bg-white/5"></span>
          <span className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
            step >= 3 ? "bg-indigo-600 border-indigo-600 text-white" : "border-white/10"
          }`}>3</span>
        </div>
      </div>

      {/* STEP 1: OFFICIAL PATH DETECTION */}
      {step === 1 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              <span>Academic Identity Verification</span>
            </h3>
            <p className="text-xs text-gray-400">Verify your degree track and active roll number for intelligent platform personalized integration.</p>
          </div>

          {autoDetected.isOfficial ? (
            /* OFFICIAL IITM DETECTED VIEW */
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Official IITM Verified
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold font-mono">Roll: {autoDetected.rollNumber}</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-2">
                  {autoDetected.degreeTrack === "BS_DATA_SCIENCE" 
                    ? "BS in Data Science & Applications" 
                    : "BS in Electronic Systems"
                  }
                </h4>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Your official student email has been mapped. Academic calendars, PYQ guides, and quiz recommendations are fully personalized out-of-the-box.
                </p>
              </div>
              <span className="text-3xl filter drop-shadow-[0_2px_6px_rgba(16,185,129,0.3)]">🎓</span>
            </div>
          ) : (
            /* NON-OFFICIAL MANUAL CHOOSE FLOW */
            <div className="space-y-5">
              
              {/* Informational Warning notice */}
              <div className="p-4 bg-orange-500/5 border border-orange-500/15 rounded-xl flex items-start gap-3">
                <Info className="h-4.5 w-4.5 text-orange-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  <strong className="text-orange-400">Informational:</strong> Login with your official IITM email to unlock automatic subject mapping, IITM verification, academic calendar sync, and personalized IITM features. 
                  <span className="block mt-0.5 text-gray-500">Do not worry! You can still continue manual setup below without official credentials.</span>
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Choose Your Academic Track</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* DS CARD */}
                  <button
                    onClick={() => setTrack("BS_DATA_SCIENCE")}
                    className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all hover:scale-[1.01] ${
                      track === "BS_DATA_SCIENCE"
                        ? "bg-indigo-600/10 border-indigo-500/40 text-white"
                        : "bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-2xl">📊</span>
                    <div>
                      <h4 className="font-bold text-sm text-white">BS in Data Science</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Machine Learning, Analytics, big data paths</p>
                    </div>
                  </button>

                  {/* ES CARD */}
                  <button
                    onClick={() => setTrack("BS_ELECTRONIC_SYSTEMS")}
                    className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all hover:scale-[1.01] ${
                      track === "BS_ELECTRONIC_SYSTEMS"
                        ? "bg-indigo-600/10 border-indigo-500/40 text-white"
                        : "bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h4 className="font-bold text-sm text-white">BS in Electronic Systems</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Circuits, Signal Processing, Embedded IoT paths</p>
                    </div>
                  </button>

                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Student Roll Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 24f2005964"
                  className="glass-input px-3.5 py-2.5 rounded-xl text-sm w-full focus:outline-none"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* USERNAME SYSTEM - FORCED CREATION */}
          <div className="space-y-2 pt-4 border-t border-white/5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Choose Unique Academic Slug / Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. hemant, 24f2005964"
                className={`glass-input px-3.5 py-2.5 rounded-xl text-sm w-full focus:outline-none font-mono ${
                  usernameError 
                    ? "border-red-500/50 focus:border-red-500" 
                    : usernameChecked 
                    ? "border-emerald-500/50 focus:border-emerald-500" 
                    : ""
                }`}
                value={username}
                onChange={(e) => {
                  const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                  setUsername(cleaned);
                }}
              />
              {usernameChecking && (
                <span className="absolute right-3.5 top-3 text-[10px] text-gray-500">Checking...</span>
              )}
            </div>
            {usernameError && (
              <p className="text-[10px] text-red-400 font-medium">{usernameError}</p>
            )}
            {usernameChecked && !usernameError && (
              <p className="text-[10px] text-emerald-400 font-medium">✨ Username is available! Public profile: /u/{username}</p>
            )}
            <p className="text-[10px] text-gray-500">Only lowercase letters, numbers, underscores, and hyphens allowed. Must be 3-20 characters.</p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleNextStep}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-900/15"
            >
              <span>Continue Setup</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: ACTIVE SUBJECT SELECTOR */}
      {step === 2 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                <span>Active Semester Subjects</span>
              </h3>
              <p className="text-xs text-gray-400">Select active semester papers to optimize dashboard recommendations andTimed PYQ indexes.</p>
            </div>
            
            {/* Selected Counter */}
            <span className={`px-3 py-1 rounded-lg text-xs font-extrabold border ${
              selectedSubjects.length === 4 
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                : "bg-white/5 border-white/10 text-gray-400"
            }`}>
              {selectedSubjects.length} / 4 Selected
            </span>
          </div>

          {/* Level groupings Tab bar */}
          {levelTabs.length > 0 ? (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2 pb-1.5 border-b border-white/5">
                {levelTabs.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setActiveLevelTab(lvl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase ${
                      activeLevelTab === lvl
                        ? "bg-indigo-600 text-white shadow"
                        : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {lvl.replace(/_/g, " ")}
                  </button>
                ))}
              </div>

              {/* Subjects cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                {(subjectsGroup[activeLevelTab] || []).map((sub) => {
                  const active = selectedSubjects.includes(sub.id);
                  const limitMet = selectedSubjects.length >= 4;
                  
                  return (
                    <button
                      key={sub.id}
                      disabled={!active && limitMet}
                      onClick={() => toggleSubject(sub.id)}
                      className={`p-4 rounded-xl border text-left flex justify-between items-start gap-4 transition-all ${
                        active
                          ? "bg-indigo-600/10 border-indigo-500/40 text-white"
                          : !active && limitMet
                          ? "bg-white/[0.005] border-white/5 opacity-40 cursor-not-allowed text-gray-600"
                          : "bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold font-mono text-indigo-400">{sub.code}</span>
                        <h4 className="font-bold text-xs text-white leading-snug">{sub.name}</h4>
                      </div>
                      
                      {active ? (
                        <span className="h-5 w-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="h-5 w-5 rounded-full border border-white/10 flex-shrink-0"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-gray-500 italic bg-white/[0.01] rounded-xl border border-white/5">
              Subjects mapping in preparation. Click next step to proceed.
            </div>
          )}

          {/* Glowing Warning */}
          {selectedSubjects.length === 4 && (
            <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl flex items-center gap-2 text-[10px] text-purple-400">
              <Sparkles className="h-4 w-4" />
              <span><strong>Maximum Limit Reached:</strong> Focus optimized on these 4 active subjects tracks. Differentiate selections by clicking active items.</span>
            </div>
          )}

          {/* Action buttons footer */}
          <div className="pt-4 flex justify-between items-center gap-4 border-t border-white/5">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
            >
              Back
            </button>
            <button
              onClick={handleNextStep}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-900/15"
            >
              <span>Review Setup</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & COMPLETE */}
      {step === 3 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              <span>Verify & Complete setup</span>
            </h3>
            <p className="text-xs text-gray-400">Review your final academic selections before launching your student workspace dashboard.</p>
          </div>

          <div className="space-y-4">
            
            {/* Grid details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Academic Path summary */}
              <div className="p-4 bg-white/2 border border-white/5 rounded-xl space-y-1.5">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">IITM Academic Track</p>
                <p className="text-xs font-bold text-white">
                  {track === "BS_DATA_SCIENCE" 
                    ? "BS in Data Science & Applications" 
                    : "BS in Electronic Systems"
                  }
                </p>
                <p className="text-[10px] text-gray-400">
                  {autoDetected.isOfficial ? "Verified Official Account" : "Manual Path Setup"}
                </p>
              </div>

              {/* Student Roll summary */}
              <div className="p-4 bg-white/2 border border-white/5 rounded-xl space-y-1.5">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Student Identity</p>
                <p className="text-xs font-bold text-white font-mono">
                  {autoDetected.isOfficial 
                    ? autoDetected.rollNumber 
                    : rollNumber || "No Roll Number Provided"
                  }
                </p>
                <p className="text-[10px] text-gray-400">
                  {autoDetected.isOfficial ? "Official Roll lock" : "Manual Roll Input"}
                </p>
              </div>

              {/* Username summary */}
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-1.5 col-span-1 sm:col-span-2 font-mono">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Public Scholar Username</p>
                <p className="text-xs font-bold text-white">
                  /u/{username}
                </p>
                <p className="text-[10px] text-indigo-300">
                  Your public profile will be searchable and accessible by other IITM scholars at this slug.
                </p>
              </div>

            </div>

            {/* Active Subjects summary list */}
            <div className="p-5 bg-white/2 border border-white/5 rounded-xl space-y-3">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Active semester subjects ({selectedSubjects.length})</p>
              
              {selectedSubjects.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No active semester subjects selected. You can manage selections later.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedSubjects.map((subId) => {
                    // Find subject details
                    let foundSub = null;
                    for (const lvl of Object.keys(subjectsGroup)) {
                      const match = subjectsGroup[lvl].find((s) => s.id === subId);
                      if (match) {
                        foundSub = match;
                        break;
                      }
                    }
                    if (!foundSub) return null;
                    return (
                      <div key={subId} className="flex gap-2 items-center p-2 bg-[#0c0a1c] border border-indigo-500/10 rounded-lg text-xs">
                        <span className="text-[9px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{foundSub.code}</span>
                        <span className="font-bold text-white truncate max-w-[200px]">{foundSub.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Action buttons footer */}
          <div className="pt-4 flex justify-between items-center gap-4 border-t border-white/5">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-purple-900/15"
            >
              {loading ? (
                <span>Launching...</span>
              ) : (
                <>
                  <span>Complete Setup</span>
                  <Check className="h-4 w-4" strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
