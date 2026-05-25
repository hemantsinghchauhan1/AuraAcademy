export type Role = "STUDENT" | "MODERATOR" | "ADMIN";
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

export interface Option {
  id: string;
  questionId: string;
  label: string; // "A", "B", "C", "D"
  text: string;
  createdAt?: string;
}

export interface Question {
  id: string;
  quizId: string;
  questionText: string;
  options: Option[]; // Upgraded relational option mapping
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
  answers: Record<string, string>; // questionId -> chosenLabel
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

export interface LeaderboardEntry {
  id: string;
  userId: string;
  name: string;
  xp: number;
  streak: number;
  rank: number;
  updatedAt: string;
}

// --- FORUMS & COMMUNITIES INTERFACES ---

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string; // markdown text content
  userId: string;
  user?: {
    email: string;
    profile?: {
      name: string;
      avatarUrl: string | null;
    }
  };
  communityId: string;
  community?: Community;
  upvotes: number;
  commentsCount?: number;
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user?: {
    email: string;
    profile?: {
      name: string;
      avatarUrl: string | null;
    }
  };
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  userId: string;
  postId: string;
  value: number; // 1 or -1
}
