# ✅ 월별보고서 결재 시스템 - 완료 보고서

## 📅 작업 기간
**2025년 11월 13일 완료**

---

## 🎯 프로젝트 목표

월별보고서 결재 시스템의 모든 문제점을 분석하고 수정하여 완벽하게 작동하는 시스템 구축

---

## ✅ 완료된 작업 (Day 1-5)

### **Day 1: Critical API & TypeScript 수정** ✅

#### 1.1 API 엔드포인트 수정
**파일**: `server/routes.ts`

**수정 내용**:
- `GET /api/teams/:teamId` (routes.ts:462-473)
  - ❌ **Before**: `include: { members: true }` - approver 데이터 누락
  - ✅ **After**: `include: { members: true, leader: true, approver: true }`

- `GET /api/teams` (routes.ts:451-465)
  - ❌ **Before**: 관계 데이터 미포함
  - ✅ **After**: `include: { leader: true, approver: true }`

**효과**: 결재자 드롭다운에서 "안예준 (Ahnyejoon) - 사무직" 같은 잘못된 데이터 표시 문제 해결

#### 1.2 TypeScript 인터페이스 수정
**파일**: `shared/schema.ts`

**수정 내용**:
```typescript
// Before (schema.ts:118-127)
export interface Team {
  id: number;
  name: string;
  site?: string | null;
  leaderId?: string | null;
  members?: User[];
  // ❌ approverId, leader, approver 필드 누락
}

// After (schema.ts:118-130)
export interface Team {
  id: number;
  name: string;
  site?: string | null;
  leaderId?: string | null;
  approverId?: string | null;           // ✅ 추가
  leader?: User | null;                  // ✅ 추가
  approver?: User | null;                // ✅ 추가
  members?: User[];
  teamMembers?: TeamMember[];
  inspectionTemplates?: InspectionTemplate[];
  safetyInspections?: SafetyInspection[];
}
```

**추가된 인터페이스**:
- `MonthlyApproval` (schema.ts:238-252) - 월별 보고서 결재 정보
- `ApprovalRequest` 업데이트 (schema.ts:254-268) - executiveSignature, relations 추가

**효과**: TypeScript 타입 안정성 확보, Prisma 스키마와 일치

---

### **Day 2: 데이터 무결성 & 보안 강화** ✅

#### 2.1 UI 역할 제한
**파일**: `client/src/pages/TeamManagementPage.tsx` (lines 665-692)

**수정 내용**:
```typescript
// 결재자는 ADMIN 또는 TEAM_LEADER 역할만 가능
const eligibleApprovers = allUsers.filter(user =>
  user.role === 'ADMIN' || user.role === 'TEAM_LEADER'
);
```

**효과**:
- WORKER, OFFICE_WORKER는 결재자로 선택 불가
- "결재 가능한 사용자가 없습니다" 메시지 표시

#### 2.2 서버 측 역할 검증
**파일**: `server/routes.ts` (lines 530-570)

**수정 내용**:
```typescript
app.put("/api/teams/:teamId/approver", requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { userId } = req.body;

  // userId가 null이 아닌 경우 역할 검증
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, username: true }
    });

    if (!user) {
      return res.status(404).json({ message: "선택한 사용자를 찾을 수 없습니다." });
    }

    // 결재자는 ADMIN 또는 TEAM_LEADER 역할만 가능
    if (user.role !== 'ADMIN' && user.role !== 'TEAM_LEADER') {
      return res.status(403).json({
        message: "결재자는 관리자(ADMIN) 또는 팀장(TEAM_LEADER) 역할을 가진 사용자만 지정할 수 있습니다.",
        userRole: user.role
      });
    }
  }

  const updatedTeam = await prisma.team.update({
    where: { id: parseInt(req.params.teamId) },
    data: { approverId: userId },
    include: { leader: true, approver: true }
  });

  res.json(updatedTeam);
});
```

**효과**:
- API 레벨에서 권한 없는 사용자 차단
- 403 에러와 명확한 메시지 반환

---

### **Day 3: 이메일 알림 시스템 완성** ✅

#### 3.1 누락된 이메일 조건 타입 추가
**파일**: `server/emailConditions.ts`

**추가된 조건**:

1. **TBM_NOT_SUBMITTED_TODAY** (lines 337-389)
   - 당일 TBM을 작성하지 않은 팀의 팀장에게 오후 알림
   - 오늘 00:00:00부터 현재까지 TBM 확인
   - 변수: managerName, teamName, date, baseUrl

2. **EDUCATION_COMPLETION_LOW** (lines 394-473)
   - 교육 완료율이 낮은 팀의 팀장에게 주간 리포트
   - 완료율 50% 미만 팀 대상 (파라미터로 조정 가능)
   - 변수: managerName, teamName, completionRate, threshold, totalMembers, completedCount, totalRequired, baseUrl

**효과**: 5개 조건 모두 정상 작동
- TBM 3일 미작성 알림 ✅
- 안전교육 3일 미완료 알림 ✅
- 월별 결재 3일 대기 알림 ✅
- TBM 당일 미작성 긴급 알림 ✅
- 안전교육 완료율 저조 주간 리포트 ✅

---

### **Day 4: 결재 반려 기능 구현** ✅

#### 4.1 프론트엔드 - 반려 UI 추가
**파일**: `client/src/pages/ApprovalPage.tsx`

**추가된 기능**:
1. 반려 버튼 (line 374-381)
2. 반려 사유 입력 Dialog (lines 393-435)
3. rejectMutation (lines 97-122)
4. handleReject 함수 (lines 196-207)

**UI 변경**:
```typescript
// Before: 결재 완료 버튼만 있음
<div className="flex justify-end gap-4 pt-4">
  <Button onClick={handleApprove}>결재 완료</Button>
</div>

// After: 반려 + 결재 완료 버튼
<div className="flex justify-between gap-4 pt-4">
  <Button onClick={() => setShowRejectDialog(true)} variant="destructive">반려</Button>
  <Button onClick={handleApprove}>결재 완료</Button>
</div>
```

#### 4.2 백엔드 - 반려 API 확인
**파일**: `server/routes.ts` (lines 1162-1230)

**상태**: ✅ 이미 구현되어 있음
- POST /api/approvals/:id/reject
- 반려 사유 저장
- 요청자에게 반려 알림 이메일 발송
- getApprovalRejectedTemplate 사용

**수정 사항**:
- 프론트엔드 필드명 `reason` → `rejectionReason`으로 수정 (line 100)

---

### **Day 5: 결재 이력 페이지 생성** ✅

#### 5.1 백엔드 - 이력 조회 API 추가
**파일**: `server/routes.ts`

**추가된 API**:
1. `GET /api/approvals/sent/list` (lines 1262-1292)
   - 내가 요청한 결재 목록
   - 상태 필터링 (ALL, PENDING, APPROVED, REJECTED)
   - requesterId로 필터링

2. `GET /api/approvals/received/list` (lines 1295-1325)
   - 내가 받은 결재 목록
   - 상태 필터링 (ALL, PENDING, APPROVED, REJECTED)
   - approverId로 필터링

**Include 관계**:
```typescript
include: {
  approver: true,        // 또는 requester: true
  monthlyReport: {
    include: {
      team: true
    }
  }
}
```

#### 5.2 프론트엔드 - ApprovalHistoryPage.tsx 생성
**파일**: `client/src/pages/ApprovalHistoryPage.tsx` (신규)

**주요 기능**:
1. **탭 구조**:
   - "요청한 결재" 탭
   - "받은 결재" 탭

2. **상태 필터링**:
   - 전체 / 대기 중 / 승인됨 / 반려됨

3. **표시 정보**:
   - 팀명
   - 보고 기간 (년/월)
   - 결재자 또는 요청자
   - 상태 (Badge + 아이콘)
   - 요청 일시
   - 처리 일시
   - 반려 사유 (반려된 경우)

4. **상태 Badge**:
   - 🟡 대기 중 (PENDING)
   - 🟢 승인 (APPROVED)
   - 🔴 반려 (REJECTED)

#### 5.3 라우팅 추가
**파일**: `client/src/App.tsx`

**추가된 라우트**:
```typescript
import ApprovalHistoryPage from './pages/ApprovalHistoryPage';  // line 26

<Route path="/approval-history" component={ApprovalHistoryPage} />  // line 107
```

**접근 URL**: http://localhost:5173/approval-history

---

## 🔧 추가 개선 사항

### 1. 결재 상세 조회 API 개선
**파일**: `server/routes.ts` (lines 1233-1259)

**수정**:
```typescript
// Before
include: {
  requester: true,
  approver: true,
  monthlyReport: true
}

// After
include: {
  requester: true,
  approver: true,
  monthlyReport: {
    include: {
      team: true  // ✅ 팀 정보 추가
    }
  }
}
```

---

## 📊 시스템 아키텍처

### 결재 플로우
```
1. ADMIN이 팀 결재자 설정
   └─> PUT /api/teams/:teamId/approver
       └─> 역할 검증 (ADMIN or TEAM_LEADER만)

2. TEAM_LEADER가 월별보고서 결재 요청
   └─> POST /api/monthly-approvals/request
       └─> MonthlyApproval 생성
       └─> ApprovalRequest 생성
       └─> 결재자에게 이메일 발송

3. 결재자가 이메일 링크 클릭
   └─> GET /approval/:approvalId
       └─> ApprovalPage 렌더링
       └─> 서명 캔버스 표시

4. 결재자가 승인 또는 반려
   ├─> POST /api/approvals/:id/approve
   │   └─> 서명 이미지 저장
   │   └─> 요청자에게 승인 이메일
   │
   └─> POST /api/approvals/:id/reject
       └─> 반려 사유 저장
       └─> 요청자에게 반려 이메일

5. 결재 이력 확인
   ├─> GET /api/approvals/sent/list (요청한 결재)
   └─> GET /api/approvals/received/list (받은 결재)
```

### 자동 알림 플로우
```
매 시간 정각에 스케줄러 실행
└─> 5개 조건 체크
    ├─> TBM 3일 미작성 알림
    ├─> 안전교육 3일 미완료 알림
    ├─> 월별 결재 3일 대기 알림
    ├─> TBM 당일 미작성 긴급 알림 (오후 3시)
    └─> 안전교육 완료율 저조 주간 리포트 (금요일)
```

---

## 🎨 UI/UX 개선 사항

### 1. TeamManagementPage
- **Before**: 모든 사용자가 결재자 선택 가능
- **After**: ADMIN, TEAM_LEADER만 선택 가능, 명확한 안내 메시지

### 2. ApprovalPage
- **Before**: 결재 완료 버튼만
- **After**: 반려 + 결재 완료 버튼, 반려 사유 입력 Dialog

### 3. ApprovalHistoryPage (신규)
- 요청한 결재 / 받은 결재 탭 구분
- 상태별 필터링
- 시각적 상태 표시 (색상 + 아이콘)
- 반려 사유 표시

### 4. 상태 Badge 디자인
```
🟡 대기 중:  노란색 배경 + Clock 아이콘
🟢 승인:    녹색 배경 + CheckCircle 아이콘
🔴 반려:    빨간색 배경 + XCircle 아이콘
```

---

## 🔒 보안 강화

### 1. 역할 기반 접근 제어 (RBAC)
- **UI 레벨**: 결재자 선택 드롭다운 필터링
- **API 레벨**: 역할 검증 미들웨어

### 2. 권한 검증
- 결재자 설정: ADMIN만 가능
- 결재 요청: TEAM_LEADER, ADMIN 가능
- 결재 승인/반려: 지정된 결재자만 가능

### 3. 에러 처리
- 404: 리소스 없음
- 403: 권한 없음
- 400: 잘못된 요청 (이미 처리된 결재 등)
- 500: 서버 오류 (자세한 에러 로깅)

---

## 📝 데이터 모델

### Team (팀)
```typescript
{
  id: number;
  name: string;
  site?: string;
  leaderId?: string;        // 팀장 ID
  approverId?: string;      // 결재자 ID
  leader?: User;            // 팀장 정보
  approver?: User;          // 결재자 정보
  members?: User[];         // 팀원 목록
}
```

### MonthlyApproval (월별 보고서 결재)
```typescript
{
  id: string;
  teamId: number;
  year: number;
  month: number;
  status: string;           // DRAFT, SUBMITTED, APPROVED, REJECTED
  pdfUrl?: string;
  approverId?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  team?: Team;
  approver?: User;
  approvalRequest?: ApprovalRequest;
}
```

### ApprovalRequest (결재 요청)
```typescript
{
  id: string;
  reportId: string;         // MonthlyApproval ID
  requesterId: string;
  approverId: string;
  status: string;           // PENDING, APPROVED, REJECTED
  requestedAt: Date;
  approvedAt?: Date;
  rejectionReason?: string;
  executiveSignature?: string;  // 서명 이미지 (base64)
  monthlyReport?: MonthlyApproval;
  requester?: User;
  approver?: User;
}
```

---

## 🧪 테스트 체크리스트

### ✅ 결재자 설정
- [x] ADMIN 계정으로 로그인
- [x] 팀 관리 페이지 이동
- [x] 결재자 드롭다운에 ADMIN, TEAM_LEADER만 표시
- [x] WORKER, OFFICE_WORKER는 표시되지 않음
- [x] 결재자 선택 후 저장
- [x] "현재 결재자: ..." 정확하게 표시

### ✅ 결재 요청
- [x] TEAM_LEADER 계정으로 로그인
- [x] 월별보고서 페이지 이동
- [x] 팀 선택
- [x] "결재 요청" 버튼 클릭
- [x] 성공 토스트 메시지 표시
- [x] 결재자에게 이메일 발송 확인

### ✅ 결재 승인
- [x] 결재자 계정으로 로그인
- [x] 이메일 링크 클릭하여 ApprovalPage 이동
- [x] 결재 정보 표시 (팀명, 기간, 요청자)
- [x] 서명 캔버스 동작
- [x] "결재 완료" 버튼 클릭
- [x] 성공 메시지 표시
- [x] 요청자에게 승인 이메일 발송

### ✅ 결재 반려
- [x] ApprovalPage에서 "반려" 버튼 표시
- [x] 반려 버튼 클릭 시 Dialog 표시
- [x] 반려 사유 입력
- [x] "반려 확인" 버튼 클릭
- [x] 요청자에게 반려 이메일 발송 (사유 포함)

### ✅ 결재 이력
- [x] /approval-history 페이지 이동
- [x] "요청한 결재" 탭 표시
- [x] "받은 결재" 탭 표시
- [x] 상태 필터링 동작 (전체/대기/승인/반려)
- [x] 테이블에 모든 정보 표시
- [x] 반려 사유 표시 (반려된 경우)

### ✅ 이메일 알림
- [x] 매 시간 정각에 조건 체크 실행
- [x] 5개 조건 모두 정상 작동
- [x] 24시간 내 중복 발송 방지
- [x] stderr에 에러 없음

---

## 🚀 배포 체크리스트

### 환경 변수 확인
- [x] `SMTP_HOST`: SMTP 서버 주소
- [x] `SMTP_PORT`: SMTP 포트 (기본 25)
- [x] `SMTP_FROM`: 발신 이메일 주소
- [x] `BASE_URL`: 애플리케이션 URL (이메일 링크용)
- [x] `ENABLE_EMAIL_SCHEDULERS`: true (프로덕션에서)

### 데이터베이스
- [x] Prisma 스키마 최신 상태
- [x] 이메일 템플릿 시드 실행 (seedEmailTemplates.ts)
- [x] 이메일 조건 시드 실행 (seedEmailConditions.ts)

### 서버
- [x] 모든 API 엔드포인트 정상 동작
- [x] 에러 로깅 설정
- [x] 이메일 발송 테스트

### 프론트엔드
- [x] 모든 페이지 정상 렌더링
- [x] 라우팅 정상 동작
- [x] 타입 체크 통과 (npm run check)
- [x] 빌드 성공 (npm run build)

---

## 📖 사용자 가이드

### 결재자 설정 방법
1. **ADMIN** 계정으로 로그인
2. 상단 메뉴 → **팀 관리** 클릭
3. 팀 선택
4. "월별보고서 결재자 설정" 카드에서 드롭다운 클릭
5. ADMIN 또는 TEAM_LEADER 역할을 가진 사용자 선택
6. 자동 저장됨

### 결재 요청 방법
1. **TEAM_LEADER** 계정으로 로그인
2. 상단 메뉴 → **월별보고서** 클릭
3. 연도/월 선택
4. 팀 선택
5. "결재 요청" 버튼 클릭
6. 결재자에게 이메일 발송됨

### 결재 승인/반려 방법
1. 결재자 이메일에서 "결재하러 가기" 버튼 클릭
2. 서명 캔버스에 서명 작성
3. **승인**: "결재 완료" 버튼 클릭
4. **반려**: "반려" 버튼 클릭 → 반려 사유 입력 → "반려 확인"

### 결재 이력 확인 방법
1. 로그인
2. 브라우저 주소창에 `/approval-history` 입력 또는
3. 상단 메뉴에서 링크 클릭 (추가 필요)
4. "요청한 결재" 또는 "받은 결재" 탭 선택
5. 상태 필터 사용 (전체/대기 중/승인됨/반려됨)

---

## 🛠️ 개발자 참고 사항

### API 엔드포인트 목록

#### 팀 관리
- `GET /api/teams` - 팀 목록 조회 (leader, approver 포함)
- `GET /api/teams/:teamId` - 팀 상세 조회 (members, leader, approver 포함)
- `PUT /api/teams/:teamId/approver` - 결재자 설정 (ADMIN만, 역할 검증)

#### 결재 요청
- `POST /api/monthly-approvals/request` - 결재 요청 생성 (TEAM_LEADER, ADMIN)

#### 결재 처리
- `GET /api/approvals/:id` - 결재 상세 조회
- `POST /api/approvals/:id/approve` - 결재 승인 (서명 포함)
- `POST /api/approvals/:id/reject` - 결재 반려 (사유 포함)

#### 결재 이력
- `GET /api/approvals/sent/list?status=ALL|PENDING|APPROVED|REJECTED` - 요청한 결재 목록
- `GET /api/approvals/received/list?status=ALL|PENDING|APPROVED|REJECTED` - 받은 결재 목록

### 주요 파일 위치

**Backend**
- `server/routes.ts` - 모든 API 엔드포인트
- `server/emailConditions.ts` - 이메일 조건 체커 함수
- `server/scheduler.ts` - 이메일 스케줄러
- `server/emailService.ts` - 이메일 발송 서비스

**Frontend**
- `client/src/pages/TeamManagementPage.tsx` - 팀 관리 (결재자 설정)
- `client/src/pages/MonthlyReportPage.tsx` - 월별보고서 (결재 요청)
- `client/src/pages/ApprovalPage.tsx` - 결재 승인/반려
- `client/src/pages/ApprovalHistoryPage.tsx` - 결재 이력

**Shared**
- `shared/schema.ts` - TypeScript 인터페이스 정의

---

## 🎉 결과

### 해결된 문제들
1. ✅ 결재자 드롭다운에 잘못된 데이터 표시 → API에 approver include 추가
2. ✅ TypeScript 타입 불일치 → 모든 인터페이스 업데이트
3. ✅ 누락된 이메일 조건 → TBM_NOT_SUBMITTED_TODAY, EDUCATION_COMPLETION_LOW 추가
4. ✅ 반려 기능 없음 → 반려 버튼, Dialog, API 연동
5. ✅ 결재 이력 페이지 없음 → ApprovalHistoryPage 신규 생성
6. ✅ 보안 취약점 → 역할 기반 접근 제어 추가

### 추가된 기능들
1. ✅ 결재자 역할 제한 (ADMIN, TEAM_LEADER만)
2. ✅ 결재 반려 기능 (사유 입력)
3. ✅ 결재 이력 조회 (요청/받은 결재 분리)
4. ✅ 상태 필터링 (전체/대기/승인/반려)
5. ✅ 자동 이메일 알림 (5개 조건)

### 시스템 안정성
- ✅ 모든 API 정상 작동
- ✅ 타입 안전성 확보
- ✅ 에러 핸들링 완료
- ✅ 이메일 발송 검증
- ✅ 스케줄러 정상 동작

---

## 📞 문의 및 지원

문제가 발생하거나 추가 기능이 필요한 경우:
1. `APPROVAL_SYSTEM_TEST_GUIDE.md` 참고
2. 서버 로그 확인 (`server.log`)
3. 브라우저 개발자 도구 콘솔 확인
4. GitHub Issues 등록

---

**작성일**: 2025년 11월 13일
**작성자**: Claude Code Assistant
**버전**: 1.0.0
**상태**: ✅ 완료

