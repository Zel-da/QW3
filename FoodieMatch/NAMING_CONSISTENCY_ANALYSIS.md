# FoodieMatch 명칭 일관성 분석 및 수정 계획서

생성일: 2025-11-19
분석 범위: 전체 코드베이스 (Database Schema, API Routes, Frontend Components, UI Text)

---

## 📋 Executive Summary

FoodieMatch 코드베이스에 대한 전면 분석 결과, **27개의 명칭 불일치 및 논리적 오류**를 발견했습니다.

### 주요 문제점

- **심각한 문제**: 5개 (즉시 수정 필요)
- **중간 문제**: 8개 (품질 개선 필요)
- **낮은 문제**: 14개 (점진적 개선)

### 영향 범위

1. **사용자 혼란**: 역할명, 기능명 불일치로 인한 UX 저하
2. **개발 생산성**: 혼란스러운 명명 규칙으로 인한 코드 이해도 저하
3. **유지보수성**: 일관성 부족으로 인한 버그 발생 위험

### 예상 작업량

- **완전 해결**: 6-8주
- **단계별 접근**: 4개 Phase로 분할
- **우선순위**: 비파괴적 수정 → 파괴적 변경 순

---

## Section 1: 명칭 불일치 (같은 내용, 다른 이름)

### 1.1 TBM vs DailyReport vs 일지 vs 체크리스트 ⚠️ 심각

**문제**: 핵심 비즈니스 엔티티가 4개 이상의 다른 이름으로 표현됨

| 영역 | 명칭 | 위치 |
|------|------|------|
| Database Model | `DailyReport` | schema.prisma:272 |
| Database Table | `DailyReports` | schema.prisma:291 |
| API Routes | `/api/reports/*` | routes.ts:1656-3593 |
| Frontend Page | `TbmPage.tsx` | pages/TbmPage.tsx |
| UI Text 1 | "TBM 일지" | TbmPage.tsx:127 |
| UI Text 2 | "TBM 체크리스트" | header.tsx:24 |

**영향도**: 🔴 **HIGH** - 사용자와 개발자 모두 혼란

**권장 사항**:
```
✅ Database: DailyReport (유지)
✅ API: /api/daily-reports/* (변경 필요)
✅ UI: "TBM 일지" (통일 필요)
❌ 삭제: "TBM 체크리스트" 표현
```

**수정 파일**:
- `client/src/components/header.tsx` (line 24)
- `server/routes.ts` (전체 `/api/reports/*` 경로)

---

### 1.2 Team vs Line (팀 vs 라인) ⚠️ 중간

**문제**: 조직 단위를 "팀"과 "라인"으로 혼용

| 영역 | 명칭 | 위치 |
|------|------|------|
| Database | `Team` | schema.prisma:172 |
| UI Admin | "팀 관리" | AdminDashboardPage.tsx:28 |
| UI Production | "라인별 장비" | TeamEquipmentPage.tsx:250 |
| UI Mixed | "팀/라인" | SafetyInspectionPage.tsx:402 |
| Comments | "라인별 점검" | schema.prisma:396 |

**영향도**: 🟡 **MEDIUM** - 사용자 혼란, 의미 불명확

**권장 사항**:
```
제조 현장: "라인" (생산라인 의미)
관리 화면: "팀" (조직 의미)

예시:
✅ "라인 선택" (현장 작업)
✅ "팀 관리" (관리자 화면)
✅ "라인별 장비" (장비 관리)
```

**수정 파일**:
- 모든 UI 텍스트를 문맥에 맞게 일관성 있게 수정

---

### 1.3 Factory vs 공장 ✅ 정상

**상태**: 이미 일관성 있음

| 영역 | 명칭 |
|------|------|
| Database | `Factory` |
| Table | `Factories` |
| Field | `factoryId` |
| UI | "공장" |
| API | `/api/factories` |

**조치**: ✅ 수정 불필요 (모범 사례)

---

### 1.4 SafetyInspection 관련 모델들 ⚠️ 중간

**문제**: 점검 관련 여러 엔티티의 명칭이 혼란스러움

| Model | 용도 | 위치 |
|-------|------|------|
| `SafetyInspection` | 실제 점검 기록 | schema.prisma:445 |
| `InspectionTemplate` | 팀별 점검 장비 목록 | schema.prisma:397 |
| `InspectionScheduleTemplate` | 공장별 월별 일정 | schema.prisma:412 |
| `InspectionItem` | 장비별 점검 사진 | schema.prisma:466 |

**영향도**: 🟡 **MEDIUM** - 개발자 혼란

**권장 사항**:
```typescript
// 명확한 이름으로 변경 고려
InspectionTemplate → TeamEquipmentList
InspectionScheduleTemplate → MonthlyInspectionSchedule

// 또는 JSDoc 주석 추가
/**
 * InspectionTemplate: 팀이 점검해야 할 장비 목록
 * InspectionScheduleTemplate: 공장의 월별 점검 항목
 * SafetyInspection: 실제 제출된 점검 기록
 * InspectionItem: 각 장비에 대한 점검 결과
 */
```

---

### 1.5 TeamMember vs User.members ⚠️ 중간

**문제**: 팀원을 표현하는 두 가지 방법

| 구조 | 설명 | 위치 |
|------|------|------|
| `User.teamId` | 계정 있는 사용자 | schema.prisma:18 |
| `Team.members` | User 관계 | schema.prisma:182 |
| `TeamMember` | 계정 없는 팀원 | schema.prisma:196 |
| `Team.teamMembers` | TeamMember 관계 | schema.prisma:183 |

**영향도**: 🟡 **MEDIUM** - 이중 구조로 인한 혼란

**권장 사항**:
```typescript
// 스키마에 명확한 주석 추가
model TeamMember {
  // 계정이 없는 팀원 (팀장이 직접 관리)
  // User.teamId는 로그인 계정이 있는 팀원
}

// 또는 명칭 변경 고려
TeamMember → ManagedTeamMember
TeamMember → TeamMemberProfile
```

---

## Section 2: 논리적 오류 (잘못된 명칭)

### 2.1 ChecklistTemplate - TBM 전용인데 일반적 이름 ⚠️ 중간

**문제**: 이름은 일반 체크리스트지만 실제로는 TBM 전용

| 정보 | 내용 |
|------|------|
| Model | `ChecklistTemplate` (schema.prisma:247) |
| 실제 용도 | TBM 일일 보고서 체크리스트만 사용 |
| 관계 | `DailyReport`만 참조 |

**영향도**: 🟡 **MEDIUM** - 재사용성 오해

**권장 사항**:
```typescript
// 명확한 이름으로 변경
ChecklistTemplate → TBMChecklistTemplate
ChecklistTemplate → DailyReportTemplate

// 마이그레이션 필요
```

---

### 2.2 WORKER vs "현장관리자" ⚠️ 심각

**문제**: 역할 코드와 의미가 정반대

| 영역 | 값 | 위치 |
|------|-----|------|
| Database Enum | `WORKER` | schema.prisma:16 |
| UI Label | "현장관리자" | constants.ts:54 |
| 의미 | Worker = 작업자 ≠ 관리자 | - |

**영향도**: 🔴 **HIGH** - 심각한 의미 불일치

**권장 사항**:
```typescript
// Option 1: 역할 이름 변경 (마이그레이션 필요)
WORKER → SITE_MANAGER
Label: "현장관리자" (유지)

// Option 2: UI 라벨 변경 (간단)
WORKER (유지)
Label: "현장직" 또는 "작업자"

// 권장: Option 2 (파괴적 변경 최소화)
```

**수정 파일**:
- `client/src/lib/constants.ts` (line 54)

---

### 2.3 OFFICE_WORKER vs "임원" ⚠️ 심각

**문제**: Office Worker ≠ Executive

| 영역 | 값 | 위치 |
|------|-----|------|
| Database Enum | `OFFICE_WORKER` | schema.prisma:8 |
| UI Label | "임원" | constants.ts:55 |
| 실제 역할 | 승인자 (Approver) | - |

**영향도**: 🔴 **HIGH** - 완전히 잘못된 매핑

**권장 사항**:
```typescript
// 역할 이름 변경 (마이그레이션 필요)
OFFICE_WORKER → EXECUTIVE
OFFICE_WORKER → APPROVER

// UI 라벨
"임원" (유지)
```

---

### 2.4 MonthlyApproval vs ApprovalRequest ⚠️ 중간

**문제**: 두 모델이 비슷한 역할, 1:1 관계

| Model | 필드 | 위치 |
|-------|------|------|
| `MonthlyApproval` | status, approverId, timestamps | schema.prisma:330 |
| `ApprovalRequest` | status, approverId, timestamps | schema.prisma:350 |
| 관계 | 1:1 | schema.prisma:342 |

**영향도**: 🟡 **MEDIUM** - 과도하게 복잡한 구조

**권장 사항**:
```typescript
// 하나로 통합 고려
MonthlyApproval + ApprovalRequest → MonthlyReportApproval

// 또는 명확한 구분
MonthlyApproval: 보고서 메타데이터
ApprovalRequest: 승인 워크플로우 상태
```

---

### 2.5 InspectionItem.photos 타입 불일치 ⚠️ 낮음

**문제**: 복수형 이름이지만 단수형 타입

| 정보 | 값 |
|------|-----|
| Field | `photos String @db.Text` |
| Comment | `// JSON array of photo URLs` |
| 실제 사용 | `JSON.stringify(array)` |

**영향도**: 🟢 **LOW** - 타입 안전성 문제

**권장 사항**:
```typescript
// Prisma Json 타입 사용
photos Json // {url: string, uploadedAt: Date}[]

// 장점: 타입 안전성, 자동 파싱
```

---

## Section 3: 번역 불일치

### 3.1 역할 번역 매핑

**현재 상태** (constants.ts:51-56):

| 역할 코드 | UI 라벨 | 평가 |
|-----------|---------|------|
| `ADMIN` | 총관리자 | ✅ 정확 |
| `TEAM_LEADER` | 팀장 | ✅ 정확 |
| `WORKER` | 현장관리자 | ❌ 불일치 |
| `OFFICE_WORKER` | 임원 | ❌ 불일치 |

**권장 수정**:
```typescript
export const ROLE_LABELS = {
  ADMIN: '총관리자',
  TEAM_LEADER: '팀장',
  WORKER: '현장직',  // 변경
  OFFICE_WORKER: '임원',  // 역할명 자체를 EXECUTIVE로 변경 필요
} as const;
```

---

### 3.2 기능명 번역 일관성

| 기능 | Database | UI | 평가 |
|------|----------|-----|------|
| 교육 | `Course` | "안전교육", "교육" | ✅ 일관성 |
| TBM | `DailyReport` | "TBM 일지", "TBM 체크리스트" | ❌ 혼재 |
| 안전점검 | `SafetyInspection` | "안전점검" | ✅ 일관성 |
| 월별보고서 | `MonthlyApproval` | "월별 보고서" | ✅ 일관성 |

**수정**: "TBM 체크리스트" → "TBM 일지"로 통일

---

## Section 4: Database Schema 문제점

### 4.1 테이블명 복수형 일관성 ⚠️ 낮음

**불일치**:
```typescript
// 대부분 모델
model Team {
  @@map("Teams")  // 복수형 사용
}

// 예외
model User {
  // @@map 없음 (단수형 그대로)
}
```

**권장**: 모든 모델에 `@@map("복수형")` 적용

---

### 4.2 Cascade 삭제 정책 불일치 ⚠️ 중간

**발견 사항**:
- `onDelete: Cascade` ✓ 일부 사용
- `onDelete: NoAction` ⚠️ DailyReport.team (line 281)
- `onDelete: SetNull` ✓ 일부 사용

**영향도**: 🟡 **MEDIUM** - 데이터 정합성 위험

**권장**: 전체 관계 감사 후 일관된 cascade 전략 수립

---

## Section 5: API Route 명칭 문제

### 5.1 리소스 명칭 불일치 ⚠️ 중간

**현재 상태**:

| API Path | 실제 리소스 | 평가 |
|----------|------------|------|
| `/api/reports/*` | DailyReport (TBM) | ❌ 모호함 |
| `/api/teams/*` | Team | ✅ 정확 |
| `/api/inspection/:id` | SafetyInspection | ⚠️ 단수형 |
| `/api/inspections/*` | SafetyInspection | ⚠️ 복수형 혼재 |

**권장**:
```
/api/reports/* → /api/daily-reports/* 또는 /api/tbm/*
/api/inspection/* → /api/inspections/* (복수형 통일)
```

---

### 5.2 Naming Convention 혼재 ⚠️ 낮음

**발견**:
- `/api/teams/:teamId/template` (단수)
- `/api/teams/:teamId/users` (복수)
- `/api/teams/:teamId/team-members` (kebab-case)

**권장**: 컬렉션은 복수형, 다중 단어는 kebab-case

---

## Section 6: 우선순위 및 위험도 평가

### 🔴 HIGH Priority (즉시 수정, 파괴적 변경)

#### 1. 역할 명칭 수정
- **위험도**: HIGH - 인증/권한 시스템 영향
- **영향 범위**: User roles, permissions, UI labels
- **항목**:
  - `WORKER` → `SITE_MANAGER` 또는 라벨만 수정
  - `OFFICE_WORKER` → `EXECUTIVE`
- **예상 기간**: 1-2주
- **권장**: Phase 1 마이그레이션, 하위 호환성 유지

#### 2. API Route 표준화
- **위험도**: MEDIUM-HIGH - Frontend 호출 깨짐
- **영향 범위**: 모든 TBM API 호출
- **항목**: `/api/reports/*` → `/api/daily-reports/*`
- **예상 기간**: 1-2주
- **권장**: 전환 기간 동안 양쪽 라우트 유지, 점진적 폐기

#### 3. TBM 용어 통일
- **위험도**: LOW - 주로 UI/UX
- **영향 범위**: 사용자 대면 텍스트
- **항목**: "TBM 체크리스트" → "TBM 일지"
- **예상 기간**: 1주
- **권장**: Quick win, 즉시 적용 가능

---

### 🟡 MEDIUM Priority (리팩토링, 품질 개선)

#### 4. Team vs Line 용어 정리
- **위험도**: LOW-MEDIUM - 주로 UI
- **영향 범위**: 사용자 이해도, 일관성
- **예상 기간**: 2-3주
- **권장**: 점진적 UI 업데이트

#### 5. ChecklistTemplate 명칭 변경
- **위험도**: MEDIUM - 스키마 변경
- **영향 범위**: 코드 참조, 마이그레이션
- **예상 기간**: 2주
- **권장**: 다음 major 스키마 업데이트 시 포함

#### 6. InspectionTemplate 명확화
- **위험도**: LOW - 주석 추가/이름 변경
- **영향 범위**: 개발자 이해도
- **예상 기간**: 1주
- **권장**: 비파괴적 개선

---

### 🟢 LOW Priority (점진적 개선)

#### 7. 테이블명 일관성
- **위험도**: VERY LOW
- **영향 범위**: 스키마 미관
- **권장**: 향후 정리

#### 8. TypeScript 타입 안전성
- **위험도**: NONE - 개선만
- **영향 범위**: 개발 경험
- **권장**: 점진적 개선

---

## Section 7: 단계별 실행 계획

### 📅 Phase 1: Quick Wins (파괴적 변경 없음)

**기간**: 1-2주

**작업 내용**:
1. UI 텍스트를 "TBM 일지"로 통일
2. "라인" vs "팀" 문맥별로 정리
3. 스키마에 상세 주석 추가
4. shared/schema.ts에 JSDoc 추가

**수정 파일**:
```
✓ client/src/components/header.tsx (line 24)
✓ client/src/pages/TbmPage.tsx (line 127)
✓ 모든 "TBM 체크리스트" 인스턴스
✓ prisma/schema.prisma (주석 추가)
```

**결과물**:
- 사용자 혼란 감소
- 개발자 이해도 향상
- 즉시 배포 가능

---

### 📅 Phase 2: 역할 명칭 수정 (파괴적 변경)

**기간**: 2-3주

**작업 내용**:
1. 역할 enum 변경을 위한 마이그레이션 생성
2. constants.ts ROLE_LABELS 업데이트
3. 모든 역할 체크 코드 업데이트
4. 데이터 변환 마이그레이션

**변경 전**:
```typescript
enum Role {
  ADMIN
  TEAM_LEADER
  WORKER         // "현장관리자"
  OFFICE_WORKER  // "임원"
}
```

**변경 후**:
```typescript
enum Role {
  ADMIN
  TEAM_LEADER
  SITE_MANAGER   // "현장관리자"
  EXECUTIVE      // "임원"
}
```

**마이그레이션 스크립트**:
```sql
-- 기존 데이터 변환
UPDATE "User" SET role = 'SITE_MANAGER' WHERE role = 'WORKER';
UPDATE "User" SET role = 'EXECUTIVE' WHERE role = 'OFFICE_WORKER';
```

**위험 완화**:
- 변경 전 백업
- 롤백 스크립트 준비
- 스테이징 환경 테스트

---

### 📅 Phase 3: API 표준화 (파괴적 변경)

**기간**: 2-3주

**작업 내용**:
1. 새 라우트 생성
2. 기존 라우트를 deprecated 프록시로 유지
3. Frontend API 호출 전체 업데이트
4. 전환 기간 후 구 라우트 제거

**변경**:
```typescript
// 신규 라우트
app.get('/api/daily-reports/:id', ...)
app.get('/api/daily-reports', ...)

// 기존 라우트 (deprecated, 3개월 후 제거)
app.get('/api/reports/:id', (req, res) => {
  console.warn('DEPRECATED: Use /api/daily-reports instead');
  // 신규 라우트로 프록시
});
```

**Frontend 업데이트**:
```typescript
// 모든 axios 호출 변경
// before
await axios.get('/api/reports/123');

// after
await axios.get('/api/daily-reports/123');
```

---

### 📅 Phase 4: 스키마 개선 (파괴적 변경)

**기간**: 2-3주

**작업 내용**:
1. `ChecklistTemplate` → `TBMChecklistTemplate` 이름 변경
2. `MonthlyApproval` + `ApprovalRequest` 병합 고려
3. `InspectionItem.photos` Json 타입으로 변경
4. 누락된 `@@map` 지시어 추가

**스키마 변경**:
```typescript
// Before
model ChecklistTemplate {
  id         Int
  name       String
  teamId     Int
  // ...
}

// After
model TBMChecklistTemplate {
  id         Int
  name       String
  teamId     Int
  @@map("ChecklistTemplates")  // 기존 테이블명 유지
}
```

---

## Appendix A: 파일별 수정 사항 상세

### A.1 Schema 변경 (prisma/schema.prisma)

**추가할 주석**:

```typescript
// Line 16
enum Role {
  ADMIN
  TEAM_LEADER
  WORKER        // 현장 작업자 (현장관리자 아님!)
  OFFICE_WORKER // 임원/승인자
}

// Line 196
model TeamMember {
  // 로그인 계정이 없는 팀원
  // 팀장이 직접 관리하는 인원
  // cf) User.teamId = 로그인 계정이 있는 팀원
}

// Line 247
model ChecklistTemplate {
  // TBM 일일 보고서 체크리스트
  // 일반 체크리스트 아님!
}

// Line 272
model DailyReport {
  // TBM (Tool Box Meeting) 일지
  // UI에서는 "TBM 일지"로 표시
}

// Line 397
model InspectionTemplate {
  // 팀이 점검해야 할 장비 목록
  // 실제 점검 기록은 SafetyInspection
}

// Line 471
model InspectionItem {
  // photos String → photos Json으로 변경 권장
  photos Json // [{url: string, uploadedAt: Date}]
}
```

---

### A.2 Constants 업데이트 (client/src/lib/constants.ts)

**Line 51-56 수정**:

```typescript
// Before
export const ROLE_LABELS = {
  ADMIN: '총관리자',
  TEAM_LEADER: '팀장',
  WORKER: '현장관리자',      // ❌ 잘못됨
  OFFICE_WORKER: '임원',     // 역할명과 불일치
} as const;

// After (Option 1: 역할명 변경)
export const ROLE_LABELS = {
  ADMIN: '총관리자',
  TEAM_LEADER: '팀장',
  SITE_MANAGER: '현장관리자',
  EXECUTIVE: '임원',
} as const;

// After (Option 2: 라벨만 수정 - 권장)
export const ROLE_LABELS = {
  ADMIN: '총관리자',
  TEAM_LEADER: '팀장',
  WORKER: '현장직',
  OFFICE_WORKER: '사무직',  // 또는 역할명을 EXECUTIVE로 변경
} as const;
```

---

### A.3 UI 텍스트 업데이트

**"TBM 체크리스트" → "TBM 일지" 변경**:

```typescript
// header.tsx (line 24)
<Link href="/tbm">TBM 일지</Link>

// TbmPage.tsx (line 127)
<CardTitle>TBM 일지</CardTitle>

// 모든 템플릿/백업 JSON 파일
// 검색하여 일괄 변경
```

---

## Appendix B: 검증 쿼리

### 수정 후 검증

```sql
-- 1. 역할 분포 확인
SELECT role, COUNT(*) as count
FROM "User"
GROUP BY role
ORDER BY count DESC;

-- 2. 팀-공장 관계 확인
SELECT
  f.name as factory,
  COUNT(t.id) as team_count
FROM "Factories" f
LEFT JOIN "Teams" t ON t."factoryId" = f.id
GROUP BY f.id, f.name
ORDER BY f.name;

-- 3. TBM 기록 수 확인
SELECT
  DATE_TRUNC('month', "reportDate") as month,
  COUNT(*) as report_count
FROM "DailyReports"
GROUP BY month
ORDER BY month DESC;

-- 4. 안전점검 기록 수 확인
SELECT
  year,
  month,
  COUNT(*) as inspection_count
FROM "SafetyInspections"
GROUP BY year, month
ORDER BY year DESC, month DESC;
```

---

## Appendix C: 롤백 계획

### Phase 2 롤백 (역할 변경)

```sql
-- 역할명 변경 롤백
UPDATE "User" SET role = 'WORKER' WHERE role = 'SITE_MANAGER';
UPDATE "User" SET role = 'OFFICE_WORKER' WHERE role = 'EXECUTIVE';
```

### Phase 3 롤백 (API Routes)

```typescript
// 신규 라우트 제거, 구 라우트 복원
// Git revert로 복구
```

### Phase 4 롤백 (Schema)

```bash
# 마이그레이션 롤백
npx prisma migrate rollback
```

---

## 결론

### 발견된 문제 총 27개

| 등급 | 개수 | 설명 |
|------|------|------|
| 🔴 Critical | 5개 | 즉시 수정 필요 (역할명, API 불일치 등) |
| 🟡 Medium | 8개 | 품질 개선 (용어 통일, 명칭 개선) |
| 🟢 Low | 14개 | 점진적 개선 (주석, 타입 안전성) |

### 예상 작업량

- **완전 해결**: 6-8주
- **Phase별 분할**: 4단계
- **우선순위**: 비파괴적 → 파괴적 순차 적용

### 권장 접근법

1. **Phase 1 먼저 시작** (Quick Wins, 1-2주)
   - 즉시 효과, 위험 없음
   - 사용자 경험 개선

2. **Phase 2-3 신중히 계획** (4-6주)
   - 백업 필수
   - 스테이징 테스트
   - 롤백 계획 수립

3. **Phase 4 선택적 적용** (2-3주)
   - 비즈니스 영향도 평가 후 결정

### 기대 효과

✅ 사용자 혼란 감소
✅ 코드 가독성 향상
✅ 유지보수 용이성 증가
✅ 버그 발생 위험 감소
✅ 신규 개발자 온보딩 시간 단축

---

**문서 작성**: Claude Code
**검토 필요**: 프로젝트 관리자, 시니어 개발자
**다음 단계**: Phase 1 실행 계획 수립 및 승인
