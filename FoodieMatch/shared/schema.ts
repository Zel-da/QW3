import { z } from 'zod';

// Enum for User Roles, matching prisma/schema.prisma
export enum Role {
  ADMIN = 'ADMIN',
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
  videoUrl?: string | null;      // 신규: 동영상 URL
  videoType?: string | null;     // 신규: 'file' | 'youtube'
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
  videoType?: string | null;    // 신규: 'youtube' | 'file' | 'audio'
  audioUrl?: string | null;     // 신규: 음성 파일 URL
  documentUrl?: string | null;
  color: string;
  icon: string;
  isActive: boolean;
  attachments?: Array<{         // 신규: 다중 미디어 첨부 파일
    url: string;
    name: string;
    type: string;               // 'video' | 'youtube' | 'audio'
    size: number;
    mimeType?: string;
  }>;
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
  actionDescription: z.string().nullish(),
  authorId: z.string(),
  attachments: z.array(z.object({
    url: z.string(),
    name: z.string(),
    type: z.string(),
    size: z.number(),
    mimeType: z.string().optional()
  })).optional(),
});

export const reportSignatureSchema = z.object({
  userId: z.string().optional(),      // User 계정이 있는 경우
  memberId: z.number().optional(),    // TeamMember인 경우
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
  approverId?: string | null;           // 월별보고서 결재자 ID
  leader?: User | null;                  // 팀장
  approver?: User | null;                // 월별보고서 결재자
  members?: User[];
  teamMembers?: TeamMember[];            // 신규: User 계정 없는 팀원들
  inspectionTemplates?: InspectionTemplate[];  // 신규
  safetyInspections?: SafetyInspection[];     // 신규
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
  managerName?: string | null;
  remarks?: string | null;
  site?: string | null;
  teamId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportDetail {
  id: number;
  reportId: number;
  itemId: number;
  checkState?: string | null;
  authorId?: string | null;
  actionDescription?: string | null;
  actionStatus?: string | null;
}

// ========== 신규 인터페이스 ==========

// 팀원 (User 계정 없이 관리)
export interface TeamMember {
  id: number;
  teamId: number;
  name: string;
  position?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 부재 사유
export interface AbsenceRecord {
  id: number;
  memberId: number;
  reportId: number;
  absenceType: string;  // '연차', '반차', '출장', '교육', '기타'
  reason?: string | null;
  createdAt: Date;
}

// 안전점검 템플릿
export interface InspectionTemplate {
  id: number;
  teamId: number;
  equipmentName: string;
  displayOrder: number;
  isRequired: boolean;
  createdAt: Date;
}

// 안전점검 메인
export interface SafetyInspection {
  id: string;
  teamId: number;
  year: number;
  month: number;
  inspectionDate: Date;
  isCompleted: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  inspectionItems?: InspectionItem[];
}

// 안전점검 항목
export interface InspectionItem {
  id: string;
  inspectionId: string;
  equipmentName: string;
  photoUrl: string;
  remarks?: string | null;
  uploadedAt: Date;
}

// 월별 보고서 결재 (MonthlyApproval)
export interface MonthlyApproval {
  id: string;
  teamId: number;
  year: number;
  month: number;
  status: string;  // 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'
  pdfUrl?: string | null;
  approverId?: string | null;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  team?: Team;
  approver?: User | null;
  approvalRequest?: ApprovalRequest | null;
}

// 결재 요청 (ApprovalRequest)
export interface ApprovalRequest {
  id: string;
  reportId: string;              // MonthlyApproval ID
  requesterId: string;
  approverId: string;
  status: string;                // 'PENDING', 'APPROVED', 'REJECTED'
  requestedAt: Date;
  approvedAt?: Date | null;
  rejectionReason?: string | null;
  executiveSignature?: string | null;  // 서명 이미지 (base64)
  monthlyReport?: MonthlyApproval;     // 관련 월별 보고서
  requester?: User;                    // 요청자 정보
  approver?: User;                     // 승인자 정보
}