import { create } from "zustand";
import { Question } from "@/types";

interface QuizState {
  quizId: string | null;
  quizTitle: string;
  questions: Question[];
  currentQuestionIndex: number;
  selectedAnswers: Record<string, string>; // questionId -> chosenOption ("A", "B", "C", "D")
  flaggedQuestions: Record<string, boolean>; // questionId -> flagged (true/false)
  timeLeft: number; // in seconds
  isStarted: boolean;
  isSubmitted: boolean;
  score: number;
  timeSpent: number; // in seconds
  
  // Actions
  startQuiz: (quizId: string, title: string, questions: Question[], timeLimitMinutes: number | null) => void;
  selectAnswer: (questionId: string, answer: string) => void;
  toggleFlag: (questionId: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setQuestionIndex: (index: number) => void;
  tick: () => void;
  submitQuiz: () => { score: number; totalQuestions: number; timeSpent: number; answers: Record<string, string> };
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizId: null,
  quizTitle: "",
  questions: [],
  currentQuestionIndex: 0,
  selectedAnswers: {},
  flaggedQuestions: {},
  timeLeft: 0,
  isStarted: false,
  isSubmitted: false,
  score: 0,
  timeSpent: 0,

  startQuiz: (quizId, title, questions, timeLimitMinutes) => {
    const limitSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : 30 * 60; // Default to 30 mins
    set({
      quizId,
      quizTitle: title,
      questions,
      currentQuestionIndex: 0,
      selectedAnswers: {},
      flaggedQuestions: {},
      timeLeft: limitSeconds,
      isStarted: true,
      isSubmitted: false,
      score: 0,
      timeSpent: 0,
    });
  },

  selectAnswer: (questionId, answer) => {
    set((state) => ({
      selectedAnswers: {
        ...state.selectedAnswers,
        [questionId]: answer,
      },
    }));
  },

  toggleFlag: (questionId) => {
    set((state) => ({
      flaggedQuestions: {
        ...state.flaggedQuestions,
        [questionId]: !state.flaggedQuestions[questionId],
      },
    }));
  },

  nextQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex < questions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    }
  },

  prevQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1 });
    }
  },

  setQuestionIndex: (index) => {
    const { questions } = get();
    if (index >= 0 && index < questions.length) {
      set({ currentQuestionIndex: index });
    }
  },

  tick: () => {
    const { timeLeft, isStarted, isSubmitted, questions, timeSpent } = get();
    if (!isStarted || isSubmitted) return;

    if (timeLeft <= 1) {
      set({ timeLeft: 0, timeSpent: timeSpent + 1 });
      get().submitQuiz();
    } else {
      set({ timeLeft: timeLeft - 1, timeSpent: timeSpent + 1 });
    }
  },

  submitQuiz: () => {
    const { questions, selectedAnswers, timeLeft, timeSpent } = get();
    
    let correctCount = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    set({ isSubmitted: true, score: correctCount });

    return {
      score: correctCount,
      totalQuestions: questions.length,
      timeSpent,
      answers: selectedAnswers,
    };
  },

  resetQuiz: () => {
    set({
      quizId: null,
      quizTitle: "",
      questions: [],
      currentQuestionIndex: 0,
      selectedAnswers: {},
      flaggedQuestions: {},
      timeLeft: 0,
      isStarted: false,
      isSubmitted: false,
      score: 0,
      timeSpent: 0,
    });
  },
}));
