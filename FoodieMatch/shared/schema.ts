// Shared types between client and server
import { z } from 'zod';

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

export const insertUserSchema = z.object({
  username: z.string().min(2, "이름은 2글자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일 주소를 입력하세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  department: z.string(),
});
