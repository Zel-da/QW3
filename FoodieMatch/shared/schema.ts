import { z } from 'zod';

// Enum for User Roles, matching prisma/schema.prisma
export enum Role {
  ADMIN = 'ADMIN',
  SAFETY_TEAM = 'SAFETY_TEAM',
  TEAM_LEADER = 'TEAM_LEADER',
  WORKER = 'WORKER',
  OFFICE_WORKER = 'OFFICE_WORKER',
}

export interface User {
  id: string;
  username: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  teamId?: number | null;
  site?: string | null;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  authorId: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  imageUrl?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  author: User;
  comments: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  imageUrl?: string | null;
  authorId: string;
  noticeId: string;
  createdAt: Date;
  author: User;
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

export const insertUserSchema = z.object({
  username: z.string().min(2, "이름은 2글자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일 주소를 입력하세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

export const reportResultSchema = z.object({
  itemId: z.number(),
  checkState: z.string().optional(),
  photoUrl: z.string().nullish(),
  actionDescription: z.string().nullish(),
  authorId: z.string(),
});

export const reportSignatureSchema = z.object({
  userId: z.string(),
  signatureImage: z.string(),
});

export const tbmReportSchema = z.object({
  teamId: z.number(),
  reportDate: z.string().datetime(),
  managerName: z.string(),
  remarks: z.string().optional(),
  site: z.string(),
  results: z.array(reportResultSchema),
  signatures: z.array(reportSignatureSchema),
});

export interface Team {
  id: number;
  name: string;
  site?: string | null;
  leaderId?: string | null;
  members?: User[];
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

export interface DailyReport {
  id: number;
  reportDate: Date;
  // Add other fields as needed
}

export interface ReportDetail {
  id: number;
  // Add other fields as needed
}

// Other interfaces (Assessment, Certificate, etc.) would go here
// For brevity, they are omitted but should match the Prisma schema