# 백업 및 복원 가이드

**백업 일시**: 2025-10-21
**백업 커밋**: `0534a0b4` - "백업: 개선 작업 전 현재 상태 저장 (라우팅 수정, 진행률 복원 기능 완료)"
**백업 브랜치**: `backup-before-improvements-2025-10-21`
**백업 태그**: `v1.0-before-improvements`

---

## ✅ 백업된 내용

### 현재 작동하는 기능들:
1. ✅ 인증 시스템 (로그인, 회원가입, 로그아웃)
2. ✅ TBM 일지 (작성, 조회, 수정, 삭제)
3. ✅ 월별 보고서 (조회, 엑셀 다운로드)
4. ✅ 관리자 기능 (사용자 관리, 체크리스트 편집)
5. ✅ 공지사항 (CRUD, 댓글, 파일 첨부)
6. ✅ 안전 교육 (과정 생성, 영상 시청, 퀴즈, 이수증)
7. ✅ **진행률 이어보기 기능**
8. ✅ **라우팅 구조 수정 완료**

### 최근 수정 사항:
- 라우팅: `/courses` → Dashboard (과정 목록)
- 라우팅: `/courses/:id` → CoursePage (과정 상세)
- 라우팅: `/courses/:id/content` → CourseContent (학습)
- 진행률 저장/복원 기능 구현
- 무한 루프 문제 해결
- 0분 교육 즉시 100% 처리

---

## 🔄 복원 방법

### 방법 1: Git 태그로 복원 (가장 안전)

```bash
# 1. 현재 작업 저장 (옵션)
git stash save "작업 중 임시 저장"

# 2. 백업 태그로 복원
git checkout v1.0-before-improvements

# 3. 새 브랜치 생성 (옵션)
git checkout -b restored-from-backup

# 4. 의존성 재설치
cd FoodieMatch
npm install

# 5. 빌드 및 실행
npm run build
npm run start
```

### 방법 2: Git 커밋 해시로 복원

```bash
# 1. 특정 커밋으로 복원
git checkout 0534a0b4

# 2. 새 브랜치 생성
git checkout -b restore-point

# 3. 의존성 재설치
cd FoodieMatch
npm install

# 4. 빌드 및 실행
npm run build
npm run start
```

### 방법 3: 백업 브랜치로 복원

```bash
# 1. 백업 브랜치로 전환
git checkout backup-before-improvements-2025-10-21

# 2. main 브랜치를 백업 상태로 되돌리기 (조심!)
git checkout main
git reset --hard backup-before-improvements-2025-10-21

# 3. 의존성 재설치
cd FoodieMatch
npm install

# 4. 빌드 및 실행
npm run build
npm run start
```

### 방법 4: 특정 파일만 복원

```bash
# 특정 파일만 백업 상태로 복원
git checkout 0534a0b4 -- FoodieMatch/client/src/App.tsx
git checkout 0534a0b4 -- FoodieMatch/client/src/pages/course-content.tsx

# 빌드 및 실행
cd FoodieMatch
npm run build
npm run start
```

---

## 📋 복원 후 확인 사항

### 1. 서버 정상 작동 확인
```bash
cd FoodieMatch
npm run start
```
- 포트 5001에서 정상 실행 확인
- 브라우저에서 http://localhost:5001 접속

### 2. 주요 기능 테스트
- [ ] 로그인/로그아웃
- [ ] 안전교육 메뉴 → 과정 목록 표시
- [ ] 과정 선택 → 상세 페이지
- [ ] 교육 시작 → 영상 시청 페이지
- [ ] 진행률 저장 (10초 대기)
- [ ] 페이지 나갔다가 다시 들어와서 진행률 복원 확인
- [ ] TBM 일지 작성
- [ ] 월별 보고서 조회

### 3. 데이터베이스 확인
- UserProgress 테이블에 진행률 저장 확인
- 세션 테이블 정상 작동 확인

---

## ⚠️ 주의사항

### 복원 시 주의할 점:
1. **데이터베이스는 복원되지 않습니다**
   - 코드만 복원됨
   - 데이터베이스는 그대로 유지됨
   - 스키마 변경이 있었다면 `npm run db:push` 필요

2. **node_modules는 다시 설치 필요**
   - 복원 후 반드시 `npm install` 실행

3. **환경 변수 확인**
   - `.env` 파일이 있는지 확인
   - DATABASE_URL 등 필수 환경 변수 설정 확인

4. **빌드 파일 재생성**
   - 복원 후 `npm run build` 실행 필수

---

## 🆘 문제 발생 시

### 의존성 에러 발생 시:
```bash
cd FoodieMatch
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Git 충돌 발생 시:
```bash
# 현재 변경사항 모두 버리고 복원
git reset --hard 0534a0b4
cd FoodieMatch
npm install
npm run build
```

### 데이터베이스 에러 발생 시:
```bash
cd FoodieMatch
npm run db:push
```

---

## 📞 복원 명령어 빠른 참조

```bash
# 완전 복원 (한 번에 실행)
git checkout v1.0-before-improvements && \
cd FoodieMatch && \
npm install && \
npm run build && \
npm run start

# main 브랜치로 되돌리기 (주의!)
git checkout main && \
git reset --hard v1.0-before-improvements && \
cd FoodieMatch && \
npm install && \
npm run build
```

---

## 💾 백업 정보

- **커밋 해시**: `0534a0b4`
- **브랜치**: `backup-before-improvements-2025-10-21`
- **태그**: `v1.0-before-improvements`
- **파일 수**: 60+ 파일 포함
- **주요 파일**:
  - `FoodieMatch/client/src/App.tsx`
  - `FoodieMatch/client/src/pages/course-content.tsx`
  - `FoodieMatch/server/routes.ts`
  - `FoodieMatch/prisma/schema.prisma`

---

**이 백업으로 언제든 안전하게 돌아갈 수 있습니다!** 🎉
