export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  profile?: Profile;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  streak: number;
  xp: number;
  bio: string | null;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subject?: Subject;
  timeLimit: number | null; // minutes
  totalQuestions: number;
  difficulty: Difficulty;
  questions?: Question[];
  createdAt: string;
}

export interface Question {
  id: string;
  quizId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // A, B, C, D
  explanation: string;
}

export interface Attempt {
  id: string;
  userId: string;
  quizId: string;
  quiz?: Quiz;
  score: number;
  totalQuestions: number;
  timeSpent: number; // seconds
  answers: Record<string, string>; // questionId -> chosenOption
  completedAt: string;
}

export interface WeakTopic {
  topic: string;
  accuracy: number; // percentage
  questionsSolved: number;
}

export interface AnalyticsSummary {
  id: string;
  userId: string;
  weakTopics: WeakTopic[];
  overallAccuracy: number;
  totalQuizzesTaken: number;
  updatedAt: string;
}
