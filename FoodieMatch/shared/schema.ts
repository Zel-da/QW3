// Shared types between client and server
export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  viewCount: number;
  imageUrl?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  department: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  type: string;
  duration: number;
  videoUrl?: string | null;
  documentUrl?: string | null;
  color: string;
  icon: string;
  isActive: boolean;
}

export interface UserProgress {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  completed: boolean;
  currentStep: number;
  timeSpent: number;
  lastAccessed: Date;
}

export interface Assessment {
  id: string;
  courseId: string;
  question: string;
  options: string;
  correctAnswer: number;
  difficulty: string;
}

export interface UserAssessment {
  id: string;
  userId: string;
  courseId: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  attemptNumber: number;
  completedAt: Date;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateUrl: string;
  issuedAt: Date;
}

export const insertUserSchema = {
  username: String,
  email: String,
  password: String,
  department: String,
};
