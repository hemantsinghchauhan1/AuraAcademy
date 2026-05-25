"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { Sparkles, MessageSquare, Trash2, Calendar, Send, X, ArrowRight, Loader2, Minimize2, Bot } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function AiCopilotPanelClient({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompt list
  const suggestedPrompts = [
    "What should I study today?",
    "Explain DBMS normalization simply",
    "Generate Python practice questions",
  ];

  // Fetch conversation history when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/ai/chat");
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error("Error fetching AI history:", e);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Add user message optimistically
    const userMsg: Message = {
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();

      if (data.success && data.text) {
        const assistantMsg: Message = {
          role: "assistant",
          content: data.text,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errMsg: Message = {
          role: "assistant",
          content: `⚠️ Error: ${data.error || "Failed to get AI response."}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (e) {
      const errMsg: Message = {
        role: "assistant",
        content: "⚠️ Connection failure. Please try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear your Copilot chat history?")) {
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clear" }),
        });
        const data = await res.json();
        if (data.success) {
          setMessages([]);
        }
      } catch (e) {
        console.error("Clear AI history failed:", e);
      }
    }
  };

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setIsOpen(true);
    // Add user prompt card
    const userMsg: Message = {
      role: "user",
      content: "Generate my customized 7-day study plan checklist.",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generatePlan" }),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        const assistantMsg: Message = {
          role: "assistant",
          content: data.plan,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errMsg: Message = {
          role: "assistant",
          content: `⚠️ Error generating plan: ${data.error || "Please try again."}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (e) {
      const errMsg: Message = {
        role: "assistant",
        content: "⚠️ Connection error generating study plan.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple Markdown-to-HTML parser helper for AI replies
  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      let trimmed = line.trim();

      // Heading 3
      if (trimmed.startsWith("###")) {
        return <h3 key={idx} className="text-sm font-bold text-indigo-300 mt-3 mb-1.5">{trimmed.replace("###", "").trim()}</h3>;
      }
      // Heading 2
      if (trimmed.startsWith("##")) {
        return <h2 key={idx} className="text-base font-extrabold text-white mt-4 mb-2">{trimmed.replace("##", "").trim()}</h2>;
      }
      // Code block lines
      if (trimmed.startsWith("```")) {
        return null; // Skip wrapper line
      }

      // Inline code highlights or bold items
      let html = line;
      
      // Replace bold
      html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Replace inline code
      html = html.replace(/`(.*?)`/g, "<code class='bg-white/10 px-1 py-0.5 rounded text-[10px] text-pink-400 font-mono'>$1</code>");

      // Bullet items
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const bulletText = trimmed.slice(1).trim();
        return (
          <li key={idx} className="ml-4 list-disc text-[11px] text-gray-300 mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: bulletText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`(.*?)`/g, "<code class='bg-white/10 px-1 py-0.5 rounded text-[10px] text-pink-400 font-mono'>$1</code>") }} />
        );
      }

      // Standard text line
      return (
        <p key={idx} className="text-[11px] text-gray-300 mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      );
    });
  };

  return (
    <>
      {/* ─── FLOATING CO-PILOT ORB TRIGGER ─── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center group border border-white/10 filter drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]"
        title="IITM Academic Copilot"
      >
        <Bot className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out text-[11px] font-extrabold tracking-wider uppercase ml-0 group-hover:ml-2">
          Academic Copilot
        </span>
      </button>

      {/* ─── SLIDE-IN SIDEBAR PANEL ─── */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[450px] z-50 bg-[#07070c]/95 border-l border-white/5 shadow-2xl backdrop-blur-xl flex flex-col transition-transform duration-300 transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* PANEL HEADER */}
        <div className="p-4 border-b border-white/5 bg-gradient-to-r from-indigo-950/20 via-purple-950/20 to-slate-950/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded bg-indigo-600/10 border border-indigo-500/20">
              <Bot className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Aura Academy</h3>
              <p className="text-[9px] text-gray-500 font-bold">IITM AI Academic Copilot v1.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              disabled={messages.length === 0}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-30 cursor-pointer"
              title="Clear Conversation History"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* MESSAGES TIMELINE */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-6">
              <div className="h-14 w-14 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-2xl animate-pulse">
                🎓
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-200">Welcome to your AI Copilot</h4>
                <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                  I have contextual awareness of your selected subjects, weak areas, and streak status. Choose a prompt below or ask any question.
                </p>
              </div>

              {/* Action shortcuts */}
              <div className="w-full space-y-2.5 max-w-sm pt-2">
                <button
                  onClick={handleGeneratePlan}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-left text-xs text-indigo-400 font-bold hover:bg-indigo-600/20 transition-all cursor-pointer"
                >
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Generate 7-Day Study Checklist
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                {suggestedPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(p)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-left text-[11px] text-gray-400 font-semibold hover:text-white hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
                  >
                    <span>{p}</span>
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500/80" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, idx) => {
                const isAI = m.role === "assistant";
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      isAI ? "justify-start" : "justify-end"
                    }`}
                  >
                    {isAI && (
                      <div className="h-7 w-7 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-indigo-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] p-3.5 rounded-2xl text-xs relative ${
                        isAI
                          ? "bg-white/[0.02] border border-white/5 rounded-tl-sm text-gray-200"
                          : "bg-indigo-600/90 text-white rounded-tr-sm font-semibold"
                      }`}
                    >
                      {isAI ? (
                        renderMessageContent(m.content)
                      ) : (
                        <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      )}
                      <span className="text-[8px] text-gray-500 absolute bottom-1 right-2.5">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl rounded-tl-sm max-w-[80%] flex items-center space-x-2">
                    <span className="text-[10px] text-gray-500 italic">Thinking... compiling context</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* INPUT FORM TOOLBAR */}
        <div className="p-4 border-t border-white/5 bg-[#09090e]">
          {messages.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-2.5 pt-0.5 scrollbar-none">
              <button
                onClick={handleGeneratePlan}
                className="shrink-0 px-3 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 hover:bg-indigo-600/20 transition-all cursor-pointer flex items-center"
              >
                📅 Generate Study Plan
              </button>
              {suggestedPrompts.slice(1).map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(p)}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-[10px] font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  {p.length > 25 ? p.slice(0, 22) + "..." : p}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or request syllabus revision guides..."
              disabled={isLoading}
              className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/30 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
