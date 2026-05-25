"use client";

import React, { useState } from "react";
import { Difficulty } from "@prisma/client";
import { createAdminQuizAction } from "@/services/adminActions";
import { useRouter } from "next/navigation";

interface QuizCreatorProps {
  subjects: any[];
}

interface QuestionInput {
  questionText: string;
  explanation: string;
  correctAnswer: string; // A, B, C, D
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export default function QuizCreator({ subjects }: QuizCreatorProps) {
  const router = useRouter();

  // Tab State: "manual" | "bulk"
  const [activeTab, setActiveTab] = useState<"manual" | "bulk">("manual");

  // Core quiz configuration
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [timeLimit, setTimeLimit] = useState<number | "">("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");

  // Manual Composer questions list
  const [questions, setQuestions] = useState<QuestionInput[]>([
    {
      questionText: "",
      explanation: "",
      correctAnswer: "A",
      options: { A: "", B: "", C: "", D: "" }
    }
  ]);

  // Bulk JSON uploader state
  const [bulkJson, setBulkJson] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        explanation: "",
        correctAnswer: "A",
        options: { A: "", B: "", C: "", D: "" }
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].questionText = text;
    setQuestions(updated);
  };

  const handleExplanationChange = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].explanation = text;
    setQuestions(updated);
  };

  const handleCorrectAnswerChange = (index: number, label: string) => {
    const updated = [...questions];
    updated[index].correctAnswer = label;
    setQuestions(updated);
  };

  const handleOptionChange = (index: number, label: "A" | "B" | "C" | "D", text: string) => {
    const updated = [...questions];
    updated[index].options[label] = text;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !subjectId) {
      setError("Please complete all general quiz fields (Title, Description, Subject).");
      return;
    }

    setLoading(true);
    setError("");

    let finalizedQuestions: any[] = [];

    if (activeTab === "manual") {
      // Validate Manual Inputs
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.questionText.trim()) {
          setError(`Question #${i + 1} has an empty question body.`);
          setLoading(false);
          return;
        }
        if (!q.options.A.trim() || !q.options.B.trim() || !q.options.C.trim() || !q.options.D.trim()) {
          setError(`Question #${i + 1} is missing one or more options.`);
          setLoading(false);
          return;
        }
      }

      finalizedQuestions = questions.map((q) => ({
        questionText: q.questionText,
        explanation: q.explanation || "No explanation provided.",
        correctAnswer: q.correctAnswer,
        options: [
          { label: "A", text: q.options.A },
          { label: "B", text: q.options.B },
          { label: "C", text: q.options.C },
          { label: "D", text: q.options.D }
        ]
      }));
    } else {
      // Parse & Validate Bulk JSON
      try {
        const parsed = JSON.parse(bulkJson);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("JSON must be a non-empty array of question objects.");
        }

        for (let i = 0; i < parsed.length; i++) {
          const q = parsed[i];
          if (!q.questionText || typeof q.questionText !== "string") {
            throw new Error(`Item #${i + 1} is missing a valid 'questionText'.`);
          }
          if (!["A", "B", "C", "D"].includes(q.correctAnswer)) {
            throw new Error(`Item #${i + 1} has an invalid 'correctAnswer' (must be 'A', 'B', 'C', or 'D').`);
          }
          if (!Array.isArray(q.options) || q.options.length !== 4) {
            throw new Error(`Item #${i + 1} must have an 'options' array containing precisely 4 labels.`);
          }
          const labels = q.options.map((o: any) => o.label);
          if (!labels.includes("A") || !labels.includes("B") || !labels.includes("C") || !labels.includes("D")) {
            throw new Error(`Item #${i + 1} options must cover labels 'A', 'B', 'C', and 'D'.`);
          }
        }

        finalizedQuestions = parsed;
      } catch (err: any) {
        setError(`JSON validation failed: ${err.message || "Ensure formatting strictly matches array guide."}`);
        setLoading(false);
        return;
      }
    }

    const res = await createAdminQuizAction({
      title,
      description,
      subjectId,
      timeLimit: timeLimit === "" ? null : Number(timeLimit),
      difficulty,
      questions: finalizedQuestions
    });

    setLoading(false);
    if (res.success) {
      router.push("/admin/quizzes");
    } else {
      setError(res.error || "Failed to save quiz in database.");
    }
  };

  const sampleJson = `[
  {
    "questionText": "What is the default port for PostgreSQL?",
    "correctAnswer": "C",
    "explanation": "5432 is the official default port for PostgreSQL engines.",
    "options": [
      { "label": "A", "text": "3306" },
      { "label": "B", "text": "6379" },
      { "label": "C", "text": "5432" },
      { "label": "D", "text": "8080" }
    ]
  }
]`;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Welcome Title */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create New Quiz</h1>
          <p className="text-gray-400 mt-1">Configure parameters, draft questions, or paste bulk JSON files.</p>
        </div>
        <a
          href="/admin/quizzes"
          className="px-4 py-2 border border-white/10 text-xs font-semibold rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
        >
          Cancel & Back
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: General Configuration parameters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-white border-b border-white/5 pb-2">1. Exam Parameters</h3>

            <div className="space-y-4 text-xs text-gray-300">
              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Quiz Title</label>
                <input
                  type="text"
                  placeholder="e.g. Intro to Databases"
                  required
                  className="w-full px-3 py-2 rounded-lg glass-input text-white"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Description</label>
                <textarea
                  placeholder="e.g. Test your knowledge on schemas, keys, indices, and normalizations..."
                  required
                  className="w-full p-3 rounded-lg glass-input text-white min-h-[80px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-400 font-semibold">Subject Category</label>
                <select
                  required
                  className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-gray-400 font-semibold">Difficulty</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400 font-semibold">Limit (Minutes)</label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 rounded-lg glass-input text-white"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Questions Builder / Bulk JSON tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Header Selector */}
          <div className="flex border-b border-white/5 space-x-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`pb-3 transition-colors cursor-pointer ${activeTab === "manual" ? "border-b-2 border-indigo-500 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              Manual Composer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bulk")}
              className={`pb-3 transition-colors cursor-pointer ${activeTab === "bulk" ? "border-b-2 border-indigo-500 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              Bulk JSON Uploader
            </button>
          </div>

          {activeTab === "manual" ? (
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={idx} className="glass-panel p-6 rounded-xl relative space-y-4 border border-white/5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="text-sm font-bold text-indigo-400">Question #{idx + 1}</h4>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Remove Question
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 text-xs text-gray-300">
                    <div className="space-y-1">
                      <label className="block text-gray-400 font-semibold">Question Prompt</label>
                      <input
                        type="text"
                        placeholder="e.g. Which normal form addresses partial dependencies?"
                        className="w-full px-3 py-2 rounded-lg glass-input text-white"
                        value={q.questionText}
                        onChange={(e) => handleQuestionTextChange(idx, e.target.value)}
                      />
                    </div>

                    {/* Option Matrix Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Option A */}
                      <div className="space-y-1">
                        <label className="block text-gray-400 font-semibold flex items-center space-x-1.5">
                          <span className="h-4 w-4 bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-[10px] text-indigo-400 font-bold rounded">A</span>
                          <span>Choice A text</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Option text A"
                          className="w-full px-3 py-2 rounded-lg glass-input text-white"
                          value={q.options.A}
                          onChange={(e) => handleOptionChange(idx, "A", e.target.value)}
                        />
                      </div>

                      {/* Option B */}
                      <div className="space-y-1">
                        <label className="block text-gray-400 font-semibold flex items-center space-x-1.5">
                          <span className="h-4 w-4 bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-[10px] text-indigo-400 font-bold rounded">B</span>
                          <span>Choice B text</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Option text B"
                          className="w-full px-3 py-2 rounded-lg glass-input text-white"
                          value={q.options.B}
                          onChange={(e) => handleOptionChange(idx, "B", e.target.value)}
                        />
                      </div>

                      {/* Option C */}
                      <div className="space-y-1">
                        <label className="block text-gray-400 font-semibold flex items-center space-x-1.5">
                          <span className="h-4 w-4 bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-[10px] text-indigo-400 font-bold rounded">C</span>
                          <span>Choice C text</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Option text C"
                          className="w-full px-3 py-2 rounded-lg glass-input text-white"
                          value={q.options.C}
                          onChange={(e) => handleOptionChange(idx, "C", e.target.value)}
                        />
                      </div>

                      {/* Option D */}
                      <div className="space-y-1">
                        <label className="block text-gray-400 font-semibold flex items-center space-x-1.5">
                          <span className="h-4 w-4 bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-[10px] text-indigo-400 font-bold rounded">D</span>
                          <span>Choice D text</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Option text D"
                          className="w-full px-3 py-2 rounded-lg glass-input text-white"
                          value={q.options.D}
                          onChange={(e) => handleOptionChange(idx, "D", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Correct Answer */}
                      <div className="space-y-1">
                        <label className="block text-gray-400 font-semibold">Correct Option</label>
                        <select
                          className="w-full px-3 py-2 rounded-lg glass-input text-white cursor-pointer"
                          value={q.correctAnswer}
                          onChange={(e) => handleCorrectAnswerChange(idx, e.target.value)}
                        >
                          <option value="A">Option A</option>
                          <option value="B">Option B</option>
                          <option value="C">Option C</option>
                          <option value="D">Option D</option>
                        </select>
                      </div>

                      {/* Explanation */}
                      <div className="space-y-1">
                        <label className="block text-gray-400 font-semibold">Explanation Text</label>
                        <input
                          type="text"
                          placeholder="e.g. 2NF resolves partial dependency issues."
                          className="w-full px-3 py-2 rounded-lg glass-input text-white"
                          value={q.explanation}
                          onChange={(e) => handleExplanationChange(idx, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-3 bg-[#0c0c10]/40 hover:bg-[#0c0c10]/70 border border-dashed border-white/10 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                + Append Question Prompt Card
              </button>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Bulk Question Import</h3>
                <p className="text-xs text-gray-400 mt-0.5">Paste a raw JSON array matching our exact question structure to import multiple files in seconds.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs text-gray-400 font-semibold">JSON Structure Sample Guide</label>
                  <pre className="p-3 bg-black/70 border border-white/5 rounded-lg text-[10px] font-mono text-gray-400 overflow-x-auto select-all max-h-[190px]">
                    {sampleJson}
                  </pre>
                </div>

                <div className="space-y-1 text-xs text-gray-400 leading-relaxed bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <p className="font-bold text-gray-300">Format Rules Checklist:</p>
                  <ul className="list-disc pl-4 mt-1.5 space-y-1">
                    <li>Root element must be a valid JSON array `[]`.</li>
                    <li>Each item must include `questionText`, `correctAnswer` (A, B, C, D), and `explanation`.</li>
                    <li>`options` must contain exactly four objects, each with a `label` and `text`.</li>
                  </ul>
                </div>
              </div>

              <textarea
                className="w-full p-3 min-h-[220px] rounded-lg glass-input text-white font-mono text-xs"
                placeholder="Paste JSON array here..."
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-rose-400 font-bold bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</p>}

          {/* Action Trigger Submit */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-md shadow-indigo-900/10 transition-colors cursor-pointer"
            >
              {loading ? "Saving Quiz..." : "Save Quiz to Curriculum"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
