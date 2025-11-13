/**
 * Email Condition Types - 조건부 이메일 발송 타입 정의
 */

export interface ConditionParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'date';
  label: string;
  default?: any;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
}

export interface ConditionTypeDefinition {
  name: string;
  description: string;
  parameters: ConditionParameter[];
  defaultRecipient: RecipientType;
  category: 'tbm' | 'education' | 'safety' | 'report' | 'approval';
}

export type RecipientType =
  | 'TEAM_LEADER'      // 팀장에게
  | 'EXECUTIVE'        // 임원에게
  | 'AFFECTED_USER'    // 해당 사용자에게 (조건에 영향받는 사용자)
  | 'SPECIFIC_USER'    // 특정 사용자 (recipientConfig에서 지정)
  | 'ADMIN'            // 관리자에게
  | 'CUSTOM';          // 커스텀 로직

export type ConditionType =
  | 'TBM_NOT_SUBMITTED_DAYS'
  | 'MONTHLY_REPORT_COMPLETED'
  | 'EDUCATION_OVERDUE'
  | 'SAFETY_INSPECTION_DUE'
  | 'APPROVAL_PENDING_DAYS';

export const EMAIL_CONDITION_TYPES: Record<ConditionType, ConditionTypeDefinition> = {
  TBM_NOT_SUBMITTED_DAYS: {
    name: 'TBM 미작성 알림',
    description: 'TBM을 N일 동안 작성하지 않은 팀에게 알림을 발송합니다.',
    parameters: [
      {
        name: 'days',
        type: 'number',
        label: '일수',
        default: 3,
        min: 1,
        max: 30
      }
    ],
    defaultRecipient: 'TEAM_LEADER',
    category: 'tbm'
  },

  MONTHLY_REPORT_COMPLETED: {
    name: '월간보고서 완료 알림',
    description: '월간보고서가 완료되면 임원에게 서명 요청을 발송합니다.',
    parameters: [],
    defaultRecipient: 'EXECUTIVE',
    category: 'report'
  },

  EDUCATION_OVERDUE: {
    name: '교육 기한 초과 알림',
    description: '교육 기한이 N일 지난 사용자에게 알림을 발송합니다.',
    parameters: [
      {
        name: 'daysOverdue',
        type: 'number',
        label: '기한 초과 일수',
        default: 1,
        min: 0,
        max: 30
      }
    ],
    defaultRecipient: 'AFFECTED_USER',
    category: 'education'
  },

  SAFETY_INSPECTION_DUE: {
    name: '안전점검 마감 임박 알림',
    description: '안전점검 마감일이 N일 남았을 때 팀장에게 알림을 발송합니다.',
    parameters: [
      {
        name: 'daysBefore',
        type: 'number',
        label: '마감 며칠 전',
        default: 3,
        min: 1,
        max: 7
      }
    ],
    defaultRecipient: 'TEAM_LEADER',
    category: 'safety'
  },

  APPROVAL_PENDING_DAYS: {
    name: '결재 대기 알림',
    description: '결재가 N일 동안 대기 중일 때 임원에게 알림을 발송합니다.',
    parameters: [
      {
        name: 'days',
        type: 'number',
        label: '대기 일수',
        default: 3,
        min: 1,
        max: 14
      }
    ],
    defaultRecipient: 'EXECUTIVE',
    category: 'approval'
  }
};

export const RECIPIENT_TYPE_LABELS: Record<RecipientType, string> = {
  TEAM_LEADER: '팀장에게',
  EXECUTIVE: '임원에게',
  AFFECTED_USER: '해당 사용자에게',
  SPECIFIC_USER: '특정 사용자',
  ADMIN: '관리자에게',
  CUSTOM: '커스텀'
};

export const CONDITION_CATEGORY_LABELS = {
  tbm: 'TBM',
  education: '교육',
  safety: '안전점검',
  report: '보고서',
  approval: '결재'
};

/**
 * 조건 체커 결과 타입
 */
export interface ConditionCheckResult {
  shouldSend: boolean;
  recipients: Array<{
    userId: string;
    email: string;
    variables: Record<string, any>; // 템플릿에 사용할 변수들
  }>;
}

/**
 * EmailCondition 데이터베이스 모델 타입
 */
export interface EmailCondition {
  id: string;
  name: string;
  conditionType: ConditionType;
  parameters: string; // JSON string
  templateId: string;
  recipientType: RecipientType;
  recipientConfig: string | null; // JSON string
  isEnabled: boolean;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * EmailSendLog 데이터베이스 모델 타입
 */
export interface EmailSendLog {
  id: string;
  conditionId: string | null;
  scheduleId: string | null;
  templateType: string;
  recipientId: string;
  recipientEmail: string;
  sentAt: Date | string;
  status: 'sent' | 'failed' | 'bounced';
  errorMessage: string | null;
}

/**
 * 조건 생성/수정 시 사용하는 DTO
 */
export interface EmailConditionDTO {
  name: string;
  conditionType: ConditionType;
  parameters: Record<string, any>;
  templateId: string;
  recipientType: RecipientType;
  recipientConfig?: Record<string, any> | null;
  isEnabled: boolean;
  description?: string | null;
}
